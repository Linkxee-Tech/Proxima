import base64
import hashlib
from cryptography.fernet import Fernet
from .config import settings


def cipher() -> Fernet:
    """Returns a stable Fernet cipher. Production must set a 32-byte Fernet key."""
    raw = settings.proxima_token_encryption_key.encode("utf-8")
    key = raw if len(raw) == 44 else base64.urlsafe_b64encode(hashlib.sha256(raw or settings.proxima_jwt_secret.encode("utf-8") or b"development-only-change-me").digest())
    return Fernet(key)


def encrypt(value: str) -> str:
    return cipher().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt(value: str) -> str:
    return cipher().decrypt(value.encode("ascii")).decode("utf-8")
