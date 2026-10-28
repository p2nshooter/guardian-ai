/* ==============================================================================
 * AXTO v3.2.1 — regression tests for the full-site audit (blueprint §20):
 * money that must not come back, locks that must hold, sessions that must end.
 *   Run with the other E2E files: bash tests/e2e/run.sh
 * ============================================================================ */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { createOrder, doc, licenceByKey, resetToken, seedAdmin, update, userByEmail } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));

const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);
const WHSEC = "whsec_e2e_security";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p: string) => this.call("GET", p);
  post = (p: string, b?: unknown, h?: Record<string, string>) => this.call("POST", p, b ?? {}, h);
  put = (p: string, b?: unknown) => this.call("PUT", p, b ?? {});
}


/** A Stripe webhook signed exactly like Stripe does (t=…,v1=HMAC-SHA256). */
function stripeEvent(orderId: string, amountUsd: number) {
  const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: `cs_${RUN}`, client_reference_id: orderId, payment_status: "paid", amount_total: Math.round(amountUsd * 100), payment_intent: `pi_${RUN}` } } });
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", WHSEC).update(`${t}.${payload}`).digest("hex");
  return { payload, header: `t=${t},v1=${sig}` };
}

const admin = new Client();
async function newMember(tag: string, plan?: string) {
  const c = new Client();
  const email = `sec-${tag}-${RUN}@example.com`;
  const r = await c.post("/api/auth/register", { email, name: `Sec ${tag}`, password: "abcdefgh1", acceptTerms: true });
  assert.equal(r.status, 200, r.text);
  const u = await userByEmail(email);
  if (plan) {
    assert.equal((await admin.post(`/api/admin/members/${u.id}`, { action: "grant", plan, cycle: "monthly" })).status, 200);
    await c.post("/api/auth/login", { email, password: "abcdefgh1" });   // fresh token with the plan
  }
  return { c, email, id: u.id as string };
}

before(async () => {
  await seedAdmin("e2e-admin@axto.io");
  admin.cookie = await adminCookie();   // one shared admin session (sign-in is rate-limited)
  // Bank transfer (to create orders) + Stripe (to replay signed webhooks). Stripe is switched off again in after().
  assert.equal((await admin.put("/api/admin/gateways", { gateway: "manual", credentials: { instructions: "Bank Test 123" }, is_active: true })).status, 200);
  const s = await admin.put("/api/admin/gateways", { gateway: "stripe", env: "sandbox", credentials: { secret_key: "sk_test_e2e", webhook_secret: WHSEC } });
  assert.equal(s.status, 200, s.text);
  assert.equal((await admin.call("PATCH", "/api/admin/gateways", { gateway: "stripe", active: true, mode: "sandbox" })).status, 200);
});
after(async () => {
  // Leave Stripe exactly as found (unconfigured) for the files that run next.
  const r = await admin.call("DELETE", "/api/admin/gateways", { gateway: "stripe", env: "sandbox" });
  assert.equal(r.status, 200, r.text);
  await admin.call("PATCH", "/api/admin/gateways", { gateway: "stripe", active: false, mode: "live" });
  const g = (await admin.get("/api/admin/gateways")).json.gateways.find((x: any) => x.id === "stripe");
  assert.equal(g.configured, false);
});

test("payments: a refunded order never grants access again", async () => {
  const m = await newMember("refund");
  const co = await m.c.post("/api/billing/checkout", { plan: "pro", cycle: "monthly", gateway: "manual" });
  assert.equal(co.status, 200, co.text);
  const orderId = co.json.orderId;
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: orderId })).status, 200);
  assert.equal((await admin.post("/api/admin/orders", { action: "refund", id: orderId, endAccess: true, note: "e2e" })).status, 200);
  assert.equal((await doc("subscriptions", m.id)).status, "canceled");

  // Admin cannot re-approve it by mistake…
  const again = await admin.post("/api/admin/orders", { action: "mark_paid", id: orderId });
  assert.equal(again.status, 400);
  assert.match(again.json.error, /refunded/);
  // …and a correctly signed, replayed gateway event is acknowledged without granting anything.
  const o = await doc("orders", orderId);
  await update("orders", orderId, { gateway: "stripe" }, { env: "sandbox" });
  const ev = stripeEvent(orderId, o.amount_usd);
  const w = await new Client().post("/api/webhooks/stripe", ev.payload, { "stripe-signature": ev.header });
  assert.equal(w.status, 200, "final state: no retries from the gateway");
  assert.equal((await doc("orders", orderId)).status, "refunded");
  assert.equal((await doc("subscriptions", m.id)).status, "canceled");
});

test("payments: a gateway can only settle its own orders", async () => {
  const m = await newMember("xgw");
  const co = await m.c.post("/api/billing/checkout", { plan: "starter", cycle: "monthly", gateway: "manual" });
  assert.equal(co.status, 200, co.text);
  const o = await doc("orders", co.json.orderId);
  const ev = stripeEvent(co.json.orderId, o.amount_usd);
  const w = await new Client().post("/api/webhooks/stripe", ev.payload, { "stripe-signature": ev.header });
  assert.equal(w.status, 422);
  assert.equal(w.json.error, "gateway_mismatch");
  assert.equal((await doc("orders", co.json.orderId)).status, "pending");
});

