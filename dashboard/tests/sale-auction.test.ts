/* AXTO — the site-sale auction (docs/BLUEPRINT-V4.md §34, REQUESTS 120 and 125):
 * the weekly ladder of the opening bid (US$10M from 28 Oct 2026, +US$100,000 a
 * week, through every round), the bid rules, anti-snipe,
 * bidder registration and approval, races between bids, closing a round, the
 * winner-only checkout, a paid round, passing on, and the next round after an
 * unsold one. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { testData } from "./helpers/data";
import { SALE_DEFAULTS, saveSale, sanitizeSale } from "../lib/acquisition";
import {
  MAX_BID_USD, SALE_AUCTION_DEFAULTS, closeDueRound, decideBidder, ladderPrice, ladderStart, latestRound, myAuction, nextMinBid, nextRiseAt,
  parseBid, passRound, placeSaleBid, publicRound, registerBidder, roundBids, saleAuctionTick, saleBidProblem, saleRoundPaid,
  sanitizeSaleAuction, startRound, winnerCheckout, type RoundState,
} from "../lib/sale-auction";

const L = SALE_AUCTION_DEFAULTS;
const WEEK = 7 * 86_400_000;

test("opening bid: US$10M from 28 Oct 2026 (00:00 WIB), +US$100,000 for every full week", () => {
  const day1 = ladderStart(L);
  assert.equal(new Date(day1).toISOString(), "2026-10-27T17:00:00.000Z", "00:00 in Jakarta");
  assert.equal(ladderPrice(L, day1 - 1), 10_000_000, "never below the start");
  assert.equal(ladderPrice(L, day1), 10_000_000);
  assert.equal(ladderPrice(L, day1 + WEEK - 1), 10_000_000);
  assert.equal(ladderPrice(L, day1 + WEEK), 10_100_000, "week one ends 4 Nov");
  assert.equal(ladderPrice(L, day1 + 10 * WEEK + 3), 11_000_000);
  assert.equal(nextRiseAt(L, day1 + 1), "2026-11-03T17:00:00.000Z");
  assert.equal(nextRiseAt({ ...L, weeklyUsd: 0 }, day1 + 1), "", "a flat opening bid never rises");
});

test("settings: only valid values are kept; the sale defaults to an auction", () => {
  assert.equal(SALE_DEFAULTS.mode, "auction");
  const a = sanitizeSaleAuction({ startUsd: 5_000_000, weeklyUsd: 50_000, from: "28/10/2026", stepUsd: 10, days: 400, snipeMinutes: "15", payDays: 3, approval: false });
  assert.equal(a.startUsd, 10_000_000, "never below the owner's US$10M");
  assert.equal(a.weeklyUsd, 50_000);
  assert.equal(a.from, "2026-10-28", "not a date");
  assert.equal(a.stepUsd, SALE_AUCTION_DEFAULTS.stepUsd);
  assert.equal(a.days, SALE_AUCTION_DEFAULTS.days);
  assert.equal(a.snipeMinutes, 15);
  assert.equal(a.payDays, 3);
  assert.equal(a.approval, false);
  assert.equal(sanitizeSaleAuction({ startUsd: 250_000_000 }).startUsd, 10_000_000);
  assert.equal(sanitizeSaleAuction({ startUsd: 12_000_000, from: "2026-11-02" }).from, "2026-11-02");
  // A setting saved before the ladder (random opening) reads as the ladder's defaults.
  assert.deepEqual(sanitizeSaleAuction({ openUsd: 0, randomOpen: true, stepUsd: 250_000 }), SALE_AUCTION_DEFAULTS);
  assert.equal(sanitizeSale({ mode: "fixed" }).mode, "fixed");
  assert.equal(sanitizeSale({ mode: "lottery" }).mode, "auction");
});

const round = (o: Partial<RoundState> = {}): RoundState => ({
  status: "open", starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-11-15T00:00:00Z", open_usd: 10_000_000, step_usd: 250_000,
  bids_count: 0, high_usd: 0, high_user: "", ...o,
});
const MID = Date.parse("2026-11-02T00:00:00Z");
const F = ladderPrice(L, MID);

test("bids: at least the opening bid of the day, then the high bid plus a step; the weekly rise applies mid-round; never against yourself", () => {
  assert.equal(F, 10_000_000);
  assert.equal(nextMinBid(round(), F), 10_000_000);
  assert.equal(saleBidProblem(round(), 9_999_999, "a", MID, F), "too_low");
  assert.equal(saleBidProblem(round(), 10_000_000, "a", MID, F), null);
  const led = round({ bids_count: 1, high_usd: 10_000_000, high_user: "a" });
  assert.equal(nextMinBid(led, F), 10_250_000);
  assert.equal(saleBidProblem(led, 10_100_000, "b", MID, F), "too_low");
  assert.equal(saleBidProblem(led, 50_000_000, "b", MID, F), null, "a jump bid");
  assert.equal(saleBidProblem(led, 60_000_000, "a", MID, F), "already_highest");
  assert.equal(saleBidProblem(led, MAX_BID_USD + 1, "b", MID, F), "too_high");
  assert.equal(saleBidProblem(led, 10.5e6 + 0.5, "b", MID, F), "bad_amount");
  assert.equal(saleBidProblem(round(), 10_000_000, "a", Date.parse("2026-10-31T00:00:00Z"), F), "not_started");
  assert.equal(saleBidProblem(round(), 10_000_000, "a", Date.parse("2026-11-15T00:00:00Z"), F), "ended");
  assert.equal(saleBidProblem(round({ status: "awaiting_payment" }), 10_000_000, "a", MID, F), "closed");
  // After the rise of 4 Nov the opening bid of the day is US$10.1M, also in a round that opened earlier.
  const later = Date.parse("2026-11-05T00:00:00Z");
  assert.equal(saleBidProblem(round(), 10_000_000, "a", later, ladderPrice(L, later)), "too_low");
  assert.equal(nextMinBid(round({ bids_count: 1, high_usd: 9_000_000 }), 10_100_000), 10_100_000, "the ladder is the floor of every bid");
  assert.equal(parseBid("42,250,000"), 42_250_000);
  assert.equal(parseBid("$ 42 250 000"), 42_250_000);
  assert.ok(Number.isNaN(parseBid("42.5M")));
  assert.ok(Number.isNaN(parseBid("")));
});

/* ---- the whole flow on the R2 store ----------------------------------------------------- */

