/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { PACKAGE_INFO, isProductForSale } from "@/lib/stripe";
import ReviewsSection from "@/components/ReviewsSection";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

// ── Updated pricing (USD, market-competitive, BYOK premium) ─────────────
const GUARDIAN_PRICING = [
  {
    name: "Sentinel",
    code: "lite",
    price: 990,
    period: "/year",
    servers: "1 server",
    desc: "Deploy enterprise-grade AI threat detection on your most critical server — from a home lab to a production workload. Your keys, your infrastructure, absolute privacy.",
    features: ["7-Layer AI Behavioral Analysis","Real-time Global Threat Intelligence","Automated Quarantine & Kill","Built-in ClamAV Antivirus Engine","Email, Slack & Discord Alerts","Self-Learning Malware Detection"],
    popular: false,
    color: "#0284c7",
  },
  {
    name: "Professional",
    code: "pro",
    price: 4990,
    period: "/year",
    servers: "Up to 25 servers",
    desc: "Complete infrastructure visibility with AI-powered threat hunting. From a startup rack to a growing enterprise — compliance-ready, self-hosted, BYOK.",
    features: ["Everything in Sentinel","AI Threat Hunting & UEBA Analytics","Multi-Server Central Command","SOC 2, ISO 27001, HIPAA, PCI-DSS Reports","SIEM Forwarding (Splunk, ELK, Datadog)","Standalone Antivirus with REST API"],
    popular: true,
    color: "#0284c7",
  },
  {
    name: "Business",
    code: "shield",
    price: 19900,
    period: "/year",
    servers: "Up to 100 servers",
    desc: "Enterprise-grade kernel-level inspection with eBPF and encrypted node mesh. Zero blind spots. Zero data leaves your network. Zero compromise.",
    features: ["Everything in Professional","eBPF Deep Kernel Inspection","mTLS Encrypted Node Mesh","Rootkit & Memory Forensics","Custom Incident Runbooks","Deception Engine (Honeypots & Decoys)"],
    popular: false,
    color: "#0284c7",
  },
  {
    name: "Enterprise",
    code: "aegis",
    price: 79000,
    period: "/year",
    servers: "Up to 1,000 servers",
    desc: "Global-scale protection for organizations that demand absolute sovereignty. Multi-tenant architecture, white-label ready, custom threat intelligence.",
    features: ["Everything in Business","1,000 Node Global Scale","White-Label Dashboard","Custom Threat Intelligence Feed","Multi-Tenant Architecture","Comprehensive Interactive Setup Guide (10 Languages)"],
    popular: false,
    color: "#7c3aed",
  },
];

const ORCHESTRA_PRICING = [
  {
    name: "Starter",
    code: "orchestra_core",
    price: 34900,
    period: "/year",
    workers: "Up to 10 workers",
    desc: "Route AI workloads across OpenAI, Claude, Gemini, Groq, DeepSeek & 15+ providers with intelligent cost optimization. Your API keys, your control.",
    features: ["CPU & GPU Auto-Detect Workers","Smart Routing (5 Strategies)","OpenAI, Claude, Gemini, Groq, Ollama","Cost Optimization & Budget Caps","Real-time Analytics Dashboard","OpenAI-Compatible Drop-in API"],
    popular: false,
  },
  {
    name: "Professional",
    code: "orchestra_scale",
    price: 89900,
    period: "/year",
    workers: "Up to 50 workers",
    desc: "Scale AI operations across multiple teams with advanced failover, autoscaling, and cost analytics. Built for organizations that run AI at the core of their business.",
    features: ["Everything in Starter","All 6 Routing Strategies","Priority Job Queue & Dead Letter","Autoscaler (scale-to-zero capable)","Federated Multi-Region Support","Custom Provider Endpoints"],
    popular: true,
  },
  {
    name: "Enterprise",
    code: "orchestra_unlimited",
    price: 249000,
    period: "/year",
    workers: "Unlimited workers",
    desc: "Unlimited scale. Full sovereignty. White-label ready. For enterprises that demand absolute control over their AI infrastructure.",
    features: ["Everything in Professional","Unlimited Workers (CPU + GPU)","White-Label API Gateway","Custom Routing Logic","Credential Vault & Rotation","Comprehensive Interactive Setup Guide (10 Languages)"],
    popular: false,
  },
];

