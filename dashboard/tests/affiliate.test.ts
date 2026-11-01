/* AXTO — the partner programmes' switches and the affiliate programme
 * (docs/BUSINESS-MASTER-BLUEPRINT.md §3, §4, §7.1, §7.4; REQUESTS 131): defaults and
 * sanitising, all three shown by default (hidden ones vanish from the public terms and
 * the chat's facts), applications to the reseller and white-label programmes, joining, links and sign-ups
 * (never to oneself), commissions created once per paid order (test money, the site
 * sale and old referrals never pay), the refund window, reversal and clawback, the
 * monthly payout — by PayPal on its own or with one approval — and its idempotence.
 * Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { testData } from "./helpers/data";
import { newOrder } from "../lib/billing/order-doc";
import type { Data } from "../lib/data";
import {
  PROGRAM_DEFAULTS, TERMS_REV, anyShown, isOpen, isShown, programFacts, publicPrograms, reviseStoredPrograms, sanitizePrograms, savePrograms, tierFor, getPrograms,
} from "../lib/programs";
import { PARTNERS } from "../lib/i18n-pages/partners";
import { usd as usdFmt, whitelabelClients, whitelabelVars, resellerVars } from "../lib/partners-copy";
import { applyPartner, setApplicationStatus } from "../lib/partners";
import { FORBIDDEN_FACTS, publicKnowledge } from "../lib/support/ai";
import {
  affiliateStats, affiliateTick, attributeSignup, commissionForOrder, commissionRefunded, failPayout, joinAffiliate, mailbox,
  markPayoutPaid, payoutDetails, payoutLabel, recordClick, reviewCommission, setPayout,
} from "../lib/affiliate";

const DAY = 86_400_000;
const T0 = Date.parse("2026-11-01T10:00:00Z");
const enc = async (_n: string, v: unknown) => JSON.stringify(v);
const dec = async <T,>(_n: string, b: string) => JSON.parse(b) as T;

test("programmes: defaults, sanitising, all shown by default, hidden ones vanish", () => {
  const p = sanitizePrograms({});
  assert.deepEqual(p.affiliate.commissionPct, 20);
  assert.equal(p.whitelabel.entryUsd, 20_000, "REQUESTS 140 (Asia prices)");
  assert.equal(p.reseller.tiers[1]!.pct, 30);
  const bad = sanitizePrograms({ affiliate: { commissionPct: 90, holdDays: 2 }, reseller: { tiers: [{ fromUsd: 10, pct: 5 }], includedCreditUsd: 9_999_999, entryUsd: 1000 } });
  assert.equal(bad.affiliate.commissionPct, 20, "above the 50 % ceiling");
  assert.equal(bad.affiliate.holdDays, 30, "under the 14-day refund window");
  assert.deepEqual(bad.reseller.tiers, PROGRAM_DEFAULTS.reseller.tiers, "tiers must start at 0");
  assert.equal(bad.reseller.includedCreditUsd, 1000, "the included credit never exceeds the fee");
  assert.equal(sanitizePrograms({ whitelabel: { tiers: [{ fromUsd: 0, pct: 50 }, { fromUsd: 10, pct: 40 }] } }).whitelabel.tiers[1]!.pct, 55, "a discount never falls as volume rises");
  assert.equal(isShown(p, "affiliate"), true);
  assert.equal(isShown(p, "reseller"), true, "shown by default (owner, 29 Oct 2026)");
  assert.equal(isShown(p, "whitelabel"), true);
  assert.equal(anyShown(sanitizePrograms({ affiliate: { visible: false }, reseller: { visible: false }, whitelabel: { visible: false } })), false);
  const hidden = sanitizePrograms({ affiliate: { visible: false } });
  assert.equal(isShown(hidden, "affiliate"), false);
  assert.equal(isOpen(sanitizePrograms({ affiliate: { accepting: false } }), "affiliate"), false);
  assert.equal(isOpen(sanitizePrograms({ affiliate: { frozen: true } }), "affiliate"), false);
  const pub = publicPrograms(p);
  assert.ok(pub.affiliate && pub.reseller && pub.whitelabel);
  assert.equal(pub.affiliate.portal, true);
  assert.equal(pub.reseller.portal, false, "its portal ships in P4: applications only");
  assert.ok(!("reviewAboveUsd" in pub.affiliate!) && !("paypalPayouts" in pub.affiliate!) && !("aiMarkup" in pub.whitelabel!), "internal settings stay internal");
  const onlyAff = publicPrograms(sanitizePrograms({ reseller: { visible: false }, whitelabel: { visible: false } }));
  assert.ok(onlyAff.affiliate && onlyAff.reseller === null && onlyAff.whitelabel === null);
  assert.equal(tierFor(p.whitelabel.tiers, 0).pct, 50);
  assert.equal(tierFor(p.whitelabel.tiers, 100_000).pct, 55);
  assert.equal(tierFor(p.whitelabel.tiers, 5_000_000).pct, 60);
});

test("payout destinations and mailboxes", () => {
  assert.equal(mailbox("Ana.Lopez+promo@GoogleMail.com"), "analopez@gmail.com");
  assert.equal(mailbox("ana.lopez+x@example.com"), "ana.lopez@example.com");
  assert.ok("error" in payoutDetails({ method: "usdt", usdtAddress: "0xabc" }));
  const u = payoutDetails({ method: "usdt", usdtAddress: "TQ1aBcDeFgHiJkLmNoPqRsTuVwXyZ12345" });
  assert.ok(!("error" in u));
  assert.equal(payoutLabel(u as any), "USDT (TRC20) TQ1a…Z12345");
  const w = payoutDetails({ method: "wire", bankName: "BNI", bankHolder: "Ana", bankAccount: "1234 5678 90", bankSwift: "bniniDJA", bankCountry: "Indonesia" });
  assert.ok(!("error" in w) && (w as any).swift === "BNINIDJA");
  assert.equal(payoutLabel(w as any), "BNI ••••7890");
  assert.equal(payoutLabel(payoutDetails({ method: "paypal", paypalEmail: "ana@example.com" }) as any), "PayPal a•••@example.com");
});

const AFF = { sub: "u_aff", email: "ana@example.com", name: "Ana Lopez" };
async function paid(db: Data, id: string, userId: string, usd: number, at: number, extra: Partial<Parameters<typeof newOrder>[0]> = {}) {
  await db.orders.create(newOrder({ id, user_id: userId, email: `${userId}@example.com`, plan: "pro", cycle: "monthly", amount_usd: usd, gateway: "paypal", ...extra }));
  return db.orders.update(id, (o) => ({ ...o, status: "paid", paid_at: new Date(at).toISOString() }));
}
async function setup() {
  const { db } = testData();
  const aff = await joinAffiliate(db, AFF, "198.51.100.7", T0);
  assert.ok(!("error" in aff));
  return { db, aff };
}

test("joining: once per member, a unique code, never for admins or while closed", async () => {
  const { db, aff } = await setup();
  assert.match(aff.code, /^analope[a-z2-9]{4}$/);
  const again = await joinAffiliate(db, AFF, "198.51.100.7", T0 + 1);
  assert.ok(!("error" in again) && again.code === aff.code, "joining twice returns the same affiliate");
  assert.deepEqual(await joinAffiliate(db, { sub: "u_adm", email: "owner@axto.io", role: "admin" }, "", T0), { error: "admin" });
  await savePrograms(db, sanitizePrograms({ affiliate: { accepting: false } }));
  assert.deepEqual(await joinAffiliate(db, { sub: "u_new", email: "new@example.com" }, "", T0), { error: "closed" });
  assert.ok(!("error" in (await joinAffiliate(db, AFF, "", T0))), "an existing affiliate keeps working while new sign-ups are closed");
  const r = await setPayout(db, AFF.sub, { method: "paypal", paypalEmail: "ana@example.com" }, enc, T0);
  assert.ok(!("error" in r) && r.payout_label === "PayPal a•••@example.com" && !r.payout_label.includes("ana@"));
});

test("links and sign-ups: tied once, never to oneself, the affiliate's own network is flagged", async () => {
  const { db, aff } = await setup();
  assert.equal(await recordClick(db, "NOPE!", "1.1.1.1", T0), null);
  assert.equal((await recordClick(db, aff.code, "203.0.113.5", T0))?.id, aff.id);
  assert.equal(await attributeSignup(db, { id: "u_self", email: "ana+2@example.com" }, aff.code, "203.0.113.5", T0), null, "the same mailbox is oneself");
  const r = await attributeSignup(db, { id: "u_bob", email: "bob@example.com" }, aff.code, "203.0.113.5", T0);
  assert.ok(r && r.affiliate_id === aff.id && r.flagged === "" && r.until === "2027-11-01T10:00:00.000Z");
  assert.equal(await attributeSignup(db, { id: "u_bob", email: "bob@example.com" }, aff.code, "203.0.113.5", T0 + 5), null, "only once");
  const same = await attributeSignup(db, { id: "u_cat", email: "cat@example.com" }, aff.code, "198.51.100.7", T0);
  assert.equal(same?.flagged, "same_network");
  const s = await affiliateStats(db, aff.id, T0 + DAY);
  assert.equal(s.clicks30, 1);
  assert.equal(s.referrals, 2);
});

test("commissions: once per paid order; test money, the site sale and old referrals never pay", async () => {
  const { db, aff } = await setup();
  await attributeSignup(db, { id: "u_bob", email: "bob@example.com" }, aff.code, "203.0.113.5", T0);
  const o = await paid(db, "ord_1", "u_bob", 490, T0 + DAY);
  const c = await commissionForOrder(db, o, T0 + DAY);
  assert.ok(c && c.amount_usd === 98 && c.status === "held" && c.hold_until === new Date(T0 + 31 * DAY).toISOString());
  assert.equal((await commissionForOrder(db, o, T0 + DAY))?.id, c.id, "the same order never earns twice");
  assert.equal(await commissionForOrder(db, await paid(db, "ord_2", "u_bob", 99, T0 + DAY, { meta: JSON.stringify({ env: "sandbox" }) })), null);
  assert.equal(await commissionForOrder(db, await paid(db, "ord_3", "u_bob", 10_000_000, T0 + DAY, { plan: "acquisition", cycle: "once" })), null);
  assert.equal(await commissionForOrder(db, await paid(db, "ord_4", "u_bob", 99, T0 + 400 * DAY)), null, "after 12 months");
  assert.equal(await commissionForOrder(db, await paid(db, "ord_5", "u_stranger", 99, T0 + DAY)), null, "not referred");
  const big = await commissionForOrder(db, await paid(db, "ord_6", "u_bob", 9_990 * 2, T0 + DAY));
  assert.equal(big?.status, "review", "a large commission waits for one look");
  const fee = await commissionForOrder(db, await paid(db, "ord_7", "u_bob", 5_000, T0 + DAY, { plan: "reseller", cycle: "once" }));
  assert.equal(fee?.kind, "partner_fee");
  assert.equal(fee?.amount_usd, 500, "10 % of a partner's entry fee");
});

test("the clock: hold, refund window, monthly payout with one approval, clawback", async () => {
  const { db, aff } = await setup();
  await setPayout(db, AFF.sub, { method: "wire", bankName: "BNI", bankHolder: "Ana", bankAccount: "1234567890", bankSwift: "BNINIDJA", bankCountry: "Indonesia" }, enc, T0);
  await attributeSignup(db, { id: "u_bob", email: "bob@example.com" }, aff.code, "203.0.113.5", T0);
  const a = await commissionForOrder(db, await paid(db, "ord_a", "u_bob", 490, T0));
  const b = await commissionForOrder(db, await paid(db, "ord_b", "u_bob", 190, T0));
  assert.ok(a && b);
  // Still inside the refund window: nothing moves.
  assert.deepEqual(await affiliateTick(db, { decrypt: dec }, T0 + 10 * DAY), { matured: 0, reversed: 0, payouts: 0, paid: 0, failed: 0 });
  // Order b is refunded before the window closes.
  await db.orders.update("ord_b", (o) => ({ ...o, status: "refunded" }));
  const day31 = Date.parse("2026-12-05T09:00:00Z");
  const t = await affiliateTick(db, { decrypt: dec }, day31);
  assert.equal(t.matured, 1);
  assert.equal(t.reversed, 1);
  assert.equal(t.payouts, 1);
  const po = (await db.affPayouts.get(`po_${aff.id}_202612`))!;
  assert.equal(po.status, "approval", "a wire waits for the owner's one approval");
  assert.equal(po.amount_usd, 98);
  assert.equal((await affiliateTick(db, { decrypt: dec }, day31 + 3600_000)).payouts, 0, "one payout per month");
  const done = await markPayoutPaid(db, po.id, "BNI-REF-1", "owner", day31 + 7200_000);
  assert.ok(!("error" in done) && done.status === "paid");
  assert.equal((await db.commissions.get(a.id))?.status, "paid");
  // A refund after payment is clawed back from the next payout.
  assert.equal(await commissionRefunded(db, "ord_a", day31 + DAY), "clawback");
  assert.equal((await db.commissions.get(`${a.id}_cb`))?.amount_usd, -98);
  const s = await affiliateStats(db, aff.id, day31 + DAY);
  assert.equal(s.paid, 98);
  assert.equal(s.payable, -98);
});

test("PayPal payouts run by themselves when enabled; a failure releases the commissions", async () => {
  const { db, aff } = await setup();
  await savePrograms(db, sanitizePrograms({ affiliate: { paypalPayouts: true } }));
  await setPayout(db, AFF.sub, { method: "paypal", paypalEmail: "ana@example.com" }, enc, T0);
  await attributeSignup(db, { id: "u_bob", email: "bob@example.com" }, aff.code, "203.0.113.5", T0);
  await commissionForOrder(db, await paid(db, "ord_p", "u_bob", 990, T0));
  const sent: any[] = [];
  const when = Date.parse("2026-12-06T00:00:00Z");
  const t = await affiliateTick(db, { decrypt: dec, paypal: async (p) => (sent.push(p), { batchId: "PPB-1" }) }, when);
  assert.equal(t.paid, 1);
  assert.deepEqual(sent, [{ id: `po_${aff.id}_202612`, email: "ana@example.com", amountUsd: 198, note: "AXTO affiliate commissions 202612" }]);
  assert.equal((await db.affPayouts.get(`po_${aff.id}_202612`))?.reference, "PPB-1");

  const { db: db2, aff: aff2 } = await setup();
  await savePrograms(db2, sanitizePrograms({ affiliate: { paypalPayouts: true } }));
  await setPayout(db2, AFF.sub, { method: "paypal", paypalEmail: "ana@example.com" }, enc, T0);
  await attributeSignup(db2, { id: "u_bob", email: "bob@example.com" }, aff2.code, "203.0.113.5", T0);
  const c = await commissionForOrder(db2, await paid(db2, "ord_q", "u_bob", 990, T0));
  const t2 = await affiliateTick(db2, { decrypt: dec, paypal: async () => { throw new Error("PayPal payout refused (403)"); } }, when);
  assert.equal(t2.failed, 1);
  const cc = await db2.commissions.get(c!.id);
  assert.equal(cc?.status, "payable");
  assert.equal(cc?.payout_id, "", "released for the next payout");
});

test("review, reversal inside a waiting payout, and the frozen switch", async () => {
  const { db, aff } = await setup();
  await setPayout(db, AFF.sub, { method: "usdt", usdtAddress: "TQ1aBcDeFgHiJkLmNoPqRsTuVwXyZ12345" }, enc, T0);
  await attributeSignup(db, { id: "u_cat", email: "cat@example.com" }, aff.code, "198.51.100.7", T0);   // same network → review
  const c = await commissionForOrder(db, await paid(db, "ord_r", "u_cat", 490, T0));
  assert.equal(c?.status, "review");
  const ok = await reviewCommission(db, c!.id, true, "owner", T0 + 40 * DAY);
  assert.ok(!("error" in ok) && ok.status === "payable");
  const d = await commissionForOrder(db, await paid(db, "ord_s", "u_cat", 990, T0));
  await reviewCommission(db, d!.id, true, "owner", T0 + 40 * DAY);
  await savePrograms(db, sanitizePrograms({ affiliate: { frozen: true } }));
  assert.equal((await affiliateTick(db, { decrypt: dec }, Date.parse("2026-12-10T00:00:00Z"))).payouts, 0, "frozen: no payouts");
  await savePrograms(db, sanitizePrograms({}));
  await affiliateTick(db, { decrypt: dec }, Date.parse("2026-12-10T00:00:00Z"));
  const po = (await db.affPayouts.get(`po_${aff.id}_202612`))!;
  assert.equal(po.amount_usd, 296);
  assert.equal(await commissionRefunded(db, "ord_s", Date.parse("2026-12-11T00:00:00Z")), "reversed");
  const after = (await db.affPayouts.get(po.id))!;
  assert.equal(after.amount_usd, 98, "the waiting payout shrinks by the reversed commission");
  assert.deepEqual(after.commission_ids, [c!.id]);
  const f = await failPayout(db, po.id, "address rejected", "owner");
  assert.ok(!("error" in f) && f.status === "failed");
  assert.equal((await db.commissions.get(c!.id))?.payout_id, "");
  assert.ok((await getPrograms(db)).affiliate.visible);
});

test("chat facts: only shown programmes, only public terms, no company secrets", async () => {
  const all = programFacts(sanitizePrograms({}), "https://axto.io");
  assert.match(all, /Affiliate programme/);
  assert.match(all, /Reseller programme/);
  assert.match(all, /White-label programme/);
  assert.match(all, /US\$20,000/);
  assert.match(all, /bank wire, escrow or crypto/, "the entry fee is never paid by a reversible method (§4.3 no. 4)");
  assert.match(all, /valid 24 months/);
  assert.match(all, /continue directly with AXTO/, "the continuity promise");
  assert.ok(!/academy|tier 2|tier-2/i.test(all), "no promise of human staff (zero-touch)");
  const none = programFacts(sanitizePrograms({ whitelabel: { visible: false } }), "https://axto.io");
  assert.ok(!/White-label programme|20,000|white-label/i.test(none.replace(/reseller's or white-label partner's/g, "")), "a hidden programme is not in the chat's facts");
  assert.equal(programFacts(sanitizePrograms({ affiliate: { visible: false }, reseller: { visible: false }, whitelabel: { visible: false } }), "https://axto.io"), "");
  const { db } = testData();
  const k = await publicKnowledge(db);
  assert.match(k, /Partner programmes/);
  for (const term of FORBIDDEN_FACTS) assert.ok(!k.toLowerCase().includes(term.toLowerCase()), `the knowledge pack must not mention "${term}"`);
  assert.ok(!k.includes(`${PROGRAM_DEFAULTS.whitelabel.aiMarkup}×`) && !/ai markup/i.test(k), "the AI markup stays internal");
});

test("applications: reseller and white label, once per member, closed when not accepting", async () => {
  const { db } = testData();
  const u = { sub: "u-app", email: "app@example.com" };
  const base = { name: "Ana Partner", company: "Partner Co", country: "Germany", ack: true };
  assert.deepEqual(await applyPartner(db, u, { ...base, program: "nope" }, "1.1.1.1"), { error: "program" });
  assert.deepEqual(await applyPartner(db, u, { ...base, program: "reseller", ack: false }, "1.1.1.1"), { error: "ack" });
  assert.deepEqual(await applyPartner(db, u, { ...base, program: "reseller", company: "" }, "1.1.1.1"), { error: "company" });
  assert.deepEqual(await applyPartner(db, { ...u, role: "admin" }, { ...base, program: "reseller" }, "1.1.1.1"), { error: "admin" });
  const a = await applyPartner(db, u, { ...base, program: "whitelabel", website: "partner.example", languages: "German" }, "1.1.1.1");
  assert.ok(!("error" in a) && a.created && a.app.id === "whitelabel_u-app" && a.app.website === "https://partner.example" && a.app.ip !== "1.1.1.1");
  const again = await applyPartner(db, u, { ...base, program: "whitelabel", company: "Other" }, "1.1.1.1");
  assert.ok(!("error" in again) && !again.created && again.app.company === "Partner Co", "one application per member and programme");
  const r = await applyPartner(db, u, { ...base, program: "reseller" }, "1.1.1.1");
  assert.ok(!("error" in r) && r.created && r.app.languages === "", "the second language is a white-label field");
  await savePrograms(db, sanitizePrograms({ reseller: { accepting: false } }));
  assert.deepEqual(await applyPartner(db, { sub: "u-2", email: "b@example.com" }, { ...base, program: "reseller" }, ""), { error: "closed" });
  const st = await setApplicationStatus(db, "whitelabel_u-app", "invited", "portal opens in P5");
  assert.ok(!("error" in st) && st.status === "invited");
  assert.ok("error" in (await setApplicationStatus(db, "whitelabel_u-app", "approved", "")));
  assert.equal((await db.partnerApps.list("program", "whitelabel")).entries[0]!.meta.status, "invited");
});

/* ---- the white-label re-check (REQUESTS 134, BUSINESS-MASTER-BLUEPRINT §4.3) ------------------------------- */

