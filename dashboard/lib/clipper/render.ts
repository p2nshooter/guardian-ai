/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * CLIPPER — the canvas renderer. ONE function draws a frame for both the live
 * preview and the export, so what the member sees is exactly what they get:
 * reframed video (fill / blurred fit / split-screen), animated captions in the
 * chosen template, the hook title, a progress bar and the brand logo.
 * Browser only (Canvas 2D); the timing and layout decisions come from edit.ts.
 * ============================================================================ */
import { cropBox, emojiFor, pageAt, toOut, totalDuration, trackAt, spreadWords, type CapPage, type CapWord, type Range } from "./edit";
import { FONT_FILES, type BrandKit, type CaptionStyle, type ClipEdit } from "./options";

export interface Frame {
  video: HTMLVideoElement;
  edit: ClipEdit;
  brand: BrandKit;
  pages: CapPage[];              // caption pages in source time
  segs: Range[];                 // kept segments
  t: number;                     // source time being drawn
  W: number; H: number;
  logo?: HTMLImageElement | null;
  emojis?: Record<string, string>;
  scratch?: HTMLCanvasElement;   // reused for the blurred background
}

const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

// ── Fonts ────────────────────────────────────────────────────────────────────
const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";
let fontsReady: Promise<void> | null = null;
/** Load the caption fonts (served from our own origin) before the first draw. */
export function ensureFonts(): Promise<void> {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    const faces: FontFace[] = [];
    for (const f of FONT_FILES) for (const [sub, range] of [["latin", LATIN], ["latin-ext", LATIN_EXT]] as const) {
      faces.push(new FontFace(f.family, `url(/vendor/fonts/${f.file}-${sub}-${f.weight}.woff2) format("woff2")`, { weight: String(f.weight), unicodeRange: range }));
    }
    await Promise.all(faces.map(async (ff) => { try { await ff.load(); (document as any).fonts.add(ff); } catch {} }));
  })();
  return fontsReady;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
const ease = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const fontOf = (s: Pick<CaptionStyle, "weight" | "font">, px: number) => `${s.weight} ${Math.round(px)}px "${s.font}", "Noto Sans", "Segoe UI", system-ui, sans-serif`;

