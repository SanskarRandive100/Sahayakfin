"""AES-256-GCM for narrations at rest. Output = base64(12-byte nonce + ciphertext+tag)."""
import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings

_aes = AESGCM(settings.data_key)


def encrypt(text: str) -> str:
    nonce = os.urandom(12)
    return base64.b64encode(nonce + _aes.encrypt(nonce, text.encode("utf-8"), None)).decode("ascii")


def decrypt(blob: str) -> str:
    raw = base64.b64decode(blob)
    return _aes.decrypt(raw[:12], raw[12:], None).decode("utf-8")
