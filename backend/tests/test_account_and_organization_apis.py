import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select

from app.api.deps import get_current_user, require_roles
from app.api.v1 import admin, audit, clients, dashboard, users
from app.models.audit_log import AuditLog
from app.models.finding import Finding, Severity
from app.models.job import Job, JobStatus, JobType
from app.models.system_setting import SystemSetting
from app.models.user import Role, User, UserSession
from app.schemas.auth import PasswordChange
from app.schemas.client import ClientInput
from app.schemas.user import ProfileUpdate, UserCreate, UserUpdate
from app.security.jwt import TokenValidationError
from app.security.passwords import hash_password, verify_password

TEST_VALUE_A = "N3w!VeryUniquePassphrase"
TEST_VALUE_B = "Un1que!LongPassword"
TEST_VALUE_C = "Cl1ent!LongPassword"
TEST_VALUE_D = "Outs1der!TestPassword"
TEST_VALUE_E = "Cl1ent!TestPassword"
TEST_VALUE_F = "TesterTestPass123!"
TEST_VALUE_G = "incorrect"


def new_session(user: User, *, revoked: bool = False, expired: bool = False) -> UserSession:
    return UserSession(
        user_id=user.id,
        refresh_token_hash=uuid.uuid4().hex,
        token_family=uuid.uuid4(),
        expires_at=datetime.now(timezone.utc) + timedelta(days=-1 if expired else 1),
        revoked=revoked,
        user_agent="pytest",
    )


@pytest.mark.asyncio
async def test_profile_password_and_session_management(authorized_context):
    context = authorized_context
    db, user = context["db"], context["tester"]
    assert (await users.me(user))["data"].id == user.id
    await users.update_me(ProfileUpdate(full_name="Updated Tester"), user, db)
    assert user.full_name == "Updated Tester"
    with pytest.raises(HTTPException) as wrong_password:
        await users.change_password(
            PasswordChange(current_password=TEST_VALUE_G, new_password=TEST_VALUE_A),
            user,
            db,
        )
    assert wrong_password.value.status_code == 400
    active = new_session(user)
    db.add(active)
    await db.commit()
    response = await users.change_password(
        PasswordChange(current_password=TEST_VALUE_F, new_password=TEST_VALUE_A),
        user,
        db,
    )
    assert response["data"]["sessions_revoked"] is True
    assert active.revoked is True
    assert verify_password(TEST_VALUE_A, user.password_hash)
    second = new_session(user)
    third = new_session(user)
    db.add_all([second, third])
    await db.commit()
    assert len((await users.sessions(user, db))["data"]) == 2
    with pytest.raises(HTTPException):
        await users.revoke_session(uuid.uuid4(), user, db)
    with pytest.raises(HTTPException):
        await users.revoke_session(second.id, context["admin"], db)
    await users.revoke_session(second.id, user, db)
    assert second.revoked is True
    await users.revoke_all_sessions(user, db)
    assert third.revoked is True


@pytest.mark.asyncio
async def test_user_admin_crud_filters_and_errors(authorized_context):
    context = authorized_context
    db, admin_user = context["db"], context["admin"]
    payload = UserCreate(
        email="new.user@example.com",
        full_name="New User",
        role=Role.ANALYST,
        password=TEST_VALUE_B,
    )
    created = (await users.create_user(payload, admin_user, db))["data"]
    assert created.email == "new.user@example.com"
    with pytest.raises(HTTPException) as duplicate:
        await users.create_user(payload, admin_user, db)
    assert duplicate.value.status_code == 409
    with pytest.raises(HTTPException) as missing_client:
        await users.create_user(
            UserCreate(
                email="client.user@example.com",
                full_name="Client User",
                role=Role.CLIENT,
                password=TEST_VALUE_C,
            ),
            admin_user,
            db,
        )
    assert missing_client.value.status_code == 422
    filtered = await users.list_users(
        admin_user, db, page=1, limit=20, role=Role.ANALYST, search="new.user"
    )
    assert filtered["pagination"].total == 1
    assert (await users.get_user(created.id, admin_user, db))["data"].id == created.id
    await users.update_user(
        created.id,
        UserUpdate(full_name="Updated User", role=Role.PENTESTER, is_active=True),
        admin_user,
        db,
    )
    assert created.role == Role.PENTESTER
    await users.delete_user(created.id, admin_user, db)
    assert created.deleted_at is not None and not created.is_active
    with pytest.raises(HTTPException):
        await users.get_user(created.id, admin_user, db)
    with pytest.raises(HTTPException):
        await users.update_user(
            uuid.uuid4(),
            UserUpdate(full_name="Missing", role=Role.ANALYST, is_active=True),
            admin_user,
            db,
        )
    with pytest.raises(HTTPException):
        await users.delete_user(uuid.uuid4(), admin_user, db)
    with pytest.raises(HTTPException) as self_delete:
        await users.delete_user(admin_user.id, admin_user, db)
    assert self_delete.value.status_code == 409


