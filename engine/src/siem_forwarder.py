# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration — SIEM Forwarder
Forward security events ke existing SIEM infrastructure.

Supported outputs:
  splunk_hec  — Splunk HTTP Event Collector (port 8088)
  elastic     — Elasticsearch Bulk API (_bulk endpoint)
  wazuh       — Wazuh Manager via syslog (TCP/UDP port 514)
  syslog      — Standard syslog RFC 5424 (any syslog server)
  cef_file    — CEF format to local file
  json_file   — JSON line-delimited to local file

Tier 2 extra output (always-on when Redis available):
  redis_stream — Redis Streams (key: guardian:siem_stream)
    Consumers: Logstash, custom ETL, Wazuh, Filebeat Redis input
    Retention: configurable via SIEM_REDIS_STREAM_MAXLEN (default 100000)

Config via env:
  SIEM_TYPE=splunk_hec|elastic|wazuh|syslog|cef_file|json_file
  SIEM_SPLUNK_URL, SIEM_SPLUNK_TOKEN
  SIEM_ELASTIC_URL, SIEM_ELASTIC_INDEX, SIEM_ELASTIC_API_KEY
  SIEM_WAZUH_HOST, SIEM_WAZUH_PORT
  SIEM_SYSLOG_HOST, SIEM_SYSLOG_PORT
  SIEM_CEF_FILE, SIEM_JSON_FILE
  SIEM_REDIS_STREAM_MAXLEN=100000   (Tier 2)
