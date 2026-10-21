/* ==============================================================================
 * AXTO — the one-time move of the records from D1 to R2 (lib/data/migrate.ts),
 * on the real old schema: every cf-migrations file is applied to an in-memory
 * SQLite database (what D1 is), legacy rows go in, and the move runs in small
 * steps against the exact R2 fake — resumable, idempotent, nothing dropped.
 * ============================================================================ */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { testData } from "./helpers/data";
import { runMigration, migrationProgress, type D1Like } from "../lib/data/migrate";

function legacyD1(): { d1: D1Like; db: DatabaseSync } {
  const db = new DatabaseSync(":memory:");
  const dir = path.join(process.cwd(), "cf-migrations");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  const stmt = (sql: string, args: unknown[] = []) => ({
    async all<T>() { return { results: db.prepare(sql).all(...(args as never[])) as T[] }; },
    async first<T>() { return (db.prepare(sql).get(...(args as never[])) as T) ?? null; },
  });
  const d1: D1Like = { prepare: (sql) => ({ bind: (...args: unknown[]) => stmt(sql, args), all: <T,>() => stmt(sql).all<T>() }) } as D1Like;
  return { d1, db };
}

function seed(db: DatabaseSync) {
  const ins = (sql: string, ...v: unknown[]) => db.prepare(sql).run(...(v as never[]));
  ins(`INSERT INTO users (id, email, role, name, created_at, updated_at) VALUES ('u1', 'ana@example.com', 'client', 'Ana', '2026-01-02 03:04:05', '2026-01-02 03:04:05')`);
  ins(`INSERT INTO users (id, email, role, name) VALUES ('u2', 'budi@example.com', 'client', 'Budi')`);
  // D1's UNIQUE is case-sensitive, R2's guard is not: the second one is kept as a conflict, never dropped.
  ins(`INSERT INTO users (id, email, role, name) VALUES ('u3', 'ANA@example.com', 'client', 'Ana twice')`);
  ins(`INSERT INTO subscriptions (user_id, plan, cycle, status, current_period_start, current_period_end) VALUES ('u1', 'pro', 'yearly', 'active', '2026-01-02T00:00:00.000Z', '2099-01-01T00:00:00.000Z')`);
  for (let i = 0; i < 130; i++) {
    ins(`INSERT INTO orders (id, invoice_no, user_id, email, plan, cycle, amount_usd, gateway, status, created_at) VALUES (?, ?, 'u1', 'ana@example.com', 'pro', 'monthly', 49, 'manual', 'paid', ?)`,
      `ord_${i}`, i < 3 ? `AXTO-2026-00000${i + 1}` : "", `2026-02-${String(1 + (i % 27)).padStart(2, "0")} 10:00:00`);
  }
  ins(`INSERT INTO password_resets (id, email, token, expires_at) VALUES ('r1', 'ana@example.com', 'tok-secret-123', '2099-01-01T00:00:00.000Z')`);
  ins(`INSERT INTO sh_trials (code, product, batch, status, created_at) VALUES ('TRIAL-AAAA-BBBB-CCCC', 'vault', 'tb_1', 'available', '2026-03-01 00:00:00')`);
  ins(`INSERT INTO lifetime_licenses (id, user_id, order_id, scope, product, devices, updates_until, install_key, created_at, updated_at) VALUES ('lt1', 'u1', 'ord_0', 'app', 'vault', 2, '2027-01-01T00:00:00.000Z', 'LT-KEY-1', '2026-03-01 00:00:00', '2026-03-01 00:00:00')`);
  ins(`INSERT INTO lifetime_activations (id, license_id, product, machine_id, created_at) VALUES ('a1', 'lt1', 'vault', 'm-1', '2026-03-01 00:00:00')`);
  ins(`INSERT INTO lifetime_activations (id, license_id, product, machine_id, created_at) VALUES ('a2', 'lt1', 'vault', 'm-2', '2026-03-02 00:00:00')`);
  ins(`INSERT INTO connect_events (id, user_id, channel, type, data, created_at) VALUES (1700000000000001, 'u1', 'orders', 'order.paid', 'enc', '2026-03-01T00:00:00.000Z')`);
  ins(`INSERT INTO platform_config (key, value) VALUES ('usd_idr_rate', '16400')`);
  ins(`INSERT INTO counters (name, value) VALUES ('invoice', 41)`);
  ins(`INSERT INTO magic_links (id, email, token, expires_at) VALUES ('ml1', 'old@example.com', 'old-token', '2020-01-01')`);
}

