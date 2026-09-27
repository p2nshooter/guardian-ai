/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * AI TRANSPORT — talks to AI providers given an explicit connection.
 *
 * This module never looks up credentials. Callers pass a Connection built by
 * EITHER lib/ai/byox.ts (member's own keys) OR lib/ai/managed.ts (AXTO's
 * keys). The two credential paths never meet; this file is only the wire.
 *
 * Output is a plain UTF-8 text stream so every app renders results the same way.
 * ============================================================================ */
import Anthropic from "@anthropic-ai/sdk";

export type ProviderId = "anthropic" | "openai" | "google" | "groq" | "openrouter" | "deepgram" | "custom";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  chat: boolean;               // can generate text
  stt: boolean;                // can transcribe audio (Clipper)
  defaultModel: string;        // chat model (or STT model for STT-only providers)
  sttModel?: string;
  models: string[];            // suggestions — any model string is accepted
  keyHint: string;
  keyUrl: string;
  freeTier?: string;           // plain-language note for members without a key
  baseUrl?: string;            // OpenAI-compatible endpoint
}

export const PROVIDERS: ProviderInfo[] = [
  { id: "anthropic", name: "Anthropic Claude", chat: true, stt: false, defaultModel: "claude-opus-5",
    models: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5", "claude-fable-5-1"],
    keyHint: "sk-ant-…", keyUrl: "https://console.anthropic.com/settings/keys" },
  { id: "openai", name: "OpenAI", chat: true, stt: true, defaultModel: "gpt-5-mini", sttModel: "whisper-1",
    models: ["gpt-5", "gpt-5-mini"], keyHint: "sk-…", keyUrl: "https://platform.openai.com/api-keys", baseUrl: "https://api.openai.com/v1" },
  { id: "google", name: "Google Gemini", chat: true, stt: false, defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"], keyHint: "AIza…", keyUrl: "https://aistudio.google.com/app/apikey",
    freeTier: "Google AI Studio offers a free tier.", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { id: "groq", name: "Groq", chat: true, stt: true, defaultModel: "llama-3.3-70b-versatile", sttModel: "whisper-large-v3-turbo",
    models: ["llama-3.3-70b-versatile"], keyHint: "gsk_…", keyUrl: "https://console.groq.com/keys",
    freeTier: "Groq offers a free tier (chat and transcription).", baseUrl: "https://api.groq.com/openai/v1" },
  { id: "openrouter", name: "OpenRouter", chat: true, stt: false, defaultModel: "openrouter/auto",
    models: ["openrouter/auto"], keyHint: "sk-or-…", keyUrl: "https://openrouter.ai/keys", baseUrl: "https://openrouter.ai/api/v1" },
  { id: "deepgram", name: "Deepgram (speech-to-text)", chat: false, stt: true, defaultModel: "nova-3", sttModel: "nova-3",
    models: ["nova-3"], keyHint: "…", keyUrl: "https://console.deepgram.com/", freeTier: "Deepgram includes free starter credit." },
  { id: "custom", name: "Your own endpoint (Ollama, vLLM, LM Studio…)", chat: true, stt: false, defaultModel: "",
    models: [], keyHint: "optional", keyUrl: "" },
];

export const providerInfo = (id: string) => PROVIDERS.find((p) => p.id === id);
export const isProviderId = (x: unknown): x is ProviderId => typeof x === "string" && !!providerInfo(x);

export interface Connection {
  provider: ProviderId;
  apiKey: string;
  model: string;
  baseUrl?: string;            // required for "custom"
}

export interface ChatMessage { role: "user" | "assistant"; content: string }

export interface GenOptions {
  maxOutputTokens?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";   // Anthropic only
}

/** Hard ceiling on prompt size so a member's document is never silently truncated. */
export const MAX_INPUT_CHARS = 600_000;

export function inputSize(system: string, messages: ChatMessage[]): number {
  return system.length + messages.reduce((n, m) => n + m.content.length, 0);
}

/** Validate a member-supplied endpoint URL (BYOM / BYOI). */
export function endpointProblem(url: string, allowInsecure = false): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return "Enter a full URL, e.g. https://llm.example.com/v1"; }
  if (u.protocol !== "https:" && !(allowInsecure && u.protocol === "http:")) return "The endpoint must use https://";
  const h = u.hostname.toLowerCase();
  if (!allowInsecure && (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === "[::1]")) {
    return "Private network addresses can't be reached from the cloud. Expose your server with a public HTTPS URL (e.g. a Cloudflare Tunnel).";
  }
  return null;
}

// ── Stream adapters (async iterators of text) ─────────────────────────────
async function* anthropicStream(c: Connection, system: string, messages: ChatMessage[], o: GenOptions): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey: c.apiKey, maxRetries: 2 });
  // Server-side refusal fallbacks are opted into for the models that support them.
  const supportsFallbacks = /^claude-(opus-5|fable-5)/.test(c.model);
  const params: any = {
    model: c.model,
    max_tokens: o.maxOutputTokens || 64000,
    system,
    messages,
    ...(o.effort ? { output_config: { effort: o.effort } } : {}),
    ...(supportsFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
  };
  const stream = client.beta.messages.stream(params);
  for await (const ev of stream as any) {
    if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") yield ev.delta.text;
  }
  const final: any = await stream.finalMessage();
  if (final?.stop_reason === "refusal") yield "\n\n_The model declined this request. Try rephrasing it._";
  if (final?.stop_reason === "max_tokens") yield "\n\n_(The answer reached the maximum length.)_";
}