test("payments: a genuine Stripe event for a Stripe order activates the plan once", async () => {
  const m = await newMember("stripe");
  // Stripe's API is not reachable here, so create the order row as checkout would.
  const id = `ord_sec_${RUN}`;
  await createOrder({ id, user_id: m.id, email: m.email, plan: "pro", cycle: "monthly", amount_usd: 49, gateway: "stripe", meta: JSON.stringify({ env: "sandbox" }) });
  const short = stripeEvent(id, 10);
  assert.equal((await new Client().post("/api/webhooks/stripe", short.payload, { "stripe-signature": short.header })).status, 422, "short payment refused");
  const ev = stripeEvent(id, 49);
  assert.equal((await new Client().post("/api/webhooks/stripe", ev.payload, { "stripe-signature": ev.header })).status, 200);
  assert.equal((await new Client().post("/api/webhooks/stripe", ev.payload, { "stripe-signature": ev.header })).status, 200, "idempotent");
  assert.equal((await doc("orders", id)).status, "paid");
  assert.equal((await doc("subscriptions", m.id)).plan, "pro");
});

test("licences: an admin suspension or revocation holds against the member and renewals", async () => {
  const m = await newMember("hold", "business");
  const issued = await m.c.post("/api/selfhosted", { action: "issue", product: "vault" });
  assert.equal(issued.status, 200, issued.text);
  const key = issued.json.license.license_key;
  const lic = await licenceByKey(key);
  const validate = () => fetch(`${BASE}/api/license-validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ license_key: key, machine_id: "hold-machine" }) }).then((r) => r.json());

  assert.equal((await admin.post("/api/admin/licenses", { action: "suspend", id: lic.id })).status, 200);
  assert.equal((await m.c.post("/api/selfhosted", { action: "issue", product: "vault" })).status, 409, "member cannot re-issue");
  assert.equal((await m.c.post("/api/selfhosted", { action: "reset", product: "vault" })).status, 403);
  // A renewal payment re-activates plan-suspended licences — but not an admin hold.
  assert.equal((await admin.post(`/api/admin/members/${m.id}`, { action: "grant", plan: "business", cycle: "monthly" })).status, 200);
  assert.equal((await doc("shLicenses", lic.id)).status, "suspended");
  assert.equal((await validate()).reason, "suspended");

  assert.equal((await admin.post("/api/admin/licenses", { action: "revoke", id: lic.id })).status, 200);
  const view = await m.c.get("/api/selfhosted");
  assert.equal(view.json.products.find((p: any) => p.slug === "vault").license.held, 1, "portal shows the lock");
  const re = await m.c.post("/api/selfhosted", { action: "issue", product: "vault" });
  assert.equal(re.status, 409);
  assert.match(re.json.error, /locked by AXTO/);

  assert.equal((await admin.post("/api/admin/licenses", { action: "activate", id: lic.id })).status, 200);
  assert.equal((await validate()).valid, true, "an admin lifts the hold");
  assert.equal((await doc("shLicenses", lic.id)).notes, "");
});

test("licences: two servers racing for a fresh key — only one is bound", async () => {
  const m = await newMember("race", "business");
  const issued = await m.c.post("/api/selfhosted", { action: "issue", product: "soc" });
  assert.equal(issued.status, 200, issued.text);
  const key = issued.json.license.license_key;
  const call = (mid: string) => fetch(`${BASE}/api/license-validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ license_key: key, machine_id: mid }) }).then((r) => r.json());
  const [a, b] = await Promise.all([call("race-machine-a"), call("race-machine-b")]);
  assert.equal([a, b].filter((r) => r.valid).length, 1, JSON.stringify([a.reason, b.reason]));
  const bound = (await licenceByKey(key)).bound_machine_id;
  assert.equal((a.valid ? "race-machine-a" : "race-machine-b"), bound);
});

test("sessions: a password change signs out every other device", async () => {
  const m = await newMember("pw", "business");
  const laptop = new Client();
  assert.equal((await laptop.post("/api/auth/login", { email: m.email, password: "abcdefgh1" })).status, 200);
  await sleep(1100);   // token timestamps are whole seconds
  const ch = await m.c.post("/api/account", { action: "password", current: "abcdefgh1", next: "newpass123" });
  assert.equal(ch.status, 200, ch.text);
  // Sensitive routes re-check the account at once: the other device is out…
  assert.equal((await laptop.post("/api/selfhosted", { action: "issue", product: "edge" })).status, 401);
  assert.equal((await laptop.post("/api/billing/checkout", { plan: "pro", cycle: "monthly", gateway: "manual" })).status, 401);
  // …while the device that changed it keeps working.
  assert.equal((await m.c.post("/api/selfhosted", { action: "issue", product: "edge" })).status, 200);
});

