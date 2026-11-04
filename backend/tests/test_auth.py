import pyotp
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from sqlalchemy import select

from app.config import settings
from app.models.user import MFABackupCode, UserSession
from app.security.encryption import get_field_encryption
from app.security.jwt import TokenType, TokenValidationError, create_token, decode_token
from app.security.mfa import generate_mfa_secret
from app.security.passwords import validate_password
from app.services import auth_service


@pytest.fixture(autouse=True)
def signing_keys(tmp_path, monkeypatch):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private = tmp_path / "private.pem"
    public = tmp_path / "public.pem"
    private.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    public.write_bytes(
        key.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        )
    )
    monkeypatch.setattr(settings, "jwt_private_key_path", private)
    monkeypatch.setattr(settings, "jwt_public_key_path", public)


@pytest.mark.asyncio
async def test_login_mfa_session_and_refresh_rotation(authorized_context):
    context = authorized_context
    user = context["tester"]
    secret = generate_mfa_secret()
    user.mfa_secret = get_field_encryption().encrypt(secret)
    user.mfa_enabled = True
    await context["db"].commit()
    login = await auth_service.login(context["db"], user.email, "TesterTestPass123!")
    assert login["requires_mfa"] is True
    tokens = await auth_service.verify_mfa(
        context["db"], login["temp_token"], pyotp.TOTP(secret).now()
    )
    assert tokens["access_token"]
    rotated = await auth_service.rotate_refresh_token(context["db"], tokens["refresh_token"])
    assert rotated["refresh_token"] != tokens["refresh_token"]
    with pytest.raises(HTTPException) as error:
        await auth_service.rotate_refresh_token(context["db"], tokens["refresh_token"])
    assert error.value.status_code == 401
    session = await context["db"].scalar(select(UserSession).where(UserSession.user_id == user.id))
    assert session.revoked is True


@pytest.mark.asyncio
async def test_mfa_setup_and_backup_code(authorized_context):
    user = authorized_context["tester"]
    user.mfa_enabled = False
    await authorized_context["db"].commit()
    login = await auth_service.login(authorized_context["db"], user.email, "TesterTestPass123!")
    assert login["mfa_setup_required"] is True
    setup = await auth_service.begin_mfa_setup(authorized_context["db"], login["temp_token"])
    assert len(setup["backup_codes"]) == 10
    assert user.mfa_secret != setup["secret"]
    await auth_service.confirm_mfa_setup(
        authorized_context["db"], setup["temp_token"], pyotp.TOTP(setup["secret"]).now()
    )
    assert user.mfa_enabled is True
    backup = (
        await authorized_context["db"].scalars(
            select(MFABackupCode).where(MFABackupCode.user_id == user.id)
        )
    ).all()[0]
    tokens = await auth_service.verify_mfa(
        authorized_context["db"], setup["temp_token"], setup["backup_codes"][0]
    )
    assert tokens["access_token"]
    assert backup.used is True


@pytest.mark.asyncio
async def test_account_lockout_after_five_failures(authorized_context):
    for attempt in range(5):
        with pytest.raises(HTTPException) as error:
            await auth_service.login(
                authorized_context["db"],
                authorized_context["tester"].email,
                f"WrongPassword{attempt}!",
            )
        assert error.value.status_code == 401
    with pytest.raises(HTTPException) as locked:
        await auth_service.login(
            authorized_context["db"], authorized_context["tester"].email, "TesterTestPass123!"
        )
    assert locked.value.status_code == 423


@pytest.mark.asyncio
async def test_access_token_purpose_is_enforced(authorized_context):
    token = create_token(authorized_context["tester"].id, TokenType.MFA)
    with pytest.raises(TokenValidationError):
        decode_token(token, TokenType.ACCESS)
    assert decode_token(token, TokenType.MFA)["sub"] == str(authorized_context["tester"].id)


def test_password_policy_rejects_common_and_email_based_passwords():
    with pytest.raises(ValueError):
        validate_password("AdminPass123!")
    with pytest.raises(ValueError):
        validate_password("SecurityPerson123!", "security@example.com")
    validate_password("V3ry$trongUniquePassphrase", "person@example.com")
