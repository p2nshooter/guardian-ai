/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * /api/selfhosted — the member's self-hosted (Docker) licences.
 *   GET  → every product with its licences (plan / edition / trial), files, trial status
 *   POST {action:"issue"|"reset"|"release", product, source?}
 *        {action:"trial", product}              claim one of the app's trial licences
 *        {action:"rate", product, rating:1–5}   rate a trial
 * Plan licences (Business = 3 apps, Enterprise = all 10) are always the top
 * edition and follow the subscription; editions and trials are separate
 * licences (docs/AXTO-APPS-BLUEPRINT.md §3–§4).
 * ============================================================================ */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, now } from "@/lib/db";
import { availableBuilds, imageKey, archImageName } from "@/lib/builds";
import { loadSession, unauthorized, respond, effectiveTier, loadSessionFor } from "@/lib/auth";
import { limitsFor, PLANS, isPlanId } from "@/lib/plans";
import { SELF_HOSTED, getSelfHosted, catalogEntry, generateLicenseKey } from "@/lib/selfhosted";
import { readJson, fail, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail";
import { issueLicence, licencesMail, ADMIN_HOLD, HOLD_MESSAGE } from "@/lib/licences";
import { getEdition } from "@/lib/editions";
import { getTrialConfig, trialOpen, trialStats, trialEdition, claimTrial, ensureTrialPool } from "@/lib/trials";
import { mailLayout } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";

const SOURCES = ["plan", "edition", "trial"] as const;
type Source = (typeof SOURCES)[number];
const isSource = (x: unknown): x is Source => (SOURCES as readonly string[]).includes(x as string);
const clientIp = (req: NextRequest) => req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "";

export async function GET(req: NextRequest) {
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).selfHostedApps !== 0);
  if (!ctx) return unauthorized();
  const tier = effectiveTier(ctx.session);
  const lim = limitsFor(tier);
  const db = getDB(req);
  await ensureTrialPool(db);
  const [lics, sub, builds, cfg, stats, trials] = await Promise.all([
    dbQuery<any>(db, `SELECT id, product, source, package_code, license_key, status, expires_at, max_nodes, bound_machine_id, last_seen_at, last_version, created_at,
                             CASE WHEN notes = 'admin_hold' THEN 1 ELSE 0 END AS held
                        FROM sh_licenses WHERE user_id = ? AND (status != 'revoked' OR notes = 'admin_hold')`, [ctx.session.sub]),
    dbFirst<any>(db, `SELECT current_period_end FROM subscriptions WHERE user_id = ?`, [ctx.session.sub]),
    availableBuilds(req),
    getTrialConfig(db), trialStats(db),
    dbQuery<{ product: string; rating: number }>(db, `SELECT product, rating FROM sh_trials WHERE status = 'claimed' AND user_id = ?`, [ctx.session.sub]),
  ]);
  const planActive = lics.filter((l) => l.status === "active" && (l.source || "plan") === "plan").length;
  const open = trialOpen(cfg);
  const products = SELF_HOSTED.map((p) => {
    const c = catalogEntry(p.slug);
    const mine = lics.filter((l) => l.product === p.slug).map((l) => ({ ...l, source: l.source || "plan", edition: getEdition(l.package_code)?.name || "" }));
    const used = trials.find((t) => t.product === p.slug);
    return {
      slug: p.slug, name: c?.name || p.slug, emoji: c?.emoji || "📦", tagline: c?.tagline || "", port: p.port,
      compose: p.compose, config: p.config, configTarget: p.configTarget, licenseField: p.licenseField,
      images: p.images.map((i) => ({ ...i, available: builds.has(imageKey(i.name)), arm64: builds.has(imageKey(archImageName(i.name, "arm64"))) })),
      license: mine.find((l) => l.source === "plan") || null,
      licenses: mine,
      trial: { available: open ? stats[p.slug].available : 0, total: stats[p.slug].total, used: !!used, rating: used?.rating || 0, edition: trialEdition(p.slug)?.name || "" },
    };
  });
  return respond({
    tier, planName: isPlanId(tier) ? PLANS[tier].name : "Free",
    allowance: lim.selfHostedApps, nodes: lim.selfHostedNodes, used: planActive,
    periodEnd: sub?.current_period_end || "", products,
    trials: { open, days: cfg.days, maxProducts: cfg.maxProducts, used: trials.length },
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
  const source: Source = isSource(b?.source) ? b.source : "plan";

  if (b?.action === "trial") {
    if (s.role === "admin") return fail("Admins manage trials in Admin → Trials.");
    const rl = await rateLimit(req, "trial-claim", s.sub, { max: 5, windowSeconds: 86400 });
    if (rl.limited) return fail("Too many attempts today. Please try again tomorrow.", 429);
    const r = await claimTrial(db, { id: s.sub, email: s.email }, product.slug, clientIp(req), await getTrialConfig(db));
    if (!r.ok) return fail(r.error, r.status, { reason: r.reason });
    await audit(db, s, "trial.claimed", "sh_trial", r.code, { product: r.product, expires: r.expiresAt }, req);
    const esc = (x: string) => x.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    await sendMail(s.email, `Your ${r.name} trial licence`, mailLayout(`${r.name} — ${r.edition} trial`,
      `<p>Your trial licence is active until <b>${r.expiresAt.slice(0, 10)}</b>.</p>
       <p style="font-family:ui-monospace,Menlo,monospace;font-size:14px;font-weight:700">${esc(r.key)}</p>
       <p><b>Windows:</b> download <b>AXTO Setup</b> from the portal, run it and paste the key.<br><b>Linux:</b> <code>./axto-setup install ${esc(r.product)} --key ${esc(r.key)}</code></p>
       <p>When the trial ends the app asks for a licence; your data stays on your server.</p>`,
      { label: "Open Self-Hosted", href: absoluteUrl("/app/self-hosted") }));
    return respond({ ok: true, trial: r }, ctx);
  }

  if (b?.action === "rate") {
    const rating = Number(b?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("Choose 1 to 5 stars.");
    const r = await dbRun(db, `UPDATE sh_trials SET rating = ? WHERE user_id = ? AND product = ? AND status = 'claimed'`, [rating, s.sub, product.slug]);
    if (!r?.meta?.changes) return fail("You have no trial of this app.", 404);
    await audit(db, s, "trial.rated", "sh_trial", product.slug, { rating }, req);
    return respond({ ok: true }, ctx);
  }

  const existing = await dbFirst<any>(db, `SELECT * FROM sh_licenses WHERE user_id = ? AND product = ? AND source = ?`, [s.sub, product.slug, source]);

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
    const license = await dbFirst<any>(db, `SELECT * FROM sh_licenses WHERE user_id = ? AND product = ? AND source = 'plan'`, [s.sub, product.slug]);
    return respond({ ok: true, license }, ctx);
  }

  if (existing?.notes === ADMIN_HOLD) return fail(HOLD_MESSAGE, 403);
  if (!existing || existing.status === "revoked") return fail("You don't have a licence for this app yet.");

  if (b?.action === "reset") {
    const rl = await rateLimit(req, "license-reset", `${s.sub}:${product.slug}:${source}`, { max: 3, windowSeconds: 86400 });
    if (rl.limited) return fail("You can reset the server binding up to 3 times per day.", 429);
    await dbRun(db, `UPDATE sh_licenses SET bound_machine_id = '', reset_count = reset_count + 1, updated_at = ? WHERE id = ?`, [now(), existing.id]);
    await audit(db, s, "license.reset", "sh_license", product.slug, { source }, req);
    return respond({ ok: true }, ctx);
  }

  if (b?.action === "release") {
    if (source !== "plan") return fail("Only licences from your plan can be released.");
    await dbRun(db, `UPDATE sh_licenses SET status = 'revoked', updated_at = ? WHERE id = ?`, [now(), existing.id]);
    await audit(db, s, "license.released", "sh_license", product.slug, {}, req);
    return respond({ ok: true }, ctx);
  }
  return fail("Unknown action.");
}
