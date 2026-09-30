/* /acquire — the site-sale offer: story, privacy guarantee, everything included,
 * handover, and a secure checkout (PayPal first, crypto, BNI wire). After a
 * verified payment the buyer's session is refreshed and carries the
 * administrator role — the success panel links straight to /admin. */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useI18n, formatMoney } from "@/lib/i18n";
import { Spinner } from "@/components/ui";
import { ACQ, type AcqLang } from "@/lib/acquire-copy";

export interface OfferApp { slug: string; name: string; icon: string; short: string; features: string[] }
export interface OfferProduct { slug: string; name: string; emoji: string; tagline: string }
interface Info { status: "open" | "paused" | "sold"; priceUsd: number; gateways: { id: string; label: string; methods: string; test: boolean; limit?: number }[] }
interface Me { email: string; role: string; name?: string }
type Wire = { kind: "wire"; orderId: string; amountUsd: number; amountIdr: number; whatsapp: string; bank: { name: string; holder: string; swift: string; code: string; branch: string; primary?: { currency: string; number: string }; accounts: { currency: string; number: string }[] } };
type Crypto = { kind: "crypto"; orderId: string; amountUsd: number; whatsapp: string; wallets: { key: string; asset: string; network: string; address: string; amount: string; auto: boolean }[]; note: string };
type Status = { order: { id: string; status: string; invoiceNo: string; test: boolean }; admin: boolean; buyer: boolean; whatsapp: string };

const wa = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

function Copy({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }}>{ok ? "✓" : "⧉"}</button>;
}

