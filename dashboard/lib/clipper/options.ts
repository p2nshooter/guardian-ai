/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * CLIPPER — client-safe constants and pure helpers shared by the page, the AI
 * task handler and the tests: platforms, aspect ratios, caption templates,
 * the per-clip edit model, a timestamped-transcript builder, a robust clip-JSON
 * parser (with virality sub-scores) and SRT/VTT export.
 * ============================================================================ */

export type Aspect = "9:16" | "1:1" | "4:5" | "16:9";
export const ASPECTS: Aspect[] = ["9:16", "4:5", "1:1", "16:9"];
export interface Platform { id: string; name: string; aspect: Aspect; maxSec: number; blurb: string }

export const PLATFORMS: Platform[] = [
  { id: "tiktok", name: "TikTok", aspect: "9:16", maxSec: 90, blurb: "Vertical, punchy, hook in the first second." },
  { id: "reels", name: "Instagram Reels", aspect: "9:16", maxSec: 90, blurb: "Vertical, aesthetic, strong caption." },
  { id: "shorts", name: "YouTube Shorts", aspect: "9:16", maxSec: 60, blurb: "Vertical, ≤60s, curiosity-driven." },
  { id: "feed", name: "Instagram / Facebook feed", aspect: "4:5", maxSec: 90, blurb: "Portrait feed post, readable without sound." },
  { id: "linkedin", name: "LinkedIn", aspect: "1:1", maxSec: 120, blurb: "Square, insight-led, professional." },
  { id: "x", name: "X / Twitter", aspect: "16:9", maxSec: 140, blurb: "Landscape or square, quotable." },
  { id: "youtube", name: "YouTube (long)", aspect: "16:9", maxSec: 180, blurb: "Landscape highlight for a longer edit." },
];
export const getPlatform = (id: string) => PLATFORMS.find((p) => p.id === id) || PLATFORMS[0];

/** Output pixel size for an aspect at a quality. */
export function outputSize(aspect: Aspect, quality: "720" | "1080" = "1080"): [number, number] {
  const s = quality === "720" ? 720 : 1080;
  switch (aspect) {
    case "9:16": return [s, Math.round((s * 16) / 9)];
    case "4:5": return [s, Math.round((s * 5) / 4)];
    case "1:1": return [s, s];
    default: return [Math.round((s * 16) / 9), s];
  }
}

export type ClipLength = "auto" | "short" | "medium" | "long";
export const LENGTHS: { id: ClipLength; min: number; max: number }[] = [
  { id: "auto", min: 15, max: 90 }, { id: "short", min: 15, max: 30 }, { id: "medium", min: 30, max: 60 }, { id: "long", min: 60, max: 90 },
];

