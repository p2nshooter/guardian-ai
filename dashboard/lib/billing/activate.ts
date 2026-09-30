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
import { dbFirst, dbRun, dbQuery, dbBatch, getR2, now } from "../db";
import { PLANS, addPeriod, isPlanId, isCycle, formatUsd, type PlanId, type Cycle } from "../plans";
import { sendMail, mails } from "../mail";
import { SITE } from "../site";
import { issueForOrder, productName } from "../lifetime-service";

export interface OrderRow {
  id: string; invoice_no: string; user_id: string; email: string; plan: string; cycle: string;
  amount_usd: number; currency: string; amount_local: number; gateway: string; gateway_ref: string;
  status: string; meta: string; created_at: string; paid_at: string;
}

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

async function nextInvoiceNo(db: any): Promise<string> {
  const row = await dbFirst<{ value: number }>(db,
    `INSERT INTO counters (name, value) VALUES ('invoice', 1)
     ON CONFLICT(name) DO UPDATE SET value = value + 1 RETURNING value`);
  const n = row?.value ?? Date.now() % 1_000_000;
  return `AXTO-${new Date().getUTCFullYear()}-${String(n).padStart(6, "0")}`;
}

/** Keep self-hosted licences in step with the plan: expiry, node cap, and how many stay active. */
export async function syncLicenses(db: any, userId: string, plan: string, periodEnd: string): Promise<void> {
  const lim = isPlanId(plan) ? PLANS[plan].limits : null;
  if (!lim || lim.selfHostedApps === 0) {
    await dbRun(db, `UPDATE sh_licenses SET status = 'suspended', updated_at = ? WHERE user_id = ? AND status = 'active'`, [now(), userId]);
    return;
  }
  await dbRun(db,
    `UPDATE sh_licenses SET expires_at = ?, max_nodes = ?, status = CASE WHEN status = 'suspended' AND notes != ? THEN 'active' ELSE status END, updated_at = ?
      WHERE user_id = ? AND status != 'revoked'`,
    [periodEnd, lim.selfHostedNodes, ADMIN_HOLD, now(), userId]);
  if (lim.selfHostedApps > 0) {
    const rows = await dbQuery<{ id: string }>(db,
      `SELECT id FROM sh_licenses WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC`, [userId]);
    const extra = rows.slice(lim.selfHostedApps).map((r) => r.id);
    for (const id of extra) await dbRun(db, `UPDATE sh_licenses SET status = 'suspended', updated_at = ? WHERE id = ?`, [now(), id]);
  }
}

