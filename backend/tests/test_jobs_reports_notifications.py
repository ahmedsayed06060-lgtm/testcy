import uuid
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException, WebSocketDisconnect
from pydantic import ValidationError

from app.api.v1 import jobs, notifications, reports
from app.models.job import Job, JobStatus, JobType, ScanProfile
from app.models.notification import Notification
from app.models.report import ReportFormat, ReportLanguage, ReportType
from app.models.user import Role, User
from app.schemas.job import JobCreate
from app.schemas.report import ReportGenerate


def job_payload(context, job_type=JobType.NMAP_SCAN):
    return JobCreate(
        engagement_id=context["engagement"].id,
        job_type=job_type,
        targets=["example.com"],
        profile=ScanProfile.STANDARD,
        parameters={"priority": "normal"},
    )


def persisted_job(context, status=JobStatus.PENDING):
    return Job(
        engagement_id=context["engagement"].id,
        job_type=JobType.NMAP_SCAN,
        targets=["example.com"],
        tool="nmap",
        status=status,
        triggered_by=context["tester"].id,
    )


@pytest.mark.asyncio
async def test_job_creation_queue_failure_list_get_and_output(authorized_context, monkeypatch):
    context = authorized_context
    db, user = context["db"], context["tester"]
    gate = AsyncMock()
    monkeypatch.setattr("app.services.job_service.validate_job_authorization", gate)
    delay = Mock(return_value=Mock(id="celery-job"))
    monkeypatch.setattr("app.tasks.scan_tasks.execute_scan.delay", delay)
    created = (await jobs.create_job(job_payload(context), user, db))["data"]
    assert created.parameters["celery_task_id"] == "celery-job"
    gate.assert_awaited_once()
    listed = await jobs.list_jobs(
        user,
        db,
        page=1,
        limit=20,
        engagement_id=context["engagement"].id,
        status_filter=JobStatus.PENDING,
        job_type=JobType.NMAP_SCAN,
    )
    assert listed["pagination"].total == 1
    assert (await jobs.get_job(created.id, user, db))["data"].id == created.id
    with pytest.raises(HTTPException):
        await jobs.job_output(created.id, user, db)
    monkeypatch.setattr("app.api.v1.jobs.download_bytes", Mock(return_value=b"protected output"))
    created.raw_output_path = "jobs/output.log"
    await db.commit()
    response = await jobs.job_output(created.id, user, db)
    chunks = [chunk async for chunk in response.body_iterator]
    assert b"".join(chunks) == b"protected output"
    client = User(
        email="job-client@example.com",
        full_name="Client",
        role=Role.CLIENT,
        client_id=context["client"].id,
        password_hash=user.password_hash,
        mfa_enabled=True,
    )
    with pytest.raises(HTTPException) as forbidden:
        await jobs.job_output(created.id, client, db)
    assert forbidden.value.status_code == 403
    with pytest.raises(HTTPException):
        await jobs.get_job(uuid.uuid4(), user, db)
    with pytest.raises(HTTPException) as custom:
        await jobs.create_job(job_payload(context, JobType.CUSTOM), user, db)
    assert custom.value.status_code == 400
    monkeypatch.setattr(
        "app.tasks.scan_tasks.execute_scan.delay", Mock(side_effect=ConnectionError("queue down"))
    )
    with pytest.raises(HTTPException) as unavailable:
        await jobs.create_job(job_payload(context), user, db)
    assert unavailable.value.status_code == 503


@pytest.mark.asyncio
async def test_job_input_blocks_execution_overrides_and_duplicate_targets(authorized_context):
    with pytest.raises(ValidationError):
        JobCreate(
            engagement_id=authorized_context["engagement"].id,
            job_type=JobType.NMAP_SCAN,
            targets=["example.com"],
            parameters={"privileged": True},
        )
    with pytest.raises(ValidationError):
        JobCreate(
            engagement_id=authorized_context["engagement"].id,
            job_type=JobType.NMAP_SCAN,
            targets=["example.com", "example.com"],
        )


@pytest.mark.asyncio
async def test_job_cancellation_and_global_kill_switch(authorized_context, monkeypatch):
    context = authorized_context
    db, user = context["db"], context["tester"]
    first, second, complete = (
        persisted_job(context, JobStatus.RUNNING),
        persisted_job(context),
        persisted_job(context, JobStatus.COMPLETED),
    )
    first.parameters = {"celery_task_id": "active-task"}
    db.add_all([first, second, complete])
    await db.commit()
    revoke = Mock()
    monkeypatch.setattr("app.tasks.celery_app.celery_app.control.revoke", revoke)
    await jobs.cancel_job(first.id, user, db)
    assert first.status == JobStatus.CANCELLED and first.cancelled_by == user.id
    revoke.assert_called_once_with("active-task", terminate=True, signal="SIGTERM")
    with pytest.raises(HTTPException) as conflict:
        await jobs.cancel_job(first.id, user, db)
    assert conflict.value.status_code == 409
    second.status = JobStatus.RUNNING
    await db.commit()
    result = (await jobs.kill_switch(context["admin"], db))["data"]
    assert result["cancelled_jobs"] == 1
    assert second.status == JobStatus.CANCELLED and complete.status == JobStatus.COMPLETED


