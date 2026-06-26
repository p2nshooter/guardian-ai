#!/usr/bin/env python3
"""Convert AXTO guide markdown files into styled, branded PDFs.

Used locally and by CI (guides:pdf job). Pure reportlab — no headless browser.
Usage: python scripts/ci/build-guide-pdfs.py <inDir> <outDir>
"""
import sys, os, re, html
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Preformatted,
                                Table, TableStyle)

NAVY = colors.HexColor("#0B1F3A"); BLUE = colors.HexColor("#1F4E8C")
GREEN = colors.HexColor("#1E7A46"); GREY = colors.HexColor("#5A6577")
CODEBG = colors.HexColor("#0E1726")
ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Heading1"], textColor=NAVY, fontSize=15, spaceBefore=12, spaceAfter=5)
H2 = ParagraphStyle("H2", parent=ss["Heading2"], textColor=BLUE, fontSize=12, spaceBefore=10, spaceAfter=3)
BODY = ParagraphStyle("Body", parent=ss["Normal"], fontSize=9.7, leading=14, textColor=colors.HexColor("#1B2430"))
QUOTE = ParagraphStyle("Quote", parent=BODY, textColor=GREY, leftIndent=8, fontName="Helvetica-Oblique")
LI = ParagraphStyle("LI", parent=BODY, leftIndent=12, bulletIndent=2, spaceAfter=1)
CODE = ParagraphStyle("Code", parent=ss["Code"], fontSize=8.3, leading=11.5,
                      textColor=colors.HexColor("#E6EDF6"), backColor=CODEBG,
                      borderPadding=(7, 7, 7, 7), spaceBefore=3, spaceAfter=7)


def inline(text):
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.+?)`", r'<font face="Courier" size="8.5">\1</font>', text)
    return text


def md_to_flowables(md):
    flow = []
    lines = md.split("\n")
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("```"):
            buf = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                buf.append(lines[i]); i += 1
            flow.append(Preformatted("\n".join(buf), CODE)); i += 1; continue
        if ln.startswith("# "):
            flow.append(Paragraph(inline(ln[2:]), H1))
        elif ln.startswith("## "):
            flow.append(Paragraph(inline(ln[3:]), H2))
        elif ln.startswith("> "):
            flow.append(Paragraph(inline(ln[2:]), QUOTE))
        elif ln.startswith("- "):
            flow.append(Paragraph("• " + inline(ln[2:]), LI))
        elif ln.strip() == "":
            flow.append(Spacer(1, 4))
        else:
            flow.append(Paragraph(inline(ln), BODY))
        i += 1
    return flow


def footer(c, d):
    c.saveState(); c.setFont("Helvetica", 7.5); c.setFillColor(GREY)
    c.drawString(20 * mm, 12 * mm, "AXTO — axto.io")
    c.drawRightString(190 * mm, 12 * mm, "Page %d" % d.page)
    c.setStrokeColor(colors.HexColor("#C4D0E0")); c.line(20 * mm, 15 * mm, 190 * mm, 15 * mm)
    c.restoreState()


def build(in_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    made = 0
    for fn in sorted(os.listdir(in_dir)):
        if not fn.endswith(".md"):
            continue
        md = open(os.path.join(in_dir, fn), encoding="utf-8").read()
        title = next((l[2:] for l in md.split("\n") if l.startswith("# ")), "AXTO Guide")
        out = os.path.join(out_dir, fn[:-3] + ".pdf")
        # branded header band
        band = Table([[Paragraph('<font color="white"><b>AXTO</b></font>',
                                 ParagraphStyle("b", parent=BODY, fontSize=18)),
                       Paragraph('<font color="#CFE0F5">Setup &amp; Usage Guide · axto.io</font>',
                                 ParagraphStyle("b2", parent=BODY, fontSize=9, alignment=2))]],
                     colWidths=[80 * mm, 90 * mm])
        band.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY),
                                  ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                  ("LEFTPADDING", (0, 0), (-1, -1), 14), ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                                  ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12)]))
        story = [band, Spacer(1, 10)] + md_to_flowables(md)
        SimpleDocTemplate(out, pagesize=A4, topMargin=16 * mm, bottomMargin=20 * mm,
                          leftMargin=20 * mm, rightMargin=20 * mm, title=title,
                          author="AXTO (axto.io)").build(story, onFirstPage=footer, onLaterPages=footer)
        made += 1
    print(f"Built {made} guide PDFs into {out_dir}")
    return made


if __name__ == "__main__":
    in_dir = sys.argv[1] if len(sys.argv) > 1 else "dist/guides"
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "dist/guides"
    build(in_dir, out_dir)
