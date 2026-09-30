/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * CLIPPER — trim timeline: the clip window inside its surroundings, kept pieces
 * vs cuts, the playhead, and start/end handles that snap to word boundaries.
 * ============================================================================ */
"use client";
import { useRef } from "react";
import type { Range } from "@/lib/clipper/edit";
import { fmtPrecise, type Word } from "@/lib/clipper/options";
import type { ClipperDict } from "@/lib/i18n-pages/clipper";

interface Props {
  duration: number; words: Word[]; start: number; end: number; segs: Range[]; now: number; t: ClipperDict;
  onChange: (start: number, end: number) => void; onSeek: (sourceTime: number) => void;
}

function snap(words: Word[], x: number, edge: "start" | "end") {
  let best = x, d = 0.3;
  for (const w of words) {
    const v = edge === "start" ? w.start : w.end;
    if (Math.abs(v - x) < d) { d = Math.abs(v - x); best = v; }
  }
  return best;
}

export default function Timeline({ duration, words, start, end, segs, now, t, onChange, onSeek }: Props) {
  const bar = useRef<HTMLDivElement>(null);
  const lo = Math.max(0, start - 8), hi = Math.min(duration || end + 8, end + 8);
  const span = Math.max(0.5, hi - lo);
  const pct = (x: number) => `${((Math.max(lo, Math.min(hi, x)) - lo) / span) * 100}%`;
  const at = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    return lo + Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * span;
  };
  const drag = (edge: "start" | "end") => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const x = snap(words, at(ev.clientX), edge);
      if (edge === "start") onChange(Math.min(x, end - 1), end); else onChange(start, Math.max(x, start + 1));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const nudge = (edge: "start" | "end", d: number) => {
    if (edge === "start") onChange(Math.max(0, Math.min(end - 1, start + d)), end);
    else onChange(start, Math.min(duration || Infinity, Math.max(start + 1, end + d)));
  };
  const kept = segs.reduce((n, r) => n + r.end - r.start, 0);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{t.trim}</span>
        <span>{t.duration}: <b className="text-slate-800">{fmtPrecise(end - start)}</b> · {t.after}: <b className="text-brand-700">{fmtPrecise(kept)}</b></span>
      </div>
      <div ref={bar} className="relative h-12 cursor-pointer touch-none select-none rounded-lg bg-slate-100" onPointerDown={(e) => onSeek(at(e.clientX))}>
        {words.filter((w) => w.end > lo && w.start < hi).map((w, i) => (
          <span key={i} className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm bg-slate-300" style={{ left: pct(w.start), width: `max(1px, calc(${pct(w.end)} - ${pct(w.start)}))` }} />
        ))}
        <div className="absolute inset-y-0 rounded-md border-2 border-brand-500 bg-brand-500/10" style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }} />
        {segs.map((r, i) => (
          <span key={`s${i}`} className="absolute bottom-0 h-1.5 rounded-sm bg-brand-500" style={{ left: pct(r.start), width: `calc(${pct(r.end)} - ${pct(r.start)})` }} />
        ))}
        <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-rose-500" style={{ left: pct(now) }} />
        {(["start", "end"] as const).map((edge) => (
          <span key={edge} role="slider" aria-label={edge === "start" ? t.start : t.end} aria-valuenow={edge === "start" ? start : end} tabIndex={0}
            onPointerDown={drag(edge)}
            onKeyDown={(e) => { if (e.key === "ArrowLeft") nudge(edge, e.shiftKey ? -1 : -0.1); if (e.key === "ArrowRight") nudge(edge, e.shiftKey ? 1 : 0.1); }}
            className="absolute inset-y-0 z-10 flex w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded bg-brand-600 text-[9px] text-white shadow focus:outline-none focus:ring-2 focus:ring-brand-300"
            style={{ left: pct(edge === "start" ? start : end) }}>⋮</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        {(["start", "end"] as const).map((edge) => (
          <div key={edge} className="flex items-center gap-1">
            <span className="w-10 font-semibold text-slate-600">{edge === "start" ? t.start : t.end}</span>
            <button type="button" className="btn-ghost btn-sm px-1.5" onClick={() => nudge(edge, -1)}>−1s</button>
            <button type="button" className="btn-ghost btn-sm px-1.5" onClick={() => nudge(edge, -0.1)}>−.1</button>
            <span className="min-w-[52px] text-center font-mono tabular-nums">{fmtPrecise(edge === "start" ? start : end)}</span>
            <button type="button" className="btn-ghost btn-sm px-1.5" onClick={() => nudge(edge, 0.1)}>+.1</button>
            <button type="button" className="btn-ghost btn-sm px-1.5" onClick={() => nudge(edge, 1)}>+1s</button>
          </div>
        ))}
      </div>
    </div>
  );
}
