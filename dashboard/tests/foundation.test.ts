/* AXTO v3 — foundation unit tests (node:test via tsx). Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, PLAN_ORDER, addPeriod, mergePrices, defaultPrices, planForPromptLevel, planForApp, limitsFor, atLeast, MANAGED_PLANS } from "../lib/plans";
import { computeNewPeriod } from "../lib/billing/activate";
import { stripeVerify, midtransVerify, nowpaymentsVerify, xenditVerify } from "../lib/billing/providers";
import { generateLicenseKey, productFromKey, SELF_HOSTED } from "../lib/selfhosted";
import { endpointProblem, readSse, toTextStream } from "../lib/ai/providers";
import { CLOUD_APPS } from "../lib/apps";
import { toIdr } from "../lib/billing/gateways";

import * as auth from "../lib/auth";

// lib/auth reads JWT_SECRET lazily, so setting it here (before any test runs) is enough.
process.env.JWT_SECRET = "test-secret-for-unit-tests-only-0123456789";

const enc = (s: string) => new TextEncoder().encode(s);
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
async function hmac(alg: string, key: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", enc(key), { name: "HMAC", hash: alg }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc(msg)));
}

test("plans: ordered, priced, consistent", () => {
  assert.deepEqual(PLAN_ORDER, ["starter", "pro", "business", "enterprise"]);
  let prev = 0;
  for (const id of PLAN_ORDER) {
    const p = PLANS[id];
    assert.ok(p.monthly > prev, `${id} monthly increases`);
    assert.equal(p.yearly, p.monthly * 10, `${id} yearly = 10x monthly`);
    assert.ok(p.limits.apps.every((a) => CLOUD_APPS.some((c) => c.slug === a)), `${id} apps exist`);
    prev = p.monthly;
  }
  assert.equal(limitsFor("none").apps.join(), "prompts");
  assert.equal(PLANS.enterprise.limits.selfHostedApps, -1);
  assert.equal(PLANS.business.limits.selfHostedApps, 3);
  assert.equal(PLANS.pro.limits.selfHostedApps, 0);
  assert.ok(atLeast("pro", "starter") && !atLeast("starter", "pro"));
  assert.ok(MANAGED_PLANS.length > 0);
});

test("plans: every cloud app is sold by some plan; gating helpers", () => {
  for (const a of CLOUD_APPS) assert.ok(PLAN_ORDER.some((id) => PLANS[id].limits.apps.includes(a.slug)), `${a.slug} is sold by a plan`);
  assert.equal(CLOUD_APPS.length, 7);
  assert.equal(planForApp("compliance"), "pro");
  assert.equal(planForApp("legal"), "starter");
  assert.equal(planForPromptLevel("basic"), "none");
  assert.equal(planForPromptLevel("elite"), "business");
});

test("addPeriod: calendar months, clamps month ends", () => {
  assert.equal(addPeriod(new Date("2026-01-31T10:00:00Z"), "monthly").toISOString(), "2026-02-28T10:00:00.000Z");
  assert.equal(addPeriod(new Date("2026-03-15T00:00:00Z"), "monthly").toISOString(), "2026-04-15T00:00:00.000Z");
  assert.equal(addPeriod(new Date("2024-02-29T00:00:00Z"), "yearly").toISOString(), "2025-02-28T00:00:00.000Z");
});

test("mergePrices: ignores junk, accepts valid overrides", () => {
  const t = mergePrices(JSON.stringify({ pro: { monthly: 59, yearly: -3 }, starter: { monthly: "abc" } }));
  assert.equal(t.pro.monthly, 59);
  assert.equal(t.pro.yearly, defaultPrices().pro.yearly);
  assert.equal(t.starter.monthly, 5);
  assert.deepEqual(mergePrices("{not json"), defaultPrices());
});

test("proration: renewal stacks, upgrade converts remaining value into time", () => {
  const at = new Date("2026-09-01T00:00:00Z");
  const none = computeNewPeriod(null, "pro", "monthly", at);
  assert.equal(none.end.toISOString(), "2026-10-01T00:00:00.000Z");
  const renew = computeNewPeriod({ plan: "pro", cycle: "monthly", status: "active", current_period_end: "2026-09-20T00:00:00Z" }, "pro", "monthly", at);
  assert.equal(renew.end.toISOString(), "2026-10-20T00:00:00.000Z");
  // 19 days left on Starter ($5/mo) → upgrade to Pro ($12/mo) credits 19*5/12 ≈ 7.92 days
  const up = computeNewPeriod({ plan: "starter", cycle: "monthly", status: "active", current_period_end: "2026-09-20T00:00:00Z" }, "pro", "monthly", at);
  assert.ok(Math.abs(up.creditDays - 7.92) < 0.11, `credit ${up.creditDays}`);
  // Downgrade gives more days, never fewer than a plain new period.
  const down = computeNewPeriod({ plan: "pro", cycle: "monthly", status: "active", current_period_end: "2026-09-20T00:00:00Z" }, "starter", "monthly", at);
  assert.ok(down.creditDays > 19);
  const expired = computeNewPeriod({ plan: "pro", cycle: "monthly", status: "active", current_period_end: "2026-08-01T00:00:00Z" }, "pro", "yearly", at);
  assert.equal(expired.end.toISOString(), "2027-09-01T00:00:00.000Z");
});

test("webhook signatures: stripe / midtrans / nowpayments / xendit", async () => {
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const t = Math.floor(Date.now() / 1000);
  const good = await hmac("SHA-256", "whsec_test", `${t}.${payload}`);
  assert.ok(await stripeVerify(payload, `t=${t},v1=${good}`, "whsec_test"));
  assert.ok(!(await stripeVerify(payload, `t=${t},v1=${good.replace(/.$/, (c) => (c === "0" ? "1" : "0"))}`, "whsec_test")));
  assert.ok(!(await stripeVerify(payload, `t=${t - 1000},v1=${good}`, "whsec_test")), "replay window");

  const n = { order_id: "ord_1", status_code: "200", gross_amount: "825000.00" };
  const sig = hex(await crypto.subtle.digest("SHA-512", enc(`ord_1200825000.00SK`)));
  assert.ok(await midtransVerify({ ...n, signature_key: sig }, { server_key: "SK" }));
  assert.ok(!(await midtransVerify({ ...n, signature_key: sig }, { server_key: "OTHER" })));

  const body = { payment_status: "finished", order_id: "ord_1", price_amount: 49, nested: { b: 1, a: 2 } };
  const sorted = JSON.stringify({ nested: { a: 2, b: 1 }, order_id: "ord_1", payment_status: "finished", price_amount: 49 });
  const npSig = await hmac("SHA-512", "ipn", sorted);
  assert.ok(await nowpaymentsVerify(body, npSig, { ipn_secret: "ipn" }));
  assert.ok(!(await nowpaymentsVerify(body, npSig, { ipn_secret: "nope" })));

  assert.ok(xenditVerify("tok", { webhook_token: "tok" }));
  assert.ok(!xenditVerify("tok2", { webhook_token: "tok" }));
  assert.ok(!xenditVerify(null, { webhook_token: "tok" }));
});

test("licence keys: engine-compatible format for all 10 products", async () => {
  assert.equal(SELF_HOSTED.length, 10);
  for (const p of SELF_HOSTED) {
    const k = await generateLicenseKey(p.slug);
    assert.match(k, new RegExp(`^${p.keyPrefix}-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$`));
    assert.equal(productFromKey(k), p.slug);
    const h = await generateLicenseKey(p.slug, "hmac-secret");
    assert.match(h, new RegExp(`^${p.keyPrefix}-`));
  }
  assert.equal(productFromKey("NOPE-1234"), null);
  assert.equal(productFromKey("GUARD-FREE-ACCESS-2026"), "guardian");
});

test("BYOX endpoints: https only, private ranges blocked", () => {
  assert.equal(endpointProblem("https://llm.example.com/v1"), null);
  assert.ok(endpointProblem("http://llm.example.com/v1"));
  assert.ok(endpointProblem("https://localhost:11434/v1"));
  assert.ok(endpointProblem("https://192.168.1.4/v1"));
  assert.ok(endpointProblem("https://172.20.0.2/v1"));
  assert.ok(endpointProblem("not a url"));
  assert.equal(endpointProblem("http://localhost:11434/v1", true), null);
});

test("SSE reader + text stream (chunk boundaries, errors)", async () => {
  const chunks = ['data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choices":[{"del', 'ta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n'];
  const body = new ReadableStream<Uint8Array>({ start(c) { chunks.forEach((x) => c.enqueue(enc(x))); c.close(); } });
  let out = "";
  for await (const t of readSse(body, (j) => j?.choices?.[0]?.delta?.content)) out += t;
  assert.equal(out, "Hello");

  async function* failing() { yield "partial"; throw new Error("boom"); }
  let done: any = null;
  const r = toTextStream(failing(), (n, failed) => { done = { n, failed }; }).getReader();
  let text = "";
  for (;;) { const { value, done: d } = await r.read(); if (d) break; text += new TextDecoder().decode(value); }
  assert.match(text, /^partial\n\n⚠️ boom$/);
  assert.deepEqual(done, { n: 7, failed: true });
});

test("sessions & passwords", async () => {
  const token = await auth.signSession({ sub: "u1", email: "a@b.co", role: "member", name: "A", tier: "pro", until: Math.floor(Date.now() / 1000) + 3600, ent: Math.floor(Date.now() / 1000) });
  const s = await auth.verifySession(token);
  assert.equal(s?.tier, "pro");
  assert.equal(auth.effectiveTier(s!), "pro");
  const flip = (t: string, i: number) => t.slice(0, i) + (t[i] === "A" ? "B" : "A") + t.slice(i + 1);
  const sigAt = token.lastIndexOf(".") + 1;
  assert.equal(await auth.verifySession(flip(token, sigAt + 5)), null, "altered signature rejected");
  assert.equal(await auth.verifySession(flip(token, token.length - 1)), null, "non-canonical last character rejected");
  assert.equal(await auth.verifySession(flip(token, token.indexOf(".") + 3)), null, "altered payload rejected");
  const expired = { ...s!, until: Math.floor(Date.now() / 1000) - 5 };
  assert.equal(auth.effectiveTier(expired), "none");
  assert.equal(auth.effectiveTier({ ...expired, role: "admin" }), "enterprise");
  const h = await auth.hashPassword("correct horse 9");
  assert.ok(await auth.verifyPassword("correct horse 9", h));
  assert.ok(!(await auth.verifyPassword("wrong", h)));
  assert.ok(auth.passwordProblem("short1"));
  assert.ok(auth.passwordProblem("onlyletters"));
  assert.equal(auth.passwordProblem("letters123"), null);
  assert.ok(auth.isEmail("a.b@example.co.id") && !auth.isEmail("nope@x"));
});

test("IDR conversion rounds up to Rp1,000", () => {
  assert.equal(toIdr(49, 16420), 805000);
  assert.equal(toIdr(19, 16500), 314000);
});
