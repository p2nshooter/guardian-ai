# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
from __future__ import annotations
import asyncio, json
from pathlib import Path
from typing import List, Callable, Optional
import httpx, structlog
from src.config.settings import get_config

log = structlog.get_logger()


class ThreatFeedCollector:
    def __init__(self):
        self._cfg = get_config()
        self._cache = self._cfg.data_dir / "cache"
        self._cache.mkdir(parents=True, exist_ok=True)
        self._client = httpx.AsyncClient(timeout=60.0)

        # Internal storage — always plain strings for O(1) lookup
        self._hashes:  List[str] = []   # sha256 hex strings
        self._domains: List[str] = []   # domain strings
        self._ips:     List[str] = []   # IP address strings
        self._cves:    List[dict] = []  # CVE critical vulnerabilities

        # Callback: called after every successful update so GuardianCore
        # can push new data into the DetectionEngine immediately
        self._on_update: Optional[Callable] = None

    # ── Properties ────────────────────────────────────────────────

    @property
    def malware_hashes(self) -> List[str]:
        """SHA-256 hex strings of known malware files."""
        return self._hashes

    @property
    def malicious_ips(self) -> List[str]:
        """IP addresses known to be malicious."""
        return self._ips

    @property
    def malicious_domains(self) -> List[str]:
        """Domains known to be malicious."""
        return self._domains

    @property
    def cve_advisories(self) -> List[dict]:
        """CVE HIGH/CRITICAL advisories from NVD."""
        return self._cves

    @property
    def stats(self) -> dict:
        return {
            "hashes":  len(self._hashes),
            "ips":     len(self._ips),
            "domains": len(self._domains),
            "cves":    len(self._cves),
        }

    def set_update_callback(self, cb: Callable) -> None:
        """Register a callback invoked after each feed update."""
        self._on_update = cb

    # ── Main loop ─────────────────────────────────────────────────

    async def start(self, interval_hours: float = 24.0):
        log.info(f"Threat feed collector starting (interval: {interval_hours}h)")
        while True:
            try:
                await self.update()
            except Exception as e:
                log.warning(f"Feed update failed: {e}")
            await asyncio.sleep(interval_hours * 3600)

    async def close(self) -> None:
        """Close the underlying HTTP client — called by GuardianCore.shutdown()."""
        try:
            await self._client.aclose()
        except Exception:
            pass

    # ── Update ────────────────────────────────────────────────────

    async def update(self):
        """
        Download all three feeds from R2 / configured URL.
        Falls back to local cache if network is unavailable.

        Feed format:
          malware_hashes.json   -> {"data": [{"sha256":"<hex>","name":"...","type":"..."}, ...]}
          malicious_domains.json -> {"data": [{"domain":"...","threat":"...","severity":"..."}, ...]}
          malicious_ips.json    -> {"data": [{"ip":"...","threat":"...","severity":"..."}, ...]}
        """
        base = self._cfg.threat_feed_url.rstrip("/")
        updated_any = False

        feeds = [
            ("malware_hashes.json",    "_hashes",  self._extract_hashes),
            ("malicious_domains.json", "_domains", self._extract_domains),
            ("malicious_ips.json",     "_ips",     self._extract_ips),
            ("cve_feed.json",          "_cves",    self._extract_cves),
        ]

        for fname, attr, extractor in feeds:
            cache_file = self._cache / fname
            try:
                r = await self._client.get(f"{base}/{fname}")
                if r.status_code == 200:
                    raw = r.json()
                    items = extractor(raw.get("data", []))
                    setattr(self, attr, items)
                    updated_any = True   # mark success BEFORE optional cache write
                    log.info(f"Feed updated: {fname} ({len(items)} entries)")
                    try:
                        # Cache write is best-effort; fallback to json.dumps if
                        # response has no .text attribute (e.g. in unit tests)
                        text = getattr(r, "text", None) or json.dumps(raw)
                        cache_file.write_text(text)
                    except Exception:
                        pass  # cache write failure is non-fatal
            except Exception as e:
                # Network unavailable — fall back to local cache
                if cache_file.exists():
                    try:
                        raw = json.loads(cache_file.read_text())
                        items = extractor(raw.get("data", []))
                        setattr(self, attr, items)
                        log.info(f"Feed loaded from cache: {fname} ({len(items)} entries)")
                        updated_any = True
                    except Exception as ce:
                        log.warning(f"Cache load failed for {fname}: {ce}")
                else:
                    log.debug(f"Feed {fname} unavailable and no cache: {e}")

        # Notify GuardianCore so it pushes new data to DetectionEngine
        if updated_any and self._on_update:
            try:
                await self._on_update()
            except Exception as e:
                log.warning(f"Feed update callback error: {e}")

        # Warn operator if all threat lists are empty (cold-start with no cache)
        if not self._hashes and not self._ips and not self._domains:
            log.warning(
                "⚠️  All threat feeds are empty — detection relies on static analysis only. "
                "Check threat_feed_url config or seed the local cache."
            )

    # ── Extractors — normalise varying feed dict/string formats ───

    @staticmethod
    def _extract_hashes(data: list) -> List[str]:
        """Accept dict {"sha256":...} or plain string. Returns sha256 hex list."""
        result = []
        for item in data:
            if isinstance(item, dict):
                h = item.get("sha256") or item.get("hash") or item.get("md5") or ""
            else:
                h = str(item)
            h = h.strip().lower()
            if len(h) in (32, 40, 64):   # md5 / sha1 / sha256
                result.append(h)
        return result

    @staticmethod
    def _extract_domains(data: list) -> List[str]:
        """Accept dict {"domain":...} or plain string. Returns lowercase domain list."""
        result = []
        for item in data:
            if isinstance(item, dict):
                d = item.get("domain") or item.get("host") or ""
            else:
                d = str(item)
            d = d.strip().lower()
            if d:
                result.append(d)
        return result

    @staticmethod
    def _extract_cves(data: list) -> List[dict]:
        """Pass-through CVE dicts from NVD feed."""
        return [d for d in data if isinstance(d, dict) and d.get("id", "").startswith("CVE-")]

    @staticmethod
    def _extract_ips(data: list) -> List[str]:
        """Accept dict {"ip":...} or plain string. Returns IP string list."""
        result = []
        for item in data:
            if isinstance(item, dict):
                ip = item.get("ip") or item.get("address") or ""
            else:
                ip = str(item)
            ip = ip.strip()
            if ip:
                result.append(ip)
        return result