test("white label, revised: lower entry, a guaranteed yearly commitment, credit that expires, demo licences, continuity", () => {
  const w = PROGRAM_DEFAULTS.whitelabel;
  assert.deepEqual(
    { entry: w.entryUsd, credit: w.includedCreditUsd, annual: w.annualUsd, reduced: w.annualReducedUsd, reducedFrom: w.annualReducedFromUsd, min: w.minAnnualUsd },
    { entry: 20_000, credit: 7_500, annual: 8_000, reduced: 4_000, reducedFrom: 85_000, min: 18_000 });
  assert.deepEqual(w.tiers, [{ fromUsd: 0, pct: 50 }, { fromUsd: 50_000, pct: 55 }, { fromUsd: 170_000, pct: 60 }]);
  assert.equal(w.maxCombinedDiscountPct, 65);
  assert.equal(w.aiMarkup, 2.5, "Manage AI keeps a 60 % margin");
  assert.deepEqual([w.creditMonths, w.demoLicences, w.demoDays, w.continuityDays], [24, 10, 30, 30]);
  assert.equal(PROGRAM_DEFAULTS.reseller.creditMonths, 24);
  // AXTO's guaranteed money per partner: the fee up front, then platform fee + minimum purchases every year.
  assert.equal(w.annualUsd + w.minAnnualUsd, 26_000);
  // The partner breaks even on the first year's net brand cost with 70 Business clients ($390 a year) at the first tier.
  assert.equal(whitelabelClients(w, 390), 70);
  const v = whitelabelVars(publicPrograms(sanitizePrograms({})).whitelabel!, usdFmt, 390);
  assert.equal(v.gain, "$13,650");
  assert.ok(Number(v.gain.replace(/[$,]/g, "")) > w.entryUsd - w.includedCreditUsd, "the example really covers the net cost");
  assert.equal(v.clients, "70");
  // Values out of range fall back.
  const bad = sanitizePrograms({ whitelabel: { creditMonths: 2, demoLicences: 500, demoDays: 1, continuityDays: 999 } }).whitelabel;
  assert.deepEqual([bad.creditMonths, bad.demoLicences, bad.demoDays, bad.continuityDays], [24, 10, 30, 30]);
});

