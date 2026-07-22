/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Acquire AXTO — The Entire Platform Is Available | AXTO",
  description:
    "The complete AXTO platform — every product, the full source code, and all production Docker applications — is available for acquisition by the right steward. Serious offers from USD $100,000.",
};

const INCLUDED = [
  { icon: "🛡", name: "Guardian AI", desc: "AI-powered threat detection & security monitoring — the flagship." },
  { icon: "🎼", name: "AXTO Orchestra", desc: "Multi-provider AI workload orchestration across GPU clusters." },
  { icon: "🔐", name: "Vault & SOC", desc: "Secrets management and a security-operations suite, tier-1 and tier-2 stacks." },
  { icon: "🌐", name: "Edge, Sentinel & Antivirus", desc: "Edge agents, monitoring and a standalone AV engine with REST API." },
  { icon: "⚖️", name: "Compliance & Legal", desc: "SOC 2 / ISO 27001 / HIPAA / PCI-DSS reporting and legal tooling." },
  { icon: "🎨", name: "Studio family", desc: "AI Studio, GPU Studio and Hybrid Studio applications." },
  { icon: "📦", name: "All Docker applications", desc: "Every production compose stack, image build script and deploy pipeline." },
  { icon: "🗝️", name: "Smart licensing infrastructure", desc: "The complete license issuing, enforcement and expiry system, end to end." },
  { icon: "☁️", name: "Cloud & web layer", desc: "The axto.io dashboard, client portal, Cloudflare Workers, D1/KV/R2 setup." },
];

export default function AcquirePage() {
  return (
    <div style={{ background: "#0a1628", minHeight: "100vh", color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
      {/* Hero */}
      <section style={{ padding: "96px 24px 64px", textAlign: "center", background: "radial-gradient(ellipse at top, rgba(2,132,199,0.18), transparent 60%)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(2,132,199,0.4)", borderRadius: 999, padding: "6px 16px", fontSize: 13, fontWeight: 600, color: "#38bdf8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            A rare, complete acquisition
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, color: "#fff", margin: "24px 0 0", lineHeight: 1.15, fontFamily: "Sora, sans-serif" }}>
            The entire AXTO platform is<br />
            <span style={{ background: "linear-gradient(135deg,#38bdf8,#2dd4bf)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              available to the right steward
            </span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.8, color: "#94a3b8", margin: "24px auto 0", maxWidth: 640 }}>
            AXTO was built patiently, product by product, into a sovereign, self-hosted AI security and
            orchestration platform. We believe work of this scope deserves an owner with the vision and the
            resources to carry it further than we can alone. For that reason — and only for the right
            buyer — the complete platform is open to acquisition: every product, the full source code, and
            every production Docker application, transferred whole.
          </p>
        </div>
      </section>

      {/* What is included */}
      <section style={{ padding: "24px 24px 64px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 36, fontFamily: "Sora, sans-serif" }}>
            One transaction. The whole platform.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {INCLUDED.map((item) => (
              <div key={item.name} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 24, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ fontSize: 26 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "12px 0 6px" }}>{item.name}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "#94a3b8", margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", color: "#64748b", fontSize: 14, marginTop: 28, lineHeight: 1.7 }}>
            The transfer includes the axto.io domain and brand, all repositories, deployment pipelines,
            documentation and playbooks — a turnkey handover, not a code dump.
          </p>
        </div>
      </section>

      {/* Terms */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", border: "1px solid rgba(2,132,199,0.35)", borderRadius: 18, padding: "40px 36px", background: "linear-gradient(180deg, rgba(2,132,199,0.10), rgba(13,148,136,0.06))", textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0, fontFamily: "Sora, sans-serif" }}>
            How offers work
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#cbd5e1", margin: "18px 0 0" }}>
            We review serious, named offers starting from <strong style={{ color: "#38bdf8" }}>USD $100,000</strong>.
            There is no fixed asking price: tell us what AXTO is worth in your hands and how you intend to
            grow it, and we will respond to every genuine proposal with the same candour. Discretion is
            assured in both directions, and we are happy to walk qualified buyers through the architecture,
            the licensing system and the books under NDA.
          </p>
          <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
            <a
              href="mailto:hello@axto.io?subject=AXTO%20Acquisition%20Offer"
              style={{ background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", padding: "14px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none" }}
            >
              Make an offer — hello@axto.io
            </a>
            <a
              href="mailto:salam@ulyah.com?subject=AXTO%20Acquisition%20Offer"
              style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#e2e8f0", padding: "14px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none" }}
            >
              Or write to salam@ulyah.com
            </a>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 22, lineHeight: 1.7 }}>
            Until a transfer completes, AXTO remains fully operated and supported — customers and resellers
            are unaffected, and every license continues to be honoured.
          </p>
        </div>
        <p style={{ textAlign: "center", marginTop: 32 }}>
          <Link href="/" style={{ color: "#38bdf8", fontSize: 14, textDecoration: "none" }}>← Back to axto.io</Link>
        </p>
      </section>
    </div>
  );
}