const BUNDLE_PRICING = [
  {
    name: "Starter Bundle",
    code: "bundle_starter",
    guardian: "Guardian Professional",
    orchestra: "Orchestra Starter",
    originalPrice: 4990 + 34900,
    bundlePrice: 33900,
    savings: 4990 + 34900 - 33900,
    color: "#0284c7",
    highlight: false,
  },
  {
    name: "Professional Bundle",
    code: "bundle_professional",
    guardian: "Guardian Business",
    orchestra: "Orchestra Professional",
    originalPrice: 19900 + 89900,
    bundlePrice: 93300,
    savings: 19900 + 89900 - 93300,
    color: "#0d9488",
    highlight: true,
  },
  {
    name: "Enterprise Bundle",
    code: "bundle_enterprise",
    guardian: "Guardian Enterprise",
    orchestra: "Orchestra Enterprise",
    originalPrice: 79000 + 249000,
    bundlePrice: 278800,
    savings: 79000 + 249000 - 278800,
    color: "#7c3aed",
    highlight: false,
  },
];

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", "@id": `${APP_URL}/#org`, name: "AXTO", url: APP_URL,
      email: "hallo@axto.io",
      description: "AI eXecution & Tools Orchestration. 100% BYOK — your keys, your data, your infrastructure.",
    },
    {
      "@type": "SoftwareApplication", name: "Guardian AI",
      applicationCategory: "SecurityApplication", operatingSystem: "Linux",
      offers: GUARDIAN_PRICING.map(p => ({ "@type": "Offer", name: `Guardian ${p.name}`, price: String(p.price), priceCurrency: "USD", billingDuration: "P1Y" })),
      description: "Guardian AI — self-hosted threat detection, automated incident response, and compliance reporting.",
      provider: { "@id": `${APP_URL}/#org` },
    },
    {
      "@type": "SoftwareApplication", name: "Orchestra AI",
      applicationCategory: "DeveloperApplication", operatingSystem: "Linux",
      offers: ORCHESTRA_PRICING.map(p => ({ "@type": "Offer", name: `Orchestra ${p.name}`, price: String(p.price), priceCurrency: "USD", billingDuration: "P1Y" })),
      description: "Self-hosted AI workflow orchestration. Route jobs across GPU clusters and multiple LLM providers with your own API keys.",
      provider: { "@id": `${APP_URL}/#org` },
    },
  ],
};

// ── Coming Soon / Buy Button helper ─────────────────────────────────────
function LocalPriceTag({ usd, period }: { usd: number; period?: string }) {
  const { currency, fmtPrice } = useLocale();
  if (currency === "USD" || usd === 0) return null;
  return (
    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
      ≈ {fmtPrice(usd)}{period || ""}
    </div>
  );
}

/** Reusable price display: shows USD price with local currency subtitle */
function PriceDisplay({ usd, period, color }: { usd: number; period?: string; color?: string }) {
  return (
    <>
      <div className="price-tag" style={{ marginBottom: 2, color: color || "#0a1628" }}>
        <sup>$</sup>{usd.toLocaleString("en-US")}
      </div>
      <LocalPriceTag usd={usd} period={period || "/yr"} />
    </>
  );
}

function ProductBuyButton({ code, popular, color, label }: { code: string; popular?: boolean; color: string; label?: string }) {
  const forSale = (PACKAGE_INFO[code]?.forSale !== false);
  if (!forSale) {
    return (
      <div style={{ display: "block", textAlign: "center", padding: "14px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1.5px solid rgba(148,163,184,0.2)", cursor: "not-allowed", position: "relative" }}>
        🔜 Coming Soon
      </div>
    );
  }
  return (
    <Link href={`/register?pkg=${code}`} style={{ display: "block", textAlign: "center", padding: "14px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", background: popular ? `linear-gradient(135deg,${color},${color}cc)` : "transparent", color: popular ? "#fff" : color, border: popular ? "none" : `1.5px solid ${color}`, boxShadow: popular ? `0 4px 20px ${color}40` : "none" }}>
      {label || "Get Started"}
    </Link>
  );
}

