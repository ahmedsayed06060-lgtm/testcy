import asyncio
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, ManagerUser
from app.database import get_db
from app.minio_client import presigned_download
from app.models.report import Report
from app.models.user import User
from app.schemas.common import success
from app.schemas.report import ReportGenerate
from app.services.engagement_service import engagement_access

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
async def list_reports(
    engagement_id: uuid.UUID | None = None,
    user: User = CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if engagement_id:
        await engagement_access(db, engagement_id, user)
    query = select(Report).order_by(Report.created_at.desc())
    if engagement_id:
        query = query.where(Report.engagement_id == engagement_id)
    records = (await db.scalars(query)).all()
    # Filter in the service layer as defense in depth when no engagement was supplied.
    allowed = []
    for report in records:
        try:
            await engagement_access(db, report.engagement_id, user)
            allowed.append(report)
        except HTTPException:
            continue
    return success(allowed)


@router.post("/generate", status_code=202)
async def generate_report(
    payload: ReportGenerate, user: User = ManagerUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await engagement_access(db, payload.engagement_id, user)
    report_id = uuid.uuid4()
    extension = payload.format.value
    path = f"reports/{payload.engagement_id}/{report_id}/report.{extension}"
    report = Report(
        id=report_id,
        engagement_id=payload.engagement_id,
        report_type=payload.report_type,
        language=payload.language,
        format=payload.format,
        template_name=f"{payload.report_type.value}_{payload.language.value}",
        file_path=path,
        generated_by=user.id,
    )
    db.add(report)
    await db.commit()
    from app.tasks.report_tasks import render_report

    render_report.delay(str(report.id))
    return success(report)


@router.get("/{report_id}")
async def get_report(
    report_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    await engagement_access(db, report.engagement_id, user)
    return success(report)


@router.get("/{report_id}/download")
async def download_report(
    report_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    await engagement_access(db, report.engagement_id, user)
    if not report.file_size:
        raise HTTPException(409, "Report rendering has not completed")
    return success(
        {
            "download_url": await asyncio.to_thread(presigned_download, report.file_path),
            "expires_in": 300,
        }
    )
