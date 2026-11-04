"""Strict IP and network containment helpers."""

import ipaddress


def is_ip_in_cidr(ip: str, cidr: str) -> bool:
    try:
        address = ipaddress.ip_address(ip.strip())
        network = ipaddress.ip_network(cidr.strip(), strict=False)
    except ValueError:
        return False
    return address.version == network.version and address in network


def is_cidr_subset(child: str, parent: str) -> bool:
    try:
        child_network = ipaddress.ip_network(child.strip(), strict=False)
        parent_network = ipaddress.ip_network(parent.strip(), strict=False)
    except ValueError:
        return False
    if isinstance(child_network, ipaddress.IPv4Network) and isinstance(
        parent_network, ipaddress.IPv4Network
    ):
        return child_network.subnet_of(parent_network)
    if isinstance(child_network, ipaddress.IPv6Network) and isinstance(
        parent_network, ipaddress.IPv6Network
    ):
        return child_network.subnet_of(parent_network)
    return False
