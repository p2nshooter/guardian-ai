/* ==============================================================================
 * AXTO — Credit / debit card payments that settle to the owner's BNI account.
 * Cards run through an Indonesian processor (Xendit here) using its own
 * credentials; the card method appears at checkout only when that processor is
 * configured in the same environment. The processor's webhook confirms the
 * order (IDR or USD), with the amount verified. Leaves gateways as it found them.
 * ============================================================================ */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const CTL_DIR = path.resolve(process.cwd(), ".e2e-state/d1ctl");
const RUN = Date.now().toString(36);
const XENDIT = { secret_key: "xnd_development_e2e_card", webhook_token: `tok-${RUN}` };

class Client {
  cookie = ""; ip = `10.77.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
  async call(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(BASE + p, {
      method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), "cf-connecting-ip": this.ip, ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
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
const admin = new Client(), member = new Client();
const put = (gateway: string, env: string, credentials: Record<string, unknown>) => admin.call("PUT", "/api/admin/gateways", { gateway, env, credentials });
const patch = (gateway: string, b: Record<string, unknown>) => admin.call("PATCH", "/api/admin/gateways", { gateway, ...b });
const del = (gateway: string, env: string) => admin.call("DELETE", "/api/admin/gateways", { gateway, env });
let uid = "";

before(async () => {
  admin.cookie = await adminCookie();
  const email = `card-${RUN}@example.com`;
  const r = await member.call("POST", "/api/auth/register", { email, name: "Card Buyer", password: "Card-Pass-2026", acceptTerms: true });
  assert.equal(r.status, 200, r.text);
  uid = d1(`SELECT id FROM users WHERE email = '${email}'`)[0].id;
});
after(async () => {
  await patch("card", { active: false, mode: "live" });
  await del("card", "sandbox");
  await del("xendit", "sandbox");
});

test("card: offered only when its processor is configured in the same environment", async () => {
  const g = (await admin.call("GET", "/api/admin/gateways")).json.gateways;
  const card = g.find((x: any) => x.id === "card");
  assert.ok(card, "card method exists in Admin → Payments");
  assert.equal(g[0].id, "paypal", "PayPal stays first");
  assert.ok(card.fields.some((f: any) => f.key === "processor") && card.fields.some((f: any) => f.key === "settlement_account"));

  assert.equal((await put("card", "sandbox", { processor: "xendit", charge_currency: "IDR", settlement_account: "BNI · IDR" })).status, 200);
  assert.equal((await patch("card", { active: true, mode: "sandbox" })).status, 200);
  let opts = (await member.call("GET", "/api/billing/options")).json;
  assert.ok(!opts.gateways.some((x: any) => x.id === "card"), "hidden while Xendit has no sandbox keys");

  assert.equal((await put("xendit", "sandbox", XENDIT)).status, 200);
  opts = (await member.call("GET", "/api/billing/options")).json;
  const c = opts.gateways.find((x: any) => x.id === "card");
  assert.ok(c, "shown once the processor is configured");
  assert.equal(c.test, true);
  const t = await admin.call("POST", "/api/admin/gateways", { gateway: "card", env: "sandbox", action: "test" });
  assert.equal(t.status, 200);
  assert.match(t.json.message, /Cards run through Xendit in IDR/);
});

test("card: checkout is filed under the processor with method=card; the processor's webhook confirms it", async () => {
  const r = await member.call("POST", "/api/billing/checkout", { plan: "pro", cycle: "monthly", gateway: "card" });
  // The local runtime cannot reach Xendit with a test key, so the hosted page is not created — the order row still shows the routing.
  const [row] = d1(`SELECT id, gateway, currency, amount_local, status, json_extract(meta, '$.method') AS method, json_extract(meta, '$.env') AS env FROM orders WHERE user_id = '${uid}' ORDER BY created_at DESC LIMIT 1`);
  assert.ok(r.status === 200 || r.status === 502, r.text);
  assert.equal(row.gateway, "xendit");
  assert.equal(row.method, "card");
  assert.equal(row.currency, "IDR");
  assert.ok(row.amount_local > 0, "charged in rupiah at the USD rate");
  assert.equal(row.env, "sandbox");

  // A pending card order confirmed by Xendit's webhook (sandbox token), amount verified.
  const id = `ord_card_${RUN}`;
  d1(`INSERT INTO orders (id, user_id, email, plan, cycle, amount_usd, currency, amount_local, gateway, status, meta, created_at)
      VALUES ('${id}', '${uid}', 'card-${RUN}@example.com', 'pro', 'monthly', 49, 'USD', 0, 'xendit', 'pending', '{"env":"sandbox","method":"card"}', datetime('now'))`);
  const hook = (body: unknown, token = XENDIT.webhook_token) => new Client().call("POST", "/api/webhooks/xendit", body, { "x-callback-token": token });
  assert.equal((await hook({ status: "PAID", external_id: id, currency: "USD", paid_amount: 49 }, "wrong")).status, 401);
  assert.equal((await hook({ status: "PAID", external_id: id, currency: "USD", paid_amount: 5 })).status, 422, "a short USD payment never activates");
  assert.equal(d1(`SELECT status FROM orders WHERE id = '${id}'`)[0].status, "pending");
  assert.equal((await hook({ status: "PAID", external_id: id, currency: "USD", paid_amount: 49, id: "inv_1" })).status, 200);
  assert.equal(d1(`SELECT status FROM orders WHERE id = '${id}'`)[0].status, "paid");
  assert.equal(d1(`SELECT plan, status FROM subscriptions WHERE user_id = '${uid}'`)[0].plan, "pro");

  const ov = await member.call("GET", "/api/billing/overview");
  assert.equal(ov.json.orders.find((o: any) => o.id === id).method, "card", "member history shows it as a card payment");
});
