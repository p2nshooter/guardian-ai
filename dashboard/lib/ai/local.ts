/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * LOCAL MODE — AI on the member's own device. The BROWSER talks straight to a
 * model server on this computer (Ollama, LM Studio, or any OpenAI-compatible
 * server such as llama.cpp, Jan, LocalAI or vLLM) at http://localhost. The
 * prompt is built in the browser too (lib/ai/local-run.ts), so the request,
 * the documents and the answer never pass through AXTO's servers.
 *
 * This file has no server imports: it is loaded by the settings page and the
 * model picker. Settings live in this browser only (the model is on this device).
 * ============================================================================ */

export const LOCAL_PROVIDER = "local";
export type LocalKind = "ollama" | "lmstudio" | "custom";
export const LOCAL_KINDS: Record<LocalKind, { name: string; base: string; site: string }> = {
  ollama: { name: "Ollama", base: "http://localhost:11434", site: "https://ollama.com/download" },
  lmstudio: { name: "LM Studio", base: "http://localhost:1234", site: "https://lmstudio.ai" },
  custom: { name: "OpenAI-compatible", base: "http://localhost:8080", site: "" },
};
export const isLocalKind = (k: unknown): k is LocalKind => typeof k === "string" && k in LOCAL_KINDS;

export interface LocalSettings { kind: LocalKind; baseUrl: string; model: string; preferred: boolean; updatedAt: string }
const KEY = "axto.local-ai.v1";
export const LOCAL_EVENT = "axto-local-ai";

export function loadLocal(): LocalSettings | null {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!j || !isLocalKind(j.kind) || typeof j.baseUrl !== "string" || typeof j.model !== "string" || localUrlProblem(j.baseUrl)) return null;
    return { kind: j.kind, baseUrl: j.baseUrl, model: j.model.slice(0, 200), preferred: !!j.preferred, updatedAt: String(j.updatedAt || "") };
  } catch { return null; }
}
export function saveLocal(s: Omit<LocalSettings, "updatedAt">): LocalSettings {
  const v: LocalSettings = { ...s, baseUrl: s.baseUrl.trim().replace(/\/+$/, ""), model: s.model.trim(), updatedAt: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
  try { window.dispatchEvent(new Event(LOCAL_EVENT)); } catch {}
  return v;
}
export function clearLocal() {
  try { localStorage.removeItem(KEY); } catch {}
  try { window.dispatchEvent(new Event(LOCAL_EVENT)); } catch {}
}

const LOOPBACK = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i;
const PRIVATE = /^(10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|[a-z0-9-]+\.local)$/i;

/** "url" = not a valid http(s) URL; "public" = not this device or the local network. */
export function localUrlProblem(url: unknown): "url" | "public" | null {
  let u: URL;
  try { u = new URL(String(url)); } catch { return "url"; }
  if ((u.protocol !== "http:" && u.protocol !== "https:") || u.username || u.password || u.search || u.hash) return "url";
  return LOOPBACK.test(u.hostname) || PRIVATE.test(u.hostname) ? null : "public";
}
/** True when the server runs on this very computer (not another machine on the network). */
export const isOnDevice = (url: string) => { try { return LOOPBACK.test(new URL(url).hostname); } catch { return false; } };

/** Server root without a trailing "/v1" (both styles are accepted in settings). */
const root = (base: string) => base.trim().replace(/\/+$/, "").replace(/\/v1$/, "");

export type LocalErrorCode = "unreachable" | "http" | "model" | "empty";
export class LocalError extends Error { constructor(public code: LocalErrorCode, message: string, public status = 0) { super(message); } }

async function get(url: string, signal?: AbortSignal): Promise<any> {
  let r: Response;
  try { r = await fetch(url, { signal, headers: { Accept: "application/json" } }); }
  catch (e: any) { if (e?.name === "AbortError") throw e; throw new LocalError("unreachable", String(e?.message || e)); }
  if (!r.ok) throw new LocalError("http", `HTTP ${r.status}`, r.status);
  return r.json().catch(() => ({}));
}

/** Models installed on the local server (OpenAI-style /v1/models, else Ollama's /api/tags). */
export async function localModels(base: string, signal?: AbortSignal): Promise<string[]> {
  const b = root(base);
  try {
    const j = await get(`${b}/v1/models`, signal);
    const ids = (Array.isArray(j?.data) ? j.data : []).map((m: any) => String(m?.id || "")).filter(Boolean);
    if (ids.length) return Array.from(new Set<string>(ids)).sort();
  } catch (e) { if (e instanceof LocalError && e.code === "unreachable") throw e; }
  const j = await get(`${b}/api/tags`, signal).catch(() => ({}));
  return Array.from(new Set<string>((Array.isArray(j?.models) ? j.models : []).map((m: any) => String(m?.name || m?.model || "")).filter(Boolean))).sort();
}

export interface LocalImage { mime: string; data: string }
export interface LocalMessage { role: "user" | "assistant"; content: string; images?: LocalImage[] }
export interface LocalPrompt { system: string; messages: LocalMessage[]; maxOutputTokens?: number; temperature?: number }

/** Text deltas from an OpenAI-compatible Server-Sent Events body (also tolerant of NDJSON). */
export async function* sseTexts(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const pick = (line: string): string | undefined => {
    const data = line.startsWith("data:") ? line.slice(5).trim() : line.startsWith("{") ? line : "";
    if (!data || data === "[DONE]") return undefined;
    try {
      const j = JSON.parse(data);
      if (j?.error) throw new LocalError("http", String(j.error?.message || j.error).slice(0, 300));
      return j?.choices?.[0]?.delta?.content ?? j?.choices?.[0]?.message?.content ?? j?.message?.content ?? undefined;
    } catch (e) { if (e instanceof LocalError) throw e; return undefined; }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const t = pick(buf.slice(0, i).trim());
      buf = buf.slice(i + 1);
      if (t) yield t;
    }
  }
  const t = pick(buf.trim());
  if (t) yield t;
}

