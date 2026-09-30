/* COMPLIANCE CENTER v4 — Profile: the organisation and the frameworks in scope. */
"use client";
import { FRAMEWORKS, type FrameworkId } from "@/lib/compliance/frameworks";
import { LIBRARY } from "@/lib/compliance/controls";
import type { OrgProfile, Workspace } from "@/lib/compliance/workspace";
import type { ComplianceDict } from "@/lib/i18n-pages/compliance";
import type { WsUpdate } from "./shared";

export default function Profile({ t, w, onWs }: { t: ComplianceDict; w: Workspace; onWs: (u: WsUpdate) => void }) {
  const set = (k: keyof OrgProfile, v: string) => onWs((p) => ({ ...p, org: { ...p.org, [k]: v.slice(0, k === "description" ? 4000 : 1000) } }));
  const toggle = (fw: FrameworkId) => onWs((p) => ({ ...p, frameworks: p.frameworks.includes(fw) ? p.frameworks.filter((x) => x !== fw) : [...p.frameworks, fw] }));
  const field = (k: keyof OrgProfile, label: string, long = false) => (
    <label className={long ? "sm:col-span-2" : ""}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {long ? <textarea className="textarea mt-1 min-h-[80px] w-full text-sm" value={w.org[k]} onChange={(e) => set(k, e.target.value)} data-testid={`comp-org-${k}`} />
        : <input className="input mt-1 w-full" value={w.org[k]} onChange={(e) => set(k, e.target.value)} data-testid={`comp-org-${k}`} />}
    </label>
  );
  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="card-pad grid gap-3 sm:grid-cols-2">
        {field("name", t.orgName)}{field("industry", t.industry)}{field("size", t.size)}{field("country", t.country)}
        {field("description", t.description, true)}{field("systems", t.systems, true)}{field("dataTypes", t.dataTypes, true)}
      </section>
      <section className="card-pad">
        <h3 className="font-bold text-slate-900">{t.frameworksInScope}</h3>
        <ul className="mt-2 space-y-1.5">
          {FRAMEWORKS.map((f) => (
            <li key={f.id}>
              <label className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${w.frameworks.includes(f.id) ? "border-brand-400 bg-brand-50" : "border-slate-200"}`}>
                <input type="checkbox" className="mt-1 accent-brand-600" checked={w.frameworks.includes(f.id)} onChange={() => toggle(f.id)} data-testid={`comp-scope-${f.id}`} />
                <span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{f.full}</span><span className="block text-xs text-slate-500">{f.blurb} · {t.controlsN.replace("{n}", String(LIBRARY[f.id].controls.length))}</span></span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
