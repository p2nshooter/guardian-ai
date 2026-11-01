/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * LINKEDIN — the calls the auto-poster makes (docs/BLUEPRINT-V4.md §35).
 *
 *   OAuth 2.0 (3-legged)   www.linkedin.com/oauth/v2/authorization · /accessToken
 *   pages the admin runs   GET  /rest/organizationAcls?q=roleAssignee
 *   image                  POST /rest/images?action=initializeUpload → PUT bytes
 *   post                   POST /rest/posts (author = urn:li:organization:<id>)
 *
 * Every /rest call carries LinkedIn-Version (YYYYMM, set in Admin → LinkedIn)
 * and X-Restli-Protocol-Version 2.0.0. `fetch` is passed in, so the tests run
 * the whole flow against a fake LinkedIn.
 *
 * Post text uses LinkedIn's "little text format": the reserved characters
 * | { } @ [ ] ( ) < > # \ * _ ~ are escaped (an unescaped one can cut the post
 * short), and hashtags are written as the {hashtag|\#|Tag} template.
 * ============================================================================ */

export const LI_AUTHORIZE = "https://www.linkedin.com/oauth/v2/authorization";
export const LI_TOKEN = "https://www.linkedin.com/oauth/v2/accessToken";
export const LI_REST = "https://api.linkedin.com/rest";

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Why a call failed. `definite` = LinkedIn certainly did not publish anything (safe to try again). */
export class LinkedInError extends Error {
  constructor(message: string, readonly stage: "token" | "orgs" | "image" | "post", readonly status = 0, readonly definite = true) {
    super(message);
    this.name = "LinkedInError";
  }
}

/* ---- text ------------------------------------------------------------------ */

export const escapeLittleText = (s: string) => String(s ?? "").replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`);
/** A hashtag as LinkedIn's template; the tag keeps letters and digits only. */
export const hashtag = (tag: string) => {
  const t = String(tag ?? "").replace(/^#/, "").replace(/[^\p{L}\p{N}]/gu, "");
  return t ? `{hashtag|\\#|${t}}` : "";
};
/** The commentary of a post: the text, the link, then the hashtags. */
export function commentary(text: string, link: string, tags: string[]): string {
  const body = escapeLittleText(String(text || "").trim());
  const url = link ? `\n\n${escapeLittleText(link)}` : "";
  const hs = tags.map(hashtag).filter(Boolean).join(" ");
  return `${body}${url}${hs ? `\n\n${hs}` : ""}`.slice(0, 2900);
}
/** The same text as people will read it (the admin's preview). */
export function plainCommentary(text: string, link: string, tags: string[]): string {
  const hs = tags.map((t) => `#${String(t).replace(/^#/, "").replace(/[^\p{L}\p{N}]/gu, "")}`).filter((t) => t.length > 1).join(" ");
  return `${String(text || "").trim()}${link ? `\n\n${link}` : ""}${hs ? `\n\n${hs}` : ""}`;
}

/* ---- OAuth ------------------------------------------------------------------ */

export function authorizeUrl(o: { clientId: string; redirectUri: string; state: string; scopes: string }): string {
  const q = new URLSearchParams({ response_type: "code", client_id: o.clientId, redirect_uri: o.redirectUri, state: o.state, scope: o.scopes.trim().split(/[\s,]+/).filter(Boolean).join(" ") });
  return `${LI_AUTHORIZE}?${q}`;
}

export interface LinkedInToken { access: string; expiresAt: string; refresh: string; refreshExpiresAt: string; scope: string }

async function tokenCall(f: Fetch, body: Record<string, string>, nowMs: number): Promise<LinkedInToken> {
  const res = await f(LI_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body).toString() });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) throw new LinkedInError(`LinkedIn refused the token request: ${j.error_description || j.error || res.status}`, "token", res.status);
  const at = (s: unknown) => (Number(s) > 0 ? new Date(nowMs + Number(s) * 1000).toISOString() : "");
  return { access: String(j.access_token), expiresAt: at(j.expires_in), refresh: String(j.refresh_token || ""), refreshExpiresAt: at(j.refresh_token_expires_in), scope: String(j.scope || "") };
}

export const exchangeCode = (f: Fetch, o: { clientId: string; clientSecret: string; code: string; redirectUri: string }, nowMs = Date.now()) =>
  tokenCall(f, { grant_type: "authorization_code", code: o.code, redirect_uri: o.redirectUri, client_id: o.clientId, client_secret: o.clientSecret }, nowMs);

