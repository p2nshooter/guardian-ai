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

// ── Types ─────────────────────────────────────────────────────────────────────
interface PkgRow {
  code: string;
  name: string;
  product: string;
  tier?: string;
  isBundle: boolean;
  forSale: boolean;
  price: number;
  priceMonthly: number;
  staticPrice: number;
  staticPriceMonthly: number;
  source: "db" | "static";
}

// ── Product meta ──────────────────────────────────────────────────────────────
const PRODUCT_META: Record<string, { icon: string; label: string; color: string }> = {
  guardian:   { icon: "🛡️",  label: "Guardian AI",      color: "#0284c7" },
  orchestra:  { icon: "🎼",  label: "Orchestra AI",     color: "#7c3aed" },
  bundle:     { icon: "🎁",  label: "Bundles & Suites", color: "#0d9488" },
  vault:      { icon: "🔒",  label: "Vault AI",         color: "#6366f1" },
  edge:       { icon: "🌐",  label: "Edge AI",          color: "#0891b2" },
  soc:        { icon: "🎯",  label: "SOC AI",           color: "#dc2626" },
  compliance: { icon: "📋",  label: "Compliance AI",    color: "#b45309" },
  sentinel:   { icon: "🏭",  label: "Sentinel OT",      color: "#4d7c0f" },
  antivirus:  { icon: "🦠",  label: "Antivirus",        color: "#7c3aed" },
  studio:     { icon: "🧠",  label: "AXTO Studio",      color: "#0f766e" },
  legal:      { icon: "⚖️",  label: "Legal AI",         color: "#4338ca" },
};

