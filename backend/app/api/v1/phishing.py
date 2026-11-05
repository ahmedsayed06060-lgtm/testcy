"""Signed public awareness links; no recipient identity is stored in event rows."""

import base64
import hashlib
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.phishing_campaign import CampaignEventType, PhishingCampaign
from app.services.audit_service import record_audit
from app.services.phishing_service import (
    campaign_url,
    register_campaign_event,
    valid_campaign_token,
)

router = APIRouter(prefix="/phishing-campaigns", tags=["phishing awareness"])
_PIXEL = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)
_NO_STORE = {"Cache-Control": "no-store, max-age=0", "Pragma": "no-cache"}


async def _signed_campaign(
    db: AsyncSession, campaign_id: uuid.UUID, action: str, subject: str, token: str
) -> PhishingCampaign:
    campaign = await db.get(PhishingCampaign, campaign_id)
    if not campaign or not valid_campaign_token(campaign_id, action, subject, token):
        raise HTTPException(404, "Awareness link is invalid or expired")
    return campaign


@router.get("/{campaign_id}/track/open", include_in_schema=False)
async def track_open(
    campaign_id: uuid.UUID,
    department: str = Query(min_length=1, max_length=100),
    token: str = Query(min_length=64, max_length=64),
    db: AsyncSession = Depends(get_db),
) -> Response:
    campaign = await _signed_campaign(db, campaign_id, "open", department, token)
    await register_campaign_event(db, campaign, department, CampaignEventType.OPENED)
    return Response(content=_PIXEL, media_type="image/png", headers=_NO_STORE)


@router.get("/{campaign_id}/track/click", include_in_schema=False)
async def track_click(
    campaign_id: uuid.UUID,
    department: str = Query(min_length=1, max_length=100),
    token: str = Query(min_length=64, max_length=64),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    campaign = await _signed_campaign(db, campaign_id, "click", department, token)
    await register_campaign_event(db, campaign, department, CampaignEventType.CLICKED)
    return RedirectResponse(campaign_url(campaign_id, "training", department), status_code=303)


@router.get("/{campaign_id}/training", include_in_schema=False)
async def training_page(
    campaign_id: uuid.UUID,
    department: str = Query(min_length=1, max_length=100),
    token: str = Query(min_length=64, max_length=64),
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    campaign = await _signed_campaign(db, campaign_id, "training", department, token)
    if department not in {str(item.get("department")) for item in campaign.targets}:
        raise HTTPException(404, "Awareness link is invalid or expired")
    content = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Security awareness</title></head>
<body><main><h1>Authorized security awareness</h1>{campaign.training_page_html}
<p>This exercise does not request or store credentials.</p></main></body></html>"""
    return HTMLResponse(content, headers=_NO_STORE)


@router.get("/{campaign_id}/track/report", include_in_schema=False)
async def report_simulation(
    campaign_id: uuid.UUID,
    department: str = Query(min_length=1, max_length=100),
    token: str = Query(min_length=64, max_length=64),
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    campaign = await _signed_campaign(db, campaign_id, "report", department, token)
    await register_campaign_event(db, campaign, department, CampaignEventType.REPORTED)
    return HTMLResponse(
        '<!doctype html><html lang="en"><body><main><h1>Thank you for reporting</h1>'
        "<p>Your security team has recorded this awareness report at department level.</p>"
        "</main></body></html>",
        headers=_NO_STORE,
    )


@router.get("/{campaign_id}/opt-out", include_in_schema=False)
async def opt_out(
    campaign_id: uuid.UUID,
    token: str = Query(min_length=64, max_length=64),
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    campaign = await db.get(PhishingCampaign, campaign_id)
    matched_email = None
    if campaign:
        for target in campaign.targets:
            email = str(target.get("email", "")).casefold()
            if valid_campaign_token(campaign_id, "opt-out", email, token):
                matched_email = email
                break
    if not campaign or not matched_email:
        raise HTTPException(404, "Opt-out link is invalid or expired")
    if matched_email not in campaign.opt_out_list:
        campaign.opt_out_list = [*campaign.opt_out_list, matched_email]
        await record_audit(
            db,
            action="phishing.opt_out",
            resource_type="phishing_campaign",
            resource_id=campaign.id,
            user_id=None,
            details={"recipient_sha256": hashlib.sha256(matched_email.encode()).hexdigest()},
        )
        await db.commit()
    return HTMLResponse(
        '<!doctype html><html lang="en"><body><main><h1>Preference saved</h1>'
        "<p>You will not receive further emails from this awareness campaign.</p>"
        "</main></body></html>",
        headers=_NO_STORE,
    )
