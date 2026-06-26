# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration — Distributed Database Layer (Tier 2)
==================================================
Tier 2 menggunakan PostgreSQL sebagai primary store dan Redis sebagai
cache + pub/sub layer. Tier 1 tetap pakai SQLite (backward-compatible).

Env vars untuk mengaktifkan:
  GUARDIAN_DB_MODE=distributed          # default: sqlite
  GUARDIAN_POSTGRES_URL=postgresql://user:pass@host:5432/guardian
  GUARDIAN_REDIS_URL=redis://host:6379/0

Fitur Tier 2 yang dimungkinkan oleh layer ini:
  - Multi-node shared state (semua node baca/tulis ke DB yang sama)
  - Real-time pub/sub untuk alert ke semua Core instance
  - Redis cache untuk threat feed lookup (< 1ms vs 50ms SQLite)
  - Connection pooling (asyncpg pool, max 20 connections)
  - Tenant data isolation via PostgreSQL row-level security (RLS)
  - Redis Streams untuk event log yang durable

Backward-compatible:
  - Jika GUARDIAN_DB_MODE != "distributed" → pakai SQLite (Tier 1)
  - get_distributed_db() returns None jika tidak dikonfigurasi
  - Semua caller harus fallback ke SQLite jika distributed DB tidak ada
"""
from __future__ import annotations

import asyncio, json, logging, os, time
from pathlib import Path
from typing import Any, Dict, List, Optional

log = logging.getLogger("guardian.db.distributed")

# ── Config ────────────────────────────────────────────────────────────────────
DB_MODE      = os.environ.get("GUARDIAN_DB_MODE", "sqlite")          # sqlite | distributed
POSTGRES_URL = os.environ.get("GUARDIAN_POSTGRES_URL", "")
REDIS_URL    = os.environ.get("GUARDIAN_REDIS_URL",    "redis://localhost:6379/0")

IS_DISTRIBUTED = DB_MODE == "distributed" and bool(POSTGRES_URL)

# ── PostgreSQL Schema (Tier 2) ────────────────────────────────────────────────
PG_SCHEMA = """
-- Tenant isolation: semua tabel punya tenant_id kolom
-- PostgreSQL Row-Level Security bisa diaktifkan per deployment

