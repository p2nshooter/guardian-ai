/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * Buying one self-hosted app in an edition (docs/AXTO-APPS-BLUEPRINT.md §3):
 * the paid order becomes a licence (source = 'edition') with the edition's
 * package code and limits — zero-touch, called from markOrderPaid.
 *   • Same edition again  → the term stacks on the current end date.
 *   • Another edition     → starts now; unused value of the old edition is
 *                           converted into extra days (same rule as plans).
 *   • A trial of the app  → marked as converted.
 * ============================================================================ */
import { now, secret } from "./db";
import type { Data } from "./data";
import { getEdition, editionMaxNodes, editionPrice, mergeEditionPrices, isEditionCycle, type Edition, type EditionCycle } from "./editions";
export { EDITION_ANY_GATEWAY_MAX, editionGatewayAllowed } from "./editions";
import { generateLicenseKey, catalogEntry, getSelfHosted } from "./selfhosted";
import { markTrialConverted } from "./trials";
import { ADMIN_HOLD, findLicence, newLicence } from "./licences";

const DAY = 86_400_000;
const TERM_DAYS: Record<EditionCycle, number> = { monthly: 30.4375, yearly: 365.25 };

export interface EditionChoice { code: string; app: string; cycle: EditionCycle }

/** Validate the browser's choice; the price always comes from the server. */
export function editionChoiceProblem(code: unknown, cycle: unknown): string | null {
  const e = typeof code === "string" ? getEdition(code) : undefined;
  if (!e) return "Choose an edition.";
  if (!getSelfHosted(e.app)) return "Unknown app.";
  if (!isEditionCycle(cycle)) return "Choose monthly or yearly billing.";
  return null;
}

/** New end date for an edition purchase, crediting the unused part of the current one. */
export function editionPeriod(current: { package_code: string; expires_at: string; status: string; cycle?: EditionCycle } | null, e: Edition, cycle: EditionCycle, at = new Date()): { end: Date; creditDays: number } {
  const term = TERM_DAYS[cycle] * DAY;
  let end = new Date(at.getTime() + term);
  let creditDays = 0;
  const left = current && current.status === "active" ? Date.parse(current.expires_at) - at.getTime() : 0;
  if (current && left > 0) {
    if (current.package_code === e.code) {
      end = new Date(Date.parse(current.expires_at) + term);
    } else {
      const old = getEdition(current.package_code);
      const prices = mergeEditionPrices(null);
      const oc: EditionCycle = current.cycle || "yearly";
      const oldDaily = old ? (editionPrice(old.code, oc, prices) ?? 0) / TERM_DAYS[oc] : 0;
      const newDaily = (editionPrice(e.code, cycle, prices) ?? 0) / TERM_DAYS[cycle];
      if (oldDaily > 0 && newDaily > 0) {
        const creditMs = left * (oldDaily / newDaily);
        creditDays = Math.round((creditMs / DAY) * 10) / 10;
        end = new Date(end.getTime() + creditMs);
      }
    }
  }
  return { end, creditDays };
}

export interface EditionIssued { id: string; product: string; name: string; edition: string; key: string; expiresAt: string; creditDays: number; renewed: boolean }

/** Turn a paid edition order into a licence. Idempotence is handled by markOrderPaid. */
export async function issueEdition(db: Data, userId: string, choice: EditionChoice): Promise<EditionIssued | { error: string }> {
  const e = getEdition(choice.code);
  if (!e || e.app !== choice.app) return { error: "Unknown edition." };
  const existing = await findLicence(db, userId, e.app, "edition");
  if (existing?.notes === ADMIN_HOLD) return { error: "This licence was locked by AXTO. Contact support to restore it." };
  const prevCycle = (() => { try { return JSON.parse(existing?.notes || "{}").cycle; } catch { return undefined; } })();
  const { end, creditDays } = editionPeriod(existing ? { ...existing, cycle: isEditionCycle(prevCycle) ? prevCycle : undefined } : null, e, choice.cycle);
  const at = now();
  const notes = JSON.stringify({ cycle: choice.cycle });
  let key = existing?.license_key || "";
  let id = existing?.id || "";
  const renewed = !!existing && existing.status === "active" && existing.package_code === e.code;
  if (existing) {
    // Keep the key on a renewal (nothing to reinstall); a new edition keeps it too — the engine re-validates.
    if (existing.status === "revoked" || !key) key = await generateLicenseKey(e.app, secret("LICENSE_KEY_HMAC_SECRET") || undefined);
    const k = key;
    await db.shLicenses.update(existing.id, (l) => ({ ...l, license_key: k, package_code: e.code, max_nodes: editionMaxNodes(e), status: "active", expires_at: end.toISOString(), notes, updated_at: at }));
  } else {
    key = await generateLicenseKey(e.app, secret("LICENSE_KEY_HMAC_SECRET") || undefined);
    const doc = newLicence({ user_id: userId, product: e.app, license_key: key, package_code: e.code, max_nodes: editionMaxNodes(e), expires_at: end.toISOString(), notes, source: "edition" });
    id = doc.id;
    await db.shLicenses.create(doc);
  }
  // The paid licence replaces a running trial of the same app.
  const trial = await findLicence(db, userId, e.app, "trial");
  if (trial) await db.shLicenses.update(trial.id, (l) => (l.status === "active" ? { ...l, status: "revoked", updated_at: at } : null)).catch(() => {});
  await markTrialConverted(db, userId, e.app);
  return { id, product: e.app, name: catalogEntry(e.app)?.name || e.app, edition: e.name, key, expiresAt: end.toISOString(), creditDays, renewed };
}
