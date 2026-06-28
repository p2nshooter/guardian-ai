# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Vault — VaultCore Singleton (v1.1 — FIXED)

Fixes:
  - Daily request limit enforcement (checks license.max_requests_daily)
  - Rate limiter initialized from config (rate_limit_per_minute)
  - Alerting config wired to audit engine on startup
  - Stats reset loop actually works (checks day change)
"""
from __future__ import annotations
import asyncio
import threading
import time
from datetime import date
from pathlib import Path

from src.config.settings import get_config, VaultConfig
from src.license import LicenseValidator, LicenseInfo
from src.redactor import RedactionEngine
from src.proxy import AIProxyEngine
from src.policy import PolicyManager
from src.audit import AuditEngine
from src.database import init_db
import structlog

log = structlog.get_logger()


class VaultStats:
    def __init__(self):
        self._lock              = threading.Lock()
        self.requests_today:    int = 0
        self.redactions_today:  int = 0
        self.tokens_protected:  int = 0
        self._day:              str = _today()

    def record_request(self, redaction_count: int) -> bool:
        """Record a request. Returns True if limit NOT exceeded (request allowed)."""
        today = _today()
        with self._lock:
            if today != self._day:
                self.requests_today  = 0
                self.redactions_today = 0
                self._day            = today
            self.requests_today   += 1
            self.redactions_today += redaction_count
            self.tokens_protected += redaction_count * 12
        return True  # Limit check done separately in check_daily_limit()

    def requests_so_far_today(self) -> int:
        today = _today()
        with self._lock:
            if today != self._day:
                return 0
            return self.requests_today


class RateLimiter:
    """Token-bucket rate limiter (per-minute, in-process)."""
    def __init__(self, requests_per_minute: int):
        self._rpm     = requests_per_minute
        self._tokens  = float(requests_per_minute)
        self._last    = time.monotonic()
        self._lock    = asyncio.Lock()
        self._enabled = requests_per_minute > 0

    async def acquire(self) -> bool:
        """Returns True if request is allowed, False if rate-limited."""
        if not self._enabled:
            return True
        async with self._lock:
            now    = time.monotonic()
            delta  = now - self._last
            self._last   = now
            # Refill tokens
            self._tokens = min(
                float(self._rpm),
                self._tokens + delta * (self._rpm / 60.0)
            )
            if self._tokens >= 1.0:
                self._tokens -= 1.0
                return True
            return False


class VaultCore:
    _instance: "VaultCore | None" = None
    _lock = threading.Lock()

    def __init__(self):
        self.cfg               = get_config()
        self.license_validator = LicenseValidator()
        self.license_info:  LicenseInfo | None = None
        self.redactor          = RedactionEngine()
        self.proxy             = AIProxyEngine(self.cfg)
        self.policy_mgr        = PolicyManager(self.cfg.data_dir)
        self.audit             = AuditEngine(self.cfg.data_dir)
        self.stats             = VaultStats()
        self.rate_limiter      = RateLimiter(self.cfg.rate_limit_per_minute)
        self._started          = False
        self._start_time       = 0.0
        self._tasks: list      = []

    @classmethod
    def get(cls) -> "VaultCore":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = VaultCore()
        return cls._instance

    async def startup(self):
        if self._started:
            return
        self._started    = True
        self._start_time = time.monotonic()
        log.info("vault_startup", version="1.1.0")

        # Init storage
        await init_db(self.cfg.data_dir)

        # Wire alerting config → audit engine (before startup)
        self.audit.configure_alerts(
            slack_webhook = self.cfg.slack_webhook_url or None,
            alert_webhook = self.cfg.alert_webhook_url or None,
            siem_url      = self.cfg.siem_url          or None,
            siem_token    = self.cfg.siem_token         or None,
        )

        await self.audit.startup()
        self.policy_mgr.startup()
        await self.proxy.startup()

        # License validation
        self.license_info = await self.license_validator.validate()
        if self.license_info.valid:
            log.info("vault_licensed",
                     product=self.license_info.product,
                     package=self.license_info.package,
                     expires=self.license_info.expires_at,
                     max_requests_daily=self.license_info.max_requests_daily)
        else:
            log.warning("vault_unlicensed", reason=self.license_info.reason)

        # Background tasks
        self._tasks.append(asyncio.create_task(self._heartbeat_loop(), name="license-heartbeat"))

        log.info("vault_ready",
                 providers=self.proxy.provider_count,
                 policies=self.policy_mgr.active_count,
                 rate_limit_rpm=self.cfg.rate_limit_per_minute or "unlimited",
                 alerting={
                     "slack":   bool(self.cfg.slack_webhook_url),
                     "webhook": bool(self.cfg.alert_webhook_url),
                     "siem":    bool(self.cfg.siem_url),
                 })

    async def shutdown(self):
        for t in self._tasks:
            t.cancel()
        await self.proxy.shutdown()
        await self.audit.close()
        await self.license_validator.close()
        log.info("vault_shutdown")

    def uptime_seconds(self) -> int:
        return int(time.monotonic() - self._start_time) if self._started else 0

    def check_daily_limit(self) -> tuple[bool, int, int]:
        """
        Returns (allowed, used_today, max_daily).
        -1 means unlimited.
        """
        if not self.license_info or not self.license_info.valid:
            return (False, 0, 0)
        max_daily = self.license_info.max_requests_daily
        if max_daily <= 0:   # unlimited
            return (True, self.stats.requests_so_far_today(), -1)
        used = self.stats.requests_so_far_today()
        return (used < max_daily, used, max_daily)

    async def _heartbeat_loop(self):
        while True:
            await asyncio.sleep(self.cfg.heartbeat_interval)
            try:
                self.license_info = await self.license_validator.validate(force=True)
                # Refresh rate limiter if license changed
                new_limit = getattr(self.license_info, "rate_limit_per_minute", 0) or self.cfg.rate_limit_per_minute
                if new_limit != self.rate_limiter._rpm:
                    self.rate_limiter = RateLimiter(new_limit)
            except Exception as e:
                log.warning("vault_heartbeat_error", error=str(e))


def _today() -> str:
    return str(date.today())
