/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * SITE-SALE AUCTION — storage and the zero-touch steps (docs/BLUEPRINT-V4.md
 * §34; the rules are in lib/sale-auction-terms.ts).
 *
 *   round      "sr_<no>", created once (claim nonce) with its opening bid drawn
 *              in the owner's range; one round runs at a time
 *   bidder     registers (name shown, company, country, phone); the owner
 *              approves unless approval is switched off
 *   bid        one compare-and-swap on the round (validated again on every
 *              retry), then the bid itself created once as "<round>.<seq>"
 *   every tick the first round opens by itself; an ended round closes — to
 *              "awaiting_payment" by the top bidder, or "unsold" and (by default)
 *              the next round opens at once
 *   payment    the winner pays the winning bid through the /acquire checkout;
 *              the verified payment marks the round sold (lib/billing/activate.ts),
 *              and the buyer becomes administrator as before
 *
 * Everything lives in R2 (sale_rounds, sale_bids, sale_bidders, setting
 * "site_sale"); nothing in D1 or KV.
 * ============================================================================ */
import { now } from "./db";
import type { Data } from "./data";
import type { OrderDoc, SaleBidDoc, SaleBidderDoc, SaleRoundDoc } from "./data/schema";
import { readMeta } from "./data/meta";
import { audit } from "./http";
import { adminInbox, mailLayout, sendMail } from "./mail";
import { absoluteUrl, SITE } from "./site";
import { formatUsd } from "./plans";
import { getSale, type SaleSettings } from "./acquisition";
import {
  cleanDisplayName, displayNameProblem, extendedEnd, ladderPrice, maskName, nextMinBid, nextRiseAt, parseBid, saleBidProblem,
  type NameProblem, type SaleAuctionSettings, type SaleBidProblem,
} from "./sale-auction-terms";

export * from "./sale-auction-terms";

type Actor = { sub: string; email: string };
const system: Actor = { sub: "system", email: "system" };
const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 86_400_000;
const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

async function tell(to: string | null, subject: string, title: string, body: string, cta: { label: string; href: string }) {
  try {
    await sendMail(to || (await adminInbox()), subject, mailLayout(title, body, cta));
  } catch { /* the record is kept; a mail problem never stops the auction */ }
}

/* ---- rounds ------------------------------------------------------------------ */

export const roundId = (no: number) => `sr_${String(no).padStart(4, "0")}`;

/** The newest round (the one that runs, or ran last). */
export async function latestRound(db: Data): Promise<SaleRoundDoc | null> {
  const page = await db.saleRounds.list("all", "all", { limit: 1 });
  return page.entries[0] ? db.saleRounds.get(page.entries[0].id) : null;
}

/**
 * Open the next round. Created once: two ticks (or a tick and the admin) racing for the same number
 * make one round; the loser gets null. The round records the opening bid and step of the day; the
 * bids themselves follow the settings of the moment (REQUESTS 125, 132), so a price the owner sets
 * applies to the running round at once.
 */
export async function startRound(db: Data, sale: SaleSettings, by: Actor, nowMs = Date.now()): Promise<SaleRoundDoc | null> {
  const last = await latestRound(db);
  if (last && (last.status === "open" || last.status === "awaiting_payment")) return null;
  const a = sale.auction;
  const open = ladderPrice(a, nowMs);
  const at = iso(nowMs);
  const doc: SaleRoundDoc = {
    id: roundId((last?.no || 0) + 1), no: (last?.no || 0) + 1, status: "open", open_usd: open, step_usd: a.stepUsd,
    snipe_minutes: a.snipeMinutes, pay_days: a.payDays, starts_at: at, ends_at: iso(nowMs + a.days * DAY),
    bids_count: 0, high_usd: 0, high_seq: 0, high_user: "", high_name: "",
    winner_user: "", winner_email: "", winner_name: "", winner_seq: 0, winner_usd: 0, pay_by: "", order_id: "", passed: [],
    closed_at: "", paid_at: "", note: "", claim: crypto.randomUUID(), created_by: by.email, created_at: at, updated_at: at,
  };
  if (!(await db.saleRounds.createIfAbsent(doc))) return null;
  await audit(db, by, "site.auction.round_opened", "sale_round", doc.id, { no: doc.no, openUsd: open, endsAt: doc.ends_at });
  return doc;
}

