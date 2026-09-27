/* ==============================================================================
 * AXTO v3 — the AXTO Setup installer end to end, against the LOCAL portal.
 *   licence key → /api/selfhosted/installer → signed image link (R2, resumable)
 *   → docker load → compose up → /health → status/stop/start/update → uninstall
 * Uses the real axto/vault-core image when it is present locally, otherwise a
 * tiny stand-in that answers /health. Skipped without Docker or Go.
 * ============================================================================ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));

const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const REPO = path.resolve(process.cwd(), "..");
const CTL_DIR = path.resolve(process.cwd(), ".e2e-state/d1ctl");
const RUN = Date.now().toString(36);
const PORT = 18081;
const GO = fs.existsSync("/usr/local/go/bin/go") ? "/usr/local/go/bin/go" : "go";
const sh = (cmd: string, args: string[], opts: any = {}) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...opts });
const haveDocker = sh("docker", ["info"]).status === 0;
const haveGo = sh(GO, ["version"]).status === 0;

function d1(sql: string): any[] {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "axto-db", "--local", "--persist-to", "../persist", "--command", sql, "--json"], {
    cwd: CTL_DIR, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.slice(out.indexOf("[")))[0]?.results || [];
}

async function call(method: string, p: string, body?: unknown, cookie = "", headers: Record<string, string> = {}) {
  const res = await fetch(BASE + p, { method, redirect: "manual", signal: AbortSignal.timeout(120_000),
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]+)/);
  const buf = Buffer.from(await res.arrayBuffer());
  let json: any = null;
  try { json = JSON.parse(buf.toString("utf8")); } catch {}
  return { status: res.status, json, buf, headers: res.headers, cookie: m ? `axto_session=${m[1]}` : cookie };
}

async function health(): Promise<number> {
  try { return (await fetch(`http://127.0.0.1:${PORT}/health`, { signal: AbortSignal.timeout(5000) })).status; } catch { return 0; }
}

test("installer: licence → signed download → docker load → run → manage → uninstall", { skip: (!haveDocker || !haveGo) && "needs Docker and Go", timeout: 900_000 }, async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "axto-installer-"));
  // 1. Build the installer exactly like CI does.
  const b = sh("bash", [path.join(REPO, "installer/build.sh"), "3.0.0-e2e"], { env: { ...process.env, PATH: `${path.dirname(GO)}:${process.env.PATH}` } });
  assert.equal(b.status, 0, b.stdout + b.stderr);
  const bin = path.join(REPO, "installer/dist/axto-setup-linux-amd64");
  assert.ok(fs.statSync(path.join(REPO, "installer/dist/AXTO-Setup.exe")).size > 3_000_000, "Windows EXE built");

  // 2. Publish the vault image to the local builds bucket (real image if present, else a stand-in).
  if (sh("docker", ["image", "inspect", "axto/vault-core:latest"]).status !== 0) {
    const ctx = fs.mkdtempSync(path.join(os.tmpdir(), "stub-"));
    fs.writeFileSync(path.join(ctx, "Dockerfile"), `FROM python:3.11-slim-bookworm\nCMD ["python","-c","import http.server as h\\nclass H(h.BaseHTTPRequestHandler):\\n def do_GET(s):\\n  s.send_response(200); s.end_headers(); s.wfile.write(b'{\\"status\\":\\"ok\\"}')\\nh.HTTPServer(('0.0.0.0',8080),H).serve_forever()"]\n`);
    assert.equal(sh("docker", ["build", "-t", "axto/vault-core:latest", ctx]).status, 0);
  }
  const tar = path.join(work, "vault-core.tar.gz");
  assert.equal(sh("bash", ["-c", `docker save axto/vault-core:latest | gzip -1 > ${tar}`]).status, 0);
  sh("docker", ["rmi", "-f", "axto/vault-core:latest"]);            // the installer must load it
  const put = sh("npx", ["wrangler", "r2", "object", "put", "axto-builds/builds/latest/raw/vault-core.tar.gz", "--file", tar, "--local", "--persist-to", "../persist"],
    { cwd: CTL_DIR, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" } });
  assert.equal(put.status, 0, put.stderr);

  // 3. A Business member with a Vault licence.
  d1(`INSERT OR IGNORE INTO users (id, email, role, name, created_at, updated_at) VALUES ('e2e-admin', 'e2e-admin@axto.io', 'admin', 'E2E Admin', datetime('now'), datetime('now'))`);
  const admin = await call("POST", "/api/auth/login", { email: "e2e-admin@axto.io", password: "e2e-admin-Pass-2026" });
  const reg = await call("POST", "/api/auth/register", { email: `inst-${RUN}@example.com`, name: "Installer Test", password: "abcdefgh1", acceptTerms: true });
  assert.equal(reg.status, 200);
  const [u] = d1(`SELECT id FROM users WHERE email = 'inst-${RUN}@example.com'`);
  assert.equal((await call("POST", `/api/admin/members/${u.id}`, { action: "grant", plan: "business", cycle: "monthly" }, admin.cookie)).status, 200);
  const member = await call("POST", "/api/auth/login", { email: `inst-${RUN}@example.com`, password: "abcdefgh1" });
  const lic = await call("POST", "/api/selfhosted", { action: "issue", product: "vault" }, member.cookie);
  const key: string = lic.json.license.license_key;
  assert.match(key, /^VAULT-/);

  // 4. The installer API itself.
  assert.equal((await call("POST", "/api/selfhosted/installer", { license_key: "VAULT-00000000-00000000-00000000-00000000" })).status, 404);
  const links = await call("POST", "/api/selfhosted/installer", { license_key: key.toLowerCase() });
  assert.equal(links.status, 200, JSON.stringify(links.json));
  assert.equal(links.json.product, "vault");
  const img = links.json.images.find((i: any) => i.name === "vault-core");
  assert.ok(img.available && img.size > 1000);
  const tampered = img.url.replace(/sig=([0-9a-f])/, (_: string, c: string) => `sig=${c === "0" ? "1" : "0"}`);
  assert.equal((await fetch(tampered)).status, 403, "tampered link refused");
  const ranged = await fetch(img.url, { headers: { Range: "bytes=100-" } });
  assert.equal(ranged.status, 206, "downloads resume");
  assert.equal(ranged.headers.get("content-range"), `bytes 100-${img.size - 1}/${img.size}`);
  assert.equal((await ranged.arrayBuffer()).byteLength, img.size - 100, "exactly the rest of the file");

  // 5. Install with the CLI (same pipeline as the Windows wizard).
  const env = { ...process.env, NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" };
  const baseDir = path.join(work, "axto");
  const run = (...a: string[]) => sh(bin, [...a, "--portal", BASE, "--base", baseDir], { env, timeout: 600_000 });
  assert.notEqual(run("install", "--key", "NOPE").status, 0, "bad key rejected");
  const inst = run("install", "--key", key, "--port", String(PORT));
  assert.equal(inst.status, 0, inst.stdout + inst.stderr);
  assert.match(inst.stdout, /is running — http:\/\/localhost:18081/);
  assert.ok((await health()) > 0, "vault answers /health");
  const cfg = fs.readFileSync(path.join(baseDir, "vault", "vault.yml"), "utf8");
  assert.ok(cfg.includes(key) && !cfg.includes("XXXXXXXX"), "licence key written into the config");
  assert.match(fs.readFileSync(path.join(baseDir, "vault", "vault-compose.yml"), "utf8"), /"18081:8080"/);
  assert.equal(sh("docker", ["image", "inspect", "axto/vault-core:latest"]).status, 0, "image loaded");

  // 6. Manage.
  assert.match(run("status", "vault").stdout, /vault-core\s+running/);
  assert.equal(run("stop", "vault").status, 0);
  assert.equal(await health(), 0, "stopped");
  assert.equal(run("start", "vault").status, 0);
  for (let i = 0; i < 30 && !(await health()); i++) await new Promise((r) => setTimeout(r, 2000));
  assert.ok((await health()) > 0, "started again");
  const upd = run("update", "vault");
  assert.equal(upd.status, 0, upd.stdout + upd.stderr);
  assert.match(run("list").stdout, /vault\s+http:\/\/localhost:18081/);

  // 7. A revoked licence can no longer download.
  d1(`UPDATE sh_licenses SET status = 'revoked' WHERE license_key = '${key}'`);
  const denied = run("update", "vault");
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /revoked/);
  assert.equal((await fetch(img.url)).status, 403, "existing links die with the licence");
  d1(`UPDATE sh_licenses SET status = 'active' WHERE license_key = '${key}'`);

  // 8. Uninstall removes containers, volumes and files.
  const un = run("uninstall", "vault");
  assert.equal(un.status, 0, un.stdout + un.stderr);
  assert.equal(sh("docker", ["inspect", "vault-core"]).status, 1, "container removed");
  assert.equal(fs.existsSync(path.join(baseDir, "vault")), false);
  assert.match(run("list").stdout, /No AXTO apps installed/);
});
