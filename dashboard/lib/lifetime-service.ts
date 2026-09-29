/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Lifetime licence operations — ONE implementation used by the member portal,
 * the admin portal and payment activation (zero-touch: a paid lifetime order
 * becomes a licence with no admin step).
 *
 * Offline activations cannot be revoked remotely (the engine never calls
 * home), so a member cannot "free" a device slot themselves — only an admin
 * can, after the customer confirms the old device is retired.
 * ============================================================================ */
import { dbFirst, dbQuery, dbRun, newId, now } from "./db";
import { signPayload } from "./license-sign";
import { mailLayout, sendMail } from "./mail";
import { absoluteUrl, SITE } from "./site";
import { catalogEntry, getSelfHosted } from "./selfhosted";
import { formatUsd } from "./plans";
import { buildFeatures, serializeEntitlements } from "./entitlements";
import {
  activationFile, activationPayload, addMonths, isMachineId, isScope, newLicenseId, productsOf,
  LIFETIME_MAJOR, UPDATE_MONTHS, type LifetimeScope,
} from "./lifetime";

export interface LifetimeLicense {
  id: string; user_id: string; order_id: string; scope: LifetimeScope; product: string; devices: number;
  major_version: number; updates_until: string; status: "active" | "revoked"; note: string; created_at: string;
}
export interface LifetimeActivation { id: string; license_id: string; product: string; machine_id: string; label: string; created_at: string; revoked_at: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export const productName = (slug: string) => (slug === "suite" ? "Suite (all 10 apps)" : catalogEntry(slug)?.name || slug);

/** Validate a lifetime choice from the browser. */
export function lifetimeChoiceProblem(scope: unknown, product: unknown): string | null {
  if (!isScope(scope)) return "Choose one app or the full suite.";
  if (scope === "app" && !getSelfHosted(String(product || ""))) return "Choose which app the licence is for.";
  return null;
}

export async function issueLifetime(db: any, o: { userId: string; orderId?: string; scope: LifetimeScope; product: string; devices: number; updateMonths?: number; note?: string }): Promise<LifetimeLicense> {
  const id = newLicenseId();
  const ts = now();
  const updatesUntil = addMonths(new Date(), o.updateMonths ?? UPDATE_MONTHS).toISOString();
  const product = o.scope === "suite" ? "suite" : o.product;
  await dbRun(db,
    `INSERT INTO lifetime_licenses (id, user_id, order_id, scope, product, devices, major_version, updates_until, status, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [id, o.userId, o.orderId || "", o.scope, product, o.devices, LIFETIME_MAJOR, updatesUntil, String(o.note || "").slice(0, 300), ts, ts]);
  return (await dbFirst<LifetimeLicense>(db, `SELECT * FROM lifetime_licenses WHERE id = ?`, [id]))!;
}

export async function licensesFor(db: any, userId: string): Promise<(LifetimeLicense & { activations: LifetimeActivation[] })[]> {
  const lics = await dbQuery<LifetimeLicense>(db, `SELECT * FROM lifetime_licenses WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  if (!lics.length) return [];
  const acts = await dbQuery<LifetimeActivation>(db,
    `SELECT * FROM lifetime_activations WHERE license_id IN (${lics.map(() => "?").join(",")}) ORDER BY created_at`, lics.map((l) => l.id));
  return lics.map((l) => ({ ...l, activations: acts.filter((a) => a.license_id === l.id) }));
}

/** Does the member hold an active lifetime licence for this app with updates still included? */
export async function lifetimeCovers(db: any, userId: string, product: string): Promise<boolean> {
  const r = await dbFirst(db,
    `SELECT 1 AS x FROM lifetime_licenses WHERE user_id = ? AND status = 'active' AND updates_until > ? AND (product = ? OR scope = 'suite') LIMIT 1`,
    [userId, now(), product]);
  return !!r;
}

async function signedFile(db: any, lic: LifetimeLicense, act: LifetimeActivation, customer: string): Promise<string> {
  // Top-tier features, with the device count as the node/worker/device cap.
  const pkg = getSelfHosted(act.product)?.packageCode || "";
  const entitlements = serializeEntitlements(buildFeatures(act.product, pkg, lic.devices), pkg);
  const payload = activationPayload({
    licenseId: lic.id, product: act.product, machineId: act.machine_id, scope: lic.scope, devices: lic.devices,
    major: lic.major_version, updatesUntil: lic.updates_until, issuedAt: act.created_at, entitlements,
  });
  return activationFile(payload, await signPayload(db, payload), customer);
}

export type ActivateResult = { ok: true; activation: LifetimeActivation; file: string; filename: string } | { ok: false; error: string; status: number };

/**
 * Activate one device for one app. Re-activating a machine that is already
 * active returns the same file (no extra slot). Throws SigningUnavailable when
 * the signing key is missing (callers answer 503).
 */
export async function activateDevice(db: any, userId: string, licenseId: string, product: string, machineId: string, label: string, customer: string): Promise<ActivateResult> {
  const lic = await dbFirst<LifetimeLicense>(db, `SELECT * FROM lifetime_licenses WHERE id = ? AND user_id = ?`, [licenseId, userId]);
  if (!lic) return { ok: false, error: "Licence not found.", status: 404 };
  if (lic.status !== "active") return { ok: false, error: "This licence has been revoked. Contact support.", status: 403 };
  if (!productsOf(lic).includes(product)) return { ok: false, error: `This licence does not cover ${productName(product)}.`, status: 400 };
  const mid = String(machineId || "").trim().toLowerCase();
  if (!isMachineId(mid)) return { ok: false, error: "Enter the 32-character machine ID the app shows on first start (see the guide).", status: 400 };

  let act = await dbFirst<LifetimeActivation>(db,
    `SELECT * FROM lifetime_activations WHERE license_id = ? AND product = ? AND machine_id = ? AND revoked_at = ''`, [lic.id, product, mid]);
  if (!act) {
    // Count-and-insert in ONE statement so two simultaneous activations can never exceed the limit.
    const id = newId("act");
    try {
      await dbRun(db,
        `INSERT INTO lifetime_activations (id, license_id, product, machine_id, label, created_at)
         SELECT ?, ?, ?, ?, ?, ?
          WHERE (SELECT COUNT(*) FROM lifetime_activations WHERE license_id = ? AND product = ? AND revoked_at = '') < ?`,
        [id, lic.id, product, mid, String(label || "").trim().slice(0, 80), now(), lic.id, product, lic.devices]);
    } catch {
      // Same machine activated concurrently (unique index) — fall through and return that activation.
    }
    act = await dbFirst<LifetimeActivation>(db,
      `SELECT * FROM lifetime_activations WHERE license_id = ? AND product = ? AND machine_id = ? AND revoked_at = ''`, [lic.id, product, mid]);
    if (!act) {
      return { ok: false, error: `All ${lic.devices} device${lic.devices === 1 ? "" : "s"} for ${productName(product)} are activated. To move to new hardware, ask support to retire an old device.`, status: 409 };
    }
  }
  return { ok: true, activation: act, file: await signedFile(db, lic, act, customer), filename: `${product}.axto-license` };
}

/** Re-download an existing activation's file (member: own licences only). */
export async function activationFileFor(db: any, activationId: string, userId: string | null, customer: string): Promise<{ file: string; filename: string } | null> {
  const act = await dbFirst<LifetimeActivation>(db, `SELECT * FROM lifetime_activations WHERE id = ? AND revoked_at = ''`, [activationId]);
  if (!act) return null;
  const lic = await dbFirst<LifetimeLicense>(db, `SELECT * FROM lifetime_licenses WHERE id = ?`, [act.license_id]);
  if (!lic || lic.status !== "active" || (userId && lic.user_id !== userId)) return null;
  return { file: await signedFile(db, lic, act, customer), filename: `${act.product}.axto-license` };
}

export async function revokeActivation(db: any, activationId: string): Promise<boolean> {
  const r = await dbRun(db, `UPDATE lifetime_activations SET revoked_at = ? WHERE id = ? AND revoked_at = ''`, [now(), activationId]);
  return !!r?.meta?.changes;
}

export async function setLicenseStatus(db: any, licenseId: string, status: "active" | "revoked"): Promise<boolean> {
  const r = await dbRun(db, `UPDATE lifetime_licenses SET status = ?, updated_at = ? WHERE id = ?`, [status, now(), licenseId]);
  return !!r?.meta?.changes;
}

export function lifetimeMail(lic: LifetimeLicense, amount?: number) {
  const name = productName(lic.product);
  return {
    subject: `Your ${SITE.name} lifetime licence ${lic.id} is ready`,
    html: mailLayout("Your lifetime licence is ready",
      `<p>Licence <b>${esc(lic.id)}</b> — <b>${esc(name)}</b>, up to <b>${lic.devices}</b> device${lic.devices === 1 ? "" : "s"}${lic.scope === "suite" ? " per app" : ""}${amount ? ` (${esc(formatUsd(amount))})` : ""}.</p>
       <p>It works fully offline: install the app, copy the <b>machine ID</b> it shows on first start into the portal, and download the activation file for that device. Updates are included until <b>${esc(lic.updates_until.slice(0, 10))}</b>.</p>`,
      { label: "Activate a device", href: absoluteUrl("/app/lifetime") }),
  };
}

/**
 * Paid lifetime order → licence (called from markOrderPaid after it claimed the
 * order). Idempotent through the unique index on order_id.
 */
export async function issueForOrder(db: any, o: { id: string; user_id: string; email: string; amount_usd: number; meta: string }): Promise<LifetimeLicense | null> {
  const existing = await dbFirst<LifetimeLicense>(db, `SELECT * FROM lifetime_licenses WHERE order_id = ?`, [o.id]);
  if (existing) return existing;
  let m: any = {};
  try { m = JSON.parse(o.meta || "{}").lifetime || {}; } catch {}
  if (lifetimeChoiceProblem(m.scope, m.product) || !(Number(m.devices) >= 1 && Number(m.devices) <= 100)) return null;
  const lic = await issueLifetime(db, { userId: o.user_id, orderId: o.id, scope: m.scope, product: String(m.product || ""), devices: Number(m.devices) });
  const mail = lifetimeMail(lic, o.amount_usd);
  await sendMail(o.email, mail.subject, mail.html);
  return lic;
}
