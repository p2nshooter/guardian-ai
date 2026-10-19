/* /acquire — the site-sale offer: investment story, what makes the platform
 * worth owning, the privacy guarantee, everything included, a buyer's guide,
 * the handover timeline, and a secure checkout (bank wire / escrow, crypto,
 * PayPal). After a verified payment the buyer's session is refreshed and
 * carries the administrator role — the success panel links straight to /admin.
 * English renders statically (SEO); the other nine languages load on demand.
 * Motion is decorative only and switched off under prefers-reduced-motion. */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { useI18n, formatMoney } from "@/lib/i18n";
import { LOCALE, type Lang } from "@/lib/i18n-shared";
import { Spinner } from "@/components/ui";
import Reveal from "@/components/site/Reveal";
import { ACQ_EN, type AcqCopy } from "@/lib/acquire-copy";

export interface OfferApp { slug: string; name: string; icon: string; short: string; features: string[] }
export interface OfferProduct { slug: string; name: string; emoji: string; tagline: string }
interface Info { status: "open" | "paused" | "sold"; priceUsd: number; gateways: { id: string; label: string; methods: string; test: boolean; limit?: number }[] }
interface Me { email: string; role: string; name?: string }
type Wire = { kind: "wire"; orderId: string; amountUsd: number; amountIdr: number; whatsapp: string; bank: { name: string; holder: string; swift: string; code: string; branch: string; primary?: { currency: string; number: string }; accounts: { currency: string; number: string }[] } };
type Crypto = { kind: "crypto"; orderId: string; amountUsd: number; whatsapp: string; wallets: { key: string; asset: string; network: string; address: string; amount: string; auto: boolean }[]; note: string };
type Status = { order: { id: string; status: string; invoiceNo: string; test: boolean }; admin: boolean; buyer: boolean; whatsapp: string };
export interface OfferStats { apps: number; selfHosted: number; langs: number; gateways: number; jurisdictions: string; tests: string; transports: number }

const wa = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

function Copy({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }}>{ok ? "✓" : "⧉"}</button>;
}

