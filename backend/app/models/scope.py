import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey, enum_type


class AssetType(str, enum.Enum):
    IP = "ip"
    CIDR = "cidr"
    DOMAIN = "domain"
    URL = "url"
    APP_ID = "app_id"
    SOCIAL_ACCOUNT = "social_account"


class VerificationMethod(str, enum.Enum):
    DNS_TXT = "dns_txt"
    FILE_UPLOAD = "file_upload"
    MANUAL_ADMIN = "manual_admin"


class ScopeItem(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "scope_items"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("engagements.id", ondelete="CASCADE"), index=True
    )
    asset_type: Mapped[AssetType] = mapped_column(enum_type(AssetType, "asset_type"), index=True)
    value: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    in_scope: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    ownership_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_method: Mapped[VerificationMethod | None] = mapped_column(
        enum_type(VerificationMethod, "verification_method")
    )
    verification_token: Mapped[str | None] = mapped_column(String(255))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verified_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    notes: Mapped[str | None] = mapped_column(Text)
