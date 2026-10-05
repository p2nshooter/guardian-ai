/* Lifetime (offline) licence price table — server-rendered with the default
 * prices (SEO), then refreshed with the admin's live prices and today's Friday
 * deal (every Friday −30 %, the last Friday of the month −50 %; see
 * docs/AXTO-APPS-BLUEPRINT.md §15). Members can also propose their own price. */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LTD } from "@/lib/i18n-pages/lifetimedeals";
import { LIFETIME_TIERS } from "@/lib/lifetime";
import type { DealPayload, DealTier } from "@/lib/lifetime-pricing";
import DealBanner, { DealPrice } from "@/components/lifetime/DealBanner";

const DEFAULTS: DealTier[] = LIFETIME_TIERS.map((t) => ({ ...t, appDeal: t.app, suiteDeal: t.suite }));

export default function LifetimePricing() {
  const { t: tr, lang } = useI18n();
  const t = LTD[lang];
  const [d, setD] = useState<DealPayload | null>(null);
  const load = useCallback(() => {
    fetch("/api/lifetime/deal", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (Array.isArray(j?.tiers)) setD(j); }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  const tiers = d?.tiers || DEFAULTS;
  const pct = d?.deal.active?.pct || 0;
  return (
    <div className="space-y-6">
      {d ? <DealBanner deal={d.deal} rules={d.rules} onExpire={load} /> : null}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="table min-w-[520px]">
            <thead><tr><th>{t.pub.devicesCol}</th><th>{tr("lt.scopeApp")}</th><th>{tr("lt.scopeSuite")}</th></tr></thead>
            <tbody>{tiers.map((x) => (
              <tr key={x.devices}>
                <td className="font-medium text-slate-900">{x.devices === 1 ? t.pub.oneDevice : t.pub.upTo.replace("{n}", String(x.devices))}</td>
                <td><DealPrice list={x.app} price={x.appDeal} pct={pct} /></td>
                <td><DealPrice list={x.suite} price={x.suiteDeal} pct={pct} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="card-pad">
          <div className="font-semibold text-slate-900">{t.pub.forever}</div>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            {(["lt.inc1", "lt.inc2", "lt.inc3", "lt.inc4", "lt.inc5"] as const).map((k) => <li key={k} className="flex gap-2"><span className="text-brand-600">✓</span>{tr(k)}</li>)}
          </ul>
          {d?.offersEnabled !== false ? <p className="mt-4 rounded-lg bg-gold-50 px-3 py-2 text-sm text-gold-700 ring-1 ring-inset ring-gold-200">💬 {t.pub.offerHint}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/register?redirect=/app/lifetime" className="btn-primary">{t.pub.buy}</Link>
            <Link href="/contact" className="btn-secondary">{t.pub.quote}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
