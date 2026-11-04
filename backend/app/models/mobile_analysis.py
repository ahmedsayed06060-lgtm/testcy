import enum
import uuid
from typing import Any

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey, enum_type


class MobilePlatform(str, enum.Enum):
    ANDROID = "android"
    IOS = "ios"


class MobileAnalysis(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "mobile_analyses"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("engagements.id", ondelete="CASCADE"), index=True
    )
    app_name: Mapped[str] = mapped_column(String(255), nullable=False)
    platform: Mapped[MobilePlatform] = mapped_column(enum_type(MobilePlatform, "mobile_platform"))
    package_name: Mapped[str | None] = mapped_column(String(255))
    version: Mapped[str | None] = mapped_column(String(50))
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_hash_sha256: Mapped[str | None] = mapped_column(String(64))
    mobsf_scan_id: Mapped[str | None] = mapped_column(String(100))
    static_results: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql")
    )
    manual_checklist: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=dict, nullable=False
    )
    masvs_mappings: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False
    )
    analyzed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
