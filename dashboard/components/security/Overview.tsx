/* SECURITY ANALYST v4 — Overview: counts, severity mix, timeline, top
 * entities, detections, brute force, summary and notes. */
"use client";
import { useState } from "react";
import type { Case, Computed } from "@/lib/security/case";
import { SEVERITIES } from "@/lib/security/attack";
import type { SecurityDict } from "@/lib/i18n-pages/security";
import { Sev, SEV_BAR, fmtTime } from "./shared";

export default function Overview({ t, c, k, onCase, onShowDetection, onSample, onGoEvidence }: {
  t: SecurityDict; c: Case; k: Computed; onCase: (c: Case) => void; onShowDetection: (rule: string) => void; onSample: () => void; onGoEvidence: () => void;
}) {
  const [note, setNote] = useState("");
  const pub = k.iocs.filter((x) => !x.private).length;
  const max = Math.max(1, ...k.stats.histogram.map((h) => h.n));
  const lists: [string, [string, number][]][] = [[t.topHosts, k.stats.top.hosts], [t.topUsers, k.stats.top.users], [t.topSources, k.stats.top.src], [t.topEvents, k.stats.top.events]];

  if (!c.artifacts.length) {
    return (
      <div className="card-pad text-center">
        <div className="text-4xl">🛡️</div>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">{t.getStarted}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-primary" onClick={onGoEvidence}>＋ {t.addEvidence}</button>
          <button type="button" className="btn-secondary" onClick={onSample} data-testid="sec-sample">✨ {t.sample}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {([[t.statEvents, k.stats.total], [t.statDetections, k.detections.length], [t.statIocs, pub], [t.statTechniques, k.techniques.length]] as [string, number][]).map(([l, n]) => (
          <div key={l} className="card-pad"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{l}</div><div className="mt-1 text-3xl font-extrabold text-slate-900" data-testid={`sec-stat-${l}`}>{n.toLocaleString()}</div></div>
        ))}
      </div>

      {k.stats.total ? (
        <section className="card-pad">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold text-slate-900">{t.timeline}</h3>
            <span className="text-xs text-slate-500">{fmtTime(k.stats.first)} → {fmtTime(k.stats.last)}</span>
            <div className="ml-auto flex h-2 w-56 overflow-hidden rounded-full bg-slate-100" title={SEVERITIES.map((s) => `${t.severities[s]} ${k.stats.bySeverity[s]}`).join(" · ")}>
              {SEVERITIES.map((s) => k.stats.bySeverity[s] ? <div key={s} className={SEV_BAR[s]} style={{ width: `${(k.stats.bySeverity[s] / k.stats.total) * 100}%` }} /> : null)}
            </div>
          </div>
          {k.stats.histogram.length ? (
            <svg viewBox={`0 0 ${k.stats.histogram.length * 10} 60`} className="mt-3 h-20 w-full" preserveAspectRatio="none" role="img" aria-label={t.timeline}>
              {k.stats.histogram.map((h, i) => <rect key={i} x={i * 10 + 1} y={60 - (h.n / max) * 58} width={8} height={(h.n / max) * 58} rx={1.5} className="fill-brand-500"><title>{`${fmtTime(new Date(h.t).toISOString())} · ${h.n}`}</title></rect>)}
            </svg>
          ) : <p className="mt-2 text-sm text-slate-500">{t.noTimeline}</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {lists.map(([label, rows]) => (
              <div key={label}>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
                <ul className="mt-1 space-y-0.5 text-sm">{rows.length ? rows.slice(0, 6).map(([v, n]) => <li key={v} className="flex justify-between gap-2"><span className="truncate font-mono text-xs text-slate-700" title={v}>{v}</span><span className="text-xs text-slate-500">{n}</span></li>) : <li className="text-xs text-slate-400">—</li>}</ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card-pad">
        <h3 className="font-bold text-slate-900">{t.detections} <span className="font-normal text-slate-500">· {k.detections.length}</span></h3>
        {k.detections.length ? (
          <ul className="mt-2 divide-y divide-slate-100" data-testid="sec-detections">
            {k.detections.map((d) => (
              <li key={d.rule + d.title} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <Sev t={t} s={d.severity} />
                <span className="font-semibold text-slate-800">{d.title}</span>
                <span className="font-mono text-xs text-slate-500">{d.techniques.join(" · ")}</span>
                {d.events.length ? <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => onShowDetection(d.rule)}>{t.showEvents} ({d.events.length})</button> : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-slate-500">{t.noDetections}</p>}
        {k.stats.bruteForce.length ? (
          <div className="mt-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{t.bruteForce}</div>
            <ul className="mt-1 space-y-1 text-sm">{k.stats.bruteForce.slice(0, 10).map((b) => <li key={b.src + b.user} className="font-mono text-xs"><span className="font-semibold">{b.src}</span> → {b.user || "*"} · {t.failures.replace("{n}", String(b.failures))}{b.success ? <span className="ml-1 font-bold text-rose-700">⚠ {t.thenSuccess}</span> : null}</li>)}</ul>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card-pad">
          <h3 className="font-bold text-slate-900">{t.summary}</h3>
          <textarea className="textarea mt-2 min-h-[120px] w-full text-sm" placeholder={t.summaryPh} value={c.summary} onChange={(e) => onCase({ ...c, summary: e.target.value })} />
        </section>
        <section className="card-pad">
          <h3 className="font-bold text-slate-900">{t.notes} <span className="font-normal text-slate-500">· {c.notes.length}</span></h3>
          <div className="mt-2 flex gap-2">
            <input className="input flex-1" placeholder={t.notePh} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && note.trim()) { onCase({ ...c, notes: [...c.notes, { id: `n${Date.now().toString(36)}`, at: new Date().toISOString(), text: note.trim() }] }); setNote(""); } }} />
            <button type="button" className="btn-secondary" disabled={!note.trim()} onClick={() => { onCase({ ...c, notes: [...c.notes, { id: `n${Date.now().toString(36)}`, at: new Date().toISOString(), text: note.trim() }] }); setNote(""); }}>{t.addNote}</button>
          </div>
          <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto">{[...c.notes].reverse().map((n) => (
            <li key={n.id} className="group rounded-lg bg-slate-50 px-3 py-2 text-sm"><div className="flex items-center gap-2 text-[11px] text-slate-500">{fmtTime(n.at).slice(0, 16)}<button type="button" className="ml-auto hidden text-slate-400 hover:text-rose-600 group-hover:inline" onClick={() => onCase({ ...c, notes: c.notes.filter((x) => x.id !== n.id) })} aria-label={t.remove}>✕</button></div><div className="whitespace-pre-wrap text-slate-800">{n.text}</div></li>
          ))}</ul>
        </section>
      </div>
    </div>
  );
}
