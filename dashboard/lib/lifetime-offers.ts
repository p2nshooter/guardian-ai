/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Customer offers on lifetime licences (docs/AXTO-APPS-BLUEPRINT.md §15) — ONE
 * implementation for the member portal, the admin portal and checkout.
 *
 *   member: make (pending) · withdraw
 *   admin:  accept · counter (admin's price) · decline (reason required)
 *   checkout pays an accepted / countered price until valid_until; the paid
 *   order issues the licence as usual and marks the offer paid (zero-touch).
 *
 * Errors carry a `code` so the portal shows them in the member's language.
 * ============================================================================ */
import { dbFirst, dbQuery, dbRun, newId, now } from "./db";
import { adminInbox, mailLayout, sendMail } from "./mail";
import { absoluteUrl, SITE } from "./site";
import { formatUsd } from "./plans";
import { lifetimeChoiceProblem, productName } from "./lifetime-service";
import { offerFloor, type DealConfig } from "./lifetime-deals";
import type { LifetimeScope, LifetimeTier } from "./lifetime";

export type OfferStatus = "pending" | "accepted" | "countered" | "declined" | "withdrawn" | "expired" | "paid";
export interface LifetimeOffer {
  id: string; user_id: string; email: string; scope: LifetimeScope; product: string; devices: number;
  list_usd: number; offer_usd: number; note: string; status: OfferStatus; agreed_usd: number;
  admin_note: string; decided_by: string; decided_at: string; valid_until: string; order_id: string;
  created_at: string; updated_at: string;
}
export type OfferError = { ok: false; code: string; error: string; status?: number };

/** Offers that still block a new one for the same licence. */
export const OPEN_STATUSES: OfferStatus[] = ["pending", "accepted", "countered"];
/** Anti-spam: offers per member per 30 days. */
export const MAX_OFFERS_PER_30_DAYS = 5;
export const NOTE_MAX = 600;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const err = (code: string, error: string, extra: Partial<OfferError> = {}): OfferError => ({ ok: false, code, error, ...extra });
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

/** Accepted / countered offers not paid in time become "expired" (lazily, on every read). */
export async function expireOffers(db: any): Promise<void> {
  await dbRun(db, `UPDATE lifetime_offers SET status = 'expired', updated_at = ? WHERE status IN ('accepted', 'countered') AND valid_until != '' AND valid_until < ?`, [now(), now()]).catch(() => {});
}

export async function makeOffer(
  db: any, user: { id: string; email: string },
  b: { scope?: unknown; product?: unknown; devices?: unknown; offerUsd?: unknown; note?: unknown },
  cfg: DealConfig, tiers: LifetimeTier[],
): Promise<{ ok: true; offer: LifetimeOffer } | OfferError> {
  if (!cfg.offersEnabled) return err("closed", "Price offers are closed right now — the list price and the Friday deals still apply.");
  const problem = lifetimeChoiceProblem(b.scope, b.product);
  if (problem) return err("choice", problem);
  const scope = b.scope as LifetimeScope;
  const product = scope === "suite" ? "suite" : String(b.product);
  const tier = tiers.find((t) => t.devices === Number(b.devices));
  if (!tier) return err("devices", "Choose the number of devices.");
  const list = tier[scope];
  const offer = Number(b.offerUsd);
  if (!Number.isFinite(offer) || offer < 1 || Math.round(offer) !== offer) return err("amount", "Enter your price in whole US dollars.");
  if (offer >= list) return err("above_list", "That is the list price or more — you can buy it directly.");
  const floor = offerFloor(list, cfg);
  // The floor itself stays private (it would anchor every offer); the member only learns "too low".
  if (offer < floor) return err("below_floor", "This offer is too far below the list price for us to consider. Please raise it, or take a Friday deal.");
  const note = String(b.note || "").replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);

  await expireOffers(db);
  const open = await dbFirst(db, `SELECT id FROM lifetime_offers WHERE user_id = ? AND scope = ? AND product = ? AND devices = ? AND status IN ('pending', 'accepted', 'countered')`,
    [user.id, scope, product, tier.devices]);
  if (open) return err("open_exists", "You already have an open offer for this licence — wait for our answer or withdraw it first.", { status: 409 });
  const recent = await dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM lifetime_offers WHERE user_id = ? AND created_at > ?`,
    [user.id, new Date(Date.now() - 30 * 86_400_000).toISOString()]);
  if ((recent?.n || 0) >= MAX_OFFERS_PER_30_DAYS) return err("too_many", `You can make up to ${MAX_OFFERS_PER_30_DAYS} offers in 30 days.`, { status: 429 });

  const id = newId("lof");
  const t = now();
  await dbRun(db,
    `INSERT INTO lifetime_offers (id, user_id, email, scope, product, devices, list_usd, offer_usd, note, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?, 'pending', ?, ?)`,
    [id, user.id, user.email, scope, product, tier.devices, list, offer, note, t, t]);
  const row = (await dbFirst<LifetimeOffer>(db, `SELECT * FROM lifetime_offers WHERE id = ?`, [id]))!;
  const pct = Math.round((1 - offer / list) * 100);
  await sendMail(await adminInbox(), `Lifetime offer: ${formatUsd(offer)} for ${productName(product)} (${tier.devices} device${tier.devices === 1 ? "" : "s"}) from ${user.email}`,
    mailLayout("New lifetime licence offer",
      `<p><b>${esc(user.email)}</b> offers <b>${esc(formatUsd(offer))}</b> for <b>${esc(productName(product))}</b>, up to ${tier.devices} device${tier.devices === 1 ? "" : "s"}${scope === "suite" ? " per app" : ""}.</p>
       <p>List price ${esc(formatUsd(list))} — the offer is <b>${pct}% below</b> it.</p>${note ? `<p>Message: “${esc(note)}”</p>` : ""}
       <p>Accept, counter or decline it in Admin → Lifetime → Offers.</p>`,
      { label: "Review the offer", href: absoluteUrl("/admin/lifetime#offers") })).catch(() => false);
  return { ok: true, offer: row };
}

export async function offersFor(db: any, userId: string): Promise<LifetimeOffer[]> {
  await expireOffers(db);
  return dbQuery<LifetimeOffer>(db, `SELECT * FROM lifetime_offers WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [userId]);
}

