/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * LICENCE AUCTION — storage and the zero-touch steps (docs/BLUEPRINT-V4.md
 * §26.5; the rules are in lib/auction-terms.ts).
 *
 *   every tick   open this auction's lots (once per cycle, deterministic ids,
 *                create-once), close ended lots, pass unpaid wins to the next
 *                bidder after the payment window
 *   a bid        one compare-and-swap on the lot (validated again on every
 *                retry), then the bid itself created once as "<lot>.<seq>"
 *   payment      the normal checkout ({kind:"auction"}) at the winning price;
 *                the paid order issues the licence like any other order and
 *                marks the lot sold (lib/billing/activate.ts)
 *
 * Everything lives in R2 (auction_lots, auction_bids, auction_bidders, setting
 * "auction_settings"); nothing in D1 or KV.
 * ============================================================================ */
import { now } from "./db";
import type { Data } from "./data";
import type { AuctionBidDoc, AuctionBidderDoc, AuctionLotDoc, OrderDoc } from "./data/schema";
import { readMeta } from "./data/meta";
import type { IndexEntry } from "./r2/store";
import { audit } from "./http";
import { mailLayout, sendMail, adminInbox } from "./mail";
import { absoluteUrl } from "./site";
import { formatUsd } from "./plans";
import { getEditionPrices, type EditionPrice } from "./editions";
import { getLifetimePrices, type LifetimeTier } from "./lifetime";
import {
  AUCTION_KEY, AUCTION_TZ, AUCTION_TZ_LABEL, LATE_ADD_MS, bidProblem, cleanDisplayName, cycleEndAfter, cycleId, cycleStartOf, displayNameProblem,
  extendedEnd, maskName, bidStep, nextMinimum, openingBid, sanitizeAuction, type AuctionSettings, type BidProblem, type NameProblem,
} from "./auction-terms";
import { normalPrice, packageSlug, parsePackage } from "./auction-packages";

export * from "./auction-terms";

const system = { sub: "system", email: "system" };
const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const iso = (ms: number) => new Date(ms).toISOString();
/** A time as the owner and the e-mails show it: Western Indonesia Time (auctions end Friday 07:00 WIB). */
const wib = (at: string) => `${new Date(at).toLocaleString("en-GB", { timeZone: AUCTION_TZ, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} ${AUCTION_TZ_LABEL}`;

/* ---- settings ------------------------------------------------------------- */

export async function getAuctionSettings(db: Data): Promise<AuctionSettings> {
  try {
    const raw = await db.config.get(AUCTION_KEY);
    return raw ? sanitizeAuction(JSON.parse(raw)) : sanitizeAuction(null);
  } catch {
    return sanitizeAuction(null);
  }
}

export async function saveAuctionSettings(db: Data, s: AuctionSettings): Promise<void> {
  await db.config.set(AUCTION_KEY, JSON.stringify({ ...s, updatedAt: now() }));
}

/* ---- lots ----------------------------------------------------------------- */

export const lotId = (cycle: string, pkg: string) => `lot_${cycle.replace(/-/g, "")}_${packageSlug(pkg)}`;
export const bidId = (lot: string, seq: number) => `${lot}.${String(seq).padStart(6, "0")}`;

type Prices = { editions: EditionPrice[]; tiers: LifetimeTier[] };
const loadPrices = async (db: Data): Promise<Prices> => ({ editions: await getEditionPrices(db), tiers: await getLifetimePrices(db) });

/** A new lot for a package in the cycle ending at `endMs`, at today's shop price; null when the package is not on sale. */
function lotFor(pkg: string, endMs: number, nowMs: number, s: AuctionSettings, by: string, prices: Prices): AuctionLotDoc | null {
  const spec = parsePackage(pkg);
  if (!spec) return null;
  const normal = normalPrice(spec, prices.editions, prices.tiers);
  if (!normal || normal < 1) return null;
  const cycle = cycleId(endMs);
  const at = iso(nowMs);
  return {
    id: lotId(cycle, pkg), cycle, pkg, kind: spec.kind, app: spec.app, title: spec.title,
    edition_code: spec.editionCode, billing: spec.billing, scope: spec.scope, product: spec.product, devices: spec.devices,
    normal_usd: normal, open_usd: openingBid(normal, s), step_usd: bidStep(openingBid(normal, s), s),
    starts_at: iso(Math.max(nowMs, cycleStartOf(endMs))), ends_at: iso(endMs), status: "open",
    bids_count: 0, high_usd: 0, high_seq: 0, high_user: "", high_name: "",
    winner_user: "", winner_email: "", winner_name: "", winner_seq: 0, winner_usd: 0,
    pay_by: "", order_id: "", passed: [], closed_at: "", paid_at: "", note: "", created_by: by, created_at: at, updated_at: at,
  };
}

