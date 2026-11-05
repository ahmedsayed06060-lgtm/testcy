"""Authorized, privacy-preserving phishing-awareness campaign workflows."""

import hashlib
import hmac
import html
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.phishing_campaign import (
    CampaignEventType,
    CampaignStatus,
    PhishingCampaign,
    PhishingEvent,
)
from app.models.scope import AssetType, ScopeItem
from app.utils.domain import is_subdomain_of, normalize_domain


class CampaignPolicyError(PermissionError):
    pass


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _token_key() -> bytes:
    return hashlib.sha256(settings.field_encryption_key.encode("utf-8")).digest()


def campaign_token(campaign_id: uuid.UUID, action: str, subject: str) -> str:
    message = f"{campaign_id}:{action}:{subject}".encode("utf-8")
    return hmac.new(_token_key(), message, hashlib.sha256).hexdigest()


def valid_campaign_token(
    campaign_id: uuid.UUID, action: str, subject: str, supplied_token: str
) -> bool:
    expected = campaign_token(campaign_id, action, subject)
    return hmac.compare_digest(expected, supplied_token)


def campaign_url(campaign_id: uuid.UUID, action: str, department: str) -> str:
    paths = {
        "open": "track/open",
        "click": "track/click",
        "training": "training",
        "report": "track/report",
    }
    if action not in paths:
        raise ValueError("Unsupported campaign link action")
    query = urlencode(
        {"department": department, "token": campaign_token(campaign_id, action, department)}
    )
    base = settings.public_api_url.rstrip("/")
    return f"{base}/phishing-campaigns/{campaign_id}/{paths[action]}?{query}"


def opt_out_url(campaign_id: uuid.UUID, email: str) -> str:
    token = campaign_token(campaign_id, "opt-out", email.casefold())
    query = urlencode({"token": token})
    base = settings.public_api_url.rstrip("/")
    return f"{base}/phishing-campaigns/{campaign_id}/opt-out?{query}"


def build_campaign_email(campaign: PhishingCampaign, target: dict[str, Any]) -> str:
    """Build an approved awareness email with no credential-capture behavior."""
    department = str(target["department"]).strip()
    email = str(target["email"]).casefold()
    click_url = html.escape(campaign_url(campaign.id, "click", department), quote=True)
    report_url = html.escape(campaign_url(campaign.id, "report", department), quote=True)
    open_url = html.escape(campaign_url(campaign.id, "open", department), quote=True)
    opt_out = html.escape(opt_out_url(campaign.id, email), quote=True)
    return f"""{campaign.template_html}
<div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0">
  <a href="{click_url}" style="display:inline-block;padding:12px 18px;background:#0b8674;
    color:#fff;text-decoration:none;border-radius:7px">Review the approved security training</a>
  <p style="margin-top:18px;font-size:13px">
    <a href="{report_url}">Report this simulation to the security team</a></p>
  <p style="font-size:12px;color:#64748b">This authorized exercise never asks for a password.
    <a href="{opt_out}">Opt out of future awareness emails</a>.</p>
</div>
<img src="{open_url}" width="1" height="1" alt="" style="width:1px;height:1px;opacity:0" />"""


async def ensure_verified_employee_targets(
    db: AsyncSession, engagement_id: uuid.UUID, targets: list[dict[str, Any]]
) -> None:
    """Require every employee email domain to be covered by verified domain scope."""
    scopes = (
        await db.scalars(
            select(ScopeItem).where(
                ScopeItem.engagement_id == engagement_id,
                ScopeItem.asset_type == AssetType.DOMAIN,
                ScopeItem.in_scope.is_(True),
                ScopeItem.ownership_verified.is_(True),
            )
        )
    ).all()
    if not scopes:
        raise CampaignPolicyError("A verified client domain is required before creating a campaign")
    for target in targets:
        email = str(target.get("email", "")).casefold()
        try:
            domain = normalize_domain(email.rsplit("@", 1)[1])
        except (IndexError, ValueError) as exc:
            raise CampaignPolicyError("Every target requires a valid employee email") from exc
        if not any(is_subdomain_of(domain, scope.value) for scope in scopes):
            raise CampaignPolicyError(
                "Every employee email must belong to a verified client domain"
            )


def campaign_expired(campaign: PhishingCampaign, now: datetime | None = None) -> bool:
    if not campaign.started_at:
        return False
    current = now or datetime.now(timezone.utc)
    deadline = _aware(campaign.started_at) + timedelta(days=settings.phishing_campaign_days)
    return current >= deadline


async def register_campaign_event(
    db: AsyncSession,
    campaign: PhishingCampaign,
    department: str,
    event_type: CampaignEventType,
) -> bool:
    """Record a department-only event and atomically update aggregate counters."""
    if campaign.status != CampaignStatus.ACTIVE:
        return False
    valid_departments = {str(item.get("department", "")) for item in campaign.targets}
    if department not in valid_departments:
        return False
    if campaign_expired(campaign):
        campaign.status = CampaignStatus.COMPLETED
        campaign.completed_at = datetime.now(timezone.utc)
        await db.commit()
        return False
    db.add(
        PhishingEvent(
            campaign_id=campaign.id,
            engagement_id=campaign.engagement_id,
            department=department,
            event_type=event_type,
        )
    )
    column = {
        CampaignEventType.OPENED: PhishingCampaign.opened_count,
        CampaignEventType.CLICKED: PhishingCampaign.clicked_count,
        CampaignEventType.REPORTED: PhishingCampaign.reported_count,
    }[event_type]
    await db.execute(
        update(PhishingCampaign)
        .where(PhishingCampaign.id == campaign.id)
        .values({column.key: column + 1})
    )
    await db.commit()
    return True


async def campaign_metrics(db: AsyncSession, campaign: PhishingCampaign) -> dict[str, Any]:
    rows = (
        await db.execute(
            select(PhishingEvent.department, PhishingEvent.event_type, func.count(PhishingEvent.id))
            .where(PhishingEvent.campaign_id == campaign.id)
            .group_by(PhishingEvent.department, PhishingEvent.event_type)
        )
    ).all()
    eligible = [item for item in campaign.targets if item["email"] not in campaign.opt_out_list]
    sent_by_department: dict[str, int] = {}
    for target in eligible:
        department = str(target["department"])
        sent_by_department[department] = sent_by_department.get(department, 0) + 1
    departments = {
        name: {"name": name, "sent": sent, "opened": 0, "clicked": 0, "reported": 0}
        for name, sent in sent_by_department.items()
    }
    for department, event_type, count in rows:
        name = str(department)
        departments.setdefault(
            name, {"name": name, "sent": 0, "opened": 0, "clicked": 0, "reported": 0}
        )[event_type.value] = count
    return {
        "sent": campaign.sent_count,
        "opened": sum(item["opened"] for item in departments.values()),
        "clicked": sum(item["clicked"] for item in departments.values()),
        "reported": sum(item["reported"] for item in departments.values()),
        "departments": sorted(departments.values(), key=lambda item: str(item["name"])),
        "individual_tracking": False,
    }
