/* COMPLIANCE CENTER v4 — Vendor risk: inventory, a weighted 20-question
 * security questionnaire, score, inherent and residual tiers, review dates. */
"use client";
import { useState } from "react";
import { CRITICALITIES, DATA_ACCESS, VENDOR_QUESTIONS, type Answer } from "@/lib/compliance/library";
import { newId, vendorScore, type Vendor, type Workspace } from "@/lib/compliance/workspace";
import type { ComplianceDict } from "@/lib/i18n-pages/compliance";
import { LEVEL_TONE, today, type WsUpdate } from "./shared";

const ANSWERS: Answer[] = ["yes", "partial", "no", "na"];

export default function Vendors({ t, w, onWs, onAskAi }: { t: ComplianceDict; w: Workspace; onWs: (u: WsUpdate) => void; onAskAi: (v: Vendor) => void }) {
  const [openId, setOpenId] = useState("");
  const v = w.vendors.find((x) => x.id === openId);
  const set = (id: string, patch: Partial<Vendor>) => onWs((p) => ({ ...p, vendors: p.vendors.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const add = () => { const nv: Vendor = { id: newId("v"), name: "", service: "", criticality: "medium", data: "internal", answers: {} }; onWs((p) => ({ ...p, vendors: [...p.vendors, nv] })); setOpenId(nv.id); };
  const d = today();

  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="card-pad">
        <div className="flex items-center gap-2"><h3 className="font-bold text-slate-900">{t.tabs.vendors} <span className="font-normal text-slate-500">· {w.vendors.length}</span></h3>
          <button type="button" className="btn-primary btn-sm ml-auto" onClick={add} data-testid="comp-vendor-add">＋ {t.addVendor}</button></div>
        {w.vendors.length ? (
          <ul className="mt-2 space-y-1" data-testid="comp-vendors">{w.vendors.map((x) => { const s = vendorScore(x); return (
            <li key={x.id}><button type="button" onClick={() => setOpenId(x.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${x.id === openId ? "bg-brand-50" : "hover:bg-slate-50"}`}>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-800">{x.name || "—"}</span><span className="block truncate text-[11px] text-slate-500">{x.service}{x.nextReview && x.nextReview <= d ? ` · ⏰ ${x.nextReview}` : ""}</span></span>
              <span className="text-xs text-slate-500">{s.answered ? `${s.pct}%` : t.unassessed}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${LEVEL_TONE[s.residual]}`}>{t.levels[s.residual]}</span>
            </button></li>
          ); })}</ul>
        ) : <p className="mt-2 text-sm text-slate-500">{t.noVendors}</p>}
      </section>
      {v ? (() => { const s = vendorScore(v); return (
        <section className="card-pad min-w-0" data-testid="comp-vendor-detail">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">{t.vendorName}<input className="input mt-1 w-full" value={v.name} onChange={(e) => set(v.id, { name: e.target.value.slice(0, 200) })} data-testid="comp-vendor-name" /></label>
            <label className="text-sm">{t.service}<input className="input mt-1 w-full" value={v.service} onChange={(e) => set(v.id, { service: e.target.value.slice(0, 300) })} /></label>
            <label className="text-sm">{t.criticality}<select className="select mt-1 w-full" value={v.criticality} onChange={(e) => set(v.id, { criticality: e.target.value as Vendor["criticality"] })} data-testid="comp-vendor-criticality">{CRITICALITIES.map((c) => <option key={c} value={c}>{t.levels[c]}</option>)}</select></label>
            <label className="text-sm">{t.dataAccess}<select className="select mt-1 w-full" value={v.data} onChange={(e) => set(v.id, { data: e.target.value as Vendor["data"] })} data-testid="comp-vendor-data">{DATA_ACCESS.map((c) => <option key={c} value={c}>{t.data[c]}</option>)}</select></label>
            <label className="text-sm">{t.lastReview}<input type="date" className="input mt-1 w-full" value={v.lastReview || ""} onChange={(e) => set(v.id, { lastReview: e.target.value })} /></label>
            <label className="text-sm">{t.nextReview}<input type="date" className="input mt-1 w-full" value={v.nextReview || ""} onChange={(e) => set(v.id, { nextReview: e.target.value })} /></label>
            <label className="text-sm sm:col-span-2">{t.contact}<input className="input mt-1 w-full" value={v.contact || ""} onChange={(e) => set(v.id, { contact: e.target.value.slice(0, 200) })} /></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <span><b>{t.vendorScore}</b> <span data-testid="comp-vendor-score">{s.answered ? `${s.pct}%` : t.unassessed}</span></span>
            <span><b>{t.inherentTier}</b> <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${LEVEL_TONE[s.inherent]}`}>{t.levels[s.inherent]}</span></span>
            <span><b>{t.residualTier}</b> <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${LEVEL_TONE[s.residual]}`} data-testid="comp-vendor-residual">{t.levels[s.residual]}</span></span>
            <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => onAskAi(v)}>🤖 {t.aiVendor}</button>
          </div>
          <h4 className="mt-4 font-semibold text-slate-900">{t.questionnaire}</h4>
          <ul className="mt-2 divide-y divide-slate-100">{VENDOR_QUESTIONS.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center gap-2 py-1.5 text-sm">
              <span className="min-w-0 flex-1 text-slate-700">{(t.vq as Record<string, string>)[q.id] || q.q}<span className="ml-1 text-[10px] text-slate-400">×{q.weight}</span></span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs" role="radiogroup" aria-label={q.id}>
                {ANSWERS.map((a) => <button key={a} type="button" role="radio" aria-checked={v.answers[q.id] === a} data-testid={`comp-vq-${q.id}-${a}`} onClick={() => set(v.id, { answers: { ...v.answers, [q.id]: a } })}
                  className={`rounded px-2 py-0.5 ${v.answers[q.id] === a ? (a === "yes" ? "bg-emerald-600 text-white" : a === "no" ? "bg-rose-600 text-white" : a === "partial" ? "bg-amber-500 text-white" : "bg-slate-500 text-white") : ""}`}>{t.answers[a]}</button>)}
              </div>
            </li>
          ))}</ul>
          <label className="mt-3 block text-sm">{t.notes}<textarea className="textarea mt-1 min-h-[70px] w-full text-sm" value={v.notes || ""} onChange={(e) => set(v.id, { notes: e.target.value.slice(0, 4000) })} /></label>
          <button type="button" className="btn-ghost btn-sm mt-2 text-rose-700" onClick={() => { onWs((p) => ({ ...p, vendors: p.vendors.filter((x) => x.id !== v.id) })); setOpenId(""); }}>✕ {t.remove}</button>
        </section>
      ); })() : null}
    </div>
  );
}
