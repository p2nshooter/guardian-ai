"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function PlaybooksPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [email, setEmail] = useState("");
  const [gateway, setGateway] = useState("stripe");

  useEffect(() => {
    fetch("/api/playbooks").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleCheckout(playbookId?: string, bundleId?: string) {
    if (!email.trim()) { setCheckoutError("Email is required"); return; }
    setCheckoutLoading(true); setCheckoutError("");
    try {
      const res = await fetch("/api/playbooks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkout", playbook_id: playbookId, bundle_id: bundleId, email: email.trim(), gateway }),
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else { setCheckoutError(d.error || "Checkout failed"); setCheckoutLoading(false); }
    } catch { setCheckoutError("Network error"); setCheckoutLoading(false); }
  }

  const filtered = data?.playbooks?.filter((p: any) => !activeCategory || p.category_slug === activeCategory) || [];

  if (loading) return <div style={{ minHeight: "100vh", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>Loading playbooks...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff" }}>
      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(240,249,255,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(2,132,199,0.12)", padding: "0 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡</div>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>AXTO</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#7c3aed", marginLeft: 4 }}>Playbooks</span>
          </Link>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/#pricing" style={{ color: "#475569", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, textDecoration: "none" }}>Infrastructure</Link>
            <Link href="/auth/login" style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", textDecoration: "none" }}>My Portal</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "64px 24px 48px", textAlign: "center" }}>
        <h1 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1px", marginBottom: 12 }}>
          AI Prompt <span style={{ background: "linear-gradient(135deg,#7c3aed,#0284c7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Playbooks</span>
        </h1>
        <p style={{ color: "#475569", fontSize: 17, maxWidth: 600, margin: "0 auto 32px", lineHeight: 1.7 }}>
          Professional prompt collections tested across real projects. Works with ChatGPT, Claude, Gemini, and more.
        </p>
      </section>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* Category filter */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          <button onClick={() => setActiveCategory(null)} style={{ padding: "8px 16px", borderRadius: 20, border: "1.5px solid", borderColor: !activeCategory ? "#7c3aed" : "#e2e8f0", background: !activeCategory ? "rgba(124,58,237,0.06)" : "#fff", color: !activeCategory ? "#7c3aed" : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>All</button>
          {(data?.categories || []).map((c: any) => (
            <button key={c.slug} onClick={() => setActiveCategory(c.slug)} style={{ padding: "8px 16px", borderRadius: 20, border: "1.5px solid", borderColor: activeCategory === c.slug ? "#7c3aed" : "#e2e8f0", background: activeCategory === c.slug ? "rgba(124,58,237,0.06)" : "#fff", color: activeCategory === c.slug ? "#7c3aed" : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {/* Bundles */}
        {!activeCategory && data?.bundles?.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0a1628", marginBottom: 16 }}>🎁 Bundle & Save</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
              {data.bundles.map((b: any) => (
                <div key={b.id} style={{ background: "#fff", borderRadius: 16, padding: 24, border: b.is_featured ? "2px solid #7c3aed" : "1px solid #e2e8f0", position: "relative" }}>
                  {b.badge && <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(124,58,237,0.1)", color: "#7c3aed", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6 }}>{b.badge}</div>}
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0a1628", marginBottom: 6 }}>{b.name}</h3>
                  <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>{b.description}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: "#7c3aed", fontFamily: "Sora, sans-serif" }}>${b.price_usd}</span>
                    {b.original_price > b.price_usd && <span style={{ fontSize: 14, color: "#94a3b8", textDecoration: "line-through" }}>${b.original_price}</span>}
                  </div>
                  <button onClick={() => setSelectedItem({ type: "bundle", ...b })} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Get Bundle →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Playbook grid */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0a1628", marginBottom: 16 }}>
          {activeCategory ? `${(data?.categories || []).find((c: any) => c.slug === activeCategory)?.icon || ""} ${(data?.categories || []).find((c: any) => c.slug === activeCategory)?.name || ""}` : "📦 All Playbooks"}
          <span style={{ fontSize: 14, fontWeight: 400, color: "#94a3b8", marginLeft: 8 }}>({filtered.length})</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((p: any) => (
            <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{p.icon || "📄"}</span>
                {p.badge && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>{p.badge}</span>}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0a1628", marginBottom: 4 }}>{p.name}</h3>
              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>{p.category_name}</p>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: 16, lineHeight: 1.6, flex: 1 }}>{p.description}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#f1f5f9", color: "#475569" }}>{p.prompt_count} prompts</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#f1f5f9", color: "#475569" }}>{(p.file_format || "pdf").toUpperCase()}</span>
                {p.rating_avg > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#fef3c7", color: "#92400e" }}>⭐ {p.rating_avg.toFixed(1)}</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>${p.price_usd}</span>
                  {p.original_price > p.price_usd && <span style={{ fontSize: 13, color: "#94a3b8", textDecoration: "line-through" }}>${p.original_price}</span>}
                </div>
                <button onClick={() => setSelectedItem({ type: "playbook", ...p })} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Buy Now</button>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <p>No playbooks in this category yet. Check back soon!</p>
          </div>
        )}
      </div>

      {/* ── Purchase Modal ── */}
      {selectedItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => { setSelectedItem(null); setCheckoutError(""); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 36, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 28 }}>{selectedItem.icon || "📦"}</span>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0a1628", marginTop: 8 }}>{selectedItem.name}</h3>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{selectedItem.description}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            {selectedItem.preview_text && (
              <div style={{ background: "#0f172a", borderRadius: 12, padding: 16, marginBottom: 20, maxHeight: 160, overflowY: "auto" }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Preview</div>
                <pre style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", whiteSpace: "pre-wrap", margin: 0 }}>{selectedItem.preview_text.substring(0, 300)}...</pre>
              </div>
            )}

            <div style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.04),rgba(2,132,199,0.04))", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0a1628" }}>{selectedItem.prompt_count ? `${selectedItem.prompt_count} prompts` : "Full bundle"}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#7c3aed", fontFamily: "Sora, sans-serif" }}>${selectedItem.price_usd}</span>
                {selectedItem.original_price > selectedItem.price_usd && <span style={{ fontSize: 14, color: "#94a3b8", textDecoration: "line-through" }}>${selectedItem.original_price}</span>}
              </div>
            </div>

            {checkoutError && <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>⚠ {checkoutError}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[{ v: "stripe", l: "💳 Card" }, { v: "paypal", l: "🅿 PayPal" }, { v: "xendit", l: "🏦 Xendit" }, { v: "midtrans", l: "🇮🇩 Midtrans" }].map(g => (
                  <label key={g.v} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${gateway === g.v ? "#7c3aed" : "#e2e8f0"}`, cursor: "pointer", background: gateway === g.v ? "rgba(124,58,237,0.04)" : "#fff" }}>
                    <input type="radio" name="gw" value={g.v} checked={gateway === g.v} onChange={() => setGateway(g.v)} style={{ accentColor: "#7c3aed" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0a1628" }}>{g.l}</span>
                  </label>
                ))}
              </div>
              <button onClick={() => handleCheckout(selectedItem.type === "playbook" ? selectedItem.id : undefined, selectedItem.type === "bundle" ? selectedItem.id : undefined)} disabled={checkoutLoading} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: checkoutLoading ? "#64748b" : "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: checkoutLoading ? "not-allowed" : "pointer" }}>
                {checkoutLoading ? "Redirecting..." : `Pay $${selectedItem.price_usd} →`}
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 12 }}>Instant download after payment · 🔒 Secure checkout</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ background: "#0a1628", padding: "40px 24px", textAlign: "center", color: "#475569", fontSize: 13 }}>
        <Link href="/" style={{ color: "#64748b", textDecoration: "none" }}>← Back to AXTO</Link>
        <span style={{ margin: "0 12px" }}>·</span>
        <span>© {new Date().getFullYear()} AXTO. All rights reserved.</span>
        <span style={{ margin: "0 12px" }}>·</span>
        <a href="mailto:hallo@axto.io" style={{ color: "#0284c7", textDecoration: "none" }}>hallo@axto.io</a>
      </footer>
    </div>
  );
}
