/* ==============================================================================
 * AXTO — PayPal end to end against a local PayPal stand-in (tests/e2e/paypal-mock.ts).
 * Owner, 14 Oct 2026: the PayPal keys must work at once, and the webhook must be
 * created by the site itself — nothing to set up by hand in the PayPal dashboard.
 * Proves: saving Sandbox keys checks them and creates the webhook (once, with the
 * event the route handles) and stores its id; a member pays with PayPal and the
 * plan activates on return; a signed notification is accepted and changes
 * nothing twice; an unsigned one is refused. Leaves PayPal as it found it.
 * ============================================================================ */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { startPayPalMock, MOCK_CLIENT_ID, MOCK_SECRET, type PayPalMock } from "./paypal-mock";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));

const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);

class Client {
  cookie = "";
  ip = `10.${1 + Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
  async call(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(p.startsWith("http") ? p : BASE + p, {
      method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), "cf-connecting-ip": this.ip, ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, location: res.headers.get("location") || "" };
  }
}

const admin = new Client();
let mock: PayPalMock;
const gw = async () => (await admin.call("GET", "/api/admin/gateways")).json.gateways.find((g: any) => g.id === "paypal");

before(async () => {
  admin.cookie = await adminCookie();
  mock = await startPayPalMock(8899);
});
after(async () => {
  await admin.call("PATCH", "/api/admin/gateways", { gateway: "paypal", active: false, mode: "live" });
  await admin.call("DELETE", "/api/admin/gateways", { gateway: "paypal", env: "sandbox" });
  await mock.close();
});

let orderId = "";
let paypalOrder = "";
let member: Client;

test("saving Sandbox keys checks them with PayPal and creates the webhook by itself", async () => {
  const bad = await admin.call("PUT", "/api/admin/gateways", { gateway: "paypal", env: "sandbox", credentials: { client_id: MOCK_CLIENT_ID, client_secret: "not-the-secret" } });
  assert.equal(bad.status, 200, "the keys are saved either way");
  assert.equal(bad.json.setup?.ok, false, "…but a key PayPal rejects is reported, not hidden");
  assert.equal(mock.webhooks.size, 0, "no webhook without valid keys");

  const r = await admin.call("PUT", "/api/admin/gateways", { gateway: "paypal", env: "sandbox", credentials: { client_id: MOCK_CLIENT_ID, client_secret: MOCK_SECRET } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.setup?.ok, true, JSON.stringify(r.json.setup));
  assert.match(r.json.setup.message, /Sandbox keys accepted by PayPal\. Webhook created/);
  const hooks = [...mock.webhooks.values()];
  assert.equal(hooks.length, 1, "exactly one webhook");
  assert.match(hooks[0].url, /\/api\/webhooks\/paypal$/);
  assert.deepEqual(hooks[0].event_types.map((e) => e.name), ["PAYMENT.CAPTURE.COMPLETED"]);
  const g = await gw();
  assert.equal(g.sandbox.values.webhook_id, hooks[0].id, "its id is stored with the keys");
  assert.ok(!JSON.stringify(g).includes(MOCK_SECRET), "the secret never comes back");

  const again = await admin.call("POST", "/api/admin/gateways", { gateway: "paypal", env: "sandbox", action: "test" });
  assert.equal(again.json.ok, true, again.text);
  assert.match(again.json.message, /Webhook ready/);
  assert.equal(mock.webhooks.size, 1, "testing again never makes a duplicate");
});

test("a member pays with PayPal and the plan activates when they come back", async () => {
  assert.equal((await admin.call("PATCH", "/api/admin/gateways", { gateway: "paypal", active: true, mode: "sandbox" })).status, 200);
  member = new Client();
  assert.equal((await member.call("POST", "/api/auth/register", { email: `paypal-${RUN}@example.com`, name: "PayPal Test", password: "abcdefgh1", acceptTerms: true })).status, 200);
  const c = await member.call("POST", "/api/billing/checkout", { plan: "pro", cycle: "monthly", gateway: "paypal" });
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.test, true, "Sandbox orders are marked TEST");
  assert.ok(c.json.url.startsWith(`${mock.url}/checkoutnow`), c.json.url);
  orderId = c.json.orderId;
  paypalOrder = new URL(c.json.url).searchParams.get("token") || "";
  assert.equal(mock.orders.get(paypalOrder).purchase_units[0].amount.value, "49.00", "the price comes from the server");

  const approve = await member.call("GET", `${c.json.url}&action=approve`);
  assert.equal(approve.status, 302);
  const back = new URL(approve.location);
  const ret = await member.call("GET", `${back.pathname}${back.search}`);
  assert.equal(ret.status, 307, ret.text);
  assert.match(ret.location, new RegExp(`paid=${orderId}`));
  const me = await member.call("GET", "/api/auth/me");
  assert.equal(me.json.tier, "pro");
});

test("PayPal's notification: a signed one is accepted once, an unsigned one is refused", async () => {
  const event = { event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: `CAP-${paypalOrder}`, custom_id: orderId, amount: { value: "49.00", currency_code: "USD" } } };
  const signed = await new Client().call("POST", "/api/webhooks/paypal", event, { "paypal-transmission-sig": "mock-signature", "paypal-transmission-id": "t1", "paypal-transmission-time": new Date().toISOString(), "paypal-auth-algo": "SHA256withRSA", "paypal-cert-url": `${mock.url}/cert` });
  assert.equal(signed.status, 200, signed.text);
  const unsigned = await new Client().call("POST", "/api/webhooks/paypal", event);
  assert.equal(unsigned.status, 400, "no valid signature, no effect");
  const ov = await member.call("GET", "/api/billing/overview");
  const o = ov.json.orders.find((x: any) => x.id === orderId);
  assert.equal(o.status, "paid");
  assert.equal(ov.json.orders.filter((x: any) => x.id === orderId).length, 1, "paid once, never twice");
});
