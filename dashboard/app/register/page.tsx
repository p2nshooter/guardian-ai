"use client";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const PACKAGES = [
  { code: "lite",              label: "Guardian Sentinel",    sub: "1 server",         price: 249,   product: "guardian"  },
  { code: "pro",               label: "Guardian Pro",         sub: "20 servers",        price: 990,   product: "guardian"  },
  { code: "shield",            label: "Guardian Business",    sub: "100 servers",       price: 3990,  product: "guardian"  },
  { code: "aegis",             label: "Guardian Enterprise",  sub: "1,000 servers",     price: 17900, product: "guardian"  },
  { code: "orchestra_core",    label: "Orchestra Core",       sub: "10 workers",        price: 9900,  product: "orchestra" },
  { code: "orchestra_scale",   label: "Orchestra Scale",      sub: "50 workers",        price: 24900, product: "orchestra" },
  { code: "orchestra_unlimited",label:"Orchestra Enterprise", sub: "Unlimited workers", price: 59900, product: "orchestra" },
  { code: "bundle_starter",    label: "Bundle Starter",       sub: "Pro + Core",        price: 9490,  product: "bundle"    },
  { code: "bundle_professional",label:"Bundle Professional",  sub: "Business + Scale",  price: 24900, product: "bundle"    },
  { code: "bundle_enterprise", label: "Bundle Enterprise",    sub: "Enterprise × 2",    price: 69900, product: "bundle"    },
];

const GATEWAYS = [
  { value: "stripe",   label: "Credit / Debit Card",  icon: "💳", desc: "Visa, Mastercard, AMEX" },
  { value: "paypal",   label: "PayPal",                icon: "🅿",  desc: "PayPal balance or card" },
  { value: "xendit",   label: "Xendit",                icon: "🏦", desc: "Bank transfer, e-wallet (ID)" },
  { value: "midtrans", label: "Midtrans",              icon: "🇮🇩", desc: "GoPay, OVO, BCA (ID)" },
];

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1.5px solid #e2e8f0", background: "#fff",
  color: "#0a1628", fontSize: 14, outline: "none", fontFamily: "inherit",
} as const;

