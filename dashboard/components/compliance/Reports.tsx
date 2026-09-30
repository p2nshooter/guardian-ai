/* COMPLIANCE CENTER v4 — Reports & exports: readiness report (Markdown,
 * Word, print / PDF), controls CSV, ISO 27001 Statement of Applicability,
 * risk register and vendor CSVs, and a JSON backup / import of the programme. */
"use client";
import { useMemo, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { markdownToDocx } from "@/lib/export/docx";
import { controlsCsv, reportMarkdown, risksCsv, soaMarkdown, upgradeWorkspace, vendorsCsv, type Workspace } from "@/lib/compliance/workspace";
import type { ComplianceDict } from "@/lib/i18n-pages/compliance";
import { download, slugName, type WsUpdate } from "./shared";

export default function Reports({ t, w, onWs }: { t: ComplianceDict; w: Workspace; onWs: (u: WsUpdate) => void }) {
  const md = useMemo(() => reportMarkdown(w), [w]);
  const name = slugName(w.org.name || w.name);
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const title = `${w.org.name || w.name || t.untitled}`;
  function print() {
    const el = document.getElementById("comp-report-body");
    const win = window.open("", "_blank", "noopener,width=900,height=1000");
    if (!win || !el) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title><style>body{font:14px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;max-width:860px;margin:32px auto;padding:0 16px}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #e2e8f0;padding:4px 6px;text-align:left;font-size:12px}h1{font-size:24px}h2{font-size:18px;margin-top:24px}</style></head><body>${el.innerHTML}</body></html>`);
    win.document.close(); win.focus(); setTimeout(() => win.print(), 300);
  }
  async function importJson(f: File) {
    try {
      const j = JSON.parse(await f.text());
      if (j?.v !== 4 || !Array.isArray(j.frameworks)) throw new Error("bad");
      onWs(upgradeWorkspace(j, j.name));
      setMsg(t.importDone);
    } catch { setMsg(t.importBad); }
  }
  const hasIso = w.frameworks.includes("iso27001");
  return (
    <div className="space-y-4">
      <section className="card-pad">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-slate-600">{t.reportSub}</p>
          <span className="ml-auto flex flex-wrap gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-readiness.md`, md, "text/markdown;charset=utf-8")} data-testid="comp-report-md">⬇️ {t.exportMd}</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-readiness.docx`, markdownToDocx(md, { title, subtitle: "AXTO Compliance Center" }))} data-testid="comp-report-docx">⬇️ {t.exportDocx}</button>
            <button type="button" className="btn-ghost btn-sm" onClick={print}>🖨️ {t.print}</button>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-controls.csv`, controlsCsv(w), "text/csv")} data-testid="comp-csv-controls">⬇️ {t.csvControls}</button>
          <button type="button" className="btn-secondary btn-sm" disabled={!hasIso} title={hasIso ? "" : t.soaNeedsIso} onClick={() => download(`${name}-soa.docx`, markdownToDocx(soaMarkdown(w), { title: t.soa, subtitle: title }))} data-testid="comp-soa">⬇️ {t.soa} (Word)</button>
          <button type="button" className="btn-secondary btn-sm" disabled={!hasIso} onClick={() => download(`${name}-soa.md`, soaMarkdown(w), "text/markdown;charset=utf-8")}>⬇️ {t.soa} (MD)</button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-risks.csv`, risksCsv(w), "text/csv")} data-testid="comp-csv-risks">⬇️ {t.csvRisks}</button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-vendors.csv`, vendorsCsv(w), "text/csv")}>⬇️ {t.csvVendors}</button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => download(`${name}-programme.json`, JSON.stringify(w, null, 1), "application/json")} data-testid="comp-backup">⬇️ {t.backup}</button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => file.current?.click()}>⬆️ {t.importJson}</button>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" data-testid="comp-import" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
        </div>
        {!hasIso ? <p className="mt-2 text-xs text-slate-500">{t.soaNeedsIso}</p> : null}
        {msg ? <p className="mt-2 text-sm text-slate-700" data-testid="comp-import-msg">{msg}</p> : null}
      </section>
      <div id="comp-report-body" className="card-pad" data-testid="comp-report"><Markdown text={md} className="prose-axto" /></div>
    </div>
  );
}
