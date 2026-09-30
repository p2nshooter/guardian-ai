/* AXTO E2E — ONE admin sign-in shared by every test file.
 * Sign-in is rate-limited per e-mail (10 per 15 min); on a fast CI runner the
 * whole suite finishes in minutes, so each file signing in again hit 429.
 * The cookie is cached in .e2e-state (wiped by run.sh on every run). */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const STATE = path.resolve(process.cwd(), ".e2e-state");
const FILE = path.join(STATE, "admin.cookie");
export const ADMIN_EMAIL = "e2e-admin@axto.io";
export const ADMIN_PASSWORD = "e2e-admin-Pass-2026";

async function isAdmin(cookie: string): Promise<boolean> {
  const r = await fetch(`${BASE}/api/admin/stats`, { headers: { Cookie: cookie } }).catch(() => null);
  return r?.status === 200;
}

/** "axto_session=…" for the seeded admin; signs in only when no valid cached session exists. */
export async function adminCookie(): Promise<string> {
  try {
    const cached = fs.readFileSync(FILE, "utf8").trim();
    if (cached && (await isAdmin(cached))) return cached;
  } catch {}
  execFileSync("npx", ["wrangler", "d1", "execute", "axto-db", "--local", "--persist-to", "../persist", "--command",
    `INSERT OR IGNORE INTO users (id, email, role, name, created_at, updated_at) VALUES ('e2e-admin', '${ADMIN_EMAIL}', 'admin', 'E2E Admin', datetime('now'), datetime('now'))`],
    { cwd: path.join(STATE, "d1ctl"), env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" }, stdio: "ignore" });
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json", "cf-connecting-ip": "10.250.250.250" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const m = (r.headers.get("set-cookie") || "").match(/axto_session=([^;]+)/);
  if (r.status !== 200 || !m) throw new Error(`admin sign-in failed: HTTP ${r.status} ${await r.text()}`);
  const cookie = `axto_session=${m[1]}`;
  fs.mkdirSync(STATE, { recursive: true });
  fs.writeFileSync(FILE, cookie);
  return cookie;
}
