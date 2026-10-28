/* AXTO — /api/admin/linkedin · Admin → LinkedIn (docs/BLUEPRINT-V4.md §35)
 *   GET  → settings (the secret and the token masked), the schedule of today and
 *          tomorrow, the promotion library with previews, and the post log
 *   PUT  {settings} → app credentials, scopes, API version, daily posting on/off,
 *          page and time per brand, library posts switched off
 *   POST {action:"connect"}            → LinkedIn sign-in URL (state kept in an httpOnly cookie)
 *        {action:"disconnect"}         → forget the token
 *        {action:"orgs"}               → the pages the connected account administers
 *        {action:"post_now", brand, postId} → publish one library post now
 * Credentials and tokens live only in the encrypted R2 document "linkedin". */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond, forbidden } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { keepSecret, maskValue, SettingsKeyMissing } from "@/lib/secure-store";
import { absoluteUrl } from "@/lib/site";
import { BRAND_IDS, LIBRARY, imagePath, postUrl, type BrandId } from "@/lib/linkedin/library";
import { adminOrganizations, authorizeUrl, plainCommentary, LinkedInError } from "@/lib/linkedin/client";
import {
  LINKEDIN_DEFAULTS, brandProblem, getLinkedIn, postNow, postOfDay, runId, sanitizeLinkedIn, saveLinkedIn, slotAt, wibDay, type LinkedInSettings,
} from "@/lib/linkedin/autopost";

const STATE_COOKIE = "axto_li_state";
const CALLBACK = "/api/admin/linkedin/callback";
const redirectUri = () => absoluteUrl(CALLBACK);
const isBrand = (b: unknown): b is BrandId => BRAND_IDS.includes(b as BrandId);

function masked(s: LinkedInSettings) {
  const { token, clientSecret, ...rest } = s;
  return {
    ...rest, clientSecret: maskValue(clientSecret), hasSecret: !!clientSecret,
    token: token ? { connected: true, expiresAt: token.expiresAt, refresh: !!token.refresh, refreshExpiresAt: token.refreshExpiresAt, scope: token.scope, connectedAt: token.connectedAt, connectedBy: token.connectedBy } : null,
  };
}

async function view(req: NextRequest) {
  const db = getData(req);
  const s = await getLinkedIn({ fresh: true });
  const nowMs = Date.now();
  const today = wibDay(nowMs), tomorrow = wibDay(nowMs + 86_400_000);
  const schedule = await Promise.all(BRAND_IDS.map(async (b) => {
    const run = await db.socialPosts.get(runId(b, today));
    const day = (d: string) => ({ day: d, at: new Date(slotAt(d, s.brands[b].time)).toISOString(), post: postOfDay(b, d, s.disabled)?.id || "" });
    return { brand: b, problem: brandProblem(s, b), today: { ...day(today), status: run?.status || "", url: run?.url || "", error: run?.error || "" }, tomorrow: day(tomorrow) };
  }));
  const log = (await db.socialPosts.list("all", "all", { limit: 60 })).entries.map((e) => ({ id: e.id, ...e.meta }));
  return {
    settings: masked(s), defaults: { scopes: LINKEDIN_DEFAULTS.scopes, version: LINKEDIN_DEFAULTS.version }, redirectUri: redirectUri(), schedule, log,
    library: LIBRARY.map((p) => ({ id: p.id, brand: p.brand, url: postUrl(p), image: imagePath(p), eyebrow: p.image.eyebrow, preview: plainCommentary(p.text, postUrl(p), p.hashtags), enabled: !s.disabled.includes(p.id) })),
  };
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  try {
    return respond(await view(req), ctx);
  } catch (e) {
    if (e instanceof SettingsKeyMissing) return fail("Set the SETTINGS_ENCRYPTION_KEY secret first.", 503);
    throw e;
  }
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const b = await readJson(req);
  if (!b?.settings || typeof b.settings !== "object") return fail("Nothing to save.");
  const cur = await getLinkedIn({ fresh: true });
  // The token and the reminder are never set from the browser; the secret is kept when it comes back masked or empty.
  const next = sanitizeLinkedIn({ ...b.settings, token: undefined, remindedOn: undefined, clientSecret: keepSecret(b.settings.clientSecret, cur.clientSecret) }, cur);
  if (next.enabled) {
    const missing = BRAND_IDS.filter((x) => next.brands[x].enabled).map((x) => brandProblem(next, x)).find(Boolean);
    if (missing) return fail(`Daily posting cannot be switched on yet: ${missing}`);
  }
  try {
    await saveLinkedIn(next);
  } catch (e) {
    if (e instanceof SettingsKeyMissing) return fail("Set the SETTINGS_ENCRYPTION_KEY secret first.", 503);
    throw e;
  }
  await audit(getData(req), ctx.session, "admin.linkedin.update", "settings", "linkedin", {
    enabled: next.enabled, clientId: next.clientId, secretChanged: next.clientSecret !== cur.clientSecret, scopes: next.scopes, version: next.version,
    brands: next.brands, disabled: next.disabled.length,
  }, req);
  return respond({ ok: true, ...(await view(req)) }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const b = await readJson(req);
  const action = String(b?.action || "");
  const db = getData(req);
  const s = await getLinkedIn({ fresh: true });

  if (action === "connect") {
    if (!s.clientId || !s.clientSecret) return fail("Save the LinkedIn app's Client ID and Client Secret first.");
    const state = [...crypto.getRandomValues(new Uint8Array(24))].map((x) => x.toString(16).padStart(2, "0")).join("");
    const res = respond({ ok: true, url: authorizeUrl({ clientId: s.clientId, redirectUri: redirectUri(), state, scopes: s.scopes }) }, ctx);
    res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: CALLBACK, maxAge: 600 });
    return res;
  }
  if (action === "disconnect") {
    await saveLinkedIn({ ...s, token: null, enabled: false });
    await audit(db, ctx.session, "admin.linkedin.disconnect", "settings", "linkedin", {}, req);
    return respond({ ok: true, ...(await view(req)) }, ctx);
  }
  if (action === "orgs") {
    if (!s.token?.access) return fail("Connect LinkedIn first.");
    try {
      return respond({ ok: true, orgs: await adminOrganizations(fetch, s.token.access, s.version) }, ctx);
    } catch (e) {
      return fail(e instanceof LinkedInError ? `${e.message} — you can also type the page's number (linkedin.com/company/<number>/admin).` : "LinkedIn could not be reached.", 502);
    }
  }
  if (action === "post_now") {
    if (!isBrand(b?.brand)) return fail("Choose a brand.");
    try {
      const run = await postNow(db, s, b.brand, String(b?.postId || ""), ctx.session, { fetch, origin: new URL(req.url).origin });
      if (run.status !== "posted") return fail(`Not posted: ${run.error}`, 502);
      return respond({ ok: true, run, ...(await view(req)) }, ctx);
    } catch (e: any) {
      return fail(String(e?.message || e).slice(0, 300));
    }
  }
  return fail("Unknown action.");
}
