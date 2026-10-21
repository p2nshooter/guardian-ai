/* ==============================================================================
 * AXTO — editions per self-hosted app and the "100 trial licences per app"
 * programme end to end on the LOCAL runtime (docs/AXTO-APPS-BLUEPRINT.md §3–§4):
 *   public editions + live prices → checkout at OUR price → payment issues an
 *   edition licence (no admin step) → the validator signs the narrowed edition →
 *   admin prices / on-off → trial pool → claim (zero-touch) → abuse limits →
 *   trial signed as trial → one trial per server → paid edition replaces it.
 * ============================================================================ */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { doc, list, meta, seedAdmin, update, userByEmail } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);

class Client {
  cookie = "";
  constructor(public ip = `10.61.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`) {}
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

const validate = (key: string, machine: string, product: string) =>
  fetch(`${BASE}/api/license-validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ license_key: key, machine_id: machine, product, nonce: crypto.randomUUID() }) }).then((r) => r.json());

const admin = new Client(), buyer = new Client(), tryer = new Client(), sameIp = new Client(), third = new Client();
let orderId = "", editionKey = "";

before(async () => {
  await seedAdmin("e2e-admin@axto.io");
  admin.cookie = await adminCookie();
  const g = await admin.get("/api/admin/gateways");
  if (!g.json.gateways.find((x: any) => x.id === "manual")?.active) {
    assert.equal((await admin.put("/api/admin/gateways", { gateway: "manual", is_active: true, credentials: { bank_name: "BNI", account_number: "0123456789", account_name: "AXTO" } })).status, 200);
  }
  sameIp.ip = tryer.ip;
  for (const [c, n] of [[buyer, "buyer"], [tryer, "tryer"], [sameIp, "same-ip"], [third, "third"]] as const) {
    assert.equal((await c.post("/api/auth/register", { email: `ed-${n}-${RUN}@example.com`, name: `Edition ${n}`, password: "abcdefgh1", acceptTerms: true })).status, 200);
  }
});

test("editions: public catalogue with live prices; checkout charges OUR price", async () => {
  const pub = await new Client().get("/api/editions");
  assert.equal(pub.status, 200);
  const vault = pub.json.editions.filter((e: any) => e.app === "vault");
  assert.deepEqual(vault.map((e: any) => e.code), ["vault_starter", "vault_professional", "vault_business", "vault_enterprise"]);
  assert.equal(pub.json.editions.find((e: any) => e.code === "lite").name, "Sentinel Lite");
  assert.equal((await new Client().post("/api/billing/checkout", { kind: "edition", edition: "vault_starter", cycle: "yearly", gateway: "manual" })).status, 401);
  assert.equal((await buyer.post("/api/billing/checkout", { kind: "edition", edition: "vault_nope", cycle: "yearly", gateway: "manual" })).status, 400);
  assert.equal((await buyer.post("/api/billing/checkout", { kind: "edition", edition: "vault_starter", cycle: "weekly", gateway: "manual" })).status, 400);
  const c = await buyer.post("/api/billing/checkout", { kind: "edition", edition: "vault_starter", cycle: "yearly", gateway: "manual", amountUsd: 1 });
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.amountUsd, 4990, "the browser never sets the price");
  orderId = c.json.orderId;
  const o = await doc("orders", orderId);
  const row = { plan: o.plan, cycle: o.cycle, amount_usd: o.amount_usd, code: meta(o).edition?.code };
  assert.deepEqual(row, { plan: "edition", cycle: "yearly", amount_usd: 4990, code: "vault_starter" });
});

test("editions: payment issues the edition licence with no admin step; the validator signs the narrowed edition", async () => {
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: orderId })).status, 200);
  const sh = await buyer.get("/api/selfhosted");
  const v = sh.json.products.find((p: any) => p.slug === "vault");
  const lic = v.licenses.find((l: any) => l.source === "edition");
  assert.ok(lic, JSON.stringify(v.licenses));
  assert.equal(lic.package_code, "vault_starter"); assert.equal(lic.edition, "Starter"); assert.equal(lic.status, "active");
  assert.ok(Date.parse(lic.expires_at) > Date.now() + 360 * 86_400_000);
  editionKey = lic.license_key;
  const ok = await validate(editionKey, "machine-ed-1", "vault");
  assert.equal(ok.valid, true, JSON.stringify(ok));
  assert.equal(ok.package_code, "vault_starter"); assert.equal(ok.license_type, "paid"); assert.equal(ok.source, "edition");
  assert.equal(ok.features.max_requests_daily, 50000); assert.equal(ok.features.hipaa_report, false); assert.equal(ok.features.edition, "starter");
  const inv = await buyer.get(`/api/billing/invoice/${orderId}`);
  assert.match(inv.text, /Vault AI — Starter edition, 1 year/);
  // The plan's slots are not used by an edition.
  assert.equal(sh.json.used, 0);
});

test("editions: admin prices and on/off reach checkout and the public catalogue", async () => {
  assert.equal((await new Client().get("/api/admin/editions")).status, 403);
  const a = await admin.get("/api/admin/editions");
  assert.equal(a.status, 200);
  assert.equal(a.json.editions.find((e: any) => e.code === "vault_starter").active, 1);
  assert.equal((await admin.put("/api/admin/editions", { prices: [{ code: "nope", yearly: 1, monthly: 1 }] })).status, 400);
  assert.equal((await admin.put("/api/admin/editions", { prices: [{ code: "edge_starter", yearly: 8800, monthly: 880, enabled: true }, { code: "edge_business", yearly: 40900, monthly: 4090, enabled: false }] })).status, 200);
  const pub = await new Client().get("/api/editions");
  assert.equal(pub.json.editions.find((e: any) => e.code === "edge_starter").yearly, 8800);
  assert.ok(!pub.json.editions.some((e: any) => e.code === "edge_business"), "switched-off edition is hidden");
  assert.equal((await buyer.post("/api/billing/checkout", { kind: "edition", edition: "edge_business", cycle: "yearly", gateway: "manual" })).status, 400, "not on sale");
  const c = await buyer.post("/api/billing/checkout", { kind: "edition", edition: "edge_starter", cycle: "monthly", gateway: "manual" });
  assert.equal(c.json.amountUsd, 880);
  // Large amounts: PayPal is not offered.
  assert.equal((await buyer.post("/api/billing/checkout", { kind: "edition", edition: "soc_enterprise", cycle: "yearly", gateway: "paypal" })).status, 400);
  await admin.put("/api/admin/editions", { prices: [{ code: "edge_starter", yearly: 7990, monthly: 799, enabled: true }, { code: "edge_business", yearly: 40900, monthly: 4090, enabled: true }] });
});

test("trials: admin creates the pool; members claim zero-touch; abuse limits hold", async () => {
  assert.equal((await new Client().get("/api/admin/trials")).status, 403);
  assert.equal((await admin.put("/api/admin/trials", { config: { enabled: true, days: 14, maxProducts: 2, perApp: 100 } })).status, 200);
  // Large jobs run in steps (each well inside Cloudflare's per-request limits): follow `next` like the admin screen does.
  let g = await admin.post("/api/admin/trials", { action: "generate", product: "all", count: 100 });
  assert.equal(g.status, 200, g.text);
  const made: { product: string; created: number }[] = [...g.json.made];
  for (let i = 0; g.json.next && i < 50; i++) {
    g = await admin.post("/api/admin/trials", g.json.next);
    assert.equal(g.status, 200, g.text);
    made.push(...g.json.made);
  }
  assert.equal(g.json.next, null, "the job finished");
  assert.equal(new Set(made.map((m) => m.product)).size, 10);
  assert.ok(made.filter((m) => m.product === "legal").reduce((n, m) => n + m.created, 0) >= 100);
  const pub = await new Client().get("/api/editions");
  assert.equal(pub.json.trials.open, true);
  assert.ok(pub.json.trials.apps.legal.available >= 100);
  assert.equal(pub.json.trials.apps.legal.edition, "Professional");

  const r = await tryer.post("/api/selfhosted", { action: "trial", product: "legal" });
  assert.equal(r.status, 200, r.text);
  assert.match(r.json.trial.code, /^TRIAL-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  const days = (Date.parse(r.json.trial.expiresAt) - Date.now()) / 86_400_000;
  assert.ok(days > 13.9 && days < 14.1, String(days));
  const trialKey = r.json.trial.key;
  assert.match(trialKey, /^LEGL-/);
  // Signed as a trial of the Professional edition.
  const v = await validate(trialKey, "machine-tr-1", "legal");
  assert.equal(v.valid, true, JSON.stringify(v));
  assert.equal(v.license_type, "trial"); assert.equal(v.package_code, "legal_professional"); assert.equal(v.features.trial, true); assert.equal(v.features.workspaces, 10);
  assert.match(v.warning, /Trial licence/);
  // Limits.
  assert.equal((await tryer.post("/api/selfhosted", { action: "trial", product: "legal" })).json.reason, "used");
  assert.equal((await sameIp.post("/api/selfhosted", { action: "trial", product: "legal" })).json.reason, "ip", "one per network per app");
  assert.equal((await tryer.post("/api/selfhosted", { action: "trial", product: "soc" })).status, 200);
  assert.equal((await tryer.post("/api/selfhosted", { action: "trial", product: "edge" })).json.reason, "max_products");
  assert.equal((await buyer.post("/api/selfhosted", { action: "trial", product: "vault" })).json.reason, "licensed", "never over a paid licence");
  // One trial per app per server: a second account's trial cannot run on the same machine.
  const t3 = await third.post("/api/selfhosted", { action: "trial", product: "legal" });
  assert.equal(t3.status, 200, t3.text);
  const reuse = await validate(t3.json.trial.key, "machine-tr-1", "legal");
  assert.equal(reuse.valid, false); assert.equal(reuse.reason, "trial_used_on_machine");
  assert.equal((await validate(t3.json.trial.key, "machine-tr-2", "legal")).valid, true);
  // Rating.
  assert.equal((await tryer.post("/api/selfhosted", { action: "rate", product: "legal", rating: 5 })).status, 200);
  assert.equal((await tryer.post("/api/selfhosted", { action: "rate", product: "legal", rating: 9 })).status, 400);
  const adm = await admin.get("/api/admin/trials");
  const legal = adm.json.apps.find((a: any) => a.slug === "legal");
  assert.ok(legal.claimed >= 2); assert.equal(legal.rating, 5);
  assert.match((await admin.get("/api/admin/trials?format=csv")).text, /^code,app,batch,status/);
});

test("trials: an expired trial is refused with the buy link; buying the edition converts it", async () => {
  const tryerId = (await userByEmail(`ed-tryer-${RUN}@example.com`)).id;
  const t0 = (await list("shLicenses", "user", tryerId)).find((l: any) => l.product === "soc" && l.source === "trial");
  const lic = { k: t0.license_key, id: t0.id };
  await update("shLicenses", lic.id, { expires_at: "2020-01-01T00:00:00.000Z" });
  const v = await validate(lic.k, "machine-soc", "soc");
  assert.equal(v.valid, false); assert.equal(v.reason, "trial_expired"); assert.match(v.error, /Buy an edition/);
  const c = await tryer.post("/api/billing/checkout", { kind: "edition", edition: "soc_starter", cycle: "monthly", gateway: "manual" });
  assert.equal(c.status, 200, c.text);
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: c.json.orderId })).status, 200);
  const sh = await tryer.get("/api/selfhosted");
  const soc = sh.json.products.find((p: any) => p.slug === "soc");
  assert.ok(soc.licenses.some((l: any) => l.source === "edition" && l.status === "active" && l.package_code === "soc_starter"));
  assert.ok(!soc.licenses.some((l: any) => l.source === "trial" && l.status === "active"), "the trial is replaced");
  assert.equal((await list("shTrials", "email", `ed-tryer-${RUN}@example.com`)).find((t: any) => t.product === "soc").converted, 1);
});

test("trials: admin can pause the programme and end a trial", async () => {
  await admin.put("/api/admin/trials", { config: { enabled: false } });
  assert.equal((await new Client().get("/api/editions")).json.trials.open, false);
  assert.equal((await buyer.post("/api/selfhosted", { action: "trial", product: "studio" })).json.reason, "closed");
  await admin.put("/api/admin/trials", { config: { enabled: true, days: 14, maxProducts: 2 } });
  const t = (await list("shTrials", "email", `ed-third-${RUN}@example.com`)).find((x: any) => x.product === "legal");
  assert.equal((await admin.post("/api/admin/trials", { action: "revoke", code: t.code })).status, 200);
  const thirdId = (await userByEmail(`ed-third-${RUN}@example.com`)).id;
  const l = (await list("shLicenses", "user", thirdId)).find((x: any) => x.source === "trial");
  assert.equal(l.status, "revoked");
});
