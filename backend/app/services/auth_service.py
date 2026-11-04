"""Transactional login, MFA, session rotation, and password recovery."""

import uuid
from datetime import datetime, timedelta, timezone

import structlog
from fastapi import HTTPException, status
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import MFABackupCode, User, UserSession
from app.security.encryption import get_field_encryption
from app.security.jwt import (
    TokenType,
    TokenValidationError,
    create_access_token,
    create_refresh_token,
    create_token,
    decode_token,
    hash_refresh_token,
    tokens_equal,
)
from app.security.mfa import (
    generate_backup_codes,
    generate_mfa_secret,
    provisioning_uri,
    verify_backup_code,
    verify_totp,
)
from app.security.passwords import hash_password, validate_password, verify_password
from app.services.audit_service import record_audit

logger = structlog.get_logger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _unauthorized(message: str = "Authentication failed") -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, message)


async def _user_from_temp_token(db: AsyncSession, token: str) -> User:
    try:
        claims = decode_token(token, TokenType.MFA)
        user_id = uuid.UUID(claims["sub"])
    except (TokenValidationError, ValueError, KeyError) as exc:
        raise _unauthorized("Temporary token is invalid or expired") from exc
    user = await db.get(User, user_id)
    if user is None or not user.is_active or user.deleted_at is not None:
        raise _unauthorized()
    return user


async def login(db: AsyncSession, email: str, password: str) -> dict[str, object]:
    user = await db.scalar(select(User).where(User.email == email.casefold()))
    if user is None or user.deleted_at is not None or not user.is_active:
        # Perform a real bcrypt operation to reduce account-enumeration timing signals.
        verify_password(password, hash_password("InvalidAccountTiming123!"))
        raise _unauthorized("Invalid email or password")
    if user.locked_until and _aware(user.locked_until) > _now():
        raise HTTPException(status.HTTP_423_LOCKED, "Account is temporarily locked")
    if not verify_password(password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts % 5 == 0:
            exponent = min(user.failed_login_attempts // 5 - 1, 3)
            user.locked_until = _now() + timedelta(minutes=15 * (2**exponent))
        await record_audit(
            db,
            action="auth.login_failed",
            resource_type="user",
            resource_id=user.id,
            user_id=user.id,
            details={"attempt": user.failed_login_attempts},
        )
        await db.commit()
        raise _unauthorized("Invalid email or password")
    user.failed_login_attempts = 0
    user.locked_until = None
    temp_token = create_token(user.id, TokenType.MFA)
    await db.commit()
    return {
        "requires_mfa": user.mfa_enabled,
        "mfa_setup_required": not user.mfa_enabled,
        "temp_token": temp_token,
    }


async def begin_mfa_setup(db: AsyncSession, temp_token: str) -> dict[str, object]:
    user = await _user_from_temp_token(db, temp_token)
    secret = generate_mfa_secret()
    plaintext_codes, hashes = generate_backup_codes()
    user.mfa_secret = get_field_encryption().encrypt(secret)
    user.mfa_enabled = False
    await db.execute(delete(MFABackupCode).where(MFABackupCode.user_id == user.id))
    db.add_all([MFABackupCode(user_id=user.id, code_hash=value) for value in hashes])
    await db.commit()
    return {
        "secret": secret,
        "qr_uri": provisioning_uri(secret, user.email),
        "backup_codes": plaintext_codes,
        "temp_token": create_token(user.id, TokenType.MFA),
    }


async def confirm_mfa_setup(db: AsyncSession, temp_token: str, code: str) -> None:
    user = await _user_from_temp_token(db, temp_token)
    if not user.mfa_secret:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "MFA setup has not been started")
    secret = get_field_encryption().decrypt(user.mfa_secret)
    if not verify_totp(secret, code):
        raise _unauthorized("Invalid authentication code")
    user.mfa_enabled = True
    await record_audit(
        db, action="auth.mfa_enabled", resource_type="user", resource_id=user.id, user_id=user.id
    )
    await db.commit()


async def verify_mfa(db: AsyncSession, temp_token: str, code: str) -> dict[str, object]:
    user = await _user_from_temp_token(db, temp_token)
    if not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "MFA setup is required")
    secret = get_field_encryption().decrypt(user.mfa_secret)
    valid = verify_totp(secret, code)
    backup = None
    if not valid:
        candidates = (
            await db.scalars(
                select(MFABackupCode).where(
                    MFABackupCode.user_id == user.id, MFABackupCode.used.is_(False)
                )
            )
        ).all()
        backup = next(
            (item for item in candidates if verify_backup_code(code, item.code_hash)), None
        )
        valid = backup is not None
    if not valid:
        raise _unauthorized("Invalid authentication or backup code")
    if backup:
        backup.used = True
        backup.used_at = _now()
    return await create_session(db, user)


