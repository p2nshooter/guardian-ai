/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * Free Full-Access Program — public promo page. Replaces the old pre-launch
 * "trial" page: every AXTO app is free at full enterprise for one year, with no
 * licence and no payment. The animated countdown auto-swaps to "licence
 * required — contact admin" when the year ends.
 * ============================================================================ */
"use client";
export const runtime = "edge";
import Link from "next/link";
import CountdownPromo from "@/components/CountdownPromo";

const STEPS = [
  { n: "1", t: "Download", d: "Grab any app — no licence key, no payment, no sign-up required." },
  { n: "2", t: "Self-host", d: "Deploy on your own server with Docker. It auto-registers this machine." },
  { n: "3", t: "Bring your keys", d: "Plug in your own AI provider keys (BYOK). Your data never leaves your infra." },
  { n: "4", t: "Run full enterprise", d: "Every feature unlocked for a full year. Watch the countdown in-app." },
];

export default function PromoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(248,250,252,0.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡</div>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>AXTO</span>
          </Link>
          <Link href="/portal/downloads" style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>⬇ Download free</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 80px" }}>
        <CountdownPromo />

        <div style={{ textAlign: "center", margin: "56px 0 40px" }}>
          <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14, fontFamily: "Sora, sans-serif" }}>
            The whole platform, free for a year
          </h1>
          <p style={{ fontSize: 17, color: "#475569", lineHeight: 1.7, maxWidth: 640, margin: "0 auto" }}>
            Ten sovereign AI apps at full enterprise, with no licence and no payment. Own your stack — your keys, your
            data, your servers. When the year ends, apps lock gracefully and your data stays yours.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginBottom: 48 }}>
          {STEPS.map((s) => (
            <div key={s.n} className="card" style={{ padding: "22px 20px" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, marginBottom: 12 }}>{s.n}</div>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: "#0a1628", marginBottom: 5 }}>{s.t}</div>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <Link href="/portal/downloads" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 32px", borderRadius: 12, background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontWeight: 700, fontSize: 15.5, textDecoration: "none" }}>
            <span style={{ fontSize: 17 }}>⬇</span> Download the apps — free
          </Link>
          <p style={{ marginTop: 16, fontSize: 13, color: "#64748b" }}>
            Questions or need more time? WhatsApp <a href="https://wa.me/6285691234561" style={{ color: "#0f766e", fontWeight: 700, textDecoration: "none" }}>+62 856-9123-4561</a> · <a href="mailto:hello@axto.io" style={{ color: "#0284c7", textDecoration: "none" }}>hello@axto.io</a>
          </p>
        </div>
      </div>
    </div>
  );
}
