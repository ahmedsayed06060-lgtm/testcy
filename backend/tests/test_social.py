import json
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, Mock

import pytest
from conftest import TEST_NOW
from fastapi import HTTPException
from sqlalchemy import select

from app.api.v1.phishing import opt_out, track_open
from app.api.v1.social import create_campaign
from app.models.audit_log import AuditLog
from app.models.authorization_doc import AuthorizationDoc, AuthorizationDocType
from app.models.phishing_campaign import (
    CampaignEventType,
    CampaignStatus,
    PhishingCampaign,
    PhishingEvent,
)
from app.models.scope import AssetType, ScopeItem
from app.models.social_assessment import SocialAssessment, SocialPlatform
from app.schemas.social import PhishingCampaignCreate
from app.security.authorization_gate import AuthorizationDenied, validate_job_authorization
from app.services.phishing_service import (
    CampaignPolicyError,
    build_campaign_email,
    campaign_metrics,
    campaign_token,
    ensure_verified_employee_targets,
    register_campaign_event,
)
from app.tasks.social_tasks import dispatch_awareness_campaign, dispatch_impersonation_scan
from app.utils.docker_runner import ToolResult


async def make_campaign(context, status=CampaignStatus.DRAFT):
    db = context["db"]
    document = AuthorizationDoc(
        engagement_id=context["engagement"].id,
        doc_type=AuthorizationDocType.PHISHING,
        original_filename="phishing.pdf",
        file_path="test/phishing.pdf",
        sha256_hash="b" * 64,
        uploaded_by=context["admin"].id,
        approved=True,
        approved_by=context["admin"].id,
    )
    db.add(document)
    await db.flush()
    campaign = PhishingCampaign(
        engagement_id=context["engagement"].id,
        name="Authorized awareness exercise",
        status=status,
        approval_doc_id=document.id,
        targets=[
            {"email": "person@example.com", "department": "Finance"},
            {"email": "second@example.com", "department": "Finance"},
        ],
        template_html="<p>Please review the security bulletin.</p>",
        subject_line="Security awareness bulletin",
        sender_name="Security Team",
        sender_email="security@example.com",
        landing_page_html="<p>Authorized training</p>",
        training_page_html="<p>Report suspicious messages and protect your account.</p>",
        created_by=context["admin"].id,
        started_at=datetime.now(timezone.utc) if status == CampaignStatus.ACTIVE else None,
    )
    db.add(campaign)
    await db.commit()
    return campaign, document


def campaign_payload(context, document, targets=None):
    return PhishingCampaignCreate(
        engagement_id=context["engagement"].id,
        name="Quarterly awareness",
        approval_doc_id=document.id,
        targets=targets or [{"email": "person@example.com", "department": "Finance"}],
        template_html="<p>Security bulletin</p>",
        subject_line="Security bulletin",
        sender_name="Security",
        sender_email="security@example.com",
        landing_page_html="<p>Training</p>",
        training_page_html="<p>Never share your password.</p>",
    )


@pytest.mark.asyncio
async def test_employee_domains_must_be_verified(authorized_context):
    context = authorized_context
    await ensure_verified_employee_targets(
        context["db"],
        context["engagement"].id,
        [{"email": "person@mail.example.com", "department": "Finance"}],
    )
    with pytest.raises(CampaignPolicyError):
        await ensure_verified_employee_targets(
            context["db"],
            context["engagement"].id,
            [{"email": "attacker@unapproved.test", "department": "Finance"}],
        )


@pytest.mark.asyncio
async def test_email_scope_inherits_domain_and_exclusions(authorized_context):
    context = authorized_context
    result = await validate_job_authorization(
        context["engagement"].id,
        ["email:person@example.com"],
        "phishing_simulation",
        context["tester"],
        context["db"],
        now=context["now"],
    )
    assert result.allowed is True
    with pytest.raises(AuthorizationDenied) as error:
        await validate_job_authorization(
            context["engagement"].id,
            ["email:person@excluded.example.com"],
            "phishing_simulation",
            context["tester"],
            context["db"],
            now=context["now"],
        )
    assert error.value.result.code == "TARGET_EXCLUDED"


@pytest.mark.asyncio
async def test_campaign_creation_rejects_unapproved_employee_domain(authorized_context):
    context = authorized_context
    _, document = await make_campaign(context)
    with pytest.raises(HTTPException) as error:
        await create_campaign(
            campaign_payload(
                context, document, [{"email": "person@outside-example.com", "department": "IT"}]
            ),
            context["admin"],
            context["db"],
        )
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_signed_links_and_events_are_department_only(authorized_context):
    context = authorized_context
    campaign, _ = await make_campaign(context, CampaignStatus.ACTIVE)
    db = context["db"]
    token = campaign_token(campaign.id, "open", "Finance")
    response = await track_open(campaign.id, "Finance", token, db)
    assert response.media_type == "image/png"
    assert await register_campaign_event(db, campaign, "Finance", CampaignEventType.CLICKED)
    assert await register_campaign_event(db, campaign, "Finance", CampaignEventType.REPORTED)
    assert not await register_campaign_event(db, campaign, "Unknown", CampaignEventType.OPENED)
    metrics = await campaign_metrics(db, campaign)
    finance = metrics["departments"][0]
    assert finance["opened"] == 1 and finance["clicked"] == 1 and finance["reported"] == 1
    assert metrics["individual_tracking"] is False
    assert not hasattr(PhishingEvent, "email")
    with pytest.raises(HTTPException):
        await track_open(campaign.id, "Finance", "0" * 64, db)


