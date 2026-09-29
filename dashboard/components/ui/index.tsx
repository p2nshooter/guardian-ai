/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Small, shared UI building blocks. Styling comes from app/globals.css so
 * every page — public, member and admin — looks the same.
 * ============================================================================ */
"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".2" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-1.5">{eyebrow}</div> : null}
        <h1 className="text-2xl font-bold sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-3xl text-[15px] text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Section({ title, description, children, actions }: { title?: ReactNode; description?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card-pad">
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({ icon = "✨", title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      <div className="mb-3 text-3xl">{icon}</div>
      <div className="font-semibold text-slate-900">{title}</div>
      {children ? <div className="mt-1 max-w-md text-sm text-slate-600">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint, children }: { label: ReactNode; value: ReactNode; hint?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card-pad">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1.5 text-2xl font-bold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
      {children}
    </div>
  );
}

export function Progress({ value, max, tone = "brand" }: { value: number; max: number; tone?: "brand" | "amber" | "red" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = pct >= 95 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : tone === "brand" ? "bg-brand-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      {label ? <label className="label" htmlFor={htmlFor}>{label}</label> : null}
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-rose-600">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Alert({ tone = "info", children, title }: { tone?: "info" | "success" | "warn" | "error"; children: ReactNode; title?: ReactNode }) {
  const icon = { info: "ℹ️", success: "✅", warn: "⚠️", error: "⛔" }[tone];
  // Literal class names so Tailwind keeps every tone in the CSS bundle.
  const cls = { info: "alert-info", success: "alert-success", warn: "alert-warn", error: "alert-error" }[tone];
  return (
    <div className={cls} role={tone === "error" ? "alert" : "status"}>
      <span aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        {title ? <div className="font-semibold">{title}</div> : null}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
    </div>
  );
}

export function CopyButton({ text, label, done, className = "btn-secondary btn-sm" }: { text: string; label?: string; done?: string; className?: string }) {
  const { t } = useI18n();
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className={className} onClick={async () => {
      try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1600); } catch {}
    }}>
      {ok ? `✓ ${done || t("common.copied")}` : label || t("common.copy")}
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer, wide = false }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-lift sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Steps({ steps }: { steps: { title: ReactNode; body?: ReactNode; done?: boolean }[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.done ? "bg-emerald-100 text-emerald-700" : "bg-brand-50 text-brand-700 ring-1 ring-brand-200"}`}>
            {s.done ? "✓" : i + 1}
          </span>
          <div className="min-w-0">
            <div className={`font-semibold ${s.done ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900"}`}>{s.title}</div>
            {s.body ? <div className="mt-0.5 text-sm text-slate-600">{s.body}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="tablist">
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={value === it.id} onClick={() => onChange(it.id)}
          className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${value === it.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return <div className="flex items-center gap-2 py-10 text-sm text-slate-500"><Spinner /> {label}</div>;
}

/** `label` lets member pages show the status in the reader's language. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const map: Record<string, string> = {
    active: "badge-green", paid: "badge-green", pending: "badge-amber", suspended: "badge-amber", canceled: "badge-gray",
    expired: "badge-gray", failed: "badge-red", refunded: "badge-gray", revoked: "badge-red",
  };
  return <span className={map[status] || "badge-gray"}>{label || status}</span>;
}