test("sessions: a reset link works once, even when used twice at the same moment", async () => {
  const m = await newMember("reset");
  assert.equal((await new Client().post("/api/auth/forgot", { email: m.email })).status, 200);
  const row = { token: await resetToken(m.email) };
  assert.ok(row.token, "the reset link was e-mailed");
  const [a, b] = await Promise.all([
    new Client().post("/api/auth/reset", { token: row.token, password: "raceone123" }),
    new Client().post("/api/auth/reset", { token: row.token, password: "racetwo123" }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 400]);
});

test("admin: a demoted admin loses access on the very next call", async () => {
  const m = await newMember("demote");
  await update("users", m.id, { role: "admin" });
  const c = new Client();
  assert.equal((await c.post("/api/auth/login", { email: m.email, password: "abcdefgh1" })).status, 200);
  assert.equal((await c.get("/api/admin/stats")).status, 200);
  await update("users", m.id, { role: "client" });
  assert.equal((await c.get("/api/admin/stats")).status, 403);
  assert.equal((await c.post("/api/admin/orders", { action: "cancel", id: "x" })).status, 403);
});

test("admin: MRR counts what subscribers paid, not list prices of free grants", async () => {
  const before = (await admin.get("/api/admin/stats")).json;
  await newMember("mrr", "enterprise");   // complimentary: $0
  const afterStats = (await admin.get("/api/admin/stats")).json;
  assert.equal(afterStats.activeSubscriptions, before.activeSubscriptions + 1);
  assert.equal(afterStats.mrr, before.mrr, "a complimentary grant adds no revenue");
});

test("members cannot read or change anyone else's data, and every admin API refuses them", async () => {
  const a = await newMember("iso-a", "enterprise");
  const b = await newMember("iso-b", "enterprise");
  const matter = await a.c.post("/api/legal/matters", { title: "Private matter" });
  assert.equal(matter.status, 200, matter.text);
  const mid = matter.json.matter.id;
  assert.equal((await b.c.get(`/api/legal/matters/${mid}`)).status >= 400, true);
  const co = await a.c.post("/api/billing/checkout", { plan: "pro", cycle: "yearly", gateway: "manual" });
  assert.equal((await b.c.get(`/api/billing/orders/${co.json.orderId}`)).status, 404);
  assert.equal((await b.c.post(`/api/billing/orders/${co.json.orderId}`, { action: "bank_proof", reference: "x" })).status, 404);
  const lt = await admin.post("/api/admin/lifetime", { action: "issue", email: a.email, scope: "app", product: "vault", devices: 1 });
  assert.equal(lt.status, 200, lt.text);
  const act = await b.c.post("/api/lifetime", { action: "activate", licenseId: lt.json.license.id, product: "vault", machineId: "0123456789abcdef0123456789abcdef" });
  assert.equal(act.status, 404);

  for (const p of ["/api/admin/stats", "/api/admin/members", "/api/admin/orders", "/api/admin/licenses", "/api/admin/lifetime", "/api/admin/gateways",
                   "/api/admin/plans", "/api/admin/settings", "/api/admin/audit", "/api/admin/support", "/api/admin/releases", "/api/admin/managed",
                   "/api/admin/legal/corpus"]) {
    assert.equal((await b.c.get(p)).status, 403, `GET ${p}`);
    assert.equal((await b.c.post(p, { action: "x" })).status >= 400, true, `POST ${p}`);
  }
  const anon = new Client();
  for (const p of ["/api/auth/me", "/api/selfhosted", "/api/lifetime", "/api/files", "/api/billing/overview", "/api/legal/matters"]) {
    assert.equal((await anon.get(p)).status, 401, `anonymous ${p}`);
  }
  // Public pages ask "is someone signed in?" with ?optional=1: a visitor gets 200 and no account, never data.
  const soft = await anon.get("/api/auth/me?optional=1");
  assert.equal(soft.status, 200);
  assert.deepEqual(soft.json, { user: null });
});

test("lifetime: the portal only links builds that exist", async () => {
  const m = await newMember("ltfiles");
  assert.equal((await admin.post("/api/admin/lifetime", { action: "issue", email: m.email, scope: "suite", devices: 1 })).status, 200);
  const r = await m.c.get("/api/lifetime");
  const products = r.json.licenses[0].products;
  assert.equal(products.length, 10);
  for (const p of products) {
    assert.ok(Array.isArray(p.files.images) && Array.isArray(p.files.arm64), p.slug);
    assert.equal(p.files.exe, undefined, "Windows installs go through AXTO Setup, not per-app EXEs");
    for (const name of p.files.images) {
      const dl = await m.c.get(`/api/selfhosted/download?product=${p.slug}&file=${name}`);
      assert.equal(dl.status, 200, `${p.slug}/${name} is linked, so it must download`);
    }
  }
});
