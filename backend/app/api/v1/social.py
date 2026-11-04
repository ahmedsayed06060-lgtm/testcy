import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, EditorUser, ManagerUser
from app.database import get_db
from app.models.authorization_doc import AuthorizationDoc, AuthorizationDocType
from app.models.phishing_campaign import CampaignStatus, PhishingCampaign
from app.models.social_assessment import SocialAssessment
from app.models.user import User
from app.schemas.common import success
from app.schemas.social import ChecklistUpdate, PhishingCampaignCreate, SocialAssessmentCreate
from app.security.authorization_gate import validate_job_authorization
from app.services.engagement_service import engagement_access
from app.utils.sanitize import sanitize_html

router = APIRouter(tags=["social assessments"])


@router.get("/social-assessments")
async def list_assessments(
    engagement_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await engagement_access(db, engagement_id, user)
    records = (
        await db.scalars(
            select(SocialAssessment).where(SocialAssessment.engagement_id == engagement_id)
        )
    ).all()
    return success(list(records))


@router.post("/social-assessments", status_code=201)
async def create_assessment(
    payload: SocialAssessmentCreate, user: User = EditorUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await engagement_access(db, payload.engagement_id, user)
    record = SocialAssessment(**payload.model_dump(), assessed_by=user.id)
    db.add(record)
    await db.commit()
    return success(record)


@router.get("/social-assessments/{assessment_id}")
async def get_assessment(
    assessment_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    record = await db.get(SocialAssessment, assessment_id)
    if not record:
        raise HTTPException(404, "Assessment not found")
    await engagement_access(db, record.engagement_id, user)
    return success(record)


@router.put("/social-assessments/{assessment_id}/checklist")
async def update_checklist(
    assessment_id: uuid.UUID,
    payload: ChecklistUpdate,
    user: User = EditorUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    record = await db.get(SocialAssessment, assessment_id)
    if not record:
        raise HTTPException(404, "Assessment not found")
    await engagement_access(db, record.engagement_id, user)
    record.checklist_results = payload.checklist_results
    passed = sum(1 for value in payload.checklist_results.values() if value is True)
    record.posture_score = Decimal(
        str(round(100 * passed / max(1, len(payload.checklist_results)), 2))
    )
    await db.commit()
    return success(record)


@router.post("/social-assessments/{assessment_id}/impersonation-scan", status_code=202)
async def impersonation_scan(
    assessment_id: uuid.UUID, user: User = EditorUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    record = await db.get(SocialAssessment, assessment_id)
    if not record:
        raise HTTPException(404, "Assessment not found")
    target = f"social:{record.account_handle}"
    await validate_job_authorization(record.engagement_id, [target], "osint_scan", user, db)
    from app.tasks.social_tasks import run_impersonation_scan

    result = run_impersonation_scan.delay(str(record.id), str(user.id))
    return success({"task_id": result.id})


@router.get("/phishing-campaigns")
async def list_campaigns(
    engagement_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await engagement_access(db, engagement_id, user)
    records = (
        await db.scalars(
            select(PhishingCampaign).where(PhishingCampaign.engagement_id == engagement_id)
        )
    ).all()
    return success(list(records))


@router.post("/phishing-campaigns", status_code=201)
async def create_campaign(
    payload: PhishingCampaignCreate, user: User = ManagerUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    await engagement_access(db, payload.engagement_id, user)
    doc = await db.get(AuthorizationDoc, payload.approval_doc_id)
    if (
        not doc
        or doc.engagement_id != payload.engagement_id
        or doc.doc_type != AuthorizationDocType.PHISHING
        or doc.approved is not True
    ):
        raise HTTPException(403, "A verified phishing-specific authorization document is required")
    for target in payload.targets:
        email = str(target.get("email", ""))
        if "@" not in email or not target.get("department"):
            raise HTTPException(422, "Every target requires an email and department")
    values = payload.model_dump()
    for field in ("template_html", "landing_page_html", "training_page_html"):
        if "password" in values[field].casefold() or "<form" in values[field].casefold():
            raise HTTPException(422, "Credential collection and form submission are prohibited")
        values[field] = sanitize_html(values[field])
    record = PhishingCampaign(**values, created_by=user.id)
    db.add(record)
    await db.commit()
    return success(record)


async def _campaign(db: AsyncSession, campaign_id: uuid.UUID, user: User) -> PhishingCampaign:
    record = await db.get(PhishingCampaign, campaign_id)
    if not record:
        raise HTTPException(404, "Campaign not found")
    await engagement_access(db, record.engagement_id, user)
    return record


@router.get("/phishing-campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    return success(await _campaign(db, campaign_id, user))


@router.post("/phishing-campaigns/{campaign_id}/send", status_code=202)
async def send_campaign(
    campaign_id: uuid.UUID, user: User = ManagerUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    campaign = await _campaign(db, campaign_id, user)
    doc = await db.get(AuthorizationDoc, campaign.approval_doc_id)
    if not doc or doc.approved is not True or doc.doc_type != AuthorizationDocType.PHISHING:
        raise HTTPException(403, "Phishing-specific authorization is no longer valid")
    targets = [
        f"email:{item['email']}"
        for item in campaign.targets
        if item["email"] not in campaign.opt_out_list
    ]
    await validate_job_authorization(
        campaign.engagement_id, targets, "phishing_simulation", user, db
    )
    campaign.status = CampaignStatus.APPROVED
    await db.commit()
    from app.tasks.social_tasks import send_awareness_campaign

    result = send_awareness_campaign.delay(str(campaign.id), str(user.id))
    return success({"task_id": result.id})


@router.get("/phishing-campaigns/{campaign_id}/results")
async def campaign_results(
    campaign_id: uuid.UUID, user: User = CurrentUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    campaign = await _campaign(db, campaign_id, user)
    departments = sorted({str(item.get("department", "Unassigned")) for item in campaign.targets})
    return success(
        {
            "sent": campaign.sent_count,
            "opened": campaign.opened_count,
            "clicked": campaign.clicked_count,
            "reported": campaign.reported_count,
            "departments": [
                {"name": name, "sent": 0, "opened": 0, "clicked": 0, "reported": 0}
                for name in departments
            ],
            "individual_tracking": False,
        }
    )


@router.post("/phishing-campaigns/{campaign_id}/cancel")
async def cancel_campaign(
    campaign_id: uuid.UUID, user: User = ManagerUser, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    campaign = await _campaign(db, campaign_id, user)
    campaign.status = CampaignStatus.CANCELLED
    campaign.completed_at = datetime.now(timezone.utc)
    await db.commit()
    return success(campaign)
