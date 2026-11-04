import asyncio

import httpx

from app.config import settings
from app.database import SessionFactory
from app.minio_client import download_bytes
from app.models.mobile_analysis import MobileAnalysis
from app.models.user import User
from app.security.authorization_gate import validate_job_authorization
from app.tasks.celery_app import celery_app


@celery_app.task(autoretry_for=(httpx.ConnectError,), retry_backoff=True, max_retries=2)
def run_mobile_scan(analysis_id: str, user_id: str) -> None:
    async def run() -> None:
        async with SessionFactory() as db:
            analysis = await db.get(MobileAnalysis, analysis_id)
            user = await db.get(User, user_id)
            if not analysis or not user:
                return
            await validate_job_authorization(
                analysis.engagement_id, [f"app:{analysis.package_name}"], "mobsf_scan", user, db
            )
            payload = await asyncio.to_thread(download_bytes, analysis.file_path)
            headers = {"Authorization": settings.mobsf_api_key}
            async with httpx.AsyncClient(
                base_url=settings.mobsf_api_url,
                headers=headers,
                timeout=settings.default_job_timeout_minutes * 60,
            ) as client:
                upload = await client.post("/upload", files={"file": (analysis.app_name, payload)})
                upload.raise_for_status()
                scan_data = upload.json()
                analysis.mobsf_scan_id = str(scan_data.get("hash", analysis.file_hash_sha256))
                response = await client.post("/scan", data=scan_data)
                response.raise_for_status()
                try:
                    report = await client.post("/report_json", data=scan_data)
                    report.raise_for_status()
                    analysis.static_results = report.json()
                finally:
                    await client.post("/delete_scan", data=scan_data)
            await db.commit()

    asyncio.run(run())
