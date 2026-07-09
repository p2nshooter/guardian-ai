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
import { PACKAGE_INFO, PRODUCT_NAMES, PRODUCT_ICONS } from "@/lib/stripe";

const PRODUCTS = ["guardian", "orchestra", "vault", "edge", "soc", "compliance", "sentinel", "antivirus", "studio", "legal"];

// Paid, non-bundle, non-trial tiers per product (client-side derive from PACKAGE_INFO).
function tiersFor(product: string) {
  return Object.entries(PACKAGE_INFO)
    .filter(([, v]: any) => v.product === product && !v.isBundle && !v.isTrial)
    .map(([code, v]: any) => ({ code, name: v.name }));
}

interface Summary { product: string; package_code: string; available: number; claimed: number; disabled: number; total: number }
interface Batch { batch_id: string; product: string; package_code: string; count: number; available: number; created_at: string }
interface PromoWindow { starts_at: string; ends_at: string; enabled: number }
interface Rating { product: string; count: number; avg_rating: number }

export default function TrialBatchPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [win, setWin] = useState<PromoWindow | null>(null);
  const [winDraft, setWinDraft] = useState<{ startsAt: string; endsAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [codes, setCodes] = useState<{ batchId: string; list: any[] } | null>(null);
  const [feedback, setFeedback] = useState<{ product: string; list: any[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/trial-batch", { credentials: "include" });
      if (r.status === 401 || r.status === 403) { router.push("/auth/login?redirect=/admin/trial-batch"); return; }
      const d = await r.json();
      setSummary(d.summary ?? []);
      setBatches(d.batches ?? []);
      setRatings(d.ratings ?? []);
      setWin(d.window ?? null);
      if (d.window) setWinDraft({ startsAt: d.window.starts_at.replace(" ", "T").slice(0, 16), endsAt: d.window.ends_at.replace(" ", "T").slice(0, 16) });
    } catch {}
    setLoading(false);
  }, [router]);

  useEffect(() => {
    (async () => {
      const u = await getSessionUser();
      if (!u || u.role !== "admin") { router.push("/auth/login?redirect=/admin/trial-batch"); return; }
      await load();
    })();
  }, [load, router]);

  const sumFor = (product: string, code: string) => summary.find(s => s.product === product && s.package_code === code);
  const ratingFor = (product: string) => ratings.find(r => r.product === product);
  const totalFor = (product: string) => summary
    .filter(s => s.product === product)
    .reduce((acc, s) => ({ available: acc.available + s.available, claimed: acc.claimed + s.claimed }), { available: 0, claimed: 0 });

  async function post(bodyObj: any, label: string) {
    setBusy(label); setMsg(null);
    try {
      const r = await fetch("/api/admin/trial-batch", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj),
      });
      const d = await r.json();
      if (!r.ok) { setMsg(`⚠️ ${d.error || "Failed"}`); }
      else if (bodyObj.action === "generate") { setMsg(`✅ Generated ${d.generated} trial codes`); await load(); }
      else if (bodyObj.action === "list_codes") { setCodes({ batchId: bodyObj.batchId, list: d.codes || [] }); }
      else if (bodyObj.action === "list_ratings") { setFeedback({ product: bodyObj.product, list: d.ratings || [] }); }
      else if (bodyObj.action === "set_window") { setMsg(`✅ Promo window ${bodyObj.enabled ? "open" : "closed"}`); await load(); }
      else { await load(); }
    } catch (e: any) { setMsg(`⚠️ ${e?.message || "Network error"}`); }
    setBusy(null);
  }

  async function saveWindow(enabled: boolean) {
    if (!winDraft) return;
    // datetime-local inputs give "YYYY-MM-DDTHH:MM" -- the API expects the
    // SQLite-style "YYYY-MM-DD HH:MM:SS" (space separator, explicit seconds).
    await post({
      action: "set_window", enabled,
      startsAt: `${winDraft.startsAt.replace("T", " ")}:00`,
      endsAt: `${winDraft.endsAt.replace("T", " ")}:00`,
    }, "window");
  }

  function copyCodes() {
    if (!codes) return;
    navigator.clipboard?.writeText(codes.list.map(c => c.code).join("\n")).catch(() => {});
    setMsg("📋 Copied all codes to clipboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ background: "#0a1628", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
        <Link href="/admin" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13 }}>← Dashboard</Link>
        <span style={{ color: "#334155", fontSize: 13 }}>|</span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>🎟️ Trial Batch Generator</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: "#94a3b8", fontSize: 11 }}>100 codes / tier · each becomes a 7-day trial when claimed</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 22, color: "#0a1628" }}>Trial Batch Generator</div>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>
            Generate batches of trial claim-codes to hand out on behalf of axto.io. Each claimed code activates a 7-day trial for that tier.
            Disable or delete any batch — disabled codes stop working immediately (claimed codes are always preserved).
          </div>
        </div>

        {win && winDraft && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: "16px 20px", marginBottom: 18, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#0a1628" }}>🪟 Claim Window</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Dates are UTC. Clients can only claim while this is open.</div>
            </div>
            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: win.enabled ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.15)", color: win.enabled ? "#16a34a" : "#64748b" }}>
              {win.enabled ? "● OPEN" : "○ CLOSED"}
            </span>
            <label style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
              From{" "}
              <input type="datetime-local" value={winDraft.startsAt}
                onChange={e => setWinDraft(w => w && { ...w, startsAt: e.target.value })}
                style={{ padding: "5px 8px", borderRadius: 6, border: "1.5px solid #e2e8f0", fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
              To{" "}
              <input type="datetime-local" value={winDraft.endsAt}
                onChange={e => setWinDraft(w => w && { ...w, endsAt: e.target.value })}
                style={{ padding: "5px 8px", borderRadius: 6, border: "1.5px solid #e2e8f0", fontSize: 12 }} />
            </label>
            <button onClick={() => saveWindow(true)} disabled={busy === "window"}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              Save & Open
            </button>
            <button onClick={() => saveWindow(false)} disabled={busy === "window"}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {win.enabled ? "Close Now" : "Save (Stay Closed)"}
            </button>
          </div>
        )}

        {msg && (
          <div style={{ background: msg.startsWith("⚠️") ? "#fef2f2" : "#f0fdf4", border: `1.5px solid ${msg.startsWith("⚠️") ? "#fca5a5" : "#86efac"}`, borderRadius: 10, padding: "10px 16px", marginBottom: 18, color: msg.startsWith("⚠️") ? "#dc2626" : "#166534", fontWeight: 700, fontSize: 13 }}>
            {msg}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 15 }}>Loading…</div>
        ) : (
          PRODUCTS.map(product => {
            const tiers = tiersFor(product);
            if (tiers.length === 0) return null;
            const total = totalFor(product);
            const rating = ratingFor(product);
            return (
              <div key={product} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", marginBottom: 16, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 18 }}>{PRODUCT_ICONS[product]}</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#0a1628" }}>{PRODUCT_NAMES[product]}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>· {total.available} available / {total.claimed} used total</span>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    {rating && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", background: "rgba(245,158,11,0.1)", padding: "3px 9px", borderRadius: 6 }}>
                        ⭐ {rating.avg_rating.toFixed(1)} ({rating.count})
                      </span>
                    )}
                    <button onClick={() => post({ action: "list_ratings", product }, "")} style={{ padding: "5px 10px", borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0284c7", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                      💬 Feedback{rating ? ` (${rating.count})` : ""}
                    </button>
                  </div>
                </div>
                <div style={{ padding: "8px 12px" }}>
                  {tiers.map(t => {
                    const s = sumFor(product, t.code);
                    return (
                      <div key={t.code} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{t.code}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, fontSize: 11 }}>
                          <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#16a34a", fontWeight: 700 }}>{s?.available ?? 0} available</span>
                          <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(2,132,199,0.1)", color: "#0284c7", fontWeight: 700 }}>{s?.claimed ?? 0} claimed</span>
                          {(s?.disabled ?? 0) > 0 && <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: 700 }}>{s?.disabled} off</span>}
                        </div>
                        <button
                          onClick={() => post({ action: "generate", packageCode: t.code, count: 100 }, `gen-${t.code}`)}
                          disabled={busy === `gen-${t.code}`}
                          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                          {busy === `gen-${t.code}` ? "…" : "+ Generate 100"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Batches */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", marginTop: 24 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontWeight: 800, fontSize: 14, color: "#0a1628" }}>🗂️ Generated Batches</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Product / Tier</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Codes</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Created</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#64748b" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No batches yet — generate one above.</td></tr>
              ) : batches.map((b, i) => (
                <tr key={b.batch_id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{PRODUCT_ICONS[b.product]} {PRODUCT_NAMES[b.product]}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{b.package_code}</div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 12 }}>{b.available}/{b.count} avail.</td>
                  <td style={{ padding: "10px 12px", fontSize: 11, color: "#64748b" }}>{new Date(b.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                      <button onClick={() => post({ action: "list_codes", batchId: b.batch_id }, "")} style={{ padding: "5px 9px", borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0284c7", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>👁 View</button>
                      <button onClick={() => post({ action: "set_batch_status", batchId: b.batch_id, status: "disabled" }, "")} style={{ padding: "5px 9px", borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#fff", color: "#f59e0b", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Disable</button>
                      <button onClick={() => post({ action: "set_batch_status", batchId: b.batch_id, status: "available" }, "")} style={{ padding: "5px 9px", borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#fff", color: "#16a34a", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Enable</button>
                      <button onClick={() => { if (confirm("Delete all unclaimed codes in this batch?")) post({ action: "delete_batch", batchId: b.batch_id }, ""); }} style={{ padding: "5px 9px", borderRadius: 6, border: "1.5px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Codes viewer modal */}
      {codes && (
        <div onClick={() => setCodes(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, maxWidth: 520, width: "100%", maxHeight: "80vh", overflow: "auto", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{codes.list.length} codes</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={copyCodes} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📋 Copy all</button>
                <button onClick={() => setCodes(null)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Close</button>
              </div>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.8, color: "#0a1628" }}>
              {codes.list.map(c => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", opacity: c.status === "disabled" ? 0.4 : 1 }}>
                  <span>{c.code}</span>
                  <span style={{ color: c.status === "claimed" ? "#0284c7" : c.status === "disabled" ? "#f59e0b" : "#16a34a" }}>
                    {c.status === "claimed" ? `claimed · ${c.claimed_email}` : c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trial satisfaction feedback modal */}
      {feedback && (
        <div onClick={() => setFeedback(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, maxWidth: 560, width: "100%", maxHeight: "80vh", overflow: "auto", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{PRODUCT_ICONS[feedback.product]} {PRODUCT_NAMES[feedback.product]} — {feedback.list.length} trial ratings</div>
              <button onClick={() => setFeedback(null)} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Close</button>
            </div>
            {feedback.list.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>No trial ratings yet for this product.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {feedback.list.map(f => (
                  <div key={f.id} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{f.client_name || f.client_email}</span>
                      <span style={{ fontSize: 12, color: "#b45309", fontWeight: 700 }}>{"⭐".repeat(f.rating)}</span>
                    </div>
                    {f.title && <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 2 }}>{f.title}</div>}
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{f.body}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>{new Date(f.created_at).toLocaleDateString()} · {f.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
