/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * CLIPPER — pure editing logic shared by the editor, the renderer and the tests
 * (no DOM). Everything is in SOURCE seconds (the uploaded video's clock) unless
 * a name says "out" (the exported clip's clock).
 *
 *   keptSegments    clip window − manual cuts − filler words − long silences
 *   toOut / toSrc   map a time between the source and the exported clip
 *   captionPages    group the kept words into on-screen caption pages
 *   smoothTrack     face-tracking samples → steady camera path (dead zone,
 *                   speed limit, hard cut on a scene change)
 *   cropBox         the source rectangle a crop centre produces for an aspect
 *   chunkPlan       split a long audio track for transcription, with offsets
 * ============================================================================ */
import type { Word } from "./options";

export interface Range { start: number; end: number }

// ── Filler words ─────────────────────────────────────────────────────────────
// Only sounds that are never meaningful on their own. Multi-word fillers
// ("you know", "I mean") are matched as a pair.
const FILLERS = new Set([
  "um", "umm", "ummm", "uh", "uhh", "uhm", "uhmm", "er", "erm", "err", "ah", "ahh", "hmm", "hmmm", "mm", "mmm", "eh", "ehh",
  "anu", "ehm", "emm", "hmmm", "ee", "eee",           // Indonesian / Malay
  "äh", "ähm", "öhm",                                  // German
  "euh", "heu", "bah",                                 // French
  "ehm", "cioè",                                       // Italian
  "えー", "えっと", "あの", "あのー", "えーと",           // Japanese
  "嗯", "呃", "那个", "就是",                            // Chinese
  "अं", "उम्म",                                          // Hindi
  "اه", "امم", "يعني",                                  // Arabic
]);
const FILLER_PAIRS = new Set(["you know", "i mean", "kind of", "sort of"]);
const norm = (w: string) => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

/** Indices of words that are filler (single sounds + common two-word fillers). */
export function fillerIndices(words: Word[]): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < words.length; i++) {
    const w = norm(words[i].word);
    if (!w) continue;
    if (FILLERS.has(w)) out.add(i);
    if (i + 1 < words.length && FILLER_PAIRS.has(`${w} ${norm(words[i + 1].word)}`)) { out.add(i); out.add(i + 1); }
  }
  return out;
}

export interface CutOptions {
  removeFillers?: boolean;
  removeSilence?: boolean;
  silenceGap?: number;        // a pause longer than this (s) is shortened
  keepPause?: number;         // how much of a removed pause to keep (s), so speech doesn't feel glued
  cuts?: Range[];             // manual cuts (e.g. deleted words), source seconds
  minSegment?: number;        // drop slivers shorter than this (s)
}

function mergeRanges(list: Range[], joinGap = 0): Range[] {
  const s = list.filter((r) => r.end > r.start).sort((a, b) => a.start - b.start);
  const out: Range[] = [];
  for (const r of s) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end + joinGap) last.end = Math.max(last.end, r.end);
    else out.push({ ...r });
  }
  return out;
}

/** Subtract `cut` ranges from [start, end]. */
function subtract(start: number, end: number, cuts: Range[]): Range[] {
  let parts: Range[] = [{ start, end }];
  for (const c of mergeRanges(cuts)) {
    const next: Range[] = [];
    for (const p of parts) {
      if (c.end <= p.start || c.start >= p.end) { next.push(p); continue; }
      if (c.start > p.start) next.push({ start: p.start, end: c.start });
      if (c.end < p.end) next.push({ start: c.end, end: p.end });
    }
    parts = next;
  }
  return parts;
}

/** Words that fall inside the window [start, end] (by midpoint), with their original index. */
export function wordsIn(words: Word[], start: number, end: number): { w: Word; i: number }[] {
  const out: { w: Word; i: number }[] = [];
  for (let i = 0; i < words.length; i++) {
    const m = (words[i].start + words[i].end) / 2;
    if (m >= start && m <= end) out.push({ w: words[i], i });
  }
  return out;
}

