/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * Turning a paid order into access — the ONLY code path that grants a plan.
 * Called by every gateway webhook, the PayPal return handler and the admin
 * "mark as paid" action. Idempotent: a second call for the same order is a
 * no-op.
 *
 * Plan changes are pro-rated in TIME rather than money: the unused value of
 * the current period is converted into extra days on the new plan, so
 * upgrades, downgrades and renewals all use one fair rule.
 * ============================================================================ */
import { autoIssueAfterPayment, ADMIN_HOLD } from "../licences";
import { getR2, now } from "../db";
import { ConflictError } from "../r2/store";
import type { Data } from "../data";
import { ids, type OrderDoc, type SubscriptionDoc } from "../data/schema";
import { patchMeta, readMeta } from "../data/meta";
import { audit } from "../http";
import { PLANS, addPeriod, isPlanId, isCycle, formatUsd, type PlanId, type Cycle } from "../plans";
import { sendMail, mails, mailLayout, adminInbox } from "../mail";
import { getSale, saveSale } from "../acquisition";
import { saleRoundPaid } from "../sale-auction";
import { SITE, absoluteUrl } from "../site";
import { issueForOrder, productName } from "../lifetime-service";
import { issueEdition } from "../edition-service";
import { getEdition, isEditionCycle } from "../editions";
import { auctionOrderPaid } from "../auction";
import { commissionForOrder } from "../affiliate";

export type OrderRow = OrderDoc;

const PERIOD_DAYS: Record<Cycle, number> = { monthly: 30.4375, yearly: 365.25 };
const DAY = 86_400_000;

/** USD value of one day on a plan/cycle (default list prices). */
function dailyRate(plan: PlanId, cycle: Cycle): number {
  const p = PLANS[plan];
  return (cycle === "yearly" ? p.yearly : p.monthly) / PERIOD_DAYS[cycle];
}

export function computeNewPeriod(
  current: { plan: string; cycle: string; status: string; current_period_end: string } | null,
  plan: PlanId, cycle: Cycle, at = new Date(),
): { start: Date; end: Date; creditDays: number } {
  const start = at;
  let end = addPeriod(at, cycle);
  let creditDays = 0;
  if (current && current.status === "active" && isPlanId(current.plan) && isCycle(current.cycle)) {
    const remainingMs = Date.parse(current.current_period_end) - at.getTime();
    if (remainingMs > 0) {
      if (current.plan === plan && current.cycle === cycle) {
        // Plain renewal: stack on top of the current end date.
        end = addPeriod(new Date(Date.parse(current.current_period_end)), cycle);
      } else {
        const creditMs = remainingMs * (dailyRate(current.plan, current.cycle) / dailyRate(plan, cycle));
        creditDays = Math.round((creditMs / DAY) * 10) / 10;
        end = new Date(end.getTime() + creditMs);
      }
    }
  }
  return { start, end, creditDays };
}

async function nextInvoiceNo(db: Data): Promise<string> {
  const n = await db.store.next("invoice");
  return `AXTO-${new Date().getUTCFullYear()}-${String(n).padStart(6, "0")}`;
}

/** Keep self-hosted licences in step with the plan: expiry, node cap, and how many stay active. */
export async function syncLicenses(db: Data, userId: string, plan: string, periodEnd: string): Promise<void> {
  const lim = isPlanId(plan) ? PLANS[plan].limits : null;
  const mine = (await db.shLicenses.listAllDocs("user", userId)).filter((l) => l.source === "plan");
  if (!lim || lim.selfHostedApps === 0) {
    for (const l of mine) await db.shLicenses.update(l.id, (c) => (c.status === "active" && c.source === "plan" ? { ...c, status: "suspended", updated_at: now() } : null));
    return;
  }
  for (const l of mine) {
    await db.shLicenses.update(l.id, (c) => (c.status === "revoked" || c.source !== "plan" ? null : {
      ...c, expires_at: periodEnd, max_nodes: lim.selfHostedNodes,
      status: c.status === "suspended" && c.notes !== ADMIN_HOLD ? "active" : c.status, updated_at: now(),
    }));
  }
  if (lim.selfHostedApps > 0) {
    // Newest first: the oldest licences beyond the plan's app count are suspended.
    const active = (await db.shLicenses.listAllDocs("user", userId)).filter((l) => l.source === "plan" && l.status === "active");
    for (const l of active.slice(lim.selfHostedApps)) await db.shLicenses.update(l.id, (c) => (c.status === "active" ? { ...c, status: "suspended", updated_at: now() } : null));
  }
}

