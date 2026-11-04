import asyncio
import io
from typing import cast

from docx import Document
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.database import SessionFactory
from app.minio_client import upload_bytes
from app.models.client import Client
from app.models.engagement import Engagement
from app.models.finding import Finding
from app.models.report import Report, ReportFormat
from app.tasks.celery_app import celery_app
from app.utils.sanitize import plain_text

jinja = Environment(
    loader=FileSystemLoader("app/templates/reports"), autoescape=select_autoescape(["html", "xml"])
)


def _render_html(
    report: Report, engagement: Engagement, client: Client, findings: list[Finding]
) -> bytes:
    template = jinja.get_template(f"{report.report_type.value}_{report.language.value}.html")
    html = template.render(
        report=report,
        engagement=engagement,
        client=client,
        findings=findings,
        direction="rtl" if report.language.value == "ar" else "ltr",
    )
    return cast(bytes, HTML(string=html, base_url="app/templates/reports").write_pdf())


def _render_docx(
    report: Report, engagement: Engagement, client: Client, findings: list[Finding]
) -> bytes:
    document = Document()
    document.add_heading(f"CyberOps Hub — {report.report_type.value.replace('_', ' ').title()}", 0)
    document.add_paragraph(f"{client.company_name} · {engagement.name}")
    document.add_paragraph(f"Confidential · {engagement.start_date} — {engagement.end_date}")
    document.add_heading(
        "Executive overview" if report.language.value == "en" else "الملخص التنفيذي", 1
    )
    document.add_paragraph(plain_text(engagement.rules_of_engagement))
    for finding in sorted(findings, key=lambda item: item.cvss_score or 0, reverse=True):
        document.add_heading(f"{finding.title} ({finding.severity.value.upper()})", 2)
        document.add_paragraph(
            f"Asset: {finding.affected_asset} · CVSS: {finding.cvss_score or 'N/A'}"
        )
        document.add_paragraph(plain_text(finding.description))
        if finding.remediation:
            document.add_paragraph(f"Remediation: {plain_text(finding.remediation)}")
    output = io.BytesIO()
    document.save(output)
    return output.getvalue()


@celery_app.task(autoretry_for=(ConnectionError,), retry_backoff=True, max_retries=2)
def render_report(report_id: str) -> None:
    async def run() -> None:
        async with SessionFactory() as db:
            report = await db.get(Report, report_id)
            if not report:
                return
            engagement = await db.get(Engagement, report.engagement_id)
            client = await db.get(Client, engagement.client_id) if engagement else None
            if not engagement or not client:
                return
            from sqlalchemy import select

            findings = list(
                (
                    await db.scalars(
                        select(Finding).where(
                            Finding.engagement_id == engagement.id, Finding.deleted_at.is_(None)
                        )
                    )
                ).all()
            )
            renderer = _render_html if report.format == ReportFormat.PDF else _render_docx
            payload = await asyncio.to_thread(renderer, report, engagement, client, findings)
            content_type = (
                "application/pdf"
                if report.format == ReportFormat.PDF
                else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            await asyncio.to_thread(upload_bytes, report.file_path, payload, content_type)
            report.file_size = len(payload)
            await db.commit()

    asyncio.run(run())
