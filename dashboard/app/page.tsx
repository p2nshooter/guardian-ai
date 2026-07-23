/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { isProductForSale } from "@/lib/stripe";
import ReviewsSection from "@/components/ReviewsSection";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

// AXTO Free Full-Access Program — the whole catalogue is free, full-tier, with
// no licence key, for one year. Prices have been removed site-wide; this label
// is the single copy string used across the landing hero, showcase and CTAs.
const FREE_TAGLINE = "Free · full access · no licence key · one year";

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", "@id": `${APP_URL}/#org`, name: "AXTO", url: APP_URL,
      email: "hello@axto.io",
      description: "AI eXecution & Tools Orchestration. 100% BYOK — your keys, your data, your infrastructure.",
    },
    {
      "@type": "SoftwareApplication", name: "Guardian AI",
      applicationCategory: "SecurityApplication", operatingSystem: "Linux",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock", description: "Free full access — no licence required" },
      description: "Guardian AI — self-hosted threat detection, automated incident response, and compliance reporting.",
      provider: { "@id": `${APP_URL}/#org` },
    },
    {
      "@type": "SoftwareApplication", name: "Orchestra AI",
      applicationCategory: "DeveloperApplication", operatingSystem: "Linux",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock", description: "Free full access — no licence required" },
      description: "Self-hosted AI workflow orchestration. Route jobs across GPU clusters and multiple LLM providers with your own API keys.",
      provider: { "@id": `${APP_URL}/#org` },
    },
  ],
};

