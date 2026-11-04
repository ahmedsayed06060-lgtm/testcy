"""TOTP provisioning and single-use backup-code generation."""

import secrets

import pyotp

from app.config import settings
from app.security.passwords import hash_password, verify_password


def generate_mfa_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, email: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=settings.app_name)


def verify_totp(secret: str, code: str) -> bool:
    if len(code) != 6 or not code.isascii() or not code.isdigit():
        return False
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def generate_backup_codes() -> tuple[list[str], list[str]]:
    plaintext = [f"{secrets.token_hex(4)}-{secrets.token_hex(4)}" for _ in range(10)]
    return plaintext, [hash_password(code) for code in plaintext]


def verify_backup_code(code: str, code_hash: str) -> bool:
    return verify_password(code.strip().lower(), code_hash)
