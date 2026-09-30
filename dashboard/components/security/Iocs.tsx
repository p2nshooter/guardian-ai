/* SECURITY ANALYST v4 — IOCs: every indicator with counts, private flags,
 * analyst verdicts and notes, enrichment look-ups, and export (CSV, STIX 2.1,
 * blocklist). */
"use client";
import { useMemo, useState } from "react";
import type { Case, Computed } from "@/lib/security/case";
import { IOC_TYPES, defang, enrichLinks, toBlocklist, toCsv, toStix, type Ioc, type IocType, type Verdict } from "@/lib/security/ioc";
import type { SecurityDict } from "@/lib/i18n-pages/security";
import { CopyBtn, download, slugName } from "./shared";

const VERDICT_TONE: Record<Verdict, string> = { unknown: "text-slate-600", malicious: "text-rose-700 font-bold", suspicious: "text-amber-700 font-semibold", benign: "text-emerald-700" };

export default function Iocs({ t, c, k, onCase }: { t: SecurityDict; c: Case; k: Computed; onCase: (c: Case) => void }) {
  const [type, setType] = useState<IocType | "">("");
  const [hidePrivate, setHidePrivate] = useState(true);
  const [defanged, setDefanged] = useState(true);
  const list = useMemo(() => k.iocs.filter((x) => (!type || x.type === type) && (!hidePrivate || !x.private)).sort((a, b) => b.count - a.count), [k.iocs, type, hidePrivate]);
  const types = IOC_TYPES.filter((ty) => k.iocs.some((x) => x.type === ty));
  const setVerdict = (x: Ioc, verdict: Verdict, note?: string) => onCase({ ...c, iocState: { ...c.iocState, [`${x.type}:${x.value}`]: { verdict, note: note ?? x.note } } });
  const name = slugName(c.title);

  return (
    <div className="card-pad">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {["", ...types].map((ty) => (
            <button key={ty || "all"} type="button" onClick={() => setType(ty as IocType | "")} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${type === ty ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600"}`}>
              {ty || t.allTypes} · {ty ? k.iocs.filter((x) => x.type === ty && (!hidePrivate || !x.private)).length : k.iocs.filter((x) => !hidePrivate || !x.private).length}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" className="accent-brand-600" checked={hidePrivate} onChange={(e) => setHidePrivate(e.target.checked)} />{t.hidePrivate}</label>
        <label className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" className="accent-brand-600" checked={defanged} onChange={(e) => setDefanged(e.target.checked)} />{t.defangView}</label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-iocs.csv`, toCsv(k.iocs), "text/csv")} data-testid="sec-ioc-csv">⬇️ {t.exportCsv}</button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-stix.json`, toStix(k.iocs, { title: c.title || t.untitled }), "application/json")} data-testid="sec-ioc-stix">⬇️ {t.exportStix}</button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-blocklist.txt`, toBlocklist(k.iocs))}>⬇️ {t.exportBlock}</button>
        <CopyBtn text={list.map((x) => (defanged ? defang(x.value) : x.value)).join("\n")} label={`📋 ${t.copyAll}`} done={t.copied} className="btn-ghost btn-sm" />
      </div>
      {list.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="px-2 py-1.5">{t.iocType}</th><th className="px-2 py-1.5">{t.iocValue}</th><th className="px-2 py-1.5">{t.iocSeen}</th><th className="px-2 py-1.5">{t.iocVerdict}</th><th className="px-2 py-1.5">{t.iocLookup}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.slice(0, 1000).map((x) => (
                <tr key={`${x.type}:${x.value}`} data-testid="sec-ioc-row">
                  <td className="px-2 py-1.5 text-xs font-semibold uppercase text-slate-500">{x.type}{x.private ? <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] normal-case text-slate-500">{t.private}</span> : null}</td>
                  <td className="max-w-[420px] break-all px-2 py-1.5 font-mono text-xs text-slate-800">{defanged ? defang(x.value) : x.value}</td>
                  <td className="px-2 py-1.5 text-xs text-slate-600">{x.count}</td>
                  <td className="px-2 py-1.5">
                    <select className={`select w-auto py-0.5 text-xs ${VERDICT_TONE[x.verdict]}`} value={x.verdict} onChange={(e) => setVerdict(x, e.target.value as Verdict)} aria-label={t.iocVerdict}>
                      {(Object.keys(t.verdicts) as Verdict[]).map((v) => <option key={v} value={v}>{t.verdicts[v]}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5"><div className="flex flex-wrap gap-1">{enrichLinks(x).map((l) => <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600 no-underline hover:border-brand-400 hover:text-brand-700">{l.name}</a>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="mt-4 text-sm text-slate-500">{t.noIocs}</p>}
    </div>
  );
}
