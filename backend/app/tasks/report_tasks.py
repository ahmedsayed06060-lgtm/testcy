import asyncio
import io
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, cast

from docxtpl import DocxTemplate
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionFactory
from app.minio_client import upload_bytes
from app.models.client import Client
from app.models.engagement import Engagement, EngagementUser
from app.models.finding import Finding
from app.models.job import Job
from app.models.report import Report, ReportFormat
from app.models.user import User
from app.tasks.celery_app import celery_app
from app.utils.sanitize import plain_text

jinja = Environment(
    loader=FileSystemLoader("app/templates/reports"), autoescape=select_autoescape(["html", "xml"])
)
_SEVERITIES = ("critical", "high", "medium", "low", "informational")


def _deny_report_resource(url: str) -> None:
    """Reports are self-contained; never fetch local or network resources."""
    raise ValueError(f"Report resource loading is disabled: {url}")


def _severity_counts(findings: list[Finding]) -> dict[str, int]:
    return {
        severity: sum(1 for finding in findings if finding.severity.value == severity)
        for severity in _SEVERITIES
    }


def _finding_data(finding: Finding, language: str) -> dict[str, str]:
    severity = finding.severity.value
    days = {"critical": 7, "high": 14, "medium": 30, "low": 60, "informational": 90}[severity]
    effort = {"critical": "24–48 hours", "high": "2–5 days"}.get(
        severity, "Planned engineering effort"
    )
    horizon = (
        {"critical": "عاجل", "high": "قصير المدى"}.get(severity, "مجدول")
        if language == "ar"
        else {"critical": "Immediate", "high": "Short term"}.get(severity, "Planned")
    )
    references = []
    if finding.cwe_id:
        cwe_number = finding.cwe_id.removeprefix("CWE-")
        references.append(f"https://cwe.mitre.org/data/definitions/{cwe_number}.html")
    if finding.owasp_category:
        references.append(f"OWASP {finding.owasp_category}")
    return {
        "title": plain_text(finding.title),
        "severity": severity,
        "cvss_score": str(finding.cvss_score) if finding.cvss_score is not None else "N/A",
        "cwe_id": finding.cwe_id or "N/A",
        "owasp_category": finding.owasp_category or "N/A",
        "affected_asset": plain_text(finding.affected_asset),
        "description": plain_text(finding.description),
        "business_impact": plain_text(finding.business_impact or finding.description),
        "evidence": plain_text(finding.evidence or "Validated during the authorized assessment."),
        "remediation": plain_text(
            finding.remediation or "Apply current vendor guidance and verify the fix with a retest."
        ),
        "references": "\n".join(references) or "Internal authorized assessment evidence",
        "deadline": (datetime.now(timezone.utc) + timedelta(days=days)).date().isoformat(),
        "effort": effort,
        "remediation_horizon": horizon,
        "owner": str(finding.assigned_to)
        if finding.assigned_to
        else ("غير معين" if language == "ar" else "Unassigned"),
    }


def _report_context(
    engagement: Engagement,
    client: Client,
    findings: list[Finding],
    language: str,
    delivery_notes: str,
) -> dict[str, Any]:
    counts = _severity_counts(findings)
    highest = next((severity for severity in _SEVERITIES if counts[severity]), "informational")
    risk_labels = (
        {
            "critical": "حرج",
            "high": "مرتفع",
            "medium": "متوسط",
            "low": "منخفض",
            "informational": "معلوماتي",
        }
        if language == "ar"
        else {severity: severity.replace("_", " ").title() for severity in _SEVERITIES}
    )
    rows = [
        _finding_data(finding, language)
        for finding in sorted(
            findings,
            key=lambda item: (_SEVERITIES.index(item.severity.value), -(item.cvss_score or 0)),
        )
    ]
    top_findings = [row for row in rows if row["severity"] in {"critical", "high"}][:5]
    return {
        "engagement": engagement,
        "client": client,
        "findings": rows,
        "top_findings": top_findings,
        "severity_counts": counts,
        "risk_rating": risk_labels[highest],
        "generated_at": datetime.now(timezone.utc).date().isoformat(),
        "methodology": (
            f"Authorized {engagement.type.value.replace('_', ' ')} "
            "using non-destructive validation, scope-limited tools, analyst verification, "
            "CVSS scoring, and evidence preservation."
        ),
        "delivery_notes": delivery_notes,
        "remediation_guidance": (
            "Prioritize exploitable critical/high findings, assign a named owner, isolate affected "
            "assets where necessary, and record verification evidence for every closure."
        ),
        "retest_plan": (
            "Retest each remediated asset within the authorized window using the original "
            "validation method plus boundary and regression cases. Record fixed, retest, "
            "or accepted-risk status."
        ),
    }


