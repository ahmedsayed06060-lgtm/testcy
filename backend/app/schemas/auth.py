import uuid

from pydantic import EmailStr, Field

from app.schemas.common import InputSchema


class LoginRequest(InputSchema):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class LoginResponse(InputSchema):
    requires_mfa: bool
    mfa_setup_required: bool = False
    temp_token: str


class TempTokenRequest(InputSchema):
    temp_token: str


class MFAVerifyRequest(TempTokenRequest):
    totp_code: str = Field(min_length=6, max_length=32)


class MFASetupResponse(InputSchema):
    secret: str
    qr_uri: str
    backup_codes: list[str]
    temp_token: str


class TokenResponse(InputSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105 - RFC token scheme, not a secret
    expires_in: int = 900


class RefreshRequest(InputSchema):
    refresh_token: str = Field(min_length=40, max_length=200)


class PasswordResetRequest(InputSchema):
    email: EmailStr


class PasswordResetConfirm(InputSchema):
    token: str
    new_password: str = Field(min_length=12, max_length=128)


class PasswordChange(InputSchema):
    current_password: str
    new_password: str = Field(min_length=12, max_length=128)


class SessionResponse(InputSchema):
    id: uuid.UUID
    ip_address: str | None
    user_agent: str | None
    created_at: str
    expires_at: str
