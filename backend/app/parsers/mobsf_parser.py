"""Extract normalized findings from MobSF report JSON."""

from typing import Any


def parse_mobsf(report: dict[str, Any]) -> list[dict[str, Any]]:
    package = report.get("package_name", report.get("bundle_id", "unknown"))
    results = []
    for key, finding in report.get("findings", {}).items():
        if isinstance(finding, dict):
            results.append(
                {
                    "title": finding.get("title", key.replace("_", " ")),
                    "description": finding.get("description", "MobSF static analysis finding."),
                    "affected_asset": package,
                    "severity": finding.get("severity", "informational").lower(),
                    "evidence": finding.get("evidence", ""),
                    "remediation": finding.get("remediation", "Review MASVS guidance."),
                    "tags": ["mobsf", "mobile"],
                    "source": "mobsf",
                }
            )
    for finding in (
        report.get("code_analysis", {}).values()
        if isinstance(report.get("code_analysis"), dict)
        else []
    ):
        if isinstance(finding, dict) and finding.get("metadata"):
            metadata = finding["metadata"]
            results.append(
                {
                    "title": metadata.get("description", "Mobile code finding"),
                    "description": metadata.get("description", "MobSF code analysis finding"),
                    "affected_asset": package,
                    "severity": metadata.get("severity", "informational").lower(),
                    "cwe_id": metadata.get("cwe"),
                    "evidence": str(finding.get("files", {})),
                    "remediation": "Review the affected code and MASVS remediation guidance.",
                    "tags": ["mobsf", "code"],
                    "source": "mobsf",
                }
            )
    return results
