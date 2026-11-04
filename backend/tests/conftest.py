import os
import uuid
from datetime import date, datetime, time, timezone
from unittest.mock import AsyncMock

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["FIELD_ENCRYPTION_KEY"] = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
os.environ["REDIS_URL"] = "redis://localhost:6399/0"

from app.models import (
    AuthorizationDoc,
    AuthorizationDocType,
    Base,
    Client,
    Engagement,
    EngagementStatus,
    EngagementType,
    EngagementUser,
    Role,
    ScopeItem,
    User,
)
from app.models.scope import AssetType
from app.security.passwords import hash_password

TEST_NOW = datetime(2026, 6, 15, 12, 0, tzinfo=timezone.utc)


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


@pytest_asyncio.fixture
async def authorized_context(db: AsyncSession, monkeypatch):
    monkeypatch.setattr("app.security.authorization_gate.dispatch_admin_alerts", AsyncMock())
    client = Client(company_name="Example Industries")
    db.add(client)
    await db.flush()
    admin = User(
        email="admin@test.local",
        full_name="Test Admin",
        role=Role.ADMIN,
        password_hash=hash_password("AdminTestPass123!"),
        mfa_enabled=True,
    )
    tester = User(
        email="tester@test.local",
        full_name="Test Pentester",
        role=Role.PENTESTER,
        password_hash=hash_password("TesterTestPass123!"),
        mfa_enabled=True,
    )
    db.add_all([admin, tester])
    await db.flush()
    engagement = Engagement(
        id=uuid.uuid4(),
        client_id=client.id,
        name="Authorized test",
        type=EngagementType.PENTEST,
        status=EngagementStatus.ACTIVE,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        testing_window_start=time(9),
        testing_window_end=time(17),
        testing_window_timezone="UTC",
        rules_of_engagement="Only non-destructive validation is permitted.",
        emergency_contact_name="Security Lead",
        emergency_contact_phone="+123456789",
        created_by=admin.id,
    )
    db.add(engagement)
    await db.flush()
    db.add(
        EngagementUser(engagement_id=engagement.id, user_id=tester.id, role_in_engagement="member")
    )
    db.add(
        AuthorizationDoc(
            engagement_id=engagement.id,
            doc_type=AuthorizationDocType.AUTHORIZATION_LETTER,
            original_filename="authorization.pdf",
            file_path="test/authorization.pdf",
            sha256_hash="a" * 64,
            uploaded_by=admin.id,
            approved=True,
            approved_by=admin.id,
        )
    )
    db.add_all(
        [
            ScopeItem(
                engagement_id=engagement.id,
                asset_type=AssetType.DOMAIN,
                value="example.com",
                in_scope=True,
                ownership_verified=True,
            ),
            ScopeItem(
                engagement_id=engagement.id,
                asset_type=AssetType.CIDR,
                value="10.0.0.0/24",
                in_scope=True,
                ownership_verified=True,
            ),
            ScopeItem(
                engagement_id=engagement.id,
                asset_type=AssetType.DOMAIN,
                value="excluded.example.com",
                in_scope=False,
                ownership_verified=True,
            ),
        ]
    )
    await db.commit()
    return {
        "db": db,
        "client": client,
        "admin": admin,
        "tester": tester,
        "engagement": engagement,
        "now": TEST_NOW,
    }
