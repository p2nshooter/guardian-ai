/* /invest — the AXTO investor round: the terms, how the revenue share works
 * (with a live calculator), what counts as revenue, what is built and what the
 * capital is for, the steps to a first statement, the risk notice and the
 * application. AXTO only: no revenue, capital or obligation is shared with
 * xaa.es or any other site (owner, 19 Oct 2026).
 * English renders statically (SEO); the other nine languages load on demand.
 * No bank details on this page — they are in the signed agreement. The owner's
 * WhatsApp is given once an application has been sent.
 * Motion is decorative only and switched off under prefers-reduced-motion. */
"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useI18n, formatMoney } from "@/lib/i18n";
import { LOCALE, type Lang } from "@/lib/i18n-shared";
import { Spinner } from "@/components/ui";
import Reveal from "@/components/site/Reveal";
import { INV_EN, type InvCopy } from "@/lib/invest-copy";
import { INVEST_DEFAULTS, pct, shareOf } from "@/lib/invest-terms";

interface Info { status: "open" | "paused" | "closed"; targetUsd: number; minUsd: number; poolPct: number; raisedUsd: number }
type Sent = { amountUsd: number; whatsapp: string };

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
const wa = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
const ERR_CODES = ["name", "email", "ack", "min", "max", "closed", "paused", "other"] as const;

