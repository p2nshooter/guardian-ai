# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration — Threat Hunting Interface
SOC analyst bisa query semua data Guardian dengan bahasa natural + structured query.

Query types:
  1. Structured SQL-like query ke SQLite Guardian DB
  2. Hunt templates (predefined IOC patterns)
  3. Timeline view: reconstruct attack chain per host/IP
  4. IOC sweep: check list of IPs/hashes/domains sekaligus

Accessible via:
  POST /hunt/query          — custom SQLite query (safe subset)
  GET  /hunt/templates      — list built-in hunt templates
  POST /hunt/run/{template} — run a named template
  POST /hunt/timeline       — attack timeline for host/IP
  POST /hunt/ioc-sweep      — bulk IOC check
  GET  /hunt/stats          — hunting statistics
"""
from __future__ import annotations

import asyncio, json, logging, re, time
from typing import Any, Dict, List, Optional

log = logging.getLogger("guardian.hunt")

# ── Safe query executor ───────────────────────────────────────────────────────
# Only SELECT allowed. No DROP, INSERT, UPDATE, DELETE, ATTACH.
FORBIDDEN = re.compile(
    r"\b(DROP|INSERT|UPDATE|DELETE|ATTACH|DETACH|ALTER|CREATE|REPLACE|PRAGMA\s+(?!query_only|table_info))\b",
    re.IGNORECASE
)
MAX_RESULTS = 1000
TIMEOUT_SEC = 10


def _safe_query(sql: str, params: tuple = ()) -> List[Dict]:
    """
    Execute a read-only query. Works with both SQLite (Tier 1) and PostgreSQL (Tier 2).
    For PostgreSQL: converts ? placeholders to $1,$2,... automatically.
    __GUARDIAN_NOW__ is replaced with current unix timestamp (portable).
    """
    import time as _time
    sql = sql.replace("__GUARDIAN_NOW__", str(_time.time()))
    if FORBIDDEN.search(sql):
        raise ValueError("Query contains forbidden SQL keyword")
    if not re.search(r"\bSELECT\b", sql, re.IGNORECASE):
        raise ValueError("Only SELECT queries allowed")

    # ── Try PostgreSQL first (Tier 2) ─────────────────────────────────────────
    import os
    db_mode = os.environ.get("GUARDIAN_DB_MODE", "sqlite")
    if db_mode == "distributed":
        pg_url = os.environ.get("GUARDIAN_POSTGRES_URL", "")
        if pg_url:
            try:
                import asyncpg, asyncio
                # Convert ? params to $1,$2 for PostgreSQL
                pg_sql = sql
                i = [0]
                def replace_q(m):
                    i[0] += 1
                    return f"${i[0]}"
                pg_sql = re.sub(r"\?", replace_q, pg_sql)
                pg_sql += f" LIMIT {MAX_RESULTS}"

                async def _run():
                    conn = await asyncpg.connect(pg_url)
                    try:
                        rows = await conn.fetch(pg_sql, *params)
                        return [dict(r) for r in rows]
                    finally:
                        await conn.close()

                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # we're inside async context — use sync fallback below
                        pass
                    else:
                        return loop.run_until_complete(_run())
                except Exception:
                    pass
            except ImportError:
                pass

    # ── SQLite fallback (Tier 1) ──────────────────────────────────────────────
    from pathlib import Path
    db_path = Path(os.environ.get("GUARDIAN_DATA_DIR", "/guardian/data")) / "guardian.db"
    if not db_path.exists():
        return []
    import sqlite3
    conn = sqlite3.connect(str(db_path), timeout=TIMEOUT_SEC)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(sql + f" LIMIT {MAX_RESULTS}", params)
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


# ── Hunt Templates ────────────────────────────────────────────────────────────

HUNT_TEMPLATES: Dict[str, Dict] = {
    "malware_last_24h": {
        "name":        "Malware detections (last 24h)",
        "description": "All malicious files detected in last 24 hours",
        "category":    "malware",
        "sql": """
            SELECT ts, node_id, target as file_path, confidence, threat_type,
                   indicators, method
            FROM scan_events
            WHERE verdict = 'malicious'
              AND scan_type = 'file'
              AND ts > __GUARDIAN_NOW__ - 86400
            ORDER BY ts DESC
        """,
    },
    "lateral_movement": {
        "name":        "Potential lateral movement",
        "description": "IPs with connections to multiple internal hosts in short window",
        "category":    "network",
        "sql": """
            SELECT target as src_ip, COUNT(DISTINCT node_id) as node_count,
                   MIN(ts) as first_seen, MAX(ts) as last_seen,
                   COUNT(*) as event_count
            FROM scan_events
            WHERE scan_type IN ('ip', 'network')
              AND ts > __GUARDIAN_NOW__ - 3600
            GROUP BY target
            HAVING node_count > 1
            ORDER BY node_count DESC, event_count DESC
        """,
    },
    "brute_force_attempts": {
        "name":        "Brute-force login attempts",
        "description": "High-frequency failed login events",
        "category":    "authentication",
        "sql": """
            SELECT target as username, COUNT(*) as attempt_count,
                   MIN(ts) as first_attempt, MAX(ts) as last_attempt,
                   indicators
            FROM scan_events
            WHERE scan_type = 'process'
              AND threat_type LIKE '%brute%'
              AND ts > __GUARDIAN_NOW__ - 3600
            GROUP BY target
            ORDER BY attempt_count DESC
        """,
    },
    "suspicious_processes_high_confidence": {
        "name":        "Suspicious processes (conf > 0.75)",
        "description": "Process anomalies with high confidence score",
        "category":    "process",
        "sql": """
            SELECT ts, node_id, target as process_name, confidence,
                   threat_type, indicators, method
            FROM scan_events
            WHERE scan_type IN ('process', 'behavior')
              AND verdict IN ('malicious','suspicious')
              AND confidence > 0.75
              AND ts > __GUARDIAN_NOW__ - 86400
            ORDER BY confidence DESC, ts DESC
        """,
    },
    "data_exfil_candidates": {
        "name":        "Potential data exfiltration",
        "description": "Large outbound network transfers or DNS tunneling",
        "category":    "exfiltration",
        "sql": """
            SELECT ts, node_id, target, confidence, threat_type, indicators
            FROM scan_events
            WHERE (threat_type LIKE '%exfil%'
                   OR threat_type LIKE '%tunnel%'
                   OR threat_type LIKE '%dns_tunnel%')
              AND ts > __GUARDIAN_NOW__ - 86400
            ORDER BY confidence DESC, ts DESC
        """,
    },
    "new_malicious_ips_7d": {
        "name":        "New malicious IPs (7 days)",
        "description": "IPs flagged malicious — sorted by first appearance",
        "category":    "network",
        "sql": """
            SELECT target as ip, MIN(ts) as first_seen, MAX(ts) as last_seen,
                   COUNT(*) as hit_count, MAX(confidence) as max_confidence,
                   GROUP_CONCAT(DISTINCT threat_type) as threat_types
            FROM scan_events
            WHERE scan_type = 'ip'
              AND verdict = 'malicious'
              AND ts > __GUARDIAN_NOW__ - 604800
            GROUP BY target
            ORDER BY first_seen DESC
        """,
    },
    "persistence_mechanisms": {
        "name":        "Possible persistence mechanisms",
        "description": "Rootkit, FIM alerts, suspicious scheduled tasks",
        "category":    "persistence",
        "sql": """
            SELECT ts, node_id, target, confidence, threat_type, indicators, method
            FROM scan_events
            WHERE threat_type IN ('rootkit','fim_change','persistence','scheduled_task',
                                  'startup_modification','registry_run_key')
              AND ts > __GUARDIAN_NOW__ - 604800
            ORDER BY confidence DESC, ts DESC
        """,
    },
    "deception_events": {
        "name":        "Deception artifact triggers",
        "description": "All deception/honeypot triggers — always high confidence",
        "category":    "deception",
        "sql": """
            SELECT ts, node_id, target, confidence, indicators, method
            FROM scan_events
            WHERE scan_type = 'deception'
              OR threat_type = 'deception_triggered'
            ORDER BY ts DESC
        """,
    },
    "risk_top10_hosts": {
        "name":        "Top 10 highest-risk hosts",
        "description": "Hosts ranked by cumulative risk score",
        "category":    "risk",
        "sql": """
            SELECT node_id, node_name,
                   MAX(risk_score) as max_risk,
                   COUNT(*) as alert_count,
                   MAX(ts) as last_alert
            FROM risk_scores
            GROUP BY node_id
            ORDER BY max_risk DESC
            LIMIT 10
        """,
    },
    "compliance_failures": {
        "name":        "Compliance check failures",
        "description": "All failing compliance checks across all frameworks",
        "category":    "compliance",
        "sql": """
            SELECT ts, node_id, target as check_name, threat_type as framework,
                   confidence, indicators
            FROM scan_events
            WHERE scan_type = 'compliance'
              AND verdict IN ('fail','critical')
            ORDER BY ts DESC
        """,
    },
}


class ThreatHunter:
    """SOC hunting interface over Guardian DB."""

    def run_query(self, sql: str, params: tuple = ()) -> Dict:
        """Run a custom SELECT query. Returns results + metadata."""
        t0 = time.time()
        try:
            results = _safe_query(sql, params)
            return {
                "ok":          True,
                "rows":        results,
                "count":       len(results),
                "latency_ms":  round((time.time()-t0)*1000, 1),
                "truncated":   len(results) == MAX_RESULTS,
            }
        except ValueError as e:
            return {"ok": False, "error": str(e), "rows": []}
        except Exception as e:
            log.warning(f"Hunt query error: {e}")
            return {"ok": False, "error": str(e), "rows": []}

    def run_template(self, template_id: str,
                     params: dict = None) -> Dict:
        """Run a named hunt template."""
        tmpl = HUNT_TEMPLATES.get(template_id)
        if not tmpl:
            return {"ok": False, "error": f"Template '{template_id}' not found"}
        result = self.run_query(tmpl["sql"])
        result["template"] = {
            "id":          template_id,
            "name":        tmpl["name"],
            "description": tmpl["description"],
            "category":    tmpl["category"],
        }
        return result

    def run_ioc_sweep(self, iocs: List[str]) -> Dict:
        """
        Bulk IOC check: list of IPs/hashes/domains.
        Returns which ones have been seen in Guardian DB.
        """
        if not iocs:
            return {"ok": False, "error": "Empty IOC list"}
        iocs = iocs[:500]   # limit
        found = []
        for ioc in iocs:
            try:
                rows = _safe_query(
                    "SELECT ts, scan_type, verdict, confidence, threat_type "
                    "FROM scan_events WHERE target = ? "
                    "ORDER BY ts DESC LIMIT 5",
                    (ioc,)
                )
                if rows:
                    found.append({
                        "ioc":     ioc,
                        "hits":    len(rows),
                        "verdict": rows[0]["verdict"],
                        "last_seen": rows[0]["ts"],
                        "threat_types": list({r["threat_type"] for r in rows}),
                    })
            except Exception:
                pass
        return {
            "ok":          True,
            "total_iocs":  len(iocs),
            "found":       len(found),
            "hits":        found,
            "clean":       [i for i in iocs if i not in {h["ioc"] for h in found}],
        }

    def build_timeline(self, host_or_ip: str,
                        hours: int = 24) -> Dict:
        """
        Build attack timeline for a specific host or IP.
        Groups events by time window and shows the attack progression.
        """
        since = time.time() - hours * 3600
        try:
            rows = _safe_query(
                """
                SELECT ts, node_id, scan_type, target, verdict,
                       confidence, threat_type, indicators, method
                FROM scan_events
                WHERE (node_id = ? OR target = ?)
                  AND ts > ?
                  AND verdict IN ('malicious','suspicious')
                ORDER BY ts ASC
                """,
                (host_or_ip, host_or_ip, since)
            )
        except Exception as e:
            return {"ok": False, "error": str(e)}

        if not rows:
            return {"ok": True, "host": host_or_ip, "events": [],
                    "attack_phases": [], "summary": "No events found"}

        # Detect MITRE ATT&CK phases
        phase_map = {
            "initial_access":    ["brute_force","exploit","phishing","drive_by"],
            "execution":         ["process_injection","malware_infection","script"],
            "persistence":       ["rootkit","fim_change","persistence","startup"],
            "privilege_escalation": ["suid","privesc","sudo"],
            "defense_evasion":   ["rootkit","memory_injection","obfuscation"],
            "credential_access": ["brute_force","credential_dump","keylog"],
            "discovery":         ["port_scan","network_scan","dns_enum"],
            "lateral_movement":  ["lateral_movement","rdp","smb"],
            "collection":        ["data_collection","keylog","screenshot"],
            "exfiltration":      ["data_exfiltration","dns_tunnel","c2_communication"],
            "command_control":   ["c2_communication","dns_tunnel","dga_suspect"],
        }

        detected_phases = set()
        for row in rows:
            tt = row.get("threat_type", "").lower()
            for phase, keywords in phase_map.items():
                if any(kw in tt for kw in keywords):
                    detected_phases.add(phase)

        # Group by 15-min windows
        windows = {}
        for row in rows:
            bucket = int(row["ts"] // 900) * 900
            windows.setdefault(bucket, []).append(row)

        timeline = [
            {
                "window_start":    bucket,
                "window_end":      bucket + 900,
                "event_count":     len(evts),
                "max_confidence":  max(e["confidence"] for e in evts),
                "threat_types":    list({e["threat_type"] for e in evts}),
                "events":          evts[:5],
            }
            for bucket, evts in sorted(windows.items())
        ]

        return {
            "ok":             True,
            "host":           host_or_ip,
            "hours_analyzed": hours,
            "total_events":   len(rows),
            "attack_phases":  sorted(detected_phases),
            "timeline":       timeline,
            "first_event":    rows[0]["ts"] if rows else None,
            "last_event":     rows[-1]["ts"] if rows else None,
        }

    def list_templates(self) -> List[Dict]:
        return [
            {"id": tid, "name": t["name"],
             "description": t["description"], "category": t["category"]}
            for tid, t in HUNT_TEMPLATES.items()
        ]

    def get_stats(self) -> Dict:
        try:
            total = _safe_query("SELECT COUNT(*) as n FROM scan_events")
            n = (total[0]["n"] if total else 0)
            return {"total_events_indexed": n, "templates": len(HUNT_TEMPLATES)}
        except Exception:
            return {"total_events_indexed": 0, "templates": len(HUNT_TEMPLATES)}


_hunter: Optional[ThreatHunter] = None

def get_threat_hunter() -> ThreatHunter:
    global _hunter
    if _hunter is None:
        _hunter = ThreatHunter()
    return _hunter
