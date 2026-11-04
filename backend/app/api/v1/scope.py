import secrets
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, ManagerUser
from app.database import get_db
from app.models.scope import AssetType, ScopeItem, VerificationMethod
from app.models.user import User
from app.schemas.common import success
from app.schemas.scope import ScopeCreate, ScopeUpdate
from app.services.audit_service import record_audit
from app.services.engagement_service import engagement_access

router = APIRouter(prefix="/engagements", tags=["scope"])


@router.get("/{engagement_id}/scope")
async def list_scope(
    engagement_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await engagement_access(db, engagement_id, user)
    records = (
        await db.scalars(
            select(ScopeItem)
            .where(ScopeItem.engagement_id == engagement_id)
            .order_by(ScopeItem.created_at)
        )
    ).all()
    return success(list(records))


@router.post("/{engagement_id}/scope", status_code=201)
async def add_scope(
    engagement_id: uuid.UUID,
    payload: ScopeCreate,
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    await engagement_access(db, engagement_id, user)
    item = ScopeItem(engagement_id=engagement_id, **payload.model_dump())
    db.add(item)
    await db.flush()
    await record_audit(
        db, action="scope.created", resource_type="scope_item", resource_id=item.id, user_id=user.id
    )
    await db.commit()
    return success(item)


async def _scope_item(
    db: AsyncSession, engagement_id: uuid.UUID, item_id: uuid.UUID, user: User
) -> ScopeItem:
    await engagement_access(db, engagement_id, user)
    item = await db.get(ScopeItem, item_id)
    if item is None or item.engagement_id != engagement_id:
        raise HTTPException(404, "Scope item not found")
    return item


@router.put("/{engagement_id}/scope/{item_id}")
async def update_scope(
    engagement_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: ScopeUpdate,
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    item = await _scope_item(db, engagement_id, item_id, user)
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    item.ownership_verified = False
    item.verified_at = None
    item.verified_by = None
    await db.commit()
    return success(item)


@router.delete("/{engagement_id}/scope/{item_id}")
async def delete_scope(
    engagement_id: uuid.UUID,
    item_id: uuid.UUID,
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    item = await _scope_item(db, engagement_id, item_id, user)
    await db.delete(item)
    await record_audit(
        db, action="scope.deleted", resource_type="scope_item", resource_id=item.id, user_id=user.id
    )
    await db.commit()
    return success({"deleted": True})


@router.post("/{engagement_id}/scope/{item_id}/verify-ownership")
async def verify_ownership(
    engagement_id: uuid.UUID,
    item_id: uuid.UUID,
    user: User = ManagerUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    item = await _scope_item(db, engagement_id, item_id, user)
    if item.asset_type not in {AssetType.DOMAIN, AssetType.IP, AssetType.CIDR}:
        raise HTTPException(400, "Ownership verification applies only to domains and networks")
    item.ownership_verified = False
    item.verification_token = f"cyberops-verification={secrets.token_urlsafe(24)}"
    if item.asset_type == AssetType.DOMAIN:
        item.verification_method = VerificationMethod.DNS_TXT
        from app.tasks.verification_tasks import verify_domain_ownership

        verify_domain_ownership.delay(str(item.id))
    else:
        item.verification_method = VerificationMethod.MANUAL_ADMIN
    await db.commit()
    return success(
        {
            "verification_started": item.asset_type == AssetType.DOMAIN,
            "verification_token": item.verification_token,
        }
    )


@router.get("/{engagement_id}/scope/{item_id}/verification-status")
async def verification_status(
    engagement_id: uuid.UUID,
    item_id: uuid.UUID,
    user: User = CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    item = await _scope_item(db, engagement_id, item_id, user)
    return success(
        {
            "verified": item.ownership_verified,
            "method": item.verification_method,
            "verified_at": item.verified_at,
        }
    )