/** LinkedIn gives refresh tokens only to some apps; a refresh keeps the refresh token's own expiry. */
export async function refreshAccess(f: Fetch, o: { clientId: string; clientSecret: string; refresh: string; refreshExpiresAt: string }, nowMs = Date.now()): Promise<LinkedInToken> {
  const t = await tokenCall(f, { grant_type: "refresh_token", refresh_token: o.refresh, client_id: o.clientId, client_secret: o.clientSecret }, nowMs);
  return { ...t, refresh: t.refresh || o.refresh, refreshExpiresAt: t.refreshExpiresAt || o.refreshExpiresAt };
}

/* ---- REST ------------------------------------------------------------------ */

const rest = (token: string, version: string, json = true): Record<string, string> => ({
  Authorization: `Bearer ${token}`, "LinkedIn-Version": version, "X-Restli-Protocol-Version": "2.0.0", ...(json ? { "Content-Type": "application/json" } : {}),
});
const why = async (res: Response) => {
  const j: any = await res.json().catch(() => null);
  return j?.message || j?.error_description || j?.code || `HTTP ${res.status}`;
};

export const orgUrn = (id: string) => `urn:li:organization:${String(id).replace(/\D/g, "")}`;
export const postLink = (urn: string) => (urn ? `https://www.linkedin.com/feed/update/${urn}/` : "");

/** The company pages this member administers: id and name. */
export async function adminOrganizations(f: Fetch, token: string, version: string): Promise<{ id: string; name: string }[]> {
  const res = await f(`${LI_REST}/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=50`, { headers: rest(token, version, false) });
  if (!res.ok) throw new LinkedInError(`LinkedIn did not list your pages: ${await why(res)}`, "orgs", res.status);
  const j: any = await res.json();
  const ids = Array.from(new Set<string>((j.elements || []).map((e: any) => String(e.organization || e.organizationTarget || "").split(":").pop() || "").filter(Boolean)));
  const out: { id: string; name: string }[] = [];
  for (const id of ids.slice(0, 20)) {
    const r = await f(`${LI_REST}/organizations/${id}`, { headers: rest(token, version, false) }).catch(() => null);
    const o: any = r && r.ok ? await r.json().catch(() => ({})) : {};
    out.push({ id, name: String(o.localizedName || o.vanityName || `Organization ${id}`) });
  }
  return out;
}

/** Upload one image for the page and return its urn:li:image. */
export async function uploadImage(f: Fetch, token: string, version: string, owner: string, bytes: ArrayBuffer): Promise<string> {
  const init = await f(`${LI_REST}/images?action=initializeUpload`, { method: "POST", headers: rest(token, version), body: JSON.stringify({ initializeUploadRequest: { owner } }) });
  if (!init.ok) throw new LinkedInError(`LinkedIn refused the image upload: ${await why(init)}`, "image", init.status);
  const v: any = (await init.json())?.value || {};
  if (!v.uploadUrl || !v.image) throw new LinkedInError("LinkedIn returned no upload address for the image.", "image");
  const put = await f(String(v.uploadUrl), { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" }, body: bytes });
  if (!put.ok) throw new LinkedInError(`The image upload failed: HTTP ${put.status}`, "image", put.status);
  return String(v.image);
}

/**
 * Publish the post. A refusal from LinkedIn (an HTTP answer that is not 201) means nothing was posted;
 * a network failure after the request left is reported as not definite, so it is never retried blindly.
 */
export async function createPost(f: Fetch, token: string, version: string, o: { author: string; text: string; image?: string; altText?: string }): Promise<string> {
  const body = {
    author: o.author, commentary: o.text, visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    ...(o.image ? { content: { media: { id: o.image, ...(o.altText ? { altText: o.altText.slice(0, 300) } : {}) } } } : {}),
    lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false,
  };
  let res: Response;
  try {
    res = await f(`${LI_REST}/posts`, { method: "POST", headers: rest(token, version), body: JSON.stringify(body) });
  } catch (e: any) {
    throw new LinkedInError(`No answer from LinkedIn while posting (${String(e?.message || e).slice(0, 120)}) — check the page before posting again.`, "post", 0, false);
  }
  if (res.status !== 201 && !res.ok) throw new LinkedInError(`LinkedIn refused the post: ${await why(res)}`, "post", res.status, res.status < 500);
  return res.headers.get("x-restli-id") || res.headers.get("x-linkedin-id") || "";
}
