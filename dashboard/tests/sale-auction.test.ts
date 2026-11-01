/* AXTO — the site-sale auction (docs/BLUEPRINT-V4.md §34, REQUESTS 120, 125, 132):
 * offers from US$500,000 (owner, 1 Nov 2026), flat by default; an optional weekly
 * rise counted through every round; stored settings from before the price move
 * once to it; the bid rules (the floor and the step of the settings of the moment),
 * anti-snipe, bidder registration and approval, races between bids, closing a round,
 * the winner-only checkout, a paid round, passing on, and the next round after an
 * unsold one. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { testData } from "./helpers/data";
import { DEFAULT_PRICE_USD, SALE_DEFAULTS, SALE_KEY, getSale, repriceStoredSale, saveSale, sanitizeSale } from "../lib/acquisition";
import {
  MAX_BID_USD, OPEN_MIN_USD, SALE_AUCTION_DEFAULTS, SALE_PRICE_REV, closeDueRound, decideBidder, ladderPrice, ladderStart, latestRound, myAuction, nextMinBid, nextRiseAt,
  parseBid, passRound, placeSaleBid, publicRound, registerBidder, roundBids, saleAuctionTick, saleBidProblem, saleRoundPaid,
  sanitizeSaleAuction, startRound, winnerCheckout, withLiveStep, type RoundState,
} from "../lib/sale-auction";
import { SALE_AUC } from "../lib/i18n-pages/sale-auction";

const L = SALE_AUCTION_DEFAULTS;
const STEP = L.stepUsd;
const WEEK = 7 * 86_400_000;

test("the owner's price (REQUESTS 132): offers from US$500,000, flat, raised by US$25,000 at a time", () => {
  assert.equal(OPEN_MIN_USD, 500_000);
  assert.equal(L.startUsd, 500_000);
  assert.equal(L.weeklyUsd, 0, "flat unless the admin sets a weekly rise");
  assert.equal(L.stepUsd, 25_000);
  assert.equal(DEFAULT_PRICE_USD, 500_000, "the fixed price too");
  const day1 = ladderStart(L);
  assert.equal(new Date(day1).toISOString(), "2026-10-31T17:00:00.000Z", "1 Nov 2026, 00:00 in Jakarta");
  for (const t of [day1 - 1, day1, day1 + WEEK, day1 + 52 * WEEK]) assert.equal(ladderPrice(L, t), 500_000);
  assert.equal(nextRiseAt(L, day1 + 1), "", "a flat opening bid never rises");
});

test("an optional weekly rise: counted from day one (00:00 WIB) through every round", () => {
  const R = { ...L, weeklyUsd: 10_000, from: "2026-11-01" };
  const day1 = ladderStart(R);
  assert.equal(ladderPrice(R, day1 - 1), 500_000, "never below the start");
  assert.equal(ladderPrice(R, day1 + WEEK - 1), 500_000);
  assert.equal(ladderPrice(R, day1 + WEEK), 510_000, "week one ends 8 Nov");
  assert.equal(ladderPrice(R, day1 + 10 * WEEK + 3), 600_000);
  assert.equal(nextRiseAt(R, day1 + 1), "2026-11-07T17:00:00.000Z");
});

test("settings: only valid values are kept; the sale defaults to an auction", () => {
  assert.equal(SALE_DEFAULTS.mode, "auction");
  const a = sanitizeSaleAuction({ startUsd: 400_000, weeklyUsd: 50_000, from: "28/10/2026", stepUsd: 10, days: 400, snipeMinutes: "15", payDays: 3, approval: false });
  assert.equal(a.startUsd, 500_000, "never below the owner's US$500,000");
  assert.equal(a.weeklyUsd, 50_000);
  assert.equal(a.from, "2026-11-01", "not a date");
  assert.equal(a.stepUsd, SALE_AUCTION_DEFAULTS.stepUsd);
  assert.equal(a.days, SALE_AUCTION_DEFAULTS.days);
  assert.equal(a.snipeMinutes, 15);
  assert.equal(a.payDays, 3);
  assert.equal(a.approval, false);
  assert.equal(sanitizeSaleAuction({ startUsd: 250_000_000 }).startUsd, 500_000);
  assert.equal(sanitizeSaleAuction({ startUsd: 750_000 }).startUsd, 750_000, "the admin may set more");
  assert.equal(sanitizeSaleAuction({ startUsd: 1_200_000, from: "2026-11-02" }).from, "2026-11-02");
  // A setting saved before the ladder (random opening) reads as the defaults.
  assert.deepEqual(sanitizeSaleAuction({ openUsd: 0, randomOpen: true, stepUsd: 25_000 }), SALE_AUCTION_DEFAULTS);
  assert.equal(sanitizeSale({ mode: "fixed" }).mode, "fixed");
  assert.equal(sanitizeSale({ mode: "lottery" }).mode, "auction");
});

test("settings stored before the new price move to it once; a price the admin saves afterwards is kept", async () => {
  const old = { status: "open", mode: "auction", priceUsd: 10_000_000, gateways: ["paypal", "crypto"], whatsapp: "+62 811",
    auction: { startUsd: 10_000_000, weeklyUsd: 100_000, from: "2026-10-28", stepUsd: 250_000, days: 21, snipeMinutes: 15, payDays: 5, autoRestart: false, approval: false } };
  const moved = sanitizeSale(repriceStoredSale(old));
  assert.deepEqual(
    { start: moved.auction.startUsd, weekly: moved.auction.weeklyUsd, from: moved.auction.from, step: moved.auction.stepUsd, price: moved.priceUsd },
    { start: 500_000, weekly: 0, from: "2026-11-01", step: 25_000, price: 500_000 });
  assert.deepEqual(
    { days: moved.auction.days, snipe: moved.auction.snipeMinutes, pay: moved.auction.payDays, restart: moved.auction.autoRestart, approval: moved.auction.approval, gateways: moved.gateways, mode: moved.mode },
    { days: 21, snipe: 15, pay: 5, restart: false, approval: false, gateways: ["paypal", "crypto"], mode: "auction" }, "everything else is kept");
  const own = { ...old, priceRev: SALE_PRICE_REV };
  assert.equal(repriceStoredSale(own), own, "a setting saved under the current price is the admin's own");
  assert.equal(sanitizeSale(repriceStoredSale(own)).auction.startUsd, 10_000_000);

  const { db } = testData();
  await db.config.set(SALE_KEY, JSON.stringify(old));
  const read = await getSale(db);
  assert.equal(read.auction.startUsd, 500_000);
  assert.equal(read.priceUsd, 500_000);
  await saveSale(db, { ...read, auction: { ...read.auction, startUsd: 800_000, weeklyUsd: 5_000 } });
  assert.equal(JSON.parse((await db.config.get(SALE_KEY))!).priceRev, SALE_PRICE_REV);
  const again = await getSale(db);
  assert.equal(again.auction.startUsd, 800_000, "the admin's price stays");
  assert.equal(again.auction.weeklyUsd, 5_000);
});

test("the words: offers from {open} in every language, no US$10 million anywhere; the rising lines only name the weekly rise", () => {
  for (const [lang, t] of Object.entries(SALE_AUC)) {
    assert.equal(t.openingNote.split("{open}").length, 2, `${lang}: {open} once in openingNote`);
    assert.ok(!t.openingNote.includes("{weekly}"), `${lang}: the flat note has no weekly rise`);
    assert.ok(t.rules[0].includes("{open}") && t.rules[0].includes("{step}") && !t.rules[0].includes("{weekly}"), `${lang}: flat rule`);
    assert.ok(t.openingNoteRising.includes("{weekly}") && t.ruleRising.includes("{weekly}"), `${lang}: rising lines`);
    const all = JSON.stringify(t);
    assert.ok(!/10[\s,.]?000[\s,.]?000|10 ?(million|juta|Millionen|millions|milioni)|1,?000 ?万|करोड़|ملايين|2026 ?年 ?10 ?月 ?28|28 (October|Oktober|octobre|ottobre)/i.test(all), `${lang}: no old price or date`);
  }
});

const round = (o: Partial<RoundState> = {}): RoundState => ({
  status: "open", starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-11-15T00:00:00Z", open_usd: 500_000, step_usd: STEP,
  bids_count: 0, high_usd: 0, high_user: "", ...o,
});
const MID = Date.parse("2026-11-02T00:00:00Z");
const F = ladderPrice(L, MID);

test("bids: at least the opening price, then the high bid plus a step; a rise applies mid-round; never against yourself", () => {
  assert.equal(F, 500_000);
  assert.equal(nextMinBid(round(), F), 500_000);
  assert.equal(saleBidProblem(round(), 499_999, "a", MID, F), "too_low");
  assert.equal(saleBidProblem(round(), 500_000, "a", MID, F), null);
  const led = round({ bids_count: 1, high_usd: 500_000, high_user: "a" });
  assert.equal(nextMinBid(led, F), 525_000);
  assert.equal(saleBidProblem(led, 510_000, "b", MID, F), "too_low");
  assert.equal(saleBidProblem(led, 2_000_000, "b", MID, F), null, "a jump bid");
  assert.equal(saleBidProblem(led, 3_000_000, "a", MID, F), "already_highest");
  assert.equal(saleBidProblem(led, MAX_BID_USD + 1, "b", MID, F), "too_high");
  assert.equal(saleBidProblem(led, 525_000.5, "b", MID, F), "bad_amount");
  assert.equal(saleBidProblem(round(), 500_000, "a", Date.parse("2026-10-31T00:00:00Z"), F), "not_started");
  assert.equal(saleBidProblem(round(), 500_000, "a", Date.parse("2026-11-15T00:00:00Z"), F), "ended");
  assert.equal(saleBidProblem(round({ status: "awaiting_payment" }), 500_000, "a", MID, F), "closed");
  // With a weekly rise set, the opening bid of the day applies also in a round that opened earlier.
  const R = { ...L, weeklyUsd: 10_000 };
  const later = Date.parse("2026-11-09T00:00:00Z");
  assert.equal(saleBidProblem(round(), 500_000, "a", later, ladderPrice(R, later)), "too_low");
  assert.equal(nextMinBid(round({ bids_count: 1, high_usd: 400_000 }), 510_000), 510_000, "the opening bid is the floor of every bid");
  // A round opened with an older step follows the step of the settings of the moment.
  const old = round({ bids_count: 1, high_usd: 500_000, high_user: "a", step_usd: 250_000 });
  assert.equal(nextMinBid(withLiveStep(old, L), F), 525_000);
  assert.equal(old.step_usd, 250_000, "the stored round is not changed");
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

test("the first round opens by itself at the opening price; ticks never open a second one", async () => {
  const db = await setup();
  const t0 = Date.parse("2026-11-01T00:00:00Z");
  const [x, y] = await Promise.all([saleAuctionTick(db, t0), saleAuctionTick(db, t0)]);
  assert.equal([x.opened, y.opened].filter(Boolean).length, 1, "one round, even when ticks overlap");
  const r = (await latestRound(db))!;
  assert.equal(r.id, "sr_0001");
  assert.equal(r.status, "open");
  assert.equal(r.open_usd, 500_000, "the opening price on 1 Nov 2026");
  assert.equal(r.ends_at, "2026-11-15T00:00:00.000Z", "14 days");
  assert.deepEqual(await saleAuctionTick(db, t0 + 60_000), {});
  assert.equal(await startRound(db, SALE_DEFAULTS, ADMIN), null, "one round at a time");
  // Every visitor sees the same opening bid: the settings of the moment, also when the admin sets a weekly rise.
  assert.equal(publicRound((await latestRound(db))!, [], L, t0).openUsd, 500_000);
  assert.equal(publicRound((await latestRound(db))!, [], L, t0 + 3 * WEEK).openUsd, 500_000, "flat");
  assert.equal(publicRound((await latestRound(db))!, [], { ...L, weeklyUsd: 10_000 }, t0 + 3 * WEEK).openUsd, 530_000);
  assert.equal(publicRound((await latestRound(db))!, [], { ...L, stepUsd: 50_000 }, t0).stepUsd, 50_000, "the step of the moment");
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
  const amount = r.open_usd + STEP;
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
  assert.equal(pub.nextMinUsd, amount + 1_000_000 + STEP);
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
