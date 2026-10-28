/* The site-sale auction on /acquire (docs/BLUEPRINT-V4.md §34): the live board —
 * the opening or current bid, the countdown, the latest bids with masked names,
 * the rules — and the member's side: sign in, register as a bidder, wait for
 * approval, bid, lead or be outbid, win and pay. Everything shown comes from
 * /api/acquire (lib/sale-auction.ts); nothing is invented on the page. English
 * renders statically; the other nine languages load on demand. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useI18n, formatMoney } from "@/lib/i18n";
import { LOCALE, type Lang } from "@/lib/i18n-shared";
import { Spinner } from "@/components/ui";
import { Countdown } from "@/components/site/auction-ui";
import { SALE_AUC_EN, type SaleAucCopy } from "@/lib/sale-auction-copy";
import type { MyAuction, PublicRound } from "@/lib/sale-auction";

export interface SaleAuctionInfo { approval: boolean; round: PublicRound | null; me: MyAuction | null }

let cache: Partial<Record<Lang, SaleAucCopy>> | null = null;
/** The auction's words in the reader's language. */
export function useSaleAucCopy() {
  const { lang } = useI18n();
  const [dict, setDict] = useState(cache);
  useEffect(() => {
    if (lang === "en" || dict) return;
    import("@/lib/i18n-pages/sale-auction").then((m) => { cache = m.SALE_AUC; setDict(m.SALE_AUC); }).catch(() => {});
  }, [lang, dict]);
  const t: SaleAucCopy = lang === "en" ? SALE_AUC_EN : dict?.[lang] || SALE_AUC_EN;
  return { t, lang, money: (n: number) => formatMoney(n, "USD", lang), date: (iso: string) => new Date(iso).toLocaleDateString(LOCALE[lang] || "en-US", { day: "numeric", month: "long", year: "numeric" }) };
}

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export default function SaleAuctionPanel({ info, signedIn, onChange }: { info: SaleAuctionInfo; signedIn: boolean | undefined; onChange: () => void }) {
  const { t, money, date } = useSaleAucCopy();
  const r = info.round;
  const me = info.me;
  const [amount, setAmount] = useState("");
  const [form, setForm] = useState({ displayName: "", company: "", country: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const nextMin = r?.nextMinUsd || 0;
  useEffect(() => { if (nextMin && (!amount || Number(amount) < nextMin)) setAmount(String(nextMin)); }, [nextMin]); // eslint-disable-line react-hooks/exhaustive-deps

  async function bid() {
    setBusy(true); setMsg(null);
    const res = await api<{ extended: boolean }>("/api/acquire/bid", { body: { amount } });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: res.data.extended ? `${t.bidPlaced} ${t.extended}` : t.bidPlaced } : { ok: false, text: res.error });
    onChange();
  }
  async function register() {
    setBusy(true); setMsg(null);
    const res = await api<{ status: string }>("/api/acquire/bidder", { body: form });
    setBusy(false);
    // Approved at once (approval switched off): the bid form takes over, nothing to say.
    setMsg(res.ok ? (res.data.status === "approved" ? null : { ok: true, text: t.pending }) : { ok: false, text: res.error });
    onChange();
  }

  const open = r?.status === "open";
  const won = r && (r.status === "awaiting_payment" || r.status === "sold");
  const shown = r ? (r.bidsCount ? r.highUsd : r.openUsd) : 0;
  const bidNum = Number(amount.replace(/[^\d]/g, "")) || 0;

  return (
    <section id="bid" className="scroll-mt-20 border-b border-slate-200 bg-gradient-to-b from-amber-50/60 to-white py-16" data-testid="sale-auction">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">🔨 {r ? fill(t.round, { n: r.no }) : t.boardTitle}</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t.boardTitle}</h2>
            <p className="mt-2 max-w-2xl text-slate-600">{t.boardLead}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* ── the board ── */}
          <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-card">
            {!r ? <p className="text-slate-600">{t.nextRound}</p> : (
              <>
                <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{won ? t.winningBid : r.bidsCount ? t.currentBid : t.openingBid}</div>
                    <div className="mt-1 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl" data-testid="sale-auction-amount">{money(won ? r.winnerUsd : shown)}</div>
                    <div className="mt-1 text-sm text-slate-500">{fill(t.bids, { n: r.bidsCount })}{r.bidsCount ? ` · ${r.leader}` : ""}</div>
                  </div>
                  {open ? (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t.endsIn}</div>
                      <div className="mt-1"><Countdown to={r.endsAt} testid="sale-auction-countdown" /></div>
                    </div>
                  ) : null}
                </div>
                {open ? (
                  <>
                    {!r.bidsCount ? <p className="mt-4 text-sm font-semibold text-emerald-800">{t.noBids}</p> : null}
                    <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">⚡ {t.noReserve}</p>
                    <p className="mt-2 text-sm text-slate-600">{t.urgency}</p>
                    <p className="mt-2 text-xs text-slate-500">{t.openingNote} {t.openingBid}: <b>{money(r.openUsd)}</b>.</p>
                  </>
                ) : (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700" data-testid="sale-auction-ended">
                    <div className="font-bold text-slate-900">{r.status === "sold" ? t.sold : t.endedTitle}</div>
                    {r.status === "awaiting_payment" ? <p className="mt-1">{fill(t.awaiting, { amount: money(r.winnerUsd) })}</p> : null}
                    {r.status === "unsold" || r.status === "cancelled" ? <p className="mt-1">{t.nextRound}</p> : null}
                  </div>
                )}

                <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">{t.latestBids}</h3>
                {r.bids.length ? (
                  <ol className="mt-2 divide-y divide-slate-100" data-testid="sale-auction-bids">
                    {r.bids.map((b, i) => (
                      <li key={`${b.at}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="font-semibold text-slate-800">{i === 0 ? "🏆 " : ""}{b.name}</span>
                        <span className="tabular-nums font-bold text-slate-900">{money(b.amountUsd)}</span>
                        <span className="hidden text-xs text-slate-400 sm:inline">{new Date(b.at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="mt-2 text-sm text-slate-500">{t.noneYet}</p>}
              </>
            )}
          </div>

          {/* ── the member's side ── */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card" data-testid="sale-auction-action">
            {won && me?.winner ? (
              <div data-testid="sale-auction-won">
                <div className="text-xl font-extrabold text-emerald-800">🎉 {fill(t.youWon, { amount: money(me.amountUsd), date: date(me.payBy) })}</div>
                <a href="#checkout" className="btn-primary mt-4 inline-flex">{t.payNow} →</a>
              </div>
            ) : !open ? (
              <p className="text-slate-600">{r?.status === "sold" ? t.sold : t.nextRound}</p>
            ) : signedIn === undefined ? <Spinner /> : !signedIn ? (
              <div>
                <p className="text-slate-700">{t.signInToBid}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href="/register?redirect=%2Facquire%23bid" className="btn-primary">{t.register}</a>
                  <a href="/login?redirect=%2Facquire%23bid" className="btn-secondary">{t.signIn}</a>
                </div>
              </div>
            ) : me?.admin ? (
              <p className="text-sm text-amber-800">{t.adminNote}</p>
            ) : !me?.bidder || (me.bidder.status !== "approved" && me.bidder.status !== "pending" && me.bidder.status !== "rejected") ? (
              <div data-testid="sale-auction-register">
                <h3 className="text-lg font-bold text-slate-900">{t.registerTitle}</h3>
                <p className="mt-1 text-sm text-slate-600">{t.registerLead}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input className="input sm:col-span-2" placeholder={t.displayName} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} data-testid="sale-bidder-name" />
                  <input className="input" placeholder={t.company} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  <input className="input" placeholder={t.country} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} data-testid="sale-bidder-country" />
                  <input className="input sm:col-span-2" placeholder={t.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="sale-bidder-phone" />
                  <textarea className="input sm:col-span-2" rows={2} placeholder={t.message} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <button type="button" className="btn-primary mt-4 w-full" onClick={register} disabled={busy || !form.displayName.trim() || !form.country.trim() || !form.phone.trim()} data-testid="sale-bidder-submit">
                  {busy ? <Spinner /> : null} {t.registerBtn}
                </button>
              </div>
            ) : me.bidder.status === "pending" ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900" data-testid="sale-auction-pending">⏳ {t.pending}</p>
            ) : me.bidder.status === "rejected" ? (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{t.rejected}</p>
            ) : (
              <div data-testid="sale-auction-bid">
                {me.leading ? <p className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">🏆 {t.leading}</p>
                  : me.myBestUsd ? <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{fill(t.outbid, { amount: money(me.myBestUsd) })}</p> : null}
                <label className="block text-sm font-semibold text-slate-700">{t.yourBid}
                  <input className="input mt-1 text-lg font-bold tabular-nums" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} data-testid="sale-bid-amount" />
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[0, 1, 4].map((k) => {
                    const v = nextMin + k * (r?.stepUsd || 0);
                    return <button key={k} type="button" className="btn-ghost btn-sm" onClick={() => setAmount(String(v))}>{money(v)}</button>;
                  })}
                </div>
                <button type="button" className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3.5 text-base font-extrabold text-ink-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-60"
                  onClick={bid} disabled={busy || bidNum < nextMin || !!me.leading} data-testid="sale-bid-submit">
                  {busy ? <><Spinner /> {t.bidding}</> : fill(t.bidBtn, { amount: money(bidNum || nextMin) })}
                </button>
                <p className="mt-2 text-xs text-slate-500">{t.binding}</p>
              </div>
            )}
            {msg ? <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} data-testid="sale-auction-msg">{msg.text}</p> : null}

            {r && open ? (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{t.rulesTitle}</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {t.rules.map((x) => <li key={x} className="flex gap-2"><span className="text-amber-600">◆</span>{fill(x, { step: money(r.stepUsd), min: r.snipeMinutes, days: r.payDays })}</li>)}
                  <li className="flex gap-2"><span className="text-amber-600">◆</span>{info.approval ? t.ruleApproval : t.ruleOpen}</li>
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
