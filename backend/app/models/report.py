import enum
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKey, enum_type, utcnow


class ReportType(str, enum.Enum):
    EXECUTIVE_SUMMARY = "executive_summary"
    TECHNICAL_REPORT = "technical_report"
    REMEDIATION_PLAN = "remediation_plan"
    FULL = "full"


class ReportLanguage(str, enum.Enum):
    EN = "en"
    AR = "ar"


class ReportFormat(str, enum.Enum):
    PDF = "pdf"
    DOCX = "docx"


class Report(UUIDPrimaryKey, Base):
    __tablename__ = "reports"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("engagements.id", ondelete="CASCADE"), index=True
    )
    report_type: Mapped[ReportType] = mapped_column(enum_type(ReportType, "report_type"))
    language: Mapped[ReportLanguage] = mapped_column(enum_type(ReportLanguage, "report_language"))
    format: Mapped[ReportFormat] = mapped_column(enum_type(ReportFormat, "report_format"))
    template_name: Mapped[str | None] = mapped_column(String(100))
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int | None] = mapped_column(BigInteger)
    generated_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
