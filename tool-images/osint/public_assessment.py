"""Public DNS variation review. No login, credential testing, or private data."""

import ipaddress
import json
import socket
import sys


def variations(domain: str) -> set[str]:
    labels = domain.rstrip(".").split(".")
    if len(labels) < 2:
        raise ValueError("A fully-qualified domain is required")
    brand, suffix = labels[0], ".".join(labels[1:])
    return {f"{brand}{letter}.{suffix}" for letter in "abcdefghijklmnopqrstuvwxyz"} | {
        f"{brand}-support.{suffix}", f"{brand}-help.{suffix}", f"{brand}s.{suffix}",
    }


def public_dns_review(domain: str) -> list[dict[str, object]]:
    results = []
    for candidate in sorted(variations(domain))[:30]:
        try:
            addresses = sorted({item[4][0] for item in socket.getaddrinfo(candidate, None)
                                if ipaddress.ip_address(item[4][0])})
        except (socket.gaierror, ValueError):
            addresses = []
        results.append({"domain": candidate, "resolved_addresses": addresses,
                        "source": "public_dns", "private_data_accessed": False})
    return results


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: public_assessment.py authorized-domain.example")
    print(json.dumps(public_dns_review(sys.argv[1]), indent=2))
