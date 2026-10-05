/* Friday deal banner for lifetime licences (docs/AXTO-APPS-BLUEPRINT.md §15) —
 * public /pricing and /app/lifetime. On a deal day: "−30 % / −50 % today" with a
 * live countdown to midnight in the owner's time zone; on other days: when the
 * next deal starts and how big it is. The struck list price next to a deal price
 * is real (it is the price on every other day); nothing here invents scarcity.
 * The countdown follows the server's clock, not the visitor's. */
"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n, formatMoney } from "@/lib/i18n";
import { LTD } from "@/lib/i18n-pages/lifetimedeals";
import type { DealState } from "@/lib/lifetime-deals";
import type { DealRules } from "@/lib/lifetime-pricing";

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/** Milliseconds left until `target`, ticking every second, corrected by the server clock. */
function useLeft(target: string | null, serverNow: string, onDone?: () => void) {
  const skew = useRef(0);
  const fired = useRef("");
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => { skew.current = Date.parse(serverNow) - Date.now(); }, [serverNow]);
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const left = target ? Math.max(0, Date.parse(target) - (tick + skew.current)) : 0;
  useEffect(() => {
    if (target && left === 0 && fired.current !== target) { fired.current = target; onDone?.(); }
  }, [target, left, onDone]);
  return left;
}

function Countdown({ ms, label }: { ms: number; label: string }) {
  const { lang } = useI18n();
  const t = LTD[lang].deal;
  const s = Math.floor(ms / 1000);
  const parts: [number, string][] = [[Math.floor(s / 86400), t.d], [Math.floor((s % 86400) / 3600), t.h], [Math.floor((s % 3600) / 60), t.m], [s % 60, t.s]];
  const shown = parts[0][0] > 0 ? parts : parts.slice(1);
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end" role="timer" aria-live="off" data-testid="deal-countdown">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-200/80">{label}</span>
      <div className="flex gap-1.5" dir="ltr">
        {shown.map(([n, u]) => (
          <span key={u} className="min-w-[3.25rem] rounded-xl border border-white/10 bg-white/[0.06] px-2 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur">
            <span className="block font-display text-xl font-bold tabular-nums text-white">{String(n).padStart(2, "0")}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{u}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function DealBanner({ deal, rules, onExpire }: { deal: DealState; rules: DealRules; onExpire?: () => void }) {
  const { lang } = useI18n();
  const t = LTD[lang].deal;
  const a = deal.active, n = deal.next;
  const left = useLeft(a ? a.endsAt : n ? n.startsAt : null, deal.now, onExpire);
  if (!rules.enabled || (!a && !n)) return null;
  const tz = rules.tz.replace(/_/g, " ");
  const day = a ? new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long", timeZone: rules.tz }).format(new Date(a.startsAt)) : "";

  if (a) {
    return (
      <div className="palace palace-rise rounded-2xl border border-gold-400/30 p-5 shadow-[0_20px_60px_-25px_rgba(201,162,74,.55)] sm:p-6" data-testid="deal-banner" data-deal={a.kind}>
        <div className="palace-sky opacity-80" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="eyebrow-palace">✦ {a.kind === "lastFriday" ? t.badgeLast : t.badgeFriday}</span>
            <h3 className="mt-3 font-display text-2xl font-bold sm:text-3xl"><span className="gold-text is-live">{fill(t.activeTitle, { pct: a.pct })}</span></h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{fill(t.activeLead, { day, tz })}</p>
          </div>
          <Countdown ms={left} label={t.endsIn} />
        </div>
        <p className="relative mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">{t.honest}</p>
      </div>
    );
  }
  return (
    <div className="palace rounded-2xl border border-white/10 p-5 sm:p-6" data-testid="deal-banner" data-deal="next">
      <div className="palace-sky opacity-50" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="eyebrow-palace">✦ {n!.kind === "lastFriday" ? t.badgeLast : t.badgeFriday}</span>
          <h3 className="mt-3 font-display text-xl font-bold text-white sm:text-2xl">{fill(t.nextTitle, { pct: n!.pct })}</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{fill(t.nextLead, { fri: rules.fridayPct, last: rules.lastFridayPct, tz })}</p>
        </div>
        <Countdown ms={left} label={t.startsIn} />
      </div>
    </div>
  );
}

/** A tier price: the deal price with the real list price struck through, or just the list price. */
export function DealPrice({ list, price, pct, big }: { list: number; price: number; pct: number; big?: boolean }) {
  const { lang } = useI18n();
  const t = LTD[lang].deal;
  if (!pct || price >= list) return <span className={big ? "text-lg font-extrabold text-slate-900" : ""}>{formatMoney(list, "USD", lang)}</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={big ? "text-lg font-extrabold text-slate-900" : "font-semibold text-slate-900"}>{formatMoney(price, "USD", lang)}</span>
      <s className="text-xs text-slate-400" aria-label={`${t.list} ${formatMoney(list, "USD", lang)}`}>{formatMoney(list, "USD", lang)}</s>
      <span className="badge-gold">{fill(t.off, { pct })}</span>
    </span>
  );
}