const PRODUCT_ORDER = ["guardian","orchestra","bundle","vault","edge","soc","compliance","sentinel","antivirus","studio","legal"];

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPricingPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<PkgRow[]>([]);
  const [edits, setEdits] = useState<Record<string, { price: string; monthly: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/pricing", { credentials: "include" });
      if (res.status === 401 || res.status === 403) { router.push("/auth/login?redirect=/admin/pricing"); return; }
      const d = await res.json();
      setPackages(d.packages ?? []);
      // Seed edits with current live prices
      const init: Record<string, { price: string; monthly: string }> = {};
      for (const p of (d.packages ?? [])) {
        init[p.code] = { price: String(p.price), monthly: String(p.priceMonthly) };
      }
      setEdits(init);
    } catch (e: any) {
      setError("Failed to load pricing — " + (e?.message ?? e));
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    (async () => {
      const u = await getSessionUser();
      if (!u || u.role !== "admin") { router.push("/auth/login?redirect=/admin/pricing"); return; }
      await load();
    })();
  }, [load, router]);

  // Save a single package
  async function saveSingle(code: string) {
    const e = edits[code];
    if (!e) return;
    const price = parseFloat(e.price);
    const monthly = parseFloat(e.monthly);
    if (!price || price <= 0) { setError(`Invalid price for ${code}`); return; }
    setSaving(code); setError(null);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, price, priceMonthly: monthly || Math.round(price / 10) }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Save failed"); } else {
        setSaved(code);
        setTimeout(() => setSaved(null), 2000);
        // Update local state
        setPackages(prev => prev.map(p => p.code === code ? { ...p, price, priceMonthly: monthly, source: "db" } : p));
      }
    } catch (e: any) { setError(e?.message ?? "Save failed"); }
    setSaving(null);
  }

  // Save ALL changed packages in one bulk PUT
  async function saveAll() {
    const updates = packages
      .filter(p => {
        const e = edits[p.code];
        if (!e) return false;
        return parseFloat(e.price) !== p.staticPrice || parseFloat(e.monthly) !== p.staticPriceMonthly;
      })
      .map(p => ({
        code: p.code,
        price: parseFloat(edits[p.code]?.price ?? "0"),
        priceMonthly: parseFloat(edits[p.code]?.monthly ?? "0"),
      }))
      .filter(u => u.price > 0);

    if (updates.length === 0) { setError("No changes to save."); return; }
    setSavingAll(true); setError(null);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Bulk save failed"); }
      else {
        setSaved("__all__");
        setTimeout(() => setSaved(null), 3000);
        await load(); // refresh from DB
      }
    } catch (e: any) { setError(e?.message ?? "Bulk save failed"); }
    setSavingAll(false);
  }

  // Reset single price to static default
  function resetSingle(code: string) {
    const pkg = packages.find(p => p.code === code);
    if (!pkg) return;
    setEdits(prev => ({ ...prev, [code]: { price: String(pkg.staticPrice), monthly: String(pkg.staticPriceMonthly) } }));
  }

  // Group packages by product
  const grouped: Record<string, PkgRow[]> = {};
  for (const p of packages) {
    const key = p.isBundle ? "bundle" : p.product;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }

  const allDirty = packages.filter(p => {
    const e = edits[p.code];
    if (!e) return false;
    return parseFloat(e.price) !== p.staticPrice || parseFloat(e.monthly) !== p.staticPriceMonthly;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#0a1628", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
        <Link href="/admin" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>
        <span style={{ color: "#334155", fontSize: 13 }}>|</span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>💰 Live Pricing Manager</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: "#94a3b8", fontSize: 11 }}>Changes take effect immediately — no deploy needed</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22, color: "#0a1628" }}>Live Pricing Manager</div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>
              Prices stored in D1 database — live immediately, no code deploy required.
              <span style={{ marginLeft: 8, color: "#0284c7", fontWeight: 600 }}>
                Checkout uses DB price first; falls back to code if DB unavailable.
              </span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          {allDirty.length > 0 && (
            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>
              {allDirty.length} unsaved change{allDirty.length > 1 ? "s" : ""}
            </div>
          )}
          <button
            onClick={saveAll}
            disabled={savingAll || allDirty.length === 0}
            style={{
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: allDirty.length > 0 ? "#0284c7" : "#cbd5e1",
              color: "#fff", fontWeight: 800, fontSize: 13,
              cursor: allDirty.length > 0 ? "pointer" : "default",
            }}
          >
            {savingAll ? "Saving..." : saved === "__all__" ? "✅ Saved All!" : `💾 Save All Changes${allDirty.length > 0 ? ` (${allDirty.length})` : ""}`}
          </button>
          <button onClick={load} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontWeight: 700, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 15 }}>Loading pricing data...</div>
        ) : (
          PRODUCT_ORDER.map(productKey => {
            const rows = grouped[productKey];
            if (!rows || rows.length === 0) return null;
            const meta = PRODUCT_META[productKey] ?? { icon: "📦", label: productKey, color: "#64748b" };
            return (
              <div key={productKey} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", marginBottom: 24, overflow: "hidden" }}>
                {/* Group header */}
                <div style={{ padding: "16px 22px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0a1628" }}>{meta.label}</div>
                  <div style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>{rows.length} tier{rows.length !== 1 ? "s" : ""}</div>
                </div>

                {/* Package rows */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", width: "30%" }}>Package</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Default (code)</th>
                        <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b", width: 140 }}>Annual Price (USD)</th>
                        <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b", width: 130 }}>Monthly Price (USD)</th>
                        <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Source</th>
                        <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((pkg, i) => {
                        const e = edits[pkg.code] ?? { price: String(pkg.price), monthly: String(pkg.priceMonthly) };
                        const editPrice = parseFloat(e.price) || 0;
                        const editMonthly = parseFloat(e.monthly) || 0;
                        const isDirty = editPrice !== pkg.staticPrice || editMonthly !== pkg.staticPriceMonthly;
                        const isLive = pkg.source === "db";
                        const isSaving = saving === pkg.code;
                        const isSaved = saved === pkg.code;
                        return (
                          <tr key={pkg.code} style={{
                            background: isDirty ? "#fffbeb" : i % 2 === 0 ? "#fff" : "#f8fafc",
                            borderTop: "1px solid #f1f5f9",
                          }}>
                            {/* Name */}
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{pkg.name}</div>
                              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, fontFamily: "monospace" }}>{pkg.code}</div>
                            </td>
                            {/* Default */}
                            <td style={{ padding: "12px 12px", textAlign: "right" }}>
                              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{fmt(pkg.staticPrice)}</div>
                              <div style={{ fontSize: 10, color: "#94a3b8" }}>{fmt(pkg.staticPriceMonthly)}/mo</div>
                            </td>
                            {/* Annual input */}
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                                <span style={{ fontSize: 12, color: "#64748b" }}>$</span>
                                <input
                                  type="number" min="1" step="1"
                                  value={e.price}
                                  onChange={ev => setEdits(prev => ({
                                    ...prev,
                                    [pkg.code]: {
                                      ...prev[pkg.code],
                                      price: ev.target.value,
                                      // Auto-calc monthly as /10 if user edits annual
                                      monthly: String(Math.round(parseFloat(ev.target.value || "0") / 10)),
                                    },
                                  }))}
                                  style={{
                                    width: 90, padding: "6px 8px", borderRadius: 7,
                                    border: isDirty ? "1.5px solid #f59e0b" : "1.5px solid #e2e8f0",
                                    background: isDirty ? "#fffbeb" : "#fff",
                                    fontSize: 13, fontWeight: 700, textAlign: "right",
                                    outline: "none",
                                  }}
                                />
                              </div>
                            </td>
                            {/* Monthly input */}
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                                <span style={{ fontSize: 12, color: "#64748b" }}>$</span>
                                <input
                                  type="number" min="1" step="1"
                                  value={e.monthly}
                                  onChange={ev => setEdits(prev => ({ ...prev, [pkg.code]: { ...prev[pkg.code], monthly: ev.target.value } }))}
                                  style={{
                                    width: 82, padding: "6px 8px", borderRadius: 7,
                                    border: isDirty ? "1.5px solid #f59e0b" : "1.5px solid #e2e8f0",
                                    background: isDirty ? "#fffbeb" : "#fff",
                                    fontSize: 13, fontWeight: 600, textAlign: "right",
                                    outline: "none",
                                  }}
                                />
                              </div>
                            </td>
                            {/* Source badge */}
                            <td style={{ padding: "12px 12px", textAlign: "center" }}>
                              <span style={{
                                display: "inline-block", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800,
                                background: isLive ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.1)",
                                color: isLive ? "#16a34a" : "#64748b",
                              }}>
                                {isLive ? "🟢 DB" : "⚪ CODE"}
                              </span>
                            </td>
                            {/* Actions */}
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                <button
                                  onClick={() => saveSingle(pkg.code)}
                                  disabled={isSaving || !isDirty}
                                  style={{
                                    padding: "6px 12px", borderRadius: 7, border: "none",
                                    background: isSaved ? "rgba(34,197,94,0.15)" : isDirty ? "#0284c7" : "#e2e8f0",
                                    color: isSaved ? "#16a34a" : isDirty ? "#fff" : "#94a3b8",
                                    fontWeight: 700, fontSize: 11, cursor: isDirty ? "pointer" : "default",
                                    minWidth: 56,
                                  }}
                                >
                                  {isSaving ? "..." : isSaved ? "✅" : "Save"}
                                </button>
                                {isDirty && (
                                  <button
                                    onClick={() => resetSingle(pkg.code)}
                                    style={{
                                      padding: "6px 10px", borderRadius: 7,
                                      border: "1.5px solid #e2e8f0", background: "#fff",
                                      color: "#64748b", fontWeight: 700, fontSize: 11, cursor: "pointer",
                                    }}
                                  >↩</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}

        {/* Footer info */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "18px 22px", marginTop: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#0a1628", marginBottom: 8 }}>⚠️ Important Notes</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#64748b", fontSize: 12, lineHeight: 1.8 }}>
            <li>Prices saved here take effect immediately in checkout — no deploy needed.</li>
            <li>
              <strong>Stripe Price IDs</strong>: for Guardian &amp; Orchestra packages, if you have static
              Stripe Price IDs configured in <Link href="/admin/gateways" style={{ color: "#0284c7" }}>/admin/gateways</Link>,
              those override the price set here. Clear those fields to use live pricing for all packages.
            </li>
            <li><strong>🟢 DB</strong> = price currently served from database. <strong>⚪ CODE</strong> = migration 0034 not yet applied for this code — save once to persist.</li>
            <li>Monthly price is auto-calculated as Annual ÷ 10 when you change Annual. Adjust separately if needed.</li>
            <li>Landing page and registration page fetch prices from <code>/api/packages</code> which uses the same live prices.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
