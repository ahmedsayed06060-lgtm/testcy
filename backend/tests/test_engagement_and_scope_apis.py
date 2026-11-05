import uuid
from datetime import date, time, timedelta
from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.v1 import engagements, scope
from app.models.engagement import EngagementRole, EngagementStatus, EngagementType
from app.models.scope import AssetType, ScopeItem, VerificationMethod
from app.models.user import Role, User
from app.schemas.engagement import (
    AssignmentRequest,
    EngagementCreate,
    EngagementUpdate,
    StatusTransition,
)
from app.schemas.scope import ScopeCreate, ScopeUpdate
from app.security.passwords import hash_password
from app.services.engagement_service import engagement_access

TEST_VALUE = "ManagerTest123!"


def engagement_payload(context, update=False):
    values = dict(
        client_id=context["client"].id,
        name="New authorized assessment",
        type=EngagementType.PENTEST,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=30),
        testing_window_start=time(9),
        testing_window_end=time(17),
        testing_window_timezone="UTC",
        rules_of_engagement="Only approved non-destructive testing is permitted.",
        emergency_contact_name="Security Lead",
        emergency_contact_phone="+123456789",
        emergency_contact_email="security@example.com",
    )
    return EngagementUpdate(**values) if update else EngagementCreate(**values)


@pytest.mark.asyncio
async def test_engagement_crud_lifecycle_assignment_and_filters(authorized_context):
    context = authorized_context
    db, manager = context["db"], context["admin"]
    created = (await engagements.create_engagement(engagement_payload(context), manager, db))[
        "data"
    ]
    assert created.status == EngagementStatus.DRAFT
    listed = await engagements.list_engagements(
        manager,
        db,
        page=1,
        limit=20,
        status_filter=EngagementStatus.DRAFT,
        client_id=context["client"].id,
        search="New authorized",
    )
    assert listed["pagination"].total == 1
    assert (await engagements.get_engagement(created.id, manager, db))["data"].id == created.id
    await engagements.update_engagement(
        created.id, engagement_payload(context, update=True), manager, db
    )
    await engagements.transition_engagement(
        created.id, StatusTransition(new_status=EngagementStatus.PENDING_APPROVAL), manager, db
    )
    await engagements.transition_engagement(
        created.id, StatusTransition(new_status=EngagementStatus.APPROVED), manager, db
    )
    await engagements.transition_engagement(
        created.id, StatusTransition(new_status=EngagementStatus.ACTIVE), manager, db
    )
    with pytest.raises(HTTPException) as invalid_transition:
        await engagements.transition_engagement(
            created.id, StatusTransition(new_status=EngagementStatus.DRAFT), manager, db
        )
    assert invalid_transition.value.status_code == 409
    with pytest.raises(HTTPException) as active_edit:
        await engagements.update_engagement(
            created.id, engagement_payload(context, update=True), manager, db
        )
    assert active_edit.value.status_code == 409
    assignment = AssignmentRequest(
        user_id=context["tester"].id, role_in_engagement=EngagementRole.REVIEWER
    )
    await engagements.assign_user(created.id, assignment, manager, db)
    await engagements.assign_user(created.id, assignment, manager, db)
    await engagements.unassign_user(created.id, context["tester"].id, manager, db)
    await engagements.unassign_user(created.id, context["tester"].id, manager, db)
    await engagements.delete_engagement(created.id, manager, db)
    with pytest.raises(HTTPException):
        await engagements.get_engagement(created.id, manager, db)
    with pytest.raises(HTTPException):
        await engagements.delete_engagement(uuid.uuid4(), manager, db)