/** The pieces of the source that end up in the exported clip, in order. */
export function keptSegments(words: Word[], clip: Range, o: CutOptions = {}): Range[] {
  const gap = o.silenceGap ?? 0.7, keep = Math.min(o.keepPause ?? 0.18, gap / 2), min = o.minSegment ?? 0.12;
  const cuts: Range[] = [...(o.cuts || [])];
  const inClip = wordsIn(words, clip.start, clip.end);
  if (o.removeFillers) {
    const f = fillerIndices(words);
    for (const { w, i } of inClip) if (f.has(i)) cuts.push({ start: w.start, end: w.end });
  }
  if (o.removeSilence && inClip.length) {
    // Leading / trailing dead air, and every long pause between words.
    if (inClip[0].w.start - clip.start > gap) cuts.push({ start: clip.start, end: inClip[0].w.start - keep });
    for (let k = 1; k < inClip.length; k++) {
      const a = inClip[k - 1].w.end, b = inClip[k].w.start;
      if (b - a > gap) cuts.push({ start: a + keep, end: b - keep });
    }
    const last = inClip[inClip.length - 1].w.end;
    if (clip.end - last > gap) cuts.push({ start: last + keep, end: clip.end });
  }
  return subtract(clip.start, clip.end, cuts).filter((r) => r.end - r.start >= min);
}

export const totalDuration = (segs: Range[]) => segs.reduce((n, r) => n + (r.end - r.start), 0);

/** Source second → exported-clip second (null when that moment was cut). */
export function toOut(segs: Range[], t: number): number | null {
  let acc = 0;
  for (const r of segs) {
    if (t < r.start) return null;
    if (t <= r.end) return acc + (t - r.start);
    acc += r.end - r.start;
  }
  return null;
}

/** Exported-clip second → source second. */
export function toSrc(segs: Range[], out: number): number {
  let acc = 0;
  for (const r of segs) {
    const len = r.end - r.start;
    if (out <= acc + len) return r.start + Math.max(0, out - acc);
    acc += len;
  }
  return segs.length ? segs[segs.length - 1].end : 0;
}

/** The segment index a source time falls in (or the next one after it); -1 past the end. */
export function segmentAt(segs: Range[], t: number): number {
  for (let i = 0; i < segs.length; i++) if (t < segs[i].end) return i;
  return -1;
}

// ── Captions ─────────────────────────────────────────────────────────────────
export interface CapWord { text: string; start: number; end: number; index: number }
export interface CapPage { start: number; end: number; lines: CapWord[][] }

/** Group the kept words into caption pages: up to `wordsPerLine` words / `maxChars`
 *  characters per line and `lines` lines per page. A page also breaks on a
 *  sentence end or a pause, so captions follow the rhythm of speech. */
export function captionPages(words: Word[], segs: Range[], o: { wordsPerLine?: number; maxChars?: number; lines?: number; edits?: Record<number, string> } = {}): CapPage[] {
  const wpl = Math.max(1, o.wordsPerLine ?? 3), maxChars = o.maxChars ?? 22, nLines = Math.max(1, o.lines ?? 1);
  const kept: CapWord[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const mid = (w.start + w.end) / 2;
    if (toOut(segs, mid) === null) continue;
    const text = (o.edits?.[i] ?? w.word).trim();
    if (!text) continue;                       // a word edited to "" is hidden
    kept.push({ text, start: w.start, end: w.end, index: i });
  }
  const pages: CapPage[] = [];
  let lines: CapWord[][] = [[]];
  const flush = () => {
    const all = lines.flat();
    if (all.length) pages.push({ start: all[0].start, end: all[all.length - 1].end, lines: lines.filter((l) => l.length) });
    lines = [[]];
  };
  for (let k = 0; k < kept.length; k++) {
    const w = kept[k], prev = kept[k - 1];
    let line = lines[lines.length - 1];
    const lineLen = line.reduce((n, x) => n + x.text.length + 1, 0);
    const pause = prev ? w.start - prev.end > 0.6 : false;
    const sentenceEnd = prev ? /[.!?。！？]$/.test(prev.text) : false;
    if (line.length && (pause || sentenceEnd)) { flush(); line = lines[0]; }
    else if (line.length >= wpl || (line.length && lineLen + w.text.length > maxChars)) {
      if (lines.length < nLines) { lines.push([]); line = lines[lines.length - 1]; }
      else { flush(); line = lines[0]; }
    }
    line.push(w);
  }
  flush();
  // Keep each page on screen until the next one starts (no flicker in short gaps).
  for (let p = 0; p < pages.length - 1; p++) {
    const gap = pages[p + 1].start - pages[p].end;
    if (gap > 0 && gap < 0.5) pages[p].end = pages[p + 1].start;
  }
  return pages;
}

