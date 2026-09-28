/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * CLIPPER — registers the highlight-detection task. Given a timestamped
 * transcript, the model returns a ranked list of short, shareable clips as
 * strict JSON (title, start/end seconds, hook, hashtags, caption, score).
 * ============================================================================ */
import { registerTask } from "../ai/tasks";
import { getPlatform } from "./options";

const SYS = (platform: string, aspect: string, maxSec: number, count: number, lang: string) => [
  "You are AXTO Clipper, an expert short-form video editor and viral content strategist.",
  `You are given a timestamped transcript of a longer video (each line begins with [seconds]). Find the ${count} strongest self-contained moments to cut into ${platform} clips (${aspect}, up to ${maxSec}s each).`,
  "Score each moment for: a strong hook in the first 1–2 seconds, a complete thought (don't cut mid-idea), emotional or informational payoff, quotability, and standalone clarity without the surrounding context.",
  "Choose start/end so the clip begins right before the hook and ends on the payoff. Prefer 15–60s. Never invent content that isn't in the transcript.",
  lang ? `Write titles, hooks, captions and hashtags in ${lang}.` : "Write in the transcript's language.",
  "",
  "Return ONLY valid JSON, no prose, in exactly this shape:",
  `{"clips":[{"title":"…","start":12.0,"end":48.5,"hook":"the first line that stops the scroll","summary":"one sentence on why it works","hashtags":["…"],"caption":"a ready-to-post caption","score":92}]}`,
  "start and end are seconds (numbers) from the transcript timestamps. score is 0–100. Order clips best-first.",
].join("\n");

registerTask({
  app: "clipper",
  build(input) {
    const p = getPlatform(String(input.options?.platform || "tiktok"));
    const count = Math.max(1, Math.min(12, parseInt(input.options?.count || "6", 10) || 6));
    const lang = (input.options?.language || "").trim().slice(0, 40);
    const maxSec = Math.max(15, Math.min(180, parseInt(input.options?.maxSec || "", 10) || p.maxSec));
    const system = SYS(p.name, p.aspect, maxSec, count, lang);
    const first = input.messages.find((m) => m.role === "user")?.content || "";
    if (first.trim().length < 20) return { error: "Transcribe a video first — the transcript is too short to find clips." };
    return { system, messages: input.messages, maxOutputTokens: 4000, title: `Clipper · ${p.name}` };
  },
});