@pytest.mark.asyncio
async def test_only_admin_can_delete_and_engagement_access_is_tenant_aware(authorized_context):
    context = authorized_context
    db, engagement = context["db"], context["engagement"]
    manager = User(
        email="manager@example.com",
        full_name="Manager",
        role=Role.ENGAGEMENT_MANAGER,
        password_hash=hash_password(TEST_VALUE),
        mfa_enabled=True,
    )
    db.add(manager)
    await db.commit()
    with pytest.raises(HTTPException) as forbidden:
        await engagements.delete_engagement(engagement.id, manager, db)
    assert forbidden.value.status_code == 403
    client = User(
        email="tenant@example.com",
        full_name="Tenant",
        role=Role.CLIENT,
        client_id=engagement.client_id,
        password_hash=hash_password(TEST_VALUE),
        mfa_enabled=True,
    )
    assert (await engagement_access(db, engagement.id, client)).id == engagement.id
    client.client_id = uuid.uuid4()
    with pytest.raises(HTTPException) as hidden:
        await engagement_access(db, engagement.id, client)
    assert hidden.value.status_code == 404
    outsider = User(
        email="unassigned@example.com",
        full_name="Unassigned",
        role=Role.ANALYST,
        password_hash=hash_password(TEST_VALUE),
        mfa_enabled=True,
    )
    with pytest.raises(HTTPException):
        await engagement_access(db, engagement.id, outsider)
    with pytest.raises(HTTPException):
        await engagement_access(db, uuid.uuid4(), context["admin"])


def test_engagement_schema_rejects_invalid_windows():
    base = dict(
        client_id=uuid.uuid4(),
        name="Invalid assessment",
        type=EngagementType.PENTEST,
        start_date=date(2026, 2, 2),
        end_date=date(2026, 1, 1),
        rules_of_engagement="Non-destructive testing only",
        emergency_contact_name="Lead",
        emergency_contact_phone="+123456",
    )
    with pytest.raises(ValidationError):
        EngagementCreate(**base)
    base["end_date"] = date(2026, 3, 1)
    base["testing_window_start"] = time(9)
    with pytest.raises(ValidationError):
        EngagementCreate(**base)


@pytest.mark.asyncio
async def test_scope_crud_verification_and_errors(authorized_context, monkeypatch):
    context = authorized_context
    db, engagement, manager = context["db"], context["engagement"], context["admin"]
    existing = (await scope.list_scope(engagement.id, manager, db))["data"]
    assert len(existing) == 3
    created = (
        await scope.add_scope(
            engagement.id,
            ScopeCreate(
                asset_type=AssetType.DOMAIN, value="new.example.com", notes="Approved subdomain"
            ),
            manager,
            db,
        )
    )["data"]
    await scope.update_scope(
        created.engagement_id,
        created.id,
        ScopeUpdate(value="changed.example.com", in_scope=True),
        manager,
        db,
    )
    assert created.value == "changed.example.com" and not created.ownership_verified
    delay = Mock()
    monkeypatch.setattr("app.tasks.verification_tasks.verify_domain_ownership.delay", delay)
    domain_result = (await scope.verify_ownership(engagement.id, created.id, manager, db))["data"]
    assert domain_result["verification_started"] is True
    assert created.verification_method == VerificationMethod.DNS_TXT
    delay.assert_called_once_with(str(created.id))
    status = (await scope.verification_status(engagement.id, created.id, manager, db))["data"]
    assert status["verified"] is False
    network = next(item for item in existing if item.asset_type == AssetType.CIDR)
    network_result = (await scope.verify_ownership(engagement.id, network.id, manager, db))["data"]
    assert network_result["verification_started"] is False
    assert network.verification_method == VerificationMethod.MANUAL_ADMIN
    url = ScopeItem(
        engagement_id=engagement.id, asset_type=AssetType.URL, value="https://example.com"
    )
    db.add(url)
    await db.commit()
    with pytest.raises(HTTPException) as unsupported:
        await scope.verify_ownership(engagement.id, url.id, manager, db)
    assert unsupported.value.status_code == 400
    with pytest.raises(HTTPException):
        await scope.update_scope(
            engagement.id, uuid.uuid4(), ScopeUpdate(value="missing", in_scope=True), manager, db
        )
    await scope.delete_scope(engagement.id, created.id, manager, db)
    with pytest.raises(HTTPException):
        await scope.delete_scope(engagement.id, created.id, manager, db)


def test_scope_input_canonicalization_and_validation():
    assert ScopeCreate(asset_type=AssetType.DOMAIN, value=" example.com ").value == "example.com"
    with pytest.raises(ValidationError):
        ScopeCreate(asset_type=AssetType.DOMAIN, value="bad value.example")
