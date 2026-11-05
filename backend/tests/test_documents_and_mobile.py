import io
import uuid
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app.api.v1 import authorization_docs, mobile
from app.config import settings
from app.models.authorization_doc import AuthorizationDocType
from app.models.mobile_analysis import MobilePlatform
from app.models.user import Role, User
from app.schemas.authorization_doc import RejectionRequest
from app.schemas.mobile import ManualChecklistUpdate


def upload(filename, payload, content_type):
    return UploadFile(
        io.BytesIO(payload), filename=filename, headers=Headers({"content-type": content_type})
    )


@pytest.mark.asyncio
async def test_authorization_document_upload_review_download_and_errors(
    authorized_context, monkeypatch
):
    context = authorized_context
    db, engagement, admin = context["db"], context["engagement"], context["admin"]
    clean, store = AsyncMock(), Mock()
    monkeypatch.setattr("app.api.v1.authorization_docs.ensure_clean_upload", clean)
    monkeypatch.setattr("app.api.v1.authorization_docs.upload_bytes", store)
    assert (await authorization_docs.list_documents(engagement.id, admin, db))["data"]
    with pytest.raises(HTTPException) as mime:
        await authorization_docs.upload_document(
            engagement.id,
            AuthorizationDocType.CONTRACT,
            upload("bad.txt", b"text", "text/plain"),
            admin,
            db,
        )
    assert mime.value.status_code == 415
    monkeypatch.setattr(settings, "max_upload_mb", 0)
    with pytest.raises(HTTPException) as large:
        await authorization_docs.upload_document(
            engagement.id,
            AuthorizationDocType.CONTRACT,
            upload("large.pdf", b"%PDF-large", "application/pdf"),
            admin,
            db,
        )
    assert large.value.status_code == 413
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    with pytest.raises(HTTPException) as signature:
        await authorization_docs.upload_document(
            engagement.id,
            AuthorizationDocType.CONTRACT,
            upload("bad.pdf", b"not pdf", "application/pdf"),
            admin,
            db,
        )
    assert signature.value.status_code == 422
    record = (
        await authorization_docs.upload_document(
            engagement.id,
            AuthorizationDocType.CONTRACT,
            upload("contract.pdf", b"%PDF-1.7\nsafe", "application/pdf"),
            admin,
            db,
        )
    )["data"]
    clean.assert_awaited_once_with(b"%PDF-1.7\nsafe")
    store.assert_called_once()
    assert record.sha256_hash and record.approved is None
    monkeypatch.setattr(
        "app.api.v1.authorization_docs.presigned_download",
        Mock(return_value="https://signed.example/document"),
    )
    download = (await authorization_docs.download_document(engagement.id, record.id, admin, db))[
        "data"
    ]
    assert download["expires_in"] == 300
    with pytest.raises(HTTPException) as self_review:
        await authorization_docs.approve_document(engagement.id, record.id, admin, db)
    assert self_review.value.status_code == 409
    reviewer = User(
        email="reviewer@example.com",
        full_name="Reviewer",
        role=Role.ENGAGEMENT_MANAGER,
        password_hash=admin.password_hash,
        mfa_enabled=True,
    )
    db.add(reviewer)
    await db.commit()
    await authorization_docs.approve_document(engagement.id, record.id, reviewer, db)
    assert record.approved is True and record.approved_by == reviewer.id
    await authorization_docs.reject_document(
        engagement.id, record.id, RejectionRequest(reason="Expired authorization"), reviewer, db
    )
    assert record.approved is False and record.rejection_reason == "Expired authorization"
    with pytest.raises(HTTPException):
        await authorization_docs.download_document(engagement.id, uuid.uuid4(), admin, db)


@pytest.mark.asyncio
async def test_mobile_upload_scan_checklist_and_errors(authorized_context, monkeypatch):
    context = authorized_context
    db, engagement, user = context["db"], context["engagement"], context["tester"]
    clean, store = AsyncMock(), Mock()
    monkeypatch.setattr("app.api.v1.mobile.ensure_clean_upload", clean)
    monkeypatch.setattr("app.api.v1.mobile.upload_bytes", store)
    with pytest.raises(HTTPException) as signature:
        await mobile.upload_analysis(
            engagement.id,
            "Test App",
            MobilePlatform.ANDROID,
            "com.example.app",
            "1.0",
            upload("bad.apk", b"not zip", "application/octet-stream"),
            user,
            db,
        )
    assert signature.value.status_code == 422
    monkeypatch.setattr(settings, "max_upload_mb", 0)
    with pytest.raises(HTTPException) as large:
        await mobile.upload_analysis(
            engagement.id,
            "Test App",
            MobilePlatform.ANDROID,
            "com.example.app",
            None,
            upload("large.apk", b"PK\x03\x04", "application/octet-stream"),
            user,
            db,
        )
    assert large.value.status_code == 413
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    record = (
        await mobile.upload_analysis(
            engagement.id,
            "Test App",
            MobilePlatform.ANDROID,
            "com.example.app",
            "1.0",
            upload("app.apk", b"PK\x03\x04safe", "application/octet-stream"),
            user,
            db,
        )
    )["data"]
    clean.assert_awaited_once()
    store.assert_called_once()
    assert record.file_hash_sha256 and record.app_name == "Test App"
    assert (await mobile.list_analyses(engagement.id, user, db))["data"][0].id == record.id
    assert (await mobile.get_analysis(record.id, user, db))["data"].id == record.id
    await mobile.update_checklist(
        record.id,
        ManualChecklistUpdate(manual_checklist={"MASVS-STORAGE-1": True, "MASVS-NETWORK-1": None}),
        user,
        db,
    )
    assert record.manual_checklist["MASVS-STORAGE-1"] is True
    assert len(record.masvs_mappings) == 2
    gate = AsyncMock()
    delay = Mock(return_value=Mock(id="mobile-task"))
    monkeypatch.setattr("app.api.v1.mobile.validate_job_authorization", gate)
    monkeypatch.setattr("app.tasks.mobile_tasks.run_mobile_scan.delay", delay)
    task = (await mobile.scan_analysis(record.id, user, db))["data"]
    assert task["task_id"] == "mobile-task"
    gate.assert_awaited_once()
    delay.assert_called_once_with(str(record.id), str(user.id))
    with pytest.raises(HTTPException):
        await mobile.get_analysis(uuid.uuid4(), user, db)
