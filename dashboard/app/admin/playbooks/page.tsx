/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/client-auth";

export default function AdminPlaybooksPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"playbooks"|"bundles"|"purchases">("playbooks");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/playbooks", { credentials: "include" });
      if (res.status === 401) { router.push("/auth/login?redirect=/admin/playbooks"); return; }
      if (res.ok) setData(await res.json());
      else setError("Failed to load");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    getSessionUser().then(u => { if (!u || u.role !== "admin") { router.push("/auth/login"); return; } load(); });
  }, []);

  async function action(body: any) {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/playbooks", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (res.ok) { await load(); setEditId(null); setForm({}); }
      else setError(d.error || "Action failed");
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  async function uploadFile(playbookId: string, file: File) {
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("playbook_id", playbookId);
      const res = await fetch("/api/admin/playbooks/upload", { method: "POST", credentials: "include", body: fd });
      const d = await res.json();
      if (res.ok) { await load(); }
      else setError(d.error || "Upload failed");
    } catch { setError("Upload network error"); }
    finally { setUploading(false); }
  }

  const TAB = (active: boolean) => ({ flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 as const, background: active ? "linear-gradient(135deg,#7c3aed,#0284c7)" : "transparent", color: active ? "#fff" : "#64748b" });

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", display: "flex" }}>
      {/* Sidebar */}
      <nav style={{ width: 220, background: "#fff", borderRight: "1px solid #e2e8f0", padding: "20px 12px", display: "flex", flexDirection: "column", gap: 2, position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 24, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛡</div>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>AXTO</span>
        </Link>
        {[
          { href: "/admin", icon: "📊", label: "Dashboard" },
          { href: "/admin/playbooks", icon: "📦", label: "Playbooks" },
          { href: "/admin/licenses", icon: "🔑", label: "Licenses" },
          { href: "/admin/clients", icon: "👥", label: "Clients" },
          { href: "/admin/revenue", icon: "💰", label: "Revenue" },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, textDecoration: "none", fontSize: 13, fontWeight: 600, color: n.href === "/admin/playbooks" ? "#7c3aed" : "#475569", background: n.href === "/admin/playbooks" ? "rgba(124,58,237,0.06)" : "transparent" }}>
            <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", margin: 0 }}>📦 Playbooks Manager</h1>
            <p style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
              {data?.stats?.total_playbooks || 0} playbooks · {data?.stats?.total_purchases || 0} sales · ${Number(data?.stats?.total_revenue || 0).toLocaleString()} revenue
            </p>
          </div>
          <button onClick={() => { setEditId("new"); setForm({ action: "create_playbook", price_usd: 19, original_price: 29, prompt_count: 20 }); }} style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>+ New Playbook</button>
        </div>

        {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>⚠ {error}</div>}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#e2e8f0", borderRadius: 12, padding: 4, marginBottom: 24, maxWidth: 400 }}>
          <button onClick={() => setTab("playbooks")} style={TAB(tab === "playbooks")}>Playbooks</button>
          <button onClick={() => setTab("bundles")} style={TAB(tab === "bundles")}>Bundles</button>
          <button onClick={() => setTab("purchases")} style={TAB(tab === "purchases")}>Purchases</button>
        </div>

        {/* Playbooks list */}
        {tab === "playbooks" && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                {["Name","Category","Price","Prompts","Downloads","File","Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "#475569", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(data?.playbooks || []).map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ fontWeight: 600, color: "#0a1628" }}>{p.icon} {p.name}</div>
                      {p.badge && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}>{p.badge}</span>}
                    </td>
                    <td style={{ padding: "11px 14px", color: "#64748b" }}>{p.category_name || "—"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontWeight: 700, color: "#0a1628" }}>${p.price_usd}</span>
                      {p.original_price > p.price_usd && <span style={{ fontSize: 11, color: "#94a3b8", textDecoration: "line-through", marginLeft: 4 }}>${p.original_price}</span>}
                    </td>
                    <td style={{ padding: "11px 14px", color: "#64748b" }}>{p.prompt_count}</td>
                    <td style={{ padding: "11px 14px", color: "#64748b" }}>{p.download_count}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {p.r2_key ? <span style={{ color: "#22c55e", fontSize: 12 }}>✅ Uploaded</span> : <span style={{ color: "#f59e0b", fontSize: 12 }}>⚠ No file</span>}
                      <label style={{ marginLeft: 8, cursor: "pointer", color: "#0284c7", fontSize: 11, fontWeight: 600 }}>
                        {uploading ? "..." : "Upload"}
                        <input type="file" accept=".pdf,.zip,.md,.txt" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) uploadFile(p.id, e.target.files[0]); }} />
                      </label>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => { setEditId(p.id); setForm({ action: "update_playbook", id: p.id, ...p }); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 12 }}>✏️</button>
                        <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) action({ action: "delete_playbook", id: p.id }); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>🗑</button>
                        {p.r2_key && <a href={`/api/playbooks/download?id=${p.id}&admin=1`} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#0284c7", cursor: "pointer", fontSize: 12, textDecoration: "none" }}>⬇</a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>Loading...</div>}
            {!loading && !(data?.playbooks?.length) && <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>No playbooks yet. Click "+ New Playbook" to create one.</div>}
          </div>
        )}

        {/* Purchases tab */}
        {tab === "purchases" && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                {["Client","Item","Amount","Gateway","Date","Status"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "#475569", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(data?.purchases || []).map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 14px", color: "#0a1628" }}>{p.client_email}</td>
                    <td style={{ padding: "11px 14px", color: "#64748b" }}>{p.playbook_name || p.bundle_name || "—"}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 700, color: "#22c55e" }}>${p.amount_usd}</td>
                    <td style={{ padding: "11px 14px", color: "#64748b" }}>{p.gateway}</td>
                    <td style={{ padding: "11px 14px", color: "#64748b" }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "11px 14px" }}><span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: p.status === "completed" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: p.status === "completed" ? "#22c55e" : "#f59e0b", fontWeight: 700 }}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.purchases?.length && <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>No purchases yet.</div>}
          </div>
        )}

        {/* Bundles tab */}
        {tab === "bundles" && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 24 }}>
            <p style={{ color: "#64748b", fontSize: 13 }}>Bundles are configured in the catalog. Use the Playbooks API to manage bundles programmatically.</p>
            {(data?.bundles || []).map((b: any) => (
              <div key={b.id} style={{ padding: 16, borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ fontWeight: 700, color: "#0a1628" }}>{b.name} — ${b.price_usd} <span style={{ color: "#94a3b8", textDecoration: "line-through" }}>${b.original_price}</span></div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{b.description}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Edit Modal ── */}
      {editId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setEditId(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0a1628", marginBottom: 20 }}>{editId === "new" ? "Create Playbook" : "Edit Playbook"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="Name" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14 }} />
              <input placeholder="Subtitle" value={form.subtitle || ""} onChange={e => setForm({ ...form, subtitle: e.target.value })} style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14 }} />
              <textarea placeholder="Description" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, resize: "vertical" }} />
              <textarea placeholder="Long description (marketing copy)" value={form.long_description || ""} onChange={e => setForm({ ...form, long_description: e.target.value })} rows={4} style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, resize: "vertical" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>Price (USD)</label><input type="number" value={form.price_usd || 0} onChange={e => setForm({ ...form, price_usd: Number(e.target.value) })} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} /></div>
                <div><label style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>Original Price</label><input type="number" value={form.original_price || 0} onChange={e => setForm({ ...form, original_price: Number(e.target.value) })} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} /></div>
                <div><label style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>Prompt Count</label><input type="number" value={form.prompt_count || 0} onChange={e => setForm({ ...form, prompt_count: Number(e.target.value) })} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>Icon (emoji)</label><input value={form.icon || ""} onChange={e => setForm({ ...form, icon: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} /></div>
                <div><label style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>Badge</label><input value={form.badge || ""} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="BEST SELLER" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0" }} /></div>
              </div>
              <select value={form.category_id || ""} onChange={e => setForm({ ...form, category_id: e.target.value })} style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, background: "#fff" }}>
                <option value="">Select category</option>
                {(data?.categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <textarea placeholder="Preview text (shown before purchase)" value={form.preview_text || ""} onChange={e => setForm({ ...form, preview_text: e.target.value })} rows={3} style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "monospace", resize: "vertical" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => action(form)} disabled={saving} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : editId === "new" ? "Create" : "Save Changes"}</button>
                <button onClick={() => setEditId(null)} style={{ padding: "12px 24px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
