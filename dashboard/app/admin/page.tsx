"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { getSessionUser, signOut } from "@/lib/client-auth";

const NAV_STATIC: {href:string;icon:string;tKey:string;fallback:string}[] = [
  { href: "/admin",                icon: "📊", tKey: "admin.title",    fallback: "Dashboard" },
  { href: "/admin/releases",       icon: "☁️", tKey: "admin.releases", fallback: "Releases" },
  { href: "/admin/playbooks",     icon: "📦", tKey: "",             fallback: "📦 Playbooks" },
  { href: "/admin/engine-builder", icon: "🔧", tKey: "",             fallback: "🔧 Engine Builder" },
  { href: "/guide",                icon: "📖", tKey: "nav.guide",    fallback: "📖 Guide" },
  { href: "/admin/licenses",       icon: "🔑", tKey: "admin.licenses", fallback: "Licenses" },
  { href: "/admin/clients",        icon: "👥", tKey: "admin.clients",  fallback: "Clients" },
  { href: "/admin/gateways",       icon: "💳", tKey: "admin.gateways", fallback: "Gateways" },
  { href: "/admin/revenue",        icon: "💰", tKey: "admin.revenue",  fallback: "Revenue" },
  { href: "/admin/content",        icon: "📝", tKey: "",             fallback: "Content" },
  { href: "/admin/autopost",       icon: "📢", tKey: "",             fallback: "AutoPost" },
];

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  active:    { color: "#22c55e", bg: "rgba(34,197,94,0.1)"  },
  suspended: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  expired:   { color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
  revoked:   { color: "#94a3b8", bg: "rgba(148,163,184,0.1)"},
};

