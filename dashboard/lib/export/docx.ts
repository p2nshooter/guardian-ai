/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Markdown → Word (.docx) in the browser, no dependencies: WordprocessingML
 * generated from the same AST the screen renders (lib/markdown.ts), packed
 * with a minimal ZIP writer (stored entries + CRC-32).
 * Headings, paragraphs, bold/italic/code, hyperlinks, bullet and numbered
 * lists (nested), tables with a header row, quotes, rules and code blocks.
 * ============================================================================ */
import { parseMarkdown, stripStatus, type Block, type Inline } from "../markdown";

// ── ZIP (store) ──────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function zipStore(files: { name: string; data: string | Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true); lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true); local.set(name, 30);
    const cen = new Uint8Array(46 + name.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); cen.set(name, 46);
    parts.push(local, data);
    central.push(cen);
    offset += local.length + data.length;
  }
  const cenSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, cenSize, true); ev.setUint32(16, offset, true);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

// ── WordprocessingML ─────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Ctx { links: string[]; nums: { ordered: boolean; start: number }[] }

function runs(c: Inline[], ctx: Ctx, fmt: { b?: boolean; i?: boolean } = {}): string {
  return c.map((x) => {
    if (x.t === "text" || x.t === "code") {
      const rPr = `${fmt.b ? "<w:b/>" : ""}${fmt.i ? "<w:i/>" : ""}${x.t === "code" ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' : ""}`;
      return x.v.split("\n").map((seg, k) => `${k ? "<w:r><w:br/></w:r>" : ""}<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(seg)}</w:t></w:r>`).join("");
    }
    if (x.t === "b") return runs(x.c, ctx, { ...fmt, b: true });
    if (x.t === "i") return runs(x.c, ctx, { ...fmt, i: true });
    ctx.links.push(x.href);
    const id = `rIdL${ctx.links.length}`;
    return `<w:hyperlink r:id="${id}">${runs(x.c, ctx, fmt).replace(/<w:rPr>/g, '<w:rPr><w:rStyle w:val="Hyperlink"/>').replace(/<w:r><w:t/g, '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t')}</w:hyperlink>`;
  }).join("");
}

const para = (inner: string, pPr = "") => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${inner}</w:p>`;

function blocks(list: Block[], ctx: Ctx, level = 0, quote = false): string {
  return list.map((b) => {
    const q = quote ? '<w:pStyle w:val="Quote"/>' : "";
    switch (b.type) {
      case "h": return para(runs(b.c, ctx), `<w:pStyle w:val="Heading${Math.min(4, b.level)}"/>`);
      case "p": return para(runs(b.c, ctx), q);
      case "hr": return para("", '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>');
      case "code": return b.v.split("\n").map((l) => para(`<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${esc(l)}</w:t></w:r>`, '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:spacing w:after="0"/>')).join("");
      case "quote": return blocks(b.blocks, ctx, level, true);
      case "status": return "";
      case "ul": case "ol": {
        ctx.nums.push({ ordered: b.type === "ol", start: b.start });
        const numId = ctx.nums.length;
        return b.items.map((it) =>
          para(runs(it.c, ctx), `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${Math.min(level, 8)}"/><w:numId w:val="${numId}"/></w:numPr>`) +
          blocks(it.children, ctx, level + 1, quote)).join("");
      }
      case "table": {
        const cols = Math.max(b.head.length, ...b.rows.map((r) => r.length), 1);
        const cell = (c: Inline[], head: boolean, align: string) =>
          `<w:tc><w:tcPr>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="E2E8F0"/>' : ""}</w:tcPr>${para(runs(c, ctx, { b: head }), `<w:spacing w:after="0"/>${align !== "left" ? `<w:jc w:val="${align}"/>` : ""}`)}</w:tc>`;
        const row = (cells: Inline[][], head: boolean) =>
          `<w:tr>${head ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${Array.from({ length: cols }, (_, k) => cell(cells[k] || [], head, b.align[k] || "left")).join("")}</w:tr>`;
        return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>`).join("")}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${"<w:gridCol/>".repeat(cols)}</w:tblGrid>${row(b.head, true)}${b.rows.map((r) => row(r, false)).join("")}</w:tbl>${para("")}`;
      }
    }
  }).join("");
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
${[1, 2, 3, 4].map((n) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${[360, 280, 220, 180][n - 1]}" w:after="120"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="${[36, 30, 26, 23][n - 1]}"/></w:rPr></w:style>`).join("")}
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="99F6E4"/></w:pBdr></w:pPr><w:rPr><w:color w:val="334155"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0F766E"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr></w:style>
</w:styles>`;

function numbering(nums: Ctx["nums"]): string {
  const lvl = (ordered: boolean, i: number) => `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${ordered ? (["decimal", "lowerLetter", "lowerRoman"][i % 3]) : "bullet"}"/><w:lvlText w:val="${ordered ? `%${i + 1}.` : ["•", "◦", "▪"][i % 3]}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + i * 360}" w:hanging="360"/></w:pPr></w:lvl>`;
  const abs = [false, true].map((o, k) => `<w:abstractNum w:abstractNumId="${k}"><w:multiLevelType w:val="hybridMultilevel"/>${Array.from({ length: 9 }, (_, i) => lvl(o, i)).join("")}</w:abstractNum>`).join("");
  const inst = nums.map((n, k) => `<w:num w:numId="${k + 1}"><w:abstractNumId w:val="${n.ordered ? 1 : 0}"/>${n.ordered ? `<w:lvlOverride w:ilvl="0"><w:startOverride w:val="${n.start}"/></w:lvlOverride>` : ""}</w:num>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${abs}${inst}</w:numbering>`;
}

export function markdownToDocx(markdown: string, meta: { title: string; subtitle?: string; footer?: string }): Blob {
  const ctx: Ctx = { links: [], nums: [] };
  const header = para(`<w:r><w:rPr><w:b/><w:sz w:val="40"/></w:rPr><w:t xml:space="preserve">${esc(meta.title)}</w:t></w:r>`, '<w:spacing w:after="60"/>') +
    (meta.subtitle ? para(`<w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${esc(meta.subtitle)}</w:t></w:r>`, '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="CBD5E1"/></w:pBdr><w:spacing w:after="240"/>') : "");
  const body = blocks(parseMarkdown(stripStatus(markdown)), ctx);
  const footer = meta.footer ? para(`<w:r><w:rPr><w:i/><w:color w:val="64748B"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${esc(meta.footer)}</w:t></w:r>`, '<w:spacing w:before="360"/>') : "";
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${header}${body}${footer}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1134" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdN" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>${ctx.links.map((u, i) => `<Relationship Id="rIdL${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(u)}" TargetMode="External"/>`).join("")}</Relationships>`;
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const files = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
    { name: "docProps/core.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(meta.title)}</dc:title><dc:creator>AXTO Legal AI</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>` },
    { name: "word/document.xml", data: doc },
    { name: "word/styles.xml", data: STYLES },
    { name: "word/numbering.xml", data: numbering(ctx.nums) },
    { name: "word/_rels/document.xml.rels", data: rels },
  ];
  return new Blob([zipStore(files) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
