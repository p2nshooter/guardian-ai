/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * "100 TRIAL LICENSE" per self-hosted app (docs/AXTO-APPS-BLUEPRINT.md §4).
 *   • Pool: the admin creates codes per app (100 by default) in Admin → Trials.
 *   • Claim: a signed-in member takes one code atomically; a 14-day licence
 *     (Professional edition, source = 'trial') is issued at once and e-mailed
 *     with the install command — zero-touch.
 *   • Abuse limits: one trial per app per account, per e-mail and per IP; at
 *     most `maxProducts` apps per account; the engine machine can run one trial
 *     per app (checked in /api/license-validate).
 * ============================================================================ */
import { dbFirst, dbQuery, dbRun, newId, now, secret } from "./db";
import { editionsFor, editionMaxNodes } from "./editions";
import { SELF_HOSTED, getSelfHosted, generateLicenseKey, catalogEntry } from "./selfhosted";

export interface TrialConfig {
  enabled: boolean;
  days: number;          // licence length
  maxProducts: number;   // apps one account may trial
  perApp: number;        // size of a fresh pool per app
  startsAt: string;      // ISO or "" (no start limit)
  endsAt: string;        // ISO or "" (no end limit)
}

export const TRIAL_DEFAULTS: TrialConfig = { enabled: true, days: 14, maxProducts: 2, perApp: 100, startsAt: "", endsAt: "" };
export const TRIAL_EDITION_TIER = "professional" as const;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

export function mergeTrialConfig(json: string | null | undefined): TrialConfig {
  const c = { ...TRIAL_DEFAULTS };
  if (!json) return c;
  try {
    const o = JSON.parse(json) || {};
    if (typeof o.enabled === "boolean") c.enabled = o.enabled;
    const days = Number(o.days); if (Number.isInteger(days) && days >= 1 && days <= 90) c.days = days;
    const mp = Number(o.maxProducts); if (Number.isInteger(mp) && mp >= 1 && mp <= 10) c.maxProducts = mp;
    const pa = Number(o.perApp); if (Number.isInteger(pa) && pa >= 1 && pa <= 1000) c.perApp = pa;
    if (typeof o.startsAt === "string" && (!o.startsAt || !Number.isNaN(Date.parse(o.startsAt)))) c.startsAt = o.startsAt;
    if (typeof o.endsAt === "string" && (!o.endsAt || !Number.isNaN(Date.parse(o.endsAt)))) c.endsAt = o.endsAt;
  } catch {}
  return c;
}

export async function getTrialConfig(db: any): Promise<TrialConfig> {
  try {
    const row = await dbFirst<{ value: string }>(db, `SELECT value FROM platform_config WHERE key = 'trials'`);
    return mergeTrialConfig(row?.value);
  } catch { return mergeTrialConfig(null); }
}

/** Is the programme open right now (switch + date window)? */
export function trialOpen(c: TrialConfig, at = new Date()): boolean {
  if (!c.enabled) return false;
  if (c.startsAt && at.getTime() < Date.parse(c.startsAt)) return false;
  if (c.endsAt && at.getTime() > Date.parse(c.endsAt)) return false;
  return true;
}

