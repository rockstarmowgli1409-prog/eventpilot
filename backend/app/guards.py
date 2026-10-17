import time
from collections import defaultdict, deque
from datetime import UTC, datetime

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import ExtractionRecord


class RateLimiter:
    """In-memory sliding window per client. Fine for a single-instance demo."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window_s: float = 60.0) -> None:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > window_s:
            hits.popleft()
        if len(hits) >= limit:
            raise HTTPException(429, "Too many requests. Please wait a minute and try again.")
        hits.append(now)

    def reset(self) -> None:
        self._hits.clear()


rate_limiter = RateLimiter()


def check_rate_limit(request: Request, settings: Settings) -> None:
    client = request.client.host if request.client else "unknown"
    rate_limiter.check(client, settings.rate_limit_per_minute)


def spent_today_usd(db: Session) -> float:
    start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = db.scalars(select(ExtractionRecord).where(ExtractionRecord.created_at >= start))
    return sum(r.meta.get("cost_usd", 0) for r in rows)


def check_cost_cap(db: Session, settings: Settings) -> None:
    if spent_today_usd(db) >= settings.daily_cost_cap_usd:
        raise HTTPException(
            503, "The demo has reached its daily usage limit. Please try again tomorrow."
        )
