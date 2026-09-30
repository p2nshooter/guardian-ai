/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * CLIPPER — the ranked clip list: poster, virality score with its four
 * sub-scores and the reason, duration, and multi-select for batch rendering.
 * ============================================================================ */
"use client";
import { fmtTime, type Clip } from "@/lib/clipper/options";
import type { ClipperDict } from "@/lib/i18n-pages/clipper";

export type ClipItem = Clip & { id: string };

const tone = (s?: number) => (s === undefined ? "bg-slate-100 text-slate-600" : s >= 85 ? "bg-emerald-100 text-emerald-800" : s >= 70 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700");

function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
      <span className="w-9 shrink-0">{label}</span>
      <span className="h-1 flex-1 overflow-hidden rounded bg-slate-100"><span className="block h-full rounded bg-brand-500" style={{ width: `${v}%` }} /></span>
      <span className="w-5 text-right tabular-nums">{v}</span>
    </div>
  );
}

interface Props {
  t: ClipperDict; clips: ClipItem[]; selectedId: string | null; posters: Record<string, string>;
  checked: Set<string>; onCheck: (id: string, on: boolean) => void; onCheckAll: (on: boolean) => void;
  onOpen: (id: string) => void; onRemove: (id: string) => void;
}

export default function ClipList({ t, clips, selectedId, posters, checked, onCheck, onCheckAll, onOpen, onRemove }: Props) {
  if (!clips.length) return <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{t.noClips}</p>;
  const all = clips.every((c) => checked.has(c.id));
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <input type="checkbox" className="h-4 w-4" checked={all} onChange={(e) => onCheckAll(e.target.checked)} /> {t.selectAll}
      </label>
      <div className="space-y-2">
        {clips.map((c, i) => (
          <article key={c.id} className={`group relative flex gap-3 rounded-xl border bg-white p-2.5 transition ${c.id === selectedId ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-200 hover:border-slate-300"}`}>
            <input type="checkbox" className="absolute left-1.5 top-1.5 z-10 h-4 w-4" checked={checked.has(c.id)} onChange={(e) => onCheck(c.id, e.target.checked)} aria-label={c.title} />
            <button type="button" onClick={() => onOpen(c.id)} className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-800">
              {posters[c.id] ? <img src={posters[c.id]} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-lg text-slate-500">🎬</span>}
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-white">{Math.round(c.end - c.start)}s</span>
            </button>
            <button type="button" onClick={() => onOpen(c.id)} className="min-w-0 flex-1 text-left">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                <h3 className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-slate-900">{c.title}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-extrabold ${tone(c.score)}`} title={t.viral}>{c.score ?? "–"}</span>
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-brand-700">{fmtTime(c.start)} – {fmtTime(c.end)}</div>
              {c.scores ? (
                <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                  <Bar label={t.scoreHook} v={c.scores.hook} /><Bar label={t.scoreFlow} v={c.scores.flow} />
                  <Bar label={t.scoreValue} v={c.scores.value} /><Bar label={t.scoreTrend} v={c.scores.trend} />
                </div>
              ) : null}
              {c.why ? <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{c.why}</p> : null}
            </button>
            <button type="button" onClick={() => { if (confirm(t.confirmRemove)) onRemove(c.id); }} className="absolute bottom-1.5 right-1.5 rounded px-1 text-xs text-slate-400 hover:text-rose-600 sm:hidden sm:group-hover:block" title={t.remove}>✕</button>
          </article>
        ))}
      </div>
    </div>
  );
}
