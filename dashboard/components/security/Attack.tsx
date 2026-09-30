/* SECURITY ANALYST v4 — the MITRE ATT&CK matrix (14 Enterprise tactics):
 * techniques seen by the rule engine, added by the analyst or named by the AI
 * are highlighted; a click toggles an analyst finding. */
"use client";
import { useState } from "react";
import type { Case, Computed } from "@/lib/security/case";
import { TACTICS, TECHNIQUES, attackUrl } from "@/lib/security/attack";
import type { SecurityDict } from "@/lib/i18n-pages/security";

export default function Attack({ t, c, k, onCase }: { t: SecurityDict; c: Case; k: Computed; onCase: (c: Case) => void }) {
  const [only, setOnly] = useState(true);
  const seen = new Map(k.techniques.map((x) => [x.id, x]));
  const toggle = (id: string) => onCase({ ...c, attackManual: c.attackManual.includes(id) ? c.attackManual.filter((x) => x !== id) : [...c.attackManual, id] });
  return (
    <div className="card-pad">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"><input type="checkbox" className="accent-brand-600" checked={only} onChange={(e) => setOnly(e.target.checked)} data-testid="sec-attack-only" />{t.onlyDetected}</label>
        <span className="text-xs text-slate-500">{t.markHint}</span>
        <span className="ml-auto flex gap-2 text-[11px]">
          <span className="rounded bg-rose-100 px-1.5 text-rose-800">{t.bySource.rule}</span><span className="rounded bg-violet-100 px-1.5 text-violet-800">{t.bySource.analyst}</span><span className="rounded bg-sky-100 px-1.5 text-sky-800">{t.bySource.ai}</span>
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <div className="grid min-w-[1400px] grid-cols-14 gap-1.5" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }} data-testid="sec-attack">
          {TACTICS.map((tac) => {
            const list = TECHNIQUES.filter((x) => x.tactics.includes(tac.id) && (!only || seen.has(x.id)));
            const hits = TECHNIQUES.filter((x) => x.tactics.includes(tac.id) && seen.has(x.id)).length;
            return (
              <div key={tac.id} className="min-w-0">
                <div className={`rounded-t-lg px-2 py-1.5 text-[11px] font-bold leading-tight ${hits ? "bg-ink-950 text-white" : "bg-slate-100 text-slate-600"}`}>{tac.name}<div className="font-normal opacity-70">{tac.id} · {hits}</div></div>
                <div className="space-y-1 pt-1">
                  {list.map((x) => {
                    const s = seen.get(x.id);
                    const tone = !s ? "border-slate-200 bg-white text-slate-600" : s.sources.includes("rule") ? "border-rose-300 bg-rose-50 text-rose-900" : s.sources.includes("analyst") ? "border-violet-300 bg-violet-50 text-violet-900" : "border-sky-300 bg-sky-50 text-sky-900";
                    return (
                      <div key={x.id} className={`group rounded border px-1.5 py-1 text-[11px] leading-tight ${tone}`} data-testid={s ? "sec-attack-hit" : undefined}>
                        <button type="button" className="block w-full text-left" onClick={() => toggle(x.id)} title={s ? s.sources.map((v) => t.bySource[v]).join(" · ") : ""}>
                          <span className="font-mono font-semibold">{x.id}</span> {x.name}{s && s.count > 1 ? <span className="ml-1 opacity-70">×{s.count}</span> : null}
                        </button>
                        <a href={attackUrl(x.id)} target="_blank" rel="noopener noreferrer" className="hidden text-[10px] underline group-hover:inline">{t.openMitre} ↗</a>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
