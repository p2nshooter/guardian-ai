/* AXTO — Asia market prices (REQUESTS 140, docs/PRICING-BLUEPRINT.md): the new list prices, and the one-time move
 * of price settings an admin saved before price revision 2 (their prices give way, their on/off switches stay;
 * anything saved after the revision is the admin's own and is kept). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, defaultPrices, storedPlanPrices, priceFor } from "../lib/plans";
import { EDITIONS, editionPrice, editionPricesToStore, mergeEditionPrices, storedEditionPrices } from "../lib/editions";
import { LIFETIME_TIERS } from "../lib/lifetime";
import { PRICE_REV } from "../lib/price-rev";

test("cloud plans follow the Asia market: US$5 / 12 / 39 / 149 a month, a year = 10 months", () => {
  assert.deepEqual([PLANS.starter.monthly, PLANS.pro.monthly, PLANS.business.monthly, PLANS.enterprise.monthly], [5, 12, 39, 149]);
  for (const p of Object.values(PLANS)) assert.equal(p.yearly, p.monthly * 10, `${p.id}: two months free on yearly`);
  assert.equal(priceFor(defaultPrices(), "pro", "yearly"), 120);
});

test("self-hosted editions are a tenth of the old list prices; lifetime licences stay very expensive", () => {
  const byCode = Object.fromEntries(EDITIONS.map((e) => [e.code, e]));
  assert.deepEqual([byCode.lite.yearly, byCode.orchestra_core.yearly, byCode.studio_starter.yearly], [99, 3_490, 49]);
  for (const e of EDITIONS) assert.ok(Math.abs(e.monthly * 10 - e.yearly) < 0.01, `${e.code}: monthly = yearly / 10`);
  // Owner, 1 Nov 2026: "Harga lifetime pastikan sangat mahal jika aplikasi betul2 bisa d gunakan dan berfungsi 100%".
  assert.deepEqual(LIFETIME_TIERS.map((t) => [t.app, t.suite]), [[24_900, 149_000], [99_000, 590_000], [179_000, 990_000], [390_000, 1_990_000], [690_000, 3_490_000], [1_190_000, 5_900_000]]);
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
