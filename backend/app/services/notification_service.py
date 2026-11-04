"""Persistent administrator alerts with best-effort real-time/email delivery."""

import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import Role, User
from app.redis import publish_user_notification

logger = structlog.get_logger(__name__)


async def prepare_admin_alerts(
    db: AsyncSession,
    *,
    title: str,
    message: str,
    engagement_id: uuid.UUID,
) -> list[Notification]:
    admins = (
        await db.scalars(select(User).where(User.role == Role.ADMIN, User.is_active.is_(True)))
    ).all()
    alerts = [
        Notification(
            user_id=admin.id,
            type="authorization_denied",
            title=title,
            message=message,
            link=f"/en/engagements/{engagement_id}",
        )
        for admin in admins
        if admin.deleted_at is None
    ]
    db.add_all(alerts)
    await db.flush()
    return alerts


async def dispatch_admin_alerts(alerts: list[Notification]) -> None:
    for alert in alerts:
        event = {
            "id": str(alert.id),
            "type": alert.type,
            "title": alert.title,
            "message": alert.message,
            "link": alert.link,
            "created_at": alert.created_at,
        }
        try:
            await publish_user_notification(str(alert.user_id), event)
        except Exception as exc:
            logger.warning("websocket_alert_unavailable", error=type(exc).__name__)
        try:
            from app.tasks.notification_tasks import send_security_email

            send_security_email.delay(str(alert.user_id), alert.title, alert.message)
        except Exception as exc:
            logger.warning("email_alert_unavailable", error=type(exc).__name__)