export async function listOffers(db: any, status = ""): Promise<LifetimeOffer[]> {
  await expireOffers(db);
  return status
    ? dbQuery<LifetimeOffer>(db, `SELECT * FROM lifetime_offers WHERE status = ? ORDER BY created_at DESC LIMIT 500`, [status])
    : dbQuery<LifetimeOffer>(db, `SELECT * FROM lifetime_offers ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 500`);
}

export async function withdrawOffer(db: any, userId: string, id: string): Promise<boolean> {
  const r = await dbRun(db, `UPDATE lifetime_offers SET status = 'withdrawn', updated_at = ? WHERE id = ? AND user_id = ? AND status IN ('pending', 'accepted', 'countered')`, [now(), id, userId]);
  return !!r?.meta?.changes;
}

/** Admin decision on a pending offer. Atomic: two admins cannot decide the same offer twice. */
export async function decideOffer(
  db: any, id: string, action: unknown, b: { agreedUsd?: unknown; note?: unknown }, admin: string, cfg: DealConfig,
): Promise<{ ok: true; offer: LifetimeOffer } | OfferError> {
  const o = await dbFirst<LifetimeOffer>(db, `SELECT * FROM lifetime_offers WHERE id = ?`, [id]);
  if (!o) return err("not_found", "Offer not found.", { status: 404 });
  if (o.status !== "pending") return err("decided", `This offer is already ${o.status}.`, { status: 409 });
  const note = String(b.note || "").replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);
  let status: OfferStatus, agreed = 0, validUntil = "";
  if (action === "accept") {
    status = "accepted"; agreed = o.offer_usd; validUntil = daysFromNow(cfg.offerValidDays);
  } else if (action === "counter") {
    agreed = Number(b.agreedUsd);
    if (!Number.isInteger(agreed) || agreed <= o.offer_usd || agreed >= o.list_usd) {
      return err("counter_range", `A counter-offer must be a whole-dollar price above the customer's ${formatUsd(o.offer_usd)} and below the list price ${formatUsd(o.list_usd)}.`);
    }
    status = "countered"; validUntil = daysFromNow(cfg.offerValidDays);
  } else if (action === "decline") {
    if (note.length < 3) return err("reason", "Write the reason the customer will see.");
    status = "declined";
  } else return err("action", "Unknown action.");
  const r = await dbRun(db,
    `UPDATE lifetime_offers SET status = ?, agreed_usd = ?, admin_note = ?, decided_by = ?, decided_at = ?, valid_until = ?, updated_at = ? WHERE id = ? AND status = 'pending'`,
    [status, agreed, note, admin, now(), validUntil, now(), id]);
  if (!r?.meta?.changes) return err("decided", "This offer was decided meanwhile.", { status: 409 });
  const row = (await dbFirst<LifetimeOffer>(db, `SELECT * FROM lifetime_offers WHERE id = ?`, [id]))!;
  const m = decisionMail(row);
  await sendMail(row.email, m.subject, m.html).catch(() => false);
  return { ok: true, offer: row };
}

