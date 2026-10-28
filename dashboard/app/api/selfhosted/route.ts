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
import { getData, now, background } from "@/lib/db";
import { ids } from "@/lib/data/schema";
import { availableBuilds, imageKey, archImageName, offlineKey } from "@/lib/builds";
import { loadSession, unauthorized, respond, effectiveTier, loadSessionFor } from "@/lib/auth";
import { limitsFor, PLANS, isPlanId } from "@/lib/plans";
import { SELF_HOSTED, getSelfHosted, catalogEntry, generateLicenseKey } from "@/lib/selfhosted";
import { readJson, fail, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail";
import { issueLicence, licencesMail, findLicence, ADMIN_HOLD, HOLD_MESSAGE } from "@/lib/licences";
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
  const db = getData(req);
  // The first trial pool is filled in the background, a chunk per page view, until it is complete.
  background(ensureTrialPool(db));
  const [all, sub, builds, cfg, stats, mineTrials] = await Promise.all([
    db.shLicenses.listAllDocs("user", ctx.session.sub),
    db.subscriptions.get(ids.subscription(ctx.session.sub)),
    availableBuilds(req),
    getTrialConfig(db), trialStats(db),
    db.shTrials.listAllDocs("user", ctx.session.sub),
  ]);
  const lics = all.filter((l) => l.status !== "revoked" || l.notes === ADMIN_HOLD).map((l) => ({
    id: l.id, product: l.product, source: l.source, package_code: l.package_code, license_key: l.license_key, status: l.status, expires_at: l.expires_at,
    max_nodes: l.max_nodes, bound_machine_id: l.bound_machine_id, last_seen_at: l.last_seen_at, last_version: l.last_version, created_at: l.created_at,
    held: l.notes === ADMIN_HOLD ? 1 : 0,
  }));
  const trials = mineTrials.filter((t) => t.status === "claimed");
  const planActive = lics.filter((l) => l.status === "active" && (l.source || "plan") === "plan").length;
  const open = trialOpen(cfg);
  const products = SELF_HOSTED.map((p) => {
    const c = catalogEntry(p.slug);
    const mine = lics.filter((l) => l.product === p.slug).map((l) => ({ ...l, source: l.source || "plan", edition: getEdition(l.package_code)?.name || "" }));
    const used = trials.find((t) => t.product === p.slug);
    return {
      slug: p.slug, name: c?.name || p.slug, emoji: c?.emoji || "📦", tagline: c?.tagline || "", port: p.port,
      compose: p.compose, config: p.config, configTarget: p.configTarget, licenseField: p.licenseField,
      images: p.images.map((i) => ({ ...i, available: builds.has(imageKey(i.name)), size: builds.get(imageKey(i.name)) || 0,
                                     arm64: builds.has(imageKey(archImageName(i.name, "arm64"))), arm64Size: builds.get(imageKey(archImageName(i.name, "arm64"))) || 0 })),
      offline: builds.get(offlineKey(p.slug)) || 0,
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
  const db = getData(req);
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
    const mine = (await db.shTrials.listAllDocs("user", s.sub)).filter((t) => t.product === product.slug && t.status === "claimed");
    if (!mine.length) return fail("You have no trial of this app.", 404);
    for (const t of mine) await db.shTrials.update(t.id, (x) => (x.status === "claimed" && x.user_id === s.sub ? { ...x, rating } : null));
    await audit(db, s, "trial.rated", "sh_trial", product.slug, { rating }, req);
    return respond({ ok: true }, ctx);
  }

  const existing = await findLicence(db, s.sub, product.slug, source);

  if (b?.action === "issue") {
    if (lim.selfHostedApps === 0) return fail("Self-hosted apps are included in the Business and Enterprise plans.", 402, { upgrade: true });
    if (s.role === "admin") return fail("Admins issue licences from Admin → Licences.");
    const sub = await db.subscriptions.get(ids.subscription(s.sub));
    if (!sub || sub.status !== "active") return fail("No active plan.", 402, { upgrade: true });
    if (existing && existing.status === "active") return respond({ ok: true, license: existing }, ctx);
    const r = await issueLicence(db, s.sub, product.slug, lim, sub.current_period_end);
    if (r && "error" in r) return fail(r.error, 409);
    await audit(db, s, "license.issued", "sh_license", product.slug, {}, req);
    if (r) {
      const m = licencesMail([r]);
      await sendMail(s.email, m.subject, m.html);
    }
    const license = await findLicence(db, s.sub, product.slug, "plan");
    return respond({ ok: true, license }, ctx);
  }

  if (existing?.notes === ADMIN_HOLD) return fail(HOLD_MESSAGE, 403);
  if (!existing || existing.status === "revoked") return fail("You don't have a licence for this app yet.");

  if (b?.action === "reset") {
    const rl = await rateLimit(req, "license-reset", `${s.sub}:${product.slug}:${source}`, { max: 3, windowSeconds: 86400 });
    if (rl.limited) return fail("You can reset the server binding up to 3 times per day.", 429);
    await db.shLicenses.update(existing.id, (l) => ({ ...l, bound_machine_id: "", reset_count: (l.reset_count || 0) + 1, updated_at: now() }));
    await audit(db, s, "license.reset", "sh_license", product.slug, { source }, req);
    return respond({ ok: true }, ctx);
  }

  if (b?.action === "release") {
    if (source !== "plan") return fail("Only licences from your plan can be released.");
    await db.shLicenses.update(existing.id, (l) => ({ ...l, status: "revoked", updated_at: now() }));
    await audit(db, s, "license.released", "sh_license", product.slug, {}, req);
    return respond({ ok: true }, ctx);
  }
  return fail("Unknown action.");
}
