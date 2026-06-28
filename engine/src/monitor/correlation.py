# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — Cross-Node Threat Correlation Engine
Correlates events across multiple Guardian nodes untuk deteksi:
  - APT (Advanced Persistent Threat): attacker diam-diam di multiple nodes
  - Lateral movement: attacker pindah dari node A ke node B
  - Coordinated attack: sama IP/domain menyerang multiple nodes bersamaan
  - Kill chain: serangkaian events yang membentuk serangan lengkap

Uses MITRE ATT&CK to chain events into attack stories.
Stores correlations in local DB, reports critical findings to Dashboard.
"""
from __future__ import annotations
import asyncio, json, logging, os, time
from collections import defaultdict
from typing import Dict, List
from src.database import get_db
import src.reporter as reporter

log = logging.getLogger("guardian.correlation")

# MITRE ATT&CK kill chain stages in order
KILL_CHAIN = [
    "reconnaissance", "initial_access", "execution", "persistence",
    "privilege_escalation", "defense_evasion", "credential_access",
    "discovery", "lateral_movement", "collection", "command_and_control",
    "exfiltration", "impact"
]

# MITRE tactics per threat type (from database.py MITRE_MAP)
THREAT_TO_TACTIC = {
    "php_webshell":       "initial_access",
    "exploit_tool":       "execution",
    "process_injection":  "privilege_escalation",
    "ransomware":         "impact",
    "backdoor":           "persistence",
    "reverse_shell":      "command_and_control",
    "data_exfil":         "exfiltration",
    "privilege_esc":      "privilege_escalation",
    "network_scan":       "discovery",
    "credential_theft":   "credential_access",
    "lateral_movement":   "lateral_movement",
    "packed_malware":     "defense_evasion",
    "cryptominer":        "impact",
    "keylogger":          "collection",
    "known_malicious_ip": "command_and_control",
}


class CorrelationEngine:
    def __init__(self):
        self._node_id  = os.environ.get("GUARDIAN_NODE_ID","core")
        self._running  = False
        # In-memory windows: IP → [events], node → [events]
        self._ip_events:   Dict[str, List] = defaultdict(list)
        self._node_events: Dict[str, List] = defaultdict(list)
        self._attack_chains: Dict[str, dict] = {}  # chain_id → state

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._correlation_loop())
        log.info("Correlation engine started")

    async def stop(self) -> None:
        self._running = False

    async def _correlation_loop(self) -> None:
        while self._running:
            try:
                await self._run_correlations()
            except Exception as e:
                log.debug(f"Correlation error: {e}")
            await asyncio.sleep(300)  # Every 5 minutes

    async def _run_correlations(self) -> None:
        db  = await get_db()
        now = time.time()

        # Get recent events (last 6 hours)
        events = await db.get_scan_history(limit=500, verdict="")
        events = [e for e in events if (now - (e.get("ts") or 0)) < 21600]

        if len(events) < 3:
            return

        findings = []

        # ── 1. Multi-node same source IP ─────────────────────────────────────
        # Same malicious IP hitting multiple nodes = coordinated attack
        ip_node_map: Dict[str, set] = defaultdict(set)
        for e in events:
            if e.get("scan_type") == "ip" and e.get("verdict") in ("malicious","suspicious"):
                ip_node_map[e["target"]].add(e["node_id"])
        for ip, nodes in ip_node_map.items():
            if len(nodes) >= 2:
                findings.append({
                    "type":        "coordinated_attack",
                    "description": f"IP {ip} attacked {len(nodes)} nodes simultaneously",
                    "confidence":  0.90,
                    "nodes":       list(nodes),
                    "ioc":         ip,
                })

        # ── 2. Kill chain detection per node ────────────────────────────────
        # Group events by node, check if multiple kill chain stages covered
        node_tactics: Dict[str, set] = defaultdict(set)
        for e in events:
            ttype  = e.get("threat_type","")
            tactic = THREAT_TO_TACTIC.get(ttype,"")
            if tactic:
                node_tactics[e["node_id"]].add(tactic)

        for node_id, tactics in node_tactics.items():
            stages_hit = [s for s in KILL_CHAIN if s in tactics]
            if len(stages_hit) >= 4:
                # 4+ kill chain stages = likely APT
                findings.append({
                    "type":        "apt_kill_chain",
                    "description": f"Node {node_id}: {len(stages_hit)} kill chain stages detected → likely APT",
                    "confidence":  min(0.50 + len(stages_hit) * 0.05, 0.95),
                    "node_id":     node_id,
                    "stages":      stages_hit,
                })

        # ── 3. Lateral movement pattern ──────────────────────────────────────
        # Malicious activity on node A followed by same threat type on node B within 1h
        ttype_first_seen: Dict[str, tuple] = {}
        for e in sorted(events, key=lambda x: x.get("ts",0)):
            key = e.get("threat_type","")
            if not key or e.get("verdict") != "malicious":
                continue
            if key not in ttype_first_seen:
                ttype_first_seen[key] = (e["node_id"], e["ts"])
            else:
                first_node, first_ts = ttype_first_seen[key]
                if e["node_id"] != first_node and (e["ts"] - first_ts) < 3600:
                    findings.append({
                        "type":        "lateral_movement",
                        "description": f"Threat '{key}' propagated: {first_node} → {e['node_id']} within {int(e['ts']-first_ts)}s",
                        "confidence":  0.85,
                        "from_node":   first_node,
                        "to_node":     e["node_id"],
                        "threat":      key,
                    })

        # ── 4. Rapid high-volume scanning ────────────────────────────────────
        scan_counts: Dict[str, int] = defaultdict(int)
        for e in events:
            if e.get("scan_type") == "ip":
                scan_counts[e["node_id"]] += 1
        for node_id, count in scan_counts.items():
            if count > 100:
                findings.append({
                    "type":        "high_volume_scan",
                    "description": f"Node {node_id}: {count} IP scans in 6h — possible port scan or recon",
                    "confidence":  0.70,
                    "node_id":     node_id,
                })

        # ── Report findings ───────────────────────────────────────────────────
        for f in findings:
            conf = f["confidence"]
            log.warning(f"🔗 CORRELATION: [{f['type']}] conf={conf:.0%} — {f['description']}")
            await db.log_scan(
                self._node_id, "correlation", f["type"],
                verdict="malicious" if conf >= 0.80 else "suspicious",
                confidence=conf, threat_type=f["type"],
                indicators=[f["description"]],
                method="correlation_engine", raw=f
            )
            # Report critical correlations to Dashboard
            cfg = self._get_cfg()
            if cfg and conf >= 0.85:
                asyncio.create_task(reporter.report_alert(
                    cfg.license_validate_url.replace("/api/license-validate",""),
                    cfg.license_key,
                    node_id=self._node_id, node_name=os.environ.get("GUARDIAN_NODE_NAME",""),
                    alert_type="correlation_finding",
                    verdict="malicious", confidence=conf,
                    threat_type=f["type"], indicators=[f["description"]],
                    method="correlation_engine", target=f["type"],
                    raw_data=f
                ))

    def _get_cfg(self):
        try:
            from src.core import GuardianCore
            return GuardianCore.get()._cfg
        except Exception:
            return None