/** The auction new lots join: the running one, or — in its last day — the next one (its lots open ahead and start with it). */
export function joiningEnd(nowMs: number): number {
  const end = cycleEndAfter(nowMs);
  return end - nowMs < LATE_ADD_MS ? cycleEndAfter(end) : end;
}

/** Lots opened per tick: 103 packages open over ~6 minutes, well inside a Worker's sub-request budget per run. */
export const OPEN_BATCH = 20;
const hashOf = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };

/**
 * Open the next auction's lots, one per package on auction (owner: every package). Deterministic ids and
 * create-once writes: overlapping ticks never open a lot twice. Up to OPEN_BATCH per call; a marker
 * (cycle + packages) skips the work once every lot is open, until the cycle or the packages change.
 */
export async function ensureCycleLots(db: Data, nowMs = Date.now(), by = "system"): Promise<{ cycle: string; created: number; remaining?: number; skipped?: string }> {
  const s = await getAuctionSettings(db);
  const end = joiningEnd(nowMs);
  const cycle = cycleId(end);
  if (!s.enabled) return { cycle, created: 0, skipped: "disabled" };
  const marker = `${cycle}|${s.packages.length}|${hashOf([...s.packages].sort().join(","))}`;
  if ((await db.config.get("auction_cycle_ready").catch(() => null)) === marker) return { cycle, created: 0 };
  const have = new Set((await db.auctionLots.listAll("cycle", cycle, 2000)).map((e) => e.id));
  const prices = await loadPrices(db);
  const todo = s.packages.filter((p) => !have.has(lotId(cycle, p))).map((p) => lotFor(p, end, nowMs, s, by, prices)).filter((l): l is AuctionLotDoc => !!l);
  let created = 0;
  for (const lot of todo.slice(0, OPEN_BATCH)) if (await db.auctionLots.createIfAbsent(lot)) created += 1;
  const remaining = Math.max(0, todo.length - OPEN_BATCH);
  if (created) await audit(db, system, "auction.lots_opened", "auction_cycle", cycle, { created, remaining, endsAt: iso(end) });
  if (!remaining) await db.config.set("auction_cycle_ready", marker);
  return { cycle, created, remaining };
}

/** Admin: put one package up in the running auction now (in its last day: the next one), if it is not there already. */
export async function openLotNow(db: Data, pkg: string, by: string, nowMs = Date.now()): Promise<AuctionLotDoc | { error: string }> {
  if (!parsePackage(pkg)) return { error: "Unknown package." };
  const end = joiningEnd(nowMs);
  const lot = lotFor(pkg, end, nowMs, await getAuctionSettings(db), by, await loadPrices(db));
  if (!lot) return { error: "That package is not on sale right now (Admin → Plans)." };
  if (!(await db.auctionLots.createIfAbsent(lot))) return { error: "This package is already in that auction." };
  return lot;
}

/* ---- what people see ------------------------------------------------------- */

export interface LotView {
  id: string; cycle: string; title: string; kind: string; app: string; normalUsd: number; openUsd: number; stepUsd: number;
  startsAt: string; endsAt: string; status: string; bidsCount: number; highUsd: number; nextMinUsd: number; leader: string;
  winnerName: string; winnerUsd: number; paidAt: string;
}

const won = (l: AuctionLotDoc) => l.status === "sold" || l.status === "awaiting_payment";
/** The public face of a lot: no e-mail, no user id; the leader as a masked name; the winner's chosen name once the lot is won. */
export function lotView(l: AuctionLotDoc): LotView {
  return {
    id: l.id, cycle: l.cycle, title: l.title, kind: l.kind, app: l.app, normalUsd: l.normal_usd, openUsd: l.open_usd, stepUsd: l.step_usd,
    startsAt: l.starts_at, endsAt: l.ends_at, status: l.status, bidsCount: l.bids_count, highUsd: l.high_usd, nextMinUsd: nextMinimum(l),
    // A winner is public from the close, paid or not (owner: an unpaid winner stays listed as "not paid yet").
    leader: l.bids_count ? maskName(l.high_name) : "", winnerName: won(l) ? l.winner_name : "", winnerUsd: won(l) ? l.winner_usd : 0,
    paidAt: l.status === "sold" ? l.paid_at : "",
  };
}

