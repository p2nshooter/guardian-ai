/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * LINKEDIN AUTO-POST — two posts a day, one for axto.io and one for xaa.es
 * (owner, 28 Oct 2026, REQUESTS 123; docs/BLUEPRINT-V4.md §35).
 *
 *   settings   encrypted R2 document "linkedin" (lib/secure-store): the app's
 *              Client ID and Secret, the connected token, the page per brand,
 *              the time per brand (WIB), library posts switched off
 *   every tick a brand whose time has come today gets its post: the run record
 *              "li_<brand>_<YYYYMMDD>" is created once (overlapping ticks never
 *              post twice); a failure LinkedIn certainly refused is tried again
 *              up to 3 times, 15 minutes apart; an uncertain one never is
 *   hourly     refresh the token 7 days before it ends, or e-mail the admin
 *              once a day to reconnect when LinkedIn gave no refresh token
 *
 * The post of the day is the library's next one: day number modulo the brand's
 * switched-on posts, so a retry always sends the same post.
 * ============================================================================ */
import { now } from "../db";
import type { Data } from "../data";
import type { SocialPostDoc } from "../data/schema";
import { readSecure, writeSecure } from "../secure-store";
import { audit } from "../http";
import { adminInbox, mailLayout, sendMail } from "../mail";
import { absoluteUrl } from "../site";
import { ulid } from "../r2/ulid";
import { BRAND_IDS, BRAND_NAMES, getLibraryPost, imagePath, libraryFor, postUrl, type BrandId, type LibraryPost } from "./library";
import { LinkedInError, commentary, createPost, orgUrn, postLink, refreshAccess, uploadImage, type Fetch, type LinkedInToken } from "./client";

export const SECURE_NAME = "linkedin";
/** WIB (Asia/Jakarta) has no daylight saving: always UTC+7. */
export const WIB_OFFSET_MS = 7 * 3_600_000;
export const MAX_ATTEMPTS = 3;
export const RETRY_AFTER_MS = 15 * 60_000;
export const REFRESH_BEFORE_MS = 7 * 86_400_000;
export const DEFAULT_SCOPES = "w_organization_social rw_organization_admin";
export const DEFAULT_VERSION = "202607";

export interface BrandSlot { enabled: boolean; org: string; orgName: string; time: string }
export interface LinkedInSettings {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  scopes: string;
  version: string;
  token: (LinkedInToken & { connectedAt: string; connectedBy: string }) | null;
  brands: Record<BrandId, BrandSlot>;
  /** Library posts switched off in Admin → LinkedIn. */
  disabled: string[];
  remindedOn: string;
  updatedAt: string;
}

