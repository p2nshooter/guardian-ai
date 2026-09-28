/* /security — public security posture page (distinct from the Security Analyst app). */
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import Reveal from "@/components/site/Reveal";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Security at AXTO",
  description: "How AXTO protects your data: bring-your-own-key architecture, per-member encryption, no model training on your data, and self-hosted options for full sovereignty.",
  path: "/security",
  keywords: ["AXTO security", "AI data security", "BYOK security", "encryption", "responsible disclosure"],
});

const PILLARS = [
  { icon: "🔑", title: "Bring your own key (BYOX)", desc: "Every request runs on your own AI credentials. Your keys are stored encrypted and used only for your requests — never shared, never used for anyone else." },
  { icon: "🔒", title: "Per-member encryption", desc: "Your saved work is encrypted at rest with a key derived per member (AES-256-GCM). Even our storage never holds it in the clear." },
  { icon: "🧠", title: "No training on your data", desc: "We never use your content to train models. Your prompts and outputs are yours." },
  { icon: "🕵️", title: "Privacy Vault on-device", desc: "PII detection and redaction run entirely in your browser — the original text is never uploaded." },
  { icon: "🏢", title: "Self-hosted sovereignty", desc: "Run the Docker editions on your own infrastructure — cloud, on-prem or air-gapped. No telemetry, no call-home." },
  { icon: "🛡️", title: "Hardened platform", desc: "Built on Cloudflare's edge with strict transport security, signed sessions, rate limiting and fail-closed licensing." },
];

export default function SecurityPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Security", path: "/security" }])} />
      <section className="border-b border-white/10 bg-ink-950 py-16 text-white">
        <div className="container-page">
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-brand-300">SECURITY</span>
          <h1 className="h-display mt-4 max-w-3xl text-white">Security & data sovereignty</h1>
          <p className="lead mt-4 max-w-3xl text-white/80">AXTO is built so your data stays yours. You bring the AI keys, your work is encrypted per member, and nothing is used to train models — with self-hosted editions for full control.</p>
        </div>
      </section>
      <section className="py-14">
        <div className="container-page grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={i} delay={(i % 3) * 60} className="card-pad">
              <div className="text-2xl" aria-hidden="true">{p.icon}</div>
              <h2 className="mt-2 font-bold text-slate-900">{p.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{p.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="border-t border-slate-200 bg-slate-50 py-14">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-bold">Responsible disclosure</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-700">
            We welcome reports from security researchers. If you believe you've found a vulnerability, please email <a href={`mailto:${SITE.email}`} className="font-semibold text-brand-700">{SITE.email}</a> with details and steps to reproduce. Please give us reasonable time to remediate before public disclosure, and do not access or modify other users' data.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/privacy" className="btn-secondary">Privacy Policy</Link>
            <Link href="/self-hosted" className="btn-primary">Self-hosted editions →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
