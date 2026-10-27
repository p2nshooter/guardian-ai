/* AXTO — the AXTO-only investor round: terms are sanitised, the share is
 * proportional and capped at the pool, statements count revenue only from the
 * day the capital was verified (and only until it was returned), payouts are
 * netted month by month, and the copy says AXTO alone in every language. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { INVEST_DEFAULTS, sanitizeInvest, shareOf, pct, buildStatement } from "../lib/invest-terms";
import { INV_EN } from "../lib/invest-copy";
import { INV } from "../lib/i18n-pages/invest";
import { LANG_CODES } from "../lib/i18n-shared";

test("defaults: the 14 Oct terms for AXTO alone — US$2M round, US$50k ticket, 30 % pool, owner's WhatsApp", () => {
  assert.equal(INVEST_DEFAULTS.visible, true, "shown by default (owner, 27 Oct 2026)");
  assert.equal(INVEST_DEFAULTS.status, "open");
  assert.equal(INVEST_DEFAULTS.targetUsd, 2_000_000);
  assert.equal(INVEST_DEFAULTS.minUsd, 50_000);
  assert.equal(INVEST_DEFAULTS.poolPct, 30);
  assert.equal(INVEST_DEFAULTS.whatsapp, "+6285691234561");
});

test("sanitizeInvest keeps valid values and falls back on unusable ones", () => {
  const ok = sanitizeInvest({ status: "paused", targetUsd: "3,000,000", minUsd: 25000, poolPct: "25.5", whatsapp: "+62 856 9123 4561" });
  assert.deepEqual([ok.status, ok.targetUsd, ok.minUsd, ok.poolPct, ok.whatsapp], ["paused", 3_000_000, 25_000, 25.5, "+62 856 9123 4561"]);
  const bad = sanitizeInvest({ status: "sold", targetUsd: 5, minUsd: 9_000_000, poolPct: 140, whatsapp: "call me" });
  assert.equal(bad.status, "open");
  assert.equal(bad.targetUsd, INVEST_DEFAULTS.targetUsd);
  assert.equal(bad.minUsd, INVEST_DEFAULTS.minUsd, "a minimum above the round is refused");
  assert.equal(bad.poolPct, INVEST_DEFAULTS.poolPct);
  assert.equal(bad.whatsapp, INVEST_DEFAULTS.whatsapp);
  assert.deepEqual(sanitizeInvest(null), { ...INVEST_DEFAULTS });
  assert.equal(sanitizeInvest({ status: "closed" }, { ...INVEST_DEFAULTS, minUsd: 75_000 }).minUsd, 75_000, "keeps the current value");
});

test("shareOf: proportional to capital, capped at the whole pool", () => {
  const o = INVEST_DEFAULTS;
  assert.equal(shareOf(50_000, o), 0.0075);                 // US$50k of US$2M → 0.75 %
  assert.equal(shareOf(500_000, o), 0.075);
  assert.equal(shareOf(2_000_000, o), 0.3);
  assert.equal(shareOf(5_000_000, o), 0.3, "never more than the pool");
  assert.equal(shareOf(0, o), 0);
  assert.equal(shareOf(-1, o), 0);
  assert.equal(pct(0.0075), "0.75 %");
  assert.equal(pct(0.3), "30 %");
});

test("buildStatement: from verification to return, payouts netted per month", () => {
  const inv = { capital_usd: 100_000, verified_at: "2026-11-10T09:00:00.000Z", returned_at: "" };
  const revenue = [
    { at: "2026-11-09T23:59:00.000Z", amountUsd: 1_000 },   // before verification — not shared
    { at: "2026-11-10T09:00:00.000Z", amountUsd: 2_000 },
    { at: "2026-11-30T12:00:00.000Z", amountUsd: 3_000 },
    { at: "2026-12-05T08:00:00.000Z", amountUsd: 10_000 },
  ];
  const s = buildStatement(inv, INVEST_DEFAULTS, revenue, [{ period: "2026-11", amount_usd: 75 }]);
  assert.equal(s.share, 0.015);
  assert.deepEqual(s.months, [
    { period: "2026-11", revenueUsd: 5_000, dueUsd: 75, paidUsd: 75 },
    { period: "2026-12", revenueUsd: 10_000, dueUsd: 150, paidUsd: 0 },
  ]);
  assert.deepEqual([s.totalRevenueUsd, s.totalDueUsd, s.totalPaidUsd, s.balanceUsd], [15_000, 225, 75, 150]);

  const returned = buildStatement({ ...inv, returned_at: "2026-12-01T00:00:00.000Z" }, INVEST_DEFAULTS, revenue, []);
  assert.deepEqual(returned.months.map((m) => m.period), ["2026-11"], "nothing after the capital was returned");
  assert.equal(buildStatement({ ...inv, verified_at: "" }, INVEST_DEFAULTS, revenue, []).months.length, 0, "no verification, no share");
});

test("copy: AXTO only, no bank details, every language complete", () => {
  assert.match(INV_EN.aloneB, /xaa\.es/);
  assert.match(INV_EN.faq.find(([q]) => /xaa\.es/.test(q))![1], /separate/);
  const all = JSON.stringify(INV);
  for (const secret of ["2090571495", "2090571484", "BNINIDJA"]) assert.ok(!all.includes(secret), `no ${secret} on the public page`);
  assert.deepEqual(Object.keys(INV).sort(), [...LANG_CODES].sort());
  for (const l of LANG_CODES) {
    assert.ok(INV[l].howLead.includes("{pool}") && INV[l].howLead.includes("{target}"), `${l}.howLead placeholders`);
    assert.ok(INV[l].form.ok.includes("{amount}"), `${l}.form.ok placeholder`);
    assert.ok(INV[l].me.noneB.includes("{email}"), `${l}.me.noneB placeholder`);
  }
});

test("sanitizeInvest: the round is shown unless the switch hides it (§26.4, §27.4)", () => {
  // Terms saved before the switch existed carry no `visible` field: they read as shown (the default).
  assert.equal(sanitizeInvest({ status: "open", targetUsd: 2_000_000, minUsd: 50_000, poolPct: 30, whatsapp: "+6285691234561" }).visible, true);
  assert.equal(sanitizeInvest({ visible: false }).visible, false);
  assert.equal(sanitizeInvest({ visible: "no" }).visible, true, "only a real boolean switches it");
  assert.equal(sanitizeInvest({ visible: "no" }, { ...INVEST_DEFAULTS, visible: false }).visible, false, "an unusable value keeps the current one");
  assert.equal(sanitizeInvest(null).visible, true);
});