/** Stream an answer from the model on this device. */
export async function* localChat(s: Pick<LocalSettings, "baseUrl" | "model">, p: LocalPrompt, signal?: AbortSignal): AsyncGenerator<string> {
  if (!s.model) throw new LocalError("model", "Choose a model first.");
  const body: Record<string, unknown> = {
    model: s.model, stream: true,
    messages: [{ role: "system", content: p.system }, ...p.messages.map((m) => ({
      role: m.role,
      content: m.images?.length ? [{ type: "text", text: m.content }, ...m.images.map((i) => ({ type: "image_url", image_url: { url: `data:${i.mime};base64,${i.data}` } }))] : m.content,
    }))],
  };
  if (p.maxOutputTokens) body.max_tokens = p.maxOutputTokens;
  if (typeof p.temperature === "number") body.temperature = p.temperature;
  let r: Response;
  try { r = await fetch(`${root(s.baseUrl)}/v1/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }); }
  catch (e: any) { if (e?.name === "AbortError") throw e; throw new LocalError("unreachable", String(e?.message || e)); }
  if (!r.ok || !r.body) {
    const t = await r.text().catch(() => "");
    if (r.status === 404 && /model/i.test(t)) throw new LocalError("model", t.slice(0, 300), 404);
    throw new LocalError("http", `HTTP ${r.status}${t ? `: ${t.slice(0, 300)}` : ""}`, r.status);
  }
  let any = false;
  for await (const t of sseTexts(r.body)) { any = true; yield t; }
  if (!any) throw new LocalError("empty", "The local model returned no text.");
}

/** A member-facing sentence for a Local Mode failure (the dictionary is lib/i18n-pages/localai.ts). */
export function describeLocalError(e: unknown, s: Pick<LocalSettings, "kind" | "baseUrl" | "model">, t: { unreachable: string; http: string; model: string; empty: string }, origin: string): string {
  if (e instanceof LocalError) {
    if (e.code === "unreachable") return t.unreachable.replace("{name}", LOCAL_KINDS[s.kind].name).replace("{url}", s.baseUrl).replace("{origin}", origin);
    if (e.code === "model") return t.model.replace("{model}", s.model);
    if (e.code === "empty") return t.empty;
    return t.http.replace("{msg}", e.message.slice(0, 300));
  }
  return String((e as any)?.message || e).slice(0, 300);
}
