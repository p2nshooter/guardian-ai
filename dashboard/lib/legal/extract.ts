/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * Browser-side text extraction for uploaded documents — the file itself never
 * leaves the member's device; only the extracted text is sent to their own AI.
 *   PDF   pdf.js (self-hosted in /vendor/pdfjs), page markers [p.N]
 *   DOCX  built-in ZIP reader + WordprocessingML walker (headings, tables, footnotes)
 *   ODT   same ZIP reader, OpenDocument text
 *   TXT, MD, CSV, JSON, XML, HTML, EML, RTF
 * ============================================================================ */
"use client";

export interface Extracted { name: string; text: string; pages?: number; kind: string; warning?: string }

export const ACCEPT = ".pdf,.docx,.odt,.txt,.md,.markdown,.csv,.json,.xml,.html,.htm,.eml,.rtf,.log";
export const MAX_FILE_BYTES = 60 * 1024 * 1024;

// ── ZIP (for DOCX/ODT) ───────────────────────────────────────────────────────
async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzip(buf: ArrayBuffer, wanted: (name: string) => boolean): Promise<Map<string, Uint8Array>> {
  const b = new Uint8Array(buf);
  const v = new DataView(buf);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("This file is not a valid DOCX/ODT (ZIP) document.");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const csize = v.getUint32(p + 20, true);
    const nlen = v.getUint16(p + 28, true), xlen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(b.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (!wanted(name)) continue;
    const lnlen = v.getUint16(local + 26, true), lxlen = v.getUint16(local + 28, true);
    const start = local + 30 + lnlen + lxlen;
    const raw = b.subarray(start, start + csize);
    out.set(name, method === 0 ? raw.slice() : method === 8 ? await inflateRaw(raw) : new Uint8Array());
  }
  return out;
}

// ── DOCX ─────────────────────────────────────────────────────────────────────
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function docxParagraph(p: Element): string {
  let s = "";
  const walk = (el: Element) => {
    for (const c of Array.from(el.children)) {
      if (c.namespaceURI !== W) { walk(c); continue; }
      if (c.localName === "t") s += c.textContent || "";
      else if (c.localName === "tab") s += "\t";
      else if (c.localName === "br" || c.localName === "cr") s += "\n";
      else if (c.localName === "noBreakHyphen") s += "-";
      else if (c.localName === "footnoteReference") s += `[^${c.getAttributeNS(W, "id")}]`;
      else if (c.localName !== "pPr" && c.localName !== "rPr" && c.localName !== "instrText" && c.localName !== "delText") walk(c);
    }
  };
  walk(p);
  const style = p.getElementsByTagNameNS(W, "pStyle")[0]?.getAttributeNS(W, "val") || "";
  const h = style.match(/^(?:Heading|Judul)(\d)$/i);
  if (h && s.trim()) return `${"#".repeat(Math.min(6, Number(h[1])))} ${s.trim()}`;
  if (p.getElementsByTagNameNS(W, "numPr").length && s.trim()) return `- ${s.trim()}`;
  return s;
}

function docxBlock(el: Element, out: string[]) {
  for (const c of Array.from(el.children)) {
    if (c.namespaceURI !== W) continue;
    if (c.localName === "p") out.push(docxParagraph(c));
    else if (c.localName === "tbl") {
      for (const tr of Array.from(c.children).filter((x) => x.localName === "tr")) {
        const cells = Array.from(tr.children).filter((x) => x.localName === "tc").map((tc) => {
          const parts: string[] = [];
          docxBlock(tc, parts);
          return parts.join(" ").replace(/\s+/g, " ").trim();
        });
        out.push(`| ${cells.join(" | ")} |`);
      }
      out.push("");
    } else if (c.localName === "sdt" || c.localName === "sdtContent" || c.localName === "customXml") docxBlock(c, out);
  }
}

async function readDocx(buf: ArrayBuffer): Promise<string> {
  const files = await unzip(buf, (n) => n === "word/document.xml" || n === "word/footnotes.xml" || n === "word/endnotes.xml");
  const main = files.get("word/document.xml");
  if (!main) throw new Error("This DOCX has no document body.");
  const parse = (bytes: Uint8Array) => new DOMParser().parseFromString(new TextDecoder().decode(bytes), "application/xml");
  const out: string[] = [];
  const body = parse(main).getElementsByTagNameNS(W, "body")[0];
  if (body) docxBlock(body, out);
  for (const extra of ["word/footnotes.xml", "word/endnotes.xml"]) {
    const f = files.get(extra);
    if (!f) continue;
    const notes = Array.from(parse(f).getElementsByTagNameNS(W, extra.includes("foot") ? "footnote" : "endnote"))
      .filter((n) => Number(n.getAttributeNS(W, "id")) > 0)
      .map((n) => { const parts: string[] = []; docxBlock(n, parts); return `[^${n.getAttributeNS(W, "id")}]: ${parts.join(" ").trim()}`; });
    if (notes.length) out.push("", extra.includes("foot") ? "Footnotes:" : "Endnotes:", ...notes);
  }
  return out.join("\n");
}

