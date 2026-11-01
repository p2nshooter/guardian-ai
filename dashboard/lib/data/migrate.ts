/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - AI workspace for legal, security & business teams
 * Maintained by: AXTO Digital Global <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * The one-time move of axto.io's records from D1 to R2 (owner, 20 Oct 2026:
 * "Database semuanya ke R2 ya, jgn ada yg ke d1"; docs/R2-DATA-BLUEPRINT.md §4).
 *
 * Zero-touch: it runs by itself after the deploy that switched the code to R2.
 * The deploy job drives it (POST /api/cron/migrate until done), the every-minute
 * cron tick drives it, and so does any request that needs a record — whichever
 * comes first. It works in STEPS so no single request goes past Cloudflare's
 * limit of 1,000 calls to Cloudflare services per invocation:
 *   1. one caller at a time holds a lease (k/meta/migration-lock, create-only,
 *      taken over after a minute);
 *   2. each step copies up to STEP_ROWS rows, in rowid order, with the SAME
 *      ids, create-if-absent — a re-run never duplicates or overwrites — and
 *      saves its position (k/meta/migration-progress);
 *   3. a row that would break a uniqueness guard (two accounts with one e-mail
 *      in different case, say) is never dropped: it is kept as it was under
 *      k/meta/migration-conflicts/<table>/<id> and listed in the report;
 *   4. then the settings, the invoice counter, the legacy payment settings and
 *      an archive of the ~60 tables the code no longer uses
 *      (axto-backups: legacy/<table>.jsonl);
 *   5. finally every table is checked: D1 rows = R2 documents + kept conflicts.
 *      Only then is k/meta/migration written with status "done" and the
 *      per-table report (shown in Admin → Settings and /api/health).
 * Until then record pages answer "moving to new storage" (MaintenanceError).
 *
 * D1 is only READ here. It stays bound, read-only, for seven days as a
 * fallback copy; the release after that removes the binding and this file.
 * ============================================================================ */
import { CREATE_ONLY } from "../r2/bucket";
import { ConflictError, type Collection, type Doc } from "../r2/store";
import { type Data } from "./index";
import { ids } from "./schema";

export class MaintenanceError extends Error {
  constructor() {
    super("AXTO is moving its records to new storage. This takes a minute — please try again shortly.");
    this.name = "MaintenanceError";
  }
}

/** The part of a D1 binding the copy reads. */
export interface D1Like {
  prepare(sql: string): { bind(...args: unknown[]): { all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>; first<T = Record<string, unknown>>(): Promise<T | null> }; all<T = Record<string, unknown>>(): Promise<{ results?: T[] }> };
}

/** The archive bucket for the tables the code no longer uses. */
export interface ArchiveBucket { put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown> }

export interface TableReport { d1: number; r2: number; conflicts: number }
export interface MigrationState {
  status: "done";
  at: string;
  /** "fresh" when there was no D1 database to copy (a new install). */
  source: "d1" | "fresh";
  tables: Record<string, TableReport>;
  settings: number;
  legacy: Record<string, number>;
  conflicts: { table: string; id: string; field: string }[];
  /** Tables still short after copying them again twice (named for the admin; D1 stays readable for seven days). */
  incomplete?: string[];
}

interface Progress {
  table: number;
  offset: number;
  /** d1 = rows, docs = distinct document ids those rows become. */
  copied: Record<string, { d1: number; docs?: number; created: number; existing: number; conflicts: number }>;
  settings?: number;
  counters?: boolean;
  payments?: boolean;
  legacy?: Record<string, number>;
  conflicts: { table: string; id: string; field: string }[];
  /** Times the check sent tables back to be copied again. */
  recopies?: number;
}

type Row = Record<string, unknown>;

const STATE = "meta/migration";
const PROGRESS = "meta/migration-progress";
const LOCK_KEY = "k/meta/migration-lock";
const LEASE_MS = 60_000;
/** Rows per step: a row costs up to ~10 R2 calls (read, guards, document, index entries). */
export const STEP_ROWS = 60;

const D1_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const sha256hex = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))), (b) => b.toString(16).padStart(2, "0")).join("");

/** D1 NULLs become the column's empty value; SQLite "YYYY-MM-DD HH:MM:SS" becomes ISO (the code compares ISO strings). */
function clean(row: Row, keepNull: string[] = []): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) out[k] = keepNull.includes(k) ? null : "";
    else if (typeof v === "string" && D1_DATETIME.test(v)) out[k] = `${v.replace(" ", "T")}.000Z`;
    else out[k] = v;
  }
  return out;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

