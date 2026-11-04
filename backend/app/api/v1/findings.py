import asyncio
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.api.deps import CurrentUser, EditorUser
from app.config import settings
from app.database import get_db
from app.minio_client import presigned_download, upload_bytes
from app.models.engagement import Engagement, EngagementUser
from app.models.finding import Finding, FindingStatus, Severity
from app.models.user import Role, User
from app.schemas.common import Pagination, success
from app.schemas.finding import (
    AssignRequest,
    CommentRequest,
    CVSSRequest,
    FindingCreate,
    FindingUpdate,
    RetestRequest,
)
from app.services import finding_service
from app.services.engagement_service import engagement_access
from app.services.upload_service import ensure_clean_upload
from app.utils.cvss import calculate_cvss
from app.utils.dedup import finding_fingerprint

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("")
async def list_findings(
    user: User = CurrentUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    engagement_id: uuid.UUID | None = None,
    severity: Severity | None = None,
    status_filter: FindingStatus | None = Query(None, alias="status"),
    cwe_id: str | None = None,
    search: str | None = Query(None, max_length=100),
) -> dict[str, Any]:
    conditions: list[ColumnElement[bool]] = [Finding.deleted_at.is_(None)]
    if user.role == Role.CLIENT:
        conditions.append(Engagement.client_id == user.client_id)
    elif user.role not in {Role.ADMIN, Role.ENGAGEMENT_MANAGER}:
        conditions.append(
            Finding.engagement_id.in_(
                select(EngagementUser.engagement_id).where(EngagementUser.user_id == user.id)
            )
        )
    for column, value in (
        (Finding.engagement_id, engagement_id),
        (Finding.severity, severity),
        (Finding.status, status_filter),
        (Finding.cwe_id, cwe_id),
    ):
        if value is not None:
            conditions.append(column == value)
    if search:
        conditions.append(Finding.title.ilike(f"%{search}%"))
    total = await db.scalar(select(func.count(Finding.id)).join(Engagement).where(*conditions)) or 0
    records = (
        await db.scalars(
            select(Finding)
            .join(Engagement)
            .where(*conditions)
            .order_by(Finding.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    pagination = Pagination(page=page, limit=limit, total=total, pages=(total + limit - 1) // limit)
    if user.role == Role.CLIENT:
        client_records = jsonable_encoder(list(records))
        for finding_data in client_records:
            finding_data.pop("comments", None)
            finding_data.pop("evidence_files", None)
        return success(client_records, pagination)
    return success(list(records), pagination)


@router.post("", status_code=201)
async def create_finding(
    payload: FindingCreate, user: User = EditorUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await engagement_access(db, payload.engagement_id, user)
    return success(await finding_service.create_finding(db, payload, user))


@router.post("/cvss/calculate")
async def cvss_calculate(payload: CVSSRequest, user: User = CurrentUser) -> dict[str, Any]:
    try:
        score, severity = calculate_cvss(payload.vector_string)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return success({"score": score, "severity": severity.value})


@router.post("/deduplicate")
async def deduplicate(
    engagement_id: uuid.UUID, user: User = EditorUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await engagement_access(db, engagement_id, user)
    findings = list(
        (
            await db.scalars(
                select(Finding)
                .where(Finding.engagement_id == engagement_id, Finding.deleted_at.is_(None))
                .order_by(Finding.created_at)
            )
        ).all()
    )
    seen: dict[str, uuid.UUID] = {}
    duplicates = 0
    for finding in findings:
        fingerprint = finding_fingerprint(finding.title, finding.affected_asset, finding.cwe_id)
        if fingerprint in seen:
            finding.is_duplicate_of = seen[fingerprint]
            duplicates += 1
        else:
            seen[fingerprint] = finding.id
    await db.commit()
    return success({"duplicates_marked": duplicates})


async def _finding(db: AsyncSession, finding_id: uuid.UUID, user: User) -> Finding:
    finding = await db.scalar(
        select(Finding).where(Finding.id == finding_id, Finding.deleted_at.is_(None))
    )
    if not finding:
        raise HTTPException(404, "Finding not found")
    await engagement_access(db, finding.engagement_id, user)
    return finding


@router.get("/{finding_id}")
async def get_finding(
    finding_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    finding = await _finding(db, finding_id, user)
    if user.role == Role.CLIENT:
        data = jsonable_encoder(finding)
        data.pop("comments", None)
        data.pop("evidence_files", None)
        return success(data)
    return success(finding)


@router.post("/{finding_id}/evidence", status_code=201)
async def upload_evidence(
    finding_id: uuid.UUID,
    file: UploadFile = File(...),
    user: User = EditorUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    finding = await _finding(db, finding_id, user)
    allowed = {"application/pdf", "image/png", "image/jpeg", "text/plain", "application/json"}
    if file.content_type not in allowed:
        raise HTTPException(415, "Evidence must be PDF, PNG, JPEG, plain text, or JSON")
    payload = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if not payload or len(payload) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, "Evidence is empty or exceeds the configured size limit")
    signatures = {
        "application/pdf": b"%PDF-",
        "image/png": b"\x89PNG",
        "image/jpeg": b"\xff\xd8\xff",
    }
    expected = signatures.get(file.content_type)
    if expected and not payload.startswith(expected):
        raise HTTPException(422, "Evidence signature does not match its media type")
    if file.content_type in {"text/plain", "application/json"} and b"\x00" in payload:
        raise HTTPException(422, "Text evidence contains invalid binary content")
    await ensure_clean_upload(payload)
    evidence_id = uuid.uuid4()
    path = (
        f"evidence/{finding.engagement_id}/{finding.id}/{evidence_id}/{file.filename or 'evidence'}"
    )
    await asyncio.to_thread(upload_bytes, path, payload, file.content_type)
    metadata = {
        "id": str(evidence_id),
        "filename": (file.filename or "evidence")[:255],
        "path": path,
        "size": len(payload),
        "mime_type": file.content_type,
        "sha256": hashlib.sha256(payload).hexdigest(),
        "uploaded_by": str(user.id),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    finding.evidence_files = [*finding.evidence_files, metadata]
    await db.commit()
    return success(metadata)


@router.get("/{finding_id}/evidence/{evidence_id}/download")
async def download_evidence(
    finding_id: uuid.UUID,
    evidence_id: uuid.UUID,
    user: User = CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if user.role == Role.CLIENT:
        raise HTTPException(403, "Client users receive finding summaries, not raw evidence")
    finding = await _finding(db, finding_id, user)
    evidence = next(
        (item for item in finding.evidence_files if item.get("id") == str(evidence_id)), None
    )
    if not evidence:
        raise HTTPException(404, "Evidence not found")
    return success(
        {
            "download_url": await asyncio.to_thread(presigned_download, evidence["path"]),
            "expires_in": 300,
        }
    )


@router.put("/{finding_id}")
async def update_finding(
    finding_id: uuid.UUID,
    payload: FindingUpdate,
    user: User = EditorUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    finding = await _finding(db, finding_id, user)
    return success(await finding_service.update_finding(db, finding, payload, user))


@router.delete("/{finding_id}")
async def delete_finding(
    finding_id: uuid.UUID, user: User = EditorUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    finding = await _finding(db, finding_id, user)
    finding.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return success({"deleted": True})


@router.post("/{finding_id}/assign")
async def assign_finding(
    finding_id: uuid.UUID,
    payload: AssignRequest,
    user: User = EditorUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    finding = await _finding(db, finding_id, user)
    finding.assigned_to = payload.user_id
    await db.commit()
    return success({"assigned": True})


@router.post("/{finding_id}/retest")
async def retest_finding(
    finding_id: uuid.UUID,
    payload: RetestRequest,
    user: User = EditorUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    finding = await _finding(db, finding_id, user)
    return success(
        await finding_service.request_retest(db, finding, payload.result, payload.notes, user)
    )


@router.post("/{finding_id}/acknowledge")
async def acknowledge_finding(
    finding_id: uuid.UUID,
    payload: CommentRequest,
    user: User = CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if user.role not in {Role.CLIENT, Role.ADMIN, Role.ENGAGEMENT_MANAGER}:
        raise HTTPException(403, "This role cannot acknowledge risk")
    finding = await _finding(db, finding_id, user)
    finding.status = FindingStatus.ACCEPTED_RISK
    await finding_service.add_comment(db, finding, f"Risk acknowledgement: {payload.text}", user)
    return success({"id": finding.id, "status": finding.status})


@router.post("/{finding_id}/comment")
async def comment_finding(
    finding_id: uuid.UUID,
    payload: CommentRequest,
    user: User = CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if user.role == Role.ANALYST:
        raise HTTPException(403, "Analyst access is read-only")
    finding = await _finding(db, finding_id, user)
    return success(await finding_service.add_comment(db, finding, payload.text, user))
