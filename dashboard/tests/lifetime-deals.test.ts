/* Lifetime Friday deals and customer offers (docs/AXTO-APPS-BLUEPRINT.md §15):
 * the calendar (every Friday, the last Friday of the month, 30/31-day months,
 * February, leap years, WIB vs UTC, DST), the best price (never stacked) and
 * the offer floor. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEAL_DEFAULTS, bestPrice, dealState, discounted, isLastFriday, mergeDealConfig, offerFloor, MAX_DEAL_PCT } from "../lib/lifetime-deals";

const WIB = DEAL_DEFAULTS;                            // Asia/Jakarta, 30 % / 50 %
const UTC = { ...DEAL_DEFAULTS, tz: "UTC" };
const at = (s: string) => new Date(s);

test("lifetime deals: last Friday of the month", () => {
  assert.equal(isLastFriday(2026, 10, 30), true, "31-day month, Friday the 30th");
  assert.equal(isLastFriday(2026, 10, 23), false);
  assert.equal(isLastFriday(2026, 7, 31), true, "Friday the 31st");
  assert.equal(isLastFriday(2026, 7, 24), false, "24 is not last when the 31st is a Friday");
  assert.equal(isLastFriday(2026, 11, 27), true, "30-day month");
  assert.equal(isLastFriday(2026, 2, 27), true, "February (28 days)");
  assert.equal(isLastFriday(2026, 2, 20), false);
  assert.equal(isLastFriday(2028, 2, 25), true, "leap-year February (29 days)");
  assert.equal(isLastFriday(2026, 10, 29), false, "a Thursday is never a deal day");
});

test("lifetime deals: an ordinary Friday is 30 %, the last Friday 50 %, other days none", () => {
  const fri = dealState(at("2026-10-09T05:00:00Z"), WIB);       // Fri 9 Oct, 12:00 WIB
  assert.equal(fri.active?.kind, "friday");
  assert.equal(fri.active?.pct, 30);
  assert.equal(fri.active?.date, "2026-10-09");
  assert.equal(fri.active?.startsAt, "2026-10-08T17:00:00.000Z", "00:00 WIB");
  assert.equal(fri.active?.endsAt, "2026-10-09T17:00:00.000Z", "23:59:59 WIB ends it");
  assert.equal(fri.next?.date, "2026-10-16", "the following Friday comes next");

  const last = dealState(at("2026-10-30T03:00:00Z"), WIB);
  assert.equal(last.active?.kind, "lastFriday");
  assert.equal(last.active?.pct, 50);
  assert.equal(last.next?.date, "2026-11-06");

  const mon = dealState(at("2026-10-05T03:00:00Z"), WIB);       // Monday
  assert.equal(mon.active, null);
  assert.equal(mon.next?.date, "2026-10-09");
  assert.equal(mon.next?.pct, 30);
  const before = dealState(at("2026-10-27T03:00:00Z"), WIB);    // Tuesday before the last Friday
  assert.equal(before.next?.kind, "lastFriday");
  assert.equal(before.next?.pct, 50);
  // Across a year end: Wed 30 Dec 2026 → Friday 1 Jan 2027 (not the last Friday of January)
  const ny = dealState(at("2026-12-30T03:00:00Z"), WIB);
  assert.equal(ny.next?.date, "2027-01-01");
  assert.equal(ny.next?.kind, "friday");
});

test("lifetime deals: the day is counted in the owner's time zone (WIB vs UTC)", () => {
  const t = at("2026-10-08T17:30:00Z");                           // Fri 00:30 WIB = Thu 17:30 UTC
  assert.equal(dealState(t, WIB).active?.kind, "friday");
  assert.equal(dealState(t, UTC).active, null);
  const u = at("2026-10-09T23:30:00Z");                           // Fri 23:30 UTC = Sat 06:30 WIB
  assert.equal(dealState(u, WIB).active, null);
  assert.equal(dealState(u, UTC).active?.kind, "friday");
  assert.equal(dealState(u, UTC).active?.endsAt, "2026-10-10T00:00:00.000Z");
  // A zone with daylight saving: Friday 13 Mar 2026 in New York starts at 04:00 UTC (EDT)
  const ny = dealState(at("2026-03-13T12:00:00Z"), { ...DEAL_DEFAULTS, tz: "America/New_York" });
  assert.equal(ny.active?.startsAt, "2026-03-13T04:00:00.000Z");
  assert.equal(ny.active?.endsAt, "2026-03-14T04:00:00.000Z");
});

test("lifetime deals: admin settings — off, 0 %, junk", () => {
  assert.equal(dealState(at("2026-10-09T05:00:00Z"), { ...WIB, enabled: false }).active, null);
  assert.equal(dealState(at("2026-10-09T05:00:00Z"), { ...WIB, enabled: false }).next, null);
  // Ordinary Fridays switched off: only the last Friday remains, and it is "next"
  const onlyLast = { ...WIB, fridayPct: 0 };
  assert.equal(dealState(at("2026-10-09T05:00:00Z"), onlyLast).active, null);
  assert.equal(dealState(at("2026-10-09T05:00:00Z"), onlyLast).next?.date, "2026-10-30");
  const c = mergeDealConfig(JSON.stringify({ fridayPct: 250, lastFridayPct: -5, tz: "Mars/Olympus", minOfferPct: 0, offerValidDays: 999, enabled: "yes" }));
  assert.equal(c.fridayPct, MAX_DEAL_PCT);
  assert.equal(c.lastFridayPct, 0);
  assert.equal(c.tz, "Asia/Jakarta", "unknown zones fall back");
  assert.equal(c.minOfferPct, 1);
  assert.equal(c.offerValidDays, 60);
  assert.equal(c.enabled, true, "non-boolean keeps the default");
  assert.deepEqual(mergeDealConfig("not json"), DEAL_DEFAULTS);
  assert.deepEqual(mergeDealConfig(null), DEAL_DEFAULTS);
});

test("lifetime deals: best price is the lowest valid one, never stacked", () => {
  const fri = dealState(at("2026-10-09T05:00:00Z"), WIB).active;
  const last = dealState(at("2026-10-30T05:00:00Z"), WIB).active;
  assert.equal(discounted(24_900, 30), 17_430);
  assert.deepEqual(bestPrice(24_900, null), { amount: 24_900, listUsd: 24_900, source: "list", pct: 0, deal: null });
  assert.equal(bestPrice(24_900, fri).amount, 17_430);
  assert.equal(bestPrice(24_900, fri).source, "deal");
  assert.equal(bestPrice(24_900, last).amount, 12_450);
  // An agreed offer lower than the deal wins; a higher one does not — and they never stack
  const low = bestPrice(24_900, fri, 15_000);
  assert.equal(low.source, "offer");
  assert.equal(low.amount, 15_000);
  assert.equal(low.pct, 40);
  const high = bestPrice(24_900, fri, 20_000);
  assert.equal(high.source, "deal");
  assert.equal(high.amount, 17_430);
  assert.equal(bestPrice(24_900, null, 20_000).amount, 20_000);
  assert.equal(bestPrice(24_900, null, 30_000).source, "list", "an offer above the list price is ignored");
});

test("lifetime offers: floor is a share of the list price", () => {
  assert.equal(offerFloor(24_900, DEAL_DEFAULTS), 9_960);
  assert.equal(offerFloor(149_000, { ...DEAL_DEFAULTS, minOfferPct: 60 }), 89_400);
});
