/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * /api/selfhosted — the member's self-hosted (Docker) licences.
 *   GET  → every product with: included?, licence (if issued), downloadable files
 *   POST {action:"issue"|"reset"|"release", product}
 * Business = 3 apps, Enterprise = all 10. Licences are always TOP tier and
 * expire with the subscription period.
 * ============================================================================ */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, now } from "@/lib/db";
import { availableBuilds, imageKey, exeKey } from "@/lib/builds";
import { loadSession, unauthorized, respond, effectiveTier, loadSessionFor } from "@/lib/auth";
import { limitsFor, PLANS, isPlanId } from "@/lib/plans";
import { SELF_HOSTED, getSelfHosted, catalogEntry, generateLicenseKey } from "@/lib/selfhosted";
import { readJson, fail, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail";
import { issueLicence, licencesMail, ADMIN_HOLD, HOLD_MESSAGE } from "@/lib/licences";

export async function GET(req: NextRequest) {
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).selfHostedApps !== 0);
  if (!ctx) return unauthorized();
  const tier = effectiveTier(ctx.session);
  const lim = limitsFor(tier);
  const db = getDB(req);
  const [lics, sub, builds] = await Promise.all([
    dbQuery<any>(db, `SELECT product, license_key, status, expires_at, max_nodes, bound_machine_id, last_seen_at, last_version, created_at,
                             CASE WHEN notes = 'admin_hold' THEN 1 ELSE 0 END AS held
                        FROM sh_licenses WHERE user_id = ? AND (status != 'revoked' OR notes = 'admin_hold')`, [ctx.session.sub]),
    dbFirst<any>(db, `SELECT current_period_end FROM subscriptions WHERE user_id = ?`, [ctx.session.sub]),
    availableBuilds(req),
  ]);
  const active = lics.filter((l) => l.status === "active").length;
  const products = SELF_HOSTED.map((p) => {
    const c = catalogEntry(p.slug);
    const lic = lics.find((l) => l.product === p.slug) || null;
    return {
      slug: p.slug, name: c?.name || p.slug, emoji: c?.emoji || "📦", tagline: c?.tagline || "", port: p.port,
      compose: p.compose, config: p.config, configTarget: p.configTarget, licenseField: p.licenseField,
      images: p.images.map((i) => ({ ...i, available: builds.has(imageKey(i.name)) })),
      exeAvailable: !!p.exe && builds.has(exeKey(p.exe)),
      license: lic,
    };
  });
  return respond({
    tier, planName: isPlanId(tier) ? PLANS[tier].name : "Free",
    allowance: lim.selfHostedApps, nodes: lim.selfHostedNodes, used: active,
    periodEnd: sub?.current_period_end || "", products,
  }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  const s = ctx.session;
  const tier = effectiveTier(s);
  const lim = limitsFor(tier);
  const b = await readJson(req);
  const product = getSelfHosted(String(b?.product || ""));
  if (!product) return fail("Unknown product.");
  const db = getDB(req);
  const existing = await dbFirst<any>(db, `SELECT * FROM sh_licenses WHERE user_id = ? AND product = ?`, [s.sub, product.slug]);

  if (b?.action === "issue") {
    if (lim.selfHostedApps === 0) return fail("Self-hosted apps are included in the Business and Enterprise plans.", 402, { upgrade: true });
    if (s.role === "admin") return fail("Admins issue licences from Admin → Licences.");
    const sub = await dbFirst<{ current_period_end: string }>(db, `SELECT current_period_end FROM subscriptions WHERE user_id = ? AND status = 'active'`, [s.sub]);
    if (!sub) return fail("No active plan.", 402, { upgrade: true });
    if (existing && existing.status === "active") return respond({ ok: true, license: existing }, ctx);
    const r = await issueLicence(db, s.sub, product.slug, lim, sub.current_period_end);
    if (r && "error" in r) return fail(r.error, 409);
    await audit(db, s, "license.issued", "sh_license", product.slug, {}, req);
    if (r) {
      const m = licencesMail([r]);
      await sendMail(s.email, m.subject, m.html);
    }
    const license = await dbFirst<any>(db, `SELECT * FROM sh_licenses WHERE user_id = ? AND product = ?`, [s.sub, product.slug]);
    return respond({ ok: true, license }, ctx);
  }

  if (existing?.notes === ADMIN_HOLD) return fail(HOLD_MESSAGE, 403);
  if (!existing || existing.status === "revoked") return fail("You don't have a licence for this app yet.");

  if (b?.action === "reset") {
    const rl = await rateLimit(req, "license-reset", `${s.sub}:${product.slug}`, { max: 3, windowSeconds: 86400 });
    if (rl.limited) return fail("You can reset the server binding up to 3 times per day.", 429);
    await dbRun(db, `UPDATE sh_licenses SET bound_machine_id = '', reset_count = reset_count + 1, updated_at = ? WHERE id = ?`, [now(), existing.id]);
    await audit(db, s, "license.reset", "sh_license", product.slug, {}, req);
    return respond({ ok: true }, ctx);
  }

  if (b?.action === "release") {
    await dbRun(db, `UPDATE sh_licenses SET status = 'revoked', updated_at = ? WHERE id = ?`, [now(), existing.id]);
    await audit(db, s, "license.released", "sh_license", product.slug, {}, req);
    return respond({ ok: true }, ctx);
  }
  return fail("Unknown action.");
}