// ── Caption templates ────────────────────────────────────────────────────────
export type CaptionAnim = "pop" | "karaoke" | "box" | "none" | "typewriter" | "glow" | "bounce";
export interface CaptionTemplate {
  id: string; name: string;
  font: string; weight: number;
  size: number;                   // font size as a share of the output WIDTH
  color: string; highlight: string;
  stroke: string; strokeWidth: number;   // outline, share of font size
  shadow: string;                 // "" = none
  box: string;                    // background box behind the line, "" = none
  uppercase: boolean; wordsPerLine: number; lines: number;
  anim: CaptionAnim; emoji: boolean;
}
export const TEMPLATES: CaptionTemplate[] = [
  { id: "bold", name: "Bold Pop", font: "Montserrat", weight: 900, size: 0.078, color: "#ffffff", highlight: "#facc15", stroke: "#000000", strokeWidth: 0.16, shadow: "rgba(0,0,0,.55)", box: "", uppercase: true, wordsPerLine: 3, lines: 1, anim: "pop", emoji: false },
  { id: "karaoke", name: "Karaoke", font: "Poppins", weight: 800, size: 0.064, color: "#ffffff", highlight: "#22c55e", stroke: "#000000", strokeWidth: 0.14, shadow: "", box: "", uppercase: false, wordsPerLine: 4, lines: 2, anim: "karaoke", emoji: false },
  { id: "boxed", name: "Highlight Box", font: "Montserrat", weight: 800, size: 0.066, color: "#ffffff", highlight: "#7c3aed", stroke: "", strokeWidth: 0, shadow: "rgba(0,0,0,.35)", box: "", uppercase: true, wordsPerLine: 3, lines: 1, anim: "box", emoji: false },
  { id: "minimal", name: "Minimal", font: "Poppins", weight: 700, size: 0.05, color: "#ffffff", highlight: "#ffffff", stroke: "", strokeWidth: 0, shadow: "", box: "rgba(0,0,0,.62)", uppercase: false, wordsPerLine: 6, lines: 2, anim: "none", emoji: false },
  { id: "neon", name: "Neon", font: "Bebas Neue", weight: 400, size: 0.1, color: "#e0f2fe", highlight: "#22d3ee", stroke: "", strokeWidth: 0, shadow: "#06b6d4", box: "", uppercase: true, wordsPerLine: 3, lines: 1, anim: "glow", emoji: false },
  { id: "typewriter", name: "Typewriter", font: "Poppins", weight: 800, size: 0.062, color: "#ffffff", highlight: "#fb923c", stroke: "#000000", strokeWidth: 0.12, shadow: "", box: "", uppercase: false, wordsPerLine: 4, lines: 2, anim: "typewriter", emoji: false },
  { id: "subtle", name: "Subtle", font: "Poppins", weight: 700, size: 0.046, color: "#ffffff", highlight: "#ffffff", stroke: "", strokeWidth: 0, shadow: "rgba(0,0,0,.85)", box: "", uppercase: false, wordsPerLine: 7, lines: 2, anim: "none", emoji: false },
  { id: "emoji", name: "Emoji Burst", font: "Bangers", weight: 400, size: 0.09, color: "#ffffff", highlight: "#f472b6", stroke: "#111827", strokeWidth: 0.14, shadow: "rgba(0,0,0,.5)", box: "", uppercase: true, wordsPerLine: 2, lines: 1, anim: "bounce", emoji: true },
];
export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
export const FONTS = ["Montserrat", "Poppins", "Anton", "Bebas Neue", "Bangers"];

/** Font files served from /vendor/fonts (see scripts/vendor.mjs). */
export const FONT_FILES: { family: string; weight: number; file: string }[] = [
  { family: "Anton", weight: 400, file: "anton" }, { family: "Bebas Neue", weight: 400, file: "bebas-neue" }, { family: "Bangers", weight: 400, file: "bangers" },
  { family: "Montserrat", weight: 800, file: "montserrat" }, { family: "Montserrat", weight: 900, file: "montserrat" },
  { family: "Poppins", weight: 700, file: "poppins" }, { family: "Poppins", weight: 800, file: "poppins" },
];

// ── The editable state of one clip ───────────────────────────────────────────
export type Layout = "fill" | "fit" | "split";
export type ReframeMode = "auto" | "manual" | "center";
export interface CaptionStyle {
  template: string; font: string; weight: number; size: number; color: string; highlight: string;
  stroke: string; strokeWidth: number; shadow: string; box: string; uppercase: boolean;
  wordsPerLine: number; lines: number; anim: CaptionAnim; emoji: boolean;
  position: number;               // vertical centre of the captions, 0 = top … 1 = bottom
  show: boolean;
}
export function styleFromTemplate(id: string, keep?: Partial<CaptionStyle>): CaptionStyle {
  const t = getTemplate(id);
  return {
    template: t.id, font: t.font, weight: t.weight, size: t.size, color: t.color, highlight: t.highlight,
    stroke: t.stroke, strokeWidth: t.strokeWidth, shadow: t.shadow, box: t.box, uppercase: t.uppercase,
    wordsPerLine: t.wordsPerLine, lines: t.lines, anim: t.anim, emoji: t.emoji,
    position: keep?.position ?? 0.72, show: keep?.show ?? true,
  };
}

