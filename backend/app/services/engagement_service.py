"""Tenant-aware engagement access and lifecycle transitions."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.models.engagement import Engagement, EngagementStatus, EngagementUser
from app.models.user import Role, User
from app.schemas.engagement import EngagementCreate, EngagementUpdate
from app.services.audit_service import record_audit

TRANSITIONS: dict[EngagementStatus, set[EngagementStatus]] = {
    EngagementStatus.DRAFT: {EngagementStatus.PENDING_APPROVAL, EngagementStatus.CANCELLED},
    EngagementStatus.PENDING_APPROVAL: {
        EngagementStatus.APPROVED,
        EngagementStatus.DRAFT,
        EngagementStatus.CANCELLED,
    },
    EngagementStatus.APPROVED: {EngagementStatus.ACTIVE, EngagementStatus.CANCELLED},
    EngagementStatus.ACTIVE: {
        EngagementStatus.PAUSED,
        EngagementStatus.COMPLETED,
        EngagementStatus.CANCELLED,
    },
    EngagementStatus.PAUSED: {EngagementStatus.ACTIVE, EngagementStatus.CANCELLED},
    EngagementStatus.COMPLETED: set(),
    EngagementStatus.CANCELLED: set(),
}


async def engagement_access(db: AsyncSession, engagement_id: uuid.UUID, user: User) -> Engagement:
    engagement = await db.scalar(
        select(Engagement).where(Engagement.id == engagement_id, Engagement.deleted_at.is_(None))
    )
    if engagement is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Engagement not found")
    allowed = user.role in {Role.ADMIN, Role.ENGAGEMENT_MANAGER}
    if user.role == Role.CLIENT:
        allowed = user.client_id == engagement.client_id
    elif not allowed:
        allowed = (
            await db.scalar(
                select(EngagementUser.engagement_id).where(
                    EngagementUser.engagement_id == engagement_id, EngagementUser.user_id == user.id
                )
            )
            is not None
        )
    if not allowed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Engagement not found")
    return engagement


async def list_engagements(
    db: AsyncSession,
    user: User,
    page: int,
    limit: int,
    status_filter: EngagementStatus | None,
    client_id: uuid.UUID | None,
    search: str | None,
) -> tuple[list[Engagement], int]:
    conditions: list[ColumnElement[bool]] = [Engagement.deleted_at.is_(None)]
    if user.role == Role.CLIENT:
        conditions.append(Engagement.client_id == user.client_id)
    elif user.role not in {Role.ADMIN, Role.ENGAGEMENT_MANAGER}:
        conditions.append(
            Engagement.id.in_(
                select(EngagementUser.engagement_id).where(EngagementUser.user_id == user.id)
            )
        )
    if status_filter:
        conditions.append(Engagement.status == status_filter)
    if client_id:
        conditions.append(Engagement.client_id == client_id)
    if search:
        conditions.append(Engagement.name.ilike(f"%{search[:100]}%"))
    total = await db.scalar(select(func.count(Engagement.id)).where(*conditions)) or 0
    records = (
        await db.scalars(
            select(Engagement)
            .where(*conditions)
            .order_by(Engagement.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return list(records), total


async def create_engagement(db: AsyncSession, payload: EngagementCreate, user: User) -> Engagement:
    engagement = Engagement(**payload.model_dump(), created_by=user.id)
    db.add(engagement)
    await db.flush()
    db.add(EngagementUser(engagement_id=engagement.id, user_id=user.id, role_in_engagement="lead"))
    await record_audit(
        db,
        action="engagement.created",
        resource_type="engagement",
        resource_id=engagement.id,
        user_id=user.id,
    )
    await db.commit()
    await db.refresh(engagement)
    return engagement


async def update_engagement(
    db: AsyncSession, engagement: Engagement, payload: EngagementUpdate, user: User
) -> Engagement:
    if engagement.status not in {EngagementStatus.DRAFT, EngagementStatus.PENDING_APPROVAL}:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only draft engagements can be edited")
    for key, value in payload.model_dump().items():
        setattr(engagement, key, value)
    await record_audit(
        db,
        action="engagement.updated",
        resource_type="engagement",
        resource_id=engagement.id,
        user_id=user.id,
    )
    await db.commit()
    return engagement


async def transition_engagement(
    db: AsyncSession, engagement: Engagement, new_status: EngagementStatus, user: User
) -> Engagement:
    if new_status not in TRANSITIONS[engagement.status]:
        raise HTTPException(status.HTTP_409_CONFLICT, "Invalid engagement status transition")
    engagement.status = new_status
    await record_audit(
        db,
        action="engagement.status_changed",
        resource_type="engagement",
        resource_id=engagement.id,
        user_id=user.id,
        details={"new_status": new_status.value},
    )
    await db.commit()
    return engagement
