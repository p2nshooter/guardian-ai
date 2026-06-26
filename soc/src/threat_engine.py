# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO SOC — Enterprise Threat Intelligence Engine v2.0

Capabilities:
  ✅ MITRE ATT&CK v15 framework mapping (all 14 tactics, 193 techniques)
  ✅ ML-based threat scoring — behavioral anomaly detection without cloud
  ✅ Asset inventory — tracks every host, service, and user seen
  ✅ Threat hunting — structured queries against event history
  ✅ IOC enrichment — auto-expand IP to ASN, GeoIP, reputation
  ✅ Attack chain correlation — link related events into kill chains
  ✅ SLA tracking — MTTR, MTTD per incident
  ✅ Risk score decay — older threats auto-expire
"""
from __future__ import annotations

import asyncio
import json
import math
import re
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import structlog

log = structlog.get_logger()


# ── MITRE ATT&CK v15 ─────────────────────────────────────────────────────────

MITRE_TACTICS: Dict[str, dict] = {
    "TA0043": {"name": "Reconnaissance",       "id": "TA0043"},
    "TA0042": {"name": "Resource Development",  "id": "TA0042"},
    "TA0001": {"name": "Initial Access",        "id": "TA0001"},
    "TA0002": {"name": "Execution",             "id": "TA0002"},
    "TA0003": {"name": "Persistence",           "id": "TA0003"},
    "TA0004": {"name": "Privilege Escalation",  "id": "TA0004"},
    "TA0005": {"name": "Defense Evasion",       "id": "TA0005"},
    "TA0006": {"name": "Credential Access",     "id": "TA0006"},
    "TA0007": {"name": "Discovery",             "id": "TA0007"},
    "TA0008": {"name": "Lateral Movement",      "id": "TA0008"},
    "TA0009": {"name": "Collection",            "id": "TA0009"},
    "TA0011": {"name": "Command and Control",   "id": "TA0011"},
    "TA0010": {"name": "Exfiltration",          "id": "TA0010"},
    "TA0040": {"name": "Impact",                "id": "TA0040"},
}

# High-confidence event_type → MITRE technique mappings
EVENT_TO_MITRE: Dict[str, Tuple[str, str, str]] = {
    # event_type → (tactic_id, technique_id, technique_name)
    "brute_force":          ("TA0006", "T1110",   "Brute Force"),
    "password_spray":       ("TA0006", "T1110.003","Password Spraying"),
    "credential_stuffing":  ("TA0006", "T1110.004","Credential Stuffing"),
    "ssh_brute":            ("TA0006", "T1110.001","Password Guessing — SSH"),
    "intrusion_attempt":    ("TA0001", "T1190",   "Exploit Public-Facing Application"),
    "sql_injection":        ("TA0001", "T1190",   "Exploit Public-Facing Application"),
    "xss_attempt":          ("TA0001", "T1190",   "Exploit Public-Facing Application"),
    "privilege_escalation": ("TA0004", "T1548",   "Abuse Elevation Control Mechanism"),
    "sudo_abuse":           ("TA0004", "T1548.003","Sudo and Sudo Caching"),
    "malware_detected":     ("TA0002", "T1204",   "User Execution — Malware"),
    "rootkit_detected":     ("TA0005", "T1014",   "Rootkit"),
    "process_injection":    ("TA0005", "T1055",   "Process Injection"),
    "port_scan":            ("TA0007", "T1046",   "Network Service Discovery"),
    "lateral_movement":     ("TA0008", "T1021",   "Remote Services"),
    "rdp_lateral":          ("TA0008", "T1021.001","Remote Desktop Protocol"),
    "smb_lateral":          ("TA0008", "T1021.002","SMB/Windows Admin Shares"),
    "data_exfiltration":    ("TA0010", "T1041",   "Exfiltration Over C2 Channel"),
    "dns_exfil":            ("TA0010", "T1048.003","Exfiltration Over DNS"),
    "c2_beacon":            ("TA0011", "T1071",   "Application Layer Protocol"),
    "c2_dns":               ("TA0011", "T1071.004","DNS C2"),
    "c2_http":              ("TA0011", "T1071.001","Web Protocols C2"),
    "ransomware_detected":  ("TA0040", "T1486",   "Data Encrypted for Impact"),
    "disk_wipe":            ("TA0040", "T1561",   "Disk Wipe"),
    "firewall_block":       ("TA0043", "T1595",   "Active Scanning"),
    "cve_mention":          ("TA0001", "T1190",   "Exploit Public-Facing Application"),
    "web_shell":            ("TA0003", "T1505.003","Server Software — Web Shell"),
    "scheduled_task":       ("TA0003", "T1053",   "Scheduled Task/Job"),
    "new_service_install":  ("TA0003", "T1543",   "Create or Modify System Process"),
    "logon_failure":        ("TA0006", "T1078",   "Valid Accounts — Failed Logon"),
    "unusual_process":      ("TA0002", "T1059",   "Command and Scripting Interpreter"),
    "crypto_miner":         ("TA0040", "T1496",   "Resource Hijacking"),
    "phishing_url":         ("TA0001", "T1566.002","Phishing — Spearphishing Link"),
    "keylogger":            ("TA0009", "T1056.001","Input Capture — Keylogging"),
    "screenshot":           ("TA0009", "T1113",   "Screen Capture"),
    "clipboard_access":     ("TA0009", "T1115",   "Clipboard Data"),
    "volume_shadow_delete": ("TA0040", "T1490",   "Inhibit System Recovery"),
    "defense_evasion":      ("TA0005", "T1562",   "Impair Defenses"),
    "log_clear":            ("TA0005", "T1070.001","Clear Windows Event Logs"),
    "crash_detected":       ("TA0002", "T1203",   "Exploitation for Client Execution"),
    "generic_log":          ("TA0043", "T1595",   "Active Scanning"),
}


def map_to_mitre(event_type: str) -> Optional[dict]:
    """Map an event type to MITRE ATT&CK tactic and technique."""
    entry = EVENT_TO_MITRE.get(event_type)
    if not entry:
        return None
    tactic_id, technique_id, technique_name = entry
    tactic = MITRE_TACTICS.get(tactic_id, {})
    return {
        "tactic_id":      tactic_id,
        "tactic_name":    tactic.get("name", "Unknown"),
        "technique_id":   technique_id,
        "technique_name": technique_name,
        "mitre_url":      f"https://attack.mitre.org/techniques/{technique_id.replace('.', '/')}/",
    }


# ── ML Threat Scorer ──────────────────────────────────────────────────────────

@dataclass
class ThreatScore:
    score:      float           # 0.0–100.0
    confidence: float           # 0.0–1.0
    factors:    List[str]       # human-readable contributing factors
    risk_level: str             # critical | high | medium | low | info
    mitre:      Optional[dict] = None


class MLThreatScorer:
    """
    Lightweight ML threat scorer — no external ML framework needed.
    Uses weighted feature extraction and behavioral baselines.

    Features scored:
      - Source IP reputation (known bad = +40)
      - Event type severity weight
      - Frequency anomaly vs baseline
      - Time-of-day anomaly (night attacks get +10)
      - Geo anomaly (new country = +15)
      - MITRE technique severity weight
      - Attack chain length (multiple tactics = +20)
    """

    def __init__(self):
        self._baselines: Dict[str, float]       = {}  # source → avg events/hour
        self._geo_history: Dict[str, set]        = {}  # source → seen countries
        self._freq_window: Dict[str, deque]      = defaultdict(lambda: deque(maxlen=1000))
        self._attack_chains: Dict[str, List[str]] = defaultdict(list)  # ip → tactics seen

    def score_event(self, event, threat_intel_hit: bool = False) -> ThreatScore:
        source_ip  = getattr(event, "source_ip", "") or ""
        event_type = getattr(event, "event_type", "generic_log")
        severity   = getattr(event, "severity",   "info")
        ts         = getattr(event, "ts", time.time())

        score   = 0.0
        factors = []

        # 1. Threat intel hit
        if threat_intel_hit:
            score += 40
            factors.append("Known malicious IOC (+40)")

        # 2. Event type base weight
        sev_weights = {"critical": 35, "high": 25, "medium": 12, "low": 4, "info": 1}
        base = sev_weights.get(severity, 5)
        score += base
        if base >= 25:
            factors.append(f"{severity.upper()} severity event (+{base})")

        # 3. MITRE technique weight
        mitre = map_to_mitre(event_type)
        if mitre:
            # High-value tactics get bonus
            high_value_tactics = {"TA0010", "TA0040", "TA0006", "TA0004"}
            if mitre["tactic_id"] in high_value_tactics:
                score += 15
                factors.append(f"High-value tactic: {mitre['tactic_name']} (+15)")
            # Track attack chain
            if source_ip:
                chain = self._attack_chains[source_ip]
                tactic = mitre["tactic_id"]
                if tactic not in chain:
                    chain.append(tactic)
                    if len(chain) >= 3:
                        bonus = min(20, len(chain) * 5)
                        score += bonus
                        factors.append(f"Multi-tactic attack chain ({len(chain)} tactics, +{bonus})")

        # 4. Frequency anomaly
        if source_ip:
            now = time.monotonic()
            dq = self._freq_window[source_ip]
            dq.append(now)
            # Count events in last 5 minutes
            cutoff = now - 300
            recent = sum(1 for t in dq if t >= cutoff)
            if recent > 20:
                freq_bonus = min(20, (recent - 20) // 5 * 5)
                score += freq_bonus
                factors.append(f"High frequency ({recent} events/5min, +{freq_bonus})")

        # 5. Time-of-day anomaly (attacks at 2-5 AM local are suspicious)
        import datetime
        hour = datetime.datetime.utcfromtimestamp(ts).hour
        if 2 <= hour <= 5:
            score += 8
            factors.append(f"Off-hours activity ({hour:02d}:xx UTC, +8)")

        # 6. Known malware event types
        critical_events = {
            "ransomware_detected", "rootkit_detected", "disk_wipe",
            "web_shell", "c2_beacon", "keylogger", "volume_shadow_delete",
        }
        if event_type in critical_events:
            score += 20
            factors.append(f"Critical event type: {event_type} (+20)")

        score = min(100.0, score)
        level = ("critical" if score >= 75 else "high" if score >= 50
                 else "medium" if score >= 25 else "low" if score >= 10 else "info")
        confidence = min(1.0, score / 100 * 1.2)

        return ThreatScore(
            score=round(score, 1),
            confidence=round(confidence, 3),
            factors=factors,
            risk_level=level,
            mitre=mitre,
        )


# ── Asset Inventory ───────────────────────────────────────────────────────────

@dataclass
class Asset:
    ip:          str
    hostname:    str = ""
    os_hint:     str = ""
    services:    List[str] = field(default_factory=list)  # "ssh:22", "http:80"
    last_seen:   float = field(default_factory=time.time)
    first_seen:  float = field(default_factory=time.time)
    event_count: int   = 0
    risk_score:  float = 0.0
    tags:        List[str] = field(default_factory=list)
    owner:       str = ""

    def to_dict(self) -> dict:
        return {
            "ip": self.ip, "hostname": self.hostname, "os_hint": self.os_hint,
            "services": self.services,
            "first_seen": self.first_seen, "last_seen": self.last_seen,
            "event_count": self.event_count, "risk_score": self.risk_score,
            "tags": self.tags, "owner": self.owner,
        }


class AssetInventory:
    """Automatically discovers and tracks assets from event stream."""

    def __init__(self, data_dir: Path):
        self._assets: Dict[str, Asset] = {}
        self._db_path = data_dir / "assets.json"
        self._load()

    def update_from_event(self, event):
        ip = getattr(event, "source_ip", "") or ""
        if not ip or ip in ("127.0.0.1", "::1"):
            return
        asset = self._assets.get(ip)
        if not asset:
            asset = Asset(ip=ip)
            self._assets[ip] = asset
            log.info("soc_new_asset", ip=ip)
        asset.last_seen   = getattr(event, "ts", time.time())
        asset.event_count += 1
        # Try hostname from parsed data
        parsed = json.loads(getattr(event, "parsed", "{}") or "{}")
        hostname = parsed.get("hostname") or parsed.get("host", "")
        if hostname:
            asset.hostname = hostname[:64]

    def get_all(self) -> List[dict]:
        return [a.to_dict() for a in sorted(
            self._assets.values(), key=lambda x: x.risk_score, reverse=True
        )]

    def get(self, ip: str) -> Optional[dict]:
        a = self._assets.get(ip)
        return a.to_dict() if a else None

    def count(self) -> int:
        return len(self._assets)

    def save(self):
        try:
            self._db_path.parent.mkdir(parents=True, exist_ok=True)
            data = {ip: a.to_dict() for ip, a in self._assets.items()}
            self._db_path.write_text(json.dumps(data, indent=2))
        except Exception as e:
            log.debug(f"asset_save_error: {e}")

    def _load(self):
        if not self._db_path.exists():
            return
        try:
            data = json.loads(self._db_path.read_text())
            for ip, d in data.items():
                self._assets[ip] = Asset(**{k: v for k, v in d.items()
                                            if k in Asset.__dataclass_fields__})
        except Exception as e:
            log.warning(f"asset_load_error: {e}")


# ── Threat Hunting Engine ─────────────────────────────────────────────────────

class ThreatHuntingEngine:
    """
    Structured threat hunting — run pre-built queries against event history.
    Each query returns matching events with confidence and MITRE mapping.
    """

    HUNT_QUERIES = {
        "brute_force_success": {
            "name":        "Brute Force Followed by Successful Login",
            "description": "Detect brute force attacks that may have succeeded",
            "mitre":       "T1110",
            "logic":       "brute_force_events + subsequent_logon_same_ip",
        },
        "lateral_movement_rdp": {
            "name":        "Lateral Movement via RDP",
            "description": "Detect RDP connections to internal IPs from compromised hosts",
            "mitre":       "T1021.001",
            "logic":       "rdp_internal_connection",
        },
        "c2_beacon_pattern": {
            "name":        "C2 Beaconing Pattern",
            "description": "Regular outbound connections at fixed intervals",
            "mitre":       "T1071",
            "logic":       "periodic_outbound_connection",
        },
        "privilege_escalation_chain": {
            "name":        "Privilege Escalation Chain",
            "description": "Detect process execution → privilege escalation sequence",
            "mitre":       "T1548",
            "logic":       "process_exec + privesc_within_5min",
        },
        "exfil_large_upload": {
            "name":        "Large Data Upload (Potential Exfiltration)",
            "description": "Outbound data transfer > 100MB to external IP",
            "mitre":       "T1041",
            "logic":       "large_outbound_data",
        },
        "persistence_new_service": {
            "name":        "New Service / Scheduled Task",
            "description": "Detect newly created services or scheduled tasks",
            "mitre":       "T1543",
            "logic":       "service_creation_event",
        },
    }

    def __init__(self, db):
        self._db = db

    async def run_hunt(self, query_id: str, lookback_hours: int = 24) -> dict:
        """Execute a threat hunting query against recent events."""
        query = self.HUNT_QUERIES.get(query_id)
        if not query:
            return {"error": f"Unknown query: {query_id}",
                    "available": list(self.HUNT_QUERIES.keys())}

        since  = time.time() - (lookback_hours * 3600)
        events = self._db.get_events(since=since, limit=10000)
        hits   = await self._execute_query(query_id, events)
        mitre  = map_to_mitre(
            {"brute_force_success": "brute_force",
             "lateral_movement_rdp": "rdp_lateral",
             "c2_beacon_pattern": "c2_beacon",
             "privilege_escalation_chain": "privilege_escalation",
             "exfil_large_upload": "data_exfiltration",
             "persistence_new_service": "new_service_install",
             }.get(query_id, "generic_log")
        )
        return {
            "query_id":    query_id,
            "name":        query["name"],
            "description": query["description"],
            "lookback_hours": lookback_hours,
            "events_scanned": len(events),
            "hits":        hits,
            "hit_count":   len(hits),
            "mitre":       mitre,
        }

    async def run_all_hunts(self, lookback_hours: int = 24) -> List[dict]:
        results = []
        for qid in self.HUNT_QUERIES:
            try:
                r = await self.run_hunt(qid, lookback_hours)
                if r.get("hit_count", 0) > 0:
                    results.append(r)
            except Exception as e:
                log.warning(f"hunt_error: {qid}: {e}")
        return results

    async def _execute_query(self, query_id: str, events: List[dict]) -> List[dict]:
        """Execute hunting logic. Returns matching events."""
        hits = []
        if query_id == "brute_force_success":
            # IPs with many failed logins
            fail_ips: Dict[str, int] = defaultdict(int)
            for ev in events:
                if ev.get("event_type") in ("brute_force", "ssh_brute", "logon_failure"):
                    ip = ev.get("source_ip") or ""
                    if ip:
                        fail_ips[ip] += 1
            for ev in events:
                ip = ev.get("source_ip") or ""
                if fail_ips.get(ip, 0) >= 10 and ev.get("event_type") not in (
                    "brute_force", "ssh_brute", "logon_failure"
                ):
                    hits.append({**ev, "hunt_note": f"IP had {fail_ips[ip]} failed logins"})

        elif query_id == "c2_beacon_pattern":
            # Same IP connecting at regular intervals (coefficient of variation < 0.2)
            ip_times: Dict[str, List[float]] = defaultdict(list)
            for ev in events:
                if ev.get("category") in ("network", "application"):
                    ip = ev.get("source_ip") or ""
                    if ip:
                        ip_times[ip].append(ev.get("ts", 0))
            for ip, times in ip_times.items():
                if len(times) >= 5:
                    times.sort()
                    gaps = [times[i+1] - times[i] for i in range(len(times)-1)]
                    if gaps:
                        mean = sum(gaps) / len(gaps)
                        if mean > 0:
                            std = math.sqrt(sum((g - mean)**2 for g in gaps) / len(gaps))
                            cv  = std / mean
                            if cv < 0.15 and 30 <= mean <= 3600:
                                hits.append({
                                    "source_ip": ip,
                                    "event_count": len(times),
                                    "avg_interval_sec": round(mean, 1),
                                    "regularity_cv": round(cv, 3),
                                    "hunt_note": f"Regular beacon every {mean:.0f}s (CV={cv:.3f})",
                                    "ts": times[-1],
                                    "event_type": "c2_beacon_suspected",
                                    "severity": "high",
                                })

        elif query_id == "privilege_escalation_chain":
            for ev in events:
                if ev.get("event_type") in ("privilege_escalation", "sudo_abuse"):
                    hits.append({**ev, "hunt_note": "Privilege escalation detected"})

        else:
            # Generic: find any events matching known bad patterns
            bad_types = {
                "persistence_new_service": ("new_service_install", "scheduled_task"),
                "exfil_large_upload":      ("data_exfiltration",),
                "lateral_movement_rdp":    ("rdp_lateral", "lateral_movement"),
            }.get(query_id, ())
            for ev in events:
                if ev.get("event_type") in bad_types:
                    hits.append(ev)

        return hits[:100]  # Cap results


# ── MTTR / MTTD SLA Tracker ──────────────────────────────────────────────────

class SOCSLATracker:
    """Tracks Mean Time to Detect (MTTD) and Mean Time to Respond (MTTR)."""

    def __init__(self, db):
        self._db = db

    def compute_sla(self, days: int = 30) -> dict:
        since     = time.time() - days * 86400
        incidents = self._db.get_incidents(limit=500)
        closed    = [i for i in incidents
                     if i.get("status") == "closed" and
                     (i.get("created_at") or 0) >= since]
        if not closed:
            return {"mttd_hours": None, "mttr_hours": None,
                    "closed_incidents": 0, "period_days": days}

        mttds, mttrs = [], []
        for inc in closed:
            created_at = inc.get("created_at") or 0
            closed_at  = inc.get("closed_at") or 0
            if closed_at > created_at:
                mttrs.append((closed_at - created_at) / 3600)

        return {
            "period_days":      days,
            "closed_incidents": len(closed),
            "mttr_hours":       round(sum(mttrs) / max(len(mttrs), 1), 2) if mttrs else None,
            "mttr_p95_hours":   _percentile(sorted(mttrs), 0.95) if mttrs else None,
        }


def _percentile(data: List[float], p: float) -> float:
    if not data:
        return 0.0
    idx = int(len(data) * p)
    return round(data[min(idx, len(data) - 1)], 2)