/** A lot rebuilt from its index summary (lib/data/schema.ts lotSummary) — every list is served without document reads. */
const fromEntry = (e: IndexEntry) => ({ id: e.id, passed: [], ...e.meta }) as unknown as AuctionLotDoc;

/** A winner as everyone sees it: the name they chose, the package, the price — and whether it is paid (owner: an unpaid winner stays listed as "not paid yet"). */
export interface Winner { name: string; title: string; app: string; amountUsd: number; normalUsd: number; paid: boolean; paidAt: string; closedAt: string; cycle: string }
export const winnerView = (l: AuctionLotDoc): Winner => ({
  name: l.winner_name, title: l.title, app: l.app, amountUsd: l.winner_usd, normalUsd: l.normal_usd, paid: l.status === "sold",
  paidAt: l.status === "sold" ? l.paid_at : "", closedAt: l.closed_at, cycle: l.cycle,
});

/** Recent winners, newest first — paid and not yet paid — from the "won" index summaries. */
export async function recentWinners(db: Data, limit = 12): Promise<Winner[]> {
  const page = await db.auctionLots.list("won", "all", { limit });
  return page.entries.map(fromEntry).filter((l) => l.status === "sold" || l.status === "awaiting_payment").map(winnerView);
}

const ORDER = (a: AuctionLotDoc, b: AuctionLotDoc) =>
  (a.kind === b.kind ? 0 : a.kind === "edition" ? -1 : 1) || a.app.localeCompare(b.app) || a.normal_usd - b.normal_usd || a.title.localeCompare(b.title);

/** The live lots (open and started), how many are opened ahead for the next auction, the last auction's results, winners. */
async function boardData(db: Data, nowMs: number) {
  const s = await getAuctionSettings(db);
  const end = cycleEndAfter(nowMs);
  const prev = cycleId(cycleStartOf(end));        // the auction that ended last
  const [open, last, winners] = await Promise.all([
    db.auctionLots.listAll("status", "open", 2000),
    db.auctionLots.listAll("cycle", prev, 2000),
    recentWinners(db),
  ]);
  const lots = open.map(fromEntry);
  return {
    s, end, winners,
    live: lots.filter((l) => Date.parse(l.starts_at) <= nowMs).sort(ORDER),
    upcoming: lots.filter((l) => Date.parse(l.starts_at) > nowMs).length,
    last: last.map(fromEntry).filter((l) => l.status !== "open").sort(ORDER),
  };
}

/** The running auction, the last one's results and recent winners — what /auction, the homepage and the portals show. */
export async function publicBoard(db: Data, nowMs = Date.now()) {
  const d = await boardData(db, nowMs);
  return boardOut(d, d.live.map(lotView));
}

function boardOut<L>(d: Awaited<ReturnType<typeof boardData>>, lots: L[]) {
  const { s, end } = d;
  return {
    enabled: s.enabled, openPct: s.openPct, stepPct: s.stepPct, snipeMinutes: s.snipeMinutes, payHours: s.payHours,
    cycle: cycleId(end), cycleEnd: iso(end), cycleStart: iso(cycleStartOf(end)), nextCycleEnd: iso(cycleEndAfter(end)),
    lots, upcoming: d.upcoming,
    last: d.last.map(lotView),
    winners: d.winners,
  };
}

/* ---- bidders --------------------------------------------------------------- */

export const getBidder = (db: Data, userId: string) => db.auctionBidders.get(userId);
/** A signed-in member is a bidder as soon as they have chosen the name shown when they win (owner, 27 Oct 2026:
 *  "biar otomatis tanpa harus dari email website" — no e-mailed code). */
export const isVerified = (b: AuctionBidderDoc | null) => !!(b?.verified_at && b.display_name);