test("migration: every legacy row arrives with the same id, in resumable steps", async () => {
  const { d1, db: sql } = legacyD1();
  seed(sql);
  const { db, bucket } = testData();
  const archive = new Map<string, string>();
  const env = { d1, archive: { put: async (k: string, v: string) => { archive.set(k, v); } }, stepRows: 25 };

  let steps = 0, state = null;
  while (!state && steps < 100) { state = await runMigration(db, env, 1); steps += 1; }
  assert.ok(state, "finished");
  assert.ok(steps > 5, `ran in ${steps} steps, never all at once`);
  assert.equal(state.source, "d1");
  assert.deepEqual(state.incomplete ?? [], []);
  assert.deepEqual(state.tables.orders, { d1: 130, r2: 130, conflicts: 0 });
  // (The old schema seeds a few accounts of its own; the case-twin is the only one that cannot be a document.)
  assert.equal(state.tables.users.conflicts, 1);
  assert.equal(state.tables.users.r2 + 1, state.tables.users.d1);
  assert.deepEqual(state.conflicts, [{ table: "users", id: "u3", field: "email" }]);

  const ana = await db.users.find("email", "ana@example.com");
  assert.equal(ana?.id, "u1");
  assert.equal(ana?.created_at, "2026-01-02T03:04:05.000Z", "SQLite datetimes become ISO");
  assert.equal(ana?.password_hash, "", "NULL becomes the empty value");
  assert.equal((await db.subscriptions.get("u1"))?.plan, "pro");
  assert.equal((await db.orders.find("invoice_no", "AXTO-2026-000002"))?.id, "ord_1");
  assert.equal((await db.orders.listAllDocs("user", "u1")).length, 130);
  // The reset token itself is never kept: its SHA-256 is the id.
  const resets = await db.passwordResets.listAllDocs("email", "ana@example.com");
  assert.equal(resets.length, 1);
  assert.ok(!JSON.stringify(resets).includes("tok-secret-123"));
  assert.equal(resets[0]!.id.length, 64);
  assert.equal((await db.shTrials.get("TRIAL-AAAA-BBBB-CCCC"))?.status, "available");
  const seats = (await db.lifetimeActivations.listAllDocs("license", "lt1")).map((a) => [a.machine_id, a.slot]);
  assert.deepEqual(seats, [["m-1", 1], ["m-2", 2]], "live devices take seats in activation order");
  assert.equal((await db.connectEvents.get("1700000000000001"))?.seq, 1700000000000001);
  assert.equal(await db.config.get("usd_idr_rate"), "16400");
  assert.equal(await db.store.next("invoice"), 42, "the invoice counter continues");
  // Without a counter row, the counter still starts after the highest invoice that exists.
  const other = legacyD1();
  other.db.prepare(`INSERT INTO orders (id, invoice_no, user_id, email, plan, cycle, amount_usd, gateway, status) VALUES ('o9', 'AXTO-2026-000917', 'u', 'u@example.com', 'pro', 'monthly', 9, 'manual', 'paid')`).run();
  const fresh = testData();
  for (let i = 0; i < 20 && !(await runMigration(fresh.db, { d1: other.d1 }, 1)); i++);
  assert.equal(await fresh.db.store.next("invoice"), 918);
  assert.ok(archive.get("legacy/magic_links.jsonl")?.includes("ml1"), "unused tables are archived, not lost");
  // The conflict keeps the whole row.
  const kept = [...bucket.objects.keys()].filter((k) => k.startsWith("k/meta/migration-conflicts/users/"));
  assert.equal(kept.length, 1);

  // Done once: another run changes nothing.
  const before = bucket.objects.size;
  assert.equal((await runMigration(db, env, 5))?.at, state.at);
  assert.equal(bucket.objects.size, before);
  assert.equal((await migrationProgress(db)).done, true);
});

test("migration: callers racing share one lease, and a fresh install needs no D1", async () => {
  const { d1, db: sql } = legacyD1();
  seed(sql);
  const { db } = testData();
  const env = { d1, stepRows: 20 };
  let state = null;
  for (let i = 0; i < 100 && !state; i++) {
    const r = await Promise.all([runMigration(db, env, 1), runMigration(db, env, 1), runMigration(db, env, 1)]);
    state = r.find(Boolean) ?? null;
  }
  assert.ok(state);
  assert.equal((await db.orders.countDocs()), 130, "nothing doubled");

  const fresh = testData();
  const s = await runMigration(fresh.db, { d1: null }, 1);
  assert.equal(s?.source, "fresh");
});
