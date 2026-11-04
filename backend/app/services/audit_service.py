"""Append-only audit event writer."""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def record_audit(
    db: AsyncSession,
    *,
    action: str,
    resource_type: str,
    user_id: uuid.UUID | None,
    resource_id: uuid.UUID | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    event = AuditLog(
        action=action,
        resource_type=resource_type,
        user_id=user_id,
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
        user_agent=user_agent[:1000] if user_agent else None,
    )
    db.add(event)
    await db.flush()
    return event
