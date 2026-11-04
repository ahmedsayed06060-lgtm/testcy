import asyncio
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, ManagerUser
from app.config import settings
from app.database import get_db
from app.minio_client import presigned_download, upload_bytes
from app.models.authorization_doc import AuthorizationDoc, AuthorizationDocType
from app.models.user import User
from app.schemas.authorization_doc import RejectionRequest
from app.schemas.common import success
from app.services.audit_service import record_audit
from app.services.engagement_service import engagement_access
from app.services.upload_service import ensure_clean_upload

router = APIRouter(prefix="/engagements", tags=["authorization documents"])
ALLOWED_MIME = {"application/pdf", "image/png", "image/jpeg"}


@router.get("/{engagement_id}/authorization-docs")
async def list_documents(
    engagement_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await engagement_access(db, engagement_id, user)
    records = (
        await db.scalars(
            select(AuthorizationDoc)
            .where(AuthorizationDoc.engagement_id == engagement_id)
            .order_by(AuthorizationDoc.created_at.desc())
        )
    ).all()
    return success(list(records))


@router.post("/{engagement_id}/authorization-docs", status_code=201)
async def upload_document(
    engagement_id: uuid.UUID,
    doc_type: AuthorizationDocType = Form(...),
    file: UploadFile = File(...),
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    await engagement_access(db, engagement_id, user)
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(415, "Only PDF, PNG, and JPEG authorization documents are accepted")
    payload = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if len(payload) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, "Uploaded document is too large")
    if file.content_type == "application/pdf" and not payload.startswith(b"%PDF-"):
        raise HTTPException(422, "PDF signature is invalid")
    await ensure_clean_upload(payload)
    path = f"authorizations/{engagement_id}/{uuid.uuid4()}/{file.filename or 'document'}"
    await asyncio.to_thread(upload_bytes, path, payload, file.content_type)
    record = AuthorizationDoc(
        engagement_id=engagement_id,
        doc_type=doc_type,
        original_filename=(file.filename or "document")[:255],
        file_path=path,
        file_size=len(payload),
        mime_type=file.content_type,
        sha256_hash=hashlib.sha256(payload).hexdigest(),
        uploaded_by=user.id,
    )
    db.add(record)
    await db.flush()
    await record_audit(
        db,
        action="authorization.uploaded",
        resource_type="authorization_doc",
        resource_id=record.id,
        user_id=user.id,
    )
    await db.commit()
    return success(record)


async def _document(
    db: AsyncSession, engagement_id: uuid.UUID, doc_id: uuid.UUID, user: User
) -> AuthorizationDoc:
    await engagement_access(db, engagement_id, user)
    record = await db.get(AuthorizationDoc, doc_id)
    if not record or record.engagement_id != engagement_id:
        raise HTTPException(404, "Authorization document not found")
    return record


@router.get("/{engagement_id}/authorization-docs/{doc_id}/download")
async def download_document(
    engagement_id: uuid.UUID,
    doc_id: uuid.UUID,
    user: User = CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    record = await _document(db, engagement_id, doc_id, user)
    return success(
        {
            "download_url": await asyncio.to_thread(presigned_download, record.file_path),
            "expires_in": 300,
        }
    )


@router.post("/{engagement_id}/authorization-docs/{doc_id}/approve")
async def approve_document(
    engagement_id: uuid.UUID,
    doc_id: uuid.UUID,
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    record = await _document(db, engagement_id, doc_id, user)
    if record.uploaded_by == user.id:
        raise HTTPException(409, "Document uploader cannot approve their own document")
    record.approved = True
    record.approved_by = user.id
    record.approved_at = datetime.now(timezone.utc)
    record.rejection_reason = None
    await record_audit(
        db,
        action="authorization.approved",
        resource_type="authorization_doc",
        resource_id=record.id,
        user_id=user.id,
    )
    await db.commit()
    return success(record)


@router.post("/{engagement_id}/authorization-docs/{doc_id}/reject")
async def reject_document(
    engagement_id: uuid.UUID,
    doc_id: uuid.UUID,
    payload: RejectionRequest,
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    record = await _document(db, engagement_id, doc_id, user)
    record.approved = False
    record.approved_by = user.id
    record.approved_at = datetime.now(timezone.utc)
    record.rejection_reason = payload.reason
    await db.commit()
    return success(record)
