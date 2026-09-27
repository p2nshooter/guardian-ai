/* /pricing — plans, full comparison, payment methods, FAQ (static). */
import Link from "next/link";
import type { Metadata } from "next";
import PricingTable from "@/components/site/PricingTable";
import Faq from "@/components/site/Faq";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, faqJsonLd, softwareJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { FAQ } from "@/lib/faq";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { CLOUD_APPS } from "@/lib/apps";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Pricing — plans from $19/month",
  description: "AXTO plans: Starter, Pro, Business and Enterprise. Unlimited AI on your own keys, Legal AI, Prompt Library, Clipper, Compliance Center, Security Analyst and self-hosted Docker & Windows editions.",
  path: "/pricing",
});

const yes = <span className="text-brand-600" aria-label="Included">✓</span>;
const no = <span className="text-slate-300" aria-label="Not included">—</span>;

export default function PricingPage() {
  const rows: [string, (id: (typeof PLAN_ORDER)[number]) => React.ReactNode][] = [
    ["AI usage with your own keys", () => "Unlimited"],
    ...CLOUD_APPS.map((a) => [a.name, (id: (typeof PLAN_ORDER)[number]) => PLANS[id].limits.apps.includes(a.slug)
      ? (a.slug === "legal" ? (PLANS[id].limits.legalWorkspaces === "all" ? "All 18 workspaces" : "6 core workspaces") : yes) : no] as [string, (id: (typeof PLAN_ORDER)[number]) => React.ReactNode]),
    ["Prompt levels", (id) => PLANS[id].limits.promptLevels.map((l) => l[0].toUpperCase() + l.slice(1)).join(", ")],
    ["Clipper videos / month", (id) => (PLANS[id].limits.clipperVideosPerMonth === -1 ? "Unlimited" : String(PLANS[id].limits.clipperVideosPerMonth))],
    ["Secure file storage", (id) => `${PLANS[id].limits.storageGB} GB`],
    ["Self-hosted apps (Docker & Windows)", (id) => (PLANS[id].limits.selfHostedApps === -1 ? "All 10" : PLANS[id].limits.selfHostedApps ? `Any ${PLANS[id].limits.selfHostedApps}` : no)],
    ["Servers per self-hosted app", (id) => (PLANS[id].limits.selfHostedNodes === -1 ? "Unlimited" : PLANS[id].limits.selfHostedNodes ? String(PLANS[id].limits.selfHostedNodes) : no)],
  ];
  return (
    <>
      <JsonLd data={[
        softwareJsonLd({ name: SITE.name, description: SITE.description, path: "/pricing", offers: PLAN_ORDER.flatMap((id) => [{ name: `${PLANS[id].name} monthly`, price: PLANS[id].monthly, period: "month" as const }, { name: `${PLANS[id].name} yearly`, price: PLANS[id].yearly, period: "year" as const }]) }),
        faqJsonLd(FAQ), breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]),
      ]} />
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50/60 to-white py-16 sm:py-20">
        <div className="container-page text-center">
          <p className="eyebrow">Pricing</p>
          <h1 className="h-display mx-auto mt-3 max-w-3xl">Simple plans. Unlimited AI on your own keys.</h1>
          <p className="lead mx-auto mt-5 max-w-2xl">Every plan includes the apps in your browser with no installation. Business and Enterprise add self-hosted editions for your own servers.</p>
        </div>
      </section>
      <section className="py-14"><div className="container-page"><PricingTable /></div></section>

      <section className="pb-16">
        <div className="container-page">
          <h2 className="text-2xl font-bold">Compare plans</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="table min-w-[720px]">
              <thead><tr><th className="w-[34%]">Feature</th>{PLAN_ORDER.map((id) => <th key={id}>{PLANS[id].name}</th>)}</tr></thead>
              <tbody>
                {rows.map(([label, cell]) => (
                  <tr key={label}><td className="font-medium text-slate-900">{label}</td>{PLAN_ORDER.map((id) => <td key={id}>{cell(id)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="card-pad"><div className="font-semibold">💳 Pay your way</div><p className="mt-1 text-sm text-slate-600">Card (Stripe), PayPal, Indonesian QRIS / virtual account / e-wallet (Xendit, Midtrans), crypto (NOWPayments) or bank transfer.</p></div>
            <div className="card-pad"><div className="font-semibold">🔁 Change anytime</div><p className="mt-1 text-sm text-slate-600">Upgrade or downgrade whenever you like — unused time is converted into extra days on the new plan.</p></div>
            <div className="card-pad"><div className="font-semibold">🏢 Lifetime & volume</div><p className="mt-1 text-sm text-slate-600">Perpetual offline licences for 1–100 devices and custom enterprise terms. <Link href="/contact">Talk to sales →</Link></p></div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-bold">Frequently asked questions</h2>
          <div className="mt-6"><Faq items={FAQ} /></div>
        </div>
      </section>
    </>
  );
}
