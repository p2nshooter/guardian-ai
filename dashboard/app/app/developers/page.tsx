/* ==============================================================================
 * AXTO — Developers (AXTO Connect) in the member portal: API keys, webhooks,
 * a live event console and a WebRTC test, plus quick-start code for every
 * transport. Everything here uses the member's session; external apps use
 * the keys created on this page.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n, pick } from "@/lib/i18n";
import { LOCALE } from "@/lib/i18n-shared";
import { api } from "@/lib/client";
import { Alert, LoadingBlock } from "@/components/ui";
import { DEV } from "@/lib/i18n-pages/developers";
import type { Overview as OverviewData } from "@/components/developers/shared";
import Overview from "@/components/developers/Overview";
import Keys from "@/components/developers/Keys";
import Webhooks from "@/components/developers/Webhooks";
import Console from "@/components/developers/Console";
import RtcTest from "@/components/developers/RtcTest";

const TABS = ["overview", "keys", "webhooks", "console", "rtc"] as const;
type Tab = (typeof TABS)[number];
const ICON: Record<Tab, string> = { overview: "🧭", keys: "🔑", webhooks: "🪝", console: "📡", rtc: "🎥" };

export default function DevelopersPage() {
  const { lang } = useI18n();
  const t = pick(DEV, lang);
  const [data, setData] = useState<OverviewData | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [base, setBase] = useState("https://axto.io");

  const reload = useCallback(async () => {
    const r = await api<OverviewData>("/api/connect");
    if (r.ok) setData(r.data); else setErr(r.error);
  }, []);
  useEffect(() => {
    setBase(window.location.origin);
    const q = new URLSearchParams(window.location.search).get("tab");
    if (q && (TABS as readonly string[]).includes(q)) setTab(q as Tab);
    reload();
  }, [reload]);
  function go(next: Tab) {
    setTab(next);
    const u = new URL(window.location.href);
    if (next === "overview") u.searchParams.delete("tab"); else u.searchParams.set("tab", next);
    window.history.replaceState(null, "", u.toString());
  }

  if (err) return <Alert tone="error">{err}</Alert>;
  if (!data) return <LoadingBlock />;
  const noPlan = data.limits.apiKeys <= 0;

  return (
    <div data-testid="developers">
      <div className="mb-5">
        <div className="eyebrow mb-1">⚡ AXTO Connect</div>
        <h1 className="text-2xl font-bold sm:text-[28px]">{t.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.sub}</p>
      </div>
      {!data.enabled ? <div className="mb-4"><Alert tone="warn">{t.off}</Alert></div> : null}
      {noPlan ? (
        <div className="mb-4"><Alert tone="info">{t.needPlan} <Link href="/app/billing?plan=starter" className="ml-2 font-semibold underline">{t.upgrade}</Link></Alert></div>
      ) : null}
      <nav className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={t.title}>
        <div className="inline-flex min-w-full gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:min-w-0" role="tablist">
          {TABS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => go(k)} data-testid={`dev-tab-${k}`}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${tab === k ? "bg-ink-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              <span aria-hidden="true">{ICON[k]}</span>{t.tabs[k]}
            </button>
          ))}
        </div>
      </nav>
      {tab === "overview" ? <Overview t={t} base={base} limits={data.limits} usage={data.usage} retentionDays={data.retentionDays} /> : null}
      {tab === "keys" ? <Keys t={t} locale={LOCALE[lang]} keys={data.keys} max={data.limits.apiKeys} reload={reload} /> : null}
      {tab === "webhooks" ? <Webhooks t={t} locale={LOCALE[lang]} hooks={data.webhooks} max={data.limits.webhooks} reload={reload} /> : null}
      {tab === "console" ? (noPlan ? null : <Console t={t} />) : null}
      {tab === "rtc" ? (noPlan ? null : <RtcTest t={t} />) : null}
    </div>
  );
}
