/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/client-auth";
import { PRODUCT_ICONS, PRODUCT_NAMES } from "@/lib/stripe";

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  active:    { color: "#22c55e", bg: "rgba(34,197,94,0.1)"  },
  suspended: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  expired:   { color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
  revoked:   { color: "#94a3b8", bg: "rgba(148,163,184,0.1)"},
};

const SALE_PRODUCTS = [
  { key: "guardian",   icon: "🛡️", name: "Guardian AI" },
  { key: "orchestra",  icon: "🎼", name: "Orchestra AI" },
  { key: "vault",      icon: "🔒", name: "Vault AI" },
  { key: "edge",       icon: "🌐", name: "Edge AI" },
  { key: "soc",        icon: "🎯", name: "SOC AI" },
  { key: "compliance", icon: "📋", name: "Compliance AI" },
  { key: "sentinel",   icon: "🏭", name: "Sentinel OT" },
  { key: "antivirus",  icon: "🦠", name: "Antivirus" },
  { key: "studio",     icon: "🧠", name: "AXTO Studio" },
  { key: "legal",      icon: "⚖️", name: "AXTO Legal" },
];

function ProductSalePanel() {
  const [saleStatus, setSaleStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/product-sale", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setSaleStatus(d.products || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function toggle(product: string) {
    setToggling(product);
    const newVal = !saleStatus[product];
    try {
      const res = await fetch("/api/admin/product-sale", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, forSale: newVal }),
      });
      if (res.ok) setSaleStatus(s => ({ ...s, [product]: newVal }));
    } catch {}
    setToggling(null);
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", marginTop: 28, marginBottom: 28 }}>
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏷️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0a1628" }}>Product Sale Status</div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>Toggle products between For Sale and Coming Soon. Not-for-sale products show &quot;Coming Soon&quot; on landing page & portal.</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11.5, color: "#64748b", background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
          🐳 This only controls purchase availability. Download <strong>format</strong> (Docker vs. Windows EXE) is separate — manage per-product, per-format at Admin → Releases.
        </div>
      </div>
      <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {SALE_PRODUCTS.map(p => {
          const isOn = saleStatus[p.key] ?? (p.key === "guardian" || p.key === "orchestra" || p.key === "antivirus");
          const isLoading = loading || toggling === p.key;
          return (
            <div key={p.key} style={{
              padding: "14px 16px", borderRadius: 10,
              border: isOn ? "1.5px solid #22c55e" : "1.5px solid #e2e8f0",
              background: isOn ? "rgba(34,197,94,0.04)" : "#f8fafc",
              opacity: isLoading ? 0.6 : 1,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{p.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isOn ? "#22c55e" : "#f59e0b" }}>
                    {isOn ? "✅ For Sale" : "🔜 Coming Soon"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggle(p.key)}
                disabled={isLoading}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: isLoading ? "default" : "pointer",
                  background: isOn ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                  color: isOn ? "#ef4444" : "#22c55e",
                  fontWeight: 700, fontSize: 11,
                }}
              >
                {isOn ? "Set Coming Soon" : "Set For Sale"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [stats,    setStats]    = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError,   setActionError]   = useState<string | null>(null);
  const [search,   setSearch]   = useState("");

  const load = useCallback(async () => {
    setLoading(true); setActionError(null);
    try {
      const res = await fetch("/api/admin", { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        router.push("/auth/login?redirect=/admin"); return;
      }
      if (res.ok) {
        const d = await res.json();
        setStats(d.stats);
        setLicenses(d.licenses || []);
      }
    } catch {
      setActionError("Failed to load data — check your connection");
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    (async () => {
      const u = await getSessionUser();
      if (!u || u.role !== "admin") { router.push("/auth/login?redirect=/admin"); return; }
      await load();
    })();
  }, []);

  async function action(body: any) {
    setActionLoading(body.licenseId || "global"); setActionError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { await load(); }
      else {
        const d = await res.json();
        setActionError(d.error || "Action failed");
      }
    } catch {
      setActionError("Network error");
    } finally { setActionLoading(null); }
  }

  function fmtDate(d: string): React.ReactNode {
    if (!d) return "—";
    const dt = new Date(d);
    const daysLeft = Math.ceil((dt.getTime() - Date.now()) / 86400000);
    if (daysLeft < 0)  return <span style={{ color: "#ef4444" }}>Expired</span>;
    if (daysLeft <= 30) return <span style={{ color: "#f59e0b" }}>{daysLeft}d left</span>;
    return <span style={{ color: "#64748b" }}>{dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>;
  }

  const filtered = licenses.filter(l =>
    !search ||
    l.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.client_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.license_key?.toLowerCase().includes(search.toLowerCase()) ||
    l.package_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <main>
        {/* Header bar — matches the dark top-bar pattern used on Pricing/Promo/Resellers */}
        <div style={{ background: "#0a1628", padding: "0 32px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>📊 Admin Dashboard</span>
          <div style={{ flex: 1 }} />
          <Link href="/admin/create-license" style={{ fontSize: 12, color: "#fff", textDecoration: "none", fontWeight: 700, padding: "7px 14px", background: "linear-gradient(135deg,#0284c7,#0d9488)", borderRadius: 8 }}>
            ✨ New License
          </Link>
        </div>

        <div style={{ padding: "28px 32px" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>Manage licenses, clients, and revenue across every AXTO product.</p>
        </div>

        {/* Error banner */}
        {actionError && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 20, color: "#ef4444", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠ {actionError}</span>
            <button onClick={() => setActionError(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 28 }}>
            {[
              { icon: "📋", label: "Total Licenses", value: stats.total,   color: "#0284c7", bg: "rgba(2,132,199,0.06)"  },
              { icon: "✅", label: "Active",          value: stats.active,  color: "#16a34a", bg: "rgba(34,197,94,0.06)"  },
              { icon: "⏰", label: "Expired",         value: stats.expired, color: "#dc2626", bg: "rgba(239,68,68,0.06)" },
              { icon: "👥", label: "Clients",         value: stats.clients, color: "#7c3aed", bg: "rgba(124,58,237,0.06)"  },
              { icon: "💰", label: "Revenue",         value: `$${Number(stats.revenue ?? 0).toLocaleString()}`, color: "#0d9488", bg: "rgba(13,148,136,0.06)" },
            ].map(s => (
              <div key={s.label} style={{ background: "#ffffff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "18px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: s.color, fontFamily: "Sora, sans-serif" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search by name, email, or license key..."
            style={{ width: "100%", maxWidth: 480, padding: "10px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#0a1628", fontSize: 13, outline: "none" }}
          />
        </div>

        {/* License table */}
        <div style={{ background: "#ffffff", border: "1.5px solid #e2e8f0", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                {["Client", "Package", "Status", "Nodes", "Expires", "Revenue", "Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: h === "Revenue" || h === "Actions" ? "center" : "left", color: "#475569", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(l => {
                const st = STATUS_STYLE[l.status] || STATUS_STYLE.active;
                const isLoading = actionLoading === l.id;
                return (
                  <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ color: "#0f172a", fontWeight: 600 }}>{l.client_name || <span style={{ color: "#475569" }}>—</span>}</div>
                      <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{l.client_email}</div>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 13 }}>{PRODUCT_ICONS[l.product] || "📦"}</span>
                      <span style={{ color: "#0f172a", marginLeft: 6, fontWeight: 600, fontSize: 12 }}>{PRODUCT_NAMES[l.product] || l.product}</span>
                      <span style={{ color: "#94a3b8", marginLeft: 6, fontSize: 11 }}>{l.package_code}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ display: "inline-block", fontSize: 11, padding: "3px 8px", borderRadius: 6, background: st.bg, color: st.color, fontWeight: 700 }}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 12 }}>
                      {l.max_nodes === -1 ? "∞" : (l.max_nodes ?? 1)}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12 }}>
                      {fmtDate(l.expires_at)}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center", color: "#22c55e", fontWeight: 700, fontSize: 12 }}>
                      {l.amount_usd > 0 ? `$${Number(l.amount_usd).toLocaleString()}` : <span style={{ color: "#334155" }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <Link href={`/admin/licenses/${l.id}`} title="View details"
                          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#94a3b8", fontSize: 12, textDecoration: "none" }}>🔍</Link>
                        <button onClick={() => action({ action: "resend_email", licenseId: l.id })}
                          disabled={isLoading} title="Resend email"
                          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#38bdf8", cursor: "pointer", fontSize: 12, opacity: isLoading ? 0.5 : 1 }}>📧</button>
                        {l.status === "active" ? (
                          <>
                            <button onClick={() => action({ action: "suspend", licenseId: l.id })}
                              disabled={isLoading} title="Suspend"
                              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#f59e0b", cursor: "pointer", fontSize: 12, opacity: isLoading ? 0.5 : 1 }}>⏸</button>
                            <button onClick={() => { if (confirm(`Revoke license for ${l.client_name || l.client_email}?`)) action({ action: "revoke", licenseId: l.id }); }}
                              disabled={isLoading} title="Revoke"
                              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 12, opacity: isLoading ? 0.5 : 1 }}>✕</button>
                          </>
                        ) : (
                          <button onClick={() => action({ action: "reactivate", licenseId: l.id })}
                            disabled={isLoading} title="Reactivate"
                            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#22c55e", cursor: "pointer", fontSize: 12, opacity: isLoading ? 0.5 : 1 }}>▶</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && (
            <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>
              <div style={{ width: 24, height: 24, border: "2px solid rgba(2,132,199,0.1)", borderTopColor: "#0284c7", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
              Loading licenses...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔑</div>
              <p style={{ color: "#475569" }}>{search ? "No licenses match your search." : "No licenses yet."}</p>
              {!search && <Link href="/admin/create-license" style={{ color: "#0284c7", fontSize: 14 }}>Create first license →</Link>}
            </div>
          )}
          {!loading && filtered.length > 100 && (
            <div style={{ padding: "12px 16px", color: "#475569", fontSize: 12, borderTop: "1px solid #e2e8f0" }}>
              Showing 100 of {filtered.length} — use search to narrow down
            </div>
          )}
        </div>

        {/* ── Admin Product Sell / Not Sell Toggle ──────────────── */}
        <ProductSalePanel />

        {/* ── Admin Product Downloads — All 10 Products ──────────────── */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", marginTop: 28 }}>
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📦</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0a1628" }}>Product Package Downloads</div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>All 10 AXTO products, real CI-built binaries. One binary per product line — pricing tiers are enforced by the license key, not separate files.</div>
              </div>
            </div>
            <Link href="/admin/releases" style={{ fontSize: 13, color: "#0284c7", textDecoration: "none", fontWeight: 700, padding: "8px 16px", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 8 }}>
              ☁️ CI/CD Releases →
            </Link>
          </div>
          {[
            { key: "guardian", icon: "🛡️", name: "Guardian AI", sub: "AI Cybersecurity", color: "#0284c7", bg: "rgba(2,132,199,0.04)", border: "rgba(2,132,199,0.15)",
              tiers: ["Sentinel", "Professional", "Business", "Enterprise"], binaries: ["guardian-core", "guardian-node"],
              composeFile: "docker-compose.yml", configFile: "guardian.example.yml", registry: "axto/guardian-core:latest",
            },
            { key: "orchestra", icon: "⚡", name: "Orchestra AI", sub: "AI Orchestration", color: "#7c3aed", bg: "rgba(124,58,237,0.04)", border: "rgba(124,58,237,0.15)",
              tiers: ["Starter", "Professional", "Enterprise"], binaries: ["orchestra-core", "orchestra-worker-cpu"],
              composeFile: "orchestra-compose.yml", configFile: "orchestra.example.yml", registry: "axto/orchestra-core:latest",
            },
            { key: "vault", icon: "🔒", name: "Vault AI", sub: "Data Privacy & PII Redaction", color: "#0d9488", bg: "rgba(13,148,136,0.04)", border: "rgba(13,148,136,0.15)",
              tiers: ["Growth", "Professional", "Enterprise", "Sovereign"], binaries: ["vault-core"],
              composeFile: "vault-compose.yml", configFile: "vault.example.yml", registry: "axto/vault-core:latest",
            },
            { key: "edge", icon: "🌐", name: "Edge AI", sub: "AI API Gateway", color: "#f59e0b", bg: "rgba(245,158,11,0.04)", border: "rgba(245,158,11,0.15)",
              tiers: ["Growth", "Professional", "Enterprise", "Platform"], binaries: ["edge-core"],
              composeFile: "edge-compose.yml", configFile: "edge.example.yml", registry: "axto/edge-core:latest",
            },
            { key: "soc", icon: "🎯", name: "SOC AI", sub: "Security Operations Center", color: "#ef4444", bg: "rgba(239,68,68,0.04)", border: "rgba(239,68,68,0.15)",
              tiers: ["Growth", "Professional", "Enterprise", "Platform"], binaries: ["soc-core"],
              composeFile: "soc-compose.yml", configFile: "soc.example.yml", registry: "axto/soc-core:latest",
            },
            { key: "compliance", icon: "📋", name: "Compliance AI", sub: "Compliance Automation", color: "#6366f1", bg: "rgba(99,102,241,0.04)", border: "rgba(99,102,241,0.15)",
              tiers: ["Growth", "Professional", "Enterprise", "Sovereign"], binaries: ["compliance-core"],
              composeFile: "compliance-compose.yml", configFile: "compliance.example.yml", registry: "axto/compliance-core:latest",
            },
            { key: "sentinel", icon: "🏭", name: "Sentinel OT", sub: "OT/ICS Industrial Security", color: "#ea580c", bg: "rgba(234,88,12,0.04)", border: "rgba(234,88,12,0.15)",
              tiers: ["Growth", "Professional", "Enterprise", "Critical"], binaries: ["sentinel-core"],
              composeFile: "sentinel-compose.yml", configFile: "sentinel.example.yml", registry: "axto/sentinel-core:latest",
            },
            { key: "studio", icon: "🧠", name: "AXTO Studio", sub: "Self-Hosted AI & GPU Pool Platform", color: "#8b5cf6", bg: "rgba(139,92,246,0.04)", border: "rgba(139,92,246,0.15)",
              tiers: ["Starter", "Professional", "Enterprise"], binaries: ["studio-core"],
              composeFile: "studio-compose.yml", configFile: "studio.example.yml", registry: "axto/studio-core:latest",
            },
            { key: "antivirus", icon: "🦠", name: "Guardian Antivirus", sub: "ClamAV + AI File Scanning", color: "#e879f9", bg: "rgba(232,121,249,0.04)", border: "rgba(232,121,249,0.15)",
              tiers: ["Sentinel", "Professional", "Business", "Enterprise"], binaries: ["guardian-antivirus"],
              composeFile: "antivirus-compose.yml", configFile: "antivirus.example.yml", registry: "axto/guardian-antivirus:latest",
            },
            { key: "legal", icon: "⚖️", name: "AXTO Legal", sub: "AI Legal & Compliance Platform", color: "#0f766e", bg: "rgba(15,118,110,0.04)", border: "rgba(15,118,110,0.15)",
              tiers: ["Growth", "Professional", "Enterprise", "Sovereign"], binaries: ["legal-core"],
              composeFile: "legal-compose.yml", configFile: "legal.env.example", registry: "axto/legal-core:latest",
            },
          ].map((prod: any) => (
            <div key={prod.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ padding: "13px 24px", display: "flex", alignItems: "center", gap: 10, background: prod.bg }}>
                <span style={{ fontSize: 18 }}>{prod.icon}</span>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#0a1628" }}>{prod.name}</span>
                <span style={{ color: "#94a3b8", fontSize: 11 }}>{prod.sub}</span>
                <span style={{ color: "#cbd5e1", fontSize: 11, marginLeft: "auto" }}>Tiers: {prod.tiers.join(" · ")} — one binary, license key sets the limit</span>
              </div>
              <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>📦 Client Packages</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {prod.binaries.map((ci: string) => (
                      <div key={ci} style={{ display: "flex", gap: 5 }}>
                        <a href={`/api/admin/releases/download?key=${encodeURIComponent(`builds/latest/raw/${ci}.tar.gz`)}`}
                          style={{ flex: 1, padding: "8px 12px", borderRadius: 7, background: prod.bg, border: `1px solid ${prod.border}`, color: prod.color, textDecoration: "none", fontSize: 12, fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}>
                          ⬇ {ci} (Docker)
                        </a>
                        <a href={`/api/admin/releases/download?key=${encodeURIComponent(`builds/latest/exe/${ci}-windows.exe`)}`}
                          style={{ padding: "8px 10px", borderRadius: 7, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", textDecoration: "none", fontSize: 11 }}>
                          🪟
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>⚙️ Config Files</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <a href={`/configs/${prod.composeFile}`} download
                      style={{ padding: "8px 12px", borderRadius: 7, background: `${prod.color}`, color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
                      ⬇ {prod.composeFile}
                    </a>
                    <a href={`/configs/${prod.configFile}`} download
                      style={{ padding: "8px 12px", borderRadius: 7, border: `1.5px solid ${prod.color}`, color: prod.color, textDecoration: "none", fontSize: 12, fontWeight: 700, background: "transparent" }}>
                      ⬇ {prod.configFile}
                    </a>
                    <div style={{ background: "rgba(15,23,42,0.04)", borderRadius: 7, padding: "8px 10px", fontSize: 10, color: "#64748b", fontFamily: "monospace", lineHeight: 1.6 }}>
                      🐳 {prod.registry}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Playbooks — quick link to the full download-manager page */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", marginTop: 28, marginBottom: 28 }}>
          <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0a1628" }}>Playbooks</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Every sold playbook is downloadable — manage uploads, prices and download every file from the dedicated Playbooks page.</div>
            </div>
            <Link href="/admin/playbooks" style={{ fontSize: 13, color: "#0284c7", textDecoration: "none", fontWeight: 700, padding: "8px 16px", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 8, whiteSpace: "nowrap" }}>
              📦 Open Playbooks →
            </Link>
          </div>
        </div>
        </div>

      </main>
    </div>
  );
}
