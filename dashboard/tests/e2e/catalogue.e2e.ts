/* ==============================================================================
 * AXTO — "every app can be bought and its licence works" (owner, 27 Oct 2026;
 * docs/BLUEPRINT-V4.md §27.3), swept over the WHOLE catalogue on the LOCAL runtime:
 *   • every edition of every self-hosted app, monthly and yearly, is offered at
 *     the live price; bought yearly (in tier order, so upgrades are covered),
 *     payment issues the edition licence with no admin step and the validator
 *     answers with exactly that edition
 *   • every app's lifetime licence and the suite: bought, issued, and a signed
 *     offline activation file verifies like an engine verifies it
 *   • every plan and billing period checks out at the live list price
 * ============================================================================ */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { doc, meta } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);
const TEST_SIGNING_PUBLIC_KEY_B64 = "tljcAsNNvb0cxHPRnNTkm5o15YfzMWJGOyeew1UwvpY=";   // serve-local.sh test key
const rnd = () => `10.${80 + Math.floor(Math.random() * 40)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;

class Client {
  cookie = ""; ip = rnd();
  async call(method: string, p: string, body?: unknown) {
    const res = await fetch(BASE + p, {
      method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { "cf-connecting-ip": this.ip, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  }
  get = (p: string) => this.call("GET", p);
  post = (p: string, b: unknown = {}) => this.call("POST", p, b);
  put = (p: string, b: unknown = {}) => this.call("PUT", p, b);
}

const admin = new Client();
async function member(tag: string): Promise<Client> {
  const c = new Client();
  const r = await c.post("/api/auth/register", { email: `cat-${tag}-${RUN}@example.com`, name: `Catalogue ${tag}`, organization: "Sweep Ltd", password: "Catalogue-Pass-2026", acceptTerms: true });
  assert.equal(r.status, 200, r.text);
  return c;
}
const validate = (key: string, machine: string, product: string) =>
  fetch(`${BASE}/api/license-validate`, { method: "POST", headers: { "Content-Type": "application/json", "cf-connecting-ip": rnd() }, body: JSON.stringify({ license_key: key, machine_id: machine, product, nonce: crypto.randomUUID() }) }).then((r) => r.json());
/** A machine id like the engines persist: 32 lowercase hex characters, unique per name. */
const mid = (s: string) => createHash("md5").update(`${s}-${RUN}`).digest("hex");

async function verifyFile(text: string): Promise<string[] | null> {
  const f = JSON.parse(text);
  const key = await crypto.subtle.importKey("raw", Buffer.from(TEST_SIGNING_PUBLIC_KEY_B64, "base64"), { name: "Ed25519" }, false, ["verify"]);
  const ok = await crypto.subtle.verify({ name: "Ed25519" }, key, Buffer.from(f.signature, "base64"), new TextEncoder().encode(f.payload));
  return ok ? String(f.payload).split("|") : null;
}

let editions: any[] = [];

before(async () => {
  admin.cookie = await adminCookie();
  const g = await admin.get("/api/admin/gateways");
  if (!g.json.gateways.find((x: any) => x.id === "manual")?.active) {
    assert.equal((await admin.put("/api/admin/gateways", { gateway: "manual", is_active: true, credentials: { bank_name: "BNI", account_number: "0123456789", account_name: "AXTO" } })).status, 200);
  }
  const e = await new Client().get("/api/editions");
  assert.equal(e.status, 200);
  editions = e.json.editions;
});

test("catalogue: all 10 apps are on sale in their editions, monthly and yearly, at the live price", async () => {
  const apps = new Set(editions.map((e) => e.app));
  assert.equal(apps.size, 10, `10 apps on sale: ${[...apps].join(", ")}`);
  const buyer = await member("prices");
  for (const e of editions) {
    for (const cycle of ["monthly", "yearly"] as const) {
      const c = await buyer.post("/api/billing/checkout", { kind: "edition", edition: e.code, cycle, gateway: "manual", amountUsd: 1 });
      assert.equal(c.status, 200, `${e.code} ${cycle}: ${c.text}`);
      assert.equal(c.json.amountUsd, e[cycle], `${e.code} ${cycle} at the live price`);
      const o = await doc("orders", c.json.orderId);
      assert.deepEqual([o.plan, o.cycle, meta(o).edition?.code], ["edition", cycle, e.code]);
    }
  }
});

test("catalogue: every edition of every app is issued on payment and validates as exactly that edition", { timeout: 600_000 }, async () => {
  const byApp = new Map<string, any[]>();
  for (const e of editions) byApp.set(e.app, [...(byApp.get(e.app) || []), e]);
  for (const [app, list] of byApp) {
    const buyer = await member(`ed-${app}`);
    const machine = mid(`ed-${app}`);
    for (const e of list) {          // tier order: Starter → … → Enterprise, so every upgrade is covered too
      const c = await buyer.post("/api/billing/checkout", { kind: "edition", edition: e.code, cycle: "yearly", gateway: "manual" });
      assert.equal(c.status, 200, `${e.code}: ${c.text}`);
      const paid = await admin.post("/api/admin/orders", { action: "mark_paid", id: c.json.orderId });
      assert.equal(paid.status, 200, `${e.code} paid: ${paid.text}`);
      const sh = await buyer.get("/api/selfhosted");
      const lic = sh.json.products.find((p: any) => p.slug === app).licenses.find((l: any) => l.source === "edition" && l.status === "active");
      assert.ok(lic, `${e.code}: an active edition licence`);
      assert.equal(lic.package_code, e.code, `${app}: the licence carries ${e.code}`);
      assert.ok(Date.parse(lic.expires_at) > Date.now() + 360 * 86_400_000, `${e.code}: a year`);
      const v = await validate(lic.license_key, machine, app);
      assert.equal(v.valid, true, `${e.code} validates: ${JSON.stringify(v)}`);
      assert.equal(v.package_code, e.code);
      assert.equal(v.license_type, "paid");
      if (e === list[list.length - 1]) {
        // The top edition is the app's complete set — the same signed answer a plan licence gets (lib/entitlements.ts).
        assert.equal(v.features?.edition, undefined, `${e.code}: the full top set`);
      } else {
        assert.equal(v.features?.edition, e.tier, `${e.code}: signed as the narrowed ${e.tier} edition`);
      }
    }
  }
});

test("catalogue: every app's lifetime licence and the suite are issued on payment and activate offline", { timeout: 600_000 }, async () => {
  const opts = await new Client().get("/api/billing/options");
  const tier1 = opts.json.lifetime.tiers.find((t: any) => t.devices === 1);
  const buyer = await member("lifetime");
  const apps = [...new Set(editions.map((e) => e.app))] as string[];
  for (const app of [...apps, "suite"]) {
    const body = app === "suite" ? { kind: "lifetime", scope: "suite", devices: 1, gateway: "manual" } : { kind: "lifetime", scope: "app", product: app, devices: 1, gateway: "manual" };
    const c = await buyer.post("/api/billing/checkout", body);
    assert.equal(c.status, 200, `${app}: ${c.text}`);
    assert.equal(c.json.amountUsd, app === "suite" ? tier1.suite : tier1.app, `${app} at the live lifetime price`);
    assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: c.json.orderId })).status, 200, `${app} paid`);
  }
  const l = await buyer.get("/api/lifetime");
  assert.equal(l.status, 200);
  assert.equal(l.json.licenses.length, apps.length + 1, "one licence per order");
  for (const lic of l.json.licenses) {
    assert.equal(lic.status, "active");
    const products = lic.scope === "suite" ? apps.slice(0, 2) : [lic.product];      // the suite: two apps are enough to prove the scope
    for (const product of products) {
      const r = await buyer.post("/api/lifetime", { action: "activate", licenseId: lic.id, product, machineId: mid(`lt-${lic.id}-${product}`) });
      assert.equal(r.status, 200, `${lic.product} → ${product}: ${r.text}`);
      const f = await verifyFile(r.json.file);
      assert.ok(f, `${product}: the activation file verifies with the licence public key`);
      assert.equal(f![0], "axto-lifetime-1");
      assert.equal(f![2], product);
      assert.equal(f![4], lic.scope);
    }
  }
});

test("catalogue: every plan and billing period checks out at the live list price", async () => {
  const opts = await new Client().get("/api/billing/options");
  const buyer = await member("plans");
  assert.ok(opts.json.plans.length >= 4);
  for (const p of opts.json.plans) {
    for (const cycle of ["monthly", "yearly"] as const) {
      const c = await buyer.post("/api/billing/checkout", { plan: p.id, cycle, gateway: "manual", amount: 0.01 });
      assert.equal(c.status, 200, `${p.id} ${cycle}: ${c.text}`);
      assert.equal(c.json.amountUsd, p[cycle], `${p.id} ${cycle} at the live price`);
    }
  }
});