/** The round as the bid rules read it now: the step of the current settings (the stored step_usd is the step it opened with). */
export const withLiveStep = <R extends Pick<SaleRoundDoc, "step_usd">>(r: R, a: Pick<SaleAuctionSettings, "stepUsd">): R => ({ ...r, step_usd: a.stepUsd });

/* ---- bidders ------------------------------------------------------------------- */

export interface BidderInput { displayName?: unknown; company?: unknown; country?: unknown; phone?: unknown; message?: unknown }
export type BidderProblem = NameProblem | "phone" | "country";

/** Register (or update) the member as a bidder for the site. Approved at once when approval is off. */
export async function registerBidder(db: Data, user: Actor, input: BidderInput, approval: boolean): Promise<{ ok: true; bidder: SaleBidderDoc } | { error: BidderProblem }> {
  const nameProblem = displayNameProblem(input.displayName);
  if (nameProblem) return { error: nameProblem };
  const phone = clean(input.phone, 40);
  if (!/^\+?[\d\s()-]{6,40}$/.test(phone)) return { error: "phone" };
  const country = clean(input.country, 60);
  if (country.length < 2) return { error: "country" };
  let isNew = false;
  const doc = await db.saleBidders.upsert(user.sub, (cur) => {
    const at = now();
    isNew = !cur;
    // A decision stays: an approved bidder updating details stays approved, a refused one stays refused.
    const status = cur?.status === "approved" || cur?.status === "rejected" ? cur.status : approval ? "pending" : "approved";
    return {
      id: user.sub, email: user.email, display_name: cleanDisplayName(input.displayName), company: clean(input.company, 160), country, phone,
      message: clean(input.message, 1000), status, decided_by: cur?.decided_by || (status === "approved" && !approval ? "auto" : ""),
      decided_at: cur?.decided_at || (status === "approved" && !approval ? at : ""), created_at: cur?.created_at || at, updated_at: at,
    };
  });
  await audit(db, user, "site.auction.bidder", "sale_bidder", user.sub, { status: doc!.status, company: doc!.company, country: doc!.country });
  if (isNew && doc!.status === "pending") {
    await tell(null, `New bidder to approve — ${SITE.name} auction`, "A bidder asks to join the auction",
      `<p><b>${esc(doc!.display_name)}</b> (${esc(user.email)})${doc!.company ? ` · ${esc(doc!.company)}` : ""} · ${esc(doc!.country)} · ${esc(doc!.phone)}</p>${doc!.message ? `<p>“${esc(doc!.message)}”</p>` : ""}`,
      { label: "Approve in Admin → Site sale", href: absoluteUrl("/admin/acquisition") });
  }
  return { ok: true, bidder: doc! };
}

export async function decideBidder(db: Data, id: string, approve: boolean, by: Actor): Promise<SaleBidderDoc | { error: string }> {
  const cur = await db.saleBidders.get(id);
  if (!cur) return { error: "Bidder not found." };
  const after = await db.saleBidders.update(id, (b) => ({ ...b, status: approve ? "approved" : "rejected", decided_by: by.email, decided_at: now(), updated_at: now() }));
  await audit(db, by, approve ? "admin.site_auction.approve_bidder" : "admin.site_auction.reject_bidder", "sale_bidder", id, { email: cur.email });
  if (approve && cur.status !== "approved") {
    await tell(cur.email, `You can now bid for ${SITE.name}`, "Your bidder registration is approved",
      `<p>You can place bids in the ${esc(SITE.name)} auction from now on. Every bid is binding: if yours is the highest when the round ends, you are asked to pay it.</p>`,
      { label: "Open the auction", href: absoluteUrl("/acquire#bid") });
  }
  return after;
}

/* ---- bidding --------------------------------------------------------------------- */