export const pageAt = (pages: CapPage[], t: number) => pages.find((p) => t >= p.start && t <= p.end + 0.05) || null;

/** Line-level cues (for translated captions): the words of each page spread
 *  evenly over the page's time so the highlight still moves. */
export function spreadWords(text: string, start: number, end: number, index = -1): CapWord[] {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return [];
  const step = (end - start) / parts.length;
  return parts.map((p, i) => ({ text: p, start: start + i * step, end: start + (i + 1) * step, index }));
}

// ── Emoji ────────────────────────────────────────────────────────────────────
const EMOJI: [RegExp, string][] = [
  [/^(money|cash|dollars?|revenue|profit|uang|duit|cuan|rupiah|geld|argent|soldi|钱|お金|पैसा|مال)$/i, "💰"],
  [/^(love|loved|cinta|sayang|liebe|amour|amore|爱|愛|प्यार|حب)$/i, "❤️"],
  [/^(fire|hot|lit|api|panas|feuer|feu|fuoco|火|आग|نار)$/i, "🔥"],
  [/^(idea|ideas|ide|gagasan|idee|idée|想法|アイデア|विचार|فكرة)$/i, "💡"],
  [/^(time|waktu|zeit|temps|tempo|时间|時間|समय|وقت)$/i, "⏰"],
  [/^(growth|grow|tumbuh|wachstum|croissance|crescita|增长|成長|विकास|نمو)$/i, "📈"],
  [/^(win|won|winner|menang|gewinnen|gagner|vincere|赢|勝つ|जीत|فوز)$/i, "🏆"],
  [/^(secret|rahasia|geheimnis|secret|segreto|秘密|रहस्य|سر)$/i, "🤫"],
  [/^(mind|brain|otak|pikiran|gehirn|cerveau|cervello|大脑|脳|दिमाग|عقل)$/i, "🧠"],
  [/^(rocket|launch|meluncur|rakete|fusée|razzo|火箭|ロケット|रॉकेट|صاروخ)$/i, "🚀"],
  [/^(wow|amazing|incredible|luar biasa|keren|wahnsinn|incroyable|incredibile|惊人|すごい|अद्भुत|مذهل)$/i, "🤯"],
  [/^(stop|berhenti|halt|arrête|basta|停|止まれ|रुको|توقف)$/i, "✋"],
  [/^(goal|goals|target|tujuan|ziel|objectif|obiettivo|目标|目標|लक्ष्य|هدف)$/i, "🎯"],
  [/^(problem|masalah|problème|problema|问题|問題|समस्या|مشكلة)$/i, "⚠️"],
  [/^(happy|senang|bahagia|glücklich|heureux|felice|开心|嬉しい|खुश|سعيد)$/i, "😄"],
  [/^(sad|sedih|traurig|triste|伤心|悲しい|दुखी|حزين)$/i, "😢"],
  [/^(work|kerja|bekerja|arbeit|travail|lavoro|工作|仕事|काम|عمل)$/i, "💼"],
  [/^(phone|hp|ponsel|handy|téléphone|telefono|手机|電話|फोन|هاتف)$/i, "📱"],
  [/^(ai|artificial)$/i, "🤖"],
];
export function emojiFor(word: string, extra?: Record<string, string>): string {
  const w = norm(word);
  if (!w) return "";
  if (extra) for (const [k, v] of Object.entries(extra)) if (norm(k) === w) return v;
  for (const [re, e] of EMOJI) if (re.test(w)) return e;
  return "";
}

// ── Reframe ──────────────────────────────────────────────────────────────────
export interface TrackSample { t: number; cx: number | null; cx2?: number | null; cy?: number | null; w?: number }
export interface TrackKey { t: number; cx: number; cx2?: number; cut?: boolean }

