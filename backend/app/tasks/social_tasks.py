import asyncio
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionFactory
from app.models.authorization_doc import AuthorizationDoc, AuthorizationDocType
from app.models.job import Job, JobStatus, JobType
from app.models.phishing_campaign import CampaignStatus, PhishingCampaign
from app.models.social_assessment import SocialAssessment
from app.models.user import User
from app.security.authorization_gate import validate_job_authorization
from app.services.phishing_service import build_campaign_email, campaign_expired
from app.tasks.celery_app import celery_app
from app.tasks.notification_tasks import send_phishing_email
from app.utils.docker_runner import run_sandboxed_tool


async def dispatch_impersonation_scan(db: AsyncSession, assessment_id: str, user_id: str) -> None:
    assessment = await db.get(SocialAssessment, uuid.UUID(assessment_id))
    user = await db.get(User, uuid.UUID(user_id))
    if not assessment or not user:
        return
    target = f"social:{assessment.account_handle}"
    await validate_job_authorization(assessment.engagement_id, [target], "osint_scan", user, db)
    job = Job(
        id=uuid.uuid4(),
        engagement_id=assessment.engagement_id,
        job_type=JobType.OSINT_SCAN,
        targets=[target],
        tool="maigret",
        status=JobStatus.RUNNING,
        triggered_by=user.id,
    )
    result = await run_sandboxed_tool(job)
    if result.exit_code != 0:
        raise ConnectionError("The public-profile assessment did not complete")
    findings = json.loads(result.stdout)
    if not isinstance(findings, list):
        raise ValueError("The public-profile tool returned an invalid result")
    assessment.impersonation_findings = [
        item for item in findings if isinstance(item, dict) and item.get("source") == "maigret"
    ]
    await db.commit()


@celery_app.task(autoretry_for=(ConnectionError,), retry_backoff=True, max_retries=2)
def run_impersonation_scan(assessment_id: str, user_id: str) -> None:
    async def run() -> None:
        async with SessionFactory() as db:
            await dispatch_impersonation_scan(db, assessment_id, user_id)

    asyncio.run(run())


async def dispatch_awareness_campaign(db: AsyncSession, campaign_id: str, user_id: str) -> None:
    campaign = await db.get(PhishingCampaign, uuid.UUID(campaign_id))
    user = await db.get(User, uuid.UUID(user_id))
    if not campaign or not user or campaign.status != CampaignStatus.APPROVED:
        return
    document = await db.get(AuthorizationDoc, campaign.approval_doc_id)
    if (
        not document
        or document.engagement_id != campaign.engagement_id
        or document.doc_type != AuthorizationDocType.PHISHING
        or document.approved is not True
    ):
        campaign.status = CampaignStatus.CANCELLED
        campaign.completed_at = datetime.now(timezone.utc)
        await db.commit()
        return
    targets = [item for item in campaign.targets if item["email"] not in campaign.opt_out_list]
    if not targets:
        campaign.status = CampaignStatus.COMPLETED
        campaign.completed_at = datetime.now(timezone.utc)
        await db.commit()
        return
    await validate_job_authorization(
        campaign.engagement_id,
        [f"email:{item['email']}" for item in targets],
        "phishing_simulation",
        user,
        db,
    )
    campaign.status = CampaignStatus.SENDING
    campaign.started_at = datetime.now(timezone.utc)
    await db.commit()
    for target in targets:
        send_phishing_email.delay(
            target["email"],
            campaign.subject_line,
            build_campaign_email(campaign, target),
            campaign.sender_name,
            campaign.sender_email,
        )
    campaign.sent_count = len(targets)
    campaign.status = CampaignStatus.ACTIVE
    await db.commit()


@celery_app.task
def send_awareness_campaign(campaign_id: str, user_id: str) -> None:
    async def run() -> None:
        async with SessionFactory() as db:
            await dispatch_awareness_campaign(db, campaign_id, user_id)

    asyncio.run(run())


@celery_app.task
def complete_expired_campaigns() -> None:
    async def run() -> None:
        async with SessionFactory() as db:
            campaigns = (
                await db.scalars(
                    select(PhishingCampaign).where(PhishingCampaign.status == CampaignStatus.ACTIVE)
                )
            ).all()
            for campaign in campaigns:
                if campaign_expired(campaign):
                    campaign.status = CampaignStatus.COMPLETED
                    campaign.completed_at = datetime.now(timezone.utc)
            await db.commit()

    asyncio.run(run())
