# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO Edge — BillingEngine: Cost calculation + invoice generation."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
import aiosqlite
import structlog

log = structlog.get_logger()

# Provider cost per 1K tokens (what YOU pay) — Edge calculates your margin
PROVIDER_COST_PER_1K: Dict[str, float] = {
    "gpt-4o":                      0.005,
    "gpt-4o-mini":                 0.000150,
    "gpt-4-turbo":                 0.010,
    "claude-opus-4-6":             0.015,
    "claude-sonnet-4-6":           0.003,
    "claude-haiku-4-5-20251001":   0.000250,
    "gemini-1.5-pro":              0.0035,
    "gemini-2.0-flash":            0.000100,
    "gemini-2.0-flash-lite":       0.000040,
    "llama-3.1-8b-instant":        0.000050,
    "llama-3.3-70b-versatile":     0.000590,
    "deepseek-chat":               0.000140,
    "mistral-small-latest":        0.001,
    "default":                     0.001,
}

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class BillingEngine:
    def __init__(self, data_dir: Path):
        self._db_path = data_dir / "edge.db"
        self._db: Optional[aiosqlite.Connection] = None

    async def startup(self):
        self._db = await aiosqlite.connect(str(self._db_path))
        self._db.row_factory = aiosqlite.Row
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._create_tables()

    async def _create_tables(self):
        await self._db.executescript("""
        CREATE TABLE IF NOT EXISTS edge_invoices (
          id              TEXT PRIMARY KEY,
          customer_id     TEXT NOT NULL,
          customer_name   TEXT NOT NULL DEFAULT '',
          customer_email  TEXT NOT NULL DEFAULT '',
          plan_code       TEXT NOT NULL DEFAULT '',
          period_start    TEXT NOT NULL,
          period_end      TEXT NOT NULL,
          total_requests  INTEGER DEFAULT 0,
          input_tokens    INTEGER DEFAULT 0,
          output_tokens   INTEGER DEFAULT 0,
          total_tokens    INTEGER DEFAULT 0,
          provider_cost   REAL DEFAULT 0,
          amount_usd      REAL DEFAULT 0,
          margin_usd      REAL DEFAULT 0,
          status          TEXT DEFAULT 'draft',
          created_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_inv_customer ON edge_invoices(customer_id, created_at);
        """)
        await self._db.commit()

    def calculate_cost(self, input_tokens: int, output_tokens: int,
                       model: str = "", plan=None) -> float:
        """Calculate what to charge the CUSTOMER (your price, not provider cost)."""
        total = input_tokens + output_tokens
        if not total:
            return 0.0
        price_per_1k = getattr(plan, "price_per_1k_tokens", 0.002) if plan else 0.002
        return round(total / 1000.0 * price_per_1k, 8)

    def provider_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """What YOU pay the AI provider."""
        total    = input_tokens + output_tokens
        cost_1k  = PROVIDER_COST_PER_1K.get(model, PROVIDER_COST_PER_1K["default"])
        return round(total / 1000.0 * cost_1k, 8)

    async def generate_invoices(self, period: str = "current_month") -> List[Dict]:
        """Generate invoices for all customers in the billing period."""
        now  = datetime.now(timezone.utc)
        if period == "current_month":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end   = now
        elif period == "last_month":
            start = (now.replace(day=1) - timedelta(days=1)).replace(day=1)
            end   = now.replace(day=1) - timedelta(seconds=1)
        else:
            start = now.replace(day=1)
            end   = now

        db = self._db
        # Get all customers with usage in period
        rows = await db.execute_fetchall(
            """SELECT u.customer_id,
                      c.name as customer_name, c.email as customer_email, c.plan_code,
                      COUNT(*) as total_requests,
                      SUM(u.input_tokens) as input_tokens,
                      SUM(u.output_tokens) as output_tokens,
                      SUM(u.input_tokens+u.output_tokens) as total_tokens,
                      SUM(u.cost_usd) as amount_usd
               FROM edge_usage u JOIN edge_customers c ON c.id=u.customer_id
               WHERE u.created_at>=? AND u.created_at<=?
               GROUP BY u.customer_id""",
            [start.isoformat(), end.isoformat()]
        )

        results = []
        for row in rows:
            r   = dict(row)
            inv_id = str(uuid.uuid4())
            margin = round(r.get("amount_usd",0) - self.provider_cost(
                r.get("input_tokens",0), r.get("output_tokens",0), "default"
            ), 4)
            await db.execute(
                """INSERT OR IGNORE INTO edge_invoices
                   (id, customer_id, customer_name, customer_email, plan_code,
                    period_start, period_end, total_requests, input_tokens, output_tokens,
                    total_tokens, amount_usd, margin_usd, status, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?)""",
                [inv_id, r["customer_id"], r["customer_name"], r["customer_email"],
                 r["plan_code"], start.isoformat(), end.isoformat(),
                 r["total_requests"], r["input_tokens"], r["output_tokens"],
                 r["total_tokens"], r["amount_usd"], margin, _now()]
            )
            r["invoice_id"] = inv_id
            results.append(r)
        await db.commit()
        return results

    async def list_invoices(self, customer_id=None, limit=50) -> List[Dict]:
        db    = self._db
        if not db: return []
        where = "WHERE customer_id=?" if customer_id else ""
        rows  = await db.execute_fetchall(
            f"SELECT * FROM edge_invoices {where} ORDER BY created_at DESC LIMIT ?",
            ([customer_id] if customer_id else []) + [limit]
        )
        return [dict(r) for r in rows]

    async def get_invoice(self, invoice_id: str) -> Optional[Dict]:
        db = self._db
        if not db: return None
        rows = await db.execute_fetchall("SELECT * FROM edge_invoices WHERE id=?", [invoice_id])
        return dict(rows[0]) if rows else None

    async def get_revenue_summary(self, days=30) -> Dict:
        db = self._db
        if not db: return {}
        rows = await db.execute_fetchall(
            """SELECT date(created_at) as day,
                      COUNT(DISTINCT customer_id) as active_customers,
                      SUM(total_requests) as requests,
                      SUM(total_tokens) as tokens,
                      SUM(amount_usd) as revenue_usd,
                      SUM(margin_usd) as margin_usd
               FROM edge_invoices
               WHERE created_at>=date('now',?)
               GROUP BY day ORDER BY day""",
            [f"-{days} days"]
        )
        totals = await db.execute_fetchall(
            "SELECT SUM(amount_usd) as total_rev, SUM(margin_usd) as total_margin FROM edge_invoices WHERE created_at>=date('now',?)",
            [f"-{days} days"]
        )
        t = dict(totals[0]) if totals else {}
        return {
            "period_days":   days,
            "total_revenue": round(t.get("total_rev",0) or 0, 4),
            "total_margin":  round(t.get("total_margin",0) or 0, 4),
            "timeline":      [dict(r) for r in rows],
        }
