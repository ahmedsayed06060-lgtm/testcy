import base64

import pytest

from app.security.encryption import FieldEncryption


def test_aes_gcm_round_trip_and_random_nonce():
    key = base64.urlsafe_b64encode(bytes(range(32))).decode()
    encryption = FieldEncryption(key)
    first = encryption.encrypt("sensitive TOTP secret")
    second = encryption.encrypt("sensitive TOTP secret")
    assert first != second
    assert encryption.decrypt(first) == "sensitive TOTP secret"


def test_aes_gcm_rejects_tampering():
    key = base64.urlsafe_b64encode(bytes(range(32))).decode()
    encryption = FieldEncryption(key)
    token = bytearray(base64.urlsafe_b64decode(encryption.encrypt("secret")))
    token[-1] ^= 1
    with pytest.raises(ValueError):
        encryption.decrypt(base64.urlsafe_b64encode(token).decode())


def test_key_must_be_256_bits():
    with pytest.raises(ValueError):
        FieldEncryption(base64.urlsafe_b64encode(b"short").decode())
