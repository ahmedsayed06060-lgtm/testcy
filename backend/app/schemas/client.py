import uuid
from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.common import InputSchema, ResponseSchema


class ClientInput(InputSchema):
    company_name: str = Field(min_length=2, max_length=255)
    industry: str | None = Field(default=None, max_length=100)
    contact_name: str | None = Field(default=None, max_length=255)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(default=None, max_length=50)
    notes: str | None = None


class ClientResponse(ResponseSchema):
    id: uuid.UUID
    company_name: str
    industry: str | None
    contact_name: str | None
    contact_email: str | None
    contact_phone: str | None
    logo_path: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