async def create_session(db: AsyncSession, user: User) -> dict[str, object]:
    active = (
        await db.scalars(
            select(UserSession)
            .where(
                UserSession.user_id == user.id,
                UserSession.revoked.is_(False),
                UserSession.expires_at > _now(),
            )
            .order_by(UserSession.created_at)
        )
    ).all()
    for old_session in active[: max(0, len(active) - settings.max_concurrent_sessions + 1)]:
        old_session.revoked = True
    family = uuid.uuid4()
    session = UserSession(
        user_id=user.id,
        refresh_token_hash="pending",  # noqa: S106 - replaced before the transaction commits
        token_family=family,
        expires_at=_now() + timedelta(days=settings.refresh_token_days),
    )
    db.add(session)
    await db.flush()
    refresh_token = create_refresh_token(session.id)
    session.refresh_token_hash = hash_refresh_token(refresh_token)
    access_token = create_access_token(user.id, session.id)
    await record_audit(
        db,
        action="auth.login_succeeded",
        resource_type="user",
        resource_id=user.id,
        user_id=user.id,
    )
    await db.commit()
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_minutes * 60,
    }


async def rotate_refresh_token(db: AsyncSession, raw_token: str) -> dict[str, object]:
    try:
        session_id = uuid.UUID(raw_token.split(".", 1)[0])
    except (ValueError, IndexError) as exc:
        raise _unauthorized("Invalid refresh token") from exc
    session = await db.get(UserSession, session_id)
    if session is None:
        raise _unauthorized("Invalid refresh token")
    supplied_hash = hash_refresh_token(raw_token)
    if session.revoked or not tokens_equal(supplied_hash, session.refresh_token_hash):
        await db.execute(
            update(UserSession)
            .where(UserSession.token_family == session.token_family)
            .values(revoked=True)
        )
        await record_audit(
            db,
            action="auth.refresh_reuse_detected",
            resource_type="user",
            resource_id=session.user_id,
            user_id=session.user_id,
            details={"session_id": str(session.id)},
        )
        await db.commit()
        raise _unauthorized("Refresh token reuse detected; token family revoked")
    if _aware(session.expires_at) <= _now():
        session.revoked = True
        await db.commit()
        raise _unauthorized("Refresh token expired")
    user = await db.get(User, session.user_id)
    if user is None or not user.is_active or user.deleted_at is not None:
        raise _unauthorized()
    refresh_token = create_refresh_token(session.id)
    session.refresh_token_hash = hash_refresh_token(refresh_token)
    access_token = create_access_token(user.id, session.id)
    await db.commit()
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_minutes * 60,
    }


async def logout(db: AsyncSession, raw_token: str) -> None:
    try:
        session_id = uuid.UUID(raw_token.split(".", 1)[0])
    except (ValueError, IndexError):
        return
    session = await db.get(UserSession, session_id)
    if session and tokens_equal(hash_refresh_token(raw_token), session.refresh_token_hash):
        session.revoked = True
        await db.commit()


async def request_password_reset(db: AsyncSession, email: str) -> None:
    user = await db.scalar(select(User).where(User.email == email.casefold()))
    if user and user.is_active and user.deleted_at is None:
        token = create_token(user.id, TokenType.PASSWORD_RESET, expires_delta=timedelta(minutes=15))
        try:
            from app.tasks.notification_tasks import send_password_reset_email

            send_password_reset_email.delay(user.email, token)
        except Exception as exc:
            # Response remains intentionally identical if mail infrastructure is unavailable.
            logger.warning("password_reset_email_unavailable", error=type(exc).__name__)


async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
    try:
        claims = decode_token(token, TokenType.PASSWORD_RESET)
        user_id = uuid.UUID(claims["sub"])
    except (TokenValidationError, ValueError, KeyError) as exc:
        raise _unauthorized("Reset token is invalid or expired") from exc
    user = await db.get(User, user_id)
    if user is None:
        raise _unauthorized("Reset token is invalid or expired")
    validate_password(new_password, user.email)
    user.password_hash = hash_password(new_password)
    user.password_changed_at = _now()
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.execute(update(UserSession).where(UserSession.user_id == user.id).values(revoked=True))
    await record_audit(
        db, action="auth.password_reset", resource_type="user", resource_id=user.id, user_id=user.id
    )
    await db.commit()
