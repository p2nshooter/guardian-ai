/* Plan comparison matrix — shared by /pricing, the member billing page and the
 * admin plans page. Rows come from lib/plan-matrix (derived from the plan
 * limits the portal enforces), so what people read is what they get. */
"use client";
import { useMemo, useState } from "react";
import { PLANS, PLAN_ORDER, type Cycle, type PlanId } from "@/lib/plans";
import { improves, planMatrix, type Cell, type Row, type RowGroup } from "@/lib/plan-matrix";
import type { PlanMatrixDict } from "@/lib/i18n-pages/planmatrix";

const GROUPS: RowGroup[] = ["ai", "apps", "limits", "dev", "selfHosted", "support"];

function cellText(t: PlanMatrixDict, row: Row, c: Cell): React.ReactNode {
  switch (c.kind) {
    case "yes": return <span className="text-lg font-bold text-brand-600" aria-label="✓">✓</span>;
    case "no": return <span className="text-slate-300" aria-label="—">—</span>;
    case "unlimited": return <span className="font-semibold text-slate-900">{row.key === "shApps" ? t.allApps : t.unlimited}</span>;
    case "count": return <span className="font-semibold text-slate-900">{c.unit ? t.units[c.unit].replace("{n}", String(c.n)) : c.n}</span>;
    case "levels": return <span className="font-semibold text-slate-900">{c.levels.map((l) => (t.levels as Record<string, string>)[l] || l).join(" · ")}</span>;
  }
}

export default function PlanMatrix({ t, prices, cycle = "monthly", current, onChoose, money, defaultOnlyDiff = false }: {
  t: PlanMatrixDict;
  prices?: Partial<Record<PlanId, { monthly: number; yearly: number }>>;
  cycle?: Cycle;
  current?: string | null;
  onChoose?: (id: PlanId) => void;
  money?: (usd: number) => string;
  defaultOnlyDiff?: boolean;
}) {
  const [only, setOnly] = useState(defaultOnlyDiff);
  const rows = useMemo(() => planMatrix(), []);
  const shown = rows.filter((r) => !only || r.differs);
  const fmt = money || ((n: number) => `$${n.toLocaleString("en-US")}`);
  const col = (id: PlanId) => (current === id ? "bg-brand-50/70" : PLANS[id].highlight ? "bg-slate-50/60" : "");

  return (
    <div data-testid="plan-matrix">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.title}</h2>
          <p className="text-sm text-slate-600">{t.sub}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
          <input type="checkbox" className="accent-brand-600" checked={only} onChange={(e) => setOnly(e.target.checked)} data-testid="plan-matrix-diff" />
          {t.onlyDiff}
        </label>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="sticky left-0 z-10 w-[30%] bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t.feature}</th>
              {PLAN_ORDER.map((id) => {
                const p = prices?.[id] || { monthly: PLANS[id].monthly, yearly: PLANS[id].yearly };
                return (
                  <th key={id} className={`px-4 py-3 text-left align-bottom ${col(id)}`}>
                    {current === id ? <span className="mb-1 inline-block rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">{t.current}</span> : null}
                    <div className="text-base font-bold text-slate-900">{PLANS[id].name}</div>
                    <div className="text-xs font-normal text-slate-500">
                      <span className="text-sm font-bold text-slate-900">{fmt(cycle === "yearly" ? p.yearly : p.monthly)}</span>{cycle === "yearly" ? t.perYr : t.perMo}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => {
              const list = shown.filter((r) => r.group === g);
              if (!list.length) return null;
              return [
                <tr key={`g-${g}`} className="bg-slate-50">
                  <td colSpan={PLAN_ORDER.length + 1} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t.groups[g]}</td>
                </tr>,
                ...list.map((r) => (
                  <tr key={r.key} className="border-t border-slate-100" data-row={r.key} data-differs={r.differs ? "1" : "0"}>
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-slate-800">{r.label || (t.rows as Record<string, string>)[r.key] || r.key}</td>
                    {PLAN_ORDER.map((id) => (
                      <td key={id} className={`px-4 py-2.5 ${col(id)}`}>
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {cellText(t, r, r.cells[id])}
                          {improves(r, id) ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">{t.newHere}</span> : null}
                        </span>
                      </td>
                    ))}
                  </tr>
                )),
              ];
            })}
          </tbody>
          {onChoose ? (
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="sticky left-0 z-10 bg-white px-4 py-3" />
                {PLAN_ORDER.map((id) => (
                  <td key={id} className={`px-4 py-3 ${col(id)}`}>
                    <button type="button" className={PLANS[id].highlight ? "btn-primary btn-sm w-full" : "btn-secondary btn-sm w-full"} onClick={() => onChoose(id)}>{t.choose.replace("{name}", PLANS[id].name)}</button>
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