export interface ClipEdit {
  start: number; end: number;               // clip window (source seconds)
  cuts: { start: number; end: number }[];   // manual cuts (deleted words)
  removeFillers: boolean; removeSilence: boolean;
  layout: Layout; reframe: ReframeMode; manualX: number; zoom: number;
  track?: { t: number; cx: number; cx2?: number; cut?: boolean }[];
  twoFaces?: number;                        // share of frames with two faces (offers split)
  captions: CaptionStyle;
  edits: Record<number, string>;            // corrected caption words, by word index
  translated?: { lang: string; lines: { start: number; end: number; text: string }[] };
  hook: { show: boolean; text: string; seconds: number };
  progress: boolean;
}
export function defaultEdit(c: { start: number; end: number; title?: string; hook?: string }, brand?: Partial<BrandKit>): ClipEdit {
  const captions = styleFromTemplate(brand?.template || "bold");
  if (brand?.font) captions.font = brand.font;
  if (brand?.highlight) captions.highlight = brand.highlight;
  return {
    start: c.start, end: c.end, cuts: [], removeFillers: true, removeSilence: false,
    layout: "fill", reframe: "center", manualX: 0.5, zoom: 1,
    captions, edits: {},
    hook: { show: true, text: (c.title || c.hook || "").slice(0, 80), seconds: 3 },
    progress: brand?.progress ?? true,
  };
}

export interface BrandKit {
  logo: string;                   // data: URL (≤ 300 KB), "" = none
  logoPos: "tl" | "tr" | "bl" | "br";
  logoSize: number;               // share of output width
  logoOpacity: number;
  template: string; font: string; highlight: string;
  hookBg: string; hookColor: string;
  progress: boolean; progressColor: string;
}
export const DEFAULT_BRAND: BrandKit = {
  logo: "", logoPos: "tr", logoSize: 0.16, logoOpacity: 0.9,
  template: "bold", font: "", highlight: "",
  hookBg: "#ffffff", hookColor: "#111827", progress: true, progressColor: "#facc15",
};