def _render_html(
    report: Report,
    engagement: Engagement,
    client: Client,
    findings: list[Finding],
    delivery_notes: str,
) -> bytes:
    from weasyprint import HTML

    template = jinja.get_template(f"{report.report_type.value}_{report.language.value}.html")
    context = _report_context(engagement, client, findings, report.language.value, delivery_notes)
    context.update(
        report=report,
        findings=findings,
        direction="rtl" if report.language.value == "ar" else "ltr",
    )
    html = template.render(**context)
    return cast(
        bytes,
        HTML(string=html, url_fetcher=_deny_report_resource).write_pdf(presentational_hints=False),
    )


def _render_docx(
    report: Report,
    engagement: Engagement,
    client: Client,
    findings: list[Finding],
    delivery_notes: str,
) -> bytes:
    template_type = (
        "technical_report" if report.report_type.value == "full" else report.report_type.value
    )
    template = DocxTemplate(f"app/templates/reports/{template_type}_{report.language.value}.docx")
    template.render(
        _report_context(engagement, client, findings, report.language.value, delivery_notes)
    )
    output = io.BytesIO()
    template.save(output)
    return output.getvalue()


async def _delivery_summary(db: AsyncSession, engagement: Engagement, language: str) -> str:
    team = list(
        (
            await db.scalars(
                select(User.full_name)
                .join(EngagementUser, EngagementUser.user_id == User.id)
                .where(EngagementUser.engagement_id == engagement.id)
                .order_by(User.full_name)
            )
        ).all()
    )
    jobs = list((await db.scalars(select(Job).where(Job.engagement_id == engagement.id))).all())
    tools = sorted({job.tool for job in jobs})
    hours = sum((job.duration_seconds or 0) for job in jobs) / 3600
    if language == "ar":
        return (
            f"الفريق: {', '.join(team) or 'مدير التقييم'}. "
            f"الأدوات: {', '.join(tools) or 'تحليل يدوي'}. "
            f"ساعات التنفيذ المسجلة: {hours:.1f}. راجع سجل التدقيق للتفاصيل."
        )
    return (
        f"Team: {', '.join(team) or 'Engagement manager'}. "
        f"Tools: {', '.join(tools) or 'Manual analysis'}. "
        f"Recorded execution hours: {hours:.1f}. See the immutable audit log for details."
    )


@celery_app.task(autoretry_for=(ConnectionError,), retry_backoff=True, max_retries=2)
def render_report(report_id: str) -> None:
    async def run() -> None:
        async with SessionFactory() as db:
            report = await db.get(Report, uuid.UUID(report_id))
            if not report:
                return
            engagement = await db.get(Engagement, report.engagement_id)
            client = await db.get(Client, engagement.client_id) if engagement else None
            if not engagement or not client:
                return
            findings = list(
                (
                    await db.scalars(
                        select(Finding).where(
                            Finding.engagement_id == engagement.id, Finding.deleted_at.is_(None)
                        )
                    )
                ).all()
            )
            delivery_notes = await _delivery_summary(db, engagement, report.language.value)
            renderer = _render_html if report.format == ReportFormat.PDF else _render_docx
            payload = await asyncio.to_thread(
                renderer, report, engagement, client, findings, delivery_notes
            )
            content_type = (
                "application/pdf"
                if report.format == ReportFormat.PDF
                else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            await asyncio.to_thread(upload_bytes, report.file_path, payload, content_type)
            report.file_size = len(payload)
            await db.commit()

    asyncio.run(run())
