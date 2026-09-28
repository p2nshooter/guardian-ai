/* ==============================================================================
 * Member: Plan & billing — choose a plan, pay (card, PayPal, Indonesian local
 * methods, crypto, BNI bank transfer), watch activation, download invoices.
 * Everything that can confirm itself does: card/PayPal/crypto activate the plan
 * and issue licences automatically; bank transfers are approved by the team.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useI18n, formatDate, formatMoney, pick } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { Alert, CopyButton, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";

interface Options { plans: { id: PlanId; name: string; monthly: number; yearly: number }[]; gateways: { id: string; label: string; methods: string; currency: string }[]; usdIdr: number }
interface Overview { subscription: { plan: string; cycle: string; status: string; current_period_end: string } | null; orders: { id: string; invoice_no: string; plan: string; cycle: string; amount_usd: number; currency: string; amount_local: number; gateway: string; status: string; created_at: string; paid_at: string }[] }
type Pay =
  | { kind: "bank"; orderId: string; amountUsd: number; amountIdr: number; uniqueCode?: number; bank: Record<string, string>; note: string }
  | { kind: "crypto"; orderId: string; amountUsd: number; wallets: { key: string; asset: string; network: string; address: string; amount: string; auto: boolean }[]; note: string };

const SH_APPS: [string, string][] = [["guardian", "Guardian AI"], ["orchestra", "Orchestra AI"], ["vault", "Vault"], ["edge", "Edge"], ["soc", "SOC"], ["compliance", "Compliance"], ["sentinel", "Sentinel"], ["antivirus", "Antivirus"], ["studio", "Studio"], ["legal", "Legal (self-hosted)"]];

const L = {
  en: {
    title: "Plan & billing", sub: "Pick a plan, pay the way you like, and everything activates automatically.",
    welcome: "Welcome to AXTO! Choose a plan to unlock your apps — activation is instant with card, PayPal or crypto.",
    paid: "Payment received — your plan is active and any licences have been issued. 🎉", canceled: "Payment was cancelled. You can try again anytime.",
    current: "Your plan", none: "Free account — no apps unlocked yet.", until: "Active until", renew: "Renew / extend",
    bankSteps: "Write {id} in the transfer note if you can, then press “I've transferred” below. We confirm within one business day and e-mail you — your plan and licences activate right away.",
    cryptoSteps: "Send EXACTLY the amount shown, on the network shown. USDT/USDC payments are detected and confirmed automatically within minutes; for BTC, ETH or SOL paste your transaction hash after sending. Your plan and licences activate automatically.",
    uniqueNote: "Transfer this EXACT amount, including the last 3 digits ({code}) — they are your unique order code, so we can match your transfer. Please do not round it.",
    monthly: "Monthly", yearly: "Yearly", save: "2 months free", perMo: "/mo", perYr: "/yr", popular: "Most popular", choose: "Choose", chosen: "Selected",
    step2: "Choose how to pay", pickApps: "Choose your self-hosted apps", pickAppsHint: "Business includes any 3 — licences are issued the moment payment confirms.",
    pay: "Pay", paying: "Starting payment…", noMethods: "Online payment is being set up. Please contact us in the chat to pay by bank transfer.",
    trust: ["🔒 Secure checkout", "⚡ Instant activation", "🧾 Tax invoice", "💬 Human support"],
    bankTitle: "Bank transfer (BNI)", amount: "Amount", bankName: "Bank", accNo: "Account number", accName: "Account name", branch: "Branch", swift: "SWIFT", ref: "Transfer note / reference",
    sentTitle: "Already transferred?", sentHint: "Tell us the sender name or bank reference — we confirm within one business day and e-mail you.", sentBtn: "I've transferred", refPh: "e.g. BNI 998877 a.n. Budi",
    cryptoTitle: "Pay with crypto", sendExact: "Send exactly", to: "to", network: "Network", auto: "Detected automatically", manualHash: "After sending, paste the transaction hash",
    hashPh: "Transaction hash (TXID)", verify: "Verify payment", waiting: "Waiting for your payment… this page updates by itself.",
    history: "Payment history", invoice: "Invoice", noOrders: "No payments yet.", date: "Date", plan: "Plan", total: "Total", status: "Status", method: "Method",
    back: "← Choose another method", compare: "Compare all features",
  },
  id: {
    title: "Paket & tagihan", sub: "Pilih paket, bayar dengan cara favorit Anda, semuanya aktif otomatis.",
    welcome: "Selamat datang di AXTO! Pilih paket untuk membuka aplikasi — aktivasi instan dengan kartu, PayPal, atau kripto.",
    paid: "Pembayaran diterima — paket Anda aktif dan lisensi sudah diterbitkan. 🎉", canceled: "Pembayaran dibatalkan. Anda bisa mencoba lagi kapan saja.",
    current: "Paket Anda", none: "Akun gratis — belum ada aplikasi yang terbuka.", until: "Aktif sampai", renew: "Perpanjang",
    bankSteps: "Jika bisa, tulis {id} di berita transfer, lalu tekan “Saya sudah transfer” di bawah. Kami konfirmasi dalam 1 hari kerja dan mengirim email — paket dan lisensi Anda langsung aktif.",
    cryptoSteps: "Kirim TEPAT sejumlah yang tertera, di jaringan yang tertera. Pembayaran USDT/USDC terdeteksi dan terkonfirmasi otomatis dalam hitungan menit; untuk BTC, ETH, atau SOL tempel hash transaksi setelah mengirim. Paket dan lisensi Anda aktif otomatis.",
    uniqueNote: "Transfer TEPAT sejumlah ini, termasuk 3 digit terakhir ({code}) — itu kode unik pesanan Anda agar transfer Anda bisa kami cocokkan. Mohon jangan dibulatkan.",
    monthly: "Bulanan", yearly: "Tahunan", save: "Gratis 2 bulan", perMo: "/bln", perYr: "/thn", popular: "Paling populer", choose: "Pilih", chosen: "Dipilih",
    step2: "Pilih cara bayar", pickApps: "Pilih aplikasi self-hosted Anda", pickAppsHint: "Business mencakup 3 aplikasi bebas pilih — lisensi terbit begitu pembayaran terkonfirmasi.",
    pay: "Bayar", paying: "Memulai pembayaran…", noMethods: "Pembayaran online sedang disiapkan. Hubungi kami lewat chat untuk bayar via transfer bank.",
    trust: ["🔒 Checkout aman", "⚡ Aktivasi instan", "🧾 Faktur resmi", "💬 Dukungan manusia"],
    bankTitle: "Transfer bank (BNI)", amount: "Jumlah", bankName: "Bank", accNo: "Nomor rekening", accName: "Atas nama", branch: "Cabang", swift: "SWIFT", ref: "Berita transfer / referensi",
    sentTitle: "Sudah transfer?", sentHint: "Tuliskan nama pengirim atau referensi bank — kami konfirmasi dalam 1 hari kerja dan kirim email.", sentBtn: "Saya sudah transfer", refPh: "mis. BNI 998877 a.n. Budi",
    cryptoTitle: "Bayar dengan kripto", sendExact: "Kirim tepat", to: "ke", network: "Jaringan", auto: "Terdeteksi otomatis", manualHash: "Setelah mengirim, tempel hash transaksinya",
    hashPh: "Hash transaksi (TXID)", verify: "Verifikasi pembayaran", waiting: "Menunggu pembayaran Anda… halaman ini diperbarui otomatis.",
    history: "Riwayat pembayaran", invoice: "Faktur", noOrders: "Belum ada pembayaran.", date: "Tanggal", plan: "Paket", total: "Total", status: "Status", method: "Metode",
    back: "← Pilih metode lain", compare: "Bandingkan semua fitur",
  },
};

function BillingInner() {
  const { lang } = useI18n();
  const t = pick(L, lang);
  const { me, reload } = useMe();
  const q = useSearchParams();
  const [opts, setOpts] = useState<Options | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [plan, setPlan] = useState<PlanId | "">((PLAN_ORDER as string[]).includes(q.get("plan") || "") ? (q.get("plan") as PlanId) : "");
  const [gateway, setGateway] = useState("");
  const [apps, setApps] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pay, setPay] = useState<Pay | null>(null);
  const [orderStatus, setOrderStatus] = useState("pending");
  const [proof, setProof] = useState({ reference: "", network: "", tx: "" });
  const [proofMsg, setProofMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const loadOv = useCallback(async () => { const r = await api<Overview>("/api/billing/overview"); if (r.ok) setOv(r.data); }, []);
  useEffect(() => {
    api<Options>("/api/billing/options").then((r) => { if (r.ok) { setOpts(r.data); setGateway(r.data.gateways[0]?.id || ""); } });
    loadOv();
    if (q.get("paid")) reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll the open order until it is paid (crypto is confirmed on-chain by the platform).
  useEffect(() => {
    if (!pay || orderStatus === "paid") return;
    const iv = setInterval(async () => {
      const r = await api<{ order: { status: string } }>(`/api/billing/orders/${pay.orderId}`);
      if (r.ok && r.data.order.status !== orderStatus) {
        setOrderStatus(r.data.order.status);
        if (r.data.order.status === "paid") { reload(); loadOv(); }
      }
    }, 15000);
    return () => clearInterval(iv);
  }, [pay, orderStatus, reload, loadOv]);

  const price = (id: PlanId) => opts?.plans.find((p) => p.id === id) || { monthly: PLANS[id].monthly, yearly: PLANS[id].yearly };
  const selected = plan ? PLANS[plan] : null;
  const needApps = selected ? selected.limits.selfHostedApps > 0 : false;
  const amount = plan ? price(plan)[cycle] : 0;
  const gw = opts?.gateways.find((g) => g.id === gateway);
  const idr = useMemo(() => (opts && gw?.currency === "IDR" ? Math.round((amount * opts.usdIdr) / 1000) * 1000 : 0), [opts, gw, amount]);

  async function checkout() {
    if (!plan || !gateway) return;
    setBusy(true); setErr("");
    const r = await api<any>("/api/billing/checkout", { body: { plan, cycle, gateway, apps: needApps ? apps : undefined } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    if (r.data.url) { window.location.href = r.data.url; return; }
    setOrderStatus("pending");
    if (r.data.method === "bank") setPay({ kind: "bank", orderId: r.data.orderId, amountUsd: r.data.amountUsd, amountIdr: r.data.amountIdr, uniqueCode: r.data.uniqueCode, bank: r.data.bank, note: r.data.note || "" });
    else if (r.data.method === "crypto") { setPay({ kind: "crypto", orderId: r.data.orderId, amountUsd: r.data.amountUsd, wallets: r.data.wallets, note: r.data.note || "" }); setProof((p) => ({ ...p, network: r.data.wallets[0]?.key || "" })); }
    loadOv();
    setTimeout(() => document.getElementById("pay-panel")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function sendProof() {
    if (!pay) return;
    setBusy(true); setProofMsg(null);
    const body = pay.kind === "bank" ? { action: "bank_proof", reference: proof.reference } : { action: "crypto_proof", network: proof.network, tx: proof.tx };
    const r = await api<{ status: string; message: string }>(`/api/billing/orders/${pay.orderId}`, { body });
    setBusy(false);
    if (!r.ok) { setProofMsg({ tone: "error", text: r.error }); return; }
    setProofMsg({ tone: r.data.status === "paid" ? "success" : "info", text: r.data.message });
    if (r.data.status === "paid") { setOrderStatus("paid"); reload(); loadOv(); }
  }

  if (!opts || !me) return <LoadingBlock />;
  const sub = ov?.subscription;

  return (
    <>
      <PageHeader title={t.title} description={t.sub} />
      <div className="space-y-5">
        {q.get("welcome") ? <Alert tone="info">{t.welcome}</Alert> : null}
        {q.get("paid") ? <Alert tone="success">{t.paid}</Alert> : null}
        {q.get("canceled") ? <Alert tone="warn">{t.canceled}</Alert> : null}

        <Section title={t.current}>
          {sub && sub.status === "active" ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xl font-bold">{PLANS[sub.plan as PlanId]?.name || sub.plan}</span>
              <StatusBadge status={sub.status} />
              <span className="text-sm text-slate-600">{t.until} <strong>{formatDate(sub.current_period_end, lang)}</strong> · {sub.cycle === "yearly" ? t.yearly : t.monthly}</span>
              <button className="btn-secondary btn-sm ml-auto" onClick={() => { setPlan(sub.plan as PlanId); document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" }); }}>{t.renew}</button>
            </div>
          ) : <p className="text-sm text-slate-600">{t.none}</p>}
        </Section>

        <section id="plans">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              {(["monthly", "yearly"] as const).map((c) => (
                <button key={c} onClick={() => setCycle(c)} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${cycle === c ? "bg-ink-900 text-white" : "text-slate-600"}`}>
                  {c === "monthly" ? t.monthly : <>{t.yearly} <span className="ml-1 rounded bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-800">{t.save}</span></>}
                </button>
              ))}
            </div>
            <Link href="/pricing" className="text-sm font-semibold">{t.compare} →</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PLAN_ORDER.map((id) => {
              const p = PLANS[id];
              const pr = price(id);
              const active = plan === id;
              return (
                <button key={id} onClick={() => { setPlan(id); setPay(null); setApps([]); setTimeout(() => document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" }), 50); }}
                  className={`relative flex flex-col rounded-2xl border bg-white p-5 text-left shadow-card transition ${active ? "border-brand-500 ring-2 ring-brand-500" : p.highlight ? "border-brand-300" : "border-slate-200 hover:border-slate-300"}`}>
                  {p.highlight ? <span className="absolute -top-2.5 left-5 rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-bold text-white">{t.popular}</span> : null}
                  <div className="text-lg font-bold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.bestFor}</div>
                  <div className="mt-3">
                    <span className="text-3xl font-extrabold text-slate-900">{formatMoney(cycle === "yearly" ? Math.round((pr.yearly / 12) * 100) / 100 : pr.monthly, "USD", lang)}</span>
                    <span className="text-sm text-slate-500">{t.perMo}</span>
                    {cycle === "yearly" ? <div className="text-xs text-slate-500">{formatMoney(pr.yearly, "USD", lang)}{t.perYr}</div> : null}
                  </div>
                  <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-700">{p.features.slice(0, 7).map((f) => <li key={f} className="flex gap-2"><span className="text-brand-600">✓</span>{f}</li>)}</ul>
                  <span className={`mt-5 w-full ${active ? "btn-primary" : p.highlight ? "btn-primary" : "btn-secondary"}`}>{active ? `✓ ${t.chosen}` : `${t.choose} ${p.name}`}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs font-medium text-slate-500">{t.trust.map((x) => <span key={x}>{x}</span>)}</div>
        </section>

        {selected ? (
          <div id="checkout">
            <Section title={`${t.step2} — ${selected.name} · ${formatMoney(amount, "USD", lang)}${cycle === "yearly" ? t.perYr : t.perMo}`}>
              {needApps ? (
                <div className="mb-5">
                  <div className="font-semibold text-slate-900">{t.pickApps} ({apps.length}/{selected.limits.selfHostedApps})</div>
                  <p className="text-xs text-slate-500">{t.pickAppsHint}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SH_APPS.map(([slug, name]) => {
                      const on = apps.includes(slug);
                      return (
                        <button key={slug} type="button" onClick={() => setApps((a) => (on ? a.filter((x) => x !== slug) : a.length < selected.limits.selfHostedApps ? [...a, slug] : a))}
                          className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-brand-500 bg-brand-50 font-semibold text-brand-800" : "border-slate-300 bg-white text-slate-700"}`}>{on ? "✓ " : ""}{name}</button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {opts.gateways.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {opts.gateways.map((g) => (
                    <label key={g.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${gateway === g.id ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-slate-200"}`}>
                      <input type="radio" name="gw" className="mt-1" checked={gateway === g.id} onChange={() => { setGateway(g.id); setPay(null); }} />
                      <span><span className="block font-semibold text-slate-900">{g.label}</span><span className="block text-xs text-slate-500">{g.methods}</span></span>
                    </label>
                  ))}
                </div>
              ) : <Alert tone="warn">{t.noMethods}</Alert>}
              {err ? <div className="mt-3"><Alert tone="error">{err}</Alert></div> : null}
              {!pay ? (
                <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                  {idr ? <span className="text-sm text-slate-600">≈ {formatMoney(idr, "IDR", lang)}</span> : null}
                  <button className="btn-primary btn-lg" onClick={checkout} disabled={busy || !gateway || (needApps && apps.length === 0)}>
                    {busy ? <><Spinner /> {t.paying}</> : <>{t.pay} {formatMoney(amount, "USD", lang)} →</>}
                  </button>
                </div>
              ) : null}
            </Section>
          </div>
        ) : null}

        {pay ? (
          <div id="pay-panel">
            <Section title={pay.kind === "bank" ? `🏦 ${t.bankTitle}` : `🪙 ${t.cryptoTitle}`} actions={<button className="btn-ghost btn-sm" onClick={() => setPay(null)}>{t.back}</button>}>
              {orderStatus === "paid" ? <Alert tone="success">{t.paid}</Alert> : (
                <>
                  {pay.kind === "bank" ? (
                    <dl className="grid gap-3 sm:grid-cols-2">
                      {[[t.amount, formatMoney(pay.amountIdr, "IDR", lang), String(pay.amountIdr)], [t.bankName, pay.bank.bank_name], [t.accNo, pay.bank.account_number, pay.bank.account_number], [t.accName, pay.bank.account_name], [t.ref, pay.orderId, pay.orderId], ...(pay.bank.branch ? [[t.branch, pay.bank.branch]] : []), ...(pay.bank.swift_code ? [[t.swift, pay.bank.swift_code]] : [])].map(([k, v, copy]) => (
                        <div key={k} className="rounded-lg border border-slate-200 p-3">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
                          <dd className="mt-1 flex items-center justify-between gap-2 font-mono text-base font-semibold text-slate-900">{v}{copy ? <CopyButton text={copy} /> : null}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {pay.kind === "bank" && pay.uniqueCode ? (
                    <div className="mt-3"><Alert tone="warn">{t.uniqueNote.replace("{code}", String(pay.uniqueCode).padStart(3, "0"))}</Alert></div>
                  ) : null}
                  {pay.kind === "bank" ? null : (
                    <div className="space-y-3">
                      {pay.wallets.map((w) => (
                        <div key={w.key} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900">{w.asset}</span><span className="badge-gray">{t.network}: {w.network}</span>
                            {w.auto ? <span className="badge-green">⚡ {t.auto}</span> : null}
                          </div>
                          <div className="mt-2 text-sm text-slate-600">{t.sendExact}</div>
                          <div className="flex items-center gap-2 font-mono text-lg font-bold text-slate-900">{w.amount} {w.asset}<CopyButton text={w.amount} /></div>
                          <div className="mt-2 text-sm text-slate-600">{t.to}</div>
                          <div className="flex items-center gap-2 break-all font-mono text-sm text-slate-900">{w.address}<CopyButton text={w.address} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-4 text-sm text-slate-600">{pay.kind === "bank" ? t.bankSteps.replace("{id}", pay.orderId) : t.cryptoSteps}</p>
                  {pay.note ? <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{pay.note}</p> : null}
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="font-semibold text-slate-900">{pay.kind === "bank" ? t.sentTitle : t.manualHash}</div>
                    {pay.kind === "bank" ? <p className="text-xs text-slate-500">{t.sentHint}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pay.kind === "crypto" ? (
                        <select className="select w-auto" value={proof.network} onChange={(e) => setProof({ ...proof, network: e.target.value })}>
                          {pay.wallets.map((w) => <option key={w.key} value={w.key}>{w.asset} · {w.network}</option>)}
                        </select>
                      ) : null}
                      <input className="input min-w-[220px] flex-1" placeholder={pay.kind === "bank" ? t.refPh : t.hashPh}
                        value={pay.kind === "bank" ? proof.reference : proof.tx} onChange={(e) => setProof(pay.kind === "bank" ? { ...proof, reference: e.target.value } : { ...proof, tx: e.target.value })} />
                      <button className="btn-primary" onClick={sendProof} disabled={busy || (pay.kind === "bank" ? !proof.reference.trim() : proof.tx.trim().length < 32)}>{busy ? <Spinner /> : null} {pay.kind === "bank" ? t.sentBtn : t.verify}</button>
                    </div>
                    {proofMsg ? <div className="mt-3"><Alert tone={proofMsg.tone}>{proofMsg.text}</Alert></div> : null}
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Spinner className="h-3 w-3" /> {t.waiting}</p>
                </>
              )}
            </Section>
          </div>
        ) : null}

        <Section title={t.history}>
          {ov?.orders.length ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>{t.date}</th><th>{t.plan}</th><th>{t.method}</th><th>{t.total}</th><th>{t.status}</th><th /></tr></thead>
                <tbody>
                  {ov.orders.map((o) => (
                    <tr key={o.id}>
                      <td>{formatDate(o.created_at, lang)}</td>
                      <td>{PLANS[o.plan as PlanId]?.name || o.plan} · {o.cycle === "yearly" ? t.yearly : t.monthly}</td>
                      <td>{opts.gateways.find((g) => g.id === o.gateway)?.label || o.gateway}</td>
                      <td>{formatMoney(o.amount_usd, "USD", lang)}{o.amount_local ? <span className="block text-xs text-slate-500">{formatMoney(o.amount_local, "IDR", lang)}</span> : null}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>{o.status === "paid" ? <a href={`/api/billing/invoice/${o.id}`} target="_blank" rel="noopener" className="text-sm font-semibold">{t.invoice}</a> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-500">{t.noOrders}</p>}
        </Section>
      </div>
    </>
  );
}

export default function BillingPage() {
  return <Suspense fallback={<LoadingBlock />}><BillingInner /></Suspense>;
}
