/* Payment instructions for an open order that does not redirect to a hosted
 * page: BNI bank transfer (unique amount + "I've transferred") and direct
 * crypto (wallets + tx-hash verification). Polls the order until it is paid.
 * Shared by Plan & billing and Lifetime licences. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useI18n, formatMoney, pick } from "@/lib/i18n";
import { Alert, CopyButton, Section, Spinner } from "@/components/ui";

export type Pay =
  | { kind: "bank"; orderId: string; amountUsd: number; amountIdr: number; uniqueCode?: number; bank: Record<string, string>; note: string }
  | { kind: "crypto"; orderId: string; amountUsd: number; wallets: { key: string; asset: string; network: string; address: string; amount: string; auto: boolean }[]; note: string };

/** Turns a /api/billing/checkout answer into a Pay (null when it redirected or failed). */
export function payFromCheckout(d: any): Pay | null {
  if (d?.method === "bank") return { kind: "bank", orderId: d.orderId, amountUsd: d.amountUsd, amountIdr: d.amountIdr, uniqueCode: d.uniqueCode, bank: d.bank, note: d.note || "" };
  if (d?.method === "crypto") return { kind: "crypto", orderId: d.orderId, amountUsd: d.amountUsd, wallets: d.wallets, note: d.note || "" };
  return null;
}

const L = {
  en: {
    bankSteps: "Write {id} in the transfer note if you can, then press “I've transferred” below. We confirm within one business day and e-mail you — your purchase activates right away.",
    cryptoSteps: "Send EXACTLY the amount shown, on the network shown. USDT/USDC payments are detected and confirmed automatically within minutes; for BTC, ETH or SOL paste your transaction hash after sending. Everything activates automatically.",
    uniqueNote: "Transfer this EXACT amount, including the last 3 digits ({code}) — they are your unique order code, so we can match your transfer. Please do not round it.",
    bankTitle: "Bank transfer (BNI)", amount: "Amount", bankName: "Bank", accNo: "Account number", accName: "Account name", branch: "Branch", swift: "SWIFT", ref: "Transfer note / reference",
    sentTitle: "Already transferred?", sentHint: "Tell us the sender name or bank reference — we confirm within one business day and e-mail you.", sentBtn: "I've transferred", refPh: "e.g. BNI 998877 a.n. Budi",
    cryptoTitle: "Pay with crypto", sendExact: "Send exactly", to: "to", network: "Network", auto: "Detected automatically", manualHash: "After sending, paste the transaction hash",
    hashPh: "Transaction hash (TXID)", verify: "Verify payment", waiting: "Waiting for your payment… this page updates by itself.", back: "← Choose another method",
  },
  id: {
    bankSteps: "Jika bisa, tulis {id} di berita transfer, lalu tekan “Saya sudah transfer” di bawah. Kami konfirmasi dalam 1 hari kerja dan mengirim email — pembelian Anda langsung aktif.",
    cryptoSteps: "Kirim TEPAT sejumlah yang tertera, di jaringan yang tertera. Pembayaran USDT/USDC terdeteksi dan terkonfirmasi otomatis dalam hitungan menit; untuk BTC, ETH, atau SOL tempel hash transaksi setelah mengirim. Semuanya aktif otomatis.",
    uniqueNote: "Transfer TEPAT sejumlah ini, termasuk 3 digit terakhir ({code}) — itu kode unik pesanan Anda agar transfer Anda bisa kami cocokkan. Mohon jangan dibulatkan.",
    bankTitle: "Transfer bank (BNI)", amount: "Jumlah", bankName: "Bank", accNo: "Nomor rekening", accName: "Atas nama", branch: "Cabang", swift: "SWIFT", ref: "Berita transfer / referensi",
    sentTitle: "Sudah transfer?", sentHint: "Tuliskan nama pengirim atau referensi bank — kami konfirmasi dalam 1 hari kerja dan kirim email.", sentBtn: "Saya sudah transfer", refPh: "mis. BNI 998877 a.n. Budi",
    cryptoTitle: "Bayar dengan kripto", sendExact: "Kirim tepat", to: "ke", network: "Jaringan", auto: "Terdeteksi otomatis", manualHash: "Setelah mengirim, tempel hash transaksinya",
    hashPh: "Hash transaksi (TXID)", verify: "Verifikasi pembayaran", waiting: "Menunggu pembayaran Anda… halaman ini diperbarui otomatis.", back: "← Pilih metode lain",
  },
};

export default function PayPanel({ pay, onBack, onPaid, paidText }: { pay: Pay; onBack: () => void; onPaid: () => void; paidText: string }) {
  const { lang } = useI18n();
  const t = pick(L, lang);
  const [status, setStatus] = useState("pending");
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState({ reference: "", network: pay.kind === "crypto" ? pay.wallets[0]?.key || "" : "", tx: "" });
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => { setStatus("pending"); setMsg(null); }, [pay.orderId]);
  // Poll the open order until it is paid (crypto is confirmed on-chain by the platform).
  useEffect(() => {
    if (status === "paid") return;
    const iv = setInterval(async () => {
      const r = await api<{ order: { status: string } }>(`/api/billing/orders/${pay.orderId}`);
      if (r.ok && r.data.order.status !== status) {
        setStatus(r.data.order.status);
        if (r.data.order.status === "paid") onPaid();
      }
    }, 15000);
    return () => clearInterval(iv);
  }, [pay.orderId, status, onPaid]);

  async function sendProof() {
    setBusy(true); setMsg(null);
    const body = pay.kind === "bank" ? { action: "bank_proof", reference: proof.reference } : { action: "crypto_proof", network: proof.network, tx: proof.tx };
    const r = await api<{ status: string; message: string }>(`/api/billing/orders/${pay.orderId}`, { body });
    setBusy(false);
    if (!r.ok) { setMsg({ tone: "error", text: r.error }); return; }
    setMsg({ tone: r.data.status === "paid" ? "success" : "info", text: r.data.message });
    if (r.data.status === "paid") { setStatus("paid"); onPaid(); }
  }

  return (
    <div id="pay-panel">
      <Section title={pay.kind === "bank" ? `🏦 ${t.bankTitle}` : `🪙 ${t.cryptoTitle}`} actions={<button className="btn-ghost btn-sm" onClick={onBack}>{t.back}</button>}>
        {status === "paid" ? <Alert tone="success">{paidText}</Alert> : (
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
            ) : (
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
            {pay.kind === "bank" && pay.uniqueCode ? (
              <div className="mt-3"><Alert tone="warn">{t.uniqueNote.replace("{code}", String(pay.uniqueCode).padStart(3, "0"))}</Alert></div>
            ) : null}
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
              {msg ? <div className="mt-3"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Spinner className="h-3 w-3" /> {t.waiting}</p>
          </>
        )}
      </Section>
    </div>
  );
}