interface TableDef {
  table: string;
  pick: (d: Data) => Collection<Doc>;
  toDoc: (row: Row, ctx: { d1: D1Like }) => Promise<Doc | null>;
  /** SQL for the document id of a row, when it is not `id` (rows sharing an id become one document). */
  key?: string;
}

const plain = (keepNull: string[] = [], numbers: string[] = []) => async (row: Row) => {
  const r = clean(row, keepNull);
  for (const n of numbers) r[n] = num(r[n]);
  return r as unknown as Doc;
};

/** Every D1 table the code still uses, in the order they are copied (accounts first, then money, licences, the rest). */
export const TABLES: TableDef[] = [
  { table: "users", pick: (d) => d.users as unknown as Collection<Doc>, toDoc: plain([], ["storage_bytes"]) },
  { table: "subscriptions", key: "user_id", pick: (d) => d.subscriptions as unknown as Collection<Doc>, toDoc: async (row) => ({ ...clean(row), id: ids.subscription(String(row.user_id)) } as unknown as Doc) },
  { table: "orders", pick: (d) => d.orders as unknown as Collection<Doc>, toDoc: plain([], ["amount_usd", "amount_local"]) },
  { table: "payment_proofs", key: "tx_hash", pick: (d) => d.paymentProofs as unknown as Collection<Doc>, toDoc: async (row) => ({ ...clean(row), amount: num(row.amount), id: ids.proof(String(row.tx_hash)) } as unknown as Doc) },
  { table: "investors", pick: (d) => d.investors as unknown as Collection<Doc>, toDoc: plain([], ["pledge_usd", "capital_usd"]) },
  { table: "investor_payouts", pick: (d) => d.investorPayouts as unknown as Collection<Doc>, toDoc: plain([], ["amount_usd"]) },
  { table: "sh_licenses", pick: (d) => d.shLicenses as unknown as Collection<Doc>, toDoc: plain([], ["max_nodes", "reset_count"]) },
  { table: "sh_trials", key: "code", pick: (d) => d.shTrials as unknown as Collection<Doc>, toDoc: async (row) => ({ ...clean(row), rating: num(row.rating), converted: num(row.converted), id: String(row.code) } as unknown as Doc) },
  { table: "lifetime_licenses", pick: (d) => d.lifetimeLicenses as unknown as Collection<Doc>, toDoc: plain([], ["devices", "major_version"]) },
  {
    table: "lifetime_activations", pick: (d) => d.lifetimeActivations as unknown as Collection<Doc>,
    // A live activation takes seat 1, 2, … in the order the machines were activated.
    toDoc: async (row, { d1 }) => {
      const r = clean(row);
      let slot = 0;
      if (!r.revoked_at) {
        const before = await d1.prepare(
          `SELECT COUNT(*) AS n FROM lifetime_activations WHERE license_id = ? AND product = ? AND revoked_at = '' AND (created_at < ? OR (created_at = ? AND id < ?))`,
        ).bind(row.license_id, row.product, row.created_at, row.created_at, row.id).first<{ n: number }>();
        slot = num(before?.n) + 1;
      }
      return { ...r, slot } as unknown as Doc;
    },
  },
  { table: "api_keys", pick: (d) => d.apiKeys as unknown as Collection<Doc>, toDoc: plain(["last_used_at", "revoked_at"]) },
  { table: "user_ai_keys", key: "user_id || '_' || provider", pick: (d) => d.userAiKeys as unknown as Collection<Doc>, toDoc: async (row) => ({ ...clean(row), id: ids.aiKey(String(row.user_id), String(row.provider)) } as unknown as Doc) },
  { table: "ai_provider_keys", pick: (d) => d.aiProviderKeys as unknown as Collection<Doc>, toDoc: plain([], ["for_managed_pool", "is_active"]) },
  { table: "byox_usage", key: "user_id || '_' || month", pick: (d) => d.byoxUsage as unknown as Collection<Doc>, toDoc: async (row) => ({ ...clean(row), requests: num(row.requests), clipper_videos: num(row.clipper_videos), id: ids.usage(String(row.user_id), String(row.month)) } as unknown as Doc) },
  { table: "managed_usage", key: "user_id || '_' || month", pick: (d) => d.managedUsage as unknown as Collection<Doc>, toDoc: async (row) => ({ ...clean(row), credits_used: num(row.credits_used), tokens: num(row.tokens), id: ids.usage(String(row.user_id), String(row.month)) } as unknown as Doc) },
  { table: "managed_subscriptions", key: "user_id", pick: (d) => d.managedSubscriptions as unknown as Collection<Doc>, toDoc: async (row) => ({ ...clean(row), id: String(row.user_id) } as unknown as Doc) },
  {
    // The token itself is never kept: the document id is its SHA-256, which is what the reset page looks up.
    table: "password_resets", key: "token", pick: (d) => d.passwordResets as unknown as Collection<Doc>,
    toDoc: async (row) => {
      const r = clean(row);
      const { token, ...rest } = r;
      return { ...rest, used: num(r.used), id: await sha256hex(String(token)) } as unknown as Doc;
    },
  },
  { table: "support_threads", pick: (d) => d.supportThreads as unknown as Collection<Doc>, toDoc: plain([], ["needs_admin", "ai_enabled", "unread_admin", "message_count"]) },
  { table: "webhooks", pick: (d) => d.webhooks as unknown as Collection<Doc>, toDoc: plain(["last_status", "last_error", "last_delivery_at"], ["active", "failures"]) },
  { table: "webhook_deliveries", pick: (d) => d.webhookDeliveries as unknown as Collection<Doc>, toDoc: plain(["status", "duration_ms", "error", "next_at"], ["event_id", "attempt", "done"]) },
  { table: "connect_events", pick: (d) => d.connectEvents as unknown as Collection<Doc>, toDoc: async (row) => ({ ...clean(row), size: num(row.size), seq: num(row.id), id: String(row.id) } as unknown as Doc) },
  { table: "audit_log", pick: (d) => d.audit as unknown as Collection<Doc>, toDoc: plain() },
];

