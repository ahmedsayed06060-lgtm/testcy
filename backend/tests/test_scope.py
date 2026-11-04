import pytest

from app.utils.cidr import is_cidr_subset, is_ip_in_cidr
from app.utils.domain import extract_domain_from_url, is_subdomain_of, normalize_domain


@pytest.mark.parametrize(
    "ip,cidr,expected",
    [
        ("192.168.1.5", "192.168.1.0/24", True),
        ("192.168.2.5", "192.168.1.0/24", False),
        ("2001:db8::1", "2001:db8::/64", True),
        ("192.168.1.5", "2001:db8::/64", False),
        ("not-an-ip", "10.0.0.0/8", False),
    ],
)
def test_ip_containment(ip, cidr, expected):
    assert is_ip_in_cidr(ip, cidr) is expected


def test_cidr_subset_requires_same_version_and_containment():
    assert is_cidr_subset("10.0.0.0/25", "10.0.0.0/24")
    assert not is_cidr_subset("10.0.0.0/24", "10.0.0.0/25")
    assert not is_cidr_subset("::/0", "10.0.0.0/8")


def test_subdomain_boundaries_and_idna():
    assert is_subdomain_of("WWW.EXAMPLE.COM.", "example.com")
    assert is_subdomain_of("a.b.example.com", "*.example.com")
    assert not is_subdomain_of("badexample.com", "example.com")
    assert not is_subdomain_of("example.com.evil.test", "example.com")
    assert normalize_domain("bücher.example") == "xn--bcher-kva.example"


def test_url_hostname_extraction():
    assert extract_domain_from_url("https://Example.COM:8443/a?q=1") == "example.com"
    assert extract_domain_from_url("http://127.0.0.1:8080/a") == "127.0.0.1"
    with pytest.raises(ValueError):
        extract_domain_from_url("file:///etc/passwd")
    with pytest.raises(ValueError):
        extract_domain_from_url("https://user:secret@example.com")
