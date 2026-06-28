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
import { STUDIO_TYPES } from "@/lib/studio";

const S = STUDIO_TYPES.hybrid;

type Pipeline = { id: string; title: string; description: string; status: string; last_run: string; run_count: number; created_at: string };

export default function HybridStudioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>({ today: {}, month: {} });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/studio", { credentials: "include" });
      if (res.status === 401) { router.push("/auth/login"); return; }
      if (res.ok) {
        const d = await res.json();
        setTenant(d.tenant);
        setPipelines(d.pipelines || []);
        setCredentials(d.credentials || []);
        setUsage(d.usage);
      }
    } catch {} finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, []);

  const aiCreds = credentials.filter((c: any) => c.category === "ai");
  const gpuCreds = credentials.filter((c: any) => c.category === "gpu");

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#0ea5e9" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔀</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Loading Hybrid Studio...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", color: "#e2e8f0", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ── Top Bar ── */}
      <nav style={{ background: "rgba(10,10,26,0.95)", borderBottom: "1px solid rgba(14,165,233,0.15)", padding: "0 20px", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/portal" style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>← Portal</Link>
            <div style={{ width: 1, height: 24, background: "rgba(14,165,233,0.2)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>🔀</span>
              <span style={{ fontSize: 16, fontWeight: 800, background: S.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Hybrid Studio</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/studio/ai" style={{ color: "#64748b", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>🧠 AI Studio</Link>
            <Link href="/studio/gpu" style={{ color: "#64748b", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>⚡ GPU Studio</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { icon: "🔀", label: "Pipelines", value: pipelines.length, color: "#0ea5e9" },
            { icon: "🧠", label: "AI Providers", value: aiCreds.length, color: "#a78bfa" },
            { icon: "⚡", label: "GPU Endpoints", value: gpuCreds.length, color: "#f59e0b" },
            { icon: "▶️", label: "Total Runs", value: pipelines.reduce((s, p) => s + p.run_count, 0), color: "#22c55e" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "18px 16px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color, fontFamily: "Sora, sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline concept explanation */}
        <div style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(139,92,246,0.08))", borderRadius: 16, padding: "28px 32px", border: "1px solid rgba(14,165,233,0.15)", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>🔀</span>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0", margin: 0 }}>Hybrid Pipelines</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>Chain cloud AI providers + your own GPU models into automated workflows</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {[
              { icon: "🧠", title: "AI Node", desc: "Route to OpenAI, Claude, Gemini — or any cloud provider using YOUR API key" },
              { icon: "⚡", title: "GPU Node", desc: "Route to your RunPod, Lambda, or self-hosted GPU for local inference" },
              { icon: "🔄", title: "Logic Node", desc: "If/else routing: busy GPU → fallback to cloud. Cost cap → switch provider" },
              { icon: "📤", title: "Output Node", desc: "Save results, call webhooks, chain to next pipeline, store as artifact" },
            ].map(n => (
              <div key={n.title} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "16px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 24 }}>{n.icon}</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginTop: 8 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6, marginTop: 4 }}>{n.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipelines list */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0" }}>Your Pipelines</h3>
          <button style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: S.gradient, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>+ New Pipeline</button>
        </div>

        {pipelines.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1.5px dashed rgba(14,165,233,0.2)" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔀</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0", marginBottom: 8 }}>No Pipelines Yet</h3>
            <p style={{ color: "#64748b", fontSize: 13, maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.7 }}>
              Create your first hybrid pipeline to chain cloud AI + GPU inference in one automated workflow.
              <br /><br />
              Example: &ldquo;If my GPU is idle → route to local Llama model. If busy → fallback to GPT-4o. If cost &gt; $0.05 → use DeepSeek.&rdquo;
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
              {aiCreds.length === 0 && (
                <Link href="/studio/ai" style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(139,92,246,0.12)", color: "#a78bfa", fontSize: 12, fontWeight: 700, textDecoration: "none", border: "1px solid rgba(139,92,246,0.2)" }}>
                  🧠 Add AI Provider First
                </Link>
              )}
              {gpuCreds.length === 0 && (
                <Link href="/studio/gpu" style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontSize: 12, fontWeight: 700, textDecoration: "none", border: "1px solid rgba(245,158,11,0.2)" }}>
                  ⚡ Add GPU Provider First
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
            {pipelines.map(p => (
              <div key={p.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "20px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#e2e8f0" }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{p.description}</div>
                  </div>
                  <span style={{
                    fontSize: 10, padding: "3px 8px", borderRadius: 4, fontWeight: 700,
                    background: p.status === "active" ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.12)",
                    color: p.status === "active" ? "#22c55e" : "#64748b",
                  }}>{p.status}</span>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 11, color: "#475569" }}>
                  <span>▶ {p.run_count} runs</span>
                  {p.last_run && <span>Last: {new Date(p.last_run).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 14-day notice */}
        <div style={{ marginTop: 32, padding: "14px 20px", borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <div style={{ fontSize: 12, color: "#f59e0b", lineHeight: 1.6 }}>
            <strong>14-Day Retention Policy:</strong> All pipeline configs, sessions, and artifacts are automatically deleted after 14 days. Export your work regularly. Credentials are permanent until you remove them.
          </div>
        </div>
      </div>
    </div>
  );
}
