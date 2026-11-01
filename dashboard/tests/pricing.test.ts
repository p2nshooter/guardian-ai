/* AXTO — Asia market prices (REQUESTS 140, docs/PRICING-BLUEPRINT.md): the new list prices, and the one-time move
 * of price settings an admin saved before price revision 2 (their prices give way, their on/off switches stay;
 * anything saved after the revision is the admin's own and is kept). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, defaultPrices, storedPlanPrices, priceFor } from "../lib/plans";
import { EDITIONS, editionPrice, editionPricesToStore, mergeEditionPrices, storedEditionPrices } from "../lib/editions";
import { LIFETIME_TIERS, lifetimePricesToStore, mergeLifetimePrices, storedLifetimePrices } from "../lib/lifetime";
import { PRICE_REV } from "../lib/price-rev";

test("cloud plans follow the Asia market: US$5 / 12 / 39 / 149 a month, a year = 10 months", () => {
  assert.deepEqual([PLANS.starter.monthly, PLANS.pro.monthly, PLANS.business.monthly, PLANS.enterprise.monthly], [5, 12, 39, 149]);
  for (const p of Object.values(PLANS)) assert.equal(p.yearly, p.monthly * 10, `${p.id}: two months free on yearly`);
  assert.equal(priceFor(defaultPrices(), "pro", "yearly"), 120);
});

test("self-hosted editions and lifetime licences are a tenth of the old list prices", () => {
  const byCode = Object.fromEntries(EDITIONS.map((e) => [e.code, e]));
  assert.deepEqual([byCode.lite.yearly, byCode.orchestra_core.yearly, byCode.studio_starter.yearly], [99, 3_490, 49]);
  for (const e of EDITIONS) assert.ok(Math.abs(e.monthly * 10 - e.yearly) < 0.01, `${e.code}: monthly = yearly / 10`);
  assert.deepEqual(LIFETIME_TIERS.map((t) => [t.app, t.suite]), [[2_490, 14_900], [9_900, 59_000], [17_900, 99_000], [39_000, 199_000], [69_000, 349_000], [119_000, 590_000]]);
});

test("plan prices saved before the revision give way once; prices saved after it stay", () => {
  const legacy = JSON.stringify({ starter: { monthly: 19, yearly: 190 }, pro: { monthly: 49, yearly: 490 } });
  assert.deepEqual(storedPlanPrices(legacy), defaultPrices(), "old numbers are the old list prices");
  const own = JSON.stringify({ starter: { monthly: 4, yearly: 40 }, priceRev: PRICE_REV });
  assert.equal(storedPlanPrices(own).starter.monthly, 4, "the admin's own number after the revision");
  assert.equal(storedPlanPrices(own).pro.monthly, 12);
  assert.deepEqual(storedPlanPrices("{bad"), defaultPrices());
  assert.deepEqual(storedPlanPrices(null), defaultPrices());
});

test("edition prices: an old saved list keeps only its on/off switches; the new format keeps everything", () => {
  const legacy = JSON.stringify([{ code: "lite", yearly: 990, monthly: 99, enabled: true }, { code: "pro", yearly: 4_990, monthly: 499, enabled: false }]);
  const moved = storedEditionPrices(legacy);
  assert.equal(editionPrice("lite", "yearly", moved), 99, "the new list price");
  assert.equal(editionPrice("pro", "yearly", moved), null, "an edition the admin switched off stays off");
  const saved = editionPricesToStore(mergeEditionPrices(JSON.stringify([{ code: "lite", yearly: 120, monthly: 12 }])));
  assert.equal(JSON.parse(saved).priceRev, PRICE_REV);
  assert.equal(editionPrice("lite", "yearly", storedEditionPrices(saved)), 120, "a price saved after the revision stays");
});

test("lifetime prices: an old saved table gives way; a table saved after the revision stays", () => {
  const legacy = JSON.stringify(LIFETIME_TIERS.map((t) => ({ devices: t.devices, app: t.app * 10, suite: t.suite * 10 })));
  assert.deepEqual(storedLifetimePrices(legacy), LIFETIME_TIERS);
  const own = lifetimePricesToStore(mergeLifetimePrices(JSON.stringify([{ devices: 1, app: 1_990, suite: 9_900 }])));
  assert.equal(storedLifetimePrices(own)[0]!.app, 1_990);
  assert.equal(storedLifetimePrices(own)[1]!.app, 9_900);
});