export type SaleBidResult = { ok: true; round: SaleRoundDoc; bid: SaleBidDoc; extended: boolean } | { error: SaleBidProblem | "not_found" | "not_registered" | "pending" | "rejected" | "admin" | "sale_closed" };

export async function placeSaleBid(db: Data, user: Actor & { role?: string }, amountIn: unknown, nowMs = Date.now()): Promise<SaleBidResult> {
  if (user.role === "admin") return { error: "admin" };
  const sale = await getSale(db);
  if (sale.mode !== "auction" || sale.status !== "open") return { error: "sale_closed" };
  const bidder = await db.saleBidders.get(user.sub);
  if (!bidder) return { error: "not_registered" };
  if (bidder.status === "pending") return { error: "pending" };
  if (bidder.status !== "approved") return { error: "rejected" };
  const amount = parseBid(amountIn);
  const cur = await latestRound(db);
  if (!cur) return { error: "not_found" };
  let problem = null as SaleBidProblem | null;
  let seq = 0, extended = false as boolean, prev = { user: "", usd: 0 };
  const after = await db.saleRounds.update(cur.id, (r) => {
    // Decided again on every compare-and-swap attempt: a bid that lost a race is checked against the new high bid.
    problem = saleBidProblem(withLiveStep(r, sale.auction), amount, user.sub, nowMs, ladderPrice(sale.auction, nowMs));
    if (problem) return null;
    seq = r.bids_count + 1;
    prev = { user: r.high_user, usd: r.high_usd };
    const ends = extendedEnd(r.ends_at, nowMs, r.snipe_minutes);
    extended = ends !== r.ends_at;
    return { ...r, bids_count: seq, high_usd: amount, high_seq: seq, high_user: user.sub, high_name: bidder.display_name, ends_at: ends, updated_at: iso(nowMs) };
  });
  if (problem) return { error: problem };
  const bid: SaleBidDoc = { id: `${after.id}.${String(seq).padStart(6, "0")}`, round_id: after.id, seq, user_id: user.sub, email: user.email, display_name: bidder.display_name, company: bidder.company, amount_usd: amount, created_at: iso(nowMs) };
  await db.saleBids.createIfAbsent(bid);
  await audit(db, user, "site.auction.bid", "sale_round", after.id, { seq, amountUsd: amount, extended });
  await tell(null, `New bid: ${formatUsd(amount)} — ${SITE.name} auction`, "New bid in the site auction",
    `<p><b>${esc(bidder.display_name)}</b> (${esc(user.email)}${bidder.company ? `, ${esc(bidder.company)}` : ""}) bid <b>${formatUsd(amount)}</b> in round ${after.no}. Bids: ${after.bids_count}. Ends ${esc(after.ends_at.slice(0, 16).replace("T", " "))} UTC${extended ? " (extended by a late bid)" : ""}.</p>`,
    { label: "Open Admin → Site sale", href: absoluteUrl("/admin/acquisition") });
  if (prev.user && prev.user !== user.sub) {
    const p = await db.saleBidders.get(prev.user);
    if (p?.email) await tell(p.email, `You have been outbid — ${SITE.name}`, "You have been outbid",
      `<p>A new bid of <b>${formatUsd(amount)}</b> leads the ${esc(SITE.name)} auction (your bid: ${formatUsd(prev.usd)}). The next bid starts at <b>${formatUsd(nextMinBid(withLiveStep(after, sale.auction), ladderPrice(sale.auction, nowMs)))}</b>.</p>`,
      { label: "Bid again", href: absoluteUrl("/acquire#bid") });
  }
  return { ok: true, round: after, bid, extended };
}

/** A round's bids, highest first. */
export const roundBids = (db: Data, id: string, limit = 50) => db.saleBids.listDocs("round", id, { limit }).then((p) => p.docs);

/* ---- closing, passing, paying ---------------------------------------------------- */