/** Word-wrap `text` into lines no wider than `max` px. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, maxLines = 3): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > max && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const keep = lines.slice(0, maxLines); keep[maxLines - 1] = keep[maxLines - 1].replace(/\s*\S*$/, "") + "…"; return keep; }
  return lines;
}

// ── Video layer ──────────────────────────────────────────────────────────────
function drawVideo(ctx: CanvasRenderingContext2D, f: Frame) {
  const { video: v, edit: e, W, H } = f;
  const vw = v.videoWidth, vh = v.videoHeight;
  if (!vw || !vh) return;
  const cx = e.reframe === "auto" ? trackAt(e.track, f.t, "cx", e.manualX) : e.reframe === "manual" ? e.manualX : 0.5;
  if (e.layout === "split") {
    const cx2 = e.reframe === "auto" ? trackAt(e.track, f.t, "cx2", 1 - cx) : 1 - cx;
    const [a, b] = cx <= cx2 ? [cx, cx2] : [cx2, cx];
    const h2 = H / 2;
    const top = cropBox(vw, vh, W, h2, a, e.zoom);
    const bot = cropBox(vw, vh, W, h2, b, e.zoom);
    ctx.drawImage(v, top.x, top.y, top.w, top.h, 0, 0, W, h2);
    ctx.drawImage(v, bot.x, bot.y, bot.w, bot.h, 0, h2, W, h2);
    ctx.fillStyle = "rgba(0,0,0,.85)";
    ctx.fillRect(0, h2 - Math.max(2, H * 0.002), W, Math.max(4, H * 0.004));
    return;
  }
  if (e.layout === "fit") {
    // Background: the frame scaled down hard then up again = a soft blur on every browser.
    const sc = f.scratch || document.createElement("canvas");
    const sw = Math.max(8, Math.round(W / 24)), sh = Math.max(8, Math.round(H / 24));
    if (sc.width !== sw || sc.height !== sh) { sc.width = sw; sc.height = sh; }
    const sctx = sc.getContext("2d")!;
    const bg = cropBox(vw, vh, W, H, cx, 1);
    sctx.drawImage(v, bg.x, bg.y, bg.w, bg.h, 0, 0, sw, sh);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sc, 0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fillRect(0, 0, W, H);
    const s = Math.min(W / vw, H / vh) * e.zoom;
    const dw = vw * s, dh = vh * s;
    ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return;
  }
  const b = cropBox(vw, vh, W, H, cx, e.zoom);
  ctx.drawImage(v, b.x, b.y, b.w, b.h, 0, 0, W, H);
}

// ── Captions ─────────────────────────────────────────────────────────────────
function translatedPage(f: Frame): CapPage | null {
  const tr = f.edit.translated;
  if (!tr?.lines.length) return null;
  const line = tr.lines.find((l) => f.t >= l.start && f.t <= l.end + 0.05);
  if (!line) return null;
  const words = spreadWords(line.text, line.start, line.end);
  // Re-wrap by the style's words per line, up to its line count.
  const wpl = Math.max(1, f.edit.captions.wordsPerLine), lines: CapWord[][] = [];
  for (let i = 0; i < words.length; i += wpl) lines.push(words.slice(i, i + wpl));
  return { start: line.start, end: line.end, lines: lines.slice(0, Math.max(1, f.edit.captions.lines) + 1) };
}

function drawCaptions(ctx: CanvasRenderingContext2D, f: Frame) {
  const s = f.edit.captions;
  if (!s.show) return;
  const page = translatedPage(f) || pageAt(f.pages, f.t);
  if (!page) return;
  const { W, H, t } = f;
  const px = s.size * W;
  const lh = px * 1.2;
  const gap = px * 0.28;
  ctx.font = fontOf(s, px);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const txt = (w: CapWord) => (s.uppercase ? w.text.toLocaleUpperCase() : w.text);
  const all = page.lines.flat();
  // The active word: the last one that has started (holds through short gaps).
  let active = -1;
  for (let i = 0; i < all.length; i++) if (t >= all[i].start - 0.02) active = i;
  const blockH = page.lines.length * lh;
  const top = Math.max(px * 0.8, Math.min(H - blockH - px * 0.8, s.position * H - blockH / 2));
  let flatIdx = 0;
  let activeBox: { x: number; y: number; w: number } | null = null;

  const scaleOf = (w: CapWord, idx: number) => {
    if (idx !== active || (s.anim !== "pop" && s.anim !== "bounce")) return 1;
    const k = ease((t - w.start) / 0.12);
    return s.anim === "pop" ? 1 + 0.12 * k : 1 + 0.18 * k;
  };
  for (let li = 0; li < page.lines.length; li++) {
    const line = page.lines[li];
    const base = line.map((w) => ctx.measureText(txt(w)).width);
    const widths = line.map((w, i) => base[i] * scaleOf(w, flatIdx + i));   // layout width (scaled)
    const lineW = widths.reduce((a, b) => a + b, 0) + gap * (line.length - 1);
    const y = top + li * lh + lh / 2;
    const rtl = line.some((w) => RTL.test(w.text));
    let x = (W - lineW) / 2;
    if (s.box) {
      ctx.save();
      ctx.fillStyle = s.box;
      roundRect(ctx, x - px * 0.35, y - lh / 2 + px * 0.04, lineW + px * 0.7, lh - px * 0.08, px * 0.22);
      ctx.fill();
      ctx.restore();
    }
    const order = rtl ? line.map((_, i) => line.length - 1 - i) : line.map((_, i) => i);
    const xs: number[] = new Array(line.length);
    for (const i of order) { xs[i] = x; x += widths[i] + gap; }

    for (let i = 0; i < line.length; i++) {
      const w = line[i], idx = flatIdx + i;
      const spoken = idx <= active, isActive = idx === active;
      if (s.anim === "typewriter" && !spoken) continue;
      const since = t - w.start;
      const scale = scaleOf(w, idx);
      const dy = isActive && s.anim === "bounce" ? -px * 0.12 * Math.sin(Math.min(1, since / 0.25) * Math.PI) : 0;
      let color = s.color;
      if (s.anim === "karaoke" && spoken) color = s.highlight;
      if (isActive && (s.anim === "pop" || s.anim === "bounce" || s.anim === "typewriter" || s.anim === "glow")) color = s.highlight;
      const cxw = xs[i] + widths[i] / 2;
      ctx.save();
      ctx.translate(cxw, y + dy);
      ctx.scale(scale, scale);
      const bw = base[i];
      if (s.anim === "box" && isActive) {
        ctx.fillStyle = s.highlight;
        roundRect(ctx, -bw / 2 - px * 0.16, -lh * 0.46, bw + px * 0.32, lh * 0.92, px * 0.18);
        ctx.fill();
      }
      if (s.shadow) {
        ctx.shadowColor = s.shadow;
        ctx.shadowBlur = s.anim === "glow" ? px * (isActive ? 0.9 : 0.5) : px * 0.22;
        ctx.shadowOffsetY = s.anim === "glow" ? 0 : px * 0.05;
      }
      const label = txt(w);
      if (s.stroke && s.strokeWidth > 0) {
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.lineWidth = px * s.strokeWidth;
        ctx.strokeStyle = s.stroke;
        ctx.strokeText(label, -bw / 2, 0);
        ctx.shadowColor = "transparent";
      }
      ctx.fillStyle = color;
      ctx.fillText(label, -bw / 2, 0);
      ctx.restore();
      if (isActive) activeBox = { x: cxw, y: y - lh / 2, w: widths[i] };
    }
    flatIdx += line.length;
  }

  if (s.emoji && activeBox && active >= 0) {
    const e = emojiFor(all[active].text, f.emojis);
    if (e) {
      const since = t - all[active].start;
      const k = ease(since / 0.18);
      ctx.save();
      ctx.font = `${Math.round(px * 1.25 * (0.6 + 0.4 * k))}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(e, activeBox.x, activeBox.y - px * 0.1);
      ctx.restore();
    }
  }
}

// ── Overlays ─────────────────────────────────────────────────────────────────
function drawHook(ctx: CanvasRenderingContext2D, f: Frame, outT: number) {
  const h = f.edit.hook;
  if (!h.show || !h.text.trim() || outT > h.seconds) return;
  const { W, H } = f;
  const alpha = Math.min(1, outT / 0.25, (h.seconds - outT) / 0.3);
  if (alpha <= 0) return;
  const px = W * 0.056;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.font = fontOf({ weight: 800, font: "Montserrat" }, px);
  const lines = wrap(ctx, h.text.trim(), W * 0.78, 3);
  const lh = px * 1.25;
  const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + px * 1.2;
  const bh = lines.length * lh + px * 0.7;
  const x = (W - bw) / 2, y = H * 0.1;
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = px * 0.5;
  ctx.fillStyle = f.brand.hookBg;
  roundRect(ctx, x, y, bw, bh, px * 0.4);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = f.brand.hookColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) => ctx.fillText(l, W / 2, y + px * 0.35 + lh * i + lh / 2));
  ctx.restore();
}

function drawProgress(ctx: CanvasRenderingContext2D, f: Frame, outT: number, total: number) {
  if (!f.edit.progress || total <= 0) return;
  const h = Math.max(4, f.H * 0.007);
  ctx.fillStyle = "rgba(255,255,255,.25)";
  ctx.fillRect(0, f.H - h, f.W, h);
  ctx.fillStyle = f.brand.progressColor || "#facc15";
  ctx.fillRect(0, f.H - h, f.W * Math.min(1, outT / total), h);
}

function drawLogo(ctx: CanvasRenderingContext2D, f: Frame) {
  const img = f.logo;
  if (!img || !img.naturalWidth) return;
  const { W, H, brand: b } = f;
  const w = W * b.logoSize, h = (w * img.naturalHeight) / img.naturalWidth;
  const m = W * 0.045;
  const x = b.logoPos.endsWith("l") ? m : W - w - m;
  const y = b.logoPos.startsWith("t") ? m : H - h - m - H * 0.02;
  ctx.save();
  ctx.globalAlpha = b.logoOpacity;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

/** Draw one frame of the clip at source time f.t. */
export function drawFrame(ctx: CanvasRenderingContext2D, f: Frame) {
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, f.W, f.H);
  drawVideo(ctx, f);
  const outT = toOut(f.segs, f.t) ?? 0;
  const total = totalDuration(f.segs);
  drawCaptions(ctx, f);
  drawHook(ctx, f, outT);
  drawProgress(ctx, f, outT, total);
  drawLogo(ctx, f);
  ctx.restore();
}
