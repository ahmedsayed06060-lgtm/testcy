import asyncio
from datetime import datetime, timezone
from typing import Any

from celery.exceptions import SoftTimeLimitExceeded

from app.database import SessionFactory
from app.minio_client import upload_bytes
from app.models.job import Job, JobStatus
from app.models.user import User
from app.security.authorization_gate import AuthorizationDenied, validate_job_authorization
from app.tasks.celery_app import celery_app
from app.utils.docker_runner import run_sandboxed_tool


@celery_app.task(bind=True, autoretry_for=(ConnectionError,), retry_backoff=True, max_retries=2)
def execute_scan(self: Any, job_id: str) -> dict[str, object]:
    async def run() -> dict[str, object]:
        async with SessionFactory() as db:
            job = await db.get(Job, job_id)
            if not job or job.status == JobStatus.CANCELLED:
                return {"status": "cancelled"}
            user = await db.get(User, job.triggered_by)
            if not user:
                return {"status": "failed"}
            job.status = JobStatus.VALIDATING
            await db.commit()
            try:
                await validate_job_authorization(
                    job.engagement_id, job.targets, job.job_type.value, user, db
                )
            except AuthorizationDenied:
                job.status = JobStatus.FAILED
                job.error_message = "Authorization was revoked before execution"
                await db.commit()
                return {"status": "denied"}
            if job.status == JobStatus.CANCELLED:
                return {"status": "cancelled"}
            job.status = JobStatus.RUNNING
            job.started_at = datetime.now(timezone.utc)
            await db.commit()
            try:
                result = await run_sandboxed_tool(job)
                output = (
                    f"exit_code={result.exit_code}\n--- stdout ---\n{result.stdout}\n"
                    f"--- stderr ---\n{result.stderr}"
                ).encode("utf-8")
                path = f"jobs/{job.engagement_id}/{job.id}/output.log"
                upload_bytes(path, output, "text/plain")
                job.raw_output_path = path
                job.status = JobStatus.COMPLETED if result.exit_code == 0 else JobStatus.FAILED
                if result.exit_code != 0:
                    job.error_message = "Tool exited unsuccessfully; inspect the protected output"
            except (TimeoutError, SoftTimeLimitExceeded):
                job.status = JobStatus.TIMED_OUT
                job.error_message = "The configured execution time limit was reached"
            except Exception:
                job.status = JobStatus.FAILED
                job.error_message = "Tool execution failed safely"
            job.completed_at = datetime.now(timezone.utc)
            if job.started_at:
                job.duration_seconds = max(
                    0, int((job.completed_at - job.started_at).total_seconds())
                )
            await db.commit()
            return {"status": job.status.value, "job_id": job_id}

    return asyncio.run(run())
