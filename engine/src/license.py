from __future__ import annotations
import asyncio, socket, time, uuid
from typing import Optional
import httpx, structlog
from src.config.settings import get_config

log = structlog.get_logger()
_MACHINE_ID: Optional[str] = None
PRODUCT = "guardian"   # This engine is always "guardian"

def get_machine_id() -> str:
    global _MACHINE_ID
    if _MACHINE_ID is None:
        try:
            import os
            p = "/etc/machine-id"
            _MACHINE_ID = open(p).read().strip() if os.path.exists(p) else str(uuid.uuid5(uuid.NAMESPACE_DNS, socket.gethostname()))
        except Exception:
            _MACHINE_ID = str(uuid.uuid4())
    return _MACHINE_ID


class LicenseInfo:
    def __init__(self, data: dict):
        self.valid     = data.get("valid", False)
        self.reason    = data.get("reason", "unknown")
        self.product   = data.get("product", "guardian")
        self.package   = data.get("package", "")
        self.features: dict = data.get("features", {})
        self.expires_at = data.get("expires_at", "")
        self.max_nodes: int = data.get("max_nodes", 1)
        # Error detail for product mismatch
        self.message   = data.get("message", "")
        self.key_is_for = data.get("key_is_for", "")


class LicenseValidator:
    def __init__(self):
        self._cfg   = get_config()
        self._info: Optional[LicenseInfo] = None
        self._last: float = 0
        self._client = httpx.AsyncClient(timeout=30.0)

    async def validate(self, node_count: int = 0, force: bool = False) -> LicenseInfo:
        now = time.time()
        if self._info and not force and (now - self._last) < 3600:
            return self._info

        if not self._cfg.license_key:
            return LicenseInfo({"valid": False, "reason": "no_license_key",
                                "message": "No license_key set in guardian.yml"})

        if not self._cfg.license_validate_url:
            # Offline / dev mode
            return LicenseInfo({"valid": True, "reason": "offline", "product": PRODUCT,
                                 "package": "offline", "features": {"ai_pool": True}, "max_nodes": 1})

        try:
            import socket as sock
            hostname = sock.gethostname()
            resp = await self._client.post(self._cfg.license_validate_url, json={
                "license_key":      self._cfg.license_key,
                "machine_id":       get_machine_id(),
                "product":          PRODUCT,             # ← always "guardian" for this engine
                "guardian_version": "1.0.0",
                "node_count":       node_count,
                "hostname":         hostname,
            })
            data = resp.json()
            self._info = LicenseInfo(data)
            self._last = now

            # Log product mismatch clearly
            if not self._info.valid and self._info.reason == "product_mismatch":
                log.error(
                    "LICENSE KEY IS FOR WRONG PRODUCT",
                    key_prefix=self._cfg.license_key[:10],
                    key_is_for=self._info.key_is_for,
                    requires="guardian",
                    fix="Purchase a Guardian license key from axto.io, or use your Orchestra key in orchestra.yml",
                )

        except Exception as e:
            log.warning(f"License validation network error: {e}")
            if self._info and self._info.valid:
                log.warning("Using cached license (grace mode)")
                return self._info
            # 24-hour offline grace
            self._info = LicenseInfo({"valid": True, "reason": "offline_grace",
                                       "product": PRODUCT, "max_nodes": 1})
        return self._info

    async def heartbeat(self, node_count: int):
        failures = 0
        while True:
            interval = self._cfg.heartbeat_interval
            # Exponential backoff up to 4x on repeated network failures
            if failures > 0:
                interval = min(interval * (2 ** min(failures - 1, 2)), interval * 4)
            await asyncio.sleep(interval)
            try:
                await self.validate(node_count=node_count, force=True)
                failures = 0  # reset on success
            except Exception:
                failures += 1

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        try:
            await self._client.aclose()
        except Exception:
            pass
