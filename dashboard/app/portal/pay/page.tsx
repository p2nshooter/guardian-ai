/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * Payments are hidden during the Free Full-Access Program — every app is free,
 * with no self-service checkout. Anyone who lands here (old link / bookmark) is
 * shown the free-access promo and the admin contacts; there are no prices.
 * ============================================================================ */
"use client";
export const runtime = "edge";
import Link from "next/link";
import CountdownPromo from "@/components/CountdownPromo";

export default function PayHiddenPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px" }}>
      <div style={{ width: "100%", maxWidth: 620 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🛡</div>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>AXTO</span>
        </Link>

        <div style={{ marginBottom: 20 }}>
          <CountdownPromo compact />
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: "30px 28px", textAlign: "center", boxShadow: "0 4px 24px rgba(2,132,199,0.06)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", marginBottom: 8, fontFamily: "Sora, sans-serif" }}>No payment needed</h1>
          <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.7, marginBottom: 22 }}>
            Every AXTO application is free, at full enterprise, for one year — there is nothing to buy. Just create a free
            account and download. For anything beyond the free program (extensions, licences after the year), contact the
            admin directly — there are no self-service prices.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
            <Link href="/portal/downloads" style={{ padding: "12px 26px", borderRadius: 11, background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>⬇ Download free</Link>
            <Link href="/register" style={{ padding: "12px 26px", borderRadius: 11, border: "1.5px solid #0284c7", color: "#0284c7", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Create free account</Link>
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 18, fontSize: 13.5, color: "#64748b", lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: "#0a1628", marginBottom: 4 }}>Talk to the admin</div>
            <a href="https://wa.me/6285691234561" style={{ color: "#0f766e", fontWeight: 700, textDecoration: "none" }}>WhatsApp +62 856-9123-4561</a><br />
            <a href="mailto:hello@axto.io" style={{ color: "#0284c7", textDecoration: "none" }}>hello@axto.io</a> · <a href="mailto:salam@ulyah.com" style={{ color: "#0284c7", textDecoration: "none" }}>salam@ulyah.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}
