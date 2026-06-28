# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Production SQLite Database (WAL Mode)
Replaces all JSON file-based storage with a single thread-safe SQLite DB.

Tables:
  jobs          — job queue + history (unified, status-based)
  job_cache     — semantic dedup cache
  workers       — worker registry with heartbeat + circuit breaker
  nodes         — cluster node registry
  cost_events   — per-job billing ledger
  circuit_events— circuit breaker audit trail
  settings      — key/value config store
  rate_limits   — per-caller rate limiting
  metrics       — time-series performance counters (7-day retention)
  audit_log     — security/admin audit trail
"""
from __future__ import annotations
import json, logging, sqlite3, threading, time, os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional

log = logging.getLogger("orchestra.db")

DATA_DIR       = Path(os.environ.get("DATA_DIR", "./data"))
DB_PATH        = DATA_DIR / "orchestra.db"
SCHEMA_VERSION = 4

SCHEMA = """
PRAGMA journal_mode = WAL;
PRAGMA synchronous  = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA cache_size   = -65536;
PRAGMA wal_autocheckpoint = 1000;

CREATE TABLE IF NOT EXISTS _schema_version (
    version    INTEGER NOT NULL,
    applied_at REAL    NOT NULL DEFAULT (unixepoch('now','subsec'))
);