/** The name shown when this member wins — also on lots they have already won. */
export async function setDisplayName(db: Data, user: { sub: string; email: string }, raw: unknown): Promise<{ ok: true; name: string } | { error: NameProblem }> {
  const problem = displayNameProblem(raw);
  if (problem) return { error: problem };
  const name = cleanDisplayName(raw);
  await db.auctionBidders.upsert(user.sub, (cur) => {
    const at = now();
    return {
      id: user.sub, email: user.email, display_name: name, verified_at: cur?.verified_at || at,
      code_hash: "", code_expires: "", code_attempts: 0, code_sent_at: "",
      created_at: cur?.created_at || at, updated_at: at,
    };
  });
  for (const l of await db.auctionLots.listAllDocs("winner", user.sub, 200)) {
    await db.auctionLots.update(l.id, (c) => (c.winner_user === user.sub && (c.status === "awaiting_payment" || c.status === "sold") && c.winner_name !== name ? { ...c, winner_name: name, updated_at: now() } : null));
  }
  return { ok: true, name };
}

/* ---- bidding --------------------------------------------------------------- */

export type BidResult = { ok: true; lot: AuctionLotDoc; seq: number; extended: boolean } | { error: BidProblem | "not_found" | "not_verified" };

export async function placeBid(db: Data, user: { sub: string; email: string }, lot: string, amountIn: unknown, nowMs = Date.now()): Promise<BidResult> {
  const bidder = await getBidder(db, user.sub);
  if (!isVerified(bidder)) return { error: "not_verified" };
  const amount = Math.round(Number(String(amountIn ?? "").replace(/[^\d.]/g, "")) || 0);
  const s = await getAuctionSettings(db);
  if (!(await db.auctionLots.get(lot))) return { error: "not_found" };
  let problem = null as BidProblem | null;
  let seq = 0, extended = false as boolean;
  let prev = { user: "", usd: 0 };
  const after = await db.auctionLots.update(lot, (l) => {
    // Decided again on every compare-and-swap attempt: a bid that lost a race is checked against the new high bid.
    problem = bidProblem(l, amount, user.sub, nowMs);
    if (problem) return null;
    seq = l.bids_count + 1;
    prev = { user: l.high_user, usd: l.high_usd };
    const ends = extendedEnd(l.ends_at, nowMs, s.snipeMinutes);
    extended = ends !== l.ends_at;
    return { ...l, bids_count: seq, high_usd: amount, high_seq: seq, high_user: user.sub, high_name: bidder!.display_name, ends_at: ends, updated_at: iso(nowMs) };
  });
  if (problem) return { error: problem };
  const bid: AuctionBidDoc = { id: bidId(lot, seq), lot_id: lot, seq, user_id: user.sub, email: user.email, display_name: bidder!.display_name, amount_usd: amount, created_at: iso(nowMs) };
  await db.auctionBids.createIfAbsent(bid);
  await audit(db, user, "auction.bid", "auction_lot", lot, { seq, amountUsd: amount, extended });
  if (prev.user && prev.user !== user.sub) {
    const p = await getBidder(db, prev.user);
    if (p?.email) await sendMail(p.email, `You have been outbid — ${after.title}`, mailLayout("You have been outbid",
      `<p>Someone bid <b>${formatUsd(amount)}</b> on <b>${esc(after.title)}</b> (your bid: ${formatUsd(prev.usd)}). The next bid starts at <b>${formatUsd(nextMinimum(after))}</b>.</p><p>The lot ends ${esc(wib(after.ends_at))}.</p>`,
      { label: "Bid again", href: absoluteUrl("/app/auction") })).catch(() => false);
  }
  return { ok: true, lot: after, seq, extended };
}

/** A lot's bids, highest first. */
export const bidsOf = (db: Data, lot: string) => db.auctionBids.listAllDocs("lot", lot, 2000);

/* ---- closing, passing, paying ------------------------------------------------ */

async function bidderOf(db: Data, lot: AuctionLotDoc, seq: number): Promise<{ user: string; email: string; name: string; usd: number } | null> {
  const b = await db.auctionBids.get(bidId(lot.id, seq));
  if (b) return { user: b.user_id, email: b.email, name: b.display_name, usd: b.amount_usd };
  // The bid record is written right after the lot; should it be missing, the lot itself still knows the leader.
  const p = seq === lot.high_seq && lot.high_user ? await getBidder(db, lot.high_user) : null;
  return p ? { user: lot.high_user, email: p.email, name: p.display_name, usd: lot.high_usd } : null;
}

