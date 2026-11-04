"""Authenticated AES-256-GCM encryption for MFA and integration secrets."""

import base64
import os
from functools import lru_cache

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings


class FieldEncryption:
    def __init__(self, encoded_key: str) -> None:
        try:
            key = base64.urlsafe_b64decode(encoded_key.encode("ascii"))
        except Exception as exc:
            raise ValueError("FIELD_ENCRYPTION_KEY must be URL-safe base64") from exc
        if len(key) != 32:
            raise ValueError("FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes")
        self._cipher = AESGCM(key)

    def encrypt(self, plaintext: str) -> str:
        nonce = os.urandom(12)
        ciphertext = self._cipher.encrypt(nonce, plaintext.encode("utf-8"), None)
        return base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")

    def decrypt(self, token: str) -> str:
        try:
            payload = base64.urlsafe_b64decode(token.encode("ascii"))
            if len(payload) < 29:
                raise ValueError("Ciphertext is truncated")
            return self._cipher.decrypt(payload[:12], payload[12:], None).decode("utf-8")
        except Exception as exc:
            raise ValueError("Encrypted field is invalid or cannot be authenticated") from exc


@lru_cache
def get_field_encryption() -> FieldEncryption:
    return FieldEncryption(settings.field_encryption_key)
