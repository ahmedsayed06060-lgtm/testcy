import uuid
from datetime import datetime, time, timezone

import pytest
from sqlalchemy import func, select

from app.models.audit_log import AuditLog
from app.models.engagement import EngagementStatus
from app.security.authorization_gate import (
    AuthorizationDenied,
    is_within_time_window,
    validate_job_authorization,
)


async def authorize(context, targets=None, user=None):
    return await validate_job_authorization(
        context["engagement"].id,
        targets or ["api.example.com"],
        "nmap_scan",
        user or context["tester"],
        context["db"],
        now=context["now"],
    )


@pytest.mark.asyncio
async def test_job_accepted_all_checks_pass(authorized_context):
    result = await authorize(authorized_context, ["api.example.com", "10.0.0.10"])
    assert result.allowed is True
    event = await authorized_context["db"].scalar(
        select(AuditLog).where(AuditLog.action == "authorization.approved")
    )
    assert event is not None


@pytest.mark.asyncio
async def test_job_rejected_no_engagement(authorized_context):
    with pytest.raises(AuthorizationDenied) as error:
        await validate_job_authorization(
            uuid.uuid4(),
            ["example.com"],
            "nmap_scan",
            authorized_context["tester"],
            authorized_context["db"],
            now=authorized_context["now"],
        )
    assert error.value.result.code == "ENGAGEMENT_NOT_FOUND"


@pytest.mark.asyncio
async def test_job_rejected_engagement_not_approved(authorized_context):
    authorized_context["engagement"].status = EngagementStatus.PENDING_APPROVAL
    with pytest.raises(AuthorizationDenied) as error:
        await authorize(authorized_context)
    assert error.value.result.code == "ENGAGEMENT_NOT_ACTIVE"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "current",
    [
        datetime(2025, 12, 31, 12, tzinfo=timezone.utc),
        datetime(2026, 6, 15, 18, tzinfo=timezone.utc),
    ],
)
async def test_job_rejected_outside_time_window(authorized_context, current):
    with pytest.raises(AuthorizationDenied) as error:
        await validate_job_authorization(
            authorized_context["engagement"].id,
            ["example.com"],
            "nmap_scan",
            authorized_context["tester"],
            authorized_context["db"],
            now=current,
        )
    assert error.value.result.code == "OUTSIDE_TESTING_WINDOW"


@pytest.mark.asyncio
async def test_job_rejected_target_not_in_scope(authorized_context):
    with pytest.raises(AuthorizationDenied) as error:
        await authorize(authorized_context, ["unauthorized.example.org"])
    assert error.value.result.code == "TARGET_NOT_IN_SCOPE"


@pytest.mark.asyncio
async def test_job_rejected_target_in_out_of_scope(authorized_context):
    with pytest.raises(AuthorizationDenied) as error:
        await authorize(authorized_context, ["excluded.example.com"])
    assert error.value.result.code == "TARGET_EXCLUDED"


@pytest.mark.asyncio
async def test_job_rejected_no_verified_auth_doc(authorized_context):
    from sqlalchemy import update

    from app.models.authorization_doc import AuthorizationDoc

    await authorized_context["db"].execute(update(AuthorizationDoc).values(approved=False))
    with pytest.raises(AuthorizationDenied) as error:
        await authorize(authorized_context)
    assert error.value.result.code == "AUTHORIZATION_NOT_VERIFIED"


@pytest.mark.asyncio
async def test_job_rejected_ownership_not_verified(authorized_context):
    from sqlalchemy import update

    from app.models.scope import ScopeItem

    await authorized_context["db"].execute(update(ScopeItem).values(ownership_verified=False))
    with pytest.raises(AuthorizationDenied) as error:
        await authorize(authorized_context)
    assert error.value.result.code == "OWNERSHIP_NOT_VERIFIED"


@pytest.mark.asyncio
async def test_job_rejected_unassigned_user(authorized_context):
    from app.models.engagement import EngagementUser

    assignment = await authorized_context["db"].get(
        EngagementUser, (authorized_context["engagement"].id, authorized_context["tester"].id)
    )
    await authorized_context["db"].delete(assignment)
    with pytest.raises(AuthorizationDenied) as error:
        await authorize(authorized_context)
    assert error.value.result.code == "NOT_ASSIGNED"


@pytest.mark.asyncio
async def test_audit_log_written_on_rejection(authorized_context):
    with pytest.raises(AuthorizationDenied):
        await authorize(authorized_context, ["evil.invalid"])
    count = await authorized_context["db"].scalar(
        select(func.count(AuditLog.id)).where(AuditLog.action == "authorization.denied")
    )
    assert count == 1


@pytest.mark.asyncio
async def test_no_bypass_possible_for_admin(authorized_context):
    with pytest.raises(AuthorizationDenied) as error:
        await authorize(authorized_context, ["outside.invalid"], authorized_context["admin"])
    assert error.value.result.code == "TARGET_NOT_IN_SCOPE"


@pytest.mark.asyncio
async def test_cidr_containment_in_scope(authorized_context):
    assert (await authorize(authorized_context, ["10.0.0.0/25"])).allowed


@pytest.mark.asyncio
async def test_subdomain_in_scope_when_parent_authorized(authorized_context):
    assert (await authorize(authorized_context, ["deep.api.example.com"])).allowed


@pytest.mark.asyncio
async def test_url_domain_uses_parent_authorization(authorized_context):
    assert (await authorize(authorized_context, ["https://portal.example.com/login"])).allowed


@pytest.mark.asyncio
async def test_url_embedded_credentials_rejected(authorized_context):
    with pytest.raises(AuthorizationDenied) as error:
        await authorize(authorized_context, ["https://user:pass@example.com@evil.invalid"])
    assert error.value.result.code == "INVALID_TARGET"


def test_overnight_time_window(authorized_context):
    engagement = authorized_context["engagement"]
    engagement.testing_window_start = time(22)
    engagement.testing_window_end = time(4)
    assert is_within_time_window(engagement, datetime(2026, 6, 15, 23, tzinfo=timezone.utc))
    assert is_within_time_window(engagement, datetime(2026, 6, 15, 3, tzinfo=timezone.utc))
    assert not is_within_time_window(engagement, datetime(2026, 6, 15, 12, tzinfo=timezone.utc))
