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
import { GPU_PROVIDERS, STUDIO_TYPES } from "@/lib/studio";

const S = STUDIO_TYPES.gpu;

type GpuInstance = { id: string; instance_name: string; provider: string; gpu_type: string; gpu_count: number; vram_gb: number; endpoint_url: string; status: string; deployed_model: string; last_health: string };
type Credential = { id: string; provider: string; category: string; label: string; is_active: number; is_verified: number };

export default function GPUStudioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [instances, setInstances] = useState<GpuInstance[]>([]);
  const [usage, setUsage] = useState<any>({ today: {}, month: {} });
  const [showAddGpu, setShowAddGpu] = useState(false);
  const [newGpu, setNewGpu] = useState({ provider: "runpod", api_key: "", endpoint: "", label: "" });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/studio", { credentials: "include" });
      if (res.status === 401) { router.push("/auth/login"); return; }
      if (res.ok) {
        const d = await res.json();
        setTenant(d.tenant);
        setCredentials(d.credentials?.filter((c: any) => c.category === "gpu") || []);
        setInstances(d.gpuInstances || []);
        setUsage(d.usage);
      }
    } catch {} finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, []);

  async function addGpuCredential() {
    setAdding(true);
    try {
      const res = await fetch("/api/studio", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_credential", provider: newGpu.provider, api_key: newGpu.api_key, endpoint: newGpu.endpoint, label: newGpu.label || newGpu.provider, category: "gpu" }),
      });
      if (res.ok) { setShowAddGpu(false); setNewGpu({ provider: "runpod", api_key: "", endpoint: "", label: "" }); await load(); }
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch {} finally { setAdding(false); }
  }

  const statusColors: Record<string, { color: string; bg: string }> = {
    online:  { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    offline: { color: "#64748b", bg: "rgba(100,116,139,0.12)" },
    busy:    { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    error:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Loading GPU Studio...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", color: "#e2e8f0", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ── Top Bar ── */}
      <nav style={{ background: "rgba(10,10,26,0.95)", borderBottom: "1px solid rgba(245,158,11,0.15)", padding: "0 20px", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/portal" style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>← Portal</Link>
            <div style={{ width: 1, height: 24, background: "rgba(245,158,11,0.2)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>⚡</span>
              <span style={{ fontSize: 16, fontWeight: 800, background: S.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GPU Studio</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/studio/ai" style={{ color: "#64748b", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>🧠 AI Studio</Link>
            <Link href="/studio/hybrid" style={{ color: "#64748b", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>🔀 Hybrid</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { icon: "🖥️", label: "GPU Endpoints", value: instances.length, color: "#f59e0b" },
            { icon: "🟢", label: "Online", value: instances.filter(i => i.status === "online").length, color: "#22c55e" },
            { icon: "🔑", label: "Credentials", value: credentials.length, color: "#a78bfa" },
            { icon: "📊", label: "Requests Today", value: usage?.today?.requests || 0, color: "#0ea5e9" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "18px 16px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color, fontFamily: "Sora, sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* GPU Instances */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>GPU Endpoints</h2>
          <button onClick={() => setShowAddGpu(true)} style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: S.gradient, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>+ Add GPU Provider</button>
        </div>

        {instances.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1.5px dashed rgba(245,158,11,0.2)" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⚡</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0", marginBottom: 8 }}>No GPU Endpoints Connected</h3>
            <p style={{ color: "#64748b", fontSize: 13, maxWidth: 440, margin: "0 auto 20px", lineHeight: 1.7 }}>
              Connect your RunPod, Lambda, vast.ai, or custom GPU server. Your credentials stay encrypted and isolated — no other user can access them.
            </p>
            <button onClick={() => setShowAddGpu(true)} style={{
              padding: "12px 28px", borderRadius: 12, border: "none",
              background: S.gradient, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            }}>🔑 Connect Your First GPU</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
            {instances.map(inst => {
              const st = statusColors[inst.status] || statusColors.offline;
              return (
                <div key={inst.id} style={{
                  background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "20px",
                  border: `1px solid ${st.color}25`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#e2e8f0" }}>{inst.instance_name || "GPU Instance"}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{inst.provider} · {inst.gpu_type}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 6, background: st.bg, color: st.color, fontWeight: 700 }}>
                      {inst.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 10px", borderRadius: 8 }}>
                      <div style={{ fontSize: 10, color: "#475569", fontWeight: 700 }}>GPU</div>
                      <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 700 }}>{inst.gpu_count}× {inst.gpu_type}</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 10px", borderRadius: 8 }}>
                      <div style={{ fontSize: 10, color: "#475569", fontWeight: 700 }}>VRAM</div>
                      <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 700 }}>{inst.vram_gb} GB</div>
                    </div>
                  </div>
                  {inst.deployed_model && (
                    <div style={{ fontSize: 11, color: "#a78bfa", background: "rgba(139,92,246,0.08)", padding: "6px 10px", borderRadius: 6, marginBottom: 8 }}>
                      🤖 Model: {inst.deployed_model}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", wordBreak: "break-all" }}>
                    {inst.endpoint_url || "No endpoint configured"}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* GPU Provider Credentials */}
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", marginTop: 32, marginBottom: 14 }}>🔑 GPU Provider Credentials</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {credentials.map(c => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{GPU_PROVIDERS.find(p => p.id === c.provider)?.icon || "🖥️"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{c.label || c.provider}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{c.provider}</div>
                </div>
              </div>
              <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: c.is_verified ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", color: c.is_verified ? "#22c55e" : "#f59e0b", fontWeight: 700 }}>
                {c.is_verified ? "✓ Connected" : "⚠ Unverified"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add GPU Modal ── */}
      {showAddGpu && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={() => setShowAddGpu(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0f0f23", borderRadius: 20, padding: 32, width: "100%", maxWidth: 480, border: "1px solid rgba(245,158,11,0.2)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0", marginBottom: 20 }}>⚡ Add GPU Provider</h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Provider</label>
              <select value={newGpu.provider} onChange={e => setNewGpu(c => ({ ...c, provider: e.target.value }))} style={{
                width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)",
                background: "rgba(245,158,11,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", marginTop: 4,
              }}>
                {GPU_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>API Key</label>
              <input type="password" value={newGpu.api_key} onChange={e => setNewGpu(c => ({ ...c, api_key: e.target.value }))}
                placeholder="Your provider API key" style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)",
                  background: "rgba(245,158,11,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", marginTop: 4,
                }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Endpoint URL (for custom GPU)</label>
              <input value={newGpu.endpoint} onChange={e => setNewGpu(c => ({ ...c, endpoint: e.target.value }))}
                placeholder="https://your-gpu-server:8000/v1" style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)",
                  background: "rgba(245,158,11,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", marginTop: 4,
                }} />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAddGpu(false)} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)",
                background: "transparent", color: "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
              <button onClick={addGpuCredential} disabled={adding || !newGpu.api_key} style={{
                flex: 2, padding: "12px", borderRadius: 10, border: "none",
                background: newGpu.api_key ? S.gradient : "rgba(245,158,11,0.1)",
                color: newGpu.api_key ? "#fff" : "#475569",
                fontSize: 13, fontWeight: 700, cursor: newGpu.api_key ? "pointer" : "not-allowed", fontFamily: "inherit",
              }}>{adding ? "Connecting..." : "Connect GPU →"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
