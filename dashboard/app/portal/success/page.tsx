/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import Link from "next/link";

export default function SuccessPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0a1628", marginBottom: 12 }}>Payment Successful!</h1>
        <p style={{ color: "#475569", fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
          Your license has been activated. Check your email for the license key and setup instructions.
        </p>
        <Link href="/portal" style={{ display: "inline-block", background: "linear-gradient(135deg,#0e7490,#22d3ee)", color: "#fff", padding: "14px 36px", borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
          Go to Your Portal →
        </Link>
      </div>
    </div>
  );
}
