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

export type ProviderId =
  | "anthropic" | "openai" | "google" | "groq" | "openrouter" | "perplexity" | "deepseek" | "mistral"
  | "xai" | "together" | "fireworks" | "cerebras" | "deepgram" | "custom";

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
  research?: boolean;          // live web research available (with sources)
}

export const PROVIDERS: ProviderInfo[] = [
  { id: "anthropic", name: "Anthropic Claude", chat: true, stt: false, defaultModel: "claude-opus-5", research: true,
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
  { id: "openrouter", name: "OpenRouter (300+ models)", chat: true, stt: false, defaultModel: "openrouter/auto", research: true,
    models: ["openrouter/auto"], keyHint: "sk-or-…", keyUrl: "https://openrouter.ai/keys", baseUrl: "https://openrouter.ai/api/v1" },
  { id: "perplexity", name: "Perplexity (web-grounded)", chat: true, stt: false, defaultModel: "sonar-pro", research: true,
    models: ["sonar-pro", "sonar", "sonar-reasoning-pro", "sonar-deep-research"], keyHint: "pplx-…", keyUrl: "https://www.perplexity.ai/settings/api",
    baseUrl: "https://api.perplexity.ai" },
  { id: "deepseek", name: "DeepSeek", chat: true, stt: false, defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"], keyHint: "sk-…", keyUrl: "https://platform.deepseek.com/api_keys", baseUrl: "https://api.deepseek.com" },
  { id: "mistral", name: "Mistral AI", chat: true, stt: false, defaultModel: "mistral-large-latest",
    models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"], keyHint: "…", keyUrl: "https://console.mistral.ai/api-keys",
    baseUrl: "https://api.mistral.ai/v1" },
  { id: "xai", name: "xAI Grok", chat: true, stt: false, defaultModel: "grok-4",
    models: ["grok-4", "grok-3-mini"], keyHint: "xai-…", keyUrl: "https://console.x.ai", baseUrl: "https://api.x.ai/v1" },
  { id: "together", name: "Together AI", chat: true, stt: false, defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo"], keyHint: "…", keyUrl: "https://api.together.ai/settings/api-keys", baseUrl: "https://api.together.xyz/v1" },
  { id: "fireworks", name: "Fireworks AI", chat: true, stt: false, defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    models: ["accounts/fireworks/models/llama-v3p3-70b-instruct"], keyHint: "fw_…", keyUrl: "https://fireworks.ai/account/api-keys", baseUrl: "https://api.fireworks.ai/inference/v1" },
  { id: "cerebras", name: "Cerebras", chat: true, stt: false, defaultModel: "llama-3.3-70b",
    models: ["llama-3.3-70b"], keyHint: "csk-…", keyUrl: "https://cloud.cerebras.ai", freeTier: "Cerebras offers a free tier.", baseUrl: "https://api.cerebras.ai/v1" },
  { id: "deepgram", name: "Deepgram (speech-to-text)", chat: false, stt: true, defaultModel: "nova-3", sttModel: "nova-3",
    models: ["nova-3"], keyHint: "…", keyUrl: "https://console.deepgram.com/", freeTier: "Deepgram includes free starter credit." },
  { id: "custom", name: "Your own endpoint (Ollama, vLLM, LM Studio, LiteLLM…)", chat: true, stt: false, defaultModel: "",
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
  research?: boolean;                                       // live web research (see supportsResearch)
}

/** Live web research with sources: Anthropic (web search/fetch tools), OpenRouter (web plugin), Perplexity (built in). */
export const supportsResearch = (c: Pick<Connection, "provider">) => !!providerInfo(c.provider)?.research;

/** In-band status line the apps render as a chip and strip from saved/exported text. */
export const statusLine = (kind: "search" | "fetch" | "note", text: string) => `\n[[axto:${kind}|${text.replace(/[\r\n\]|]+/g, " ").slice(0, 200)}]]\n`;

function sourcesFooter(list: { url: string; title?: string }[]): string {
  const seen = new Set<string>();
  const uniq = list.filter((x) => x.url && !seen.has(x.url) && seen.add(x.url));
  if (!uniq.length) return "";
  return `\n\n---\n**Sources retrieved during live research (accessed ${new Date().toISOString().slice(0, 10)}):**\n` +
    uniq.slice(0, 40).map((x, i) => `${i + 1}. [${(x.title || x.url).replace(/[\[\]]/g, "")}](${x.url})`).join("\n") + "\n";
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
function anthropicWebTools(model: string): any[] {
  const dynamic = /^claude-(opus-5|fable-5|sonnet-5|opus-4-[678]|sonnet-4-6)/.test(model);
  return dynamic
    ? [{ type: "web_search_20260209", name: "web_search", max_uses: 10 }, { type: "web_fetch_20260209", name: "web_fetch", max_uses: 10 }]
    : [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }];
}

async function* anthropicStream(c: Connection, system: string, messages: ChatMessage[], o: GenOptions): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey: c.apiKey, maxRetries: 2 });
  // Server-side refusal fallbacks are opted into for the models that support them.
  const supportsFallbacks = /^claude-(opus-5|fable-5)/.test(c.model);
  let research = !!o.research;
  const convo: any[] = messages.map((m) => ({ role: m.role, content: m.content }));
  const sources: { url: string; title?: string }[] = [];
  for (let turn = 0; turn < 6; turn++) {
    const params: any = {
      model: c.model,
      max_tokens: o.maxOutputTokens || 64000,
      system,
      messages: convo,
      ...(research ? { tools: anthropicWebTools(c.model) } : {}),
      ...(o.effort ? { output_config: { effort: o.effort } } : {}),
      ...(supportsFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
    };
    const stream = client.beta.messages.stream(params);
    const toolInput = new Map<number, { name: string; json: string }>();
    let emitted = false;
    try {
      for await (const ev of stream as any) {
        if (ev.type === "content_block_start" && ev.content_block?.type === "server_tool_use") {
          toolInput.set(ev.index, { name: ev.content_block.name, json: "" });
        } else if (ev.type === "content_block_delta" && ev.delta?.type === "input_json_delta" && toolInput.has(ev.index)) {
          toolInput.get(ev.index)!.json += ev.delta.partial_json || "";
        } else if (ev.type === "content_block_stop" && toolInput.has(ev.index)) {
          const t = toolInput.get(ev.index)!;
          let input: any = {};
          try { input = JSON.parse(t.json || "{}"); } catch {}
          if (t.name === "web_search" && input.query) yield statusLine("search", input.query);
          else if (t.name === "web_fetch" && input.url) yield statusLine("fetch", input.url);
        } else if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
          emitted = true;
          yield ev.delta.text;
        } else if (ev.type === "content_block_delta" && ev.delta?.type === "citations_delta") {
          const ci = ev.delta.citation;
          if (ci?.url) sources.push({ url: ci.url, title: ci.title });
        }
      }
    } catch (err: any) {
      // Web search can be disabled for an organisation: continue without it rather than fail.
      if (research && !emitted && /web.?search|web.?fetch|tool/i.test(String(err?.message || ""))) {
        research = false;
        yield statusLine("note", "Live research is not enabled for this Anthropic key — answering from the model's knowledge.");
        turn--;
        continue;
      }
      throw err;
    }
    const final: any = await stream.finalMessage();
    for (const b of final?.content || []) {
      for (const ci of b?.citations || []) if (ci?.url) sources.push({ url: ci.url, title: ci.title });
    }
    if (final?.stop_reason === "pause_turn") {
      convo.push({ role: "assistant", content: final.content });   // server resumes the paused tool loop
      continue;
    }
    if (final?.stop_reason === "refusal") yield "\n\n_The model declined this request. Try rephrasing it._";
    if (final?.stop_reason === "max_tokens") yield "\n\n_(The answer reached the maximum length — ask it to continue.)_";
    break;
  }
  yield sourcesFooter(sources);
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

async function* openAICompatibleStream(c: Connection, system: string, messages: ChatMessage[], o: GenOptions = {}): AsyncGenerator<string> {
  const info = providerInfo(c.provider)!;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (c.apiKey) headers.Authorization = `Bearer ${c.apiKey}`;
  if (c.provider === "openrouter") { headers["HTTP-Referer"] = "https://axto.io"; headers["X-Title"] = "AXTO"; }
  const body: any = { model: c.model, stream: true, messages: [{ role: "system", content: system }, ...messages] };
  if (o.maxOutputTokens) body.max_tokens = o.maxOutputTokens;
  if (o.research && c.provider === "openrouter") body.plugins = [{ id: "web", max_results: 8 }];
  const r = await fetch(`${baseUrlOf(c)}/chat/completions`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!r.ok || !r.body) {
    const t = await r.text().catch(() => "");
    throw new Error(`${info.name} returned ${r.status}${t ? `: ${t.slice(0, 300)}` : ""}`);
  }
  const sources: { url: string; title?: string }[] = [];
  yield* readSse(r.body, (j) => {
    for (const a of j?.choices?.[0]?.delta?.annotations || j?.choices?.[0]?.message?.annotations || []) {
      const u = a?.url_citation || a;
      if (u?.url) sources.push({ url: u.url, title: u.title });
    }
    if (Array.isArray(j?.search_results)) {
      for (const x of j.search_results) if (x?.url) sources.push({ url: x.url, title: x.title });
    } else if (Array.isArray(j?.citations)) {
      for (const u of j.citations) if (typeof u === "string") sources.push({ url: u });
    }
    return j?.choices?.[0]?.delta?.content;
  });
  if (o.research || c.provider === "perplexity") yield sourcesFooter(sources);
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
  const opts = { ...o, research: !!o.research && supportsResearch(c) };
  return c.provider === "anthropic" ? anthropicStream(c, system, messages, opts) : openAICompatibleStream(c, system, messages, opts);
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

/** Models available on the member's own account (BYOM picker). Falls back to our suggestions. */
export async function listModels(c: Connection): Promise<string[]> {
  const info = providerInfo(c.provider)!;
  const suggestions = info.models;
  try {
    if (c.provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": c.apiKey, "anthropic-version": "2023-06-01" }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`Anthropic returned ${r.status}`);
      const j: any = await r.json();
      const ids = (j?.data || []).map((m: any) => String(m.id)).filter(Boolean);
      return ids.length ? ids : suggestions;
    }
    if (!info.chat || c.provider === "perplexity") return suggestions;
    const headers: Record<string, string> = {};
    if (c.apiKey) headers.Authorization = `Bearer ${c.apiKey}`;
    const r = await fetch(`${baseUrlOf(c)}/models`, { headers, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`${info.name} returned ${r.status}`);
    const j: any = await r.json();
    const list: any[] = Array.isArray(j?.data) ? j.data : Array.isArray(j?.models) ? j.models : [];
    const ids = list.map((m: any) => String(m?.id || m?.name || "").replace(/^models\//, "")).filter(Boolean);
    const chatty = ids.filter((id) => !/(embed|whisper|tts|dall-e|moderation|audio|image|transcribe|rerank|guard)/i.test(id));
    return chatty.length ? [...new Set(chatty)].sort() : suggestions;
  } catch (e) {
    if (c.provider === "custom") throw e;
    return suggestions;
  }
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
