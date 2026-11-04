"""Central fail-closed authorization gate.

Every network-tool dispatch calls this function before queueing and again in the
worker. There is deliberately no setting, header, role, or flag that skips a check.
Administrators are exempt only from the engagement-assignment requirement.
"""

import ipaddress
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import NoReturn
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.authorization_doc import AuthorizationDoc
from app.models.engagement import Engagement, EngagementStatus, EngagementUser
from app.models.scope import AssetType, ScopeItem
from app.models.user import Role, User
from app.services.audit_service import record_audit
from app.services.notification_service import dispatch_admin_alerts, prepare_admin_alerts
from app.utils.cidr import is_cidr_subset, is_ip_in_cidr
from app.utils.domain import extract_domain_from_url, is_subdomain_of, normalize_domain


@dataclass(frozen=True, slots=True)
class AuthorizationResult:
    allowed: bool
    code: str
    message: str
    engagement_id: uuid.UUID


class AuthorizationDenied(PermissionError):
    status_code = 403

    def __init__(self, result: AuthorizationResult) -> None:
        super().__init__(result.message)
        self.result = result
        self.detail = {"code": result.code, "message": result.message}


def _as_utc(now: datetime | None) -> datetime:
    value = now or datetime.now(timezone.utc)
    return (
        value.replace(tzinfo=timezone.utc)
        if value.tzinfo is None
        else value.astimezone(timezone.utc)
    )


def is_within_time_window(engagement: Engagement, now: datetime | None = None) -> bool:
    current = _as_utc(now)
    if not engagement.start_date <= current.date() <= engagement.end_date:
        return False
    start = engagement.testing_window_start
    end = engagement.testing_window_end
    if start is None and end is None:
        return True
    if start is None or end is None:
        return False
    try:
        local_time = current.astimezone(ZoneInfo(engagement.testing_window_timezone)).time()
    except (ZoneInfoNotFoundError, ValueError):
        return False
    if start == end:
        return False
    if start < end:
        return start <= local_time < end
    return local_time >= start or local_time < end  # overnight window


def _target_type(target: str) -> AssetType:
    value = target.strip()
    if not value or any(character.isspace() for character in value):
        raise ValueError("Empty or whitespace-containing target")
    if value.startswith("app:"):
        if len(value) < 5:
            raise ValueError("Empty application identifier")
        return AssetType.APP_ID
    if value.startswith(("social:", "email:")):
        if len(value.split(":", 1)[1]) < 2:
            raise ValueError("Empty account identifier")
        return AssetType.SOCIAL_ACCOUNT
    if "://" in value or "/" in value:
        if "/" in value and "://" not in value:
            try:
                ipaddress.ip_network(value, strict=False)
                return AssetType.CIDR
            except ValueError:
                pass
        extract_domain_from_url(value)
        return AssetType.URL
    try:
        ipaddress.ip_address(value)
        return AssetType.IP
    except ValueError:
        normalize_domain(value)
        return AssetType.DOMAIN


def _canonical_url(value: str) -> str:
    parsed = urlsplit(value.strip() if "://" in value else f"https://{value.strip()}")
    extract_domain_from_url(value)
    host = parsed.hostname or ""
    if ":" in host:
        host = f"[{host}]"
    port = f":{parsed.port}" if parsed.port else ""
    path = parsed.path.rstrip("/") or "/"
    return f"{parsed.scheme.lower()}://{host}{port}{path}"


def scope_contains_target(scope: ScopeItem, target: str) -> bool:
    """Return whether one scope item contains a target; exclusions use the same rule."""
    target_kind = _target_type(target)
    scope_value = scope.value.strip()
    try:
        if target_kind in {AssetType.APP_ID, AssetType.SOCIAL_ACCOUNT}:
            return (
                scope.asset_type == target_kind
                and scope_value.casefold() == target.strip().casefold()
            )
        if target_kind == AssetType.IP:
            if scope.asset_type == AssetType.IP:
                return ipaddress.ip_address(scope_value) == ipaddress.ip_address(target)
            if scope.asset_type == AssetType.CIDR:
                return is_ip_in_cidr(target, scope_value)
            return False
        if target_kind == AssetType.CIDR:
            return scope.asset_type == AssetType.CIDR and is_cidr_subset(target, scope_value)
        if target_kind == AssetType.DOMAIN:
            return scope.asset_type == AssetType.DOMAIN and is_subdomain_of(target, scope_value)
        if target_kind == AssetType.URL:
            if scope.asset_type == AssetType.URL:
                return _canonical_url(scope_value) == _canonical_url(target)
            host = extract_domain_from_url(target)
            try:
                ipaddress.ip_address(host)
            except ValueError:
                return scope.asset_type == AssetType.DOMAIN and is_subdomain_of(host, scope_value)
            if scope.asset_type == AssetType.IP:
                return ipaddress.ip_address(scope_value) == ipaddress.ip_address(host)
            if scope.asset_type == AssetType.CIDR:
                return is_ip_in_cidr(host, scope_value)
    except ValueError:
        return False
    return False