async function mailWinner(r: SaleRoundDoc, passed: boolean) {
  if (!r.winner_email) return;
  await tell(r.winner_email, `${passed ? "The auction passed to you" : "You won the auction"} — ${SITE.name}`, passed ? `${SITE.name} is yours to buy` : `You won ${SITE.name}`,
    `<p>${passed ? "The winning bidder did not complete the purchase, so it passes to you at your own bid" : "Congratulations — your bid won"}: <b>${formatUsd(r.winner_usd)}</b> for the whole of ${esc(SITE.name)}.</p>
     <p>Please complete the payment by <b>${esc(r.pay_by.slice(0, 10))}</b> on the offer page — bank wire (escrow can be arranged), crypto or PayPal. Administrator access is granted the moment the payment is verified; the domain, Cloudflare, GitHub and provider accounts follow the handover checklist.</p>`,
    { label: "Complete the purchase", href: absoluteUrl("/acquire#checkout") });
}

/** The running round past its end → awaiting payment by the top bidder, or unsold. Compare-and-swap, once. */
export async function closeDueRound(db: Data, nowMs = Date.now()): Promise<SaleRoundDoc | null> {
  const cur = await latestRound(db);
  if (!cur || cur.status !== "open" || Date.parse(cur.ends_at) > nowMs) return null;
  const top = cur.bids_count ? await db.saleBids.get(`${cur.id}.${String(cur.high_seq).padStart(6, "0")}`) : null;
  let changed = false as boolean;
  const after = await db.saleRounds.update(cur.id, (r) => {
    changed = false;
    // A bid that landed after `top` was read: leave the round for the next tick.
    if (r.status !== "open" || Date.parse(r.ends_at) > nowMs || r.high_seq !== cur.high_seq) return null;
    changed = true;
    const at = iso(nowMs);
    if (!r.bids_count) return { ...r, status: "unsold", closed_at: at, updated_at: at };
    return {
      ...r, status: "awaiting_payment", closed_at: at, winner_user: r.high_user, winner_email: top?.email || "", winner_name: r.high_name,
      winner_seq: r.high_seq, winner_usd: r.high_usd, pay_by: iso(nowMs + r.pay_days * DAY), updated_at: at,
    };
  });
  if (!changed) return null;
  await audit(db, system, "site.auction.round_closed", "sale_round", after.id, { status: after.status, winnerUsd: after.winner_usd, bids: after.bids_count });
  if (after.status === "awaiting_payment") {
    await mailWinner(after, false);
    await tell(null, `Auction won: ${formatUsd(after.winner_usd)} — ${SITE.name}`, "The site auction has a winner",
      `<p>Round ${after.no} ended with <b>${after.bids_count}</b> bids. Winner: <b>${esc(after.winner_name)}</b> (${esc(after.winner_email)}) at <b>${formatUsd(after.winner_usd)}</b>, asked to pay by ${esc(after.pay_by.slice(0, 10))}.</p>`,
      { label: "Open Admin → Site sale", href: absoluteUrl("/admin/acquisition") });
  }
  return after;
}

/** The heartbeat's share (app/api/cron/tick): open the first round, close the one that ended, open the next after an unsold one. */
export async function saleAuctionTick(db: Data, nowMs = Date.now()): Promise<Record<string, unknown>> {
  const sale = await getSale(db);
  if (sale.mode !== "auction" || sale.status !== "open") return { skipped: sale.mode !== "auction" ? "fixed_price" : sale.status };
  const out: Record<string, unknown> = {};
  let cur = await latestRound(db);
  if (cur?.status === "open") {
    const closed = await closeDueRound(db, nowMs);
    if (closed) { out.closed = closed.status; cur = closed; }
  }
  // The first round opens by itself; after a round with no bid the next one starts at once (owner: "segera ambil").
  if (!cur || (cur.status === "unsold" && sale.auction.autoRestart)) {
    const r = await startRound(db, sale, system, nowMs);
    if (r) out.opened = r.id;
  }
  return out;
}

