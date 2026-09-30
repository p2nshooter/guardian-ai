/* AXTO — Legal AI v4 tools: shared pieces (document picker, downloads, AI hand-off). */
"use client";
import { useState } from "react";
import type { LegalToolsDict } from "@/lib/i18n-pages/legaltools";

/** A document the tools can read: the member's attached / matter documents, or the last AI answer. */
export interface ToolDoc { key: string; name: string; text: string }
/** Text picked or pasted into a tool. `key` is set when it came from a document. */
export interface DocSel { key: string; name: string; text: string }
export const EMPTY_SEL: DocSel = { key: "", name: "", text: "" };

/** Prepare an AI workspace from a tool: the member reviews it and presses Run. */
export interface Handoff {
  ws: string; fallback?: string; request: string; fields?: Record<string, string>;
  docs?: { key?: string; name: string; text: string }[];
  /** Include only these documents in the run (others stay attached but switched off). */
  onlyDocs?: boolean;
}

export function download(name: string, data: string | Blob, mime = "text/plain;charset=utf-8") {
  const blob = typeof data === "string" ? new Blob([data], { type: mime }) : data;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
export const fileSafe = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "legal-ai";

export function CopyText({ t, text, className = "btn-secondary btn-sm" }: { t: LegalToolsDict; text: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={className} onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {} }}>
      📋 {done ? t.copied : t.copy}
    </button>
  );
}

/** Pick one of the documents (or the last AI answer), or paste text. */
export function DocPicker({ t, label, docs, lastAnswer, value, onChange, id, rows = 8 }: {
  t: LegalToolsDict; label: string; docs: ToolDoc[]; lastAnswer?: string; value: DocSel; onChange: (v: DocSel) => void; id: string; rows?: number;
}) {
  const choose = (key: string) => {
    if (!key) { onChange({ key: "", name: "", text: value.key ? "" : value.text }); return; }
    if (key === "__answer") { onChange({ key, name: t.lastAnswer, text: lastAnswer || "" }); return; }
    const d = docs.find((x) => x.key === key);
    if (d) onChange({ key: d.key, name: d.name, text: d.text });
  };
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={`${id}-pick`}>{label}</label>
      <select id={`${id}-pick`} className="select mb-2" value={value.key} onChange={(e) => choose(e.target.value)} data-testid={`${id}-pick`}>
        <option value="">{t.pickDoc}</option>
        {lastAnswer ? <option value="__answer">🤖 {t.lastAnswer}</option> : null}
        {docs.map((d) => <option key={d.key} value={d.key}>📄 {d.name}</option>)}
      </select>
      <textarea id={id} className="textarea font-mono text-xs" rows={rows} value={value.text} placeholder={t.pasteHere} data-testid={id}
        onChange={(e) => onChange({ key: "", name: value.key ? value.name : "", text: e.target.value })} />
      <div className="mt-1 text-[11px] text-slate-500">{t.chars.replace("{n}", value.text.length.toLocaleString())}{value.key && value.name ? ` · ${value.name}` : ""}</div>
    </div>
  );
}

export function ToolIntro({ t, hint }: { t: LegalToolsDict; hint: string }) {
  return (
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-3xl text-sm text-slate-600">{hint}</p>
      <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">🔒 {t.onDevice}</span>
    </div>
  );
}

export function AiButton({ t, onClick, disabled, label }: { t: LegalToolsDict; onClick: () => void; disabled?: boolean; label?: string }) {
  return <button type="button" className="btn-primary btn-sm" onClick={onClick} disabled={disabled} title={t.sendAiHint} data-testid="tool-ai">🤖 {label || t.sendAi}</button>;
}

export const badge = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold";
