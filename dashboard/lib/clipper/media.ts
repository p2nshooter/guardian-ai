/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * CLIPPER — everything that touches the video, all ON THE MEMBER'S DEVICE:
 *   probe         duration + size of the uploaded file
 *   audio         ffmpeg.wasm extracts a small speech track (32 kbps mono) —
 *                 the ONLY thing that leaves the device — split into parts for
 *                 long videos
 *   faces         MediaPipe face detection on sampled frames → reframe track
 *   record        the canvas renderer + the original audio → MediaRecorder
 *                 (MP4 where the browser can, WebM otherwise; ffmpeg converts)
 *   thumbnail     one rendered frame as PNG
 * ============================================================================ */
import { chunkPlan, keptSegments, smoothTrack, twoFaceShare, captionPages, type Range, type TrackSample } from "./edit";
import { drawFrame, ensureFonts, type Frame } from "./render";
import type { BrandKit, ClipEdit, Word } from "./options";

// Same-origin JS (see scripts/vendor.mjs); only the big core comes from the CDN.
const FF_MAIN = "/vendor/ffmpeg/index.js";
const FF_UTIL = "/vendor/ffmpeg-util/index.js";
// The 31 MB core is above the Pages file limit: fetched from a public CDN into a blob: URL (first that answers).
const FF_CORES = ["https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm", "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm"];
const MP_BUNDLE = "/vendor/mediapipe/vision_bundle.mjs";
export const DIRECT_LIMIT = 24 * 1024 * 1024;   // send the file straight to STT below this
export const CHUNK_SEC = 1200;                   // 20-minute transcription parts

const dyn = (u: string) => import(/* webpackIgnore: true */ u);

export function waitEvent(el: EventTarget, name: string, ms = 15000): Promise<void> {
  return new Promise((res, rej) => {
    const done = () => { clearTimeout(tm); el.removeEventListener(name, done); res(); };
    const tm = setTimeout(() => { el.removeEventListener(name, done); rej(new Error(`timeout waiting for ${name}`)); }, ms);
    el.addEventListener(name, done, { once: true });
  });
}

export async function seek(v: HTMLVideoElement, t: number) {
  if (Math.abs(v.currentTime - t) < 0.001 && v.readyState >= 2) return;
  const p = waitEvent(v, "seeked", 20000);
  v.currentTime = t;
  await p;
}

/** A detached <video> for the file (analysis, thumbnails, export). */
export async function videoFor(url: string, muted = true): Promise<HTMLVideoElement> {
  const v = document.createElement("video");
  v.preload = "auto"; v.muted = muted; v.playsInline = true; v.crossOrigin = "anonymous";
  v.src = url;
  if (v.readyState < 1) await waitEvent(v, "loadedmetadata", 20000);
  return v;
}

export async function probe(file: File): Promise<{ duration: number; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const v = await videoFor(url);
    return { duration: isFinite(v.duration) ? v.duration : 0, width: v.videoWidth, height: v.videoHeight };
  } catch { return { duration: 0, width: 0, height: 0 }; }
  finally { URL.revokeObjectURL(url); }
}

// ── ffmpeg.wasm ──────────────────────────────────────────────────────────────
let ffPromise: Promise<any> | null = null;
export function loadFfmpeg(onProgress?: (p: number) => void): Promise<any> {
  if (ffPromise) return ffPromise;
  ffPromise = (async () => {
    const { FFmpeg } = await dyn(FF_MAIN);
    const { toBlobURL } = await dyn(FF_UTIL);
    const ff = new FFmpeg();
    ff.on("progress", (p: any) => onProgressRef.current?.(Math.max(0, Math.min(1, p?.progress || 0))));
    let last: unknown = null;
    for (const base of FF_CORES) {
      try {
        await ff.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
        });
        return ff;
      } catch (e) { last = e; }
    }
    throw last || new Error("ffmpeg could not load");
  })();
  ffPromise.catch(() => { ffPromise = null; });
  if (onProgress) onProgressRef.current = onProgress;
  return ffPromise;
}
const onProgressRef: { current?: (p: number) => void } = {};
export const setFfProgress = (fn?: (p: number) => void) => { onProgressRef.current = fn; };

/** Make the file readable by ffmpeg without copying it into wasm memory when possible. */
async function mountInput(ff: any, file: File): Promise<{ path: string; cleanup: () => Promise<void> }> {
  try {
    await ff.createDir("/in").catch(() => {});
    await ff.mount("WORKERFS", { files: [file] }, "/in");
    return { path: `/in/${file.name}`, cleanup: async () => { try { await ff.unmount("/in"); } catch {} } };
  } catch {
    const { fetchFile } = await dyn(FF_UTIL);
    await ff.writeFile("input.bin", await fetchFile(file));
    return { path: "input.bin", cleanup: async () => { try { await ff.deleteFile("input.bin"); } catch {} } };
  }
}

