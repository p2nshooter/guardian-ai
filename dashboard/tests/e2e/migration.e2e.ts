/* ==============================================================================
 * AXTO — the one-time move of the records from D1 to R2, end to end.
 * serve-local.sh puts "legacy" rows into the local D1 (the old schema) before
 * the server starts; the first requests move them, exactly as production's
 * first requests (and the deploy job) did. This checks they arrived with the
 * same ids, that sign-in and the subscription work from R2, and that the move
 * reports itself done in /api/health and to the deploy job.
 * ============================================================================ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { config, data, doc, userByEmail } from "./data";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const CRON = { "x-cron-secret": "e2e-cron-secret" };

async function untilMoved() {
  // The deploy job's loop: one step per call until done.
  for (let i = 0; i < 200; i++) {
    const r = await fetch(`${BASE}/api/cron/migrate`, { method: "POST", headers: CRON });
    assert.equal(r.status, 200);
    if ((await r.json()).done) return;
  }
  assert.fail("the move did not finish");
}

test("migration: the deploy endpoint needs the cron secret", async () => {
  assert.equal((await fetch(`${BASE}/api/cron/migrate`, { method: "POST" })).status, 401);
});

test("migration: legacy D1 records arrive in R2 with the same ids", async () => {
  await untilMoved();
  const h = await (await fetch(`${BASE}/api/health`)).json();
  assert.equal(h.records, "ready");
  assert.ok(h.movedAt);
  const m = await data({ op: "migration" });
  assert.equal(m.done, true);
  assert.equal(m.state.source, "d1");
  for (const t of ["users", "subscriptions", "orders"]) assert.ok(m.state.tables[t].r2 >= m.state.tables[t].d1, `${t}: every row arrived`);
  assert.deepEqual(m.state.incomplete ?? [], []);

  const u = await userByEmail("legacy-member@example.com");
  assert.equal(u.id, "legacy-user-1");
  assert.equal(u.name, "Legacy Member");
  assert.equal(u.created_at, "2026-01-02T03:04:05.000Z", "D1 datetimes become ISO");
  const sub = await doc("subscriptions", "legacy-user-1");
  assert.equal(sub.plan, "pro");
  const o = await doc("orders", "ord_legacy_1");
  assert.equal(o.invoice_no, "AXTO-2026-000001");
  assert.equal(o.amount_usd, 490);
  assert.equal(await config("e2e_legacy_setting"), "carried-over", "settings move too");

  // A second run changes nothing (the move is done once).
  const again = await (await fetch(`${BASE}/api/cron/migrate`, { method: "POST", headers: CRON })).json();
  assert.equal(again.done, true);
  assert.equal(again.at, m.state.at);
});

test("migration: the moved member's plan is served from R2", async () => {
  // The admin grants nothing here: the subscription that came from D1 is what /api/admin/members shows.
  const { adminCookie } = await import("./admin-session");
  const cookie = await adminCookie();
  const r = await fetch(`${BASE}/api/admin/members/legacy-user-1`, { headers: { Cookie: cookie } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.user.email, "legacy-member@example.com");
  assert.equal(j.subscription.plan, "pro");
  assert.equal(j.orders[0].id, "ord_legacy_1");
});
