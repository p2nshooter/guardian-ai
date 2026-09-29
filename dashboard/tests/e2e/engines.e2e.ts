/* ==============================================================================
 * AXTO v3 — the REAL engine licence code against the LOCAL licence server.
 * Issues an Enterprise licence for every self-hosted app through the member
 * portal API, then runs each engine's own license.py (Python, in Docker —
 * see engine_licence.py) for: genuine answer, MITM tampering, replay, a
 * stable installation id, and Lifetime OFFLINE activation files issued by the
 * real portal flow (valid with no server; refused on another machine, when
 * tampered, or for another app). Skipped when Docker is not available.
 * ============================================================================ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));

const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const REPO = path.resolve(process.cwd(), "..");
const CTL_DIR = path.resolve(process.cwd(), ".e2e-state/d1ctl");
const IMAGE = "axto-licence-test:py311";
const RUN = Date.now().toString(36);

const ENGINES: { name: string; product: string; path: string }[] = [
  { name: "guardian", product: "guardian", path: "engine/src/license.py" },
  { name: "orchestra", product: "orchestra", path: "orchestra/orchestra_core/license.py" },
  { name: "vault", product: "vault", path: "vault/src/license.py" },
  { name: "edge", product: "edge", path: "edge/src/license.py" },
  { name: "soc", product: "soc", path: "soc/src/license.py" },
  { name: "compliance", product: "compliance", path: "compliance/src/license.py" },
  { name: "sentinel", product: "sentinel", path: "sentinel/src/license.py" },
  { name: "antivirus", product: "antivirus", path: "antivirus/src/license.py" },
  { name: "legal", product: "legal", path: "legal/src/license.py" },
  { name: "studio", product: "studio", path: "studio/src/license.py" },
  { name: "ai-studio", product: "studio", path: "ai-studio/src/license.py" },
  { name: "gpu-studio", product: "studio", path: "gpu-studio/src/license.py" },
  { name: "hybrid-studio", product: "studio", path: "hybrid-studio/src/license.py" },
];

function docker(...args: string[]) {
  return spawnSync("docker", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function d1(sql: string): any[] {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "axto-db", "--local", "--persist-to", "../persist", "--command", sql, "--json"], {
    cwd: CTL_DIR, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.slice(out.indexOf("[")))[0]?.results || [];
}

async function call(method: string, p: string, body?: unknown, cookie = "") {
  const res = await fetch(BASE + p, {
    method, redirect: "manual", signal: AbortSignal.timeout(60_000),
    headers: { "Content-Type": "application/json", "cf-connecting-ip": `10.${1 + Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`, ...(cookie ? { Cookie: cookie } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]+)/);
  return { status: res.status, json: await res.json().catch(() => null), cookie: m ? `axto_session=${m[1]}` : cookie };
}

function ensureImage() {
  if (docker("image", "inspect", IMAGE).status === 0) return;
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || "";
  const ca = "/root/.ccr/ca-bundle.crt";
  const dockerfile = [
    "FROM python:3.11-slim-bookworm",
    ...(proxy ? ["COPY ca.crt /usr/local/share/ca.crt", "ENV PIP_CERT=/usr/local/share/ca.crt SSL_CERT_FILE=/usr/local/share/ca.crt"] : []),
    "RUN pip install --no-cache-dir httpx==0.28.1 cryptography==44.0.2",
    ...(proxy ? ["ENV PIP_CERT= SSL_CERT_FILE="] : []),
  ].join("\n");
  const ctx = execFileSync("mktemp", ["-d"], { encoding: "utf8" }).trim();
  execFileSync("bash", ["-c", `cat > ${ctx}/Dockerfile <<'EOF'\n${dockerfile}\nEOF\n${proxy ? `cp ${ca} ${ctx}/ca.crt` : "true"}`]);
  const build = docker("build", "--network", "host", "-t", IMAGE,
    ...(proxy ? ["--build-arg", `HTTPS_PROXY=${proxy}`, "--build-arg", `HTTP_PROXY=${proxy}`] : []), ctx);
  assert.equal(build.status, 0, build.stderr.slice(-2000));
}

const dockerAvailable = docker("info").status === 0;

test("engines: every licence family validates, resists tampering and replay", { skip: !dockerAvailable && "Docker not available", timeout: 600_000 }, async () => {
  // Admin + a member on Enterprise (every app, unlimited nodes).
  d1(`INSERT OR IGNORE INTO users (id, email, role, name, created_at, updated_at) VALUES ('e2e-admin', 'e2e-admin@axto.io', 'admin', 'E2E Admin', datetime('now'), datetime('now'))`);
  const admin = await call("POST", "/api/auth/login", { email: "e2e-admin@axto.io", password: "e2e-admin-Pass-2026" });
  assert.equal(admin.status, 200);
  const reg = await call("POST", "/api/auth/register", { email: `engines-${RUN}@example.com`, name: "Engine Test", password: "abcdefgh1", acceptTerms: true });
  assert.equal(reg.status, 200);
  const [u] = d1(`SELECT id FROM users WHERE email = 'engines-${RUN}@example.com'`);
  assert.equal((await call("POST", `/api/admin/members/${u.id}`, { action: "grant", plan: "enterprise", cycle: "monthly" }, admin.cookie)).status, 200);
  const member = await call("POST", "/api/auth/login", { email: `engines-${RUN}@example.com`, password: "abcdefgh1" });

  const keys: Record<string, string> = {};
  for (const product of new Set(ENGINES.map((e) => e.product))) {
    const r = await call("POST", "/api/selfhosted", { action: "issue", product }, member.cookie);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    keys[product] = r.json.license.license_key;
  }

  // Lifetime: a 2-device suite licence; each app is activated on its own machine
  // id, plus once on the NEXT app's machine id (→ an "other app, same machine" file).
  const mid = (product: string) => createHash("sha256").update(`${RUN}:${product}`).digest("hex").slice(0, 32);
  const lt = await call("POST", "/api/admin/lifetime", { action: "issue", email: `engines-${RUN}@example.com`, scope: "suite", devices: 2 }, admin.cookie);
  assert.equal(lt.status, 200, JSON.stringify(lt.json));
  const products = [...new Set(ENGINES.map((e) => e.product))];
  const files: Record<string, string> = {}, borrowed: Record<string, string> = {};
  for (const [i, product] of products.entries()) {
    const next = products[(i + 1) % products.length];
    const own = await call("POST", "/api/lifetime", { action: "activate", licenseId: lt.json.license.id, product, machineId: mid(product), label: "e2e" }, member.cookie);
    assert.equal(own.status, 200, JSON.stringify(own.json));
    files[product] = own.json.file;
    const other = await call("POST", "/api/lifetime", { action: "activate", licenseId: lt.json.license.id, product, machineId: mid(next), label: "e2e-other" }, member.cookie);
    assert.equal(other.status, 200, JSON.stringify(other.json));
    borrowed[next] = other.json.file;          // right machine for `next`, wrong app
  }

  ensureImage();
  const spec = ENGINES.map((e) => ({
    name: e.name, path: e.path, key: keys[e.product], product: e.product,
    machine_id: mid(e.product), offline_file: files[e.product], other_file: borrowed[e.product],
  }));
  const run = docker("run", "--rm", "--network", "host", "-v", `${REPO}:/repo:ro`,
    "-e", `AXTO_TEST_SERVER=${BASE}/api/license-validate`, "-e", "NO_PROXY=127.0.0.1,localhost", "-e", "no_proxy=127.0.0.1,localhost",
    IMAGE, "python", "/repo/dashboard/tests/e2e/engine_licence.py", JSON.stringify(spec));
  const results = run.stdout.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const r of results) console.log(JSON.stringify(r));
  assert.equal(results.length, ENGINES.length, run.stderr.slice(-3000));
  for (const r of results) assert.ok(r.ok, `${r.engine}: ${JSON.stringify(r)}`);
});
