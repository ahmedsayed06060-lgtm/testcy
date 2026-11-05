"""Regenerate the six versioned DOCX/Jinja report templates deterministically."""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.shared import Cm, Pt

OUTPUT = Path(__file__).parents[1] / "app" / "templates" / "reports"


def paragraph(document: Document, text: str = "", *, arabic: bool = False, bold: bool = False):
    item = document.add_paragraph()
    item.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
    if arabic:
        item._p.get_or_add_pPr().append(OxmlElement("w:bidi"))
    run = item.add_run(text)
    run.bold = bold
    run.font.name = "Noto Sans Arabic" if arabic else "Arial"
    run.font.size = Pt(10.5)
    if arabic:
        run._r.get_or_add_rPr().append(OxmlElement("w:rtl"))
    return item


def heading(document: Document, text: str, level: int, arabic: bool):
    item = document.add_heading("", level)
    item.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
    if arabic:
        item._p.get_or_add_pPr().append(OxmlElement("w:bidi"))
    run = item.add_run(text)
    run.font.name = "Noto Sans Arabic" if arabic else "Arial"
    if arabic:
        run._r.get_or_add_rPr().append(OxmlElement("w:rtl"))
    return item


def base_document(report_type: str, language: str) -> Document:
    arabic = language == "ar"
    document = Document()
    section = document.sections[0]
    section.top_margin = section.bottom_margin = Cm(1.8)
    section.left_margin = section.right_margin = Cm(1.8)
    footer = section.footer.paragraphs[0]
    footer.text = (
        "سري — للمستلم المصرح له فقط" if arabic else "Confidential — authorized recipient only"
    )
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    titles = {
        "executive_summary": ("Executive Security Summary", "الملخص التنفيذي للأمن"),
        "technical_report": ("Technical Security Assessment", "تقرير التقييم الأمني الفني"),
        "remediation_plan": ("Prioritized Remediation Plan", "خطة المعالجة حسب الأولوية"),
    }
    heading(document, titles[report_type][1 if arabic else 0], 0, arabic)
    paragraph(document, "CyberOps Hub", arabic=arabic, bold=True)
    paragraph(document, "{{ client.company_name }}", arabic=arabic)
    paragraph(document, "{{ engagement.name }}", arabic=arabic)
    paragraph(
        document,
        "{{ engagement.start_date }} — {{ engagement.end_date }} · {{ generated_at }}",
        arabic=arabic,
    )
    paragraph(document, "سري" if arabic else "Confidential", arabic=arabic, bold=True)
    document.add_page_break()
    return document


def executive_content(document: Document, arabic: bool) -> None:
    heading(
        document,
        "نطاق التقييم ومنهجيته" if arabic else "Assessment scope and methodology",
        1,
        arabic,
    )
    paragraph(document, "{{ engagement.rules_of_engagement }}", arabic=arabic)
    paragraph(document, "{{ methodology }}", arabic=arabic)
    heading(document, "تصنيف المخاطر" if arabic else "Overall risk rating", 1, arabic)
    paragraph(document, "{{ risk_rating }}", arabic=arabic, bold=True)
    paragraph(
        document,
        (
            "الحرجة: {{ severity_counts.critical }} · العالية: {{ severity_counts.high }} · "
            "المتوسطة: {{ severity_counts.medium }} · المنخفضة: {{ severity_counts.low }} · "
            "المعلوماتية: {{ severity_counts.informational }}"
        )
        if arabic
        else (
            "Critical: {{ severity_counts.critical }} · High: {{ severity_counts.high }} · "
            "Medium: {{ severity_counts.medium }} · Low: {{ severity_counts.low }} · "
            "Informational: {{ severity_counts.informational }}"
        ),
        arabic=arabic,
    )
    heading(document, "أهم النتائج" if arabic else "Priority findings", 1, arabic)
    paragraph(document, "{% for finding in top_findings %}", arabic=arabic)
    paragraph(
        document, "{{ finding.severity|upper }} · {{ finding.title }}", arabic=arabic, bold=True
    )
    paragraph(document, "{{ finding.business_impact }}", arabic=arabic)
    paragraph(document, "{% endfor %}", arabic=arabic)
    heading(document, "ملخص التوصيات" if arabic else "Recommendations summary", 1, arabic)
    paragraph(document, "{% for finding in top_findings %}", arabic=arabic)
    paragraph(document, "{{ loop.index }}. {{ finding.remediation }}", arabic=arabic)
    paragraph(document, "{% endfor %}", arabic=arabic)
    heading(document, "فريق العمل والأدوات" if arabic else "Team, tools, and effort", 1, arabic)
    paragraph(document, "{{ delivery_notes }}", arabic=arabic)


def technical_content(document: Document, arabic: bool) -> None:
    executive_content(document, arabic)
    document.add_page_break()
    heading(
        document, "النتائج الفنية التفصيلية" if arabic else "Detailed technical findings", 1, arabic
    )
    paragraph(document, "{% for finding in findings %}", arabic=arabic)
    heading(document, "{{ loop.index }}. {{ finding.title }}", 2, arabic)
    paragraph(
        document,
        "{{ finding.severity|upper }} · CVSS {{ finding.cvss_score }} · "
        "{{ finding.cwe_id }} · {{ finding.owasp_category }}",
        arabic=arabic,
        bold=True,
    )
    paragraph(document, "{{ finding.affected_asset }}", arabic=arabic)
    paragraph(document, "{{ finding.description }}", arabic=arabic)
    heading(document, "الأثر" if arabic else "Impact", 3, arabic)
    paragraph(document, "{{ finding.business_impact }}", arabic=arabic)
    heading(document, "الدليل" if arabic else "Evidence", 3, arabic)
    paragraph(document, "{{ finding.evidence }}", arabic=arabic)
    heading(document, "المعالجة" if arabic else "Remediation", 3, arabic)
    paragraph(document, "{{ finding.remediation }}", arabic=arabic)
    paragraph(document, "{{ finding.references }}", arabic=arabic)
    paragraph(document, "{% endfor %}", arabic=arabic)


def remediation_content(document: Document, arabic: bool) -> None:
    heading(document, "أولويات التنفيذ" if arabic else "Execution priorities", 1, arabic)
    paragraph(document, "{{ remediation_guidance }}", arabic=arabic)
    paragraph(document, "{% for finding in findings %}", arabic=arabic)
    heading(document, "{{ loop.index }}. {{ finding.title }}", 2, arabic)
    paragraph(
        document,
        "{{ finding.severity|upper }} · {{ finding.remediation_horizon }} · {{ finding.deadline }}",
        arabic=arabic,
        bold=True,
    )
    paragraph(document, "{{ finding.affected_asset }}", arabic=arabic)
    paragraph(document, "{{ finding.remediation }}", arabic=arabic)
    paragraph(document, "{{ finding.owner }} · {{ finding.effort }}", arabic=arabic)
    paragraph(document, "{% endfor %}", arabic=arabic)
    heading(document, "خطة إعادة الاختبار" if arabic else "Retest plan", 1, arabic)
    paragraph(document, "{{ retest_plan }}", arabic=arabic)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for report_type in ("executive_summary", "technical_report", "remediation_plan"):
        for language in ("en", "ar"):
            arabic = language == "ar"
            document = base_document(report_type, language)
            if report_type == "technical_report":
                technical_content(document, arabic)
            elif report_type == "remediation_plan":
                remediation_content(document, arabic)
            else:
                executive_content(document, arabic)
            path = OUTPUT / f"{report_type}_{language}.docx"
            document.save(path)
            print(path)


if __name__ == "__main__":
    main()
