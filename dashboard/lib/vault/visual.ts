/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PRIVACY VAULT — visual redaction ON THE DEVICE:
 *   PDF    every page is rendered (pdf.js), its text layer (or OCR for scanned
 *          pages) is matched to the findings, black boxes are painted over the
 *          exact characters, and the pages are rebuilt as images — the output
 *          has no text layer at all, so nothing can be copied back out
 *   image  OCR (Tesseract, English + Indonesian, self-hosted) finds the words;
 *          matching words are blacked out and a new PNG/JPEG is produced
 * ============================================================================ */
"use client";
import { loadPdfJs } from "../legal/extract";
import { imagePdf, type ImagePage } from "./pdfwriter";
import type { Finding } from "./pii";

type Redactor = { redact: (text: string) => { redacted: string; findings: Finding[] } };
interface Box { x: number; y: number; w: number; h: number }
interface Span { start: number; end: number; box: Box }

// ── OCR ──────────────────────────────────────────────────────────────────────
let ocr: Promise<any> | null = null;
function ocrWorker(): Promise<any> {
  if (ocr) return ocr;
  ocr = (async () => {
    // Runtime-computed URL so no bundler tries to resolve it: a real browser
    // import of our self-hosted copy (like pdf.js in lib/legal/extract).
    const url = new URL("/vendor/tesseract/tesseract.esm.min.js", location.origin).href;
    const T: any = await import(/* webpackIgnore: true */ /* @vite-ignore */ url);
    const lib = T.default || T;
    return lib.createWorker("eng+ind", 1, {
      workerPath: "/vendor/tesseract/worker.min.js", corePath: "/vendor/tesseract/core", langPath: "/vendor/tesseract/lang",
      gzip: false, workerBlobURL: false,
    });
  })();
  ocr.catch(() => { ocr = null; });
  return ocr;
}

/** OCR a canvas → text + a box per word (in canvas pixels). */
export async function ocrCanvas(c: HTMLCanvasElement): Promise<{ text: string; spans: Span[] }> {
  const w = await ocrWorker();
  const r = await w.recognize(c, {}, { blocks: true, text: true });
  let text = "";
  const spans: Span[] = [];
  for (const b of r.data.blocks || []) for (const p of b.paragraphs || []) {
    for (const l of p.lines || []) {
      for (const wd of l.words || []) {
        if (!wd.text) continue;
        if (text && !text.endsWith("\n")) text += " ";
        const start = text.length;
        text += wd.text;
        spans.push({ start, end: text.length, box: { x: wd.bbox.x0, y: wd.bbox.y0, w: wd.bbox.x1 - wd.bbox.x0, h: wd.bbox.y1 - wd.bbox.y0 } });
      }
      text += "\n";
    }
    text += "\n";
  }
  return { text, spans };
}

/** Paint black boxes over the part of each span a finding covers. */
function paint(ctx: CanvasRenderingContext2D, spans: Span[], findings: Finding[], proportional: boolean) {
  ctx.fillStyle = "#000";
  for (const f of findings) {
    for (const s of spans) {
      if (s.end <= f.start || s.start >= f.end) continue;
      const len = Math.max(1, s.end - s.start);
      const a = proportional ? Math.max(0, f.start - s.start) / len : 0;
      const b = proportional ? Math.min(len, f.end - s.start) / len : 1;
      const pad = Math.max(2, s.box.h * 0.12);
      ctx.fillRect(s.box.x + s.box.w * a - pad, s.box.y - pad, s.box.w * (b - a) + pad * 2, s.box.h + pad * 2);
    }
  }
}

const jpeg = (c: HTMLCanvasElement, q = 0.88) => new Promise<Uint8Array>((res, rej) => c.toBlob(async (b) => (b ? res(new Uint8Array(await b.arrayBuffer())) : rej(new Error("encode failed"))), "image/jpeg", q));

export interface VisualResult { bytes: Uint8Array; findings: Finding[]; pages: number; ocrPages: number; preview: string }

/** Redact a PDF into an image-only PDF. */
export async function redactPdf(buf: ArrayBuffer, redactor: Redactor, onProgress?: (p: number) => void): Promise<VisualResult> {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  const out: ImagePage[] = [];
  const all: Finding[] = [];
  let ocrPages = 0, preview = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp1 = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 2400 / Math.max(vp1.width, vp1.height));
    const vp = page.getViewport({ scale });
    const c = document.createElement("canvas");
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    // Text layer → spans in canvas pixels.
    const content = await page.getTextContent();
    let text = "";
    let spans: Span[] = [];
    for (const it of content.items as any[]) {
      if (typeof it.str !== "string") continue;
      const tx = pdfjs.Util.transform(vp.transform, it.transform);
      const h = Math.hypot(tx[2], tx[3]) || 10;
      const start = text.length;
      text += it.str;
      if (it.str) spans.push({ start, end: text.length, box: { x: tx[4], y: tx[5] - h, w: (it.width || 0) * scale, h: h * 1.15 } });
      if (it.hasEOL) text += "\n";
    }
    let proportional = true;
    if (text.replace(/\s/g, "").length < 20) {            // scanned page: read it with OCR
      const o = await ocrCanvas(c);
      text = o.text; spans = o.spans; proportional = false; ocrPages++;
    }
    const { findings } = redactor.redact(text);
    paint(ctx, spans, findings, proportional);
    all.push(...findings);
    out.push({ jpeg: await jpeg(c), width: c.width, height: c.height, pageWidth: vp1.width, pageHeight: vp1.height });
    if (i === 1) { const t = document.createElement("canvas"); t.width = 360; t.height = Math.round((360 * c.height) / c.width); t.getContext("2d")!.drawImage(c, 0, 0, t.width, t.height); preview = t.toDataURL("image/jpeg", 0.7); }
    onProgress?.(i / doc.numPages);
    page.cleanup?.();
  }
  return { bytes: imagePdf(out, { title: "Redacted document" }), findings: all, pages: doc.numPages, ocrPages, preview };
}

/** Redact an image with OCR. */
export async function redactImage(file: File, redactor: Redactor): Promise<VisualResult & { mime: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const s = Math.min(1, 3000 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const o = await ocrCanvas(c);
    const { findings } = redactor.redact(o.text);
    paint(ctx, o.spans, findings, false);
    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), mime, 0.92));
    const t = document.createElement("canvas"); t.width = 360; t.height = Math.round((360 * c.height) / c.width); t.getContext("2d")!.drawImage(c, 0, 0, t.width, t.height);
    return { bytes: new Uint8Array(await blob.arrayBuffer()), findings, pages: 1, ocrPages: 1, preview: t.toDataURL("image/jpeg", 0.7), mime };
  } finally { URL.revokeObjectURL(url); }
}
