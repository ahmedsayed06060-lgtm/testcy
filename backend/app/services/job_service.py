"""Authorized job creation, cancellation, and global kill switch."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job, JobStatus, JobType
from app.models.user import User
from app.schemas.job import JobCreate
from app.security.authorization_gate import validate_job_authorization
from app.services.audit_service import record_audit

TOOLS = {
    JobType.NMAP_SCAN: "nmap",
    JobType.TESTSSL_SCAN: "testssl.sh",
    JobType.NUCLEI_SCAN: "nuclei",
    JobType.ZAP_SCAN: "zap",
    JobType.MOBSF_SCAN: "mobsf",
    JobType.OSINT_SCAN: "osint",
}


async def create_job(db: AsyncSession, payload: JobCreate, user: User) -> Job:
    if payload.job_type not in TOOLS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Custom tool execution is not supported")
    await validate_job_authorization(
        payload.engagement_id, payload.targets, payload.job_type.value, user, db
    )
    job = Job(
        engagement_id=payload.engagement_id,
        job_type=payload.job_type,
        targets=payload.targets,
        tool=TOOLS[payload.job_type],
        profile=payload.profile,
        parameters=payload.parameters,
        status=JobStatus.PENDING,
        triggered_by=user.id,
    )
    db.add(job)
    await db.flush()
    await record_audit(
        db, action="job.created", resource_type="job", resource_id=job.id, user_id=user.id
    )
    await db.commit()
    try:
        from app.tasks.scan_tasks import execute_scan

        result = execute_scan.delay(str(job.id))
        job.parameters = {**job.parameters, "celery_task_id": result.id}
        await db.commit()
    except Exception as exc:
        job.status = JobStatus.FAILED
        job.error_message = "Task queue unavailable; no tool was executed"
        await db.commit()
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Task queue unavailable") from exc
    return job


async def cancel_job(db: AsyncSession, job: Job, user: User) -> Job:
    if job.status not in {JobStatus.PENDING, JobStatus.VALIDATING, JobStatus.RUNNING}:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only active jobs can be cancelled")
    job.status = JobStatus.CANCELLED
    job.cancelled_by = user.id
    task_id = job.parameters.get("celery_task_id")
    if task_id:
        from app.tasks.celery_app import celery_app

        celery_app.control.revoke(task_id, terminate=True, signal="SIGTERM")
    await record_audit(
        db, action="job.cancelled", resource_type="job", resource_id=job.id, user_id=user.id
    )
    await db.commit()
    return job


async def kill_switch(db: AsyncSession, user: User) -> int:
    jobs = list(
        (
            await db.scalars(
                select(Job).where(
                    Job.status.in_(
                        [
                            JobStatus.PENDING,
                            JobStatus.VALIDATING,
                            JobStatus.RUNNING,
                        ]
                    )
                )
            )
        ).all()
    )
    for job in jobs:
        job.status = JobStatus.CANCELLED
        job.cancelled_by = user.id
        task_id = job.parameters.get("celery_task_id")
        if task_id:
            from app.tasks.celery_app import celery_app

            celery_app.control.revoke(task_id, terminate=True, signal="SIGTERM")
    await record_audit(
        db,
        action="jobs.kill_switch",
        resource_type="system",
        user_id=user.id,
        details={"cancelled_jobs": len(jobs)},
    )
    await db.commit()
    return len(jobs)