// ── Transcript + clips ───────────────────────────────────────────────────────
export interface Word { word: string; start: number; end: number; speaker?: number }
export interface Scores { hook: number; flow: number; value: number; trend: number }
export interface Clip {
  title: string; start: number; end: number; hook?: string; summary?: string; hashtags?: string[]; caption?: string;
  score?: number; scores?: Scores; why?: string; emojis?: Record<string, string>;
}

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(r).padStart(2, "0")}`;
}
export const fmtPrecise = (sec: number) => `${fmtTime(sec)}.${Math.floor((Math.max(0, sec) % 1) * 10)}`;

/** Compact, timestamped transcript for the model: one line per ~windowSec, with speaker labels when known. */
export function transcriptForModel(words: Word[], windowSec = 6): string {
  if (!words.length) return "";
  const lines: string[] = [];
  let bucketStart = words[0].start, buf: string[] = [], spk = words[0].speaker;
  const flush = () => { if (buf.length) lines.push(`[${bucketStart.toFixed(1)}]${spk !== undefined ? ` S${spk + 1}:` : ""} ${buf.join(" ")}`); };
  for (const w of words) {
    if ((w.start - bucketStart >= windowSec || (w.speaker !== undefined && w.speaker !== spk)) && buf.length) { flush(); bucketStart = w.start; buf = []; spk = w.speaker; }
    buf.push(w.word);
  }
  flush();
  return lines.join("\n").slice(0, 400_000);
}

const num = (v: unknown, lo = 0, hi = 100) => { const n = Number(v); return isFinite(n) ? clamp(Math.round(n), lo, hi) : undefined; };

/** Pull the JSON object/array out of a model reply (fenced, raw, or with prose around it). */
export function extractJson(text: string): any {
  let raw = String(text || "");
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1];
  try { return JSON.parse(raw.trim()); } catch {}
  for (const [o, c] of [["{", "}"], ["[", "]"]]) {
    const a = raw.indexOf(o), b = raw.lastIndexOf(c);
    if (a >= 0 && b > a) { try { return JSON.parse(raw.slice(a, b + 1)); } catch {} }
  }
  return null;
}

/** Robustly parse the model's clip list from text (fenced JSON, raw JSON, or {clips:[…]}). */
export function parseClips(text: string, duration = Infinity): Clip[] {
  const data = extractJson(text);
  const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.clips) ? data.clips : [];
  const out: Clip[] = [];
  for (const c of arr) {
    const start = Number(c?.start), end = Number(c?.end);
    if (!isFinite(start) || !isFinite(end) || end <= start) continue;
    const sc = c?.scores && typeof c.scores === "object" ? c.scores : null;
    const scores = sc ? { hook: num(sc.hook) ?? 0, flow: num(sc.flow) ?? 0, value: num(sc.value) ?? 0, trend: num(sc.trend) ?? 0 } : undefined;
    const emojis: Record<string, string> = {};
    if (c?.emojis && typeof c.emojis === "object") for (const [k, v] of Object.entries(c.emojis).slice(0, 30)) if (typeof v === "string" && v.length <= 8) emojis[String(k).slice(0, 30)] = v;
    out.push({
      title: String(c?.title || "Untitled clip").slice(0, 120),
      start: clamp(start, 0, duration), end: clamp(end, 0, duration),
      hook: c?.hook ? String(c.hook).slice(0, 200) : undefined,
      summary: c?.summary ? String(c.summary).slice(0, 400) : undefined,
      hashtags: Array.isArray(c?.hashtags) ? c.hashtags.map((h: any) => String(h).replace(/^#/, "").slice(0, 40)).filter(Boolean).slice(0, 12) : undefined,
      caption: c?.caption ? String(c.caption).slice(0, 600) : undefined,
      score: num(c?.score) ?? (scores ? Math.round((scores.hook + scores.flow + scores.value + scores.trend) / 4) : undefined),
      scores, why: c?.why ? String(c.why).slice(0, 400) : undefined,
      emojis: Object.keys(emojis).length ? emojis : undefined,
    });
  }
  return out.filter((c) => c.end > c.start).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 20);
}

/** Translated caption lines: the model returns one string per input line. */
export function parseLines(text: string, count: number): string[] | null {
  const data = extractJson(text);
  const arr = Array.isArray(data) ? data : Array.isArray(data?.lines) ? data.lines : null;
  if (!arr || arr.length !== count) return null;
  return arr.map((x: any) => String(x ?? "").slice(0, 300));
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
export function stamp(sec: number, sep: string): string {
  const total = Math.max(0, Math.round(sec * 1000));
  const ms = total % 1000, s = Math.floor(total / 1000);
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
  return cuesToFile(cues, format);
}
export function cuesToFile(cues: { s: number; e: number; text: string }[], format: "srt" | "vtt"): string {
  const sep = format === "srt" ? "," : ".";
  const body = cues.map((c, i) => `${format === "srt" ? `${i + 1}\n` : ""}${stamp(c.s, sep)} --> ${stamp(c.e, sep)}\n${c.text}`).join("\n\n");
  return (format === "vtt" ? "WEBVTT\n\n" : "") + body + "\n";
}

export const safeName = (s: string, fallback = "clip") => (s || fallback).replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/_+/g, "_").slice(0, 48) || fallback;

// ── Repurpose ────────────────────────────────────────────────────────────────
export const REPURPOSE = ["chapters", "summary", "blog", "thread", "linkedin", "newsletter", "description", "quotes"] as const;
export type RepurposeKind = (typeof REPURPOSE)[number];
