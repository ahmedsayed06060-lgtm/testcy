"""Secure object deletion before retention metadata is updated."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.minio_client import minio_client
from app.models.job import Job
from app.models.system_setting import SystemSetting


async def enforce_data_retention(db: AsyncSession) -> int:
    setting = await db.get(SystemSetting, "data_retention_days")
    days = int(setting.value) if setting and str(setting.value).isdigit() else 365
    cutoff = datetime.now(timezone.utc) - timedelta(days=max(1, days))
    jobs = (
        await db.scalars(
            select(Job).where(Job.completed_at < cutoff, Job.raw_output_path.is_not(None))
        )
    ).all()
    removed = 0
    for job in jobs:
        if job.raw_output_path:
            minio_client.remove_object(settings.minio_bucket, job.raw_output_path)
            job.raw_output_path = None
            removed += 1
    await db.commit()
    return removed
