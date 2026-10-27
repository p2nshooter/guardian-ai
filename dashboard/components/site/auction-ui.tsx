/* Shared pieces of the licence auction UI (/auction, /app/auction, the
 * homepage winners): the copy in the reader's language, a live countdown and
 * the lot card. English renders statically; the other nine languages load on
 * demand. The countdown only changes numbers — no motion. */
"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n, formatMoney } from "@/lib/i18n";
import { LOCALE, type Lang } from "@/lib/i18n-shared";
import { AUC_EN, type AucCopy } from "@/lib/auction-copy";
import { AUCTION_TZ, AUCTION_TZ_LABEL } from "@/lib/auction-terms";

export interface Lot {
  id: string; cycle: string; title: string; kind: string; app: string; normalUsd: number; openUsd: number; stepUsd: number;
  startsAt: string; endsAt: string; status: string; bidsCount: number; highUsd: number; nextMinUsd: number; leader: string;
  winnerName: string; winnerUsd: number; paidAt: string;
}
export interface Winner { name: string; title: string; app: string; amountUsd: number; normalUsd: number; paid: boolean; paidAt: string; closedAt: string; cycle: string }
export interface Board {
  enabled: boolean; openPct: number; stepPct: number; snipeMinutes: number; payHours: number;
  cycle: string; cycleEnd: string; cycleStart: string; nextCycleEnd: string; lots: Lot[]; upcoming: number; last: Lot[]; winners: Winner[];
}

export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));

let dictCache: Partial<Record<Lang, AucCopy>> | null = null;
export function useAucCopy(): { t: AucCopy; lang: Lang; money: (n: number) => string; when: (iso: string) => string; pctOf: (n: number) => string } {
  const { lang } = useI18n();
  const [dict, setDict] = useState(dictCache);
  useEffect(() => {
    if (lang === "en" || dict) return;
    import("@/lib/i18n-pages/auction").then((m) => { dictCache = m.AUC; setDict(m.AUC); }).catch(() => {});
  }, [lang, dict]);
  const locale = LOCALE[lang] || "en-US";
  return {
    t: lang === "en" ? AUC_EN : dict?.[lang] || AUC_EN,
    lang,
    money: (n: number) => formatMoney(n, "USD", lang),
    // The owner's clock: every auction ends Friday 07:00 WIB (Asia/Jakarta, UTC+7).
    when: (iso: string) => (iso ? `${new Date(iso).toLocaleString(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: AUCTION_TZ })} ${AUCTION_TZ_LABEL}` : ""),
    pctOf: (n: number) => `${Math.round(n).toLocaleString(locale)} %`,
  };
}

/** Milliseconds now, refreshed every second while mounted (0 on the server, so the first render matches). */
export function useNow(): number {
  const [t, setT] = useState(0);
  useEffect(() => { setT(Date.now()); const iv = setInterval(() => setT(Date.now()), 1000); return () => clearInterval(iv); }, []);
  return t;
}