test("white label, revised: stored settings move once to the new numbers; the admin's later numbers stay", async () => {
  const old = { whitelabel: { visible: false, accepting: true, entryUsd: 150_000, includedCreditUsd: 50_000, annualUsd: 48_000, minAnnualUsd: 60_000,
    tiers: [{ fromUsd: 0, pct: 50 }, { fromUsd: 250_000, pct: 55 }, { fromUsd: 1_000_000, pct: 60 }], maxCombinedDiscountPct: 60 },
    reseller: { visible: true, accepting: false, entryUsd: 5_000, includedCreditUsd: 2_500, annualUsd: 1_200 }, affiliate: { commissionPct: 25 } };
  const moved = sanitizePrograms(reviseStoredPrograms(old));
  assert.equal(moved.whitelabel.entryUsd, 20_000);
  assert.equal(moved.whitelabel.minAnnualUsd, 18_000);
  assert.equal(moved.whitelabel.tiers[1]!.fromUsd, 50_000);
  assert.deepEqual([moved.reseller.entryUsd, moved.reseller.includedCreditUsd, moved.reseller.annualUsd], [1_500, 750, 360], "REQUESTS 140: reseller money terms move too");
  assert.equal(moved.reseller.accepting, false, "the reseller switches are kept");
  assert.equal(moved.whitelabel.visible, false, "the switches are kept");
  assert.equal(moved.whitelabel.maxCombinedDiscountPct, 60, "numbers outside the revision are kept");
  assert.equal(moved.affiliate.commissionPct, 25, "other programmes are untouched");
  const own = { ...old, termsRev: TERMS_REV };
  assert.equal(reviseStoredPrograms(own), own);
  const { db } = testData();
  await db.config.set("programs", JSON.stringify(old));
  assert.equal((await getPrograms(db)).whitelabel.entryUsd, 20_000);
  await savePrograms(db, { ...(await getPrograms(db)), whitelabel: { ...(await getPrograms(db)).whitelabel, entryUsd: 75_000 } });
  assert.equal(JSON.parse((await db.config.get("programs"))!).termsRev, TERMS_REV);
  assert.equal((await getPrograms(db)).whitelabel.entryUsd, 75_000, "the admin's own number stays");
});