const A = { sub: "user_a", email: "a@example.com" };
const B = { sub: "user_b", email: "b@example.com" };
const C = { sub: "user_c", email: "c@example.com" };
const ADMIN = { sub: "admin_1", email: "owner@axto.io", role: "admin" };
const reg = (name: string) => ({ displayName: name, company: `${name} Holdings`, country: "Singapore", phone: "+65 6123 4567", message: "Serious buyer" });

async function setup(auction: Partial<typeof SALE_AUCTION_DEFAULTS> = {}) {
  const { db } = testData();
  await saveSale(db, { ...SALE_DEFAULTS, auction: { ...SALE_AUCTION_DEFAULTS, ...auction } });
  return db;
}

test("the first round opens by itself at the ladder's opening bid; ticks never open a second one", async () => {
  const db = await setup();
  const t0 = Date.parse("2026-11-01T00:00:00Z");
  const [x, y] = await Promise.all([saleAuctionTick(db, t0), saleAuctionTick(db, t0)]);
  assert.equal([x.opened, y.opened].filter(Boolean).length, 1, "one round, even when ticks overlap");
  const r = (await latestRound(db))!;
  assert.equal(r.id, "sr_0001");
  assert.equal(r.status, "open");
  assert.equal(r.open_usd, 10_000_000, "the ladder on 1 Nov 2026");
  assert.equal(r.ends_at, "2026-11-15T00:00:00.000Z", "14 days");
  assert.deepEqual(await saleAuctionTick(db, t0 + 60_000), {});
  assert.equal(await startRound(db, SALE_DEFAULTS, ADMIN), null, "one round at a time");
  // Every visitor sees the same opening bid: the ladder of the moment.
  assert.equal(publicRound((await latestRound(db))!, [], L, t0).openUsd, 10_000_000);
  assert.equal(publicRound((await latestRound(db))!, [], L, t0 + 3 * WEEK).openUsd, 10_300_000);
});

