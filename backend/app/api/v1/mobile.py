import asyncio
import hashlib
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, EditorUser
from app.config import settings
from app.database import get_db
from app.minio_client import upload_bytes
from app.models.mobile_analysis import MobileAnalysis, MobilePlatform
from app.models.user import User
from app.schemas.common import success
from app.schemas.mobile import ManualChecklistUpdate
from app.security.authorization_gate import validate_job_authorization
from app.services.engagement_service import engagement_access
from app.services.upload_service import ensure_clean_upload

router = APIRouter(prefix="/mobile-analyses", tags=["mobile analysis"])


@router.get("")
async def list_analyses(
    engagement_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await engagement_access(db, engagement_id, user)
    records = (
        await db.scalars(
            select(MobileAnalysis).where(MobileAnalysis.engagement_id == engagement_id)
        )
    ).all()
    return success(list(records))


@router.post("", status_code=201)
async def upload_analysis(
    engagement_id: uuid.UUID = Form(...),
    app_name: str = Form(...),
    platform: MobilePlatform = Form(...),
    package_name: str = Form(...),
    version: str | None = Form(None),
    file: UploadFile = File(...),
    user: User = EditorUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    await engagement_access(db, engagement_id, user)
    payload = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if len(payload) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, "Application is too large")
    if not payload.startswith(b"PK"):
        raise HTTPException(422, "APK/IPA ZIP signature is invalid")
    await ensure_clean_upload(payload)
    file_hash = hashlib.sha256(payload).hexdigest()
    path = f"mobile/{engagement_id}/{uuid.uuid4()}/{file.filename or 'application.bin'}"
    await asyncio.to_thread(upload_bytes, path, payload, "application/octet-stream")
    record = MobileAnalysis(
        engagement_id=engagement_id,
        app_name=app_name[:255],
        platform=platform,
        package_name=package_name[:255],
        version=version,
        file_path=path,
        file_hash_sha256=file_hash,
        analyzed_by=user.id,
    )
    db.add(record)
    await db.commit()
    return success(record)


async def _analysis(db: AsyncSession, analysis_id: uuid.UUID, user: User) -> MobileAnalysis:
    record = await db.get(MobileAnalysis, analysis_id)
    if not record:
        raise HTTPException(404, "Mobile analysis not found")
    await engagement_access(db, record.engagement_id, user)
    return record


@router.get("/{analysis_id}")
async def get_analysis(
    analysis_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    return success(await _analysis(db, analysis_id, user))


@router.post("/{analysis_id}/scan", status_code=202)
async def scan_analysis(
    analysis_id: uuid.UUID, user: User = EditorUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    record = await _analysis(db, analysis_id, user)
    await validate_job_authorization(
        record.engagement_id, [f"app:{record.package_name}"], "mobsf_scan", user, db
    )
    from app.tasks.mobile_tasks import run_mobile_scan

    result = run_mobile_scan.delay(str(record.id), str(user.id))
    return success({"task_id": result.id})


@router.put("/{analysis_id}/checklist")
async def update_checklist(
    analysis_id: uuid.UUID,
    payload: ManualChecklistUpdate,
    user: User = EditorUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    record = await _analysis(db, analysis_id, user)
    record.manual_checklist = payload.manual_checklist
    record.masvs_mappings = [
        {"control": key, "status": value} for key, value in payload.manual_checklist.items()
    ]
    await db.commit()
    return success(record)
