import uuid
from datetime import datetime

from app.models.report import ReportFormat, ReportLanguage, ReportType
from app.schemas.common import InputSchema, ResponseSchema


class ReportGenerate(InputSchema):
    engagement_id: uuid.UUID
    report_type: ReportType
    language: ReportLanguage
    format: ReportFormat


class ReportResponse(ResponseSchema):
    id: uuid.UUID
    engagement_id: uuid.UUID
    report_type: ReportType
    language: ReportLanguage
    format: ReportFormat
    template_name: str | None
    file_path: str
    file_size: int | None
    generated_by: uuid.UUID
    created_at: datetime
