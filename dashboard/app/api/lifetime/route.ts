/* AXTO — /api/lifetime · the member's lifetime (offline) licences.
 *   GET  → licences with their device activations, plus the live price table
 *   POST {action:"activate", licenseId, product, machineId, label?}
 *        → activates one device for one app and returns its signed .axto-license file
 * Buying goes through /api/billing/checkout {kind:"lifetime"}. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, dbFirst } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { SigningUnavailable } from "@/lib/license-sign";
import { getLifetimePrices, productsOf, LIFETIME_INCLUDES, CARD_MAX_USD } from "@/lib/lifetime";
import { availableBuilds, imageKey, archImageName } from "@/lib/builds";
import { getSelfHosted } from "@/lib/selfhosted";
import { licensesFor, activateDevice, productName, installKeyFor } from "@/lib/lifetime-service";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const db = getDB(req);
  const [licenses, tiers, builds] = await Promise.all([licensesFor(db, ctx.session.sub), getLifetimePrices(db), availableBuilds(req)]);
  // Only files that exist are linked (a build can still be in preparation).
  const files = (slug: string) => {
    const p = getSelfHosted(slug);
    return {
      images: (p?.images || []).filter((i) => builds.has(imageKey(i.name))).map((i) => i.name),
      arm64: (p?.images || []).filter((i) => builds.has(imageKey(archImageName(i.name, "arm64")))).map((i) => `${i.name}-arm64`),
    };
  };
  // AXTO Setup key per active licence (created on first view).
  const keys = await Promise.all(licenses.map((l) => (l.status === "active" ? installKeyFor(db, l.id) : Promise.resolve(""))));
  return respond({
    licenses: licenses.map((l, i) => ({
      ...l, install_key: keys[i], name: productName(l.product),
      products: productsOf(l).map((slug) => ({ slug, name: productName(slug), used: l.activations.filter((a) => a.product === slug && !a.revoked_at).length, files: files(slug) })),
      updatesActive: l.updates_until > new Date().toISOString(),
    })),
    tiers, includes: LIFETIME_INCLUDES, cardMaxUsd: CARD_MAX_USD,
  }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  const b = await readJson(req);
  if (b?.action !== "activate") return fail("Unknown action.");
  const rl = await rateLimit(req, "lifetime-activate", ctx.session.sub, { max: 60, windowSeconds: 86400 });
  if (rl.limited) return fail("Too many activations today. Please try again tomorrow or contact support.", 429);
  const db = getDB(req);
  const u = await dbFirst<{ name: string; organization: string }>(db, `SELECT name, organization FROM users WHERE id = ?`, [ctx.session.sub]);
  const customer = [u?.organization, u?.name, ctx.session.email].filter(Boolean).join(" · ");
  try {
    const r = await activateDevice(db, ctx.session.sub, String(b.licenseId || ""), String(b.product || ""), String(b.machineId || ""), String(b.label || ""), customer);
    if (!r.ok) return fail(r.error, r.status);
    await audit(db, ctx.session, "lifetime.activated", "lifetime_activation", r.activation.id, { license: b.licenseId, product: b.product, machine: r.activation.machine_id }, req);
    return respond({ ok: true, activation: r.activation, file: r.file, filename: r.filename }, ctx);
  } catch (e) {
    if (e instanceof SigningUnavailable) return fail("Activation is temporarily unavailable. Please try again shortly.", 503);
    throw e;
  }
}