export default function InvestOffer() {
  const { lang } = useI18n();
  const [dict, setDict] = useState<Partial<Record<Lang, InvCopy>> | null>(null);
  useEffect(() => {
    if (lang === "en" || dict) return;
    import("@/lib/i18n-pages/invest").then((m) => setDict(m.INV)).catch(() => {});
  }, [lang, dict]);
  const t: InvCopy = lang === "en" ? INV_EN : dict?.[lang] || INV_EN;
  const locale = LOCALE[lang] || "en-US";
  const money = (n: number) => formatMoney(n, "USD", lang);

  const [info, setInfo] = useState<Info | null>(null);
  useEffect(() => { api<Info>("/api/invest").then((r) => { if (r.ok) setInfo(r.data); }); }, []);
  const terms = info || { ...INVEST_DEFAULTS, raisedUsd: 0 };
  const vars = { pool: `${terms.poolPct.toLocaleString(locale)} %`, target: money(terms.targetUsd), min: money(terms.minUsd) };

  // The calculator: capital → share of every sale, and what that is on $10,000 of revenue.
  const [capital, setCapital] = useState(INVEST_DEFAULTS.minUsd);
  useEffect(() => { setCapital((c) => Math.min(terms.targetUsd, Math.max(terms.minUsd, c))); }, [terms.minUsd, terms.targetUsd]);
  const examples = useMemo(() => {
    const rows = [terms.minUsd, 100_000, 250_000, 500_000, 1_000_000, terms.targetUsd].filter((c) => c >= terms.minUsd && c <= terms.targetUsd);
    return [...new Set(rows)].sort((a, b) => a - b);
  }, [terms.minUsd, terms.targetUsd]);
  const share = shareOf(capital, terms);
  const raisedFrac = terms.targetUsd ? Math.min(1, terms.raisedUsd / terms.targetUsd) : 0;

  const [form, setForm] = useState({ name: "", email: "", company: "", country: "", amount: "", method: "wire", message: "", ack: false, website: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ack) { setErr(t.form.err.ack); return; }
    setBusy(true); setErr("");
    const r = await api<Sent & { code?: string }>("/api/invest/apply", { body: { ...form, lang } });
    setBusy(false);
    if (r.ok) { setSent({ amountUsd: r.data.amountUsd, whatsapp: r.data.whatsapp }); return; }
    const code = (ERR_CODES as readonly string[]).includes(r.data?.code || "") ? (r.data.code as (typeof ERR_CODES)[number]) : "other";
    setErr(fill(t.form.err[code], vars));
  }

  const open = terms.status === "open";
  const termRows: [string, string, string?][] = [
    [t.terms.target, money(terms.targetUsd)],
    [t.terms.min, money(terms.minUsd)],
    [t.terms.pool, `${terms.poolPct.toLocaleString(locale)} %`, t.terms.poolNote],
    [t.terms.payout, t.terms.payoutV],
    [t.terms.until, t.terms.untilV],
  ];

  return (
    <div data-testid="invest">
      {/* ── Hero ── */}
      <section className="acq-hero relative isolate overflow-hidden border-b border-slate-800 bg-ink-950 py-20 text-white sm:py-28">
        <div className="acq-aurora pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="acq-grid pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
        <span className="acq-orb acq-orb-a pointer-events-none absolute -z-10" aria-hidden="true" />
        <div className="container-page relative grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:items-start">
          <div>
            <p className="anim-in inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200">📈 {t.eyebrow}</p>
            <h1 className="anim-in anim-delay-1 mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">{t.title}</h1>
            <p className="anim-in anim-delay-2 mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">{t.lead}</p>
            {!open ? (
              <div className="anim-in anim-delay-3 mt-8 max-w-xl rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100" data-testid="invest-state">
                <div className="font-bold text-amber-200">{terms.status === "closed" ? t.closedT : t.pausedT}</div>
                <p className="mt-1">{terms.status === "closed" ? t.closedB : t.pausedB}</p>
              </div>
            ) : null}
            <div className="anim-in anim-delay-3 mt-10 flex flex-wrap gap-3">
              {open ? <a href="#apply" className="acq-cta anim-pulse-ring rounded-xl bg-gradient-to-r from-emerald-300 to-teal-400 px-7 py-4 text-base font-extrabold text-ink-950 no-underline shadow-lg shadow-emerald-500/20 transition hover:brightness-110" data-testid="invest-cta">{t.apply} →</a> : null}
              <Link href="/app/investor" prefetch={false} className="rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-base font-semibold text-white no-underline backdrop-blur transition hover:bg-white/10">{t.mine}</Link>
            </div>
          </div>

          <Reveal className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm sm:p-7">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">{t.terms.label}</h2>
            <dl className="mt-4 divide-y divide-white/10" data-testid="invest-terms">
              {termRows.map(([k, v, note]) => (
                <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <dt className="text-sm text-slate-400">{k}</dt>
                  <dd className="text-right font-bold text-white">{v}{note ? <span className="block text-xs font-normal text-slate-400">{note}</span> : null}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-sm"><span className="text-slate-400">{t.terms.raised}</span><span className="font-bold text-white" data-testid="invest-raised">{money(terms.raisedUsd)}</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={t.terms.raised} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(raisedFrac * 100)}>
                <div className="inv-bar h-full rounded-full bg-gradient-to-r from-emerald-300 to-teal-400" style={{ width: `${Math.max(raisedFrac * 100, raisedFrac ? 2 : 0)}%` }} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How the share works + calculator ── */}
      <section className="py-20">
        <div className="container-page">
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t.howTitle}</h2>
            <p className="mt-3 max-w-3xl text-lg text-slate-600">{fill(t.howLead, vars)}</p></Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Reveal className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card" >
              <label htmlFor="inv-capital" className="text-sm font-semibold text-slate-700">{t.exHead[0]}</label>
              <div className="mt-1 text-4xl font-black tracking-tight text-slate-900" data-testid="invest-calc-capital">{money(capital)}</div>
              <input id="inv-capital" type="range" className="mt-4 w-full accent-emerald-600" min={terms.minUsd} max={terms.targetUsd} step={terms.minUsd >= 10_000 ? 10_000 : 1_000}
                value={capital} onChange={(e) => setCapital(Number(e.target.value))} data-testid="invest-calc" />
              <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{money(terms.minUsd)}</span><span>{money(terms.targetUsd)}</span></div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{t.exHead[1]}</dt><dd className="mt-1 text-2xl font-extrabold text-emerald-900" data-testid="invest-calc-share">{pct(share, locale)}</dd></div>
                <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t.exHead[2]}</dt><dd className="mt-1 text-2xl font-extrabold text-slate-900">{formatMoney(Math.round(share * 10_000 * 100) / 100, "USD", lang)}</dd></div>
              </dl>
            </Reveal>
            <Reveal delay={100} className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-card">
              <table className="table w-full" data-testid="invest-examples">
                <thead><tr>{t.exHead.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {examples.map((c) => {
                    const s = shareOf(c, terms);
                    return <tr key={c}><td className="font-semibold">{money(c)}</td><td>{pct(s, locale)}</td><td>{formatMoney(Math.round(s * 10_000 * 100) / 100, "USD", lang)}</td></tr>;
                  })}
                </tbody>
              </table>
            </Reveal>
          </div>
          <p className="mt-4 max-w-3xl text-sm text-slate-500">{t.exNote}</p>

          <Reveal><h3 className="mt-16 text-2xl font-bold text-slate-900">{t.countTitle}</h3></Reveal>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {t.counts.map(([h, d], i) => (
              <Reveal key={h} delay={i * 70} className={`rounded-2xl border bg-white p-5 shadow-card ${i === 1 ? "border-rose-200" : i === 0 ? "border-emerald-200" : "border-slate-200"}`}>
                <div className="flex items-center gap-2 font-bold text-slate-900"><span aria-hidden="true">{i === 0 ? "✓" : i === 1 ? "✕" : "🔒"}</span>{h}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built today / what the capital is for ── */}
      <section className="border-y border-slate-200 bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <Reveal className="rounded-3xl border border-emerald-200 bg-white p-7 shadow-card">
            <h2 className="text-2xl font-bold text-slate-900">🟢 {t.todayTitle}</h2>
            <ul className="mt-5 space-y-2.5">{t.today.map((x) => <li key={x} className="flex gap-2.5 text-sm text-slate-700"><span className="mt-0.5 text-emerald-600">✓</span>{x}</li>)}</ul>
          </Reveal>
          <Reveal delay={120} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
            <h2 className="text-2xl font-bold text-slate-900">🧭 {t.buildTitle}</h2>
            <ul className="mt-5 space-y-2.5">{t.build.map((x) => <li key={x} className="flex gap-2.5 text-sm text-slate-700"><span className="mt-0.5 text-brand-600">◆</span>{x}</li>)}</ul>
          </Reveal>
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="border-b border-slate-800 bg-ink-950 py-20 text-white">
        <div className="container-page">
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{t.stepsTitle}</h2></Reveal>
          <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4" data-testid="invest-steps">
            {t.steps.map(([h, d], i) => (
              <Reveal as="li" key={h} delay={(i % 4) * 90} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-teal-400 text-base font-black text-ink-950">{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold text-white">{h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{d}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── AXTO only + risk notice ── */}
      <section className="py-20">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <Reveal className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-7" >
            <h2 className="text-2xl font-bold text-slate-900">🏛️ {t.aloneT}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600" data-testid="invest-alone">{t.aloneB}</p>
          </Reveal>
          <Reveal delay={100} className="rounded-3xl border border-amber-200 bg-amber-50/60 p-7">
            <h2 className="text-2xl font-bold text-slate-900">⚠️ {t.riskTitle}</h2>
            <ul className="mt-4 space-y-2.5" data-testid="invest-risks">{t.risks.map((x) => <li key={x} className="flex gap-2.5 text-sm leading-relaxed text-slate-700"><span className="mt-0.5 text-amber-700">•</span>{x}</li>)}</ul>
          </Reveal>
        </div>
      </section>

      {/* ── Application ── */}
      <section id="apply" className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-20">
        <div className="container-page max-w-3xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">✍️ {t.formTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{t.formLead}</p>
          {sent ? (
            <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-6" data-testid="invest-sent" role="status">
              <p className="font-semibold text-emerald-900">{fill(t.form.ok, { amount: money(sent.amountUsd) })}</p>
              {sent.whatsapp ? <a href={wa(sent.whatsapp, t.waText)} target="_blank" rel="noopener" className="btn-secondary mt-4 inline-flex" data-testid="invest-wa">💬 {t.whatsapp} · {sent.whatsapp}</a> : null}
            </div>
          ) : (
            <form onSubmit={apply} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card" data-testid="invest-form" noValidate>
              <div className="hidden" aria-hidden="true"><label>Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">{t.form.name} *
                  <input className="input mt-1" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="invest-name" /></label>
                <label className="block text-sm font-semibold text-slate-700">{t.form.email} *
                  <input className="input mt-1" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="invest-email" /></label>
                <label className="block text-sm font-semibold text-slate-700">{t.form.company}
                  <input className="input mt-1" autoComplete="organization" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></label>
                <label className="block text-sm font-semibold text-slate-700">{t.form.country}
                  <input className="input mt-1" autoComplete="country-name" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label>
                <label className="block text-sm font-semibold text-slate-700">{t.form.amount} *
                  <input className="input mt-1" inputMode="numeric" required placeholder={fill(t.form.amountHint, vars)} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="invest-amount" /></label>
                <label className="block text-sm font-semibold text-slate-700">{t.form.method}
                  <select className="select mt-1" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                    <option value="wire">{t.form.wire}</option><option value="paypal">{t.form.paypal}</option>
                  </select></label>
              </div>
              <label className="mt-4 block text-sm font-semibold text-slate-700">{t.form.message}
                <textarea className="input mt-1 min-h-[110px]" placeholder={t.form.messagePh} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
              <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed text-slate-600">
                <input type="checkbox" className="mt-1 accent-emerald-600" checked={form.ack} onChange={(e) => setForm({ ...form, ack: e.target.checked })} data-testid="invest-ack" />
                <span>{t.form.ack}</span>
              </label>
              {err ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert" data-testid="invest-error">{err}</p> : null}
              <button type="submit" className="mt-5 w-full rounded-xl bg-ink-950 px-6 py-3.5 text-base font-bold text-emerald-300 hover:bg-ink-900 disabled:opacity-60 sm:w-auto" disabled={busy || !open} data-testid="invest-send">
                {busy ? <><Spinner /> {t.form.sending}</> : t.form.send}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FAQ + the whole business ── */}
      <section className="py-20">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900">{t.faqTitle}</h2>
          <div className="mt-6 space-y-3">{t.faq.map(([q, a]) => <details key={q} className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold text-slate-900">{q}</summary><p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p></details>)}</div>
          <Reveal className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-ink-950 to-ink-800 p-7 text-white">
            <div><div className="text-xl font-bold">{t.wholeT}</div><p className="mt-1 text-sm text-slate-300">{t.wholeB}</p></div>
            <Link href="/acquire" className="rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-5 py-3 text-sm font-extrabold text-ink-950 no-underline hover:brightness-110">{t.wholeLink} →</Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
