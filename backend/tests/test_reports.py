import io
import sys
import uuid
from decimal import Decimal
from types import SimpleNamespace

import pytest
from docx import Document

from app.models.finding import Finding, Severity
from app.models.job import Job, JobStatus, JobType
from app.models.report import Report, ReportFormat, ReportLanguage, ReportType
from app.tasks.report_tasks import _delivery_summary, _render_docx, _render_html


def make_report(
    context,
    report_type=ReportType.TECHNICAL_REPORT,
    language=ReportLanguage.EN,
    file_format=ReportFormat.DOCX,
):
    return Report(
        id=uuid.uuid4(),
        engagement_id=context["engagement"].id,
        report_type=report_type,
        language=language,
        format=file_format,
        file_path="test/report",
        generated_by=context["admin"].id,
    )


def make_finding(context):
    return Finding(
        engagement_id=context["engagement"].id,
        title="Exposed administrative interface",
        description="An administrative interface is reachable from an authorized test endpoint.",
        business_impact="Unauthorized access could expose sensitive operations.",
        affected_asset="https://admin.example.com",
        severity=Severity.HIGH,
        cvss_score=Decimal("8.1"),
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
        cwe_id="CWE-306",
        evidence="Authorized HTTP response evidence.",
        remediation="Restrict access to approved networks and require MFA.",
        found_by=context["tester"].id,
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "report_type",
    [
        ReportType.EXECUTIVE_SUMMARY,
        ReportType.TECHNICAL_REPORT,
        ReportType.REMEDIATION_PLAN,
        ReportType.FULL,
    ],
)
async def test_docx_templates_render_complete_documents(authorized_context, report_type):
    context = authorized_context
    payload = _render_docx(
        make_report(context, report_type),
        context["engagement"],
        context["client"],
        [make_finding(context)],
        "Team: Test Pentester. Tools: Nmap. Recorded execution hours: 1.5.",
    )
    assert payload.startswith(b"PK")
    document = Document(io.BytesIO(payload))
    text = "\n".join(paragraph.text for paragraph in document.paragraphs)
    assert "Example Industries" in text
    assert "Exposed administrative interface" in text
    assert "{{" not in text and "{%" not in text


@pytest.mark.asyncio
async def test_arabic_docx_has_rtl_and_translated_chrome(authorized_context):
    context = authorized_context
    payload = _render_docx(
        make_report(context, ReportType.EXECUTIVE_SUMMARY, ReportLanguage.AR),
        context["engagement"],
        context["client"],
        [make_finding(context)],
        "فريق الاختبار",
    )
    document = Document(io.BytesIO(payload))
    text = "\n".join(paragraph.text for paragraph in document.paragraphs)
    assert "الملخص التنفيذي" in text
    assert "w:rtl" in document.element.xml


@pytest.mark.asyncio
async def test_pdf_report_and_delivery_summary(authorized_context):
    context = authorized_context
    db = context["db"]
    db.add(
        Job(
            engagement_id=context["engagement"].id,
            job_type=JobType.NMAP_SCAN,
            targets=["example.com"],
            tool="nmap",
            status=JobStatus.COMPLETED,
            duration_seconds=5400,
            triggered_by=context["tester"].id,
        )
    )
    await db.commit()
    summary = await _delivery_summary(db, context["engagement"], "en")
    assert "Test Pentester" in summary and "nmap" in summary and "1.5" in summary
    try:
        payload = _render_html(
            make_report(context, file_format=ReportFormat.PDF),
            context["engagement"],
            context["client"],
            [make_finding(context)],
            summary,
        )
    except OSError as exc:
        pytest.skip(f"WeasyPrint native libraries are unavailable: {exc}")
    assert payload.startswith(b"%PDF")
    assert len(payload) > 1000


def test_pdf_renderer_disables_external_resources_and_presentational_hints(
    authorized_context, monkeypatch
):
    class FakeHTML:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        def write_pdf(self, **options):
            assert options["presentational_hints"] is False
            assert '<link rel="stylesheet"' not in self.kwargs["string"]
            assert "<style>" in self.kwargs["string"]
            with pytest.raises(ValueError, match="resource loading is disabled"):
                self.kwargs["url_fetcher"]("file:///etc/passwd")
            with pytest.raises(ValueError, match="resource loading is disabled"):
                self.kwargs["url_fetcher"]("https://example.net/tracker.png")
            return b"%PDF-self-contained"

    monkeypatch.setitem(sys.modules, "weasyprint", SimpleNamespace(HTML=FakeHTML))
    payload = _render_html(
        make_report(authorized_context, file_format=ReportFormat.PDF),
        authorized_context["engagement"],
        authorized_context["client"],
        [make_finding(authorized_context)],
        "Authorized assessment team",
    )
    assert payload == b"%PDF-self-contained"
