/* AXTO — LinkedIn auto-post (docs/BLUEPRINT-V4.md §35, REQUESTS 123): the
 * little-text escaping and hashtags, the promotion library (28 posts per brand,
 * an image for each), the WIB schedule and rotation, and the whole daily flow
 * against a fake LinkedIn: image upload, post, one post per brand per day even
 * when ticks overlap, retries only when LinkedIn certainly refused, token refresh
 * and the reconnect reminder. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { testData } from "./helpers/data";
import { BRAND_IDS, LIBRARY, imagePath, libraryFor, postUrl } from "../lib/linkedin/library";
import { authorizeUrl, commentary, escapeLittleText, hashtag, plainCommentary, LI_REST } from "../lib/linkedin/client";
import {
  LINKEDIN_DEFAULTS, MAX_ATTEMPTS, RETRY_AFTER_MS, linkedinMaintenance, linkedinTick, postOfDay, runId, sanitizeLinkedIn, slotAt, wibDay,
  type LinkedInSettings, type SettingsStore,
} from "../lib/linkedin/autopost";

const PUBLIC = path.resolve(import.meta.dirname, "../public");

test("little text: reserved characters escaped once, hashtags as templates", () => {
  assert.equal(escapeLittleText("Save 10% (today) — #1 @team [x] <y> a_b *c* ~d~ {e} |f| \\g"),
    "Save 10% \\(today\\) — \\#1 \\@team \\[x\\] \\<y\\> a\\_b \\*c\\* \\~d\\~ \\{e\\} \\|f\\| \\\\g");
  assert.equal(hashtag("#AI_Ops!"), "{hashtag|\\#|AIOps}");
  assert.equal(hashtag("  "), "");
  const c = commentary("Hello (world)", "https://axto.io/self-hosted", ["SelfHosted", "AI"]);
  assert.equal(c, "Hello \\(world\\)\n\nhttps://axto.io/self-hosted\n\n{hashtag|\\#|SelfHosted} {hashtag|\\#|AI}");
  assert.equal(plainCommentary("Hello (world)", "https://axto.io", ["SelfHosted"]), "Hello (world)\n\nhttps://axto.io\n\n#SelfHosted");
  const u = new URL(authorizeUrl({ clientId: "abc", redirectUri: "https://axto.io/api/admin/linkedin/callback", state: "s1", scopes: "w_organization_social, rw_organization_admin" }));
  assert.equal(u.origin + u.pathname, "https://www.linkedin.com/oauth/v2/authorization");
  assert.equal(u.searchParams.get("scope"), "w_organization_social rw_organization_admin");
  assert.equal(u.searchParams.get("response_type"), "code");
});

test("library: 28 posts per brand, unique ids, an image for each, 3–5 clean hashtags, within LinkedIn's length", () => {
  const ids = new Set<string>();
  for (const b of BRAND_IDS) {
    const list = libraryFor(b);
    assert.equal(list.length, 28, `${b} has four weeks of posts`);
    for (const p of list) {
      assert.ok(!ids.has(p.id), `duplicate ${p.id}`); ids.add(p.id);
      assert.ok(p.id.startsWith(`${b}-`), p.id);
      assert.ok(p.path.startsWith("/"), p.id);
      assert.ok(p.hashtags.length >= 3 && p.hashtags.length <= 5, `${p.id} hashtags`);
      for (const h of p.hashtags) assert.match(h, /^[A-Za-z0-9]+$/, `${p.id} hashtag ${h}`);
      assert.ok(p.text.length > 80, `${p.id} text`);
      assert.ok(!/#\w/.test(p.text), `${p.id}: hashtags belong in the hashtags list`);
      assert.ok(commentary(p.text, postUrl(p), p.hashtags).length < 2900, `${p.id} too long`);
      const img = path.join(PUBLIC, imagePath(p));
      assert.ok(fs.existsSync(img) && fs.statSync(img).size > 20_000, `${p.id}: image missing — run the library build`);
    }
  }
  // No image left behind for a post that is no longer in the library.
  for (const b of BRAND_IDS) for (const f of fs.readdirSync(path.join(PUBLIC, "social/linkedin", b))) assert.ok(ids.has(f.replace(/\.jpg$/, "")), `stray image ${b}/${f}`);
  assert.equal(postUrl(LIBRARY.find((p) => p.path === "/")!), LIBRARY.find((p) => p.path === "/")!.brand === "axto" ? "https://axto.io" : "https://xaa.es");
});

test("schedule: WIB days and times; one post per day, 28 days without a repeat, switched-off posts skipped", () => {
  assert.equal(wibDay(Date.parse("2026-10-28T16:59:59Z")), "2026-10-28");
  assert.equal(wibDay(Date.parse("2026-10-28T17:00:00Z")), "2026-10-29", "midnight WIB = 17:00 UTC");
  assert.equal(new Date(slotAt("2026-10-29", "09:00")).toISOString(), "2026-10-29T02:00:00.000Z");
  assert.equal(runId("axto", "2026-10-29"), "li_axto_20261029");
  for (const b of BRAND_IDS) {
    const seen = new Set<string>();
    for (let i = 0; i < 28; i++) seen.add(postOfDay(b, wibDay(Date.parse("2026-11-01T05:00:00Z") + i * 86_400_000), [])!.id);
    assert.equal(seen.size, 28, `${b}: every post once in four weeks`);
  }
  const day = "2026-11-03";
  const first = postOfDay("xaa", day, [])!;
  assert.notEqual(postOfDay("xaa", day, [first.id])!.id, first.id);
  assert.equal(postOfDay("xaa", day, libraryFor("xaa").map((p) => p.id)), null);
});

test("settings: only valid values are kept", () => {
  const s = sanitizeLinkedIn({ brands: { axto: { time: "25:00", org: "urn:li:organization:123" }, xaa: { time: "07:30", enabled: false } }, version: "2026-07", disabled: ["axto-01-ten-apps", "nope"], scopes: "w_organization_social;drop" });
  assert.equal(s.brands.axto.time, "09:00");
  assert.equal(s.brands.axto.org, "123");
  assert.deepEqual(s.brands.xaa, { enabled: false, org: "", orgName: "", time: "07:30" });
  assert.equal(s.version, LINKEDIN_DEFAULTS.version);
  assert.deepEqual(s.disabled, ["axto-01-ten-apps"]);
  assert.equal(s.scopes, LINKEDIN_DEFAULTS.scopes);
  assert.equal(s.enabled, false);
  assert.equal(s.token, null);
});

/* ---- the daily flow against a fake LinkedIn -------------------------------------- */