/** Extract a compact speech track and split it into ≤20-minute parts. */
export async function extractAudioParts(file: File, duration: number, onProgress?: (p: number) => void): Promise<{ blob: Blob; offset: number }[]> {
  const ff = await loadFfmpeg();
  setFfProgress(onProgress);
  const input = await mountInput(ff, file);
  try {
    await ff.exec(["-i", input.path, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "32k", "speech.mp3"]);
  } finally { await input.cleanup(); setFfProgress(undefined); }
  const plan = chunkPlan(duration || 1, CHUNK_SEC);
  const parts: { blob: Blob; offset: number }[] = [];
  if (plan.length === 1) {
    const data = await ff.readFile("speech.mp3");
    parts.push({ blob: new Blob([data], { type: "audio/mpeg" }), offset: 0 });
  } else {
    for (let i = 0; i < plan.length; i++) {
      const r = plan[i];
      await ff.exec(["-ss", String(r.start), "-t", String(r.end - r.start), "-i", "speech.mp3", "-c", "copy", `part${i}.mp3`]);
      const data = await ff.readFile(`part${i}.mp3`);
      parts.push({ blob: new Blob([data], { type: "audio/mpeg" }), offset: r.start });
      try { await ff.deleteFile(`part${i}.mp3`); } catch {}
    }
  }
  try { await ff.deleteFile("speech.mp3"); } catch {}
  return parts;
}

/** WebM → MP4 (H.264/AAC) for browsers whose recorder can't write MP4. */
export async function toMp4(webm: Blob, onProgress?: (p: number) => void): Promise<Blob> {
  const ff = await loadFfmpeg();
  const { fetchFile } = await dyn(FF_UTIL);
  setFfProgress(onProgress);
  try {
    await ff.writeFile("rec.webm", await fetchFile(webm));
    await ff.exec(["-i", "rec.webm", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "rec.mp4"]);
    const data = await ff.readFile("rec.mp4");
    return new Blob([data], { type: "video/mp4" });
  } finally {
    setFfProgress(undefined);
    for (const f of ["rec.webm", "rec.mp4"]) { try { await ff.deleteFile(f); } catch {} }
  }
}

// ── Face tracking (MediaPipe, on device) ─────────────────────────────────────
let detPromise: Promise<any> | null = null;
function loadDetector(): Promise<any> {
  if (detPromise) return detPromise;
  detPromise = (async () => {
    const vision: any = await dyn(MP_BUNDLE);
    const fileset = await vision.FilesetResolver.forVisionTasks("/vendor/mediapipe/wasm");
    const opts = (delegate: "GPU" | "CPU") => ({
      baseOptions: { modelAssetPath: "/vendor/mediapipe/blaze_face_short_range.tflite", delegate },
      runningMode: "IMAGE", minDetectionConfidence: 0.45,
    });
    try { return await vision.FaceDetector.createFromOptions(fileset, opts("GPU")); }
    catch { return await vision.FaceDetector.createFromOptions(fileset, opts("CPU")); }
  })();
  detPromise.catch(() => { detPromise = null; });
  return detPromise;
}

export interface FaceBox { cx: number; cy: number; w: number; h: number; score: number }

const iou = (a: FaceBox, b: FaceBox) => {
  const ax0 = a.cx - a.w / 2, ay0 = a.cy - a.h / 2, bx0 = b.cx - b.w / 2, by0 = b.cy - b.h / 2;
  const ix = Math.max(0, Math.min(ax0 + a.w, bx0 + b.w) - Math.max(ax0, bx0));
  const iy = Math.max(0, Math.min(ay0 + a.h, by0 + b.h) - Math.max(ay0, by0));
  const inter = ix * iy;
  return inter / Math.max(1e-9, a.w * a.h + b.w * b.h - inter);
};

/** Faces in one frame, multi-scale: the whole frame catches big (selfie) faces;
 *  overlapping tiles catch the small faces of wide podcast / interview shots.
 *  Boxes are 0..1 of the frame; duplicates across tiles are merged (NMS). */
