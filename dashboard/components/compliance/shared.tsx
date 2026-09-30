/* COMPLIANCE CENTER v4 — small pieces the programme screens share. */
"use client";
import type { Workspace, ControlStatus } from "@/lib/compliance/workspace";
import type { Criticality } from "@/lib/compliance/library";
export { download, CopyBtn, slugName } from "@/components/security/shared";

/** A programme change: the new programme, or a function of the latest one (for async work). */
export type WsUpdate = Workspace | ((prev: Workspace) => Workspace);

export const STATUS_TONE: Record<ControlStatus, string> = {
  not_started: "bg-slate-100 text-slate-600", in_progress: "bg-amber-100 text-amber-900", implemented: "bg-emerald-100 text-emerald-800", not_applicable: "bg-slate-50 text-slate-400 line-through",
};
export const LEVEL_TONE: Record<Criticality, string> = { low: "bg-sky-100 text-sky-800", medium: "bg-amber-100 text-amber-900", high: "bg-orange-100 text-orange-900", critical: "bg-rose-600 text-white" };
export const HEAT: Record<Criticality, string> = { low: "bg-emerald-100", medium: "bg-amber-100", high: "bg-orange-200", critical: "bg-rose-300" };

export function Ring({ pct, size = 72, label }: { pct: number; size?: number; label?: string }) {
  const r = 15.5, c = 2 * Math.PI * r;
  const tone = pct >= 80 ? "stroke-emerald-500" : pct >= 50 ? "stroke-amber-500" : "stroke-rose-500";
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" role="img" aria-label={`${label ? `${label} ` : ""}${pct}%`}>
      <circle cx="18" cy="18" r={r} fill="none" className="stroke-slate-100" strokeWidth="3.5" />
      <circle cx="18" cy="18" r={r} fill="none" className={tone} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 18 18)" />
      <text x="18" y="20.5" textAnchor="middle" className="fill-slate-900 text-[8px] font-bold">{pct}%</text>
    </svg>
  );
}

export function Bar({ pct }: { pct: number }) {
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${pct}%` }} /></div>;
}

export const today = () => new Date().toISOString().slice(0, 10);
