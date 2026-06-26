# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — Incident Manager
Full NIST SP 800-61 incident response lifecycle:
  Preparation → Detection → Analysis → Containment → Eradication → Recovery → Lessons Learned

Every alert from any monitor can open an Incident.
Incidents are correlated: multiple alerts about same host = one Incident.

SOAR Playbooks (auto-executed per incident type):
  malware_infection     → isolate host + quarantine file + kill process + alert team
  data_exfiltration     → block IP + capture traffic + preserve evidence + alert
  brute_force           → block source IP + lock account + alert
  ransomware            → network isolation + snapshot + kill processes + alert team
  deception_triggered   → capture attacker + forensic snapshot + alert
  lateral_movement      → segment network + trace path + alert
  c2_communication      → block C2 domain/IP + kill process + alert
  insider_threat        → disable account + capture session + escalate
  zero_day_exploit      → block exploit vector + emergency patch alert + escalate

Incident severity calculated from confidence + threat_type + asset_criticality.
MTTR (mean-time-to-respond) tracked per incident type.
"""
from __future__ import annotations

import asyncio, json, logging, os, time, uuid
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, List, Optional, Set
from pathlib import Path
from src.database import get_db

log = logging.getLogger("guardian.incident")

DATA_DIR     = Path(os.environ.get("GUARDIAN_DATA_DIR", "/guardian/data"))
INCIDENT_DB  = DATA_DIR / "incidents.json"

# ─────────────────────────────────────────────────────────────────────────────
# Enums & Data Models
# ─────────────────────────────────────────────────────────────────────────────

class IncidentStatus(str, Enum):
    OPEN         = "open"
    INVESTIGATING= "investigating"
    CONTAINED    = "contained"
    ERADICATING  = "eradicating"
    RECOVERING   = "recovering"
    CLOSED       = "closed"
    FALSE_POSITIVE = "false_positive"


class IncidentSeverity(str, Enum):
    CRITICAL = "critical"   # CVSS ≥ 9.0 | confidence ≥ 0.90 | ransomware/zero-day
    HIGH     = "high"       # confidence ≥ 0.75 | malware | data exfil
    MEDIUM   = "medium"     # confidence ≥ 0.55 | suspicious behavior
    LOW      = "low"        # confidence < 0.55 | anomaly
    INFO     = "info"       # informational


class PlaybookStep(str, Enum):
    ISOLATE_HOST     = "isolate_host"
    BLOCK_IP         = "block_ip"
    BLOCK_DOMAIN     = "block_domain"
    QUARANTINE_FILE  = "quarantine_file"
    KILL_PROCESS     = "kill_process"
    DISABLE_ACCOUNT  = "disable_account"
    CAPTURE_FORENSICS= "capture_forensics"
    SNAPSHOT_DISK    = "snapshot_disk"
    ALERT_TEAM       = "alert_team"
    ESCALATE         = "escalate"
    PRESERVE_EVIDENCE= "preserve_evidence"
    NETWORK_SEGMENT  = "network_segment"
    PATCH_ADVISORY   = "patch_advisory"


@dataclass
class IncidentEvent:
    ts:           float
    source:       str    # which monitor generated this
    event_type:   str
    target:       str
    verdict:      str
    confidence:   float
    threat_type:  str
    indicators:   List[str]
    node_id:      str
    raw:          dict  = field(default_factory=dict)


@dataclass
class PlaybookAction:
    step:       str
    status:     str     # "pending" | "running" | "done" | "failed" | "skipped"
    detail:     str     = ""
    ts:         float   = field(default_factory=time.time)
    result:     dict    = field(default_factory=dict)


@dataclass
class Incident:
    id:           str
    title:        str
    severity:     str
    status:       str
    threat_types: Set[str]
    affected_nodes: Set[str]
    affected_assets: Set[str]
    events:       List[IncidentEvent]
    playbook_actions: List[PlaybookAction]
    opened_at:    float
    updated_at:   float
    closed_at:    Optional[float]      = None
    assigned_to:  str                  = ""
    notes:        str                  = ""
    false_positive: bool               = False
    mttr_sec:     Optional[float]      = None

    def to_dict(self) -> dict:
        d = asdict(self)
        d["threat_types"]     = list(self.threat_types)
        d["affected_nodes"]   = list(self.affected_nodes)
        d["affected_assets"]  = list(self.affected_assets)
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "Incident":
        d = dict(d)
        d["events"]           = [IncidentEvent(**e) for e in d.get("events", [])]
        d["playbook_actions"] = [PlaybookAction(**a) for a in d.get("playbook_actions", [])]
        d["threat_types"]     = set(d.get("threat_types", []))
        d["affected_nodes"]   = set(d.get("affected_nodes", []))
        d["affected_assets"]  = set(d.get("affected_assets", []))
        return cls(**d)


# ─────────────────────────────────────────────────────────────────────────────
# Playbook Definitions
# ─────────────────────────────────────────────────────────────────────────────

PLAYBOOKS: Dict[str, List[str]] = {
    "malware_infection": [
        PlaybookStep.KILL_PROCESS, PlaybookStep.QUARANTINE_FILE,
        PlaybookStep.CAPTURE_FORENSICS, PlaybookStep.ALERT_TEAM,
        PlaybookStep.PRESERVE_EVIDENCE,
    ],
    "ransomware": [
        PlaybookStep.KILL_PROCESS, PlaybookStep.ISOLATE_HOST,
        PlaybookStep.SNAPSHOT_DISK, PlaybookStep.QUARANTINE_FILE,
        PlaybookStep.ALERT_TEAM, PlaybookStep.ESCALATE,
        PlaybookStep.PRESERVE_EVIDENCE,
    ],
    "data_exfiltration": [
        PlaybookStep.BLOCK_IP, PlaybookStep.KILL_PROCESS,
        PlaybookStep.CAPTURE_FORENSICS, PlaybookStep.PRESERVE_EVIDENCE,
        PlaybookStep.ALERT_TEAM, PlaybookStep.ESCALATE,
    ],
    "brute_force": [
        PlaybookStep.BLOCK_IP, PlaybookStep.DISABLE_ACCOUNT,
        PlaybookStep.ALERT_TEAM,
    ],
    "deception_triggered": [
        PlaybookStep.KILL_PROCESS, PlaybookStep.CAPTURE_FORENSICS,
        PlaybookStep.BLOCK_IP, PlaybookStep.PRESERVE_EVIDENCE,
        PlaybookStep.ALERT_TEAM, PlaybookStep.ESCALATE,
    ],
    "c2_communication": [
        PlaybookStep.BLOCK_DOMAIN, PlaybookStep.BLOCK_IP,
        PlaybookStep.KILL_PROCESS, PlaybookStep.CAPTURE_FORENSICS,
        PlaybookStep.ALERT_TEAM,
    ],
    "lateral_movement": [
        PlaybookStep.NETWORK_SEGMENT, PlaybookStep.BLOCK_IP,
        PlaybookStep.CAPTURE_FORENSICS, PlaybookStep.ALERT_TEAM,
        PlaybookStep.ESCALATE,
    ],
    "insider_threat": [
        PlaybookStep.DISABLE_ACCOUNT, PlaybookStep.PRESERVE_EVIDENCE,
        PlaybookStep.CAPTURE_FORENSICS, PlaybookStep.ESCALATE,
    ],
    "zero_day_exploit": [
        PlaybookStep.ISOLATE_HOST, PlaybookStep.CAPTURE_FORENSICS,
        PlaybookStep.PATCH_ADVISORY, PlaybookStep.ESCALATE,
        PlaybookStep.PRESERVE_EVIDENCE, PlaybookStep.ALERT_TEAM,
    ],
    "behavioral_anomaly": [
        PlaybookStep.CAPTURE_FORENSICS, PlaybookStep.ALERT_TEAM,
    ],
    "default": [
        PlaybookStep.CAPTURE_FORENSICS, PlaybookStep.ALERT_TEAM,
    ],
}

# Threat type → severity mapping
THREAT_SEVERITY: Dict[str, str] = {
    "ransomware":         IncidentSeverity.CRITICAL,
    "zero_day_exploit":   IncidentSeverity.CRITICAL,
    "deception_triggered":IncidentSeverity.CRITICAL,
    "rootkit":            IncidentSeverity.CRITICAL,
    "data_exfiltration":  IncidentSeverity.HIGH,
    "c2_communication":   IncidentSeverity.HIGH,
    "malware_infection":  IncidentSeverity.HIGH,
    "lateral_movement":   IncidentSeverity.HIGH,
    "insider_threat":     IncidentSeverity.HIGH,
    "brute_force":        IncidentSeverity.MEDIUM,
    "dns_tunneling":      IncidentSeverity.MEDIUM,
    "behavioral_anomaly": IncidentSeverity.MEDIUM,
    "dga_suspect":        IncidentSeverity.MEDIUM,
    "honeypot_connection":IncidentSeverity.LOW,
}


def _calc_severity(threat_type: str, confidence: float) -> str:
    base = THREAT_SEVERITY.get(threat_type, IncidentSeverity.LOW)
    # Upgrade severity if confidence is very high
    order = [IncidentSeverity.INFO, IncidentSeverity.LOW,
             IncidentSeverity.MEDIUM, IncidentSeverity.HIGH, IncidentSeverity.CRITICAL]
    idx   = order.index(base)
    if confidence >= 0.95 and idx < 4:
        idx += 1
    elif confidence < 0.50 and idx > 0:
        idx -= 1
    return order[idx]


# ─────────────────────────────────────────────────────────────────────────────
# IncidentManager
# ─────────────────────────────────────────────────────────────────────────────

class IncidentManager:
    def __init__(self):
        self._node_id   = os.environ.get("GUARDIAN_NODE_ID", "core")
        self._running   = False
        self._incidents: Dict[str, Incident] = {}
        self._dirty     = False
        # correlation window: same host + same threat_type within N seconds = same incident
        self._correlation_window = 300   # 5 minutes
        self._mttr_data: Dict[str, List[float]] = {}

    async def start(self) -> None:
        self._running = True
        self._load()
        asyncio.create_task(self._save_loop())
        asyncio.create_task(self._escalation_loop())
        log.info(f"Incident Manager started: {len(self._incidents)} incidents loaded")

    async def stop(self) -> None:
        self._running = False
        self._save()

    # ── Public: Create / Update Incident ─────────────────────────────────────

    async def ingest_alert(
        self,
        source:      str,
        event_type:  str,
        target:      str,
        verdict:     str,
        confidence:  float,
        threat_type: str,
        indicators:  List[str],
        node_id:     str      = "",
        raw:         dict     = None,
    ) -> Optional[Incident]:
        """
        Ingest an alert from any monitor. Returns the Incident (new or existing).
        Returns None if alert doesn't meet threshold (confidence < 0.40 for non-malicious).
        """
        if verdict not in ("malicious", "suspicious") and confidence < 0.40:
            return None

        event = IncidentEvent(
            ts=time.time(), source=source, event_type=event_type,
            target=target, verdict=verdict, confidence=confidence,
            threat_type=threat_type, indicators=indicators,
            node_id=node_id or self._node_id, raw=raw or {},
        )

        # Correlation: check if existing open incident covers this
        existing = self._correlate(event)
        if existing:
            existing.events.append(event)
            existing.threat_types.add(threat_type)
            existing.affected_assets.add(target)
            existing.affected_nodes.add(node_id or self._node_id)
            existing.updated_at = time.time()
            # Escalate severity if new event is worse
            new_sev = _calc_severity(threat_type, confidence)
            if self._severity_order(new_sev) > self._severity_order(existing.severity):
                existing.severity = new_sev
                log.warning(f"🔺 Incident {existing.id} escalated to {new_sev}")
            self._dirty = True
            log.info(f"Alert correlated → Incident {existing.id} ({existing.severity})")
            return existing

        # New incident
        sev     = _calc_severity(threat_type, confidence)
        inc_id  = f"INC-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
        title   = self._gen_title(threat_type, target, verdict)
        playbook_steps = PLAYBOOKS.get(threat_type, PLAYBOOKS["default"])

        incident = Incident(
            id=inc_id, title=title, severity=sev,
            status=IncidentStatus.OPEN,
            threat_types={threat_type},
            affected_nodes={node_id or self._node_id},
            affected_assets={target},
            events=[event],
            playbook_actions=[
                PlaybookAction(step=s, status="pending") for s in playbook_steps
            ],
            opened_at=time.time(), updated_at=time.time(), closed_at=None,
        )
        self._incidents[inc_id] = incident
        self._dirty = True

        log.warning(f"🚨 NEW INCIDENT {inc_id} | {sev.upper()} | {title}")

        # Broadcast to WebSocket clients
        try:
            from src.websocket_hub import get_hub
            asyncio.create_task(get_hub().broadcast("incident.new", {
                "incident_id": inc_id, "title": title, "severity": sev,
                "threat_type": threat_type, "target": target, "node_id": node_id,
            }))
        except Exception:
            pass

        # Tier 2: build attack graph node for this incident
        try:
            from src.attack_graph import get_attack_graph
            asyncio.create_task(get_attack_graph().add_event_to_graph(
                incident_id=inc_id, node_id=node_id,
                entity=target, entity_type="event",
                technique="", tactic=threat_type,
                severity=sev,
            ))
        except Exception:
            pass

        # Tier 2: publish to Redis so other Core instances know
        try:
            from src.database_distributed import get_redis, get_db_mode
            if get_db_mode() == "distributed":
                redis = await get_redis()
                if redis:
                    await redis.publish("guardian:alerts", {
                        "incident_id": inc_id, "title": title, "severity": sev,
                        "threat_type": threat_type, "target": target,
                        "node_id": node_id, "source": source,
                    })
        except Exception:
            pass

        # Send alert via alerting engine
        try:
            from src.alerting import get_alerting
            alert_body = (f"Threat: {threat_type}\nTarget: {target}\n"
                         f"Node: {node_id or self._node_id}\nConfidence: {confidence:.0%}\n"
                         f"Indicators: {', '.join(indicators[:3])}")
            asyncio.create_task(get_alerting().send_alert(
                title=title, body=alert_body,
                severity=sev, event_type=threat_type,
                target=target, incident_id=inc_id,
                node_name=os.environ.get("GUARDIAN_NODE_NAME",""),
            ))
        except Exception:
            pass

        # Forward to SIEM
        try:
            from src.siem_forwarder import get_siem
            asyncio.create_task(get_siem().forward("incident.new", {
                "incident_id": inc_id, "title": title, "severity": sev,
                "threat_type": threat_type, "target": target,
                "confidence": confidence, "indicators": indicators[:5],
            }, severity=sev))
        except Exception:
            pass

        # Auto-execute playbook for critical/high severity
        if sev in (IncidentSeverity.CRITICAL, IncidentSeverity.HIGH):
            asyncio.create_task(self._execute_playbook(incident))

        # Log to DB
        try:
            db = await get_db()
            await db.log_scan(
                self._node_id, "incident_manager", target,
                verdict=verdict, confidence=confidence,
                threat_type=threat_type,
                indicators=[f"incident:{inc_id}", f"severity:{sev}"] + indicators[:5],
                method="incident_manager",
            )
        except Exception:
            pass

        return incident

    def get_incident(self, inc_id: str) -> Optional[Incident]:
        return self._incidents.get(inc_id)

    def list_incidents(self, status: str = "", severity: str = "",
                       limit: int = 100) -> List[dict]:
        incs = list(self._incidents.values())
        if status:
            incs = [i for i in incs if i.status == status]
        if severity:
            incs = [i for i in incs if i.severity == severity]
        incs.sort(key=lambda i: i.updated_at, reverse=True)
        return [i.to_dict() for i in incs[:limit]]

    def update_incident(self, inc_id: str, status: str = None,
                         assigned_to: str = None, notes: str = None,
                         false_positive: bool = None) -> Optional[dict]:
        inc = self._incidents.get(inc_id)
        if not inc:
            return None
        if status:
            inc.status  = status
            if status == IncidentStatus.CLOSED:
                inc.closed_at = time.time()
                inc.mttr_sec  = inc.closed_at - inc.opened_at
                self._record_mttr(inc)
        if assigned_to is not None:
            inc.assigned_to = assigned_to
        if notes is not None:
            inc.notes = notes
        if false_positive is not None:
            inc.false_positive = false_positive
            if false_positive:
                inc.status = IncidentStatus.FALSE_POSITIVE
        inc.updated_at = time.time()
        self._dirty    = True
        return inc.to_dict()

    # ── Playbook Execution ────────────────────────────────────────────────────

    async def _execute_playbook(self, incident: Incident) -> None:
        """Execute SOAR playbook steps for this incident."""
        log.info(f"▶️ Executing playbook for {incident.id} ({incident.severity})")
        incident.status = IncidentStatus.INVESTIGATING

        for action in incident.playbook_actions:
            if action.status != "pending":
                continue
            action.status = "running"
            action.ts     = time.time()
            try:
                result = await self._run_step(action.step, incident)
                action.status = "done"
                action.result = result
                action.detail = result.get("detail", "")
            except Exception as e:
                action.status = "failed"
                action.detail = str(e)
                log.warning(f"Playbook step {action.step} failed for {incident.id}: {e}")
            self._dirty = True
            await asyncio.sleep(0.2)   # don't flood the system

        incident.status   = IncidentStatus.CONTAINED
        incident.updated_at = time.time()
        self._dirty       = True
        log.info(f"✅ Playbook complete for {incident.id}")

    async def _run_step(self, step: str, incident: Incident) -> dict:
        """Execute a single playbook step."""
        # Gather targets from incident events
        ips     = [e.target for e in incident.events if self._is_ip(e.target)]
        files   = [e.target for e in incident.events if "/" in e.target or "\\" in e.target]
        domains = [e.target for e in incident.events if "." in e.target and not self._is_ip(e.target)]
        pids    = []
        for e in incident.events:
            for ind in e.indicators:
                if ind.startswith("pid:"):
                    try: pids.append(int(ind.split(":")[1]))
                    except: pass

        try:
            from src.core import GuardianCore
            core = GuardianCore.get()

            if step == PlaybookStep.KILL_PROCESS:
                results = []
                for pid in pids[:5]:   # max 5 kills per incident
                    r = core.response.kill_process(pid, "incident_playbook", f"incident:{incident.id}")
                    results.append(r)
                return {"detail": f"Killed {len(results)} processes", "results": results}

            elif step == PlaybookStep.QUARANTINE_FILE:
                results = []
                for fp in files[:10]:
                    r = core.response.quarantine_file(fp, incident.id, max(
                        e.confidence for e in incident.events))
                    results.append(r)
                return {"detail": f"Quarantined {len(results)} files", "results": results}

            elif step == PlaybookStep.BLOCK_IP:
                results = []
                for ip in ips[:20]:
                    r = core.response.block_ip(ip, f"incident:{incident.id}")
                    results.append(r)
                return {"detail": f"Blocked {len(results)} IPs", "results": results}

            elif step == PlaybookStep.BLOCK_DOMAIN:
                # Add domains to DNS blackhole (update /etc/hosts or dnsmasq)
                count = 0
                for domain in domains[:20]:
                    try:
                        with open("/etc/hosts", "a") as f:
                            f.write(f"0.0.0.0 {domain}  # guardian:{incident.id}\n")
                        count += 1
                    except Exception:
                        pass
                return {"detail": f"Blocked {count} domains via /etc/hosts"}

            elif step == PlaybookStep.CAPTURE_FORENSICS:
                # Write forensic snapshot to disk
                snapshot_path = DATA_DIR / f"forensics/{incident.id}.json"
                snapshot_path.parent.mkdir(parents=True, exist_ok=True)
                snapshot = {
                    "incident_id": incident.id, "ts": time.time(),
                    "events": [asdict(e) for e in incident.events],
                    "affected_assets": list(incident.affected_assets),
                    "affected_nodes": list(incident.affected_nodes),
                }
                snapshot_path.write_text(json.dumps(snapshot, indent=2))
                return {"detail": f"Forensics saved: {snapshot_path}"}

            elif step == PlaybookStep.ALERT_TEAM:
                # Report to dashboard
                await self._report_to_dashboard(incident)
                return {"detail": "Team alerted via dashboard"}

            elif step == PlaybookStep.ESCALATE:
                incident.severity = IncidentSeverity.CRITICAL
                await self._report_to_dashboard(incident)
                return {"detail": "Escalated to CRITICAL, team notified"}

            elif step == PlaybookStep.PRESERVE_EVIDENCE:
                # Flush DB logs for this incident to disk
                db = await get_db()
                events = await db.get_scan_history(limit=500)
                rel    = [e for e in events if any(
                    t in str(e) for t in incident.affected_assets)]
                ev_path = DATA_DIR / f"evidence/{incident.id}.json"
                ev_path.parent.mkdir(parents=True, exist_ok=True)
                ev_path.write_text(json.dumps(rel[:100], indent=2))
                return {"detail": f"Evidence preserved: {ev_path}"}

            elif step == PlaybookStep.DISABLE_ACCOUNT:
                usernames = [e.target for e in incident.events if e.source == "ueba"]
                disabled  = []
                for user in usernames[:5]:
                    try:
                        import subprocess
                        subprocess.run(["usermod", "--lock", user],
                                       check=False, capture_output=True)
                        disabled.append(user)
                    except Exception: pass
                return {"detail": f"Disabled accounts: {disabled}"}

            elif step == PlaybookStep.PATCH_ADVISORY:
                return {"detail": "Patch advisory logged — review CVE dashboard"}

            elif step == PlaybookStep.ISOLATE_HOST:
                # Block all traffic except from management IP
                mgmt_ip = os.environ.get("GUARDIAN_MGMT_IP", "")
                cmds_run = []
                try:
                    import subprocess as _sp
                    # Default-deny all, allow only management
                    _sp.run(["iptables", "-P", "INPUT", "DROP"], check=False, capture_output=True)
                    _sp.run(["iptables", "-P", "FORWARD", "DROP"], check=False, capture_output=True)
                    _sp.run(["iptables", "-A", "INPUT", "-i", "lo", "-j", "ACCEPT"], check=False, capture_output=True)
                    if mgmt_ip:
                        _sp.run(["iptables", "-A", "INPUT", "-s", mgmt_ip, "-j", "ACCEPT"], check=False, capture_output=True)
                    cmds_run.append("iptables isolation applied")
                except Exception as iso_e:
                    cmds_run.append(f"isolation partial: {iso_e}")
                return {"detail": f"Host isolation attempted: {cmds_run}"}

            elif step == PlaybookStep.SNAPSHOT_DISK:
                # Write disk snapshot manifest (full LVM snapshot requires root + LVM)
                snap_path = DATA_DIR / f"snapshots/{incident.id}_manifest.txt"
                snap_path.parent.mkdir(parents=True, exist_ok=True)
                import subprocess as _sp
                try:
                    lsblk = _sp.run(["lsblk", "-J"], capture_output=True, text=True, timeout=5)
                    df    = _sp.run(["df", "-h"],   capture_output=True, text=True, timeout=5)
                    snap_path.write_text(
                        "# Disk Snapshot Manifest - Incident " + incident.id + "\n"
                        "# Timestamp: " + str(time.time()) + "\n\n"
                        "## Block Devices:\n" + lsblk.stdout + "\n\n"
                        "## Disk Usage:\n" + df.stdout
                    )
                    return {"detail": f"Disk manifest saved: {snap_path}"}
                except Exception as snap_e:
                    return {"detail": f"Snapshot manifest partial: {snap_e}"}

            elif step == PlaybookStep.NETWORK_SEGMENT:
                # Block lateral movement via iptables FORWARD rules
                results = []
                for ip in ips[:10]:
                    r = core.response.block_ip(ip, f"lateral_block:{incident.id}", "both")
                    results.append(r)
                return {"detail": f"Network segmented for {len(results)} IPs"}

        except Exception as e:
            return {"detail": f"Step error: {e}", "error": str(e)}

        return {"detail": f"Step {step} executed"}

    # ── Correlation ───────────────────────────────────────────────────────────

    def _correlate(self, event: IncidentEvent) -> Optional[Incident]:
        """Find existing open incident to correlate this event into."""
        now = time.time()
        for inc in self._incidents.values():
            if inc.status in (IncidentStatus.CLOSED, IncidentStatus.FALSE_POSITIVE):
                continue
            if now - inc.updated_at > self._correlation_window * 6:
                continue   # too old to correlate
            # Same node + same threat type within window
            if (event.node_id in inc.affected_nodes
                    and event.threat_type in inc.threat_types
                    and now - inc.updated_at < self._correlation_window):
                return inc
            # Same target asset
            if event.target in inc.affected_assets:
                return inc
        return None

    # ── Escalation loop ───────────────────────────────────────────────────────

    async def _escalation_loop(self) -> None:
        """Auto-escalate incidents that stay open too long."""
        SLA_MINUTES = {
            IncidentSeverity.CRITICAL: 15,
            IncidentSeverity.HIGH:     60,
            IncidentSeverity.MEDIUM:   240,
            IncidentSeverity.LOW:      1440,
        }
        while self._running:
            await asyncio.sleep(300)   # check every 5 minutes
            now = time.time()
            for inc in self._incidents.values():
                if inc.status in (IncidentStatus.CLOSED, IncidentStatus.FALSE_POSITIVE):
                    continue
                sla_min  = SLA_MINUTES.get(inc.severity, 60)
                age_min  = (now - inc.opened_at) / 60
                if age_min > sla_min and inc.status != IncidentStatus.CONTAINED:
                    log.warning(f"⏰ SLA BREACH: Incident {inc.id} open {age_min:.0f}min "
                                f"(SLA={sla_min}min) severity={inc.severity}")
                    await self._report_to_dashboard(inc)
                    inc.updated_at = now
                    self._dirty    = True

    # ── Dashboard reporting ───────────────────────────────────────────────────

    async def _report_to_dashboard(self, incident: Incident) -> None:
        try:
            from src.config.settings import get_config
            import src.reporter as rep
            cfg = get_config()
            if cfg.license_validate_url and cfg.license_key:
                dashboard_url = cfg.license_validate_url.replace("/api/license-validate", "")
                asyncio.create_task(rep.report_alert(
                    dashboard_url, cfg.license_key,
                    node_id=self._node_id, node_name=os.environ.get("GUARDIAN_NODE_NAME",""),
                    alert_type="incident",
                    verdict="malicious" if incident.severity in
                            (IncidentSeverity.CRITICAL, IncidentSeverity.HIGH) else "suspicious",
                    confidence=max((e.confidence for e in incident.events), default=0.8),
                    threat_type=",".join(incident.threat_types),
                    indicators=[f"incident:{incident.id}", f"severity:{incident.severity}"],
                    method="incident_manager",
                    target=",".join(list(incident.affected_assets)[:3]),
                    raw_data=incident.to_dict(),
                ))
        except Exception:
            pass

    # ── Analytics ─────────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        incs   = list(self._incidents.values())
        open_i = [i for i in incs if i.status not in (IncidentStatus.CLOSED,
                                                        IncidentStatus.FALSE_POSITIVE)]
        by_sev = {}
        for s in IncidentSeverity:
            by_sev[s.value] = sum(1 for i in open_i if i.severity == s.value)
        mttr   = {t: round(sum(v)/len(v), 1) for t, v in self._mttr_data.items() if v}
        return {
            "total":         len(incs),
            "open":          len(open_i),
            "closed":        sum(1 for i in incs if i.status == IncidentStatus.CLOSED),
            "false_positive":sum(1 for i in incs if i.status == IncidentStatus.FALSE_POSITIVE),
            "by_severity":   by_sev,
            "mean_mttr_sec": mttr,
        }

    # ── Persistence ───────────────────────────────────────────────────────────

    def _load(self) -> None:
        if INCIDENT_DB.exists():
            try:
                data = json.loads(INCIDENT_DB.read_text())
                self._incidents = {k: Incident.from_dict(v) for k, v in data.items()}
            except Exception as e:
                log.warning(f"Incident DB load error: {e}")

    def _save(self) -> None:
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            INCIDENT_DB.write_text(json.dumps(
                {k: v.to_dict() for k, v in self._incidents.items()}, indent=2
            ))
        except Exception as e:
            log.debug(f"Incident save error: {e}")

    async def _save_loop(self) -> None:
        while self._running:
            await asyncio.sleep(60)
            if self._dirty:
                self._save(); self._dirty = False

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _is_ip(s: str) -> bool:
        import re
        return bool(re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", s))

    @staticmethod
    def _gen_title(threat_type: str, target: str, verdict: str) -> str:
        titles = {
            "ransomware":          f"🔴 Ransomware detected on {target}",
            "malware_infection":   f"🦠 Malware infection: {target}",
            "data_exfiltration":   f"📤 Data exfiltration from {target}",
            "brute_force":         f"🔨 Brute-force attack from {target}",
            "deception_triggered": f"🎣 Deception artifact triggered by {target}",
            "c2_communication":    f"📡 C2 communication: {target}",
            "lateral_movement":    f"↔️ Lateral movement via {target}",
            "insider_threat":      f"👤 Insider threat: {target}",
            "zero_day_exploit":    f"💥 Zero-day exploit on {target}",
            "behavioral_anomaly":  f"⚠️ Behavioral anomaly: {target}",
            "rootkit":             f"🔩 Rootkit detected on {target}",
        }
        return titles.get(threat_type, f"Security incident: {verdict} — {target}")

    @staticmethod
    def _severity_order(sev: str) -> int:
        return [IncidentSeverity.INFO, IncidentSeverity.LOW, IncidentSeverity.MEDIUM,
                IncidentSeverity.HIGH, IncidentSeverity.CRITICAL].index(sev)

    def _record_mttr(self, incident: Incident) -> None:
        for tt in incident.threat_types:
            self._mttr_data.setdefault(tt, []).append(incident.mttr_sec)
            if len(self._mttr_data[tt]) > 100:
                self._mttr_data[tt] = self._mttr_data[tt][-100:]
