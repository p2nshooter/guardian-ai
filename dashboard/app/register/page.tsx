/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * Register — a free account, nothing more. There are no packages, prices,
 * trials or payments: every app is full-enterprise and free during the program.
 * The account just lets a client track their install countdown, downloads and
 * support contacts. The FreeProgramBanner up top auto-swaps to "licence
 * required — contact admin" the moment the countdown ends.
 * ============================================================================ */
"use client";
export const runtime = "edge";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FreeProgramBanner from "@/components/FreeProgramBanner";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", name: "", organization: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.email.trim()) return setError("Email is required");
    if (!form.name.trim()) return setError("Your name is required");
    if (form.password.length < 8) return setError("Password must be at least 8 characters");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "client_register", ...form }),
      });
      const d = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/portal/downloads"), 700);
      } else if (res.status === 409) {
        setError("An account with this email already exists — please sign in.");
      } else {
        setError(d.error || "Registration failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const input: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0",
    fontSize: 14, color: "#0a1628", outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🛡</div>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>AXTO</span>
        </Link>

        <div style={{ marginBottom: 20 }}>
          <FreeProgramBanner />
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: "30px 28px", boxShadow: "0 4px 24px rgba(2,132,199,0.06)" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0a1628", marginBottom: 6 }}>Account created</h1>
              <p style={{ fontSize: 14, color: "#64748b" }}>Taking you to your downloads…</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0a1628", marginBottom: 6, fontFamily: "Sora, sans-serif" }}>Create your free account</h1>
              <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, marginBottom: 22 }}>
                No licence, no payment. Your account lets you track your install countdown, grab downloads, and reach support. Every app runs at full enterprise.
              </p>
              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={lbl}>Email *</label>
                  <input style={input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />
                </div>
                <div>
                  <label style={lbl}>Full name *</label>
                  <input style={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
                </div>
                <div>
                  <label style={lbl}>Organization <span style={{ textTransform: "none", color: "#94a3b8", fontWeight: 500 }}>(optional)</span></label>
                  <input style={input} value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} placeholder="Company / team" />
                </div>
                <div>
                  <label style={lbl}>Password *</label>
                  <input style={input} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
                </div>
                {error && <div style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ padding: "13px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Creating…" : "Create free account"}
                </button>
              </form>
              <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: "#64748b" }}>
                Already have an account? <Link href="/auth/login" style={{ color: "#0284c7", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
              </div>
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <Link href="/portal/downloads" style={{ fontSize: 13, color: "#0f766e", fontWeight: 700, textDecoration: "none" }}>Or just download the apps — free →</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
