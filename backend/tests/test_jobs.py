import pytest

from app.models.job import Job, JobStatus, JobType
from app.services.job_service import kill_switch


@pytest.mark.asyncio
async def test_kill_switch_cancels_all_running_jobs(authorized_context):
    context = authorized_context
    jobs = [
        Job(
            engagement_id=context["engagement"].id,
            job_type=JobType.NMAP_SCAN,
            targets=["example.com"],
            tool="nmap",
            status=status,
            triggered_by=context["tester"].id,
        )
        for status in (JobStatus.RUNNING, JobStatus.PENDING, JobStatus.COMPLETED)
    ]
    context["db"].add_all(jobs)
    await context["db"].commit()
    cancelled = await kill_switch(context["db"], context["admin"])
    assert cancelled == 2
    assert jobs[0].status == JobStatus.CANCELLED
    assert jobs[1].status == JobStatus.CANCELLED
    assert jobs[2].status == JobStatus.COMPLETED
