/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
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
import { newId, now, secret } from "./db";
import type { Data } from "./data";
import type { ShTrialDoc } from "./data/schema";
import { findLicence, newLicence } from "./licences";
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

export async function getTrialConfig(db: Data): Promise<TrialConfig> {
  try {
    return mergeTrialConfig(await db.config.get("trials"));
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

/** Codes created per request: each code is a document plus three index entries (~5 R2 calls), so a request stays well inside Cloudflare's subrequest limit. */
export const TRIAL_BATCH_MAX = 100;
/** Codes a public page view adds to the initial pool (in the background, until the pool is complete). */
const SEED_PER_VIEW = 20;

interface SeedProgress { i: number; batch: string; reserved: number }

/**
 * Zero-touch start: the first time the programme is used, every app gets its
 * pool of `perApp` codes (100). The pool is filled in small chunks (page views
 * and the hourly tick); every chunk is first reserved on one progress document
 * with compare-and-swap, so concurrent callers never create more than the pool.
 * When it is complete a flag is set, so codes the admin later deletes are not
 * silently recreated.
 */
export async function ensureTrialPool(db: Data, c?: TrialConfig, budget = SEED_PER_VIEW): Promise<boolean> {
  try {
    if (await db.config.get("trials_seeded")) return false;
    const cfg = c || await getTrialConfig(db);
    const apps = SELF_HOSTED.map((p) => p.slug);
    let left = Math.max(1, Math.min(TRIAL_BATCH_MAX, budget));
    let worked = false;
    while (left > 0) {
      let job: { product: string; batch: string; take: number } | null = null;
      let complete = false;
      await db.store.updateDoc<SeedProgress>("trials-seed", { i: 0, batch: "", reserved: 0 }, (cur) => {
        // Decided on every run of the compare-and-swap.
        job = null; complete = false;
        let { i, batch, reserved } = cur;
        if (reserved >= cfg.perApp) { i += 1; batch = ""; reserved = 0; }
        if (i >= apps.length) { complete = true; return null; }
        const take = Math.min(left, cfg.perApp - reserved);
        batch ||= newId("tb");
        job = { product: apps[i]!, batch, take };
        return { i, batch, reserved: reserved + take };
      });
      if (complete) { await db.config.setIfAbsent("trials_seeded", now()); return worked; }
      const j = job as { product: string; batch: string; take: number } | null;
      if (!j) return worked;
      await createTrialCodes(db, j.product, j.batch, j.take);
      left -= j.take;
      worked = true;
    }
    return worked;
  } catch { return false; }
}

/** Every trial code's summary (the "all" index: one list call per 1,000 codes, no document reads). */
export interface TrialSummary {
  code: string; product: string; batch: string; status: string; created_at: string; email: string; ip: string; claimed_at: string;
  rating: number; converted: number; license_id: string;
}

export async function trialSummaries(db: Data): Promise<TrialSummary[]> {
  return (await db.shTrials.listAll("all", "all", 200_000)).map(({ id, meta: m }) => ({
    code: id, product: String(m.product || ""), batch: String(m.batch || ""), status: String(m.status || ""), created_at: String(m.created_at || ""),
    email: String(m.email || ""), ip: String(m.ip || ""), claimed_at: String(m.claimed_at || ""), rating: Number(m.rating) || 0,
    converted: Number(m.converted) || 0, license_id: String(m.license_id || ""),
  }));
}

/** Available / claimed / total per app (public cards + admin). */
export async function trialStats(db: Data): Promise<Record<string, { total: number; available: number; claimed: number }>> {
  const rows = await trialSummaries(db).catch(() => []);
  const out: Record<string, { total: number; available: number; claimed: number }> = {};
  for (const p of SELF_HOSTED) out[p.slug] = { total: 0, available: 0, claimed: 0 };
  for (const r of rows) {
    const o = out[r.product]; if (!o) continue;
    o.total += 1;
    if (r.status === "available") o.available += 1;
    if (r.status === "claimed") o.claimed += 1;
  }
  return out;
}

async function createTrialCodes(db: Data, product: string, batch: string, count: number): Promise<number> {
  const at = now();
  const codes = new Set<string>();
  while (codes.size < count) codes.add(newTrialCode());
  let created = 0;
  const list = [...codes];
  for (let i = 0; i < list.length; i += 10) {
    const done = await Promise.all(list.slice(i, i + 10).map((code) => db.shTrials.createIfAbsent({
      id: code, code, product, batch, status: "available", user_id: "", email: "", ip: "", license_id: "", claimed_at: "", rating: 0, converted: 0, created_at: at,
    })));
    created += done.filter(Boolean).length;
  }
  return created;
}

/**
 * Add up to TRIAL_BATCH_MAX codes for one app to a batch (a new batch unless
 * `batch` is given — the admin screen continues a large batch over several
 * requests). Returns the batch, how many codes this call made and how many the
 * batch holds now.
 */
export async function createTrialBatch(db: Data, product: string, count: number, batch?: string): Promise<{ batch: string; created: number; total: number }> {
  if (!getSelfHosted(product)) throw new Error("Unknown product.");
  const n = Math.max(1, Math.min(TRIAL_BATCH_MAX, Math.floor(count)));
  const id = batch || newId("tb");
  const created = await createTrialCodes(db, product, id, n);
  return { batch: id, created, total: batch ? await db.shTrials.count("batch", id) : created };
}

/** A member's claimed trials (by account or by e-mail address). */
export async function claimedTrials(db: Data, user: { id: string; email: string }): Promise<ShTrialDoc[]> {
  const [byUser, byEmail] = await Promise.all([
    db.shTrials.listAllDocs("user", user.id),
    user.email ? db.shTrials.listAllDocs("email", user.email.trim().toLowerCase()) : Promise.resolve([] as ShTrialDoc[]),
  ]);
  const seen = new Map<string, ShTrialDoc>();
  for (const t of [...byUser, ...byEmail]) if (t.status === "claimed") seen.set(t.id, t);
  return [...seen.values()];
}

export type ClaimResult =
  | { ok: true; product: string; name: string; key: string; code: string; expiresAt: string; edition: string }
  | { ok: false; error: string; status: number; reason: string };

/**
 * Claim one trial for `product`. Never two for the same app per account, e-mail
 * or IP; at most `maxProducts` apps per account; never over a paid licence.
 */
export async function claimTrial(db: Data, user: { id: string; email: string }, product: string, ip: string, c: TrialConfig): Promise<ClaimResult> {
  const p = getSelfHosted(product);
  if (!p) return { ok: false, error: "Unknown app.", status: 400, reason: "unknown" };
  if (!trialOpen(c)) return { ok: false, error: "The trial programme is closed at the moment.", status: 409, reason: "closed" };
  const licences = await db.shLicenses.listAllDocs("user", user.id);
  if (licences.some((l) => l.product === product && l.source !== "trial" && l.status === "active")) return { ok: false, error: "You already have a licence for this app.", status: 409, reason: "licensed" };
  const mine = await claimedTrials(db, user);
  if (mine.some((m) => m.product === product)) return { ok: false, error: "You have already used the trial for this app.", status: 409, reason: "used" };
  if (new Set(mine.map((m) => m.product)).size >= c.maxProducts) return { ok: false, error: `Trials are limited to ${c.maxProducts} apps per account.`, status: 409, reason: "max_products" };
  if (ip && (await db.shTrials.count("ip_product", `${ip}|${product}`)) > 0) {
    return { ok: false, error: "A trial for this app was already started from your network.", status: 409, reason: "ip" };
  }
  const at = now();
  // Atomic: take one available code with compare-and-swap; a code a parallel claim took is skipped.
  let taken: { code: string } | null = null;
  for (let round = 0; round < 3 && !taken; round++) {
    const page = await db.shTrials.list("product_status", `${product}|available`, { limit: 8 });
    if (!page.entries.length) break;
    for (const e of page.entries) {
      let won = false;
      await db.shTrials.update(e.id, (t) => {
        won = t.status === "available";
        return won ? { ...t, status: "claimed", user_id: user.id, email: user.email, ip, claimed_at: at } : null;
      }).catch(() => null);
      if (won) { taken = { code: e.id }; break; }
    }
  }
  if (!taken) return { ok: false, error: "All trial licences for this app have been taken.", status: 409, reason: "sold_out" };
  const e = trialEdition(product)!;
  const expiresAt = new Date(Date.now() + c.days * 86_400_000).toISOString();
  const key = await generateLicenseKey(product, secret("LICENSE_KEY_HMAC_SECRET") || undefined);
  const old = await findLicence(db, user.id, product, "trial");
  let licenceId = old?.id || "";
  if (old) {
    await db.shLicenses.update(old.id, (l) => ({ ...l, license_key: key, package_code: e.code, max_nodes: editionMaxNodes(e), status: "active", expires_at: expiresAt, bound_machine_id: "", notes: "trial", updated_at: at }));
  } else {
    const doc = newLicence({ user_id: user.id, product, license_key: key, package_code: e.code, max_nodes: editionMaxNodes(e), expires_at: expiresAt, notes: "trial", source: "trial" });
    licenceId = doc.id;
    await db.shLicenses.create(doc);
  }
  await db.shTrials.update(taken.code, (t) => ({ ...t, license_id: licenceId }));
  return { ok: true, product, name: catalogEntry(product)?.name || product, key, code: taken.code, expiresAt, edition: e.name };
}

/** Mark a member's trial for an app as converted (they paid for it). Never throws. */
export async function markTrialConverted(db: Data, userId: string, product: string): Promise<void> {
  try {
    for (const t of await db.shTrials.listAllDocs("user", userId)) {
      if (t.product === product && t.status === "claimed" && !t.converted) await db.shTrials.update(t.id, (x) => ({ ...x, converted: 1 }));
    }
  } catch {}
}
