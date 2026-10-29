"""Simulated clock: real now + a demo offset (moved by POST /demo/advance-clock)."""
from datetime import date, datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))
_offset = timedelta(0)


def now() -> datetime:
    """Aware UTC datetime, shifted by the demo offset."""
    return datetime.now(timezone.utc) + _offset


def now_ist() -> datetime:
    return now().astimezone(IST)


def today() -> date:
    return now_ist().date()


def advance(days: int) -> datetime:
    global _offset
    _offset += timedelta(days=days)
    return now()


def reset() -> None:
    global _offset
    _offset = timedelta(0)
