"""Normalize OWASP ZAP JSON alert exports."""

import json
from typing import Any


def parse_zap(payload: str) -> list[dict[str, Any]]:
    data = json.loads(payload)
    alerts = data.get("alerts", []) if isinstance(data, dict) else data
    if not isinstance(alerts, list):
        raise ValueError("ZAP alerts must be a list")
    results = []
    for alert in alerts:
        risk = (
            str(alert.get("risk", alert.get("riskdesc", "Informational"))).split(" ", 1)[0].lower()
        )
        severity = {"high": "high", "medium": "medium", "low": "low"}.get(risk, "informational")
        if int(alert.get("riskcode", 0)) >= 4:
            severity = "critical"
        results.append(
            {
                "title": alert.get("alert", alert.get("name", "ZAP alert")),
                "description": alert.get("description", "Detected by OWASP ZAP."),
                "affected_asset": alert.get("url", alert.get("uri", "unknown")),
                "severity": severity,
                "cvss_score": None,
                "cwe_id": f"CWE-{alert['cweid']}" if alert.get("cweid") else None,
                "owasp_category": alert.get("wascid"),
                "evidence": alert.get("evidence", ""),
                "remediation": alert.get(
                    "solution", "Review ZAP evidence and apply secure framework guidance."
                ),
                "tags": ["zap", "web"],
                "source": "zap",
            }
        )
    return results
