import enum
import uuid
from datetime import date, time

from sqlalchemy import Date, ForeignKey, String, Text, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKey, enum_type


class EngagementType(str, enum.Enum):
    PENTEST = "pentest"
    VULN_ASSESSMENT = "vuln_assessment"
    WEB_APP_TEST = "web_app_test"
    MOBILE_TEST = "mobile_test"
    SOCIAL_MEDIA_ASSESSMENT = "social_media_assessment"
    RED_TEAM = "red_team"
    COMPREHENSIVE = "comprehensive"


class EngagementStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EngagementRole(str, enum.Enum):
    LEAD = "lead"
    MEMBER = "member"
    REVIEWER = "reviewer"


class Engagement(UUIDPrimaryKey, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "engagements"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    type: Mapped[EngagementType] = mapped_column(enum_type(EngagementType, "engagement_type"))
    status: Mapped[EngagementStatus] = mapped_column(
        enum_type(EngagementStatus, "engagement_status"), default=EngagementStatus.DRAFT, index=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    testing_window_start: Mapped[time | None] = mapped_column(Time)
    testing_window_end: Mapped[time | None] = mapped_column(Time)
    testing_window_timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    rules_of_engagement: Mapped[str] = mapped_column(Text, nullable=False)
    emergency_contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    emergency_contact_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    emergency_contact_email: Mapped[str | None] = mapped_column(String(255))
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )


class EngagementUser(Base):
    __tablename__ = "engagement_users"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("engagements.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role_in_engagement: Mapped[EngagementRole] = mapped_column(
        enum_type(EngagementRole, "engagement_role"), default=EngagementRole.MEMBER
    )
