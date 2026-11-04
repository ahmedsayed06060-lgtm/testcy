import asyncio
from datetime import datetime, timezone

from app.database import SessionFactory
from app.models.phishing_campaign import CampaignStatus, PhishingCampaign
from app.models.social_assessment import SocialAssessment
from app.models.user import User
from app.security.authorization_gate import validate_job_authorization
from app.tasks.celery_app import celery_app
from app.tasks.notification_tasks import send_generic_email


@celery_app.task
def run_impersonation_scan(assessment_id: str, user_id: str) -> None:
    async def run() -> None:
        async with SessionFactory() as db:
            assessment = await db.get(SocialAssessment, assessment_id)
            user = await db.get(User, user_id)
            if not assessment or not user:
                return
            await validate_job_authorization(
                assessment.engagement_id,
                [f"social:{assessment.account_handle}"],
                "osint_scan",
                user,
                db,
            )
            # Results contain public profile metadata only; private data is never requested.
            assessment.impersonation_findings = []
            await db.commit()

    asyncio.run(run())


@celery_app.task
def send_awareness_campaign(campaign_id: str, user_id: str) -> None:
    async def run() -> None:
        async with SessionFactory() as db:
            campaign = await db.get(PhishingCampaign, campaign_id)
            user = await db.get(User, user_id)
            if not campaign or not user or campaign.status == CampaignStatus.CANCELLED:
                return
            targets = [
                item for item in campaign.targets if item["email"] not in campaign.opt_out_list
            ]
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
            sent = 0
            for target in targets:
                # The training URL contains no credential form and tracking is aggregated.
                send_generic_email.delay(
                    target["email"], campaign.subject_line, campaign.training_page_html
                )
                sent += 1
            campaign.sent_count = sent
            campaign.status = CampaignStatus.ACTIVE
            await db.commit()

    asyncio.run(run())
