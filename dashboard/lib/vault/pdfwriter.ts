/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PRIVACY VAULT — a minimal PDF writer: one JPEG per page, nothing else. A
 * redacted PDF built this way has NO text layer and no hidden objects, so a
 * blacked-out value cannot be copied, searched or recovered (true redaction).
 * ============================================================================ */

export interface ImagePage { jpeg: Uint8Array; width: number; height: number; pageWidth: number; pageHeight: number }

export function imagePdf(pages: ImagePage[], meta: { title?: string; producer?: string } = {}): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const put = (x: string | Uint8Array) => { const b = typeof x === "string" ? enc.encode(x) : x; chunks.push(b); pos += b.length; };
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, "?");
  const n = pages.length;
  const pageId = (i: number) => 4 + i * 3, imgId = (i: number) => 5 + i * 3, contentId = (i: number) => 6 + i * 3;
  const total = 3 + n * 3;
  const obj = (id: number, body: string | (() => void)) => {
    offsets[id] = pos;
    put(`${id} 0 obj\n`);
    if (typeof body === "string") put(body); else body();
    put("\nendobj\n");
  };

  put("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] /Count ${n} >>`);
  obj(3, `<< /Producer (${esc(meta.producer || "AXTO Privacy Vault")}) /Title (${esc(meta.title || "Redacted document")}) >>`);
  pages.forEach((p, i) => {
    const w = +p.pageWidth.toFixed(2), h = +p.pageHeight.toFixed(2);
    obj(pageId(i), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${imgId(i)} 0 R >> >> /Contents ${contentId(i)} 0 R >>`);
    obj(imgId(i), () => {
      put(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      put(p.jpeg);
      put("\nendstream");
    });
    const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    obj(contentId(i), `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  const xref = pos;
  put(`xref\n0 ${total + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= total; id++) put(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  put(`trailer\n<< /Size ${total + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(pos);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
