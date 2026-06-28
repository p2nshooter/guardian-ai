# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO SOC — SIEM Aggregation Engine

Ingests security events from multiple sources:
  • Syslog (UDP/TCP 5514)
  • JSON log files (tail -f)
  • Guardian AI API (native integration)
  • HTTP/REST push endpoint
  • CEF (Common Event Format) parser
  • Webhook (generic JSON)

Events are normalized, enriched with GeoIP + threat intel, and stored.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import socket
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
import structlog

log = structlog.get_logger()


# ── Event normalization ───────────────────────────────────────────────────────

@dataclass
class SecurityEvent:
    id:         str
    ts:         float
    source:     str
    source_ip:  Optional[str]
    event_type: str
    severity:   str       # critical / high / medium / low / info
    category:   str       # auth / network / malware / system / application
    raw:        str
    parsed:     dict      = field(default_factory=dict)
    tags:       List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "id":         self.id,
            "ts":         self.ts,
            "source":     self.source,
            "source_ip":  self.source_ip,
            "event_type": self.event_type,
            "severity":   self.severity,
            "category":   self.category,
            "raw":        self.raw[:1000],   # truncate for storage
            "parsed":     self.parsed,
            "tags":       self.tags,
        }


# ── Syslog patterns ───────────────────────────────────────────────────────────

SYSLOG_SEVERITY_MAP = {
    0: "critical", 1: "critical", 2: "critical",
    3: "high",     4: "high",
    5: "medium",   6: "info",     7: "info",
}

THREAT_PATTERNS = [
    (re.compile(r"Failed password for .+ from ([\d.]+)", re.I), "brute_force", "auth", "high"),
    (re.compile(r"Invalid user .+ from ([\d.]+)", re.I),        "brute_force", "auth", "high"),
    (re.compile(r"authentication failure.*rhost=([\d.]+)", re.I),"brute_force", "auth", "high"),
    (re.compile(r"POSSIBLE BREAK-IN ATTEMPT", re.I),             "intrusion_attempt", "auth", "critical"),
    (re.compile(r"kernel: .*(Out of memory|OOM)", re.I),         "system_critical", "system", "high"),
    (re.compile(r"(iptables|firewall).*BLOCK", re.I),            "firewall_block", "network", "medium"),
    (re.compile(r"sudo:.*COMMAND=", re.I),                       "privilege_escalation", "auth", "medium"),
    (re.compile(r"segfault|core dumped", re.I),                  "crash_detected", "system", "medium"),
    (re.compile(r"(malware|virus|trojan|rootkit)", re.I),        "malware_detected", "malware", "critical"),
    (re.compile(r"CVE-\d{4}-\d+", re.I),                        "cve_mention", "vulnerability", "high"),
]

IP_PATTERN = re.compile(r"\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b")


def _parse_syslog(raw: str) -> dict:
    """Parse RFC 3164 / RFC 5424 syslog message."""
    parsed: dict = {"raw_syslog": raw}

    # Extract PRI (priority)
    pri_match = re.match(r"^<(\d+)>", raw)
    if pri_match:
        pri = int(pri_match.group(1))
        facility = pri >> 3
        severity_num = pri & 7
        parsed["facility"] = facility
        parsed["syslog_severity"] = severity_num

    # Extract hostname and process
    parts = re.split(r"\s+", raw.lstrip("<0123456789>"), maxsplit=5)
    if len(parts) >= 5:
        parsed["month"]    = parts[0] if parts else ""
        parsed["day"]      = parts[1] if len(parts) > 1 else ""
        parsed["time"]     = parts[2] if len(parts) > 2 else ""
        parsed["hostname"] = parts[3] if len(parts) > 3 else ""
        parsed["process"]  = parts[4].rstrip(":") if len(parts) > 4 else ""
        parsed["message"]  = parts[5] if len(parts) > 5 else ""

    # Extract IPs from message
    ips = IP_PATTERN.findall(raw)
    if ips:
        parsed["extracted_ips"] = ips

    return parsed


def _classify_event(raw: str, source: str) -> tuple[str, str, str]:
    """Returns (event_type, category, severity)."""
    for pattern, event_type, category, severity in THREAT_PATTERNS:
        if pattern.search(raw):
            return event_type, category, severity
    return "generic_log", "system", "info"


def _generate_event_id(raw: str, ts: float) -> str:
    h = hashlib.sha256(f"{ts}:{raw}".encode()).hexdigest()[:16]
    return f"evt-{h}"


