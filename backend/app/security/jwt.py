"""RS256 access/temporary tokens and opaque rotating refresh tokens."""

import enum
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, cast

from jose import JWTError, jwt

from app.config import settings


class TokenType(str, enum.Enum):
    ACCESS = "access"
    MFA = "mfa"
    PASSWORD_RESET = "password_reset"  # noqa: S105 - token purpose identifier


class TokenValidationError(ValueError):
    pass


def create_token(
    subject: uuid.UUID | str,
    token_type: TokenType,
    *,
    session_id: uuid.UUID | None = None,
    token_family: uuid.UUID | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    default_minutes = (
        settings.temporary_token_minutes
        if token_type != TokenType.ACCESS
        else settings.access_token_minutes
    )
    expiry = expires_delta or timedelta(minutes=default_minutes)
    claims: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type.value,
        "iss": settings.jwt_issuer,
        "iat": now,
        "nbf": now,
        "exp": now + expiry,
        "jti": str(uuid.uuid4()),
    }
    if session_id:
        claims["sid"] = str(session_id)
    if token_family:
        claims["family"] = str(token_family)
    return cast(
        str,
        jwt.encode(
            claims,
            settings.jwt_private_key,
            algorithm="RS256",
            headers={"kid": settings.jwt_key_id},
        ),
    )


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    try:
        header = jwt.get_unverified_header(token)
        if header.get("kid") != settings.jwt_key_id:
            raise TokenValidationError("Unknown signing key")
        claims = jwt.decode(
            token,
            settings.jwt_public_key,
            algorithms=["RS256"],
            issuer=settings.jwt_issuer,
            options={"require_exp": True, "require_sub": True, "require_iat": True},
        )
    except JWTError as exc:
        raise TokenValidationError("Token is invalid or expired") from exc
    if claims.get("type") != expected_type.value:
        raise TokenValidationError("Token has the wrong purpose")
    return cast(dict[str, Any], claims)


def create_access_token(user_id: uuid.UUID, session_id: uuid.UUID) -> str:
    return create_token(user_id, TokenType.ACCESS, session_id=session_id)


def create_refresh_token(session_id: uuid.UUID) -> str:
    """Bind an opaque secret to its session so old-token reuse is detectable."""
    return f"{session_id}.{secrets.token_urlsafe(48)}"


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def tokens_equal(left: str, right: str) -> bool:
    return secrets.compare_digest(left, right)
