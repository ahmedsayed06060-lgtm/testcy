import uuid
from datetime import datetime

from pydantic import EmailStr, Field

from app.models.user import Role
from app.schemas.common import InputSchema, ResponseSchema


class UserCreate(InputSchema):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    role: Role
    password: str = Field(min_length=12, max_length=128)
    client_id: uuid.UUID | None = None


class UserUpdate(InputSchema):
    full_name: str = Field(min_length=2, max_length=255)
    role: Role
    is_active: bool
    client_id: uuid.UUID | None = None


class ProfileUpdate(InputSchema):
    full_name: str = Field(min_length=2, max_length=255)


class UserResponse(ResponseSchema):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: Role
    is_active: bool
    mfa_enabled: bool
    client_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
