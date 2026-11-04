"""Normalize Nuclei JSONL; malformed lines are rejected with line numbers."""

import json
from typing import Any

SEVERITIES = {"critical", "high", "medium", "low", "info", "informational"}


def parse_nuclei(payload: str) -> list[dict[str, Any]]:
    results = []
    for line_number, line in enumerate(payload.splitlines(), 1):
        if not line.strip():
            continue
        if len(line) > 2_000_000:
            raise ValueError(f"Nuclei line {line_number} is too large")
        try:
            event = json.loads(line)
            severity = event["info"]["severity"].lower()
            if severity not in SEVERITIES:
                raise ValueError("Unsupported severity")
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"Invalid Nuclei event on line {line_number}") from exc
        info = event["info"]
        results.append(
            {
                "title": info.get("name", event.get("template-id", "Nuclei finding")),
                "description": info.get(
                    "description", "Detected by an authorized Nuclei template."
                ),
                "affected_asset": event.get("matched-at", event.get("host", "unknown")),
                "severity": "informational" if severity == "info" else severity,
                "cvss_score": info.get("classification", {}).get("cvss-score"),
                "cvss_vector": info.get("classification", {}).get("cvss-metrics"),
                "cwe_id": (info.get("classification", {}).get("cwe-id") or [None])[0]
                if isinstance(info.get("classification", {}).get("cwe-id"), list)
                else info.get("classification", {}).get("cwe-id"),
                "evidence": event.get("extracted-results") or event.get("request", ""),
                "remediation": info.get(
                    "remediation", "Review the template evidence and apply vendor guidance."
                ),
                "tags": info.get("tags", []),
                "source": "nuclei",
            }
        )
    return results
