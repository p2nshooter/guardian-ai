/* /help — guides & help hub. Getting-started steps, a per-app guide index
 * (links to each app page's how-to) and an FAQ. Static + indexable. */
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { CLOUD_APPS } from "@/lib/apps";
import { pageMeta, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Guides & help — getting started with AXTO",
  description: "How to get started with AXTO: connect your own AI key (BYOX), pick a plan, and use Legal AI, the Prompt Library, AI Chat, Clipper, Privacy Vault, Compliance Center and Security Analyst.",
  path: "/help",
  keywords: ["AXTO help", "AXTO guides", "how to use AXTO", "BYOK setup", "getting started"],
});

const STEPS = [
  { t: "Create your account", d: "Sign up free — Basic prompts and the essentials are included on every account." },
  { t: "Connect your own AI key", d: "In Settings → My AI keys, add a key from any provider (Claude, GPT, Gemini, Groq, DeepSeek…) or your own endpoint. AXTO runs on your key — no per-token fees." },
  { t: "Pick a plan", d: "Upgrade when you need more apps, higher prompt levels or self-hosted editions. Compare on the pricing page." },
  { t: "Start working", d: "Open any app, and your work saves automatically to your encrypted history — browse, rename, duplicate, export or delete it anytime." },
];

const FAQ = [
  { q: "Do I need my own AI key?", a: "Yes — AXTO is bring-your-own-key (BYOX). You connect a key from any major provider or your own endpoint, so you control cost and your data never trains anyone else's model. Several providers (Google, Groq, Cerebras) offer free tiers." },
  { q: "Is my data private?", a: "Your work is encrypted per member at rest, and requests run on your own AI key. Privacy Vault even redacts personal data entirely in your browser before anything is sent." },
  { q: "Can I run AXTO on my own servers?", a: "Yes. Ten self-hosted Docker editions run on your own infrastructure — cloud, on-prem or air-gapped — with a lifetime licence. See the Self-hosted page." },
  { q: "Which languages are supported?", a: "The interface is available in 10 languages: English, German, French, Japanese, Chinese, Hindi, Indonesian, Arabic, Malay and Italian. Your choice is remembered across pages and sessions." },
  { q: "How do I get support?", a: `Use the chat widget on any page, or email ${SITE.supportEmail}. Paid plans get priority support.` },
];

export default function HelpPage() {
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Guides & help", path: "/help" }]), faqJsonLd(FAQ)]} />
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50/60 to-white py-14">
        <div className="container-page">
          <span className="badge-brand">Guides & help</span>
          <h1 className="h-display mt-4 max-w-3xl">Get started with AXTO</h1>
          <p className="lead mt-4 max-w-3xl">Everything you need to go from sign-up to shipping — on your own AI keys.</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page">
          <h2 className="text-2xl font-bold">Quick start</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={i} className="card-pad flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                <div><div className="font-semibold text-slate-900">{s.t}</div><p className="mt-1 text-sm text-slate-600">{s.d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-14">
        <div className="container-page">
          <h2 className="text-2xl font-bold">App guides</h2>
          <p className="mt-1 text-sm text-slate-600">Step-by-step how-to for every app.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CLOUD_APPS.map((a) => (
              <Link key={a.slug} href={`/apps/${a.slug}`} className="card-pad flex items-start gap-3 no-underline transition hover:shadow-lift">
                <span className="text-2xl" aria-hidden="true">{a.icon}</span>
                <div><div className="font-semibold text-slate-900">{a.name}</div><p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{a.short}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-bold">Frequently asked</h2>
          <div className="mt-6 space-y-4">
            {FAQ.map((f, i) => (
              <details key={i} className="card-pad">
                <summary className="cursor-pointer font-semibold text-slate-900">{f.q}</summary>
                <p className="mt-2 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50/50 p-6 text-center">
            <h2 className="text-lg font-bold text-slate-900">Still need help?</h2>
            <p className="mt-1 text-sm text-slate-600">Chat with us on any page or reach out directly.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3"><Link href="/contact" className="btn-primary">Contact us</Link><Link href="/register" className="btn-secondary">Create account</Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
