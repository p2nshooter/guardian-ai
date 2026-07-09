# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration — Multi-Tenant Manager
====================================
Tier 1: isolasi filesystem per-tenant (folder /guardian/data/<tenant_id>/)
Tier 2: registry di PostgreSQL + Redis cache + filesystem isolation tetap ada

Aktivasi Tier 2:
  GUARDIAN_MULTITENANT=true
  GUARDIAN_TENANT_ID=abc123
  GUARDIAN_SUPERADMIN_KEY=xxx
  GUARDIAN_DB_MODE=distributed
"""
from __future__ import annotations

import asyncio, hashlib, json, logging, os, time
from pathlib import Path
from typing import Dict, List, Optional

log = logging.getLogger("guardian.multitenant")

BASE_DATA_DIR  = Path(os.environ.get("GUARDIAN_DATA_DIR", "/guardian/data"))
MULTITENANT    = os.environ.get("GUARDIAN_MULTITENANT", "false").lower() == "true"
SUPERADMIN_KEY = os.environ.get("GUARDIAN_SUPERADMIN_KEY", "")

_PG_TENANTS_SCHEMA = """
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id   TEXT PRIMARY KEY,
    name        TEXT NOT NULL DEFAULT '',
    plan        TEXT NOT NULL DEFAULT 'professional',
    created_at  DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    max_nodes   INTEGER NOT NULL DEFAULT 15,
    metadata    JSONB   DEFAULT '{}'
);
"""


class TenantContext:
    def __init__(self, tenant_id: str, name: str = "", plan: str = "professional"):
        self.tenant_id  = tenant_id
        self.name       = name or tenant_id
        self.plan       = plan
        self.created_at = time.time()
        self.active     = True
        self.max_nodes  = {"starter": 3, "professional": 15, "enterprise": 9999}.get(plan, 3)
        self.data_dir   = BASE_DATA_DIR / tenant_id
        try:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            (self.data_dir / "quarantine").mkdir(exist_ok=True)
            (self.data_dir / "forensics").mkdir(exist_ok=True)
            (self.data_dir / "evidence").mkdir(exist_ok=True)
        except Exception:
            pass

    @property
    def db_path(self) -> Path:
        return self.data_dir / "guardian.db"

    @property
    def ueba_profiles_path(self) -> Path:
        return self.data_dir / "ueba_profiles.json"

    @property
    def incidents_path(self) -> Path:
        return self.data_dir / "incidents.json"

    @property
    def compliance_path(self) -> Path:
        return self.data_dir / "compliance.json"

    @property
    def quarantine_dir(self) -> Path:
        return self.data_dir / "quarantine"

    def to_dict(self) -> dict:
        return {
            "tenant_id":     self.tenant_id,
            "name":          self.name,
            "plan":          self.plan,
            "created_at":    self.created_at,
            "active":        self.active,
            "max_nodes":     self.max_nodes,
            "data_dir":      str(self.data_dir),
            "disk_usage_mb": self._disk_usage(),
        }

    def _disk_usage(self) -> float:
        try:
            total = sum(f.stat().st_size for f in self.data_dir.rglob("*") if f.is_file())
            return round(total / 1024 / 1024, 1)
        except Exception:
            return 0.0


class MultiTenantManager:
    _REGISTRY = BASE_DATA_DIR / "tenants.json"

    def __init__(self):
        self._tenants: Dict[str, TenantContext] = {}
        self._pg_ready = False
        self._load_sync()
        if "default" not in self._tenants:
            self.create_tenant("default", "Default", "enterprise")

    # ── Sync load (Tier 1 fallback) ───────────────────────────────────────────

    def _load_sync(self) -> None:
        if self._REGISTRY.exists():
            try:
                data = json.loads(self._REGISTRY.read_text())
                for tid, td in data.items():
                    ctx = TenantContext(tid, td.get("name",""), td.get("plan","professional"))
                    ctx.created_at = td.get("created_at", time.time())
                    ctx.active     = td.get("active", True)
                    ctx.max_nodes  = td.get("max_nodes", ctx.max_nodes)
                    self._tenants[tid] = ctx
            except Exception as e:
                log.warning(f"Tenant registry JSON load error: {e}")

    # ── Async Tier 2 init ────────────────────────────────────────────────────

    async def init_pg(self) -> None:
        """Called from core.startup() after distributed DB is ready."""
        try:
            from src.database_distributed import get_distributed_db, get_db_mode
            if get_db_mode() != "distributed":
                return
            pg = await get_distributed_db()
            if not pg or not pg._pool:
                return
            async with pg._pool.acquire() as conn:
                await conn.execute(_PG_TENANTS_SCHEMA)
            self._pg_ready = True
            for ctx in list(self._tenants.values()):
                await self._pg_upsert(ctx)
            await self._pg_pull()
            log.info(f"Multitenant PG registry ready: {len(self._tenants)} tenants")
        except Exception as e:
            log.warning(f"Multitenant PG init failed (falling back to JSON): {e}")

    async def _pg_upsert(self, ctx: TenantContext) -> None:
        try:
            from src.database_distributed import get_distributed_db
            pg = await get_distributed_db()
            if not pg or not pg._pool:
                return
            async with pg._pool.acquire() as conn:
                await conn.execute(
                    """INSERT INTO tenants
                       (tenant_id, name, plan, created_at, active, max_nodes)
                       VALUES ($1,$2,$3,$4,$5,$6)
                       ON CONFLICT (tenant_id) DO UPDATE
                         SET name=$2, plan=$3, active=$5, max_nodes=$6""",
                    ctx.tenant_id, ctx.name, ctx.plan,
                    ctx.created_at, ctx.active, ctx.max_nodes
                )
        except Exception as e:
            log.debug(f"Tenant PG upsert error: {e}")

    async def _pg_pull(self) -> None:
        try:
            from src.database_distributed import get_distributed_db
            pg = await get_distributed_db()
            if not pg or not pg._pool:
                return
            async with pg._pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM tenants WHERE active=TRUE")
            for row in rows:
                tid = row["tenant_id"]
                if tid not in self._tenants:
                    ctx = TenantContext(tid, row["name"], row["plan"])
                    ctx.created_at = float(row["created_at"])
                    ctx.active     = bool(row["active"])
                    ctx.max_nodes  = int(row["max_nodes"])
                    self._tenants[tid] = ctx
                    log.info(f"Tenant pulled from PG: {tid}")
        except Exception as e:
            log.debug(f"Tenant PG pull error: {e}")

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def create_tenant(self, tenant_id: str, name: str = "",
                      plan: str = "professional") -> TenantContext:
        if tenant_id in self._tenants:
            return self._tenants[tenant_id]
        ctx = TenantContext(tenant_id, name, plan)
        self._tenants[tenant_id] = ctx
        self._save_json()
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self._pg_upsert(ctx))
        except RuntimeError:
            pass
        log.info(f"Tenant created: {tenant_id} ({plan})")
        return ctx

    async def create_tenant_async(self, tenant_id: str, name: str = "",
                                   plan: str = "professional") -> TenantContext:
        if tenant_id in self._tenants:
            return self._tenants[tenant_id]
        ctx = TenantContext(tenant_id, name, plan)
        self._tenants[tenant_id] = ctx
        self._save_json()
        await self._pg_upsert(ctx)
        await self._redis_invalidate()
        log.info(f"Tenant created (async): {tenant_id} ({plan})")
        return ctx

    def get_tenant(self, tenant_id: str = "") -> TenantContext:
        if not MULTITENANT or not tenant_id:
            return self._tenants["default"]
        return self._tenants.get(tenant_id, self._tenants["default"])

    def get_tenant_data_dir(self, tenant_id: str = "") -> Path:
        return self.get_tenant(tenant_id).data_dir

    def list_tenants(self) -> List[dict]:
        return [t.to_dict() for t in self._tenants.values()]

    def delete_tenant(self, tenant_id: str) -> bool:
        if tenant_id == "default":
            return False
        tenant = self._tenants.pop(tenant_id, None)
        if tenant:
            tenant.active = False
            self._save_json()
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(self._pg_deactivate(tenant_id))
            except RuntimeError:
                pass
            log.info(f"Tenant deactivated: {tenant_id}")
            return True
        return False

    async def _pg_deactivate(self, tenant_id: str) -> None:
        try:
            from src.database_distributed import get_distributed_db
            pg = await get_distributed_db()
            if not pg or not pg._pool:
                return
            async with pg._pool.acquire() as conn:
                await conn.execute(
                    "UPDATE tenants SET active=FALSE WHERE tenant_id=$1", tenant_id)
            await self._redis_invalidate()
        except Exception as e:
            log.debug(f"Tenant PG deactivate error: {e}")

    def authenticate_superadmin(self, key: str) -> bool:
        if not SUPERADMIN_KEY:
            return False
        return (hashlib.sha256(key.encode()).hexdigest() ==
                hashlib.sha256(SUPERADMIN_KEY.encode()).hexdigest())

    # ── Aggregate stats ───────────────────────────────────────────────────────

    async def get_aggregate_stats_async(self) -> dict:
        """Tier 2: fast PostgreSQL cross-tenant query. Tier 1: filesystem scan."""
        try:
            from src.database_distributed import get_redis, get_db_mode
            if get_db_mode() == "distributed":
                redis = await get_redis()
                if redis:
                    cached = await redis.get("multitenant:aggregate_stats")
                    if cached:
                        return cached
        except Exception:
            pass

        stats = {
            "total_tenants":  len(self._tenants),
            "active_tenants": sum(1 for t in self._tenants.values() if t.active),
            "tenants": [],
        }

        try:
            from src.database_distributed import get_distributed_db, get_db_mode
            if get_db_mode() == "distributed":
                pg = await get_distributed_db()
                if pg and pg._pool:
                    async with pg._pool.acquire() as conn:
                        rows = await conn.fetch("""
                            SELECT
                                t.tenant_id, t.name, t.plan,
                                t.active, t.max_nodes,
                                COUNT(DISTINCT se.id) FILTER (
                                    WHERE se.verdict IN ('malicious','suspicious')
                                    AND se.ts > EXTRACT(EPOCH FROM NOW()) - 86400
                                ) AS alerts_24h,
                                COUNT(DISTINCT hr.node_id) AS node_count
                            FROM tenants t
                            LEFT JOIN scan_events se ON se.tenant_id = t.tenant_id
                            LEFT JOIN host_risk   hr ON hr.tenant_id = t.tenant_id
                            WHERE t.active = TRUE
                            GROUP BY t.tenant_id, t.name, t.plan, t.active, t.max_nodes
                            ORDER BY t.tenant_id
                        """)
                    stats["tenants"] = [dict(r) for r in rows]
                    try:
                        from src.database_distributed import get_redis
                        redis = await get_redis()
                        if redis:
                            await redis.set("multitenant:aggregate_stats", stats, ttl=60)
                    except Exception:
                        pass
                    return stats
        except Exception as e:
            log.debug(f"Aggregate stats PG error: {e}")

        # Fallback: filesystem
        for tenant_id, ctx in self._tenants.items():
            try:
                inc_count = 0
                if ctx.incidents_path.exists():
                    data = json.loads(ctx.incidents_path.read_text())
                    inc_count = len([v for v in data.values()
                                     if v.get("status") not in ("closed","false_positive")])
                stats["tenants"].append({
                    "tenant_id":      tenant_id,
                    "name":           ctx.name,
                    "plan":           ctx.plan,
                    "open_incidents": inc_count,
                    "disk_mb":        ctx._disk_usage(),
                    "active":         ctx.active,
                })
            except Exception:
                pass
        return stats

    def get_aggregate_stats(self) -> dict:
        """Sync version for non-async callers."""
        stats = {
            "total_tenants":  len(self._tenants),
            "active_tenants": sum(1 for t in self._tenants.values() if t.active),
            "tenants": [],
        }
        for tenant_id, ctx in self._tenants.items():
            try:
                inc_count = 0
                if ctx.incidents_path.exists():
                    data = json.loads(ctx.incidents_path.read_text())
                    inc_count = len([v for v in data.values()
                                     if v.get("status") not in ("closed","false_positive")])
                stats["tenants"].append({
                    "tenant_id": tenant_id, "name": ctx.name,
                    "plan": ctx.plan, "open_incidents": inc_count,
                    "disk_mb": ctx._disk_usage(), "active": ctx.active,
                })
            except Exception:
                pass
        return stats

    # ── Persistence ───────────────────────────────────────────────────────────

    def _save_json(self) -> None:
        try:
            BASE_DATA_DIR.mkdir(parents=True, exist_ok=True)
            self._REGISTRY.write_text(json.dumps(
                {tid: {"name": t.name, "plan": t.plan, "created_at": t.created_at,
                       "active": t.active, "max_nodes": t.max_nodes}
                 for tid, t in self._tenants.items()},
                indent=2
            ))
        except Exception as e:
            log.debug(f"Tenant JSON save error: {e}")

    async def _redis_invalidate(self) -> None:
        try:
            from src.database_distributed import get_redis
            redis = await get_redis()
            if redis:
                await redis.delete("multitenant:aggregate_stats")
        except Exception:
            pass


# ── Singleton ─────────────────────────────────────────────────────────────────

_manager: Optional[MultiTenantManager] = None


def get_tenant_manager() -> MultiTenantManager:
    global _manager
    if _manager is None:
        _manager = MultiTenantManager()
    return _manager


def get_tenant_data_dir(tenant_id: str = "") -> Path:
    return get_tenant_manager().get_tenant_data_dir(tenant_id)


def resolve_tenant_from_request(headers: dict) -> str:
    """Extract tenant_id from request headers. Returns 'default' if not found."""
    return headers.get("X-Tenant-ID", headers.get("x-tenant-id", "default"))