async def _reject(
    db: AsyncSession,
    *,
    engagement_id: uuid.UUID,
    user: User,
    targets: list[str],
    job_type: str,
    code: str,
    message: str,
) -> NoReturn:
    await record_audit(
        db,
        action="authorization.denied",
        resource_type="engagement",
        resource_id=engagement_id,
        user_id=user.id,
        details={"code": code, "job_type": job_type, "targets": targets},
    )
    alerts = await prepare_admin_alerts(
        db,
        title="Authorization gate blocked a job",
        message=f"{user.email}: {message} (reason {code}).",
        engagement_id=engagement_id,
    )
    await db.commit()
    await dispatch_admin_alerts(alerts)
    raise AuthorizationDenied(AuthorizationResult(False, code, message, engagement_id))


async def validate_job_authorization(
    engagement_id: uuid.UUID,
    targets: list[str],
    job_type: str,
    user: User,
    db: AsyncSession,
    *,
    now: datetime | None = None,
) -> AuthorizationResult:
    """Validate all preconditions or persist a denial and raise ``AuthorizationDenied``."""
    engagement = await db.scalar(
        select(Engagement).where(Engagement.id == engagement_id, Engagement.deleted_at.is_(None))
    )
    if engagement is None:
        await _reject(
            db=db,
            engagement_id=engagement_id,
            user=user,
            targets=targets,
            job_type=job_type,
            code="ENGAGEMENT_NOT_FOUND",
            message="The engagement does not exist",
        )
    if engagement.status != EngagementStatus.ACTIVE:
        await _reject(
            db=db,
            engagement_id=engagement_id,
            user=user,
            targets=targets,
            job_type=job_type,
            code="ENGAGEMENT_NOT_ACTIVE",
            message="The engagement is not active",
        )
    if not is_within_time_window(engagement, now):
        await _reject(
            db=db,
            engagement_id=engagement_id,
            user=user,
            targets=targets,
            job_type=job_type,
            code="OUTSIDE_TESTING_WINDOW",
            message="The current time is outside the authorized testing window",
        )
    if user.role != Role.ADMIN:
        assignment = await db.scalar(
            select(EngagementUser).where(
                EngagementUser.engagement_id == engagement_id,
                EngagementUser.user_id == user.id,
            )
        )
        if assignment is None:
            await _reject(
                db=db,
                engagement_id=engagement_id,
                user=user,
                targets=targets,
                job_type=job_type,
                code="NOT_ASSIGNED",
                message="The user is not assigned to this engagement",
            )
    approved_doc = await db.scalar(
        select(AuthorizationDoc.id)
        .where(
            AuthorizationDoc.engagement_id == engagement_id,
            AuthorizationDoc.approved.is_(True),
        )
        .limit(1)
    )
    if approved_doc is None:
        await _reject(
            db=db,
            engagement_id=engagement_id,
            user=user,
            targets=targets,
            job_type=job_type,
            code="AUTHORIZATION_NOT_VERIFIED",
            message="No signed authorization document has been verified",
        )
    if not targets or len(targets) > 100:
        await _reject(
            db=db,
            engagement_id=engagement_id,
            user=user,
            targets=targets,
            job_type=job_type,
            code="INVALID_TARGET_COUNT",
            message="A job must contain between 1 and 100 targets",
        )
    scopes = list(
        (await db.scalars(select(ScopeItem).where(ScopeItem.engagement_id == engagement_id))).all()
    )
    included = [item for item in scopes if item.in_scope]
    excluded = [item for item in scopes if not item.in_scope]
    for target in targets:
        try:
            target_kind = _target_type(target)
        except ValueError:
            await _reject(
                db=db,
                engagement_id=engagement_id,
                user=user,
                targets=targets,
                job_type=job_type,
                code="INVALID_TARGET",
                message=f"Target is malformed: {target[:100]}",
            )
        if any(scope_contains_target(item, target) for item in excluded):
            await _reject(
                db=db,
                engagement_id=engagement_id,
                user=user,
                targets=targets,
                job_type=job_type,
                code="TARGET_EXCLUDED",
                message=f"Target is explicitly out of scope: {target}",
            )
        matching = [item for item in included if scope_contains_target(item, target)]
        if not matching:
            await _reject(
                db=db,
                engagement_id=engagement_id,
                user=user,
                targets=targets,
                job_type=job_type,
                code="TARGET_NOT_IN_SCOPE",
                message=f"Target is not in scope: {target}",
            )
        network_asset = target_kind in {
            AssetType.IP,
            AssetType.CIDR,
            AssetType.DOMAIN,
            AssetType.URL,
        }
        if network_asset and not any(item.ownership_verified for item in matching):
            await _reject(
                db=db,
                engagement_id=engagement_id,
                user=user,
                targets=targets,
                job_type=job_type,
                code="OWNERSHIP_NOT_VERIFIED",
                message=f"Asset ownership has not been verified: {target}",
            )
    await record_audit(
        db,
        action="authorization.approved",
        resource_type="engagement",
        resource_id=engagement_id,
        user_id=user.id,
        details={"job_type": job_type, "targets": targets},
    )
    await db.commit()
    return AuthorizationResult(True, "AUTHORIZED", "All authorization checks passed", engagement_id)
