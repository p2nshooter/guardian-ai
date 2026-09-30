/* PROMPT LIBRARY v4 — one streaming call to the member's own model. */
"use client";
import { stripStatus } from "@/lib/markdown";
import type { AiChoice } from "@/components/ai/ModelPicker";

export interface Msg { role: "user" | "assistant"; content: string }
export interface RunResult { ok: boolean; text: string; error?: string; needKey?: boolean; meta: string }

export async function streamRun(o: {
  ai: AiChoice; mode: "run" | "optimize" | "chain"; messages: Msg[]; promptId?: string; values?: Record<string, string>; previous?: string; signal?: AbortSignal; onText?: (t: string) => void;
}): Promise<RunResult> {
  const options: Record<string, string> = { mode: o.mode, research: o.ai.research ? "1" : "0" };
  if (o.promptId) { options.promptId = o.promptId; options.values = JSON.stringify(o.values || {}); }
  if (o.previous) options.previous = o.previous;
  let acc = "", meta = "";
  try {
    const res = await fetch("/api/byox/run", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", signal: o.signal,
      body: JSON.stringify({ app: "prompts", task: o.mode, messages: o.messages, provider: o.ai.provider, model: o.ai.model, options }) });
    if (!res.ok || !res.body) { const j: any = await res.json().catch(() => ({})); return { ok: false, text: "", error: j.error || `Request failed (${res.status})`, needKey: j.needKey, meta }; }
    meta = `${res.headers.get("X-AI-Provider") || ""} · ${decodeURIComponent(res.headers.get("X-AI-Model") || "")}`;
    const reader = res.body.getReader(); const dec = new TextDecoder(); let last = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); if (o.onText && Date.now() - last > 60) { o.onText(stripStatus(acc)); last = Date.now(); } }
  } catch (e: any) { if (e?.name !== "AbortError") return { ok: false, text: stripStatus(acc), error: String(e?.message || e), meta }; }
  const text = stripStatus(acc);
  o.onText?.(text);
  return { ok: true, text, meta };
}
