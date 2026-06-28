# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO SOC — Core Engine (orchestrates all subsystems)"""
from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import Optional

import structlog

from src.config.settings import get_config
from src.database import SOCDB
from src.license import LicenseValidator, LicenseInfo
from src.siem import SIEMEngine
from src.soar import SOAREngine
from src.threat_intel import ThreatIntelEngine

log = structlog.get_logger()


class SOCCore:
    _instance: Optional["SOCCore"] = None

    def __init__(self):
        self.cfg              = get_config()
        self.db               = SOCDB(self.cfg.data_dir)
        self.license_validator = LicenseValidator()
        self.license_info: Optional[LicenseInfo] = None
        self.siem             = SIEMEngine()
        self.soar: Optional[SOAREngine]          = None
        self.threat_intel: Optional[ThreatIntelEngine] = None
        self._start_time      = time.time()
        self._ws_subscribers: list = []

    @classmethod
    def get(cls) -> "SOCCore":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def startup(self):
        log.info("soc_starting_up")

        # 1. Validate license — BLOCKING
        self.license_info = await self.license_validator.startup()

        # 2. Init database
        self.db._init_schema()
        self.db.insert_default_playbooks()

        # 3. Init subsystems
        self.soar         = SOAREngine(self.db, self.cfg)
        self.threat_intel = ThreatIntelEngine(self.db, self.cfg)

        # 4. Register SIEM → SOAR handler
        self.siem.register_handler(self._on_event)

        # 5. Start engines
        await self.siem.start(syslog_port=self.cfg.syslog_port)
        await self.threat_intel.start()
        self.soar.load_playbooks()

        log.info("soc_online",
                 license=self.license_info.package,
                 expires_at=self.license_info.expires_at)

    async def shutdown(self):
        await self.siem.stop()
        if self.threat_intel:
            await self.threat_intel.stop()
        await self.license_validator.shutdown()
        self.db.close()
        log.info("soc_shutdown")

    async def _on_event(self, evt):
        """Called for every SIEM event — save to DB, check threat intel, run SOAR."""
        # 1. Threat intel enrichment
        if evt.source_ip and self.threat_intel:
            ioc = self.threat_intel.lookup(evt.source_ip)
            if ioc:
                evt.tags.append("known_bad_ip")
                evt.parsed["threat_intel"] = ioc
                # Escalate severity
                if evt.severity in ("info", "low", "medium"):
                    evt.severity = "high"

        # 2. Store event
        self.db.insert_event(evt.to_dict())

        # 3. Broadcast to WebSocket subscribers
        for sub in list(self._ws_subscribers):
            try:
                import json
                if asyncio.iscoroutinefunction(sub):
                    await sub(evt.to_dict())
                else:
                    sub(evt.to_dict())
            except Exception:
                self._ws_subscribers.discard(sub)

        # 4. SOAR evaluation (only if auto-respond enabled)
        if self.cfg.soar_auto_respond and self.soar:
            await self.soar.evaluate(evt)

    def get_dashboard_stats(self) -> dict:
        now  = time.time()
        day  = now - 86400
        week = now - 604800

        sev_today = self.db.event_count_by_severity(since=day)
        sev_week  = self.db.event_count_by_severity(since=week)

        open_incidents    = self.db.get_incidents(status="open", limit=5)
        critical_today    = sev_today.get("critical", 0)
        high_today        = sev_today.get("high", 0)

        return {
            "uptime_seconds":    int(now - self._start_time),
            "license_package":   getattr(self.license_info, "package", ""),
            "license_expires_at": getattr(self.license_info, "expires_at", ""),
            "license_days_left": getattr(self.license_info, "days_until_expiry", lambda: None)() if self.license_info else None,
            "events": {
                "critical_today":  critical_today,
                "high_today":      high_today,
                "medium_today":    sev_today.get("medium", 0),
                "total_today":     sum(sev_today.values()),
                "total_week":      sum(sev_week.values()),
            },
            "incidents": {
                "open":    len(open_incidents),
                "recent":  open_incidents,
            },
            "threat_intel": self.threat_intel.get_stats() if self.threat_intel else {},
            "siem":         self.siem.get_stats(),
            "soar":         self.soar.get_stats() if self.soar else {},
        }

    def register_ws(self, callback):
        self._ws_subscribers.append(callback)

    def unregister_ws(self, callback):
        try:
            self._ws_subscribers.remove(callback)
        except ValueError:
            pass
