# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration | Health Diagnostics
Setiap komponen dicek secara menyeluruh. Hasil bukan hanya "ok/error"
tapi MENGAPA gagal + CARA FIXNYA + apakah bisa auto-recover.

Digunakan oleh:
  - GET /health/deep        → full diagnostic semua komponen
  - GET /health/{component} → diagnostic satu komponen
  - POST /health/autofix    → jalankan auto-fix yang tersedia
  - Background watchdog     → monitor terus-menerus, trigger recovery

Komponen yang dicek:
  database, ai_pool, threat_feed, monitors (14), license,
  disk_space, memory, network_connectivity, config_integrity
"""
from __future__ import annotations

import asyncio, json, logging, os, platform, shutil, socket, time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

log = logging.getLogger("guardian.health")

DATA_DIR = Path(os.environ.get("GUARDIAN_DATA_DIR", "/guardian/data"))

# ── Status constants ──────────────────────────────────────────────────────────
OK       = "ok"
DEGRADED = "degraded"
CRITICAL = "critical"
UNKNOWN  = "unknown"


@dataclass
class ComponentHealth:
    name:         str
    status:       str           # ok | degraded | critical | unknown
    latency_ms:   float         = 0.0
    message:      str           = ""
    cause:        str           = ""         # WHY it failed
    fix:          str           = ""         # HOW to fix it
    fix_cmd:      str           = ""         # exact command to run
    auto_fixable: bool          = False      # can system fix itself?
    auto_fix_fn:  Optional[str] = None       # name of auto-fix function
    details:      dict          = field(default_factory=dict)
    checked_at:   float         = field(default_factory=time.time)

    def to_dict(self) -> dict:
        d = asdict(self)
        d.pop("auto_fix_fn", None)
        return d


@dataclass
class SystemHealth:
    overall:    str                         # ok | degraded | critical
    score:      int                         # 0-100
    components: Dict[str, ComponentHealth]
    summary:    str
    checked_at: float = field(default_factory=time.time)
    duration_ms: float = 0.0

    def to_dict(self) -> dict:
        return {
            "overall":     self.overall,
            "score":       self.score,
            "summary":     self.summary,
            "checked_at":  self.checked_at,
            "duration_ms": round(self.duration_ms, 1),
            "components":  {k: v.to_dict() for k, v in self.components.items()},
        }


# ── Individual component checks ───────────────────────────────────────────────

async def _check_database() -> ComponentHealth:
    t0 = time.time()
    try:
        from src.database import get_db
        from src.database_distributed import get_db_mode
        db   = await get_db()
        rows = await db.get_scan_history(limit=1)
        lat  = (time.time() - t0) * 1000
        mode = get_db_mode()

        if mode == "distributed":
            # PostgreSQL + Redis checks
            from src.database_distributed import get_distributed_db, get_redis
            pg    = await get_distributed_db()
            redis = await get_redis()
            pg_ok    = pg is not None and pg.is_connected()
            redis_ok = redis is not None and redis.is_connected()
            status  = OK if (pg_ok and redis_ok) else DEGRADED
            message = (f"PostgreSQL={'OK' if pg_ok else 'FAIL'} "
                       f"Redis={'OK' if redis_ok else 'FAIL'} "
                       f"latency={lat:.0f}ms")
            cause   = "" if status == OK else "One or more distributed DB components unreachable"
            fix     = "" if status == OK else "Check GUARDIAN_POSTGRES_URL and GUARDIAN_REDIS_URL"
            return ComponentHealth(
                name="database", status=status, latency_ms=lat,
                message=message, cause=cause, fix=fix,
                details={"mode": "distributed", "postgres": pg_ok, "redis": redis_ok},
            )

        # ── SQLite mode ───────────────────────────────────────────────────────
        db_path = DATA_DIR / "guardian.db"
        wal_path = DATA_DIR / "guardian.db-wal"
        size_mb  = db_path.stat().st_size / 1024 / 1024 if db_path.exists() else 0
        wal_mb   = wal_path.stat().st_size / 1024 / 1024 if wal_path.exists() else 0

        status  = OK
        message = f"SQLite responsive in {lat:.0f}ms, size={size_mb:.1f}MB"
        cause   = ""
        fix     = ""
        fix_cmd = ""

        if lat > 500:
            status  = DEGRADED
            cause   = "Database query taking >500ms — WAL file may be bloated"
            fix     = "Run WAL checkpoint to merge write-ahead log back into main DB"
            fix_cmd = f"sqlite3 {db_path} 'PRAGMA wal_checkpoint(TRUNCATE);'"

        if wal_mb > 100:
            status  = DEGRADED
            cause   = f"WAL file is {wal_mb:.0f}MB — not being checkpointed"
            fix     = "Checkpoint the WAL file"
            fix_cmd = f"sqlite3 {db_path} 'PRAGMA wal_checkpoint(FULL);'"

        return ComponentHealth(
            name="database", status=status, latency_ms=lat,
            message=message, cause=cause, fix=fix, fix_cmd=fix_cmd,
            auto_fixable=(status == DEGRADED),
            auto_fix_fn="_autofix_database_checkpoint",
            details={"mode": "sqlite", "size_mb": round(size_mb, 2), "wal_mb": round(wal_mb, 2)},
        )
    except Exception as e:
        lat = (time.time() - t0) * 1000
        db_path = DATA_DIR / "guardian.db"
        return ComponentHealth(
            name="database", status=CRITICAL, latency_ms=lat,
            message=f"Database unreachable: {e}",
            cause="DB connection failed or DB file corrupt",
            fix="1. Check disk space  2. Verify DB exists / credentials  3. Restore from backup",
            fix_cmd=f"ls -lh {db_path}; df -h {DATA_DIR}",
            auto_fixable=False,
            details={"error": str(e)},
        )


async def _check_ai_pool() -> ComponentHealth:
    t0 = time.time()
    try:
        from src.core import GuardianCore
        pool = GuardianCore.get().ai_pool
        lat  = (time.time() - t0) * 1000

        if not hasattr(pool, 'vendor_count') or pool.vendor_count == 0:
            return ComponentHealth(
                name="ai_pool", status=DEGRADED, latency_ms=lat,
                message="No AI vendors configured",
                cause="ai_pool section missing or empty in guardian.yml",
                fix="Add at least one AI vendor to guardian.yml under ai_pool.vendors",
                fix_cmd="cat /guardian/config/guardian.yml | grep -A10 ai_pool",
                auto_fixable=False,
                details={"vendor_count": 0},
            )

        return ComponentHealth(
            name="ai_pool", status=OK, latency_ms=lat,
            message=f"{pool.vendor_count} vendor(s) configured",
            details={"vendor_count": pool.vendor_count},
        )
    except Exception as e:
        return ComponentHealth(
            name="ai_pool", status=UNKNOWN, message=str(e),
            cause="GuardianCore not initialized yet",
            fix="Wait for startup to complete or check logs",
            fix_cmd="docker logs guardian-core --tail 50",
        )


async def _check_threat_feed() -> ComponentHealth:
    t0 = time.time()
    try:
        from src.core import GuardianCore
        c    = GuardianCore.get()
        stats = c.detector.feed_stats
        lat  = (time.time() - t0) * 1000

        hashes  = stats.get("hashes", 0)
        ips     = stats.get("ips", 0)
        domains = stats.get("domains", 0)
        total   = hashes + ips + domains

        if total == 0:
            return ComponentHealth(
                name="threat_feed", status=CRITICAL, latency_ms=lat,
                message="Threat feed is EMPTY — detection severely limited",
                cause="Feed never loaded or load failed. Check network access to R2 bucket.",
                fix="Trigger manual feed refresh",
                fix_cmd="curl -X POST http://localhost:8080/feed/refresh",
                auto_fixable=True,
                auto_fix_fn="_autofix_refresh_feed",
                details=stats,
            )

        if hashes < 100:
            return ComponentHealth(
                name="threat_feed", status=DEGRADED, latency_ms=lat,
                message=f"Feed very small: {total} IOCs (expected >10k)",
                cause="Feed partially loaded or stale",
                fix="Trigger feed refresh to pull latest from R2",
                fix_cmd="curl -X POST http://localhost:8080/feed/refresh",
                auto_fixable=True,
                auto_fix_fn="_autofix_refresh_feed",
                details=stats,
            )

        return ComponentHealth(
            name="threat_feed", status=OK, latency_ms=lat,
            message=f"Feed healthy: {hashes:,} hashes, {ips:,} IPs, {domains:,} domains",
            details=stats,
        )
    except Exception as e:
        return ComponentHealth(
            name="threat_feed", status=UNKNOWN, message=str(e),
            details={"error": str(e)},
        )


async def _check_license() -> ComponentHealth:
    t0 = time.time()
    try:
        from src.core import GuardianCore
        info = GuardianCore.get().license_info
        lat  = (time.time() - t0) * 1000

        if not info:
            return ComponentHealth(
                name="license", status=DEGRADED, latency_ms=lat,
                message="License not yet validated",
                cause="Startup validation pending or network unreachable",
                fix="Check GUARDIAN_LICENSE_KEY env var and network to dashboard",
                fix_cmd="echo $GUARDIAN_LICENSE_KEY | head -c 20; curl https://axto.ai/health",
            )

        if not info.valid:
            return ComponentHealth(
                name="license", status=CRITICAL, latency_ms=lat,
                message=f"License INVALID: {info.reason}",
                cause=info.reason,
                fix="Renew license at https://axto.ai/portal or check license key",
                fix_cmd="curl -X POST http://localhost:8080/license/validate",
                details={"reason": info.reason},
            )

        return ComponentHealth(
            name="license", status=OK, latency_ms=lat,
            message=f"Valid — {info.package} (expires {info.expires_at})",
            details={"package": info.package, "expires": info.expires_at,
                     "max_nodes": info.max_nodes},
        )
    except Exception as e:
        return ComponentHealth(name="license", status=UNKNOWN, message=str(e))


async def _check_disk_space() -> ComponentHealth:
    t0 = time.time()
    try:
        usage = shutil.disk_usage(str(DATA_DIR))
        pct   = usage.used / usage.total * 100
        free_gb = usage.free / 1024**3
        lat   = (time.time() - t0) * 1000

        if pct > 95:
            return ComponentHealth(
                name="disk_space", status=CRITICAL, latency_ms=lat,
                message=f"CRITICAL: {pct:.1f}% used, only {free_gb:.1f}GB free",
                cause="Disk nearly full — database writes will fail soon",
                fix="Free disk space immediately: clear old logs, rotate quarantine",
                fix_cmd=f"du -sh {DATA_DIR}/* | sort -rh | head -10",
                auto_fixable=True,
                auto_fix_fn="_autofix_cleanup_disk",
                details={"pct_used": round(pct, 1), "free_gb": round(free_gb, 2)},
            )

        if pct > 80:
            return ComponentHealth(
                name="disk_space", status=DEGRADED, latency_ms=lat,
                message=f"WARNING: {pct:.1f}% used, {free_gb:.1f}GB remaining",
                cause="Disk usage high — plan cleanup soon",
                fix="Review and clean old scan logs, quarantine files",
                fix_cmd=f"find {DATA_DIR}/quarantine -mtime +30 -delete",
                auto_fixable=True,
                auto_fix_fn="_autofix_cleanup_disk",
                details={"pct_used": round(pct, 1), "free_gb": round(free_gb, 2)},
            )

        return ComponentHealth(
            name="disk_space", status=OK, latency_ms=lat,
            message=f"{pct:.1f}% used, {free_gb:.1f}GB free",
            details={"pct_used": round(pct, 1), "free_gb": round(free_gb, 2)},
        )
    except Exception as e:
        return ComponentHealth(name="disk_space", status=UNKNOWN, message=str(e))


async def _check_memory() -> ComponentHealth:
    t0 = time.time()
    try:
        import psutil
        mem = psutil.virtual_memory()
        pct = mem.percent
        free_mb = mem.available / 1024**2
        lat = (time.time() - t0) * 1000

        if pct > 95:
            return ComponentHealth(
                name="memory", status=CRITICAL, latency_ms=lat,
                message=f"CRITICAL: {pct:.1f}% used, only {free_mb:.0f}MB free",
                cause="Memory nearly exhausted — OOM killer may terminate Guardian",
                fix="Restart non-critical services or add more RAM",
                fix_cmd="free -h && ps aux --sort=-%mem | head -10",
                details={"pct_used": pct, "free_mb": round(free_mb)},
            )

        if pct > 85:
            return ComponentHealth(
                name="memory", status=DEGRADED, latency_ms=lat,
                message=f"High memory usage: {pct:.1f}%",
                cause="Memory pressure — performance may degrade",
                fix="Monitor memory trend. Consider reducing UEBA profile retention.",
                fix_cmd="cat /proc/meminfo | grep -E 'MemTotal|MemFree|Cached'",
                details={"pct_used": pct, "free_mb": round(free_mb)},
            )

        return ComponentHealth(
            name="memory", status=OK, latency_ms=lat,
            message=f"{pct:.1f}% used, {free_mb:.0f}MB free",
            details={"pct_used": pct, "free_mb": round(free_mb)},
        )
    except ImportError:
        return ComponentHealth(
            name="memory", status=UNKNOWN,
            message="psutil not installed",
            fix="pip install psutil",
            fix_cmd="pip install psutil --break-system-packages",
        )


async def _check_monitors() -> ComponentHealth:
    """Check all 14 monitors are running."""
    t0   = time.time()
    dead = []
    try:
        from src.core import GuardianCore
        c = GuardianCore.get()
        monitors = {
            "process_monitor":  c.proc_monitor,
            "network_monitor":  c.net_monitor,
            "honeypot":         c.honeypot,
            "rootkit_detector": c.rootkit,
            "threat_hunter":    c.hunter,
            "fim":              c.fim,
            "memory_scanner":   c.mem_scanner,
            "dlp":              c.dlp,
            "correlation":      c.correlation,
            "ueba":             c.ueba,
            "dns_monitor":      c.dns_monitor,
            "deception":        c.deception,
            "incident_manager": c.incident_mgr,
            "threat_intel":     c.threat_intel,
        }
        for name, mon in monitors.items():
            running = getattr(mon, "_running", None)
            if running is False:
                dead.append(name)

        lat = (time.time() - t0) * 1000
        if dead:
            return ComponentHealth(
                name="monitors", status=CRITICAL, latency_ms=lat,
                message=f"{len(dead)} monitor(s) NOT running: {dead}",
                cause="Monitor stopped due to exception or manual stop",
                fix="Restart Guardian Core to reinitialize all monitors",
                fix_cmd="docker restart guardian-core",
                auto_fixable=True,
                auto_fix_fn="_autofix_restart_monitors",
                details={"dead": dead, "total": len(monitors)},
            )

        return ComponentHealth(
            name="monitors", status=OK, latency_ms=lat,
            message=f"All {len(monitors)} monitors active",
            details={"total": len(monitors), "active": len(monitors)},
        )
    except Exception as e:
        return ComponentHealth(name="monitors", status=UNKNOWN, message=str(e))


async def _check_network_connectivity() -> ComponentHealth:
    """Check outbound network for threat feed and license validation."""
    t0      = time.time()
    results = {}
    targets = [
        ("axto_dashboard",  "axto.ai",           443),
        ("threat_feed_r2",  "pub-d69a77d3bbf94764be022e1453b16a10.r2.dev", 443),
        ("dns_resolution",  "8.8.8.8",           53),
    ]
    failed = []
    for name, host, port in targets:
        try:
            t = time.time()
            s = socket.create_connection((host, port), timeout=5)
            s.close()
            results[name] = {"ok": True, "latency_ms": round((time.time()-t)*1000, 1)}
        except Exception as e:
            results[name] = {"ok": False, "error": str(e)}
            failed.append(name)

    lat = (time.time() - t0) * 1000
    if failed:
        return ComponentHealth(
            name="network", status=DEGRADED if len(failed) < len(targets) else CRITICAL,
            latency_ms=lat,
            message=f"Connectivity issues: {failed}",
            cause="Firewall blocking outbound or DNS not resolving",
            fix="Check firewall rules. Guardian needs port 443 outbound to axto.ai and R2.",
            fix_cmd="curl -v https://axto.ai/health; nc -zv axto.ai 443",
            details=results,
        )

    return ComponentHealth(
        name="network", status=OK, latency_ms=lat,
        message="All connectivity checks passed",
        details=results,
    )


async def _check_config_integrity() -> ComponentHealth:
    """Verify guardian.yml exists and has required fields."""
    t0 = time.time()
    config_path = Path(os.environ.get("GUARDIAN_CONFIG", "/guardian/config/guardian.yml"))
    lat = (time.time() - t0) * 1000

    if not config_path.exists():
        return ComponentHealth(
            name="config", status=CRITICAL, latency_ms=lat,
            message=f"Config file NOT FOUND: {config_path}",
            cause="guardian.yml missing — using defaults only",
            fix="Create config from example template",
            fix_cmd="cp /guardian/guardian.example.yml /guardian/config/guardian.yml",
        )

    try:
        import yaml
        with open(config_path) as f:
            cfg = yaml.safe_load(f) or {}

        missing = []
        guardian = cfg.get("guardian", {})
        if not guardian.get("license_key"):
            missing.append("license_key")
        if not guardian.get("license_validate_url"):
            missing.append("license_validate_url")

        if missing:
            return ComponentHealth(
                name="config", status=DEGRADED, latency_ms=lat,
                message=f"Config missing required fields: {missing}",
                cause="Incomplete configuration",
                fix=f"Add missing fields to {config_path}",
                fix_cmd=f"nano {config_path}",
                details={"missing_fields": missing, "path": str(config_path)},
            )

        return ComponentHealth(
            name="config", status=OK, latency_ms=lat,
            message=f"Config valid: {config_path}",
            details={"path": str(config_path)},
        )
    except Exception as e:
        return ComponentHealth(
            name="config", status=CRITICAL, latency_ms=lat,
            message=f"Config parse error: {e}",
            cause="YAML syntax error in guardian.yml",
            fix="Validate YAML syntax",
            fix_cmd=f"python3 -c \"import yaml; yaml.safe_load(open('{config_path}'))\"",
        )


# ── Auto-fix functions ────────────────────────────────────────────────────────

async def _autofix_database_checkpoint() -> dict:
    try:
        from src.database import get_db
        db = await get_db()
        await db._db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        return {"ok": True, "action": "WAL checkpoint executed"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _autofix_refresh_feed() -> dict:
    try:
        from src.core import GuardianCore
        await GuardianCore.get().collector.update()
        return {"ok": True, "action": "Threat feed refresh triggered"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _autofix_cleanup_disk() -> dict:
    """Remove quarantine files older than 30 days and old scan logs."""
    cleaned = []
    try:
        quarantine = DATA_DIR / "quarantine"
        if quarantine.exists():
            cutoff = time.time() - 30 * 86400
            for f in quarantine.iterdir():
                if f.stat().st_mtime < cutoff:
                    f.unlink()
                    cleaned.append(str(f))
        return {"ok": True, "action": f"Removed {len(cleaned)} old quarantine files",
                "files_removed": len(cleaned)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _autofix_restart_monitors() -> dict:
    """Restart dead monitors."""
    try:
        from src.core import GuardianCore
        c    = GuardianCore.get()
        dead = []
        monitors = [
            ("ueba",         c.ueba),
            ("dns_monitor",  c.dns_monitor),
            ("deception",    c.deception),
        ]
        for name, mon in monitors:
            if not getattr(mon, "_running", True):
                await mon.start()
                dead.append(name)
        return {"ok": True, "action": f"Restarted: {dead}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


_AUTOFIX_MAP = {
    "_autofix_database_checkpoint": _autofix_database_checkpoint,
    "_autofix_refresh_feed":        _autofix_refresh_feed,
    "_autofix_cleanup_disk":        _autofix_cleanup_disk,
    "_autofix_restart_monitors":    _autofix_restart_monitors,
}

# ── Main diagnostic runner ────────────────────────────────────────────────────

ALL_CHECKS: Dict[str, Callable] = {
    "database":    _check_database,
    "ai_pool":     _check_ai_pool,
    "threat_feed": _check_threat_feed,
    "license":     _check_license,
    "disk_space":  _check_disk_space,
    "memory":      _check_memory,
    "monitors":    _check_monitors,
    "network":     _check_network_connectivity,
    "config":      _check_config_integrity,
}


async def run_full_diagnostic() -> SystemHealth:
    """Run all component checks concurrently. Returns full SystemHealth."""
    t0 = time.time()

    tasks = {name: asyncio.create_task(fn()) for name, fn in ALL_CHECKS.items()}
    done  = await asyncio.gather(*tasks.values(), return_exceptions=True)

    components: Dict[str, ComponentHealth] = {}
    for name, result in zip(tasks.keys(), done):
        if isinstance(result, Exception):
            components[name] = ComponentHealth(
                name=name, status=UNKNOWN,
                message=f"Check threw exception: {result}",
            )
        else:
            components[name] = result

    # Calculate overall status and score
    status_weight = {OK: 0, DEGRADED: 1, CRITICAL: 2, UNKNOWN: 1}
    critical_comps = [n for n, c in components.items() if c.status == CRITICAL]
    degraded_comps = [n for n, c in components.items() if c.status == DEGRADED]
    ok_count       = sum(1 for c in components.values() if c.status == OK)

    if critical_comps:
        overall = CRITICAL
    elif degraded_comps:
        overall = DEGRADED
    else:
        overall = OK

    score = int(ok_count / len(components) * 100)

    summary_parts = []
    if critical_comps:
        summary_parts.append(f"CRITICAL: {', '.join(critical_comps)}")
    if degraded_comps:
        summary_parts.append(f"Degraded: {', '.join(degraded_comps)}")
    if not summary_parts:
        summary_parts.append("All systems operational")
    summary = " | ".join(summary_parts)

    return SystemHealth(
        overall=overall, score=score, components=components,
        summary=summary, duration_ms=(time.time()-t0)*1000,
    )


async def run_component_diagnostic(component: str) -> Optional[ComponentHealth]:
    """Run diagnostic for a single named component."""
    fn = ALL_CHECKS.get(component)
    if not fn:
        return None
    return await fn()


async def run_autofix(component: str) -> dict:
    """Run auto-fix for a component if available."""
    check = ALL_CHECKS.get(component)
    if not check:
        return {"ok": False, "error": f"Unknown component: {component}"}
    result = await check()
    if not result.auto_fixable or not result.auto_fix_fn:
        return {"ok": False, "error": "No auto-fix available for this component",
                "fix_cmd": result.fix_cmd, "fix": result.fix}
    fn = _AUTOFIX_MAP.get(result.auto_fix_fn)
    if not fn:
        return {"ok": False, "error": "Auto-fix function not found"}
    return await fn()


# ── Background watchdog ───────────────────────────────────────────────────────

class HealthWatchdog:
    """Runs health checks in background. Triggers auto-fix when possible."""

    def __init__(self, interval_sec: int = 120):
        self._interval  = interval_sec
        self._running   = False
        self._last      : Optional[SystemHealth] = None
        self._alerts    : list = []

    async def start(self) -> None:
        self._running = True
        asyncio.create_task(self._loop())
        log.info("Health watchdog started")

    async def stop(self) -> None:
        self._running = False

    async def _loop(self) -> None:
        await asyncio.sleep(30)   # wait for full startup
        while self._running:
            try:
                health = await run_full_diagnostic()
                self._last = health
                if health.overall != OK:
                    log.warning(f"Health: {health.overall.upper()} — {health.summary}")
                    # Attempt auto-fix for fixable components
                    for name, comp in health.components.items():
                        if comp.auto_fixable and comp.status in (DEGRADED, CRITICAL):
                            log.info(f"Auto-fix attempt: {name}")
                            fix_result = await run_autofix(name)
                            log.info(f"Auto-fix {name}: {fix_result}")
                else:
                    log.debug(f"Health OK (score={health.score})")
            except Exception as e:
                log.error(f"Watchdog error: {e}")
            await asyncio.sleep(self._interval)

    @property
    def last_health(self) -> Optional[SystemHealth]:
        return self._last


_watchdog: Optional[HealthWatchdog] = None


def get_watchdog() -> HealthWatchdog:
    global _watchdog
    if _watchdog is None:
        _watchdog = HealthWatchdog()
    return _watchdog
