/* ==============================================================================
 * Lifetime Friday deals and customer offers end to end on the LOCAL runtime
 * (docs/AXTO-APPS-BLUEPRINT.md §15):
 *   public deal prices → checkout charges today's best price (list or deal) →
 *   admin deal settings → offer validation (floor kept private) →
 *   offer → decline → offer → counter → checkout at the agreed price → paid →
 *   licence issued with no admin step → offer closed as paid; accept,
 *   withdraw, expiry, anti-spam limit, offers closed.
 * The calendar itself (Fridays, last Friday, time zones) is unit-tested in
 * tests/lifetime-deals.test.ts with a fixed clock — no test hooks in the app.
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
const DEFAULTS = { enabled: true, fridayPct: 30, lastFridayPct: 50, tz: "Asia/Jakarta", offersEnabled: true, minOfferPct: 40, offerValidDays: 7 };

class Client {
  cookie = ""; ip = `10.45.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
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
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p: string) => this.call("GET", p);
  post = (p: string, b: unknown = {}) => this.call("POST", p, b);
  put = (p: string, b: unknown = {}) => this.call("PUT", p, b);
}

function d1(sql: string): any[] {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "axto-db", "--local", "--persist-to", "../persist", "--command", sql, "--json"], {
    cwd: CTL_DIR, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.slice(out.indexOf("[")))[0]?.results || [];
}

const admin = new Client(), member = new Client(), other = new Client();
const email = `offers-${RUN}@example.com`;
const deal = async () => (await new Client().get("/api/lifetime/deal")).json;

before(async () => {
  d1(`INSERT OR IGNORE INTO users (id, email, role, name, created_at, updated_at) VALUES ('e2e-admin', 'e2e-admin@axto.io', 'admin', 'E2E Admin', datetime('now'), datetime('now'))`);
  admin.cookie = await adminCookie();
  const g = await admin.get("/api/admin/gateways");
  if (!g.json.gateways.find((x: any) => x.id === "manual")?.active) {
    assert.equal((await admin.put("/api/admin/gateways", { gateway: "manual", is_active: true, credentials: { bank_name: "BNI", account_number: "0123456789", account_name: "AXTO" } })).status, 200);
  }
  for (const [c, e] of [[member, email], [other, `offers-other-${RUN}@example.com`]] as const) {
    assert.equal((await c.post("/api/auth/register", { email: e, name: "Offer Test", organization: "E2E Corp", password: "abcdefgh1", acceptTerms: true })).status, 200);
  }
  assert.equal((await admin.put("/api/admin/lifetime/deals", DEFAULTS)).status, 200);
});
after(async () => { await admin.put("/api/admin/lifetime/deals", DEFAULTS); });

test("deals: public prices with today's Friday deal, the rules, and the next deal", async () => {
  const r = await new Client().get("/api/lifetime/deal");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("cache-control") || "", /public/);
  assert.deepEqual(r.json.rules, { enabled: true, fridayPct: 30, lastFridayPct: 50, tz: "Asia/Jakarta" });
  assert.equal(r.json.tiers.length, 6);
  assert.equal(r.json.offersEnabled, true);
  assert.equal(r.json.offerValidDays, 7);
  assert.equal(r.json.minOfferPct, undefined, "the offer floor stays private");
  const next = r.json.deal.next;
  assert.ok(next && [30, 50].includes(next.pct), "a next Friday deal is always announced");
  assert.equal(new Date(next.date + "T12:00:00Z").getUTCDay(), 5, "deals fall on a Friday");
  assert.ok(Date.parse(next.startsAt) > Date.now());
  const a = r.json.deal.active;
  const t1 = r.json.tiers[0];
  if (a) assert.equal(t1.appDeal, Math.round((t1.app * (100 - a.pct)) / 100));
  else assert.equal(t1.appDeal, t1.app, "no deal today → list price");
});

test("deals: checkout charges today's best price and records the list price", async () => {
  const d = await deal();
  const tier = d.tiers.find((t: any) => t.devices === 10);
  const c = await member.post("/api/billing/checkout", { kind: "lifetime", scope: "suite", devices: 10, gateway: "manual", amountUsd: 1 });
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.amountUsd, tier.suiteDeal);
  const [row] = d1(`SELECT amount_usd, json_extract(meta, '$.lifetime.listUsd') AS list, json_extract(meta, '$.lifetime.price') AS src, COALESCE(json_extract(meta, '$.lifetime.dealPct'), 0) AS pct FROM orders WHERE id = '${c.json.orderId}'`);
  assert.equal(row.list, tier.suite);
  assert.equal(row.src, d.deal.active ? "deal" : "list");
  assert.equal(row.pct, d.deal.active ? d.deal.active.pct : 0);
});

test("deals: admin settings are validated, audited and drive the public prices", async () => {
  assert.equal((await member.get("/api/admin/lifetime/deals")).status, 403);
  assert.equal((await member.put("/api/admin/lifetime/deals", { fridayPct: 90 })).status, 403);
  assert.equal((await admin.put("/api/admin/lifetime/deals", { tz: "Mars/Olympus" })).status, 400);
  assert.equal((await admin.put("/api/admin/lifetime/deals", { fridayPct: 95 })).status, 400);
  assert.equal((await admin.put("/api/admin/lifetime/deals", { minOfferPct: 0 })).status, 400);
  const s = await admin.put("/api/admin/lifetime/deals", { fridayPct: 20, lastFridayPct: 40 });
  assert.equal(s.status, 200, s.text);
  assert.equal(s.json.cfg.tz, "Asia/Jakarta", "untouched fields keep their value");
  const d = await deal();
  assert.deepEqual([d.rules.fridayPct, d.rules.lastFridayPct], [20, 40]);
  assert.ok([20, 40].includes(d.deal.next.pct));
  assert.equal((await admin.put("/api/admin/lifetime/deals", { enabled: false })).status, 200);
  const off = await deal();
  assert.equal(off.deal.active, null);
  assert.equal(off.deal.next, null);
  assert.equal(off.tiers[0].appDeal, off.tiers[0].app, "deals off → list price");
  const g = await admin.get("/api/admin/lifetime/deals");
  assert.equal(g.json.cfg.enabled, false);
  assert.equal(g.json.defaults.fridayPct, 30);
  assert.equal((await admin.put("/api/admin/lifetime/deals", DEFAULTS)).status, 200);
  assert.ok(d1(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'admin.lifetime.deals'`)[0].n >= 3);
});

test("offers: validation — signed-in members only, floor kept private, no offers at list price", async () => {
  assert.equal((await new Client().post("/api/lifetime/offers", { action: "make", scope: "app", product: "vault", devices: 1, offerUsd: 15000 })).status, 401);
  assert.equal((await admin.post("/api/lifetime/offers", { action: "make", scope: "app", product: "vault", devices: 1, offerUsd: 15000 })).status, 400);
  const above = await member.post("/api/lifetime/offers", { action: "make", scope: "app", product: "vault", devices: 1, offerUsd: 24900 });
  assert.equal(above.status, 400);
  assert.equal(above.json.code, "above_list");
  const low = await member.post("/api/lifetime/offers", { action: "make", scope: "app", product: "vault", devices: 1, offerUsd: 1000 });
  assert.equal(low.status, 400);
  assert.equal(low.json.code, "below_floor");
  assert.doesNotMatch(low.text, /9,?960/, "the minimum is not disclosed");
  assert.equal((await member.post("/api/lifetime/offers", { action: "make", scope: "app", product: "vault", devices: 3, offerUsd: 15000 })).json.code, "devices");
  assert.equal((await member.post("/api/lifetime/offers", { action: "make", scope: "app", product: "vault", devices: 1, offerUsd: 15000.5 })).json.code, "amount");
  assert.equal((await member.post("/api/lifetime/offers", { action: "make", scope: "app", product: "nope", devices: 1, offerUsd: 15000 })).status, 400);
  assert.equal(d1(`SELECT COUNT(*) AS n FROM lifetime_offers WHERE email = '${email}'`)[0].n, 0, "refused offers are not stored");
});

test("offers: offer → decline → offer → counter → pay the agreed price → licence, offer paid", async () => {
  const o1 = await member.post("/api/lifetime/offers", { action: "make", scope: "app", product: "vault", devices: 1, offerUsd: 12000, note: "Startup budget <b>please</b>" });
  assert.equal(o1.status, 200, o1.text);
  assert.equal(o1.json.offer.status, "pending");
  assert.equal(o1.json.offer.list_usd, 24900);
  const dup = await member.post("/api/lifetime/offers", { action: "make", scope: "app", product: "vault", devices: 1, offerUsd: 13000 });
  assert.equal(dup.status, 409);
  assert.equal(dup.json.code, "open_exists");

  const q = await admin.get("/api/admin/lifetime/offers?status=pending");
  const row = q.json.offers.find((x: any) => x.id === o1.json.offer.id);
  assert.ok(row, "the offer is in the admin queue");
  assert.equal(row.productName.length > 0, true);
  assert.equal((await member.post("/api/admin/lifetime/offers", { action: "accept", id: row.id })).status, 403);
  const noReason = await admin.post("/api/admin/lifetime/offers", { action: "decline", id: row.id });
  assert.equal(noReason.status, 400);
  assert.equal(noReason.json.code, "reason");
  const dec = await admin.post("/api/admin/lifetime/offers", { action: "decline", id: row.id, note: "Too far from our price this month." });
  assert.equal(dec.status, 200, dec.text);
  assert.equal(dec.json.offer.status, "declined");
  assert.equal((await admin.post("/api/admin/lifetime/offers", { action: "accept", id: row.id })).status, 409, "decided once");
  const mine = (await member.get("/api/lifetime/offers")).json.offers;
  assert.equal(mine[0].status, "declined");
  assert.equal(mine[0].admin_note, "Too far from our price this month.");
  const dead = await member.post("/api/billing/checkout", { kind: "lifetime", offerId: row.id, gateway: "manual" });
  assert.equal(dead.status, 409);
  assert.equal(dead.json.code, "offer_invalid");

  // A new offer after a decline; the admin counters (below every default deal price).
  const o2 = await member.post("/api/lifetime/offers", { action: "make", scope: "app", product: "vault", devices: 1, offerUsd: 10500 });
  assert.equal(o2.status, 200, o2.text);
  const id2 = o2.json.offer.id;
  assert.equal((await admin.post("/api/admin/lifetime/offers", { action: "counter", id: id2, agreedUsd: 10000 })).json.code, "counter_range", "counter above the offer");
  assert.equal((await admin.post("/api/admin/lifetime/offers", { action: "counter", id: id2, agreedUsd: 24900 })).json.code, "counter_range", "counter below the list price");
  const ctr = await admin.post("/api/admin/lifetime/offers", { action: "counter", id: id2, agreedUsd: 11000, note: "Meet you halfway." });
  assert.equal(ctr.status, 200, ctr.text);
  assert.equal(ctr.json.offer.status, "countered");
  assert.equal(ctr.json.offer.agreed_usd, 11000);
  const days = (Date.parse(ctr.json.offer.valid_until) - Date.now()) / 86_400_000;
  assert.ok(days > 6.9 && days <= 7, `reserved for 7 days (${days})`);

  assert.equal((await other.post("/api/billing/checkout", { kind: "lifetime", offerId: id2, gateway: "manual" })).status, 409, "only the member who made the offer can pay it");
  // The browser cannot change the licence of an agreed offer.
  const c = await member.post("/api/billing/checkout", { kind: "lifetime", offerId: id2, scope: "suite", devices: 100, gateway: "manual", amountUsd: 1 });
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.amountUsd, 11000);
  const [ord] = d1(`SELECT json_extract(meta, '$.lifetime.offerId') AS offer, json_extract(meta, '$.lifetime.price') AS src, json_extract(meta, '$.lifetime.product') AS product, json_extract(meta, '$.lifetime.devices') AS devices, json_extract(meta, '$.lifetime.listUsd') AS list FROM orders WHERE id = '${c.json.orderId}'`);
  assert.deepEqual(ord, { offer: id2, src: "offer", product: "vault", devices: 1, list: 24900 });

  const before = (await member.get("/api/lifetime")).json.licenses.length;
  assert.equal((await admin.post("/api/admin/orders", { action: "mark_paid", id: c.json.orderId })).status, 200);
  const lics = (await member.get("/api/lifetime")).json.licenses;
  assert.equal(lics.length, before + 1, "the licence is issued with no extra admin step");
  assert.equal(lics[0].product, "vault");
  assert.equal(lics[0].devices, 1);
  const paid = (await member.get("/api/lifetime/offers")).json.offers.find((x: any) => x.id === id2);
  assert.equal(paid.status, "paid");
  assert.equal(paid.order_id, c.json.orderId);
  assert.equal((await member.post("/api/billing/checkout", { kind: "lifetime", offerId: id2, gateway: "manual" })).status, 409, "a paid offer cannot be paid again");
  const inv = await member.get(`/api/billing/invoice/${c.json.orderId}`);
  assert.match(inv.text, /agreed offer/);
  const acts = d1(`SELECT action FROM audit_log WHERE entity_id IN ('${row.id}', '${id2}') ORDER BY created_at`).map((x) => x.action);
  for (const a of ["lifetime.offer.made", "lifetime.offer.declined", "lifetime.offer.countered"]) assert.ok(acts.includes(a), `audited: ${a}`);
});

test("offers: accept, withdraw, expiry, anti-spam limit and closing offers", async () => {
  const a = await other.post("/api/lifetime/offers", { action: "make", scope: "suite", devices: 1, offerUsd: 70000 });
  assert.equal(a.status, 200, a.text);
  const acc = await admin.post("/api/admin/lifetime/offers", { action: "accept", id: a.json.offer.id });
  assert.equal(acc.json.offer.status, "accepted");
  assert.equal(acc.json.offer.agreed_usd, 70000);
  assert.equal((await member.post("/api/lifetime/offers", { action: "withdraw", id: a.json.offer.id })).status, 409, "not someone else's offer");
  assert.equal((await other.post("/api/lifetime/offers", { action: "withdraw", id: a.json.offer.id })).status, 200);
  assert.equal((await other.post("/api/billing/checkout", { kind: "lifetime", offerId: a.json.offer.id, gateway: "manual" })).status, 409);

  const b = await other.post("/api/lifetime/offers", { action: "make", scope: "suite", devices: 1, offerUsd: 72000 });
  assert.equal(b.status, 200, b.text);
  assert.equal((await admin.post("/api/admin/lifetime/offers", { action: "accept", id: b.json.offer.id })).status, 200);
  d1(`UPDATE lifetime_offers SET valid_until = '2020-01-01T00:00:00.000Z' WHERE id = '${b.json.offer.id}'`);
  assert.equal((await other.get("/api/lifetime/offers")).json.offers.find((x: any) => x.id === b.json.offer.id).status, "expired");
  assert.equal((await other.post("/api/billing/checkout", { kind: "lifetime", offerId: b.json.offer.id, gateway: "manual" })).status, 409, "expired");

  for (const devices of [5, 10, 25]) {
    const r = await other.post("/api/lifetime/offers", { action: "make", scope: "app", product: "vault", devices, offerUsd: devices === 5 ? 60000 : devices === 10 ? 100000 : 200000 });
    assert.equal(r.status, 200, r.text);
  }
  const sixth = await other.post("/api/lifetime/offers", { action: "make", scope: "app", product: "vault", devices: 50, offerUsd: 400000 });
  assert.equal(sixth.status, 429);
  assert.equal(sixth.json.code, "too_many");

  assert.equal((await admin.put("/api/admin/lifetime/deals", { offersEnabled: false })).status, 200);
  const closed = await member.post("/api/lifetime/offers", { action: "make", scope: "app", product: "legal", devices: 1, offerUsd: 15000 });
  assert.equal(closed.status, 400);
  assert.equal(closed.json.code, "closed");
  assert.equal((await deal()).offersEnabled, false);
  assert.equal((await admin.put("/api/admin/lifetime/deals", DEFAULTS)).status, 200);
});
