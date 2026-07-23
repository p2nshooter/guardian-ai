/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * Playbook ARTICLE page (/playbooks/<slug>). The AI-prompt playbooks are now
 * free, ad-supported articles — clicking a playbook opens this page directly,
 * with NO download and NO checkout. Ads are network-controlled from the
 * ulyah.com admin (via <AdSlot/>) and only render once a real, approved unit
 * id exists for this site.
 * ============================================================================ */
export const runtime = "edge";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/AdSlot";
import {
  getPlaybook, relatedPlaybooks, readMinutes, categoryLabel, providerLabel,
} from "@/lib/playbooks/articles";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pb = getPlaybook(slug);
  if (!pb) return { title: "Playbook" };
  return {
    title: `${pb.name} — AI Prompt Guide | AXTO`,
    description: pb.description,
    alternates: { canonical: `/playbooks/${pb.slug}` },
    openGraph: { title: pb.name, description: pb.description, type: "article" },
  };
}

const USAGE_TIPS = [
  "Replace every [BRACKETED] placeholder with your own specifics — the more concrete the input, the sharper the output.",
  "Give the model a role and an audience first (\"You are a senior copywriter writing for busy founders\"), then the task.",
  "Ask for 3 variations, pick the strongest, then request one refinement pass. Two rounds beats one long prompt.",
  "Paste real context — your product, tone samples, or data — so the answer is grounded, not generic.",
  "Keep a short \"house style\" note you prepend to every prompt for a consistent voice across outputs.",
];

export default async function PlaybookArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pb = getPlaybook(slug);
  if (!pb) notFound();

  const related = relatedPlaybooks(slug, 4);
  const minutes = readMinutes(pb);
  const cat = categoryLabel(pb.category_slug);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none" }}>Home</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <Link href="/playbooks" style={{ color: "#64748b", textDecoration: "none" }}>Playbooks</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span style={{ color: "#0284c7" }}>{cat}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 12, color: "#64748b", marginBottom: 12 }}>
        <span style={{ background: "rgba(2,132,199,0.1)", color: "#0284c7", fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>{cat}</span>
        <span>{minutes} min read</span>
        <span>·</span>
        <span>{pb.prompt_count} prompts</span>
        {pb.badge && (<><span>·</span><span style={{ fontWeight: 700, color: "#7c3aed" }}>{pb.badge}</span></>)}
      </div>
      <h1 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 900, lineHeight: 1.12, letterSpacing: "-0.8px", color: "#0a1628", margin: "0 0 10px", fontFamily: "Sora, sans-serif" }}>
        <span style={{ fontSize: 32, marginRight: 10 }}>{pb.icon}</span>{pb.name}
      </h1>
      <p style={{ fontSize: 18, color: "#475569", lineHeight: 1.5, margin: "0 0 24px" }}>{pb.subtitle}</p>

      {/* Lede */}
      <p style={{ fontSize: 16, color: "#334155", lineHeight: 1.75, margin: "0 0 8px" }}>{pb.description}</p>

      {/* Ad #1 — top of article (network-controlled from ulyah.com admin) */}
      <AdSlot placement="in_article_1" />

      {/* Body */}
      <h2 style={h2}>What this guide covers</h2>
      <p style={p}>{pb.long_description}</p>

      <h2 style={h2}>How to use these prompts</h2>
      <p style={p}>
        Every prompt in this collection is written to be pasted into a chat with a large language model and adapted to
        your situation. You do not need any special tools — just an AI assistant and the placeholders filled in with
        your own details. Work through them one at a time:
      </p>
      <ul style={ul}>
        {USAGE_TIPS.map((tip, i) => (
          <li key={i} style={li}><span style={{ color: "#0284c7", fontWeight: 900, marginRight: 8 }}>{i + 1}.</span>{tip}</li>
        ))}
      </ul>

      {pb.preview_text && (
        <>
          <h2 style={h2}>Example prompt from this guide</h2>
          <p style={p}>Here is one of the {pb.prompt_count} prompts, shown exactly as you would use it:</p>
          <pre style={{ background: "#0f172a", color: "#e2e8f0", padding: "20px 22px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre-wrap", fontFamily: "ui-monospace, 'Cascadia Code', Consolas, monospace" }}>
            {pb.preview_text}
          </pre>
        </>
      )}

      {/* Ad #2 — mid article */}
      <AdSlot placement="in_article_2" />

      <h2 style={h2}>Works with your favourite AI</h2>
      <p style={p}>
        These prompts are model-agnostic — they produce great results across the major assistants. Tested with:
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {pb.compatible_with.map((c) => (
          <span key={c} style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", padding: "6px 14px", borderRadius: 999 }}>
            {providerLabel(c)}
          </span>
        ))}
      </div>

      {pb.tags?.length > 0 && (
        <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 20 }}>
          Topics: {pb.tags.map((t) => `#${t}`).join("  ")}
        </p>
      )}

      {/* Free-apps CTA — ties the article back to the free AXTO platform */}
      <div style={{ marginTop: 36, background: "linear-gradient(135deg,#f0f9ff,#f0fdfa)", border: "1px solid rgba(2,132,199,0.18)", borderRadius: 16, padding: "24px 26px" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#0a1628", marginBottom: 6 }}>Run these on your own private AI</div>
        <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.65, margin: "0 0 16px" }}>
          Want to use prompts like these without sending your data to anyone? AXTO Studio and Orchestra are free for a
          full year — self-hosted, bring-your-own-keys, full access, no licence.
        </p>
        <Link href="/portal/downloads" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff" }}>
          <span style={{ fontSize: 16 }}>⬇</span> Download the free apps
        </Link>
      </div>

      {/* Related guides */}
      {related.length > 0 && (
        <div style={{ marginTop: 44, borderTop: "1px solid #e2e8f0", paddingTop: 28 }}>
          <h2 style={{ ...h2, marginTop: 0 }}>More prompt guides</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {related.map((r) => (
              <Link key={r.slug} href={`/playbooks/${r.slug}`} className="card" style={{ padding: "16px 18px", textDecoration: "none", display: "block" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{r.icon}</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0a1628", marginBottom: 4 }}>{r.name}</div>
                <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>{r.subtitle}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ad #3 — footer of article */}
      <AdSlot placement="footer" />

      <div style={{ marginTop: 24 }}>
        <Link href="/playbooks" style={{ fontSize: 14, color: "#0284c7", textDecoration: "none", fontWeight: 600 }}>← Browse all prompt guides</Link>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: pb.name,
            description: pb.description,
            articleSection: cat,
            keywords: (pb.tags || []).join(", "),
            author: { "@type": "Organization", name: "AXTO" },
            publisher: { "@type": "Organization", name: "AXTO" },
          }),
        }}
      />
    </main>
  );
}

const h2: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: "#0a1628", letterSpacing: "-0.4px", margin: "34px 0 12px", fontFamily: "Sora, sans-serif" };
const p: React.CSSProperties = { fontSize: 16, color: "#334155", lineHeight: 1.8, margin: "0 0 16px" };
const ul: React.CSSProperties = { listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 12 };
const li: React.CSSProperties = { fontSize: 15.5, color: "#334155", lineHeight: 1.7, display: "flex", alignItems: "flex-start" };
