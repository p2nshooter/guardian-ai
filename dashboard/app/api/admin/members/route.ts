/* AXTO — GET /api/admin/members?q=&plan=&page= · member list (admin only). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";

const PAGE = 50;

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 100);
  const plan = url.searchParams.get("plan") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const where: string[] = ["u.role = 'client'"];
  const args: unknown[] = [];
  if (q) { where.push("(u.email LIKE ? OR u.name LIKE ? OR u.organization LIKE ?)"); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (plan === "none") where.push("(s.plan IS NULL OR s.status != 'active' OR s.current_period_end <= datetime('now'))");
  else if (plan) { where.push("s.plan = ? AND s.status = 'active'"); args.push(plan); }
  const db = getDB(req);
  const w = where.join(" AND ");
  const [rows, total] = await Promise.all([
    dbQuery(db,
      `SELECT u.id, u.email, u.name, u.organization, u.country, u.status, u.created_at, u.last_login_at, u.storage_bytes,
              s.plan, s.cycle, s.status AS sub_status, s.current_period_end
         FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id
        WHERE ${w} ORDER BY u.created_at DESC LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`, args),
    dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id WHERE ${w}`, args),
  ]);
  return respond({ members: rows, total: total?.n ?? 0, page, pageSize: PAGE }, ctx);
}
