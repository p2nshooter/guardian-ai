/* /pricing — plans, full comparison, payment methods, FAQ (static). */
import Link from "next/link";
import type { Metadata } from "next";
import PricingTable from "@/components/site/PricingTable";
import LifetimePricing from "@/components/site/LifetimePricing";
import Faq from "@/components/site/Faq";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, faqJsonLd, softwareJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { FAQ } from "@/lib/faq";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { SITE } from "@/lib/site";
import PlanMatrix from "@/components/plans/PlanMatrix";
import { PM } from "@/lib/i18n-pages/planmatrix";

export const metadata: Metadata = pageMeta({
  title: "Pricing — plans from $19/month",
  description: "AXTO plans: Starter, Pro, Business and Enterprise. Unlimited AI on your own keys, Legal AI, Prompt Library, Clipper, Compliance Center, Security Analyst, Privacy Vault and self-hosted Docker editions.",
  path: "/pricing",
});

export default function PricingPage() {
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
          <PlanMatrix t={PM.en} />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="card-pad"><div className="font-semibold">💳 Pay your way</div><p className="mt-1 text-sm text-slate-600">PayPal, credit / debit card (Visa, Mastercard, JCB, Amex), Indonesian QRIS / virtual account / e-wallet (Xendit, Midtrans), crypto (NOWPayments or direct wallets) or bank transfer to BNI in rupiah, US dollars or euros.</p></div>
            <div className="card-pad"><div className="font-semibold">🔁 Change anytime</div><p className="mt-1 text-sm text-slate-600">Upgrade or downgrade whenever you like — unused time is converted into extra days on the new plan.</p></div>
            <div className="card-pad"><div className="font-semibold">🏢 Lifetime & volume</div><p className="mt-1 text-sm text-slate-600">Perpetual offline licences for 1–100 devices and custom enterprise terms. <Link href="#lifetime">See lifetime prices →</Link></p></div>
          </div>
        </div>
      </section>

      <section id="lifetime" className="border-t border-slate-200 py-16">
        <div className="container-page">
          <p className="eyebrow">Self-hosted · offline</p>
          <h2 className="mt-2 text-2xl font-bold">Lifetime licences</h2>
          <p className="mt-2 max-w-3xl text-slate-600">Buy a self-hosted app once and run it forever — fully offline, air-gapped if you like. Each device is activated with a signed file that the app checks locally, so it never needs to reach axto.io.</p>
          <div className="mt-6"><LifetimePricing /></div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-bold">Frequently asked questions</h2>
          <div className="mt-6"><Faq items={FAQ} i18nPrefix="faq" /></div>
        </div>
      </section>
    </>
  );
}