async function mailWinner(db: Data, l: AuctionLotDoc, passed = false) {
  if (!l.winner_email) return;
  const autoPass = (await getAuctionSettings(db)).autoPass;
  await sendMail(l.winner_email, `${passed ? "The lot passed to you" : "You won"} — ${l.title}`, mailLayout(passed ? "The lot is now yours to buy" : "You won the auction",
    `<p>${passed ? "The winning bidder did not pay, so the lot passes to you at your own bid" : "Congratulations — you won"} <b>${esc(l.title)}</b> for <b>${formatUsd(l.winner_usd)}</b> (normal price ${formatUsd(l.normal_usd)}).</p>
     <p>Please pay by <b>${esc(wib(l.pay_by))}</b>. <b>The licence is sent automatically once your payment is confirmed</b> — not before. Until then your win is shown as "not paid yet".${autoPass ? " After that time the lot passes to the next bidder." : ""}</p>
     <p>Paying by bank transfer? Upload the payment screenshot on the Auction page; an administrator confirms it and the licence follows at once.</p>
     <p>Shown on axto.io as: <b>${esc(l.winner_name)}</b> — you can change the name on the Auction page.</p>`,
    { label: "Pay now", href: absoluteUrl("/app/auction") })).catch(() => false);
}

/** Open lots past their end → awaiting payment by the top bidder (or unsold). Idempotent compare-and-swap per lot. */
export async function closeDue(db: Data, nowMs = Date.now()): Promise<number> {
  const s = await getAuctionSettings(db);
  const due = (await db.auctionLots.listAll("status", "open", 500)).filter((e) => Date.parse(String(e.meta.ends_at || "")) <= nowMs);
  let n = 0;
  for (const e of due) {
    const cur = await db.auctionLots.get(e.id);
    if (!cur || cur.status !== "open" || Date.parse(cur.ends_at) > nowMs) continue;
    const top = cur.bids_count ? await bidderOf(db, cur, cur.high_seq) : null;
    let changed = false as boolean;
    const after = await db.auctionLots.update(e.id, (l) => {
      changed = false;
      // A bid that landed after `top` was read: leave the lot for the next tick.
      if (l.status !== "open" || Date.parse(l.ends_at) > nowMs || l.high_seq !== cur.high_seq) return null;
      changed = true;
      const at = iso(nowMs);
      if (!l.bids_count || !top) return { ...l, status: "unsold", closed_at: at, updated_at: at };
      return { ...l, status: "awaiting_payment", closed_at: at, winner_user: top.user, winner_email: top.email, winner_name: top.name, winner_seq: l.high_seq, winner_usd: l.high_usd, pay_by: iso(nowMs + s.payHours * 3_600_000), updated_at: at };
    });
    if (!changed) continue;
    n += 1;
    await audit(db, system, "auction.closed", "auction_lot", e.id, { status: after.status, winnerUsd: after.winner_usd, bids: after.bids_count });
    if (after.status === "awaiting_payment") await mailWinner(db, after);
  }
  return n;
}

/** Pass a won lot to the next bidder (a different member, at their own highest bid), or mark it unsold. */
async function passLot(db: Data, id: string, nowMs: number, by: { sub: string; email: string }, force: boolean): Promise<AuctionLotDoc | null> {
  const s = await getAuctionSettings(db);
  const cur = await db.auctionLots.get(id);
  if (!cur || cur.status !== "awaiting_payment" || (!force && Date.parse(cur.pay_by) > nowMs)) return null;
  const skip = new Set([...cur.passed, cur.winner_user]);
  const next = (await bidsOf(db, id)).find((b) => !skip.has(b.user_id) && b.amount_usd >= cur.open_usd) || null;
  let changed = false as boolean;
  const after = await db.auctionLots.update(id, (l) => {
    changed = false;
    if (l.status !== "awaiting_payment" || l.winner_user !== cur.winner_user || (!force && Date.parse(l.pay_by) > nowMs)) return null;
    changed = true;
    const at = iso(nowMs);
    const passed = [...l.passed, l.winner_user];
    if (!next) return { ...l, status: "unsold", passed, order_id: "", updated_at: at };
    return { ...l, passed, winner_user: next.user_id, winner_email: next.email, winner_name: next.display_name, winner_seq: next.seq, winner_usd: next.amount_usd, order_id: "", pay_by: iso(nowMs + s.payHours * 3_600_000), updated_at: at };
  });
  if (!changed) return null;
  if (cur.order_id) await db.orders.update(cur.order_id, (o) => (o.status === "pending" ? { ...o, status: "canceled" } : null)).catch(() => null);
  await audit(db, by, "auction.passed", "auction_lot", id, { from: cur.winner_user, to: next?.user_id || "", status: after.status, forced: force || undefined });
  if (after.status === "awaiting_payment") await mailWinner(db, after, true);
  return after;
}

