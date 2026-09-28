/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * CLIPPER — client-safe constants and pure helpers shared by the page, the AI
 * task handler and the tests: platforms, aspect ratios, caption styles, a
 * timestamped-transcript builder and a robust clip-JSON parser + SRT/VTT export.
 * ============================================================================ */

export type Aspect = "9:16" | "1:1" | "16:9";
export interface Platform { id: string; name: string; aspect: Aspect; maxSec: number; blurb: string }

export const PLATFORMS: Platform[] = [
  { id: "tiktok", name: "TikTok", aspect: "9:16", maxSec: 90, blurb: "Vertical, punchy, hook in the first second." },
  { id: "reels", name: "Instagram Reels", aspect: "9:16", maxSec: 90, blurb: "Vertical, aesthetic, strong caption." },
  { id: "shorts", name: "YouTube Shorts", aspect: "9:16", maxSec: 60, blurb: "Vertical, ≤60s, curiosity-driven." },
  { id: "linkedin", name: "LinkedIn", aspect: "1:1", maxSec: 120, blurb: "Square, insight-led, professional." },
  { id: "x", name: "X / Twitter", aspect: "16:9", maxSec: 140, blurb: "Landscape or square, quotable." },
  { id: "youtube", name: "YouTube (long)", aspect: "16:9", maxSec: 180, blurb: "Landscape highlight for a longer edit." },
];
export const getPlatform = (id: string) => PLATFORMS.find((p) => p.id === id) || PLATFORMS[0];

export const CAPTION_STYLES = [
  { id: "bold", name: "Bold", blurb: "Big white text, black outline — the classic look." },
  { id: "minimal", name: "Minimal", blurb: "Clean lower-third, subtle background." },
  { id: "karaoke", name: "Karaoke", blurb: "Word-by-word highlight (needs word timings)." },
  { id: "none", name: "No captions", blurb: "Export the clip without burned-in captions." },
] as const;
export type CaptionStyle = (typeof CAPTION_STYLES)[number]["id"];

export interface Word { word: string; start: number; end: number }
export interface Clip { title: string; start: number; end: number; hook?: string; summary?: string; hashtags?: string[]; caption?: string; score?: number }

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(r).padStart(2, "0")}`;
}

/** Compact, timestamped transcript for the model: one line per ~parasec window. */
export function transcriptForModel(words: Word[], windowSec = 6): string {
  if (!words.length) return "";
  const lines: string[] = [];
  let bucketStart = words[0].start, buf: string[] = [];
  const flush = () => { if (buf.length) lines.push(`[${bucketStart.toFixed(1)}] ${buf.join(" ")}`); };
  for (const w of words) {
    if (w.start - bucketStart >= windowSec && buf.length) { flush(); bucketStart = w.start; buf = []; }
    buf.push(w.word);
  }
  flush();
  return lines.join("\n").slice(0, 120_000);
}

/** Robustly parse the model's clip list from text (fenced JSON, raw JSON, or {clips:[…]}). */
export function parseClips(text: string, duration = Infinity): Clip[] {
  let raw = String(text || "");
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1];
  let data: any = null;
  try { data = JSON.parse(raw.trim()); } catch {
    const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
    if (a >= 0 && b > a) { try { data = JSON.parse(raw.slice(a, b + 1)); } catch {} }
  }
  const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.clips) ? data.clips : [];
  const out: Clip[] = [];
  for (const c of arr) {
    const start = Number(c?.start), end = Number(c?.end);
    if (!isFinite(start) || !isFinite(end) || end <= start) continue;
    out.push({
      title: String(c?.title || "Untitled clip").slice(0, 120),
      start: clamp(start, 0, duration), end: clamp(end, 0, duration),
      hook: c?.hook ? String(c.hook).slice(0, 200) : undefined,
      summary: c?.summary ? String(c.summary).slice(0, 400) : undefined,
      hashtags: Array.isArray(c?.hashtags) ? c.hashtags.map((h: any) => String(h).replace(/^#/, "").slice(0, 40)).filter(Boolean).slice(0, 12) : undefined,
      caption: c?.caption ? String(c.caption).slice(0, 600) : undefined,
      score: isFinite(Number(c?.score)) ? clamp(Number(c.score), 0, 100) : undefined,
    });
  }
  return out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 20);
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
function stamp(sec: number, sep: string): string {
  const ms = Math.round((sec % 1) * 1000), s = Math.floor(sec);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}${sep}${pad(ms, 3)}`;
}
/** Build an .srt (sep=",") or .vtt (sep=".") captions file for a clip window from word timings. */
export function buildCaptions(words: Word[], start: number, end: number, format: "srt" | "vtt" = "srt", maxLineWords = 7): string {
  const inClip = words.filter((w) => w.end > start && w.start < end);
  const cues: { s: number; e: number; text: string }[] = [];
  for (let i = 0; i < inClip.length; i += maxLineWords) {
    const grp = inClip.slice(i, i + maxLineWords);
    cues.push({ s: Math.max(0, grp[0].start - start), e: Math.max(0, grp[grp.length - 1].end - start), text: grp.map((w) => w.word).join(" ") });
  }
  const sep = format === "srt" ? "," : ".";
  const body = cues.map((c, i) => `${format === "srt" ? `${i + 1}\n` : ""}${stamp(c.s, sep)} --> ${stamp(c.e, sep)}\n${c.text}`).join("\n\n");
  return (format === "vtt" ? "WEBVTT\n\n" : "") + body + "\n";
}