@pytest.mark.asyncio
async def test_current_user_validates_session_state_and_roles(authorized_context, monkeypatch):
    context = authorized_context
    db, user = context["db"], context["tester"]
    session = new_session(user)
    db.add(session)
    await db.commit()
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token")
    monkeypatch.setattr(
        "app.api.deps.decode_token",
        Mock(return_value={"sub": str(user.id), "sid": str(session.id)}),
    )
    rls = AsyncMock()
    monkeypatch.setattr("app.api.deps.set_request_rls_context", rls)
    assert (await get_current_user(credentials, db)).id == user.id
    rls.assert_awaited_once()
    admin_dependency = require_roles(Role.ADMIN)
    with pytest.raises(HTTPException) as forbidden:
        await admin_dependency(user)
    assert forbidden.value.status_code == 403
    tester_dependency = require_roles(Role.PENTESTER)
    assert (await tester_dependency(user)).id == user.id
    session.revoked = True
    await db.commit()
    with pytest.raises(HTTPException) as revoked:
        await get_current_user(credentials, db)
    assert revoked.value.status_code == 401
    session.revoked = False
    session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await db.commit()
    with pytest.raises(HTTPException, match="expired"):
        await get_current_user(credentials, db)
    monkeypatch.setattr("app.api.deps.decode_token", Mock(side_effect=TokenValidationError("bad")))
    with pytest.raises(HTTPException, match="Invalid access token"):
        await get_current_user(credentials, db)
    monkeypatch.setattr("app.api.deps.decode_token", Mock(return_value={"sub": "not-a-uuid"}))
    with pytest.raises(HTTPException):
        await get_current_user(credentials, db)


@pytest.mark.asyncio
async def test_current_user_rejects_inactive_or_unenrolled_accounts(
    authorized_context, monkeypatch
):
    context = authorized_context
    db, user = context["db"], context["tester"]
    session = new_session(user)
    db.add(session)
    await db.commit()
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token")
    monkeypatch.setattr(
        "app.api.deps.decode_token",
        Mock(return_value={"sub": str(user.id), "sid": str(session.id)}),
    )
    user.mfa_enabled = False
    await db.commit()
    with pytest.raises(HTTPException, match="not active"):
        await get_current_user(credentials, db)


@pytest.mark.asyncio
async def test_client_crud_search_and_not_found(authorized_context):
    context = authorized_context
    db, admin_user = context["db"], context["admin"]
    created = (
        await clients.create_client(
            ClientInput(company_name="New Tenant", contact_email="security@example.com"),
            admin_user,
            db,
        )
    )["data"]
    result = await clients.list_clients(admin_user, db, page=1, limit=20, search="New Tenant")
    assert result["pagination"].total == 1
    await clients.update_client(
        created.id, ClientInput(company_name="Renamed Tenant", industry="Finance"), admin_user, db
    )
    assert created.company_name == "Renamed Tenant"
    assert (await clients.get_client(created.id, admin_user, db))["data"].id == created.id
    await clients.delete_client(created.id, admin_user, db)
    with pytest.raises(HTTPException):
        await clients.get_client(created.id, admin_user, db)
    with pytest.raises(HTTPException):
        await clients.update_client(
            uuid.uuid4(), ClientInput(company_name="Missing"), admin_user, db
        )
    with pytest.raises(HTTPException):
        await clients.delete_client(uuid.uuid4(), admin_user, db)


