"""Idempotent local demonstration records. Never run against production data."""

import asyncio
import os
from datetime import date, timedelta

from sqlalchemy import select

from app.database import SessionFactory
from app.minio_client import upload_bytes
from app.models import (
    AuthorizationDoc, AuthorizationDocType, Client, Engagement, EngagementStatus,
    EngagementType, Finding, FindingStatus, Role, ScopeItem, Severity, SystemSetting, User,
)
from app.models.scope import AssetType, VerificationMethod
from app.security.encryption import get_field_encryption
from app.security.mfa import generate_mfa_secret
from app.security.passwords import hash_password

USERS = [
    ("admin@cyberops.local", "System Administrator", Role.ADMIN, "AdminPass123!"),
    ("em@cyberops.local", "Engagement Manager", Role.ENGAGEMENT_MANAGER, "EMPass123!"),
    ("pentester@cyberops.local", "Lead Pentester", Role.PENTESTER, "PentesterPass123!"),
    ("analyst@cyberops.local", "Security Analyst", Role.ANALYST, "AnalystPass123!"),
    ("client@example.com", "Acme Security Contact", Role.CLIENT, "ClientPass123!"),
]


async def seed() -> None:
    if os.getenv("ENVIRONMENT") == "production":
        raise RuntimeError("Demonstration seed data is prohibited in production")
    async with SessionFactory() as db:
        if await db.scalar(select(User).where(User.email == "admin@cyberops.local")):
            print("Seed data already present; no changes made")
            return
        users: dict[str, User] = {}
        for email, name, role, password in USERS:
            user = User(email=email, full_name=name, role=role,
                        password_hash=hash_password(os.getenv("SEED_ADMIN_PASSWORD", password)
                                                   if role == Role.ADMIN else password))
            if role == Role.ADMIN:
                secret = generate_mfa_secret()
                user.mfa_secret = get_field_encryption().encrypt(secret)
                user.mfa_enabled = True
                print(f"Development admin TOTP secret: {secret}")
            users[role.value] = user
        db.add_all(users.values())
        client = Client(company_name="Acme Corp", industry="Technology",
                        contact_name="Security Contact", contact_email="client@example.com")
        db.add(client)
        await db.flush()
        users[Role.CLIENT.value].client_id = client.id
        engagement = Engagement(
            client_id=client.id, name="Acme Corp Annual Pentest 2026",
            type=EngagementType.COMPREHENSIVE, status=EngagementStatus.ACTIVE,
            start_date=date.today(), end_date=date.today() + timedelta(days=30),
            rules_of_engagement="Local demonstration only. Explicit owner approval is still required for every real target.",
            emergency_contact_name="Acme Security", emergency_contact_phone="+123456789",
            created_by=users[Role.ADMIN.value].id,
        )
        db.add(engagement)
        await db.flush()
        for value, asset_type in (("scanme.nmap.org", AssetType.DOMAIN),
                                  ("45.33.32.156", AssetType.IP), ("localhost", AssetType.DOMAIN)):
            db.add(ScopeItem(engagement_id=engagement.id, asset_type=asset_type, value=value,
                             in_scope=True, ownership_verified=True,
                             verification_method=VerificationMethod.MANUAL_ADMIN,
                             verified_by=users[Role.ADMIN.value].id))
        db.add(ScopeItem(engagement_id=engagement.id, asset_type=AssetType.DOMAIN,
                         value="*.google.com", in_scope=False))
        path = f"authorizations/{engagement.id}/demo.pdf"
        upload_bytes(path, b"%PDF-1.4\n% Development authorization placeholder\n%%EOF", "application/pdf")
        db.add(AuthorizationDoc(
            engagement_id=engagement.id, doc_type=AuthorizationDocType.AUTHORIZATION_LETTER,
            original_filename="development-authorization.pdf", file_path=path, file_size=70,
            mime_type="application/pdf", sha256_hash="d" * 64,
            uploaded_by=users[Role.ADMIN.value].id, approved=True,
            approved_by=users[Role.ENGAGEMENT_MANAGER.value].id,
        ))
        for index, severity in enumerate(Severity, start=1):
            db.add(Finding(
                engagement_id=engagement.id, title=f"Demonstration {severity.value} finding",
                description="Synthetic demonstration data; not the result of a real security test.",
                affected_asset="localhost", severity=severity,
                status=FindingStatus.OPEN if index < 4 else FindingStatus.FIXED,
                found_by=users[Role.PENTESTER.value].id,
                remediation="Review the demonstration workflow and replace with validated engagement evidence.",
            ))
        db.add_all([SystemSetting(key="data_retention_days", value=365),
                    SystemSetting(key="max_concurrent_jobs", value=5)])
        await db.commit()
        print("Development seed complete. Do not use these credentials outside local development.")


if __name__ == "__main__":
    asyncio.run(seed())
