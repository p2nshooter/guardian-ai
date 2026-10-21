/* AXTO — GET /api/admin/members?q=&plan=&page= · member list (admin only). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";

const PAGE = 50;

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 100);
  const plan = url.searchParams.get("plan") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const db = getData(req);
  // Both lists come from index summaries: a few list calls, no document reads, whatever the number of members.
  const [users, subs] = await Promise.all([db.users.listAll("all", "all"), db.subscriptions.listAll("all", "all")]);
  const subOf = new Map(subs.map((e) => [e.id, e.meta]));
  const nowIso = new Date().toISOString();
  const rows = users.flatMap((e) => {
    const u = e.meta as Record<string, any>;
    if (u.role !== "client") return [];
    if (q && ![u.email, u.name, u.organization].some((v) => String(v || "").toLowerCase().includes(q))) return [];
    const s = subOf.get(e.id) as Record<string, any> | undefined;
    const active = !!s && s.status === "active" && String(s.current_period_end || "") > nowIso;
    if (plan === "none" && active) return [];
    if (plan && plan !== "none" && !(s && s.plan === plan && s.status === "active")) return [];
    return [{
      id: e.id, email: u.email, name: u.name, organization: u.organization, country: u.country, status: u.status, created_at: u.created_at,
      last_login_at: u.last_login_at, storage_bytes: u.storage_bytes, plan: s?.plan ?? null, cycle: s?.cycle ?? null, sub_status: s?.status ?? null,
      current_period_end: s?.current_period_end ?? null,
    }];
  });
  return respond({ members: rows.slice((page - 1) * PAGE, page * PAGE), total: rows.length, page, pageSize: PAGE }, ctx);
}
