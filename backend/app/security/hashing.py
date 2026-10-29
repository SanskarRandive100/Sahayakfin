"""Phones are never stored in clear: sha256(JWT_SECRET + phone) + last 4 digits."""
import hashlib
import re

from app.config import settings


def normalise_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 10 else digits


def phone_hash(phone: str) -> str:
    return hashlib.sha256((settings.jwt_secret + normalise_phone(phone)).encode()).hexdigest()


def mask_phone(last4: str) -> str:
    return "XXXXXX" + last4
