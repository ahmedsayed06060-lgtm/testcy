"""Parse Nmap XML into normalized service findings without external entities."""

from typing import Any

from defusedxml import ElementTree as ET


def parse_nmap(payload: str) -> list[dict[str, Any]]:
    if len(payload) > 20_000_000 or "<!DOCTYPE" in payload.upper():
        raise ValueError("Nmap XML is too large or contains a forbidden doctype")
    root = ET.fromstring(payload)
    results = []
    for host in root.findall("host"):
        address = host.find("address")
        asset = address.get("addr", "unknown") if address is not None else "unknown"
        for port in host.findall("./ports/port"):
            state = port.find("state")
            if state is None or state.get("state") != "open":
                continue
            service = port.find("service")
            name = service.get("name", "unknown") if service is not None else "unknown"
            product = service.get("product", "") if service is not None else ""
            version = service.get("version", "") if service is not None else ""
            results.append(
                {
                    "title": f"Open {name} service on port {port.get('portid')}",
                    "description": f"Accessible service: {product} {version}".strip(),
                    "affected_asset": f"{asset}:{port.get('portid')}",
                    "severity": "informational",
                    "status": "open",
                    "tags": ["nmap", "service-discovery"],
                    "evidence": ET.tostring(port, encoding="unicode"),
                    "raw_severity": "info",
                    "source": "nmap",
                }
            )
    return results
