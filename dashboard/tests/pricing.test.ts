/* AXTO — European market prices again (REQUESTS 145, docs/PRICING-BLUEPRINT.md; the Asia prices of REQUESTS 140 are
 * withdrawn): the list prices, and the one-time move of price settings an admin saved before price revision 3 (their
 * prices give way, their on/off switches stay; anything saved after the revision is the admin's own and is kept). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, defaultPrices, storedPlanPrices, priceFor } from "../lib/plans";
import { EDITIONS, editionPrice, editionPricesToStore, mergeEditionPrices, storedEditionPrices } from "../lib/editions";
import { LIFETIME_TIERS } from "../lib/lifetime";
import { PRICE_REV } from "../lib/price-rev";

test("cloud plans follow the European market: US$19 / 49 / 199 / 999 a month, a year = 10 months", () => {
  assert.deepEqual([PLANS.starter.monthly, PLANS.pro.monthly, PLANS.business.monthly, PLANS.enterprise.monthly], [19, 49, 199, 999]);
  for (const p of Object.values(PLANS)) assert.equal(p.yearly, p.monthly * 10, `${p.id}: two months free on yearly`);
  assert.equal(priceFor(defaultPrices(), "pro", "yearly"), 490);
});

test("self-hosted editions are back at their European list prices; lifetime licences stay very expensive", () => {
  const byCode = Object.fromEntries(EDITIONS.map((e) => [e.code, e]));
  assert.deepEqual([byCode.lite.yearly, byCode.orchestra_core.yearly, byCode.studio_starter.yearly], [990, 34_900, 490]);
  for (const e of EDITIONS) assert.ok(Math.abs(e.monthly * 10 - e.yearly) < 0.01, `${e.code}: monthly = yearly / 10`);
  // Owner, 1 Nov 2026: "Harga lifetime pastikan sangat mahal jika aplikasi betul2 bisa d gunakan dan berfungsi 100%".
  assert.deepEqual(LIFETIME_TIERS.map((t) => [t.app, t.suite]), [[24_900, 149_000], [99_000, 590_000], [179_000, 990_000], [390_000, 1_990_000], [690_000, 3_490_000], [1_190_000, 5_900_000]]);
});

test("plan prices saved before the revision give way once; prices saved after it stay", () => {
  assert.equal(PRICE_REV, 3);
  const asia = JSON.stringify({ starter: { monthly: 5, yearly: 50 }, pro: { monthly: 12, yearly: 120 }, priceRev: 2 });
  assert.deepEqual(storedPlanPrices(asia), defaultPrices(), "prices saved on the Asia list give way to the European list");
  const legacy = JSON.stringify({ starter: { monthly: 29, yearly: 290 } });
  assert.deepEqual(storedPlanPrices(legacy), defaultPrices(), "a setting without a revision gives way too");
  const own = JSON.stringify({ starter: { monthly: 15, yearly: 150 }, priceRev: PRICE_REV });
  assert.equal(storedPlanPrices(own).starter.monthly, 15, "the admin's own number after the revision");
  assert.equal(storedPlanPrices(own).pro.monthly, 49);
  assert.deepEqual(storedPlanPrices("{bad"), defaultPrices());
  assert.deepEqual(storedPlanPrices(null), defaultPrices());
});

test("edition prices: an old saved list keeps only its on/off switches; the new format keeps everything", () => {
  const asia = JSON.stringify({ priceRev: 2, rows: [{ code: "lite", yearly: 99, monthly: 9.9, enabled: true }, { code: "pro", yearly: 499, monthly: 49.9, enabled: false }] });
  const moved = storedEditionPrices(asia);
  assert.equal(editionPrice("lite", "yearly", moved), 990, "the European list price");
  assert.equal(editionPrice("pro", "yearly", moved), null, "an edition the admin switched off stays off");
  const legacy = JSON.stringify([{ code: "lite", yearly: 500, monthly: 50, enabled: true }, { code: "pro", yearly: 4_990, monthly: 499, enabled: false }]);
  assert.equal(editionPrice("lite", "yearly", storedEditionPrices(legacy)), 990, "an old saved list keeps only its switches");
  assert.equal(editionPrice("pro", "yearly", storedEditionPrices(legacy)), null);
  const saved = editionPricesToStore(mergeEditionPrices(JSON.stringify([{ code: "lite", yearly: 890, monthly: 89 }])));
  assert.equal(JSON.parse(saved).priceRev, PRICE_REV);
  assert.equal(editionPrice("lite", "yearly", storedEditionPrices(saved)), 890, "a price saved after the revision stays");
});

test("fractional prices always show cents", async () => {
  const { formatUsd } = await import("../lib/plans");
  assert.equal(formatUsd(32.5), "$32.50");
  assert.equal(formatUsd(9.9), "$9.90");
  assert.equal(formatUsd(390), "$390");
});

test("lifetime licences are agreed with the admin: no self-service checkout, no automatic auction lots (REQUESTS 144)", async () => {
  const { LIFETIME_BY_ADMIN, LIFETIME_DEAL } = await import("../lib/lifetime");
  assert.equal(LIFETIME_BY_ADMIN, true);
  assert.deepEqual(LIFETIME_DEAL, { whatsapp: "+6285691234561", email: "hello@axto.io" });
  const { testData } = await import("./helpers/data");
  const { getAuctionSettings, saveAuctionSettings, ensureCycleLots, openLotNow } = await import("../lib/auction");
  const { db } = testData();
  await saveAuctionSettings(db, { ...(await getAuctionSettings(db)), enabled: true, packages: ["edition:lite:yearly", "lifetime:app:vault:1", "lifetime:suite:1"] });
  const r = await ensureCycleLots(db);
  assert.equal(r.created, 1, "only the edition lot opens by itself");
  const lots = await db.auctionLots.listAll("cycle", r.cycle, 100);
  assert.deepEqual(lots.length, 1);
  const byHand = await openLotNow(db, "lifetime:app:vault:1", "admin");
  assert.ok(!("error" in byHand), "the admin can still put a lifetime licence up by hand");
});
