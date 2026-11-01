/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * CLIPPER — browser calls: the member's own AI (streamed), the member's own
 * speech-to-text (one job, several parts for a long video), and project I/O.
 * ============================================================================ */
"use client";
import { stripStatus } from "@/lib/markdown";
import { mergeTranscripts } from "./edit";
import type { Word } from "./options";
import { aiFetch } from "@/lib/ai/client-run";

export interface AiResult { text: string; error?: string; needKey?: boolean; upgrade?: boolean }

/** Stream a Clipper AI task on the member's key; `onText` gets the text so far. */
export async function runAi(body: { options: Record<string, string>; content: string; provider: string; model: string }, onText?: (s: string) => void, signal?: AbortSignal): Promise<AiResult> {
  let acc = "";
  try {
    const res = await aiFetch({
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", signal,
      body: JSON.stringify({ app: "clipper", messages: [{ role: "user", content: body.content }], provider: body.provider, model: body.model, options: body.options }),
    });
    if (!res.ok || !res.body) {
      const j: any = await res.json().catch(() => ({}));
      return { text: "", error: j.error || `Request failed (${res.status})`, needKey: !!j.needKey, upgrade: !!j.upgrade };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += dec.decode(value, { stream: true });
      onText?.(stripStatus(acc));
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return { text: stripStatus(acc), error: "aborted" };
    return { text: stripStatus(acc), error: String(e?.message || e) };
  }
  return { text: stripStatus(acc) };
}

export interface SttResult { text: string; words: Word[]; duration?: number; language?: string; provider?: string; error?: string; needKey?: boolean; upgrade?: boolean }

/** Transcribe one or more audio parts as ONE Clipper video (one quota slot). */
export async function transcribeParts(parts: { blob: Blob; offset: number; name?: string }[], o: { language?: string; provider?: string; onPart?: (i: number, n: number) => void; signal?: AbortSignal } = {}): Promise<SttResult> {
  const job = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join("");
  const done: { offset: number; text: string; words: Word[] }[] = [];
  let lang: string | undefined, provider: string | undefined, lastDuration = 0;
  for (let i = 0; i < parts.length; i++) {
    o.onPart?.(i, parts.length);
    const fd = new FormData();
    fd.append("audio", parts[i].blob, parts[i].name || `part${i}.mp3`);
    if (o.language) fd.append("language", o.language);
    if (o.provider) fd.append("provider", o.provider);
    fd.append("job", job);
    fd.append("part", String(i));
    fd.append("parts", String(parts.length));
    let res: Response;
    try {
      res = await fetch("/api/clipper/transcribe", { method: "POST", body: fd, credentials: "include", signal: o.signal });
    } catch (e: any) {
      return { text: "", words: [], error: e?.name === "AbortError" ? "aborted" : String(e?.message || e) };
    }
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) return { text: "", words: [], error: j.error || `Transcription failed (${res.status})`, needKey: !!j.needKey, upgrade: !!j.upgrade };
    done.push({ offset: parts[i].offset, text: j.text || "", words: j.words || [] });
    lang = lang || j.language; provider = j.provider;
    if (j.duration) lastDuration = parts[i].offset + j.duration;
  }
  const m = mergeTranscripts(done);
  return { ...m, duration: lastDuration || undefined, language: lang, provider };
}
