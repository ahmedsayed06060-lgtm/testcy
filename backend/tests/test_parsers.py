import json

import pytest

from app.parsers import parse_mobsf, parse_nmap, parse_nuclei, parse_testssl, parse_zap


def test_nmap_parser_extracts_only_open_services():
    payload = (
        '<nmaprun><host><address addr="10.0.0.5"/><ports>'
        '<port portid="443" protocol="tcp"><state state="open"/>'
        '<service name="https" product="nginx" version="1.25"/></port>'
        '<port portid="22" protocol="tcp"><state state="closed"/></port>'
        "</ports></host></nmaprun>"
    )
    results = parse_nmap(payload)
    assert len(results) == 1
    assert results[0]["affected_asset"] == "10.0.0.5:443"
    assert "nginx 1.25" in results[0]["description"]


def test_nmap_rejects_doctype():
    with pytest.raises(ValueError):
        parse_nmap('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><nmaprun/>')


def test_nuclei_parser_normalizes_cvss_cwe_and_info():
    event = {
        "template-id": "test",
        "matched-at": "https://example.com/a",
        "info": {
            "name": "Test exposure",
            "severity": "high",
            "description": "Validated exposure",
            "classification": {
                "cvss-score": 8.1,
                "cvss-metrics": "CVSS:3.1/AV:N",
                "cwe-id": ["CWE-200"],
            },
            "tags": ["exposure"],
            "remediation": "Restrict access",
        },
    }
    result = parse_nuclei(json.dumps(event))[0]
    assert result["severity"] == "high"
    assert result["cvss_score"] == 8.1
    assert result["cwe_id"] == "CWE-200"


def test_zap_testssl_and_mobsf_parsers():
    zap = parse_zap(
        json.dumps(
            [
                {
                    "alert": "Missing header",
                    "riskcode": 2,
                    "riskdesc": "Medium",
                    "url": "https://example.com",
                    "cweid": "693",
                    "solution": "Add the header",
                }
            ]
        )
    )
    assert zap[0]["severity"] == "medium"
    tls = parse_testssl(
        json.dumps(
            [
                {"id": "TLS1_0", "severity": "HIGH", "finding": "offered"},
                {"id": "TLS1_3", "severity": "OK", "finding": "offered"},
            ]
        )
    )
    assert len(tls) == 1 and tls[0]["severity"] == "high"
    mobile = parse_mobsf(
        {
            "package_name": "com.example",
            "findings": {
                "insecure_storage": {
                    "title": "Insecure storage",
                    "severity": "high",
                    "description": "Sensitive data",
                }
            },
        }
    )
    assert mobile[0]["affected_asset"] == "com.example"
