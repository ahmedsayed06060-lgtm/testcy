import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.common import Pagination, success

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("")
async def list_audit_logs(
    user: User = AdminUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    user_id: uuid.UUID | None = None,
    action: str | None = Query(None, max_length=100),
    resource_type: str | None = Query(None, max_length=100),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> dict[str, Any]:
    conditions = []
    for column, value in (
        (AuditLog.user_id, user_id),
        (AuditLog.action, action),
        (AuditLog.resource_type, resource_type),
    ):
        if value is not None:
            conditions.append(column == value)
    if date_from:
        conditions.append(AuditLog.timestamp >= date_from)
    if date_to:
        conditions.append(AuditLog.timestamp <= date_to)
    total = await db.scalar(select(func.count(AuditLog.id)).where(*conditions)) or 0
    records = (
        await db.scalars(
            select(AuditLog)
            .where(*conditions)
            .order_by(AuditLog.timestamp.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return success(
        list(records),
        Pagination(page=page, limit=limit, total=total, pages=(total + limit - 1) // limit),
    )
