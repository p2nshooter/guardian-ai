/* /legal-ai/<country> — one statically generated page per legal order: what
 * the legal system looks like, its sub-national regimes, official sources,
 * recent landmark changes, what Legal AI does there, FAQ and a clear offer. */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { COUNTRIES, SUBDIVISIONS, SOURCES, GLOBAL_SOURCES, RECENT, HIERARCHY, HIERARCHY_BY_TRADITION, getCountry, flag, traditionLabel } from "@/lib/legal/jurisdictions";
import { PLANS } from "@/lib/plans";
import { pageMeta, breadcrumbJsonLd, softwareJsonLd, faqJsonLd } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ country: c.code.toLowerCase() }));
}

const WORKFLOWS = [
  ["🧩", "Case Builder", "Upload the case file — get parties, a sourced chronology, the legal issues, the applicable law from the constitution down, evidence gaps, deadlines and strategy."],
  ["🔍", "Research memos", "Partner-grade memos with pinpoint citations, the status of each rule and how courts apply it."],
  ["📄", "Contract review & drafting", "Clause-by-clause redlines for your side, checked against mandatory local law, plus locally enforceable drafts."],
  ["📑", "Pleadings & appeals", "Claims, answers, appeal and cassation memoranda in the local court format, with filing checklists."],
  ["📋", "Compliance & privacy", "Obligation registers, gap analyses, DPIAs, AML/KYC and employment calculations."],
  ["🌍", "Cross-border", "Compare up to 8 jurisdictions side by side and pick the best structure."],
] as const;

