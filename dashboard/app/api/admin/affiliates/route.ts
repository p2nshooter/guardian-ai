/* AXTO — /api/admin/affiliates · Admin → Affiliates (docs/BUSINESS-MASTER-BLUEPRINT.md §7.1, §7.4, §8)
 *   GET            → affiliates by status, commissions waiting for a look, payouts by
 *                    status, and the totals; ?id=<affiliate> adds one affiliate's
 *                    referrals, commissions and payouts
 *   POST {action}  set_status {id, status, note}   active · suspended · banned
 *                  review {id, approve}            a flagged or large commission
 *                  payout_paid {id, reference}     a wire / USDT payout was sent
 *                  payout_failed {id, reason}      its commissions return to the next payout
 *                  reveal_payout {id}              the affiliate's destination, to pay by hand (audited)
 *                  run_payouts                     make this month's payouts now
 * Money only moves by itself through PayPal Payouts; every other payout waits for
 * the one approval here, by design (§7.4). Every action is audited. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond, forbidden } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { decryptJson, SettingsKeyMissing } from "@/lib/secure-store";
import { gatewayCreds } from "@/lib/billing/gateways";
import { paypalPayout } from "@/lib/billing/providers";
import { affiliateStats, affiliateTick, failPayout, markPayoutPaid, reviewCommission, setAffiliateStatus, type PayoutDetails } from "@/lib/affiliate";
import type { AffiliateDoc } from "@/lib/data/schema";

const STATUSES: AffiliateDoc["status"][] = ["active", "suspended", "banned"];
const rows = (entries: { id: string; meta: unknown }[]) => entries.map((e) => ({ id: e.id, ...(e.meta as any) }));
const sum = (list: { amount_usd?: number }[]) => Math.round(list.reduce((n, x) => n + Number(x.amount_usd || 0), 0) * 100) / 100;

async function view(req: NextRequest) {
  const db = getData(req);
  const [active, suspended, banned, review, held, payable, approval, processing, failed, paid] = await Promise.all([
    ...STATUSES.map((s) => db.affiliates.list("status", s, { limit: 1000 }).then((p) => rows(p.entries))),
    ...(["review", "held", "payable"] as const).map((s) => db.commissions.list("status", s, { limit: 1000 }).then((p) => rows(p.entries))),
    ...(["approval", "processing", "failed", "paid"] as const).map((s) => db.affPayouts.list("status", s, { limit: s === "paid" ? 60 : 500 }).then((p) => rows(p.entries))),
  ]);
  const id = req.nextUrl.searchParams.get("id");
  let detail: unknown = null;
  if (id) {
    const a = await db.affiliates.get(id);
    if (a) {
      const [stats, refs, comms, pays] = await Promise.all([
        affiliateStats(db, id),
        db.referrals.list("affiliate", id, { limit: 500 }).then((p) => rows(p.entries)),
        db.commissions.list("affiliate", id, { limit: 500 }).then((p) => rows(p.entries)),
        db.affPayouts.list("affiliate", id, { limit: 60 }).then((p) => rows(p.entries)),
      ]);
      const { payout_enc, join_ip, ...safe } = a;
      detail = { affiliate: { ...safe, hasPayout: !!payout_enc }, stats, referrals: refs, commissions: comms, payouts: pays };
    }
  }
  return {
    affiliates: { active, suspended, banned },
    commissions: { review, held, payable },
    payouts: { approval, processing, failed, paid },
    totals: { held: sum(held) + sum(review), payable: sum(payable), awaiting: sum(approval), paid: sum(paid) },
    detail,
  };
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  return respond(await view(req), ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const b = await readJson(req);
  const db = getData(req);
  const by = ctx.session.email;
  const id = String(b?.id || "");
  const done = async (action: string, entity: string, meta: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => {
    await audit(db, ctx.session, action, entity, id || "run", meta, req);
    return respond({ ok: true, ...extra, ...(await view(req)) }, ctx);
  };
  switch (b?.action) {
    case "set_status": {
      if (!STATUSES.includes(b.status)) return fail("Unknown status.");
      const r = await setAffiliateStatus(db, id, b.status, String(b.note || ""));
      if ("error" in r) return fail(r.error, 404);
      return done("affiliate.status", "affiliate", { status: r.status, note: r.note });
    }
    case "review": {
      const r = await reviewCommission(db, id, b.approve === true, by);
      if ("error" in r) return fail(r.error);
      return done("affiliate.commission_review", "commission", { approve: b.approve === true, amountUsd: r.amount_usd });
    }
    case "payout_paid": {
      const r = await markPayoutPaid(db, id, String(b.reference || "").trim(), by);
      if ("error" in r) return fail(r.error);
      return done("affiliate.payout_paid", "aff_payout", { amountUsd: r.amount_usd, reference: r.reference });
    }
    case "payout_failed": {
      const reason = String(b.reason || "").trim();
      if (!reason) return fail("Say why the payout could not be made.");
      const r = await failPayout(db, id, reason, by);
      if ("error" in r) return fail(r.error);
      return done("affiliate.payout_failed", "aff_payout", { reason });
    }
    case "reveal_payout": {
      const a = await db.affiliates.get(id);
      if (!a?.payout_enc) return fail("This affiliate has not set a payout destination.", 404);
      try {
        const details = await decryptJson<PayoutDetails>(`aff-payout:${id}`, a.payout_enc);
        await audit(db, ctx.session, "affiliate.payout_revealed", "affiliate", id, { method: details.method }, req);
        return respond({ ok: true, details }, ctx);
      } catch (e) {
        if (e instanceof SettingsKeyMissing) return fail("Set the SETTINGS_ENCRYPTION_KEY secret first.", 503);
        return fail("The payout details could not be read.", 500);
      }
    }
    case "run_payouts": {
      const pp = await gatewayCreds(db, "paypal").catch(() => null);
      const r = await affiliateTick(db, { decrypt: decryptJson, paypal: pp ? (p) => paypalPayout(pp, p) : undefined, force: true });
      return done("affiliate.run_payouts", "affiliate", r, { run: r });
    }
    default:
      return fail("Unknown action.");
  }
}
