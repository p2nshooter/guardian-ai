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
  return {
    t, lang, money: (n: number) => formatMoney(n, "USD", lang),
    date: (iso: string) => new Date(iso).toLocaleDateString(LOCALE[lang] || "en-US", { day: "numeric", month: "long", year: "numeric" }),
    /** The day of the next weekly rise, in Jakarta time, where the ladder is counted (REQUESTS 125). */
    riseDate: (iso: string) => new Date(iso).toLocaleDateString(LOCALE[lang] || "en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }),
  };
}

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export default function SaleAuctionPanel({ info, signedIn, onChange }: { info: SaleAuctionInfo; signedIn: boolean | undefined; onChange: () => void }) {
  const { t, money, date, riseDate } = useSaleAucCopy();
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
    <section id="bid" className="auc-house relative isolate scroll-mt-20 overflow-hidden py-20 text-white sm:py-24" data-testid="sale-auction">
      <div className="auc-house-glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="auc-house-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.42em] text-gold-300">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold-400/70" aria-hidden="true" />
            {r ? fill(t.round, { n: r.no }) : t.boardTitle}
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold-400/70" aria-hidden="true" />
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            <span className="gold-text italic">{t.boardTitle}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">{t.boardLead}</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* ── the board ── */}
          <div className="auc-glass relative rounded-[28px] p-6 sm:p-8">
            {!r ? <p className="text-slate-300">{t.nextRound}</p> : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-200/70">{won ? t.winningBid : r.bidsCount ? t.currentBid : t.openingBid}</div>
                    <div className="acq-price auc-nums mt-2 font-display text-5xl font-semibold leading-none tracking-tight sm:text-6xl" data-testid="sale-auction-amount">{money(won ? r.winnerUsd : shown)}</div>
                    <div className="mt-3 text-sm text-slate-400">{fill(t.bids, { n: r.bidsCount })}{r.bidsCount ? <> · <span className="text-gold-100">{r.leader}</span></> : null}</div>
                  </div>
                  {open ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-200/70">{t.endsIn}</div>
                      <div className="mt-2"><Countdown to={r.endsAt} tone="gold" testid="sale-auction-countdown" /></div>
                    </div>
                  ) : null}
                </div>
                <div className="my-6 h-px bg-gradient-to-r from-transparent via-gold-400/30 to-transparent" aria-hidden="true" />
                {open ? (
                  <>
                    {!r.bidsCount ? <p className="text-sm font-medium text-emerald-300">{t.noBids}</p> : null}
                    <p className="mt-3 flex gap-3 rounded-2xl border border-gold-400/25 bg-gradient-to-r from-gold-400/[0.12] via-gold-400/[0.05] to-transparent px-4 py-3 text-sm font-medium leading-relaxed text-gold-100">
                      <span className="text-gold-300" aria-hidden="true">✦</span>{t.noReserve}
                    </p>
                    <p className="mt-4 font-display text-lg italic leading-snug text-slate-200">“{t.urgency}”</p>
                    {r.nextRiseAt ? (
                      <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/[0.08] px-3.5 py-1.5 text-xs font-semibold text-gold-200" data-testid="sale-auction-rise">
                        <span aria-hidden="true">▲</span><span className="auc-nums">{fill(t.rises, { next: money(r.openUsd + r.weeklyUsd), date: riseDate(r.nextRiseAt) })}</span>
                      </p>
                    ) : null}
                    {r.weeklyUsd > 0 ? (
                      <p className="mt-3 text-xs leading-relaxed text-slate-400" data-testid="sale-auction-opening">{fill(t.openingNoteRising, { weekly: money(r.weeklyUsd) })} {t.openingBid}: <b className="auc-nums font-semibold text-gold-100">{money(r.openUsd)}</b>.</p>
                    ) : (
                      <p className="mt-3 text-xs leading-relaxed text-slate-400" data-testid="sale-auction-opening">
                        {t.openingNote.split("{open}")[0]}<b className="auc-nums font-semibold text-gold-100">{money(r.openUsd)}</b>{t.openingNote.split("{open}").slice(1).join("")}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300" data-testid="sale-auction-ended">
                    <div className="font-display text-lg text-white">{r.status === "sold" ? t.sold : t.endedTitle}</div>
                    {r.status === "awaiting_payment" ? <p className="mt-1">{fill(t.awaiting, { amount: money(r.winnerUsd) })}</p> : null}
                    {r.status === "unsold" || r.status === "cancelled" ? <p className="mt-1">{t.nextRound}</p> : null}
                  </div>
                )}

                <h3 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-200/70">{t.latestBids}</h3>
                {r.bids.length ? (
                  <ol className="mt-3 space-y-1.5" data-testid="sale-auction-bids">
                    {r.bids.map((b, i) => (
                      <li key={`${b.at}-${i}`} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm ${i === 0 ? "border border-gold-400/25 bg-gradient-to-r from-gold-400/[0.14] to-transparent" : "border border-transparent bg-white/[0.02]"}`}>
                        <span className={`font-medium ${i === 0 ? "text-gold-100" : "text-slate-200"}`}>{i === 0 ? <span className="mr-1.5 text-gold-300" aria-hidden="true">♛</span> : null}{b.name}</span>
                        <span className={`auc-nums font-display text-base font-semibold ${i === 0 ? "text-gold-200" : "text-white"}`}>{money(b.amountUsd)}</span>
                        <span className="hidden text-xs text-slate-500 sm:inline">{new Date(b.at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="mt-3 text-sm text-slate-400">{t.noneYet}</p>}
              </>
            )}
          </div>

          {/* ── the member's side ── */}
          <div className="auc-glass relative rounded-[28px] p-6 sm:p-8" data-testid="sale-auction-action">
            {won && me?.winner ? (
              <div data-testid="sale-auction-won">
                <div className="font-display text-2xl leading-snug text-gold-100">♛ {fill(t.youWon, { amount: money(me.amountUsd), date: date(me.payBy) })}</div>
                <a href="#checkout" className="btn-royal mt-5 inline-flex">{t.payNow} →</a>
              </div>
            ) : !open ? (
              <p className="text-slate-300">{r?.status === "sold" ? t.sold : t.nextRound}</p>
            ) : signedIn === undefined ? <Spinner /> : !signedIn ? (
              <div>
                <p className="font-display text-xl leading-snug text-white">{t.signInToBid}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href="/register?redirect=%2Facquire%23bid" className="btn-royal">{t.register}</a>
                  <a href="/login?redirect=%2Facquire%23bid" className="btn-crystal">{t.signIn}</a>
                </div>
              </div>
            ) : me?.admin ? (
              <p className="text-sm text-gold-100">{t.adminNote}</p>
            ) : !me?.bidder || (me.bidder.status !== "approved" && me.bidder.status !== "pending" && me.bidder.status !== "rejected") ? (
              <div data-testid="sale-auction-register">
                <h3 className="font-display text-2xl text-white">{t.registerTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.registerLead}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <input className="auc-input sm:col-span-2" placeholder={t.displayName} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} data-testid="sale-bidder-name" />
                  <input className="auc-input" placeholder={t.company} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  <input className="auc-input" placeholder={t.country} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} data-testid="sale-bidder-country" />
                  <input className="auc-input sm:col-span-2" placeholder={t.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="sale-bidder-phone" />
                  <textarea className="auc-input sm:col-span-2" rows={2} placeholder={t.message} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <button type="button" className="btn-royal mt-5 w-full py-3.5 text-base" onClick={register} disabled={busy || !form.displayName.trim() || !form.country.trim() || !form.phone.trim()} data-testid="sale-bidder-submit">
                  {busy ? <Spinner /> : null} {t.registerBtn}
                </button>
              </div>
            ) : me.bidder.status === "pending" ? (
              <p className="rounded-2xl border border-gold-400/25 bg-gold-400/[0.08] p-4 text-sm leading-relaxed text-gold-100" data-testid="sale-auction-pending">⏳ {t.pending}</p>
            ) : me.bidder.status === "rejected" ? (
              <p className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-200">{t.rejected}</p>
            ) : (
              <div data-testid="sale-auction-bid">
                {me.leading ? <p className="mb-5 flex items-center gap-2 rounded-2xl border border-gold-400/30 bg-gradient-to-r from-gold-400/[0.16] to-transparent px-4 py-3 text-sm font-semibold text-gold-100"><span className="text-gold-300" aria-hidden="true">♛</span>{t.leading}</p>
                  : me.myBestUsd ? <p className="mb-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200">{fill(t.outbid, { amount: money(me.myBestUsd) })}</p> : null}
                {me.leading ? null : <>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-200/70">{t.yourBid}
                  <input className="auc-input auc-nums mt-2 font-display text-2xl font-semibold tracking-tight" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} data-testid="sale-bid-amount" />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[0, 1, 4].map((k) => {
                    const v = nextMin + k * (r?.stepUsd || 0);
                    return <button key={k} type="button" className={`auc-chip ${bidNum === v ? "auc-chip-on" : ""}`} onClick={() => setAmount(String(v))}>{money(v)}</button>;
                  })}
                </div>
                <button type="button" className="btn-royal mt-6 w-full py-4 text-base font-bold"
                  onClick={bid} disabled={busy || bidNum < nextMin} data-testid="sale-bid-submit">
                  {busy ? <><Spinner /> {t.bidding}</> : fill(t.bidBtn, { amount: money(bidNum || nextMin) })}
                </button>
                </>}
                <p className="mt-3 text-xs leading-relaxed text-slate-400">{t.binding}</p>
              </div>
            )}
            {msg ? <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${msg.ok ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" : "border-rose-400/25 bg-rose-500/10 text-rose-200"}`} data-testid="sale-auction-msg">{msg.text}</p> : null}

            {r && open ? (
              <div className="mt-8">
                <div className="mb-5 h-px bg-gradient-to-r from-transparent via-gold-400/30 to-transparent" aria-hidden="true" />
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-200/70">{t.rulesTitle}</h3>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
                  {(r.weeklyUsd > 0 ? [t.ruleRising, ...t.rules.slice(1)] : t.rules).map((x) => <li key={x} className="flex gap-3"><span className="mt-0.5 text-[10px] text-gold-400" aria-hidden="true">◆</span>{fill(x, { open: money(r.openUsd), step: money(r.stepUsd), weekly: money(r.weeklyUsd), min: r.snipeMinutes, days: r.payDays })}</li>)}
                  <li className="flex gap-3"><span className="mt-0.5 text-[10px] text-gold-400" aria-hidden="true">◆</span>{info.approval ? t.ruleApproval : t.ruleOpen}</li>
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
