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
export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", padding: "40px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#22d3ee", fontSize: 20, fontWeight: 900, textDecoration: "none" }}>🛡️ AXTO</Link>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 24, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 32 }}>Last updated: March 2026</p>
        <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.8 }}>
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>1. What We Collect</h2>
          <p>AXTO collects only the minimum data necessary to operate our licensing platform: your email address, name, organization, and payment information processed through third-party gateways (Stripe, PayPal, Xendit, Midtrans). We do not collect, store, or have access to any data processed by Guardian AI or Orchestra AI on your servers.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>2. BYOK Privacy Guarantee</h2>
          <p>AXTO operates on a Bring Your Own Keys (BYOK) model. Your AI provider API keys are stored exclusively on your own servers. AXTO never sees, stores, or transmits your API keys. The only connection between your engine and AXTO is a periodic license validation request containing only your license key and machine identifier.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>3. Data Storage</h2>
          <p>Dashboard data (accounts, licenses, invoices) is stored on Cloudflare D1, a globally distributed database with encryption at rest. Payment gateway credentials are encrypted using AES-256-GCM before storage. We do not use third-party analytics, tracking pixels, or advertising services.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>4. Data Sharing</h2>
          <p>We do not sell, rent, or share your personal information with third parties. Payment data is processed directly by your chosen payment gateway and is subject to their respective privacy policies.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>5. Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your personal data at any time by contacting hallo@axto.io. Upon account deletion, all associated data will be permanently removed within 30 days.</p>

          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>6. Contact</h2>
          <p>For privacy-related inquiries, please contact us at <a href="mailto:hallo@axto.io" style={{ color: "#22d3ee" }}>hallo@axto.io</a>.</p>
        </div>
      </div>
    </div>
  );
}
