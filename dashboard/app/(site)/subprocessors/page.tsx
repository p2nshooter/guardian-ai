/* /subprocessors — third parties that process personal data for the AXTO
 * cloud apps, what for and where. Static, indexable. */
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({ title: "Sub-processors", description: `The third parties that help ${SITE.name} run the cloud apps — what they do, what data they touch and where.`, path: "/subprocessors", keywords: ["AXTO sub-processors", "GDPR sub-processors", "data processing"] });

const ROWS: { name: string; purpose: string; data: string; where: string; when: string }[] = [
  { name: "Cloudflare, Inc.", purpose: "Hosting, database (D1), encrypted file storage (R2), caching and network security", data: "Account data, encrypted saved work, operational logs", where: "Global edge network", when: "Always" },
  { name: "Resend, Inc.", purpose: "Transactional e-mail (sign-in, receipts, reminders, support replies)", data: "E-mail address, name, message content", where: "United States", when: "Always" },
  { name: "Stripe, Inc.", purpose: "Card payments", data: "Name, e-mail, payment details (held by Stripe)", where: "United States / global", when: "Only if you pay by card" },
  { name: "PayPal Holdings, Inc.", purpose: "PayPal payments", data: "Name, e-mail, payment details (held by PayPal)", where: "Global", when: "Only if you pay with PayPal" },
  { name: "PT Xendit Teknologi Indonesia", purpose: "Indonesian payments (QRIS, virtual account, e-wallet)", data: "Name, e-mail, payment details", where: "Indonesia", when: "Only if you pay with Xendit" },
  { name: "PT Midtrans", purpose: "Indonesian payments", data: "Name, e-mail, payment details", where: "Indonesia", when: "Only if you pay with Midtrans" },
  { name: "NOWPayments", purpose: "Crypto payments", data: "Order reference, amount, wallet transaction", where: "Global", when: "Only if you pay with NOWPayments" },
];

export default function SubprocessorsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Sub-processors", path: "/subprocessors" }])} />
      <article className="py-14">
        <div className="container-page max-w-5xl">
          <nav className="text-sm text-slate-500" aria-label="Breadcrumb"><Link href="/">Home</Link> / <span>Sub-processors</span></nav>
          <h1 className="h-display mt-4">Sub-processors</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: September 2026</p>
          <p className="lead mt-5 max-w-3xl">These companies process personal data so we can run the {SITE.name} cloud apps. Each only receives what its task needs. Payment providers are used only when you choose them at checkout.</p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="table min-w-[760px]">
              <thead><tr><th>Sub-processor</th><th>Purpose</th><th>Data</th><th>Location</th><th>Used</th></tr></thead>
              <tbody>{ROWS.map((r) => <tr key={r.name}><td className="font-medium text-slate-900">{r.name}</td><td>{r.purpose}</td><td>{r.data}</td><td>{r.where}</td><td>{r.when}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="card-pad"><div className="font-semibold">🔑 Your AI provider is yours</div><p className="mt-1 text-sm text-slate-600">Apps run on your own AI key (BYOX). Requests go straight to the provider you chose — Anthropic, OpenAI, Google, Groq, your own server… — under your agreement with them. They are not our sub-processors, and we send your content to no other AI provider.</p></div>
            <div className="card-pad"><div className="font-semibold">🖥️ Self-hosted means none of these</div><p className="mt-1 text-sm text-slate-600">Self-hosted editions keep all data on your infrastructure; with a Lifetime licence they never contact axto.io at all.</p></div>
          </div>
          <p className="mt-8 text-sm text-slate-500">We update this page before adding or replacing a sub-processor. Questions or objections: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. See also the <Link href="/dpa">DPA</Link>.</p>
        </div>
      </article>
    </>
  );
}
