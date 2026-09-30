/* SECURITY ANALYST v4 — the incident report, built from the case on the
 * device: preview, and export as Markdown, Word, STIX 2.1 or print / PDF. */
"use client";
import { useMemo } from "react";
import Markdown from "@/components/Markdown";
import { markdownToDocx } from "@/lib/export/docx";
import { reportMarkdown, type Case, type Computed } from "@/lib/security/case";
import { toStix } from "@/lib/security/ioc";
import type { SecurityDict } from "@/lib/i18n-pages/security";
import { download, slugName } from "./shared";

export default function Report({ t, c, k }: { t: SecurityDict; c: Case; k: Computed }) {
  const md = useMemo(() => reportMarkdown(c, k), [c, k]);
  const name = slugName(c.title);
  function print() {
    const w = window.open("", "_blank", "noopener,width=900,height=1000");
    const el = document.getElementById("sec-report-body");
    if (!w || !el) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${(c.title || t.untitled).replace(/</g, "&lt;")}</title><style>body{font:14px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;max-width:820px;margin:32px auto;padding:0 16px}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #e2e8f0;padding:4px 6px;text-align:left;font-size:12px}code{background:#f1f5f9;padding:0 3px;border-radius:3px}h1{font-size:24px}h2{font-size:18px;margin-top:24px}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }
  return (
    <div className="card-pad">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-slate-600">{t.reportSub}</p>
        <span className="ml-auto flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-report.md`, md, "text/markdown;charset=utf-8")} data-testid="sec-report-md">⬇️ {t.exportMd}</button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-report.docx`, markdownToDocx(md, { title: c.title || t.untitled, subtitle: "AXTO Security Analyst" }))}>⬇️ {t.exportDocx}</button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-stix.json`, toStix(k.iocs, { title: c.title || t.untitled }), "application/json")}>⬇️ {t.exportStix}</button>
          <button type="button" className="btn-ghost btn-sm" onClick={print}>🖨️ {t.print}</button>
        </span>
      </div>
      <div id="sec-report-body" className="mt-4 rounded-xl border border-slate-200 p-5" data-testid="sec-report"><Markdown text={md} className="prose-axto" /></div>
    </div>
  );
}