@pytest.mark.asyncio
async def test_dashboard_stats_trends_and_client_isolation(authorized_context):
    context = authorized_context
    db, engagement, admin_user = context["db"], context["engagement"], context["admin"]
    finding = Finding(
        engagement_id=engagement.id,
        title="Dashboard finding",
        description="A finding used by aggregate dashboard queries",
        affected_asset="example.com",
        severity=Severity.CRITICAL,
    )
    job = Job(
        engagement_id=engagement.id,
        job_type=JobType.NMAP_SCAN,
        targets=["example.com"],
        tool="nmap",
        status=JobStatus.RUNNING,
        triggered_by=admin_user.id,
    )
    db.add_all([finding, job])
    await db.commit()
    stats = (await dashboard.dashboard_stats(admin_user, db))["data"]
    assert stats["active_engagements"] == 1 and stats["running_jobs"] == 1
    assert stats["severity"]["critical"] == 1
    assert (await dashboard.engagement_overview(admin_user, db))["data"]
    trend = (await dashboard.findings_trend("30d", admin_user, db))["data"]
    assert trend[0]["critical"] == 1
    client_stats = (await dashboard.client_stats(engagement.client_id, admin_user, db))["data"]
    assert client_stats["engagements"] == 1 and client_stats["findings"]["critical"] == 1
    outsider = User(
        email="outside@test.local",
        full_name="Outside",
        role=Role.PENTESTER,
        password_hash=hash_password(TEST_VALUE_D),
        mfa_enabled=True,
    )
    db.add(outsider)
    await db.commit()
    empty = (await dashboard.dashboard_stats(outsider, db))["data"]
    assert empty["active_engagements"] == 0 and empty["severity"]["critical"] == 0
    assert (await dashboard.findings_trend("7d", outsider, db))["data"] == []
    client_user = User(
        email="client@test.local",
        full_name="Client",
        role=Role.CLIENT,
        client_id=uuid.uuid4(),
        password_hash=hash_password(TEST_VALUE_E),
        mfa_enabled=True,
    )
    with pytest.raises(HTTPException) as hidden:
        await dashboard.client_stats(engagement.client_id, client_user, db)
    assert hidden.value.status_code == 404


@pytest.mark.asyncio
async def test_audit_filters_and_admin_settings(authorized_context, monkeypatch):
    context = authorized_context
    db, admin_user = context["db"], context["admin"]
    event = AuditLog(
        action="test.event", resource_type="system", user_id=admin_user.id, details={"ok": True}
    )
    db.add_all(
        [
            event,
            SystemSetting(key="company_name", value="Before"),
            SystemSetting(key="smtp_settings_encrypted", value="secret"),
        ]
    )
    await db.commit()
    assert (
        await audit.list_audit_logs(
            admin_user,
            db,
            page=1,
            limit=50,
            user_id=admin_user.id,
            action="test.event",
            resource_type="system",
        )
    )["pagination"].total == 1
    assert (
        await audit.list_audit_logs(
            admin_user,
            db,
            page=1,
            limit=50,
            action=None,
            resource_type=None,
            date_from=datetime.now(timezone.utc) + timedelta(days=1),
        )
    )["pagination"].total == 0
    visible = (await admin.get_settings(admin_user, db))["data"]
    assert {item.key for item in visible} == {"company_name"}
    await admin.update_setting(
        admin.SettingUpdate(key="company_name", value="After"), admin_user, db
    )
    await admin.update_setting(
        admin.SettingUpdate(key="data_retention_days", value=365), admin_user, db
    )
    with pytest.raises(HTTPException):
        await admin.update_setting(
            admin.SettingUpdate(key="not_allowed", value=True), admin_user, db
        )
    delay = Mock(return_value=Mock(id="retention-task"))
    monkeypatch.setattr("app.tasks.retention_tasks.enforce_retention.delay", delay)
    assert (await admin.run_retention(admin_user))["data"]["task_id"] == "retention-task"
    assert (await admin.system_health(admin_user))["data"]["authorization_gate"] == "enforced"
    assert (
        await db.scalar(select(AuditLog).where(AuditLog.action == "settings.updated")) is not None
    )
