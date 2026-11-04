"""Normalize testssl.sh JSON findings and assign conservative severity."""

import json
from typing import Any


def parse_testssl(payload: str, asset: str = "unknown") -> list[dict[str, Any]]:
    events = json.loads(payload)
    if not isinstance(events, list):
        raise ValueError("testssl JSON output must be a list")
    results = []
    for event in events:
        raw = str(event.get("severity", "INFO")).lower()
        if raw == "ok":
            continue
        severity = raw if raw in {"critical", "high", "medium", "low"} else "informational"
        results.append(
            {
                "title": event.get("id", "TLS configuration finding").replace("_", " "),
                "description": event.get("finding", "TLS configuration requires review."),
                "affected_asset": event.get("ip", asset),
                "severity": severity,
                "cwe_id": event.get("cwe"),
                "evidence": event.get("finding", ""),
                "remediation": (
                    "Disable obsolete protocols/ciphers and follow current vendor TLS guidance."
                ),
                "tags": ["testssl", "tls"],
                "source": "testssl",
            }
        )
    return results
