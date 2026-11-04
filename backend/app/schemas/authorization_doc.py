import uuid
from datetime import datetime

from pydantic import Field

from app.models.authorization_doc import AuthorizationDocType
from app.schemas.common import InputSchema, ResponseSchema


class RejectionRequest(InputSchema):
    reason: str = Field(min_length=5, max_length=5000)


class AuthorizationDocResponse(ResponseSchema):
    id: uuid.UUID
    engagement_id: uuid.UUID
    doc_type: AuthorizationDocType
    original_filename: str
    file_size: int | None
    mime_type: str | None
    sha256_hash: str
    uploaded_by: uuid.UUID
    approved: bool | None
    approved_by: uuid.UUID | None
    approved_at: datetime | None
    rejection_reason: str | None
    created_at: datetime
