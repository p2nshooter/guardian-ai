/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Pre-Launch Trial Promo — public marketing page.
 * Explains, honestly and step by step, how the launch-promo trial actually
 * works (register → claim in portal → download → install → activate →
 * explore → decide), what each product does, and the 50% continuation
 * discount. Claiming itself happens inside the authenticated portal
 * (components/TrialPromo.tsx) — this page never promises anything the
 * system can't deliver.
 * ============================================================================ */
"use client";
export const runtime = "edge";
import { useState, useEffect } from "react";
import Link from "next/link";
import { PRODUCT_NAMES, PRODUCT_ICONS } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
const PROMO_URL = `${APP_URL}/promo`;

const PRODUCTS = ["guardian", "orchestra", "vault", "edge", "soc", "compliance", "sentinel", "antivirus", "studio", "legal"] as const;

const PRODUCT_DESC: Record<string, string> = {
  guardian:   "Self-hosted cybersecurity — 7-layer AI detection, antivirus, compliance. BYOK.",
  orchestra:  "Self-hosted AI orchestration — route 15+ providers, GPU auto-detect, autoscale. BYOK.",
  vault:      "AI data privacy — PII/PHI/financial redaction before AI API calls.",
  edge:       "AI API gateway — token metering, rate limiting, prompt firewall.",
  soc:        "AI Security Operations Center — SIEM, SOAR, threat intelligence.",
  compliance: "Automated audit — SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR.",
  sentinel:   "IoT/OT security — device discovery, ICS protocol detection, IEC 62443.",
  antivirus:  "ClamAV + ML behavioral detection — self-hosted endpoint protection.",
  studio:     "Central AI & GPU pool — bring your own API keys, managed inference.",
  legal:      "Self-hosted AI legal intelligence — 30+ jurisdictions, contract analysis, BYOK.",
};

const STEPS = [
  { icon: "📝", title: "Create your account", desc: "Register at axto.io with your email — under a minute, no credit card, no sales call." },
  { icon: "🎁", title: "Open Trial Promo in your portal", desc: "Log in → Portal → Trial Promo tab. Pick the app you want to test (up to 2 apps) and its full Enterprise tier, free for 7 days." },
  { icon: "⚡", title: "Claim it instantly", desc: "Click \"Claim Trial.\" Your license key is issued immediately — no waiting for approval." },
  { icon: "⬇️", title: "Download your app", desc: "Open the Licenses tab, find your new trial license, and download the self-hosted package (Docker — Windows EXE is in development)." },
  { icon: "🖥️", title: "Install in minutes", desc: "Extract the package on your own server, run sudo bash install.sh, then docker compose up -d. Full setup docs sit right next to the download." },
  { icon: "🔑", title: "Activate with your license key", desc: "Open your app's console, paste in the license key from your portal. That's it — you're live on your own infrastructure." },
  { icon: "🚀", title: "Explore, then decide", desc: "Use every feature of the tier you claimed for the full 7 days. Like it? Continuing to a real license for the same product gets you 50% off your first year — applied automatically at checkout." },
];

const STEP_INTERVAL_MS = 4200;

function StepWalkthrough() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive(a => (a + 1) % STEPS.length), STEP_INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused, active]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Step selector rail */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setActive(i)}
            style={{
              width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
              background: i === active ? "linear-gradient(135deg,#0284c7,#0d9488)" : "#fff",
              color: i === active ? "#fff" : "#94a3b8",
              boxShadow: i === active ? "0 4px 12px rgba(2,132,199,0.3)" : "0 1px 3px rgba(0,0,0,0.08)",
              transition: "all 0.2s",
            }}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* Active step card */}
      <div key={active} className="animate-fade-up" style={{ background: "#fff", borderRadius: 20, padding: "32px 36px", border: "1.5px solid #e2e8f0", maxWidth: 640, margin: "0 auto", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: 3, background: "linear-gradient(90deg,#0284c7,#0d9488)", width: "0%" }} className={paused ? "" : "promo-step-bar"} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,rgba(2,132,199,0.1),rgba(13,148,136,0.1))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>{STEPS[active].icon}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0284c7", letterSpacing: "0.5px", textTransform: "uppercase" }}>Step {active + 1} of {STEPS.length}</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#0a1628" }}>{STEPS[active].title}</div>
          </div>
        </div>
        <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.7, margin: 0 }}>{STEPS[active].desc}</p>
      </div>
    </div>
  );
}

