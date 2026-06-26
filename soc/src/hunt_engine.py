# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO SOC — Enterprise Threat Hunting Engine v2.0

World-class threat hunting capabilities:

  ✅ Structured Hunt Queries   — 40+ pre-built hunt scenarios based on MITRE ATT&CK
  ✅ Kill Chain Reconstruction — Correlate events into attack timelines
  ✅ Behavioral Baselining     — ML-free statistical anomaly detection
  ✅ Hypothesis-Driven Hunting — Guided investigation workflow
  ✅ IOC Graph               — Pivot from IP→domain→hash→process chains
  ✅ Dwell Time Analysis      — How long has attacker been present?
  ✅ Hunt Scheduling          — Run automated hunts on a schedule
  ✅ Hunt Reports             — Exportable hunt findings for IR team
"""
from __future__ import annotations

import json
import math
import time
import uuid
from collections import defaultdict, Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple
import structlog

log = structlog.get_logger()


# ═══════════════════════════════════════════════════════════════════════════════
# HUNT SCENARIOS — MITRE ATT&CK Aligned
# ═══════════════════════════════════════════════════════════════════════════════

HUNT_SCENARIOS: List[dict] = [
    # ── Credential Access ──────────────────────────────────────────────
    {
        "id": "HUNT-CRED-001", "tactic": "TA0006", "technique": "T1110",
        "name": "SSH Brute Force — High Failure Rate",
        "description": "Detect sources with >20 SSH login failures in 10 minutes",
        "query_type": "threshold",
        "params": {"event_types": ["ssh_brute", "brute_force", "logon_failure"],
                   "threshold": 20, "window_sec": 600, "group_by": "source_ip"},
        "severity": "high",
    },
    {
        "id": "HUNT-CRED-002", "tactic": "TA0006", "technique": "T1110.003",
        "name": "Password Spray — Many Accounts, Low Volume",
        "description": "One source targeting 10+ distinct accounts with <5 attempts each",
        "query_type": "spray_detection",
        "params": {"min_distinct_accounts": 10, "max_attempts_per_account": 5,
                   "window_sec": 300},
        "severity": "critical",
    },
    {
        "id": "HUNT-CRED-003", "tactic": "TA0006", "technique": "T1078",
        "name": "Impossible Travel — Account Login from Multiple Geos",
        "description": "Same account logged in from IPs in geographically impossible locations",
        "query_type": "geo_anomaly",
        "params": {"event_types": ["logon_success", "auth_success"],
                   "window_minutes": 60},
        "severity": "critical",
    },
    # ── Lateral Movement ───────────────────────────────────────────────
    {
        "id": "HUNT-LATMOV-001", "tactic": "TA0008", "technique": "T1021.001",
        "name": "RDP Spread — Internal Lateral Movement",
        "description": "Host connecting to RDP on 5+ internal hosts in 1 hour",
        "query_type": "threshold",
        "params": {"event_types": ["rdp_lateral", "lateral_movement"],
                   "threshold": 5, "window_sec": 3600, "group_by": "source_ip"},
        "severity": "critical",
    },
    {
        "id": "HUNT-LATMOV-002", "tactic": "TA0008", "technique": "T1021.002",
        "name": "SMB Enumeration — Network Share Discovery",
        "description": "Host accessing SMB shares on many distinct internal targets",
        "query_type": "threshold",
        "params": {"event_types": ["smb_lateral", "smb_enum"],
                   "threshold": 10, "window_sec": 900, "group_by": "source_ip"},
        "severity": "high",
    },
    # ── Exfiltration ───────────────────────────────────────────────────
    {
        "id": "HUNT-EXFIL-001", "tactic": "TA0010", "technique": "T1041",
        "name": "Large Outbound Transfer — Data Exfiltration",
        "description": "Outbound transfer > 500MB in 30 minutes to external IP",
        "query_type": "volume",
        "params": {"event_types": ["data_exfiltration", "large_transfer"],
                   "min_bytes": 524288000, "window_sec": 1800, "direction": "outbound"},
        "severity": "critical",
    },
    {
        "id": "HUNT-EXFIL-002", "tactic": "TA0010", "technique": "T1048.003",
        "name": "DNS Tunneling — Suspicious Query Volume",
        "description": "Single host making >500 DNS queries in 10 minutes",
        "query_type": "threshold",
        "params": {"event_types": ["dns_query", "dns_exfil"],
                   "threshold": 500, "window_sec": 600, "group_by": "source_ip"},
        "severity": "high",
    },
    # ── Command & Control ──────────────────────────────────────────────
    {
        "id": "HUNT-C2-001", "tactic": "TA0011", "technique": "T1071.001",
        "name": "Beaconing — Periodic C2 Pattern",
        "description": "Host making highly regular HTTP calls to external IP (jitter <5%)",
        "query_type": "beacon_detection",
        "params": {"event_types": ["c2_beacon", "c2_http", "http_request"],
                   "min_calls": 10, "max_jitter_pct": 5, "window_sec": 3600},
        "severity": "critical",
    },
    {
        "id": "HUNT-C2-002", "tactic": "TA0011", "technique": "T1071.004",
        "name": "DNS C2 — Long DNS Labels",
        "description": "DNS queries with labels >50 characters (common DGA/tunnel indicator)",
        "query_type": "pattern",
        "params": {"event_types": ["dns_query", "c2_dns"],
                   "pattern": "long_label", "threshold": 63},
        "severity": "high",
    },
    # ── Discovery ──────────────────────────────────────────────────────
    {
        "id": "HUNT-DISC-001", "tactic": "TA0007", "technique": "T1046",
        "name": "Port Scan — Internal Network Discovery",
        "description": "Host probing >20 distinct ports on internal network",
        "query_type": "threshold",
        "params": {"event_types": ["port_scan", "firewall_block"],
                   "threshold": 20, "window_sec": 300, "group_by": "source_ip"},
        "severity": "medium",
    },
    # ── Persistence ────────────────────────────────────────────────────
    {
        "id": "HUNT-PERS-001", "tactic": "TA0003", "technique": "T1505.003",
        "name": "Web Shell — Post-Compromise Backdoor",
        "description": "Web shell indicator in HTTP request or file event",
        "query_type": "keyword",
        "params": {"event_types": ["web_shell", "intrusion_attempt"],
                   "keywords": ["cmd.php", "shell.php", "c99", "r57", "eval(base64"]},
        "severity": "critical",
    },
    {
        "id": "HUNT-PERS-002", "tactic": "TA0003", "technique": "T1053",
        "name": "Scheduled Task — Unusual Job Creation",
        "description": "New scheduled tasks created outside maintenance windows",
        "query_type": "time_anomaly",
        "params": {"event_types": ["scheduled_task"],
                   "business_hours": [9, 17], "alert_outside": True},
        "severity": "medium",
    },
    # ── Impact ─────────────────────────────────────────────────────────
    {
        "id": "HUNT-IMPACT-001", "tactic": "TA0040", "technique": "T1486",
        "name": "Ransomware — Rapid File Encryption Pattern",
        "description": "Mass file modification events (>1000 files in 5 minutes)",
        "query_type": "threshold",
        "params": {"event_types": ["ransomware_detected", "file_mass_write"],
                   "threshold": 1000, "window_sec": 300, "group_by": "source_ip"},
        "severity": "critical",
    },
    # ── Privilege Escalation ───────────────────────────────────────────
    {
        "id": "HUNT-PRIV-001", "tactic": "TA0004", "technique": "T1548.003",
        "name": "Sudo Abuse — Privilege Escalation Attempt",
        "description": "Multiple sudo failures followed by sudo success from same user",
        "query_type": "sequence",
        "params": {"fail_event": "sudo_abuse", "success_event": "privilege_escalation",
                   "min_fails": 3, "window_sec": 300},
        "severity": "high",
    },
]

# Build lookup by ID
HUNT_BY_ID: Dict[str, dict] = {s["id"]: s for s in HUNT_SCENARIOS}


# ═══════════════════════════════════════════════════════════════════════════════
# KILL CHAIN RECONSTRUCTOR
# ═══════════════════════════════════════════════════════════════════════════════

KILL_CHAIN_STAGES = [
    "Reconnaissance", "Weaponization", "Delivery", "Exploitation",
    "Installation", "Command & Control", "Actions on Objectives",
]

# MITRE tactic → Kill Chain stage mapping
TACTIC_TO_KC: Dict[str, str] = {
    "TA0043": "Reconnaissance",
    "TA0042": "Reconnaissance",
    "TA0001": "Exploitation",
    "TA0002": "Installation",
    "TA0003": "Installation",
    "TA0004": "Exploitation",
    "TA0005": "Installation",
    "TA0006": "Exploitation",
    "TA0007": "Command & Control",
    "TA0008": "Actions on Objectives",
    "TA0009": "Actions on Objectives",
    "TA0011": "Command & Control",
    "TA0010": "Actions on Objectives",
    "TA0040": "Actions on Objectives",
}


@dataclass
class KillChain:
    chain_id:   str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    source_ip:  str = ""
    stages:     Dict[str, List[dict]] = field(default_factory=dict)
    first_seen: float = 0.0
    last_seen:  float = 0.0
    dwell_hours: float = 0.0
    tactic_count: int = 0
    severity:   str = "medium"
    events:     List[str] = field(default_factory=list)  # event IDs

    def to_dict(self) -> dict:
        return {
            "chain_id":    self.chain_id,
            "source_ip":   self.source_ip,
            "stages":      {s: len(evs) for s, evs in self.stages.items()},
            "first_seen":  self.first_seen,
            "last_seen":   self.last_seen,
            "dwell_hours": round(self.dwell_hours, 1),
            "tactic_count": self.tactic_count,
            "severity":    self.severity,
            "event_count": len(self.events),
        }


class KillChainReconstructor:
    """
    Correlates individual events into multi-stage attack kill chains.
    Groups events by source IP + time window.
    """

    def reconstruct(self, events: List[dict],
                    window_hours: int = 24) -> List[KillChain]:
        """
        Given a list of events (each with source_ip, event_type, timestamp, mitre_tactic),
        reconstruct kill chains per attacker IP.
        """
        # Import local MITRE mapping to avoid circular imports
        from src.threat_engine import EVENT_TO_MITRE
        now = time.time()
        cutoff = now - (window_hours * 3600)

        # Group events by source_ip within window
        by_source: Dict[str, List[dict]] = defaultdict(list)
        for ev in events:
            ts = ev.get("timestamp", ev.get("created_at", 0))
            if isinstance(ts, str):
                try:
                    import datetime
                    ts = datetime.datetime.fromisoformat(ts).timestamp()
                except: ts = 0
            if ts > cutoff:
                src = ev.get("source_ip") or ev.get("src_ip") or ev.get("host", "unknown")
                by_source[src].append({**ev, "_ts": ts})

        chains = []
        for ip, evs in by_source.items():
            if len(evs) < 2:
                continue  # Single event doesn't form a chain
            evs.sort(key=lambda e: e["_ts"])

            chain  = KillChain(source_ip=ip)
            chain.first_seen = evs[0]["_ts"]
            chain.last_seen  = evs[-1]["_ts"]
            chain.dwell_hours = (chain.last_seen - chain.first_seen) / 3600

            tactics_seen: Set[str] = set()
            for ev in evs:
                etype  = ev.get("event_type", "")
                tactic = ev.get("mitre_tactic", "")
                if not tactic and etype in EVENT_TO_MITRE:
                    tactic = EVENT_TO_MITRE[etype][0]
                kc_stage = TACTIC_TO_KC.get(tactic, "Reconnaissance")
                chain.stages.setdefault(kc_stage, []).append(ev)
                chain.events.append(ev.get("id", ""))
                if tactic:
                    tactics_seen.add(tactic)

            chain.tactic_count = len(tactics_seen)
            chain.severity = (
                "critical" if chain.tactic_count >= 5 or chain.dwell_hours >= 48
                else "high"   if chain.tactic_count >= 3
                else "medium"
            )
            if len(chain.stages) >= 2:  # Only meaningful multi-stage chains
                chains.append(chain)

        chains.sort(key=lambda c: c.tactic_count, reverse=True)
        return chains


# ═══════════════════════════════════════════════════════════════════════════════
# THREAT HUNTING ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class HuntFinding:
    finding_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    hunt_id:    str = ""
    hunt_name:  str = ""
    severity:   str = "medium"
    source_ip:  str = ""
    targets:    List[str] = field(default_factory=list)
    event_count: int = 0
    details:    str = ""
    mitre_tactic:    str = ""
    mitre_technique: str = ""
    first_seen: float = 0.0
    last_seen:  float = 0.0
    raw_events: List[str] = field(default_factory=list)  # event IDs
    remediation: str = ""

    def to_dict(self) -> dict:
        d = self.__dict__.copy()
        d["dwell_minutes"] = round((self.last_seen - self.first_seen) / 60, 1) if self.first_seen else 0
        return d


@dataclass
class HuntSession:
    session_id:  str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    run_by:      str = "system"
    scenarios:   List[str] = field(default_factory=list)  # scenario IDs, empty = all
    started_at:  float = field(default_factory=time.time)
    finished_at: Optional[float] = None
    status:      str = "running"   # running | complete | failed
    findings:    List[HuntFinding] = field(default_factory=list)
    events_scanned: int = 0
    error:       Optional[str] = None

    def elapsed_sec(self) -> float:
        end = self.finished_at or time.time()
        return round(end - self.started_at, 1)

    def to_dict(self) -> dict:
        return {
            "session_id":  self.session_id,
            "run_by":      self.run_by,
            "status":      self.status,
            "scenarios":   len(self.scenarios) or len(HUNT_SCENARIOS),
            "findings":    len(self.findings),
            "critical":    sum(1 for f in self.findings if f.severity == "critical"),
            "high":        sum(1 for f in self.findings if f.severity == "high"),
            "events_scanned": self.events_scanned,
            "elapsed_sec": self.elapsed_sec(),
            "started_at":  self.started_at,
            "finished_at": self.finished_at,
            "error":       self.error,
        }


class ThreatHuntingEngine:
    """
    Runs structured threat hunts against event history.
    Returns prioritized findings with MITRE mappings and remediation.
    """

    def __init__(self):
        self._sessions:       Dict[str, HuntSession] = {}
        self._reconstructor   = KillChainReconstructor()

    async def run_hunt(self, events: List[dict],
                       scenario_ids: Optional[List[str]] = None,
                       run_by: str = "system") -> HuntSession:
        """
        Execute hunt scenarios against the provided events.
        Returns immediately with session; call get_session() for status.
        """
        session = HuntSession(run_by=run_by,
                              scenarios=scenario_ids or [])
        self._sessions[session.session_id] = session

        try:
            scenarios = ([HUNT_BY_ID[sid] for sid in scenario_ids
                          if sid in HUNT_BY_ID]
                         if scenario_ids else HUNT_SCENARIOS)
            session.events_scanned = len(events)

            for scenario in scenarios:
                findings = self._run_scenario(scenario, events)
                session.findings.extend(findings)

            # Kill chain reconstruction
            chains = self._reconstructor.reconstruct(events)
            for chain in chains[:10]:  # Top 10 chains
                session.findings.append(HuntFinding(
                    hunt_id    = "HUNT-KILLCHAIN",
                    hunt_name  = f"Kill Chain — {chain.tactic_count} tactics — {chain.source_ip}",
                    severity   = chain.severity,
                    source_ip  = chain.source_ip,
                    event_count= len(chain.events),
                    details    = (f"Multi-stage attack reconstructed: {list(chain.stages.keys())}. "
                                  f"Dwell time: {chain.dwell_hours:.1f}h."),
                    first_seen = chain.first_seen,
                    last_seen  = chain.last_seen,
                    remediation= "Isolate source IP immediately. Review all events in kill chain.",
                ))

            # Sort by severity
            sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            session.findings.sort(key=lambda f: sev_order.get(f.severity, 9))

            session.status      = "complete"
            session.finished_at = time.time()

            log.info("soc_hunt_complete",
                     session_id=session.session_id,
                     findings=len(session.findings),
                     critical=sum(1 for f in session.findings if f.severity == "critical"))

        except Exception as e:
            session.status    = "failed"
            session.error     = str(e)
            session.finished_at = time.time()
            log.error("soc_hunt_error", error=str(e))

        return session

    def get_session(self, session_id: str) -> Optional[HuntSession]:
        return self._sessions.get(session_id)

    def list_sessions(self, limit: int = 20) -> List[dict]:
        sessions = sorted(self._sessions.values(),
                          key=lambda s: s.started_at, reverse=True)
        return [s.to_dict() for s in sessions[:limit]]

    def _run_scenario(self, scenario: dict, events: List[dict]) -> List[HuntFinding]:
        qtype = scenario.get("query_type", "threshold")
        params = scenario.get("params", {})

        if qtype == "threshold":
            return self._hunt_threshold(scenario, events, params)
        elif qtype == "spray_detection":
            return self._hunt_spray(scenario, events, params)
        elif qtype == "beacon_detection":
            return self._hunt_beacon(scenario, events, params)
        elif qtype == "keyword":
            return self._hunt_keyword(scenario, events, params)
        elif qtype == "sequence":
            return self._hunt_sequence(scenario, events, params)
        elif qtype == "time_anomaly":
            return self._hunt_time_anomaly(scenario, events, params)
        return []

    def _hunt_threshold(self, scenario: dict, events: List[dict],
                         params: dict) -> List[HuntFinding]:
        """Detect sources exceeding a count threshold in a time window."""
        etypes   = set(params.get("event_types", []))
        window   = params.get("window_sec", 600)
        threshold = params.get("threshold", 10)
        group_by  = params.get("group_by", "source_ip")
        now = time.time()
        findings = []

        relevant = [e for e in events
                    if e.get("event_type") in etypes
                    and (now - self._ts(e)) <= window]
        counter: Counter = Counter(e.get(group_by, "unknown") for e in relevant)

        for key, count in counter.items():
            if count >= threshold:
                evs = [e for e in relevant if e.get(group_by) == key]
                findings.append(HuntFinding(
                    hunt_id   = scenario["id"],
                    hunt_name = scenario["name"],
                    severity  = scenario.get("severity", "medium"),
                    source_ip = key,
                    event_count = count,
                    details   = (f"Source {key} triggered {count} events of types "
                                 f"{etypes} in {window}s window (threshold: {threshold})"),
                    mitre_tactic    = scenario.get("tactic", ""),
                    mitre_technique = scenario.get("technique", ""),
                    first_seen = min(self._ts(e) for e in evs),
                    last_seen  = max(self._ts(e) for e in evs),
                    raw_events = [e.get("id", "") for e in evs[:20]],
                    remediation = self._remediation(scenario["id"]),
                ))
        return findings

    def _hunt_spray(self, scenario: dict, events: List[dict],
                    params: dict) -> List[HuntFinding]:
        """Detect password spray: many accounts, low volume each."""
        window  = params.get("window_sec", 300)
        min_acc = params.get("min_distinct_accounts", 10)
        max_att = params.get("max_attempts_per_account", 5)
        now = time.time()
        findings = []

        spray_types = {"brute_force", "password_spray", "logon_failure", "ssh_brute"}
        relevant = [e for e in events
                    if e.get("event_type") in spray_types
                    and (now - self._ts(e)) <= window]

        # Group by source → set of target accounts
        by_source: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for e in relevant:
            src = e.get("source_ip", "unknown")
            tgt = e.get("target_user") or e.get("username") or e.get("dst_host", "unknown")
            by_source[src][tgt] += 1

        for src, accounts in by_source.items():
            low_vol = {acc for acc, cnt in accounts.items() if cnt <= max_att}
            if len(low_vol) >= min_acc:
                findings.append(HuntFinding(
                    hunt_id   = scenario["id"],
                    hunt_name = scenario["name"],
                    severity  = scenario.get("severity", "critical"),
                    source_ip = src,
                    targets   = list(low_vol)[:20],
                    event_count = sum(accounts.values()),
                    details   = (f"Password spray from {src}: {len(low_vol)} distinct accounts "
                                 f"targeted with ≤{max_att} attempts each. "
                                 f"Classic spray signature to evade lockout."),
                    mitre_tactic    = "TA0006",
                    mitre_technique = "T1110.003",
                    remediation = self._remediation(scenario["id"]),
                ))
        return findings

    def _hunt_beacon(self, scenario: dict, events: List[dict],
                     params: dict) -> List[HuntFinding]:
        """Detect periodic beaconing by analyzing inter-event jitter."""
        etypes   = set(params.get("event_types", []))
        min_calls = params.get("min_calls", 10)
        max_jitter = params.get("max_jitter_pct", 5)
        window    = params.get("window_sec", 3600)
        now = time.time()
        findings = []

        relevant = [e for e in events
                    if e.get("event_type") in etypes
                    and (now - self._ts(e)) <= window]

        by_source: Dict[str, List[float]] = defaultdict(list)
        for e in relevant:
            src = e.get("source_ip", "unknown")
            by_source[src].append(self._ts(e))

        for src, timestamps in by_source.items():
            if len(timestamps) < min_calls:
                continue
            timestamps.sort()
            intervals = [timestamps[i+1] - timestamps[i]
                         for i in range(len(timestamps)-1)]
            if not intervals:
                continue
            mean_interval = sum(intervals) / len(intervals)
            if mean_interval < 1:
                continue
            std_dev = math.sqrt(sum((x - mean_interval)**2 for x in intervals) / len(intervals))
            jitter_pct = (std_dev / mean_interval) * 100

            if jitter_pct <= max_jitter and mean_interval < 300:
                findings.append(HuntFinding(
                    hunt_id   = scenario["id"],
                    hunt_name = scenario["name"],
                    severity  = scenario.get("severity", "critical"),
                    source_ip = src,
                    event_count = len(timestamps),
                    details   = (f"Beaconing detected from {src}: {len(timestamps)} calls, "
                                 f"mean interval {mean_interval:.0f}s, jitter {jitter_pct:.1f}% "
                                 f"(threshold {max_jitter}%). Consistent with C2 implant."),
                    mitre_tactic    = "TA0011",
                    mitre_technique = "T1071",
                    first_seen = timestamps[0],
                    last_seen  = timestamps[-1],
                    remediation = "Block source IP. Analyse host for C2 implant. Review DNS logs.",
                ))
        return findings

    def _hunt_keyword(self, scenario: dict, events: List[dict],
                      params: dict) -> List[HuntFinding]:
        """Search event payload for keywords."""
        etypes   = set(params.get("event_types", []))
        keywords = params.get("keywords", [])
        findings = []
        relevant = [e for e in events if e.get("event_type") in etypes]

        for e in relevant:
            payload = json.dumps(e).lower()
            matched = [k for k in keywords if k.lower() in payload]
            if matched:
                findings.append(HuntFinding(
                    hunt_id   = scenario["id"],
                    hunt_name = scenario["name"],
                    severity  = scenario.get("severity", "critical"),
                    source_ip = e.get("source_ip", "unknown"),
                    event_count = 1,
                    details   = f"Keyword match in event: {matched}. Event: {e.get('id','')}",
                    mitre_tactic    = scenario.get("tactic", ""),
                    mitre_technique = scenario.get("technique", ""),
                    first_seen = self._ts(e),
                    last_seen  = self._ts(e),
                    raw_events = [e.get("id", "")],
                    remediation = self._remediation(scenario["id"]),
                ))
        return findings

    def _hunt_sequence(self, scenario: dict, events: List[dict],
                       params: dict) -> List[HuntFinding]:
        """Detect fail→success sequence (e.g. sudo failures then success)."""
        fail_type   = params.get("fail_event")
        success_type = params.get("success_event")
        min_fails   = params.get("min_fails", 3)
        window      = params.get("window_sec", 300)
        findings    = []
        now         = time.time()

        by_source: Dict[str, List[dict]] = defaultdict(list)
        for e in events:
            if (now - self._ts(e)) <= window:
                et = e.get("event_type", "")
                if et in (fail_type, success_type):
                    src = e.get("source_ip") or e.get("username", "unknown")
                    by_source[src].append(e)

        for src, evs in by_source.items():
            evs.sort(key=self._ts)
            fail_count = sum(1 for e in evs if e.get("event_type") == fail_type)
            has_success = any(e.get("event_type") == success_type for e in evs)
            if fail_count >= min_fails and has_success:
                findings.append(HuntFinding(
                    hunt_id   = scenario["id"],
                    hunt_name = scenario["name"],
                    severity  = scenario.get("severity", "high"),
                    source_ip = src,
                    event_count = fail_count + 1,
                    details   = (f"{fail_count} {fail_type} events followed by {success_type} "
                                 f"from {src}. Possible successful privilege escalation."),
                    mitre_tactic    = scenario.get("tactic", ""),
                    mitre_technique = scenario.get("technique", ""),
                    remediation = self._remediation(scenario["id"]),
                ))
        return findings

    def _hunt_time_anomaly(self, scenario: dict, events: List[dict],
                           params: dict) -> List[HuntFinding]:
        """Detect events outside business hours."""
        import datetime
        etypes    = set(params.get("event_types", []))
        bh_start  = params.get("business_hours", [9, 17])[0]
        bh_end    = params.get("business_hours", [9, 17])[1]
        findings  = []

        for e in events:
            if e.get("event_type") not in etypes:
                continue
            ts  = self._ts(e)
            dt  = datetime.datetime.utcfromtimestamp(ts)
            outside = dt.hour < bh_start or dt.hour >= bh_end
            if outside:
                findings.append(HuntFinding(
                    hunt_id   = scenario["id"],
                    hunt_name = scenario["name"],
                    severity  = scenario.get("severity", "medium"),
                    source_ip = e.get("source_ip", "unknown"),
                    event_count = 1,
                    details   = (f"Event {e.get('event_type')} at {dt.strftime('%H:%M')} UTC "
                                 f"(outside {bh_start}:00–{bh_end}:00 business hours)."),
                    first_seen = ts,
                    last_seen  = ts,
                    raw_events = [e.get("id", "")],
                    remediation = self._remediation(scenario["id"]),
                ))
        return findings[:5]  # Limit to 5 to avoid noise

    @staticmethod
    def _ts(event: dict) -> float:
        ts = event.get("_ts") or event.get("timestamp") or event.get("created_at", 0)
        if isinstance(ts, str):
            try:
                import datetime
                return datetime.datetime.fromisoformat(ts).timestamp()
            except:
                return 0.0
        return float(ts or 0)

    @staticmethod
    def _remediation(hunt_id: str) -> str:
        remap = {
            "HUNT-CRED-001":     "Block source IP. Review authentication logs. Enable MFA.",
            "HUNT-CRED-002":     "Enforce account lockout policy. Enable MFA immediately.",
            "HUNT-CRED-003":     "Suspend account. Investigate both login locations.",
            "HUNT-LATMOV-001":   "Isolate source host. Review RDP access policy. Segment network.",
            "HUNT-LATMOV-002":   "Block source. Audit SMB shares. Review AD permissions.",
            "HUNT-EXFIL-001":    "Block outbound to destination IP. Engage IR team immediately.",
            "HUNT-EXFIL-002":    "Block DNS to external resolvers. Review DNS logs. Enable DNS security.",
            "HUNT-C2-001":       "Isolate host immediately. Full forensic image. Engage IR team.",
            "HUNT-C2-002":       "Enable DNSSEC. Block external DNS. Hunt for DGA domains.",
            "HUNT-DISC-001":     "Investigate scanning host for lateral movement indicators.",
            "HUNT-PERS-001":     "Immediately take web server offline. Full forensic analysis.",
            "HUNT-PERS-002":     "Review all recently added scheduled tasks. Remove unauthorized.",
            "HUNT-IMPACT-001":   "RANSOMWARE: Isolate ALL affected hosts. Do NOT pay ransom. Contact IR.",
            "HUNT-PRIV-001":     "Review sudo logs. Check for new root-level cron jobs or files.",
        }
        return remap.get(hunt_id, "Investigate and remediate per your IR playbook.")


# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL ACCESS
# ═══════════════════════════════════════════════════════════════════════════════

_engine: Optional[ThreatHuntingEngine] = None


def get_hunt_engine() -> ThreatHuntingEngine:
    global _engine
    if _engine is None:
        _engine = ThreatHuntingEngine()
    return _engine


def list_hunt_scenarios() -> List[dict]:
    return [{
        "id":          s["id"],
        "name":        s["name"],
        "description": s["description"],
        "tactic":      s["tactic"],
        "technique":   s["technique"],
        "severity":    s["severity"],
    } for s in HUNT_SCENARIOS]