export const LINKEDIN_DEFAULTS: LinkedInSettings = {
  enabled: false, clientId: "", clientSecret: "", scopes: DEFAULT_SCOPES, version: DEFAULT_VERSION, token: null,
  brands: { axto: { enabled: true, org: "", orgName: "", time: "09:00" }, xaa: { enabled: true, org: "", orgName: "", time: "13:00" } },
  disabled: [], remindedOn: "", updatedAt: "",
};

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Stored or submitted settings → valid ones (secrets are handled by the caller). */
export function sanitizeLinkedIn(v: any, base: LinkedInSettings = LINKEDIN_DEFAULTS): LinkedInSettings {
  if (!v || typeof v !== "object") return structuredClone(base);
  const brands = {} as Record<BrandId, BrandSlot>;
  for (const b of BRAND_IDS) {
    const x = v.brands?.[b] || {}, d = base.brands[b];
    brands[b] = {
      enabled: typeof x.enabled === "boolean" ? x.enabled : d.enabled,
      org: typeof x.org === "string" ? x.org.replace(/\D/g, "").slice(0, 20) : d.org,
      orgName: typeof x.orgName === "string" ? str(x.orgName, 120) : d.orgName,
      time: TIME_RE.test(String(x.time || "")) ? String(x.time) : d.time,
    };
  }
  const known = new Set(libraryFor("axto").concat(libraryFor("xaa")).map((p) => p.id));
  const t = v.token && typeof v.token === "object" && typeof v.token.access === "string" && v.token.access ? {
    access: v.token.access, expiresAt: str(v.token.expiresAt, 40), refresh: typeof v.token.refresh === "string" ? v.token.refresh : "",
    refreshExpiresAt: str(v.token.refreshExpiresAt, 40), scope: str(v.token.scope, 400), connectedAt: str(v.token.connectedAt, 40), connectedBy: str(v.token.connectedBy, 200),
  } : v.token === null ? null : base.token;
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : base.enabled,
    clientId: typeof v.clientId === "string" ? str(v.clientId, 100).replace(/[^\w-]/g, "") : base.clientId,
    clientSecret: typeof v.clientSecret === "string" ? v.clientSecret.trim().slice(0, 300) : base.clientSecret,
    scopes: typeof v.scopes === "string" && /^[\w\s,]{3,300}$/.test(v.scopes.trim()) ? v.scopes.trim().split(/[\s,]+/).join(" ") : base.scopes,
    version: /^\d{6}$/.test(String(v.version || "")) ? String(v.version) : base.version,
    token: t,
    brands,
    disabled: Array.isArray(v.disabled) ? Array.from(new Set(v.disabled.map(String).filter((id: string) => known.has(id)))) : [...base.disabled],
    remindedOn: str(v.remindedOn, 10) || base.remindedOn,
    updatedAt: str(v.updatedAt, 40) || base.updatedAt,
  };
}

export async function getLinkedIn(opts: { fresh?: boolean } = {}): Promise<LinkedInSettings> {
  return sanitizeLinkedIn(await readSecure<unknown>(undefined, SECURE_NAME, null, opts));
}
export async function saveLinkedIn(s: LinkedInSettings): Promise<void> {
  await writeSecure(undefined, SECURE_NAME, { ...s, updatedAt: now() });
}

/* ---- the schedule ------------------------------------------------------------ */

/** "2026-10-28" — the date in WIB at `ms`. */
export const wibDay = (ms: number) => new Date(ms + WIB_OFFSET_MS).toISOString().slice(0, 10);
/** The moment `HH:MM` WIB happens on `day`. */
export const slotAt = (day: string, time: string) => Date.parse(`${day}T${time}:00Z`) - WIB_OFFSET_MS;
const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

/** The library post a brand sends on `day` (null when every post is switched off). */
export function postOfDay(brand: BrandId, day: string, disabled: string[]): LibraryPost | null {
  const list = libraryFor(brand).filter((p) => !disabled.includes(p.id));
  return list.length ? list[((dayNumber(day) % list.length) + list.length) % list.length] : null;
}

export const runId = (brand: BrandId, day: string) => `li_${brand}_${day.replace(/-/g, "")}`;

/** Why a brand cannot post (null = it can). */
export function brandProblem(s: LinkedInSettings, brand: BrandId, nowMs = Date.now()): string | null {
  if (!s.clientId || !s.clientSecret) return "Add the LinkedIn app's Client ID and Client Secret.";
  if (!s.token?.access) return "Connect LinkedIn (a page administrator signs in once).";
  if (s.token.expiresAt && Date.parse(s.token.expiresAt) <= nowMs) return "The LinkedIn connection has expired — connect again.";
  if (!s.brands[brand].org) return `Choose the LinkedIn page for ${BRAND_NAMES[brand]}.`;
  return null;
}

/* ---- publishing --------------------------------------------------------------- */

/** Where the settings live: the encrypted R2 document in production, a plain object in the tests. */
export interface SettingsStore { get(fresh?: boolean): Promise<LinkedInSettings>; save(s: LinkedInSettings): Promise<void> }
export const secureSettings: SettingsStore = { get: (fresh) => getLinkedIn({ fresh }), save: saveLinkedIn };
export interface Deps { fetch: Fetch; origin: string; settings?: SettingsStore }

