/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * LOCAL MODE runner — loaded on demand (dynamic import) by aiFetch when the
 * member picks "This device". Builds the prompt IN THE BROWSER with the same
 * task handlers the server uses, streams it from the model on this device and
 * returns a Response shaped exactly like POST /api/byox/run, so every app works
 * unchanged. The only calls to AXTO: the session (plan), the template of a
 * catalogue prompt (plan-gated), and — for Legal AI, whose expert instructions
 * stay on the server — the instructions assembled around placeholders.
 * ============================================================================ */
import "./tasks";                 // AI Studio
import "../security/task";
import "../compliance/task";
import "../clipper/task";
import "../vault/task";
import { registerTask, inputSize, MAX_INPUT_CHARS, type BuiltTask } from "./tasks";
import { buildPromptTask, promptIdOf, type PromptTemplate } from "../prompts/task-core";
import { buildRun } from "./run-build";
import { maskRequest, unmaskBuilt } from "./local-mask";
import { loadLocal, localChat, describeLocalError } from "./local";
import { LOCALAI } from "../i18n-pages/localai";
import { isLang, LANG_COOKIE, type Lang } from "../i18n-shared";

const templates = new Map<string, PromptTemplate>();
registerTask({ app: "prompts", build: (input, tier) => buildPromptTask(input, tier, (id) => templates.get(id)) });

/** Apps whose instructions are assembled on the server around placeholders. */
const SERVER_BUILT = new Set(["legal"]);

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function pageLang(): Lang {
  const c = typeof document !== "undefined" ? new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]+)`).exec(document.cookie)?.[1] : "";
  const h = typeof document !== "undefined" ? document.documentElement.lang : "";
  return isLang(c) ? c : isLang(h) ? h : "en";
}

let meP: Promise<any> | null = null;
function me(): Promise<any> {
  if (!meP) meP = fetch("/api/auth/me", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((j) => { if (!j) meP = null; return j; });
  return meP;
}

export async function runLocal(b: any, signal?: AbortSignal): Promise<Response> {
  const t = LOCALAI[pageLang()] || LOCALAI.en;
  const s = loadLocal();
  if (!s || !(b?.model || s.model)) return json(412, { error: t.errors.notSetUp, needKey: true, local: true });
  const m = await me();
  if (!m?.user) return json(401, { error: "Please sign in again." });
  if (!m.localMode) return json(403, { error: m.limits?.localMode ? t.unavailable : t.needPlan, upgrade: !m.limits?.localMode, local: true });
  const app = String(b?.app || "");

  let built: BuiltTask;
  let research = false;
  if (SERVER_BUILT.has(app)) {
    const masked = maskRequest(b, Array.isArray(b?.plain) ? b.plain.map(String) : []);
    const r = await fetch("/api/byox/prepare", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(masked.body), signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.task) return json(r.ok ? 500 : r.status, j);
    built = unmaskBuilt(j.task as BuiltTask, masked) as BuiltTask;
    research = !!j.research;
  } else {
    if (app === "prompts") {
      const id = promptIdOf({ task: b?.task, options: b?.options });
      if (id && !templates.has(id)) {
        const r = await fetch(`/api/prompts/${encodeURIComponent(id)}`, { credentials: "include", signal });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j?.prompt?.template) return json(r.ok ? 404 : r.status, j);
        templates.set(id, { id, level: j.prompt.level, title: j.prompt.title, template: j.prompt.template });
      }
    }
    const r = buildRun(m.tier, b);
    if (!r.ok) return json(r.status, { error: r.error, ...(r.extra || {}) });
    built = r.probe;
    research = r.wantResearch;
  }
  if (inputSize(built.system, built.messages) > MAX_INPUT_CHARS) return json(413, { error: "This is too long for one request (about 150,000 tokens). Remove some documents or split them into separate runs." });

  const model = String(b?.model || s.model).slice(0, 200);
  const settings = { ...s, model };
  const gen = localChat(settings, { system: built.system, messages: built.messages, maxOutputTokens: built.maxOutputTokens, temperature: built.temperature }, signal);
  let first: IteratorResult<string>;
  try { first = await gen.next(); }
  catch (e: any) {
    if (e?.name === "AbortError") throw e;
    return json(502, { error: describeLocalError(e, settings, t.errors, location.origin), local: true });
  }
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      if (research) c.enqueue(enc.encode(`[[axto:note|${t.researchOff}]]\n`));
      if (first.done) c.close(); else c.enqueue(enc.encode(first.value));
    },
    async pull(c) {
      try {
        const { value, done } = await gen.next();
        if (done) c.close(); else c.enqueue(enc.encode(value));
      } catch (e: any) {
        if (e?.name !== "AbortError") c.enqueue(enc.encode(`\n\n⚠️ ${describeLocalError(e, settings, t.errors, location.origin)}`));
        c.close();
      }
    },
    async cancel() { await gen.return?.(undefined); },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8", "X-AI-Mode": "local", "X-AI-Provider": "local",
      "X-AI-Model": encodeURIComponent(model), "X-AI-Research": "0", "X-Task-Title": encodeURIComponent(built.title || ""),
    },
  });
}
