import uuid
from datetime import datetime
from typing import Any

from app.models.mobile_analysis import MobilePlatform
from app.schemas.common import InputSchema, ResponseSchema


class ManualChecklistUpdate(InputSchema):
    manual_checklist: dict[str, Any]


class MobileAnalysisResponse(ResponseSchema):
    id: uuid.UUID
    engagement_id: uuid.UUID
    app_name: str
    platform: MobilePlatform
    package_name: str | None
    version: str | None
    file_hash_sha256: str | None
    mobsf_scan_id: str | None
    static_results: dict[str, Any] | None
    manual_checklist: dict[str, Any]
    masvs_mappings: list[dict[str, Any]]
    analyzed_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
