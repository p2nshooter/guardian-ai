/* PROMPT LIBRARY v4 — My prompts: write, edit, duplicate and delete your own
 * prompts with {{variables}}, and let the AI optimise them. */
"use client";
import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { Spinner } from "@/components/ui";
import Markdown from "@/components/Markdown";
import ModelPicker, { type AiChoice } from "@/components/ai/ModelPicker";
import { extractVars, newId, type CustomPrompt, type LibraryState } from "@/lib/prompts/library";
import type { PromptsDict } from "@/lib/i18n-pages/prompts";
import { streamRun } from "./stream";

export default function Mine({ t, lang, state, onState, fields, onRun }: {
  t: PromptsDict; lang: Lang; state: LibraryState; onState: (u: (s: LibraryState) => LibraryState) => void; fields: { id: string; name: string; icon: string }[]; onRun: (p: CustomPrompt) => void;
}) {
  const [edit, setEdit] = useState<CustomPrompt | null>(null);
  const [ai, setAi] = useState<AiChoice>({ provider: "", model: "", research: false });
  const [opt, setOpt] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [err, setErr] = useState("");
  const blank = (): CustomPrompt => ({ id: newId("u"), title: "", field: "", body: "", notes: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  function save() {
    if (!edit || !edit.body.trim()) return;
    const p = { ...edit, title: edit.title.trim() || edit.body.trim().slice(0, 60), updatedAt: new Date().toISOString() };
    onState((s) => ({ ...s, custom: s.custom.some((x) => x.id === p.id) ? s.custom.map((x) => (x.id === p.id ? p : x)) : [p, ...s.custom] }));
    setEdit(null); setOpt("");
  }
  async function optimize() {
    if (!edit?.body.trim() || !ai.provider) return;
    setOptimizing(true); setErr(""); setOpt("");
    const r = await streamRun({ ai, mode: "optimize", messages: [{ role: "user", content: edit.body }], onText: setOpt });
    if (!r.ok) setErr(r.error || "");
    setOptimizing(false);
  }
  const improved = (() => { const m = opt.match(/## Improved prompt\s*```[a-z]*\n([\s\S]*?)```/i); return m ? m[1].trim() : ""; })();

  if (edit) {
    const vars = extractVars(edit.body);
    return (
      <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1fr)_380px]" data-testid="pl-editor">
        <section className="card-pad">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="text-sm">{t.promptTitle}<input className="input mt-1 w-full" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value.slice(0, 120) })} data-testid="pl-edit-title" /></label>
            <label className="text-sm">{t.promptField}<select className="select mt-1 w-full" value={edit.field} onChange={(e) => setEdit({ ...edit, field: e.target.value })}><option value="">—</option>{fields.map((f) => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}</select></label>
          </div>
          <label className="mt-2 block text-sm">{t.promptBody}<textarea className="textarea mt-1 min-h-[260px] w-full font-mono text-xs" placeholder={t.promptBodyPh} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value.slice(0, 20000) })} data-testid="pl-edit-body" /></label>
          <p className="mt-1 text-xs text-slate-500" data-testid="pl-edit-vars">{vars.length ? t.varsFound.replace("{vars}", vars.map((v) => `{{${v}}}`).join(", ")) : t.noVars}</p>
          <label className="mt-2 block text-sm">{t.notes}<input className="input mt-1 w-full" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value.slice(0, 2000) })} /></label>
          <div className="mt-3 flex gap-2"><button type="button" className="btn-primary" onClick={save} disabled={!edit.body.trim()} data-testid="pl-edit-save">{t.save}</button><button type="button" className="btn-ghost" onClick={() => { setEdit(null); setOpt(""); }}>{t.cancel}</button></div>
        </section>
        <aside className="card-pad">
          <div className="text-sm font-semibold text-slate-900">✨ {t.optimize}</div>
          <div className="mt-2"><ModelPicker lang={lang} value={ai} onChange={setAi} /></div>
          <button type="button" className="btn-secondary btn-sm mt-2 w-full" disabled={!ai.provider || !edit.body.trim() || optimizing} onClick={optimize} data-testid="pl-optimize">{optimizing ? <><Spinner /> {t.optimizing}</> : t.optimize}</button>
          {err ? <p className="mt-2 text-xs text-rose-700">⚠️ {err}</p> : null}
          {opt ? <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200 p-3" data-testid="pl-optimized"><div className="text-xs font-semibold text-slate-500">{t.optimized}</div><Markdown text={opt} className="prose-axto text-xs" /></div> : null}
          {improved && !optimizing ? <button type="button" className="btn-primary btn-sm mt-2 w-full" onClick={() => setEdit({ ...edit, body: improved })} data-testid="pl-use-improved">{t.useImproved}</button> : null}
        </aside>
      </div>
    );
  }
  return (
    <section className="card-pad">
      <div className="flex items-center gap-2"><h3 className="font-bold text-slate-900">{t.tabs.mine} <span className="font-normal text-slate-500">· {state.custom.length}</span></h3>
        <button type="button" className="btn-primary btn-sm ml-auto" onClick={() => setEdit(blank())} data-testid="pl-new">＋ {t.newPrompt}</button></div>
      {state.custom.length ? (
        <ul className="mt-2 divide-y divide-slate-100" data-testid="pl-mine">{state.custom.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onRun(p)}><div className="truncate font-semibold text-slate-800">{p.title}</div><div className="truncate text-xs text-slate-500">{extractVars(p.body).map((v) => `{{${v}}}`).join(" ") || p.body.slice(0, 80)}</div></button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => onRun(p)}>▶ {t.run}</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(p)}>{t.edit}</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => onState((s) => ({ ...s, custom: [{ ...p, id: newId("u"), title: `${p.title} (copy)` }, ...s.custom] }))}>{t.duplicate}</button>
            <button type="button" className="btn-ghost btn-sm text-rose-700" onClick={() => { if (window.confirm(t.confirmDel)) onState((s) => ({ ...s, custom: s.custom.filter((x) => x.id !== p.id), favorites: s.favorites.filter((r) => r !== `u:${p.id}`), collections: s.collections.map((c) => ({ ...c, items: c.items.filter((r) => r !== `u:${p.id}`) })) })); }} aria-label={`${t.del} ${p.title}`}>✕</button>
          </li>
        ))}</ul>
      ) : <p className="mt-2 text-sm text-slate-500">{t.myEmpty}</p>}
    </section>
  );
}
