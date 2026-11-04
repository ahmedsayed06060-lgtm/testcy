from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser
from app.database import get_db
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.schemas.common import InputSchema, success
from app.services.audit_service import record_audit

router = APIRouter(prefix="/admin", tags=["administration"])
ALLOWED_SETTINGS = {
    "data_retention_days",
    "max_concurrent_jobs",
    "default_scan_profile",
    "company_name",
    "company_logo_path",
    "smtp_settings_encrypted",
}


class SettingUpdate(InputSchema):
    key: str
    value: Any


@router.get("/settings")
async def get_settings(
    user: User = AdminUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    records = (
        await db.scalars(
            select(SystemSetting).where(SystemSetting.key != "smtp_settings_encrypted")
        )
    ).all()
    return success(list(records))


@router.put("/settings")
async def update_setting(
    payload: SettingUpdate, user: User = AdminUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    if payload.key not in ALLOWED_SETTINGS:
        raise HTTPException(422, "Setting is not editable through this endpoint")
    record = await db.get(SystemSetting, payload.key)
    if record:
        record.value = payload.value
        record.updated_by = user.id
    else:
        db.add(SystemSetting(key=payload.key, value=payload.value, updated_by=user.id))
    await record_audit(
        db,
        action="settings.updated",
        resource_type="system_setting",
        user_id=user.id,
        details={"key": payload.key},
    )
    await db.commit()
    return success({"updated": True})


@router.post("/data-retention/run")
async def run_retention(user: User = AdminUser) -> dict[str, Any]:
    from app.tasks.retention_tasks import enforce_retention

    result = enforce_retention.delay()
    return success({"task_id": result.id})


@router.get("/system-health")
async def system_health(user: User = AdminUser) -> dict[str, Any]:
    return success(
        {
            "status": "operational",
            "authorization_gate": "enforced",
            "metrics_endpoint": "reverse-proxy restricted",
        }
    )
