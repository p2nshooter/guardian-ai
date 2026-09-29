/* Documents for a Legal AI run: drag & drop or pick files (extracted in the
 * browser), paste text, include documents saved in the matter, size meter. */
"use client";
import { pick, type Lang } from "@/lib/i18n";
import { useRef, useState } from "react";
import { ACCEPT, extractFile, estimateTokens } from "@/lib/legal/extract";
import { Spinner } from "@/components/ui";
import { T } from "@/lib/i18n-pages/documents";

export interface RunDoc { key: string; name: string; text: string; pages?: number; kind: string; warning?: string; status: "reading" | "ready" | "error"; error?: string; savedId?: string; include: boolean; progress?: number }

export const MAX_RUN_TOKENS = 145_000;

export default function DocumentsPanel({ lang, docs, setDocs, required, canSave, onSave }: {
  lang: Lang; docs: RunDoc[]; setDocs: (fn: (d: RunDoc[]) => RunDoc[]) => void; required: boolean; canSave: boolean; onSave: (d: RunDoc) => Promise<void>;
}) {
  const t = pick(T, lang);
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState<{ name: string; text: string } | null>(null);
  const [saving, setSaving] = useState("");

  async function addFiles(files: FileList | File[]) {
    for (const f of Array.from(files)) {
      const key = `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setDocs((d) => [...d, { key, name: f.name, text: "", kind: "", status: "reading", include: true, progress: 0 }]);
      try {
        const r = await extractFile(f, (p) => setDocs((d) => d.map((x) => (x.key === key ? { ...x, progress: p } : x))));
        setDocs((d) => d.map((x) => (x.key === key ? { ...x, ...r, status: r.text.trim() ? "ready" : "error", error: r.text.trim() ? undefined : r.warning || "No text found." } : x)));
      } catch (e: any) {
        setDocs((d) => d.map((x) => (x.key === key ? { ...x, status: "error", error: String(e?.message || e) } : x)));
      }
    }
  }

  const included = docs.filter((d) => d.include && d.status === "ready");
  const tokens = estimateTokens(included.reduce((n, d) => n + d.text.length, 0));

  return (
    <section className="card-pad">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">📎 {t.title}{required ? <span className="ml-1 text-rose-600">*</span> : null}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t.hint}</p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setPaste({ name: "", text: "" })}>📋 {t.paste}</button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${drag ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50/60"}`}>
        <div className="text-2xl" aria-hidden="true">⬆️</div>
        <div className="mt-1 text-slate-600">{t.drop} <button type="button" className="font-semibold text-brand-700 underline" onClick={() => input.current?.click()}>{t.pick}</button></div>
        <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {paste ? (
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
          <input className="input" placeholder={t.pasteTitle} value={paste.name} onChange={(e) => setPaste({ ...paste, name: e.target.value })} />
          <textarea className="textarea min-h-[140px]" placeholder={t.pasteBody} value={paste.text} onChange={(e) => setPaste({ ...paste, text: e.target.value })} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setPaste(null)}>{t.cancel}</button>
            <button type="button" className="btn-primary btn-sm" disabled={!paste.text.trim()} onClick={() => {
              setDocs((d) => [...d, { key: `paste-${Date.now()}`, name: paste.name.trim() || `Pasted text ${d.length + 1}`, text: paste.text, kind: "Text", status: "ready", include: true }]);
              setPaste(null);
            }}>{t.add}</button>
          </div>
        </div>
      ) : null}

      {docs.length ? (
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {docs.map((d, i) => (
            <li key={d.key} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={d.include} disabled={d.status !== "ready"} aria-label={t.include}
                onChange={(e) => setDocs((all) => all.map((x) => (x.key === d.key ? { ...x, include: e.target.checked } : x)))} />
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">DOC-{docs.filter((x, j) => j <= i && x.include && x.status === "ready").length || "–"}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-slate-900">{d.name}</div>
                <div className="text-xs text-slate-500">
                  {d.status === "reading" ? <span className="inline-flex items-center gap-1"><Spinner className="h-3 w-3" /> {t.reading} {d.progress ? `${Math.round(d.progress * 100)}%` : ""}</span>
                    : d.status === "error" ? <span className="text-rose-600">{d.error}</span>
                    : <>{d.kind}{d.pages ? ` · ${d.pages} ${t.pages}` : ""} · {d.text.length.toLocaleString()} {t.chars}{d.savedId ? ` · ✓ ${t.saved}` : ""}</>}
                  {d.warning && d.status === "ready" ? <span className="ml-1 text-amber-700">· ⚠ {d.warning}</span> : null}
                </div>
              </div>
              {canSave && d.status === "ready" && !d.savedId ? (
                <button type="button" className="btn-ghost btn-sm" disabled={saving === d.key} onClick={async () => { setSaving(d.key); await onSave(d); setSaving(""); }}>
                  {saving === d.key ? <Spinner className="h-3 w-3" /> : "💾"} {t.save}
                </button>
              ) : null}
              <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => setDocs((all) => all.filter((x) => x.key !== d.key))} aria-label={t.remove}>✕</button>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-xs text-slate-400">{t.none}</p>}

      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-500"><span>{t.tokens}</span><span>{tokens.toLocaleString()} {t.limit}</span></div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${tokens > MAX_RUN_TOKENS ? "bg-rose-500" : tokens > MAX_RUN_TOKENS * 0.8 ? "bg-amber-500" : "bg-brand-500"}`} style={{ width: `${Math.min(100, (tokens / MAX_RUN_TOKENS) * 100)}%` }} />
        </div>
        {tokens > MAX_RUN_TOKENS ? <p className="mt-1 text-xs font-medium text-rose-600">{t.over}</p> : null}
      </div>
    </section>
  );
}
