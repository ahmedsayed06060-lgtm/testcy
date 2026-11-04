"""CVSS v3.x scoring and consistent severity labels."""

from cvss import CVSS3

from app.models.finding import Severity


def calculate_cvss(vector: str) -> tuple[float, Severity]:
    try:
        parsed = CVSS3(vector.strip())
        score = float(parsed.base_score)
    except Exception as exc:
        raise ValueError("A valid CVSS v3.x vector is required") from exc
    if score >= 9.0:
        severity = Severity.CRITICAL
    elif score >= 7.0:
        severity = Severity.HIGH
    elif score >= 4.0:
        severity = Severity.MEDIUM
    elif score > 0:
        severity = Severity.LOW
    else:
        severity = Severity.INFORMATIONAL
    return score, severity