/** Admin: give an unpaid win to the next bidder (a different member, at their own highest bid), or end the round unsold. */
export async function passRound(db: Data, id: string, by: Actor, nowMs = Date.now()): Promise<SaleRoundDoc | { error: string }> {
  const cur = await db.saleRounds.get(id);
  if (!cur || cur.status !== "awaiting_payment") return { error: "Only a round awaiting the winner's payment can be passed on." };
  const skip = new Set([...cur.passed, cur.winner_user]);
  const next = (await roundBids(db, id, 500)).find((b) => !skip.has(b.user_id)) || null;
  let changed = false as boolean;
  const after = await db.saleRounds.update(id, (r) => {
    changed = false;
    if (r.status !== "awaiting_payment" || r.winner_user !== cur.winner_user) return null;
    changed = true;
    const at = iso(nowMs), passed = [...r.passed, r.winner_user];
    if (!next) return { ...r, status: "unsold", passed, order_id: "", updated_at: at };
    return { ...r, passed, winner_user: next.user_id, winner_email: next.email, winner_name: next.display_name, winner_seq: next.seq, winner_usd: next.amount_usd, order_id: "", pay_by: iso(nowMs + r.pay_days * DAY), updated_at: at };
  });
  if (!changed) return { error: "The round changed meanwhile — reload and try again." };
  if (cur.order_id) await db.orders.update(cur.order_id, (o) => (o.status === "pending" ? { ...o, status: "canceled" } : null)).catch(() => null);
  await audit(db, by, "admin.site_auction.pass", "sale_round", id, { from: cur.winner_user, to: next?.user_id || "", status: after.status });
  if (after.status === "awaiting_payment") await mailWinner(after, true);
  return after;
}

export async function cancelRound(db: Data, id: string, note: string, by: Actor): Promise<SaleRoundDoc | { error: string }> {
  const cur = await db.saleRounds.get(id);
  if (!cur) return { error: "Round not found." };
  if (cur.status === "sold") return { error: "A sold round cannot be cancelled — refund the order instead." };
  if (cur.status === "cancelled") return cur;
  const after = await db.saleRounds.update(id, (r) => (r.status === "sold" || r.status === "cancelled" ? null : { ...r, status: "cancelled", note: note.slice(0, 500), closed_at: r.closed_at || now(), updated_at: now() }));
  if (cur.order_id) await db.orders.update(cur.order_id, (o) => (o.status === "pending" ? { ...o, status: "canceled" } : null)).catch(() => null);
  await audit(db, by, "admin.site_auction.cancel", "sale_round", id, { note: note.slice(0, 200), was: cur.status });
  return after;
}

/** What the winner pays: their winning bid, only while the round is theirs to pay. */
export async function winnerCheckout(db: Data, userId: string): Promise<{ round: SaleRoundDoc; amountUsd: number } | { error: string }> {
  const r = await latestRound(db);
  if (!r || r.status !== "awaiting_payment" || r.winner_user !== userId) {
    return { error: r?.status === "open" ? "The auction is running — the checkout opens for the winning bidder when the round ends." : "The checkout is open only to the winning bidder." };
  }
  return { round: r, amountUsd: r.winner_usd };
}

/** Remember the winner's latest order on the round (the admin sees it; passing the round cancels it). */
export async function noteRoundOrder(db: Data, id: string, orderId: string, userId: string): Promise<void> {
  await db.saleRounds.update(id, (r) => (r.status === "awaiting_payment" && r.winner_user === userId ? { ...r, order_id: orderId, updated_at: now() } : null)).catch(() => null);
}

/** A verified acquisition payment from the auction → the round is sold (compare-and-swap, once). */
export async function saleRoundPaid(db: Data, o: Pick<OrderDoc, "id" | "meta" | "user_id" | "paid_at">): Promise<"sold" | "already" | "late" | "none"> {
  const id = String(readMeta(o.meta).saleRound || "");
  if (!id) return "none";
  let outcome = "late" as "sold" | "already" | "late";
  await db.saleRounds.update(id, (r) => {
    if (r.status === "sold" && r.order_id === o.id) { outcome = "already"; return null; }
    if (r.status === "awaiting_payment" && r.winner_user === o.user_id) { outcome = "sold"; return { ...r, status: "sold", order_id: o.id, paid_at: o.paid_at || now(), updated_at: now() }; }
    outcome = "late";
    return null;
  }).catch(() => null);
  return outcome;
}

