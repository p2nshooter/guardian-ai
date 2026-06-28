# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Compliance — Core Engine"""
from __future__ import annotations
import asyncio, time
from pathlib import Path
from typing import Optional
import structlog
from src.config.settings import get_config
from src.license import LicenseValidator, LicenseInfo
from src.engine import ComplianceEngine, FRAMEWORK_META

log = structlog.get_logger()


class ComplianceCore:
    _instance: Optional["ComplianceCore"] = None

    def __init__(self):
        self.cfg               = get_config()
        self.license_validator = LicenseValidator()
        self.license_info:     Optional[LicenseInfo] = None
        self.engine            = ComplianceEngine(self.cfg.data_dir)
        self._start_time       = time.time()

    @classmethod
    def get(cls) -> "ComplianceCore":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def startup(self):
        log.info("compliance_starting_up")
        self.license_info = await self.license_validator.startup()
        self.cfg.data_dir.mkdir(parents=True, exist_ok=True)
        self.cfg.report_dir.mkdir(parents=True, exist_ok=True)
        await self.engine.start(self.cfg.frameworks, self.cfg.scan_interval_hours)
        log.info("compliance_online", license=self.license_info.package)

    async def shutdown(self):
        await self.engine.stop()
        await self.license_validator.shutdown()
        log.info("compliance_shutdown")
