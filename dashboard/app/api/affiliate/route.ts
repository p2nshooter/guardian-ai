/* AXTO — /api/affiliate · the signed-in member's affiliate account
 * (docs/BUSINESS-MASTER-BLUEPRINT.md §4.1 B, §7.1, §7.4):
 *   GET  → the programme's public terms, whether it is open, and — once joined —
 *          the code and link, 30-day clicks, referred sign-ups, commissions and
 *          payouts. Referred members appear only as a masked address; the payout
 *          destination only as its masked label.
 *   POST {action:"join", accept:true} → join (free); the terms version is recorded
 *   PUT  {payout:{method, …}}         → where commissions are paid (stored encrypted)
 * A member who joined keeps the portal while the programme is hidden (§3). */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { loadSession, respond, unauthorized } from "@/lib/auth";
import { readJson, fail, ipOf, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/site";
import { encryptJson, SettingsKeyMissing } from "@/lib/secure-store";
import { getPrograms, isOpen, publicPrograms } from "@/lib/programs";
import { AFF_TERMS_VERSION, affiliateStats, joinAffiliate, setPayout } from "@/lib/affiliate";
import type { AffiliateDoc } from "@/lib/data/schema";

const maskEmail = (e: string) => {
  const [u = "", d = ""] = String(e).split("@");
  return `${u.slice(0, 1)}•••@${d}`;
};

const mine = (a: AffiliateDoc) => ({
  code: a.code, status: a.status, acceptedAt: a.accepted_at, termsVersion: a.terms_version,
  payoutMethod: a.payout_method, payoutLabel: a.payout_label, createdAt: a.created_at, link: absoluteUrl(`/?ref=${a.code}`),
});

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const db = getData(req);
  const [p, aff] = await Promise.all([getPrograms(db), db.affiliates.get(ctx.session.sub)]);
  const program = publicPrograms(p).affiliate;
  const terms = { commissionPct: p.affiliate.commissionPct, months: p.affiliate.months, partnerFeePct: p.affiliate.partnerFeePct, holdDays: p.affiliate.holdDays, cookieDays: p.affiliate.cookieDays, minPayoutUsd: p.affiliate.minPayoutUsd };
  if (!aff) {
    return respond({ shown: !!program, open: isOpen(p, "affiliate"), admin: ctx.session.role === "admin", terms: program ? terms : null, termsVersion: AFF_TERMS_VERSION, affiliate: null }, ctx);
  }
  const [stats, refs, comms, pays] = await Promise.all([
    affiliateStats(db, aff.id),
    db.referrals.list("affiliate", aff.id, { limit: 100 }).then((r) => r.entries),
    db.commissions.list("affiliate", aff.id, { limit: 100 }).then((r) => r.entries),
    db.affPayouts.list("affiliate", aff.id, { limit: 36 }).then((r) => r.entries),
  ]);
  return respond({
    shown: !!program, open: isOpen(p, "affiliate"), frozen: p.affiliate.frozen, admin: false, terms, termsVersion: AFF_TERMS_VERSION,
    affiliate: mine(aff), stats,
    referrals: refs.map((e) => { const m = e.meta as any; return { email: maskEmail(m.email), at: m.attributed_at, until: m.until }; }),
    commissions: comms.map((e) => { const m = e.meta as any; return { id: e.id, kind: m.kind, amountUsd: m.amount_usd, status: m.status, holdUntil: m.hold_until, at: m.created_at }; }),
    payouts: pays.map((e) => { const m = e.meta as any; return { id: e.id, period: m.period, amountUsd: m.amount_usd, label: m.label, status: m.status, paidAt: m.paid_at, at: m.created_at }; }),
  }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  const b = await readJson(req);
  if (b?.action !== "join") return fail("Unknown action.");
  if (b?.accept !== true) return fail("Please accept the affiliate terms.", 400, { code: "accept" });
  const rl = await rateLimit(req, "aff-join", ctx.session.sub, { max: 10, windowSeconds: 3600 });
  if (rl.limited) return fail("Too many attempts — please try again later.", 429);
  const db = getData(req);
  const r = await joinAffiliate(db, ctx.session, ipOf(req));
  if ("error" in r) {
    const msg = { closed: "The affiliate programme is not taking new members at the moment.", admin: "Administrator accounts cannot join the affiliate programme.", banned: "This account cannot take part in the affiliate programme." }[r.error];
    return fail(msg, r.error === "closed" ? 409 : 403, { code: r.error });
  }
  await audit(db, ctx.session, "affiliate.join", "affiliate", r.id, { code: r.code, terms: r.terms_version }, req);
  return respond({ ok: true, affiliate: mine(r) }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  const b = await readJson(req);
  if (!b?.payout || typeof b.payout !== "object") return fail("Nothing to save.");
  const rl = await rateLimit(req, "aff-payout", ctx.session.sub, { max: 10, windowSeconds: 3600 });
  if (rl.limited) return fail("Too many changes — please try again later.", 429);
  const db = getData(req);
  try {
    const r = await setPayout(db, ctx.session.sub, b.payout, encryptJson);
    if ("error" in r) return fail(r.error);
    // The destination itself is never written to the log — only that it changed, and its kind.
    await audit(db, ctx.session, "affiliate.payout_set", "affiliate", r.id, { method: r.payout_method }, req);
    return respond({ ok: true, affiliate: mine(r) }, ctx);
  } catch (e) {
    if (e instanceof SettingsKeyMissing) return fail("Payout details cannot be saved right now. Please try again later.", 503);
    throw e;
  }
}
