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
import { newId, now } from "./db";
import type { Data } from "./data";
import type { LifetimeActivationDoc, LifetimeLicenseDoc } from "./data/schema";
import { readMeta } from "./data/meta";
import { ConflictError } from "./r2/store";
import { signPayload } from "./license-sign";
import { mailLayout, sendMail } from "./mail";
import { absoluteUrl, SITE } from "./site";
import { catalogEntry, getSelfHosted } from "./selfhosted";
import { formatUsd } from "./plans";
import { buildFeatures, serializeEntitlements } from "./entitlements";
import {
  activationFile, activationPayload, addMonths, isMachineId, isScope, newInstallKey, newLicenseId, productsOf,
  LIFETIME_MAJOR, UPDATE_MONTHS, type LifetimeScope,
} from "./lifetime";

export type LifetimeLicense = LifetimeLicenseDoc & { scope: LifetimeScope; status: "active" | "revoked" };
export type LifetimeActivation = LifetimeActivationDoc;
const asLicence = (d: LifetimeLicenseDoc | null) => d as LifetimeLicense | null;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export const productName = (slug: string) => (slug === "suite" ? "Suite (all 10 apps)" : catalogEntry(slug)?.name || slug);

/** Validate a lifetime choice from the browser. */
export function lifetimeChoiceProblem(scope: unknown, product: unknown): string | null {
  if (!isScope(scope)) return "Choose one app or the full suite.";
  if (scope === "app" && !getSelfHosted(String(product || ""))) return "Choose which app the licence is for.";
  return null;
}

export async function issueLifetime(db: Data, o: { userId: string; orderId?: string; scope: LifetimeScope; product: string; devices: number; updateMonths?: number; note?: string }): Promise<LifetimeLicense> {
  const ts = now();
  const updatesUntil = addMonths(new Date(), o.updateMonths ?? UPDATE_MONTHS).toISOString();
  const product = o.scope === "suite" ? "suite" : o.product;
  const doc: LifetimeLicenseDoc = {
    id: newLicenseId(), user_id: o.userId, order_id: o.orderId || "", scope: o.scope, product, devices: o.devices, major_version: LIFETIME_MAJOR,
    updates_until: updatesUntil, status: "active", note: String(o.note || "").slice(0, 300), install_key: "", created_at: ts, updated_at: ts,
  };
  return asLicence(await db.lifetimeLicenses.create(doc))!;
}

export async function licensesFor(db: Data, userId: string): Promise<(LifetimeLicense & { activations: LifetimeActivation[] })[]> {
  const lics = (await db.lifetimeLicenses.listAllDocs("user", userId)) as LifetimeLicense[];
  if (!lics.length) return [];
  const acts = await Promise.all(lics.map((l) => db.lifetimeActivations.listAllDocs("license", l.id)));
  return lics.map((l, i) => ({ ...l, activations: acts[i]! }));
}

/** Does the member hold an active lifetime licence for this app with updates still included? */
export async function lifetimeCovers(db: Data, userId: string, product: string): Promise<boolean> {
  const at = now();
  return (await db.lifetimeLicenses.listAllDocs("user", userId)).some((l) => l.status === "active" && l.updates_until > at && (l.product === product || l.scope === "suite"));
}

