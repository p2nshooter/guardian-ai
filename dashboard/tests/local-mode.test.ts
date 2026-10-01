/* AXTO Local Mode — unit tests: placeholders give exactly the server's Legal prompt
 * without the server ever seeing the member's content; the browser-side Prompt
 * Library builder matches the server; address rules; the SSE parser; the local
 * chat client against a mock model server; and the browser bundle never pulls in
 * server-only prompt text, keys or provider SDKs. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import "../lib/ai/register";
import { buildRun } from "../lib/ai/run-build";
import { maskRequest, unmaskBuilt, MARK_RE } from "../lib/ai/local-mask";
import { buildPromptTask } from "../lib/prompts/task-core";
import { getPrompt, PROMPTS } from "../lib/prompts/catalog";
import { localUrlProblem, isOnDevice, sseTexts, localChat, localModels, LocalError, describeLocalError } from "../lib/ai/local";
import { PLANS, PLAN_ORDER, limitsFor } from "../lib/plans";
import { planMatrix } from "../lib/plan-matrix";

const LEGAL = {
  app: "legal", task: "case-builder",
  messages: [
    { role: "user", content: "Our client Budi Santoso was dismissed on 3 March 2026 without a warning letter. Build the case." },
    { role: "assistant", content: "Understood — which court?" },
    { role: "user", content: "PHI Jakarta Pusat. Use the attached contract of PT Sinar Jaya." },
  ],
  options: {
    jurisdiction: JSON.stringify({ country: "ID", sub: "", city: "Jakarta Pusat" }), area: "employment", audience: "lawyer", depth: "standard", citation: "auto", lang: "Bahasa Indonesia", asOf: "2026-09-30",
    factsDate: "early March 2026", f_role: "claimant", f_stage: "first", f_goal: "Reinstatement and back pay for Budi", f_facts_date: "3 March 2026",
  },
  documents: [{ name: "Contract PT Sinar Jaya.pdf", text: "EMPLOYMENT AGREEMENT between PT Sinar Jaya and Budi Santoso. Salary IDR 15.000.000 per month.", pages: 4 }],
};
const SECRETS = ["Budi", "Sinar Jaya", "PHI Jakarta", "Jakarta Pusat", "early March", "Reinstatement", "3 March 2026", "IDR 15.000.000", "Contract PT"];

test("local mode: Legal placeholders reproduce the server prompt exactly", () => {
  const expected = buildRun("pro", LEGAL);
  assert.ok(expected.ok);
  const masked = maskRequest(LEGAL, ["f_role", "f_stage"]);
  const wire = JSON.stringify(masked.body);
  for (const s of SECRETS) assert.ok(!wire.includes(s), `"${s}" must not be sent to the server`);
  assert.match(wire, /"f_role":"claimant"/, "select values marked plain travel in clear");
  assert.match(masked.body.options.jurisdiction, /"country":"ID"/);
  const onServer = buildRun("pro", masked.body);
  assert.ok(onServer.ok, onServer.ok ? "" : onServer.error);
  if (!expected.ok || !onServer.ok) return;
  for (const s of SECRETS) assert.ok(!JSON.stringify(onServer.probe).includes(s), `server output has no "${s}"`);
  const back = unmaskBuilt(onServer.probe, masked);
  assert.equal(back.system, expected.probe.system);
  assert.deepEqual(back.messages.map((m) => [m.role, m.content]), expected.probe.messages.map((m) => [m.role, m.content]));
  assert.ok(!MARK_RE.test(back.system) && back.messages.every((m) => !/@@AXTO_LOCAL_/.test(m.content)), "no placeholder left");
});

test("local mode: a plain-marked value that is not a simple slug is still masked", () => {
  const masked = maskRequest({ ...LEGAL, options: { ...LEGAL.options, f_role: "Budi's own words, not an option" } }, ["f_role"]);
  assert.ok(!JSON.stringify(masked.body).includes("Budi"));
});

test("local mode: images stay in the browser and are put back on their message", () => {
  const img = { mime: "image/png", data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" };
  const req = { app: "legal", task: "ask", messages: [{ role: "user", content: "What does this show?", images: [img] }], options: { jurisdiction: JSON.stringify({ country: "ID" }) } };
  const masked = maskRequest(req);
  assert.ok(!JSON.stringify(masked.body).includes(img.data));
  const onServer = buildRun("pro", masked.body);
  assert.ok(onServer.ok);
  if (!onServer.ok) return;
  const back = unmaskBuilt(onServer.probe, masked);
  assert.deepEqual(back.messages.at(-1)?.images, [img]);
});

test("local mode: the browser Prompt Library builder equals the server's", () => {
  const p = PROMPTS.find((x) => x.level === "basic" && x.variables.length)!;
  const values = Object.fromEntries(p.variables.map((v: any) => [typeof v === "string" ? v : v.id || v.name, "Acme Ltd"]));
  const input = { task: "run", messages: [{ role: "user" as const, content: "(filled on the server)" }], options: { promptId: p.id, values: JSON.stringify(values) } };
  const server = buildRun("starter", { app: "prompts", ...input });
  const local = buildPromptTask(input, "starter", (id) => { const x = getPrompt(id); return x && { id: x.id, level: x.level, title: x.title, template: x.template }; });
  assert.ok(server.ok && !("error" in local));
  if (!server.ok || "error" in local) return;
  assert.deepEqual(local, server.probe);
  const elite = PROMPTS.find((x) => x.level === "elite")!;
  const denied = buildPromptTask({ ...input, options: { promptId: elite.id } }, "starter", (id) => { const x = getPrompt(id)!; return { id: x.id, level: x.level, title: x.title, template: x.template }; });
  assert.ok("error" in denied && denied.status === 402, "plan level still enforced");
});

test("local mode: only this device or the local network", () => {
  for (const ok of ["http://localhost:11434", "http://127.0.0.1:1234/v1", "http://[::1]:8080", "http://192.168.1.20:11434", "http://10.0.0.5:8000", "http://172.20.1.1:1234", "http://studio.local:1234", "https://localhost:8443"]) assert.equal(localUrlProblem(ok), null, ok);
  for (const bad of ["https://api.openai.com/v1", "http://8.8.8.8:11434", "http://172.32.0.1:1", "http://example.com"]) assert.equal(localUrlProblem(bad), "public", bad);
  for (const bad of ["localhost:11434", "ftp://localhost", "http://user:pw@localhost:1", "http://localhost:1/?x=1", "", 42]) assert.equal(localUrlProblem(bad), "url", String(bad));
  assert.ok(isOnDevice("http://127.0.0.1:1234") && isOnDevice("http://localhost:11434"));
  assert.ok(!isOnDevice("http://192.168.1.20:11434"));
});

const streamOf = (...parts: string[]) => new ReadableStream<Uint8Array>({ start(c) { for (const p of parts) c.enqueue(new TextEncoder().encode(p)); c.close(); } });
async function collect(g: AsyncGenerator<string>) { let s = ""; for await (const x of g) s += x; return s; }

test("local mode: SSE parser handles split lines, NDJSON, [DONE] and errors", async () => {
  const d = (t: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`;
  const a = d("Hel"), b = d("lo ✓");
  assert.equal(await collect(sseTexts(streamOf(a.slice(0, 10), a.slice(10) + b.slice(0, 5), b.slice(5), "data: [DONE]\n\n"))), "Hello ✓");
  assert.equal(await collect(sseTexts(streamOf(`{"message":{"content":"a"}}\n{"message":{"content":"b"}}`))), "ab", "NDJSON (Ollama /api/chat) tolerated");
  await assert.rejects(collect(sseTexts(streamOf(`data: {"error":{"message":"model overloaded"}}\n\n`))), /model overloaded/);
});

test("local mode: chat client against a mock model server", async () => {
  const seen: any[] = [];
  const srv = http.createServer((req, res) => {
    let body = ""; req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.url === "/v1/models") { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ data: [{ id: "qwen2.5:7b" }, { id: "llama3.2" }] })); return; }
      if (req.url === "/v1/chat/completions") {
        const j = JSON.parse(body); seen.push(j);
        if (j.model === "missing") { res.writeHead(404); res.end('{"error":"model \\"missing\\" not found"}'); return; }
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "Local " } }] })}\n\n`);
        res.end(`data: ${JSON.stringify({ choices: [{ delta: { content: "answer" } }] })}\n\ndata: [DONE]\n\n`);
        return;
      }
      res.writeHead(404); res.end();
    });
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(srv.address() as any).port}`;
  try {
    assert.deepEqual(await localModels(base), ["llama3.2", "qwen2.5:7b"]);
    const img = { mime: "image/png", data: "AAAA" };
    const out = await collect(localChat({ baseUrl: `${base}/v1`, model: "llama3.2" }, { system: "SYS", messages: [{ role: "user", content: "hi", images: [img] }], maxOutputTokens: 99, temperature: 0.2 }));
    assert.equal(out, "Local answer");
    assert.equal(seen[0].messages[0].content, "SYS");
    assert.equal(seen[0].messages[1].content[1].image_url.url, "data:image/png;base64,AAAA");
    assert.equal(seen[0].max_tokens, 99);
    assert.equal(seen[0].stream, true);
    await assert.rejects(collect(localChat({ baseUrl: base, model: "missing" }, { system: "", messages: [{ role: "user", content: "x" }] })), (e: any) => e instanceof LocalError && e.code === "model");
  } finally { srv.close(); }
  await assert.rejects(collect(localChat({ baseUrl: base, model: "x" }, { system: "", messages: [{ role: "user", content: "x" }] })), (e: any) => e instanceof LocalError && e.code === "unreachable");
  const t = { unreachable: "{name} not at {url} for {origin}", http: "E {msg}", model: "no {model}", empty: "empty" };
  assert.equal(describeLocalError(new LocalError("unreachable", "x"), { kind: "ollama", baseUrl: "http://localhost:11434", model: "m" }, t, "https://axto.io"), "Ollama not at http://localhost:11434 for https://axto.io");
});

/** Walk relative imports from the browser entry points. */
function graph(entries: string[]): Set<string> {
  const root = path.resolve(import.meta.dirname, "..");
  const seen = new Set<string>();
  const resolve = (from: string, spec: string) => {
    const base = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(from), spec);
    for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    return null;
  };
  const walk = (f: string) => {
    if (seen.has(f)) return;
    seen.add(f);
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^"']*?\sfrom\s+)?["']([^"']+)["']/gm)) {
      const spec = m[1];
      if (spec.startsWith(".") || spec.startsWith("@/")) { const r = resolve(f, spec); if (r) walk(r); }
      else seen.add(`pkg:${spec}`);
    }
  };
  for (const e of entries) walk(path.join(root, e));
  return new Set(Array.from(seen).map((x) => (x.startsWith("pkg:") ? x : path.relative(root, x))));
}

test("local mode: the browser bundle never includes server-only prompts, keys or SDKs", () => {
  const g = graph(["lib/ai/client-run.ts", "lib/ai/local-run.ts", "components/ai/LocalModeSettings.tsx"]);
  for (const bad of ["lib/legal/workspaces.ts", "lib/legal/prompt.ts", "lib/legal/task.ts", "lib/prompts/catalog.ts", "lib/prompts/task.ts", "lib/ai/providers.ts", "lib/ai/byox.ts", "lib/ai/run-core.ts", "lib/db.ts", "lib/auth.ts", "pkg:@anthropic-ai/sdk"]) {
    assert.ok(!g.has(bad), `${bad} must not be reachable from the Local Mode browser code`);
  }
  assert.ok(g.has("lib/ai/local.ts") && g.has("lib/prompts/task-core.ts") && g.has("lib/ai/run-build.ts"));
});

test("plans: Local Mode on every paid plan, shown in the matrix", () => {
  for (const id of PLAN_ORDER) assert.equal(PLANS[id].limits.localMode, true, id);
  assert.equal(limitsFor("none").localMode, false);
  assert.ok(planMatrix().some((r) => r.key === "localMode"));
});