export default function AcquireOffer({ apps, products, stats }: { apps: OfferApp[]; products: OfferProduct[]; stats: { apps: number; selfHosted: number; langs: number; gateways: number; jurisdictions: string; tests: string } }) {
  const { lang: siteLang } = useI18n();
  const [lang, setLang] = useState<AcqLang>(siteLang === "id" ? "id" : "en");
  useEffect(() => { setLang(siteLang === "id" ? "id" : "en"); }, [siteLang]);
  const t = ACQ[lang];
  const money = (n: number, c = "USD") => formatMoney(n, c, lang === "id" ? "id" : "en");

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

  useEffect(() => {
    api<Info>("/api/acquire").then((r) => { if (r.ok) { setInfo(r.data); setGateway(r.data.gateways[0]?.id || ""); } });
    api<Me>("/api/auth/me").then((r) => { setMe(r.ok ? r.data : null); if (r.ok) setForm((f) => ({ ...f, name: f.name || r.data.name || "" })); });
    const q = new URLSearchParams(window.location.search);
    const paid = q.get("paid");
    if (paid) { setOrderId(paid); setTimeout(() => document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" }), 300); }
    if (q.get("canceled")) setErr(lang === "id" ? "Pembayaran dibatalkan — silakan pilih metode lagi." : "The payment was cancelled — choose a method again.");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    setBusy(true); setErr("");
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
  const nf = useMemo(() => new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US"), [lang]);
  const selected = info?.gateways.find((g) => g.id === gateway);
  const proofText = (id: string) => (lang === "id" ? `Halo, saya sudah transfer untuk akuisisi AXTO. Referensi pesanan: ${id}. Berikut bukti transfernya.` : `Hello, I have sent the wire for the AXTO acquisition. Order reference: ${id}. Here is the transfer receipt.`);

  return (
    <div data-testid="acquire">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-ink-950 py-16 text-white sm:py-24">
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(1200px 400px at 20% -10%, rgba(245,158,11,.25), transparent), radial-gradient(900px 500px at 90% 10%, rgba(59,130,246,.25), transparent)" }} />
        <div className="container-page relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">🏛️ {t.eyebrow}</p>
            <div className="inline-flex rounded-full border border-white/20 bg-white/5 p-0.5 text-xs font-semibold" role="group" aria-label="Language">
              {(["en", "id"] as AcqLang[]).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={`rounded-full px-3 py-1 ${lang === l ? "bg-white text-ink-950" : "text-white/80"}`}>{l === "en" ? "English" : "Indonesia"}</button>)}
            </div>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">{t.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-300">{t.lead}</p>
          <div className="mt-8 flex flex-wrap items-end gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.price}</div>
              <div className="text-4xl font-black text-amber-300 sm:text-5xl" data-testid="acquire-price">{info ? money(info.priceUsd) : "…"}</div>
            </div>
            {info && info.status !== "open" ? (
              <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-200">{info.status === "sold" ? t.sold : t.paused}</div>
            ) : (
              <a href="#checkout" className="rounded-xl bg-amber-400 px-6 py-3.5 text-base font-bold text-ink-950 no-underline shadow-lg hover:bg-amber-300">{t.buy} →</a>
            )}
          </div>
          <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {([[stats.apps, t.stats.apps], [stats.selfHosted, t.stats.selfHosted], [stats.langs, t.stats.langs], [stats.gateways, t.stats.gateways], [stats.jurisdictions, t.stats.jurisdictions], [stats.tests, t.stats.tests]] as [string | number, string][]).map(([n, l]) => (
              <div key={l} className="rounded-xl border border-white/10 bg-white/5 p-4"><dt className="text-2xl font-extrabold">{n}</dt><dd className="text-xs text-slate-400">{l}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      {/* Privacy guarantee */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-emerald-50/60 to-white py-16">
        <div className="container-page">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">🛡️ {t.promiseTitle}</h2>
          <p className="mt-3 max-w-3xl text-slate-600">{t.promiseLead}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {t.promise.map(([h, d], i) => (
              <div key={h} className={`rounded-2xl border bg-white p-5 shadow-card ${i >= 3 ? "border-dashed border-slate-300" : "border-emerald-200"}`}>
                <div className="flex items-center gap-2 font-bold text-slate-900"><span className={i >= 3 ? "text-slate-400" : "text-emerald-600"}>{i >= 3 ? "◷" : "✓"}</span>{h}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apps */}
      <section className="py-16">
        <div className="container-page">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t.appsTitle}</h2>
          <p className="mt-3 max-w-3xl text-slate-600">{t.appsLead}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {apps.map((a) => (
              <Link key={a.slug} href={`/apps/${a.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-5 no-underline shadow-card transition hover:-translate-y-0.5 hover:border-slate-300">
                <div className="flex items-center gap-2"><span className="text-2xl">{a.icon}</span><span className="text-lg font-bold text-slate-900">{a.name}</span></div>
                <p className="mt-2 text-sm text-slate-600">{a.short}</p>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">{a.features.slice(0, 5).map((f) => <li key={f} className="flex gap-2"><span className="text-brand-600">✓</span>{f}</li>)}</ul>
              </Link>
            ))}
          </div>

          <h3 className="mt-14 text-2xl font-bold text-slate-900">{t.selfHostedTitle}</h3>
          <p className="mt-2 max-w-3xl text-slate-600">{t.selfHostedLead}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {products.map((p) => (
              <div key={p.slug} className="rounded-xl border border-slate-200 bg-white p-4"><div className="font-semibold text-slate-900">{p.emoji} {p.name}</div><div className="mt-1 text-xs text-slate-500">{p.tagline}</div></div>
            ))}
          </div>

          <h3 className="mt-14 text-2xl font-bold text-slate-900">{t.engineTitle}</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {t.engine.map(([h, d]) => <div key={h} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="font-bold text-slate-900">{h}</div><p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p></div>)}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="font-bold text-slate-900">{t.stackTitle}</div><p className="mt-2 text-sm leading-relaxed text-slate-600">{t.stack}</p></div>
          </div>
        </div>
      </section>

      {/* Handover + steps */}
      <section className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t.stepsTitle}</h2>
            <ol className="mt-6 space-y-5">
              {t.steps.map(([h, d], i) => (
                <li key={h} className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-950 font-bold text-amber-300">{i + 1}</span><div><div className="font-bold text-slate-900">{h}</div><div className="text-sm text-slate-600">{d}</div></div></li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t.handoverTitle}</h2>
            <p className="mt-3 text-slate-600">{t.handoverLead}</p>
            <ul className="mt-5 space-y-2" data-testid="acquire-handover">{HANDOVER_VIEW[lang].map((h) => <li key={h} className="flex gap-2 text-sm text-slate-700"><span className="text-emerald-600">▸</span>{h}</li>)}</ul>
          </div>
        </div>
      </section>

      {/* Checkout */}
      <section id="checkout" className="scroll-mt-20 py-16">
        <div className="container-page max-w-4xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">🔐 {t.checkoutTitle}</h2>
          {orderId && status ? (
            paid ? (
              <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-6" data-testid="acquire-paid">
                <div className="text-xl font-extrabold text-emerald-900">🎉 {status.order.test ? t.paidTest : t.paidTitle}</div>
                {!status.order.test ? <p className="mt-2 text-emerald-900">{status.admin ? t.paidAdmin : t.paidPending}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {status.admin ? <a href="/admin" className="btn-primary">{t.openAdmin} →</a> : null}
                  {status.whatsapp ? <a href={wa(status.whatsapp, lang === "id" ? `Halo, pembayaran akuisisi AXTO sudah terverifikasi (pesanan ${status.order.id}). Mari atur serah terima.` : `Hello, my AXTO acquisition payment is verified (order ${status.order.id}). Let's arrange the handover.`)} target="_blank" rel="noopener" className="btn-secondary">💬 {t.handoverWa} · {status.whatsapp}</a> : null}
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
                        <dd className="mt-1 flex items-center justify-between gap-2 font-mono text-sm font-semibold text-slate-900">{v}{c ? <Copy text={c} /> : null}</dd>
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
                <a href={wa(pay.whatsapp, proofText(pay.orderId))} target="_blank" rel="noopener" className="btn-secondary mt-3 inline-flex" data-testid="acquire-wa">💬 {t.whatsappProof} · {pay.whatsapp}</a>
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

      {/* FAQ */}
      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900">{t.faqTitle}</h2>
          <div className="mt-6 space-y-3">{t.faq.map(([q, a]) => <details key={q} className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold text-slate-900">{q}</summary><p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p></details>)}</div>
        </div>
      </section>
    </div>
  );
}

const HANDOVER_VIEW: Record<AcqLang, string[]> = {
  en: [
    "Administrator access to the AXTO portal — automatic when the payment is verified",
    "Domain axto.io at the registrar",
    "Cloudflare account / zone: Pages project, D1 database, KV, R2 buckets, Workers and DNS",
    "GitHub repositories (dashboard, engines, installer, CI/CD) with full history",
    "Payment provider accounts — or a clean switch to your own (PayPal, Stripe, Xendit, Midtrans, NOWPayments, crypto wallets)",
    "E-mail sending (Resend) and support inboxes",
    "Docker images and the release pipeline (x86-64 and ARM64), AXTO Setup installer",
    "Brand, logo, content, blog, SEO pages and translations (10 languages)",
    "Documentation: architecture blueprint, admin runbooks, CI/CD and self-hosting guides",
  ],
  id: [
    "Akses administrator portal AXTO — otomatis saat pembayaran terverifikasi",
    "Domain axto.io di registrar",
    "Akun / zona Cloudflare: proyek Pages, database D1, KV, bucket R2, Workers dan DNS",
    "Repositori GitHub (dashboard, engine, installer, CI/CD) beserta seluruh riwayatnya",
    "Akun penyedia pembayaran — atau peralihan rapi ke akun Anda sendiri (PayPal, Stripe, Xendit, Midtrans, NOWPayments, dompet kripto)",
    "Pengiriman email (Resend) dan kotak masuk dukungan",
    "Image Docker dan pipeline rilis (x86-64 dan ARM64), installer AXTO Setup",
    "Merek, logo, konten, blog, halaman SEO dan terjemahan (10 bahasa)",
    "Dokumentasi: blueprint arsitektur, runbook admin, panduan CI/CD dan self-hosting",
  ],
};
