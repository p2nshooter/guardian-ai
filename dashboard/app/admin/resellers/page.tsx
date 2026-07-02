/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/client-auth";

interface Reseller {
  id: string; email: string; name: string; company: string;
  referral_code: string; status: string; total_sales_usd: number; notes: string;
}
interface Tier { id: string; tier_name: string; min_volume_usd: number; commission_pct: number; sort_order: number }
interface Sale {
  id: string; reseller_id: string; client_email: string;
  order_amount_usd: number; commission_pct: number; commission_usd: number;
  status: string; created_at: string;
}

const MAX_COMMISSION_PCT_LABEL = 25;

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function ResellersPage() {
  const router = useRouter();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", company: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/admin/resellers", { credentials: "include" });
      if (r.status === 401 || r.status === 403) { router.push("/auth/login?redirect=/admin/resellers"); return; }
      const d = await r.json();
      setResellers(d.resellers ?? []);
      setTiers(d.tiers ?? []);
      setSales(d.sales ?? []);
    } catch (e: any) {
      setError("Failed to load — " + (e?.message ?? e));
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    (async () => {
      const u = await getSessionUser();
      if (!u || u.role !== "admin") { router.push("/auth/login?redirect=/admin/resellers"); return; }
      await load();
    })();
  }, [load, router]);

  async function createReseller(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.email) { setError("Email is required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/resellers", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_reseller", ...form }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Failed to create reseller"); return; }
      setNewCode(d.referralCode);
      setForm({ email: "", name: "", company: "", notes: "" });
      await load();
    } catch (e: any) { setError(e?.message ?? "Failed to create reseller"); }
    setCreating(false);
  }

  async function toggleStatus(id: string, status: string) {
    await fetch("/api/admin/resellers", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_reseller", id, status }),
    });
    setResellers(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  async function saveTier(t: Tier) {
    await fetch("/api/admin/resellers", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_tier", id: t.id, tierName: t.tier_name, minVolumeUsd: t.min_volume_usd, commissionPct: t.commission_pct }),
    });
  }

  async function markPaid(saleId: string) {
    await fetch("/api/admin/resellers", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid", saleId }),
    });
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: "paid" } : s));
  }

  function copyLink(code: string) {
    const url = `${window.location.origin}/register?ref=${code}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  }

  const resellerByCode: Record<string, string> = {};
  for (const r of resellers) resellerByCode[r.id] = `${r.name || r.email} (${r.referral_code})`;
  const pending = resellers.filter(r => r.status === "pending");

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ background: "#0a1628", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
        <Link href="/admin" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>
        <span style={{ color: "#334155", fontSize: 13 }}>|</span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>🤝 Resellers</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: "#94a3b8", fontSize: 11 }}>Volume-based commission tiers — max {tiers.length ? Math.max(...tiers.map(t=>t.commission_pct)) : 25}%</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px" }}>
        {error && (
          <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontWeight: 700, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}
        {newCode && (
          <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#166534", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>✅ Reseller created — referral code: <code style={{ background: "#dcfce7", padding: "2px 8px", borderRadius: 6 }}>{newCode}</code></span>
            <button onClick={() => setNewCode(null)} style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* Pending Applications — from the public /reseller/register form */}
        {pending.length > 0 && (
          <div style={{ background: "#fffbeb", borderRadius: 14, border: "1.5px solid #fde68a", padding: 22, marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#92400e", marginBottom: 4 }}>🟡 {pending.length} Pending Application{pending.length !== 1 ? "s" : ""}</div>
            <div style={{ fontSize: 12, color: "#92400e", marginBottom: 14, opacity: 0.85 }}>Submitted via the public reseller sign-up form. Their referral code earns zero commission until approved.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pending.map(r => (
                <div key={r.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #fde68a", padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{r.name || r.email}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.email}{r.company ? ` · ${r.company}` : ""}</div>
                    {r.notes && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, maxWidth: 500 }}>&ldquo;{r.notes}&rdquo;</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => toggleStatus(r.id, "active")}
                      style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      ✓ Approve
                    </button>
                    <button onClick={() => toggleStatus(r.id, "rejected")}
                      style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #fca5a5", background: "#fff", color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commission Tiers */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: 22, marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#0a1628", marginBottom: 4 }}>📈 Commission Tiers</div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Based on a reseller&apos;s cumulative sales volume. Hard-capped at {MAX_COMMISSION_PCT_LABEL}% regardless of what&apos;s entered here.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            {tiers.map((t, i) => (
              <div key={t.id} style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                <input value={t.tier_name} onChange={e => setTiers(prev => prev.map((x,j) => j===i ? {...x, tier_name: e.target.value} : x))}
                  onBlur={() => saveTier(tiers[i])}
                  style={{ fontWeight: 800, fontSize: 13, border: "none", background: "transparent", width: "100%", marginBottom: 8, outline: "none" }} />
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Min. cumulative volume (USD)</div>
                <input type="number" value={t.min_volume_usd} onChange={e => setTiers(prev => prev.map((x,j) => j===i ? {...x, min_volume_usd: parseFloat(e.target.value)||0} : x))}
                  onBlur={() => saveTier(tiers[i])}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }} />
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Commission %</div>
                <input type="number" min={0} max={25} value={t.commission_pct} onChange={e => setTiers(prev => prev.map((x,j) => j===i ? {...x, commission_pct: Math.min(25, parseFloat(e.target.value)||0)} : x))}
                  onBlur={() => saveTier(tiers[i])}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, boxSizing: "border-box", fontWeight: 700, color: "#16a34a" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Create Reseller */}
        <form onSubmit={createReseller} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: 22, marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#0a1628", marginBottom: 16 }}>+ New Reseller</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email *" type="email"
              style={{ padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name"
              style={{ padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company"
              style={{ padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <button type="submit" disabled={creating}
            style={{ padding: "11px 24px", borderRadius: 10, border: "none", background: "#0284c7", color: "#fff", fontWeight: 800, fontSize: 13, cursor: creating ? "default" : "pointer" }}>
            {creating ? "Creating…" : "🤝 Create Reseller"}
          </button>
        </form>

        {/* Resellers List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 15 }}>Loading…</div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Reseller</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Referral Link</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Total Volume</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Status</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resellers.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No resellers yet.</td></tr>
                ) : resellers.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{r.name || r.email}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.email}{r.company ? ` · ${r.company}` : ""}</div>
                    </td>
                    <td style={{ padding: "12px 12px" }}>
                      <code style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 6px", borderRadius: 5 }}>{r.referral_code}</code>
                      <button onClick={() => copyLink(r.referral_code)} style={{ marginLeft: 6, fontSize: 11, border: "none", background: "none", color: "#0284c7", cursor: "pointer", fontWeight: 700 }}>📋 copy link</button>
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 800, fontSize: 13, color: "#16a34a" }}>{fmt(r.total_sales_usd)}</td>
                    <td style={{ padding: "12px 12px", textAlign: "center" }}>
                      <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800,
                        background: r.status === "active" ? "rgba(34,197,94,0.1)" : r.status === "pending" ? "rgba(245,158,11,0.12)" : r.status === "rejected" ? "rgba(239,68,68,0.1)" : "rgba(148,163,184,0.1)",
                        color: r.status === "active" ? "#16a34a" : r.status === "pending" ? "#b45309" : r.status === "rejected" ? "#dc2626" : "#64748b" }}>
                        {r.status === "active" ? "🟢 Active" : r.status === "pending" ? "🟡 Pending" : r.status === "rejected" ? "✕ Rejected" : "⏸ Suspended"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "center" }}>
                      {(r.status === "active" || r.status === "suspended") && (
                        <button onClick={() => toggleStatus(r.id, r.status === "active" ? "suspended" : "active")}
                          style={{ padding: "6px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                          {r.status === "active" ? "Suspend" : "Reactivate"}
                        </button>
                      )}
                      {r.status === "rejected" && (
                        <button onClick={() => toggleStatus(r.id, "active")}
                          style={{ padding: "6px 10px", borderRadius: 7, border: "1.5px solid #86efac", background: "#f0fdf4", color: "#166534", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sales / Commission Ledger */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 800, fontSize: 14, color: "#0a1628" }}>💵 Commission Ledger</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Reseller</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Client</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Order</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Commission</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Status</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No commissioned sales yet.</td></tr>
              ) : sales.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px", fontSize: 12 }}>{resellerByCode[s.reseller_id] || s.reseller_id}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>{s.client_email}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 12 }}>{fmt(s.order_amount_usd)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#16a34a" }}>{fmt(s.commission_usd)} <span style={{ color: "#94a3b8", fontWeight: 400 }}>({s.commission_pct}%)</span></td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, background: s.status === "paid" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: s.status === "paid" ? "#16a34a" : "#f59e0b" }}>
                      {s.status === "paid" ? "✅ Paid" : "⏳ Pending"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    {s.status !== "paid" && (
                      <button onClick={() => markPaid(s.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1.5px solid #86efac", background: "#f0fdf4", color: "#166534", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
