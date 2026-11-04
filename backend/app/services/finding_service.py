"""Finding normalization, deduplication, and remediation workflow."""

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finding import Finding, FindingStatus
from app.models.user import User
from app.schemas.finding import FindingCreate, FindingUpdate
from app.services.audit_service import record_audit
from app.utils.sanitize import sanitize_html


async def create_finding(db: AsyncSession, payload: FindingCreate, user: User) -> Finding:
    values = payload.model_dump()
    for field in ("description", "evidence", "remediation"):
        if values.get(field):
            values[field] = sanitize_html(values[field])
    finding = Finding(**values, found_by=user.id)
    db.add(finding)
    await db.flush()
    await record_audit(
        db,
        action="finding.created",
        resource_type="finding",
        resource_id=finding.id,
        user_id=user.id,
    )
    await db.commit()
    return finding


async def update_finding(
    db: AsyncSession, finding: Finding, payload: FindingUpdate, user: User
) -> Finding:
    values = payload.model_dump()
    for field in ("description", "evidence", "remediation"):
        if values.get(field):
            values[field] = sanitize_html(values[field])
    for key, value in values.items():
        setattr(finding, key, value)
    await record_audit(
        db,
        action="finding.updated",
        resource_type="finding",
        resource_id=finding.id,
        user_id=user.id,
    )
    await db.commit()
    return finding


async def add_comment(db: AsyncSession, finding: Finding, text: str, user: User) -> Finding:
    comments = list(finding.comments)
    comments.append(
        {
            "id": str(uuid.uuid4()),
            "user_id": str(user.id),
            "author": user.full_name,
            "text": sanitize_html(text),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    finding.comments = comments
    await db.commit()
    return finding


async def request_retest(
    db: AsyncSession, finding: Finding, result: str, notes: str, user: User
) -> Finding:
    finding.status = FindingStatus.RETEST
    finding.retest_result = sanitize_html(f"{result}\n{notes}")
    finding.retested_at = datetime.now(timezone.utc)
    finding.retested_by = user.id
    await record_audit(
        db,
        action="finding.retest_requested",
        resource_type="finding",
        resource_id=finding.id,
        user_id=user.id,
    )
    await db.commit()
    return finding