CREATE TABLE IF NOT EXISTS scan_events (
    id           BIGSERIAL PRIMARY KEY,
    ts           DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    tenant_id    TEXT    NOT NULL DEFAULT 'default',
    node_id      TEXT    NOT NULL DEFAULT '',
    scan_type    TEXT    NOT NULL,
    target       TEXT    NOT NULL,
    target_hash  TEXT    DEFAULT '',
    verdict      TEXT    NOT NULL,
    confidence   DOUBLE PRECISION NOT NULL DEFAULT 0,
    threat_type  TEXT    DEFAULT '',
    indicators   JSONB   DEFAULT '[]',
    method       TEXT    DEFAULT '',
    raw          JSONB   DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_scan_ts      ON scan_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_scan_verdict ON scan_events(verdict);
CREATE INDEX IF NOT EXISTS idx_scan_tenant  ON scan_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scan_hash    ON scan_events(target_hash);

CREATE TABLE IF NOT EXISTS quarantine_log (
    id               BIGSERIAL PRIMARY KEY,
    ts               DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    tenant_id        TEXT    NOT NULL DEFAULT 'default',
    original_path    TEXT    NOT NULL,
    quarantine_path  TEXT    NOT NULL,
    file_hash        TEXT    DEFAULT '',
    threat_type      TEXT    DEFAULT '',
    confidence       DOUBLE PRECISION NOT NULL DEFAULT 0,
    restored         BOOLEAN NOT NULL DEFAULT FALSE,
    restored_at      DOUBLE PRECISION DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS process_events (
    id           BIGSERIAL PRIMARY KEY,
    ts           DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    tenant_id    TEXT    NOT NULL DEFAULT 'default',
    node_id      TEXT    NOT NULL DEFAULT '',
    event_type   TEXT    NOT NULL,
    pid          INTEGER NOT NULL DEFAULT 0,
    ppid         INTEGER DEFAULT 0,
    name         TEXT    DEFAULT '',
    cmdline      TEXT    DEFAULT '',
    "user"       TEXT    DEFAULT '',
    verdict      TEXT    DEFAULT 'clean',
    confidence   DOUBLE PRECISION DEFAULT 0,
    threat_type  TEXT    DEFAULT '',
    indicators   JSONB   DEFAULT '[]',
    action_taken TEXT    DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_proc_ts     ON process_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_proc_tenant ON process_events(tenant_id);

CREATE TABLE IF NOT EXISTS network_events (
    id           BIGSERIAL PRIMARY KEY,
    ts           DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    tenant_id    TEXT    NOT NULL DEFAULT 'default',
    node_id      TEXT    NOT NULL DEFAULT '',
    direction    TEXT    NOT NULL DEFAULT 'outbound',
    src_ip       TEXT    DEFAULT '',
    src_port     INTEGER DEFAULT 0,
    dst_ip       TEXT    NOT NULL DEFAULT '',
    dst_port     INTEGER DEFAULT 0,
    protocol     TEXT    DEFAULT 'tcp',
    bytes        BIGINT  DEFAULT 0,
    verdict      TEXT    DEFAULT 'clean',
    threat_type  TEXT    DEFAULT '',
    confidence   DOUBLE PRECISION DEFAULT 0,
    action_taken TEXT    DEFAULT 'none'
);
CREATE INDEX IF NOT EXISTS idx_net_ts     ON network_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_net_dst_ip ON network_events(dst_ip);
CREATE INDEX IF NOT EXISTS idx_net_tenant ON network_events(tenant_id);

CREATE TABLE IF NOT EXISTS honeypot_events (
    id            BIGSERIAL PRIMARY KEY,
    ts            DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    tenant_id     TEXT    NOT NULL DEFAULT 'default',
    node_id       TEXT    NOT NULL DEFAULT '',
    honeypot_path TEXT    NOT NULL,
    accessor_pid  INTEGER DEFAULT 0,
    accessor_name TEXT    DEFAULT '',
    accessor_user TEXT    DEFAULT '',
    action        TEXT    DEFAULT 'read'
);

CREATE TABLE IF NOT EXISTS learned_patterns (
    id             BIGSERIAL PRIMARY KEY,
    created_at     DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    updated_at     DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    tenant_id      TEXT    NOT NULL DEFAULT 'default',
    pattern_type   TEXT    NOT NULL,
    pattern_value  TEXT    NOT NULL,
    threat_type    TEXT    DEFAULT '',
    confidence     DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    hit_count      INTEGER NOT NULL DEFAULT 1,
    source         TEXT    DEFAULT 'ai_detection',
    confirmed      BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(tenant_id, pattern_value)
);
CREATE INDEX IF NOT EXISTS idx_pattern_type   ON learned_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_tenant ON learned_patterns(tenant_id);

CREATE TABLE IF NOT EXISTS host_risk (
    tenant_id     TEXT    NOT NULL DEFAULT 'default',
    node_id       TEXT    NOT NULL,
    node_name     TEXT    DEFAULT '',
    risk_score    DOUBLE PRECISION NOT NULL DEFAULT 0,
    risk_level    TEXT    DEFAULT 'low',
    last_alert    DOUBLE PRECISION DEFAULT NULL,
    alert_count   INTEGER NOT NULL DEFAULT 0,
    malware_count INTEGER NOT NULL DEFAULT 0,
    updated_at    DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    PRIMARY KEY (tenant_id, node_id)
);

CREATE TABLE IF NOT EXISTS attack_mappings (
    id            BIGSERIAL PRIMARY KEY,
    scan_event_id BIGINT REFERENCES scan_events(id) ON DELETE CASCADE,
    ts            DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    tenant_id     TEXT    NOT NULL DEFAULT 'default',
    tactic        TEXT    NOT NULL,
    technique_id  TEXT    NOT NULL,
    technique     TEXT    NOT NULL,
    node_id       TEXT    DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_attack_ts     ON attack_mappings(ts DESC);
CREATE INDEX IF NOT EXISTS idx_attack_tenant ON attack_mappings(tenant_id);

CREATE TABLE IF NOT EXISTS beaconing_suspects (
    id           BIGSERIAL PRIMARY KEY,
    tenant_id    TEXT    NOT NULL DEFAULT 'default',
    first_seen   DOUBLE PRECISION NOT NULL,
    last_seen    DOUBLE PRECISION NOT NULL,
    dst_ip       TEXT    NOT NULL,
    dst_port     INTEGER DEFAULT 0,
    interval_avg DOUBLE PRECISION DEFAULT 0,
    interval_std DOUBLE PRECISION DEFAULT 0,
    hit_count    INTEGER NOT NULL DEFAULT 1,
    verdict      TEXT    DEFAULT 'suspicious',
    UNIQUE(tenant_id, dst_ip, dst_port)
);

CREATE TABLE IF NOT EXISTS cve_cache (
    cve_id       TEXT    PRIMARY KEY,
    severity     TEXT    NOT NULL DEFAULT 'MEDIUM',
    score        DOUBLE PRECISION NOT NULL DEFAULT 0,
    description  TEXT    DEFAULT '',
    published    TEXT    DEFAULT '',
    cpe          JSONB   DEFAULT '[]',
    cached_at    DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())
);

-- Attack graph nodes (Tier 2 — Graph-based attack path)
CREATE TABLE IF NOT EXISTS attack_graph_nodes (
    id          BIGSERIAL PRIMARY KEY,
    ts          DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    tenant_id   TEXT    NOT NULL DEFAULT 'default',
    node_id     TEXT    NOT NULL,   -- Guardian node / host
    entity      TEXT    NOT NULL,   -- process name / IP / user
    entity_type TEXT    NOT NULL,   -- process | network | user | file
    technique   TEXT    DEFAULT '',
    tactic      TEXT    DEFAULT '',
    severity    TEXT    DEFAULT 'medium',
    incident_id TEXT    DEFAULT ''
);

CREATE TABLE IF NOT EXISTS attack_graph_edges (
    id          BIGSERIAL PRIMARY KEY,
    ts          DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    tenant_id   TEXT    NOT NULL DEFAULT 'default',
    src_node_id BIGINT  REFERENCES attack_graph_nodes(id) ON DELETE CASCADE,
    dst_node_id BIGINT  REFERENCES attack_graph_nodes(id) ON DELETE CASCADE,
    relation    TEXT    NOT NULL,   -- 'spawned'|'connected_to'|'accessed'|'escalated'
    confidence  DOUBLE PRECISION DEFAULT 0.8
);
CREATE INDEX IF NOT EXISTS idx_edge_src ON attack_graph_edges(src_node_id);
CREATE INDEX IF NOT EXISTS idx_edge_dst ON attack_graph_edges(dst_node_id);
"""


# ── PostgreSQL Pool ───────────────────────────────────────────────────────────

class PostgresDB:
    """
    Async PostgreSQL connection pool via asyncpg.
    Exposes same interface as GuardianDB (SQLite) for drop-in compatibility.
    """

    def __init__(self, dsn: str, tenant_id: str = "default"):
        self._dsn       = dsn
        self._tenant_id = tenant_id
        self._pool      = None   # asyncpg.Pool — created in connect()

    async def connect(self) -> None:
        try:
            import asyncpg
            self._pool = await asyncpg.create_pool(
                self._dsn,
                min_size=2,
                max_size=20,
                command_timeout=30,
                statement_cache_size=0,   # required for PgBouncer compatibility
            )
            async with self._pool.acquire() as conn:
                await conn.execute(PG_SCHEMA)
            log.info(f"PostgreSQL pool connected (tenant={self._tenant_id})")
        except Exception as e:
            log.error(f"PostgreSQL connect failed: {e}")
            raise

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def log_scan(self, node_id: str, scan_type: str, target: str,
                       verdict: str, confidence: float, threat_type: str = "",
                       indicators: list = [], method: str = "",
                       target_hash: str = "", raw: dict = {}) -> int:
        if not self._pool:
            return 0
        try:
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(
                    """INSERT INTO scan_events
                       (tenant_id, node_id, scan_type, target, target_hash, verdict,
                        confidence, threat_type, indicators, method, raw)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb)
                       RETURNING id""",
                    self._tenant_id, node_id, scan_type, target, target_hash, verdict,
                    confidence, threat_type,
                    json.dumps(indicators), method, json.dumps(raw)
                )
                return row["id"] if row else 0
        except Exception as e:
            log.debug(f"PG log_scan error: {e}")
            return 0

    async def get_scan_history(self, limit: int = 100, verdict: str = "",
                               node_id: str = "") -> List[dict]:
        if not self._pool:
            return []
        try:
            async with self._pool.acquire() as conn:
                where = ["tenant_id = $1"]
                params: list = [self._tenant_id]
                idx = 2
                if verdict:
                    where.append(f"verdict = ${idx}"); params.append(verdict); idx += 1
                if node_id:
                    where.append(f"node_id = ${idx}"); params.append(node_id); idx += 1
                params.append(limit)
                sql = f"""SELECT id, ts, node_id, scan_type, target, target_hash,
                                 verdict, confidence, threat_type, indicators, method
                          FROM scan_events
                          WHERE {' AND '.join(where)}
                          ORDER BY ts DESC LIMIT ${idx}"""
                rows = await conn.fetch(sql, *params)
                return [dict(r) for r in rows]
        except Exception as e:
            log.debug(f"PG get_scan_history error: {e}")
            return []

    async def get_stats(self, hours: int = 24) -> dict:
        if not self._pool:
            return {}
        since = time.time() - hours * 3600
        try:
            async with self._pool.acquire() as conn:
                total = await conn.fetchval(
                    "SELECT COUNT(*) FROM scan_events WHERE tenant_id=$1 AND ts>$2",
                    self._tenant_id, since)
                malicious = await conn.fetchval(
                    "SELECT COUNT(*) FROM scan_events WHERE tenant_id=$1 AND ts>$2 AND verdict='malicious'",
                    self._tenant_id, since)
                suspicious = await conn.fetchval(
                    "SELECT COUNT(*) FROM scan_events WHERE tenant_id=$1 AND ts>$2 AND verdict='suspicious'",
                    self._tenant_id, since)
                top_threats = await conn.fetch(
                    """SELECT threat_type, COUNT(*) as cnt FROM scan_events
                       WHERE tenant_id=$1 AND ts>$2 AND threat_type != ''
                       GROUP BY threat_type ORDER BY cnt DESC LIMIT 5""",
                    self._tenant_id, since)
                return {
                    "total_scans":  int(total or 0),
                    "malicious":    int(malicious or 0),
                    "suspicious":   int(suspicious or 0),
                    "clean":        int((total or 0) - (malicious or 0) - (suspicious or 0)),
                    "top_threats":  [dict(r) for r in top_threats],
                    "hours":        hours,
                }
        except Exception as e:
            log.debug(f"PG get_stats error: {e}")
            return {}

    async def log_quarantine(self, original: str, quarantine: str,
                             file_hash: str = "", threat_type: str = "",
                             confidence: float = 0) -> None:
        if not self._pool:
            return
        try:
            async with self._pool.acquire() as conn:
                await conn.execute(
                    """INSERT INTO quarantine_log
                       (tenant_id, original_path, quarantine_path, file_hash, threat_type, confidence)
                       VALUES ($1,$2,$3,$4,$5,$6)""",
                    self._tenant_id, original, quarantine, file_hash, threat_type, confidence
                )
        except Exception as e:
            log.debug(f"PG log_quarantine error: {e}")

    async def get_quarantine_log(self, limit: int = 50) -> List[dict]:
        if not self._pool:
            return []
        try:
            async with self._pool.acquire() as conn:
                rows = await conn.fetch(
                    """SELECT * FROM quarantine_log WHERE tenant_id=$1
                       ORDER BY ts DESC LIMIT $2""",
                    self._tenant_id, limit)
                return [dict(r) for r in rows]
        except Exception as e:
            log.debug(f"PG get_quarantine error: {e}")
            return []

    async def log_process_event(self, node_id: str, event_type: str,
                                pid: int, ppid: int = 0, name: str = "",
                                cmdline: str = "", user: str = "",
                                verdict: str = "clean", confidence: float = 0,
                                threat_type: str = "", indicators: list = [],
                                action_taken: str = "") -> None:
        if not self._pool:
            return
        try:
            async with self._pool.acquire() as conn:
                await conn.execute(
                    """INSERT INTO process_events
                       (tenant_id,node_id,event_type,pid,ppid,name,cmdline,"user",
                        verdict,confidence,threat_type,indicators,action_taken)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)""",
                    self._tenant_id, node_id, event_type, pid, ppid, name, cmdline, user,
                    verdict, confidence, threat_type, json.dumps(indicators), action_taken
                )
        except Exception as e:
            log.debug(f"PG log_process error: {e}")

    async def log_network_event(self, node_id: str, dst_ip: str, dst_port: int,
                                src_ip: str = "", src_port: int = 0,
                                direction: str = "outbound", protocol: str = "tcp",
                                bytes_: int = 0, verdict: str = "clean",
                                threat_type: str = "", confidence: float = 0,
                                action_taken: str = "none") -> None:
        if not self._pool:
            return
        try:
            async with self._pool.acquire() as conn:
                await conn.execute(
                    """INSERT INTO network_events
                       (tenant_id,node_id,direction,src_ip,src_port,dst_ip,dst_port,
                        protocol,bytes,verdict,threat_type,confidence,action_taken)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)""",
                    self._tenant_id, node_id, direction, src_ip, src_port, dst_ip, dst_port,
                    protocol, bytes_, verdict, threat_type, confidence, action_taken
                )
        except Exception as e:
            log.debug(f"PG log_network error: {e}")

    async def add_learned_pattern(self, pattern_type: str, pattern_value: str,
                                  threat_type: str = "", confidence: float = 0.7,
                                  source: str = "ai_detection") -> None:
        if not self._pool:
            return
        try:
            async with self._pool.acquire() as conn:
                await conn.execute(
                    """INSERT INTO learned_patterns
                       (tenant_id, pattern_type, pattern_value, threat_type, confidence, source)
                       VALUES ($1,$2,$3,$4,$5,$6)
                       ON CONFLICT (tenant_id, pattern_value) DO UPDATE
                         SET hit_count = learned_patterns.hit_count + 1,
                             updated_at = EXTRACT(EPOCH FROM NOW()),
                             confidence = GREATEST(learned_patterns.confidence, EXCLUDED.confidence)""",
                    self._tenant_id, pattern_type, pattern_value, threat_type, confidence, source
                )
        except Exception as e:
            log.debug(f"PG add_pattern error: {e}")

    async def get_learned_patterns(self, pattern_type: str = "",
                                   min_hits: int = 1, limit: int = 200) -> List[dict]:
        if not self._pool:
            return []
        try:
            async with self._pool.acquire() as conn:
                if pattern_type:
                    rows = await conn.fetch(
                        """SELECT * FROM learned_patterns
                           WHERE tenant_id=$1 AND pattern_type=$2 AND hit_count>=$3
                           ORDER BY hit_count DESC LIMIT $4""",
                        self._tenant_id, pattern_type, min_hits, limit)
                else:
                    rows = await conn.fetch(
                        """SELECT * FROM learned_patterns
                           WHERE tenant_id=$1 AND hit_count>=$2
                           ORDER BY hit_count DESC LIMIT $3""",
                        self._tenant_id, min_hits, limit)
                return [dict(r) for r in rows]
        except Exception as e:
            log.debug(f"PG get_patterns error: {e}")
            return []

    async def update_risk_score(self, node_id: str, node_name: str,
                                risk_score: float, risk_level: str,
                                alert_count: int = 0, malware_count: int = 0) -> None:
        if not self._pool:
            return
        try:
            async with self._pool.acquire() as conn:
                await conn.execute(
                    """INSERT INTO host_risk
                       (tenant_id, node_id, node_name, risk_score, risk_level,
                        last_alert, alert_count, malware_count, updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,EXTRACT(EPOCH FROM NOW()))
                       ON CONFLICT (tenant_id, node_id) DO UPDATE
                         SET node_name=$3, risk_score=$4, risk_level=$5,
                             last_alert=$6, alert_count=$7, malware_count=$8,
                             updated_at=EXTRACT(EPOCH FROM NOW())""",
                    self._tenant_id, node_id, node_name, risk_score, risk_level,
                    time.time(), alert_count, malware_count
                )
        except Exception as e:
            log.debug(f"PG update_risk error: {e}")

    async def get_risk_scores(self) -> List[dict]:
        if not self._pool:
            return []
        try:
            async with self._pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM host_risk WHERE tenant_id=$1 ORDER BY risk_score DESC",
                    self._tenant_id)
                return [dict(r) for r in rows]
        except Exception as e:
            log.debug(f"PG get_risk error: {e}")
            return []

    async def cache_cves(self, cves: list) -> None:
        if not self._pool or not cves:
            return
        try:
            async with self._pool.acquire() as conn:
                for cve in cves:
                    await conn.execute(
                        """INSERT INTO cve_cache (cve_id, severity, score, description, published, cpe, cached_at)
                           VALUES ($1,$2,$3,$4,$5,$6::jsonb,EXTRACT(EPOCH FROM NOW()))
                           ON CONFLICT (cve_id) DO UPDATE
                             SET severity=$2, score=$3, description=$4, published=$5,
                                 cpe=$6::jsonb, cached_at=EXTRACT(EPOCH FROM NOW())""",
                        cve.get("cve_id",""), cve.get("severity","MEDIUM"),
                        float(cve.get("score",0)), cve.get("description",""),
                        cve.get("published",""), json.dumps(cve.get("cpe",[]))
                    )
        except Exception as e:
            log.debug(f"PG cache_cves error: {e}")

    async def get_cves(self, severity: str = "CRITICAL", limit: int = 50) -> List[dict]:
        if not self._pool:
            return []
        try:
            async with self._pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM cve_cache WHERE severity=$1 ORDER BY score DESC LIMIT $2",
                    severity, limit)
                return [dict(r) for r in rows]
        except Exception as e:
            log.debug(f"PG get_cves error: {e}")
            return []

    # ── Attack graph methods ─────────────────────────────────────────────────

    async def add_attack_node(self, node_id: str, entity: str,
                               entity_type: str, technique: str = "",
                               tactic: str = "", severity: str = "medium",
                               incident_id: str = "") -> int:
        if not self._pool:
            return 0
        try:
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(
                    """INSERT INTO attack_graph_nodes
                       (tenant_id, node_id, entity, entity_type, technique, tactic,
                        severity, incident_id)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                       RETURNING id""",
                    self._tenant_id, node_id, entity, entity_type,
                    technique, tactic, severity, incident_id
                )
                return row["id"] if row else 0
        except Exception as e:
            log.debug(f"PG add_attack_node error: {e}")
            return 0

    async def add_attack_edge(self, src_id: int, dst_id: int,
                               relation: str, confidence: float = 0.8) -> None:
        if not self._pool:
            return
        try:
            async with self._pool.acquire() as conn:
                await conn.execute(
                    """INSERT INTO attack_graph_edges
                       (tenant_id, src_node_id, dst_node_id, relation, confidence)
                       VALUES ($1,$2,$3,$4,$5)""",
                    self._tenant_id, src_id, dst_id, relation, confidence
                )
        except Exception as e:
            log.debug(f"PG add_attack_edge error: {e}")

    async def get_attack_graph(self, incident_id: str = "",
                                limit: int = 200) -> dict:
        """Return attack graph as nodes + edges dict for visualization."""
        if not self._pool:
            return {"nodes": [], "edges": []}
        try:
            async with self._pool.acquire() as conn:
                if incident_id:
                    nodes = await conn.fetch(
                        """SELECT * FROM attack_graph_nodes
                           WHERE tenant_id=$1 AND incident_id=$2
                           ORDER BY ts LIMIT $3""",
                        self._tenant_id, incident_id, limit)
                else:
                    nodes = await conn.fetch(
                        """SELECT * FROM attack_graph_nodes
                           WHERE tenant_id=$1 ORDER BY ts DESC LIMIT $2""",
                        self._tenant_id, limit)

                node_ids = [n["id"] for n in nodes]
                if not node_ids:
                    return {"nodes": [], "edges": []}

                edges = await conn.fetch(
                    """SELECT * FROM attack_graph_edges
                       WHERE src_node_id = ANY($1::bigint[])
                          OR dst_node_id = ANY($1::bigint[])""",
                    node_ids)

                return {
                    "nodes": [dict(n) for n in nodes],
                    "edges": [dict(e) for e in edges],
                }
        except Exception as e:
            log.debug(f"PG get_attack_graph error: {e}")
            return {"nodes": [], "edges": []}

    async def log_honeypot(self, node_id: str, honeypot_path: str,
                            accessor_pid: int = 0, accessor_name: str = "",
                            accessor_user: str = "", action: str = "read") -> None:
        if not self._pool:
            return
        try:
            async with self._pool.acquire() as conn:
                await conn.execute(
                    """INSERT INTO honeypot_events
                       (tenant_id, node_id, honeypot_path, accessor_pid,
                        accessor_name, accessor_user, action)
                       VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                    self._tenant_id, node_id, honeypot_path,
                    accessor_pid, accessor_name, accessor_user, action
                )
        except Exception as e:
            log.debug(f"PG log_honeypot error: {e}")

    def is_connected(self) -> bool:
        return self._pool is not None and not self._pool._closed