async function readOdt(buf: ArrayBuffer): Promise<string> {
  const files = await unzip(buf, (n) => n === "content.xml");
  const c = files.get("content.xml");
  if (!c) throw new Error("This ODT has no content.");
  const doc = new DOMParser().parseFromString(new TextDecoder().decode(c), "application/xml");
  const out: string[] = [];
  const walk = (el: Element) => {
    for (const x of Array.from(el.children)) {
      if (x.localName === "h") out.push(`${"#".repeat(Number(x.getAttribute("text:outline-level") || 1))} ${x.textContent || ""}`);
      else if (x.localName === "p") out.push(x.textContent || "");
      else if (x.localName === "table-row") out.push(`| ${Array.from(x.children).map((cell) => (cell.textContent || "").trim()).join(" | ")} |`);
      else walk(x);
    }
  };
  walk(doc.documentElement);
  return out.join("\n");
}

// ── PDF ──────────────────────────────────────────────────────────────────────
let pdfjs: any = null;
export async function loadPdfJs() {
  if (pdfjs) return pdfjs;
  // Runtime-computed URL so the bundler leaves it as a real browser import of
  // our self-hosted copy (documents are parsed in the browser, never uploaded).
  const origin = typeof location !== "undefined" ? location.origin : "";
  const url = new URL("/vendor/pdfjs/pdf.min.mjs", origin).href;
  pdfjs = await import(/* webpackIgnore: true */ /* @vite-ignore */ url);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("/vendor/pdfjs/pdf.worker.min.mjs", origin).href;
  return pdfjs;
}

async function readPdf(buf: ArrayBuffer, onProgress?: (p: number) => void): Promise<{ text: string; pages: number; scanned: number }> {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  const parts: string[] = [];
  let scanned = 0;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    const lines: string[] = [];
    for (const it of content.items as any[]) {
      if (typeof it.str !== "string") continue;
      line += it.str;
      if (it.hasEOL) { lines.push(line); line = ""; }
    }
    if (line) lines.push(line);
    const pageText = lines.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (pageText.length < 25) scanned++;
    parts.push(`[p.${i}]\n${pageText}`);
    onProgress?.(i / doc.numPages);
    page.cleanup?.();
  }
  await doc.destroy?.();
  return { text: parts.join("\n\n"), pages: doc.numPages, scanned };
}

// ── other formats ────────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  const d = new DOMParser().parseFromString(html, "text/html");
  d.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
  d.querySelectorAll("br").forEach((n) => n.replaceWith("\n"));
  d.querySelectorAll("p,div,li,tr,h1,h2,h3,h4,h5,h6").forEach((n) => n.append("\n"));
  return (d.body?.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

function stripRtf(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, "\n").replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(Number(n) < 0 ? Number(n) + 65536 : Number(n)))
    .replace(/\{\\\*[^{}]*\}/g, "").replace(/\\[a-z]+-?\d* ?/gi, "").replace(/[{}]/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function decodeText(buf: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  // Mostly-replacement output means it wasn't UTF-8 — fall back to Windows-1252.
  const bad = (utf8.match(/�/g) || []).length;
  return bad > utf8.length / 50 ? new TextDecoder("windows-1252").decode(buf) : utf8;
}

export async function extractFile(file: File, onProgress?: (p: number) => void): Promise<Extracted> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 60 MB.`);
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const buf = await file.arrayBuffer();
  if (ext === "pdf" || file.type === "application/pdf") {
    const r = await readPdf(buf, onProgress);
    const warning = r.scanned === r.pages
      ? "This PDF looks scanned (no text layer). Run OCR first (e.g. in your PDF app) or paste the text."
      : r.scanned > 0 ? `${r.scanned} of ${r.pages} pages have no text layer (scanned) and were skipped.` : undefined;
    return { name: file.name, text: r.text, pages: r.pages, kind: "PDF", warning };
  }
  if (ext === "docx") return { name: file.name, text: await readDocx(buf), kind: "Word" };
  if (ext === "odt") return { name: file.name, text: await readOdt(buf), kind: "OpenDocument" };
  if (ext === "doc") throw new Error(`${file.name}: old .doc files aren't supported — save it as .docx or PDF.`);
  const raw = decodeText(buf);
  if (ext === "html" || ext === "htm") return { name: file.name, text: stripHtml(raw), kind: "HTML" };
  if (ext === "rtf") return { name: file.name, text: stripRtf(raw), kind: "RTF" };
  if (ext === "eml") {
    const [head, ...rest] = raw.split(/\r?\n\r?\n/);
    const keep = head.split(/\r?\n/).filter((l) => /^(from|to|cc|date|subject):/i.test(l)).join("\n");
    const body = rest.join("\n\n");
    return { name: file.name, text: `${keep}\n\n${/<html|<body|<div/i.test(body) ? stripHtml(body) : body}`.trim(), kind: "E-mail" };
  }
  if (/^(txt|md|markdown|csv|json|xml|log)$/.test(ext) || file.type.startsWith("text/")) return { name: file.name, text: raw, kind: ext.toUpperCase() || "Text" };
  throw new Error(`${file.name}: this file type isn't supported. Use PDF, DOCX, ODT, TXT, HTML, EML or RTF.`);
}

/** Rough token estimate for the size meter (≈ 4 characters per token). */
export const estimateTokens = (chars: number) => Math.ceil(chars / 4);
