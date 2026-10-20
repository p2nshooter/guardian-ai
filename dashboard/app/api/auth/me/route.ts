/* AXTO — GET /api/auth/me · current account, plan, usage, Local Mode availability. Always re-reads the
 * plan from D1 (so a fresh payment is visible immediately) and refreshes the cookie. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, dbFirst } from "@/lib/db";
import { loadSession, respond, effectiveTier } from "@/lib/auth";
import { getUsage } from "@/lib/usage";
import { PLANS, limitsFor, isPlanId } from "@/lib/plans";
import { localModeFor } from "@/lib/ai/local-settings";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  // ?optional=1: public pages only ask "is someone signed in?" — a visitor is not an error there.
  if (!ctx) return respond({ user: null }, null, { status: req.nextUrl.searchParams.has("optional") ? 200 : 401 });
  const s = ctx.session;
  const db = getDB(req);
  const tier = effectiveTier(s);
  const [profile, sub, usage, localMode] = await Promise.all([
    dbFirst<any>(db, `SELECT name, organization, country, created_at FROM users WHERE id = ?`, [s.sub]),
    dbFirst<any>(db, `SELECT plan, cycle, status, current_period_start, current_period_end FROM subscriptions WHERE user_id = ?`, [s.sub]),
    getUsage(db, s.sub, tier),
    localModeFor(db, tier),
  ]);
  return respond({
    user: { id: s.sub, email: s.email, role: s.role, name: profile?.name || "", organization: profile?.organization || "", country: profile?.country || "", createdAt: profile?.created_at || "" },
    tier,
    planName: isPlanId(tier) ? PLANS[tier].name : "Free account",
    subscription: sub || null,
    limits: limitsFor(tier),
    usage,
    localMode,          // Local Mode (AI on this device) allowed: plan + operator switch
  }, ctx);
}