/** Invoice line for an order: a subscription period, or a lifetime licence. */
function invoiceLine(o: OrderRow): string {
  if (o.plan === "lifetime") {
    let m: any = {};
    try { m = JSON.parse(o.meta || "{}").lifetime || {}; } catch {}
    const devices = Number(m.devices) || 0;
    return `${SITE.name} Lifetime licence — ${productName(m.scope === "suite" ? "suite" : String(m.product || ""))}, up to ${devices} device${devices === 1 ? "" : "s"}${m.scope === "suite" ? " per app" : ""}`;
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
export async function markOrderPaid(db: any, orderId: string, opts: { gatewayRef?: string; paidUsd?: number; paidLocal?: number; actor?: string; gateway?: string; env?: "live" | "sandbox" } = {}): Promise<{ ok: boolean; reason?: string }> {
  const o = await dbFirst<OrderRow>(db, `SELECT * FROM orders WHERE id = ?`, [orderId]);
  if (!o) return { ok: false, reason: "order_not_found" };
  if (o.status === "paid") return { ok: true, reason: "already_paid" };
  if (o.status === "refunded") return { ok: false, reason: "refunded" };
  // A gateway can only settle its own orders (the amount checks below assume its currency).
  if (opts.gateway && o.gateway !== opts.gateway) return { ok: false, reason: "gateway_mismatch" };
  // Test money never pays a real order (and a live payment is not filed as a test).
  if (opts.env && orderEnv(o) !== opts.env) return { ok: false, reason: "env_mismatch" };
  // Amount check (1% tolerance for FX/rounding on the gateway side).
  if (typeof opts.paidUsd === "number" && opts.paidUsd + 0.01 < o.amount_usd * 0.99) return { ok: false, reason: "amount_mismatch" };
  if (typeof opts.paidLocal === "number" && o.amount_local > 0 && opts.paidLocal < o.amount_local * 0.99) return { ok: false, reason: "amount_mismatch" };
  if (o.plan === "lifetime") return markLifetimePaid(db, o, opts);
  if (!isPlanId(o.plan) || !isCycle(o.cycle)) return { ok: false, reason: "bad_order" };

  // Claim the order and extend the subscription in ONE transaction. The upsert
  // only runs if this call's claim token landed, so concurrent webhooks for
  // the same order can never grant twice.
  const current = await dbFirst<any>(db, `SELECT plan, cycle, status, current_period_end FROM subscriptions WHERE user_id = ?`, [o.user_id]);
  const { start, end } = computeNewPeriod(current, o.plan, o.cycle);
  const endIso = end.toISOString();
  const claim = crypto.randomUUID();
  const ts = now();
  const [claimRes] = await dbBatch(db, [
    [`UPDATE orders SET status = 'paid', paid_at = ?, meta = json_set(COALESCE(NULLIF(meta, ''), '{}'), '$.claim', ?),
        gateway_ref = CASE WHEN ? != '' THEN ? ELSE gateway_ref END
      WHERE id = ? AND status NOT IN ('paid', 'refunded')`, [ts, claim, opts.gatewayRef || "", opts.gatewayRef || "", o.id]],
    [`INSERT INTO subscriptions (user_id, plan, cycle, status, current_period_start, current_period_end, last_order_id, reminded_at, created_at, updated_at)
      SELECT ?, ?, ?, 'active', ?, ?, ?, '', ?, ?
       WHERE EXISTS (SELECT 1 FROM orders WHERE id = ? AND json_extract(meta, '$.claim') = ?)
      ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, cycle = excluded.cycle, status = 'active',
        current_period_start = excluded.current_period_start, current_period_end = excluded.current_period_end,
        last_order_id = excluded.last_order_id, reminded_at = '', updated_at = excluded.updated_at`,
      [o.user_id, o.plan, o.cycle, start.toISOString(), endIso, o.id, ts, ts, o.id, claim]],
  ]);
  if (!claimRes?.meta?.changes) return { ok: true, reason: "already_paid" };

  const invoiceNo = o.invoice_no || await nextInvoiceNo(db);
  await dbRun(db, `UPDATE orders SET invoice_no = ? WHERE id = ?`, [invoiceNo, o.id]);
  await syncLicenses(db, o.user_id, o.plan, endIso);

  const paid: OrderRow = { ...o, status: "paid", invoice_no: invoiceNo, paid_at: now(), gateway_ref: opts.gatewayRef || o.gateway_ref };
  const user = await dbFirst<{ name: string }>(db, `SELECT name FROM users WHERE id = ?`, [o.user_id]);
  const until = endIso.slice(0, 10);
  try {
    await getR2().put(`invoices/${invoiceNo.slice(5, 9)}/${o.id}.html`, renderInvoice(paid, { name: user?.name, until }), {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
  } catch {}
  await dbRun(db, `INSERT INTO audit_log (id, actor_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    [crypto.randomUUID(), opts.actor || "system", opts.actor || "system", "order.paid", "order", o.id,
     JSON.stringify({ plan: o.plan, cycle: o.cycle, amount_usd: o.amount_usd, gateway: o.gateway, until }), now()]).catch(() => {});

  const m = mails.paymentReceived({ planName: PLANS[o.plan].name, cycle: o.cycle, amount: formatUsd(o.amount_usd), invoiceNo, until });
  await sendMail(o.email, m.subject, m.html);

  // Zero-touch: licences are issued the moment the payment is confirmed.
  let chosen: string[] = [];
  try { chosen = JSON.parse(o.meta || "{}").apps || []; } catch {}
  await autoIssueAfterPayment(db, o.user_id, o.email, o.plan, endIso, Array.isArray(chosen) ? chosen.map(String) : []);
  return { ok: true };
}

/** The environment an order was created in (orders before v3.2.1: live). */
export function orderEnv(o: { meta?: string }): "live" | "sandbox" {
  try { return JSON.parse(o.meta || "{}").env === "sandbox" ? "sandbox" : "live"; } catch { return "live"; }
}

/** Webhook answer: done (paid now or before), or final (refunded) — nothing for the gateway to retry. */
export const isFinal = (r: { ok: boolean; reason?: string }) => r.ok || r.reason === "refunded";

/** Lifetime order paid → claim it once, invoice it, issue the licence (zero-touch). */
async function markLifetimePaid(db: any, o: OrderRow, opts: { gatewayRef?: string; actor?: string }): Promise<{ ok: boolean; reason?: string }> {
  const claim = await dbRun(db,
    `UPDATE orders SET status = 'paid', paid_at = ?, gateway_ref = CASE WHEN ? != '' THEN ? ELSE gateway_ref END WHERE id = ? AND status NOT IN ('paid', 'refunded')`,
    [now(), opts.gatewayRef || "", opts.gatewayRef || "", o.id]);
  if (!claim?.meta?.changes) return { ok: true, reason: "already_paid" };
  const invoiceNo = o.invoice_no || await nextInvoiceNo(db);
  await dbRun(db, `UPDATE orders SET invoice_no = ? WHERE id = ?`, [invoiceNo, o.id]);
  const lic = await issueForOrder(db, o);
  const paid: OrderRow = { ...o, status: "paid", invoice_no: invoiceNo, paid_at: now(), gateway_ref: opts.gatewayRef || o.gateway_ref };
  const user = await dbFirst<{ name: string }>(db, `SELECT name FROM users WHERE id = ?`, [o.user_id]);
  try {
    await getR2().put(`invoices/${invoiceNo.slice(5, 9)}/${o.id}.html`, renderInvoice(paid, { name: user?.name, until: lic?.updates_until.slice(0, 10) }), {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
  } catch {}
  await dbRun(db, `INSERT INTO audit_log (id, actor_id, actor_email, action, entity_type, entity_id, metadata, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    [crypto.randomUUID(), opts.actor || "system", opts.actor || "system", "order.paid", "order", o.id,
     JSON.stringify({ plan: "lifetime", amount_usd: o.amount_usd, gateway: o.gateway, license: lic?.id || "" }), now()]).catch(() => {});
  return lic ? { ok: true } : { ok: false, reason: "bad_order" };
}
