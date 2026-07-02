/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useState } from "react";
import Link from "next/link";

export default function ResellerRegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Please enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError("Please enter a valid email."); return; }

    setBusy(true);
    try {
      const res = await fetch("/api/reseller/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Something went wrong. Please try again."); setBusy(false); return; }
      setDone(d.message || "Application received.");
    } catch {
      setError("Network error — please try again.");
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ background: "#0a1628", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 60 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛡</div>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#fff", fontFamily: "Sora, sans-serif" }}>AXTO</span>
        </Link>
      </div>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "56px 20px" }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🤝</div>
          <div style={{ fontWeight: 900, fontSize: 26, color: "#0a1628" }}>Become an AXTO Reseller</div>
          <div style={{ color: "#64748b", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
            Earn commission (up to 25%, based on your cumulative sales volume) for every client you refer to any AXTO product.
            Applications are reviewed by our team — you'll get your unique referral link and a commission dashboard once approved.
          </div>
        </div>

        {done ? (
          <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 14, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#166534", marginBottom: 6 }}>Application Received</div>
            <div style={{ color: "#166534", fontSize: 13.5, lineHeight: 1.6 }}>{done}</div>
            <Link href="/" style={{ display: "inline-block", marginTop: 20, color: "#0284c7", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>← Back to axto.io</Link>
          </div>
        ) : (
          <form onSubmit={submit} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: 28 }}>
            {error && (
              <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 18, color: "#dc2626", fontWeight: 700, fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@company.com"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Company (optional)</label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>How do you plan to sell AXTO? (optional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={4} placeholder="Your audience, market, or existing client base..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
            </div>

            <button type="submit" disabled={busy}
              style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: busy ? "default" : "pointer", width: "100%" }}>
              {busy ? "Submitting…" : "Submit Application"}
            </button>
            <div style={{ marginTop: 14, fontSize: 11.5, color: "#94a3b8", textAlign: "center" }}>
              Already approved? Your referral link was emailed to you — no separate login is needed to share it.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
