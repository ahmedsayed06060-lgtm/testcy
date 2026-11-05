import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import EmailStr, Field

from app.models.phishing_campaign import CampaignStatus
from app.models.social_assessment import SocialPlatform
from app.schemas.common import InputSchema, ResponseSchema


class SocialAssessmentCreate(InputSchema):
    engagement_id: uuid.UUID
    platform: SocialPlatform
    account_handle: str = Field(min_length=1, max_length=255)


class ChecklistUpdate(InputSchema):
    checklist_results: dict[str, Any]


class SocialAssessmentResponse(ResponseSchema):
    id: uuid.UUID
    engagement_id: uuid.UUID
    platform: SocialPlatform
    account_handle: str
    checklist_results: dict[str, Any]
    posture_score: Decimal | None
    impersonation_findings: list[dict[str, Any]]
    notes: str | None
    created_at: datetime
    updated_at: datetime


class PhishingTarget(InputSchema):
    email: EmailStr
    department: str = Field(min_length=1, max_length=100)


class PhishingCampaignCreate(InputSchema):
    engagement_id: uuid.UUID
    name: str = Field(min_length=3, max_length=255)
    approval_doc_id: uuid.UUID
    targets: list[PhishingTarget] = Field(min_length=1, max_length=10000)
    template_html: str
    subject_line: str = Field(min_length=1, max_length=255)
    sender_name: str = Field(min_length=1, max_length=255)
    sender_email: EmailStr
    landing_page_html: str
    training_page_html: str


class PhishingCampaignResponse(ResponseSchema):
    id: uuid.UUID
    engagement_id: uuid.UUID
    name: str
    status: CampaignStatus
    approval_doc_id: uuid.UUID
    targets: list[dict[str, Any]]
    subject_line: str
    sender_name: str
    sender_email: str
    opt_out_list: list[str]
    sent_count: int
    opened_count: int
    clicked_count: int
    reported_count: int
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