export function Countdown({ to, dark = false, testid }: { to: string; dark?: boolean; testid?: string }) {
  const { t } = useAucCopy();
  const now = useNow();
  const left = Math.max(0, Date.parse(to) - (now || Date.parse(to)));
  const parts: [number, string][] = [
    [Math.floor(left / 86_400_000), t.units.d], [Math.floor(left / 3_600_000) % 24, t.units.h],
    [Math.floor(left / 60_000) % 60, t.units.m], [Math.floor(left / 1000) % 60, t.units.s],
  ];
  return (
    <span className="inline-flex gap-1.5 tabular-nums" data-testid={testid} aria-live="off">
      {parts.map(([n, u], i) => (
        <span key={i} className={`rounded-lg px-2 py-1 text-center font-extrabold ${dark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900"}`}>
          {now ? String(n).padStart(i ? 2 : 1, "0") : "–"}<span className={`ml-0.5 text-[11px] font-semibold ${dark ? "text-slate-300" : "text-slate-500"}`}>{u}</span>
        </span>
      ))}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-800 ring-emerald-200", awaiting_payment: "bg-amber-50 text-amber-800 ring-amber-200",
  sold: "bg-brand-50 text-brand-800 ring-brand-200", unsold: "bg-slate-100 text-slate-600 ring-slate-200", cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

/** One lot: package, prices, bids, the end — and an action area (sign-in link, bid form, …). */
export function LotCard({ lot, children, highlight }: { lot: Lot; children?: ReactNode; highlight?: string }) {
  const { t, money, when, pctOf } = useAucCopy();
  const open = lot.status === "open";
  const price = lot.bidsCount ? lot.highUsd : lot.openUsd;
  const off = lot.normalUsd ? (1 - price / lot.normalUsd) * 100 : 0;
  const state = lot.status === "sold" ? fill(t.lot.sold, { name: lot.winnerName || "—" })
    : lot.status === "awaiting_payment" ? fill(t.lot.awaiting, { name: lot.winnerName || "—" }) : lot.status === "unsold" ? t.lot.unsold : lot.status === "cancelled" ? t.lot.cancelled : "";
  return (
    <article className={`auc-card group relative flex flex-col rounded-3xl border bg-white p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-lift ${highlight ? "border-brand-400 ring-1 ring-brand-400" : "border-slate-200"}`} data-testid="auction-lot" data-lot={lot.id}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{lot.kind === "lifetime" ? t.kinds.lifetime : t.kinds.edition}</span>
        {state ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${STATUS_TONE[lot.status] || STATUS_TONE.unsold}`}>{state}</span> : null}
      </div>
      <h3 className="mt-2 text-base font-extrabold leading-snug text-slate-900">{lot.title}</h3>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-slate-500">{t.lot.normal}</dt><dd className="font-semibold text-slate-500 line-through decoration-slate-300">{money(lot.normalUsd)}</dd></div>
        <div className="text-right"><dt className="text-xs text-slate-500">{lot.bidsCount ? t.lot.current : t.lot.opening}</dt>
          <dd className="text-xl font-black text-slate-900" data-testid="auction-price">{money(lot.winnerUsd || price)}</dd></div>
      </dl>
      {open ? <p className="mt-1 text-right text-xs font-semibold text-emerald-700">{fill(t.lot.save, { pct: pctOf(off) })}</p> : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span>{lot.bidsCount ? fill(t.lot.bids, { n: lot.bidsCount }) : t.lot.noBids}{lot.leader && open ? ` · ${fill(t.lot.leader, { name: lot.leader })}` : ""}</span>
        {open ? <span>{t.lot.nextMin}: <b className="text-slate-900" data-testid="auction-next-min">{money(lot.nextMinUsd)}</b></span> : null}
      </div>
      {open ? <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{fill(t.endsAt, { date: when(lot.endsAt) })}</span><Countdown to={lot.endsAt} /></div> : null}
      {children ? <div className="mt-4 border-t border-slate-100 pt-4">{children}</div> : null}
    </article>
  );
}

/** The app a lot is for, as its title names it ("Guardian AI — …" → "Guardian AI"). */
export const appLabel = (l: { title: string }) => l.title.split(" — ")[0] || l.title;

/** Filter chips for a long list of lots: edition or lifetime, and the app. */
export function useLotFilter<L extends Lot>(lots: L[]) {
  const [kind, setKind] = useState<"" | "edition" | "lifetime">("");
  const [app, setApp] = useState("");
  const apps = Array.from(new Map(lots.map((l) => [l.app, appLabel(l)])).entries()).sort((a, b) => a[1].localeCompare(b[1]));
  const shown = lots.filter((l) => (!kind || l.kind === kind) && (!app || l.app === app));
  return { shown, kind, setKind, app, setApp, apps };
}

export function LotFilters({ f, total }: { f: ReturnType<typeof useLotFilter<any>>; total: number }) {
  const { t } = useAucCopy();
  const chip = (on: boolean) => `rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${on ? "bg-ink-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" data-testid="auction-filters">
      {([["", t.all], ["edition", t.kinds.edition], ["lifetime", t.kinds.lifetime]] as const).map(([k, label]) => (
        <button key={k || "all"} type="button" className={chip(f.kind === k)} aria-pressed={f.kind === k} onClick={() => f.setKind(k)}>{label}</button>
      ))}
      <select className="select ml-auto w-auto min-w-[12rem]" value={f.app} onChange={(e) => f.setApp(e.target.value)} aria-label="App" data-testid="auction-app-filter">
        <option value="">{t.all} ({total})</option>
        {f.apps.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
      </select>
    </div>
  );
}

/** Recent winners with the name each chose — homepage, /auction, the member portal and its home. */
export function WinnersList({ winners, limit = 12, compact = false }: { winners: Winner[]; limit?: number; compact?: boolean }) {
  const { t, money } = useAucCopy();
  if (!winners.length) return <p className={`rounded-2xl border border-dashed border-slate-300 bg-white ${compact ? "p-4" : "p-6"} text-sm text-slate-500`}>{t.noWinners}</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white" data-testid="auction-winners">
      {winners.slice(0, limit).map((w, i) => (
        <li key={`${w.cycle}-${w.title}-${i}`} className={`flex flex-wrap items-baseline justify-between gap-2 ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
          <span><b className="text-slate-900">🏆 {w.name}</b><span className="block text-sm text-slate-600">{w.title}</span></span>
          <span className="text-right text-sm font-semibold text-slate-900">{fill(t.paidFor, { amount: money(w.amountUsd), normal: money(w.normalUsd) })}
            <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${w.paid ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"}`} data-testid={w.paid ? "winner-paid" : "winner-unpaid"}>{w.paid ? t.paid : t.unpaid}</span></span>
        </li>
      ))}
    </ul>
  );
}