const ORIGIN = "https://axto.test";
function fakeLinkedIn(opts: { postStatus?: number; postThrows?: boolean; token?: Record<string, unknown> } = {}) {
  const calls: { url: string; method: string; headers: Record<string, string>; body: any }[] = [];
  let n = 0;
  const f = async (input: string, init: RequestInit = {}) => {
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const body = typeof init.body === "string" ? (headers["content-type"]?.includes("json") ? JSON.parse(init.body) : init.body) : init.body;
    calls.push({ url: input, method: init.method || "GET", headers, body });
    if (input.startsWith(ORIGIN)) {
      const file = path.join(PUBLIC, new URL(input).pathname);
      return fs.existsSync(file) ? new Response(fs.readFileSync(file), { headers: { "content-type": "image/jpeg" } }) : new Response("no", { status: 404 });
    }
    if (input === `${LI_REST}/images?action=initializeUpload`) return Response.json({ value: { uploadUrl: "https://upload.test/put/1", image: `urn:li:image:IMG${++n}` } });
    if (input.startsWith("https://upload.test/")) return new Response(null, { status: 201 });
    if (input === `${LI_REST}/posts`) {
      if (opts.postThrows) throw new Error("socket hang up");
      if (opts.postStatus && opts.postStatus !== 201) return Response.json({ message: "Not enough permissions" }, { status: opts.postStatus });
      return new Response(null, { status: 201, headers: { "x-restli-id": `urn:li:share:${7000 + n}` } });
    }
    if (input === "https://www.linkedin.com/oauth/v2/accessToken") return Response.json(opts.token || { access_token: "NEW", expires_in: 5_184_000 });
    return new Response("unexpected", { status: 500 });
  };
  return { f, calls, posts: () => calls.filter((c) => c.url === `${LI_REST}/posts`) };
}

function memorySettings(over: Partial<LinkedInSettings> = {}): SettingsStore & { cur: LinkedInSettings; saves: number } {
  const st = {
    cur: sanitizeLinkedIn({
      ...LINKEDIN_DEFAULTS, enabled: true, clientId: "cid", clientSecret: "secret",
      token: { access: "TOKEN", expiresAt: "2027-01-01T00:00:00Z", refresh: "", refreshExpiresAt: "", scope: "w_organization_social", connectedAt: "", connectedBy: "admin@axto.io" },
      brands: { axto: { enabled: true, org: "111", orgName: "axto.io", time: "09:00" }, xaa: { enabled: true, org: "222", orgName: "xaa.es", time: "13:00" } },
      ...over,
    }),
    saves: 0,
    async get() { return st.cur; },
    async save(s: LinkedInSettings) { st.cur = s; st.saves += 1; },
  };
  return st;
}

