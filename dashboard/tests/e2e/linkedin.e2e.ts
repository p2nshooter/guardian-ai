/* ==============================================================================
 * AXTO — Admin → LinkedIn auto-post on the LOCAL runtime (BLUEPRINT-V4 §35):
 *   admins only; the app secret is stored encrypted and only ever returned
 *   masked; daily posting cannot be switched on before LinkedIn is connected;
 *   Connect hands out LinkedIn's sign-in URL with a state cookie; the callback
 *   refuses a wrong state; the library images are served; the cron tick reports
 *   the poster. (Posting itself runs against a fake LinkedIn in tests/linkedin.test.ts:
 *   linkedin.com is not reachable from CI.)
 * ============================================================================ */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);
const SECRET = `WPL_E2E.${RUN}.not-a-real-secret==`;

async function call(method: string, p: string, o: { cookie?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const res = await fetch(BASE + p, {
    method, redirect: "manual", signal: AbortSignal.timeout(60_000),
    headers: { ...(o.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(o.cookie ? { Cookie: o.cookie } : {}), ...(o.headers || {}) },
    body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, headers: res.headers };
}

let admin = "";
before(async () => { admin = await adminCookie(); });

test("admins only", async () => {
  assert.equal((await call("GET", "/api/admin/linkedin")).status, 403);
  assert.equal((await call("PUT", "/api/admin/linkedin", { body: { settings: { enabled: true } } })).status, 403);
  assert.equal((await call("POST", "/api/admin/linkedin", { body: { action: "connect" } })).status, 403);
  const cb = await call("GET", "/api/admin/linkedin/callback?code=x&state=y");
  assert.equal(cb.status, 307, cb.text);
  assert.match(cb.headers.get("location") || "", /\/login\?redirect=%2Fadmin%2Flinkedin/);
});

test("the library: 56 posts with previews and served images", async () => {
  const g = await call("GET", "/api/admin/linkedin", { cookie: admin });
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.library.length, 56);
  assert.equal(g.json.library.filter((p: any) => p.brand === "axto").length, 28);
  assert.match(g.json.redirectUri, /\/api\/admin\/linkedin\/callback$/);
  assert.equal(g.json.schedule.length, 2);
  const p = g.json.library[0];
  assert.match(p.preview, /#\w+/, "the preview shows the hashtags");
  const img = await fetch(BASE + p.image);
  assert.equal(img.status, 200);
  assert.match(img.headers.get("content-type") || "", /image\/jpeg/);
  assert.ok((await img.arrayBuffer()).byteLength > 20_000);
});

test("app credentials: the secret is stored, never returned; posting stays off until LinkedIn is connected", async () => {
  const put = await call("PUT", "/api/admin/linkedin", { cookie: admin, body: { settings: { clientId: "e2eclient01", clientSecret: SECRET, enabled: false, brands: { axto: { enabled: true, org: "1001", time: "09:00" }, xaa: { enabled: true, org: "1002", time: "13:00" } } } } });
  assert.equal(put.status, 200, put.text);
  const g = await call("GET", "/api/admin/linkedin", { cookie: admin });
  assert.ok(!g.text.includes(SECRET), "the secret never leaves the server");
  assert.equal(g.json.settings.hasSecret, true);
  assert.ok(g.json.settings.clientSecret.startsWith("••••"));
  assert.equal(g.json.settings.clientId, "e2eclient01");
  assert.equal(g.json.settings.brands.axto.org, "1001");
  assert.equal(g.json.settings.token, null);
  assert.match(g.json.schedule[0].problem, /Connect LinkedIn/);

  // The masked value sent back keeps the stored secret.
  const again = await call("PUT", "/api/admin/linkedin", { cookie: admin, body: { settings: { ...g.json.settings, clientSecret: g.json.settings.clientSecret } } });
  assert.equal(again.status, 200, again.text);
  assert.equal(again.json.settings.hasSecret, true);

  const on = await call("PUT", "/api/admin/linkedin", { cookie: admin, body: { settings: { ...g.json.settings, enabled: true } } });
  assert.equal(on.status, 400);
  assert.match(on.json.error, /cannot be switched on yet: Connect LinkedIn/);
  const now = await call("POST", "/api/admin/linkedin", { cookie: admin, body: { action: "post_now", brand: "axto", postId: "axto-01-ten-apps" } });
  assert.equal(now.status, 400);
  assert.match(now.json.error, /Connect LinkedIn/);
  assert.equal((await call("POST", "/api/admin/linkedin", { cookie: admin, body: { action: "orgs" } })).status, 400);
});

test("connect: LinkedIn's sign-in URL with a state cookie; the callback refuses a state that does not match", async () => {
  const c = await call("POST", "/api/admin/linkedin", { cookie: admin, body: { action: "connect" } });
  assert.equal(c.status, 200, c.text);
  const u = new URL(c.json.url);
  assert.equal(u.origin + u.pathname, "https://www.linkedin.com/oauth/v2/authorization");
  assert.equal(u.searchParams.get("client_id"), "e2eclient01");
  assert.equal(u.searchParams.get("scope"), "w_organization_social rw_organization_admin");
  assert.match(u.searchParams.get("redirect_uri") || "", /\/api\/admin\/linkedin\/callback$/);
  const state = u.searchParams.get("state") || "";
  assert.match(state, /^[0-9a-f]{48}$/);
  const set = c.headers.get("set-cookie") || "";
  assert.match(set, new RegExp(`axto_li_state=${state}`));
  assert.match(set, /HttpOnly/i);
  assert.match(set, /Path=\/api\/admin\/linkedin\/callback/i);

  const wrong = await call("GET", `/api/admin/linkedin/callback?code=abc&state=nope`, { cookie: `${admin}; axto_li_state=${state}` });
  assert.equal(wrong.status, 307);
  assert.match(decodeURIComponent(wrong.headers.get("location") || ""), /\/admin\/linkedin\?error=The sign-in expired/);
  const denied = await call("GET", `/api/admin/linkedin/callback?error=unauthorized_scope_error&error_description=Scope+not+authorized`, { cookie: admin });
  assert.match(decodeURIComponent((denied.headers.get("location") || "").replace(/\+/g, " ")), /error=unauthorized_scope_error: Scope not authorized/);
});

test("the cron tick runs the poster (off until it is switched on)", async () => {
  const t = await call("GET", "/api/cron/tick", { headers: { "x-cron-secret": "e2e-cron-secret" } });
  assert.equal(t.status, 200, t.text);
  assert.deepEqual(t.json.linkedin, { skipped: "disabled" });
});