function faq(name: string, subs: number) {
  return [
    { q: `Can AI analyse a case under ${name} law?`, a: `Yes. AXTO Legal AI applies the law of ${name}${subs ? ", including its states, provinces or special regimes," : ""} to your facts and documents, cites the provisions it relies on with their status, and lists exactly what to verify before you rely on it.` },
    { q: `Does it know the latest law in ${name}?`, a: `With live research switched on (an Anthropic, OpenRouter or Perplexity key), it checks statutes and decisions against official ${name} sources and lists what it retrieved with dates. Without live research it states its knowledge cut-off and flags every point that must be checked.` },
    { q: "Are my documents safe?", a: "Files are read inside your browser; only the extracted text is sent to the AI provider you choose with your own key. Matters you save are encrypted with a key unique to your account." },
    { q: "Which AI models can I use?", a: "Any: Claude, GPT, Gemini, Groq, OpenRouter (300+ models), Perplexity, DeepSeek, Mistral, Grok and more — or your own private model through an OpenAI-compatible endpoint." },
    { q: "How much does it cost?", a: `Legal AI is included from the Starter plan (US$${PLANS.starter.monthly}/month, 6 core workspaces); Pro (US$${PLANS.pro.monthly}/month) unlocks all 36 workspaces. AI usage runs on your own key.` },
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const c = getCountry((await params).country);
  if (!c) return {};
  const subs = SUBDIVISIONS[c.code]?.length || 0;
  return pageMeta({
    title: `AI Legal Assistant for ${c.name} — case analysis, research & contracts`,
    description: `Analyse cases, research ${c.name} law${subs ? ` down to ${subs} states, provinces and special regimes` : ""}, review contracts and draft pleadings with AI — sourced, current and in your language. 36 expert workspaces on your own AI key.`,
    path: `/legal-ai/${c.code.toLowerCase()}`,
    keywords: [`AI lawyer ${c.name}`, `legal AI ${c.name}`, `${c.name} law AI`, `AI legal research ${c.name}`, `contract review ${c.name}`, ...(c.code === "ID" ? ["AI hukum Indonesia", "analisis perkara AI", "asisten hukum AI"] : [])],
  });
}

export default async function LegalCountryPage({ params }: { params: Promise<{ country: string }> }) {
  const c = getCountry((await params).country);
  if (!c) notFound();
  const subs = SUBDIVISIONS[c.code] || [];
  const special = subs.filter((s) => s.note);
  const sources = [...(SOURCES[c.code] || []), ...GLOBAL_SOURCES].map((x) => x.split("|"));
  const recent = RECENT[c.code] || [];
  const neighbours = COUNTRIES.filter((x) => x.region === c.region && x.code !== c.code).slice(0, 18);
  const qa = faq(c.name, subs.length);
  const start = `/register?plan=pro&next=${encodeURIComponent("/app/legal")}`;

  return (
    <>
      <JsonLd data={[
        softwareJsonLd({ name: `AXTO Legal AI for ${c.name}`, description: `AI legal assistant for ${c.name} law: case building, research, contracts, pleadings and compliance.`, path: `/legal-ai/${c.code.toLowerCase()}`, offers: [{ name: "Starter plan", price: PLANS.starter.monthly, period: "month" }, { name: "Pro plan", price: PLANS.pro.monthly, period: "month" }] }),
        faqJsonLd(qa),
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Legal AI", path: "/apps/legal" }, { name: "By jurisdiction", path: "/legal-ai" }, { name: c.name, path: `/legal-ai/${c.code.toLowerCase()}` }]),
      ]} />

      <section className="surface-ink relative overflow-hidden py-16 sm:py-20">
        <div className="glow pointer-events-none absolute inset-0" />
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" />
        <div className="container-page relative">
          <nav className="text-sm text-slate-400" aria-label="Breadcrumb"><Link href="/apps/legal" className="text-slate-300">Legal AI</Link> / <Link href="/legal-ai" className="text-slate-300">Jurisdictions</Link> / <span>{c.name}</span></nav>
          <div className="mt-6 text-5xl" aria-hidden="true">{flag(c.code)}</div>
          <h1 className="h-display mt-4 max-w-4xl text-white">AI legal assistant for {c.name}</h1>
          <p className="lead mt-5 max-w-3xl text-slate-300">
            Rebuild case files, research {c.name} law, review contracts and draft court documents — with the provisions cited, their current status checked{subs.length ? `, and ${subs.length} states, provinces and special regimes covered` : ""}. Your documents stay in your browser; the AI is your own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={start} className="btn-primary btn-lg">Start analysing {c.name} cases →</Link>
            <Link href="/pricing" className="btn-secondary btn-lg">See plans</Link>
          </div>
          <p className="mt-3 text-sm text-slate-400">From US${PLANS.starter.monthly}/month · instant activation · cancel anytime</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="h-section">The legal system of {c.name}</h2>
            <div className="mt-4 flex flex-wrap gap-2">{c.systems.map((s) => <span key={s} className="badge-brand">{traditionLabel(s)}</span>)}</div>
            <h3 className="mt-6 text-lg font-semibold">Hierarchy of laws</h3>
            <p className="mt-2 leading-relaxed text-slate-700">{HIERARCHY[c.code] || HIERARCHY_BY_TRADITION[c.systems[0]]}</p>
            {recent.length ? (
              <>
                <h3 className="mt-6 text-lg font-semibold">Recent changes Legal AI checks for</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-slate-700">{recent.map((r) => <li key={r}>{r}</li>)}</ul>
              </>
            ) : null}
            {special.length ? (
              <>
                <h3 className="mt-6 text-lg font-semibold">Regions with their own rules</h3>
                <ul className="mt-2 space-y-2 text-slate-700">{special.map((s) => <li key={s.code}><strong>{s.name}</strong> — {s.note}</li>)}</ul>
              </>
            ) : null}
            {subs.length ? (
              <>
                <h3 className="mt-6 text-lg font-semibold">Choose any of {subs.length} sub-national jurisdictions</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{subs.map((s) => s.name).join(" · ")}</p>
              </>
            ) : null}
            {c.code === "ID" ? (
              <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50/50 p-5" lang="id">
                <h3 className="text-lg font-semibold">Asisten hukum AI untuk Indonesia</h3>
                <p className="mt-2 text-slate-700">Susun ulang berkas perkara berdasarkan UUD NRI 1945, undang-undang, PP, Perpres sampai Perda provinsi dan kabupaten/kota — termasuk rezim khusus Aceh (qanun), DIY, DK Jakarta, Papua, Bali (desa adat) dan IKN. Cek otomatis perubahan terbaru seperti KUHP baru (UU 1/2023) yang berlaku 2 Januari 2026, lengkap dengan rujukan pasal dan daftar verifikasi.</p>
                <Link href={start} className="btn-primary mt-4">Coba Legal AI sekarang →</Link>
              </div>
            ) : null}
          </div>
          <aside className="space-y-5">
            <div className="card-pad">
              <h3 className="font-semibold">Official sources Legal AI cites and checks</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {sources.map(([n, u]) => <li key={u}><a href={u} target="_blank" rel="noopener nofollow">{n}</a><span className="block truncate text-xs text-slate-500">{u.replace(/^https?:\/\//, "")}</span></li>)}
              </ul>
            </div>
            <div className="card-pad border-brand-300 bg-gradient-to-b from-brand-50 to-white">
              <div className="text-sm font-semibold text-brand-800">Pro — all 36 legal workspaces</div>
              <div className="mt-1 text-3xl font-extrabold">US${PLANS.pro.monthly}<span className="text-base font-medium text-slate-500">/month</span></div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                <li>✓ Case Builder, research, contracts, pleadings</li><li>✓ Live research with sources</li><li>✓ Encrypted matters & Word/PDF export</li><li>✓ Unlimited use on your own AI key</li>
              </ul>
              <Link href={`/register?plan=pro&next=${encodeURIComponent("/app/legal")}`} className="btn-primary mt-4 w-full">Get Pro →</Link>
              <p className="mt-2 text-center text-xs text-slate-500">Yearly: 2 months free</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-14">
        <div className="container-page">
          <h2 className="h-section">What you can do for {c.name} matters</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOWS.map(([icon, title, body]) => (
              <div key={title} className="card-pad"><div className="text-2xl" aria-hidden="true">{icon}</div><h3 className="mt-2 font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-600">{body}</p></div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3"><Link href={start} className="btn-primary btn-lg">Start now →</Link><Link href="/apps/legal" className="btn-ghost btn-lg">All 36 workspaces</Link></div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page max-w-3xl">
          <h2 className="h-section">Questions about Legal AI in {c.name}</h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
            {qa.map((x) => (
              <details key={x.q} className="group p-5">
                <summary className="cursor-pointer list-none font-semibold text-slate-900">{x.q}<span className="float-right text-slate-400 group-open:rotate-45">＋</span></summary>
                <p className="mt-2 text-slate-700">{x.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container-page">
          <h2 className="text-lg font-semibold">Other jurisdictions nearby</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {neighbours.map((n) => <Link key={n.code} href={`/legal-ai/${n.code.toLowerCase()}`} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm no-underline hover:border-brand-300">{flag(n.code)} {n.name}</Link>)}
            <Link href="/legal-ai" className="rounded-full border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-semibold no-underline">All {COUNTRIES.length} →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
