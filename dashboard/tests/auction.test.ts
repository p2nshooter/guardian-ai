/* AXTO — the licence auction rules (lib/auction-terms.ts, lib/auction-packages.ts):
 * the Friday-07:00-WIB two-week grid, opening bid and raise, bid validation,
 * anti-snipe, the display-name filter and the packages. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_PACKAGES, AUCTION_ANCHOR_MS, AUCTION_DEFAULTS, CYCLE_MS, LIFETIME_DEVICE_TIERS, bidProblem, cycleEndAfter, cycleId, cycleStartOf, displayNameProblem, extendedEnd,
  maskName, bidStep, nextMinimum, openingBid, sanitizeAuction, type LotState,
} from "../lib/auction-terms";
import { normalPrice, packageCatalog, packageSlug, parsePackage } from "../lib/auction-packages";
import { mergeEditionPrices } from "../lib/editions";
import { LIFETIME_TIERS } from "../lib/lifetime";

test("auction cycle: every 14 days, always Friday 07:00 WIB (00:00 UTC), starting 6 Nov 2026", () => {
  assert.equal(new Date(AUCTION_ANCHOR_MS).toISOString(), "2026-11-06T00:00:00.000Z");
  const wib = (ms: number) => new Date(ms).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", weekday: "long", hour: "2-digit", minute: "2-digit" });
  assert.equal(wib(AUCTION_ANCHOR_MS), "Friday 07:00");
  const now = Date.parse("2026-10-27T04:00:00Z");
  assert.equal(new Date(cycleEndAfter(now)).toISOString(), "2026-11-06T00:00:00.000Z");
  assert.equal(new Date(cycleStartOf(cycleEndAfter(now))).toISOString(), "2026-10-23T00:00:00.000Z");
  // The end belongs to the next auction, which starts that same instant; one millisecond before is still this one.
  assert.equal(cycleEndAfter(AUCTION_ANCHOR_MS - 1), AUCTION_ANCHOR_MS);
  assert.equal(cycleEndAfter(AUCTION_ANCHOR_MS), AUCTION_ANCHOR_MS + CYCLE_MS);
  assert.equal(cycleStartOf(cycleEndAfter(AUCTION_ANCHOR_MS)), AUCTION_ANCHOR_MS, "no gap between two auctions");
  for (let k = -3; k < 80; k++) assert.equal(wib(cycleEndAfter(AUCTION_ANCHOR_MS + k * CYCLE_MS + 12_345_678)), "Friday 07:00");
  assert.equal(cycleId(AUCTION_ANCHOR_MS), "2026-11-06");
});

test("auction prices: opening bid 25 % of the normal price; every bid +10 % of the opening bid; whole dollars, never below $1", () => {
  assert.equal(openingBid(990, AUCTION_DEFAULTS), 248);       // 247.50 → 248
  assert.equal(bidStep(248, AUCTION_DEFAULTS), 25);           // 24.80 → 25
  assert.equal(openingBid(2, AUCTION_DEFAULTS), 1);
  assert.equal(bidStep(1, AUCTION_DEFAULTS), 1);
  assert.equal(openingBid(249_000, AUCTION_DEFAULTS), 62_250);
  assert.equal(bidStep(62_250, AUCTION_DEFAULTS), 6_225);
});

const lot = (o: Partial<LotState> = {}): LotState => ({
  status: "open", starts_at: "2026-10-23T00:00:00Z", ends_at: "2026-11-06T00:00:00Z", normal_usd: 990, open_usd: 248, step_usd: 25,
  bids_count: 0, high_usd: 0, high_user: "", ...o,
});
const NOW = Date.parse("2026-10-30T10:00:00Z");

test("bids: the opening bid, then exactly one step at a time; never above the normal price; never against yourself", () => {
  assert.equal(nextMinimum(lot()), 248);
  assert.equal(bidProblem(lot(), 247, "a", NOW), "too_low");
  assert.equal(bidProblem(lot(), 260, "a", NOW), "not_next", "every bid is exactly the next price");
  assert.equal(bidProblem(lot(), 248, "a", NOW), null);
  const led = lot({ bids_count: 1, high_usd: 248, high_user: "a" });
  assert.equal(nextMinimum(led), 273, "248 + 10 % of the opening bid");
  assert.equal(bidProblem(led, 273, "a", NOW), "already_highest");
  assert.equal(bidProblem(led, 260, "b", NOW), "not_next", "a bid that lost a race to another");
  assert.equal(bidProblem(led, 248, "b", NOW), "too_low");
  assert.equal(bidProblem(led, 298, "b", NOW), "not_next");
  assert.equal(bidProblem(led, 273, "b", NOW), null);
  assert.equal(bidProblem(led, 991, "b", NOW), "too_high");
  // The last step stops at the normal price, and then bidding is over.
  const near = lot({ bids_count: 30, high_usd: 973, high_user: "a" });
  assert.equal(nextMinimum(near), 990);
  assert.equal(bidProblem(near, 990, "b", NOW), null);
  assert.equal(bidProblem(lot({ bids_count: 31, high_usd: 990, high_user: "b" }), 990, "a", NOW), "too_high");
  assert.equal(bidProblem(led, 273.5, "b", NOW), "bad_amount");
  assert.equal(bidProblem(lot({ status: "awaiting_payment" }), 300, "b", NOW), "closed");
  assert.equal(bidProblem(lot(), 248, "b", Date.parse("2026-11-06T00:00:00Z")), "ended");
  assert.equal(bidProblem(lot({ starts_at: "2026-11-01T00:00:00Z" }), 248, "b", NOW), "not_started");
});

test("anti-snipe: a bid in the last 5 minutes moves the end to 5 minutes after it", () => {
  const end = "2026-11-06T15:00:00.000Z";
  assert.equal(extendedEnd(end, Date.parse("2026-11-06T14:50:00Z"), 5), end, "10 minutes left: unchanged");
  assert.equal(extendedEnd(end, Date.parse("2026-11-06T14:58:30Z"), 5), "2026-11-06T15:03:30.000Z");
  assert.equal(extendedEnd(end, Date.parse("2026-11-06T14:58:30Z"), 0), end, "switched off");
});

test("display names: real company and personal names pass; abuse, other brands and contact details do not", () => {
  for (const ok of ["PT Maju Jaya Abadi", "Ada Lovelace", "Müller & Söhne GmbH", "Café Noël", "株式会社テスト", "شركة النور", "O'Brien Consulting (Dublin)", "Paxton Labs", "Harvey Specter Law"]) {
    assert.equal(displayNameProblem(ok), null, ok);
  }
  assert.equal(displayNameProblem("A"), "length");
  assert.equal(displayNameProblem("1234"), "chars");
  assert.equal(displayNameProblem("Best <script>"), "chars");
  assert.equal(displayNameProblem("me@example.com"), "contact");
  assert.equal(displayNameProblem("Call 0856 9123 4561"), "contact");
  assert.equal(displayNameProblem("www.shop.com"), "contact");
  for (const bad of ["Fuck Corp", "f u c k", "Sh1t Happens", "Anjing Lu", "BigFuckCompany", "Kontol Jaya"]) {
    assert.notEqual(displayNameProblem(bad), null, bad);
  }
  for (const brand of ["Google", "Microsoft Indonesia", "GoogleSolutions", "PayPal Partner", "AXTO Official", "Coca Cola Fans"]) {
    assert.equal(displayNameProblem(brand), "brand", brand);
  }
  assert.equal(maskName("Ada Labs"), "A•••••");
  assert.equal(maskName(""), "—");
});

test("auction settings: the owner's terms by default — every package; unusable values keep the current ones", () => {
  const d = sanitizeAuction(null);
  assert.deepEqual([d.enabled, d.openPct, d.stepPct, d.snipeMinutes, d.payHours, d.autoPass], [true, 25, 10, 5, 48, false], "owner: +10 % of the opening bid, no automatic hand-over");
  assert.equal(d.packages.length, 103, "37 editions + 10 apps × 6 lifetime tiers + 6 suite tiers");
  assert.deepEqual(d.packages, ALL_PACKAGES);
  for (const p of d.packages) assert.ok(parsePackage(p), p);
  assert.deepEqual(LIFETIME_DEVICE_TIERS, LIFETIME_TIERS.map((t) => t.devices), "the same device tiers as the shop");
  const every = packageCatalog().flatMap((g) => g.packages.map((p) => p.key)).filter((k) => !k.endsWith(":monthly"));
  assert.deepEqual([...ALL_PACKAGES].sort(), every.sort(), "every package the shop sells (one year for editions)");
  const s = sanitizeAuction({ enabled: false, openPct: "30", stepPct: 0, payHours: 9999, autoPass: "yes", packages: ["edition:lite:yearly", "nonsense", "edition:lite:yearly", "lifetime:suite:1"] });
  assert.deepEqual([s.enabled, s.openPct, s.stepPct, s.payHours, s.autoPass], [false, 30, 10, 48, false]);
  assert.equal(sanitizeAuction({ autoPass: true }).autoPass, true);
  assert.deepEqual(s.packages, ["edition:lite:yearly", "lifetime:suite:1"]);
});

test("packages: editions and lifetime licences at today's shop price", () => {
  const e = parsePackage("edition:lite:yearly")!;
  assert.equal(e.kind, "edition");
  assert.equal(e.app, "guardian");
  assert.match(e.title, /Sentinel Lite edition, 1 year/);
  assert.equal(normalPrice(e, mergeEditionPrices(null), LIFETIME_TIERS), 99);
  assert.equal(normalPrice(e, mergeEditionPrices(JSON.stringify([{ code: "lite", yearly: 1200 }])), LIFETIME_TIERS), 1200, "admin price override");
  assert.equal(normalPrice(e, mergeEditionPrices(JSON.stringify([{ code: "lite", enabled: false }])), LIFETIME_TIERS), null, "not on sale");
  const l = parsePackage("lifetime:app:vault:5")!;
  assert.deepEqual([l.kind, l.scope, l.product, l.devices], ["lifetime", "app", "vault", 5]);
  assert.equal(normalPrice(l, mergeEditionPrices(null), LIFETIME_TIERS), 99_000);
  assert.equal(normalPrice(parsePackage("lifetime:suite:1")!, mergeEditionPrices(null), LIFETIME_TIERS), 149_000);
  assert.equal(parsePackage("lifetime:app:nope:1"), null);
  assert.equal(parsePackage("lifetime:app:vault:7"), null, "only the device tiers that are sold");
  assert.equal(parsePackage("edition:unknown:yearly"), null);
  const cat = packageCatalog();
  assert.equal(cat.length, 11, "10 apps + the suite");
  assert.ok(cat.every((g) => g.packages.length > 0));
  assert.equal(packageSlug("edition:lite:yearly"), "edition-lite-yearly");
});