/**
 * Claim an order for payment: pending → paid, once. A compare-and-swap on the
 * order itself, so webhooks, the PayPal return, the crypto watcher and the
 * admin button arriving together grant exactly once. Returns the paid order
 * when THIS call claimed it.
 */
async function claimOrder(db: Data, id: string, gatewayRef?: string, grant = false): Promise<OrderRow | null> {
  let won = false;
  const at = now();
  const after = await db.orders.update(id, (cur) => {
    won = cur.status !== "paid" && cur.status !== "refunded";
    if (!won) return null;
    // `grant: "pending"` until the plan is applied: if this call stops in between, the next call for the order finishes it.
    return { ...cur, status: "paid", paid_at: at, gateway_ref: gatewayRef || cur.gateway_ref, meta: grant ? patchMeta(cur.meta, (m) => { m.grant = "pending"; }) : cur.meta };
  });
  return won ? after : null;
}

/** Give a paid order its invoice number (once) and store the printable invoice. */
async function invoiceFor(db: Data, o: OrderRow, until?: string): Promise<OrderRow> {
  let paid = o;
  // A number is never given twice (its guard is create-once); one already taken — an invoice carried over
  // from D1 ahead of the counter — is skipped and the next one taken.
  for (let attempt = 0; !paid.invoice_no && attempt < 100; attempt += 1) {
    const no = await nextInvoiceNo(db);
    try {
      paid = await db.orders.update(o.id, (c) => (c.invoice_no ? null : { ...c, invoice_no: no }));
    } catch (e) {
      if (!(e instanceof ConflictError)) throw e;
    }
  }
  const user = await db.users.get(o.user_id);
  try {
    await getR2().put(`invoices/${paid.invoice_no.slice(5, 9)}/${o.id}.html`, renderInvoice(paid, { name: user?.name, until }), {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
  } catch {}
  return paid;
}

const system = (actor?: string) => ({ sub: actor || "system", email: actor || "system" });

/** Invoice line for an order: a subscription period, or a lifetime licence. */
function invoiceLine(o: OrderRow): string {
  if (o.plan === "acquisition") return `Acquisition of ${SITE.name} (${SITE.url.replace(/^https?:\/\//, "")}) — website, apps, code, accounts and brand`;
  if (o.plan === "lifetime") {
    const m: any = readMeta(o.meta).lifetime || {};
    const devices = Number(m.devices) || 0;
    return `${SITE.name} Lifetime licence — ${productName(m.scope === "suite" ? "suite" : String(m.product || ""))}, up to ${devices} device${devices === 1 ? "" : "s"}${m.scope === "suite" ? " per app" : ""}`;
  }
  if (o.plan === "edition") {
    const m: any = readMeta(o.meta).edition || {};
    const e = getEdition(String(m.code || ""));
    return `${productName(e?.app || "")} — ${e?.name || "?"} edition, ${o.cycle === "monthly" ? "1 month" : "1 year"} (self-hosted licence)`;
  }
  return `${SITE.name} ${isPlanId(o.plan) ? PLANS[o.plan].name : o.plan} plan — ${o.cycle}`;
}

export function renderInvoice(o: OrderRow, extra: { name?: string; until?: string } = {}): string {
  const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const local = o.currency !== "USD" && o.amount_local ? `<tr><td>Charged</td><td style="text-align:right">${o.currency} ${Number(o.amount_local).toLocaleString("en-US")}</td></tr>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(o.invoice_no)}</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;max-width:720px;margin:40px auto;padding:0 20px}
h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px}
.muted{color:#64748b;font-size:13px}.tot td{font-weight:800;font-size:16px;border:0}@media print{button{display:none}}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h1>${SITE.name}</h1><div class="muted">${SITE.legalName}<br>${SITE.email}</div></div>
<div style="text-align:right"><h1>Invoice</h1><div class="muted">${esc(o.invoice_no)}<br>Paid ${esc((o.paid_at || o.created_at).slice(0, 10))}</div></div></div>
<p style="margin-top:28px"><b>Billed to</b><br>${esc(extra.name || "")}${extra.name ? "<br>" : ""}${esc(o.email)}</p>
<table><tr><td><b>Description</b></td><td style="text-align:right"><b>Amount</b></td></tr>
<tr><td>${esc(invoiceLine(o))}${extra.until ? `<div class="muted">${o.plan === "lifetime" ? "Updates included until" : "Service period until"} ${esc(extra.until)}</div>` : ""}</td><td style="text-align:right">${formatUsd(o.amount_usd)}</td></tr>
${local}<tr class="tot"><td>Total paid (USD)</td><td style="text-align:right">${formatUsd(o.amount_usd)}</td></tr></table>
<p class="muted">Payment method: ${esc(o.gateway)}${o.gateway_ref ? ` · Ref ${esc(o.gateway_ref)}` : ""}</p>
<p class="muted">Order ${esc(o.id)}</p><button onclick="print()" style="margin-top:20px;padding:10px 18px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer">Print / Save as PDF</button>
</body></html>`;
}

/**
 * Mark an order paid and grant/extend the plan. Returns false if the order is
 * unknown, was refunded, belongs to another gateway, or the paid amount does
 * not match (never grants on a short payment).
 *
 * A refunded order is final: a replayed webhook or a revisited PayPal return
 * link must never grant access again (webhooks acknowledge it, see isFinal).
 */
export async function markOrderPaid(db: Data, orderId: string, opts: { gatewayRef?: string; paidUsd?: number; paidLocal?: number; actor?: string; gateway?: string; env?: "live" | "sandbox" } = {}): Promise<{ ok: boolean; reason?: string }> {
  const r = await grantPaidOrder(db, orderId, opts);
  // An affiliate's commission (docs/BUSINESS-MASTER-BLUEPRINT.md §7.1): created once per paid order, so a replayed
  // webhook or a second confirmation repairs a missed one and never pays twice. It never blocks the payment itself.
  if (r.ok) {
    const paid = await db.orders.get(orderId).catch(() => null);
    if (paid?.status === "paid") await commissionForOrder(db, paid).catch((e) => console.error("affiliate commission failed:", e));
  }
  return r;
}

async function grantPaidOrder(db: Data, orderId: string, opts: { gatewayRef?: string; paidUsd?: number; paidLocal?: number; actor?: string; gateway?: string; env?: "live" | "sandbox" } = {}): Promise<{ ok: boolean; reason?: string }> {
  const o = await db.orders.get(orderId);
  if (!o) return { ok: false, reason: "order_not_found" };
  if (o.status === "refunded") return { ok: false, reason: "refunded" };
  // A gateway can only settle its own orders (the amount checks below assume its currency).
  if (o.status !== "paid" && opts.gateway && o.gateway !== opts.gateway) return { ok: false, reason: "gateway_mismatch" };
  // Test money never pays a real order (and a live payment is not filed as a test).
  if (o.status !== "paid" && opts.env && orderEnv(o) !== opts.env) return { ok: false, reason: "env_mismatch" };
  // Amount check (1% tolerance for FX/rounding on the gateway side).
  if (o.status !== "paid" && typeof opts.paidUsd === "number" && opts.paidUsd + 0.01 < o.amount_usd * 0.99) return { ok: false, reason: "amount_mismatch" };
  if (o.status !== "paid" && typeof opts.paidLocal === "number" && o.amount_local > 0 && opts.paidLocal < o.amount_local * 0.99) return { ok: false, reason: "amount_mismatch" };
  if (o.plan === "acquisition") return markAcquisitionPaid(db, o, opts);
  // An auction win paid by bank transfer is approved by an administrator only with the payment screenshot on file.
  if (o.status !== "paid" && o.gateway === "manual" && readMeta(o.meta).auction && !readMeta(o.meta).bank_proof?.receipt) return { ok: false, reason: "receipt_required" };
  if (o.plan === "lifetime" || o.plan === "edition") {
    const r = o.plan === "lifetime" ? await markLifetimePaid(db, o, opts) : await markEditionPaid(db, o, opts);
    // An auction win (§26.5): the licence above is issued like any other; the lot is marked sold once (idempotent).
    if (r.ok && readMeta(o.meta).auction) {
      const paid = await db.orders.get(o.id);
      if (paid?.status === "paid") await auctionOrderPaid(db, paid).catch(() => "none");
    }
    return r;
  }
  if (!isPlanId(o.plan) || !isCycle(o.cycle)) return { ok: false, reason: "bad_order" };

  const claimed = await claimOrder(db, o.id, opts.gatewayRef, true);
  const paidNow = claimed ?? (await db.orders.get(o.id));
  if (!paidNow || paidNow.status !== "paid") return { ok: false, reason: "bad_order" };
  // Paid earlier and fully applied (or paid before the move to R2): nothing to do.
  if (!claimed && readMeta(paidNow.meta).grant !== "pending") return { ok: true, reason: "already_paid" };

  // Extend the subscription. Idempotent per order: a second run (a webhook that
  // raced the claim, or a retry after a crash right after it) changes nothing.
  let applied = false;
  let endIso = "";
  const plan = o.plan as PlanId;
  const cycle = o.cycle as Cycle;
  await db.subscriptions.upsert(ids.subscription(o.user_id), (cur) => {
    if (cur?.applied_orders?.includes(o.id)) { applied = false; endIso = cur.current_period_end; return null; }
    const { start, end } = computeNewPeriod(cur, plan, cycle);
    const ts = now();
    applied = true;
    endIso = end.toISOString();
    const next: SubscriptionDoc = {
      id: ids.subscription(o.user_id), user_id: o.user_id, plan, cycle, status: "active",
      current_period_start: start.toISOString(), current_period_end: endIso, last_order_id: o.id, reminded_at: "",
      created_at: cur?.created_at || ts, updated_at: ts, applied_orders: [...(cur?.applied_orders || []), o.id].slice(-20),
    };
    return next;
  });
  if (!claimed && !applied) return { ok: true, reason: "already_paid" };
  await db.orders.update(o.id, (c) => (readMeta(c.meta).grant === "pending" ? { ...c, meta: patchMeta(c.meta, (m) => { m.grant = "done"; }) } : null));

  const until = endIso.slice(0, 10);
  const paid = await invoiceFor(db, (await db.orders.get(o.id)) ?? paidNow, until);
  await syncLicenses(db, o.user_id, o.plan, endIso);
  await audit(db, system(opts.actor), "order.paid", "order", o.id, { plan: o.plan, cycle: o.cycle, amount_usd: o.amount_usd, gateway: o.gateway, until });

  const m = mails.paymentReceived({ planName: PLANS[plan].name, cycle: o.cycle, amount: formatUsd(o.amount_usd), invoiceNo: paid.invoice_no, until });
  await sendMail(o.email, m.subject, m.html);

  // Zero-touch: licences are issued the moment the payment is confirmed.
  const chosen = readMeta(o.meta).apps;
  await autoIssueAfterPayment(db, o.user_id, o.email, o.plan, endIso, Array.isArray(chosen) ? chosen.map(String) : []);
  return { ok: true };
}

/** The environment an order was created in (orders before v3.2.1: live). */
export function orderEnv(o: { meta?: string }): "live" | "sandbox" {
  return readMeta(o.meta).env === "sandbox" ? "sandbox" : "live";
}

/** Webhook answer: done (paid now or before), or final (refunded) — nothing for the gateway to retry. */
export const isFinal = (r: { ok: boolean; reason?: string }) => r.ok || r.reason === "refunded";

/** Site acquisition paid → claim it once, invoice it, and (live money only, first
 *  buyer only) make the buyer an administrator and mark the site sold. */
async function markAcquisitionPaid(db: Data, o: OrderRow, opts: { gatewayRef?: string; actor?: string }): Promise<{ ok: boolean; reason?: string }> {
  const claimed = await claimOrder(db, o.id, opts.gatewayRef);
  if (!claimed) return { ok: true, reason: "already_paid" };
  const paid = await invoiceFor(db, claimed);
  const invoiceNo = paid.invoice_no;

  const sale = await getSale(db);
  const meta = readMeta(o.meta);
  const test = orderEnv(o) === "sandbox";
  const duplicate = sale.status === "sold" && sale.soldTo?.orderId && sale.soldTo.orderId !== o.id;
  const grant = !test && !duplicate && sale.autoGrantAdmin;
  if (grant) await db.users.update(o.user_id, (u) => ({ ...u, role: "admin", updated_at: now() }));
  if (!test && !duplicate) {
    await saveSale(db, { ...sale, status: "sold", soldTo: { userId: o.user_id, email: o.email, orderId: o.id, paidAt: paid.paid_at, company: String(meta?.buyer?.company || "") || undefined } });
  }
  // From the auction (§34): the round the winner paid for is sold (test money leaves it awaiting payment).
  const round = !test ? await saleRoundPaid(db, paid) : "none";
  const outcome = test ? "test_payment" : duplicate ? "duplicate_after_sale" : grant ? "admin_granted" : "awaiting_manual_grant";
  await audit(db, system(opts.actor), "site.sale.paid", "order", o.id, { amount_usd: o.amount_usd, gateway: o.gateway, buyer: o.email, outcome, round: round === "none" ? undefined : round });

  const money = formatUsd(o.amount_usd);
  const buyerMail = test
    ? { subject: `Test payment received — ${SITE.name}`, body: `<p>This was a <b>test (sandbox) payment</b> of ${money}. No access was changed.</p>` }
    : duplicate
      ? { subject: `Payment received — ${SITE.name} was already sold`, body: `<p>We received ${money}, but ${SITE.name} had already been sold to another buyer. Your payment will be refunded in full — our team will contact you.</p>` }
      : { subject: `Payment received — ${SITE.name} is yours`, body: `<p>We received your payment of <b>${money}</b> (invoice <b>${invoiceNo}</b>).</p>
          <p>${grant ? "Your account now has <b>administrator access</b> to the whole platform." : "Administrator access will be granted by the owner shortly."} The handover of the domain, Cloudflare, GitHub and payment accounts follows the checklist on the offer page.</p>
          <p>Send your payment proof and coordinate the handover on WhatsApp: <b>${sale.whatsapp}</b>.</p>` };
  await sendMail(o.email, buyerMail.subject, mailLayout(buyerMail.subject, buyerMail.body, { label: "Open the admin portal", href: absoluteUrl(grant ? "/admin" : "/acquire") }));
  await sendMail(await adminInbox(), `${SITE.name} acquisition payment: ${money} from ${o.email} (${outcome})`,
    mailLayout("Acquisition payment", `<p>Order <b>${o.id}</b> · ${money} via ${o.gateway} · buyer <b>${o.email}</b>${meta?.buyer?.company ? ` (${String(meta.buyer.company).replace(/[<>&"]/g, "")})` : ""}.</p><p>Outcome: <b>${outcome}</b>.${round === "late" ? " The auction round had already passed on or been cancelled — review it in Admin → Site sale." : ""}</p>`));
  return { ok: true, reason: outcome };
}

/** Lifetime order paid → claim it once, invoice it, issue the licence (zero-touch). */
async function markLifetimePaid(db: Data, o: OrderRow, opts: { gatewayRef?: string; actor?: string }): Promise<{ ok: boolean; reason?: string }> {
  const claimed = await claimOrder(db, o.id, opts.gatewayRef);
  if (!claimed) return { ok: true, reason: "already_paid" };
  const lic = await issueForOrder(db, claimed);
  await invoiceFor(db, claimed, lic?.updates_until.slice(0, 10));
  await audit(db, system(opts.actor), "order.paid", "order", o.id, { plan: "lifetime", amount_usd: o.amount_usd, gateway: o.gateway, license: lic?.id || "" });
  return lic ? { ok: true } : { ok: false, reason: "bad_order" };
}

/** Edition order paid → claim it once, invoice it, issue or extend the edition licence (zero-touch). */
async function markEditionPaid(db: Data, o: OrderRow, opts: { gatewayRef?: string; actor?: string }): Promise<{ ok: boolean; reason?: string }> {
  const m = readMeta(o.meta).edition || {};
  const e = getEdition(String(m.code || ""));
  if (!e || !isEditionCycle(o.cycle)) return { ok: false, reason: "bad_order" };
  const claimed = await claimOrder(db, o.id, opts.gatewayRef);
  if (!claimed) return { ok: true, reason: "already_paid" };
  const lic = await issueEdition(db, o.user_id, { code: e.code, app: e.app, cycle: o.cycle });
  const issued = "key" in lic ? lic : null;
  const paid = await invoiceFor(db, claimed, issued?.expiresAt.slice(0, 10));
  const invoiceNo = paid.invoice_no;
  await audit(db, system(opts.actor), "order.paid", "order", o.id, { plan: "edition", edition: e.code, cycle: o.cycle, amount_usd: o.amount_usd, gateway: o.gateway, license: issued?.id || "", error: issued ? undefined : (lic as any).error });
  if (issued) {
    const esc = (x: string) => x.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    await sendMail(o.email, `Your ${issued.name} ${issued.edition} licence`, mailLayout(`${issued.name} — ${issued.edition}`,
      `<p>Payment confirmed (invoice <b>${esc(invoiceNo)}</b>, ${formatUsd(o.amount_usd)}). Your licence is active until <b>${issued.expiresAt.slice(0, 10)}</b>${issued.creditDays ? ` — including ${issued.creditDays} days carried over from your previous edition` : ""}.</p>
       <p style="font-family:ui-monospace,Menlo,monospace;font-size:14px;font-weight:700">${esc(issued.key)}</p>
       <p><b>Windows:</b> download <b>AXTO Setup</b> from the portal, run it and paste the key.<br><b>Linux:</b> <code>./axto-setup install ${esc(issued.product)} --key ${esc(issued.key)}</code></p>`,
      { label: "Open Self-Hosted", href: absoluteUrl("/app/self-hosted") }));
  }
  return issued ? { ok: true } : { ok: false, reason: "bad_order" };
}
