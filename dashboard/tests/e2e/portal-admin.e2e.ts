/* AXTO — admin portal E2E against the local runtime (named to run after api.e2e,
 * which expects the payment gateways to start unconfigured):
 *   • smart licence lifecycle driven from Admin → Licences and enforced at the
 *     engine endpoint (bind → machine mismatch → reset → suspend → activate → revoke)
 *   • BNI bank transfer stays MANUAL: order pending until the admin confirms
 *   • the admin pages Plans & pricing, Settings, Managed AI and Releases work. */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { doc, seedAdmin } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);

class Client {
  cookie = ""; ip = `10.33.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
  async call(method: string, p: string, body?: unknown) {
    const res = await fetch(BASE + p, { method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { "cf-connecting-ip": this.ip, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text(); let json: any = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  }
  get = (p: string) => this.call("GET", p);
  post = (p: string, b?: unknown) => this.call("POST", p, b ?? {});
  put = (p: string, b?: unknown) => this.call("PUT", p, b ?? {});
}
const admin = new Client();
const member = new Client();
const engine = new Client();
let orderId = "";
let key = "", licId = "";

before(async () => {
  await seedAdmin("e2e-admin@axto.io");
  admin.cookie = await adminCookie();   // one shared admin session (sign-in is rate-limited)
  assert.equal((await admin.put("/api/admin/gateways", { gateway: "manual", is_active: true, credentials: { bank_name: "BNI", account_number: "0123456789", account_name: "AXTO" } })).status, 200);
  assert.equal((await member.post("/api/auth/register", { email: `adm-${RUN}@example.com`, name: "Lic Owner", password: "abcdefgh1", acceptTerms: true })).status, 200);
});

test("BNI bank transfer is manual: pending until the admin confirms, then the plan + licences activate", async () => {
  const co = await member.post("/api/billing/checkout", { plan: "business", cycle: "monthly", gateway: "manual", apps: ["guardian", "vault", "legal"] });
  assert.equal(co.status, 200, co.text);
  assert.equal(co.json.method, "bank");
  assert.ok(co.json.amountIdr > 0 && co.json.bank.account_number === "0123456789", "shows BNI account + rupiah amount");
  orderId = co.json.orderId;
  // Unique 3-digit code: the last three digits identify this order.
  const code = co.json.uniqueCode;
  assert.ok(code >= 1 && code <= 999, `unique code 1-999 (${code})`);
  assert.equal(co.json.amountIdr % 1000, code, "code is the last 3 digits of the amount");
  assert.match(co.json.instructions, new RegExp(String(code).padStart(3, "0")), "instructions mention the code");
  const other = await member.post("/api/billing/checkout", { plan: "business", cycle: "monthly", gateway: "manual", apps: ["guardian"] });
  assert.notEqual(other.json.amountIdr, co.json.amountIdr, "two open orders never share an amount");
  // Admin pastes the amount seen in the BNI app → exactly this order.
  const pasted = "Rp " + co.json.amountIdr.toLocaleString("id-ID");
  const found = await admin.get(`/api/admin/orders?q=${encodeURIComponent(pasted)}`);
  assert.deepEqual(found.json.orders.map((o: any) => o.id), [orderId], `search "${pasted}" finds the order`);
  assert.equal((await doc("orders", orderId)).status, "pending", "no auto-confirmation for bank transfers");
  const before = (await member.get("/api/auth/me")).json;
  assert.equal(before.tier, "none", "no access before confirmation");
  assert.ok(!before.limits.apps.includes("security"), "paid apps still locked");
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: orderId })).status, 200);
  const me = await member.get("/api/auth/me");
  assert.equal(me.json.tier, "business", "plan active right after the admin confirms");
  assert.ok(me.json.limits.apps.includes("security"), "all apps unlocked");
  const lic = await admin.get(`/api/admin/licenses?q=${encodeURIComponent(`adm-${RUN}`)}`);
  const g = lic.json.licenses.find((l: any) => l.product === "guardian");
  assert.equal(lic.json.licenses.length, 3, "3 self-hosted licences issued automatically");
  assert.ok(g && g.status === "active");
  key = g.license_key; licId = g.id;
});

const validate = (machine: string) => engine.post("/api/license-validate", { license_key: key, machine_id: machine, product: "guardian", nonce: crypto.randomUUID() });

test("smart licence: binds to the first machine and refuses a second one", async () => {
  const a = await validate("machine-A");
  assert.equal(a.status, 200, a.text); assert.equal(a.json.valid, true); assert.ok(a.json.signature, "answer is signed");
  const b = await validate("machine-B");
  assert.equal(b.json.valid, false); assert.equal(b.json.reason, "machine_mismatch");
});

test("smart licence: admin reset lets the licence move to a new machine", async () => {
  assert.equal((await admin.post("/api/admin/licenses", { id: licId, action: "reset" })).status, 200);
  assert.equal((await validate("machine-B")).json.valid, true);
  assert.equal((await validate("machine-A")).json.reason, "machine_mismatch", "now bound to B");
});

test("smart licence: suspend → refused, activate → valid, revoke → permanently refused", async () => {
  await admin.post("/api/admin/licenses", { id: licId, action: "suspend" });
  const s = await validate("machine-B"); assert.equal(s.json.valid, false); assert.equal(s.json.reason, "suspended");
  await admin.post("/api/admin/licenses", { id: licId, action: "activate" });
  assert.equal((await validate("machine-B")).json.valid, true);
  await admin.post("/api/admin/licenses", { id: licId, action: "revoke" });
  const r = await validate("machine-B"); assert.equal(r.json.valid, false); assert.equal(r.json.reason, "revoked");
  assert.equal((await admin.get(`/api/admin/licenses?status=revoked&q=${encodeURIComponent(key)}`)).json.licenses.length, 1);
});

test("admin pages: plans & pricing, settings, managed AI and releases", async () => {
  const plans = await admin.get("/api/admin/plans");
  assert.equal(plans.status, 200); assert.equal(plans.json.plans.length, 4);
  const prices = Object.fromEntries(plans.json.plans.map((p: any) => [p.id, { monthly: p.price.monthly, yearly: p.price.yearly }]));
  prices.starter = { monthly: 11, yearly: 110 };
  assert.equal((await admin.put("/api/admin/plans", { prices })).status, 200);
  assert.equal((await admin.get("/api/admin/plans")).json.plans.find((p: any) => p.id === "starter").price.monthly, 11);
  const opts = await new Client().get("/api/billing/options");
  assert.equal(opts.json.plans.find((p: any) => p.id === "starter").monthly, 11, "public pricing follows the admin price");
  prices.starter = { monthly: plans.json.plans[0].defaultPrice.monthly, yearly: plans.json.plans[0].defaultPrice.yearly };
  await admin.put("/api/admin/plans", { prices });

  assert.equal((await admin.put("/api/admin/settings", { usd_idr_rate: "999" })).status, 400, "unrealistic rate rejected");
  assert.equal((await admin.put("/api/admin/settings", { usd_idr_rate: "16400" })).status, 200);
  assert.equal((await admin.get("/api/admin/settings")).json.usdIdrRate, "16400");
  await admin.put("/api/admin/settings", { usd_idr_rate: "" });

  const mg = await admin.get("/api/admin/managed");
  assert.equal(mg.status, 200); assert.equal(typeof mg.json.enabled, "boolean");
  const rel = await admin.get("/api/admin/releases");
  assert.equal(rel.status, 200); assert.ok(Array.isArray(rel.json.files));

  for (const p of ["/admin/plans", "/admin/settings", "/admin/managed", "/admin/releases", "/admin/licenses", "/admin/orders", "/admin/payments", "/admin/members", "/admin/support", "/admin/audit"]) {
    assert.equal((await admin.get(p)).status, 200, `${p} exists`);
  }
  assert.equal((await member.get("/api/admin/plans")).status, 403, "members cannot use admin APIs");
});