test("bidders register and wait for approval; admins and unknown members cannot bid", async () => {
  const db = await setup();
  const t0 = Date.parse("2026-11-01T00:00:00Z");
  await saleAuctionTick(db, t0);
  const r = (await latestRound(db))!;
  assert.deepEqual(await placeSaleBid(db, A, r.open_usd, t0 + 1000), { error: "not_registered" });
  assert.deepEqual(await registerBidder(db, A, { ...reg("Ava"), displayName: "Google Ventures" }, true), { error: "brand" });
  assert.deepEqual(await registerBidder(db, A, { ...reg("Ava"), phone: "call me" }, true), { error: "phone" });
  const ok = await registerBidder(db, A, reg("Ava"), true);
  assert.ok("ok" in ok && ok.bidder.status === "pending");
  assert.deepEqual(await placeSaleBid(db, A, r.open_usd, t0 + 1000), { error: "pending" });
  await decideBidder(db, A.sub, true, ADMIN);
  assert.deepEqual(await placeSaleBid(db, ADMIN, r.open_usd, t0 + 1000), { error: "admin" });
  const refused = await registerBidder(db, C, reg("Cory"), true);
  assert.ok("ok" in refused);
  await decideBidder(db, C.sub, false, ADMIN);
  assert.deepEqual(await placeSaleBid(db, C, r.open_usd, t0 + 1000), { error: "rejected" });
  const again = await registerBidder(db, C, reg("Cory"), true);
  assert.ok("ok" in again && again.bidder.status === "rejected", "re-registering does not undo a refusal");
  // Without approval a bidder is approved at once.
  const db2 = await setup({ approval: false });
  const auto = await registerBidder(db2, B, reg("Ben"), false);
  assert.ok("ok" in auto && auto.bidder.status === "approved");
});