const SHARE = (text: string) => ({
  whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${PROMO_URL}`)}`,
  twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(PROMO_URL)}`,
  linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(PROMO_URL)}`,
  facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(PROMO_URL)}`,
  telegram: `https://t.me/share/url?url=${encodeURIComponent(PROMO_URL)}&text=${encodeURIComponent(text)}`,
  email:    `mailto:?subject=${encodeURIComponent("Worth checking out before launch: AXTO free trial")}&body=${encodeURIComponent(`${text}\n\n${PROMO_URL}`)}`,
});

const SHARE_CHANNELS = [
  { key: "whatsapp", icon: "💬", label: "WhatsApp", color: "#25D366",
    text: "AXTO just opened pre-launch trials — I'm testing enterprise-grade AI security & orchestration free for 7 days, no card needed. Grab your own trial before they're gone:" },
  { key: "twitter", icon: "𝕏", label: "X / Twitter", color: "#0a1628",
    text: "AXTO is opening 100 free 7-day Enterprise trials per product before launch. Self-hosted, BYOK, zero cost, zero card. Claiming mine now — grab yours:" },
  { key: "linkedin", icon: "in", label: "LinkedIn", color: "#0A66C2",
    text: "AXTO (axto.io) just opened its pre-launch trial program — 100 free 7-day Enterprise-tier trials per product across cybersecurity, AI orchestration, and compliance. Self-hosted, BYOK, no credit card. Worth a look ahead of general availability:" },
  { key: "facebook", icon: "f", label: "Facebook", color: "#1877F2",
    text: "Found something worth sharing — AXTO is giving away free 7-day Enterprise trials before it officially launches. No card, no catch." },
  { key: "telegram", icon: "✈️", label: "Telegram", color: "#26A5E4",
    text: "AXTO pre-launch trial is live — 100 free licenses per app, 7 days of full Enterprise access." },
  { key: "email", icon: "✉️", label: "Email", color: "#64748b",
    text: "Thought you'd want to see this before it's public: AXTO just opened a pre-launch trial program — 100 free 7-day Enterprise-tier trials per product, self-hosted, BYOK, no credit card required." },
] as const;

