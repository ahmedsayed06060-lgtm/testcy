"""Stable fingerprints for finding deduplication."""

import hashlib
import re


def finding_fingerprint(title: str, asset: str, cwe_id: str | None) -> str:
    normalized_title = re.sub(r"\d+", "#", title.casefold()).strip()
    normalized_asset = asset.casefold().rstrip("/")
    material = f"{normalized_title}|{normalized_asset}|{(cwe_id or '').upper()}"
    return hashlib.sha256(material.encode("utf-8")).hexdigest()