/** Upload the post's image (when the site serves it) and publish it on the brand's page. */
export async function publish(s: LinkedInSettings, brand: BrandId, post: LibraryPost, deps: Deps): Promise<{ urn: string; url: string }> {
  const token = s.token!.access, version = s.version, author = orgUrn(s.brands[brand].org);
  let image = "";
  const img = await deps.fetch(new URL(imagePath(post), deps.origin).toString()).catch(() => null);
  if (img && img.ok && (img.headers.get("content-type") || "").startsWith("image/")) {
    image = await uploadImage(deps.fetch, token, version, author, await img.arrayBuffer());
  }
  const urn = await createPost(deps.fetch, token, version, { author, text: commentary(post.text, postUrl(post), post.hashtags), image, altText: post.image.eyebrow ? `${BRAND_NAMES[brand]} — ${post.image.eyebrow}` : "" });
  return { urn, url: postLink(urn) };
}

const system = { sub: "system", email: "system" };
/** An e-mail to the admin; a mail problem never stops the poster. */
async function notify(subject: string, title: string, body: string) {
  try {
    await sendMail(await adminInbox(), subject, mailLayout(title, body, { label: "Open Admin → LinkedIn", href: absoluteUrl("/admin/linkedin") }));
  } catch { /* logged in the run record already */ }
}
const failure = (e: unknown) => e instanceof LinkedInError
  ? { error: e.message.slice(0, 500), definite: e.definite ? 1 : 0 }
  : { error: String((e as any)?.message || e).slice(0, 500), definite: 0 };

/** Post one library item now, by hand (Admin → LinkedIn → Post now); recorded in the log like a daily post. */
export async function postNow(db: Data, s: LinkedInSettings, brand: BrandId, postId: string, by: { sub: string; email: string }, deps: Deps): Promise<SocialPostDoc> {
  const post = getLibraryPost(postId);
  if (!post || post.brand !== brand) throw new Error("Unknown post for this brand.");
  const problem = brandProblem(s, brand);
  if (problem) throw new Error(problem);
  const at = now();
  const doc: SocialPostDoc = {
    id: `li_${brand}_m_${ulid()}`, network: "linkedin", brand, day: wibDay(Date.now()), kind: "manual", post_id: post.id, org: s.brands[brand].org,
    status: "posting", attempts: 1, definite: 1, urn: "", url: "", error: "", claim: crypto.randomUUID(), by: by.email, created_at: at, updated_at: at,
  };
  await db.socialPosts.create(doc);
  try {
    const r = await publish(s, brand, post, deps);
    const done = await db.socialPosts.update(doc.id, (c) => ({ ...c, status: "posted", urn: r.urn, url: r.url, updated_at: now() }));
    await audit(db, by, "admin.linkedin.post_now", "social_post", doc.id, { brand, post: post.id, urn: r.urn });
    return done;
  } catch (e) {
    const f = failure(e);
    return db.socialPosts.update(doc.id, (c) => ({ ...c, status: "failed", ...f, updated_at: now() }));
  }
}

