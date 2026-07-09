# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Edge — UsageMeter: Token metering, quota enforcement, analytics."""
from __future__ import annotations
import asyncio
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
import aiosqlite
import structlog

log = structlog.get_logger()


class UsageMeter:
    def __init__(self, data_dir: Path):
        self._db_path   = data_dir / "edge.db"
        self._db: Optional[aiosqlite.Connection] = None
        self._write_q:  asyncio.Queue = asyncio.Queue(maxsize=5000)

    async def startup(self):
        self._db = await aiosqlite.connect(str(self._db_path))
        self._db.row_factory = aiosqlite.Row
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA synchronous=NORMAL")
        await self._db.execute("PRAGMA cache_size=-16000")
        await self._create_tables()
        asyncio.create_task(self._writer_loop(), name="meter-writer")

    async def _create_tables(self):
        await self._db.executescript("""
        CREATE TABLE IF NOT EXISTS edge_usage (
          id            TEXT PRIMARY KEY,
          customer_id   TEXT NOT NULL,
          req_id        TEXT NOT NULL,
          model         TEXT NOT NULL DEFAULT '',
          path          TEXT NOT NULL DEFAULT '',
          input_tokens  INTEGER NOT NULL DEFAULT 0,
          output_tokens INTEGER NOT NULL DEFAULT 0,
          cost_usd      REAL NOT NULL DEFAULT 0,
          elapsed_ms    INTEGER NOT NULL DEFAULT 0,
          created_at    TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS edge_blocked (
          id          TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          reason      TEXT NOT NULL,
          created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_eu_customer ON edge_usage(customer_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_eu_date     ON edge_usage(created_at);
        CREATE INDEX IF NOT EXISTS idx_eu_model    ON edge_usage(model, created_at);
        CREATE INDEX IF NOT EXISTS idx_eb_customer ON edge_blocked(customer_id, created_at);
        """)
        await self._db.commit()

    async def record_request(self, customer_id, req_id, model, input_tokens,
                              output_tokens, cost_usd, elapsed_ms, path):
        try:
            self._write_q.put_nowait({
                "type": "request",
                "customer_id": customer_id, "req_id": req_id, "model": model,
                "path": path, "input_tokens": input_tokens, "output_tokens": output_tokens,
                "cost_usd": cost_usd, "elapsed_ms": elapsed_ms, "ts": _now(),
            })
        except asyncio.QueueFull:
            log.warning("meter_queue_full")

    async def record_blocked(self, customer_id: str, reason: str):
        import uuid
        db = self._db
        if db:
            try:
                await db.execute(
                    "INSERT INTO edge_blocked (id, customer_id, reason, created_at) VALUES (?,?,?,?)",
                    [str(uuid.uuid4()), customer_id, reason, _now()]
                )
                await db.commit()
            except Exception:
                pass

    async def check_quota(self, customer_id: str, plan) -> bool:
        """True = still within quota."""
        quota = getattr(plan, "monthly_token_quota", 0)
        if quota <= 0:
            return True   # unlimited
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        db = self._db
        if not db:
            return True
        row = await db.execute_fetchall(
            "SELECT SUM(input_tokens+output_tokens) as total FROM edge_usage WHERE customer_id=? AND created_at>=?",
            [customer_id, month_start]
        )
        used = row[0]["total"] or 0 if row else 0
        return used < quota

    async def _writer_loop(self):
        while True:
            try:
                event = await self._write_q.get()
                if event["type"] == "request":
                    import uuid
                    await self._db.execute(
                        """INSERT INTO edge_usage
                           (id, customer_id, req_id, model, path, input_tokens, output_tokens, cost_usd, elapsed_ms, created_at)
                           VALUES (?,?,?,?,?,?,?,?,?,?)""",
                        [str(uuid.uuid4()), event["customer_id"], event["req_id"], event["model"],
                         event["path"], event["input_tokens"], event["output_tokens"],
                         event["cost_usd"], event["elapsed_ms"], event["ts"]]
                    )
                    await self._db.commit()
                self._write_q.task_done()
            except Exception as e:
                log.error("meter_write_error", error=str(e))

    async def get_today_stats(self) -> Dict:
        today = str(date.today())
        db    = self._db
        if not db:
            return {"requests": 0, "tokens": 0, "blocked": 0, "revenue_usd": 0}
        rows = await db.execute_fetchall(
            """SELECT COUNT(*) as requests,
                      SUM(input_tokens+output_tokens) as tokens,
                      SUM(cost_usd) as revenue_usd
               FROM edge_usage WHERE created_at >= ?""",
            [today]
        )
        r = dict(rows[0]) if rows else {}
        b = await db.execute_fetchall("SELECT COUNT(*) as n FROM edge_blocked WHERE created_at >= ?", [today])
        return {
            "requests":    r.get("requests", 0) or 0,
            "tokens":      r.get("tokens", 0) or 0,
            "revenue_usd": round(r.get("revenue_usd", 0) or 0, 4),
            "blocked":     b[0]["n"] if b else 0,
        }

    async def get_usage(self, customer_id=None, since=None, period="day") -> Dict:
        db    = self._db
        if not db:
            return {}
        conds: List[str] = []
        params: List[Any] = []
        if customer_id:
            conds.append("customer_id=?"); params.append(customer_id)
        if since:
            conds.append("created_at>=?"); params.append(since)
        elif period == "day":
            conds.append("created_at>=?"); params.append(str(date.today()))
        elif period == "week":
            conds.append("created_at>=date('now','-7 days')")
        elif period == "month":
            conds.append("created_at>=date('now','start of month')")
        where = ("WHERE " + " AND ".join(conds)) if conds else ""
        rows = await db.execute_fetchall(
            f"""SELECT COUNT(*) as requests,
                       SUM(input_tokens) as input_tokens,
                       SUM(output_tokens) as output_tokens,
                       SUM(input_tokens+output_tokens) as total_tokens,
                       SUM(cost_usd) as revenue_usd,
                       AVG(elapsed_ms) as avg_latency_ms
                FROM edge_usage {where}""",
            params
        )
        return dict(rows[0]) if rows else {}

    async def get_timeline(self, customer_id=None, days=30) -> List[Dict]:
        db    = self._db
        if not db:
            return []
        cond  = "AND customer_id=?" if customer_id else ""
        params = ([customer_id] if customer_id else []) + [f"-{days} days"]
        rows  = await db.execute_fetchall(
            f"""SELECT date(created_at) as day,
                       COUNT(*) as requests,
                       SUM(input_tokens+output_tokens) as tokens,
                       SUM(cost_usd) as revenue_usd,
                       AVG(elapsed_ms) as avg_latency_ms
                FROM edge_usage
                WHERE created_at>=date('now',?) {cond}
                GROUP BY day ORDER BY day""",
            params
        )
        return [dict(r) for r in rows]

    async def get_top_customers(self, limit=20, days=30) -> List[Dict]:
        db = self._db
        if not db:
            return []
        rows = await db.execute_fetchall(
            """SELECT u.customer_id,
                      c.name as customer_name, c.email, c.plan_code,
                      COUNT(*) as requests,
                      SUM(u.input_tokens+u.output_tokens) as tokens,
                      SUM(u.cost_usd) as revenue_usd
               FROM edge_usage u JOIN edge_customers c ON c.id=u.customer_id
               WHERE u.created_at>=date('now',?)
               GROUP BY u.customer_id ORDER BY revenue_usd DESC LIMIT ?""",
            [f"-{days} days", limit]
        )
        return [dict(r) for r in rows]

    async def get_model_breakdown(self, customer_id=None, days=30) -> List[Dict]:
        db    = self._db
        if not db:
            return []
        cond  = "AND customer_id=?" if customer_id else ""
        params = ([customer_id] if customer_id else []) + [f"-{days} days"]
        rows  = await db.execute_fetchall(
            f"""SELECT model,
                       COUNT(*) as requests,
                       SUM(input_tokens+output_tokens) as tokens,
                       SUM(cost_usd) as revenue_usd,
                       AVG(elapsed_ms) as avg_latency_ms
                FROM edge_usage
                WHERE created_at>=date('now',?) {cond}
                GROUP BY model ORDER BY requests DESC""",
            params
        )
        return [dict(r) for r in rows]

    async def get_customer_detail(self, customer_id: str, days=30) -> Dict:
        usage    = await self.get_usage(customer_id=customer_id, period="month")
        timeline = await self.get_timeline(customer_id=customer_id, days=days)
        models   = await self.get_model_breakdown(customer_id=customer_id, days=days)
        db = self._db
        blocked = 0
        if db:
            b = await db.execute_fetchall(
                "SELECT COUNT(*) as n FROM edge_blocked WHERE customer_id=? AND created_at>=date('now',?)",
                [customer_id, f"-{days} days"]
            )
            blocked = b[0]["n"] if b else 0
        return {
            "summary":  usage,
            "timeline": timeline,
            "models":   models,
            "blocked_requests": blocked,
        }

    async def get_blocked_stats(self, days=7) -> Dict:
        db = self._db
        if not db:
            return {}
        rows = await db.execute_fetchall(
            """SELECT reason, COUNT(*) as count
               FROM edge_blocked WHERE created_at>=date('now',?)
               GROUP BY reason ORDER BY count DESC""",
            [f"-{days} days"]
        )
        total = await db.execute_fetchall(
            "SELECT COUNT(*) as n FROM edge_blocked WHERE created_at>=date('now',?)",
            [f"-{days} days"]
        )
        return {
            "total":   total[0]["n"] if total else 0,
            "by_reason": [dict(r) for r in rows],
        }

    async def close(self):
        if self._db:
            await self._db.close()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
