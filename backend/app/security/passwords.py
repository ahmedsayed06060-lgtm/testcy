"""Password hashing and policy enforcement."""

import re
from pathlib import Path

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
_COMMON_PASSWORDS = {
    "password",
    "password123",
    "qwerty123456",
    "admin123456",
    "letmein12345",
    "welcome12345",
    "changeme1234",
    "iloveyou1234",
    "adminpass123!",
}


def validate_password(password: str, email: str | None = None) -> None:
    if len(password) < 12 or len(password) > 128:
        raise ValueError("Password must contain between 12 and 128 characters")
    if not re.search(r"[a-z]", password) or not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain upper- and lowercase letters")
    if not re.search(r"\d", password) or not re.search(r"[^A-Za-z0-9]", password):
        raise ValueError("Password must contain a number and a symbol")
    normalized = password.casefold()
    common_path = Path(__file__).parents[1] / "data" / "breached_passwords.txt"
    breached = _COMMON_PASSWORDS
    if common_path.exists():
        breached = breached | {
            line.strip().casefold()
            for line in common_path.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")
        }
    if normalized in breached:
        raise ValueError("Password appears in the breached-password denylist")
    if email and email.split("@", 1)[0].casefold() in normalized:
        raise ValueError("Password must not contain the email account name")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)
