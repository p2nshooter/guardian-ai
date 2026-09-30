/* COMPLIANCE CENTER v4 — Risk register with a 5×5 heat map (inherent and
 * residual), treatments, owners, due dates and linked controls. */
"use client";
import { useState } from "react";
import { LIBRARY, controlKey } from "@/lib/compliance/controls";
import { RISK_CATEGORIES } from "@/lib/compliance/library";
import { newId, riskLevel, type Risk, type Workspace } from "@/lib/compliance/workspace";
import type { ComplianceDict } from "@/lib/i18n-pages/compliance";
import { HEAT, LEVEL_TONE, type WsUpdate } from "./shared";

const blank = (): Risk => ({ id: newId("r"), title: "", description: "", category: "security", owner: "", likelihood: 3, impact: 3, treatment: "mitigate", rLikelihood: 2, rImpact: 3, controls: [], status: "open" });

export default function Risks({ t, w, onWs, onAskAi }: { t: ComplianceDict; w: Workspace; onWs: (u: WsUpdate) => void; onAskAi: () => void }) {
  const [edit, setEdit] = useState<Risk | null>(null);
  const [view, setView] = useState<"inherent" | "residual">("residual");
  const [cell, setCell] = useState<[number, number] | null>(null);
  const [ctl, setCtl] = useState("");
  const keys = w.frameworks.flatMap((fw) => LIBRARY[fw].controls.map((c) => controlKey(fw, c.id)));
  const at = (r: Risk) => (view === "inherent" ? [r.likelihood, r.impact] : [r.rLikelihood, r.rImpact]);
  const list = w.risks.filter((r) => !cell || (at(r)[0] === cell[0] && at(r)[1] === cell[1]));
  const save = () => { if (!edit || !edit.title.trim()) return; const r = edit; onWs((p) => ({ ...p, risks: p.risks.some((x) => x.id === r.id) ? p.risks.map((x) => (x.id === r.id ? r : x)) : [...p.risks, r] })); setEdit(null); };
  const num = (v: number, on: (n: number) => void, label: string) => (
    <select className="select py-1 text-sm" value={v} onChange={(e) => on(Number(e.target.value))} aria-label={label}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
  );

  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="card-pad">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-900">{t.heatmap}</h3>
          <div className="ml-auto inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
            {(["inherent", "residual"] as const).map((v) => <button key={v} type="button" className={`rounded px-2 py-0.5 ${view === v ? "bg-slate-900 text-white" : ""}`} onClick={() => setView(v)}>{t[v]}</button>)}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <div className="flex w-5 items-center justify-center"><span className="-rotate-90 whitespace-nowrap text-[11px] text-slate-500">{t.likelihood} →</span></div>
          <div className="flex-1">
            <div className="grid grid-cols-5 gap-1" data-testid="comp-heatmap">
              {[5, 4, 3, 2, 1].flatMap((l) => [1, 2, 3, 4, 5].map((i) => {
                const n = w.risks.filter((r) => r.status !== "closed" && at(r)[0] === l && at(r)[1] === i).length;
                const on = cell?.[0] === l && cell?.[1] === i;
                return <button key={`${l}${i}`} type="button" onClick={() => setCell(on ? null : [l, i])} title={`${t.likelihood} ${l} × ${t.impact} ${i}`}
                  className={`flex aspect-square items-center justify-center rounded text-sm font-bold ${HEAT[riskLevel(l, i)]} ${on ? "ring-2 ring-ink-900" : ""}`}>{n || ""}</button>;
              }))}
            </div>
            <div className="mt-1 text-center text-[11px] text-slate-500">{t.impact} →</div>
          </div>
        </div>
        <button type="button" className="btn-ghost btn-sm mt-3" onClick={onAskAi}>🤖 {t.aiRisks}</button>
      </section>

      <section className="card-pad min-w-0">
        <div className="flex items-center gap-2"><h3 className="font-bold text-slate-900">{t.tabs.risks} <span className="font-normal text-slate-500">· {w.risks.length}</span></h3>
          <button type="button" className="btn-primary btn-sm ml-auto" onClick={() => setEdit(blank())} data-testid="comp-risk-add">＋ {t.addRisk}</button></div>
        {edit ? (
          <div className="mt-3 grid gap-2 rounded-xl border border-brand-200 bg-brand-50/40 p-3 sm:grid-cols-2" data-testid="comp-risk-form">
            <input className="input sm:col-span-2" placeholder={t.riskTitlePh} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value.slice(0, 200) })} aria-label={t.riskTitle} data-testid="comp-risk-title" />
            <textarea className="textarea min-h-[60px] text-sm sm:col-span-2" placeholder={t.riskDescription} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value.slice(0, 4000) })} />
            <label className="text-sm">{t.category}<select className="select mt-1 w-full py-1 text-sm" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as Risk["category"] })}>{RISK_CATEGORIES.map((c) => <option key={c} value={c}>{t.categories[c]}</option>)}</select></label>
            <label className="text-sm">{t.owner}<input className="input mt-1 w-full py-1" value={edit.owner} onChange={(e) => setEdit({ ...edit, owner: e.target.value.slice(0, 120) })} /></label>
            <div className="flex items-center gap-2 text-sm">{t.inherent}: {num(edit.likelihood, (n) => setEdit({ ...edit, likelihood: n }), `${t.inherent} ${t.likelihood}`)} × {num(edit.impact, (n) => setEdit({ ...edit, impact: n }), `${t.inherent} ${t.impact}`)}</div>
            <div className="flex items-center gap-2 text-sm">{t.residual}: {num(edit.rLikelihood, (n) => setEdit({ ...edit, rLikelihood: n }), `${t.residual} ${t.likelihood}`)} × {num(edit.rImpact, (n) => setEdit({ ...edit, rImpact: n }), `${t.residual} ${t.impact}`)}</div>
            <label className="text-sm">{t.treatment}<select className="select mt-1 w-full py-1 text-sm" value={edit.treatment} onChange={(e) => setEdit({ ...edit, treatment: e.target.value as Risk["treatment"] })}>{(Object.keys(t.treatments) as Risk["treatment"][]).map((x) => <option key={x} value={x}>{t.treatments[x]}</option>)}</select></label>
            <label className="text-sm">{t.status}<select className="select mt-1 w-full py-1 text-sm" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Risk["status"] })}>{(Object.keys(t.riskStatuses) as Risk["status"][]).map((x) => <option key={x} value={x}>{t.riskStatuses[x]}</option>)}</select></label>
            <label className="text-sm">{t.due}<input type="date" className="input mt-1 w-full py-1" value={edit.due || ""} onChange={(e) => setEdit({ ...edit, due: e.target.value })} /></label>
            <div className="text-sm sm:col-span-2">{t.linkedControls}
              <div className="mt-1 flex flex-wrap gap-1">{edit.controls.map((k) => <span key={k} className="badge-brand">{k}<button type="button" className="ml-1" onClick={() => setEdit({ ...edit, controls: edit.controls.filter((x) => x !== k) })} aria-label={`${t.remove} ${k}`}>×</button></span>)}</div>
              <input className="input mt-1 w-full py-1 text-sm" list="comp-control-keys" placeholder={t.linkedPh} value={ctl} onChange={(e) => setCtl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const k = keys.find((x) => x === ctl.trim()) || keys.find((x) => x.endsWith(`:${ctl.trim()}`)); if (k && !edit.controls.includes(k)) setEdit({ ...edit, controls: [...edit.controls, k] }); setCtl(""); } }} />
              <datalist id="comp-control-keys">{keys.slice(0, 600).map((k) => <option key={k} value={k} />)}</datalist>
            </div>
            <div className="flex gap-2 sm:col-span-2"><button type="button" className="btn-primary btn-sm" onClick={save} disabled={!edit.title.trim()} data-testid="comp-risk-save">{t.save}</button><button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(null)}>{t.cancel}</button></div>
          </div>
        ) : null}
        {list.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm" data-testid="comp-risk-table">
              <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="px-2 py-1.5">{t.riskTitle}</th><th className="px-2 py-1.5">{t.inherent}</th><th className="px-2 py-1.5">{t.residual}</th><th className="px-2 py-1.5">{t.treatment}</th><th className="px-2 py-1.5">{t.owner}</th><th className="px-2 py-1.5">{t.status}</th><th /></tr></thead>
              <tbody className="divide-y divide-slate-100">{list.map((r) => { const a = riskLevel(r.likelihood, r.impact), b = riskLevel(r.rLikelihood, r.rImpact); return (
                <tr key={r.id} data-testid="comp-risk-row">
                  <td className="px-2 py-1.5"><div className="font-medium text-slate-800">{r.title}</div><div className="text-[11px] text-slate-500">{t.categories[r.category]}{r.controls.length ? ` · ${r.controls.length} ${t.linkedControls.toLowerCase()}` : ""}</div></td>
                  <td className="px-2 py-1.5"><span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${LEVEL_TONE[a]}`}>{t.levels[a]} {r.likelihood}×{r.impact}</span></td>
                  <td className="px-2 py-1.5"><span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${LEVEL_TONE[b]}`}>{t.levels[b]} {r.rLikelihood}×{r.rImpact}</span></td>
                  <td className="px-2 py-1.5 text-xs">{t.treatments[r.treatment]}</td>
                  <td className="px-2 py-1.5 text-xs">{r.owner || "—"}</td>
                  <td className="px-2 py-1.5 text-xs">{t.riskStatuses[r.status]}{r.due ? ` · ${r.due}` : ""}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right"><button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(r)}>{t.edit}</button>
                    <button type="button" className="btn-ghost btn-sm text-rose-700" onClick={() => onWs((p) => ({ ...p, risks: p.risks.filter((x) => x.id !== r.id) }))} aria-label={`${t.remove} ${r.title}`}>✕</button></td>
                </tr>
              ); })}</tbody>
            </table>
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">{t.noRisks}</p>}
      </section>
    </div>
  );
}
