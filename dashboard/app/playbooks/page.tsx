/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * Playbooks INDEX (/playbooks). Formerly a paid checkout; now a free article
 * hub. Every card links straight to /playbooks/<slug> — no download, no
 * purchase. Ads are network-controlled from the ulyah.com admin via <AdSlot/>.
 * ============================================================================ */
export const runtime = "edge";
import type { Metadata } from "next";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import {
  PLAYBOOKS, getCategories, getPlaybooksByCategory, categoryLabel, readMinutes,
} from "@/lib/playbooks/articles";

export const metadata: Metadata = {
  title: "AI Prompt Guides — Free Playbooks for ChatGPT, Claude & Gemini | AXTO",
  description:
    "Free, ready-to-use AI prompt guides for copywriting, business, SaaS, e-commerce, careers and more. Read online — no sign-up, no download.",
  alternates: { canonical: "/playbooks" },
};

// Normalise a category token so old label links (?cat=Copywriting) and new slug
// links (?cat=copywriting) both resolve.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default async function PlaybooksIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const categories = getCategories();

  const activeCat = cat
    ? categories.find((c) => norm(c.slug) === norm(cat) || norm(c.label) === norm(cat))?.slug ?? null
    : null;

  const list = activeCat ? getPlaybooksByCategory(activeCat) : PLAYBOOKS;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px 90px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 8px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 1.5, color: "#7c3aed", textTransform: "uppercase", marginBottom: 12 }}>
          AXTO Prompt Guides
        </div>
        <h1 style={{ fontSize: "clamp(30px,4.5vw,46px)", fontWeight: 900, color: "#0a1628", letterSpacing: "-1.2px", lineHeight: 1.1, marginBottom: 14, fontFamily: "Sora, sans-serif" }}>
          Free AI prompt guides
        </h1>
        <p style={{ fontSize: 17, color: "#475569", lineHeight: 1.65 }}>
          {PLAYBOOKS.length} hands-on guides of battle-tested prompts for ChatGPT, Claude and Gemini — read online,
          free, no sign-up. Copy, adapt, ship.
        </p>
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", margin: "28px 0 8px" }}>
        <Link href="/playbooks" style={chip(activeCat === null)}>All ({PLAYBOOKS.length})</Link>
        {categories.map((c) => (
          <Link key={c.slug} href={`/playbooks?cat=${c.slug}`} style={chip(activeCat === c.slug)}>
            {c.icon} {c.label} ({c.count})
          </Link>
        ))}
      </div>

      {/* Ad — list top */}
      <AdSlot placement="list" />

      {/* Article grid */}
      {activeCat && (
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0a1628", margin: "16px 0 18px", fontFamily: "Sora, sans-serif" }}>
          {categoryLabel(activeCat)}
        </h2>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 }}>
        {list.map((pb) => (
          <Link key={pb.slug} href={`/playbooks/${pb.slug}`} className="card" style={{ padding: "22px 20px", textDecoration: "none", display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
            {pb.badge && (
              <span style={{ position: "absolute", top: 14, right: 14, fontSize: 10, fontWeight: 800, color: "#7c3aed", background: "rgba(124,58,237,0.1)", padding: "3px 9px", borderRadius: 6, letterSpacing: 0.3 }}>{pb.badge}</span>
            )}
            <div style={{ fontSize: 30 }}>{pb.icon}</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0a1628", margin: 0, fontFamily: "Sora, sans-serif" }}>{pb.name}</h3>
            <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.55, margin: 0, flex: 1 }}>{pb.subtitle}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{pb.prompt_count} prompts · {readMinutes(pb)} min</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed" }}>Read guide →</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Ad — list bottom */}
      <AdSlot placement="footer" />

      {/* Free-apps CTA */}
      <div style={{ marginTop: 40, textAlign: "center", background: "linear-gradient(135deg,#f0f9ff,#f0fdfa)", border: "1px solid rgba(2,132,199,0.18)", borderRadius: 18, padding: "34px 28px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0a1628", marginBottom: 8, fontFamily: "Sora, sans-serif" }}>Own your AI stack</h2>
        <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.65, maxWidth: 560, margin: "0 auto 18px" }}>
          Run prompts like these on your own private, self-hosted AI. Every AXTO application is free with full access —
          no licence key — for one year.
        </p>
        <Link href="/portal/downloads" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 11, fontWeight: 700, fontSize: 14.5, textDecoration: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff" }}>
          <span style={{ fontSize: 17 }}>⬇</span> Download the free apps
        </Link>
      </div>
    </main>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 700,
    padding: "7px 14px",
    borderRadius: 999,
    textDecoration: "none",
    border: active ? "1.5px solid #7c3aed" : "1px solid #e2e8f0",
    background: active ? "rgba(124,58,237,0.1)" : "#fff",
    color: active ? "#7c3aed" : "#475569",
  };
}
