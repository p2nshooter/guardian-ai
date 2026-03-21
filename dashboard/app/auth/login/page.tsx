"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendMagicLink, signInWithPassword, clientPasswordLogin, clientRegister } from "@/lib/client-auth";

type Mode = "magic" | "password" | "register" | "admin";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/portal";
  const errorParam = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [mode, setMode] = useState<Mode>("magic");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(
    errorParam === "invalid_or_expired" ? "Login link expired or already used. Please request a new one." :
    errorParam === "missing_token"      ? "Invalid login link. Please request a new one." :
    errorParam === "server_error"       ? "Server error. Please try again." : ""
  );

  // ── Secret admin trigger: type "axto__" anywhere on page ──
  // On mobile: users can long-press the AXTO logo 5 times (see below)
  const [secretBuffer, setSecretBuffer] = useState("");
  const [logoTaps, setLogoTaps] = useState(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const char = e.key;
      if (char.length === 1) {
        const next = (secretBuffer + char).slice(-6);
        setSecretBuffer(next);
        if (next === "axto__") {
          setMode("admin");
          setError("");
          setSecretBuffer("");
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [secretBuffer]);

  // Reset logo taps after 3 seconds of inactivity
  useEffect(() => {
    if (logoTaps > 0 && logoTaps < 5) {
      const t = setTimeout(() => setLogoTaps(0), 3000);
      return () => clearTimeout(t);
    }
  }, [logoTaps]);

  function handleLogoTap() {
    const next = logoTaps + 1;
    setLogoTaps(next);
    if (next >= 5) {
      setMode("admin");
      setError("");
      setLogoTaps(0);
    }
  }

  async function handleMagicLink(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setLoading(true); setError("");
    const { error: err } = await sendMagicLink(email.trim(), redirect);
    setLoading(false);
    if (err) { setError(err); return; }
    setSent(true);
  }

  async function handleClientLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Email and password are required"); return; }
    setLoading(true); setError("");
    const { error: err, redirect: redir } = await clientPasswordLogin(email.trim(), password, redirect);
    setLoading(false);
    if (err) { setError(err); return; }
    router.push(redir || redirect);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    if (!name.trim()) { setError("Name is required"); return; }
    if (!password || password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPw) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    const { error: err } = await clientRegister({ email: email.trim(), password, name: name.trim(), organization: organization.trim() });
    setLoading(false);
    if (err) { setError(err); return; }
    router.push("/portal");
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Email and password are required"); return; }
    setLoading(true); setError("");
    const { error: err } = await signInWithPassword(email.trim(), password);
    setLoading(false);
    if (err) { setError(err); return; }
    router.push(redirect && redirect !== "/portal" ? redirect : "/admin");
  }

  // ── "Check Your Email" screen ──
  if (sent) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f0f9ff" }}>
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center", background: "#fff", borderRadius: 20, padding: 48, boxShadow: "0 8px 32px rgba(2,132,199,0.12)", border: "1px solid rgba(2,132,199,0.1)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,rgba(2,132,199,0.1),rgba(13,148,136,0.1))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>📧</div>
          <h2 style={{ color: "#0a1628", fontSize: 22, fontWeight: 800, marginBottom: 12, fontFamily: "Sora, sans-serif" }}>Check Your Email</h2>
          <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
            We sent a secure login link to<br />
            <strong style={{ color: "#0284c7" }}>{email}</strong>
          </p>
          <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>Link expires in 15 minutes.</p>

          <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, textAlign: "left" }}>
            <p style={{ color: "#92400e", fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>⚠️ Don't see the email?</p>
            <ul style={{ color: "#78716c", fontSize: 12, lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
              <li>Check your <strong style={{ color: "#92400e" }}>Spam / Junk</strong> folder</li>
              <li>Check <strong style={{ color: "#92400e" }}>Promotions</strong> tab (Gmail)</li>
              <li>Make sure <strong style={{ color: "#92400e" }}>{email}</strong> is correct</li>
              <li>Wait 1–2 minutes — sometimes there is a short delay</li>
            </ul>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <button onClick={() => handleMagicLink()} style={{ color: "#0284c7", background: "rgba(2,132,199,0.06)", border: "1px solid rgba(2,132,199,0.15)", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "9px 20px" }}>
              🔄 Resend login link
            </button>
            <button onClick={() => setSent(false)} style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              ← Try a different email
            </button>
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
            <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8 }}>Email not arriving? Login with password instead:</p>
            <button onClick={() => { setSent(false); setMode("password"); }} style={{ color: "#0284c7", fontSize: 13, fontWeight: 700, background: "none", border: "1.5px solid #0284c7", borderRadius: 8, padding: "8px 20px", cursor: "pointer" }}>
              Login with Password →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Login Form ──
  const onSubmit = mode === "magic" ? handleMagicLink : mode === "register" ? handleRegister : mode === "admin" ? handleAdminLogin : handleClientLogin;
  const showPassword = mode === "password" || mode === "register" || mode === "admin";
  const showName = mode === "register";

  const TAB_STYLE = (active: boolean) => ({
    flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 as const,
    background: active ? "linear-gradient(135deg,#0284c7,#0d9488)" : "transparent",
    color: active ? "#fff" : "#64748b", transition: "all 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f0f9ff" }}>
      <div style={{ maxWidth: 440, width: "100%", background: "#fff", borderRadius: 24, padding: "40px 40px 36px", boxShadow: "0 8px 40px rgba(2,132,199,0.12)", border: "1px solid rgba(2,132,199,0.1)" }}>
        {/* Logo — tap 5x for admin on mobile */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div onClick={handleLogoTap} style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "default", userSelect: "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 12px rgba(2,132,199,0.3)" }}>🛡</div>
            <span style={{ fontSize: 24, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif", letterSpacing: "-0.5px" }}>AXTO</span>
          </div>
          <h1 style={{ color: "#0a1628", fontSize: 22, fontWeight: 800, marginBottom: 6, fontFamily: "Sora, sans-serif" }}>
            {mode === "register" ? "Create Account" : mode === "admin" ? "Admin Access" : "Welcome back"}
          </h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>
            {mode === "register" ? "Register to manage your licenses" : mode === "admin" ? "Internal admin authentication" : "Sign in to manage your licenses"}
          </p>
        </div>

        {/* Mode Toggle — hide when admin mode */}
        {mode !== "admin" && (
          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 24 }}>
            <button type="button" onClick={() => { setMode("magic"); setError(""); }} style={TAB_STYLE(mode === "magic")}>Magic Link</button>
            <button type="button" onClick={() => { setMode("password"); setError(""); }} style={TAB_STYLE(mode === "password")}>Password</button>
            <button type="button" onClick={() => { setMode("register"); setError(""); }} style={TAB_STYLE(mode === "register")}>Register</button>
          </div>
        )}

        {mode === "admin" && (
          <div style={{ display: "flex", gap: 4, background: "#fef3c7", borderRadius: 12, padding: "8px 16px", marginBottom: 24, justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>🔐 Admin Mode</span>
            <button type="button" onClick={() => { setMode("magic"); setError(""); }} style={{ background: "none", border: "none", color: "#92400e", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✕ Exit</button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {showName && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", color: "#475569", fontSize: 12, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Full Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" autoComplete="name" required />
              </div>
              <div>
                <label style={{ display: "block", color: "#475569", fontSize: 12, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Organization</label>
                <input type="text" value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Acme Corp" autoComplete="organization" />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "block", color: "#475569", fontSize: 12, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Email Address *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required />
          </div>

          {showPassword && (
            <div>
              <label style={{ display: "block", color: "#475569", fontSize: 12, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Password *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Min. 8 characters" : "Your password"} autoComplete={mode === "register" ? "new-password" : "current-password"} required />
            </div>
          )}

          {mode === "register" && (
            <div>
              <label style={{ display: "block", color: "#475569", fontSize: 12, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Confirm Password *</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat password" autoComplete="new-password" required />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: loading ? 0.7 : 1, fontSize: 15, padding: "13px 20px" }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
                {mode === "magic" ? "Sending..." : mode === "register" ? "Creating account..." : "Signing in..."}
              </span>
            ) : mode === "magic" ? "Send Login Link →" : mode === "register" ? "Create Account →" : "Sign In →"}
          </button>
        </form>

        {/* Hints per mode */}
        {mode === "magic" && (
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 20, lineHeight: 1.6 }}>
            We'll email you a one-click login link. No password required.
          </p>
        )}
        {mode === "password" && (
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 20, lineHeight: 1.6 }}>
            Login with the password you set during registration.
          </p>
        )}
        {mode === "register" && (
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 20, lineHeight: 1.6 }}>
            Create an account to purchase and manage licenses.
          </p>
        )}
        {mode === "admin" && (
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 20 }}>
            Set <code style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: 4, color: "#475569" }}>ADMIN_PASSWORD</code> in CF Pages settings.
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f0f9ff" }} />}>
      <LoginInner />
    </Suspense>
  );
}
