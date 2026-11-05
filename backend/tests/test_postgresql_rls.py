import os
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, Mock

import asyncpg
import pytest

from app.database import _apply_rls_context, set_request_rls_context
from app.models.user import Role, User
from app.security.passwords import hash_password


def test_migration_enables_forced_rls_for_every_tenant_table():
    source = (Path(__file__).parents[1] / "alembic/versions/001_initial.py").read_text()
    for table in (
        "clients",
        "engagements",
        "jobs",
        "findings",
        "reports",
        "scope_items",
        "authorization_docs",
        "social_assessments",
        "phishing_campaigns",
        "phishing_events",
        "mobile_analyses",
    ):
        assert table in source
    assert source.count("FORCE ROW LEVEL SECURITY") >= 2
    assert "for table in (" in source
    assert "current_setting('app.is_admin', true)" in source
    assert "current_setting('app.client_id', true)" in source
    assert "CREATE RULE no_update" in source and "CREATE RULE no_delete" in source


def test_rls_context_is_reapplied_on_every_postgresql_transaction():
    session = Mock()
    session.info = {"rls_internal": False, "rls_client_id": "tenant-a"}
    connection = Mock()
    connection.dialect.name = "postgresql"
    _apply_rls_context(session, None, connection)
    _apply_rls_context(session, None, connection)
    assert connection.execute.call_count == 2
    statement, parameters = connection.execute.call_args.args
    assert "set_config('app.is_admin'" in str(statement)
    assert parameters == {"internal": "off", "client_id": "tenant-a"}
    sqlite_connection = Mock()
    sqlite_connection.dialect.name = "sqlite"
    _apply_rls_context(session, None, sqlite_connection)
    sqlite_connection.execute.assert_not_called()


@pytest.mark.asyncio
async def test_request_rls_context_sets_client_and_internal_claims():
    for role, client_id, expected_internal in (
        (Role.CLIENT, uuid.uuid4(), False),
        (Role.ADMIN, None, True),
    ):
        db = Mock()
        db.get_bind.return_value.dialect.name = "postgresql"
        db.sync_session.info = {}
        db.execute = AsyncMock()
        user = User(
            email=f"{role.value}@test.local",
            full_name="Test",
            role=role,
            password_hash=hash_password("PostgresRlsTest123!"),
            client_id=client_id,
        )
        await set_request_rls_context(db, user)
        assert db.sync_session.info["rls_internal"] is expected_internal
        assert db.execute.await_args.args[1]["client_id"] == str(client_id or "")
    db = Mock()
    db.get_bind.return_value.dialect.name = "sqlite"
    db.execute = AsyncMock()
    await set_request_rls_context(db, object())
    db.execute.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.skipif(
    not os.getenv("POSTGRES_TEST_URL"), reason="requires a disposable migrated PostgreSQL database"
)
async def test_postgresql_client_tenant_isolation_and_force_rls():
    """Run with POSTGRES_TEST_URL against a disposable database after Alembic upgrade."""
    connection = await asyncpg.connect(os.environ["POSTGRES_TEST_URL"])
    first, second = uuid.uuid4(), uuid.uuid4()
    marker = uuid.uuid4().hex
    try:
        async with connection.transaction():
            await connection.execute(
                "SELECT set_config('app.is_admin', 'on', true), "
                "set_config('app.client_id', '', true)"
            )
            await connection.execute(
                "INSERT INTO clients (id, company_name, created_at, updated_at) "
                "VALUES ($1, $2, now(), now()), ($3, $4, now(), now())",
                first,
                f"Tenant A {marker}",
                second,
                f"Tenant B {marker}",
            )
        async with connection.transaction():
            await connection.execute(
                "SELECT set_config('app.is_admin', 'off', true), "
                "set_config('app.client_id', $1, true)",
                str(first),
            )
            visible = await connection.fetch(
                "SELECT id FROM clients WHERE company_name LIKE $1", f"%{marker}"
            )
            assert {row["id"] for row in visible} == {first}
            changed = await connection.execute(
                "UPDATE clients SET industry = 'blocked' WHERE id = $1", second
            )
            assert changed == "UPDATE 0"
            with pytest.raises(asyncpg.exceptions.InsufficientPrivilegeError):
                await connection.execute(
                    "INSERT INTO clients (id, company_name, created_at, updated_at) "
                    "VALUES ($1, $2, now(), now())",
                    uuid.uuid4(),
                    "Cross-tenant insert",
                )
    finally:
        async with connection.transaction():
            await connection.execute(
                "SELECT set_config('app.is_admin', 'on', true), "
                "set_config('app.client_id', '', true)"
            )
            await connection.execute(
                "DELETE FROM clients WHERE id = ANY($1::uuid[])", [first, second]
            )
        await connection.close()


@pytest.mark.asyncio
@pytest.mark.skipif(
    not os.getenv("POSTGRES_TEST_URL"),
    reason="requires a disposable migrated PostgreSQL database",
)
async def test_postgresql_audit_rules_discard_update_and_delete():
    """The dedicated integration database is disposable; this inserts one audit event."""
    connection = await asyncpg.connect(os.environ["POSTGRES_TEST_URL"])
    event_id = uuid.uuid4()
    marker = f"immutable-{uuid.uuid4().hex}"
    try:
        await connection.execute(
            "INSERT INTO audit_logs (id, timestamp, action, resource_type, details) "
            "VALUES ($1, now(), $2, 'system', '{}'::jsonb)",
            event_id,
            marker,
        )
        assert (
            await connection.execute(
                "UPDATE audit_logs SET action = 'tampered' WHERE id = $1", event_id
            )
            == "UPDATE 0"
        )
        assert (
            await connection.fetchval("SELECT action FROM audit_logs WHERE id = $1", event_id)
            == marker
        )
        assert (
            await connection.execute("DELETE FROM audit_logs WHERE id = $1", event_id) == "DELETE 0"
        )
        assert (
            await connection.fetchval("SELECT count(*) FROM audit_logs WHERE id = $1", event_id)
            == 1
        )
    finally:
        await connection.close()
