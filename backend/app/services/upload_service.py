"""Fail-closed malware screening for every user-controlled binary upload."""

import asyncio
import io

import clamd
from fastapi import HTTPException

from app.config import settings


class MalwareDetected(ValueError):
    pass


def scan_bytes(payload: bytes) -> None:
    client = clamd.ClamdNetworkSocket(settings.clamav_host, settings.clamav_port, timeout=30)
    result = client.instream(io.BytesIO(payload))
    status, signature = result.get("stream", ("ERROR", "No scanner response"))
    if status == "FOUND":
        raise MalwareDetected(signature or "Malicious content detected")
    if status != "OK":
        raise ConnectionError(signature or "ClamAV did not complete the scan")


async def ensure_clean_upload(payload: bytes) -> None:
    try:
        await asyncio.to_thread(scan_bytes, payload)
    except MalwareDetected as exc:
        raise HTTPException(422, "Upload rejected by malware scanning") from exc
    except (ConnectionError, OSError, TimeoutError, clamd.ClamdError) as exc:
        raise HTTPException(503, "Malware scanning is unavailable; upload was not stored") from exc