/** A refunded acquisition from the auction: its round no longer counts as sold. */
export async function saleRoundRefunded(db: Data, o: Pick<OrderDoc, "id" | "meta">, by: Actor): Promise<void> {
  const id = String(readMeta(o.meta).saleRound || "");
  if (!id) return;
  const after = await db.saleRounds.update(id, (r) => (r.status === "sold" && r.order_id === o.id ? { ...r, status: "cancelled", note: `Refunded (order ${o.id}).`, updated_at: now() } : null)).catch(() => null);
  if (after?.status === "cancelled") await audit(db, by, "admin.site_auction.refunded", "sale_round", id, { order: o.id });
}

/* ---- what people see ------------------------------------------------------------- */

export interface PublicRound {
  /** openUsd is the opening bid of the moment (the ladder); weeklyUsd and nextRiseAt say when and by how much it rises. */
  no: number; status: string; openUsd: number; weeklyUsd: number; nextRiseAt: string; stepUsd: number; startsAt: string; endsAt: string; snipeMinutes: number; payDays: number;
  bidsCount: number; highUsd: number; nextMinUsd: number; leader: string; winnerName: string; winnerUsd: number; paid: boolean;
  bids: { name: string; amountUsd: number; at: string }[];
}

/** The round as everyone sees it: no e-mail, no user id; bidders as masked names; the winner's chosen name once the round is won. */
export function publicRound(r: SaleRoundDoc, bids: SaleBidDoc[], a: SaleAuctionSettings, nowMs = Date.now()): PublicRound {
  const won = r.status === "awaiting_payment" || r.status === "sold";
  const floor = ladderPrice(a, nowMs);
  return {
    no: r.no, status: r.status, openUsd: floor, weeklyUsd: a.weeklyUsd, nextRiseAt: nextRiseAt(a, nowMs), stepUsd: a.stepUsd, startsAt: r.starts_at, endsAt: r.ends_at, snipeMinutes: r.snipe_minutes, payDays: r.pay_days,
    bidsCount: r.bids_count, highUsd: r.high_usd, nextMinUsd: nextMinBid(withLiveStep(r, a), floor), leader: r.bids_count ? maskName(r.high_name) : "",
    winnerName: won ? maskName(r.winner_name) : "", winnerUsd: won ? r.winner_usd : 0, paid: r.status === "sold",
    bids: bids.map((b) => ({ name: maskName(b.display_name), amountUsd: b.amount_usd, at: b.created_at })),
  };
}

export interface MyAuction {
  bidder: { status: string; displayName: string; company: string; country: string; phone: string } | null;
  admin: boolean; leading: boolean; myBestUsd: number; winner: boolean; payBy: string; amountUsd: number;
}

/** The signed-in member's side: their registration, their best bid, whether they lead or won. */
export async function myAuction(db: Data, user: Actor & { role?: string }, r: SaleRoundDoc | null): Promise<MyAuction> {
  const [bidder, mine] = await Promise.all([db.saleBidders.get(user.sub), r ? db.saleBids.listDocs("user", user.sub, { limit: 50 }).then((p) => p.docs.filter((b) => b.round_id === r.id)) : Promise.resolve([])]);
  const winner = !!r && (r.status === "awaiting_payment" || r.status === "sold") && r.winner_user === user.sub;
  return {
    bidder: bidder ? { status: bidder.status, displayName: bidder.display_name, company: bidder.company, country: bidder.country, phone: bidder.phone } : null,
    admin: user.role === "admin", leading: !!r && r.status === "open" && r.bids_count > 0 && r.high_user === user.sub,
    myBestUsd: mine.reduce((m, b) => Math.max(m, b.amount_usd), 0),
    winner, payBy: winner ? r!.pay_by : "", amountUsd: winner ? r!.winner_usd : 0,
  };
}
