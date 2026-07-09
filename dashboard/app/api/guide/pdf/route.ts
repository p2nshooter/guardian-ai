/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getGuide, SUPPORTED_LANGUAGES, type LangCode } from "@/lib/guide-i18n";

/**
 * GET /api/guide/pdf?lang=en
 * Generates a downloadable PDF setup guide in the requested language.
 * Uses plain text PDF generation (no heavy libs needed on edge).
 */

function escPdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdfBytes(lang: LangCode): Uint8Array<ArrayBuffer> {
  const guide = getGuide(lang);
  const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang);

  // Build page content as text lines
  const lines: string[] = [];
  const addLine = (text: string) => lines.push(text);
  const addBlank = () => lines.push("");

  addLine(guide.title);
  addLine(guide.subtitle);
  addBlank();

  // Prerequisites
  addLine("═══ PREREQUISITES ═══");
  guide.prerequisites.forEach((p, i) => addLine(`  ${i + 1}. ${p}`));
  addBlank();

  // Download steps
  addLine("═══ DOWNLOAD ═══");
  guide.downloadSteps.forEach((s, i) => addLine(`  ${i + 1}. ${s}`));
  addBlank();

  // Guardian AI
  addLine(`═══ ${guide.guardian.productName.toUpperCase()} ═══`);
  addLine(guide.guardian.overview);
  addBlank();
  addLine("Architecture:");
  guide.guardian.architecture.forEach(a => addLine(`  • ${a.component}: ${a.role}`));
  addBlank();
  addLine("Features:");
  guide.guardian.features.forEach(f => {
    addLine(`  ▸ ${f.name}`);
    addLine(`    ${f.description}`);
  });
  addBlank();
  addLine("Setup Steps:");
  guide.guardian.setupSteps.forEach((s, i) => addLine(`  ${i + 1}. ${s}`));
  addBlank();
  addLine("Configuration (guardian.yml):");
  guide.guardian.configExample.split("\n").forEach(l => addLine(`    ${l}`));
  addBlank();
  addLine(`Verify: ${guide.guardian.verifyCommand}`);
  addLine(`Expected: ${guide.guardian.verifyExpected}`);
  addBlank();

  // Orchestra AI
  addLine(`═══ ${guide.orchestra.productName.toUpperCase()} ═══`);
  addLine(guide.orchestra.overview);
  addBlank();
  addLine("Architecture:");
  guide.orchestra.architecture.forEach(a => addLine(`  • ${a.component}: ${a.role}`));
  addBlank();
  addLine("Features:");
  guide.orchestra.features.forEach(f => {
    addLine(`  ▸ ${f.name}`);
    addLine(`    ${f.description}`);
  });
  addBlank();
  addLine("Setup Steps:");
  guide.orchestra.setupSteps.forEach((s, i) => addLine(`  ${i + 1}. ${s}`));
  addBlank();
  addLine("Configuration (orchestra.yml):");
  guide.orchestra.configExample.split("\n").forEach(l => addLine(`    ${l}`));
  addBlank();
  addLine(`Verify: ${guide.orchestra.verifyCommand}`);
  addLine(`Expected: ${guide.orchestra.verifyExpected}`);
  addBlank();

  // Antivirus
  addLine("═══ ANTIVIRUS ═══");
  guide.antivirus.forEach(a => {
    addLine(`  ▸ ${a.name}: ${a.description}`);
  });
  addBlank();

  // Support
  addLine("═══ SUPPORT ═══");
  guide.support.forEach(s => addLine(`  ${s.label}: ${s.value}`));
  addBlank();
  addLine(guide.pdfFooter);

  // Generate minimal valid PDF
  const textContent = lines.join("\n");
  const pageLines = textContent.split("\n");
  const linesPerPage = 58;
  const pages: string[][] = [];
  for (let i = 0; i < pageLines.length; i += linesPerPage) {
    pages.push(pageLines.slice(i, i + linesPerPage));
  }

  // Build PDF manually (valid PDF 1.4)
  let pdf = "%PDF-1.4\n";
  const objects: string[] = [];
  let objNum = 1;

  // Catalog
  const catalogObj = objNum++;
  objects.push(`${catalogObj} 0 obj\n<< /Type /Catalog /Pages ${catalogObj + 1} 0 R >>\nendobj`);

  // Pages parent
  const pagesObj = objNum++;
  const pageObjNums: number[] = [];
  // Reserve page objects
  for (let i = 0; i < pages.length; i++) {
    pageObjNums.push(objNum + i * 2);
  }
  const kidsStr = pageObjNums.map(n => `${n} 0 R`).join(" ");
  objects.push(`${pagesObj} 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pages.length} >>\nendobj`);

  // Font
  const fontObj = objNum + pages.length * 2;

  // Pages + content streams
  for (let p = 0; p < pages.length; p++) {
    const pageObj = objNum++;
    const contentObj = objNum++;

    // Build content stream
    let stream = "BT\n/F1 9 Tf\n36 780 Td\n11 TL\n";
    for (const line of pages[p]) {
      stream += `(${escPdf(line)}) Tj T*\n`;
    }
    stream += "ET";
    const streamBytes = new TextEncoder().encode(stream);

    objects.push(`${pageObj} 0 obj\n<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontObj} 0 R >> >> >>\nendobj`);
    objects.push(`${contentObj} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream\nendobj`);
  }

  // Font object
  objNum = fontObj;
  objects.push(`${fontObj} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj`);

  // Build final PDF
  const offsets: number[] = [];
  let body = "";
  for (const obj of objects) {
    offsets.push(pdf.length + body.length);
    body += obj + "\n";
  }
  pdf += body;

  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }

  pdf += "trailer\n";
  pdf += `<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF\n";

  return new TextEncoder().encode(pdf);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lang = (url.searchParams.get("lang") || "en") as LangCode;

  // Validate language
  const validLang = SUPPORTED_LANGUAGES.find(l => l.code === lang);
  if (!validLang) {
    return NextResponse.json(
      { error: "Unsupported language", supported: SUPPORTED_LANGUAGES.map(l => l.code) },
      { status: 400 }
    );
  }

  try {
    const pdfBytes = buildPdfBytes(lang);
    const langLabel = validLang.label.replace(/[^a-zA-Z]/g, "");

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="AXTO-Setup-Guide-${langLabel}.pdf"`,
        "Content-Length": String(pdfBytes.length),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
