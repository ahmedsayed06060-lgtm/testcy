import uuid
from datetime import datetime

from pydantic import Field, field_validator

from app.models.scope import AssetType, VerificationMethod
from app.schemas.common import InputSchema, ResponseSchema


class ScopeCreate(InputSchema):
    asset_type: AssetType
    value: str = Field(min_length=1, max_length=500)
    in_scope: bool = True
    notes: str | None = Field(default=None, max_length=5000)

    @field_validator("value")
    @classmethod
    def canonical_value(cls, value: str) -> str:
        value = value.strip()
        if len(value) > 500 or any(c.isspace() for c in value):
            raise ValueError("Invalid scope value")
        return value


class ScopeUpdate(InputSchema):
    value: str = Field(min_length=1, max_length=500)
    in_scope: bool
    notes: str | None = Field(default=None, max_length=5000)


class ScopeResponse(ResponseSchema):
    id: uuid.UUID
    engagement_id: uuid.UUID
    asset_type: AssetType
    value: str
    in_scope: bool
    ownership_verified: bool
    verification_method: VerificationMethod | None
    verified_at: datetime | None
    verified_by: uuid.UUID | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
