import enum
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import JSON, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey, enum_type


class SocialPlatform(str, enum.Enum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    X = "x"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"
    WHATSAPP_BUSINESS = "whatsapp_business"
    TELEGRAM = "telegram"


class SocialAssessment(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "social_assessments"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("engagements.id", ondelete="CASCADE"), index=True
    )
    platform: Mapped[SocialPlatform] = mapped_column(enum_type(SocialPlatform, "social_platform"))
    account_handle: Mapped[str] = mapped_column(String(255), nullable=False)
    checklist_results: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=dict, nullable=False
    )
    posture_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    impersonation_findings: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text)
    assessed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
