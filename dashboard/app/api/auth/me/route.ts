/* AXTO — GET /api/auth/me · current account, plan, usage, Local Mode availability. Always re-reads the
 * plan from the data store (so a fresh payment is visible immediately) and refreshes the cookie. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { ids } from "@/lib/data/schema";
import { loadSession, respond, effectiveTier } from "@/lib/auth";
import { getUsage } from "@/lib/usage";
import { PLANS, limitsFor, isPlanId } from "@/lib/plans";
import { localModeFor } from "@/lib/ai/local-settings";
import { hasInvestorRecord, investVisible } from "@/lib/invest";
import { getPrograms, isShown } from "@/lib/programs";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  // ?optional=1: public pages only ask "is someone signed in?" — a visitor is not an error there.
  if (!ctx) return respond({ user: null }, null, { status: req.nextUrl.searchParams.has("optional") ? 200 : 401 });
  const s = ctx.session;
  const db = getData(req);
  const tier = effectiveTier(s);
  const [profile, sub, usage, localMode, investShown, investRecord, programs, affiliate] = await Promise.all([
    db.users.get(s.sub),
    db.subscriptions.get(ids.subscription(s.sub)),
    getUsage(db, s.sub, tier),
    localModeFor(db, tier),
    investVisible(db),
    hasInvestorRecord(db, s.email),
    getPrograms(db).catch(() => null),
    db.affiliates.get(s.sub).catch(() => null),
  ]);
  return respond({
    user: { id: s.sub, email: s.email, role: s.role, name: profile?.name || "", organization: profile?.organization || "", country: profile?.country || "", createdAt: profile?.created_at || "" },
    tier,
    planName: isPlanId(tier) ? PLANS[tier].name : "Free account",
    subscription: sub ? { plan: sub.plan, cycle: sub.cycle, status: sub.status, current_period_start: sub.current_period_start, current_period_end: sub.current_period_end } : null,
    limits: limitsFor(tier),
    usage,
    localMode,          // Local Mode (AI on this device) allowed: plan + operator switch
    investor: investShown || investRecord,   // §26.4: "Investment" in the menu only while the round is shown, or for an investor
    // "Affiliate" in the menu while the programme is shown, and always for a member who joined (§3).
    affiliate: s.role !== "admin" && (!!affiliate || (!!programs && isShown(programs, "affiliate"))),
  }, ctx);
}
