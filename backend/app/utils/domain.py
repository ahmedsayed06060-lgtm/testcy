"""Canonical domain and URL parsing; malformed input never matches."""

import ipaddress
import re
from urllib.parse import urlsplit

_DOMAIN_LABEL = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


def normalize_domain(value: str) -> str:
    candidate = value.strip().rstrip(".").lower()
    if candidate.startswith("*."):
        candidate = candidate[2:]
    try:
        candidate = candidate.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise ValueError("Invalid internationalized domain") from exc
    if len(candidate) > 253 or not candidate or ".." in candidate:
        raise ValueError("Invalid domain")
    labels = candidate.split(".")
    if not all(_DOMAIN_LABEL.fullmatch(label) for label in labels):
        raise ValueError("Invalid domain label")
    return candidate


def is_subdomain_of(subdomain: str, parent_domain: str) -> bool:
    try:
        child = normalize_domain(subdomain)
        parent = normalize_domain(parent_domain)
    except ValueError:
        return False
    return child == parent or child.endswith(f".{parent}")


def extract_domain_from_url(url: str) -> str:
    candidate = url.strip()
    parsed = urlsplit(candidate if "://" in candidate else f"https://{candidate}")
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username
        or parsed.password
    ):
        raise ValueError("Only HTTP(S) URLs without embedded credentials are allowed")
    try:
        _ = parsed.port
    except ValueError as exc:
        raise ValueError("Invalid URL port") from exc
    host = parsed.hostname.rstrip(".").lower()
    try:
        ipaddress.ip_address(host)
    except ValueError:
        return normalize_domain(host)
    return host
