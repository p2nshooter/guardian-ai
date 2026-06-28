/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router       = useRouter();
  const params       = useSearchParams();
  const redirect     = params.get("redirect") || "/portal";
  const [email,  setEmail]  = useState("");
  const [pwd,    setPwd]    = useState("");
  const [err,    setErr]    = useState("");
  const [loading,setLoading]= useState(false);

  const s = {
    page:  { background:"#0a0f1e", minHeight:"100vh", display:"flex", alignItems:"center",
              justifyContent:"center", fontFamily:"Inter,-apple-system,sans-serif" },
    box:   { background:"#111827", border:"1px solid #1e293b", borderRadius:"16px",
              padding:"40px", width:"100%", maxWidth:"400px" },
    title: { fontSize:"22px", fontWeight:700, color:"#e2e8f0", marginBottom:"6px" },
    sub:   { fontSize:"13px", color:"#64748b", marginBottom:"28px" },
    label: { fontSize:"12px", color:"#94a3b8", fontWeight:600, display:"block", marginBottom:"6px" },
    input: { width:"100%", padding:"10px 14px", background:"#1e293b", border:"1px solid #334155",
              borderRadius:"8px", color:"#e2e8f0", fontSize:"14px", boxSizing:"border-box" as const,
              outline:"none" },
    btn:   { width:"100%", padding:"12px", background:"#0284c7", border:"none", borderRadius:"8px",
              color:"#fff", fontSize:"14px", fontWeight:700, cursor:"pointer", marginTop:"20px" },
    err:   { background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
              borderRadius:"8px", padding:"10px 14px", color:"#f87171", fontSize:"13px",
              marginBottom:"16px" },
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/auth", {
        method:"POST", credentials:"include",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"client_password_login", email, password:pwd }),
      });
      const d = await r.json();
      if (d.ok) {
        router.push(d.role === "admin" ? "/admin" : redirect);
      } else {
        setErr(d.error || "Login failed. Check your credentials.");
      }
    } catch { setErr("Network error — please try again."); }
    setLoading(false);
  }

  return (
    <div style={s.page}>
      <div style={s.box}>
        <div style={{ textAlign:"center", marginBottom:"24px" }}>
          <div style={{ fontSize:"32px", marginBottom:"8px" }}>🔐</div>
          <div style={s.title}>Sign in to AXTO</div>
          <div style={s.sub}>Access your licenses, downloads &amp; invoices</div>
        </div>
        {err && <div style={s.err}>{err}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:"16px" }}>
            <label style={s.label}>Email Address</label>
            <input style={s.input} type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoFocus />
          </div>
          <div style={{ marginBottom:"8px" }}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <div style={{ textAlign:"center", marginTop:"20px", fontSize:"13px", color:"#64748b" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color:"#38bdf8", textDecoration:"none" }}>
            Register here
          </Link>
        </div>
        <div style={{ textAlign:"center", marginTop:"10px", fontSize:"13px", color:"#64748b" }}>
          Admin?{" "}
          <Link href="/admin" style={{ color:"#a78bfa", textDecoration:"none" }}>
            Admin Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
