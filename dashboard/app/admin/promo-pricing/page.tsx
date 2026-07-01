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

interface Promo {
  id: string;
  package_code: string;
  product: string;
  label: string;
  promo_price: number;
  promo_price_monthly: number;
  starts_at: string;
  ends_at: string;
  enabled: number;
  created_at: string;
}

const PRODUCT_META: Record<string, { icon: string; label: string; color: string }> = {
  guardian:   { icon: "🛡️",  label: "Guardian AI",      color: "#0284c7" },
  orchestra:  { icon: "🎼",  label: "Orchestra AI",     color: "#7c3aed" },
  vault:      { icon: "🔒",  label: "Vault AI",         color: "#6366f1" },
  edge:       { icon: "🌐",  label: "Edge AI",          color: "#0891b2" },
  soc:        { icon: "🎯",  label: "SOC AI",           color: "#dc2626" },
  compliance: { icon: "📋",  label: "Compliance AI",    color: "#16a34a" },
  sentinel:   { icon: "🏭",  label: "Sentinel OT",      color: "#ca8a04" },
  antivirus:  { icon: "🦠",  label: "Antivirus",        color: "#e879f9" },
  studio:     { icon: "🧠",  label: "AXTO Studio",      color: "#0f766e" },
  legal:      { icon: "⚖️",  label: "Legal AI",         color: "#4338ca" },
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function fmtDate(s: string) {
  if (!s) return "-";
  return new Date(s).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
function status(p: Promo): "scheduled" | "active" | "expired" | "hidden" {
  const now = Date.now();
  const starts = new Date(p.starts_at).getTime();
  const ends = new Date(p.ends_at).getTime();
  if (!p.enabled) return "hidden";
  if (now < starts) return "scheduled";
  if (now > ends) return "expired";
  return "active";
}
const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  active:    { color: "#16a34a", bg: "rgba(34,197,94,0.1)",  label: "🟢 Active" },
  scheduled: { color: "#0284c7", bg: "rgba(2,132,199,0.1)",  label: "🕐 Scheduled" },
  expired:   { color: "#94a3b8", bg: "rgba(148,163,184,0.1)",label: "⚪ Expired" },
  hidden:    { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "🙈 Hidden" },
};

// Sensible default: rest of the current month, in package codes the admin can pick from lib/stripe.ts.
function defaultWindow() {
  const now = new Date();
  const start = now.toISOString().slice(0, 16);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59).toISOString().slice(0, 16);
  return { start, end };
}