/** Turn noisy per-frame face centres into a calm camera path, like a camera
 *  operator: ignore small moves (dead zone), glide towards bigger ones at a
 *  limited speed, and CUT (no pan) when the subject jumps and stays there —
 *  a scene change or another speaker. Missing detections hold the last value. */
export function smoothTrack(samples: TrackSample[], o: { deadZone?: number; maxSpeed?: number; jump?: number; fallback?: number } = {}): TrackKey[] {
  const dead = o.deadZone ?? 0.06, speed = o.maxSpeed ?? 0.35, jump = o.jump ?? 0.28, fb = o.fallback ?? 0.5;
  const s = samples.slice().sort((a, b) => a.t - b.t);
  const out: TrackKey[] = [];
  let cur: number | null = null, cur2: number | null = null, lastT = 0;
  for (let i = 0; i < s.length; i++) {
    const x = s[i];
    const target: number = x.cx ?? cur ?? fb;
    if (cur === null) {
      cur = target; cur2 = x.cx2 ?? null; lastT = x.t;
      out.push({ t: x.t, cx: target, ...(cur2 !== null ? { cx2: cur2 } : {}) });
      continue;
    }
    const dt = Math.max(0.001, x.t - lastT);
    const diff: number = target - cur;
    const next = s[i + 1];
    const persists = next && next.cx !== null && next.cx !== undefined && Math.abs(next.cx - target) < dead * 2;
    let cut = false;
    if (Math.abs(diff) > jump && x.cx !== null && persists) { cur = target; cut = true; }
    else if (Math.abs(diff) > dead) {
      const stepMax = speed * dt;
      cur = cur + Math.max(-stepMax, Math.min(stepMax, diff - Math.sign(diff) * dead));
    }
    if (x.cx2 !== undefined && x.cx2 !== null) cur2 = cur2 === null ? x.cx2 : cur2 + (x.cx2 - cur2) * 0.5;
    lastT = x.t;
    const c2 = cur2 as number | null;
    out.push({ t: x.t, cx: clamp01(cur as number), ...(c2 !== null ? { cx2: clamp01(c2) } : {}), ...(cut ? { cut: true } : {}) });
  }
  return out;
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Camera centre at time t (linear between keys; a cut key jumps). */
export function trackAt(keys: TrackKey[] | undefined, t: number, which: "cx" | "cx2" = "cx", fallback = 0.5): number {
  if (!keys?.length) return fallback;
  const val = (k: TrackKey) => (which === "cx2" ? k.cx2 ?? k.cx : k.cx);
  if (t <= keys[0].t) return val(keys[0]);
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    if (t <= b.t) {
      const a = keys[i - 1];
      if (b.cut) return val(a);
      const f = (t - a.t) / Math.max(0.001, b.t - a.t);
      return val(a) + (val(b) - val(a)) * f;
    }
  }
  return val(keys[keys.length - 1]);
}

/** Share of samples in which two faces were seen — the editor offers a split
 *  layout when this is high (a two-person podcast). */
export function twoFaceShare(samples: TrackSample[]): number {
  if (!samples.length) return 0;
  return samples.filter((s) => s.cx !== null && s.cx2 !== null && s.cx2 !== undefined).length / samples.length;
}

/** Source rectangle for a crop centred on `cx` (0..1 of the source width) that
 *  fills an output of aspect `outW/outH`, zoomed by `zoom` (≥1). */
export function cropBox(srcW: number, srcH: number, outW: number, outH: number, cx: number, zoom = 1, cy = 0.5) {
  const outAspect = outW / outH, srcAspect = srcW / srcH;
  let w: number, h: number;
  if (srcAspect > outAspect) { h = srcH; w = h * outAspect; } else { w = srcW; h = w / outAspect; }
  w /= Math.max(1, zoom); h /= Math.max(1, zoom);
  const x = Math.max(0, Math.min(srcW - w, cx * srcW - w / 2));
  const y = Math.max(0, Math.min(srcH - h, cy * srcH - h / 2));
  return { x, y, w, h };
}

