/* Member: Managed AI (AXTO-provided models). LOCKED until the admin unlocks it
 * in Admin → Managed AI — this page explains what it is, shows the planned
 * plans, and sends members to their own keys (BYOX), which work today. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n, formatMoney } from "@/lib/i18n";
import { api } from "@/lib/client";
import { LoadingBlock, PageHeader, Section } from "@/components/ui";
import { openSupport } from "@/components/support/ChatWidget";

interface Status { enabled: boolean; plans: { id: string; name: string; monthly: number; creditsPerMonth: number; blurb: string }[] }

export default function ManagedPage() {
  const { t, lang } = useI18n();
  const [s, setS] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { api<Status>("/api/managed/status").then((r) => (r.ok ? setS(r.data) : setFailed(true))); }, []);
  if (failed) return <div className="alert-error">⛔ {t("common.error")}</div>;
  if (!s) return <LoadingBlock />;

  return (
    <>
      <PageHeader eyebrow={s.enabled ? undefined : <span className="badge-gray">🔒 {t("common.comingSoon")}</span>}
        title={t("managed.title")} description={s.enabled ? t("managed.enabledSub") : t("managed.lockedSub")} />

      {!s.enabled ? (
        <section className="card-pad mb-6 flex flex-col gap-3 border-brand-200 bg-brand-50/40 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="font-semibold text-slate-900">🔑 {t("managed.useOwn")}</div>
            <div className="text-sm text-slate-600">{t("managed.useOwnSub")}</div>
          </div>
          <Link href="/app/settings?tab=ai" className="btn-primary">{t("keys.add")} →</Link>
        </section>
      ) : null}

      <Section title={s.enabled ? t("managed.enabledTitle") : t("managed.plansTitle")}>
        <div className="grid gap-3 md:grid-cols-3">
          {s.plans.map((p) => (
            <article key={p.id} className="rounded-xl border border-slate-200 p-4">
              <div className="font-semibold text-slate-900">{p.name}</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">{formatMoney(p.monthly, "USD", lang)}<span className="text-sm font-medium text-slate-500">{t("price.perMonth")}</span></div>
              <div className="mt-1 text-sm text-slate-600">{t("managed.credits", { n: p.creditsPerMonth.toLocaleString() })}</div>
              <p className="mt-2 text-sm text-slate-600">{p.blurb}</p>
              {s.enabled ? <button className="btn-primary btn-sm mt-3" onClick={() => openSupport("quote")}>{t("managed.contact")}</button> : null}
            </article>
          ))}
        </div>
      </Section>

      <div className="mt-6">
        <Section title={t("managed.how")}>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>☁️ {t("managed.how1")}</li>
            <li>🎟️ {t("managed.how2")}</li>
            <li>🧱 {t("managed.how3")}</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