test("bidding: races, anti-snipe, closing, winner-only checkout, paid round", async () => {
  const db = await setup({ approval: false });
  const t0 = Date.parse("2026-11-01T00:00:00Z");
  await saleAuctionTick(db, t0);
  const r = (await latestRound(db))!;
  for (const [u, n] of [[A, "Ava"], [B, "Ben"], [C, "Cory"]] as const) await registerBidder(db, u, reg(n), false);

  assert.deepEqual(await placeSaleBid(db, A, r.open_usd - 1, t0 + 1000), { error: "too_low" });
  const first = await placeSaleBid(db, A, String(r.open_usd), t0 + 1000);
  assert.ok("ok" in first && first.round.high_usd === r.open_usd);
  // Two bids of the same amount at the same moment: one wins, the other is now too low.
  const amount = r.open_usd + 250_000;
  const [b1, b2] = await Promise.all([placeSaleBid(db, B, amount, t0 + 2000), placeSaleBid(db, C, amount, t0 + 2000)]);
  assert.equal([b1, b2].filter((x) => "ok" in x).length, 1);
  assert.deepEqual([b1, b2].find((x) => "error" in x), { error: "too_low" });
  const leader = "ok" in b1 ? B : C;
  const other = leader === B ? C : B;

  // A bid 3 minutes before the end moves the end to 10 minutes after it.
  const end = Date.parse(r.ends_at);
  const late = await placeSaleBid(db, other, amount + 1_000_000, end - 3 * 60_000);
  assert.ok("ok" in late && late.extended);
  assert.equal(late.round.ends_at, new Date(end + 7 * 60_000).toISOString());
  assert.equal(await closeDueRound(db, end), null, "not over: the clock was extended");

  const bids = await roundBids(db, r.id);
  assert.deepEqual(bids.map((b) => b.amount_usd), [amount + 1_000_000, amount, r.open_usd], "highest first");
  const pub = publicRound((await latestRound(db))!, bids, L, end);
  assert.equal(pub.bidsCount, 3);
  assert.equal(pub.nextMinUsd, amount + 1_250_000);
  assert.match(pub.leader, /^[A-Z]•+$/, "names are masked");
  assert.ok(!JSON.stringify(pub).includes("@example.com"), "no e-mail on the public board");

  const closed = (await closeDueRound(db, end + 7 * 60_000))!;
  assert.equal(closed.status, "awaiting_payment");
  assert.equal(closed.winner_user, other.sub);
  assert.equal(closed.winner_usd, amount + 1_000_000);
  assert.equal(closed.pay_by, new Date(end + 7 * 60_000 + 7 * 86_400_000).toISOString());
  assert.deepEqual(await placeSaleBid(db, leader, amount + 9_000_000, end + 8 * 60_000), { error: "closed" });

  assert.ok("error" in (await winnerCheckout(db, leader.sub)), "only the winner pays");
  const pay = await winnerCheckout(db, other.sub);
  assert.ok("amountUsd" in pay && pay.amountUsd === amount + 1_000_000);
  const me = await myAuction(db, other, closed);
  assert.equal(me.winner, true);
  assert.equal(me.amountUsd, amount + 1_000_000);

  // A verified payment marks the round sold, once; a stranger's order does not.
  assert.equal(await saleRoundPaid(db, { id: "ord_x", user_id: leader.sub, paid_at: "", meta: JSON.stringify({ saleRound: r.id }) }), "late");
  assert.equal(await saleRoundPaid(db, { id: "ord_w", user_id: other.sub, paid_at: "2026-11-20T00:00:00Z", meta: JSON.stringify({ saleRound: r.id }) }), "sold");
  assert.equal(await saleRoundPaid(db, { id: "ord_w", user_id: other.sub, paid_at: "", meta: JSON.stringify({ saleRound: r.id }) }), "already");
  assert.equal((await latestRound(db))!.status, "sold");
  assert.deepEqual(await saleAuctionTick(db, end + 86_400_000), {}, "a sold round opens nothing new");
});

test("an unpaid win passes to the next bidder; a round with no bid is followed by a new one at once", async () => {
  const db = await setup({ approval: false });
  const t0 = Date.parse("2026-11-01T00:00:00Z");
  await saleAuctionTick(db, t0);
  const r = (await latestRound(db))!;
  await registerBidder(db, A, reg("Ava"), false);
  await registerBidder(db, B, reg("Ben"), false);
  await placeSaleBid(db, A, r.open_usd, t0 + 1000);
  await placeSaleBid(db, B, r.open_usd + 500_000, t0 + 2000);
  await closeDueRound(db, Date.parse(r.ends_at));
  const passed = await passRound(db, r.id, ADMIN, Date.parse(r.ends_at) + 1000);
  assert.ok(!("error" in passed));
  assert.equal(passed.winner_user, A.sub);
  assert.equal(passed.winner_usd, r.open_usd, "at their own highest bid");
  const none = await passRound(db, r.id, ADMIN);
  assert.ok(!("error" in none) && none.status === "unsold", "nobody left");

  const db2 = await setup();
  await saleAuctionTick(db2, t0);
  const r1 = (await latestRound(db2))!;
  const out = await saleAuctionTick(db2, Date.parse(r1.ends_at));
  assert.equal(out.closed, "unsold");
  assert.equal(out.opened, "sr_0002");
  const r2 = (await latestRound(db2))!;
  assert.equal(r2.no, 2);
  assert.equal(r2.status, "open");

  const db3 = await setup({ autoRestart: false });
  await saleAuctionTick(db3, t0);
  const r3 = (await latestRound(db3))!;
  assert.deepEqual(await saleAuctionTick(db3, Date.parse(r3.ends_at)), { closed: "unsold" });
  await saveSale(db3, { ...SALE_DEFAULTS, mode: "fixed" });
  assert.deepEqual(await saleAuctionTick(db3, Date.parse(r3.ends_at) + 1), { skipped: "fixed_price" });
});