class SIEMEngine:
    """
    SIEM aggregation engine.
    Collects events, normalizes them, and calls registered handlers.
    """

    def __init__(self):
        self._handlers:   List[Callable[[SecurityEvent], None]] = []
        self._event_queue: asyncio.Queue = asyncio.Queue(maxsize=10000)
        self._recent_ids:  deque = deque(maxlen=5000)  # dedup buffer
        self._stats = {
            "total_received":  0,
            "total_processed": 0,
            "total_dropped":   0,
            "by_source":       defaultdict(int),
            "by_severity":     defaultdict(int),
        }
        self._running = False
        self._syslog_server: Optional[asyncio.AbstractServer] = None

    def register_handler(self, fn: Callable[[SecurityEvent], None]):
        self._handlers.append(fn)

    async def start(self, syslog_host: str = "0.0.0.0", syslog_port: int = 5514):
        self._running = True
        # Start event processor
        asyncio.create_task(self._process_loop())
        # Start syslog UDP listener
        try:
            loop = asyncio.get_event_loop()
            transport, _ = await loop.create_datagram_endpoint(
                lambda: _SyslogProtocol(self._ingest_raw, syslog_host),
                local_addr=(syslog_host, syslog_port),
            )
            log.info("soc_syslog_listening", host=syslog_host, port=syslog_port)
        except Exception as e:
            log.warning("soc_syslog_unavailable", error=str(e),
                        note="Syslog listener not started — push events via API")

    async def stop(self):
        self._running = False

    async def ingest(self, event_data: dict):
        """Ingest a pre-parsed event dict (from API push or Guardian integration)."""
        evt = SecurityEvent(
            id         = event_data.get("id") or _generate_event_id(str(event_data), time.time()),
            ts         = event_data.get("ts", time.time()),
            source     = event_data.get("source", "api"),
            source_ip  = event_data.get("source_ip"),
            event_type = event_data.get("event_type", "generic"),
            severity   = event_data.get("severity", "info"),
            category   = event_data.get("category", "application"),
            raw        = event_data.get("raw", str(event_data)),
            parsed     = event_data.get("parsed", {}),
            tags       = event_data.get("tags", []),
        )
        await self._enqueue(evt)

    def _ingest_raw(self, raw: str, addr: tuple):
        """Called by syslog UDP listener. Thread-safe enqueue."""
        try:
            ts         = time.time()
            event_type, category, severity = _classify_event(raw, addr[0])
            parsed     = _parse_syslog(raw)
            evt = SecurityEvent(
                id         = _generate_event_id(raw, ts),
                ts         = ts,
                source     = "syslog",
                source_ip  = addr[0],
                event_type = event_type,
                severity   = severity,
                category   = category,
                raw        = raw,
                parsed     = parsed,
                tags       = [],
            )
            asyncio.get_event_loop().call_soon_threadsafe(
                lambda: asyncio.ensure_future(self._enqueue(evt))
            )
        except Exception as e:
            log.debug("soc_syslog_parse_error", error=str(e))

    async def _enqueue(self, evt: SecurityEvent):
        # Dedup check
        if evt.id in self._recent_ids:
            self._stats["total_dropped"] += 1
            return
        self._recent_ids.append(evt.id)
        self._stats["total_received"] += 1
        try:
            self._event_queue.put_nowait(evt)
        except asyncio.QueueFull:
            self._stats["total_dropped"] += 1
            log.warning("soc_event_queue_full")

    async def _process_loop(self):
        while self._running:
            try:
                evt = await asyncio.wait_for(self._event_queue.get(), timeout=1.0)
                for handler in self._handlers:
                    try:
                        if asyncio.iscoroutinefunction(handler):
                            await handler(evt)
                        else:
                            handler(evt)
                    except Exception as e:
                        log.error("soc_handler_error", error=str(e))
                self._stats["total_processed"] += 1
                self._stats["by_source"][evt.source] += 1
                self._stats["by_severity"][evt.severity] += 1
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                log.error("soc_process_loop_error", error=str(e))

    def get_stats(self) -> dict:
        return {
            "total_received":  self._stats["total_received"],
            "total_processed": self._stats["total_processed"],
            "total_dropped":   self._stats["total_dropped"],
            "queue_depth":     self._event_queue.qsize(),
            "by_source":       dict(self._stats["by_source"]),
            "by_severity":     dict(self._stats["by_severity"]),
        }


class _SyslogProtocol(asyncio.DatagramProtocol):
    def __init__(self, callback, host: str):
        self._callback = callback
        self._host     = host

    def datagram_received(self, data: bytes, addr):
        try:
            msg = data.decode("utf-8", errors="replace")
            self._callback(msg, addr)
        except Exception:
            pass
