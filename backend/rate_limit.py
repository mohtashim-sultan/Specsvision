"""Minimal in-process sliding-window rate limiter.

Suitable for a single-instance deployment. For multi-instance you would back this with
Redis, but it is enough to stop trivial brute-force against the login endpoints here.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from config import settings

_lock = threading.Lock()
_hits: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_login_rate_limit(request: Request, identifier: str) -> None:
    """Raise HTTP 429 if this ip+identifier exceeded the allowed attempts in the window."""
    window = settings.login_window_seconds
    max_attempts = settings.login_max_attempts
    key = f"{_client_ip(request)}:{identifier.lower()}"
    now = time.monotonic()
    with _lock:
        bucket = _hits[key]
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= max_attempts:
            retry_after = int(window - (now - bucket[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )
        bucket.append(now)