/** Tables that become something other than a collection. */
const SPECIAL = new Set(["platform_config", "counters", "payment_gateways", "d1_migrations"]);

/* ── lease ──────────────────────────────────────────────────────────── */

async function takeLease(d: Data, owner: string): Promise<boolean> {
  const b = d.store.bucket;
  const body = JSON.stringify({ owner, at: Date.now() });
  if (await d.store.retry(() => b.put(LOCK_KEY, body, { onlyIf: CREATE_ONLY() }))) return true;
  const cur = await d.store.retry(() => b.get(LOCK_KEY));
  if (!cur) return takeLease(d, owner);
  const held = JSON.parse(await cur.text()) as { at: number };
  if (Date.now() - held.at < LEASE_MS) return false;
  return Boolean(await d.store.retry(() => b.put(LOCK_KEY, body, { onlyIf: { etagMatches: cur.etag } })));
}

async function dropLease(d: Data): Promise<void> {
  await d.store.retry(() => d.store.bucket.delete(LOCK_KEY)).catch(() => undefined);
}

/**
 * Prove, once, that this bucket honours conditional writes the way every
 * guard and compare-and-swap relies on. If it did not, uniqueness and money
 * transitions would silently break, so nothing is stored instead.
 */
async function probeConditionalWrites(d: Data): Promise<void> {
  const b = d.store.bucket;
  const key = `k/meta/probe-${crypto.randomUUID()}`;
  const first = await d.store.retry(() => b.put(key, "first", { onlyIf: CREATE_ONLY() }));
  const second = await d.store.retry(() => b.put(key, "second", { onlyIf: CREATE_ONLY() }));
  const stale = await d.store.retry(() => b.put(key, "third", { onlyIf: { etagMatches: "00000000000000000000000000000000" } }));
  const now = await d.store.retry(() => b.get(key));
  const body = now ? await now.text() : null;
  await d.store.retry(() => b.delete(key)).catch(() => undefined);
  if (!first || second || stale || body !== "first") throw new Error("R2 conditional writes are not honoured by this bucket; records will not be stored until they are.");
}

/** Make a counter at least `min` (compare-and-swap; never lowers it). */
async function raiseCounter(d: Data, name: string, min: number): Promise<void> {
  if (!(min > 0)) return;
  const b = d.store.bucket;
  const key = `n/${name}`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const cur = await d.store.retry(() => b.get(key));
    const value = cur ? num((JSON.parse(await cur.text()) as { value: number }).value) : 0;
    if (value >= min) return;
    const ok = await d.store.retry(() => b.put(key, JSON.stringify({ value: min }), { onlyIf: cur ? { etagMatches: cur.etag } : CREATE_ONLY() }));
    if (ok) return;
  }
}

/* ── the copy ───────────────────────────────────────────────────────── */

async function tableExists(d1: D1Like, table: string): Promise<boolean> {
  const r = await d1.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).bind(table).first<{ name: string }>();
  return Boolean(r?.name);
}

async function countRows(d1: D1Like, table: string): Promise<number> {
  if (!(await tableExists(d1, table))) return 0;
  const r = await d1.prepare(`SELECT COUNT(*) AS n FROM ${table}`).bind().first<{ n: number }>();
  return num(r?.n);
}

