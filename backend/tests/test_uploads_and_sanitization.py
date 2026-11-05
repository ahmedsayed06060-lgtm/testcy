import io
from unittest.mock import Mock

import clamd
import pytest
from fastapi import HTTPException

from app.services.upload_service import MalwareDetected, ensure_clean_upload, scan_bytes
from app.utils.sanitize import plain_text, sanitize_html


def scanner_response(monkeypatch, response):
    client = Mock()
    client.instream.return_value = response
    constructor = Mock(return_value=client)
    monkeypatch.setattr("app.services.upload_service.clamd.ClamdNetworkSocket", constructor)
    return client, constructor


def test_clamav_clean_found_and_error_responses(monkeypatch):
    client, constructor = scanner_response(monkeypatch, {"stream": ("OK", None)})
    scan_bytes(b"clean")
    constructor.assert_called_once()
    assert isinstance(client.instream.call_args.args[0], io.BytesIO)
    scanner_response(monkeypatch, {"stream": ("FOUND", "Eicar-Test-Signature")})
    with pytest.raises(MalwareDetected, match="Eicar"):
        scan_bytes(b"bad")
    scanner_response(monkeypatch, {"stream": ("ERROR", "scanner failed")})
    with pytest.raises(ConnectionError, match="scanner failed"):
        scan_bytes(b"unknown")
    scanner_response(monkeypatch, {})
    with pytest.raises(ConnectionError, match="No scanner response"):
        scan_bytes(b"unknown")


@pytest.mark.asyncio
async def test_upload_fails_closed_for_malware_and_scanner_outage(monkeypatch):
    monkeypatch.setattr(
        "app.services.upload_service.scan_bytes", Mock(side_effect=MalwareDetected("bad"))
    )
    with pytest.raises(HTTPException) as malware:
        await ensure_clean_upload(b"bad")
    assert malware.value.status_code == 422
    for exception in (
        ConnectionError("down"),
        OSError("down"),
        TimeoutError(),
        clamd.ClamdError("down"),
    ):
        monkeypatch.setattr("app.services.upload_service.scan_bytes", Mock(side_effect=exception))
        with pytest.raises(HTTPException) as unavailable:
            await ensure_clean_upload(b"data")
        assert unavailable.value.status_code == 503
        assert "not stored" in unavailable.value.detail


@pytest.mark.asyncio
async def test_clean_upload_returns_after_threaded_scan(monkeypatch):
    scan = Mock()
    monkeypatch.setattr("app.services.upload_service.scan_bytes", scan)
    await ensure_clean_upload(b"clean")
    scan.assert_called_once_with(b"clean")


def test_html_allowlist_strips_active_content_and_unsafe_links():
    cleaned = sanitize_html(
        '<h2 onclick="alert(1)">Finding</h2><script>alert(1)</script>'
        '<a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a>'
        '<img src="https://example.com/x.png"><p>https://example.org/path</p>'
    )
    assert "<h2>Finding</h2>" in cleaned
    assert "script" not in cleaned and "onclick" not in cleaned and "javascript:" not in cleaned
    assert '<a href="https://example.com"' in cleaned and 'target="_blank"' in cleaned
    assert 'rel="nofollow"' in cleaned and "<img" not in cleaned
    assert '<a href="https://example.org/path"' in cleaned


def test_plain_text_removes_all_markup_without_executing_it():
    assert (
        plain_text('<p>Hello <strong>team</strong></p><script>alert("x")</script>')
        == 'Hello teamalert("x")'
    )
