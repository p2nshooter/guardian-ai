/* Public contact page — the form lands in Admin → Support; live chat is one click away. */
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import ContactForm from "@/components/support/ContactForm";
import { SITE } from "@/lib/site";

export const metadata = pageMeta({
  title: "Contact sales & support",
  description: `Talk to the ${SITE.name} team: offers and quotations, lifetime licences, enterprise contracts, crypto or bank-transfer payments, and technical support.`,
  path: "/contact",
});

const WAYS = [
  { icon: "💬", title: "Live chat", body: "Bottom-right on every page. Our team answers live when online; the AXTO Assistant helps any time." },
  { icon: "🧾", title: "Offers & lifetime licences", body: "Choose “Request an offer” or “Lifetime licence” — we reply with a written proposal." },
  { icon: "💱", title: "Crypto & bank transfer", body: "USDT, BTC, ETH or BNI / wire transfer — confirmed by our team within one business day." },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }])} />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:py-20">
        <div>
          <div className="eyebrow">Contact</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Talk to the {SITE.name} team</h1>
          <p className="mt-4 text-lg text-slate-600">Offers, lifetime licences, enterprise contracts, payments or technical questions — pick a topic and we'll route it to the right person.</p>
          <ul className="mt-8 space-y-5">
            {WAYS.map((w) => (
              <li key={w.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl ring-1 ring-brand-100" aria-hidden="true">{w.icon}</span>
                <div><div className="font-semibold text-slate-900">{w.title}</div><p className="mt-0.5 text-sm text-slate-600">{w.body}</p></div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-slate-500">Prefer e-mail? <a href={`mailto:${SITE.email}`} className="font-medium text-brand-700">{SITE.email}</a></p>
        </div>
        <ContactForm />
      </section>
    </>
  );
}
