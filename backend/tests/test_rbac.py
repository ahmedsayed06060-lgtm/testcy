import uuid

import pytest

from app.models.user import Role
from app.security.rbac import can_access_engagement, has_role


@pytest.mark.asyncio
async def test_role_membership_and_tenant_access(authorized_context):
    admin = authorized_context["admin"]
    tester = authorized_context["tester"]
    assert has_role(admin, {Role.ADMIN})
    assert not has_role(tester, {Role.ADMIN})
    assert can_access_engagement(admin, uuid.uuid4(), assigned=False)
    assert can_access_engagement(tester, uuid.uuid4(), assigned=True)
    assert not can_access_engagement(tester, uuid.uuid4(), assigned=False)


@pytest.mark.asyncio
async def test_client_access_is_limited_to_own_client(authorized_context):
    tester = authorized_context["tester"]
    tester.role = Role.CLIENT
    tester.client_id = authorized_context["client"].id
    assert can_access_engagement(tester, authorized_context["client"].id, assigned=False)
    assert not can_access_engagement(tester, uuid.uuid4(), assigned=True)