export function decisionMail(o: LifetimeOffer) {
  const what = `${esc(productName(o.product))}, up to ${o.devices} device${o.devices === 1 ? "" : "s"}${o.scope === "suite" ? " per app" : ""}`;
  const until = o.valid_until ? esc(o.valid_until.slice(0, 10)) : "";
  const cta = { label: "Open your lifetime licences", href: absoluteUrl("/app/lifetime#offers") };
  if (o.status === "accepted") return {
    subject: `Your offer was accepted — ${SITE.name} lifetime licence for ${formatUsd(o.agreed_usd)}`,
    html: mailLayout("Your offer was accepted", `<p>Good news: we accept <b>${esc(formatUsd(o.agreed_usd))}</b> for ${what} (list price ${esc(formatUsd(o.list_usd))}).</p>
      <p>Pay the agreed price in your portal by <b>${until}</b> — the licence is issued the moment your payment is confirmed.</p>${o.admin_note ? `<p>“${esc(o.admin_note)}”</p>` : ""}`, cta),
  };
  if (o.status === "countered") return {
    subject: `Our counter-offer: ${formatUsd(o.agreed_usd)} — ${SITE.name} lifetime licence`,
    html: mailLayout("We made you a counter-offer", `<p>Thank you for your offer of ${esc(formatUsd(o.offer_usd))} for ${what}. We can do <b>${esc(formatUsd(o.agreed_usd))}</b> (list price ${esc(formatUsd(o.list_usd))}).</p>
      <p>The price is reserved for you until <b>${until}</b>; pay it in your portal and the licence is issued automatically.</p>${o.admin_note ? `<p>“${esc(o.admin_note)}”</p>` : ""}`, cta),
  };
  return {
    subject: `About your ${SITE.name} lifetime licence offer`,
    html: mailLayout("About your offer", `<p>Thank you for your offer of ${esc(formatUsd(o.offer_usd))} for ${what}. We cannot accept it this time.</p>
      <p>“${esc(o.admin_note)}”</p><p>The Friday deals (every Friday, and a bigger one on the last Friday of the month) are open to everyone, and you may send a new offer.</p>`, cta),
  };
}

/** An offer the member may pay now, or null (wrong owner, not agreed, expired). */
export async function payableOffer(db: any, userId: string, id: string): Promise<LifetimeOffer | null> {
  if (!id) return null;
  await expireOffers(db);
  return dbFirst<LifetimeOffer>(db, `SELECT * FROM lifetime_offers WHERE id = ? AND user_id = ? AND status IN ('accepted', 'countered')`, [id, userId]);
}

/** Paid order → offer paid. An order created before the offer expired still counts. */
export async function markOfferPaid(db: any, offerId: string, orderId: string): Promise<void> {
  if (!offerId) return;
  await dbRun(db, `UPDATE lifetime_offers SET status = 'paid', order_id = ?, updated_at = ? WHERE id = ? AND status != 'paid'`, [orderId, now(), offerId]).catch(() => {});
}