const DAY = "2026-11-02";
const at = (hhmm: string) => slotAt(DAY, hhmm);

test("daily flow: nothing before the time; then image + post on the brand's page, recorded once", async () => {
  const { db } = testData();
  const li = fakeLinkedIn();
  const settings = memorySettings();
  const deps = { fetch: li.f as any, origin: ORIGIN, settings };

  assert.deepEqual(await linkedinTick(db, deps, at("08:59")), { axto: "later", xaa: "later" });
  assert.equal(li.calls.length, 0);

  const r = await linkedinTick(db, deps, at("09:00"));
  assert.deepEqual(r, { axto: "posted", xaa: "later" });
  const post = postOfDay("axto", DAY, [])!;
  assert.equal(li.calls[0].url, `${ORIGIN}${imagePath(post)}`, "the image comes from the site itself");
  const init = li.calls.find((c) => c.url.endsWith("initializeUpload"))!;
  assert.deepEqual(init.body, { initializeUploadRequest: { owner: "urn:li:organization:111" } });
  assert.equal(init.headers["linkedin-version"], LINKEDIN_DEFAULTS.version);
  assert.equal(init.headers["x-restli-protocol-version"], "2.0.0");
  assert.equal(init.headers.authorization, "Bearer TOKEN");
  const put = li.calls.find((c) => c.url.startsWith("https://upload.test/"))!;
  assert.equal(put.method, "PUT");
  assert.ok((put.body as ArrayBuffer).byteLength > 20_000, "the JPEG bytes are uploaded");
  const p = li.posts()[0];
  assert.equal(p.body.author, "urn:li:organization:111");
  assert.equal(p.body.visibility, "PUBLIC");
  assert.equal(p.body.lifecycleState, "PUBLISHED");
  assert.equal(p.body.content.media.id, "urn:li:image:IMG1");
  assert.equal(p.body.commentary, commentary(post.text, postUrl(post), post.hashtags));
  assert.match(p.body.commentary, /\{hashtag\|\\#\|\w+\}/);

  const run = (await db.socialPosts.get(runId("axto", DAY)))!;
  assert.equal(run.status, "posted");
  assert.equal(run.urn, "urn:li:share:7001");
  assert.equal(run.url, "https://www.linkedin.com/feed/update/urn:li:share:7001/");
  assert.equal(run.post_id, post.id);

  // Later ticks the same day post nothing more for axto.io; xaa.es posts at 13:00 on its own page.
  assert.deepEqual(await linkedinTick(db, deps, at("12:00")), { axto: "posted", xaa: "later" });
  assert.deepEqual(await linkedinTick(db, deps, at("13:05")), { axto: "posted", xaa: "posted" });
  assert.equal(li.posts().length, 2);
  assert.equal(li.posts()[1].body.author, "urn:li:organization:222");
  const log = (await db.socialPosts.list("all", "all")).entries;
  assert.equal(log.length, 2);
  assert.equal(log[0].meta.brand, "xaa", "newest first");
});

test("overlapping ticks post once", async () => {
  const { db } = testData();
  const li = fakeLinkedIn();
  const deps = { fetch: li.f as any, origin: ORIGIN, settings: memorySettings() };
  await Promise.all([1, 2, 3, 4].map(() => linkedinTick(db, deps, at("13:30"))));
  assert.equal(li.posts().length, 2, "one for each brand, never more");
});

test("not ready, off, or every post switched off: nothing is sent", async () => {
  const { db } = testData();
  const li = fakeLinkedIn();
  assert.deepEqual(await linkedinTick(db, { fetch: li.f as any, origin: ORIGIN, settings: memorySettings({ enabled: false }) }, at("14:00")), { skipped: "disabled" });
  const noOrg = memorySettings();
  noOrg.cur.brands.xaa.org = "";
  noOrg.cur.brands.axto.enabled = false;
  assert.deepEqual(await linkedinTick(db, { fetch: li.f as any, origin: ORIGIN, settings: noOrg }, at("14:00")), { axto: "off", xaa: "not_ready" });
  const expired = memorySettings();
  expired.cur.token!.expiresAt = "2026-11-01T00:00:00Z";
  assert.deepEqual(await linkedinTick(db, { fetch: li.f as any, origin: ORIGIN, settings: expired }, at("14:00")), { axto: "not_ready", xaa: "not_ready" });
  const none = memorySettings({ disabled: libraryFor("axto").map((p) => p.id) });
  none.cur.brands.xaa.enabled = false;
  assert.deepEqual(await linkedinTick(db, { fetch: li.f as any, origin: ORIGIN, settings: none }, at("14:00")), { axto: "no_posts", xaa: "off" });
  assert.equal(li.calls.length, 0);
});

test("a refused post is tried again 15 minutes later, at most 3 times; an unanswered one never", async () => {
  const { db } = testData();
  const refused = fakeLinkedIn({ postStatus: 403 });
  const settings = memorySettings();
  settings.cur.brands.xaa.enabled = false;
  const deps = { fetch: refused.f as any, origin: ORIGIN, settings };
  const t0 = at("09:00");
  assert.equal((await linkedinTick(db, deps, t0)).axto, "failed");
  let run = (await db.socialPosts.get(runId("axto", DAY)))!;
  assert.equal(run.status, "failed");
  assert.equal(run.definite, 1);
  assert.match(run.error, /Not enough permissions/);
  // The record's update time is the real clock: move the tick clock past it for the retry window.
  const later = (ms: number) => Date.parse(run.updated_at) + ms;
  assert.equal((await linkedinTick(db, deps, later(RETRY_AFTER_MS - 60_000))).axto, "failed", "too soon");
  assert.equal(refused.posts().length, 1);
  for (let i = 2; i <= MAX_ATTEMPTS; i++) {
    await linkedinTick(db, deps, later(RETRY_AFTER_MS));
    run = (await db.socialPosts.get(runId("axto", DAY)))!;
    assert.equal(run.attempts, i);
  }
  await linkedinTick(db, deps, later(10 * RETRY_AFTER_MS));
  assert.equal(refused.posts().length, MAX_ATTEMPTS, "never more than 3 attempts");

  const { db: db2 } = testData();
  const silent = fakeLinkedIn({ postThrows: true });
  const deps2 = { fetch: silent.f as any, origin: ORIGIN, settings };
  await linkedinTick(db2, deps2, t0);
  const r2 = (await db2.socialPosts.get(runId("axto", DAY)))!;
  assert.equal(r2.status, "failed");
  assert.equal(r2.definite, 0);
  await linkedinTick(db2, deps2, Date.parse(r2.updated_at) + 2 * RETRY_AFTER_MS);
  assert.equal(silent.posts().length, 1, "it may be on the page already: no blind repost");
});

test("token: refreshed 7 days before it ends when LinkedIn gave a refresh token; otherwise one reminder a day", async () => {
  const { db } = testData();
  const nowMs = Date.parse("2026-12-26T00:00:00Z");
  const withRefresh = memorySettings();
  withRefresh.cur.token = { ...withRefresh.cur.token!, expiresAt: "2026-12-30T00:00:00Z", refresh: "R1", refreshExpiresAt: "2027-10-01T00:00:00Z" };
  const li = fakeLinkedIn({ token: { access_token: "FRESH", expires_in: 5_184_000 } });
  assert.equal(await linkedinMaintenance(db, { fetch: li.f as any, settings: withRefresh }, nowMs), "refreshed");
  assert.equal(withRefresh.cur.token!.access, "FRESH");
  assert.equal(withRefresh.cur.token!.refresh, "R1", "the refresh token is kept");
  assert.equal(withRefresh.cur.token!.expiresAt, new Date(nowMs + 5_184_000_000).toISOString());
  const call = li.calls.find((c) => c.url.endsWith("/accessToken"))!;
  assert.match(String(call.body), /grant_type=refresh_token/);
  assert.equal(await linkedinMaintenance(db, { fetch: li.f as any, settings: withRefresh }, nowMs), "ok");

  const noRefresh = memorySettings();
  noRefresh.cur.token = { ...noRefresh.cur.token!, expiresAt: "2026-12-30T00:00:00Z" };
  assert.equal(await linkedinMaintenance(db, { fetch: li.f as any, settings: noRefresh }, nowMs), "reminded");
  assert.equal(noRefresh.cur.remindedOn, "2026-12-26");
  const saves = noRefresh.saves;
  assert.equal(await linkedinMaintenance(db, { fetch: li.f as any, settings: noRefresh }, nowMs + 3_600_000), "reminded");
  assert.equal(noRefresh.saves, saves, "one reminder a day");
});
