/* SECURITY ANALYST v4 — small pieces the case screens share. */
"use client";
import { useState } from "react";
import type { Severity } from "@/lib/security/attack";
import type { SecurityDict } from "@/lib/i18n-pages/security";
import type { Case } from "@/lib/security/case";

/** A case change: the new case, or a function of the latest case (for async work). */
export type CaseUpdate = Case | ((prev: Case) => Case);

export const SEV_BADGE: Record<Severity, string> = {
  info: "bg-slate-100 text-slate-600", low: "bg-sky-100 text-sky-800", medium: "bg-amber-100 text-amber-900",
  high: "bg-orange-100 text-orange-900", critical: "bg-rose-600 text-white",
};
export const SEV_BAR: Record<Severity, string> = { info: "bg-slate-300", low: "bg-sky-400", medium: "bg-amber-400", high: "bg-orange-500", critical: "bg-rose-600" };

export function Sev({ t, s }: { t: SecurityDict; s: Severity }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${SEV_BADGE[s]}`}>{t.severities[s]}</span>;
}

export function download(name: string, data: string | Blob, mime = "text/plain;charset=utf-8") {
  const blob = typeof data === "string" ? new Blob([data], { type: mime }) : data;
  const u = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: u, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

export function CopyBtn({ text, label, done, className = "btn-ghost btn-sm" }: { text: string; label: string; done: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className={className} onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }}>{ok ? done : label}</button>;
}

export const fmtTime = (iso: string) => (iso ? iso.replace("T", " ").replace(/\.\d+Z$|Z$/, "") : "—");
export const slugName = (s: string) => (s || "case").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "case";
