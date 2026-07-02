# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
YP AI API Gateway — real per-client-key metering + token-bucket rate limiting.

Sits in front of YP's AI capabilities so an operator can hand out downstream
keys to their own teams/apps, meter each key's usage, and enforce a per-minute
rate limit — the same job AXTO Edge does, native to YP. In-memory buckets
(per process) plus cumulative counters; the API layer persists rollups to the
local DB for reporting.
"""
from __future__ import annotations
import time
from dataclasses import dataclass, field


@dataclass
class Bucket:
    capacity: float
    tokens: float
    refill_per_s: float
    last: float = field(default_factory=time.time)

    def take(self, n: float = 1.0) -> bool:
        now = time.time()
        # refill
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.refill_per_s)
        self.last = now
        if self.tokens >= n:
            self.tokens -= n
            return True
        return False


@dataclass
class KeyMeter:
    key_id: str
    requests: int = 0
    allowed: int = 0
    throttled: int = 0
    redactions: int = 0


class Gateway:
    def __init__(self, rate_per_minute: int = 120):
        self._rate = max(1, rate_per_minute)
        self._buckets: dict[str, Bucket] = {}
        self._meters: dict[str, KeyMeter] = {}

    def _bucket(self, key_id: str) -> Bucket:
        if key_id not in self._buckets:
            self._buckets[key_id] = Bucket(
                capacity=float(self._rate),
                tokens=float(self._rate),
                refill_per_s=self._rate / 60.0,
            )
        return self._buckets[key_id]

    def _meter(self, key_id: str) -> KeyMeter:
        if key_id not in self._meters:
            self._meters[key_id] = KeyMeter(key_id=key_id)
        return self._meters[key_id]

    def check(self, key_id: str) -> tuple[bool, dict]:
        """Return (allowed, info). Call once per inbound request."""
        m = self._meter(key_id)
        m.requests += 1
        ok = self._bucket(key_id).take(1.0)
        if ok:
            m.allowed += 1
        else:
            m.throttled += 1
        b = self._buckets[key_id]
        return ok, {
            "key_id": key_id, "allowed": ok,
            "tokens_remaining": round(b.tokens, 2),
            "rate_per_minute": self._rate,
        }

    def record_usage(self, key_id: str, redactions: int = 0) -> None:
        self._meter(key_id).redactions += redactions

    def usage(self) -> list:
        return [
            {"key_id": m.key_id, "requests": m.requests, "allowed": m.allowed,
             "throttled": m.throttled, "redactions": m.redactions}
            for m in self._meters.values()
        ]
