import asyncio
import secrets
from datetime import datetime, timezone

import dns.resolver

from app.database import SessionFactory
from app.models.scope import ScopeItem
from app.tasks.celery_app import celery_app


@celery_app.task(autoretry_for=(dns.resolver.Timeout,), retry_backoff=True, max_retries=2)
def verify_domain_ownership(scope_item_id: str) -> bool:
    async def run() -> bool:
        async with SessionFactory() as db:
            item = await db.get(ScopeItem, scope_item_id)
            if not item or not item.verification_token:
                return False
            domain = item.value.removeprefix("*.").rstrip(".")
            try:
                answers = await asyncio.to_thread(dns.resolver.resolve, domain, "TXT", lifetime=10)
                records = [b"".join(answer.strings).decode("utf-8") for answer in answers]
            except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers):
                return False
            expected = item.verification_token
            if any(secrets.compare_digest(expected, record.strip()) for record in records):
                item.ownership_verified = True
                item.verified_at = datetime.now(timezone.utc)
                item.verification_token = None
                await db.commit()
                return True
            return False

    return asyncio.run(run())
