import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException
from test_social import campaign_payload, make_campaign

from app.api.v1 import phishing, social
from app.models.phishing_campaign import CampaignStatus
from app.models.social_assessment import SocialPlatform
from app.schemas.social import ChecklistUpdate, SocialAssessmentCreate
from app.services.phishing_service import campaign_token, campaign_url, opt_out_url


@pytest.mark.asyncio
async def test_social_assessment_crud_checklist_and_scan(authorized_context, monkeypatch):
    context = authorized_context
    db, engagement, user = context["db"], context["engagement"], context["tester"]
    record = (
        await social.create_assessment(
            SocialAssessmentCreate(
                engagement_id=engagement.id,
                platform=SocialPlatform.X,
                account_handle="example_brand",
            ),
            user,
            db,
        )
    )["data"]
    assert (await social.list_assessments(engagement.id, user, db))["data"][0].id == record.id
    assert (await social.get_assessment(record.id, user, db))["data"].id == record.id
    await social.update_checklist(
        record.id,
        ChecklistUpdate(checklist_results={"mfa": True, "verified": False, "recovery": None}),
        user,
        db,
    )
    assert float(record.posture_score) == 33.33
    gate = AsyncMock()
    delay = Mock(return_value=Mock(id="social-task"))
    monkeypatch.setattr("app.api.v1.social.validate_job_authorization", gate)
    monkeypatch.setattr("app.tasks.social_tasks.run_impersonation_scan.delay", delay)
    result = (await social.impersonation_scan(record.id, user, db))["data"]
    assert result["task_id"] == "social-task"
    gate.assert_awaited_once()
    delay.assert_called_once_with(str(record.id), str(user.id))
    with pytest.raises(HTTPException):
        await social.get_assessment(uuid.uuid4(), user, db)
    with pytest.raises(HTTPException):
        await social.update_checklist(uuid.uuid4(), ChecklistUpdate(checklist_results={}), user, db)
    with pytest.raises(HTTPException):
        await social.impersonation_scan(uuid.uuid4(), user, db)


@pytest.mark.asyncio
async def test_campaign_create_redaction_send_results_cancel_and_errors(
    authorized_context, monkeypatch
):
    context = authorized_context
    db, admin, tester = context["db"], context["admin"], context["tester"]
    existing, document = await make_campaign(context)
    created = (await social.create_campaign(campaign_payload(context, document), admin, db))["data"]
    assert created.status == CampaignStatus.DRAFT
    with pytest.raises(HTTPException) as missing_doc:
        await social.create_campaign(
            campaign_payload(context, document).model_copy(
                update={"approval_doc_id": uuid.uuid4()}
            ),
            admin,
            db,
        )
    assert missing_doc.value.status_code == 403
    with pytest.raises(HTTPException) as credential_form:
        await social.create_campaign(
            campaign_payload(context, document).model_copy(
                update={"template_html": "<form><input type=password></form>"}
            ),
            admin,
            db,
        )
    assert credential_form.value.status_code == 422
    gate = AsyncMock()
    delay = Mock(return_value=Mock(id="campaign-task"))
    monkeypatch.setattr("app.api.v1.social.validate_job_authorization", gate)
    monkeypatch.setattr("app.tasks.social_tasks.send_awareness_campaign.delay", delay)
    sent = (await social.send_campaign(existing.id, admin, db))["data"]
    assert sent["task_id"] == "campaign-task" and existing.status == CampaignStatus.APPROVED
    gate.assert_awaited_once()
    with pytest.raises(HTTPException) as duplicate:
        await social.send_campaign(existing.id, admin, db)
    assert duplicate.value.status_code == 409
    admin_list = (await social.list_campaigns(existing.engagement_id, admin, db))["data"]
    tester_list = (await social.list_campaigns(existing.engagement_id, tester, db))["data"]
    assert hasattr(admin_list[0], "targets")
    assert all("targets" not in item for item in tester_list)
    admin_detail = (await social.get_campaign(existing.id, admin, db))["data"]
    tester_detail = (await social.get_campaign(existing.id, tester, db))["data"]
    assert hasattr(admin_detail, "targets")
    assert "targets" not in tester_detail and "sender_email" not in tester_detail
    metrics = (await social.campaign_results(existing.id, tester, db))["data"]
    assert metrics["individual_tracking"] is False
    await social.cancel_campaign(existing.id, admin, db)
    assert existing.status == CampaignStatus.CANCELLED and existing.completed_at is not None
    expired, _ = await make_campaign(context, CampaignStatus.ACTIVE)
    expired.started_at = datetime.now(timezone.utc) - timedelta(days=30)
    await db.commit()
    await social.campaign_results(expired.id, admin, db)
    assert expired.status == CampaignStatus.COMPLETED
    revoked, revoked_doc = await make_campaign(context)
    revoked_doc.approved = False
    await db.commit()
    with pytest.raises(HTTPException) as no_longer_authorized:
        await social.send_campaign(revoked.id, admin, db)
    assert no_longer_authorized.value.status_code == 403
    with pytest.raises(HTTPException):
        await social.get_campaign(uuid.uuid4(), admin, db)


@pytest.mark.asyncio
async def test_signed_public_awareness_links_and_no_credential_capture(authorized_context):
    context = authorized_context
    campaign, _ = await make_campaign(context, CampaignStatus.ACTIVE)
    db = context["db"]
    department = "Finance"
    click = await phishing.track_click(
        campaign.id, department, campaign_token(campaign.id, "click", department), db
    )
    assert click.status_code == 303 and "training" in click.headers["location"]
    training = await phishing.training_page(
        campaign.id, department, campaign_token(campaign.id, "training", department), db
    )
    assert training.status_code == 200 and b"does not request or store credentials" in training.body
    report = await phishing.report_simulation(
        campaign.id, department, campaign_token(campaign.id, "report", department), db
    )
    assert report.status_code == 200 and b"department level" in report.body
    with pytest.raises(HTTPException):
        await phishing.training_page(
            campaign.id, "Unknown", campaign_token(campaign.id, "training", "Unknown"), db
        )
    with pytest.raises(HTTPException):
        await phishing.track_click(campaign.id, department, "0" * 64, db)
    email = "person@example.com"
    opt_out_token = campaign_token(campaign.id, "opt-out", email)
    await phishing.opt_out(campaign.id, opt_out_token, db)
    await phishing.opt_out(campaign.id, opt_out_token, db)
    assert campaign.opt_out_list.count(email) == 1
    with pytest.raises(HTTPException):
        await phishing.opt_out(uuid.uuid4(), opt_out_token, db)
    assert "opt-out" in opt_out_url(campaign.id, email)
    with pytest.raises(ValueError):
        campaign_url(campaign.id, "invalid", department)
