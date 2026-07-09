/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * One page per product (/products/<slug>). Content comes from two places, kept
 * deliberately separate: lib/product-catalog.ts (marketing copy — hero, BYOX,
 * benefits, capabilities, integrations; no company secrets) and PACKAGE_INFO
 * via getPackagesByProduct (pricing + per-tier feature lists — single source of
 * truth, never duplicated here).
 * ============================================================================ */
"use client";
export const runtime = "edge";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, PRODUCT_CATALOG } from "@/lib/product-catalog";
import { getPackagesByProduct, isProductForSale, PACKAGE_INFO } from "@/lib/stripe";
import ProductMotif from "@/components/ProductMotif";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const entry = getProductBySlug(slug);
  if (!entry) return <NotFoundState />;

  const forSale = isProductForSale(entry.product);
  const tiers = Object.entries(getPackagesByProduct(entry.product))
    .sort((a, b) => a[1].price - b[1].price);
  const trialCode = Object.entries(PACKAGE_INFO).find(([, v]) => v.product === entry.product && v.isTrial)?.[0];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Minimal nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡</div>
            <span style={{ fontSize: 18, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>AXTO</span>
          </Link>
          <Link href="/#products" style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textDecoration: "none" }}>← All Products</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: entry.gradient, padding: "64px 24px 56px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40, alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: entry.color, background: `${entry.color}22`, border: `1px solid ${entry.color}44`, padding: "5px 12px", borderRadius: 999 }}>{entry.badge}</span>
            <h1 style={{ fontSize: "clamp(30px,4vw,46px)", fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", margin: "16px 0 8px", fontFamily: "Sora, sans-serif", lineHeight: 1.1 }}>
              <span style={{ fontSize: 34, marginRight: 10 }}>{entry.emoji}</span>{entry.name}
            </h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", marginBottom: 10 }}>{entry.tagline}</p>
            <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, marginBottom: 26, maxWidth: 520 }}>{entry.hero}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {forSale ? (
                <Link href={`/register?pkg=${tiers[0]?.[0] || ""}`} style={{ padding: "13px 26px", borderRadius: 12, background: `linear-gradient(135deg, ${entry.color}, ${entry.color}cc)`, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", boxShadow: `0 6px 24px ${entry.color}55` }}>
                  View Plans & Pricing →
                </Link>
              ) : (
                <span style={{ padding: "13px 26px", borderRadius: 12, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: 14, border: "1px solid rgba(255,255,255,0.2)" }}>🔜 Coming Soon</span>
              )}
              {trialCode && forSale && (
                <Link href={`/register?pkg=${trialCode}`} className="trial-cta" style={{ padding: "13px 26px", borderRadius: 12, background: "linear-gradient(135deg,#0d9488,#0f766e)", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.35)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="trial-cta-emoji">✨</span> AXTO just launched — claim your free 7-day Enterprise trial
                </Link>
              )}
            </div>
          </div>
          <ProductMotif motif={entry.anim} color={entry.color} />
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px 100px" }}>
        {/* BYOX */}
        <SectionLabel color={entry.color}>Sovereignty, Explained</SectionLabel>
        <h2 style={h2Style}>What owning your AI stack means for {entry.name}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14, marginBottom: 64 }}>
          {entry.byox.map(b => (
            <div key={b.key} className="card" style={{ padding: "18px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: entry.color, letterSpacing: 1, marginBottom: 6 }}>{b.key}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0a1628", marginBottom: 6 }}>{b.label}</div>
              <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.55, margin: 0 }}>{b.note}</p>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <SectionLabel color={entry.color}>Why It's Worth It</SectionLabel>
        <h2 style={h2Style}>Benefits</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 16, marginBottom: 64 }}>
          {entry.benefits.map(b => (
            <div key={b.title} style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${entry.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{b.icon}</div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0a1628", marginBottom: 4 }}>{b.title}</div>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Capabilities */}
        <SectionLabel color={entry.color}>Capabilities</SectionLabel>
        <h2 style={h2Style}>What {entry.name} does</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: "10px 24px", marginBottom: 64 }}>
          {entry.capabilities.map(c => (
            <div key={c} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: "#334155", lineHeight: 1.5 }}>
              <span style={{ color: entry.color, fontWeight: 900, marginTop: 1 }}>✓</span>{c}
            </div>
          ))}
        </div>

        {/* Pricing — real tiers, menus per package */}
        <SectionLabel color={entry.color}>Plans</SectionLabel>
        <h2 style={h2Style}>Choose your plan</h2>
        {!forSale && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#92400e" }}>
            🔜 {entry.name} is coming soon and not yet available for purchase. Pricing below reflects planned tiers.
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "12px 16px", marginBottom: 24 }}>
          <span style={{ fontSize: 16 }}>🐳</span>
          <div style={{ fontSize: 12.5, color: "#075985", lineHeight: 1.6 }}>
            <strong>Docker (Linux) deployment is production-ready today.</strong> The Windows EXE build is still in active development — your client portal shows live, per-format availability once you have a license.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 16, marginBottom: 64 }}>
          {tiers.map(([code, pkg], i) => (
            <div key={code} className="card" style={{ padding: "22px 20px", border: i === Math.min(1, tiers.length - 1) ? `2px solid ${entry.color}` : undefined, position: "relative" }}>
              {i === Math.min(1, tiers.length - 1) && tiers.length > 1 && (
                <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: entry.color, color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 10px", borderRadius: 999, letterSpacing: 0.5 }}>POPULAR</span>
              )}
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0a1628", marginBottom: 4 }}>{pkg.name}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: entry.color, fontFamily: "Sora, sans-serif", marginBottom: 2 }}>
                {pkg.price === 0 ? "Free" : `$${pkg.price.toLocaleString()}`}<span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>{pkg.price > 0 ? "/yr" : ""}</span>
              </div>
              {pkg.priceMonthly > 0 && <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>or ${pkg.priceMonthly}/mo</div>}
              <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 18px", display: "flex", flexDirection: "column", gap: 7 }}>
                {(pkg.features || []).map(f => (
                  <li key={f} style={{ fontSize: 12.5, color: "#475569", display: "flex", gap: 7, alignItems: "flex-start" }}>
                    <span style={{ color: "#16a34a", fontWeight: 900 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              {forSale ? (
                <Link href={`/register?pkg=${code}`} style={{ display: "block", textAlign: "center", padding: "11px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none", background: `linear-gradient(135deg,${entry.color},${entry.color}cc)`, color: "#fff" }}>
                  Get Started
                </Link>
              ) : (
                <span style={{ display: "block", textAlign: "center", padding: "11px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, background: "rgba(148,163,184,0.15)", color: "#94a3b8" }}>Coming Soon</span>
              )}
            </div>
          ))}
        </div>

        {/* Integrations */}
        {entry.integrations.length > 0 && (
          <>
            <SectionLabel color={entry.color}>Works Together</SectionLabel>
            <h2 style={h2Style}>Integrates with</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14, marginBottom: 40 }}>
              {entry.integrations.map(i => (
                <Link key={i.slug} href={`/products/${i.slug}`} className="card" style={{ padding: "16px 18px", display: "flex", gap: 12, alignItems: "center", textDecoration: "none" }}>
                  <span style={{ fontSize: 24 }}>{i.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0a1628" }}>{i.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{i.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color, marginBottom: 8 }}>{children}</div>;
}
const h2Style: React.CSSProperties = { fontSize: 26, fontWeight: 900, color: "#0a1628", letterSpacing: "-0.6px", marginBottom: 24, fontFamily: "Sora, sans-serif" };

function NotFoundState() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
      <div style={{ fontSize: 44 }}>🔍</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0a1628" }}>Product not found</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {PRODUCT_CATALOG.map(p => (
          <Link key={p.slug} href={`/products/${p.slug}`} style={{ fontSize: 13, color: "#0284c7", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>{p.emoji} {p.name}</Link>
        ))}
      </div>
      <Link href="/" style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>← Back to home</Link>
    </div>
  );
}
