import io
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, CurrentUser, EditorUser
from app.database import get_db
from app.minio_client import download_bytes
from app.models.engagement import Engagement, EngagementUser
from app.models.job import Job, JobStatus, JobType
from app.models.user import Role, User
from app.schemas.common import Pagination, success
from app.schemas.job import JobCreate
from app.services import job_service
from app.services.engagement_service import engagement_access

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("")
async def list_jobs(
    user: User = CurrentUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    engagement_id: uuid.UUID | None = None,
    status_filter: JobStatus | None = Query(None, alias="status"),
    job_type: JobType | None = None,
) -> dict[str, Any]:
    conditions = []
    if user.role == Role.CLIENT:
        conditions.append(Engagement.client_id == user.client_id)
    elif user.role not in {Role.ADMIN, Role.ENGAGEMENT_MANAGER}:
        conditions.append(
            Job.engagement_id.in_(
                select(EngagementUser.engagement_id).where(EngagementUser.user_id == user.id)
            )
        )
    if engagement_id:
        await engagement_access(db, engagement_id, user)
        conditions.append(Job.engagement_id == engagement_id)
    if status_filter:
        conditions.append(Job.status == status_filter)
    if job_type:
        conditions.append(Job.job_type == job_type)
    total = await db.scalar(select(func.count(Job.id)).join(Engagement).where(*conditions)) or 0
    records = (
        await db.scalars(
            select(Job)
            .join(Engagement)
            .where(*conditions)
            .order_by(Job.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return success(
        list(records),
        Pagination(page=page, limit=limit, total=total, pages=(total + limit - 1) // limit),
    )


@router.post("", status_code=201)
async def create_job(
    payload: JobCreate, user: User = EditorUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    return success(await job_service.create_job(db, payload, user))


@router.post("/kill-switch")
async def kill_switch(user: User = AdminUser, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    return success({"cancelled_jobs": await job_service.kill_switch(db, user)})


async def _get_job(db: AsyncSession, job_id: uuid.UUID, user: User) -> Job:
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    await engagement_access(db, job.engagement_id, user)
    return job


@router.get("/{job_id}")
async def get_job(
    job_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    return success(await _get_job(db, job_id, user))


@router.get("/{job_id}/output")
async def job_output(
    job_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> StreamingResponse:
    if user.role == Role.CLIENT:
        raise HTTPException(403, "Raw tool output is not available to client users")
    job = await _get_job(db, job_id, user)
    if not job.raw_output_path:
        raise HTTPException(404, "Job output is not available")
    import asyncio

    payload = await asyncio.to_thread(download_bytes, job.raw_output_path)
    return StreamingResponse(
        io.BytesIO(payload),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{job.id}.log"'},
    )


@router.post("/{job_id}/cancel")
async def cancel_job(
    job_id: uuid.UUID, user: User = EditorUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    job = await _get_job(db, job_id, user)
    return success(await job_service.cancel_job(db, job, user))