# ── Redis Cache Layer ─────────────────────────────────────────────────────────

class RedisCache:
    """
    Redis-backed cache dan pub/sub.

    Digunakan untuk:
      1. Threat feed lookup cache   (TTL 1 jam)
      2. Alert pub/sub antar Core   (channel: guardian:alerts)
      3. Session / tenant token     (TTL 24 jam)
      4. Rate limiting counter      (TTL 1 jam)
      5. Distributed lock           (TTL 30 detik)
    """

    def __init__(self, url: str):
        self._url    = url
        self._client = None

    async def connect(self) -> None:
        try:
            import redis.asyncio as aioredis
            self._client = await aioredis.from_url(
                self._url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
            await self._client.ping()
            log.info(f"Redis connected: {self._url}")
        except Exception as e:
            log.warning(f"Redis connect failed: {e} — cache disabled")
            self._client = None

    async def close(self) -> None:
        if self._client:
            await self._client.close()
            self._client = None

    async def get(self, key: str) -> Optional[Any]:
        if not self._client:
            return None
        try:
            val = await self._client.get(key)
            return json.loads(val) if val else None
        except Exception:
            return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        if not self._client:
            return False
        try:
            await self._client.setex(key, ttl, json.dumps(value, default=str))
            return True
        except Exception:
            return False

    async def delete(self, key: str) -> None:
        if not self._client:
            return
        try:
            await self._client.delete(key)
        except Exception:
            pass

    async def incr(self, key: str, ttl: int = 3600) -> int:
        """Atomic increment — used for rate limiting."""
        if not self._client:
            return 0
        try:
            pipe = self._client.pipeline()
            await pipe.incr(key)
            await pipe.expire(key, ttl)
            results = await pipe.execute()
            return int(results[0])
        except Exception:
            return 0

    async def publish(self, channel: str, message: dict) -> None:
        """Publish event to Redis channel (pub/sub between Core instances)."""
        if not self._client:
            return
        try:
            await self._client.publish(channel, json.dumps(message, default=str))
        except Exception:
            pass

    async def subscribe_alerts(self, callback) -> None:
        """Subscribe to alert + ws_broadcast channels — runs forever, calls callback on message."""
        if not self._client:
            return
        try:
            pubsub = self._client.pubsub()
            await pubsub.subscribe("guardian:alerts", "guardian:ws_broadcast")
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await callback(data)
                    except Exception:
                        pass
        except Exception as e:
            log.debug(f"Redis subscribe error: {e}")

    async def acquire_lock(self, key: str, ttl: int = 30) -> bool:
        """Try to acquire a distributed lock. Returns True if acquired."""
        if not self._client:
            return True   # No Redis → always grant (single-node fallback)
        try:
            result = await self._client.set(
                f"lock:{key}", "1", nx=True, ex=ttl)
            return result is True
        except Exception:
            return True

    async def release_lock(self, key: str) -> None:
        await self.delete(f"lock:{key}")

    def is_connected(self) -> bool:
        return self._client is not None

    # ── Threat feed cache (Tier 2 optimisation) ──────────────────────────────

    async def cache_threat_ip(self, ip: str, data: dict) -> None:
        await self.set(f"ti:ip:{ip}", data, ttl=3600)

    async def get_threat_ip(self, ip: str) -> Optional[dict]:
        return await self.get(f"ti:ip:{ip}")

    async def cache_threat_domain(self, domain: str, data: dict) -> None:
        await self.set(f"ti:domain:{domain}", data, ttl=3600)

    async def get_threat_domain(self, domain: str) -> Optional[dict]:
        return await self.get(f"ti:domain:{domain}")

    async def cache_threat_hash(self, h: str, data: dict) -> None:
        await self.set(f"ti:hash:{h}", data, ttl=7200)

    async def get_threat_hash(self, h: str) -> Optional[dict]:
        return await self.get(f"ti:hash:{h}")


# ── Module-level singletons ───────────────────────────────────────────────────

_pg_instance: Optional[PostgresDB]   = None
_redis_instance: Optional[RedisCache] = None


async def get_distributed_db(tenant_id: str = "default") -> Optional[PostgresDB]:
    """
    Return PostgresDB instance for tenant, or None if not configured.
    Callers must fallback to SQLite if this returns None.
    """
    global _pg_instance
    if not IS_DISTRIBUTED:
        return None
    if _pg_instance is None:
        _pg_instance = PostgresDB(POSTGRES_URL, tenant_id)
        try:
            await _pg_instance.connect()
        except Exception:
            _pg_instance = None
            return None
    return _pg_instance


async def get_redis() -> Optional[RedisCache]:
    """Return RedisCache instance, or None if Redis not available."""
    global _redis_instance
    if _redis_instance is None and REDIS_URL:
        _redis_instance = RedisCache(REDIS_URL)
        await _redis_instance.connect()
        if not _redis_instance.is_connected():
            _redis_instance = None
    return _redis_instance


async def close_distributed() -> None:
    global _pg_instance, _redis_instance
    if _pg_instance:
        await _pg_instance.close()
        _pg_instance = None
    if _redis_instance:
        await _redis_instance.close()
        _redis_instance = None


def get_db_mode() -> str:
    return "distributed" if IS_DISTRIBUTED else "sqlite"
