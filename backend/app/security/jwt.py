"""HS256 login tickets. Claims: sub (user id), role, exp."""
from datetime import datetime, timedelta, timezone

import jwt as pyjwt

from app.config import settings

ALGO = "HS256"


def create_token(user) -> str:
    ttl = timedelta(hours=12) if settings.demo_mode else timedelta(minutes=15)
    now = datetime.now(timezone.utc)
    payload = {"sub": user.id, "role": user.role, "iat": now, "exp": now + ttl}
    return pyjwt.encode(payload, settings.jwt_secret, algorithm=ALGO)


def decode_token(token: str) -> dict:
    """Raises jwt.PyJWTError on a bad signature, wrong algorithm or expiry."""
    return pyjwt.decode(token, settings.jwt_secret, algorithms=[ALGO], options={"require": ["sub", "role", "exp"]})
