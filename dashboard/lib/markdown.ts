/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * Small, safe Markdown parser → AST. Used by the on-screen renderer
 * (components/Markdown.tsx — React elements, never raw HTML) and the Word
 * exporter (lib/export/docx.ts), so screen and document always match.
 * Supports headings, paragraphs, bold/italic/code/links, nested lists,
 * ordered lists, blockquotes, tables, rules, code blocks, and AXTO status
 * lines ([[axto:search|…]]) emitted during live research.
 * ============================================================================ */

export type Inline =
  | { t: "text"; v: string }
  | { t: "b"; c: Inline[] }
  | { t: "i"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "a"; href: string; c: Inline[] };

export interface ListItem { c: Inline[]; children: Block[] }
export type Block =
  | { type: "h"; level: number; c: Inline[] }
  | { type: "p"; c: Inline[] }
  | { type: "ul" | "ol"; start: number; items: ListItem[] }
  | { type: "quote"; blocks: Block[] }
  | { type: "table"; head: Inline[][]; rows: Inline[][][]; align: ("left" | "center" | "right")[] }
  | { type: "hr" }
  | { type: "code"; lang: string; v: string }
  | { type: "status"; kind: string; v: string };

const STATUS = /^\[\[axto:(search|fetch|note)\|(.*)\]\]$/;

/** Remove in-band status lines (for saving and exporting). */
export const stripStatus = (md: string) => md.split("\n").filter((l) => !STATUS.test(l.trim())).join("\n").replace(/\n{3,}/g, "\n\n").trim();

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let i = 0, buf = "";
  const flush = () => { if (buf) { out.push({ t: "text", v: buf }); buf = ""; } };
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\" && i + 1 < src.length && /[\\`*_\[\]()#+\-.!|>~]/.test(src[i + 1])) { buf += src[i + 1]; i += 2; continue; }
    if (ch === "`") {
      const end = src.indexOf("`", i + 1);
      if (end > i) { flush(); out.push({ t: "code", v: src.slice(i + 1, end) }); i = end + 1; continue; }
    }
    if ((ch === "*" || ch === "_") && src[i + 1] === ch) {
      const end = src.indexOf(ch + ch, i + 2);
      if (end > i + 2) { flush(); out.push({ t: "b", c: parseInline(src.slice(i + 2, end)) }); i = end + 2; continue; }
    }
    if (ch === "*" || (ch === "_" && (i === 0 || /[\s(]/.test(src[i - 1])))) {
      const end = src.indexOf(ch, i + 1);
      if (end > i + 1 && !/\s/.test(src[i + 1]) && (ch === "*" || end + 1 >= src.length || /[\s.,;:!?)]/.test(src[end + 1]))) {
        flush(); out.push({ t: "i", c: parseInline(src.slice(i + 1, end)) }); i = end + 1; continue;
      }
    }
    if (ch === "[") {
      const close = src.indexOf("](", i + 1);
      const end = close > 0 ? src.indexOf(")", close + 2) : -1;
      if (close > i && end > close) {
        const href = src.slice(close + 2, end).trim();
        if (/^(https?:\/\/|mailto:)/i.test(href)) {
          flush(); out.push({ t: "a", href, c: parseInline(src.slice(i + 1, close)) }); i = end + 1; continue;
        }
      }
    }
    if (ch === "h" && /^https?:\/\/[^\s<>()]+/.test(src.slice(i)) && (i === 0 || /\s/.test(src[i - 1]))) {
      const m = src.slice(i).match(/^https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/);
      if (m) { flush(); out.push({ t: "a", href: m[0], c: [{ t: "text", v: m[0] }] }); i += m[0].length; continue; }
    }
    buf += ch; i++;
  }
  flush();
  return out;
}

