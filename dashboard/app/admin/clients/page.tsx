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

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);
  const [search,  setSearch]    = useState("");
  const [editing, setEditing]   = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", organization: "", country: "", phone: "" });
  const [saving,  setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy,    setBusy]      = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/clients", { credentials: "include" });
      if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
      if (!res.ok) { setError("Failed to load clients"); return; }
      setClients((await res.json()).clients || []);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    getSessionUser().then(u => {
      if (!u || u.role !== "admin") { router.push("/auth/login"); return; }
      load();
    });
  }, []);

  function startEdit(c: any) {
    setEditing(c.id);
    setEditForm({ name: c.name || "", organization: c.organization || "", country: c.country || "", phone: c.phone || "" });
    setSaveError(null);
  }

  async function saveEdit(id: string) {
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (res.ok) { setEditing(null); await load(); }
      else { const d = await res.json(); setSaveError(d.error || "Save failed"); }
    } catch { setSaveError("Network error"); }
    finally { setSaving(false); }
  }

  async function toggleBan(c: any) {
    const banned = c.status === "banned";
    const verb = banned ? "Unban" : "Ban";
    if (!confirm(`${verb} ${c.name || c.email}?${banned ? "" : "\n\nThis suspends all their licenses (downloads & activation blocked)."}`)) return;
    setBusy(c.id);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, action: banned ? "unban" : "ban" }),
      });
      if (res.ok) await load();
      else { const d = await res.json().catch(() => ({})); setError(d.error || `${verb} failed`); }
    } catch { setError("Network error"); }
    finally { setBusy(null); }
  }

  async function deleteClient(c: any) {
    if (!confirm(`Permanently DELETE ${c.name || c.email}?\n\nThis removes the client and ALL their licenses & invoices. This cannot be undone.`)) return;
    setBusy(c.id);
    try {
      const res = await fetch(`/api/admin/clients?id=${encodeURIComponent(c.id)}`, {
        method: "DELETE", credentials: "include",
      });
      if (res.ok) await load();
      else { const d = await res.json().catch(() => ({})); setError(d.error || "Delete failed"); }
    } catch { setError("Network error"); }
    finally { setBusy(null); }
  }

  const filtered = clients.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.organization?.toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0a1628", fontSize: 13, outline: "none", fontFamily: "inherit" } as const;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", padding: "28px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>← Dashboard</Link>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", marginTop: 8, marginBottom: 24, fontFamily: "Sora, sans-serif" }}>Clients</h1>

        {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>⚠ {error}</div>}

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search by name, email, or organization..."
          style={{ width: "100%", maxWidth: 420, padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0a1628", fontSize: 13, outline: "none", marginBottom: 16 }} />

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 12 }}>👥</div><p style={{ color: "#475569" }}>No clients found.</p></div>
          ) : filtered.map(c => (
            <div key={c.id} style={{ borderBottom: "1px solid #f1f5f9", padding: "16px 20px" }}>
              {editing === c.id ? (
                <div>
                  {saveError && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>⚠ {saveError}</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                    {[["name","Name"],["organization","Organization"],["country","Country"],["phone","Phone"]].map(([k,l]) => (
                      <div key={k}>
                        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>{l}</div>
                        <input value={(editForm as any)[k]} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} placeholder={l} style={inputStyle} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => saveEdit(c.id)} disabled={saving} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save"}</button>
                    <button onClick={() => setEditing(null)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,rgba(2,132,199,0.2),rgba(13,148,136,0.2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#38bdf8", flexShrink: 0 }}>
                      {(c.name || c.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: "#0a1628", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                        {c.name || <span style={{ color: "#475569" }}>No name</span>}
                        {c.status === "banned" && <span style={{ fontSize: 10, fontWeight: 800, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "1px 7px", letterSpacing: 0.5 }}>BANNED</span>}
                      </div>
                      <div style={{ color: "#475569", fontSize: 12 }}>{c.email}</div>
                      {c.organization && <div style={{ color: "#64748b", fontSize: 11, marginTop: 1 }}>{c.organization}{c.country ? ` · ${c.country}` : ""}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, color: "#22c55e", fontWeight: 700 }}>{c.active_count || 0} active</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{c.license_count || 0} total license{c.license_count !== 1 ? "s" : ""}</div>
                    </div>
                    <button onClick={() => startEdit(c)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "transparent", color: "#38bdf8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                    <button onClick={() => toggleBan(c)} disabled={busy === c.id} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid", borderColor: c.status === "banned" ? "rgba(34,197,94,0.4)" : "rgba(245,158,11,0.4)", background: "transparent", color: c.status === "banned" ? "#16a34a" : "#d97706", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: busy === c.id ? 0.5 : 1 }}>{c.status === "banned" ? "Unban" : "Ban"}</button>
                    <button onClick={() => deleteClient(c)} disabled={busy === c.id} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: busy === c.id ? 0.5 : 1 }}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <p style={{ color: "#334155", fontSize: 12, marginTop: 10, textAlign: "right" }}>{filtered.length} client{filtered.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