export default function PromoPricingPage() {
  const router = useRouter();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [packages, setPackages] = useState<{ code: string; name: string; product: string; price: number; priceMonthly: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const w = defaultWindow();
  const [form, setForm] = useState({
    packageCode: "", label: "", promoPrice: "", promoPriceMonthly: "",
    startsAt: w.start, endsAt: w.end,
  });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pr, pkgr] = await Promise.all([
        fetch("/api/admin/promo-pricing", { credentials: "include" }),
        fetch("/api/admin/pricing", { credentials: "include" }),
      ]);
      if (pr.status === 401 || pr.status === 403) { router.push("/auth/login?redirect=/admin/promo-pricing"); return; }
      const pd = await pr.json();
      const pkgd = await pkgr.json();
      setPromos(pd.promos ?? []);
      setPackages((pkgd.packages ?? []).filter((p: any) => !p.isBundle));
    } catch (e: any) {
      setError("Failed to load — " + (e?.message ?? e));
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    (async () => {
      const u = await getSessionUser();
      if (!u || u.role !== "admin") { router.push("/auth/login?redirect=/admin/promo-pricing"); return; }
      await load();
    })();
  }, [load, router]);

  async function createPromo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const promoPrice = parseFloat(form.promoPrice);
    if (!form.packageCode) { setError("Choose a package"); return; }
    if (!promoPrice || promoPrice <= 0) { setError("Promo price must be > 0"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/promo-pricing", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageCode: form.packageCode,
          label: form.label,
          promoPrice,
          promoPriceMonthly: form.promoPriceMonthly ? parseFloat(form.promoPriceMonthly) : undefined,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Failed to create promo"); return; }
      setForm(f => ({ ...f, packageCode: "", label: "", promoPrice: "", promoPriceMonthly: "" }));
      await load();
    } catch (e: any) { setError(e?.message ?? "Failed to create promo"); }
    setSaving(false);
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch("/api/admin/promo-pricing", {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    setPromos(prev => prev.map(p => p.id === id ? { ...p, enabled: enabled ? 1 : 0 } : p));
  }

  async function remove(id: string) {
    if (!confirm("Delete this promo permanently?")) return;
    await fetch(`/api/admin/promo-pricing?id=${id}`, { method: "DELETE", credentials: "include" });
    setPromos(prev => prev.filter(p => p.id !== id));
  }

  const selectedPkg = packages.find(p => p.code === form.packageCode);

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ background: "#0a1628", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
        <Link href="/admin" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>
        <span style={{ color: "#334155", fontSize: 13 }}>|</span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>🎉 Promo Pricing</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: "#94a3b8", fontSize: 11 }}>Time-boxed discounts — auto-expire, no code deploy needed</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 900, fontSize: 22, color: "#0a1628" }}>Promo Pricing</div>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>
            Create a launch-month or seasonal discount for any package. It shows on the landing page, register page and
            checkout automatically while active, and reverts to the normal price the moment it ends — or instantly if you hide it.
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontWeight: 700, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Create form */}
        <form onSubmit={createPromo} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: 22, marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#0a1628", marginBottom: 16 }}>+ New Promo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Package *</label>
              <select value={form.packageCode} onChange={e => setForm(f => ({ ...f, packageCode: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13 }}>
                <option value="">Choose a package…</option>
                {Object.entries(PRODUCT_META).map(([prod, meta]) => {
                  const rows = packages.filter(p => p.product === prod);
                  if (rows.length === 0) return null;
                  return (
                    <optgroup key={prod} label={`${meta.icon} ${meta.label}`}>
                      {rows.map(p => <option key={p.code} value={p.code}>{p.name} — {fmt(p.price)}/yr</option>)}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Label (shown to clients)</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Launch Month Special"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>
                Promo Price/yr * {selectedPkg ? <span style={{ color: "#94a3b8", fontWeight: 500 }}>(normal {fmt(selectedPkg.price)})</span> : null}
              </label>
              <input type="number" min="1" value={form.promoPrice} onChange={e => setForm(f => ({ ...f, promoPrice: e.target.value }))}
                placeholder="e.g. 990"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Promo Price/mo (optional)</label>
              <input type="number" min="0" value={form.promoPriceMonthly} onChange={e => setForm(f => ({ ...f, promoPriceMonthly: e.target.value }))}
                placeholder="auto = ÷10"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Starts</label>
              <input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Ends</label>
              <input type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            style={{ padding: "11px 24px", borderRadius: 10, border: "none", background: "#0284c7", color: "#fff", fontWeight: 800, fontSize: 13, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Creating…" : "🎉 Create Promo"}
          </button>
        </form>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 15 }}>Loading promos…</div>
        ) : promos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 14, background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0" }}>
            No promos yet. Create one above.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Package</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Label</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Promo Price</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Window</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Status</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p, i) => {
                  const meta = PRODUCT_META[p.product] ?? { icon: "📦", label: p.product, color: "#64748b" };
                  const st = status(p);
                  const sm = STATUS_META[st];
                  return (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{meta.icon} {p.package_code}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{meta.label}</div>
                      </td>
                      <td style={{ padding: "12px 12px", fontSize: 12, color: "#475569" }}>{p.label || "-"}</td>
                      <td style={{ padding: "12px 12px", textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "#16a34a" }}>{fmt(p.promo_price)}/yr</div>
                        {p.promo_price_monthly > 0 && <div style={{ fontSize: 10, color: "#94a3b8" }}>{fmt(p.promo_price_monthly)}/mo</div>}
                      </td>
                      <td style={{ padding: "12px 12px", fontSize: 11, color: "#64748b" }}>
                        {fmtDate(p.starts_at)}<br />→ {fmtDate(p.ends_at)}
                      </td>
                      <td style={{ padding: "12px 12px", textAlign: "center" }}>
                        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, background: sm.bg, color: sm.color }}>
                          {sm.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={() => toggle(p.id, !p.enabled)}
                            style={{ padding: "6px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                            {p.enabled ? "🙈 Hide" : "👁 Show"}
                          </button>
                          <button onClick={() => remove(p.id)}
                            style={{ padding: "6px 10px", borderRadius: 7, border: "1.5px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