const splitRow = (line: string) => {
  let l = line.trim();
  if (l.startsWith("|")) l = l.slice(1);
  if (l.endsWith("|") && !l.endsWith("\\|")) l = l.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < l.length; i++) {
    if (l[i] === "\\" && l[i + 1] === "|") { cur += "|"; i++; continue; }
    if (l[i] === "|") { cells.push(cur.trim()); cur = ""; continue; }
    cur += l[i];
  }
  cells.push(cur.trim());
  return cells;
};
const isSep = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const listRe = /^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/;

export function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  return parseLines(lines);
}

function parseLines(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  let para: string[] = [];
  const flushPara = () => { if (para.length) { blocks.push({ type: "p", c: parseInline(para.join(" ").trim()) }); para = []; } };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { flushPara(); i++; continue; }
    const st = trimmed.match(STATUS);
    if (st) { flushPara(); blocks.push({ type: "status", kind: st[1], v: st[2] }); i++; continue; }
    const fence = trimmed.match(/^(```|~~~)\s*([\w+-]*)/);
    if (fence) {
      flushPara();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++]);
      i++;
      blocks.push({ type: "code", lang: fence[2] || "", v: body.join("\n") });
      continue;
    }
    const h = trimmed.match(/^(#{1,6})\s+(.*?)\s*#*$/);
    if (h) { flushPara(); blocks.push({ type: "h", level: h[1].length, c: parseInline(h[2]) }); i++; continue; }
    if (/^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$/.test(trimmed)) { flushPara(); blocks.push({ type: "hr" }); i++; continue; }
    if (trimmed.startsWith(">")) {
      flushPara();
      const inner: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) inner.push(lines[i++].trim().replace(/^>\s?/, ""));
      blocks.push({ type: "quote", blocks: parseLines(inner) });
      continue;
    }
    if (trimmed.includes("|") && i + 1 < lines.length && isSep(lines[i + 1])) {
      flushPara();
      const head = splitRow(trimmed);
      const align = splitRow(lines[i + 1]).map((c) => (c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : "left")) as ("left" | "center" | "right")[];
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && lines[i].trim().includes("|") && lines[i].trim()) {
        const cells = splitRow(lines[i]);
        while (cells.length < head.length) cells.push("");
        rows.push(cells.slice(0, Math.max(head.length, 1)).map(parseInline));
        i++;
      }
      blocks.push({ type: "table", head: head.map(parseInline), rows, align });
      continue;
    }
    const li = line.match(listRe);
    if (li) {
      flushPara();
      const res = parseList(lines, i);
      blocks.push(res.block);
      i = res.next;
      continue;
    }
    para.push(trimmed);
    i++;
  }
  flushPara();
  return blocks;
}

function parseList(lines: string[], start: number): { block: Block; next: number } {
  const first = lines[start].match(listRe)!;
  const indent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const items: ListItem[] = [];
  let i = start;
  while (i < lines.length) {
    const m = lines[i].match(listRe);
    if (!m || m[1].length < indent || (m[1].length === indent && /\d/.test(m[2]) !== ordered)) {
      if (!m && lines[i].trim() && /^\s+/.test(lines[i]) && items.length) {   // continuation line
        const last = items[items.length - 1];
        last.c = [...last.c, { t: "text", v: " " }, ...parseInline(lines[i].trim())];
        i++; continue;
      }
      if (!m && !lines[i].trim() && i + 1 < lines.length && (lines[i + 1].match(listRe)?.[1].length ?? -1) >= indent) { i++; continue; }
      break;
    }
    if (m[1].length > indent) {
      const sub = parseList(lines, i);
      if (items.length) items[items.length - 1].children.push(sub.block);
      i = sub.next;
      continue;
    }
    items.push({ c: parseInline(m[3]), children: [] });
    i++;
  }
  return { block: { type: ordered ? "ol" : "ul", start: ordered ? parseInt(first[2], 10) || 1 : 1, items }, next: i };
}

export function inlineText(c: Inline[]): string {
  return c.map((x) => (x.t === "text" || x.t === "code" ? x.v : inlineText(x.c))).join("");
}
