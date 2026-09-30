/* ==============================================================================
 * AXTO v3.2.1 — Admin → Payments: Live and Sandbox are separate credential sets.
 * Full CRUD per environment, the checkout switch, TEST orders, and the rule that
 * test money can never pay a real order. Leaves every gateway as it found it.
 * ============================================================================ */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));

const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const CTL_DIR = path.resolve(process.cwd(), ".e2e-state/d1ctl");
const RUN = Date.now().toString(36);
const LIVE = { secret_key: "sk_live_e2e_payments", webhook_secret: "whsec_live_e2e" };
const SANDBOX = { secret_key: "sk_test_e2e_payments", webhook_secret: "whsec_sandbox_e2e" };

class Client {
  cookie = "";
  ip = `10.${1 + Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
  async call(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(BASE + p, {
      method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), "cf-connecting-ip": this.ip, ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  }
}

function d1(sql: string): any[] {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "axto-db", "--local", "--persist-to", "../persist", "--command", sql, "--json"], {
    cwd: CTL_DIR, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.slice(out.indexOf("[")))[0]?.results || [];
}

function stripeEvent(orderId: string, amountUsd: number, whsec: string) {
  const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: `cs_${orderId}`, client_reference_id: orderId, payment_status: "paid", amount_total: Math.round(amountUsd * 100), payment_intent: `pi_${orderId}` } } });
  const t = Math.floor(Date.now() / 1000);
  return { payload, header: `t=${t},v1=${crypto.createHmac("sha256", whsec).update(`${t}.${payload}`).digest("hex")}` };
}

const admin = new Client();
const gw = async (id: string) => (await admin.call("GET", "/api/admin/gateways")).json.gateways.find((g: any) => g.id === id);
const put = (gateway: string, env: string, credentials: Record<string, unknown>) => admin.call("PUT", "/api/admin/gateways", { gateway, env, credentials });
const patch = (gateway: string, b: Record<string, unknown>) => admin.call("PATCH", "/api/admin/gateways", { gateway, ...b });
const del = (gateway: string, env: string) => admin.call("DELETE", "/api/admin/gateways", { gateway, env });

before(async () => { admin.cookie = await adminCookie(); });
after(async () => {
  // Leave Stripe unconfigured, as the files that run next expect.
  await patch("stripe", { active: false, mode: "live" });
  await del("stripe", "live");
  await del("stripe", "sandbox");
  const g = await gw("stripe");
  assert.equal(g.live.configured || g.sandbox.configured || g.active, false);
});

test("read: every method shows both environments; bank and wallets are live only", async () => {
  const r = await admin.call("GET", "/api/admin/gateways");
  assert.equal(r.status, 200);
  for (const g of r.json.gateways) {
    assert.ok(g.live && g.sandbox && typeof g.active === "boolean" && ["live", "sandbox"].includes(g.mode), g.id);
    assert.deepEqual(g.envs, g.id === "manual" || g.id === "crypto" ? ["live"] : ["live", "sandbox"], g.id);
    assert.ok(!g.fields.some((f: any) => f.key === "mode" || f.key === "is_production"), `${g.id}: no ambiguous mode field`);
  }
  assert.equal((await new Client().call("GET", "/api/admin/gateways")).status, 403);
});

test("create/update: each environment is saved on its own; wrong-environment keys are refused", async () => {
  const wrong = await put("stripe", "sandbox", LIVE);
  assert.equal(wrong.status, 400);
  assert.match(wrong.json.error, /live key — paste it under Live/);
  assert.equal((await put("stripe", "live", SANDBOX)).status, 400);

  const sb = await put("stripe", "sandbox", SANDBOX);
  assert.equal(sb.status, 200, sb.text);
  assert.equal(sb.json.gateway.sandbox.configured, true);
  assert.equal(sb.json.gateway.live.configured, false, "Live untouched");
  const lv = await put("stripe", "live", LIVE);
  assert.equal(lv.status, 200, lv.text);
  const g = await gw("stripe");
  assert.equal(g.live.configured && g.sandbox.configured, true);
  const raw = JSON.stringify(g);
  assert.ok(!raw.includes(LIVE.secret_key) && !raw.includes(SANDBOX.webhook_secret), "secrets are never returned");
  assert.match(g.sandbox.values.secret_key, /^•+ents$/, "masked, last 4 visible");
  // A masked value sent back keeps the secret; null removes one field.
  assert.equal((await put("stripe", "sandbox", { secret_key: g.sandbox.values.secret_key, webhook_secret: g.sandbox.values.webhook_secret })).status, 200);
  assert.equal((await gw("stripe")).sandbox.configured, true);
  assert.equal((await put("stripe", "live", { webhook_secret: null })).status, 200);
  assert.equal((await gw("stripe")).live.configured, false, "webhook secret removed");
  assert.equal((await put("stripe", "live", { webhook_secret: LIVE.webhook_secret })).status, 200);
  assert.equal((await put("manual", "sandbox", { account_number: "1" })).status, 400, "bank transfer has no sandbox");
});

test("switch: offer at checkout in Sandbox, then Live — never with empty keys", async () => {
  await del("stripe", "live");
  const noLive = await patch("stripe", { active: true, mode: "live" });
  assert.equal(noLive.status, 400);
  assert.match(noLive.json.error, /Fill in the Live credentials/);
  const on = await patch("stripe", { active: true, mode: "sandbox" });
  assert.equal(on.status, 200, on.text);
  assert.equal(on.json.gateway.ready, true);
  const opts = await new Client().call("GET", "/api/billing/options");
  assert.equal(opts.json.gateways.find((x: any) => x.id === "stripe").test, true, "checkout shows TEST MODE");
  assert.equal((await put("stripe", "sandbox", { secret_key: null })).status, 400, "cannot empty the environment checkout is using");
  assert.equal((await put("stripe", "live", LIVE)).status, 200);
  assert.equal((await patch("stripe", { mode: "live" })).status, 200);
  const live = await new Client().call("GET", "/api/billing/options");
  assert.equal(live.json.gateways.find((x: any) => x.id === "stripe").test, false);
  const test = await admin.call("POST", "/api/admin/gateways", { gateway: "stripe", env: "sandbox", action: "test" });
  assert.equal(test.status, 200);
  assert.equal(typeof test.json.ok, "boolean");
  assert.ok(test.json.message.length > 5, "a readable result, never a crash");
});

test("test money never pays a real order; test orders are not revenue", async () => {
  const email = `pay-${RUN}@example.com`;
  const m = new Client();
  assert.equal((await m.call("POST", "/api/auth/register", { email, name: "Pay Test", password: "abcdefgh1", acceptTerms: true })).status, 200);
  const [u] = d1(`SELECT id FROM users WHERE email = '${email}'`);
  const liveId = `ord_live_${RUN}`, sbId = `ord_sb_${RUN}`;
  d1(`INSERT INTO orders (id, user_id, email, plan, cycle, amount_usd, currency, amount_local, gateway, status, meta, created_at) VALUES
      ('${liveId}', '${u.id}', '${email}', 'pro', 'monthly', 49, 'USD', 0, 'stripe', 'pending', '{"env":"live"}', datetime('now')),
      ('${sbId}', '${u.id}', '${email}', 'pro', 'monthly', 49, 'USD', 0, 'stripe', 'pending', '{"env":"sandbox"}', datetime('now'))`);
  const before = (await admin.call("GET", "/api/admin/stats")).json;

  const cheat = stripeEvent(liveId, 49, SANDBOX.webhook_secret);
  const r1 = await new Client().call("POST", "/api/webhooks/stripe", cheat.payload, { "stripe-signature": cheat.header });
  assert.equal(r1.status, 422);
  assert.equal(r1.json.error, "env_mismatch");
  assert.equal(d1(`SELECT status FROM orders WHERE id = '${liveId}'`)[0].status, "pending", "a sandbox payment cannot pay a live order");

  const sb = stripeEvent(sbId, 49, SANDBOX.webhook_secret);
  assert.equal((await new Client().call("POST", "/api/webhooks/stripe", sb.payload, { "stripe-signature": sb.header })).status, 200);
  assert.equal(d1(`SELECT status FROM orders WHERE id = '${sbId}'`)[0].status, "paid", "sandbox pays a sandbox order (testing works end to end)");
  const mid = (await admin.call("GET", "/api/admin/stats")).json;
  assert.equal(mid.revenueAll, before.revenueAll, "a test payment is not revenue");

  const lv = stripeEvent(liveId, 49, LIVE.webhook_secret);
  assert.equal((await new Client().call("POST", "/api/webhooks/stripe", lv.payload, { "stripe-signature": lv.header })).status, 200);
  const fin = (await admin.call("GET", "/api/admin/stats")).json;
  assert.equal(fin.revenueAll, before.revenueAll + 49, "the live payment is");
  const unsigned = await new Client().call("POST", "/api/webhooks/stripe", lv.payload, { "stripe-signature": `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}` });
  assert.equal(unsigned.status, 400);
});

test("delete: clearing the environment in use switches the method off", async () => {
  const r = await del("stripe", "live");
  assert.equal(r.status, 200);
  assert.equal(r.json.switchedOff, true);
  const g = await gw("stripe");
  assert.equal(g.active, false);
  assert.equal(g.live.configured, false);
  assert.equal(g.sandbox.configured, true, "the other environment is kept");
  const audit = await admin.call("GET", "/api/admin/audit?q=gateway");
  assert.ok(JSON.stringify(audit.json).includes("admin.gateway.cleared"), "every change is in the audit log");
});
