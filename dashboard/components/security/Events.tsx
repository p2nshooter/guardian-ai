/* SECURITY ANALYST v4 — Events: the normalised table of every parsed log line
 * with search, severity / source / detection filters and a detail view. */
"use client";
import { useMemo, useState } from "react";
import type { Case, Computed } from "@/lib/security/case";
import { SEVERITIES, sevRank, type Severity } from "@/lib/security/attack";
import type { LogEvent } from "@/lib/security/parse";
import type { SecurityDict } from "@/lib/i18n-pages/security";
import { Sev, fmtTime } from "./shared";

const PAGE = 200;

export default function Events({ t, c, k, detection, onDetection, onCase }: {
  t: SecurityDict; c: Case; k: Computed; detection: string; onDetection: (r: string) => void; onCase: (c: Case) => void;
}) {
  const [q, setQ] = useState("");
  const [minSev, setMinSev] = useState<Severity | "">("");
  const [src, setSrc] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<LogEvent | null>(null);
  const det = k.detections.find((d) => d.rule === detection);
  const sources = useMemo(() => Array.from(new Set(k.events.map((e) => e.source))), [k.events]);
  const rows = useMemo(() => {
    const set = det ? new Set(det.events) : null;
    const needle = q.trim().toLowerCase();
    return k.events.filter((e) => (!set || set.has(e.i)) && (!minSev || sevRank(e.severity) >= sevRank(minSev)) && (!src || e.source === src)
      && (!needle || `${e.host} ${e.user} ${e.src} ${e.dst} ${e.event} ${e.message}`.toLowerCase().includes(needle)));
  }, [k.events, det, q, minSev, src]);

  return (
    <div className="card-pad">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-xs flex-1" placeholder={t.filter} value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} data-testid="sec-events-filter" />
        <select className="select w-auto" value={minSev} onChange={(e) => setMinSev(e.target.value as Severity | "")} aria-label={t.colSeverity}>
          <option value="">{t.allSeverities}</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>≥ {t.severities[s]}</option>)}
        </select>
        <select className="select w-auto" value={src} onChange={(e) => setSrc(e.target.value)} aria-label={t.format}>
          <option value="">{t.allSources}</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {det ? <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">{t.onlyDetection.replace("{name}", det.title)}<button type="button" onClick={() => onDetection("")} aria-label={t.clearFilter}>✕</button></span> : null}
        <span className="ml-auto text-xs text-slate-500" data-testid="sec-events-count">{t.showing.replace("{n}", String(Math.min(limit, rows.length))).replace("{total}", String(rows.length))}</span>
      </div>
      {rows.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500"><tr>
              <th className="px-2 py-1.5">{t.colTime}</th><th className="px-2 py-1.5">{t.colSeverity}</th><th className="px-2 py-1.5">{t.colHost}</th><th className="px-2 py-1.5">{t.colEvent}</th>
              <th className="px-2 py-1.5">{t.colUser}</th><th className="px-2 py-1.5">{t.colSrc}</th><th className="px-2 py-1.5">{t.colMessage}</th></tr></thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {rows.slice(0, limit).map((e) => (
                <tr key={e.i} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen(e)} data-testid="sec-event-row">
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{fmtTime(e.ts)}</td>
                  <td className="px-2 py-1.5"><Sev t={t} s={e.severity} /></td>
                  <td className="max-w-[140px] truncate px-2 py-1.5">{e.host}</td>
                  <td className="max-w-[180px] truncate px-2 py-1.5">{e.event}</td>
                  <td className="max-w-[120px] truncate px-2 py-1.5">{e.user}</td>
                  <td className="px-2 py-1.5">{e.src}</td>
                  <td className="max-w-[420px] truncate px-2 py-1.5 text-slate-700" title={e.message}>{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > limit ? <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => setLimit((n) => n + PAGE)}>{t.more}</button> : null}
        </div>
      ) : <p className="mt-4 text-sm text-slate-500">{t.noEvents}</p>}

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/40" onClick={() => setOpen(null)}>
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-lift" onClick={(e) => e.stopPropagation()} data-testid="sec-event-detail">
            <div className="flex items-center gap-2"><Sev t={t} s={open.severity} /><span className="font-mono text-xs text-slate-500">{fmtTime(open.ts)} · {open.source}{open.artifact ? ` · ${open.artifact}` : ""}</span><button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => setOpen(null)}>✕</button></div>
            <div className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800">{open.message}</div>
            <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{t.fields}</div>
            <dl className="mt-1 divide-y divide-slate-100 text-xs">
              {Object.entries({ host: open.host, event: open.event, user: open.user, src: open.src, dst: open.dst, action: open.action, ...open.fields }).filter(([, v]) => v).map(([kk, v]) => (
                <div key={kk} className="grid grid-cols-[140px_minmax(0,1fr)] gap-2 py-1"><dt className="truncate font-semibold text-slate-600">{kk}</dt><dd className="break-all font-mono text-slate-800">{v}</dd></div>
              ))}
            </dl>
            <button type="button" className="btn-secondary btn-sm mt-4" onClick={() => { onCase({ ...c, notes: [...c.notes, { id: `n${Date.now().toString(36)}`, at: new Date().toISOString(), text: `${fmtTime(open.ts)} ${open.host} ${open.event} — ${open.message}`.slice(0, 1000) }] }); setOpen(null); }}>📝 {t.toNote}</button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
