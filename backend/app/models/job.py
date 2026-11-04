import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey, enum_type


class JobType(str, enum.Enum):
    NMAP_SCAN = "nmap_scan"
    TESTSSL_SCAN = "testssl_scan"
    NUCLEI_SCAN = "nuclei_scan"
    ZAP_SCAN = "zap_scan"
    MOBSF_SCAN = "mobsf_scan"
    OSINT_SCAN = "osint_scan"
    CUSTOM = "custom"


class ScanProfile(str, enum.Enum):
    LIGHT = "light"
    STANDARD = "standard"
    DEEP = "deep"


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    VALIDATING = "validating"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"


class Job(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "jobs"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("engagements.id", ondelete="CASCADE"), index=True
    )
    job_type: Mapped[JobType] = mapped_column(enum_type(JobType, "job_type"), index=True)
    targets: Mapped[list[str]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False
    )
    tool: Mapped[str] = mapped_column(String(100), nullable=False)
    profile: Mapped[ScanProfile] = mapped_column(
        enum_type(ScanProfile, "scan_profile"), default=ScanProfile.STANDARD
    )
    parameters: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=dict, nullable=False
    )
    status: Mapped[JobStatus] = mapped_column(
        enum_type(JobStatus, "job_status"), default=JobStatus.PENDING, index=True
    )
    container_id: Mapped[str | None] = mapped_column(String(100))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    raw_output_path: Mapped[str | None] = mapped_column(String(500))
    error_message: Mapped[str | None] = mapped_column(Text)
    triggered_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    cancelled_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
