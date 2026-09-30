/* PROMPT LIBRARY v4 — variable profiles that fill matching {{variables}}. */
"use client";
import { useState } from "react";
import { labelOf, newId, type LibraryState } from "@/lib/prompts/library";
import type { PromptsDict } from "@/lib/i18n-pages/prompts";

const COMMON = ["company", "product", "audience", "industry", "brand", "tone", "country", "role", "goal", "budget", "market", "offer"];

export default function Profiles({ t, state, onState }: { t: PromptsDict; state: LibraryState; onState: (u: (s: LibraryState) => LibraryState) => void }) {
  const [openId, setOpenId] = useState(state.activeProfile);
  const [key, setKey] = useState("");
  const p = state.profiles.find((x) => x.id === openId) || state.profiles[0];
  const setValues = (values: Record<string, string>) => onState((s) => ({ ...s, profiles: s.profiles.map((x) => (x.id === p.id ? { ...x, values } : x)) }));
  const addKey = (k: string) => { const kk = k.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40); if (kk && !(kk in p.values)) setValues({ ...p.values, [kk]: "" }); setKey(""); };
  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 xl:grid-cols-[300px_minmax(0,1fr)]">
      <section className="card-pad">
        <p className="text-xs text-slate-500">{t.profilesSub}</p>
        <ul className="mt-2 space-y-1" data-testid="pl-profiles">{state.profiles.map((x) => (
          <li key={x.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${x.id === p.id ? "bg-brand-50" : "hover:bg-slate-50"}`}>
            <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => setOpenId(x.id)}>{x.name}</button>
            {x.id === state.activeProfile ? <span className="badge-brand">{t.activeLabel}</span> : <button type="button" className="btn-ghost btn-sm" onClick={() => onState((s) => ({ ...s, activeProfile: x.id }))}>{t.setActive}</button>}
          </li>
        ))}</ul>
        <button type="button" className="btn-secondary btn-sm mt-2" onClick={() => { const np = { id: newId("pf"), name: `${t.newProfile} ${state.profiles.length + 1}`, values: {} }; onState((s) => ({ ...s, profiles: [...s.profiles, np].slice(0, 20) })); setOpenId(np.id); }} data-testid="pl-profile-add">＋ {t.newProfile}</button>
      </section>
      <section className="card-pad">
        <div className="flex flex-wrap items-center gap-2">
          <input className="input flex-1 font-semibold" value={p.name} onChange={(e) => onState((s) => ({ ...s, profiles: s.profiles.map((x) => (x.id === p.id ? { ...x, name: e.target.value.slice(0, 60) } : x)) }))} aria-label={t.profileName} data-testid="pl-profile-name" />
          {state.profiles.length > 1 ? <button type="button" className="btn-ghost btn-sm text-rose-700" onClick={() => { if (!window.confirm(t.confirmDel)) return; onState((s) => { const profiles = s.profiles.filter((x) => x.id !== p.id); return { ...s, profiles, activeProfile: s.activeProfile === p.id ? profiles[0].id : s.activeProfile }; }); setOpenId(state.profiles.find((x) => x.id !== p.id)!.id); }}>✕ {t.del}</button> : null}
        </div>
        <table className="mt-3 w-full text-sm"><thead className="text-xs text-slate-500"><tr><th className="py-1 text-left">{t.key}</th><th className="py-1 text-left">{t.value}</th><th /></tr></thead>
          <tbody>{Object.entries(p.values).map(([k, v]) => (
            <tr key={k}><td className="py-1 pr-2 font-mono text-xs text-slate-600">{`{{${k}}}`}</td>
              <td className="py-1"><input className="input w-full py-1" value={v} placeholder={labelOf(k)} onChange={(e) => setValues({ ...p.values, [k]: e.target.value.slice(0, 4000) })} data-testid={`pl-pv-${k}`} /></td>
              <td className="py-1 pl-2"><button type="button" className="text-xs text-slate-400 hover:text-rose-600" onClick={() => { const n = { ...p.values }; delete n[k]; setValues(n); }} aria-label={`${t.del} ${k}`}>✕</button></td></tr>
          ))}</tbody></table>
        <div className="mt-2 flex gap-2"><input className="input flex-1 py-1 text-sm" placeholder={t.key} value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addKey(key); }} data-testid="pl-pv-key" />
          <button type="button" className="btn-secondary btn-sm" onClick={() => addKey(key)} disabled={!key.trim()}>＋ {t.addValue}</button></div>
        <div className="mt-3 text-xs text-slate-500">{t.commonKeys}:</div>
        <div className="mt-1 flex flex-wrap gap-1">{COMMON.filter((k) => !(k in p.values)).map((k) => <button key={k} type="button" className="rounded-full border border-slate-200 px-2 py-0.5 font-mono text-[11px] text-slate-600 hover:border-brand-400" onClick={() => addKey(k)} data-testid={`pl-pk-${k}`}>{`{{${k}}}`}</button>)}</div>
      </section>
    </div>
  );
}