/** Wins whose payment window has run out. */
export async function passDue(db: Data, nowMs = Date.now()): Promise<number> {
  // Off by default (owner, 27 Oct 2026): an unpaid winner stays the winner, shown as "not paid yet".
  if (!(await getAuctionSettings(db)).autoPass) return 0;
  const due = (await db.auctionLots.listAll("status", "awaiting_payment", 500)).filter((e) => Date.parse(String(e.meta.pay_by || "")) <= nowMs);
  let n = 0;
  for (const e of due) if (await passLot(db, e.id, nowMs, system, false)) n += 1;
  return n;
}

export const passNow = (db: Data, id: string, by: { sub: string; email: string }) => passLot(db, id, Date.now(), by, true);

/** The heartbeat's share (app/api/cron/tick): open this auction, close what ended, pass what was not paid. */
export async function auctionTick(db: Data, nowMs = Date.now()) {
  const opened = await ensureCycleLots(db, nowMs);
  return { ...opened, closed: await closeDue(db, nowMs), passed: await passDue(db, nowMs) };
}

export async function cancelLot(db: Data, id: string, note: string, by: { sub: string; email: string }): Promise<AuctionLotDoc | { error: string }> {
  const cur = await db.auctionLots.get(id);
  if (!cur) return { error: "Lot not found." };
  if (cur.status === "sold") return { error: "A sold lot cannot be cancelled — refund the order instead." };
  if (cur.status === "cancelled") return cur;
  const after = await db.auctionLots.update(id, (l) => (l.status === "sold" || l.status === "cancelled" ? null : { ...l, status: "cancelled", note: note.slice(0, 500), closed_at: l.closed_at || now(), updated_at: now() }));
  if (after.status === "cancelled" && cur.order_id) await db.orders.update(cur.order_id, (o) => (o.status === "pending" ? { ...o, status: "canceled" } : null)).catch(() => null);
  await audit(db, by, "admin.auction.cancel", "auction_lot", id, { note: note.slice(0, 200), was: cur.status });
  return after;
}

/* ---- checkout and payment ------------------------------------------------------ */

export type WinCheckout = {
  lot: AuctionLotDoc; amountUsd: number;
  edition?: { code: string; app: string; cycle: "yearly" | "monthly" };
  lifetime?: { scope: "app" | "suite"; product: string; devices: number };
};

/** What the checkout charges a winner: their winning bid for the lot's package, only while it is theirs to pay. */
export async function winCheckout(db: Data, id: string, userId: string, nowMs = Date.now()): Promise<WinCheckout | { error: string }> {
  const l = await db.auctionLots.get(String(id || ""));
  if (!l) return { error: "Auction lot not found." };
  if (l.status === "sold") return { error: "This lot has been paid already." };
  if (l.status !== "awaiting_payment" || l.winner_user !== userId) return { error: "This lot is not yours to pay." };
  // A win stays payable until it is paid, unless the admin switched on the hand-over to the next bidder.
  if ((await getAuctionSettings(db)).autoPass && Date.parse(l.pay_by) < nowMs) return { error: "The time to pay for this lot has run out." };
  return l.kind === "edition"
    ? { lot: l, amountUsd: l.winner_usd, edition: { code: l.edition_code, app: l.app, cycle: l.billing === "monthly" ? "monthly" : "yearly" } }
    : { lot: l, amountUsd: l.winner_usd, lifetime: { scope: l.scope === "suite" ? "suite" : "app", product: l.product, devices: l.devices } };
}

/** Remember the winner's latest order on the lot (the admin sees it; passing the lot cancels it). */
export async function noteAuctionOrder(db: Data, id: string, orderId: string, userId: string): Promise<void> {
  await db.auctionLots.update(id, (l) => (l.status === "awaiting_payment" && l.winner_user === userId ? { ...l, order_id: orderId, updated_at: now() } : null)).catch(() => null);
}