/** The daily posts whose time has come: at most one per brand per day. */
export async function linkedinTick(db: Data, deps: Deps, nowMs = Date.now()): Promise<Record<string, string>> {
  const s = await (deps.settings || secureSettings).get();
  if (!s.enabled) return { skipped: "disabled" };
  const day = wibDay(nowMs);
  const out: Record<string, string> = {};
  for (const brand of BRAND_IDS) {
    const slot = s.brands[brand];
    if (!slot.enabled) { out[brand] = "off"; continue; }
    if (nowMs < slotAt(day, slot.time)) { out[brand] = "later"; continue; }
    const problem = brandProblem(s, brand, nowMs);
    if (problem) { out[brand] = "not_ready"; continue; }
    const post = postOfDay(brand, day, s.disabled);
    if (!post) { out[brand] = "no_posts"; continue; }
    const id = runId(brand, day);
    const at = new Date(nowMs).toISOString();
    let go = false;
    const cur = await db.socialPosts.get(id);
    if (!cur) {
      go = await db.socialPosts.createIfAbsent({
        id, network: "linkedin", brand, day, kind: "daily", post_id: post.id, org: slot.org,
        status: "posting", attempts: 1, definite: 1, urn: "", url: "", error: "", claim: crypto.randomUUID(), by: "system", created_at: at, updated_at: at,
      });
    } else if (cur.status === "failed" && cur.definite && cur.attempts < MAX_ATTEMPTS && nowMs - Date.parse(cur.updated_at) >= RETRY_AFTER_MS) {
      // Claimed by compare-and-swap: only one tick takes the retry.
      await db.socialPosts.update(id, (c) => {
        go = c.status === "failed" && !!c.definite && c.attempts < MAX_ATTEMPTS && nowMs - Date.parse(c.updated_at) >= RETRY_AFTER_MS;
        return go ? { ...c, status: "posting", attempts: c.attempts + 1, error: "", updated_at: at } : null;
      });
    }
    if (!go) { out[brand] = cur?.status || "taken"; continue; }
    try {
      const r = await publish(s, brand, post, deps);
      await db.socialPosts.update(id, (c) => ({ ...c, status: "posted", urn: r.urn, url: r.url, updated_at: at }));
      await audit(db, system, "linkedin.posted", "social_post", id, { brand, post: post.id, urn: r.urn });
      out[brand] = "posted";
    } catch (e) {
      const f = failure(e);
      // The tick's own clock: the retry window is measured from the attempt.
      const after = await db.socialPosts.update(id, (c) => ({ ...c, status: "failed", ...f, updated_at: at }));
      out[brand] = "failed";
      if (!f.definite || after.attempts >= MAX_ATTEMPTS) {
        await notify(`LinkedIn post failed — ${BRAND_NAMES[brand]}`, "LinkedIn post failed",
          `<p>Today's ${BRAND_NAMES[brand]} post (<b>${post.id}</b>) was not published${f.definite ? ` after ${after.attempts} attempts` : " — LinkedIn did not answer, so it may or may not be on the page; check before posting it again"}.</p><p>${f.error.replace(/[<>&]/g, "")}</p>`);
      }
    }
  }
  return out;
}

/** Hourly: keep the connection alive — refresh the token before it ends, or ask the admin (once a day) to reconnect. */
export async function linkedinMaintenance(db: Data, deps: Pick<Deps, "fetch" | "settings">, nowMs = Date.now()): Promise<string> {
  const store = deps.settings || secureSettings;
  const s = await store.get(true);
  const t = s.token;
  if (!t?.access || !t.expiresAt) return "not_connected";
  const left = Date.parse(t.expiresAt) - nowMs;
  if (left > REFRESH_BEFORE_MS) return "ok";
  if (t.refresh && (!t.refreshExpiresAt || Date.parse(t.refreshExpiresAt) > nowMs)) {
    try {
      const n = await refreshAccess(deps.fetch, { clientId: s.clientId, clientSecret: s.clientSecret, refresh: t.refresh, refreshExpiresAt: t.refreshExpiresAt }, nowMs);
      await store.save({ ...s, token: { ...t, ...n } });
      await audit(db, system, "linkedin.token_refreshed", "settings", SECURE_NAME, { expiresAt: n.expiresAt });
      return "refreshed";
    } catch { /* fall through to the reminder */ }
  }
  const today = wibDay(nowMs);
  if (s.remindedOn === today) return "reminded";
  await store.save({ ...s, remindedOn: today });
  await notify("Reconnect LinkedIn for the daily posts", "Reconnect LinkedIn",
    `<p>The LinkedIn connection used for the daily axto.io and xaa.es posts ${left > 0 ? `ends on <b>${t.expiresAt.slice(0, 10)}</b>` : "<b>has ended</b>"}. A page administrator signs in again in one click.</p>`);
  return "reminded";
}