function RegisterInner() {
  const params = useSearchParams();
  const urlPkg = params.get("pkg");
  const defaultPkg = PACKAGES.find(p => p.code === urlPkg) ? urlPkg! : "pro";

  const [form, setForm] = useState({
    email: "", name: "", organization: "", password: "",
    pkg: defaultPkg, gateway: "stripe", billing: "yearly",
  });
  const [loading,     setLoading]     = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Sync if URL param changes
  useEffect(() => {
    if (urlPkg && PACKAGES.find(p => p.code === urlPkg)) {
      setForm(f => ({ ...f, pkg: urlPkg }));
    }
  }, [urlPkg]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectedPkg = PACKAGES.find(p => p.code === form.pkg);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setInlineError(null);
    if (!form.email.trim()) { setInlineError("Email address is required"); return; }
    if (!form.name.trim())  { setInlineError("Full name is required");     return; }
    if (!form.pkg)          { setInlineError("Please select a package");    return; }

    setLoading(true);

    // Step 1: Create account with password (if password provided)
    if (form.password && form.password.length >= 8) {
      try {
        const regRes = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "client_register",
            email: form.email.trim(),
            name: form.name.trim(),
            password: form.password,
            organization: form.organization.trim(),
          }),
        });
        const regData = await regRes.json();
        if (!regRes.ok && regRes.status !== 409) {
          // 409 = already exists, that's fine — continue to checkout
          setInlineError(regData.error || "Account creation failed");
          setLoading(false);
          return;
        }
      } catch {
        // Non-critical: account creation failed but checkout can still proceed
      }
    }

    // Step 2: Proceed to checkout
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "register" }),
      });
      const d = await res.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        setInlineError(d.error || "Checkout failed — please try again or contact hallo@axto.io");
        setLoading(false);
      }
    } catch {
      setInlineError("Network error — please retry");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#f0f9ff,#ecfdf5)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 12px rgba(2,132,199,0.3)" }}>🛡</div>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif", letterSpacing: "-0.5px" }}>AXTO</span>
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0a1628", marginBottom: 8, fontFamily: "Sora, sans-serif", letterSpacing: "-0.7px" }}>Get Your License</h1>
          <p style={{ color: "#475569", fontSize: 15 }}>Select a package and complete secure checkout</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 36px 32px", boxShadow: "0 8px 40px rgba(2,132,199,0.1)", border: "1px solid rgba(2,132,199,0.1)" }}>
          {inlineError && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, color: "#dc2626", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <span>⚠</span> {inlineError}
            </div>
          )}

          <form onSubmit={handleCheckout} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Contact info */}
            <div>
              <label style={{ display: "block", color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Email Address *</label>
              <input
                type="email" required
                value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="you@company.com" autoComplete="email"
                style={inputStyle}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Name *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Jane Smith" autoComplete="name" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Organization</label>
                <input value={form.organization} onChange={e => set("organization", e.target.value)} placeholder="Acme Corp" autoComplete="organization" style={inputStyle} />
              </div>
            </div>

            {/* Password (optional — fallback login if magic link is down) */}
            <div>
              <label style={{ display: "block", color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Password <span style={{ fontWeight: 400, textTransform: "none", color: "#94a3b8" }}>(optional — for login backup)</span>
              </label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                placeholder="Min. 8 characters" autoComplete="new-password" style={inputStyle} />
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, lineHeight: 1.5 }}>
                Set a password so you can log in even when email delivery is delayed. You can always use magic link too.
              </p>
            </div>

            {/* Package selector */}
            <div>
              <label style={{ display: "block", color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Package *</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Guardian group */}
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", paddingLeft: 2, marginBottom: 2 }}>🛡 Guardian AI</div>
                {PACKAGES.filter(p => p.product === "guardian").map(p => (
                  <label key={p.code} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${form.pkg === p.code ? "#0284c7" : "#e2e8f0"}`, background: form.pkg === p.code ? "rgba(2,132,199,0.04)" : "#fff", cursor: "pointer", transition: "all 0.15s" }}>
                    <input type="radio" name="pkg" value={p.code} checked={form.pkg === p.code} onChange={() => set("pkg", p.code)} style={{ accentColor: "#0284c7" }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, color: "#0a1628", fontSize: 14 }}>{p.label}</span>
                      <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>{p.sub}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: "#0284c7", fontSize: 14, fontFamily: "Sora, sans-serif" }}>${p.price.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>/yr</span></span>
                  </label>
                ))}
                {/* Orchestra group */}
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", paddingLeft: 2, marginTop: 10, marginBottom: 2 }}>🎼 Orchestra AI</div>
                {PACKAGES.filter(p => p.product === "orchestra").map(p => (
                  <label key={p.code} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${form.pkg === p.code ? "#0d9488" : "#e2e8f0"}`, background: form.pkg === p.code ? "rgba(13,148,136,0.04)" : "#fff", cursor: "pointer", transition: "all 0.15s" }}>
                    <input type="radio" name="pkg" value={p.code} checked={form.pkg === p.code} onChange={() => set("pkg", p.code)} style={{ accentColor: "#0d9488" }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, color: "#0a1628", fontSize: 14 }}>{p.label}</span>
                      <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>{p.sub}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: "#0d9488", fontSize: 14, fontFamily: "Sora, sans-serif" }}>${p.price.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>/yr</span></span>
                  </label>
                ))}
                {/* Bundle group */}
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", paddingLeft: 2, marginTop: 10, marginBottom: 2 }}>🎁 Bundle & Save</div>
                {PACKAGES.filter(p => p.product === "bundle").map(p => (
                  <label key={p.code} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${form.pkg === p.code ? "#7c3aed" : "#e2e8f0"}`, background: form.pkg === p.code ? "rgba(124,58,237,0.04)" : "#fff", cursor: "pointer", transition: "all 0.15s" }}>
                    <input type="radio" name="pkg" value={p.code} checked={form.pkg === p.code} onChange={() => set("pkg", p.code)} style={{ accentColor: "#7c3aed" }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, color: "#0a1628", fontSize: 14 }}>{p.label}</span>
                      <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>{p.sub}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: "#7c3aed", fontSize: 14, fontFamily: "Sora, sans-serif" }}>${p.price.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>/yr</span></span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label style={{ display: "block", color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Payment Method</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {GATEWAYS.map(gw => (
                  <label key={gw.value} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${form.gateway === gw.value ? "#0284c7" : "#e2e8f0"}`, background: form.gateway === gw.value ? "rgba(2,132,199,0.04)" : "#fff", cursor: "pointer", transition: "all 0.15s" }}>
                    <input type="radio" name="gateway" value={gw.value} checked={form.gateway === gw.value} onChange={() => set("gateway", gw.value)} style={{ accentColor: "#0284c7" }} />
                    <span style={{ fontSize: 18 }}>{gw.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0a1628" }}>{gw.label}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{gw.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Price summary */}
            {selectedPkg && (
              <div style={{ background: "linear-gradient(135deg,rgba(2,132,199,0.06),rgba(13,148,136,0.06))", borderRadius: 12, padding: "14px 18px", border: "1px solid rgba(2,132,199,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0a1628" }}>{selectedPkg.label}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{selectedPkg.sub} · Annual license</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#0284c7", fontFamily: "Sora, sans-serif" }}>
                  ${selectedPkg.price.toLocaleString()}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", background: loading ? "#0369a1" : "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: loading ? "none" : "0 4px 16px rgba(2,132,199,0.35)" }}
            >
              {loading ? (
                <><span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite", display: "inline-block" }} /> Redirecting to payment...</>
              ) : "Proceed to Secure Payment →"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 20, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
            {["🔒 Encrypted","🛡 100% BYOK","📋 Annual license"].map(t => (
              <span key={t} style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, color: "#94a3b8", fontSize: 13 }}>
          Already have a license? <Link href="/auth/login" style={{ color: "#0284c7", fontWeight: 600 }}>Sign in to your portal →</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#f0f9ff,#ecfdf5)" }} />}>
      <RegisterInner />
    </Suspense>
  );
}