/**
 * A paid order that came from the auction → the lot is sold (compare-and-swap, once). Called by
 * markOrderPaid after the licence is issued. A payment that arrives after the lot passed on (or
 * was cancelled) keeps its licence — the money was verified — and is flagged to the owner.
 */
export async function auctionOrderPaid(db: Data, o: OrderDoc): Promise<"sold" | "already" | "late" | "none"> {
  const a = readMeta(o.meta).auction;
  if (!a?.lot) return "none";
  let outcome = "late" as "sold" | "already" | "late";
  const after = await db.auctionLots.update(String(a.lot), (l) => {
    if (l.status === "sold" && l.order_id === o.id) { outcome = "already"; return null; }
    if (l.status === "awaiting_payment" && l.winner_user === o.user_id) { outcome = "sold"; return { ...l, status: "sold", order_id: o.id, paid_at: o.paid_at || now(), updated_at: now() }; }
    outcome = "late";
    return null;
  }).catch(() => null);
  if (outcome === "already") return outcome;
  await audit(db, system, outcome === "sold" ? "auction.sold" : "auction.late_payment", "auction_lot", String(a.lot), { order: o.id, amountUsd: o.amount_usd, buyer: o.user_id });
  await sendMail(await adminInbox(), `Auction ${outcome === "sold" ? "sold" : "LATE payment"}: ${after?.title || a.lot} — ${formatUsd(o.amount_usd)}`, mailLayout(outcome === "sold" ? "Auction lot sold" : "Late auction payment",
    `<p>Lot <b>${esc(String(a.lot))}</b>${after ? ` (${esc(after.title)})` : ""} · order <b>${esc(o.id)}</b> · ${formatUsd(o.amount_usd)} via ${esc(o.gateway)} · ${esc(o.email)}.</p>
     <p>${outcome === "sold" ? `Shown on axto.io as <b>${esc(after?.winner_name || "")}</b>. The licence was issued automatically.` : "The lot had already passed on or been cancelled. The licence was issued because the payment was verified — review it in Admin → Auctions."}</p>`,
    { label: "Open Admin → Auctions", href: absoluteUrl("/admin/auctions") })).catch(() => false);
  return outcome;
}

/* ---- the member's view ------------------------------------------------------- */

export async function memberBoard(db: Data, user: { sub: string; email: string; role?: string }, nowMs = Date.now()) {
  const [d, bidder, myBids, won] = await Promise.all([
    boardData(db, nowMs), getBidder(db, user.sub),
    db.auctionBids.listAllDocs("user", user.sub, 500), db.auctionLots.listAllDocs("winner", user.sub, 200),
  ]);
  const best = new Map<string, number>();
  for (const b of myBids) best.set(b.lot_id, Math.max(best.get(b.lot_id) || 0, b.amount_usd));
  const leading = (l: AuctionLotDoc) => l.bids_count > 0 && l.high_user === user.sub;
  const liveIds = new Set(d.live.map((l) => l.id));
  // Lots this member bid on that are no longer live (ended, passed, sold): read once each — a member bids on few.
  const others = (await db.auctionLots.getMany([...best.keys()].filter((id) => !liveIds.has(id)))).filter((l): l is AuctionLotDoc => !!l);
  const mine = [...d.live.filter((l) => best.has(l.id)), ...others].sort((a, b) => b.ends_at.localeCompare(a.ends_at));
  return {
    ...boardOut(d, d.live.map((l) => ({ ...lotView(l), myBestUsd: best.get(l.id) || 0, leading: leading(l) }))),
    // Admins run the auction and do not bid; everyone else bids once they have chosen a display name.
    bidder: { verified: isVerified(bidder), admin: user.role === "admin", displayName: bidder?.display_name || "", email: user.email },
    myBids: mine.map((l) => ({ ...lotView(l), myBestUsd: best.get(l.id) || 0, leading: leading(l) })),
    wins: won.filter((l) => l.winner_user === user.sub && (l.status === "awaiting_payment" || l.status === "sold"))
      .map((l) => ({ ...lotView(l), winnerName: l.winner_name, winnerUsd: l.winner_usd, payBy: l.pay_by, orderId: l.order_id, status: l.status, paidAt: l.paid_at })),
  };
}
