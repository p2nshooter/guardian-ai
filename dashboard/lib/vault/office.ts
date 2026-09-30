/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PRIVACY VAULT — redact a Word (.docx) or Excel (.xlsx) file IN PLACE, on the
 * device: every text run in the body, tables, headers, footers, footnotes,
 * comments, shared strings and inline cells is redacted, and author metadata
 * is wiped. Layout, styles and tables are kept; a paragraph that contained
 * personal data keeps its paragraph style (its text goes into its first run).
 * ============================================================================ */
import { unzip } from "../legal/extract";
import { zipStore } from "../export/docx";

const unxml = (s: string) => s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e: string) => {
  const k = e.toLowerCase();
  if (k === "amp") return "&"; if (k === "lt") return "<"; if (k === "gt") return ">"; if (k === "quot") return '"'; if (k === "apos") return "'";
  const code = k.startsWith("#x") ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
  return Number.isFinite(code) ? String.fromCodePoint(code) : m;
});
const toxml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Redact the text of each block (w:p, a:p, si, is) inside one XML part. */
export function redactXml(xml: string, block: RegExp, run: RegExp, redact: (s: string) => string): { xml: string; changed: number } {
  let changed = 0;
  const out = xml.replace(block, (para) => {
    const runs = Array.from(para.matchAll(run));
    if (!runs.length) return para;
    const text = runs.map((m) => unxml(m[2])).join("");
    const red = redact(text);
    if (red === text) return para;
    changed++;
    let i = 0;
    return para.replace(run, (_m, open: string) => {
      const tag = open.replace(/\s*\/?>$/, "").replace(/\s+xml:space="[^"]*"/, "");
      const close = `</${tag.match(/^<([\w:]+)/)![1]}>`;
      const body = i++ === 0 ? toxml(red) : "";
      return `${tag} xml:space="preserve">${body}${close}`;
    });
  });
  return { xml: out, changed };
}

const DOCX_PARTS = /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;
const XLSX_PARTS = /^xl\/(sharedStrings|worksheets\/sheet\d+|comments\d*)\.xml$/;

function wipeCore(xml: string): string {
  return xml
    .replace(/<dc:creator>[\s\S]*?<\/dc:creator>/, "<dc:creator>Redacted</dc:creator>")
    .replace(/<cp:lastModifiedBy>[\s\S]*?<\/cp:lastModifiedBy>/, "<cp:lastModifiedBy>Redacted</cp:lastModifiedBy>")
    .replace(/<dc:title>[\s\S]*?<\/dc:title>/, "<dc:title>Redacted document</dc:title>")
    .replace(/<cp:keywords>[\s\S]*?<\/cp:keywords>/, "<cp:keywords></cp:keywords>")
    .replace(/<dc:description>[\s\S]*?<\/dc:description>/, "<dc:description></dc:description>");
}

/** Returns the redacted file and how many text blocks changed. */
export async function redactOffice(buf: ArrayBuffer, kind: "docx" | "xlsx", redact: (s: string) => string): Promise<{ bytes: Uint8Array; changed: number }> {
  const files = await unzip(buf, () => true);
  const dec = new TextDecoder(), enc = new TextEncoder();
  let changed = 0;
  const out: { name: string; data: Uint8Array }[] = [];
  for (const [name, data] of files) {
    if (name.endsWith("/")) continue;
    let bytes = data;
    if (kind === "docx" && DOCX_PARTS.test(name)) {
      const r = redactXml(dec.decode(data), /<w:p[\s>][\s\S]*?<\/w:p>/g, /(<w:t(?:\s[^>]*)?>)([^<]*)<\/w:t>/g, redact);
      changed += r.changed; bytes = enc.encode(r.xml);
    } else if (kind === "xlsx" && XLSX_PARTS.test(name)) {
      const xml = dec.decode(data);
      const block = name.includes("sharedStrings") ? /<si>[\s\S]*?<\/si>/g : name.includes("comments") ? /<comment[\s>][\s\S]*?<\/comment>/g : /<is>[\s\S]*?<\/is>/g;
      const r = redactXml(xml, block, /(<t(?:\s[^>]*)?>)([^<]*)<\/t>/g, redact);
      changed += r.changed; bytes = enc.encode(r.xml);
    } else if (name === "docProps/core.xml") {
      bytes = enc.encode(wipeCore(dec.decode(data)));
    }
    out.push({ name, data: bytes });
  }
  return { bytes: zipStore(out), changed };
}