CREATE TABLE IF NOT EXISTS jobs (
    id                TEXT    PRIMARY KEY,
    task_type         TEXT    NOT NULL DEFAULT 'chat',
    messages          TEXT    NOT NULL DEFAULT '[]',
    model             TEXT    DEFAULT '',
    provider_id       TEXT    DEFAULT '',
    max_tokens        INTEGER DEFAULT 2048,
    temperature       REAL    DEFAULT 0.7,
    priority          TEXT    DEFAULT 'normal',
    priority_score    INTEGER DEFAULT 40,
    caller_id         TEXT    DEFAULT '',
    callback_url      TEXT    DEFAULT '',
    cache_key         TEXT    DEFAULT '',
    metadata          TEXT    DEFAULT '{}',
    status            TEXT    DEFAULT 'queued',
    worker_id         TEXT    DEFAULT '',
    result            TEXT    DEFAULT '',
    error             TEXT    DEFAULT '',
    input_tokens      INTEGER DEFAULT 0,
    output_tokens     INTEGER DEFAULT 0,
    cost_usd          REAL    DEFAULT 0,
    latency_ms        INTEGER DEFAULT 0,
    model_used        TEXT    DEFAULT '',
    provider_used     TEXT    DEFAULT '',
    attempt           INTEGER DEFAULT 0,
    max_attempts      INTEGER DEFAULT 3,
    sla_ms            INTEGER DEFAULT 0,
    parent_job_id     TEXT    DEFAULT '',
    semantic_category TEXT    DEFAULT '',
    quality_score     REAL    DEFAULT 0,
    queued_at         REAL    NOT NULL DEFAULT (unixepoch('now','subsec')),
    started_at        REAL    DEFAULT NULL,
    done_at           REAL    DEFAULT NULL,
    expires_at        REAL    DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_status_prio ON jobs(status, priority_score DESC, queued_at);
CREATE INDEX IF NOT EXISTS idx_jobs_cache        ON jobs(cache_key)      WHERE cache_key != '';
CREATE INDEX IF NOT EXISTS idx_jobs_caller       ON jobs(caller_id)      WHERE caller_id != '';
CREATE INDEX IF NOT EXISTS idx_jobs_parent       ON jobs(parent_job_id)  WHERE parent_job_id != '';
CREATE INDEX IF NOT EXISTS idx_jobs_done_at      ON jobs(done_at)        WHERE done_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS job_cache (
    cache_key    TEXT    PRIMARY KEY,
    result       TEXT    NOT NULL,
    model_used   TEXT    DEFAULT '',
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    hit_count    INTEGER DEFAULT 1,
    created_at   REAL    NOT NULL DEFAULT (unixepoch('now','subsec')),
    last_hit     REAL    NOT NULL DEFAULT (unixepoch('now','subsec')),
    ttl_sec      INTEGER DEFAULT 3600
);

CREATE TABLE IF NOT EXISTS workers (
    id             TEXT    PRIMARY KEY,
    node_id        TEXT    NOT NULL DEFAULT '',
    worker_type    TEXT    NOT NULL DEFAULT 'cpu',
    provider_id    TEXT    NOT NULL DEFAULT '',
    model          TEXT    NOT NULL DEFAULT '',
    concurrency    INTEGER DEFAULT 5,
    timeout_sec    INTEGER DEFAULT 60,
    retry_count    INTEGER DEFAULT 3,
    priority       TEXT    DEFAULT 'normal',
    gpu_vram_gb    REAL    DEFAULT 0,
    base_url       TEXT    DEFAULT '',
    worker_url     TEXT    DEFAULT '',
    label          TEXT    DEFAULT '',
    status         TEXT    DEFAULT 'active',
    load_pct       INTEGER DEFAULT 0,
    tasks_active   INTEGER DEFAULT 0,
    tasks_total    INTEGER DEFAULT 0,
    tasks_done     INTEGER DEFAULT 0,
    tasks_error    INTEGER DEFAULT 0,
    avg_latency_ms REAL    DEFAULT 0,
    error_rate     REAL    DEFAULT 0,
    circuit_state  TEXT    DEFAULT 'closed',
    circuit_open_at REAL   DEFAULT NULL,
    idle_since     REAL    DEFAULT NULL,
    last_heartbeat REAL    NOT NULL DEFAULT (unixepoch('now','subsec')),
    registered_at  REAL    NOT NULL DEFAULT (unixepoch('now','subsec'))
);
CREATE INDEX IF NOT EXISTS idx_workers_status   ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_provider ON workers(provider_id);

CREATE TABLE IF NOT EXISTS nodes (
    id             TEXT    PRIMARY KEY,
    name           TEXT    NOT NULL DEFAULT '',
    endpoint       TEXT    NOT NULL DEFAULT '',
    node_type      TEXT    DEFAULT 'cpu',
    max_workers    INTEGER DEFAULT 10,
    region         TEXT    DEFAULT '',
    cluster_id     TEXT    DEFAULT '',
    tags           TEXT    DEFAULT '[]',
    status         TEXT    DEFAULT 'online',
    cpu_pct        INTEGER DEFAULT 0,
    mem_pct        INTEGER DEFAULT 0,
    gpu_pct        INTEGER DEFAULT 0,
    gpu_vram_free  REAL    DEFAULT 0,
    throughput_rps REAL    DEFAULT 0,
    last_heartbeat REAL    NOT NULL DEFAULT (unixepoch('now','subsec')),
    registered_at  REAL    NOT NULL DEFAULT (unixepoch('now','subsec'))
);

CREATE TABLE IF NOT EXISTS cost_events (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    ts                REAL    NOT NULL DEFAULT (unixepoch('now','subsec')),
    job_id            TEXT    NOT NULL DEFAULT '',
    provider_id       TEXT    NOT NULL DEFAULT '',
    model             TEXT    DEFAULT '',
    input_tokens      INTEGER DEFAULT 0,
    output_tokens     INTEGER DEFAULT 0,
    cost_usd          REAL    NOT NULL DEFAULT 0,
    caller_id         TEXT    DEFAULT '',
    semantic_category TEXT    DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_cost_ts       ON cost_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_cost_provider ON cost_events(provider_id);
CREATE INDEX IF NOT EXISTS idx_cost_caller   ON cost_events(caller_id);

CREATE TABLE IF NOT EXISTS circuit_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ts          REAL    NOT NULL DEFAULT (unixepoch('now','subsec')),
    provider_id TEXT    NOT NULL,
    event_type  TEXT    NOT NULL,
    error_msg   TEXT    DEFAULT '',
    error_rate  REAL    DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_circuit_ts ON circuit_events(ts DESC);

CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    updated_at REAL NOT NULL DEFAULT (unixepoch('now','subsec'))
);

CREATE TABLE IF NOT EXISTS rate_limits (
    caller_id       TEXT PRIMARY KEY,
    rpm_limit       INTEGER DEFAULT 60,
    tpm_limit       INTEGER DEFAULT 100000,
    daily_usd_limit REAL    DEFAULT 0,
    rpm_used        INTEGER DEFAULT 0,
    tpm_used        INTEGER DEFAULT 0,
    daily_usd_used  REAL    DEFAULT 0,
    window_start    REAL    NOT NULL DEFAULT (unixepoch('now','subsec'))
);

CREATE TABLE IF NOT EXISTS metrics (
    ts     REAL NOT NULL DEFAULT (unixepoch('now','subsec')),
    metric TEXT NOT NULL,
    value  REAL NOT NULL,
    labels TEXT DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics(ts DESC, metric);

CREATE TABLE IF NOT EXISTS audit_log (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    ts       REAL    NOT NULL DEFAULT (unixepoch('now','subsec')),
    actor    TEXT    NOT NULL DEFAULT '',
    action   TEXT    NOT NULL,
    resource TEXT    DEFAULT '',
    detail   TEXT    DEFAULT '',
    ip_addr  TEXT    DEFAULT '',
    result   TEXT    DEFAULT 'ok'
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts DESC);
"""

DEFAULT_SETTINGS = {
    "routing_mode":           "smart_balance",
    "budget_daily_usd":       "0",
    "budget_monthly_usd":     "0",
    "blacklist":              "[]",
    "fallback_chain":         "[]",
    "force_local_for":        "[]",
    "circuit_threshold":      "0.50",
    "circuit_timeout_sec":    "60",
    "cache_enabled":          "true",
    "cache_ttl_sec":          "3600",
    "batch_enabled":          "false",
    "batch_window_ms":        "1000",
    "sla_default_ms":         "0",
    "max_queue_size":         "50000",
    "autoscale_enabled":      "false",
    "autoscale_threshold":    "20",
    "autoscale_max_cpu":      "10",
    "autoscale_max_gpu":      "4",
    "idle_worker_timeout":    "300",
    "quality_retry_enabled":  "true",
    "quality_retry_threshold":"0.30",
    "semantic_cache_enabled": "true",
}

PRIORITY_SCORE: Dict[str, int] = {
    "critical": 100, "urgent": 80, "high": 60, "normal": 40, "low": 20,
}

# ── Thread-local connection pool ──────────────────────────────────────────────
_tls        = threading.local()
_write_lock = threading.Lock()


def _get_conn() -> sqlite3.Connection:
    conn = getattr(_tls, "conn", None)
    if conn is None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(DB_PATH), check_same_thread=False,
                               timeout=30, isolation_level=None)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA cache_size=-65536")
        _tls.conn = conn
    return conn


def _busy_exec(conn, sql, params=(), retries=8):
    delay = 0.005
    for i in range(retries):
        try:
            return conn.execute(sql, params)
        except sqlite3.OperationalError as e:
            if "locked" in str(e).lower() and i < retries - 1:
                time.sleep(delay); delay = min(delay * 2, 0.5)
            else:
                raise


@contextmanager
def _write_tx() -> Generator:
    with _write_lock:
        conn = _get_conn()
        conn.execute("BEGIN IMMEDIATE")
        try:
            yield conn
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise


# ── Public read/write helpers ─────────────────────────────────────────────────

def q(sql: str, params: tuple = ()) -> List[Dict]:
    return [dict(r) for r in _busy_exec(_get_conn(), sql, params).fetchall()]


def q1(sql: str, params: tuple = ()) -> Optional[Dict]:
    rows = q(sql, params); return rows[0] if rows else None


def ex(sql: str, params: tuple = ()) -> int:
    with _write_tx() as c:
        return _busy_exec(c, sql, params).rowcount


def ex_many(sql: str, rows: List[tuple]) -> int:
    if not rows: return 0
    with _write_tx() as c:
        return c.executemany(sql, rows).rowcount


# ── Init ──────────────────────────────────────────────────────────────────────

def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = _get_conn()
    conn.executescript(SCHEMA)
    conn.commit()
    row     = q1("SELECT MAX(version) AS v FROM _schema_version")
    current = (row or {}).get("v") or 0
    if current < SCHEMA_VERSION:
        with _write_tx() as c:
            # v4: add worker_url column for GPU worker self-endpoint registration
            if current < 4:
                try:
                    c.execute("ALTER TABLE workers ADD COLUMN worker_url TEXT DEFAULT ''")
                    log.info("DB migration v4: added workers.worker_url")
                except Exception:
                    pass  # column may already exist on fresh install from new SCHEMA
            c.execute("INSERT INTO _schema_version(version) VALUES(?)", (SCHEMA_VERSION,))
        log.info(f"Orchestra DB schema v{SCHEMA_VERSION} applied")
    with _write_tx() as c:
        for k, v in DEFAULT_SETTINGS.items():
            c.execute("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)", (k, v))
    log.info(f"Orchestra DB ready: {DB_PATH}")


# ── Settings ──────────────────────────────────────────────────────────────────

def get_setting(key: str, default: str = "") -> str:
    row = q1("SELECT value FROM settings WHERE key=?", (key,))
    return row["value"] if row else default


def set_setting(key: str, value: str) -> None:
    ex("INSERT INTO settings(key,value,updated_at) VALUES(?,?,unixepoch('now','subsec')) "
       "ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
       (key, value))


def get_all_settings() -> Dict[str, str]:
    return {r["key"]: r["value"] for r in q("SELECT key,value FROM settings")}


# ── Jobs ──────────────────────────────────────────────────────────────────────

def enqueue_job(job_id: str, task_type: str, messages: list,
                model: str = "", provider_id: str = "", max_tokens: int = 2048,
                temperature: float = 0.7, priority: str = "normal",
                caller_id: str = "", metadata: dict = None, callback_url: str = "",
                sla_ms: int = 0, parent_job_id: str = "", cache_key: str = "",
                max_attempts: int = 3, semantic_category: str = "") -> None:
    score   = PRIORITY_SCORE.get(priority, 40)
    now     = time.time()
    expires = now + 3600 if not sla_ms else now + sla_ms / 1000 + 60
    with _write_tx() as c:
        c.execute(
            """INSERT INTO jobs(id,task_type,messages,model,provider_id,max_tokens,temperature,
               priority,priority_score,caller_id,metadata,callback_url,cache_key,sla_ms,
               parent_job_id,max_attempts,expires_at,semantic_category)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (job_id, task_type, json.dumps(messages), model, provider_id, max_tokens,
             temperature, priority, score, caller_id, json.dumps(metadata or {}),
             callback_url, cache_key, sla_ms, parent_job_id, max_attempts, expires,
             semantic_category))


def dequeue_job(worker_id: str) -> Optional[Dict]:
    with _write_tx() as c:
        row = c.execute(
            """SELECT j.* FROM jobs j WHERE j.status='queued'
               AND (j.expires_at IS NULL OR j.expires_at > unixepoch('now','subsec'))
               AND (j.parent_job_id='' OR EXISTS(
                     SELECT 1 FROM jobs p WHERE p.id=j.parent_job_id AND p.status='done'))
               ORDER BY j.priority_score DESC, j.queued_at ASC LIMIT 1"""
        ).fetchone()
        if not row:
            return None
        job = dict(row)
        c.execute("UPDATE jobs SET status='running',worker_id=?,started_at=unixepoch('now','subsec'),"
                  "attempt=attempt+1 WHERE id=?", (worker_id, job["id"]))
    job["messages"] = json.loads(job.get("messages") or "[]")
    job["metadata"] = json.loads(job.get("metadata") or "{}")
    return job


def finish_job(job_id: str, result: str = "", error: str = "",
               input_tokens: int = 0, output_tokens: int = 0, cost_usd: float = 0,
               latency_ms: int = 0, model_used: str = "", provider_used: str = "",
               quality_score: float = 0) -> None:
    status = "done" if not error else "error"
    with _write_tx() as c:
        c.execute(
            """UPDATE jobs SET status=?,result=?,error=?,input_tokens=?,output_tokens=?,
               cost_usd=?,latency_ms=?,model_used=?,provider_used=?,quality_score=?,
               done_at=unixepoch('now','subsec') WHERE id=?""",
            (status, result, error, input_tokens, output_tokens, cost_usd,
             latency_ms, model_used, provider_used, quality_score, job_id))
        if cost_usd > 0:
            job = c.execute("SELECT provider_id,model,caller_id,semantic_category FROM jobs WHERE id=?",
                            (job_id,)).fetchone()
            if job:
                c.execute(
                    """INSERT INTO cost_events(job_id,provider_id,model,input_tokens,output_tokens,
                       cost_usd,caller_id,semantic_category) VALUES(?,?,?,?,?,?,?,?)""",
                    (job_id, provider_used or job["provider_id"], model_used or job["model"],
                     input_tokens, output_tokens, cost_usd, job["caller_id"],
                     job["semantic_category"]))


def retry_job(job_id: str) -> bool:
    job = q1("SELECT attempt,max_attempts FROM jobs WHERE id=?", (job_id,))
    if not job or job["attempt"] >= job["max_attempts"]:
        return False
    delay = min(2 ** job["attempt"], 60)
    ex("UPDATE jobs SET status='queued',worker_id='',error='',queued_at=? WHERE id=?",
       (time.time() + delay, job_id))
    return True


def cancel_expired_jobs() -> int:
    return ex("UPDATE jobs SET status='timeout',error='SLA or TTL exceeded' "
              "WHERE status='queued' AND expires_at IS NOT NULL "
              "AND expires_at<unixepoch('now','subsec')")


def get_job(job_id: str) -> Optional[Dict]:
    row = q1("SELECT * FROM jobs WHERE id=?", (job_id,))
    if row:
        row["messages"] = json.loads(row.get("messages") or "[]")
        row["metadata"] = json.loads(row.get("metadata") or "{}")
    return row


def get_queue_snapshot() -> Dict:
    by_status = q("SELECT status,priority,COUNT(*) as cnt,AVG(latency_ms) as avg_lat "
                  "FROM jobs GROUP BY status,priority")
    depth   = (q1("SELECT COUNT(*) as n FROM jobs WHERE status='queued'") or {}).get("n", 0)
    running = (q1("SELECT COUNT(*) as n FROM jobs WHERE status='running'") or {}).get("n", 0)
    done24  = (q1("SELECT COUNT(*) as n FROM jobs WHERE status='done' "
                  "AND done_at>unixepoch('now','subsec')-86400") or {}).get("n", 0)
    err24   = (q1("SELECT COUNT(*) as n FROM jobs WHERE status='error' "
                  "AND done_at>unixepoch('now','subsec')-86400") or {}).get("n", 0)
    return {"by_status": by_status, "depth": depth,
            "running": running, "done_24h": done24, "error_24h": err24}


# ── Semantic Cache ────────────────────────────────────────────────────────────

def cache_get(cache_key: str) -> Optional[Dict]:
    if not cache_key: return None
    row = q1("SELECT * FROM job_cache WHERE cache_key=? "
             "AND (created_at+ttl_sec)>unixepoch('now','subsec')", (cache_key,))
    if row:
        ex("UPDATE job_cache SET hit_count=hit_count+1,last_hit=unixepoch('now','subsec') "
           "WHERE cache_key=?", (cache_key,))
    return row


def cache_set(cache_key: str, result: str, model_used: str = "",
              input_tokens: int = 0, output_tokens: int = 0, ttl_sec: int = 3600) -> None:
    if not cache_key: return
    ex("INSERT INTO job_cache(cache_key,result,model_used,input_tokens,output_tokens,ttl_sec) "
       "VALUES(?,?,?,?,?,?) ON CONFLICT(cache_key) DO UPDATE SET result=excluded.result,"
       "last_hit=unixepoch('now','subsec'),hit_count=hit_count+1",
       (cache_key, result, model_used, input_tokens, output_tokens, ttl_sec))


def cache_evict_expired() -> int:
    return ex("DELETE FROM job_cache WHERE (created_at+ttl_sec)<unixepoch('now','subsec')")


# ── Workers ───────────────────────────────────────────────────────────────────

def upsert_worker(w: Dict) -> None:
    ex("""INSERT INTO workers(id,node_id,worker_type,provider_id,model,concurrency,timeout_sec,
       retry_count,priority,gpu_vram_gb,base_url,worker_url,label,status)
       VALUES(:id,:node_id,:worker_type,:provider_id,:model,:concurrency,:timeout_sec,
       :retry_count,:priority,:gpu_vram_gb,:base_url,:worker_url,:label,:status)
       ON CONFLICT(id) DO UPDATE SET status=excluded.status,provider_id=excluded.provider_id,
       model=excluded.model,base_url=excluded.base_url,worker_url=excluded.worker_url,
       last_heartbeat=unixepoch('now','subsec')""",
       w)


def heartbeat_worker(worker_id: str, load_pct: int, tasks_active: int) -> bool:
    return ex(
        """UPDATE workers SET last_heartbeat=unixepoch('now','subsec'),status='active',
           load_pct=?,tasks_active=?,
           idle_since=CASE WHEN ?> 0 THEN NULL
                      ELSE COALESCE(idle_since,unixepoch('now','subsec')) END
           WHERE id=?""",
        (load_pct, tasks_active, tasks_active, worker_id)) > 0


def update_worker_stats(worker_id: str, latency_ms: float, success: bool) -> None:
    ex("""UPDATE workers SET avg_latency_ms=avg_latency_ms*0.8+?*0.2,
          tasks_total=tasks_total+1,tasks_done=tasks_done+?,tasks_error=tasks_error+?,
          error_rate=CAST(tasks_error AS REAL)/MAX(tasks_total,1) WHERE id=?""",
       (latency_ms, 1 if success else 0, 0 if success else 1, worker_id))


def get_active_workers(timeout_sec: int = 90) -> List[Dict]:
    cutoff = time.time() - timeout_sec
    rows   = q("SELECT * FROM workers WHERE last_heartbeat>? ORDER BY load_pct ASC", (cutoff,))
    for r in rows:
        if (r.get("last_heartbeat") or 0) < cutoff:
            r["status"] = "offline"
    return rows


def remove_worker(worker_id: str) -> bool:
    return ex("DELETE FROM workers WHERE id=?", (worker_id,)) > 0


def get_idle_workers(idle_threshold_sec: int = 300) -> List[Dict]:
    cutoff = time.time() - idle_threshold_sec
    return q("SELECT * FROM workers WHERE status='active' AND tasks_active=0 "
             "AND idle_since IS NOT NULL AND idle_since<?", (cutoff,))


# ── Circuit Breaker ───────────────────────────────────────────────────────────

def circuit_check(provider_id: str) -> str:
    worker = q1("SELECT circuit_state,circuit_open_at,error_rate FROM workers "
                "WHERE provider_id=? LIMIT 1", (provider_id,))
    if not worker: return "closed"
    state   = worker.get("circuit_state", "closed")
    timeout = float(get_setting("circuit_timeout_sec", "60"))
    if state == "open":
        open_at = worker.get("circuit_open_at") or 0
        if time.time() - open_at > timeout:
            ex("UPDATE workers SET circuit_state='half_open' WHERE provider_id=?", (provider_id,))
            return "half_open"
    return state


def circuit_record_failure(provider_id: str, error_msg: str = "") -> None:
    threshold = float(get_setting("circuit_threshold", "0.50"))
    worker    = q1("SELECT id,error_rate,circuit_state FROM workers "
                   "WHERE provider_id=? LIMIT 1", (provider_id,))
    if not worker: return
    if worker["error_rate"] >= threshold and worker["circuit_state"] != "open":
        with _write_tx() as c:
            c.execute("UPDATE workers SET circuit_state='open',"
                      "circuit_open_at=unixepoch('now','subsec') WHERE provider_id=?",
                      (provider_id,))
            c.execute("INSERT INTO circuit_events(provider_id,event_type,error_msg,error_rate) "
                      "VALUES(?,?,?,?)", (provider_id,"open",error_msg,worker["error_rate"]))
        log.warning(f"⚡ Circuit OPEN: {provider_id} err={worker['error_rate']:.1%}")


def circuit_record_success(provider_id: str) -> None:
    worker = q1("SELECT circuit_state FROM workers WHERE provider_id=? LIMIT 1", (provider_id,))
    if worker and worker["circuit_state"] in ("open","half_open"):
        with _write_tx() as c:
            c.execute("UPDATE workers SET circuit_state='closed',error_rate=error_rate*0.5 "
                      "WHERE provider_id=?", (provider_id,))
            c.execute("INSERT INTO circuit_events(provider_id,event_type) VALUES(?,?)",
                      (provider_id,"close"))


# ── Rate Limiting ─────────────────────────────────────────────────────────────

def check_rate_limit(caller_id: str, tokens: int = 0) -> Dict:
    if not caller_id: return {"ok": True}
    row = q1("SELECT * FROM rate_limits WHERE caller_id=?", (caller_id,))
    if not row: return {"ok": True}
    now = time.time()
    if now - row["window_start"] > 60:
        ex("UPDATE rate_limits SET rpm_used=0,tpm_used=0,window_start=? WHERE caller_id=?",
           (now, caller_id))
        row["rpm_used"] = 0; row["tpm_used"] = 0
    if row["rpm_limit"] > 0 and row["rpm_used"] >= row["rpm_limit"]:
        return {"ok": False, "reason": "rpm_exceeded", "limit": row["rpm_limit"]}
    if row["tpm_limit"] > 0 and row["tpm_used"] + tokens > row["tpm_limit"]:
        return {"ok": False, "reason": "tpm_exceeded", "limit": row["tpm_limit"]}
    ex("UPDATE rate_limits SET rpm_used=rpm_used+1,tpm_used=tpm_used+? WHERE caller_id=?",
       (tokens, caller_id))
    return {"ok": True}


# ── Nodes ─────────────────────────────────────────────────────────────────────

def upsert_node(node: Dict) -> None:
    ex("""INSERT INTO nodes(id,name,endpoint,node_type,max_workers,region,cluster_id,tags)
       VALUES(:id,:name,:endpoint,:node_type,:max_workers,:region,:cluster_id,:tags)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name,endpoint=excluded.endpoint,
       last_heartbeat=unixepoch('now','subsec'),status='online'""", node)


def get_nodes(timeout_sec: int = 120) -> List[Dict]:
    cutoff = time.time() - timeout_sec
    rows   = q("SELECT * FROM nodes ORDER BY last_heartbeat DESC")
    for r in rows:
        if (r.get("last_heartbeat") or 0) < cutoff:
            r["status"] = "offline"
    return rows


def heartbeat_node(node_id: str, cpu_pct: int = 0, mem_pct: int = 0,
                   gpu_pct: int = 0, throughput_rps: float = 0) -> bool:
    return ex("UPDATE nodes SET last_heartbeat=unixepoch('now','subsec'),status='online',"
              "cpu_pct=?,mem_pct=?,gpu_pct=?,throughput_rps=? WHERE id=?",
              (cpu_pct, mem_pct, gpu_pct, throughput_rps, node_id)) > 0


# ── Cost Analytics ────────────────────────────────────────────────────────────

def get_cost_summary() -> Dict:
    day_s = time.time() - 86400; month_s = time.time() - 30*86400; week_s = time.time()-604800
    today = (q1("SELECT COALESCE(SUM(cost_usd),0) as t FROM cost_events WHERE ts>?", (day_s,)) or {}).get("t",0)
    month = (q1("SELECT COALESCE(SUM(cost_usd),0) as t FROM cost_events WHERE ts>?", (month_s,)) or {}).get("t",0)
    total = (q1("SELECT COALESCE(SUM(cost_usd),0) as t FROM cost_events") or {}).get("t",0)
    week  = (q1("SELECT COALESCE(SUM(cost_usd),0) as t FROM cost_events WHERE ts>?", (week_s,)) or {}).get("t",0)
    by_prov   = q("SELECT provider_id,ROUND(SUM(cost_usd),4) as cost FROM cost_events WHERE ts>? "
                  "GROUP BY provider_id ORDER BY cost DESC", (month_s,))
    by_caller = q("SELECT caller_id,ROUND(SUM(cost_usd),4) as cost FROM cost_events WHERE ts>? "
                  "GROUP BY caller_id ORDER BY cost DESC LIMIT 10", (month_s,))
    by_cat    = q("SELECT semantic_category,ROUND(SUM(cost_usd),4) as cost FROM cost_events "
                  "WHERE ts>? GROUP BY semantic_category ORDER BY cost DESC", (month_s,))
    return {"today_usd": round(today,4), "month_usd": round(month,4), "total_usd": round(total,4),
            "forecast_30d": round(week/7*30,2) if week else 0,
            "by_provider": by_prov, "by_caller": by_caller, "by_category": by_cat}


def get_performance_stats(hours: int = 24) -> Dict:
    since = time.time() - hours*3600
    done  = q1("SELECT COUNT(*) as n, AVG(latency_ms) as avg_lat FROM jobs "
               "WHERE status='done' AND done_at>?", (since,)) or {}
    err   = q1("SELECT COUNT(*) as n FROM jobs WHERE status='error' AND done_at>?",
               (since,)) or {}
    lats  = [r["latency_ms"] for r in
             q("SELECT latency_ms FROM jobs WHERE status='done' AND done_at>? ORDER BY latency_ms",
               (since,)) if r["latency_ms"]]
    def pct(lst,p): return lst[max(0,int(len(lst)*p/100)-1)] if lst else 0
    total_n = (done.get("n") or 0) + (err.get("n") or 0)
    return {"total_jobs": done.get("n") or 0, "error_count": err.get("n") or 0,
            "error_rate": round((err.get("n") or 0)/max(total_n,1),3),
            "avg_lat_ms": round(done.get("avg_lat") or 0,1),
            "p50_lat_ms": pct(lats,50), "p95_lat_ms": pct(lats,95), "p99_lat_ms": pct(lats,99),
            "throughput_rps": round((done.get("n") or 0)/max(hours*3600,1),4)}


# ── Metrics & Audit ───────────────────────────────────────────────────────────

def record_metric(metric: str, value: float, labels: dict = None) -> None:
    ex("INSERT INTO metrics(metric,value,labels) VALUES(?,?,?)",
       (metric, value, json.dumps(labels or {})))


def prune_metrics(days: int = 7) -> int:
    return ex("DELETE FROM metrics WHERE ts<unixepoch('now','subsec')-?", (days*86400,))


def audit(actor: str, action: str, resource: str = "", detail: str = "",
          ip_addr: str = "", result: str = "ok") -> None:
    ex("INSERT INTO audit_log(actor,action,resource,detail,ip_addr,result) VALUES(?,?,?,?,?,?)",
       (actor, action, resource, detail, ip_addr, result))


def get_audit_log(limit: int = 100) -> List[Dict]:
    return q("SELECT * FROM audit_log ORDER BY ts DESC LIMIT ?", (limit,))
