/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { isForSale as checkForSale } from "@/lib/stripe";

// ── Prices must match lib/stripe.ts (canonical source of truth) ──────────
const PACKAGES = [
  // Guardian AI
  { code: "lite",              label: "Guardian Sentinel",       sub: "1 server",         price: 990,   product: "guardian"  },
  { code: "pro",               label: "Guardian Professional",   sub: "25 servers",        price: 4990,  product: "guardian"  },
  { code: "shield",            label: "Guardian Business",       sub: "100 servers",       price: 19900, product: "guardian"  },
  { code: "aegis",             label: "Guardian Enterprise",     sub: "1,000 servers",     price: 79000, product: "guardian"  },
  // Orchestra AI
  { code: "orchestra_core",    label: "Orchestra Starter",       sub: "10 workers",        price: 34900, product: "orchestra" },
  { code: "orchestra_scale",   label: "Orchestra Professional",  sub: "50 workers",        price: 89900, product: "orchestra" },
  { code: "orchestra_unlimited",label:"Orchestra Enterprise",    sub: "Unlimited workers", price: 249000, product: "orchestra" },
  // Bundles
  { code: "bundle_starter",    label: "Bundle Starter",          sub: "Professional + Starter", price: 33900, product: "bundle" },
  { code: "bundle_professional",label:"Bundle Professional",     sub: "Business + Professional",price: 93300, product: "bundle" },
  { code: "bundle_enterprise", label: "Bundle Enterprise",       sub: "Enterprise × 2",    price: 278800, product: "bundle"    },
  // Vault AI
  { code: "vault_starter",      label: "Vault Starter",          sub: "50K req/day",       price: 4990,   product: "vault"     },
  { code: "vault_professional", label: "Vault Professional",     sub: "500K req/day",      price: 14900,  product: "vault"     },
  { code: "vault_business",     label: "Vault Business",         sub: "5M req/day",        price: 39900,  product: "vault"     },
  { code: "vault_enterprise",   label: "Vault Enterprise",       sub: "Unlimited",         price: 119000, product: "vault"     },
  // SOC AI
  { code: "soc_starter",        label: "SOC Starter",            sub: "5 sources, 200 EPS",price: 24900,  product: "soc"       },
  { code: "soc_professional",   label: "SOC Professional",       sub: "25 nodes, 1K EPS",  price: 79000,  product: "soc"       },
  { code: "soc_business",       label: "SOC Business",           sub: "100 nodes, 10K EPS",price: 136900, product: "soc"       },
  { code: "soc_enterprise",     label: "SOC Enterprise",         sub: "Unlimited",         price: 249000, product: "soc"       },
  // Compliance
  { code: "compliance_starter",     label: "Compliance Starter",      sub: "2 frameworks (SOC2+GDPR)", price: 7990,  product: "compliance"},
  { code: "compliance_professional",label:"Compliance Professional",   sub: "6 frameworks",             price: 19900,  product: "compliance"},
  { code: "compliance_business",    label: "Compliance Business",      sub: "7 frameworks + CI/CD",     price: 31900,  product: "compliance"},
  { code: "compliance_enterprise",  label: "Compliance Enterprise",    sub: "Custom frameworks",        price: 49000, product: "compliance"},
  // Edge AI
  { code: "edge_starter",       label: "Edge Starter",           sub: "100K req/day",      price: 7990,   product: "edge"      },
  { code: "edge_professional",  label: "Edge Professional",      sub: "1M req/day",        price: 24900,   product: "edge"      },
  { code: "edge_business",      label: "Edge Business",          sub: "10M req/day",       price: 40900,  product: "edge"      },
  { code: "edge_enterprise",    label: "Edge Enterprise",        sub: "Unlimited",         price: 69000,  product: "edge"      },
  // Sentinel
  { code: "sentinel_starter",     label: "Sentinel Starter",       sub: "50 devices",       price: 12900,  product: "sentinel"  },
  { code: "sentinel_professional",label: "Sentinel Professional",  sub: "500 devices",      price: 39900,  product: "sentinel"  },
  { code: "sentinel_business",    label: "Sentinel Business",      sub: "5,000 devices",    price: 68900,  product: "sentinel"  },
  { code: "sentinel_enterprise",  label: "Sentinel Enterprise",    sub: "Unlimited devices", price: 129000, product: "sentinel"  },
  // Antivirus
  { code: "antivirus_starter",      label: "Antivirus Starter",      sub: "10 endpoints",     price: 2900,  product: "antivirus" },
  { code: "antivirus_professional", label: "Antivirus Professional", sub: "100 endpoints",    price: 9900,  product: "antivirus" },
  { code: "antivirus_enterprise",   label: "Antivirus Enterprise",   sub: "Unlimited",        price: 29900, product: "antivirus" },
  // Cross-product Bundles
  { code: "privacy_suite",  label: "Privacy Suite",               sub: "Vault Pro + Compliance Pro", price: 27800, product: "bundle" },
  { code: "security_suite", label: "Security Operations Suite",   sub: "SOC Pro + Sentinel Pro",       price: 95100,  product: "bundle" },
  { code: "platform_5",     label: "Full Platform (All 5)",       sub: "All products Professional",   price: 130400, product: "bundle" },
  // AXTO Studio — Monthly AI & GPU Pool
  { code: "studio_starter",       label: "Studio Starter",        sub: "500 req/day, 1 GPU",     price: 490,  product: "studio" },
  { code: "studio_professional",  label: "Studio Professional",   sub: "5K req/day, 5 GPUs, API",price: 1990, product: "studio" },
  { code: "studio_enterprise",    label: "Studio Enterprise",     sub: "Unlimited",               price: 7990, product: "studio" },
  // ── 3-Day Free Trials ──
  { code: "trial_guardian",   label: "Guardian Trial (3 days)",   sub: "1 server, full features",      price: 0, product: "guardian" },
  { code: "trial_orchestra",  label: "Orchestra Trial (3 days)",  sub: "2 workers, full features",     price: 0, product: "orchestra" },
  { code: "trial_vault",      label: "Vault Trial (3 days)",      sub: "5K req/day, full features",    price: 0, product: "vault" },
  { code: "trial_edge",       label: "Edge Trial (3 days)",       sub: "10K req/day, full features",   price: 0, product: "edge" },
  { code: "trial_soc",        label: "SOC Trial (3 days)",        sub: "5 sources, full features",     price: 0, product: "soc" },
  { code: "trial_compliance", label: "Compliance Trial (3 days)", sub: "2 frameworks, full features",  price: 0, product: "compliance" },
  { code: "trial_sentinel",   label: "Sentinel Trial (3 days)",   sub: "10 devices, full features",    price: 0, product: "sentinel" },
  { code: "trial_antivirus",  label: "Antivirus Trial (3 days)",  sub: "3 endpoints, full features",   price: 0, product: "antivirus" },
  { code: "trial_studio",     label: "Studio Trial (3 days)",     sub: "AI + GPU Studio, 100 req/day", price: 0, product: "studio" },
];