function ComingSoonBanner({ product, color }: { product: string; color: string }) {
  if (isProductForSale(product)) return null;
  return (
    <div style={{ textAlign: "center", marginBottom: 24, padding: "12px 20px", borderRadius: 12, background: `${color}08`, border: `1.5px dashed ${color}40`, display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 20 }}>🔜</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>Coming Soon — Not Yet Available for Purchase</span>
    </div>
  );
}

// ── Inline SVG animations ───────────────────────────────────────────────

export default function HomePage() {
  const { t, fmtPrice, locale, setLocale, currency, fxRate, fxSymbol } = useLocale();

  // Legacy compat - same function name, uses context
  const fmtUSD = fmtPrice;

  const [navOpen, setNavOpen] = useState(false);

  // Lock background scroll while the mobile nav drawer is open.
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [navOpen]);

  // Shared nav links — rendered in both the desktop bar and the mobile drawer.
  const NAV_LINKS: [string, string][] = [
    ["#products","Products"],["#pricing","Bundles"],["#playbooks","Playbooks"],["#byok","BYOK"],["#faq","FAQ"],["/guide","📖 Guide"],
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
              Register
            </Link>
            <Link href="/auth/login" className="btn-primary" style={{ padding: "9px 22px", fontSize: 14, marginLeft: 4 }}>
              Client Portal →
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
            Register
          </Link>
          <Link href="/auth/login" onClick={()=>setNavOpen(false)} className="btn-primary" style={{ textAlign: "center", padding: "13px 18px", fontSize: 15, justifyContent: "center" }}>
            Client Portal →
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
            AI eXecution & Tools Orchestration<br />
            <span className="gradient-text">You Own & Control</span>
          </h1>

          <p className="animate-fade-up delay-200" style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#334155", lineHeight: 1.7, maxWidth: 700, margin: "0 auto 40px" }}>
            Secure your servers and run every AI model in one place — fully self-hosted, so your
            keys and data <strong style={{ color: "#0284c7" }}>never leave your own infrastructure.</strong>
          </p>

          <div className="animate-fade-up delay-300" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
            <a href="#pricing" className="btn-primary" style={{ fontSize: 16, padding: "15px 36px" }}>Explore Plans →</a>
            <a href="#products" className="btn-secondary" style={{ fontSize: 16, padding: "15px 36px" }}>See How It Works</a>
          </div>

          {/* Stats row */}
          <div className="animate-fade-up delay-400" style={{ display: "flex", gap: 0, justifyContent: "center", flexWrap: "wrap", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(2,132,199,0.12)", borderRadius: 20, padding: "24px 8px", maxWidth: 720, margin: "0 auto", boxShadow: "0 4px 24px rgba(2,132,199,0.08)" }}>
            {[
              { value: "100%", label: "BYOK — Your Keys Only", icon: "🔑" },
              { value: "0 bytes", label: "Data Sent to AXTO", icon: "🛡️" },
              { value: "< 30 min", label: "Deployment Time", icon: "⚡" },
              { value: "10 products", label: "Complete Platform", icon: "📈" },
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
            <div style={{ display: "inline-block", fontSize: 12.5, fontWeight: 800, letterSpacing: 1.5, color: "#0284c7", textTransform: "uppercase", marginBottom: 14 }}>The Products</div>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 16, fontFamily: "Sora, sans-serif", lineHeight: 1.1 }}>
              Ten AI products. <span className="gradient-text">One sovereign platform.</span>
            </h2>
            <p style={{ fontSize: 16.5, color: "#475569", lineHeight: 1.65 }}>
              Every product is self-hosted via Docker and bring-your-own-key. Your servers, your keys, your data — nothing leaves your network. <strong>Click any product</strong> to see plans.
            </p>
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
              const prices = Object.values(PACKAGE_INFO).filter((pk: any) => pk.product === p.product && !pk.isTrial && pk.price > 0).map((pk: any) => pk.price);
              const from = prices.length ? Math.min(...prices) : 0;
              return (
                <Link key={p.product} href={`/products/${p.product}`} className="card" style={{ position: "relative", padding: "24px 22px", display: "flex", flexDirection: "column", gap: 12, textDecoration: "none", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${p.color}, ${p.color}55)` }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 13, background: `linear-gradient(135deg, ${p.color}18, ${p.color}0a)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{p.icon}</div>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: p.color, background: `${p.color}12`, padding: "4px 10px", borderRadius: 999 }}>{p.badge}</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0a1628", letterSpacing: "-0.4px", margin: 0, fontFamily: "Sora, sans-serif" }}>{p.name}</h3>
                  <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.55, margin: 0, flex: 1 }}>{p.tag}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                    {available ? (
                      <span style={{ fontSize: 13, color: "#0a1628", fontWeight: 700 }}>from <span style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 900 }}>${from.toLocaleString()}</span><span style={{ color: "#94a3b8", fontWeight: 500 }}>/yr</span></span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#b45309", background: "rgba(245,158,11,0.1)", padding: "4px 10px", borderRadius: 999 }}>🔜 Coming soon</span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 800, color: p.color }}>{available ? "View plans →" : "Notify me →"}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 40 }}>
            <Link href="/register" className="btn-primary">▶ Start Free Trial — 7 Days</Link>
            <a href="#pricing" className="btn-secondary">Compare all pricing ↓</a>
          </div>
        </div>
      </section>

      {/* ── GUARDIAN FEATURES ─────────────────────────────────────── */}

      {/* ── BYOK SECTION ──────────────────────────────────────────── */}
      {/* ── STATS & TRUST BAR ──────────────────────────────────────────── */}
      <section style={{ background: "#0a1628", padding: "44px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 32, textAlign: "center" }}>
          {[
            { stat: "12", label: "Security Products", icon: "🛡️" },
            { stat: "40+", label: "Pricing Tiers", icon: "💰" },
            { stat: "100%", label: "Self-Hosted", icon: "🏠" },
            { stat: "0 bytes", label: "Data to AXTO", icon: "🔒" },
            { stat: "10", label: "Guide Languages", icon: "🌍" },
            { stat: "$0", label: "Cloud AI Fees", icon: "⚡" },
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
            <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 16 }}>WHY AXTO</span>
            <h2 className="font-display" style={{ fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 900, color: "#0a1628", letterSpacing: "-1px", marginBottom: 14 }}>
              One Platform. Fully Yours.
            </h2>
            <p style={{ color: "#475569", fontSize: 16, maxWidth: 620, margin: "0 auto" }}>
              Replace a stack of disconnected tools with a single self-hosted platform — clear, predictable pricing and complete ownership of your data.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
            {[
              { icon: "🏠", title: "100% Self-Hosted", body: "Runs entirely on your own servers. Your data never leaves your infrastructure — no third-party custody." },
              { icon: "🧩", title: "One Unified Platform", body: "Endpoint security, AI orchestration, privacy and compliance — consolidated into a single platform instead of a dozen separate tools." },
              { icon: "💎", title: "Transparent Pricing", body: "Straightforward annual or lifetime licenses. No per-request cloud fees, no hidden usage bills, no surprises." },
              { icon: "🔓", title: "No Lock-In", body: "Open standards and OpenAI-compatible APIs. Keep full ownership of your data and leave whenever you choose." },
            ].map((c) => (
              <div key={c.title} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "28px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{c.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{c.body}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 28, fontSize: 13, color: "#64748b" }}>
            Self-hosted by design — zero per-request cloud fees, zero data custody, zero lock-in.{" "}
            <a href="mailto:hallo@axto.io" style={{ color: "#0284c7", textDecoration: "none", fontWeight: 600 }}>Talk to us about enterprise plans →</a>
          </p>
        </div>
      </section>

      <section id="byok" style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%)", padding: "100px 24px", borderTop: "1px solid rgba(2,132,199,0.08)", borderBottom: "1px solid rgba(2,132,199,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div>
              <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 20 }}>
                🔑 BYOK — BRING YOUR OWN KEYS
              </span>
              <h2 className="font-display" style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 800, color: "#0a1628", lineHeight: 1.15, letterSpacing: "-1px", marginBottom: 20 }}>
                Your Credentials.<br />
                <span className="gradient-text">Never Leave Your Server.</span>
              </h2>
              <p style={{ color: "#475569", fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
                AXTO operates on a strict architectural principle: <strong style={{ color: "#0a1628" }}>zero data custody.</strong> Your AI provider API keys, server telemetry, and operational data are stored exclusively within your own infrastructure. AXTO's only contact with your environment is a lightweight, periodic license heartbeat — nothing more.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: "🔐", text: "API keys stored in your config file — never transmitted" },
                  { icon: "🏗️", text: "Deploy on your VPS, bare metal, or private cloud" },
                  { icon: "📡", text: "License validation sends only a machine fingerprint hash" },
                  { icon: "🕵️", text: "AXTO has zero visibility into your AI queries or responses" },
                  { icon: "✅", text: "Fully auditable — open architecture, no hidden callbacks" },
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
                  { icon: "🔒", label: "E2E Encrypted", sub: "All comms over TLS 1.3" },
                  { icon: "🏠", label: "Self-Hosted", sub: "Your server, your rules" },
                  { icon: "📋", label: "Auditable", sub: "Open architecture" },
                  { icon: "🚫", label: "No Tracking", sub: "Zero telemetry to AXTO" },
                ].map(t => (
                  <div key={t.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(2,132,199,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0a1628" }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{t.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 16 }}>BUNDLES · USD</span>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
            Bundle & Save
          </h2>
          <p style={{ color: "#475569", fontSize: 17, maxWidth: 560, margin: "0 auto" }}>
            Deploy Guardian and Orchestra together at a significant discount over buying separately.
          </p>
        </div>



        {/* Bundle Pricing */}
        <div style={{ background: "linear-gradient(135deg, #f8faff, #f0fdfa)", borderRadius: 24, padding: "48px 40px", border: "1px solid rgba(2,132,199,0.12)" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ display: "inline-block", background: "linear-gradient(135deg,rgba(2,132,199,0.1),rgba(13,148,136,0.1))", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 14 }}>🎁 BUNDLE & SAVE</span>
            <h3 className="font-display" style={{ fontSize: 30, fontWeight: 800, color: "#0a1628", letterSpacing: "-0.7px", marginBottom: 10 }}>Guardian + Orchestra Combined</h3>
            <p style={{ color: "#475569", fontSize: 15 }}>Deploy both products together at a significant discount.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {BUNDLE_PRICING.map((b) => (
              <div key={b.name} className="card" style={{
                padding: 28, position: "relative", overflow: "hidden",
                border: b.highlight ? `2px solid ${b.color}` : "1px solid rgba(2,132,199,0.12)",
                background: b.highlight ? `linear-gradient(160deg, ${b.color}08, ${b.color}04)` : "#fff",
              }}>
                {b.highlight && <div style={{ position: "absolute", top: 0, right: 0, background: `linear-gradient(135deg,${b.color},#0284c7)`, color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: "0 0 0 12px", letterSpacing: "0.5px" }}>BEST VALUE</div>}
                <h4 style={{ fontSize: 18, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>{b.name}</h4>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ background: "rgba(2,132,199,0.08)", color: "#0284c7", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>🛡 {b.guardian}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <span style={{ background: "rgba(13,148,136,0.08)", color: "#0d9488", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>🎼 {b.orchestra}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                  <div className="price-tag" style={{ color: "#0a1628" }}><sup>$</sup>{b.bundlePrice.toLocaleString("en-US")}</div>
                  <span style={{ fontSize: 13, color: "#94a3b8", textDecoration: "line-through" }}>{fmtUSD(b.originalPrice)}</span>
                </div>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>per year · billed annually</p>
                <div style={{ background: `${b.color}10`, border: `1px solid ${b.color}25`, borderRadius: 8, padding: "8px 12px", marginBottom: 20 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: b.color }}>Save {fmtUSD(b.savings)}/year</span>
                </div>
                <Link href={`/register?pkg=${b.code}`} style={{
                  display: "block", textAlign: "center", padding: "12px 16px", borderRadius: 10,
                  fontWeight: 700, fontSize: 14, textDecoration: "none",
                  background: b.highlight ? `linear-gradient(135deg, ${b.color}, #0d9488)` : "transparent",
                  color: b.highlight ? "#fff" : b.color,
                  border: b.highlight ? "none" : `1.5px solid ${b.color}`,
                  boxShadow: b.highlight ? `0 4px 16px ${b.color}40` : "none",
                }}>
                  Get Bundle
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLAYBOOKS ──────────────────────────────────────────── */}
      <section id="playbooks" style={{ padding: "100px 24px", background: "#fff", borderTop: "1px solid rgba(2,132,199,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#7c3aed", fontWeight: 700, marginBottom: 16 }}>📦 NEW — AXTO PLAYBOOKS</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
              AI Prompt Playbooks
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 620, margin: "0 auto", lineHeight: 1.7 }}>
              Ready-to-use prompt collections for ChatGPT, Claude, and Gemini.
              Crafted by professionals, tested across 100+ real projects. Download and use instantly.
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
                  <span style={{ fontSize: 28, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>${p.price}</span>
                  <span style={{ fontSize: 14, color: "#94a3b8", textDecoration: "line-through" }}>${p.original}</span>
                </div>
                <Link href="/playbooks" style={{ display: "block", textAlign: "center", padding: "11px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", boxShadow: "0 4px 12px rgba(124,58,237,0.2)" }}>
                  Get Playbook →
                </Link>
              </div>
            ))}
          </div>

          {/* Mega bundle CTA */}
          <div style={{ background: "linear-gradient(135deg,#7c3aed08,#0284c708)", borderRadius: 20, padding: "40px 48px", border: "2px solid rgba(124,58,237,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6 }}>BEST VALUE</span>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", marginBottom: 6 }}>Mega Bundle — All Access</h3>
              <p style={{ color: "#475569", fontSize: 15 }}>Every playbook in our catalog. 400+ prompts. Lifetime access.</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: "#7c3aed", fontFamily: "Sora, sans-serif" }}>$99</span>
                <span style={{ fontSize: 16, color: "#94a3b8", textDecoration: "line-through" }}>$290</span>
              </div>
              <Link href="/playbooks" style={{ display: "inline-block", padding: "13px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none", background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}>
                Get All Playbooks →
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
            <p style={{ color: "#64748b", fontSize: 16 }}>Everything you need to know before you deploy</p>
          </div>
          {(({
            en:[
              { q:"Does AXTO have access to my server data or AI responses?", a:"Absolutely not. Guardian and Orchestra are fully self-hosted on your infrastructure. AXTO only validates your license — we never see or store your data, API keys, or AI responses." },
              { q:"What does BYOK (Bring Your Own Keys) mean?", a:"Your AI provider credentials (OpenAI, Anthropic, etc.) are stored on your server. Orchestra reads them locally. AXTO has no copy of your keys." },
              { q:"How long does initial setup take?", a:"Under 30 minutes. Download ZIP from portal → run install.sh → open browser → enter license key. Admin dashboard is live immediately." },
              { q:"Can I run Guardian and Orchestra on the same server?", a:"Yes. Both products run as separate Docker Compose stacks on the same host. For large deployments, separate hosts are recommended." },
              { q:"Is there a free trial?", a:"Yes. Every product offers a free 7-day trial — core features, capability-limited (no API, watermarked exports), locked to one server/IP. Register at axto.io, select any Trial plan, and your license key is delivered instantly. One trial per product per email. No credit card required." },
              { q:"What happens if my license expires?", a:"Products continue in read-only mode for a 7-day grace period. Automated renewal reminders sent at 30, 14, and 3 days before expiry." },
            ],
            id:[
              { q:"Apakah AXTO bisa mengakses data server saya?", a:"Tidak sama sekali. Guardian dan Orchestra berjalan 100% di server Anda. AXTO hanya memvalidasi lisensi — kami tidak pernah melihat atau menyimpan data, API key, atau respons AI Anda." },
              { q:"Apa itu BYOK?", a:"Bring Your Own Keys — API key AI Anda (OpenAI, Anthropic, dll) disimpan di server Anda sendiri. Orchestra membacanya secara lokal. AXTO tidak punya salinan key Anda." },
              { q:"Berapa lama setup awal?", a:"Di bawah 30 menit. Download ZIP dari portal → jalankan install.sh → buka browser → masukkan license key. Dashboard admin langsung aktif." },
              { q:"Bisakah Guardian dan Orchestra di server yang sama?", a:"Ya. Keduanya berjalan sebagai Docker Compose stack terpisah di host yang sama. Untuk deployment skala besar, server terpisah lebih disarankan." },
              { q:"Apakah ada trial gratis?", a:"Ya. Setiap produk menawarkan trial gratis 3 hari — fitur lengkap, kapasitas terbatas, terkunci ke 1 server/IP. Daftar di axto.io, pilih paket Trial, dan license key langsung dikirim. Satu trial per produk per email. Tanpa kartu kredit." },
              { q:"Apa yang terjadi jika lisensi kedaluwarsa?", a:"Produk terus beroperasi dalam mode read-only selama 7 hari. Pengingat pembaruan dikirim 30, 14, dan 3 hari sebelum kedaluwarsa." },
            ],
            zh:[
              { q:"AXTO能访问我的服务器数据吗？", a:"绝对不会。Guardian和Orchestra完全在您的服务器上运行。AXTO只验证您的许可证——我们从不查看或存储您的数据。" },
              { q:"BYOK是什么意思？", a:"自带密钥——您的AI提供商凭证存储在您的服务器上。AXTO无法访问您的密钥。" },
              { q:"初始设置需要多长时间？", a:"30分钟以内。从门户下载ZIP → 运行install.sh → 打开浏览器 → 输入许可证密钥。" },
              { q:"有免费试用吗？", a:"有！可直接从管理面板申请1-7天试用许可证。所有付费计划享有30天满意保证。" },
              { q:"许可证到期后会怎样？", a:"产品在7天宽限期内以只读模式运行。到期前30、14和3天发送续期提醒。" },
            ],
            ar:[
              { q:"هل تصل AXTO إلى بيانات خادمي؟", a:"لا على الإطلاق. يعمل Guardian وOrchestra بنسبة 100٪ على خوادمك. AXTO تتحقق فقط من الترخيص — نحن لا نرى بياناتك أبدًا." },
              { q:"ما معنى BYOK؟", a:"أحضر مفاتيحك الخاصة — يتم تخزين بيانات اعتماد AI الخاصة بك على خادمك. لا تملك AXTO نسخة من مفاتيحك." },
              { q:"كم يستغرق الإعداد الأولي؟", a:"أقل من 30 دقيقة. قم بتنزيل ZIP من البوابة ← شغّل install.sh ← افتح المتصفح ← أدخل مفتاح الترخيص." },
              { q:"هل هناك تجربة مجانية؟", a:"نعم! تتوفر تراخيص تجريبية لمدة 1-7 أيام مباشرةً من لوحة المشرف. ضمان الرضا 30 يومًا." },
            ],
          } as Record<string,{q:string;a:string}[]>)[locale as string] || [
              { q:"Does AXTO have access to my server data or AI responses?", a:"Absolutely not. AXTO only validates your license." },
              { q:"What does BYOK mean?", a:"Your AI keys stay on your server. AXTO never has access to them." },
              { q:"How long does setup take?", a:"Under 30 minutes. Download ZIP → install.sh → enter license key in browser." },
            ]).map((item: {q:string;a:string}, i: number) => (
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
            <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 16 }}>📦 WHAT YOU GET</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1px", marginBottom: 14 }}>
              Every License Includes<br /><span className="gradient-text">Docker Image + Windows EXE</span>
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 640, margin: "0 auto", lineHeight: 1.7 }}>
              Purchase any plan — from Starter to Enterprise — and receive the complete product package. No feature gates hidden behind upsells. What your tier includes is exactly what you get.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 48 }}>
            {[
              { icon: "🐳", title: "Docker Image (Linux)", desc: "Production-ready Docker Compose stack. Pull from your private registry, run `docker compose up -d`, and your product is live in under 5 minutes. Includes health checks, auto-restart, and log rotation.", tag: "docker compose up -d" },
              { icon: "💻", title: "Windows EXE (Portable)", desc: "Single-file PyInstaller executable. No Python installation required. Double-click to run. Ideal for Windows Server environments, air-gapped networks, and quick evaluation.", tag: "axto-vault.exe --port 8080" },
              { icon: "📖", title: "Interactive Setup Guide", desc: "Step-by-step guide in 10 languages (EN, ID, AR, ZH, FR, DE, ES, PT, RU, JA). Covers installation, configuration, AI provider setup, and production hardening. Downloadable as PDF.", tag: "axto.io/guide → Download PDF" },
              { icon: "🔑", title: "License Key (Instant)", desc: "Delivered to your email within 60 seconds of purchase. Locked to 1 server (machine-id + IP). Enter in YAML config, restart, and your product activates immediately.", tag: "VAULT-A1B2-C3D4-E5F6-G7H8..." },
              { icon: "🆓", title: "7-Day Free Trial", desc: "Every product offers a free 7-day trial — core features, capability-limited (no API, watermarked exports), locked to one server. No credit card required. One trial per product per email address.", tag: "Register → Select Trial → Instant activation" },
              { icon: "🔄", title: "All Updates Included", desc: "Your annual license includes every update released during the license period. New features, security patches, and performance improvements — all included at no extra cost.", tag: "docker pull :latest → restart" },
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
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>License Enforcement</h3>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
                Each license key is cryptographically bound to a single machine (machine-id + IP address + instance). License validation occurs every 30 minutes with a 4-hour offline grace period. Attempting to run on multiple servers or share keys will result in automatic suspension. This ensures every client receives the full value of their investment without unfair usage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRIAL CTA BANNER ─────────────────────────────────────── */}
      <section style={{ padding: "60px 24px", background: "linear-gradient(135deg,#0284c7,#0d9488)", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, color: "#fff", marginBottom: 14, letterSpacing: "-0.5px" }}>
            Try Any Product Free for 7 Days
          </h2>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, lineHeight: 1.7, marginBottom: 28, maxWidth: 560, margin: "0 auto 28px" }}>
            Core features. No credit card. One click to activate. Experience the AXTO platform on your own infrastructure before you commit.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {["Guardian","Orchestra","Vault","Edge","SOC","Compliance","Sentinel","Antivirus"].map(p => {
              const product = p.toLowerCase();
              const forSale = isProductForSale(product);
              if (!forSale) {
                return (
                  <span key={p} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 700 }}>
                    {p} — Coming Soon
                  </span>
                );
              }
              return (
                <Link key={p} href={`/register?pkg=trial_${product}`} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", transition: "all 0.15s", backdropFilter: "blur(4px)" }}>
                  {p} Trial →
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
            Ready to Take Control of<br />
            <span className="gradient-text">Your AI Infrastructure?</span>
          </h2>
          <p style={{ color: "#475569", fontSize: 17, lineHeight: 1.7, marginBottom: 40 }}>
            Deploy in under 30 minutes. No vendor lock-in. No data sharing. Just powerful, enterprise-grade AI infrastructure — fully under your control.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#pricing" className="btn-primary" style={{ fontSize: 16, padding: "15px 36px" }}>{t("hero.cta")}</a>
            <a href="mailto:hallo@axto.io" className="btn-secondary" style={{ fontSize: 16, padding: "15px 36px" }}>Contact Us</a>
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
              <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>AI eXecution & Tools Orchestration that you own, control, and deploy on your own servers. Zero data custody. 100% BYOK.</p>
              <p style={{ fontSize: 13, marginTop: 16 }}>✉ hallo@axto.io</p>
            </div>
            <div>
              <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Products</h4>
              {[["Guardian AI","guardian"],["Orchestra AI","orchestra"],["Vault","vault"],["Edge","edge"],["SOC","soc"],["Compliance","compliance"],["Sentinel","sentinel"],["Legal","legal"],["Antivirus","antivirus"],["Studio","studio"]].map(([l,slug]) => <div key={l} style={{ marginBottom: 10 }}><Link href={`/products/${slug}`} style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>{l}</Link></div>)}
            </div>
            <div>
              <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Resources</h4>
              {[["Setup Guide","/guide"],["Playbooks","/playbooks"],["Terms of Service","/terms"],["Privacy Policy","/privacy"]].map(([l,h]) => <div key={l} style={{ marginBottom: 10 }}><Link href={h} style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>{l}</Link></div>)}
            </div>
            <div>
              <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Legal</h4>
              {[["Terms of Service","/terms"],["Privacy Policy","/privacy"],["Security","/privacy"]].map(([l,h]) => <div key={l} style={{ marginBottom: 10 }}><Link href={h} style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>{l}</Link></div>)}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#334155" }}>
            <span>© {new Date().getFullYear()} AXTO. All rights reserved. Prices in USD.</span>
            <span style={{ color: "#0284c7" }}>100% BYOK — Your keys never leave your server</span>
          </div>
        </div>
      </footer>
    </>
  );
}
