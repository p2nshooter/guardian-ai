# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration — Database Layer
Unified database access: SQLite (Tier 1) atau PostgreSQL+Redis (Tier 2).

Tier 1 (default): SQLite via aiosqlite
  Database: /guardian/data/guardian.db

Tier 2 (distributed):
  Set GUARDIAN_DB_MODE=distributed dan GUARDIAN_POSTGRES_URL
  → pakai PostgreSQL + Redis. SQLite tetap tersedia sebagai fallback.

Semua caller pakai get_db() — transparent.
"""
from __future__ import annotations
import asyncio, json, logging, time
from pathlib import Path
from typing import Optional, List, Dict, Any
import aiosqlite

log = logging.getLogger("guardian.db")

_DB_INSTANCE: Optional["GuardianDB"] = None


SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA foreign_keys=ON;

-- ── Scan events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ts           REAL    NOT NULL DEFAULT (unixepoch('now', 'subsec')),
    node_id      TEXT    NOT NULL DEFAULT '',
    scan_type    TEXT    NOT NULL,   -- 'file'|'ip'|'domain'|'process'|'memory'|'network'
    target       TEXT    NOT NULL,   -- file path / IP / domain / pid
    target_hash  TEXT    DEFAULT '',
    verdict      TEXT    NOT NULL,   -- 'clean'|'suspicious'|'malicious'|'unknown'
    confidence   REAL    NOT NULL DEFAULT 0,
    threat_type  TEXT    DEFAULT '',
    indicators   TEXT    DEFAULT '[]',   -- JSON array
    method       TEXT    DEFAULT '',     -- detection method
    raw          TEXT    DEFAULT '{}'    -- JSON full result
);
CREATE INDEX IF NOT EXISTS idx_scan_ts      ON scan_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_scan_verdict ON scan_events(verdict);
CREATE INDEX IF NOT EXISTS idx_scan_hash    ON scan_events(target_hash);

-- ── Quarantine log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quarantine_log (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    ts               REAL    NOT NULL DEFAULT (unixepoch('now', 'subsec')),
    original_path    TEXT    NOT NULL,
    quarantine_path  TEXT    NOT NULL,
    file_hash        TEXT    DEFAULT '',
    threat_type      TEXT    DEFAULT '',
    confidence       REAL    NOT NULL DEFAULT 0,
    restored         INTEGER NOT NULL DEFAULT 0,
    restored_at      REAL    DEFAULT NULL
);

-- ── Process events ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS process_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ts           REAL    NOT NULL DEFAULT (unixepoch('now', 'subsec')),
    node_id      TEXT    NOT NULL DEFAULT '',
    event_type   TEXT    NOT NULL,  -- 'spawn'|'exec'|'kill'|'inject'|'privilege'
    pid          INTEGER NOT NULL DEFAULT 0,
    ppid         INTEGER DEFAULT 0,
    name         TEXT    DEFAULT '',
    cmdline      TEXT    DEFAULT '',
    user         TEXT    DEFAULT '',
    verdict      TEXT    DEFAULT 'clean',
    confidence   REAL    DEFAULT 0,
    threat_type  TEXT    DEFAULT '',
    indicators   TEXT    DEFAULT '[]',
    action_taken TEXT    DEFAULT ''   -- 'none'|'killed'|'blocked'
);
CREATE INDEX IF NOT EXISTS idx_proc_ts   ON process_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_proc_name ON process_events(name);

-- ── Network events ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS network_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ts           REAL    NOT NULL DEFAULT (unixepoch('now', 'subsec')),
    node_id      TEXT    NOT NULL DEFAULT '',
    direction    TEXT    NOT NULL DEFAULT 'outbound',  -- 'inbound'|'outbound'
    src_ip       TEXT    DEFAULT '',
    src_port     INTEGER DEFAULT 0,
    dst_ip       TEXT    NOT NULL DEFAULT '',
    dst_port     INTEGER DEFAULT 0,
    protocol     TEXT    DEFAULT 'tcp',
    bytes        INTEGER DEFAULT 0,
    verdict      TEXT    DEFAULT 'clean',
    threat_type  TEXT    DEFAULT '',
    confidence   REAL    DEFAULT 0,
    action_taken TEXT    DEFAULT 'none'  -- 'none'|'blocked'
);
CREATE INDEX IF NOT EXISTS idx_net_ts     ON network_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_net_dst_ip ON network_events(dst_ip);

-- ── Honeypot events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS honeypot_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ts           REAL    NOT NULL DEFAULT (unixepoch('now', 'subsec')),
    node_id      TEXT    NOT NULL DEFAULT '',
    honeypot_path TEXT   NOT NULL,
    accessor_pid INTEGER DEFAULT 0,
    accessor_name TEXT   DEFAULT '',
    accessor_user TEXT   DEFAULT '',
    action        TEXT   DEFAULT 'read'  -- 'read'|'write'|'exec'|'delete'
);

-- ── Learned patterns (self-learning) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learned_patterns (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at     REAL    NOT NULL DEFAULT (unixepoch('now', 'subsec')),
    updated_at     REAL    NOT NULL DEFAULT (unixepoch('now', 'subsec')),
    pattern_type   TEXT    NOT NULL,  -- 'hash'|'path_pattern'|'behavior'|'network'
    pattern_value  TEXT    NOT NULL UNIQUE,
    threat_type    TEXT    DEFAULT '',
    confidence     REAL    NOT NULL DEFAULT 0.7,
    hit_count      INTEGER NOT NULL DEFAULT 1,
    source         TEXT    DEFAULT 'ai_detection',  -- 'ai_detection'|'admin'|'community'
    confirmed      INTEGER NOT NULL DEFAULT 0       -- 1 = admin confirmed
);
CREATE INDEX IF NOT EXISTS idx_pattern_type  ON learned_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_value ON learned_patterns(pattern_value);

-- ── Risk scores per host ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS host_risk (
    node_id      TEXT    PRIMARY KEY,
    node_name    TEXT    DEFAULT '',
    risk_score   REAL    NOT NULL DEFAULT 0,   -- 0-100
    risk_level   TEXT    DEFAULT 'low',        -- 'low'|'medium'|'high'|'critical'
    last_alert   REAL    DEFAULT NULL,
    alert_count  INTEGER NOT NULL DEFAULT 0,
    malware_count INTEGER NOT NULL DEFAULT 0,
    updated_at   REAL    NOT NULL DEFAULT (unixepoch('now', 'subsec'))
);

-- ── MITRE ATT&CK mappings ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attack_mappings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_event_id INTEGER REFERENCES scan_events(id),
    ts           REAL    NOT NULL DEFAULT (unixepoch('now', 'subsec')),
    tactic       TEXT    NOT NULL,    -- 'execution'|'persistence'|'privilege_escalation' etc
    technique_id TEXT    NOT NULL,    -- 'T1059.001' etc
    technique    TEXT    NOT NULL,
    node_id      TEXT    DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_attack_ts  ON attack_mappings(ts DESC);
CREATE INDEX IF NOT EXISTS idx_attack_tec ON attack_mappings(technique_id);

-- ── Beaconing detection ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beaconing_suspects (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    first_seen   REAL    NOT NULL,
    last_seen    REAL    NOT NULL,
    dst_ip       TEXT    NOT NULL,
    dst_port     INTEGER DEFAULT 0,
    interval_avg REAL    DEFAULT 0,   -- avg seconds between connections
    interval_std REAL    DEFAULT 0,   -- std deviation (low = regular = beaconing)
    hit_count    INTEGER NOT NULL DEFAULT 1,
    verdict      TEXT    DEFAULT 'suspicious',
    UNIQUE(dst_ip, dst_port)
);

-- ── CVE advisories cache ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cve_cache (
    cve_id       TEXT    PRIMARY KEY,
    severity     TEXT    NOT NULL DEFAULT 'MEDIUM',
    score        REAL    NOT NULL DEFAULT 0,
    description  TEXT    DEFAULT '',
    published    TEXT    DEFAULT '',
    cpe          TEXT    DEFAULT '[]',  -- JSON array
    cached_at    REAL    NOT NULL DEFAULT (unixepoch('now', 'subsec'))
);
"""