"""
from __future__ import annotations

import asyncio, json, logging, os, socket, time, urllib.request
from pathlib import Path
from typing import Optional

log = logging.getLogger("guardian.siem")

SIEM_TYPE        = os.environ.get("SIEM_TYPE", "")
SPLUNK_URL       = os.environ.get("SIEM_SPLUNK_URL", "")
SPLUNK_TOKEN     = os.environ.get("SIEM_SPLUNK_TOKEN", "")
ELASTIC_URL      = os.environ.get("SIEM_ELASTIC_URL", "")
ELASTIC_INDEX    = os.environ.get("SIEM_ELASTIC_INDEX", "guardian-alerts")
ELASTIC_API_KEY  = os.environ.get("SIEM_ELASTIC_API_KEY", "")
WAZUH_HOST       = os.environ.get("SIEM_WAZUH_HOST", "")
WAZUH_PORT       = int(os.environ.get("SIEM_WAZUH_PORT", "514"))
SYSLOG_HOST      = os.environ.get("SIEM_SYSLOG_HOST", "")
SYSLOG_PORT      = int(os.environ.get("SIEM_SYSLOG_PORT", "514"))
CEF_FILE         = os.environ.get("SIEM_CEF_FILE", "/var/log/guardian/guardian.cef")
JSON_FILE        = os.environ.get("SIEM_JSON_FILE", "/var/log/guardian/guardian.jsonl")
REDIS_STREAM_KEY = os.environ.get("SIEM_REDIS_STREAM_KEY", "guardian:siem_stream")
REDIS_STREAM_MAX = int(os.environ.get("SIEM_REDIS_STREAM_MAXLEN", "100000"))

CEF_SEVERITY = {"critical": 10, "high": 8, "medium": 5, "low": 3, "info": 1}

NODE_NAME = os.environ.get("GUARDIAN_NODE_NAME", socket.gethostname())
NODE_ID   = os.environ.get("GUARDIAN_NODE_ID", "core")


class SIEMForwarder:
    def __init__(self):
        self._running     = False
        self._queue:      asyncio.Queue = asyncio.Queue(maxsize=10000)
        self._sent_count  = 0
        self._error_count = 0
        self._redis_count = 0   # events forwarded via Redis Streams

    async def start(self) -> None:
        self._running = True
        for fpath in [CEF_FILE, JSON_FILE]:
            try:
                Path(fpath).parent.mkdir(parents=True, exist_ok=True)
            except Exception:
                pass
        asyncio.create_task(self._flush_loop())
        outputs = []
        if SIEM_TYPE:
            outputs.append(SIEM_TYPE)
        # Check if Redis available for stream output
        try:
            from src.database_distributed import get_db_mode
            if get_db_mode() == "distributed":
                outputs.append("redis_stream")
        except Exception:
            pass
        log.info(f"SIEM Forwarder started: outputs={outputs or ['none']}")

    async def stop(self) -> None:
        self._running = False
        await self._flush()

    async def forward(self, event_type: str, data: dict,
                      severity: str = "medium") -> None:
        """Queue an event for forwarding to all configured outputs. Non-blocking."""
        if not SIEM_TYPE:
            # Still queue for Redis stream if distributed
            try:
                from src.database_distributed import get_db_mode
                if get_db_mode() != "distributed":
                    return
            except Exception:
                return
        event = {
            "ts":         time.time(),
            "event_type": event_type,
            "severity":   severity,
            "node_id":    NODE_ID,
            "node_name":  NODE_NAME,
            **data,
        }
        try:
            self._queue.put_nowait(event)
        except asyncio.QueueFull:
            log.debug("SIEM queue full — dropping event")

    async def _flush_loop(self) -> None:
        while self._running:
            await asyncio.sleep(5)
            await self._flush()

    async def _flush(self) -> None:
        events = []
        while not self._queue.empty() and len(events) < 200:
            try:
                events.append(self._queue.get_nowait())
            except Exception:
                break
        if not events:
            return

        # ── Tier 2: Redis Streams (always runs if Redis available) ────────────
        await self._forward_redis_stream(events)

        # ── Configured SIEM output ────────────────────────────────────────────
        if not SIEM_TYPE:
            return
        try:
            if SIEM_TYPE == "splunk_hec":
                await self._forward_splunk(events)
            elif SIEM_TYPE == "elastic":
                await self._forward_elastic(events)
            elif SIEM_TYPE in ("wazuh", "syslog"):
                await self._forward_syslog(events)
            elif SIEM_TYPE == "cef_file":
                self._write_cef(events)
            elif SIEM_TYPE == "json_file":
                self._write_jsonl(events)
            self._sent_count += len(events)
        except Exception as e:
            self._error_count += len(events)
            log.warning(f"SIEM forward error ({SIEM_TYPE}): {e}")

    # ── Tier 2: Redis Streams ─────────────────────────────────────────────────

    async def _forward_redis_stream(self, events: list) -> None:
        """
        Write events to Redis Stream.
        Redis Streams is a durable, ordered, replayable event log.
        Consumers: Logstash, Filebeat, custom ETL, cross-Core forwarding.

        Stream key: guardian:siem_stream
        Consumer groups: any SIEM pipeline can create its own group.
        """
        try:
            from src.database_distributed import get_redis, get_db_mode
            if get_db_mode() != "distributed":
                return
            redis = await get_redis()
            if not redis or not redis._client:
                return
            pipe = redis._client.pipeline()
            for e in events:
                # Redis XADD: add entry to stream
                # Fields must be flat string key-value pairs
                fields = {
                    "ts":         str(e.get("ts", time.time())),
                    "event_type": str(e.get("event_type", "")),
                    "severity":   str(e.get("severity", "medium")),
                    "node_id":    str(e.get("node_id", NODE_ID)),
                    "node_name":  str(e.get("node_name", NODE_NAME)),
                    "verdict":    str(e.get("verdict", "")),
                    "target":     str(e.get("target", ""))[:512],
                    "threat_type":str(e.get("threat_type", "")),
                    "confidence": str(e.get("confidence", 0)),
                    "raw":        json.dumps({k: v for k, v in e.items()
                                             if k not in ("ts","event_type","severity",
                                                         "node_id","node_name")},
                                            default=str)[:4096],
                }
                pipe.xadd(REDIS_STREAM_KEY, fields, maxlen=REDIS_STREAM_MAX)
            await pipe.execute()
            self._redis_count += len(events)
        except Exception as e:
            log.debug(f"Redis stream forward error: {e}")

    async def get_stream_info(self) -> dict:
        """Return Redis stream metadata."""
        try:
            from src.database_distributed import get_redis, get_db_mode
            if get_db_mode() != "distributed":
                return {"available": False, "reason": "not distributed mode"}
            redis = await get_redis()
            if not redis or not redis._client:
                return {"available": False, "reason": "redis not connected"}
            info = await redis._client.xinfo_stream(REDIS_STREAM_KEY)
            return {
                "available":    True,
                "stream_key":   REDIS_STREAM_KEY,
                "length":       info.get("length", 0),
                "first_entry":  info.get("first-entry"),
                "last_entry":   info.get("last-entry"),
                "max_len":      REDIS_STREAM_MAX,
            }
        except Exception as e:
            return {"available": False, "reason": str(e)}

    # ── Splunk HEC ─────────────────────────────────────────────────────────────
    async def _forward_splunk(self, events: list) -> None:
        if not (SPLUNK_URL and SPLUNK_TOKEN):
            return
        body = "\n".join(json.dumps({
            "time":       e["ts"],
            "host":       e.get("node_name", NODE_NAME),
            "source":     "guardian-ai",
            "sourcetype": "guardian:security",
            "index":      "guardian",
            "event":      e,
        }) for e in events).encode()
        url = SPLUNK_URL.rstrip("/") + "/services/collector/event"
        req = urllib.request.Request(url, data=body, headers={
            "Authorization": f"Splunk {SPLUNK_TOKEN}",
            "Content-Type":  "application/json",
        })
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: urllib.request.urlopen(req, timeout=15))

    # ── Elasticsearch ──────────────────────────────────────────────────────────
    async def _forward_elastic(self, events: list) -> None:
        if not ELASTIC_URL:
            return
        lines = []
        for e in events:
            lines.append(json.dumps({"index": {"_index": ELASTIC_INDEX}}))
            lines.append(json.dumps(e))
        body = ("\n".join(lines) + "\n").encode()
        headers = {"Content-Type": "application/x-ndjson"}
        if ELASTIC_API_KEY:
            headers["Authorization"] = f"ApiKey {ELASTIC_API_KEY}"
        url = ELASTIC_URL.rstrip("/") + "/_bulk"
        req = urllib.request.Request(url, data=body, headers=headers)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: urllib.request.urlopen(req, timeout=15))

    # ── Syslog / Wazuh ─────────────────────────────────────────────────────────
    async def _forward_syslog(self, events: list) -> None:
        host = WAZUH_HOST or SYSLOG_HOST
        port = WAZUH_PORT if SIEM_TYPE == "wazuh" else SYSLOG_PORT
        if not host:
            return
        loop = asyncio.get_event_loop()

        def _send_sync():
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.connect((host, port))
                s.settimeout(10)
                for e in events:
                    priority = 14 * 8 + (3 if e.get("severity") in ("critical","high") else 5)
                    ts       = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(e["ts"]))
                    msg_id   = e.get("event_type", "GUARDIAN")[:32].replace(" ","_")
                    struct   = json.dumps({k: v for k, v in e.items() if k != "ts"})[:1024]
                    line     = (f"<{priority}>1 {ts} {NODE_NAME} guardian-ai "
                                f"{os.getpid()} {msg_id} - {struct}\n")
                    s.sendall(line.encode("utf-8", errors="replace"))

        await loop.run_in_executor(None, _send_sync)

    # ── CEF File ───────────────────────────────────────────────────────────────
    def _write_cef(self, events: list) -> None:
        lines = []
        for e in events:
            sev     = e.get("severity", "medium")
            cef_sev = CEF_SEVERITY.get(sev, 5)
            ev_type = e.get("event_type", "security_event").replace("|", "/")
            target  = e.get("target", "").replace("|", "_")
            threat  = e.get("threat_type", "").replace("|", "_")
            ts_ms   = int(e["ts"] * 1000)
            verdict = e.get("verdict", "").replace("|", "_")
            conf    = e.get("confidence", 0)
            cef = (
                f"CEF:0|Axto|Guardian AI|2.0|{ev_type}|{ev_type}|{cef_sev}|"
                f"rt={ts_ms} dhost={NODE_NAME} dst={target} "
                f"cs1={threat} cs1Label=ThreatType "
                f"cs2={verdict} cs2Label=Verdict "
                f"cfp1={conf:.2f} cfp1Label=Confidence"
            )
            lines.append(cef)
        try:
            with open(CEF_FILE, "a", encoding="utf-8") as f:
                f.write("\n".join(lines) + "\n")
        except Exception as ex:
            log.warning(f"CEF write error: {ex}")

    # ── JSON Lines ─────────────────────────────────────────────────────────────
    def _write_jsonl(self, events: list) -> None:
        try:
            with open(JSON_FILE, "a", encoding="utf-8") as f:
                for e in events:
                    f.write(json.dumps(e, ensure_ascii=False) + "\n")
        except Exception as ex:
            log.warning(f"JSONL write error: {ex}")

    def get_stats(self) -> dict:
        return {
            "siem_type":     SIEM_TYPE or "disabled",
            "queue_depth":   self._queue.qsize(),
            "sent_total":    self._sent_count,
            "error_count":   self._error_count,
            "redis_stream":  self._redis_count,
            "stream_key":    REDIS_STREAM_KEY,
            "configured":    bool(SIEM_TYPE),
        }


_forwarder: Optional[SIEMForwarder] = None


def get_siem() -> SIEMForwarder:
    global _forwarder
    if _forwarder is None:
        _forwarder = SIEMForwarder()
    return _forwarder