export default function PromoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff" }}>
      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(240,249,255,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(2,132,199,0.12)", padding: "0 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡</div>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>AXTO</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0d9488", marginLeft: 4 }}>Pre-Launch Promo</span>
          </Link>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/auth/login" style={{ color: "#475569", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, textDecoration: "none" }}>Already registered? Log in</Link>
            <Link href="/register" className="trial-cta" style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", textDecoration: "none" }}>Register free →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "64px 24px 40px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 999, padding: "6px 16px", fontSize: 12.5, fontWeight: 700, color: "#0d9488", marginBottom: 20 }}>
          <span className="trial-cta-emoji">🚀</span> Before we officially launch — 100 free trial licenses per app
        </div>
        <h1 className="font-display" style={{ fontSize: "clamp(30px, 4.4vw, 50px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1px", marginBottom: 14, maxWidth: 820, margin: "0 auto 14px" }}>
          Test drive AXTO&apos;s full Enterprise tier — <span style={{ background: "linear-gradient(135deg,#0284c7,#0d9488)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>free for 7 days</span>
        </h1>
        <p style={{ color: "#475569", fontSize: 17, maxWidth: 640, margin: "0 auto 28px", lineHeight: 1.7 }}>
          No demo, no watermark, no sales call. Claim a real 7-day Enterprise-tier license for any of AXTO&apos;s 10 self-hosted products,
          up to 2 products per person, while the launch pool lasts.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" className="trial-cta" style={{ padding: "14px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff" }}>
            🎁 Register & Claim a Trial
          </Link>
          <a href="#how-it-works" style={{ padding: "14px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none", border: "1.5px solid #cbd5e1", color: "#475569" }}>
            See how it works ↓
          </a>
        </div>
        <div style={{ marginTop: 20, fontSize: 12.5, color: "#94a3b8" }}>
          No credit card required · Self-hosted on your own server · 1 trial per app, up to 2 apps per person
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: "24px 24px 64px" }}>
        <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>How the trial actually works</h2>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 14, marginBottom: 36 }}>Seven real steps — click through, or let it play.</p>
        <StepWalkthrough />
      </section>

      {/* Choose your app */}
      <section style={{ padding: "24px 24px 64px", background: "#fff", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>Choose an app to test</h2>
          <p style={{ textAlign: "center", color: "#64748b", fontSize: 14, marginBottom: 32, maxWidth: 560, margin: "0 auto 32px" }}>
            Every product below is self-hosted and BYOK — your data and API keys never leave your own server. The trial unlocks the complete
            Enterprise feature set, not a limited demo.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
            {PRODUCTS.map(p => (
              <Link key={p} href={`/products/${p}`} style={{ display: "block", background: "#f8fafc", borderRadius: 14, padding: 20, border: "1px solid #e2e8f0", textDecoration: "none", transition: "transform 0.15s" }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{PRODUCT_ICONS[p]}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0a1628", marginBottom: 4 }}>{PRODUCT_NAMES[p]}</div>
                <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.6, marginBottom: 10 }}>{PRODUCT_DESC[p]}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0d9488" }}>Full Enterprise tier · 7 days free →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 50% continuation discount */}
      <section style={{ padding: "56px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", background: "linear-gradient(135deg,#0f172a,#1e293b)", borderRadius: 20, padding: "36px 40px", color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7dd3fc", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10 }}>Like what you tested?</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Get 50% off your first year</h2>
          <p style={{ color: "#cbd5e1", fontSize: 14.5, lineHeight: 1.7, maxWidth: 520, margin: "0 auto" }}>
            When your trial ends, continuing to a real license for the same product automatically applies a one-time 50% discount at
            checkout — no code to remember, no support ticket. It just works when you buy.
          </p>
        </div>
      </section>

      {/* Social share */}
      <section style={{ padding: "24px 24px 64px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>Know someone who&apos;d want to try it too?</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>The pool is limited per app — share while it&apos;s open.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {SHARE_CHANNELS.map(ch => {
              const urls = SHARE(ch.text);
              return (
                <a key={ch.key} href={(urls as any)[ch.key]} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, background: "#fff", border: "1.5px solid #e2e8f0", textDecoration: "none", fontSize: 13, fontWeight: 700, color: "#0a1628" }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: ch.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{ch.icon}</span>
                  {ch.label}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 80px", textAlign: "center" }}>
        <Link href="/register" className="trial-cta" style={{ display: "inline-block", padding: "16px 40px", borderRadius: 14, fontWeight: 800, fontSize: 16, textDecoration: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff" }}>
          🎁 Register & Claim Your Free Trial
        </Link>
        <div style={{ marginTop: 14, fontSize: 12.5, color: "#94a3b8" }}>
          Already have an account? <Link href="/auth/login" style={{ color: "#0284c7", fontWeight: 700 }}>Log in</Link> and open the Trial Promo tab in your portal.
        </div>
      </section>

      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "24px", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none" }}>← Back to AXTO</Link>
        <span style={{ margin: "0 10px" }}>·</span>
        Self-hosted. No managed-service SLA. Questions? <a href="mailto:hello@axto.io" style={{ color: "#0284c7" }}>hello@axto.io</a>
      </footer>
    </div>
  );
}
