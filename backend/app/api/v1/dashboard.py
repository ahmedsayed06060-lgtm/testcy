import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.engagement import Engagement, EngagementStatus
from app.models.finding import Finding, FindingStatus, Severity
from app.models.job import Job, JobStatus
from app.models.user import Role, User
from app.schemas.common import success
from app.services.engagement_service import list_engagements

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def _allowed_engagements(db: AsyncSession, user: User) -> list[uuid.UUID]:
    records, _ = await list_engagements(db, user, 1, 100, None, None, None)
    return [item.id for item in records]


@router.get("/stats")
async def dashboard_stats(
    user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    ids = await _allowed_engagements(db, user)
    if not ids:
        return success(
            {
                "active_engagements": 0,
                "running_jobs": 0,
                "open_findings": 0,
                "severity": {item.value: 0 for item in Severity},
            }
        )
    active = await db.scalar(
        select(func.count(Engagement.id)).where(
            Engagement.id.in_(ids), Engagement.status == EngagementStatus.ACTIVE
        )
    )
    running = await db.scalar(
        select(func.count(Job.id)).where(
            Job.engagement_id.in_(ids), Job.status.in_([JobStatus.RUNNING, JobStatus.VALIDATING])
        )
    )
    open_findings = await db.scalar(
        select(func.count(Finding.id)).where(
            Finding.engagement_id.in_(ids),
            Finding.deleted_at.is_(None),
            Finding.status.notin_([FindingStatus.FIXED, FindingStatus.FALSE_POSITIVE]),
        )
    )
    severity_rows = (
        await db.execute(
            select(Finding.severity, func.count(Finding.id))
            .where(Finding.engagement_id.in_(ids), Finding.deleted_at.is_(None))
            .group_by(Finding.severity)
        )
    ).all()
    return success(
        {
            "active_engagements": active or 0,
            "running_jobs": running or 0,
            "open_findings": open_findings or 0,
            "severity": {item.value: 0 for item in Severity}
            | {key.value: count for key, count in severity_rows},
        }
    )


@router.get("/engagement-overview")
async def engagement_overview(
    user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    upcoming, _ = await list_engagements(db, user, 1, 5, None, None, None)
    return success(upcoming)


@router.get("/findings-trend")
async def findings_trend(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    user: User = CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    ids = await _allowed_engagements(db, user)
    days = int(period.removesuffix("d"))
    since = datetime.now(timezone.utc) - timedelta(days=days)
    if not ids:
        return success([])
    rows = (
        await db.execute(
            select(func.date(Finding.created_at), Finding.severity, func.count(Finding.id))
            .where(Finding.engagement_id.in_(ids), Finding.created_at >= since)
            .group_by(func.date(Finding.created_at), Finding.severity)
            .order_by(func.date(Finding.created_at))
        )
    ).all()
    grouped: dict[str, dict[str, int]] = {}
    for day, severity, count in rows:
        severity_value = severity if isinstance(severity, Severity) else Severity(severity)
        grouped.setdefault(str(day), {item.value: 0 for item in Severity})[severity_value.value] = (
            count if isinstance(count, int) else 0
        )
    return success([{"date": day, **counts} for day, counts in grouped.items()])


@router.get("/client/{client_id}/stats")
async def client_stats(
    client_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    if user.role == Role.CLIENT and user.client_id != client_id:
        from fastapi import HTTPException

        raise HTTPException(404, "Client not found")
    ids = await _allowed_engagements(db, user)
    count = (
        await db.scalar(
            select(func.count(Engagement.id)).where(
                Engagement.id.in_(ids), Engagement.client_id == client_id
            )
        )
        if ids
        else 0
    )
    severity_rows = (
        (
            await db.execute(
                select(Finding.severity, func.count(Finding.id))
                .join(Engagement, Finding.engagement_id == Engagement.id)
                .where(
                    Finding.engagement_id.in_(ids),
                    Engagement.client_id == client_id,
                    Finding.deleted_at.is_(None),
                )
                .group_by(Finding.severity)
            )
        ).all()
        if ids
        else []
    )
    findings = {item.value: 0 for item in Severity} | {
        (key.value if isinstance(key, Severity) else str(key)): value
        for key, value in severity_rows
    }
    return success({"client_id": client_id, "engagements": count or 0, "findings": findings})