test("partner pages, every language: same shape as English, the new terms filled, no PayPal entry fee, no human-staff promise", () => {
  const en = PARTNERS.en;
  const wv = whitelabelVars(publicPrograms(sanitizePrograms({})).whitelabel!, usdFmt, 1990);
  const rv = resellerVars(publicPrograms(sanitizePrograms({})).reseller!, usdFmt, 49);
  const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k]! : m));
  for (const [lang, t] of Object.entries(PARTNERS)) {
    assert.equal(t.reseller.terms.length, en.reseller.terms.length, `${lang}: reseller terms`);
    assert.equal(t.whitelabel.terms.length, en.whitelabel.terms.length, `${lang}: white-label terms`);
    assert.equal(t.whitelabel.included.length, en.whitelabel.included.length, `${lang}: included`);
    assert.equal(t.whitelabel.faq.length, en.whitelabel.faq.length, `${lang}: white-label FAQ`);
    const wl = JSON.stringify([t.whitelabel.terms, t.whitelabel.included, t.whitelabel.example, t.whitelabel.steps, t.whitelabel.faq]);
    for (const k of ["{creditMonths}", "{demo}", "{demoDays}", "{continuity}", "{clients}"]) assert.ok(wl.includes(k), `${lang}: white label uses ${k}`);
    assert.ok(JSON.stringify(t.reseller.terms).includes("{creditMonths}"), `${lang}: reseller credit validity`);
    // Every placeholder in the white-label and reseller copy has a value.
    const left = (fill(wl, wv) + fill(JSON.stringify([t.reseller.terms, t.reseller.steps, t.reseller.faq, t.reseller.example]), rv)).match(/\{\w+\}/g);
    assert.equal(left, null, `${lang}: unfilled ${left}`);
    const pay = JSON.stringify([t.reseller.steps, t.whitelabel.steps]);
    assert.ok(!pay.includes("PayPal"), `${lang}: entry fees are wire, escrow or crypto only`);
    assert.ok(!/academy|Akademi|akademi|Akademie|académie|accademia|学院|アカデミー|अकादमी|أكاديمية/.test(JSON.stringify(t)), `${lang}: no academy promise (zero-touch)`);
    assert.ok(!/350/.test(t.whitelabel.example), `${lang}: the old 350-client example is gone`);
  }
});
