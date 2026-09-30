/* AXTO — Developers (Connect) shared types and small pieces. */
"use client";
import { useState } from "react";
import type { DevelopersDict } from "@/lib/i18n-pages/developers";

export interface KeyRow { id: string; name: string; prefix: string; scopes: string[]; origins: string[]; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }
export interface HookRow { id: string; url: string; channels: string[]; types: string[]; active: boolean; failures: number; lastStatus: number | null; lastError: string | null; lastDeliveryAt: string | null; createdAt: string }
export interface Overview {
  enabled: boolean; retentionDays: number; limits: { apiKeys: number; apiRpm: number; webhooks: number };
  keys: KeyRow[]; webhooks: HookRow[]; usage: { events24h: number; lastEventAt: string | null };
}
export const SCOPES = ["ai:run", "events:read", "events:write", "rtc", "mcp"] as const;
export const fmt = (iso: string | null, locale: string) => (iso ? new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "");

export function Copy({ t, text, className = "btn-secondary btn-sm" }: { t: DevelopersDict; text: string; className?: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className={className} onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {} }}>📋 {done ? t.copied : t.copy}</button>;
}

export function Code({ t, code, label }: { t: DevelopersDict; code: string; label?: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-ink-900">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <Copy t={t} text={code} className="rounded px-2 py-0.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10" />
      </div>
      <pre className="overflow-x-auto p-3 text-[12px] leading-relaxed text-slate-100"><code>{code}</code></pre>
    </div>
  );
}

export const badge = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold";