export default function AdminPage() {
  const router = useRouter();
  const { t } = useLocale();
  const navItems = NAV_STATIC.map(n => ({ ...n, label: n.tKey ? (t(n.tKey) || n.fallback) : n.fallback }));
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

  const Sidebar = () => (
    <nav style={{ width: 220, background: "#ffffff", borderRight: "1px solid #e2e8f0", padding: "20px 12px", display: "flex", flexDirection: "column", gap: 2, position: "sticky", top: 0, height: "100vh", overflowY: "auto", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 24 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛡</div>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>AXTO</span>
      </div>
      {navItems.map(n => (
        <Link key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, textDecoration: "none", fontSize: 13, fontWeight: 600, color: "#475569", transition: "all 0.15s" }}>
          <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
        </Link>
      ))}
      <Link href="/admin/engine-builder" style={{ padding: "9px 18px", borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>🔧 Engine Builder</Link>
          <Link href="/admin/create-license" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, textDecoration: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontWeight: 700, fontSize: 13, marginTop: 16, boxShadow: "0 4px 12px rgba(2,132,199,0.3)" }}>
        + New License
      </Link>
      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <button onClick={() => signOut()} style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "transparent", color: "#64748b", fontSize: 12, cursor: "pointer" }}>
          Sign Out
        </button>
      </div>
    </nav>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", display: "flex" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", margin: 0, fontFamily: "Sora, sans-serif" }}>Admin Dashboard</h1>
            <p style={{ color: "#475569", fontSize: 13, margin: "4px 0 0" }}>Manage licenses, clients, and revenue</p>
          </div>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
            {[
              { icon: "📋", label: "Total Licenses", value: stats.total,   color: "#0a1628"  },
              { icon: "✅", label: "Active",          value: stats.active,  color: "#22c55e"  },
              { icon: "⏰", label: "Expired",         value: stats.expired, color: "#ef4444"  },
              { icon: "👥", label: "Clients",         value: stats.clients, color: "#0a1628"  },
              { icon: "💰", label: "Revenue",         value: `$${Number(stats.revenue ?? 0).toLocaleString()}`, color: "#22c55e" },
            ].map(s => (
              <div key={s.label} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 20, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: s.color, fontFamily: "Sora, sans-serif" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search by name, email, or license key..."
            style={{ width: "100%", maxWidth: 480, padding: "10px 16px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0a1628", fontSize: 13, outline: "none" }}
          />
        </div>

        {/* License table */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
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
                      <span style={{ fontSize: 13 }}>{l.product === "orchestra" ? "🎼" : "🛡️"}</span>
                      <span style={{ color: "#94a3b8", marginLeft: 6 }}>{l.package_code}</span>
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

        {/* ── Admin Engine Downloads ─────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", marginTop: 28 }}>
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⬇️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0a1628" }}>Engine Downloads</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Download Guardian AI, Orchestra AI, and all components — admin access, no payment required</div>
            </div>
          </div>
          <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* Guardian AI */}
            <div style={{ background: "rgba(2,132,199,0.04)", border: "1.5px solid rgba(2,132,199,0.15)", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>🛡️</span>
                <div>
                  <div style={{ fontWeight: 800, color: "#0a1628", fontSize: 14 }}>Guardian AI Engine</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>Cybersecurity · Docker · Multi-node</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <a href="/api/downloads?file=guardian-compose.yml"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                  ⬇ guardian-compose.yml
                </a>
                <a href="/api/downloads?file=guardian.example.yml"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, border: "1.5px solid #0284c7", color: "#0284c7", textDecoration: "none", fontSize: 13, fontWeight: 700, background: "transparent" }}>
                  ⬇ guardian.example.yml (config)
                </a>
                <div style={{ background: "rgba(15,23,42,0.04)", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#64748b", fontFamily: "monospace", lineHeight: 1.7 }}>
                  <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>Docker Registry:</div>
                  <div>ghcr.io/{process.env.NEXT_PUBLIC_GHCR_OWNER||"p2nshooter"}/guardian-engine:latest</div>
                </div>
              </div>
            </div>

            {/* Orchestra AI */}
            <div style={{ background: "rgba(124,58,237,0.04)", border: "1.5px solid rgba(124,58,237,0.15)", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>⚡</span>
                <div>
                  <div style={{ fontWeight: 800, color: "#0a1628", fontSize: 14 }}>Orchestra AI Engine</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>AI Orchestration · CPU+GPU Workers</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <a href="/api/downloads?file=orchestra-compose.yml"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                  ⬇ orchestra-compose.yml
                </a>
                <a href="/api/downloads?file=orchestra.example.yml"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, border: "1.5px solid #7c3aed", color: "#7c3aed", textDecoration: "none", fontSize: 13, fontWeight: 700, background: "transparent" }}>
                  ⬇ orchestra.example.yml (config)
                </a>
                <div style={{ background: "rgba(15,23,42,0.04)", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#64748b", fontFamily: "monospace", lineHeight: 1.7 }}>
                  <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>Docker Registry:</div>
                  <div>ghcr.io/{process.env.NEXT_PUBLIC_GHCR_OWNER||"p2nshooter"}/orchestra-core:latest</div>
                  <div>ghcr.io/{process.env.NEXT_PUBLIC_GHCR_OWNER||"p2nshooter"}/orchestra-worker-cpu:latest</div>
                  <div>ghcr.io/{process.env.NEXT_PUBLIC_GHCR_OWNER||"p2nshooter"}/orchestra-worker-gpu:latest</div>
                </div>
              </div>
            </div>

            {/* Guardian Node + Antivirus */}
            <div style={{ background: "rgba(15,23,42,0.02)", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>🖥️</span>
                <div>
                  <div style={{ fontWeight: 800, color: "#0a1628", fontSize: 14 }}>Guardian Node Agent</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>Lightweight node for multi-server scan</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ background: "rgba(15,23,42,0.04)", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#64748b", fontFamily: "monospace", lineHeight: 1.9 }}>
                  <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>Deploy on each server:</div>
                  <div style={{ color: "#0284c7" }}>docker pull ghcr.io/{process.env.NEXT_PUBLIC_GHCR_OWNER||"p2nshooter"}/guardian-engine:latest</div>
                  <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 4 }}>Set GUARDIAN_CORE_URL + license key in env</div>
                </div>
                <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", fontSize: 11, color: "#16a34a" }}>
                  ✅ Node agent is included in the same guardian-engine image. No separate download needed.
                </div>
              </div>
            </div>

            {/* Antivirus Engine */}
            <div style={{ background: "rgba(239,68,68,0.03)", border: "1.5px solid rgba(239,68,68,0.12)", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>🦠</span>
                <div>
                  <div style={{ fontWeight: 800, color: "#0a1628", fontSize: 14 }}>Antivirus Engine (ClamAV)</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>Embedded in Guardian · Auto-updated signatures</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(15,23,42,0.04)", fontSize: 11, color: "#64748b", lineHeight: 1.8 }}>
                  <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>Status: Bundled with Guardian Engine</div>
                  <div>ClamAV runs inside the guardian-engine container.</div>
                  <div>Signature DB auto-updates every 6 hours.</div>
                  <div style={{ marginTop: 6, color: "#0284c7" }}>Configure in guardian.yml → scanner.antivirus.enabled: true</div>
                </div>
                <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", fontSize: 11, color: "#16a34a" }}>
                  ✅ No separate download. Enabled by default in guardian-compose.yml
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
