# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Edge — KeyManager: Customer and API key lifecycle management."""
from __future__ import annotations
import asyncio, secrets, string, uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
import aiosqlite
import structlog

log = structlog.get_logger()

_ALPHA = string.ascii_letters + string.digits

def _gen_key() -> str:
    """Generate a secure Edge API key: sk-edge-<48 random chars>"""
    return "sk-edge-" + "".join(secrets.choice(_ALPHA) for _ in range(48))

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class KeyManager:
    def __init__(self, data_dir: Path):
        self._db_path = data_dir / "edge.db"
        self._db: Optional[aiosqlite.Connection] = None
        self._key_cache: Dict[str, Dict] = {}   # key → customer (hot cache)
        self._cache_lock = asyncio.Lock()

    async def _get_db(self) -> aiosqlite.Connection:
        if self._db is None:
            self._db = await aiosqlite.connect(str(self._db_path))
            self._db.row_factory = aiosqlite.Row
            await self._db.execute("PRAGMA journal_mode=WAL")
            await self._db.execute("PRAGMA synchronous=NORMAL")
            await self._create_tables()
        return self._db

    async def _create_tables(self):
        await self._db.executescript("""
        CREATE TABLE IF NOT EXISTS edge_customers (
          id          TEXT PRIMARY KEY,
          name        TEXT NOT NULL,
          email       TEXT NOT NULL UNIQUE,
          plan_code   TEXT NOT NULL DEFAULT 'free',
          status      TEXT NOT NULL DEFAULT 'active',
          description TEXT DEFAULT '',
          metadata    TEXT DEFAULT '{}',
          created_at  TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS edge_api_keys (
          id          TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          key_hash    TEXT NOT NULL UNIQUE,   -- SHA-256 of actual key
          key_prefix  TEXT NOT NULL,          -- first 12 chars for display
          label       TEXT NOT NULL DEFAULT '',
          status      TEXT NOT NULL DEFAULT 'active',
          last_used   TEXT DEFAULT '',
          request_count INTEGER DEFAULT 0,
          expires_at  TEXT DEFAULT '',
          created_at  TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (customer_id) REFERENCES edge_customers(id)
        );
        CREATE INDEX IF NOT EXISTS idx_ek_customer ON edge_api_keys(customer_id, status);
        CREATE INDEX IF NOT EXISTS idx_ek_hash     ON edge_api_keys(key_hash);
        CREATE INDEX IF NOT EXISTS idx_ec_email    ON edge_customers(email);
        CREATE INDEX IF NOT EXISTS idx_ec_status   ON edge_customers(status);
        """)
        await self._db.commit()

    async def lookup_customer(self, raw_key: str) -> Optional[Dict]:
        """Hot-path: lookup customer by API key. Cache + DB fallback."""
        async with self._cache_lock:
            cached = self._key_cache.get(raw_key)
            if cached:
                return cached

        import hashlib
        h   = hashlib.sha256(raw_key.encode()).hexdigest()
        db  = await self._get_db()
        row = await db.execute_fetchall(
            """SELECT c.id, c.name, c.email, c.plan_code, c.status, c.metadata,
                      k.id as key_id, k.status as key_status, k.expires_at
               FROM edge_api_keys k JOIN edge_customers c ON c.id=k.customer_id
               WHERE k.key_hash=? AND k.status='active'""",
            [h]
        )
        if not row:
            return None

        r = dict(row[0])
        # Check key expiry
        if r["expires_at"] and datetime.fromisoformat(r["expires_at"]) < datetime.now(timezone.utc):
            return None

        # Check customer status
        if r["status"] not in ("active", "quota_exceeded"):
            return None

        # Update last_used async (non-blocking)
        asyncio.create_task(self._touch_key(h))

        # Cache (TTL managed by cache size — evict oldest if >10k)
        async with self._cache_lock:
            if len(self._key_cache) > 10000:
                first = next(iter(self._key_cache))
                del self._key_cache[first]
            self._key_cache[raw_key] = r
        return r

    async def _touch_key(self, key_hash: str):
        try:
            db = await self._get_db()
            await db.execute(
                "UPDATE edge_api_keys SET last_used=?, request_count=request_count+1 WHERE key_hash=?",
                [_now(), key_hash]
            )
            await db.commit()
        except Exception:
            pass

    async def create_customer(self, data: Dict) -> Dict:
        db  = await self._get_db()
        cid = str(uuid.uuid4())
        import json
        await db.execute(
            """INSERT INTO edge_customers (id, name, email, plan_code, status, description, metadata, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            [cid, data["name"], data["email"], data.get("plan_code","free"),
             "active", data.get("description",""), json.dumps(data.get("metadata",{})),
             _now(), _now()]
        )
        await db.commit()
        # Auto-create first API key
        key_data = await self.create_key(cid, label="Default key")
        log.info("edge_customer_created", id=cid, email=data["email"])
        return {"customer_id": cid, "email": data["email"], "api_key": key_data["key"]}

    async def create_key(self, customer_id: str, label: str = "", expires_days: Optional[int] = None) -> Dict:
        import hashlib
        raw_key    = _gen_key()
        key_hash   = hashlib.sha256(raw_key.encode()).hexdigest()
        key_prefix = raw_key[:16] + "…"
        key_id     = str(uuid.uuid4())
        expires_at = ""
        if expires_days:
            expires_at = (datetime.now(timezone.utc) + timedelta(days=expires_days)).isoformat()

        db = await self._get_db()
        await db.execute(
            """INSERT INTO edge_api_keys (id, customer_id, key_hash, key_prefix, label, status, expires_at, created_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            [key_id, customer_id, key_hash, key_prefix, label, "active", expires_at, _now()]
        )
        await db.commit()
        return {
            "id":          key_id,
            "customer_id": customer_id,
            "key":         raw_key,   # Only returned ONCE
            "key_prefix":  key_prefix,
            "label":       label,
            "expires_at":  expires_at or None,
            "created_at":  _now(),
            "warning":     "Store this key securely — it will not be shown again.",
        }

    async def revoke_key(self, key_id: str):
        db = await self._get_db()
        await db.execute("UPDATE edge_api_keys SET status='revoked' WHERE id=?", [key_id])
        await db.commit()
        # Invalidate cache
        async with self._cache_lock:
            self._key_cache.clear()

    async def list_keys(self, customer_id: Optional[str] = None) -> List[Dict]:
        db    = await self._get_db()
        where = "WHERE k.customer_id=?" if customer_id else ""
        rows  = await db.execute_fetchall(
            f"""SELECT k.id, k.customer_id, k.key_prefix, k.label, k.status,
                       k.last_used, k.request_count, k.expires_at, k.created_at,
                       c.name as customer_name, c.email as customer_email
                FROM edge_api_keys k JOIN edge_customers c ON c.id=k.customer_id
                {where} ORDER BY k.created_at DESC LIMIT 500""",
            [customer_id] if customer_id else []
        )
        return [dict(r) for r in rows]

    async def list_customers(self, limit=100, offset=0, status=None) -> Dict:
        db    = await self._get_db()
        where = "WHERE status=?" if status else ""
        rows  = await db.execute_fetchall(
            f"SELECT * FROM edge_customers {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            ([status] if status else []) + [limit, offset]
        )
        total_rows = await db.execute_fetchall(
            f"SELECT COUNT(*) as n FROM edge_customers {where}",
            [status] if status else []
        )
        return {
            "customers": [dict(r) for r in rows],
            "total":     total_rows[0]["n"] if total_rows else 0,
        }

    async def get_customer(self, customer_id: str) -> Optional[Dict]:
        db  = await self._get_db()
        row = await db.execute_fetchall("SELECT * FROM edge_customers WHERE id=?", [customer_id])
        return dict(row[0]) if row else None

    async def update_customer(self, customer_id: str, data: Dict) -> Dict:
        db  = await self._get_db()
        allowed = {"name","email","plan_code","description","status"}
        sets = ", ".join(f"{k}=?" for k in data if k in allowed)
        vals = [v for k, v in data.items() if k in allowed]
        if not sets:
            raise ValueError("No valid fields to update")
        await db.execute(f"UPDATE edge_customers SET {sets}, updated_at=? WHERE id=?", vals + [_now(), customer_id])
        await db.commit()
        async with self._cache_lock:
            self._key_cache.clear()
        return await self.get_customer(customer_id) or {}

    async def delete_customer(self, customer_id: str):
        db = await self._get_db()
        await db.execute("UPDATE edge_api_keys SET status='revoked' WHERE customer_id=?", [customer_id])
        await db.execute("DELETE FROM edge_customers WHERE id=?", [customer_id])
        await db.commit()
        async with self._cache_lock:
            self._key_cache.clear()

    async def set_status(self, customer_id: str, status: str) -> Dict:
        return await self.update_customer(customer_id, {"status": status})

    async def count_active_customers(self) -> int:
        db  = await self._get_db()
        row = await db.execute_fetchall("SELECT COUNT(*) as n FROM edge_customers WHERE status='active'")
        return row[0]["n"] if row else 0

    async def count_keys(self) -> int:
        db  = await self._get_db()
        row = await db.execute_fetchall("SELECT COUNT(*) as n FROM edge_api_keys WHERE status='active'")
        return row[0]["n"] if row else 0
