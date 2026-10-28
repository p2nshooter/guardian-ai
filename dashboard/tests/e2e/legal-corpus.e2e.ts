/* ==============================================================================
 * AXTO v3 — Legal AI primary-law corpus end to end (BLUEPRINT-V4 §32, phase L1):
 * an admin imports an instrument with its text, a member's text is checked
 * against it, coverage is reported as it is, and imports stay guarded.
 * ============================================================================ */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { seedAdmin, userByEmail, auditByAction } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);

class Client {
  cookie = "";
  ip = `10.${1 + Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
  async call(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(BASE + p, { method, redirect: "manual", signal: AbortSignal.timeout(60_000),
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), "cf-connecting-ip": this.ip, ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json };
  }
}

const admin = new Client();
const member = new Client();
const email = `corpus-${RUN}@example.com`;

const KUHPERDATA = {
  instrument: { jurisdiction: "ID", kind: "code", ref: "kuhperdata", title: "Kitab Undang-Undang Hukum Perdata", aliases: ["KUHPerdata", "BW"],
    language: "id", source_url: "https://peraturan.bpk.go.id/", source_name: "JDIH BPK" },
  version: "1848-05-01",
  complete: true,
  provisions: [
    { pinpoint: "art:1320", text: "Supaya terjadi persetujuan yang sah, perlu dipenuhi empat syarat: 1. kesepakatan mereka yang mengikatkan dirinya; 2. kecakapan untuk membuat suatu perikatan; 3. suatu pokok persoalan tertentu; 4. suatu sebab yang tidak terlarang." },
    { pinpoint: "art:1338", text: "Semua persetujuan yang dibuat sesuai dengan undang-undang berlaku sebagai undang-undang bagi mereka yang membuatnya." },
  ],
};

before(async () => {
  await seedAdmin("e2e-admin@axto.io");
  admin.cookie = await adminCookie();
  assert.equal((await member.call("POST", "/api/auth/register", { email, name: "Corpus Member", password: "abcdefgh1", acceptTerms: true })).status, 200);
});

test("legal corpus: guarded import, verified / not found / not covered, honest coverage", async () => {
  // Nobody but an admin or the importer token may write the corpus.
  assert.equal((await new Client().call("POST", "/api/admin/legal/corpus", KUHPERDATA)).status, 403);
  assert.equal((await member.call("POST", "/api/admin/legal/corpus", KUHPERDATA)).status, 403);
  assert.equal((await new Client().call("POST", "/api/admin/legal/corpus", KUHPERDATA, { Authorization: "Bearer wrong-token" })).status, 403);

  // A text from an unofficial address is refused.
  const bad = await admin.call("POST", "/api/admin/legal/corpus", { ...KUHPERDATA, instrument: { ...KUHPERDATA.instrument, source_url: "http://example.org" } });
  assert.equal(bad.status, 400);

  const ok = await admin.call("POST", "/api/admin/legal/corpus", KUHPERDATA);
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.instrument.complete, true);
  assert.equal(ok.json.instrument.versions[0].provisions, 2);
  assert.ok((await auditByAction("legal.corpus.import")).length >= 1, "imports are audited");

  // Verifying needs a Legal AI plan.
  assert.equal((await new Client().call("POST", "/api/legal/verify", { text: "Pasal 1320 KUHPerdata" })).status, 401);
  const u = await userByEmail(email);
  assert.equal((await admin.call("POST", `/api/admin/members/${u.id}`, { action: "grant", plan: "pro", cycle: "monthly" })).status, 200);
  assert.equal((await member.call("POST", "/api/auth/login", { email, password: "abcdefgh1" })).status, 200);

  const v = await member.call("POST", "/api/legal/verify", { text: "Perjanjian sah menurut Pasal 1320 KUHPerdata. Pasal 9999 KUHPerdata tidak ada. Lihat [2020] SGCA 1." });
  assert.equal(v.status, 200, JSON.stringify(v.json));
  const status = (needle: string) => v.json.results.find((r: any) => r.citation.text.includes(needle))?.status;
  assert.equal(status("1320"), "verified");
  assert.equal(status("9999"), "not_found");
  assert.equal(status("SGCA"), "not_covered");
  assert.equal(v.json.summary.verified, 1);
  assert.match(v.json.results.find((r: any) => r.status === "verified").provision.excerpt, /empat syarat/);

  assert.equal((await member.call("POST", "/api/legal/verify", { text: "" })).status, 400);

  const cov = await admin.call("GET", "/api/admin/legal/corpus");
  assert.equal(cov.status, 200);
  const id = cov.json.coverage.find((r: any) => r.jurisdiction === "ID");
  assert.ok(id && id.instruments >= 1 && id.provisions >= 2);
  assert.equal((await member.call("GET", "/api/admin/legal/corpus")).status, 403);
});
