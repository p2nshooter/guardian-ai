/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PRIVACY VAULT — find and redact personal data ENTIRELY in the browser. The
 * original text is never uploaded. Redact with reversible tokens or masking,
 * copy the safe version to paste into any AI, then restore the AI's reply.
 * Only the redacted (PII-free) output can be saved to history — never originals.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n, pick } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { LoadingBlock } from "@/components/ui";
import { PII_TYPES, redact, restore, summarize, type MaskStyle } from "@/lib/vault/pii";
import { L } from "@/lib/i18n-pages/vault";

export default function VaultApp() {
  const { lang } = useI18n();
  const { me } = useMe();
  const t = pick(L, lang);
  const [text, setText] = useState("");
  const [style, setStyle] = useState<MaskStyle>("token");
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [restoreIn, setRestoreIn] = useState("");
  const access = !!me && me.limits.apps.includes("vault");

  const enabled = useMemo(() => new Set(PII_TYPES.map((t) => t.id).filter((id) => !disabled.has(id))), [disabled]);
  const result = useMemo(() => redact(text, style, enabled), [text, style, enabled]);
  const summary = useMemo(() => summarize(result.findings), [result]);
  const restored = useMemo(() => (restoreIn ? restore(restoreIn, result.map) : ""), [restoreIn, result.map]);
  useEffect(() => { setCopied(false); setSaved(false); }, [text, style, disabled]);

  function toggle(id: string) { setDisabled((d) => { const n = new Set(d); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  async function copy() { try { await navigator.clipboard.writeText(result.redacted); setCopied(true); } catch {} }
  async function save() {
    if (!result.redacted.trim()) return;
    const title = `Redacted · ${new Date().toLocaleString()}`;
    const r = await api("/api/history/vault", { body: { title, body: { redacted: result.redacted, style, types: summary }, meta: { items: String(result.findings.length) } } });
    if (r.ok) setSaved(true);
  }

  if (!me) return <LoadingBlock />;
  if (!access) return (
    <div className="surface-ink relative overflow-hidden rounded-2xl p-8"><div className="glow pointer-events-none absolute inset-0" />
      <div className="relative"><div className="text-4xl">🔒</div><h1 className="mt-3 text-2xl font-extrabold text-white">{t.noPlan}</h1>
        <Link href="/app/billing?plan=starter" className="btn-primary btn-lg mt-5">{t.upgrade} →</Link></div></div>
  );

  return (
    <div>
      <div className="mb-4"><div className="eyebrow">🔒 {t.sub}</div><h1 className="text-2xl font-bold">{t.title}</h1></div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-pad">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">{t.input}</label>
            {text ? <button className="btn-ghost btn-sm" onClick={() => setText("")}>{t.clear}</button> : null}
          </div>
          <textarea className="textarea min-h-[280px] w-full font-mono text-xs" placeholder={t.inputPh} value={text} onChange={(e) => setText(e.target.value)} />
          <p className="mt-2 text-xs text-emerald-700">🛡️ {t.onDevice}</p>
        </section>

        <section className="card-pad">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">{t.redacted}</label>
            <div className="flex gap-2">
              <button className="btn-secondary btn-sm" onClick={copy} disabled={!result.redacted.trim()}>{copied ? t.copied : t.copy}</button>
              <button className="btn-ghost btn-sm" onClick={save} disabled={!result.redacted.trim()}>{saved ? t.saved : `💾 ${t.save}`}</button>
            </div>
          </div>
          <pre className="min-h-[280px] w-full overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800">{result.redacted || <span className="text-slate-400">…</span>}</pre>
        </section>
      </div>

      <section className="card-pad mt-4">
        <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <div className="mb-1 text-sm font-semibold text-slate-700">{t.style}</div>
            <div className="flex flex-col gap-1">
              {([["token", t.token], ["full", t.full], ["partial", t.partial]] as [MaskStyle, string][]).map(([id, label]) => (
                <label key={id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${style === id ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-slate-200 text-slate-600"}`}>
                  <input type="radio" name="style" className="accent-brand-600" checked={style === id} onChange={() => setStyle(id)} />{label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm font-semibold text-slate-700">{t.types} <span className="font-normal text-slate-400">· {t.found}: {result.findings.length}</span></div>
            <div className="flex flex-wrap gap-1.5">
              {PII_TYPES.map((ty) => {
                const count = summary.find((s) => s.type === ty.id)?.count || 0;
                const on = !disabled.has(ty.id);
                return (
                  <button key={ty.id} onClick={() => toggle(ty.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${!on ? "border-slate-200 text-slate-400 line-through" : count ? "border-brand-300 bg-brand-50 font-semibold text-brand-700" : "border-slate-200 text-slate-500"}`}>
                    {ty.label}{count ? ` · ${count}` : ""}
                  </button>
                );
              })}
            </div>
            {!result.findings.length ? <p className="mt-3 text-sm text-slate-500">{t.none}</p> : null}
          </div>
        </div>
      </section>

      <section className="card-pad mt-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">{t.restoreT} {style !== "token" ? <span className="font-normal text-amber-600">· {t.noMap}</span> : null}</div>
        <div className="grid gap-3 lg:grid-cols-2">
          <textarea className="textarea min-h-[120px] font-mono text-xs" placeholder={t.restorePh} value={restoreIn} onChange={(e) => setRestoreIn(e.target.value)} />
          <pre className="min-h-[120px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800">{restored || <span className="text-slate-400">{t.restored}…</span>}</pre>
        </div>
      </section>
    </div>
  );
}