// ── Long audio ───────────────────────────────────────────────────────────────
/** Split `duration` seconds into transcription chunks of about `chunk` seconds;
 *  a short tail is folded into the previous chunk. */
export function chunkPlan(duration: number, chunk = 1200, minTail = 120): Range[] {
  if (!(duration > 0)) return [{ start: 0, end: 0 }];
  const out: Range[] = [];
  for (let s = 0; s < duration; s += chunk) out.push({ start: s, end: Math.min(duration, s + chunk) });
  if (out.length > 1 && out[out.length - 1].end - out[out.length - 1].start < minTail) {
    const tail = out.pop()!;
    out[out.length - 1].end = tail.end;
  }
  return out;
}

/** Join per-chunk transcripts: shift each chunk's word times by its offset. */
export function mergeTranscripts(parts: { offset: number; text: string; words: Word[] }[]): { text: string; words: Word[] } {
  const words: Word[] = [];
  const texts: string[] = [];
  for (const p of parts.slice().sort((a, b) => a.offset - b.offset)) {
    texts.push(p.text.trim());
    for (const w of p.words) words.push({ ...w, start: w.start + p.offset, end: w.end + p.offset });
  }
  return { text: texts.filter(Boolean).join(" "), words };
}

// ── Manual cuts ──────────────────────────────────────────────────────────────
/** Cut (on=true) or restore (on=false) a range; the result stays merged and sorted. */
export function toggleCut(cuts: Range[], r: Range, on: boolean): Range[] {
  if (r.end <= r.start) return mergeRanges(cuts);
  if (on) return mergeRanges([...cuts, r], 0.01);
  const out: Range[] = [];
  for (const c of mergeRanges(cuts)) out.push(...subtract(c.start, c.end, [r]));
  return out.filter((x) => x.end - x.start > 0.01);
}

/** Is this word inside a manual cut? */
export const isCut = (cuts: Range[], w: Word) => cuts.some((c) => (w.start + w.end) / 2 >= c.start && (w.start + w.end) / 2 <= c.end);

// ── Subtitle import ──────────────────────────────────────────────────────────
/** An existing SRT/VTT file → words spread evenly over each cue (no speech-to-text key needed). */
export function parseSubtitles(text: string): Word[] {
  const words: Word[] = [];
  const re = /(\d{1,2}:)?(\d{1,2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,2}:)?(\d{1,2}):(\d{2})[.,](\d{1,3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|$)/g;
  const sec = (h: string | undefined, m: string, s: string, ms: string) => (h ? parseInt(h, 10) * 3600 : 0) + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms.padEnd(3, "0"), 10) / 1000;
  let m: RegExpExecArray | null;
  const src = text.replace(/\r/g, "");
  while ((m = re.exec(src))) {
    const a = sec(m[1], m[2], m[3], m[4]), b = sec(m[5], m[6], m[7], m[8]);
    const body = m[9].replace(/<[^>]+>/g, "").replace(/\{[^}]+\}/g, "").trim();
    const parts = body.split(/\s+/).filter(Boolean);
    if (!parts.length || b <= a) continue;
    const step = (b - a) / parts.length;
    parts.forEach((p, i) => words.push({ word: p, start: a + i * step, end: a + (i + 1) * step }));
  }
  return words;
}

/** Like toOut, but a cut moment maps to where the next kept piece starts. */
export function toOutClamped(segs: Range[], t: number): number {
  let acc = 0;
  for (const r of segs) {
    if (t < r.start) return acc;
    if (t <= r.end) return acc + (t - r.start);
    acc += r.end - r.start;
  }
  return acc;
}

/** Caption pages → cues on the EXPORTED clip's clock (for .srt / .vtt next to the MP4). */
export function pagesToCues(pages: CapPage[], segs: Range[], uppercase = false): { s: number; e: number; text: string }[] {
  return pages.map((p) => ({
    s: toOutClamped(segs, p.start),
    e: toOutClamped(segs, p.end),
    text: p.lines.map((l) => l.map((w) => (uppercase ? w.text.toLocaleUpperCase() : w.text)).join(" ")).join("\n"),
  })).filter((c) => c.e > c.s);
}