/** How many documents a table becomes: rows that share a document id (a duplicate key) are one document. */
async function countDistinct(d1: D1Like, def: TableDef): Promise<number> {
  if (!(await tableExists(d1, def.table))) return 0;
  const r = await d1.prepare(`SELECT COUNT(DISTINCT ${def.key ?? "id"}) AS n FROM ${def.table}`).bind().first<{ n: number }>();
  return num(r?.n);
}

/** Rows copied at the same time inside one step (Workers run at most six storage calls at once). */
const PARALLEL = 6;

export interface StepEnv {
  d1: D1Like | null;
  /** Where the legacy tables are archived (the backup bucket); skipped when absent. */
  archive?: ArchiveBucket | null;
  /** The one-time move of the v2 payment settings (lib/billing/gateways.ts). */
  migratePayments?: (d1: D1Like) => Promise<unknown>;
  /** Rows per step (tests use small steps to exercise resuming). */
  stepRows?: number;
}

const emptyProgress = (): Progress => ({ table: 0, offset: 0, copied: {}, conflicts: [] });

/**
 * One step of the move. Returns the final state when everything is copied
 * and checked, or null when more steps are needed. Callers hold the lease.
 */
export async function migrationStep(d: Data, env: StepEnv): Promise<MigrationState | null> {
  const done = await d.store.getDoc<MigrationState | null>(STATE, null);
  if (done) return done;
  if (!env.d1) {
    const fresh: MigrationState = { status: "done", at: new Date().toISOString(), source: "fresh", tables: {}, settings: 0, legacy: {}, conflicts: [] };
    return (await d.store.createDoc<MigrationState>(STATE, fresh)).doc;
  }
  const d1 = env.d1;
  const p = await d.store.getDoc<Progress>(PROGRESS, emptyProgress());
  let budget = env.stepRows ?? STEP_ROWS;
  const save = () => d.store.updateDoc<Progress>(PROGRESS, emptyProgress(), () => p);

  // 2–3. the collections, a bounded batch per step.
  while (p.table < TABLES.length && budget > 0) {
    const def = TABLES[p.table]!;
    const c = (p.copied[def.table] ??= { d1: await countRows(d1, def.table), created: 0, existing: 0, conflicts: 0 });
    if (p.offset >= c.d1) {
      p.table += 1;
      p.offset = 0;
      continue;
    }
    const take = Math.min(budget, 30);
    const { results } = await d1.prepare(`SELECT * FROM ${def.table} ORDER BY rowid LIMIT ? OFFSET ?`).bind(take, p.offset).all<Row>();
    const rows = results ?? [];
    if (!rows.length) { p.offset = c.d1; continue; }
    const coll = def.pick(d);
    const copyRow = async (row: Row) => {
      const doc = await def.toDoc(row, { d1 });
      if (!doc) return;
      try {
        if (await coll.createIfAbsent(doc)) c.created += 1;
        else c.existing += 1;
      } catch (err) {
        // A taken unique value, or an id R2 cannot hold: never dropped — the row is kept as it was, and the report names it.
        const field = err instanceof ConflictError ? err.field : err instanceof Error && err.message.startsWith("invalid id") ? "id" : null;
        if (!field) throw err;
        const id = String(doc.id);
        await d.store.createDoc(`meta/migration-conflicts/${def.table}/${encodeURIComponent(id).replace(/[~]/g, "%7E")}`, { field, id, row: clean(row) });
        c.conflicts += 1;
        if (!p.conflicts.some((x) => x.table === def.table && x.id === id)) p.conflicts.push({ table: def.table, id, field });
      }
    };
    // A collection with a uniqueness guard is copied one row at a time in D1 order, so the earlier row always keeps a
    // shared value and the later one becomes the conflict; in parallel either could win the guard.
    const width = coll.def.unique?.length ? 1 : PARALLEL;
    for (let i = 0; i < rows.length; i += width) await Promise.all(rows.slice(i, i + width).map(copyRow));
    p.offset += rows.length;
    budget -= rows.length;
    await save();
  }
  if (p.table < TABLES.length) return null;

  // 4. settings, the invoice counter, the v2 payment settings, the legacy archive.
  if (p.settings === undefined) {
    let n = 0;
    if (await tableExists(d1, "platform_config")) {
      const { results } = await d1.prepare(`SELECT key, value FROM platform_config`).all<{ key: string; value: string }>();
      for (const r of results ?? []) {
        if (r.key && (await d.config.setIfAbsent(r.key, String(r.value ?? "")))) n += 1;
      }
    }
    p.settings = n;
    await save();
  }
  if (!p.counters) {
    if (await tableExists(d1, "counters")) {
      const { results } = await d1.prepare(`SELECT name, value FROM counters`).all<{ name: string; value: number }>();
      for (const r of results ?? []) {
        const v = num(r.value);
        await d.store.retry(() => d.store.bucket.put(`n/${r.name}`, JSON.stringify({ value: v }), { onlyIf: CREATE_ONLY() }));
      }
    }
    // The invoice counter never restarts below an invoice that already exists (AXTO-YYYY-NNNNNN).
    if (await tableExists(d1, "orders")) {
      const top = await d1.prepare(`SELECT MAX(CAST(substr(invoice_no, 11) AS INTEGER)) AS n FROM orders WHERE invoice_no LIKE 'AXTO-____-%'`).bind().first<{ n: number }>();
      await raiseCounter(d, "invoice", num(top?.n));
    }
    p.counters = true;
    await save();
  }
  if (!p.payments) {
    if (env.migratePayments && (await tableExists(d1, "payment_gateways"))) await env.migratePayments(d1);
    p.payments = true;
    await save();
  }
  if (!p.legacy) {
    const legacy: Record<string, number> = {};
    const used = new Set(TABLES.map((t) => t.table));
    const { results } = await d1.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name`).all<{ name: string }>();
    for (const { name } of results ?? []) {
      if (used.has(name) || SPECIAL.has(name)) continue;
      const rows = (await d1.prepare(`SELECT * FROM ${name}`).all<Row>()).results ?? [];
      legacy[name] = rows.length;
      if (rows.length && env.archive) {
        await env.archive.put(`legacy/${name}.jsonl`, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", { httpMetadata: { contentType: "application/x-ndjson" } });
      }
    }
    p.legacy = legacy;
    await save();
  }

  // 5. every D1 row is in R2 (as a document, or kept as a conflict).
  const tables: Record<string, TableReport> = {};
  const short: string[] = [];
  for (const def of TABLES) {
    const c = p.copied[def.table]!;
    c.docs ??= await countDistinct(d1, def);
    const r2 = await def.pick(d).countDocs();
    tables[def.table] = { d1: c.d1, r2, conflicts: c.conflicts };
    // Every distinct D1 row is a document (or a recorded conflict). A conflict re-recorded by a resumed step counts once per row.
    if (r2 + Math.min(c.conflicts, c.docs) < c.docs) short.push(def.table);
  }
  // Copied again at most twice; after that the move finishes and names the tables, so the site can never stay
  // in maintenance (D1 is kept read-only for seven days, so nothing is lost while the report is looked at).
  if (short.length && (p.recopies ?? 0) < 2) {
    console.error("D1 → R2 move incomplete:", short.join(", "));
    p.recopies = (p.recopies ?? 0) + 1;
    // Copy those tables again from the start (create-if-absent: nothing doubles).
    const first = TABLES.findIndex((t) => short.includes(t.table));
    p.table = first;
    p.offset = 0;
    for (const t of short) delete p.copied[t];
    await save();
    return null;
  }
  const state: MigrationState = {
    status: "done", at: new Date().toISOString(), source: "d1", tables,
    settings: p.settings ?? 0, legacy: p.legacy ?? {}, conflicts: p.conflicts,
    ...(short.length ? { incomplete: short } : {}),
  };
  return (await d.store.createDoc<MigrationState>(STATE, state)).doc;
}

/** Run steps while holding the lease, until done or `maxSteps`. Null = someone else is migrating, or more steps remain. */
export async function runMigration(d: Data, env: StepEnv, maxSteps = 1): Promise<MigrationState | null> {
  const done = await d.store.getDoc<MigrationState | null>(STATE, null);
  if (done) return done;
  const owner = crypto.randomUUID();
  if (!(await takeLease(d, owner))) return null;
  try {
    await probeConditionalWrites(d);
    for (let i = 0; i < maxSteps; i += 1) {
      const s = await migrationStep(d, env);
      if (s) return s;
    }
    return null;
  } finally {
    await dropLease(d);
  }
}

export async function migrationState(d: Data): Promise<MigrationState | null> {
  return d.store.getDoc<MigrationState | null>(STATE, null);
}

/** Where the move stands, for the admin page and the deploy job. */
export async function migrationProgress(d: Data): Promise<{ done: boolean; state: MigrationState | null; progress: Progress | null }> {
  const state = await migrationState(d);
  return { done: Boolean(state), state, progress: state ? null : await d.store.getDoc<Progress | null>(PROGRESS, null) };
}