async function signedFile(db: Data, lic: LifetimeLicense, act: LifetimeActivation, customer: string): Promise<string> {
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
export async function activateDevice(db: Data, userId: string, licenseId: string, product: string, machineId: string, label: string, customer: string): Promise<ActivateResult> {
  const lic = asLicence(await db.lifetimeLicenses.get(licenseId));
  if (!lic || lic.user_id !== userId) return { ok: false, error: "Licence not found.", status: 404 };
  if (lic.status !== "active") return { ok: false, error: "This licence has been revoked. Contact support.", status: 403 };
  if (!productsOf(lic).includes(product)) return { ok: false, error: `This licence does not cover ${productName(product)}.`, status: 400 };
  const mid = String(machineId || "").trim().toLowerCase();
  if (!isMachineId(mid)) return { ok: false, error: "Enter the 32-character machine ID the app shows on first start (see the guide).", status: 400 };

  const live = () => db.lifetimeActivations.find("machine", `${lic.id}|${product}|${mid}`);
  let act = await live();
  if (!act) {
    // A device takes a numbered seat (1…devices) through a uniqueness guard: two simultaneous
    // activations can never exceed the limit, and one machine never takes two seats.
    for (let slot = 1; slot <= lic.devices && !act; slot++) {
      try {
        act = await db.lifetimeActivations.create({
          id: newId("act"), license_id: lic.id, product, machine_id: mid, label: String(label || "").trim().slice(0, 80), created_at: now(), revoked_at: "", slot,
        });
      } catch (err) {
        if (!(err instanceof ConflictError)) throw err;
        if (err.field === "machine") act = await live();   // the same machine, activated concurrently
      }
    }
    if (!act) {
      return { ok: false, error: `All ${lic.devices} device${lic.devices === 1 ? "" : "s"} for ${productName(product)} are activated. To move to new hardware, ask support to retire an old device.`, status: 409 };
    }
  }
  return { ok: true, activation: act, file: await signedFile(db, lic, act, customer), filename: `${product}.axto-license` };
}

/** The licence's AXTO Setup key, created on first use. */
export async function installKeyFor(db: Data, licenseId: string): Promise<string> {
  try {
    const cur = await db.lifetimeLicenses.get(licenseId);
    if (!cur) return "";
    if (cur.install_key) return cur.install_key;
    const k = newInstallKey();
    return (await db.lifetimeLicenses.update(licenseId, (l) => (l.install_key ? null : { ...l, install_key: k, updated_at: now() }))).install_key;
  } catch {
    return "";
  }
}

type InstallLicence = LifetimeLicense & { user_status: string; email: string; name: string; organization: string };
export async function licenseByInstallKey(db: Data, key: string): Promise<InstallLicence | null> {
  try {
    const l = asLicence(await db.lifetimeLicenses.find("install_key", key));
    if (!l) return null;
    const u = await db.users.get(l.user_id);
    if (!u) return null;
    return { ...l, user_status: u.status, email: u.email, name: u.name, organization: u.organization };
  } catch {
    return null;
  }
}

/** Re-download an existing activation's file (member: own licences only). */
export async function activationFileFor(db: Data, activationId: string, userId: string | null, customer: string): Promise<{ file: string; filename: string } | null> {
  const act = await db.lifetimeActivations.get(activationId);
  if (!act || act.revoked_at) return null;
  const lic = asLicence(await db.lifetimeLicenses.get(act.license_id));
  if (!lic || lic.status !== "active" || (userId && lic.user_id !== userId)) return null;
  return { file: await signedFile(db, lic, act, customer), filename: `${act.product}.axto-license` };
}

/** Retire a device: its seat and its machine guard are released for a new device. */
export async function revokeActivation(db: Data, activationId: string): Promise<boolean> {
  const cur = await db.lifetimeActivations.get(activationId);
  if (!cur || cur.revoked_at) return false;
  let won = false;
  await db.lifetimeActivations.update(activationId, (a) => {
    won = !a.revoked_at;
    return won ? { ...a, revoked_at: now() } : null;
  });
  return won;
}

export async function setLicenseStatus(db: Data, licenseId: string, status: "active" | "revoked"): Promise<boolean> {
  if (!(await db.lifetimeLicenses.get(licenseId))) return false;
  await db.lifetimeLicenses.update(licenseId, (l) => ({ ...l, status, updated_at: now() }));
  return true;
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
 * order). Idempotent through the uniqueness guard on order_id.
 */
export async function issueForOrder(db: Data, o: { id: string; user_id: string; email: string; amount_usd: number; meta: string }): Promise<LifetimeLicense | null> {
  const existing = asLicence(await db.lifetimeLicenses.find("order_id", o.id));
  if (existing) return existing;
  const m: any = readMeta(o.meta).lifetime || {};
  if (lifetimeChoiceProblem(m.scope, m.product) || !(Number(m.devices) >= 1 && Number(m.devices) <= 100)) return null;
  let lic: LifetimeLicense;
  try {
    lic = await issueLifetime(db, { userId: o.user_id, orderId: o.id, scope: m.scope, product: String(m.product || ""), devices: Number(m.devices) });
  } catch (err) {
    // The order_id guard: a licence for this order was issued concurrently.
    if (err instanceof ConflictError) return asLicence(await db.lifetimeLicenses.find("order_id", o.id));
    throw err;
  }
  const mail = lifetimeMail(lic, o.amount_usd);
  await sendMail(o.email, mail.subject, mail.html);
  return lic;
}
