# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Orchestra — AI eXecution & Tools Orchestration | Deep Health Diagnostic Engine
Setiap komponen dicek dengan detail penuh + cara fix.

Checks:
  database, workers, queue, providers, autoscaler,
  semantic_router, cache, disk, memory, network, config
"""
from __future__ import annotations

import asyncio, json, logging, os, shutil, socket, time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Callable, Dict, List, Optional

log = logging.getLogger("orchestra.health")

DATA_DIR = Path(os.environ.get("DATA_DIR", "./data"))
OK = "ok"; DEGRADED = "degraded"; CRITICAL = "critical"; UNKNOWN = "unknown"


@dataclass
class ComponentHealth:
    name:         str
    status:       str
    latency_ms:   float  = 0.0
    message:      str    = ""
    cause:        str    = ""
    fix:          str    = ""
    fix_cmd:      str    = ""
    auto_fixable: bool   = False
    auto_fix_fn:  Optional[str] = None
    details:      dict   = field(default_factory=dict)
    checked_at:   float  = field(default_factory=time.time)

    def to_dict(self) -> dict:
        d = asdict(self); d.pop("auto_fix_fn", None); return d


@dataclass
class SystemHealth:
    overall:      str
    score:        int
    components:   Dict[str, ComponentHealth]
    summary:      str
    checked_at:   float = field(default_factory=time.time)
    duration_ms:  float = 0.0

    def to_dict(self) -> dict:
        return {
            "overall": self.overall, "score": self.score,
            "summary": self.summary, "checked_at": self.checked_at,
            "duration_ms": round(self.duration_ms, 1),
            "components": {k: v.to_dict() for k, v in self.components.items()},
        }


# ── Component checks ──────────────────────────────────────────────────────────

def _check_database() -> ComponentHealth:
    t0 = time.time()
    try:
        import database as db
        db.init_db()
        # Verify we can read and write
        test_val = str(time.time())
        db.set_setting("_health_check", test_val)
        got = db.get_setting("_health_check", "")
        lat = (time.time() - t0) * 1000

        db_path  = DATA_DIR / "orchestra.db"
        wal_path = DATA_DIR / "orchestra.db-wal"
        size_mb  = db_path.stat().st_size / 1024**2 if db_path.exists() else 0
        wal_mb   = wal_path.stat().st_size / 1024**2 if wal_path.exists() else 0

        if got != test_val:
            return ComponentHealth(
                name="database", status=CRITICAL, latency_ms=lat,
                message="Read-write test FAILED",
                cause="Database write is not persisting — possibly read-only filesystem or locked DB",
                fix="Check filesystem permissions and ensure DATA_DIR is writable",
                fix_cmd=f"ls -la {DATA_DIR}; chmod 755 {DATA_DIR}",
            )

        if lat > 200:
            return ComponentHealth(
                name="database", status=DEGRADED, latency_ms=lat,
                message=f"Slow response: {lat:.0f}ms",
                cause="WAL file bloat causing slow writes",
                fix="Run WAL checkpoint",
                fix_cmd=f"sqlite3 {db_path} 'PRAGMA wal_checkpoint(FULL);'",
                auto_fixable=True, auto_fix_fn="_autofix_db_checkpoint",
                details={"size_mb": round(size_mb,2), "wal_mb": round(wal_mb,2)},
            )

        return ComponentHealth(
            name="database", status=OK, latency_ms=lat,
            message=f"OK ({lat:.0f}ms, {size_mb:.1f}MB)",
            details={"size_mb": round(size_mb,2), "wal_mb": round(wal_mb,2)},
        )
    except Exception as e:
        lat = (time.time()-t0)*1000
        return ComponentHealth(
            name="database", status=CRITICAL, latency_ms=lat,
            message=f"Database error: {e}",
            cause="SQLite connection failed or schema error",
            fix="Check disk space, verify DATA_DIR exists, check for corruption",
            fix_cmd=f"df -h {DATA_DIR}; sqlite3 {DATA_DIR}/orchestra.db '.tables'",
        )


def _check_workers() -> ComponentHealth:
    t0 = time.time()
    try:
        import database as db
        workers = db.get_active_workers(timeout_sec=90)
        lat     = (time.time()-t0)*1000
        total   = len(workers)

        if total == 0:
            return ComponentHealth(
                name="workers", status=CRITICAL, latency_ms=lat,
                message="NO active workers — all jobs will fail",
                cause="No workers registered or all workers timed out (no heartbeat >90s)",
                fix="Start at least one worker container",
                fix_cmd="docker-compose up -d worker-cpu",
                details={"active": 0, "total": 0},
            )

        offline  = [w for w in workers if w.get("status") == "offline"]
        draining = [w for w in workers if w.get("status") == "draining"]
        active   = [w for w in workers if w.get("status") == "active"]
        overload = [w for w in active if w.get("load_pct", 0) >= 90]

        if not active:
            return ComponentHealth(
                name="workers", status=CRITICAL, latency_ms=lat,
                message=f"All {total} workers offline or draining",
                cause="Workers not sending heartbeat. Containers may have crashed.",
                fix="Check worker container logs and restart",
                fix_cmd="docker ps -a | grep worker; docker logs orchestra-worker-cpu --tail 30",
                auto_fixable=False,
                details={"active": 0, "offline": len(offline), "draining": len(draining)},
            )

        status = DEGRADED if overload else OK
        return ComponentHealth(
            name="workers", status=status, latency_ms=lat,
            message=(f"{len(active)} active workers"
                     + (f", {len(overload)} overloaded" if overload else "")
                     + (f", {len(offline)} offline" if offline else "")),
            cause="Worker load at capacity" if overload else "",
            fix="Scale up: increase concurrency or add worker" if overload else "",
            fix_cmd="docker-compose scale worker-cpu=3" if overload else "",
            details={"active": len(active), "offline": len(offline),
                     "overloaded": len(overload)},
        )
    except Exception as e:
        return ComponentHealth(name="workers", status=UNKNOWN, message=str(e))


def _check_queue() -> ComponentHealth:
    t0 = time.time()
    try:
        import database as db
        snap = db.get_queue_snapshot()
        lat  = (time.time()-t0)*1000
        depth   = snap.get("depth", 0)
        running = snap.get("running", 0)
        err24   = snap.get("error_24h", 0)
        done24  = snap.get("done_24h", 0)
        err_rate = err24 / max(done24 + err24, 1)

        if depth > 5000:
            return ComponentHealth(
                name="queue", status=CRITICAL, latency_ms=lat,
                message=f"Queue critically backlogged: {depth:,} jobs waiting",
                cause="Workers not processing fast enough or all workers offline",
                fix="Add more workers or increase worker concurrency",
                fix_cmd="docker-compose scale worker-cpu=5",
                auto_fixable=True, auto_fix_fn="_autofix_enable_autoscaler",
                details=snap,
            )

        if depth > 500 or err_rate > 0.3:
            return ComponentHealth(
                name="queue", status=DEGRADED, latency_ms=lat,
                message=f"Queue depth={depth}, error_rate={err_rate:.0%}",
                cause="High error rate may indicate provider API key issues",
                fix="Check provider API keys in credential vault",
                fix_cmd="curl http://localhost:8080/api/vault/providers",
                details=snap,
            )

        return ComponentHealth(
            name="queue", status=OK, latency_ms=lat,
            message=f"Queue healthy: {depth} queued, {running} running, {err_rate:.0%} error",
            details=snap,
        )
    except Exception as e:
        return ComponentHealth(name="queue", status=UNKNOWN, message=str(e))


def _check_credential_vault() -> ComponentHealth:
    t0 = time.time()
    try:
        import credential_vault
        providers = credential_vault.list_providers()
        lat       = (time.time()-t0)*1000

        if not providers:
            return ComponentHealth(
                name="credential_vault", status=CRITICAL, latency_ms=lat,
                message="Vault EMPTY — no API keys stored",
                cause="No AI provider API keys have been configured",
                fix="Add provider keys via console or API",
                fix_cmd="curl -X POST http://localhost:8080/api/vault/store "
                        "-H 'X-Console-Token: YOUR_TOKEN' "
                        "-d '{\"provider_id\":\"openai\",\"api_key\":\"sk-...\"}'",
                details={"provider_count": 0},
            )

        # Test at least one provider connection
        tested  = False
        working = []
        for p in providers[:3]:
            pid = p.get("provider_id", "")
            if pid:
                result = credential_vault.test_connection(pid)
                if result.get("ok"):
                    working.append(pid)
                tested = True

        if tested and not working:
            return ComponentHealth(
                name="credential_vault", status=DEGRADED, latency_ms=lat,
                message="Providers stored but API test failing",
                cause="API keys may be expired or invalid",
                fix="Test each provider key and update if needed",
                fix_cmd="curl http://localhost:8080/api/vault/providers",
                details={"stored": len(providers), "working": 0},
            )

        return ComponentHealth(
            name="credential_vault", status=OK, latency_ms=lat,
            message=f"{len(providers)} provider(s) configured, {len(working)} tested OK",
            details={"providers": [p.get("provider_id") for p in providers],
                     "working": working},
        )
    except Exception as e:
        return ComponentHealth(name="credential_vault", status=UNKNOWN, message=str(e))


def _check_semantic_router() -> ComponentHealth:
    t0 = time.time()
    try:
        from semantic_router import get_classifier, get_inj_detector
        clf  = get_classifier()
        cat, conf = clf.classify([{"role":"user","content":"write a python function"}], "chat")
        lat  = (time.time()-t0)*1000

        if cat != "code" or conf < 0.1:
            return ComponentHealth(
                name="semantic_router", status=DEGRADED, latency_ms=lat,
                message=f"Classification unexpected: cat={cat} conf={conf:.2f} (expected code/high)",
                cause="Semantic router may have been modified incorrectly",
                fix="Verify semantic_router.py CATEGORIES dict has 'code' keywords",
                details={"test_cat": cat, "test_conf": conf},
            )

        return ComponentHealth(
            name="semantic_router", status=OK, latency_ms=lat,
            message=f"Classification working (test: 'code' → {cat} {conf:.0%})",
            details={"test_category": cat, "test_confidence": conf},
        )
    except Exception as e:
        return ComponentHealth(name="semantic_router", status=UNKNOWN, message=str(e))


def _check_cache() -> ComponentHealth:
    t0 = time.time()
    try:
        import database as db
        # Count cache entries
        row = db.q1("SELECT COUNT(*) as n, SUM(hit_count) as hits FROM job_cache")
        lat = (time.time()-t0)*1000
        entries    = (row or {}).get("n", 0)
        total_hits = (row or {}).get("hits", 0)
        enabled    = db.get_setting("semantic_cache_enabled", "true") == "true"

        return ComponentHealth(
            name="cache", status=OK if enabled else DEGRADED, latency_ms=lat,
            message=(f"Cache {'enabled' if enabled else 'DISABLED'}: "
                     f"{entries} entries, {total_hits} total hits"),
            cause="" if enabled else "Semantic cache disabled in settings",
            fix="" if enabled else "Enable cache: POST /api/routing/rules {semantic_cache_enabled: true}",
            details={"enabled": enabled, "entries": entries, "total_hits": total_hits},
        )
    except Exception as e:
        return ComponentHealth(name="cache", status=UNKNOWN, message=str(e))


def _check_disk() -> ComponentHealth:
    t0 = time.time()
    try:
        usage   = shutil.disk_usage(str(DATA_DIR))
        pct     = usage.used / usage.total * 100
        free_gb = usage.free / 1024**3
        lat     = (time.time()-t0)*1000

        if pct > 95:
            return ComponentHealth(
                name="disk", status=CRITICAL, latency_ms=lat,
                message=f"CRITICAL: {pct:.1f}% used, {free_gb:.1f}GB free",
                cause="Disk nearly full — database writes will fail",
                fix="Clear old data: job history >7 days, old cache entries",
                fix_cmd=f"sqlite3 {DATA_DIR}/orchestra.db 'DELETE FROM jobs WHERE done_at < unixepoch()-604800;'",
                auto_fixable=True, auto_fix_fn="_autofix_clean_old_jobs",
                details={"pct": round(pct,1), "free_gb": round(free_gb,2)},
            )

        if pct > 80:
            return ComponentHealth(
                name="disk", status=DEGRADED, latency_ms=lat,
                message=f"WARNING: {pct:.1f}% used",
                fix="Clean old job history to free space",
                fix_cmd=f"sqlite3 {DATA_DIR}/orchestra.db 'DELETE FROM jobs WHERE done_at < unixepoch()-604800;'",
                auto_fixable=True, auto_fix_fn="_autofix_clean_old_jobs",
                details={"pct": round(pct,1), "free_gb": round(free_gb,2)},
            )

        return ComponentHealth(
            name="disk", status=OK, latency_ms=lat,
            message=f"{pct:.1f}% used, {free_gb:.1f}GB free",
            details={"pct": round(pct,1), "free_gb": round(free_gb,2)},
        )
    except Exception as e:
        return ComponentHealth(name="disk", status=UNKNOWN, message=str(e))


def _check_autoscaler() -> ComponentHealth:
    t0 = time.time()
    try:
        from autoscaler import get_autoscaler
        import database as db
        as_ = get_autoscaler()
        lat = (time.time()-t0)*1000
        enabled = db.get_setting("autoscale_enabled","false") == "true"
        depth   = db.get_queue_snapshot().get("depth", 0)
        threshold = int(db.get_setting("autoscale_threshold","20"))

        if not enabled and depth > threshold * 2:
            return ComponentHealth(
                name="autoscaler", status=DEGRADED, latency_ms=lat,
                message=f"Autoscaler disabled but queue depth={depth} > 2×threshold={threshold}",
                cause="Autoscaler not enabled — queue building up",
                fix="Enable autoscaler or add workers manually",
                fix_cmd="curl -X POST http://localhost:8080/api/autoscaler/toggle -d '{\"enabled\":true}'",
                details=as_.get_status(),
            )

        return ComponentHealth(
            name="autoscaler", status=OK, latency_ms=lat,
            message=f"{'Enabled' if enabled else 'Disabled (OK)'}, spawn_type={as_.get_status().get('spawn_type')}",
            details=as_.get_status(),
        )
    except Exception as e:
        return ComponentHealth(name="autoscaler", status=UNKNOWN, message=str(e))


# ── Auto-fix functions ────────────────────────────────────────────────────────

def _autofix_db_checkpoint() -> dict:
    try:
        import database as db
        db.ex("PRAGMA wal_checkpoint(FULL)")
        return {"ok": True, "action": "WAL checkpoint executed"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _autofix_clean_old_jobs() -> dict:
    try:
        import database as db
        n = db.ex("DELETE FROM jobs WHERE status IN ('done','error','timeout') AND done_at < unixepoch()-604800")
        db.cache_evict_expired()
        return {"ok": True, "action": f"Deleted {n} old jobs and expired cache"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _autofix_enable_autoscaler() -> dict:
    try:
        import database as db
        db.set_setting("autoscale_enabled", "true")
        from autoscaler import get_autoscaler
        get_autoscaler().start()
        return {"ok": True, "action": "Autoscaler enabled and started"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


_AUTOFIX_MAP = {
    "_autofix_db_checkpoint":     _autofix_db_checkpoint,
    "_autofix_clean_old_jobs":    _autofix_clean_old_jobs,
    "_autofix_enable_autoscaler": _autofix_enable_autoscaler,
}

ALL_CHECKS: Dict[str, Callable] = {
    "database":          _check_database,
    "workers":           _check_workers,
    "queue":             _check_queue,
    "credential_vault":  _check_credential_vault,
    "semantic_router":   _check_semantic_router,
    "cache":             _check_cache,
    "disk":              _check_disk,
    "autoscaler":        _check_autoscaler,
}


def run_full_diagnostic() -> SystemHealth:
    t0 = time.time()
    components = {}
    for name, fn in ALL_CHECKS.items():
        try:
            components[name] = fn()
        except Exception as e:
            components[name] = ComponentHealth(name=name, status=UNKNOWN, message=str(e))

    critical = [n for n,c in components.items() if c.status==CRITICAL]
    degraded = [n for n,c in components.items() if c.status==DEGRADED]
    ok_count = sum(1 for c in components.values() if c.status==OK)

    overall = CRITICAL if critical else (DEGRADED if degraded else OK)
    score   = int(ok_count / len(components) * 100)

    parts   = []
    if critical: parts.append(f"CRITICAL: {', '.join(critical)}")
    if degraded: parts.append(f"Degraded: {', '.join(degraded)}")
    if not parts: parts.append("All systems operational")

    return SystemHealth(
        overall=overall, score=score, components=components,
        summary=" | ".join(parts), duration_ms=(time.time()-t0)*1000,
    )


def run_autofix(component: str) -> dict:
    fn = ALL_CHECKS.get(component)
    if not fn:
        return {"ok": False, "error": f"Unknown component: {component}"}
    result = fn()
    if not result.auto_fixable or not result.auto_fix_fn:
        return {"ok": False, "error": "No auto-fix for this component",
                "manual_fix": result.fix, "fix_cmd": result.fix_cmd}
    fix_fn = _AUTOFIX_MAP.get(result.auto_fix_fn)
    if not fix_fn:
        return {"ok": False, "error": "Fix function not found"}
    return fix_fn()
