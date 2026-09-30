/* AXTO — Legal AI v4: clause library (built-in + the member's own clauses) with placeholder filling. */
"use client";
import { useEffect, useMemo, useState } from "react";
import type { LegalToolsDict } from "@/lib/i18n-pages/legaltools";
import { CLAUSES, placeholders, fillClause, type LibraryClause, type ClauseVariant } from "@/lib/legal/clauses";
import { sanitizeClause, type LegalLibrary } from "@/lib/legal/library";
import { Alert, Modal, Spinner } from "@/components/ui";
import { AiButton, CopyText, ToolIntro, badge, type Handoff } from "./shared";

const CATEGORIES: LibraryClause["category"][] = ["General", "Commercial", "Risk", "Data & IP", "Disputes", "Employment"];
const LABELS: ClauseVariant["label"][] = ["Balanced", "Pro-supplier", "Pro-customer", "Pro-discloser", "Pro-recipient", "Pro-employer", "Short form"];

export default function Clauses({ t, library, saveLibrary, onHandoff }: {
  t: LegalToolsDict; library: LegalLibrary; saveLibrary: (next: LegalLibrary) => Promise<string | null>; onHandoff: (h: Handoff) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const all = useMemo(() => [...library.clauses.map((c) => ({ ...c, mine: true })), ...CLAUSES.map((c) => ({ ...c, mine: false }))], [library]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((c) => (!cat || c.category === cat) && (!s || `${c.name} ${c.notes} ${c.variants.map((v) => v.text).join(" ")}`.toLowerCase().includes(s)));
  }, [all, q, cat]);
  const [selId, setSelId] = useState(CLAUSES[0].id);
  const sel = all.find((c) => c.id === selId) || all[0];
  const [varId, setVarId] = useState("");
  const variant = sel?.variants.find((v) => v.id === varId) || sel?.variants[0];
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => { setVarId(""); }, [selId]);
  const holes = variant ? placeholders(variant.text) : [];
  const filled = variant ? fillClause(variant.text, values) : "";
  const [editing, setEditing] = useState<LibraryClause | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function saveEdit() {
    if (!editing) return;
    const clean = sanitizeClause(editing);
    if (!clean) { setErr(t.clauses.variantText); return; }
    setBusy(true);
    const exists = library.clauses.some((c) => c.id === clean.id);
    const e = await saveLibrary({ ...library, clauses: exists ? library.clauses.map((c) => (c.id === clean.id ? clean : c)) : [clean, ...library.clauses] });
    setBusy(false);
    if (e) { setErr(t.saveErr.replace("{msg}", e)); return; }
    setEditing(null); setSelId(clean.id);
  }
  async function remove() {
    if (!sel?.mine || !confirm(t.confirmDel)) return;
    const e = await saveLibrary({ ...library, clauses: library.clauses.filter((c) => c.id !== sel.id) });
    if (e) setErr(t.saveErr.replace("{msg}", e)); else setSelId(CLAUSES[0].id);
  }
  const stamp = () => Date.now().toString(36);

  return (
    <section className="card-pad" data-testid="tool-clauses">
      <ToolIntro t={t} hint={t.hints.clauses} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] [&>*]:min-w-0">
        <div>
          <input className="input mb-2" placeholder={t.clauses.search} value={q} onChange={(e) => setQ(e.target.value)} data-testid="cl-search" />
          <div className="mb-2 flex gap-2">
            <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t.clauses.category}>
              <option value="">{t.clauses.allCategories}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t.clauses.categories[c]}</option>)}
            </select>
            <button type="button" className="btn-secondary shrink-0" onClick={() => { setErr(""); setEditing({ id: `cl-${stamp()}`, name: "", category: "General", notes: "", variants: [{ id: `cv-${stamp()}`, label: "Balanced", text: "" }] }); }} data-testid="cl-new">＋</button>
          </div>
          <p className="mb-1 text-[11px] text-slate-500">{t.clauses.count.replace("{n}", String(list.length))}</p>
          <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200" data-testid="cl-list">
            {list.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelId(c.id)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${c.id === sel?.id ? "bg-brand-50 font-semibold text-brand-800" : "hover:bg-slate-50"}`}>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {c.mine ? <span className={`${badge} bg-brand-100 text-brand-800`}>{t.clauses.mine}</span> : <span className="shrink-0 text-[11px] text-slate-400">{t.clauses.categories[c.category]}</span>}
                </button>
              </li>
            ))}
            {!list.length ? <li className="px-3 py-4 text-sm text-slate-500">{t.clauses.none}</li> : null}
          </ul>
        </div>

        {sel && variant ? (
          <div data-testid="cl-detail">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-bold">{sel.name}</h3>
                <p className="text-xs text-slate-500">{t.clauses.categories[sel.category]}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className="btn-ghost btn-sm" onClick={() => { setErr(""); setEditing({ ...JSON.parse(JSON.stringify(sel)), id: `cl-${stamp()}`, name: `${sel.name} (${t.duplicate.toLowerCase()})`, variants: sel.variants.map((v, i) => ({ ...v, id: `cv-${stamp()}${i}` })) }); }}>⧉ {t.duplicate}</button>
                {sel.mine ? <button type="button" className="btn-ghost btn-sm" onClick={() => { setErr(""); setEditing(JSON.parse(JSON.stringify({ ...sel, mine: undefined }))); }}>✏️ {t.edit}</button> : null}
                {sel.mine ? <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={remove}>{t.del}</button> : null}
              </div>
            </div>
            {sel.variants.length > 1 ? (
              <div className="mt-3 inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                {sel.variants.map((v) => (
                  <button key={v.id} type="button" onClick={() => setVarId(v.id)} className={`rounded-md px-2.5 py-1 ${v.id === variant.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>{t.clauses.labels[v.label]}</button>
                ))}
              </div>
            ) : <div className="mt-3"><span className={`${badge} bg-slate-100 text-slate-700`}>{t.clauses.labels[variant.label]}</span></div>}
            {sel.notes ? <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">💡 <b>{t.clauses.notes}:</b> {sel.notes}</p> : null}
            {holes.length ? (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold">{t.clauses.fill}</h4>
                <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
                  {holes.map((h) => (
                    <label key={h} className="block"><span className="mb-0.5 block text-[11px] font-semibold text-slate-500">[{h}]</span>
                      <input className="input" value={values[h] || ""} placeholder={h} onChange={(e) => setValues({ ...values, [h]: e.target.value })} data-testid="cl-hole" /></label>
                  ))}
                </div>
              </div>
            ) : null}
            <h4 className="mb-1 mt-4 text-sm font-semibold">{t.clauses.preview}</h4>
            <p className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-3 font-serif text-[15px] leading-relaxed text-slate-800" data-testid="cl-text">
              {filled.split(/(\[[^\[\]]{1,80}\])/g).map((part, i) => /^\[[^\[\]]{1,80}\]$/.test(part) ? <mark key={i} className="rounded bg-amber-100 px-0.5 text-amber-900">{part}</mark> : <span key={i}>{part}</span>)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyText t={t} text={filled} />
              <AiButton t={t} onClick={() => onHandoff({ ws: "contract-draft", fallback: "ask", request: `${t.clauses.aiRequest}\n\n${sel.name} (${variant.label}):\n${filled}` })} />
            </div>
            <p className="mt-3 text-xs text-slate-500">{t.notAdvice}</p>
          </div>
        ) : null}
      </div>
      {err && !editing ? <div className="mt-3"><Alert tone="error">{err}</Alert></div> : null}

      <Modal open={!!editing} onClose={() => setEditing(null)} wide title={editing && library.clauses.some((c) => c.id === editing.id) ? t.edit : t.clauses.newClause}
        footer={<><button className="btn-ghost" onClick={() => setEditing(null)}>{t.cancel}</button><button className="btn-primary" onClick={saveEdit} disabled={busy || !editing?.name.trim()} data-testid="cl-save">{busy ? <Spinner /> : null} {t.save}</button></>}>
        {editing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="label">{t.clauses.clauseName}</span><input className="input" value={editing.name} maxLength={120} onChange={(e) => setEditing({ ...editing, name: e.target.value })} data-testid="cl-name" /></label>
              <label className="block"><span className="label">{t.clauses.category}</span>
                <select className="select" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as LibraryClause["category"] })}>{CATEGORIES.map((c) => <option key={c} value={c}>{t.clauses.categories[c]}</option>)}</select></label>
            </div>
            <label className="block"><span className="label">{t.clauses.notes}</span><textarea className="textarea" rows={2} maxLength={1500} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></label>
            {editing.variants.map((v, i) => (
              <div key={v.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div className="flex items-end gap-2">
                  <label className="flex-1"><span className="label">{t.clauses.variantLabel}</span>
                    <select className="select" value={v.label} onChange={(e) => setEditing({ ...editing, variants: editing.variants.map((x, j) => (j === i ? { ...x, label: e.target.value as ClauseVariant["label"] } : x)) })}>{LABELS.map((l) => <option key={l} value={l}>{t.clauses.labels[l]}</option>)}</select></label>
                  {editing.variants.length > 1 ? <button type="button" className="btn-ghost btn-sm pb-2 text-rose-600" onClick={() => setEditing({ ...editing, variants: editing.variants.filter((_, j) => j !== i) })}>✕</button> : null}
                </div>
                <label className="block"><span className="label">{t.clauses.variantText}</span><textarea className="textarea font-serif" rows={6} maxLength={8000} value={v.text} onChange={(e) => setEditing({ ...editing, variants: editing.variants.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} data-testid="cl-variant-text" /></label>
              </div>
            ))}
            {editing.variants.length < 6 ? <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing({ ...editing, variants: [...editing.variants, { id: `cv-${stamp()}`, label: "Pro-customer", text: "" }] })}>＋ {t.clauses.addVariant}</button> : null}
            {err ? <Alert tone="error">{err}</Alert> : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
