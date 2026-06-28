# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Edge — EdgeCore Singleton. Orchestrates all subsystems."""
from __future__ import annotations
import asyncio, threading, time
from pathlib import Path

from src.config.settings import get_config
from src.license import LicenseValidator, LicenseInfo
from src.key_manager import KeyManager
from src.plan_manager import PlanManager
from src.meter import UsageMeter
from src.billing import BillingEngine
from src.firewall import FirewallEngine
from src.proxy import AIProxyEngine
from src.webhook import WebhookManager
from src.ws_manager import WebSocketManager
from src.database import init_db
import structlog

log = structlog.get_logger()


class EdgeCore:
    _instance: "EdgeCore | None" = None
    _lock = threading.Lock()

    def __init__(self):
        self.cfg               = get_config()
        self.license_validator = LicenseValidator()
        self.license_info:  LicenseInfo | None = None
        self.key_mgr           = KeyManager(self.cfg.data_dir)
        self.plan_mgr          = PlanManager(self.cfg.data_dir)
        self.meter             = UsageMeter(self.cfg.data_dir)
        self.billing           = BillingEngine(self.cfg.data_dir)
        self.firewall          = FirewallEngine(self.cfg)
        self.proxy             = AIProxyEngine(self.cfg)
        self.webhook_mgr       = WebhookManager(self.cfg.data_dir)
        self.ws_mgr            = WebSocketManager()
        self.rate_limiter      = _RateLimiter()
        self._started          = False
        self._start_time       = 0.0
        self._tasks: list      = []

    @classmethod
    def get(cls) -> "EdgeCore":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = EdgeCore()
        return cls._instance

    async def startup(self):
        if self._started:
            return
        self._started    = True
        self._start_time = time.monotonic()
        log.info("edge_startup", version="1.0.0")

        await init_db(self.cfg.data_dir)
        await self.meter.startup()
        await self.billing.startup()
        self.plan_mgr.startup()
        self.webhook_mgr.startup()
        await self.proxy.startup()
        self.rate_limiter.startup(self.cfg)

        self.license_info = await self.license_validator.validate()
        if self.license_info.valid:
            log.info("edge_licensed", package=self.license_info.package)
        else:
            log.warning("edge_unlicensed", reason=self.license_info.reason)

        self._tasks.append(asyncio.create_task(self._heartbeat_loop()))
        log.info("edge_ready",
                 providers=self.proxy.provider_count,
                 plans=self.plan_mgr.count(),
                 customers=await self.key_mgr.count_active_customers())

    async def shutdown(self):
        for t in self._tasks:
            t.cancel()
        await self.proxy.shutdown()
        await self.meter.close()
        await self.license_validator.close()
        log.info("edge_shutdown")

    def uptime_seconds(self) -> int:
        return int(time.monotonic() - self._start_time) if self._started else 0

    async def _heartbeat_loop(self):
        while True:
            await asyncio.sleep(self.cfg.heartbeat_interval)
            try:
                self.license_info = await self.license_validator.validate(force=True)
            except Exception as e:
                log.warning("edge_heartbeat_error", error=str(e))


class _RateLimiter:
    """Per-customer token-bucket rate limiter stored in memory."""
    def __init__(self):
        self._buckets: dict = {}   # customer_id → (tokens, last_refill_time)
        self._lock = asyncio.Lock()

    def startup(self, cfg):
        self._default_rpm = cfg.default_rate_limit_rpm

    async def check(self, customer_id: str, plan) -> tuple[bool, int, int]:
        """Returns (allowed, remaining, reset_ts)."""
        rpm = getattr(plan, "rate_limit_rpm", self._default_rpm) or 60
        async with self._lock:
            now  = time.monotonic()
            state = self._buckets.get(customer_id)
            if state is None:
                self._buckets[customer_id] = [float(rpm), now]
                state = self._buckets[customer_id]
            tokens, last = state
            # Refill
            elapsed = now - last
            tokens  = min(float(rpm), tokens + elapsed * (rpm / 60.0))
            state[1] = now
            if tokens >= 1.0:
                tokens -= 1.0
                state[0] = tokens
                return True, int(tokens), int(now + (1.0 / (rpm / 60.0)))
            state[0] = tokens
            return False, 0, int(now + 60)
