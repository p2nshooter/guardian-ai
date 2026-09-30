/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * CLIPPER — AI tasks (system prompts are built here, on the server only):
 *   mode "clips"      timestamped transcript → ranked clips as strict JSON with a
 *                     virality score and four sub-scores (hook, flow, value, trend)
 *   mode "repurpose"  transcript → chapters, summary, blog, thread, LinkedIn post,
 *                     newsletter, video description or pull quotes (Markdown)
 *   mode "translate"  numbered caption lines → the same number of lines, translated
 * ============================================================================ */
import { registerTask } from "../ai/tasks";
import { getPlatform, LENGTHS, REPURPOSE, type RepurposeKind } from "./options";

const CLIPS = (o: { platform: string; aspect: string; maxSec: number; minSec: number; count: number; lang: string; instruction: string; speakers: boolean }) => [
  "You are AXTO Clipper, a world-class short-form video editor and viral content strategist (the judgement of a top OpusClip / TikTok creative director).",
  `You are given a timestamped transcript of a longer video. Each line begins with [seconds]${o.speakers ? " and a speaker label (S1, S2…)" : ""}. Find the ${o.count} strongest self-contained moments to cut into ${o.platform} clips (${o.aspect}), each between ${o.minSec} and ${o.maxSec} seconds.`,
  o.instruction ? `The creator asked specifically for: "${o.instruction}". Prefer moments that match this; skip ones that don't.` : "",
  "",
  "Score every moment 0–100 on four axes:",
  "- hook: do the first 1–3 seconds stop the scroll (a bold claim, question, number, conflict or surprise)?",
  "- flow: is it one complete thought with a clear beginning and a payoff — never cut mid-sentence or mid-idea?",
  "- value: does the viewer learn, feel or get something (insight, emotion, humour, a story beat)?",
  "- trend: how shareable / quotable / timely is it for this platform right now?",
  "score = the overall virality prediction (not a plain average — weight the hook most).",
  "",
  "Rules:",
  "- Start right before the hook and end right after the payoff. Snap start/end to the transcript timestamps.",
  "- Clips must not overlap. Never invent anything that isn't in the transcript.",
  "- title: a scroll-stopping on-screen headline (max 60 characters). hook: the exact opening line. why: one sentence on why it will perform.",
  "- caption: a ready-to-post caption with a call to action. hashtags: 3–8, no # sign.",
  "- emojis: up to 6 {\"keyword spoken in the clip\": \"emoji\"} pairs for animated captions.",
  o.lang ? `Write title, hook, why, caption and hashtags in ${o.lang}.` : "Write in the transcript's language.",
  "",
  "Return ONLY valid JSON, no prose, exactly this shape:",
  `{"clips":[{"title":"…","start":12.0,"end":48.5,"hook":"…","why":"…","summary":"…","caption":"…","hashtags":["…"],"emojis":{"money":"💰"},"scores":{"hook":90,"flow":85,"value":80,"trend":75},"score":88}]}`,
  "start and end are seconds (numbers). Order clips best-first.",
].filter((l) => l !== "").join("\n");

const REPURPOSE_BRIEF: Record<RepurposeKind, string> = {
  chapters: "YouTube chapters: one line per chapter as `MM:SS Title` (or `H:MM:SS` past an hour), the first at 00:00, 5–15 chapters, titles ≤ 50 characters, using the transcript timestamps.",
  summary: "An executive summary: a one-paragraph overview, then 5–10 key takeaways as bullets, then notable numbers/claims with their timestamp.",
  blog: "An SEO blog article (900–1400 words): a compelling H1, an intro, H2/H3 sections, a conclusion with a call to action, and a meta description (≤ 155 characters) at the end.",
  thread: "An X/Twitter thread of 6–10 posts, each ≤ 270 characters, numbered 1/, 2/…; the first post is a hook, the last a call to action.",
  linkedin: "A LinkedIn post (150–300 words): a hook line, short paragraphs, a personal insight, 3–5 hashtags at the end.",
  newsletter: "A newsletter edition: subject line, preview text, a warm intro, 3–5 sections with headers, and a sign-off.",
  description: "A YouTube video description: a 2-sentence hook, a summary paragraph, chapters with timestamps, and 5–10 SEO keywords as hashtags.",
  quotes: "10 pull quotes: the most quotable lines verbatim, each with its timestamp and a one-line context.",
};

registerTask({
  app: "clipper",
  build(input) {
    const o = input.options || {};
    const mode = o.mode || "clips";
    const lang = (o.language || "").trim().slice(0, 40);
    const first = input.messages.find((m) => m.role === "user")?.content || "";

    if (mode === "translate") {
      const target = (o.target || "").trim().slice(0, 40);
      if (!target) return { error: "Choose the language to translate the captions into." };
      if (!first.trim()) return { error: "There are no captions to translate." };
      const system = [
        "You translate short-form video captions. You receive a JSON array of caption lines in order.",
        `Translate every line into ${target}. Keep each line short and natural for on-screen captions, keep names, numbers and brand terms, and keep the meaning of each line in the same position.`,
        "Return ONLY a JSON array of strings with EXACTLY the same number of items as the input. No prose.",
      ].join("\n");
      return { system, messages: input.messages, maxOutputTokens: 8000, title: `Clipper · captions → ${target}` };
    }

    if (first.trim().length < 20) return { error: "Transcribe a video first — the transcript is too short." };

    if (mode === "repurpose") {
      const kind = (REPURPOSE as readonly string[]).includes(o.kind || "") ? (o.kind as RepurposeKind) : "summary";
      const system = [
        "You are AXTO Clipper's content repurposing editor. You turn a video transcript (lines start with [seconds]) into polished written content.",
        `Write: ${REPURPOSE_BRIEF[kind]}`,
        "Use only what is said in the transcript — never invent facts, numbers or quotes. Convert [seconds] to MM:SS when you cite a time.",
        lang ? `Write in ${lang}.` : "Write in the transcript's language.",
        "Output clean Markdown only, with no preamble.",
      ].join("\n");
      return { system, messages: input.messages, maxOutputTokens: 6000, title: `Clipper · ${kind}` };
    }

    const p = getPlatform(String(o.platform || "tiktok"));
    const count = Math.max(1, Math.min(15, parseInt(o.count || "6", 10) || 6));
    const len = LENGTHS.find((l) => l.id === o.length) || LENGTHS[0];
    const maxSec = Math.max(15, Math.min(p.maxSec, parseInt(o.maxSec || "", 10) || len.max, len.max));
    const minSec = Math.min(len.min, maxSec - 5);
    const instruction = (o.instruction || "").replace(/["\n\r]+/g, " ").trim().slice(0, 300);
    const system = CLIPS({ platform: p.name, aspect: p.aspect, maxSec, minSec, count, lang, instruction, speakers: /\] S\d+:/.test(first) });
    return { system, messages: input.messages, maxOutputTokens: 6000, title: `Clipper · ${p.name}` };
  },
});