@pytest.mark.asyncio
async def test_opt_out_is_audited_without_plaintext_audit_identity(authorized_context):
    context = authorized_context
    campaign, _ = await make_campaign(context, CampaignStatus.ACTIVE)
    token = campaign_token(campaign.id, "opt-out", "person@example.com")
    response = await opt_out(campaign.id, token, context["db"])
    assert response.status_code == 200
    assert "person@example.com" in campaign.opt_out_list
    audit = await context["db"].scalar(
        select(AuditLog).where(AuditLog.action == "phishing.opt_out")
    )
    assert audit is not None
    assert "person@example.com" not in str(audit.details)


@pytest.mark.asyncio
async def test_expired_campaign_rejects_new_events(authorized_context):
    context = authorized_context
    campaign, _ = await make_campaign(context, CampaignStatus.ACTIVE)
    campaign.started_at = TEST_NOW - timedelta(days=8)
    await context["db"].commit()
    assert not await register_campaign_event(
        context["db"], campaign, "Finance", CampaignEventType.OPENED
    )
    assert campaign.status == CampaignStatus.COMPLETED
    assert campaign.completed_at is not None


@pytest.mark.asyncio
async def test_worker_revalidates_and_sends_signed_content(authorized_context, monkeypatch):
    context = authorized_context
    campaign, _ = await make_campaign(context, CampaignStatus.APPROVED)
    gate = AsyncMock()
    sender = Mock()
    monkeypatch.setattr("app.tasks.social_tasks.validate_job_authorization", gate)
    monkeypatch.setattr("app.tasks.social_tasks.send_phishing_email.delay", sender)
    await dispatch_awareness_campaign(context["db"], str(campaign.id), str(context["tester"].id))
    gate.assert_awaited_once()
    assert sender.call_count == 2
    assert campaign.status == CampaignStatus.ACTIVE
    assert campaign.sent_count == 2
    body = sender.call_args.args[2]
    assert "track/click" in body and "opt-out" in body and "<form" not in body


@pytest.mark.asyncio
async def test_worker_cancels_if_phishing_document_is_revoked(authorized_context, monkeypatch):
    context = authorized_context
    campaign, document = await make_campaign(context, CampaignStatus.APPROVED)
    document.approved = False
    await context["db"].commit()
    gate = AsyncMock()
    sender = Mock()
    monkeypatch.setattr("app.tasks.social_tasks.validate_job_authorization", gate)
    monkeypatch.setattr("app.tasks.social_tasks.send_phishing_email.delay", sender)
    await dispatch_awareness_campaign(context["db"], str(campaign.id), str(context["tester"].id))
    gate.assert_not_awaited()
    sender.assert_not_called()
    assert campaign.status == CampaignStatus.CANCELLED


def test_email_builder_uses_purpose_bound_tokens():
    campaign = PhishingCampaign(
        id=uuid.uuid4(),
        engagement_id=uuid.uuid4(),
        name="Test",
        approval_doc_id=uuid.uuid4(),
        targets=[],
        template_html="<p>Bulletin</p>",
        subject_line="Bulletin",
        sender_name="Security",
        sender_email="security@example.com",
        landing_page_html="<p>Training</p>",
        training_page_html="<p>Training</p>",
        created_by=uuid.uuid4(),
    )
    target = {"email": "person@example.com", "department": "Finance"}
    body = build_campaign_email(campaign, target)
    open_token = campaign_token(campaign.id, "open", "Finance")
    click_token = campaign_token(campaign.id, "click", "Finance")
    assert open_token != click_token
    assert open_token in body and click_token in body


@pytest.mark.asyncio
async def test_impersonation_worker_stores_public_candidates(authorized_context, monkeypatch):
    context = authorized_context
    db = context["db"]
    db.add(
        ScopeItem(
            engagement_id=context["engagement"].id,
            asset_type=AssetType.SOCIAL_ACCOUNT,
            value="social:example_brand",
            in_scope=True,
        )
    )
    assessment = SocialAssessment(
        engagement_id=context["engagement"].id,
        platform=SocialPlatform.X,
        account_handle="example_brand",
        assessed_by=context["tester"].id,
    )
    db.add(assessment)
    await db.commit()
    gate = AsyncMock()
    runner = AsyncMock(
        return_value=ToolResult(
            stdout=json.dumps(
                [
                    {
                        "site": "Example",
                        "url": "https://example.test/profile",
                        "source": "maigret",
                        "private_data_accessed": False,
                    }
                ]
            ),
            stderr="",
            exit_code=0,
        )
    )
    monkeypatch.setattr("app.tasks.social_tasks.validate_job_authorization", gate)
    monkeypatch.setattr("app.tasks.social_tasks.run_sandboxed_tool", runner)
    await dispatch_impersonation_scan(db, str(assessment.id), str(context["tester"].id))
    gate.assert_awaited_once()
    assert runner.call_args.args[0].targets == ["social:example_brand"]
    assert assessment.impersonation_findings[0]["source"] == "maigret"
