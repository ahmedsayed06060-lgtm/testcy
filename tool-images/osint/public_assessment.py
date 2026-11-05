"""Public DNS/profile review. No login, credential testing, or private data."""

import ipaddress
import json
import socket
import subprocess
import sys
from pathlib import Path
from typing import Any


def variations(domain: str) -> set[str]:
    labels = domain.rstrip(".").split(".")
    if len(labels) < 2:
        raise ValueError("A fully-qualified domain is required")
    brand, suffix = labels[0], ".".join(labels[1:])
    return {f"{brand}{letter}.{suffix}" for letter in "abcdefghijklmnopqrstuvwxyz"} | {
        f"{brand}-support.{suffix}",
        f"{brand}-help.{suffix}",
        f"{brand}s.{suffix}",
    }


def public_dns_review(domain: str) -> list[dict[str, object]]:
    results = []
    for candidate in sorted(variations(domain))[:30]:
        try:
            addresses = sorted(
                {
                    item[4][0]
                    for item in socket.getaddrinfo(candidate, None)
                    if ipaddress.ip_address(item[4][0])
                }
            )
        except (socket.gaierror, ValueError):
            addresses = []
        results.append(
            {
                "domain": candidate,
                "resolved_addresses": addresses,
                "source": "public_dns",
                "private_data_accessed": False,
            }
        )
    return results


def _profile_candidates(node: Any) -> list[dict[str, object]]:
    """Extract only site/status/url tuples from Maigret's public JSON report."""
    candidates = []
    if isinstance(node, dict):
        url = node.get("url") or node.get("url_user")
        status = node.get("status")
        if isinstance(status, dict):
            status = status.get("status") or status.get("name")
        if isinstance(url, str) and url.startswith(("https://", "http://")):
            if status is None or str(status).casefold() in {"claimed", "found", "exists"}:
                candidates.append(
                    {
                        "site": str(node.get("site_name") or node.get("name") or "unknown"),
                        "url": url,
                        "status": str(status or "found"),
                        "source": "maigret",
                        "classification": "review_required",
                        "private_data_accessed": False,
                    }
                )
        for value in node.values():
            candidates.extend(_profile_candidates(value))
    elif isinstance(node, list):
        for value in node:
            candidates.extend(_profile_candidates(value))
    return candidates


def public_profile_review(handle: str) -> list[dict[str, object]]:
    if not handle or len(handle) > 100 or any(character.isspace() for character in handle):
        raise ValueError("A valid public account handle is required")
    for report in Path("/tmp").glob("report_*.json"):
        report.unlink(missing_ok=True)
    process = subprocess.run(
        ["maigret", "--timeout", "10", "--no-color", "--top-sites", "100", "--json", "simple", handle],
        cwd="/tmp",
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    candidates = []
    for report in Path("/tmp").glob("report_*.json"):
        try:
            candidates.extend(_profile_candidates(json.loads(report.read_text(encoding="utf-8"))))
        finally:
            report.unlink(missing_ok=True)
    unique = {(item["site"], item["url"]): item for item in candidates}
    if process.returncode != 0 and not unique:
        raise RuntimeError(f"Maigret could not complete the public review: {process.stderr[-500:]}")
    return list(unique.values())


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: public_assessment.py domain.example OR social:public_handle")
    target = sys.argv[1]
    if target.startswith("social:"):
        output = public_profile_review(target.split(":", 1)[1])
    else:
        output = public_dns_review(target)
    print(json.dumps(output, indent=2))
