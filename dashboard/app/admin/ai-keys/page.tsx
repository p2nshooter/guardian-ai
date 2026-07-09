/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Admin · AI Provider Key Vault — encrypted store for AI provider keys (NVIDIA
 * NIM, OpenRouter, etc.) that don't fit the single-credential payment_gateways
 * model. Filter by provider/category, see what each key is for, never see the
 * raw value again once saved.
 * ============================================================================ */
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser } from "@/lib/client-auth";

interface AiKey {
  id: string; provider: string; key_name: string; category: string; purpose: string;
  for_managed_pool: number; is_active: number; created_at: string; updated_at: string;
}

export default function AiKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<AiKey[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterProvider, setFilterProvider] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = useState({ provider: "", keyName: "", category: "", purpose: "", value: "", forManagedPool: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProvider) params.set("provider", filterProvider);
      if (filterCategory) params.set("category", filterCategory);
      const r = await fetch(`/api/admin/ai-keys?${params}`, { credentials: "include" });
      if (r.status === 401) { router.push("/auth/login"); return; }
      const d = await r.json();
      setKeys(d.keys || []); setProviders(d.providers || []); setCategories(d.categories || []);
    } catch {} finally { setLoading(false); }
  }, [filterProvider, filterCategory, router]);

  useEffect(() => {
    getSessionUser().then(u => { if (!u || u.role !== "admin") { router.push("/auth/login"); return; } load(); });
  }, [load]);

  async function addKey() {
    if (!form.provider.trim() || !form.keyName.trim() || !form.value.trim()) {
      setMsg({ kind: "err", text: "Provider, key name, and value are required" }); return;
    }
    setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/ai-keys", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ kind: "err", text: d.error || "Failed to save" }); }
      else {
        setMsg({ kind: "ok", text: "✅ Key stored (encrypted)" });
        setForm({ provider: form.provider, keyName: "", category: "", purpose: "", value: "", forManagedPool: false });
        setShowAdd(false);
        await load();
      }
    } catch (e: any) { setMsg({ kind: "err", text: e?.message || "Network error" }); }
    setSaving(false);
  }

  async function toggleActive(k: AiKey) {
    await fetch("/api/admin/ai-keys", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: k.id, isActive: k.is_active ? 0 : 1 }),
    });
    await load();
  }

  async function togglePool(k: AiKey) {
    await fetch("/api/admin/ai-keys", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: k.id, forManagedPool: k.for_managed_pool ? 0 : 1 }),
    });
    await load();
  }

  async function removeKey(id: string) {
    if (!confirm("Delete this key permanently?")) return;
    await fetch("/api/admin/ai-keys", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    await load();
  }

  const grouped: Record<string, AiKey[]> = {};
  for (const k of keys) { (grouped[k.provider] ||= []).push(k); }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0a1628", letterSpacing: "-0.5px" }}>AI Provider Key Vault</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginTop: 4, marginBottom: 20 }}>
        Encrypted (AES-256-GCM) storage for AI provider keys — NVIDIA NIM, OpenRouter, etc. Each key is tagged with
        what it's actually for, so nothing gets used blind. Values are never shown again once saved.
      </p>

      {msg && (
        <div style={{ background: msg.kind === "ok" ? "#f0fdf4" : "#fef2f2", border: `1.5px solid ${msg.kind === "ok" ? "#86efac" : "#fca5a5"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: msg.kind === "ok" ? "#166534" : "#dc2626", fontWeight: 700, fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}>
          <option value="">All providers</option>
          {providers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowAdd(s => !s)} style={{ marginLeft: "auto", padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 13, color: "#fff", background: "linear-gradient(135deg,#0284c7,#0d9488)" }}>
          {showAdd ? "✕ Cancel" : "+ Add Key"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: 20, marginBottom: 24, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", flex: 1, minWidth: 160 }}>Provider
              <input value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="nvidia / openrouter / ..."
                style={{ width: "100%", marginTop: 4, padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", flex: 1, minWidth: 160 }}>Key Name
              <input value={form.keyName} onChange={e => setForm({ ...form, keyName: e.target.value })} placeholder="NVIDIA_KEY_TTS"
                style={{ width: "100%", marginTop: 4, padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", flex: 1, minWidth: 160 }}>Category
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="speech / vision / text-generation / image"
                style={{ width: "100%", marginTop: 4, padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", flex: 2, minWidth: 220 }}>Purpose (what is this key for?)
              <input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. NVIDIA Maxine Active Speaker Detection via gRPC"
                style={{ width: "100%", marginTop: 4, padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Key Value
            <input type="password" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="nvapi-... / sk-or-v1-..."
              style={{ width: "100%", marginTop: 4, padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "monospace", fontSize: 13 }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#475569", fontWeight: 600 }}>
            <input type="checkbox" checked={form.forManagedPool} onChange={e => setForm({ ...form, forManagedPool: e.target.checked })} />
            Earmark for AXTO's shared client-facing GPU/API pool (not just internal testing)
          </label>
          <div>
            <button onClick={addKey} disabled={saving} style={{ padding: "9px 20px", borderRadius: 9, border: "none", cursor: saving ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 13, color: "#fff", background: "linear-gradient(135deg,#0284c7,#0d9488)", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving…" : "🔒 Save Encrypted"}
            </button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: "#94a3b8" }}>Loading…</div> : keys.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#94a3b8", background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0" }}>
          No keys stored yet. Click &quot;+ Add Key&quot; to add one — it will be encrypted immediately, never stored in plaintext.
        </div>
      ) : (
        Object.entries(grouped).map(([provider, providerKeys]) => (
          <div key={provider} style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{provider} ({providerKeys.length})</h2>
            {providerKeys.map(k => (
              <div key={k.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", opacity: k.is_active ? 1 : 0.55 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#0a1628", fontFamily: "monospace" }}>{k.key_name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{k.purpose || "—"}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {k.category && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#7c3aed", background: "rgba(124,58,237,.1)", borderRadius: 999, padding: "2px 8px" }}>{k.category}</span>}
                    {k.for_managed_pool === 1 && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#0d9488", background: "rgba(13,148,136,.1)", borderRadius: 999, padding: "2px 8px" }}>🌐 shared pool</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => togglePool(k)} title="Toggle shared-pool flag"
                    style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🌐</button>
                  <button onClick={() => toggleActive(k)}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 12, color: "#fff", background: k.is_active ? "linear-gradient(135deg,#16a34a,#22c55e)" : "linear-gradient(135deg,#94a3b8,#cbd5e1)" }}>
                    {k.is_active ? "ON" : "OFF"}
                  </button>
                  <button onClick={() => removeKey(k.id)}
                    style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