/** Counts up to a stat once it scrolls into view (numbers only; text such as "200+" keeps its suffix). */
function CountUp({ value, locale }: { value: string | number; locale: string }) {
  const m = /^(\d+)(.*)$/.exec(String(value));
  const target = m ? Number(m[1]) : 0;
  const ref = useRef<HTMLSpanElement | null>(null);
  const [n, setN] = useState(target);
  useEffect(() => {
    const el = ref.current;
    if (!m || !el || typeof IntersectionObserver === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (now: number) => { const p = Math.min(1, (now - t0) / 1400); setN(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref}>{m ? `${new Intl.NumberFormat(locale).format(n)}${m[2]}` : value}</span>;
}

export default function AcquireOffer({ apps, products, stats }: { apps: OfferApp[]; products: OfferProduct[]; stats: OfferStats }) {
  const { lang } = useI18n();
  const [dict, setDict] = useState<Partial<Record<Lang, AcqCopy>> | null>(null);
  useEffect(() => {
    if (lang === "en" || dict) return;
    import("@/lib/i18n-pages/acquire").then((m) => setDict(m.ACQ)).catch(() => {});
  }, [lang, dict]);
  const t: AcqCopy = lang === "en" ? ACQ_EN : dict?.[lang] || ACQ_EN;
  const locale = LOCALE[lang] || "en-US";
  const money = (n: number, c = "USD") => formatMoney(n, c, lang);

  const [info, setInfo] = useState<Info | null>(null);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [gateway, setGateway] = useState("");
  const [form, setForm] = useState({ company: "", name: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pay, setPay] = useState<Wire | Crypto | null>(null);
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [proof, setProof] = useState({ reference: "", network: "", tx: "" });
  const [proofMsg, setProofMsg] = useState("");
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    api<Info>("/api/acquire").then((r) => { if (r.ok) { setInfo(r.data); setGateway(r.data.gateways[0]?.id || ""); } });
    api<{ user: Me | null }>("/api/auth/me").then((r) => { const u = r.ok ? r.data.user : null; setMe(u); if (u) setForm((f) => ({ ...f, name: f.name || u.name || "" })); });
    const q = new URLSearchParams(window.location.search);
    const paidQ = q.get("paid");
    if (paidQ) { setOrderId(paidQ); setTimeout(() => document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" }), 300); }
    if (q.get("canceled")) setCanceled(true);
  }, []);

  // Poll the order until it is paid; the status call also refreshes the session (admin role).
  const check = useCallback(async () => {
    if (!orderId) return;
    const r = await api<Status>(`/api/acquire/status?order=${encodeURIComponent(orderId)}`);
    if (r.ok) setStatus(r.data);
  }, [orderId]);
  useEffect(() => {
    if (!orderId) return;
    check();
    if (status?.order.status === "paid") return;
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, [orderId, status?.order.status, check]);

  async function checkout() {
    if (!gateway) return;
    setBusy(true); setErr(""); setCanceled(false);
    const r = await api<any>("/api/acquire/checkout", { body: { gateway, ...form } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setOrderId(r.data.orderId);
    if (r.data.url) { window.location.href = r.data.url; return; }
    if (r.data.method === "wire") setPay({ kind: "wire", ...r.data });
    else if (r.data.method === "crypto") { setPay({ kind: "crypto", ...r.data }); setProof((p) => ({ ...p, network: r.data.wallets[0]?.key || "" })); }
  }
  async function sendProof() {
    if (!pay) return;
    setBusy(true); setProofMsg("");
    const body = pay.kind === "wire" ? { action: "bank_proof", reference: proof.reference } : { action: "crypto_proof", network: proof.network, tx: proof.tx };
    const r = await api<{ status: string; message: string }>(`/api/billing/orders/${pay.orderId}`, { body });
    setBusy(false);
    setProofMsg(!r.ok ? r.error : pay.kind === "wire" && r.data.status !== "paid" ? t.proofSent.replace("{wa}", pay.whatsapp) : r.data.message);
    if (r.ok && r.data.status === "paid") check();
  }

  const open = info?.status === "open";
  const isAdmin = me?.role === "admin";
  const paid = status?.order.status === "paid";
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const selected = info?.gateways.find((g) => g.id === gateway);
  const statList: [string | number, string][] = [
    [stats.apps, t.stats.apps], [stats.selfHosted, t.stats.selfHosted], [stats.langs, t.stats.langs], [stats.gateways, t.stats.gateways],
    [stats.transports, t.stats.transports], [stats.jurisdictions, t.stats.jurisdictions], [stats.tests, t.stats.tests],
  ];

  return (
    <div data-testid="acquire">
      {/* ── Hero ── */}
      <section className="acq-hero relative isolate overflow-hidden border-b border-slate-800 bg-ink-950 py-20 text-white sm:py-28">
        <div className="acq-aurora pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="acq-grid pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
        <span className="acq-orb acq-orb-a pointer-events-none absolute -z-10" aria-hidden="true" />
        <span className="acq-orb acq-orb-b pointer-events-none absolute -z-10" aria-hidden="true" />
        <div className="container-page relative">
          <p className="anim-in inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200">🏛️ {t.eyebrow}</p>
          <h1 className="anim-in anim-delay-1 mt-6 max-w-5xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl">{t.title}</h1>
          <p className="anim-in anim-delay-2 mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">{t.lead}</p>
          <div className="anim-in anim-delay-3 mt-10 flex flex-wrap items-end gap-x-10 gap-y-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t.price}</div>
              <div className="acq-price mt-1 text-5xl font-black tracking-tight sm:text-7xl" data-testid="acquire-price">{info ? money(info.priceUsd) : "…"}</div>
              <p className="mt-2 max-w-md text-sm text-slate-400">{t.priceNote}</p>
            </div>
            {info && info.status !== "open" ? (
              <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-200">{info.status === "sold" ? t.sold : t.paused}</div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <a href="#checkout" className="acq-cta anim-pulse-ring rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-4 text-base font-extrabold text-ink-950 no-underline shadow-lg shadow-amber-500/20 transition hover:brightness-110">{t.buy} →</a>
                <a href="#guide" className="rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-base font-semibold text-white no-underline backdrop-blur transition hover:bg-white/10">{t.guideCta}</a>
                <Link href="/contact?topic=acquisition" className="rounded-xl px-4 py-4 text-base font-semibold text-slate-300 no-underline hover:text-white">{t.talk}</Link>
              </div>
            )}
          </div>
          <dl className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {statList.map(([n, l], i) => (
              <Reveal key={l} delay={i * 60} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                <dt className="text-3xl font-extrabold text-white"><CountUp value={n} locale={locale} /></dt>
                <dd className="mt-1 text-xs leading-snug text-slate-400">{l}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Why own it ── */}
      <section className="relative py-20">
        <div className="container-page">
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t.highlightsTitle}</h2>
            <p className="mt-3 max-w-3xl text-lg text-slate-600">{t.highlightsLead}</p></Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3" data-testid="acquire-highlights">
            {t.highlights.map(([icon, h, d], i) => (
              <Reveal key={h} delay={i * 70} className="acq-card group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 text-2xl shadow-inner" aria-hidden="true">{icon}</div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy guarantee ── */}
      <section className="border-y border-slate-200 bg-gradient-to-b from-emerald-50/70 to-white py-20">
        <div className="container-page">
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight text-slate-900">🛡️ {t.promiseTitle}</h2>
            <p className="mt-3 max-w-3xl text-slate-600">{t.promiseLead}</p></Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {t.promise.map(([h, d], i) => {
              const soon = i === t.promise.length - 1;
              return (
                <Reveal key={h} delay={i * 60} className={`rounded-2xl border bg-white p-5 shadow-card ${soon ? "border-dashed border-slate-300" : "border-emerald-200"}`}>
                  <div className="flex items-center gap-2 font-bold text-slate-900"><span className={soon ? "text-slate-400" : "text-emerald-600"}>{soon ? "◷" : "✓"}</span>{h}</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Apps, self-hosted, engine ── */}
      <section className="py-20">
        <div className="container-page">
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t.appsTitle}</h2>
            <p className="mt-3 max-w-3xl text-slate-600">{t.appsLead}</p></Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {apps.map((a, i) => (
              <Reveal key={a.slug} delay={(i % 3) * 70}>
                <Link href={`/apps/${a.slug}`} className="acq-card group block h-full rounded-2xl border border-slate-200 bg-white p-5 no-underline shadow-card transition hover:-translate-y-1 hover:border-slate-300">
                  <div className="flex items-center gap-2"><span className="text-2xl">{a.icon}</span><span className="text-lg font-bold text-slate-900">{a.name}</span></div>
                  <p className="mt-2 text-sm text-slate-600">{a.short}</p>
                  <ul className="mt-3 space-y-1 text-sm text-slate-700">{a.features.slice(0, 5).map((f) => <li key={f} className="flex gap-2"><span className="text-brand-600">✓</span>{f}</li>)}</ul>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal><h3 className="mt-16 text-2xl font-bold text-slate-900">{t.selfHostedTitle}</h3>
            <p className="mt-2 max-w-3xl text-slate-600">{t.selfHostedLead}</p></Reveal>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {products.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 5) * 50} className="rounded-xl border border-slate-200 bg-white p-4"><div className="font-semibold text-slate-900">{p.emoji} {p.name}</div><div className="mt-1 text-xs text-slate-500">{p.tagline}</div></Reveal>
            ))}
          </div>

          <Reveal><h3 className="mt-16 text-2xl font-bold text-slate-900">{t.engineTitle}</h3></Reveal>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {t.engine.map(([h, d], i) => <Reveal key={h} delay={(i % 3) * 70} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="font-bold text-slate-900">{h}</div><p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p></Reveal>)}
            <Reveal className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2 lg:col-span-3"><div className="font-bold text-slate-900">{t.stackTitle}</div><p className="mt-2 text-sm leading-relaxed text-slate-600">{t.stack}</p></Reveal>
          </div>
        </div>
      </section>

      {/* ── Buyer's guide ── */}
      <section id="guide" className="scroll-mt-20 border-y border-slate-800 bg-ink-950 py-20 text-white">
        <div className="container-page">
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.guideTitle}</h2>
            <p className="mt-3 max-w-3xl text-slate-300">{t.guideLead}</p></Reveal>
          <ol className="acq-steps relative mt-12 grid gap-6 lg:grid-cols-3" data-testid="acquire-guide">
            {t.guide.map(([h, d, when], i) => (
              <Reveal as="li" key={h} delay={i * 90} className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-base font-black text-ink-950">{i + 1}</span>
                  <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-200">{when}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{d}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Handover timeline + data room ── */}
      <section className="py-20">
        <div className="container-page">
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t.timelineTitle}</h2></Reveal>
          <div className="acq-timeline relative mt-10 grid gap-6 md:grid-cols-4" data-testid="acquire-timeline">
            {t.timeline.map(([when, h, d], i) => (
              <Reveal key={when} delay={i * 100} className="relative pl-6 md:pl-0 md:pt-8">
                <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 md:left-0 md:top-0" aria-hidden="true" />
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">{when}</div>
                <div className="mt-1 font-bold text-slate-900">{h}</div>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-500">{t.transitionNote}</p>

          <div className="mt-16 grid gap-10 lg:grid-cols-2">
            <Reveal className="rounded-3xl border border-slate-200 bg-slate-50 p-7">
              <h3 className="text-2xl font-bold text-slate-900">🗂️ {t.dataRoomTitle}</h3>
              <p className="mt-2 text-sm text-slate-600">{t.dataRoomLead}</p>
              <ul className="mt-5 space-y-2.5">{t.dataRoom.map((x) => <li key={x} className="flex gap-2.5 text-sm text-slate-700"><span className="mt-0.5 text-brand-600">◆</span>{x}</li>)}</ul>
            </Reveal>
            <Reveal delay={120} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
              <h3 className="text-2xl font-bold text-slate-900">🤝 {t.handoverTitle}</h3>
              <p className="mt-2 text-sm text-slate-600">{t.handoverLead}</p>
              <ul className="mt-5 space-y-2" data-testid="acquire-handover">{t.handover.map((h) => <li key={h} className="flex gap-2 text-sm text-slate-700"><span className="text-emerald-600">▸</span>{h}</li>)}</ul>
            </Reveal>
          </div>

          <Reveal className="mt-16 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-7">
            <h3 className="text-2xl font-bold text-slate-900">{t.stepsTitle}</h3>
            <ol className="mt-5 grid gap-5 md:grid-cols-3">
              {t.steps.map(([h, d], i) => (
                <li key={h} className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-950 font-bold text-amber-300">{i + 1}</span><div><div className="font-bold text-slate-900">{h}</div><div className="text-sm text-slate-600">{d}</div></div></li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ── Checkout ── */}
      <section id="checkout" className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-20">
        <div className="container-page max-w-4xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">🔐 {t.checkoutTitle}</h2>
          <p className="mt-2 text-sm text-slate-600" data-testid="acquire-escrow">{t.escrowNote}</p>
          {canceled ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{t.canceled}</p> : null}
          {orderId && status ? (
            paid ? (
              <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-6" data-testid="acquire-paid">
                <div className="text-xl font-extrabold text-emerald-900">🎉 {status.order.test ? t.paidTest : t.paidTitle}</div>
                {!status.order.test ? <p className="mt-2 text-emerald-900">{status.admin ? t.paidAdmin : t.paidPending}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {status.admin ? <a href="/admin" className="btn-primary">{t.openAdmin} →</a> : null}
                  {status.whatsapp ? <a href={wa(status.whatsapp, t.handoverWaText.replace("{id}", status.order.id))} target="_blank" rel="noopener" className="btn-secondary">💬 {t.handoverWa} · {status.whatsapp}</a> : null}
                  {status.order.invoiceNo ? <a href={`/api/billing/invoice/${status.order.id}`} target="_blank" rel="noopener" className="btn-ghost">{t.invoice} {status.order.invoiceNo}</a> : null}
                </div>
              </div>
            ) : !pay ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><Spinner /> {t.waiting}</p>
            ) : null
          ) : null}

          {!paid && pay ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card" data-testid={pay.kind === "wire" ? "acquire-wire" : "acquire-crypto"}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-slate-900">{pay.kind === "wire" ? `🏦 ${t.wireTitle}` : `🪙 ${t.cryptoTitle}`}</h3>
                <button type="button" className="btn-ghost btn-sm" onClick={() => { setPay(null); setOrderId(""); setStatus(null); }}>{t.back}</button>
              </div>
              {pay.kind === "wire" ? (
                <>
                  <p className="mt-2 text-sm text-slate-600">{t.wireIntro}</p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {([
                      [t.amount, `US$ ${nf.format(pay.amountUsd)}${pay.amountIdr ? ` ≈ Rp ${nf.format(pay.amountIdr)}` : ""}`, String(pay.amountUsd)],
                      [t.bank, pay.bank.name, ""], [t.holder, pay.bank.holder, pay.bank.holder],
                      [`${t.account} (${pay.bank.primary?.currency || "USD"})`, pay.bank.primary?.number || "", pay.bank.primary?.number || ""],
                      [t.swift, pay.bank.swift, pay.bank.swift], [t.code, pay.bank.code, pay.bank.code],
                      [t.reference, pay.orderId, pay.orderId],
                    ] as [string, string, string][]).map(([k, v, c]) => (
                      <div key={k} className="rounded-lg border border-slate-200 p-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
                        <dd className="mt-1 flex items-center justify-between gap-2 break-all font-mono text-sm font-semibold text-slate-900">{v}{c ? <Copy text={c} /> : null}</dd>
                      </div>
                    ))}
                  </dl>
                  <details className="mt-3 rounded-lg border border-slate-200 p-3 text-sm">
                    <summary className="cursor-pointer font-semibold text-slate-800">{t.otherCurrencies}</summary>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">{pay.bank.accounts.map((a) => <div key={a.currency} className="flex items-center justify-between gap-2 font-mono"><span className="font-semibold">{a.currency}</span><span>{a.number}</span><Copy text={a.number} /></div>)}</div>
                  </details>
                  <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-slate-700" data-testid="acquire-wire-steps">{t.wireSteps.map((s) => <li key={s}>{s}</li>)}</ol>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-slate-600">{t.cryptoIntro}</p>
                  <div className="mt-4 space-y-3">
                    {pay.wallets.map((w) => (
                      <div key={w.key} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{w.asset}</span><span className="badge-gray">{w.network}</span>{w.auto ? <span className="badge-green">⚡ auto</span> : null}</div>
                        <div className="mt-2 text-sm text-slate-600">{t.sendExact}</div>
                        <div className="flex items-center gap-2 font-mono text-lg font-bold">{w.amount} {w.asset}<Copy text={w.amount} /></div>
                        <div className="mt-2 text-sm text-slate-600">{t.to}</div>
                        <div className="flex items-center gap-2 break-all font-mono text-sm">{w.address}<Copy text={w.address} /></div>
                      </div>
                    ))}
                  </div>
                  {pay.note ? <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{pay.note}</p> : null}
                </>
              )}
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap gap-2">
                  {pay.kind === "crypto" ? (
                    <select className="select w-auto" value={proof.network} onChange={(e) => setProof({ ...proof, network: e.target.value })}>{pay.wallets.map((w) => <option key={w.key} value={w.key}>{w.asset} · {w.network}</option>)}</select>
                  ) : null}
                  <input className="input min-w-[220px] flex-1" placeholder={pay.kind === "wire" ? t.sentPh : t.txPh} value={pay.kind === "wire" ? proof.reference : proof.tx}
                    onChange={(e) => setProof(pay.kind === "wire" ? { ...proof, reference: e.target.value } : { ...proof, tx: e.target.value })} data-testid="acquire-proof" />
                  <button type="button" className="btn-primary" onClick={sendProof} disabled={busy || (pay.kind === "wire" ? !proof.reference.trim() : proof.tx.trim().length < 32)}>{busy ? <Spinner /> : null} {pay.kind === "wire" ? t.sentBtn : t.verify}</button>
                </div>
                {proofMsg ? <p className="mt-2 text-sm text-slate-700" data-testid="acquire-proof-msg">{proofMsg}</p> : null}
                <a href={wa(pay.whatsapp, t.proofWa.replace("{id}", pay.orderId))} target="_blank" rel="noopener" className="btn-secondary mt-3 inline-flex" data-testid="acquire-wa">💬 {t.whatsappProof} · {pay.whatsapp}</a>
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Spinner className="h-3 w-3" /> {t.waiting}</p>
            </div>
          ) : null}

          {!paid && !pay && !(orderId && status) ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              {!info ? <Spinner /> : !open ? (
                <p className="font-semibold text-slate-700">{info.status === "sold" ? t.sold : t.paused}</p>
              ) : me === undefined ? <Spinner /> : !me ? (
                <div>
                  <p className="text-slate-700">{t.signInFirst}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href="/register?redirect=%2Facquire%23checkout" className="btn-primary">{t.register}</a>
                    <a href="/login?redirect=%2Facquire%23checkout" className="btn-secondary">{t.signIn}</a>
                  </div>
                </div>
              ) : isAdmin ? (
                <p className="text-sm text-amber-800">{t.adminNote}</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="input" placeholder={t.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="acquire-name" />
                    <input className="input" placeholder={t.company} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} data-testid="acquire-company" />
                    <input className="input" placeholder={t.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <input className="input" placeholder={t.message} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-semibold text-slate-800">{t.method}</div>
                    {info.gateways.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {info.gateways.map((g) => (
                          <label key={g.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${gateway === g.id ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-slate-200"}`} data-testid={`acquire-gw-${g.id}`}>
                            <input type="radio" name="acq-gw" className="mt-1" checked={gateway === g.id} onChange={() => setGateway(g.id)} />
                            <span><span className="block font-semibold text-slate-900">{g.label}</span><span className="block text-xs text-slate-500">{g.methods}</span>
                              {g.test ? <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">{t.test}</span> : null}</span>
                          </label>
                        ))}
                      </div>
                    ) : <p className="text-sm text-amber-800">{t.noMethods}</p>}
                    {selected?.limit ? <p className="mt-2 text-xs text-amber-800" data-testid="acquire-paypal-limit">{t.paypalLimit.replace("{max}", money(selected.limit))}</p> : null}
                  </div>
                  {err ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p> : null}
                  <button type="button" className="w-full rounded-xl bg-ink-950 px-6 py-3.5 text-base font-bold text-amber-300 hover:bg-ink-900 disabled:opacity-60" onClick={checkout} disabled={busy || !gateway} data-testid="acquire-pay">
                    {busy ? <><Spinner /> {t.paying}</> : t.pay.replace("{amount}", money(info.priceUsd))}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900">{t.faqTitle}</h2>
          <div className="mt-6 space-y-3">{t.faq.map(([q, a]) => <details key={q} className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold text-slate-900">{q}</summary><p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p></details>)}</div>
        </div>
      </section>
    </div>
  );
}
