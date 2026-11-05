import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import Field

from app.models.finding import FindingStatus, Severity
from app.schemas.common import InputSchema, ResponseSchema


class FindingBase(InputSchema):
    engagement_id: uuid.UUID
    title: str = Field(min_length=3, max_length=500)
    description: str = Field(min_length=3)
    business_impact: str | None = None
    affected_asset: str = Field(min_length=1, max_length=500)
    severity: Severity
    cvss_vector: str | None = Field(default=None, max_length=200)
    # JSON numbers are valid CVSS input; all other fields retain strict model validation.
    cvss_score: Decimal | None = Field(default=None, ge=0, le=10, strict=False)
    cwe_id: str | None = Field(default=None, max_length=20)
    owasp_category: str | None = Field(default=None, max_length=100)
    evidence: str | None = None
    remediation: str | None = None
    tags: list[str] = Field(default_factory=list, max_length=30)


class FindingCreate(FindingBase):
    pass


class FindingUpdate(FindingBase):
    status: FindingStatus = FindingStatus.OPEN


class FindingResponse(ResponseSchema):
    id: uuid.UUID
    engagement_id: uuid.UUID
    job_id: uuid.UUID | None
    title: str
    description: str
    business_impact: str | None
    affected_asset: str
    severity: Severity
    cvss_vector: str | None
    cvss_score: Decimal | None
    cwe_id: str | None
    owasp_category: str | None
    evidence: str | None
    evidence_files: list[dict[str, Any]]
    remediation: str | None
    status: FindingStatus
    assigned_to: uuid.UUID | None
    found_by: uuid.UUID | None
    tags: list[str]
    comments: list[dict[str, Any]]
    created_at: datetime
    updated_at: datetime


class CVSSRequest(InputSchema):
    vector_string: str = Field(min_length=10, max_length=200)


class CommentRequest(InputSchema):
    text: str = Field(min_length=1, max_length=5000)


class AssignRequest(InputSchema):
    user_id: uuid.UUID


class RetestRequest(InputSchema):
    result: str = Field(min_length=2, max_length=10000)
    notes: str = Field(min_length=2, max_length=10000)
