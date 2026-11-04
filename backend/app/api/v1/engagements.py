import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, ManagerUser
from app.database import get_db
from app.models.engagement import EngagementStatus, EngagementUser
from app.models.user import User
from app.schemas.common import Pagination, success
from app.schemas.engagement import (
    AssignmentRequest,
    EngagementCreate,
    EngagementUpdate,
    StatusTransition,
)
from app.services import engagement_service
from app.services.audit_service import record_audit

router = APIRouter(prefix="/engagements", tags=["engagements"])


@router.get("")
async def list_engagements(
    user: User = CurrentUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: EngagementStatus | None = Query(None, alias="status"),
    client_id: uuid.UUID | None = None,
    search: str | None = Query(None, max_length=100),
) -> dict[str, Any]:
    records, total = await engagement_service.list_engagements(
        db, user, page, limit, status_filter, client_id, search
    )
    return success(
        records, Pagination(page=page, limit=limit, total=total, pages=(total + limit - 1) // limit)
    )


@router.post("", status_code=201)
async def create_engagement(
    payload: EngagementCreate, user: User = ManagerUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    return success(await engagement_service.create_engagement(db, payload, user))


@router.get("/{engagement_id}")
async def get_engagement(
    engagement_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    return success(await engagement_service.engagement_access(db, engagement_id, user))


@router.put("/{engagement_id}")
async def update_engagement(
    engagement_id: uuid.UUID,
    payload: EngagementUpdate,
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    engagement = await engagement_service.engagement_access(db, engagement_id, user)
    return success(await engagement_service.update_engagement(db, engagement, payload, user))


@router.delete("/{engagement_id}")
async def delete_engagement(
    engagement_id: uuid.UUID, user: User = ManagerUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    from datetime import datetime, timezone

    from app.models.user import Role

    if user.role != Role.ADMIN:
        from fastapi import HTTPException

        raise HTTPException(403, "Only administrators can delete engagements")
    engagement = await engagement_service.engagement_access(db, engagement_id, user)
    engagement.deleted_at = datetime.now(timezone.utc)
    await record_audit(
        db,
        action="engagement.deleted",
        resource_type="engagement",
        resource_id=engagement.id,
        user_id=user.id,
    )
    await db.commit()
    return success({"deleted": True})


@router.post("/{engagement_id}/transition")
async def transition_engagement(
    engagement_id: uuid.UUID,
    payload: StatusTransition,
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    engagement = await engagement_service.engagement_access(db, engagement_id, user)
    return success(
        await engagement_service.transition_engagement(db, engagement, payload.new_status, user)
    )


@router.post("/{engagement_id}/assign")
async def assign_user(
    engagement_id: uuid.UUID,
    payload: AssignmentRequest,
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    await engagement_service.engagement_access(db, engagement_id, user)
    assignment = await db.get(EngagementUser, (engagement_id, payload.user_id))
    if assignment:
        assignment.role_in_engagement = payload.role_in_engagement
    else:
        db.add(
            EngagementUser(
                engagement_id=engagement_id,
                user_id=payload.user_id,
                role_in_engagement=payload.role_in_engagement,
            )
        )
    await record_audit(
        db,
        action="engagement.user_assigned",
        resource_type="engagement",
        resource_id=engagement_id,
        user_id=user.id,
        details={"assigned_user": str(payload.user_id)},
    )
    await db.commit()
    return success({"assigned": True})


@router.delete("/{engagement_id}/assign/{user_id}")
async def unassign_user(
    engagement_id: uuid.UUID,
    user_id: uuid.UUID,
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    await engagement_service.engagement_access(db, engagement_id, user)
    assignment = await db.get(EngagementUser, (engagement_id, user_id))
    if assignment:
        await db.delete(assignment)
        await db.commit()
    return success({"removed": True})
