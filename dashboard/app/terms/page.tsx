/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", padding: "40px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#22d3ee", fontSize: 20, fontWeight: 900, textDecoration: "none" }}>🛡️ AXTO</Link>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 24, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 32 }}>Last updated: March 2026</p>
        <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8 }}>
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>1. License Grant</h2>
          <p>AXTO grants you a non-exclusive, non-transferable license to use the purchased software product (Guardian AI and/or Orchestra AI) for the duration specified at purchase. The license is bound to your organization and infrastructure.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>2. Self-Hosted Deployment</h2>
          <p>All AXTO software runs entirely on your own infrastructure. You are responsible for providing and maintaining the servers, Docker environment, and network configuration required to operate the software.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>3. BYOK Responsibility</h2>
          <p>Under the Bring Your Own Keys model, you are solely responsible for managing your AI provider API keys. AXTO has no access to or liability for your API key usage, costs, or associated provider terms.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>4. License Restrictions</h2>
          <p>You may not reverse engineer, decompile, or redistribute the software. Each license key is bound to a single machine identifier. You are entitled to up to 3 machine binding resets per license year via your Client Portal.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>5. Payment & Refunds</h2>
          <p>All prices are in USD. Payment is processed through third-party gateways. All licenses come with a 30-day satisfaction guarantee. Refund requests must be submitted within 30 days of purchase to hallo@axto.io.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>6. License Expiry</h2>
          <p>Licenses expire on the date specified at time of purchase. Upon expiry, the software will cease normal operation after a 4-hour grace period. Renewal is available through your Client Portal.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>7. Limitation of Liability</h2>
          <p>THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. AXTO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID FOR THE LICENSE IN THE 12 MONTHS PRECEDING THE CLAIM.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>8. Contact</h2>
          <p>For questions about these terms, contact <a href="mailto:hallo@axto.io" style={{ color: "#22d3ee" }}>hallo@axto.io</a>.</p>
        </div>
      </div>
    </div>
  );
}
