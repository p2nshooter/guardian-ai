# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
YP SOC — real correlation / alerting engine (SIEM-lite + SOAR hooks).

Ingests security-relevant events into the shared event log, then evaluates a
set of real correlation rules against a recent time window and raises alerts.
This is the connective tissue of YP's security side:

  • the antivirus scanner emits `security/malware_detected` events
  • external systems POST auth failures / access events to /soc/ingest
  • the SOC engine correlates them (brute force, malware, data-exfil signals)
    and writes alerts to the local DB

Rules are evaluated on every ingest and can also be swept periodically. All
state lives in the client's own SQLite DB — nothing is sent to AXTO.
"""
from __future__ import annotations
import json
import time
from dataclasses import dataclass


@dataclass
class Rule:
    id: str
    title: str
    severity: str       # low | medium | high | critical
    module: str         # event module to watch
    kind: str           # event kind to count
    threshold: int      # raise when count within window >= threshold
    window_s: int       # look-back window in seconds
    per_source: bool    # count per distinct source (brute-force style) vs global


# Real, sensible default correlation rules.
DEFAULT_RULES = [
    Rule("brute_force", "Possible brute-force authentication", "high",
         "auth", "auth_failure", threshold=5, window_s=600, per_source=True),
    Rule("malware_burst", "Multiple malware detections", "critical",
         "security", "malware_detected", threshold=1, window_s=3600, per_source=False),
    Rule("redaction_spike", "Sensitive-data exposure spike (possible exfiltration)", "medium",
         "privacy", "high_redaction", threshold=10, window_s=600, per_source=False),
    Rule("provider_failures", "AI provider failure storm", "medium",
         "scheduler", "provider_error", threshold=15, window_s=300, per_source=False),
    Rule("access_denied_spike", "Repeated access-denied (possible enumeration)", "medium",
         "access", "access_denied", threshold=20, window_s=600, per_source=True),
]


class SOCEngine:
    def __init__(self, db, rules: list | None = None):
        self._db = db
        self._rules = rules if rules is not None else list(DEFAULT_RULES)

    async def ingest(self, module: str, kind: str, source: str = "",
                    severity: str = "info", summary: str = "", meta: dict | None = None) -> dict:
        """Record an event, then evaluate rules that watch this (module, kind)."""
        meta = dict(meta or {})
        if source:
            meta["source"] = source
        await self._db.log_event(module, kind, summary=summary, severity=severity,
                                 meta_json=json.dumps(meta))
        raised = await self._evaluate(module, kind, source)
        return {"ingested": True, "alerts_raised": raised}

    async def _evaluate(self, module: str, kind: str, source: str) -> list:
        raised = []
        now = time.time()
        for r in self._rules:
            if r.module != module or r.kind != kind:
                continue
            since = now - r.window_s
            src = source if r.per_source else None
            count = await self._db.count_events_since(r.module, r.kind, since, source=src)
            if count >= r.threshold:
                detail = (f"{count} '{r.kind}' events in {r.window_s}s"
                          + (f" from source={source}" if r.per_source and source else ""))
                aid = await self._db.add_alert(
                    rule_id=r.id, severity=r.severity, title=r.title,
                    detail=detail, source=source,
                    meta_json=json.dumps({"count": count, "window_s": r.window_s}))
                raised.append({"alert_id": aid, "rule_id": r.id, "severity": r.severity,
                               "title": r.title, "detail": detail})
        return raised

    async def sweep(self) -> list:
        """Evaluate ALL rules once (for a periodic background pass)."""
        raised = []
        now = time.time()
        for r in self._rules:
            since = now - r.window_s
            if r.per_source:
                # global sweep can't enumerate sources cheaply; use global count
                count = await self._db.count_events_since(r.module, r.kind, since)
            else:
                count = await self._db.count_events_since(r.module, r.kind, since)
            if count >= r.threshold:
                aid = await self._db.add_alert(
                    rule_id=r.id, severity=r.severity, title=r.title,
                    detail=f"[sweep] {count} '{r.kind}' events in {r.window_s}s",
                    meta_json=json.dumps({"count": count, "sweep": True}))
                raised.append({"alert_id": aid, "rule_id": r.id})
        return raised

    def rules(self) -> list:
        return [r.__dict__ for r in self._rules]
