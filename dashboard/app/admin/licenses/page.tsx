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

const S: Record<string, { color: string; bg: string }> = {
  active:    { color: "#22c55e", bg: "rgba(34,197,94,0.1)"  },
  suspended: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  expired:   { color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
  revoked:   { color: "#94a3b8", bg: "rgba(148,163,184,0.1)"},
};

function fmtDate(d: string): React.ReactNode {
  if (!d) return "—";
  const dt = new Date(d), days = Math.ceil((dt.getTime() - Date.now()) / 86400000);
  const label = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (days < 0)  return <span style={{ color: "#ef4444" }}>{label} (expired)</span>;
  if (days <= 30) return <span style={{ color: "#f59e0b" }}>{label} ({days}d left)</span>;
  return <span style={{ color: "#64748b" }}>{label}</span>;
}

export default function AdminLicensesPage() {
  const router = useRouter();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/licenses", { credentials: "include" });
      if (res.status === 401 || res.status === 403) { router.push("/auth/login?redirect=/admin/licenses"); return; }
      if (!res.ok) { setError("Failed to load licenses"); return; }
      const d = await res.json();
      setLicenses(d.licenses || []);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    getSessionUser().then(u => {
      if (!u || u.role !== "admin") { router.push("/auth/login?redirect=/admin/licenses"); return; }
      load();
    });
  }, []);

  const filtered = licenses.filter(l =>
    !search ||
    l.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.client_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.license_key?.toLowerCase().includes(search.toLowerCase()) ||
    l.package_code?.toLowerCase().includes(search.toLowerCase())
  );

  const col = (label: string) => (
    <th style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{label}</th>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", padding: "28px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <Link href="/admin" style={{ color: "#475569", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 6 }}>← Dashboard</Link>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", margin: 0, fontFamily: "Sora, sans-serif" }}>All Licenses</h1>
          </div>
          <Link href="/admin/create-license" style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            + New License
          </Link>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>⚠ {error}</div>
        )}

        <div style={{ marginBottom: 16 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search by name, email, key, package..."
            style={{ width: "100%", maxWidth: 440, padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0a1628", fontSize: 13, outline: "none" }} />
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{["Client","Package","Status","Max Nodes","Expiry","Amount","Actions"].map(col)}</tr></thead>
            <tbody>
              {filtered.map(l => {
                const st = S[l.status] || S.active;
                return (
                  <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ color: "#0f172a", fontWeight: 600 }}>{l.client_name || "—"}</div>
                      <div style={{ color: "#475569", fontSize: 11 }}>{l.client_email}</div>
                    </td>
                    <td style={{ padding: "11px 14px", color: "#94a3b8" }}>
                      <span>{l.product === "orchestra" ? "🎼" : "🛡️"}</span> {l.package_code}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ display: "inline-block", fontSize: 11, padding: "3px 8px", borderRadius: 6, background: st.bg, color: st.color, fontWeight: 700 }}>{l.status}</span>
                    </td>
                    <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 12 }}>
                      {l.max_nodes === -1 ? "∞" : (l.max_nodes ?? 1)}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12 }}>{fmtDate(l.expires_at)}</td>
                    <td style={{ padding: "11px 14px", color: "#22c55e", fontWeight: 700, fontSize: 12 }}>
                      {l.amount_usd > 0 ? `$${Number(l.amount_usd).toLocaleString()}` : <span style={{ color: "#334155" }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <Link href={`/admin/licenses/${l.id}`}
                        style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "transparent", color: "#38bdf8", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>Loading...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔑</div>
              <p style={{ color: "#475569" }}>{search ? "No licenses match your search." : "No licenses yet."}</p>
              {!search && <Link href="/admin/create-license" style={{ color: "#0284c7", fontSize: 14 }}>Create first license →</Link>}
            </div>
          )}
        </div>
        <p style={{ color: "#334155", fontSize: 12, marginTop: 10, textAlign: "right" }}>
          {filtered.length} license{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