/** TRIAL-XXXX-XXXX-XXXX from a cryptographic source (32 symbols → 60 bits). */
export function newTrialCode(): string {
  const b = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
  return `TRIAL-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}
export const isTrialCode = (s: string) => /^TRIAL-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(s);

/** The edition a trial licence runs (Professional, or the closest below it). */
export function trialEdition(product: string) {
  const list = editionsFor(product);
  return list.find((e) => e.tier === TRIAL_EDITION_TIER) || list[Math.min(1, list.length - 1)];
}

/**
 * Zero-touch start: the first time the programme is used, every app gets its
 * pool of `perApp` codes (100). One atomic flag makes sure this happens once,
 * so codes the admin later deletes are not silently recreated.
 */
export async function ensureTrialPool(db: any, c?: TrialConfig): Promise<boolean> {
  try {
    // A read first: the insert (a write) is only attempted until the pool exists.
    if (await dbFirst(db, `SELECT 1 AS x FROM platform_config WHERE key = 'trials_seeded'`)) return false;
    const won = await dbFirst<{ key: string }>(db,
      `INSERT INTO platform_config (key, value, updated_at) VALUES ('trials_seeded', ?, ?) ON CONFLICT(key) DO NOTHING RETURNING key`, [now(), now()]);
    if (!won) return false;
    const cfg = c || await getTrialConfig(db);
    for (const p of SELF_HOSTED) await createTrialBatch(db, p.slug, cfg.perApp);
    return true;
  } catch { return false; }
}

/** Available / claimed / total per app (public cards + admin). */
export async function trialStats(db: any): Promise<Record<string, { total: number; available: number; claimed: number }>> {
  const rows = await dbQuery<{ product: string; status: string; n: number }>(db, `SELECT product, status, COUNT(*) AS n FROM sh_trials GROUP BY product, status`).catch(() => [] as any[]);
  const out: Record<string, { total: number; available: number; claimed: number }> = {};
  for (const p of SELF_HOSTED) out[p.slug] = { total: 0, available: 0, claimed: 0 };
  for (const r of rows) {
    const o = out[r.product]; if (!o) continue;
    o.total += r.n;
    if (r.status === "available") o.available += r.n;
    if (r.status === "claimed") o.claimed += r.n;
  }
  return out;
}

/** Create `count` codes for one app in one batch (D1 batch, ≤ 1,000). */
export async function createTrialBatch(db: any, product: string, count: number): Promise<{ batch: string; created: number }> {
  if (!getSelfHosted(product)) throw new Error("Unknown product.");
  const n = Math.max(1, Math.min(1000, Math.floor(count)));
  const batch = newId("tb");
  const at = now();
  const codes = new Set<string>();
  while (codes.size < n) codes.add(newTrialCode());
  const stmts = Array.from(codes, (code) => db.prepare(`INSERT OR IGNORE INTO sh_trials (code, product, batch, status, created_at) VALUES (?, ?, ?, 'available', ?)`).bind(code, product, batch, at));
  for (let i = 0; i < stmts.length; i += 100) await db.batch(stmts.slice(i, i + 100));
  return { batch, created: codes.size };
}

export type ClaimResult =
  | { ok: true; product: string; name: string; key: string; code: string; expiresAt: string; edition: string }
  | { ok: false; error: string; status: number; reason: string };

/**
 * Claim one trial for `product`. Never two for the same app per account, e-mail
 * or IP; at most `maxProducts` apps per account; never over a paid licence.
 */
export async function claimTrial(db: any, user: { id: string; email: string }, product: string, ip: string, c: TrialConfig): Promise<ClaimResult> {
  const p = getSelfHosted(product);
  if (!p) return { ok: false, error: "Unknown app.", status: 400, reason: "unknown" };
  if (!trialOpen(c)) return { ok: false, error: "The trial programme is closed at the moment.", status: 409, reason: "closed" };
  const paid = await dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM sh_licenses WHERE user_id = ? AND product = ? AND source != 'trial' AND status = 'active'`, [user.id, product]);
  if ((paid?.n ?? 0) > 0) return { ok: false, error: "You already have a licence for this app.", status: 409, reason: "licensed" };
  const mine = await dbQuery<{ product: string }>(db, `SELECT product FROM sh_trials WHERE status = 'claimed' AND (user_id = ? OR lower(email) = lower(?))`, [user.id, user.email]);
  if (mine.some((m) => m.product === product)) return { ok: false, error: "You have already used the trial for this app.", status: 409, reason: "used" };
  if (new Set(mine.map((m) => m.product)).size >= c.maxProducts) return { ok: false, error: `Trials are limited to ${c.maxProducts} apps per account.`, status: 409, reason: "max_products" };
  if (ip) {
    const sameIp = await dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM sh_trials WHERE status = 'claimed' AND product = ? AND ip = ?`, [product, ip]);
    if ((sameIp?.n ?? 0) > 0) return { ok: false, error: "A trial for this app was already started from your network.", status: 409, reason: "ip" };
  }
  const at = now();
  // Atomic: take one available code or nothing (retry if a parallel claim took the same one).
  let taken: { code: string } | null = null;
  for (let i = 0; i < 4 && !taken; i++) {
    taken = await dbFirst<{ code: string }>(db,
      `UPDATE sh_trials SET status = 'claimed', user_id = ?, email = ?, ip = ?, claimed_at = ?
        WHERE code = (SELECT code FROM sh_trials WHERE product = ? AND status = 'available' ORDER BY created_at, code LIMIT 1 OFFSET ?) AND status = 'available'
        RETURNING code`, [user.id, user.email, ip, at, product, i]);
  }
  if (!taken) return { ok: false, error: "All trial licences for this app have been taken.", status: 409, reason: "sold_out" };
  const e = trialEdition(product)!;
  const expiresAt = new Date(Date.now() + c.days * 86_400_000).toISOString();
  const key = await generateLicenseKey(product, secret("LICENSE_KEY_HMAC_SECRET") || undefined);
  const id = newId();
  const old = await dbFirst<{ id: string }>(db, `SELECT id FROM sh_licenses WHERE user_id = ? AND product = ? AND source = 'trial'`, [user.id, product]);
  if (old) {
    await dbRun(db, `UPDATE sh_licenses SET license_key = ?, package_code = ?, max_nodes = ?, status = 'active', expires_at = ?, bound_machine_id = '', notes = 'trial', updated_at = ? WHERE id = ?`,
      [key, e.code, editionMaxNodes(e), expiresAt, at, old.id]);
  } else {
    await dbRun(db, `INSERT INTO sh_licenses (id, user_id, product, license_key, package_code, max_nodes, status, expires_at, notes, source, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 'trial', 'trial', ?, ?)`,
      [id, user.id, product, key, e.code, editionMaxNodes(e), expiresAt, at, at]);
  }
  await dbRun(db, `UPDATE sh_trials SET license_id = ? WHERE code = ?`, [old?.id || id, taken.code]);
  return { ok: true, product, name: catalogEntry(product)?.name || product, key, code: taken.code, expiresAt, edition: e.name };
}

/** Mark a member's trial for an app as converted (they paid for it). Never throws. */
export async function markTrialConverted(db: any, userId: string, product: string): Promise<void> {
  await dbRun(db, `UPDATE sh_trials SET converted = 1 WHERE user_id = ? AND product = ? AND status = 'claimed'`, [userId, product]).catch(() => {});
}
