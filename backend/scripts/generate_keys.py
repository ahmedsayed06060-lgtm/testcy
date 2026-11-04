"""Generate development RS256 keys and a separate AES-256 field key."""

import base64
import os
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

ROOT = Path(__file__).resolve().parents[1]
KEYS = ROOT / "keys"


def main() -> None:
    KEYS.mkdir(mode=0o700, exist_ok=True)
    private_path = KEYS / "jwt_private_key.pem"
    public_path = KEYS / "jwt_public_key.pem"
    if not private_path.exists():
        key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
        private_path.write_bytes(key.private_bytes(
            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ))
        public_path.write_bytes(key.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo,
        ))
        os.chmod(private_path, 0o600)
        os.chmod(public_path, 0o644)
        print(f"Generated RS256 key pair in {KEYS}")
    else:
        print(f"Using existing RS256 key pair in {KEYS}")
    print("FIELD_ENCRYPTION_KEY=" + base64.urlsafe_b64encode(os.urandom(32)).decode())


if __name__ == "__main__":
    main()
