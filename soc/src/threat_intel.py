# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO SOC — Threat Intelligence Engine

Sources:
  • OSINT feeds (Abuse.ch, AlienVault OTX, Emerging Threats)
  • Manual IOC import (CSV / JSON)
  • Guardian AI integration
  • Custom private feeds (via soc.yml)

IOC Types: ip, domain, hash, url, email
"""
from __future__ import annotations

import asyncio
import csv
import io
import json
import re
import time
from typing import Dict, List, Optional
import structlog

log = structlog.get_logger()

# Public OSINT feeds (free, no API key required)
DEFAULT_FEEDS = [
    {
        "name":    "Abuse.ch URLhaus",
        "url":     "https://urlhaus.abuse.ch/downloads/json_online/",
        "format":  "json",
        "ioc_type": "url",
    },
    {
        "name":    "Abuse.ch Feodo Tracker (IPs)",
        "url":     "https://feodotracker.abuse.ch/downloads/ipblocklist.csv",
        "format":  "csv_ip",
        "ioc_type": "ip",
    },
    {
        "name":    "Emerging Threats Compromised IPs",
        "url":     "https://rules.emergingthreats.net/blockrules/compromised-ips.txt",
        "format":  "txt_ip",
        "ioc_type": "ip",
    },
]

IP_RE     = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
DOMAIN_RE = re.compile(r"^[a-z0-9][a-z0-9\-\.]+\.[a-z]{2,}$", re.I)
HASH_RE   = re.compile(r"^[0-9a-fA-F]{32,64}$")


class ThreatIntelEngine:
    def __init__(self, db, cfg):
        self._db    = db
        self._cfg   = cfg
        self._feeds = DEFAULT_FEEDS + getattr(cfg, "threat_intel_feeds", [])
        self._last_update: float = 0
        self._update_hours = cfg.threat_intel_update_hours
        self._running = False

    async def start(self):
        self._running = True
        asyncio.create_task(self._scheduled_update())
        # Run initial update 30 seconds after startup
        asyncio.create_task(self._initial_update())
        log.info("soc_threat_intel_started",
                 feeds=len(self._feeds),
                 update_every_hours=self._update_hours)

    async def stop(self):
        self._running = False

    async def _initial_update(self):
        await asyncio.sleep(30)
        await self.update_all_feeds()

    async def _scheduled_update(self):
        while self._running:
            await asyncio.sleep(self._update_hours * 3600)
            if self._running:
                await self.update_all_feeds()

    async def update_all_feeds(self) -> dict:
        log.info("soc_threat_intel_update_start", feeds=len(self._feeds))
        results = {}
        for feed in self._feeds:
            try:
                count = await self._fetch_feed(feed)
                results[feed["name"]] = {"imported": count, "ok": True}
            except Exception as e:
                log.warning("soc_threat_intel_feed_error", feed=feed["name"], error=str(e))
                results[feed["name"]] = {"imported": 0, "ok": False, "error": str(e)}
        self._last_update = time.time()
        total = sum(r.get("imported", 0) for r in results.values())
        log.info("soc_threat_intel_update_done",
                 total_imported=total, total_in_db=self._db.threat_intel_count())
        return results

    async def _fetch_feed(self, feed: dict) -> int:
        import httpx
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(feed["url"])
            resp.raise_for_status()
            content = resp.text

        count = 0
        fmt = feed.get("format", "txt_ip")
        ioc_type = feed.get("ioc_type", "ip")
        source = feed["name"]

        if fmt == "txt_ip":
            for line in content.splitlines():
                line = line.strip()
                if line and not line.startswith("#") and IP_RE.match(line):
                    self._db.upsert_ioc({
                        "value": line, "type": ioc_type,
                        "threat_type": "c2_or_botnet",
                        "confidence": 0.75, "source": source,
                    })
                    count += 1

        elif fmt == "csv_ip":
            reader = csv.reader(io.StringIO(content))
            for row in reader:
                if row and not row[0].startswith("#"):
                    ip = row[0].strip()
                    if IP_RE.match(ip):
                        self._db.upsert_ioc({
                            "value": ip, "type": "ip",
                            "threat_type": "banking_trojan",
                            "confidence": 0.85, "source": source,
                        })
                        count += 1

        elif fmt == "json":
            try:
                data = json.loads(content)
                if isinstance(data, list):
                    for item in data[:5000]:   # limit per feed
                        url = item.get("url") or item.get("ioc")
                        if url:
                            self._db.upsert_ioc({
                                "value": url[:500], "type": "url",
                                "threat_type": item.get("threat", "malware_distribution"),
                                "confidence": 0.8, "source": source,
                                "tags": [item.get("tags", "")],
                            })
                            count += 1
            except json.JSONDecodeError:
                pass

        return count

    def lookup(self, value: str) -> Optional[dict]:
        """Check if a value is a known IOC."""
        result = self._db.lookup_ioc(value)
        if result:
            return {
                "found":       True,
                "ioc_value":   result["ioc_value"],
                "ioc_type":    result["ioc_type"],
                "threat_type": result["threat_type"],
                "confidence":  result["confidence"],
                "source":      result["source"],
                "last_seen":   result["last_seen"],
            }
        return None

    def import_iocs(self, iocs: List[dict]) -> int:
        """Manually import IOCs."""
        count = 0
        for ioc in iocs:
            value = (ioc.get("value") or "").strip()
            if not value:
                continue
            # Auto-detect type if not provided
            ioc_type = ioc.get("type") or self._detect_type(value)
            self._db.upsert_ioc({
                "value":       value,
                "type":        ioc_type,
                "threat_type": ioc.get("threat_type", "unknown"),
                "confidence":  float(ioc.get("confidence", 0.7)),
                "source":      ioc.get("source", "manual"),
                "tags":        ioc.get("tags", []),
            })
            count += 1
        return count

    def _detect_type(self, value: str) -> str:
        if IP_RE.match(value):        return "ip"
        if HASH_RE.match(value):      return "hash"
        if "@" in value:              return "email"
        if value.startswith("http"):  return "url"
        if DOMAIN_RE.match(value):    return "domain"
        return "unknown"

    def get_stats(self) -> dict:
        return {
            "total_iocs":   self._db.threat_intel_count(),
            "feeds":        len(self._feeds),
            "last_update":  self._last_update,
            "next_update":  self._last_update + (self._update_hours * 3600) if self._last_update else 0,
        }
