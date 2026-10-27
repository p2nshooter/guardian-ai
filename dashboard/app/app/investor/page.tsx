/* Member: Investment — the member's stake in the AXTO investor round, if the
 * owner has verified one under their e-mail: their share of every paid AXTO
 * order, and month by month the revenue, their share, what has been paid and
 * what is still open. Amounts and months only. In all 10 languages
 * (lib/i18n-pages/invest.ts). */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useI18n, formatDate, formatMoney } from "@/lib/i18n";
import { LOCALE, type Lang } from "@/lib/i18n-shared";
import { Alert, EmptyState, LoadingBlock, PageHeader, Section } from "@/components/ui";
import { INV_EN, type InvCopy } from "@/lib/invest-copy";
import { pct, type Statement } from "@/lib/invest-terms";

interface Stake { id: string; status: "verified" | "returned"; capitalUsd: number; verifiedAt: string; returnedAt: string; statement: Statement }
interface Data { email: string; offer: { poolPct: number; targetUsd: number; status: string; visible: boolean }; stakes: Stake[] }

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

export default function InvestorPage() {
  const { lang } = useI18n();
  const [dict, setDict] = useState<Partial<Record<Lang, InvCopy>> | null>(null);
  useEffect(() => {
    if (lang === "en" || dict) return;
    import("@/lib/i18n-pages/invest").then((m) => setDict(m.INV)).catch(() => {});
  }, [lang, dict]);
  const t = (lang === "en" ? INV_EN : dict?.[lang] || INV_EN).me;
  const locale = LOCALE[lang] || "en-US";
  const money = (n: number) => formatMoney(n, "USD", lang);
  const monthName = (p: string) => new Date(`${p}-01T00:00:00Z`).toLocaleDateString(locale, { year: "numeric", month: "long", timeZone: "UTC" });

  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<Data>("/api/account/investor").then((r) => (r.ok ? setD(r.data) : setError(r.error))); }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!d) return <LoadingBlock />;
  const vars = { pool: `${d.offer.poolPct.toLocaleString(locale)} %`, target: money(d.offer.targetUsd) };

  return (
    <>
      <PageHeader eyebrow="AXTO" title={t.title} description={fill(t.lead, vars)} />
      {!d.stakes.length ? (
        <EmptyState icon="📈" title={t.none} action={d.offer.visible ? <Link href="/invest" className="btn-primary">{t.apply}</Link> : undefined}>
          <span data-testid="investor-none">{fill(t.noneB, { email: d.email })}</span>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {d.stakes.map((s) => {
            const st = s.statement;
            return (
              <Section key={s.id} title={money(s.capitalUsd)}
                description={`${fill(t.verified, { date: formatDate(s.verifiedAt, lang) })}${s.returnedAt ? ` · ${fill(t.returned, { date: formatDate(s.returnedAt, lang) })}` : ""}`}>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="investor-stake">
                  {([
                    [t.share, pct(st.share, locale)],
                    [t.revenue, money(st.totalRevenueUsd)],
                    [t.earnedPaid, `${money(st.totalDueUsd)} / ${money(st.totalPaidUsd)}`],
                    [t.open, money(st.balanceUsd)],
                  ] as [string, string][]).map(([k, v], i) => (
                    <div key={k} className={`rounded-xl border p-4 ${i === 3 && st.balanceUsd > 0 ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200"}`}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
                      <dd className="mt-1 text-xl font-extrabold text-slate-900">{v}</dd>
                    </div>
                  ))}
                </dl>
                {!st.months.length ? <p className="mt-4 text-sm text-slate-500">{t.empty}</p> : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="table min-w-[520px]" data-testid="investor-months">
                      <thead><tr><th>{t.month}</th><th className="text-right">{t.rev}</th><th className="text-right">{t.yours}</th><th className="text-right">{t.paid}</th></tr></thead>
                      <tbody>
                        {[...st.months].reverse().map((m) => (
                          <tr key={m.period}><td>{monthName(m.period)}</td><td className="text-right">{money(m.revenueUsd)}</td><td className="text-right font-semibold">{money(m.dueUsd)}</td><td className="text-right">{money(m.paidUsd)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            );
          })}
          <p className="text-xs text-slate-500">{t.foot}</p>
        </div>
      )}
    </>
  );
}