export async function* readSse(body: ReadableStream<Uint8Array>, pick: (j: any) => string | undefined): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const t = pick(JSON.parse(data));
        if (t) yield t;
      } catch {}
    }
  }
}

function baseUrlOf(c: Connection): string {
  const b = c.provider === "custom" ? c.baseUrl || "" : providerInfo(c.provider)?.baseUrl || "";
  return b.replace(/\/+$/, "");
}

async function* openAICompatibleStream(c: Connection, system: string, messages: ChatMessage[]): AsyncGenerator<string> {
  const info = providerInfo(c.provider)!;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (c.apiKey) headers.Authorization = `Bearer ${c.apiKey}`;
  if (c.provider === "openrouter") { headers["HTTP-Referer"] = "https://axto.io"; headers["X-Title"] = "AXTO"; }
  const r = await fetch(`${baseUrlOf(c)}/chat/completions`, {
    method: "POST", headers,
    body: JSON.stringify({ model: c.model, stream: true, messages: [{ role: "system", content: system }, ...messages] }),
  });
  if (!r.ok || !r.body) {
    const t = await r.text().catch(() => "");
    throw new Error(`${info.name} returned ${r.status}${t ? `: ${t.slice(0, 300)}` : ""}`);
  }
  yield* readSse(r.body, (j) => j?.choices?.[0]?.delta?.content);
}

/** Workers AI (Managed path only — the binding is passed in by lib/ai/managed.ts). */
export async function* workersAiStream(ai: any, model: string, system: string, messages: ChatMessage[]): AsyncGenerator<string> {
  const out = await ai.run(model, { messages: [{ role: "system", content: system }, ...messages], stream: true, max_tokens: 4096 });
  if (out instanceof ReadableStream) {
    yield* readSse(out as ReadableStream<Uint8Array>, (j) => j?.response ?? j?.choices?.[0]?.delta?.content);
  } else if (typeof out?.response === "string") {
    yield out.response;
  }
}

export function chatStream(c: Connection, system: string, messages: ChatMessage[], o: GenOptions = {}): AsyncGenerator<string> {
  if (!providerInfo(c.provider)?.chat) throw new Error(`${providerInfo(c.provider)?.name || c.provider} cannot generate text. Choose a chat provider.`);
  return c.provider === "anthropic" ? anthropicStream(c, system, messages, o) : openAICompatibleStream(c, system, messages);
}

/** Turn a text iterator into a ReadableStream; errors are appended as a readable line. */
export function toTextStream(gen: AsyncGenerator<string>, onDone?: (outChars: number, failed: boolean) => void | Promise<void>): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let chars = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await gen.next();
        if (done) {
          controller.close();
          await onDone?.(chars, false);
          return;
        }
        chars += value.length;
        controller.enqueue(enc.encode(value));
      } catch (err: any) {
        const msg = String(err?.message || err || "AI request failed").slice(0, 400);
        controller.enqueue(enc.encode(`${chars ? "\n\n" : ""}⚠️ ${msg}`));
        controller.close();
        await onDone?.(chars, true);
      }
    },
    async cancel() {
      await gen.return?.(undefined);
    },
  });
}

/** Collect a full completion (short server-side tasks, key tests). */
export async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let out = "";
  for await (const t of gen) out += t;
  return out;
}

// ── Speech-to-text (Clipper) ───────────────────────────────────────────────
export interface Word { word: string; start: number; end: number }
export interface Transcript { text: string; words: Word[]; language?: string; duration?: number }

export async function transcribe(c: Connection, audio: Blob, filename = "audio.webm", language?: string): Promise<Transcript> {
  if (c.provider === "deepgram") {
    const qs = new URLSearchParams({ model: c.model || "nova-3", smart_format: "true", punctuate: "true", ...(language ? { language } : { detect_language: "true" }) });
    const r = await fetch(`https://api.deepgram.com/v1/listen?${qs}`, {
      method: "POST", headers: { Authorization: `Token ${c.apiKey}`, "Content-Type": audio.type || "audio/webm" }, body: audio,
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Deepgram returned ${r.status}: ${j?.err_msg || j?.message || ""}`.slice(0, 300));
    const alt = j?.results?.channels?.[0]?.alternatives?.[0];
    return {
      text: alt?.transcript || "",
      words: (alt?.words || []).map((w: any) => ({ word: w.punctuated_word || w.word, start: w.start, end: w.end })),
      language: j?.results?.channels?.[0]?.detected_language, duration: j?.metadata?.duration,
    };
  }
  if (c.provider !== "openai" && c.provider !== "groq") throw new Error("Choose OpenAI, Groq or Deepgram for transcription.");
  const fd = new FormData();
  fd.append("file", audio, filename);
  fd.append("model", c.model || providerInfo(c.provider)!.sttModel!);
  fd.append("response_format", "verbose_json");
  fd.append("timestamp_granularities[]", "word");
  fd.append("timestamp_granularities[]", "segment");
  if (language) fd.append("language", language);
  const r = await fetch(`${baseUrlOf(c)}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${c.apiKey}` }, body: fd });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${providerInfo(c.provider)!.name} returned ${r.status}: ${j?.error?.message || ""}`.slice(0, 300));
  return {
    text: j.text || "",
    words: (j.words || []).map((w: any) => ({ word: w.word, start: w.start, end: w.end })),
    language: j.language, duration: j.duration,
  };
}