function detectMulti(det: any, frame: HTMLCanvasElement, small: HTMLCanvasElement, tile: HTMLCanvasElement): FaceBox[] {
  const W = frame.width, H = frame.height;
  const out: FaceBox[] = [];
  const add = (d: any, ox: number, oy: number, scaleX: number, scaleY: number) => {
    const b = d.boundingBox;
    if (!b) return;
    out.push({ cx: (ox + (b.originX + b.width / 2) * scaleX) / W, cy: (oy + (b.originY + b.height / 2) * scaleY) / H, w: (b.width * scaleX) / W, h: (b.height * scaleY) / H, score: d.categories?.[0]?.score ?? 0.5 });
  };
  const sctx = small.getContext("2d")!;
  sctx.drawImage(frame, 0, 0, small.width, small.height);
  try { for (const d of det.detect(small)?.detections || []) add(d, 0, 0, W / small.width, H / small.height); } catch {}
  if (!out.some((f) => f.w > 0.12)) {
    const side = Math.round(Math.min(W, H) * 0.5), step = Math.round(side * 0.66);
    const pos = (len: number) => { const p: number[] = []; for (let v = 0; v + side < len; v += step) p.push(v); p.push(len - side); return Array.from(new Set(p)); };
    const tctx = tile.getContext("2d")!;
    for (const y of pos(H)) for (const x of pos(W)) {
      tctx.drawImage(frame, x, y, side, side, 0, 0, tile.width, tile.height);
      try { for (const d of det.detect(tile)?.detections || []) add(d, x, y, side / tile.width, side / tile.height); } catch {}
    }
  }
  const kept: FaceBox[] = [];
  for (const f of out.sort((a, b) => b.score - a.score)) if (!kept.some((k) => iou(k, f) > 0.3)) kept.push(f);
  return kept.sort((a, b) => b.w * b.h - a.w * a.h);
}

/** Sample the clip at `fps`, find faces, and return a smoothed camera path. */
export async function analyzeFaces(url: string, range: Range, o: { fps?: number; onProgress?: (p: number) => void; signal?: AbortSignal } = {}) {
  const det = await loadDetector();
  const v = await videoFor(url);
  const len = range.end - range.start;
  const fps = o.fps ?? (len > 60 ? 2 : 3);
  const fw = 960, fh = Math.max(1, Math.round((fw * v.videoHeight) / Math.max(1, v.videoWidth)));
  const mk = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const frame = mk(fw, fh), small = mk(320, Math.max(1, Math.round((320 * fh) / fw))), tile = mk(256, 256);
  const fctx = frame.getContext("2d", { willReadFrequently: true })!;
  const samples: TrackSample[] = [];
  const n = Math.max(1, Math.ceil(len * fps));
  for (let i = 0; i <= n; i++) {
    if (o.signal?.aborted) throw new DOMException("aborted", "AbortError");
    const t = Math.min(range.end, range.start + i / fps);
    await seek(v, t);
    fctx.drawImage(v, 0, 0, fw, fh);
    const faces = detectMulti(det, frame, small, tile);
    const a = faces[0], b = faces[1] && faces[1].w * faces[1].h >= a.w * a.h * 0.35 ? faces[1] : null;
    samples.push({ t, cx: a ? a.cx : null, cx2: b ? b.cx : null, cy: a ? a.cy : null, w: a?.w });
    o.onProgress?.(i / n);
  }
  v.removeAttribute("src"); v.load();
  return { track: smoothTrack(samples), twoFaces: twoFaceShare(samples), found: samples.filter((s) => s.cx !== null).length / samples.length };
}

// ── Export ───────────────────────────────────────────────────────────────────
export function recorderMime(): { mime: string; ext: "mp4" | "webm" } {
  const MR: any = (globalThis as any).MediaRecorder;
  const list: [string, "mp4" | "webm"][] = [
    ["video/mp4;codecs=avc1.640028,mp4a.40.2", "mp4"], ["video/mp4;codecs=avc1,mp4a.40.2", "mp4"], ["video/mp4", "mp4"],
    ["video/webm;codecs=vp9,opus", "webm"], ["video/webm;codecs=vp8,opus", "webm"], ["video/webm", "webm"],
  ];
  for (const [m, e] of list) if (MR?.isTypeSupported?.(m)) return { mime: m, ext: e };
  return { mime: "", ext: "webm" };
}
export const canRecord = () => typeof window !== "undefined" && !!(window as any).MediaRecorder && !!(HTMLCanvasElement.prototype as any).captureStream;

export interface RenderJob {
  url: string; edit: ClipEdit; brand: BrandKit; words: Word[]; emojis?: Record<string, string>;
  logo?: HTMLImageElement | null; W: number; H: number; fps?: number;
  onProgress?: (p: number) => void; signal?: AbortSignal;
}

export function jobPieces(j: Pick<RenderJob, "edit" | "words">) {
  const e = j.edit;
  const segs = keptSegments(j.words, { start: e.start, end: e.end }, { removeFillers: e.removeFillers, removeSilence: e.removeSilence, cuts: e.cuts });
  const pages = captionPages(j.words, segs, { wordsPerLine: e.captions.wordsPerLine, lines: e.captions.lines, edits: e.edits });
  return { segs, pages };
}

