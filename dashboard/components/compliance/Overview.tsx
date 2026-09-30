/* COMPLIANCE CENTER v4 — Overview: readiness per framework and domain,
 * overdue controls, open risks, policy and vendor status. */
"use client";
import { LIBRARY, controlKey } from "@/lib/compliance/controls";
import { score, riskLevel, type Workspace } from "@/lib/compliance/workspace";
import { FRAMEWORKS, type FrameworkId } from "@/lib/compliance/frameworks";
import type { ComplianceDict } from "@/lib/i18n-pages/compliance";
import { Bar, LEVEL_TONE, Ring, today } from "./shared";

export default function Overview({ t, w, onSample, onGo, onOpenControl }: {
  t: ComplianceDict; w: Workspace; onSample: () => void; onGo: (tab: "profile" | "controls" | "risks" | "policies" | "vendors") => void; onOpenControl: (fw: FrameworkId, id: string) => void;
}) {
  const d = today();
  const started = w.frameworks.length && (Object.keys(w.controls).length || w.risks.length || w.policies.length || w.vendors.length || w.org.name);
  if (!started) {
    return (
      <div className="card-pad text-center">
        <div className="text-4xl">📋</div>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">{t.getStarted}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-primary" onClick={() => onGo("profile")}>{t.setup}</button>
          <button type="button" className="btn-secondary" onClick={onSample} data-testid="comp-sample">✨ {t.sample}</button>
        </div>
      </div>
    );
  }
  const overdue = w.frameworks.flatMap((fw) => LIBRARY[fw].controls.map((c) => ({ fw, c, s: w.controls[controlKey(fw, c.id)] })))
    .filter((x) => x.s?.due && x.s.due < d && x.s.status !== "implemented" && x.s.status !== "not_applicable").sort((a, b) => a.s!.due!.localeCompare(b.s!.due!));
  const openRisks = w.risks.filter((r) => r.status !== "closed").sort((a, b) => b.rLikelihood * b.rImpact - a.rLikelihood * a.rImpact);
  const approved = w.policies.filter((p) => p.status === "approved").length;
  const vendorsDue = w.vendors.filter((v) => v.nextReview && v.nextReview <= d).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="comp-frameworks">
        {w.frameworks.map((fw) => {
          const s = score(w, fw, undefined, d);
          return (
            <section key={fw} className="card-pad min-w-0" data-testid={`comp-fw-${fw}`}>
              <div className="flex items-center gap-3">
                <div className="shrink-0"><Ring pct={s.pct} label={t.readiness} /></div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900">{FRAMEWORKS.find((f) => f.id === fw)?.full || fw}</div>
                  <div className="truncate text-[11px] text-slate-400">{LIBRARY[fw].version}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{t.implementedN.replace("{n}", String(s.implemented))} · {t.inProgressN.replace("{n}", String(s.inProgress))} · {t.notStartedN.replace("{n}", String(s.notStarted))} · {t.naN.replace("{n}", String(s.na))}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{t.withEvidence.replace("{n}", String(s.evidence))}{s.overdue ? <span className="ml-1 font-semibold text-rose-700">· {t.overdueN.replace("{n}", String(s.overdue))}</span> : null}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {LIBRARY[fw].domains.map((dm) => { const ds = score(w, fw, dm.id, d); return (
                  <button key={dm.id} type="button" className="block w-full text-left" onClick={() => onGo("controls")} title={dm.name}>
                    <div className="flex justify-between gap-2 text-xs"><span className="truncate text-slate-700">{dm.name}</span><span className="text-slate-500">{ds.pct}%</span></div>
                    <Bar pct={ds.pct} />
                  </button>
                ); })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3 [&>section]:min-w-0">
        <section className="card-pad">
          <h3 className="font-bold text-slate-900">{t.overdue} <span className="font-normal text-slate-500">· {overdue.length}</span></h3>
          {overdue.length ? (
            <ul className="mt-2 divide-y divide-slate-100 text-sm">{overdue.slice(0, 10).map((x) => (
              <li key={`${x.fw}:${x.c.id}`}><button type="button" className="flex w-full items-center gap-2 py-1.5 text-left" onClick={() => onOpenControl(x.fw, x.c.id)}>
                <span className="font-mono text-xs text-slate-500">{x.c.id}</span><span className="min-w-0 flex-1 truncate">{x.c.title}</span><span className="text-xs font-semibold text-rose-700">{x.s!.due}</span>
              </button></li>
            ))}</ul>
          ) : <p className="mt-2 text-sm text-slate-500">{t.noOverdue}</p>}
        </section>
        <section className="card-pad">
          <h3 className="font-bold text-slate-900">{t.openRisks} <span className="font-normal text-slate-500">· {openRisks.length}</span></h3>
          {openRisks.length ? (
            <ul className="mt-2 space-y-1.5 text-sm">{openRisks.slice(0, 6).map((r) => { const lv = riskLevel(r.rLikelihood, r.rImpact); return (
              <li key={r.id} className="flex items-center gap-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${LEVEL_TONE[lv]}`}>{t.levels[lv]}</span><span className="min-w-0 flex-1 truncate">{r.title}</span></li>
            ); })}</ul>
          ) : <p className="mt-2 text-sm text-slate-500">{t.noRisks}</p>}
          <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => onGo("risks")}>{t.tabs.risks} →</button>
        </section>
        <section className="card-pad space-y-2 text-sm">
          <div className="flex items-center justify-between"><span>📝 {t.policiesApproved.replace("{n}", String(approved)).replace("{total}", String(w.policies.length))}</span><button type="button" className="btn-ghost btn-sm" onClick={() => onGo("policies")}>→</button></div>
          <div className="flex items-center justify-between"><span>🤝 {t.vendorsDue.replace("{n}", String(vendorsDue))}</span><button type="button" className="btn-ghost btn-sm" onClick={() => onGo("vendors")}>→</button></div>
          <p className="pt-2 text-xs text-slate-500">{t.selfAssessment}</p>
        </section>
      </div>
    </div>
  );
}