export default function HomePage() {
  const { t } = useLocale();

  const [navOpen, setNavOpen] = useState(false);

  // Lock background scroll while the mobile nav drawer is open.
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [navOpen]);

  // Shared nav links — rendered in both the desktop bar and the mobile drawer.
  const NAV_LINKS: [string, string][] = [
    ["/promo",t("landing.nav.promo")],["#products",t("landing.nav.products")],["#pricing","Free Access"],["#playbooks",t("landing.nav.playbooks")],
    ["#byok",t("landing.nav.byok")],["#faq",t("landing.nav.faq")],["/guide",t("nav.guide")],["/acquire","Acquire"],
  ];


  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />

      {/* ── NAVBAR ────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(240,249,255,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(2,132,199,0.12)",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 12px rgba(2,132,199,0.3)" }}>🛡</div>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif", letterSpacing: "-0.5px" }}>AXTO</span>
          </Link>

          {/* Desktop links — collapse into a drawer ≤1024px */}
          <div className="nav-desktop" style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {NAV_LINKS.map(([href,label])=>(
              <a key={label} href={href} style={{ color: "#475569", fontSize: 14, fontWeight: 600, padding: "8px 14px", borderRadius: 8, transition: "all 0.15s", textDecoration: "none" }}
                onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background="rgba(2,132,199,0.08)";(e.currentTarget as HTMLElement).style.color="#0284c7";}}
                onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background="transparent";(e.currentTarget as HTMLElement).style.color="#475569";}}
              >{label}</a>
            ))}
            <Link href="/register" style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: "#0284c7", textDecoration: "none", borderRadius: 8, border: "1.5px solid #0284c7", marginLeft: 4 }}>
              {t("nav.register")}
            </Link>
            <Link href="/auth/login" className="btn-primary" style={{ padding: "9px 22px", fontSize: 14, marginLeft: 4 }}>
              {t("nav.portal")}
            </Link>
          </div>

          {/* Mobile hamburger — visible ≤1024px */}
          <button className={`nav-toggle${navOpen ? " open" : ""}`} aria-label="Menu" aria-expanded={navOpen} onClick={()=>setNavOpen(o=>!o)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── MOBILE NAV DRAWER ─────────────────────────────────────── */}
      <div className={`nav-overlay${navOpen ? " open" : ""}`} onClick={()=>setNavOpen(false)} aria-hidden={!navOpen} />
      <aside className={`nav-drawer${navOpen ? " open" : ""}`} aria-hidden={!navOpen}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "4px 6px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🛡</span>
            <span style={{ fontSize: 19, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif", letterSpacing: "-0.5px" }}>AXTO</span>
          </span>
          <button aria-label="Close menu" onClick={()=>setNavOpen(false)} style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(2,132,199,0.18)", background: "#fff", color: "#0a1628", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_LINKS.map(([href,label])=>(
            <a key={label} href={href} className="nav-drawer-link" onClick={()=>setNavOpen(false)}>{label}</a>
          ))}
        </nav>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(2,132,199,0.14)" }}>
          <Link href="/register" onClick={()=>setNavOpen(false)} style={{ textAlign: "center", padding: "13px 18px", fontSize: 15, fontWeight: 700, color: "#0284c7", textDecoration: "none", borderRadius: 12, border: "1.5px solid #0284c7" }}>
            {t("nav.register")}
          </Link>
          <Link href="/auth/login" onClick={()=>setNavOpen(false)} className="btn-primary" style={{ textAlign: "center", padding: "13px 18px", fontSize: 15, justifyContent: "center" }}>
            {t("nav.portal")}
          </Link>
        </div>
      </aside>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="hero-bg mesh-grid" style={{ paddingTop: 100, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, position: "relative", overflow: "hidden" }}>
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative" }}>
          {/* Trust badge */}
          <div className="animate-fade-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "7px 20px", fontSize: 13, color: "#0284c7", fontWeight: 700, marginBottom: 28 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            {t("hero.badge")}
          </div>

          <h1 className="font-display animate-fade-up delay-100" style={{ fontSize: "clamp(36px, 5.5vw, 64px)", fontWeight: 800, lineHeight: 1.08, marginBottom: 24, color: "#0a1628", letterSpacing: "-1.5px" }}>
            {t("landing.hero.title1")}<br />
            <span className="gradient-text">{t("landing.hero.title2")}</span>
          </h1>

          <p className="animate-fade-up delay-200" style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#334155", lineHeight: 1.7, maxWidth: 700, margin: "0 auto 40px" }}>
            {t("landing.hero.subtitle")}
          </p>

          <div className="animate-fade-up delay-300" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
            <Link href="/portal/downloads" className="btn-primary" style={{ fontSize: 16, padding: "15px 36px", display: "inline-flex", alignItems: "center", gap: 9 }}><span style={{ fontSize: 18 }}>⬇</span> Download Free</Link>
            <a href="#products" className="btn-secondary" style={{ fontSize: 16, padding: "15px 36px" }}>Explore the apps</a>
          </div>
          <p className="animate-fade-up delay-300" style={{ fontSize: 14.5, color: "#0f766e", fontWeight: 700, marginBottom: 60, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>✨</span> Every AXTO application is free, with full access and no licence key, for one year.
          </p>

          {/* Stats row */}
          <div className="animate-fade-up delay-400" style={{ display: "flex", gap: 0, justifyContent: "center", flexWrap: "wrap", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(2,132,199,0.12)", borderRadius: 20, padding: "24px 8px", maxWidth: 720, margin: "0 auto", boxShadow: "0 4px 24px rgba(2,132,199,0.08)" }}>
            {[
              { value: "100%", label: t("landing.hero.stat1"), icon: "🔑" },
              { value: "0 bytes", label: t("landing.hero.stat2"), icon: "🛡️" },
              { value: "< 30 min", label: t("landing.hero.stat3"), icon: "⚡" },
              { value: t("landing.hero.stat4val"), label: t("landing.hero.stat4"), icon: "📈" },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: "1 1 140px", textAlign: "center", padding: "8px 16px", borderRight: i < 3 ? "1px solid rgba(2,132,199,0.1)" : "none" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0284c7", fontFamily: "Sora, sans-serif" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE — all 10, prominent, priced, clickable ── */}
      <section id="products" style={{ padding: "88px 24px 96px", background: "linear-gradient(180deg,#ffffff,#f6fafe)", borderTop: "1px solid #e8eef5", position: "relative" }}>
        <div className="mesh-grid" style={{ position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 48px" }}>
            <div style={{ display: "inline-block", fontSize: 12.5, fontWeight: 800, letterSpacing: 1.5, color: "#0284c7", textTransform: "uppercase", marginBottom: 14 }}>{t("landing.products.eyebrow")}</div>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 16, fontFamily: "Sora, sans-serif", lineHeight: 1.1 }}>
              {t("landing.products.title1")} <span className="gradient-text">{t("landing.products.title2")}</span>
            </h2>
            <p style={{ fontSize: 16.5, color: "#475569", lineHeight: 1.65 }}>
              {t("landing.products.subtitle")}
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 18, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 999, padding: "8px 18px", fontSize: 12.5, color: "#075985", fontWeight: 600 }}>
              🐳 Docker (Linux) is production-ready for every product · 🪟 Windows EXE is still in active development
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(272px, 1fr))", gap: 18 }}>
            {[
              { product: "guardian",   icon: "🛡️", name: "Guardian AI",     badge: "SECURITY",       color: "#0284c7", tag: "7-layer AI threat detection & sub-30s auto-response, entirely on your servers." },
              { product: "orchestra",  icon: "🎼", name: "Orchestra AI",    badge: "ORCHESTRATION",  color: "#7c3aed", tag: "One endpoint, 15+ AI providers. Smart routing picks cheapest/fastest/best." },
              { product: "legal",      icon: "⚖️", name: "AXTO Legal",      badge: "LEGAL",          color: "#4338ca", tag: "Private AI for research, contract intelligence & document drafting." },
              { product: "studio",     icon: "🧠", name: "AXTO Studio",     badge: "AI STUDIO",      color: "#0f766e", tag: "Self-hosted AI + GPU workspace — chat, image/video, pipelines, APIs." },
              { product: "antivirus",  icon: "🦠", name: "AXTO Antivirus",  badge: "ENDPOINT",       color: "#ea580c", tag: "ClamAV plus machine-learning endpoint protection with auto-quarantine." },
              { product: "vault",      icon: "🔒", name: "AXTO Vault",      badge: "PRIVACY",        color: "#6366f1", tag: "Redact PII/PHI/financial data before it ever reaches a model." },
              { product: "edge",       icon: "🌐", name: "AXTO Edge",       badge: "GATEWAY",        color: "#0891b2", tag: "AI API gateway — customer keys, cost routing, metering & billing." },
              { product: "soc",        icon: "🎯", name: "AXTO SOC",        badge: "OPERATIONS",     color: "#dc2626", tag: "AI-assisted SIEM + SOAR — correlation, threat intel, auto-response." },
              { product: "compliance", icon: "📋", name: "AXTO Compliance", badge: "COMPLIANCE",     color: "#16a34a", tag: "Continuous audit monitoring across 7 frameworks with evidence collection." },
              { product: "sentinel",   icon: "🏭", name: "AXTO Sentinel",   badge: "INDUSTRIAL",     color: "#ca8a04", tag: "Passive security for industrial IoT & OT — asset discovery, IEC 62443." },
            ].map((p) => {
              const available = isProductForSale(p.product);
              return (
                <Link key={p.product} href={`/products/${p.product}`} className="card" style={{ position: "relative", padding: "24px 22px", display: "flex", flexDirection: "column", gap: 12, textDecoration: "none", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${p.color}, ${p.color}55)` }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 13, background: `linear-gradient(135deg, ${p.color}18, ${p.color}0a)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{p.icon}</div>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: p.color, background: `${p.color}12`, padding: "4px 10px", borderRadius: 999 }}>{p.badge}</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0a1628", letterSpacing: "-0.4px", margin: 0, fontFamily: "Sora, sans-serif" }}>{p.name}</h3>
                  <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.55, margin: 0, flex: 1 }}>{p.tag}</p>
                  <span style={{ alignSelf: "flex-start", fontSize: 10.5, fontWeight: 800, color: "#0f766e", background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.25)", padding: "4px 10px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span>✨</span> Free · full access · no licence
                  </span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                    {available ? (
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f766e", background: "rgba(16,185,129,0.1)", padding: "4px 10px", borderRadius: 999 }}>● Available now</span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#b45309", background: "rgba(245,158,11,0.1)", padding: "4px 10px", borderRadius: 999 }}>{t("landing.products.comingsoon")}</span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 800, color: p.color }}>⬇ Download →</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 40 }}>
            <Link href="/portal/downloads" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 17 }}>⬇</span> Download any app — free
            </Link>
            <a href="#pricing" className="btn-secondary">See what's included</a>
          </div>
        </div>
      </section>

      {/* ── GUARDIAN FEATURES ─────────────────────────────────────── */}

      {/* ── BYOK SECTION ──────────────────────────────────────────── */}
      {/* ── STATS & TRUST BAR ──────────────────────────────────────────── */}
      <section style={{ background: "#0a1628", padding: "44px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 32, textAlign: "center" }}>
          {[
            { stat: "12", label: t("landing.statsbar.s1"), icon: "🛡️" },
            { stat: "40+", label: t("landing.statsbar.s2"), icon: "💰" },
            { stat: "100%", label: t("landing.statsbar.s3"), icon: "🏠" },
            { stat: "0 bytes", label: t("landing.statsbar.s4"), icon: "🔒" },
            { stat: "10", label: t("landing.statsbar.s5"), icon: "🌍" },
            { stat: "$0", label: t("landing.statsbar.s6"), icon: "⚡" },
          ].map(({ stat, label, icon }) => (
            <div key={label}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>{stat}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY AXTO — value cards (honest, no competitor/margin data) ───── */}
      <section style={{ background: "#f8fafc", padding: "100px 24px", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 16 }}>{t("landing.why.eyebrow")}</span>
            <h2 className="font-display" style={{ fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 900, color: "#0a1628", letterSpacing: "-1px", marginBottom: 14 }}>
              {t("landing.why.title")}
            </h2>
            <p style={{ color: "#475569", fontSize: 16, maxWidth: 620, margin: "0 auto" }}>
              {t("landing.why.subtitle")}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
            {[
              { icon: "🏠", title: t("landing.why.c1t"), body: t("landing.why.c1b") },
              { icon: "🧩", title: t("landing.why.c2t"), body: t("landing.why.c2b") },
              { icon: "💎", title: t("landing.why.c3t"), body: t("landing.why.c3b") },
              { icon: "🔓", title: t("landing.why.c4t"), body: t("landing.why.c4b") },
            ].map((c) => (
              <div key={c.title} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "28px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{c.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{c.body}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 28, fontSize: 13, color: "#64748b" }}>
            {t("landing.why.footer")}{" "}
            <a href="mailto:hello@axto.io" style={{ color: "#0284c7", textDecoration: "none", fontWeight: 600 }}>{t("landing.why.footercta")}</a>
          </p>
        </div>
      </section>

      <section id="byok" style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%)", padding: "100px 24px", borderTop: "1px solid rgba(2,132,199,0.08)", borderBottom: "1px solid rgba(2,132,199,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div>
              <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 20 }}>
                {t("landing.byok.eyebrow")}
              </span>
              <h2 className="font-display" style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 800, color: "#0a1628", lineHeight: 1.15, letterSpacing: "-1px", marginBottom: 20 }}>
                {t("landing.byok.title1")}<br />
                <span className="gradient-text">{t("landing.byok.title2")}</span>
              </h2>
              <p style={{ color: "#475569", fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
                {t("landing.byok.paragraph")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: "🔐", text: t("landing.byok.b1") },
                  { icon: "🏗️", text: t("landing.byok.b2") },
                  { icon: "📡", text: t("landing.byok.b3") },
                  { icon: "🕵️", text: t("landing.byok.b4") },
                  { icon: "✅", text: t("landing.byok.b5") },
                ].map(item => (
                  <div key={item.icon} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 15, color: "#334155" }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            <div>
              {/* Code terminal */}
              <div style={{ background: "#0f172a", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(2,132,199,0.2)" }}>
                {/* Terminal bar */}
                <div style={{ background: "#1e293b", padding: "12px 20px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ color: "#475569", fontSize: 12, marginLeft: 8 }}>orchestra.yml — your server</span>
                </div>
                <div style={{ padding: "24px", fontFamily: "ui-monospace, 'Cascadia Code', Consolas, monospace", fontSize: 13, lineHeight: 1.9 }}>
                  <div style={{ color: "#64748b" }}># ~/orchestra/orchestra.yml — stays on YOUR server</div>
                  <div style={{ color: "#94a3b8" }}><span style={{ color: "#38bdf8" }}>orchestra:</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;<span style={{ color: "#38bdf8" }}>license_key:</span> <span style={{ color: "#fbbf24" }}>ORCH-XXXX-XXXX-XXXX</span> <span style={{ color: "#475569" }}># the only thing we see</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;<span style={{ color: "#38bdf8" }}>ai_pool:</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#38bdf8" }}>routing_mode:</span> <span style={{ color: "#4ade80" }}>cost_first</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#38bdf8" }}>vendors:</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style={{ color: "#4ade80" }}>provider: openai</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#fbbf24" }}>api_key: sk-proj-...</span> <span style={{ color: "#475569" }}># 🔒 never leaves here</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style={{ color: "#4ade80" }}>provider: anthropic</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#fbbf24" }}>api_key: sk-ant-...</span> <span style={{ color: "#475569" }}># 🔒 your infra only</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style={{ color: "#4ade80" }}>provider: ollama</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#fbbf24" }}>base_url: http://localhost:11434</span></div>
                </div>
              </div>

              {/* Trust indicators */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                {[
                  { icon: "🔒", label: t("landing.byok.t1l"), sub: t("landing.byok.t1s") },
                  { icon: "🏠", label: t("landing.byok.t2l"), sub: t("landing.byok.t2s") },
                  { icon: "📋", label: t("landing.byok.t3l"), sub: t("landing.byok.t3s") },
                  { icon: "🚫", label: t("landing.byok.t4l"), sub: t("landing.byok.t4s") },
                ].map(tr => (
                  <div key={tr.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(2,132,199,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{tr.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0a1628" }}>{tr.label}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{tr.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FREE FULL ACCESS ──────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ display: "inline-block", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.28)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0f766e", fontWeight: 800, letterSpacing: "0.5px", marginBottom: 16 }}>FREE FULL ACCESS · ONE YEAR</span>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
            No plans. No prices. Just download.
          </h2>
          <p style={{ color: "#475569", fontSize: 17, maxWidth: 640, margin: "0 auto", lineHeight: 1.7 }}>
            The entire AXTO platform is free — at full tier, with no licence key — for one year. Pick an application, deploy it on your own infrastructure, and run the complete feature set. Your keys, your data, your servers.
          </p>
        </div>

        <div style={{ background: "linear-gradient(135deg, #f0fdfa, #f0f9ff)", borderRadius: 24, padding: "48px 40px", border: "1px solid rgba(13,148,136,0.18)", textAlign: "center" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 22, marginBottom: 38, textAlign: "left", maxWidth: 920, marginLeft: "auto", marginRight: "auto" }}>
            {[
              { icon: "🔑", tt: "No licence to buy", d: "Full, unrestricted access to every tier — nothing to activate, nothing to pay." },
              { icon: "🏠", tt: "100% self-hosted", d: "Runs on your own servers with Docker. No telemetry and no call-home." },
              { icon: "🧩", tt: "Bring your own keys", d: "Plug in your own AI provider keys — your traffic never touches ours." },
              { icon: "🗓️", tt: "One full year", d: "Free for the whole program window, with a clear in-app countdown — never a surprise." },
            ].map(c => (
              <div key={c.tt} style={{ display: "flex", gap: 12 }}>
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0a1628", marginBottom: 3 }}>{c.tt}</div>
                  <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.55, margin: 0 }}>{c.d}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/portal/downloads" className="btn-primary" style={{ fontSize: 16, padding: "16px 44px", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⬇</span> Download the apps — free
          </Link>
          <p style={{ marginTop: 16, fontSize: 13, color: "#64748b" }}>🐳 Docker (Linux) is production-ready today · 🪟 Windows build in active development</p>
        </div>
      </section>

      {/* ── PLAYBOOKS ──────────────────────────────────────────── */}
      <section id="playbooks" style={{ padding: "100px 24px", background: "#fff", borderTop: "1px solid rgba(2,132,199,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#7c3aed", fontWeight: 700, marginBottom: 16 }}>{t("landing.playbooks.eyebrow")}</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
              {t("landing.playbooks.title")}
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 620, margin: "0 auto", lineHeight: 1.7 }}>
              {t("landing.playbooks.subtitle")}
            </p>
          </div>

          {/* Category grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 48 }}>
            {[
              { icon: "✍️", name: "Copywriting", count: "50+ prompts" },
              { icon: "💼", name: "Business", count: "65+ prompts" },
              { icon: "⚖️", name: "Legal & HR", count: "30+ prompts" },
              { icon: "🛒", name: "E-Commerce", count: "45+ prompts" },
              { icon: "📈", name: "SaaS & Startup", count: "35+ prompts" },
              { icon: "👔", name: "Career", count: "30+ prompts" },
              { icon: "📊", name: "Data Analytics", count: "25+ prompts" },
              { icon: "🎓", name: "Education", count: "20+ prompts" },
              { icon: "🏠", name: "Real Estate", count: "25+ prompts" },
              { icon: "📝", name: "Content & SEO", count: "110+ prompts" },
            ].map(cat => (
              <Link key={cat.name} href={`/playbooks?cat=${encodeURIComponent(cat.name)}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", textDecoration: "none", transition: "all 0.15s" }}>
                <span style={{ fontSize: 22 }}>{cat.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0a1628" }}>{cat.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{cat.count}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Featured playbooks — dynamic from catalog */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 48 }}>
            {[
              { icon: "🔥", name: "Ultimate Sales Copy Pack", prompts: 50, price: 29, original: 49, badge: "BEST SELLER", color: "#ef4444" },
              { icon: "⚖️", name: "Legal Document Vault", prompts: 30, price: 39, original: 79, badge: "HIGH VALUE", color: "#7c3aed" },
              { icon: "👔", name: "Career Accelerator Pack", prompts: 30, price: 19, original: 34, badge: "POPULAR", color: "#0284c7" },
            ].map(p => (
              <div key={p.name} className="card" style={{ padding: 24, position: "relative" }}>
                {p.badge && <div style={{ position: "absolute", top: 12, right: 12, background: `${p.color}15`, color: p.color, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, letterSpacing: "0.3px" }}>{p.badge}</div>}
                <div style={{ fontSize: 32, marginBottom: 12 }}>{p.icon}</div>
                <h4 style={{ fontSize: 17, fontWeight: 800, color: "#0a1628", marginBottom: 6 }}>{p.name}</h4>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>{p.prompts} prompts · PDF download · Works with ChatGPT, Claude, Gemini</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: "#16a34a", fontFamily: "Sora, sans-serif" }}>Free</span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>· instant PDF download</span>
                </div>
                <Link href="/playbooks" style={{ display: "block", textAlign: "center", padding: "11px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", boxShadow: "0 4px 12px rgba(124,58,237,0.2)" }}>
                  ⬇ Download free
                </Link>
              </div>
            ))}
          </div>

          {/* Mega bundle CTA */}
          <div style={{ background: "linear-gradient(135deg,#7c3aed08,#0284c708)", borderRadius: 20, padding: "40px 48px", border: "2px solid rgba(124,58,237,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6 }}>{t("landing.bundle.bestvalue")}</span>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", marginBottom: 6 }}>{t("landing.playbooks.megatitle")}</h3>
              <p style={{ color: "#475569", fontSize: 15 }}>{t("landing.playbooks.megasubtitle")}</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 34, fontWeight: 900, color: "#16a34a", fontFamily: "Sora, sans-serif" }}>Free</span>
                <span style={{ fontSize: 14, color: "#94a3b8" }}>· all packs</span>
              </div>
              <Link href="/playbooks" style={{ display: "inline-block", padding: "13px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none", background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}>
                {t("landing.playbooks.megacta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CUSTOMER REVIEWS (real, moderated; renders nothing if none) ── */}
      <ReviewsSection />

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section id="faq" style={{ background: "linear-gradient(160deg, #f0f9ff, #ecfdf5)", padding: "100px 24px", borderTop: "1px solid rgba(2,132,199,0.08)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 className="font-display" style={{ fontSize: 38, fontWeight: 800, color: "#0a1628", letterSpacing: "-1px", marginBottom: 12 }}>{t("faq.title")}</h2>
            <p style={{ color: "#64748b", fontSize: 16 }}>{t("landing.faq.subtitle")}</p>
          </div>
          {[1, 2, 3, 4, 5, 6, 7].map(n => ({ q: t(`landing.faq.q${n}`), a: t(`landing.faq.a${n}`) })).map((item, i: number) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", marginBottom: 14, border: "1px solid rgba(2,132,199,0.1)", boxShadow: "0 2px 8px rgba(2,132,199,0.06)" }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: "#0a1628", marginBottom: 10 }}>{item.q}</h4>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.75 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── VAULT PRICING ─────────────────────────────────────────── */}
      {/* ── WHAT YOU GET — Delivery & Packaging ──────────────────── */}
      <section id="delivery" style={{ padding: "100px 24px", background: "linear-gradient(160deg,#f8fafc,#f1f5f9)", borderTop: "1px solid rgba(2,132,199,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 16 }}>{t("landing.delivery.eyebrow")}</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1px", marginBottom: 14 }}>
              {t("landing.delivery.title1")}<br /><span className="gradient-text">{t("landing.delivery.title2")}</span>
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 640, margin: "0 auto", lineHeight: 1.7 }}>
              {t("landing.delivery.subtitle")}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 48 }}>
            {[
              { icon: "🐳", title: t("landing.delivery.c1t"), desc: t("landing.delivery.c1d"), tag: "docker compose up -d" },
              { icon: "🪟", title: t("landing.delivery.c2t"), desc: t("landing.delivery.c2d"), tag: "🚧 In development — not yet available" },
              { icon: "📖", title: t("landing.delivery.c3t"), desc: t("landing.delivery.c3d"), tag: "axto.io/guide → Download PDF" },
              { icon: "🔑", title: t("landing.delivery.c4t"), desc: t("landing.delivery.c4d"), tag: "VAULT-A1B2-C3D4-E5F6-G7H8..." },
              { icon: "🆓", title: t("landing.delivery.c5t"), desc: t("landing.delivery.c5d"), tag: "Register → Select Trial → Instant activation" },
              { icon: "🔄", title: t("landing.delivery.c6t"), desc: t("landing.delivery.c6d"), tag: "docker pull :latest → restart" },
            ].map(item => (
              <div key={item.title} className="card" style={{ padding: 28 }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 14 }}>{item.desc}</p>
                <code style={{ fontSize: 11, color: "#0284c7", background: "rgba(2,132,199,0.06)", padding: "6px 10px", borderRadius: 6, display: "block", wordBreak: "break-all" }}>{item.tag}</code>
              </div>
            ))}
          </div>

          {/* License enforcement notice */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 40px", border: "1px solid rgba(2,132,199,0.12)", display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ fontSize: 36 }}>🔒</div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>{t("landing.delivery.enforce_title")}</h3>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
                {t("landing.delivery.enforce_body")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRIAL CTA BANNER ─────────────────────────────────────── */}
      <section style={{ padding: "60px 24px", background: "linear-gradient(135deg,#0284c7,#0d9488)", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, color: "#fff", marginBottom: 14, letterSpacing: "-0.5px" }}>
            Start today — every app, free to download
          </h2>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, lineHeight: 1.7, marginBottom: 28, maxWidth: 560, margin: "0 auto 28px" }}>
            No licence, no card, no trial clock. Full access to the whole platform for one year — pick an app and deploy.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {["Guardian","Orchestra","Vault","Edge","SOC","Compliance","Sentinel","Antivirus"].map(p => {
              const product = p.toLowerCase();
              const forSale = isProductForSale(product);
              if (!forSale) {
                return (
                  <span key={p} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 700 }}>
                    {p} — {t("landing.trial.comingsoon")}
                  </span>
                );
              }
              return (
                <Link key={p} href={`/portal/downloads?product=${product}`} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", transition: "all 0.15s", backdropFilter: "blur(4px)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span>⬇</span> {p}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 18 }}>
            {t("landing.cta.title1")}<br />
            <span className="gradient-text">{t("landing.cta.title2")}</span>
          </h2>
          <p style={{ color: "#475569", fontSize: 17, lineHeight: 1.7, marginBottom: 40 }}>
            {t("landing.cta.subtitle")}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/portal/downloads" className="btn-primary" style={{ fontSize: 16, padding: "15px 36px", display: "inline-flex", alignItems: "center", gap: 9 }}><span style={{ fontSize: 18 }}>⬇</span> Download Free</Link>
            <a href="mailto:hello@axto.io" className="btn-secondary" style={{ fontSize: 16, padding: "15px 36px" }}>{t("landing.cta.contact")}</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer style={{ background: "#0a1628", color: "#94a3b8", padding: "56px 24px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡</div>
                <span style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "Sora, sans-serif" }}>AXTO</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>{t("landing.footer.tagline")}</p>
              <p style={{ fontSize: 13, marginTop: 16 }}>✉ hello@axto.io</p>
            </div>
            <div>
              <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{t("landing.footer.products")}</h4>
              {[["Guardian AI","guardian"],["Orchestra AI","orchestra"],["Vault","vault"],["Edge","edge"],["SOC","soc"],["Compliance","compliance"],["Sentinel","sentinel"],["Legal","legal"],["Antivirus","antivirus"],["Studio","studio"]].map(([l,slug]) => <div key={l} style={{ marginBottom: 10 }}><Link href={`/products/${slug}`} style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>{l}</Link></div>)}
            </div>
            <div>
              <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{t("landing.footer.resources")}</h4>
              {[[t("landing.footer.setupguide"),"/guide"],[t("landing.footer.playbooks"),"/playbooks"],["Become a Reseller","/reseller/register"],["Acquire AXTO","/acquire"],[t("landing.footer.tos"),"/terms"],[t("landing.footer.privacy"),"/privacy"]].map(([l,h]) => <div key={l} style={{ marginBottom: 10 }}><Link href={h} style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>{l}</Link></div>)}
            </div>
            <div>
              <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{t("landing.footer.legal")}</h4>
              {[[t("landing.footer.tos"),"/terms"],[t("landing.footer.privacy"),"/privacy"],[t("landing.footer.security"),"/privacy"]].map(([l,h]) => <div key={l} style={{ marginBottom: 10 }}><Link href={h} style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>{l}</Link></div>)}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#334155" }}>
            <span>© {new Date().getFullYear()} {t("landing.footer.copyright")}</span>
            <span style={{ color: "#0284c7" }}>{t("landing.footer.byoktag")}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