const ALL_GATEWAYS = [
  { value: "stripe",   label: "Credit / Debit Card",  logo: `<svg viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="25" rx="4" fill="#635BFF"/><text x="30" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="sans-serif">stripe</text></svg>`, desc: "Visa, Mastercard, AMEX" },
  { value: "paypal",   label: "PayPal",                logo: `<svg viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="25" rx="4" fill="#003087"/><text x="30" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="sans-serif">PayPal</text></svg>`, desc: "PayPal balance or card" },
  { value: "xendit",   label: "Xendit",                logo: `<svg viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="25" rx="4" fill="#0D47A1"/><text x="30" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="sans-serif">xendit</text></svg>`, desc: "Bank Transfer, e-Wallet (ID)" },
  { value: "midtrans", label: "Midtrans",              logo: `<svg viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="25" rx="4" fill="#00AA13"/><text x="30" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="sans-serif">midtrans</text></svg>`, desc: "GoPay, OVO, BCA, Mandiri" },
];

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1.5px solid #e2e8f0", background: "#fff",
  color: "#0a1628", fontSize: 14, outline: "none", fontFamily: "inherit",
} as const;

function RegisterInner() {
  const { t, fmtPrice } = useLocale();
  const params = useSearchParams();
  const urlPkg = params.get("pkg");
  const defaultPkg = PACKAGES.find(p => p.code === urlPkg) ? urlPkg! : "pro";

  const [form, setForm] = useState({
    email: "", name: "", organization: "", password: "",
    pkg: defaultPkg, gateway: "stripe", billing: "yearly",
  });
  const [loading,     setLoading]     = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  // Single-package focus: when the visitor arrived from a specific "Get Started",
  // show only that package so they aren't confused by the full catalog. They can
  // still switch via "Change package".
  const cameWithPkg = !!(urlPkg && PACKAGES.find(p => p.code === urlPkg));
  const [showAllPkgs, setShowAllPkgs] = useState(false);
  const [availableGateways, setAvailableGateways] = useState<string[]>(["stripe"]); // default fallback

  // ── Live prices from admin panel (no deploy needed) ─────────────────────
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  useEffect(() => {
    fetch("/api/packages")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.prices) {
          const m: Record<string, number> = {};
          for (const [code, v] of Object.entries(d.prices as Record<string, any>)) {
            m[code] = v.price ?? 0;
          }
          setLivePrices(m);
        }
      })
      .catch(() => {});
  }, []);

  function getPrice(code: string, staticPrice: number): number {
    return livePrices[code] && livePrices[code] > 0 ? livePrices[code] : staticPrice;
  }

  // Load which gateways are configured
  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(d => {
      if (d.gateways && Array.isArray(d.gateways)) {
        setAvailableGateways(d.gateways);
        // Auto-select first available
        if (d.gateways.length > 0 && !d.gateways.includes(form.gateway)) {
          setForm(f => ({ ...f, gateway: d.gateways[0] }));
        }
      }
    }).catch(() => {});
  }, []); // eslint-disable-line

  const GATEWAYS = ALL_GATEWAYS.filter(gw => availableGateways.includes(gw.value));

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

    // Block checkout for Coming Soon products
    if (!checkForSale(form.pkg)) {
      setInlineError("This product is Coming Soon and not yet available for purchase.");
      return;
    }

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
              <label style={{ display: "block", color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("auth.email") || "Email Address"} *</label>
              <input
                type="email" required
                value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="you@company.com" autoComplete="email"
                style={inputStyle}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("reg.full_name") || "Full Name"} *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Jane Smith" autoComplete="name" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("reg.organization") || "Organization"}</label>
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
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <span>Package *</span>
                {cameWithPkg && (
                  <span onClick={() => setShowAllPkgs(s => !s)} style={{ cursor: "pointer", color: "#0284c7", textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>
                    {showAllPkgs ? "← Back to your package" : "Change package"}
                  </span>
                )}
              </label>

              {cameWithPkg && !showAllPkgs && selectedPkg && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 12, border: "1.5px solid #0284c7", background: "rgba(2,132,199,0.04)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: "#0a1628", fontSize: 15 }}>{selectedPkg.label}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{selectedPkg.sub} · Annual license</div>
                  </div>
                  <span style={{ fontWeight: 800, color: "#0284c7", fontSize: 16, fontFamily: "Sora, sans-serif" }}>
                    {getPrice(selectedPkg.code, selectedPkg.price) === 0 ? "Free" : `$${getPrice(selectedPkg.code, selectedPkg.price).toLocaleString()}`}
                    {getPrice(selectedPkg.code, selectedPkg.price) > 0 && <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>/yr</span>}
                  </span>
                </div>
              )}

              <div style={{ display: (cameWithPkg && !showAllPkgs) ? "none" : "flex", flexDirection: "column", gap: 6 }}>
                {/* Group packages by product */}
                {[
                  { product: "guardian",   icon: "🛡", color: "#0284c7" },
                  { product: "orchestra",  icon: "🎼", color: "#0d9488" },
                  { product: "antivirus",  icon: "🦠", color: "#ea580c" },
                  { product: "vault",      icon: "🔒", color: "#6366f1" },
                  { product: "edge",       icon: "🌐", color: "#3b82f6" },
                  { product: "soc",        icon: "🎯", color: "#dc2626" },
                  { product: "compliance", icon: "📋", color: "#16a34a" },
                  { product: "sentinel",   icon: "🏭", color: "#7c3aed" },
                  { product: "bundle",     icon: "🎁", color: "#7c3aed" },
                ].map(grp => {
                  const pkgs = PACKAGES.filter(p => p.product === grp.product);
                  if (pkgs.length === 0) return null;
                  const productForSale = grp.product === "bundle"
                    ? true  // bundles check individually
                    : pkgs.some(p => checkForSale(p.code));
                  return (
                    <div key={grp.product}>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", paddingLeft: 2, marginTop: 10, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                        {grp.icon} {grp.product.charAt(0).toUpperCase() + grp.product.slice(1)} {grp.product === "bundle" ? "& Save" : "AI"}
                        {!productForSale && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: 700, textTransform: "none" }}>Coming Soon</span>}
                      </div>
                      {pkgs.map(p => {
                        const forSale = checkForSale(p.code);
                        return (
                          <label key={p.code} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${form.pkg === p.code ? grp.color : "#e2e8f0"}`, background: form.pkg === p.code ? `${grp.color}08` : "#fff", cursor: forSale ? "pointer" : "not-allowed", transition: "all 0.15s", opacity: forSale ? 1 : 0.55, marginBottom: 6 }}>
                            <input type="radio" name="pkg" value={p.code} checked={form.pkg === p.code} onChange={() => forSale && set("pkg", p.code)} disabled={!forSale} style={{ accentColor: grp.color }} />
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 700, color: "#0a1628", fontSize: 14 }}>{p.label}</span>
                              {!forSale && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: 700, marginLeft: 6 }}>Coming Soon</span>}
                              <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>{p.sub}</span>
                            </div>
                            <span style={{ fontWeight: 800, color: forSale ? grp.color : "#94a3b8", fontSize: 14, fontFamily: "Sora, sans-serif" }}>
                              {getPrice(p.code, p.price) === 0 ? "Free" : `$${getPrice(p.code, p.price).toLocaleString()}`}
                              {getPrice(p.code, p.price) > 0 && <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>/yr</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label style={{ display: "block", color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Payment Method</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {GATEWAYS.map(gw => (
                  <label key={gw.value} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${form.gateway === gw.value ? "#0284c7" : "#e2e8f0"}`, background: form.gateway === gw.value ? "rgba(2,132,199,0.04)" : "#fff", cursor: "pointer", transition: "all 0.15s" }}>
                    <input type="radio" name="gateway" value={gw.value} checked={form.gateway === gw.value} onChange={() => set("gateway", gw.value)} style={{ accentColor: "#0284c7" }} />
                    <span dangerouslySetInnerHTML={{ __html: gw.logo }} style={{ width: 50, height: 22, flexShrink: 0 }} />
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
