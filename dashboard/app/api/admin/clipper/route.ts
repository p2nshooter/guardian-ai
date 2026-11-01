/* AXTO — GET /api/admin/clipper?month=YYYY-MM · Admin → Clipper (Clipper C1).
 * One month of Clipper use from index summaries only: videos and members,
 * the members using it most, refusals at the quota and storage limits, and
 * the latest usage events. Member e-mails come from the users index. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { monthKey } from "@/lib/plans";
import { fail } from "@/lib/http";
import { monthReport } from "@/lib/clipper/usage-log";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const month = req.nextUrl.searchParams.get("month") || monthKey();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return fail("Choose a month as YYYY-MM.");
  const db = getData(req);
  const [report, users] = await Promise.all([monthReport(db, month), db.users.listAll("all", "all")]);
  const email = new Map(users.map((u) => [u.id, String(u.meta.email || "")]));
  const storage = new Map(users.map((u) => [u.id, Number(u.meta.storage_bytes) || 0]));
  return respond({
    ...report,
    top: report.top.map((t) => ({ ...t, email: email.get(t.user_id) || "", storage_bytes: storage.get(t.user_id) || 0 })),
    events: report.events.map((e) => ({ ...e, email: email.get(e.user_id || "") || "" })),
  }, ctx);
}