@pytest.mark.asyncio
async def test_report_generation_library_and_download_states(authorized_context, monkeypatch):
    context = authorized_context
    db, user, engagement = context["db"], context["admin"], context["engagement"]
    delay = Mock()
    monkeypatch.setattr("app.tasks.report_tasks.render_report.delay", delay)
    payload = ReportGenerate(
        engagement_id=engagement.id,
        report_type=ReportType.FULL,
        language=ReportLanguage.AR,
        format=ReportFormat.PDF,
    )
    report = (await reports.generate_report(payload, user, db))["data"]
    delay.assert_called_once_with(str(report.id))
    assert report.template_name == "full_ar"
    assert (await reports.list_reports(engagement.id, user, db))["data"][0].id == report.id
    assert (await reports.list_reports(None, user, db))["data"][0].id == report.id
    assert (await reports.get_report(report.id, user, db))["data"].id == report.id
    with pytest.raises(HTTPException) as pending:
        await reports.download_report(report.id, user, db)
    assert pending.value.status_code == 409
    report.file_size = 1024
    await db.commit()
    monkeypatch.setattr(
        "app.api.v1.reports.presigned_download", Mock(return_value="https://signed.example/report")
    )
    result = (await reports.download_report(report.id, user, db))["data"]
    assert result["expires_in"] == 300
    with pytest.raises(HTTPException):
        await reports.get_report(uuid.uuid4(), user, db)
    with pytest.raises(HTTPException):
        await reports.download_report(uuid.uuid4(), user, db)


@pytest.mark.asyncio
async def test_notifications_read_ticket_and_websocket(authorized_context, monkeypatch):
    context = authorized_context
    db, user = context["db"], context["tester"]
    unread = Notification(
        user_id=user.id, title="Unread", message="Review this", type="info", read=False
    )
    read = Notification(
        user_id=user.id, title="Read", message="Already reviewed", type="info", read=True
    )
    db.add_all([unread, read])
    await db.commit()
    assert len((await notifications.list_notifications(False, user, db))["data"]) == 2
    only_unread = (await notifications.list_notifications(True, user, db))["data"]
    assert [item.id for item in only_unread] == [unread.id]
    assert (await notifications.read_notification(unread.id, user, db))["data"].read is True
    with pytest.raises(HTTPException):
        await notifications.read_notification(uuid.uuid4(), user, db)
    with pytest.raises(HTTPException):
        await notifications.read_notification(read.id, context["admin"], db)
    assert (await notifications.read_all(user, db))["data"]["read"] is True
    redis_set = AsyncMock()
    monkeypatch.setattr("app.api.v1.notifications.redis_client.set", redis_set)
    ticket = (await notifications.websocket_ticket(user))["data"]
    assert ticket["expires_in"] == 30 and ticket["ticket"]
    redis_set.assert_awaited_once()
    socket = Mock()
    socket.query_params = {"ticket": "bad"}
    socket.close = AsyncMock()
    monkeypatch.setattr(
        "app.api.v1.notifications.redis_client.getdel", AsyncMock(return_value=None)
    )
    await notifications.notifications_socket(socket)
    socket.close.assert_awaited_once_with(code=4401, reason="Invalid or expired single-use ticket")
    socket = Mock()
    socket.query_params = {"ticket": "valid"}
    socket.accept = AsyncMock()
    socket.send_json = AsyncMock()
    socket.send_text = AsyncMock()
    pubsub = Mock()
    pubsub.subscribe = AsyncMock()
    pubsub.get_message = AsyncMock(
        side_effect=[{"type": "message", "data": "payload"}, WebSocketDisconnect()]
    )
    pubsub.unsubscribe = AsyncMock()
    pubsub.aclose = AsyncMock()
    monkeypatch.setattr(
        "app.api.v1.notifications.redis_client.getdel", AsyncMock(return_value=str(user.id))
    )
    monkeypatch.setattr("app.api.v1.notifications.redis_client.pubsub", Mock(return_value=pubsub))
    await notifications.notifications_socket(socket)
    socket.accept.assert_awaited_once()
    socket.send_text.assert_awaited_once_with("payload")
    pubsub.unsubscribe.assert_awaited_once()
    pubsub.aclose.assert_awaited_once()