class GuardianDB:
    def __init__(self, db_path: Path):
        self._path = db_path
        self._db: Optional[aiosqlite.Connection] = None
        self._lock = asyncio.Lock()

    async def connect(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._db = await aiosqlite.connect(str(self._path))
        self._db.row_factory = aiosqlite.Row
        await self._db.executescript(SCHEMA)
        await self._db.commit()
        log.info(f"Guardian DB connected: {self._path}")

    async def close(self) -> None:
        if self._db:
            await self._db.close()
            self._db = None

    # ── Scan events ─────────────────────────────────────────────────────────

    async def log_scan(self, node_id: str, scan_type: str, target: str,
                       verdict: str, confidence: float, threat_type: str = "",
                       indicators: list = [], method: str = "",
                       target_hash: str = "", raw: dict = {}) -> int:
        async with self._lock:
            cur = await self._db.execute(
                """INSERT INTO scan_events
                   (node_id, scan_type, target, target_hash, verdict, confidence,
                    threat_type, indicators, method, raw)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (node_id, scan_type, target, target_hash, verdict, confidence,
                 threat_type, json.dumps(indicators), method, json.dumps(raw))
            )
            await self._db.commit()
            event_id = cur.lastrowid
        # Map to MITRE ATT&CK
        if verdict in ("malicious", "suspicious") and threat_type:
            await self._map_attack(event_id, threat_type, node_id)
        return event_id

    async def get_scan_history(self, limit: int = 100, verdict: str = "",
                               node_id: str = "") -> List[dict]:
        sql = "SELECT * FROM scan_events WHERE 1=1"
        params = []
        if verdict:
            sql += " AND verdict=?"; params.append(verdict)
        if node_id:
            sql += " AND node_id=?"; params.append(node_id)
        sql += " ORDER BY ts DESC LIMIT ?"
        params.append(limit)
        async with self._db.execute(sql, params) as cur:
            rows = await cur.fetchall()
        return [dict(r) for r in rows]

    # ── Quarantine log ───────────────────────────────────────────────────────

    async def log_quarantine(self, original: str, quarantine: str,
                              file_hash: str, threat_type: str, confidence: float) -> None:
        async with self._lock:
            await self._db.execute(
                """INSERT INTO quarantine_log
                   (original_path, quarantine_path, file_hash, threat_type, confidence)
                   VALUES (?,?,?,?,?)""",
                (original, quarantine, file_hash, threat_type, confidence)
            )
            await self._db.commit()

    async def get_quarantine_log(self, limit: int = 50) -> List[dict]:
        async with self._db.execute(
            "SELECT * FROM quarantine_log ORDER BY ts DESC LIMIT ?", (limit,)
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]

    # ── Process events ───────────────────────────────────────────────────────

    async def log_process_event(self, node_id: str, event_type: str,
                                 pid: int, name: str, cmdline: str = "",
                                 ppid: int = 0, user: str = "",
                                 verdict: str = "clean", confidence: float = 0,
                                 threat_type: str = "", indicators: list = [],
                                 action_taken: str = "none") -> None:
        async with self._lock:
            await self._db.execute(
                """INSERT INTO process_events
                   (node_id, event_type, pid, ppid, name, cmdline, user,
                    verdict, confidence, threat_type, indicators, action_taken)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (node_id, event_type, pid, ppid, name, cmdline, user,
                 verdict, confidence, threat_type, json.dumps(indicators), action_taken)
            )
            await self._db.commit()

    # ── Network events ───────────────────────────────────────────────────────

    async def log_network_event(self, node_id: str, dst_ip: str, dst_port: int,
                                 direction: str = "outbound", src_ip: str = "",
                                 verdict: str = "clean", threat_type: str = "",
                                 confidence: float = 0, action_taken: str = "none",
                                 bytes_: int = 0) -> None:
        async with self._lock:
            await self._db.execute(
                """INSERT INTO network_events
                   (node_id, direction, src_ip, dst_ip, dst_port,
                    verdict, threat_type, confidence, action_taken, bytes)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (node_id, direction, src_ip, dst_ip, dst_port,
                 verdict, threat_type, confidence, action_taken, bytes_)
            )
            await self._db.commit()
        # Check beaconing
        await self._check_beaconing(dst_ip, dst_port)

    # ── Honeypot events ──────────────────────────────────────────────────────

    async def log_honeypot(self, node_id: str, honeypot_path: str,
                            accessor_pid: int, accessor_name: str,
                            accessor_user: str, action: str = "read") -> None:
        async with self._lock:
            await self._db.execute(
                """INSERT INTO honeypot_events
                   (node_id, honeypot_path, accessor_pid, accessor_name, accessor_user, action)
                   VALUES (?,?,?,?,?,?)""",
                (node_id, honeypot_path, accessor_pid, accessor_name, accessor_user, action)
            )
            await self._db.commit()
        log.warning(f"🍯 HONEYPOT TRIGGERED: {honeypot_path} by {accessor_name}(PID:{accessor_pid})")

    # ── Learned patterns ─────────────────────────────────────────────────────

    async def add_learned_pattern(self, pattern_type: str, pattern_value: str,
                                   threat_type: str, confidence: float,
                                   source: str = "ai_detection") -> None:
        async with self._lock:
            await self._db.execute(
                """INSERT INTO learned_patterns
                   (pattern_type, pattern_value, threat_type, confidence, source, hit_count)
                   VALUES (?,?,?,?,?,1)
                   ON CONFLICT(pattern_value) DO UPDATE SET
                     hit_count  = hit_count + 1,
                     confidence = MIN(1.0, (confidence * hit_count + ?) / (hit_count + 1)),
                     updated_at = unixepoch('now', 'subsec')""",
                (pattern_type, pattern_value, threat_type, confidence, source, confidence)
            )
            await self._db.commit()

    async def get_learned_patterns(self, pattern_type: str = "",
                                    min_hits: int = 2) -> List[dict]:
        sql = "SELECT * FROM learned_patterns WHERE hit_count >= ?"
        params: list = [min_hits]
        if pattern_type:
            sql += " AND pattern_type=?"; params.append(pattern_type)
        sql += " ORDER BY confidence DESC, hit_count DESC"
        async with self._db.execute(sql, params) as cur:
            return [dict(r) for r in await cur.fetchall()]

    # ── Risk scoring ─────────────────────────────────────────────────────────

    async def update_risk_score(self, node_id: str, node_name: str,
                                 verdict: str, confidence: float) -> float:
        """Update host risk score based on new detection. Returns new score."""
        async with self._lock:
            # Get current
            async with self._db.execute(
                "SELECT * FROM host_risk WHERE node_id=?", (node_id,)
            ) as cur:
                row = await cur.fetchone()

            now = time.time()
            if not row:
                risk_score  = 0.0
                alert_count = 0
                malware_count = 0
            else:
                risk_score    = row["risk_score"]
                alert_count   = row["alert_count"]
                malware_count = row["malware_count"]

            # Add to score based on verdict
            delta = 0.0
            if verdict == "malicious":
                delta = confidence * 20    # max +20 per malicious
                malware_count += 1
            elif verdict == "suspicious":
                delta = confidence * 5     # max +5 per suspicious

            # Decay: risk decays 1 point per hour since last alert
            if row and row["last_alert"]:
                hours_since = (now - row["last_alert"]) / 3600
                decay = min(hours_since * 1.0, risk_score)
                risk_score = max(0, risk_score - decay)

            risk_score  = min(100.0, risk_score + delta)
            alert_count += 1
            risk_level  = (
                "critical" if risk_score >= 70 else
                "high"     if risk_score >= 40 else
                "medium"   if risk_score >= 15 else "low"
            )

            await self._db.execute(
                """INSERT INTO host_risk (node_id, node_name, risk_score, risk_level,
                   last_alert, alert_count, malware_count, updated_at)
                   VALUES (?,?,?,?,?,?,?,?)
                   ON CONFLICT(node_id) DO UPDATE SET
                     node_name=excluded.node_name, risk_score=excluded.risk_score,
                     risk_level=excluded.risk_level, last_alert=excluded.last_alert,
                     alert_count=excluded.alert_count, malware_count=excluded.malware_count,
                     updated_at=excluded.updated_at""",
                (node_id, node_name, risk_score, risk_level, now,
                 alert_count, malware_count, now)
            )
            await self._db.commit()
        return risk_score

    async def get_risk_scores(self) -> List[dict]:
        async with self._db.execute(
            "SELECT * FROM host_risk ORDER BY risk_score DESC"
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]

    # ── Statistics ───────────────────────────────────────────────────────────

    async def get_stats(self, hours: int = 24) -> dict:
        since = time.time() - hours * 3600
        stats: dict = {}
        queries = {
            "total_scans":     ("SELECT COUNT(*) FROM scan_events WHERE ts > ?", (since,)),
            "malicious_files": ("SELECT COUNT(*) FROM scan_events WHERE ts > ? AND verdict='malicious'", (since,)),
            "suspicious_files":("SELECT COUNT(*) FROM scan_events WHERE ts > ? AND verdict='suspicious'", (since,)),
            "quarantined":     ("SELECT COUNT(*) FROM quarantine_log WHERE ts > ?", (since,)),
            "blocked_ips":     ("SELECT COUNT(*) FROM network_events WHERE ts > ? AND action_taken='blocked'", (since,)),
            "honeypot_hits":   ("SELECT COUNT(*) FROM honeypot_events WHERE ts > ?", (since,)),
            "process_kills":   ("SELECT COUNT(*) FROM process_events WHERE ts > ? AND action_taken='killed'", (since,)),
        }
        for key, (sql, params) in queries.items():
            async with self._db.execute(sql, params) as cur:
                row = await cur.fetchone()
                stats[key] = row[0] if row else 0
        # Top threats
        async with self._db.execute(
            """SELECT threat_type, COUNT(*) as count FROM scan_events
               WHERE ts > ? AND threat_type != '' GROUP BY threat_type
               ORDER BY count DESC LIMIT 10""", (since,)
        ) as cur:
            stats["top_threats"] = [dict(r) for r in await cur.fetchall()]
        # MITRE ATT&CK top techniques
        async with self._db.execute(
            """SELECT technique_id, technique, COUNT(*) as count FROM attack_mappings
               WHERE ts > ? GROUP BY technique_id ORDER BY count DESC LIMIT 10""", (since,)
        ) as cur:
            stats["top_techniques"] = [dict(r) for r in await cur.fetchall()]
        return stats

    # ── CVE cache ────────────────────────────────────────────────────────────

    async def cache_cves(self, cves: list) -> None:
        async with self._lock:
            for cve in cves:
                await self._db.execute(
                    """INSERT INTO cve_cache (cve_id, severity, score, description, published, cpe)
                       VALUES (?,?,?,?,?,?)
                       ON CONFLICT(cve_id) DO UPDATE SET
                         cached_at=unixepoch('now','subsec')""",
                    (cve.get("id",""), cve.get("severity","MEDIUM"),
                     cve.get("score", 0), cve.get("description","")[:500],
                     cve.get("published",""), json.dumps(cve.get("cpe",[])))
                )
            await self._db.commit()

    async def get_cves(self, severity: str = "CRITICAL", limit: int = 50) -> List[dict]:
        async with self._db.execute(
            "SELECT * FROM cve_cache WHERE severity=? ORDER BY score DESC LIMIT ?",
            (severity, limit)
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]

    # ── Internal helpers ─────────────────────────────────────────────────────

    async def _map_attack(self, event_id: int, threat_type: str, node_id: str) -> None:
        """Map threat type to MITRE ATT&CK technique."""
        MITRE_MAP = {
            "php_webshell":           ("execution",              "T1059.004", "Command and Scripting: Unix Shell"),
            "php_rce":                ("execution",              "T1059.004", "Command and Scripting: Unix Shell"),
            "exploit_tool":           ("execution",              "T1203",     "Exploitation for Client Execution"),
            "exploit_framework":      ("lateral_movement",       "T1210",     "Exploitation of Remote Services"),
            "process_injection":      ("privilege_escalation",   "T1055",     "Process Injection"),
            "ransomware":             ("impact",                 "T1486",     "Data Encrypted for Impact"),
            "keylogger":              ("collection",             "T1056.001", "Keylogging"),
            "backdoor":               ("persistence",            "T1505",     "Server Software Component"),
            "reverse_shell":          ("command_and_control",    "T1071.001", "Application Layer Protocol: Web"),
            "dropper":                ("execution",              "T1105",     "Ingress Tool Transfer"),
            "obfuscated_exec":        ("defense_evasion",        "T1027",     "Obfuscated Files or Information"),
            "persistence":            ("persistence",            "T1053.005", "Scheduled Task/Job: Cron"),
            "suid_abuse":             ("privilege_escalation",   "T1548.001", "Abuse Elevation Control: Setuid"),
            "ld_preload_hijack":      ("defense_evasion",        "T1574.006", "Hijack Execution Flow: LD_PRELOAD"),
            "kernel_module":          ("persistence",            "T1547.006", "Boot/Logon Autostart: Kernel Modules"),
            "cryptominer":            ("impact",                 "T1496",     "Resource Hijacking"),
            "data_exfil":             ("exfiltration",           "T1041",     "Exfiltration Over C2 Channel"),
            "ssh_backdoor":           ("persistence",            "T1098.004", "Account Manipulation: SSH Auth Keys"),
            "credential_theft":       ("credential_access",      "T1552",     "Unsecured Credentials"),
            "network_scan":           ("discovery",              "T1046",     "Network Service Discovery"),
            "brute_force":            ("credential_access",      "T1110",     "Brute Force"),
            "powershell_encoded":     ("defense_evasion",        "T1027",     "Obfuscated Files or Information"),
            "powershell_download":    ("execution",              "T1059.001", "PowerShell"),
            "av_bypass":              ("defense_evasion",        "T1562.001", "Impair Defenses: Disable or Modify Tools"),
            "amsi_bypass":            ("defense_evasion",        "T1562.001", "Impair Defenses: Disable or Modify Tools"),
            "packed_malware":         ("defense_evasion",        "T1027.002", "Obfuscated Files: Software Packing"),
            "extension_mismatch":     ("defense_evasion",        "T1036.007", "Masquerading: Double File Extension"),
            "known_malware":          ("execution",              "T1204",     "User Execution"),
            "known_malicious_ip":     ("command_and_control",    "T1071",     "Application Layer Protocol"),
            "known_malicious_domain": ("command_and_control",    "T1071",     "Application Layer Protocol"),
            "botnet_c2":              ("command_and_control",    "T1102",     "Web Service"),
        }
        if threat_type not in MITRE_MAP:
            return
        tactic, technique_id, technique = MITRE_MAP[threat_type]
        async with self._lock:
            await self._db.execute(
                "INSERT INTO attack_mappings (scan_event_id, tactic, technique_id, technique, node_id) VALUES (?,?,?,?,?)",
                (event_id, tactic, technique_id, technique, node_id)
            )
            await self._db.commit()

    async def _check_beaconing(self, dst_ip: str, dst_port: int) -> None:
        """Detect C2 beaconing: regular periodic connections to same IP:port."""
        now = time.time()
        async with self._db.execute(
            "SELECT * FROM beaconing_suspects WHERE dst_ip=? AND dst_port=?",
            (dst_ip, dst_port)
        ) as cur:
            row = await cur.fetchone()

        if not row:
            async with self._lock:
                await self._db.execute(
                    "INSERT OR IGNORE INTO beaconing_suspects (first_seen,last_seen,dst_ip,dst_port,hit_count) VALUES (?,?,?,?,1)",
                    (now, now, dst_ip, dst_port)
                )
                await self._db.commit()
            return

        interval = now - row["last_seen"]
        count    = row["hit_count"] + 1
        avg      = (row["interval_avg"] * (count - 1) + interval) / count
        std      = abs(interval - avg)   # simplified std

        verdict = "clean"
        if count >= 5 and avg < 3600 and std < avg * 0.2:
            # Regular interval < 1h with low variance = likely beaconing
            verdict = "suspicious"
            if count >= 10 and std < avg * 0.1:
                verdict = "malicious"
            log.warning(f"🔔 BEACONING DETECTED: {dst_ip}:{dst_port} avg={avg:.0f}s std={std:.0f}s count={count}")

        async with self._lock:
            await self._db.execute(
                """UPDATE beaconing_suspects
                   SET last_seen=?, hit_count=?, interval_avg=?, interval_std=?, verdict=?
                   WHERE dst_ip=? AND dst_port=?""",
                (now, count, avg, std, verdict, dst_ip, dst_port)
            )
            await self._db.commit()


# ── Module-level helpers ─────────────────────────────────────────────────────

async def get_db() -> GuardianDB:
    """
    Return active DB instance.
    Tier 2: returns PostgresDB if GUARDIAN_DB_MODE=distributed.
    Tier 1: returns SQLite GuardianDB.
    """
    global _DB_INSTANCE
    # ── Tier 2: try distributed first ────────────────────────────────────────
    try:
        from src.database_distributed import get_distributed_db, get_db_mode
        if get_db_mode() == "distributed":
            pg = await get_distributed_db()
            if pg:
                return pg  # type: ignore[return-value]
    except ImportError:
        pass
    # ── Tier 1: SQLite fallback ───────────────────────────────────────────────
    if _DB_INSTANCE is None:
        from src.config.settings import get_config
        cfg = get_config()
        _DB_INSTANCE = GuardianDB(cfg.data_dir / "guardian.db")
        await _DB_INSTANCE.connect()
    return _DB_INSTANCE
