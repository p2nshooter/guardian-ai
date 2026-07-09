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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminRevenuePage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | "paid" | "pending">("all");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/revenue", { credentials: "include" });
      if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
      if (!res.ok) { setError("Failed to load revenue"); return; }
      const d = await res.json();
      setInvoices(d.invoices || []);
      setTotal(d.total || 0);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    getSessionUser().then(u => {
      if (!u || u.role !== "admin") { router.push("/auth/login"); return; }
      load();
    });
  }, []);

  const filtered = invoices.filter(inv => {
    const matchSearch = !search ||
      inv.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_email?.toLowerCase().includes(search.toLowerCase()) ||
      inv.payment_ref?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || inv.status === filter;
    return matchSearch && matchFilter;
  });

  const GW: Record<string, string> = { stripe: "💳", paypal: "🅿", xendit: "🏦", midtrans: "🇮🇩", manual: "✏️" };

  // Revenue by gateway
  const byGateway = invoices.reduce((acc: any, inv) => {
    if (inv.status === "paid") {
      acc[inv.gateway] = (acc[inv.gateway] || 0) + Number(inv.amount_usd);
    }
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", padding: "28px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>← Dashboard</Link>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", marginTop: 8, marginBottom: 24, fontFamily: "Sora, sans-serif" }}>Revenue</h1>

        {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>⚠ {error}</div>}

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>Total Revenue</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#22c55e", fontFamily: "Sora, sans-serif" }}>${total.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>All time · USD</div>
          </div>
          {Object.entries(byGateway).map(([gw, amt]: any) => (
            <div key={gw} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>{GW[gw] || "💰"} {gw}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>${Number(amt).toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search client, email, ref..."
            style={{ flex: 1, minWidth: 200, maxWidth: 360, padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0a1628", fontSize: 13, outline: "none" }} />
          <div style={{ display: "flex", gap: 4, background: "#e2e8f0", borderRadius: 10, padding: 3 }}>
            {(["all","paid","pending"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: filter === f ? "linear-gradient(135deg,#0284c7,#0d9488)" : "transparent", color: filter === f ? "#fff" : "#64748b" }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices table */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{["Date","Client","Package","Gateway","Amount","Status","Ref"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(inv.created_at)}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ color: "#0f172a", fontWeight: 600, fontSize: 13 }}>{inv.client_name || "—"}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>{inv.client_email}</div>
                  </td>
                  <td style={{ padding: "11px 14px", color: "#94a3b8", fontSize: 12 }}>
                    {inv.product === "orchestra" ? "🎼" : "🛡️"} {inv.package_code || "—"}
                  </td>
                  <td style={{ padding: "11px 14px", color: "#94a3b8", fontSize: 12 }}>
                    {GW[inv.gateway] || "💰"} {inv.gateway}
                  </td>
                  <td style={{ padding: "11px 14px", color: "#22c55e", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
                    ${Number(inv.amount_usd).toLocaleString()}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: inv.status === "paid" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: inv.status === "paid" ? "#22c55e" : "#f59e0b", fontWeight: 700 }}>{inv.status}</span>
                  </td>
                  <td style={{ padding: "11px 14px", color: "#334155", fontSize: 11, fontFamily: "monospace", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {inv.payment_ref || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>Loading...</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: 48, textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 12 }}>🧾</div><p style={{ color: "#475569" }}>No invoices found.</p></div>}
        </div>
        <p style={{ color: "#334155", fontSize: 12, marginTop: 10, textAlign: "right" }}>{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