/** Render the clip in real time into a video file, on this device. */
export async function recordClip(j: RenderJob): Promise<{ blob: Blob; ext: "mp4" | "webm" }> {
  await ensureFonts();
  const { segs, pages } = jobPieces(j);
  if (!segs.length) throw new Error("Nothing left to export — the whole clip is cut.");
  const total = segs.reduce((n, r) => n + (r.end - r.start), 0);
  const v = await videoFor(j.url, false);
  const canvas = document.createElement("canvas");
  canvas.width = j.W; canvas.height = j.H;
  const ctx = canvas.getContext("2d")!;
  const fps = j.fps ?? 30;
  const stream: MediaStream = (canvas as any).captureStream(fps);
  // Audio: the element's sound goes into the recording only (not the speakers).
  const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ac: AudioContext = new AC();
  await ac.resume().catch(() => {});
  const src = ac.createMediaElementSource(v);
  const dest = ac.createMediaStreamDestination();
  src.connect(dest);
  for (const tr of dest.stream.getAudioTracks()) stream.addTrack(tr);

  const { mime, ext } = recorderMime();
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: Math.round(j.W * j.H * fps * 0.14), audioBitsPerSecond: 160_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  const stopped = new Promise<void>((res) => { rec.onstop = () => res(); });
  const scratch = document.createElement("canvas");
  const frame = (): Frame => ({ video: v, edit: j.edit, brand: j.brand, pages, segs, t: v.currentTime, W: j.W, H: j.H, logo: j.logo, emojis: j.emojis, scratch });

  let done = 0;
  let raf = 0;
  const loop = () => { drawFrame(ctx, frame()); raf = requestAnimationFrame(loop); };
  try {
    for (let i = 0; i < segs.length; i++) {
      if (j.signal?.aborted) throw new DOMException("aborted", "AbortError");
      const seg = segs[i];
      await seek(v, seg.start);
      drawFrame(ctx, frame());
      if (i === 0) rec.start(1000); else rec.resume();
      raf = requestAnimationFrame(loop);
      await v.play();
      await new Promise<void>((res, rej) => {
        const tick = () => {
          if (j.signal?.aborted) { rej(new DOMException("aborted", "AbortError")); return; }
          j.onProgress?.(Math.min(1, (done + Math.max(0, v.currentTime - seg.start)) / total));
          if (v.currentTime >= seg.end - 0.02 || v.ended) { res(); return; }
          if ((v as any).requestVideoFrameCallback) (v as any).requestVideoFrameCallback(tick); else setTimeout(tick, 15);
        };
        tick();
      });
      v.pause();
      cancelAnimationFrame(raf);
      drawFrame(ctx, frame());
      rec.pause();
      done += seg.end - seg.start;
    }
    rec.stop();
    await stopped;
  } finally {
    cancelAnimationFrame(raf);
    try { v.pause(); } catch {}
    try { if (rec.state !== "inactive") rec.stop(); } catch {}
    stream.getTracks().forEach((t) => t.stop());
    ac.close().catch(() => {});
    v.removeAttribute("src"); v.load();
  }
  j.onProgress?.(1);
  return { blob: new Blob(chunks, { type: mime.split(";")[0] || `video/${ext}` }), ext };
}

/** A PNG thumbnail: the rendered frame (captions off) at `at` source seconds. */
export async function thumbnail(j: Omit<RenderJob, "onProgress" | "signal">, at: number): Promise<Blob> {
  await ensureFonts();
  const { segs, pages } = jobPieces(j);
  const v = await videoFor(j.url);
  await seek(v, at);
  const c = document.createElement("canvas");
  c.width = j.W; c.height = j.H;
  const edit = { ...j.edit, hook: { ...j.edit.hook, seconds: 9999 }, captions: { ...j.edit.captions, show: false } };
  drawFrame(c.getContext("2d")!, { video: v, edit, brand: j.brand, pages, segs, t: segs[0]?.start ?? at, W: j.W, H: j.H, logo: j.logo });
  v.removeAttribute("src"); v.load();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("thumbnail failed"))), "image/png"));
}

/** Small poster images for the clip list. */
export async function posters(url: string, times: number[], w = 240): Promise<string[]> {
  const v = await videoFor(url);
  const h = Math.round((w * v.videoHeight) / Math.max(1, v.videoWidth));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const out: string[] = [];
  for (const t of times) {
    try { await seek(v, t); ctx.drawImage(v, 0, 0, w, h); out.push(c.toDataURL("image/jpeg", 0.7)); } catch { out.push(""); }
  }
  v.removeAttribute("src"); v.load();
  return out;
}

/** Shrink an uploaded logo to ≤ 512 px PNG (data URL) so it fits in a project. */
export async function logoDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const s = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}

export function download(name: string, data: Blob | string, mime = "text/plain") {
  const blob = typeof data === "string" ? new Blob([data], { type: mime }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}
