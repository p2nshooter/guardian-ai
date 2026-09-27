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
import { getDB, getEnv, getR2Builds, dbFirst, dbQuery, dbRun, newId, now, secret } from "@/lib/db";
import { loadSession, unauthorized, respond, effectiveTier } from "@/lib/auth";
import { limitsFor, PLANS, isPlanId } from "@/lib/plans";
import { SELF_HOSTED, getSelfHosted, catalogEntry, generateLicenseKey } from "@/lib/selfhosted";
import { readJson, fail, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail, mails } from "@/lib/mail";

/** Names of build files present in R2 (cached in KV for 10 minutes). */
async function availableBuilds(req: NextRequest): Promise<Set<string>> {
  const kv = getEnv(req).KV;
  try {
    const hit = kv ? await kv.get("builds:available") : null;
    if (hit) return new Set(JSON.parse(hit));
  } catch {}
  const names: string[] = [];
  try {
    const r2 = getR2Builds(req);
    for (const prefix of ["builds/latest/raw/", "builds/latest/exe/"]) {
      const res = await r2.list({ prefix, limit: 500 });
      for (const o of res.objects || []) names.push(o.key);
    }
  } catch {}
  try { if (kv) await kv.put("builds:available", JSON.stringify(names), { expirationTtl: 600 }); } catch {}
  return new Set(names);
}

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const tier = effectiveTier(ctx.session);
  const lim = limitsFor(tier);
  const db = getDB(req);
  const [lics, sub, builds] = await Promise.all([
    dbQuery<any>(db, `SELECT product, license_key, status, expires_at, max_nodes, bound_machine_id, last_seen_at, last_version, created_at
                        FROM sh_licenses WHERE user_id = ? AND status != 'revoked'`, [ctx.session.sub]),
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
      images: p.images.map((i) => ({ ...i, available: builds.has(`builds/latest/raw/${i.name}.tar.gz`) })),
      exeAvailable: !!p.exe && builds.has(`builds/latest/exe/${p.exe}-windows.exe`),
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
    if (lim.selfHostedApps > 0) {
      const n = await dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM sh_licenses WHERE user_id = ? AND status = 'active'`, [s.sub]);
      if ((n?.n ?? 0) >= lim.selfHostedApps) return fail(`Your plan includes ${lim.selfHostedApps} self-hosted apps. Release one first, or upgrade to Enterprise for all of them.`, 409);
    }
    const key = await generateLicenseKey(product.slug, secret("LICENSE_KEY_HMAC_SECRET") || undefined);
    if (existing) {
      await dbRun(db, `UPDATE sh_licenses SET license_key = ?, package_code = ?, max_nodes = ?, status = 'active', expires_at = ?, bound_machine_id = '', updated_at = ? WHERE id = ?`,
        [key, product.packageCode, lim.selfHostedNodes, sub.current_period_end, now(), existing.id]);
    } else {
      await dbRun(db, `INSERT INTO sh_licenses (id, user_id, product, license_key, package_code, max_nodes, status, expires_at, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
        [newId(), s.sub, product.slug, key, product.packageCode, lim.selfHostedNodes, sub.current_period_end, now(), now()]);
    }
    await audit(db, s, "license.issued", "sh_license", product.slug, {}, req);
    const m = mails.licenseIssued({ product: catalogEntry(product.slug)?.name || product.slug, key });
    await sendMail(s.email, m.subject, m.html);
    const license = await dbFirst<any>(db, `SELECT * FROM sh_licenses WHERE user_id = ? AND product = ?`, [s.sub, product.slug]);
    return respond({ ok: true, license }, ctx);
  }

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
