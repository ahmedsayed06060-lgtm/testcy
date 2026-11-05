import io
import uuid
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app.api.v1 import findings
from app.config import settings
from app.models.finding import FindingStatus, Severity
from app.models.user import Role, User
from app.schemas.finding import (
    AssignRequest,
    CommentRequest,
    CVSSRequest,
    FindingCreate,
    FindingUpdate,
    RetestRequest,
)
from app.utils.cvss import calculate_cvss


def finding_payload(context, title="Validated finding"):
    return FindingCreate(
        engagement_id=context["engagement"].id,
        title=title,
        description='<p>Detailed description</p><script>alert("x")</script>',
        business_impact="<strong>Revenue impact</strong>",
        affected_asset="portal.example.com",
        severity=Severity.HIGH,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        cvss_score=9.8,
        cwe_id="CWE-89",
        owasp_category="A03:2021-Injection",
        evidence='<a href="javascript:alert(1)">Evidence</a>',
        remediation="<p>Apply parameterized queries</p>",
        tags=["injection"],
    )


def upload(filename, payload, content_type):
    return UploadFile(
        io.BytesIO(payload),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


@pytest.mark.asyncio
async def test_finding_crud_sanitization_deduplication_and_client_redaction(authorized_context):
    context = authorized_context
    db, user = context["db"], context["tester"]
    finding = (await findings.create_finding(finding_payload(context), user, db))["data"]
    assert "<script" not in finding.description and "javascript:" not in finding.evidence
    assert finding.business_impact == "<strong>Revenue impact</strong>"
    duplicate = (await findings.create_finding(finding_payload(context), user, db))["data"]
    result = (await findings.deduplicate(context["engagement"].id, user, db))["data"]
    assert result["duplicates_marked"] == 1 and duplicate.is_duplicate_of == finding.id
    listed = await findings.list_findings(
        user,
        db,
        page=1,
        limit=20,
        engagement_id=context["engagement"].id,
        severity=Severity.HIGH,
        status_filter=FindingStatus.OPEN,
        cwe_id="CWE-89",
        search="Validated",
    )
    assert listed["pagination"].total == 2
    update = FindingUpdate(
        **finding_payload(context, "Updated finding").model_dump(), status=FindingStatus.IN_PROGRESS
    )
    await findings.update_finding(finding.id, update, user, db)
    assert finding.title == "Updated finding" and finding.status == FindingStatus.IN_PROGRESS
    await findings.assign_finding(finding.id, AssignRequest(user_id=user.id), user, db)
    assert finding.assigned_to == user.id
    await findings.retest_finding(
        finding.id, RetestRequest(result="Fix deployed", notes="Retest requested"), user, db
    )
    assert finding.status == FindingStatus.RETEST
    await findings.comment_finding(
        finding.id, CommentRequest(text="<p>Internal note</p>"), user, db
    )
    assert finding.comments[-1]["text"] == "<p>Internal note</p>"
    analyst = User(
        email="analyst@example.com",
        full_name="Analyst",
        role=Role.ANALYST,
        password_hash=user.password_hash,
        mfa_enabled=True,
    )
    with pytest.raises(HTTPException) as read_only:
        await findings.comment_finding(finding.id, CommentRequest(text="Not allowed"), analyst, db)
    assert read_only.value.status_code == 403
    with pytest.raises(HTTPException):
        await findings.acknowledge_finding(
            finding.id, CommentRequest(text="Not allowed"), analyst, db
        )
    client = User(
        email="client@example.com",
        full_name="Client",
        role=Role.CLIENT,
        client_id=context["client"].id,
        password_hash=user.password_hash,
        mfa_enabled=True,
    )
    client_list = await findings.list_findings(
        client,
        db,
        page=1,
        limit=20,
        engagement_id=None,
        severity=None,
        status_filter=None,
        cwe_id=None,
        search=None,
    )
    assert "comments" not in client_list["data"][0]
    client_detail = (await findings.get_finding(finding.id, client, db))["data"]
    assert "comments" not in client_detail and "evidence_files" not in client_detail
    await findings.acknowledge_finding(
        finding.id, CommentRequest(text="Business accepts residual risk"), client, db
    )
    assert finding.status == FindingStatus.ACCEPTED_RISK
    await findings.delete_finding(finding.id, user, db)
    with pytest.raises(HTTPException):
        await findings.get_finding(finding.id, user, db)
    with pytest.raises(HTTPException):
        await findings.get_finding(uuid.uuid4(), user, db)


@pytest.mark.asyncio
async def test_cvss_endpoint_and_severity_boundaries(authorized_context, monkeypatch):
    vector = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
    result = (
        await findings.cvss_calculate(
            CVSSRequest(vector_string=vector), authorized_context["tester"]
        )
    )["data"]
    assert result["score"] == 9.8 and result["severity"] == "critical"
    with pytest.raises(HTTPException) as invalid:
        await findings.cvss_calculate(
            CVSSRequest(vector_string="CVSS:3.1/not-valid"), authorized_context["tester"]
        )
    assert invalid.value.status_code == 422
    for score, severity in (
        (9.0, Severity.CRITICAL),
        (7.0, Severity.HIGH),
        (4.0, Severity.MEDIUM),
        (0.1, Severity.LOW),
        (0.0, Severity.INFORMATIONAL),
    ):
        parsed = Mock(base_score=score)
        monkeypatch.setattr("app.utils.cvss.CVSS3", Mock(return_value=parsed))
        assert calculate_cvss(vector) == (score, severity)
    monkeypatch.setattr("app.utils.cvss.CVSS3", Mock(side_effect=ValueError("bad")))
    with pytest.raises(ValueError, match="valid CVSS"):
        calculate_cvss(vector)


@pytest.mark.asyncio
async def test_evidence_upload_download_and_validation(authorized_context, monkeypatch):
    context = authorized_context
    db, user = context["db"], context["tester"]
    finding = (await findings.create_finding(finding_payload(context), user, db))["data"]
    clean = AsyncMock()
    store = Mock()
    monkeypatch.setattr("app.api.v1.findings.ensure_clean_upload", clean)
    monkeypatch.setattr("app.api.v1.findings.upload_bytes", store)
    with pytest.raises(HTTPException) as unsupported:
        await findings.upload_evidence(
            finding.id, upload("bad.exe", b"MZ", "application/x-msdownload"), user, db
        )
    assert unsupported.value.status_code == 415
    with pytest.raises(HTTPException) as empty:
        await findings.upload_evidence(finding.id, upload("empty.txt", b"", "text/plain"), user, db)
    assert empty.value.status_code == 413
    monkeypatch.setattr(settings, "max_upload_mb", 0)
    with pytest.raises(HTTPException) as too_large:
        await findings.upload_evidence(
            finding.id, upload("large.txt", b"x", "text/plain"), user, db
        )
    assert too_large.value.status_code == 413
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    with pytest.raises(HTTPException) as signature:
        await findings.upload_evidence(
            finding.id, upload("fake.pdf", b"not pdf", "application/pdf"), user, db
        )
    assert signature.value.status_code == 422
    with pytest.raises(HTTPException) as binary:
        await findings.upload_evidence(
            finding.id, upload("binary.txt", b"a\x00b", "text/plain"), user, db
        )
    assert binary.value.status_code == 422
    metadata = (
        await findings.upload_evidence(
            finding.id, upload("evidence.txt", b"safe evidence", "text/plain"), user, db
        )
    )["data"]
    clean.assert_awaited_once_with(b"safe evidence")
    store.assert_called_once()
    assert metadata["size"] == 13 and metadata["sha256"]
    monkeypatch.setattr(
        "app.api.v1.findings.presigned_download",
        Mock(return_value="https://signed.example/evidence"),
    )
    downloaded = (
        await findings.download_evidence(finding.id, uuid.UUID(metadata["id"]), user, db)
    )["data"]
    assert downloaded["expires_in"] == 300
    with pytest.raises(HTTPException):
        await findings.download_evidence(finding.id, uuid.uuid4(), user, db)
    client = User(
        email="client-evidence@example.com",
        full_name="Client",
        role=Role.CLIENT,
        client_id=context["client"].id,
        password_hash=user.password_hash,
        mfa_enabled=True,
    )
    with pytest.raises(HTTPException) as forbidden:
        await findings.download_evidence(finding.id, uuid.UUID(metadata["id"]), client, db)
    assert forbidden.value.status_code == 403
