import asyncio

from app.database import SessionFactory
from app.services.data_retention_service import enforce_data_retention
from app.tasks.celery_app import celery_app


@celery_app.task
def enforce_retention() -> int:
    async def run() -> int:
        async with SessionFactory() as db:
            return await enforce_data_retention(db)

    return asyncio.run(run())
