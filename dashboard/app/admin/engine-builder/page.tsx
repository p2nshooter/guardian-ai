/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ── All AXTO Products — synced with route.ts PRODUCTS + BUILDABLE_NOW ─────────
const PRODUCTS = [
  // ── Guardian AI
  { id: "guardian-core",         icon: "🖥️", name: "Guardian Core",         group: "guardian",    color: "#0284c7", desc: "API server + security dashboard" },
  { id: "guardian-node",         icon: "🤖", name: "Guardian Node Agent",    group: "guardian",    color: "#0284c7", desc: "Per-server threat detection" },
  { id: "guardian-antivirus",    icon: "🦠", name: "Guardian Antivirus",     group: "guardian",    color: "#0284c7", desc: "ClamAV + AI malware scanner" },
  // ── Orchestra AI
  { id: "orchestra-core",        icon: "⚡", name: "Orchestra Core",         group: "orchestra",   color: "#7c3aed", desc: "AI router + console" },
  { id: "orchestra-worker-cpu",  icon: "💻", name: "Orchestra Worker CPU",   group: "orchestra",   color: "#7c3aed", desc: "Cloud AI routing (15 providers)" },
  { id: "orchestra-worker-gpu",  icon: "🎮", name: "Orchestra Worker GPU",   group: "orchestra",   color: "#7c3aed", desc: "Local GPU inference (Ollama + SDXL + Whisper)" },
  // ── AXTO Vault
  { id: "vault-core",            icon: "🔐", name: "Vault Core",             group: "vault",       color: "#6366f1", desc: "AI Privacy Layer — PII/PHI/Financial redaction" },
  // ── AXTO Edge
  { id: "edge-core",             icon: "🌐", name: "Edge Core",              group: "edge",        color: "#0891b2", desc: "AI Gateway — token metering & billing" },
  // ── AXTO SOC
  { id: "soc-core",              icon: "🛡️", name: "SOC Core",               group: "soc",         color: "#dc2626", desc: "SIEM + SOAR + threat intelligence" },
  // ── AXTO Compliance
  { id: "compliance-core",       icon: "📋", name: "Compliance Core",        group: "compliance",  color: "#16a34a", desc: "Automated audit — SOC2/ISO/HIPAA/GDPR" },
  // ── AXTO Sentinel
  { id: "sentinel-core",         icon: "📡", name: "Sentinel Core",          group: "sentinel",    color: "#ca8a04", desc: "IoT/OT security — device discovery & CVE" },
  // ── AXTO Antivirus (standalone)
  { id: "antivirus-core",        icon: "🦠", name: "Antivirus Core",         group: "antivirus",   color: "#ea580c", desc: "ClamAV + ML behavioral detection" },
];

// Synced with route.ts BUILDABLE_NOW
const BUILDABLE_NOW = new Set([
  "guardian-core", "guardian-node", "guardian-antivirus",
  "orchestra-core", "orchestra-worker-cpu", "orchestra-worker-gpu",
  "vault-core", "edge-core", "soc-core", "compliance-core", "sentinel-core", "antivirus-core",
]);

const GROUP_LABELS: Record<string, string> = {
  guardian:   "🛡️ Guardian AI",
  orchestra:  "⚡ Orchestra AI",
  vault:      "🔐 AXTO Vault",
  edge:       "🌐 AXTO Edge",
  soc:        "🔴 AXTO SOC",
  compliance: "📋 AXTO Compliance",
  sentinel:   "📡 AXTO Sentinel",
  antivirus:  "🦠 AXTO Antivirus",
};

const GROUP_COLORS: Record<string, string> = {
  guardian:   "#0284c7",
  orchestra:  "#7c3aed",
  vault:      "#6366f1",
  edge:       "#0891b2",
  soc:        "#dc2626",
  compliance: "#16a34a",
  sentinel:   "#ca8a04",
  antivirus:  "#ea580c",
};

type BuildType   = "image" | "exe";
type BuildStatus = "idle" | "building" | "ready" | "failed" | "coming_soon";

interface R2File     { key: string; size: number; uploaded: string }
interface BuildState { status: BuildStatus; pct: number; pipelineUrl: string; startedAt: number }
interface CIProvider { configured: boolean; repo?: string; project_id?: string; host?: string; branch?: string; pipelines_url?: string }

function fmtSize(b: number) {
  if (!b) return "—";
  const mb = Math.round(b / 1024 / 1024);
  return mb > 0 ? `${mb} MB` : `${Math.round(b / 1024)} KB`;
}
function fmtDate(d: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
}

export default function EngineBuilderPage() {
  const [groupFilter,   setGroupFilter]   = useState<string>("all");
  const [r2Status,      setR2Status]      = useState<Record<string, R2File | null>>({});
  const [buildStates,   setBuildStates]   = useState<Record<string, BuildState>>({});
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [hasGithub,     setHasGithub]     = useState<boolean | null>(null);
  const [hasGitlab,     setHasGitlab]     = useState<boolean | null>(null);
  const [hasR2,         setHasR2]         = useState<boolean | null>(null);
  const [ciProviders,   setCiProviders]   = useState<{ github?: CIProvider; gitlab?: CIProvider }>({});
  const [activePipelines, setActivePipelines] = useState<any[]>([]);
  const [uploading,     setUploading]     = useState<string | null>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<{ product: string; type: BuildType } | null>(null);
  const pollRef   = useRef<Record<string, any>>({});

  const bkey  = (p: string, t: BuildType) => `${p}__${t}`;
  const getBs = (k: string): BuildState   => buildStates[k] || { status: "idle", pct: 0, pipelineUrl: "", startedAt: 0 };
  const setBs = (k: string, patch: Partial<BuildState>) => setBuildStates(s => ({ ...s, [k]: { ...getBs(k), ...patch } }));
  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 6000); };
  const r2Key = (p: string, t: BuildType) => t === "image" ? `builds/latest/raw/${p}.tar.gz` : `builds/latest/exe/${p}-windows.exe`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/engine-builder", { credentials: "include" });
      if (!r.ok) return;
      const d = await r.json();
      setHasGithub(d.hasGithub);
      setHasGitlab(d.hasGitlab);
      setHasR2(d.hasR2);
      setCiProviders(d.ciProviders || {});
      setActivePipelines(d.activePipelines || []);
      const files: Record<string, R2File | null> = {};
      for (const p of PRODUCTS) {
        for (const t of ["image", "exe"] as BuildType[]) {
          const f = (d.status || {})[`${p.id}:${t}`];
          files[bkey(p.id, t)] = f?.exists ? { key: r2Key(p.id, t), size: f.size, uploaded: f.uploaded } : null;
        }
      }
      setR2Status(files);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { Object.values(pollRef.current).forEach(clearInterval); }, []);

  const groups = Array.from(new Set(PRODUCTS.map(p => p.group)));
  const visibleProducts = groupFilter === "all" ? PRODUCTS : PRODUCTS.filter(p => p.group === groupFilter);

  async function triggerBuild(productId: string, type: BuildType) {
    const k = bkey(productId, type);
    setBs(k, { status: "building", pct: 5, startedAt: Date.now() });
    try {
      const r = await fetch("/api/admin/engine-builder", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_build", product: productId, type }),
      });
      const d = await r.json();
      if (d.ok) {
        const via = d.provider ? ` via ${d.provider}` : "";
        showToast(`✅ Build triggered${via}: ${productId} (${type})`);
        setBs(k, { status: "building", pct: 10, pipelineUrl: d.pipeline_url || "" });
        startPoll(k, productId, type);
      } else {
        setBs(k, { status: "failed", pct: 0, pipelineUrl: "" });
        showToast(d.error || "Build failed", false);
      }
    } catch (e: any) {
      setBs(k, { status: "failed", pct: 0, pipelineUrl: "" });
      showToast(`Error: ${e.message}`, false);
    }
  }

  function startPoll(k: string, productId: string, type: BuildType) {
    if (pollRef.current[k]) clearInterval(pollRef.current[k]);
    let tick = 0;
    pollRef.current[k] = setInterval(async () => {
      tick++;
      if (tick > 80) { clearInterval(pollRef.current[k]); setBs(k, { status: "failed", pct: 0 }); return; }
      try {
        const r = await fetch("/api/admin/engine-builder", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check_build_status", product: productId, type }),
        });
        const d = await r.json();
        if (d.done) {
          clearInterval(pollRef.current[k]);
          if (d.status === "ready") {
            setBs(k, { status: "ready", pct: 100 });
            setR2Status(s => ({ ...s, [k]: { key: r2Key(productId, type), size: d.size || 0, uploaded: d.uploaded || "" } }));
            showToast(`✅ ${productId} (${type}) ready — download available`);
            load();
          } else {
            setBs(k, { status: "failed", pct: 0 });
            showToast(`Build failed: ${productId}`, false);
          }
        } else {
          setBs(k, { status: "building", pct: Math.min(d.progress || tick * 1.5, 95) });
        }
      } catch { }
    }, 15000);
  }

  async function deleteBuild(productId: string, type: BuildType) {
    if (!confirm(`Delete ${productId} (${type}) from R2? Clients won't be able to download until rebuilt.`)) return;
    const r = await fetch("/api/admin/engine-builder", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", product: productId, type }),
    });
    const d = await r.json();
    if (d.ok) { showToast(`Deleted: ${productId} (${type})`); load(); }
    else showToast(d.error || "Delete failed", false);
  }

  function downloadBuild(productId: string, type: BuildType) {
    window.open(`/api/admin/engine-builder/download?product=${productId}&type=${type}`, "_blank");
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    page:  { background: "#0a0f1e", minHeight: "100vh", color: "#e2e8f0", padding: "24px", fontFamily: "Inter,-apple-system,sans-serif" },
    card:  { background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px" },
    btn: (color: string, disabled?: boolean) => ({
      padding: "8px 16px", background: disabled ? "#1e293b" : color, border: "none", borderRadius: "8px",
      color: disabled ? "#475569" : "#fff", cursor: disabled ? "not-allowed" : "pointer",
      fontSize: "13px", fontWeight: 600, opacity: disabled ? .6 : 1, transition: "opacity .2s",
    }),
    badge: (ok: boolean | null, neutral?: boolean) => ({
      padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
      background: neutral ? "rgba(100,116,139,.15)" : ok ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)",
      color:      neutral ? "#94a3b8"               : ok ? "#34d399"              : "#f87171",
      border:     `1px solid ${neutral ? "rgba(100,116,139,.3)" : ok ? "rgba(16,185,129,.3)" : "rgba(239,68,68,.3)"}`,
    }),
  };

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>⚙️ Engine Builder</h1>
          <p style={{ color: "#64748b", fontSize: "14px" }}>Build Docker images and Windows EXE for all AXTO products. Artifacts stored in Cloudflare R2.</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={s.badge(!!hasR2)}>R2 {hasR2 ? "Connected" : "Not Configured"}</span>
          <span style={s.badge(!!hasGithub)}>GitHub {hasGithub ? "✓" : "Not Configured"}</span>
          <span style={s.badge(!!hasGitlab)}>GitLab {hasGitlab ? "✓" : "Not Configured"}</span>
          <button onClick={load} style={s.btn("#1e3a5f")} title="Refresh">↻ Refresh</button>
        </div>
      </div>

      {/* ── CI Provider info ── */}
      {(ciProviders.github?.configured || ciProviders.gitlab?.configured) && (
        <div style={{ ...s.card, marginBottom: "16px", display: "flex", gap: "24px", flexWrap: "wrap", padding: "14px 20px" }}>
          {ciProviders.github?.configured && (
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              <span style={{ color: "#34d399", marginRight: "6px" }}>●</span>
              GitHub Actions
              {ciProviders.github.repo && (
                <a href={ciProviders.github.pipelines_url || `https://github.com/${ciProviders.github.repo}/actions`}
                   target="_blank" rel="noopener"
                   style={{ color: "#60a5fa", marginLeft: "8px", textDecoration: "none" }}>
                  {ciProviders.github.repo} ↗
                </a>
              )}
            </div>
          )}
          {ciProviders.gitlab?.configured && (
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              <span style={{ color: "#fb923c", marginRight: "6px" }}>●</span>
              GitLab CI · branch: <strong style={{ color: "#e2e8f0" }}>{ciProviders.gitlab.branch || "main"}</strong>
              {ciProviders.gitlab.pipelines_url && (
                <a href={ciProviders.gitlab.pipelines_url}
                   target="_blank" rel="noopener"
                   style={{ color: "#60a5fa", marginLeft: "8px", textDecoration: "none" }}>
                  Pipelines ↗
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Active Pipelines ── */}
      {activePipelines.length > 0 && (
        <div style={{ ...s.card, marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", marginBottom: "10px" }}>
            ⚙️ Active Pipelines ({activePipelines.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {activePipelines.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", padding: "6px 10px", background: "#0a0f1e", borderRadius: "6px" }}>
                <span style={{ color: "#fbbf24", minWidth: "80px" }}>{p.product}</span>
                <span style={{ color: "#64748b" }}>{p.type}</span>
                <span style={{ ...s.badge(p.status === "ready", p.status === "building"), fontSize: "10px", padding: "2px 8px" }}>
                  {p.status === "building" ? "⚙️ Building" : p.status === "pending" ? "⏳ Pending" : p.status}
                </span>
                {p.ci_provider && <span style={{ color: "#475569" }}>{p.ci_provider}</span>}
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener"
                     style={{ color: "#60a5fa", textDecoration: "none", marginLeft: "auto" }}>
                    Pipeline ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Group filter tabs ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        <button onClick={() => setGroupFilter("all")}
          style={{ ...s.btn(groupFilter === "all" ? "#334155" : "#111827"), border: "1px solid #1e293b" }}>
          All Products
        </button>
        {groups.map(g => (
          <button key={g} onClick={() => setGroupFilter(g)}
            style={{ ...s.btn(groupFilter === g ? GROUP_COLORS[g] : "#111827"), border: `1px solid ${GROUP_COLORS[g]}33` }}>
            {GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {/* ── Products grid ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#475569" }}>Loading build status…</div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {groups.filter(g => groupFilter === "all" || g === groupFilter).map(group => {
            const groupProducts = visibleProducts.filter(p => p.group === group);
            if (!groupProducts.length) return null;
            return (
              <div key={group}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: GROUP_COLORS[group], marginBottom: "12px", paddingBottom: "8px", borderBottom: `1px solid ${GROUP_COLORS[group]}22` }}>
                  {GROUP_LABELS[group]}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: "12px" }}>
                  {groupProducts.map(p => {
                    const isAvailable = BUILDABLE_NOW.has(p.id);
                    return (
                      <div key={p.id} style={{ ...s.card, opacity: isAvailable ? 1 : .65, borderColor: isAvailable ? GROUP_COLORS[group] + "33" : "#1e293b" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <span style={{ fontSize: "22px" }}>{p.icon}</span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "15px" }}>{p.name}</div>
                              <div style={{ color: "#64748b", fontSize: "12px" }}>{p.desc}</div>
                            </div>
                          </div>
                          {!isAvailable && (
                            <span style={{ padding: "3px 8px", background: "rgba(100,116,139,.15)", border: "1px solid #334155", borderRadius: "20px", fontSize: "11px", color: "#64748b" }}>Soon</span>
                          )}
                        </div>

                        {/* Build type rows */}
                        {(["image", "exe"] as BuildType[]).map(type => {
                          const k      = bkey(p.id, type);
                          const bs     = getBs(k);
                          const file   = r2Status[k];
                          const status: BuildStatus = !isAvailable
                            ? "coming_soon"
                            : bs.status !== "idle" ? bs.status : (file ? "ready" : "idle");

                          return (
                            <div key={type} style={{ borderTop: "1px solid #1e293b", paddingTop: "10px", marginTop: "10px" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                                <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                                  {type === "image" ? "🐳 Docker Image (.tar.gz)" : "🪟 Windows EXE (.exe)"}
                                </span>
                                <span style={s.badge(status === "ready", status === "building" || status === "coming_soon" || status === "idle")}>
                                  {status === "ready" ? "✅ Ready" : status === "building" ? "⚙️ Building…" : status === "failed" ? "❌ Failed" : status === "coming_soon" ? "🔜 Soon" : "⬜ Not Built"}
                                </span>
                              </div>

                              {file && (
                                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>
                                  {fmtSize(file.size)} · Built {fmtDate(file.uploaded)}
                                </div>
                              )}

                              {status === "building" && (
                                <div style={{ height: "4px", background: "#1e293b", borderRadius: "2px", overflow: "hidden", marginBottom: "8px" }}>
                                  <div style={{ height: "100%", background: GROUP_COLORS[p.group], width: `${bs.pct}%`, transition: "width .5s", borderRadius: "2px" }} />
                                </div>
                              )}

                              {isAvailable && (
                                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                                  {status !== "building" && (
                                    <button onClick={() => triggerBuild(p.id, type)} style={s.btn(GROUP_COLORS[p.group])}>
                                      {status === "ready" ? "↺ Rebuild" : "▶ Build Now"}
                                    </button>
                                  )}
                                  {status === "ready" && (
                                    <>
                                      <button
                                        onClick={() => downloadBuild(p.id, type)}
                                        style={s.btn("#065f46")}
                                        title={`Download ${type === "image" ? ".tar.gz" : ".exe"}`}
                                      >
                                        ⬇ Download
                                      </button>
                                      <button onClick={() => deleteBuild(p.id, type)} style={s.btn("#7f1d1d")}>
                                        🗑 Delete
                                      </button>
                                    </>
                                  )}
                                  {bs.pipelineUrl && (
                                    <a href={bs.pipelineUrl} target="_blank" rel="noopener"
                                       style={{ ...s.btn("#1e3a5f"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                                      📊 Pipeline
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px",
          background: toast.ok ? "#064e3b" : "#7f1d1d",
          border: `1px solid ${toast.ok ? "#059669" : "#dc2626"}`,
          borderRadius: "10px", padding: "12px 20px",
          color: toast.ok ? "#34d399" : "#fca5a5",
          fontSize: "13px", fontWeight: 600, zIndex: 100,
          boxShadow: "0 8px 32px rgba(0,0,0,.4)", maxWidth: "400px",
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Hidden file input for manual upload ── */}
      <input
        ref={fileRef}
        type="file"
        style={{ display: "none" }}
        accept=".tar.gz,.exe,.zip"
        onChange={async e => {
          const f = e.target.files?.[0];
          if (!f || !uploadRef.current) return;
          setUploading(bkey(uploadRef.current.product, uploadRef.current.type));
          const buf = await f.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const r = await fetch("/api/admin/engine-builder", {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "upload", product: uploadRef.current.product, type: uploadRef.current.type, content: b64 }),
          });
          const d = await r.json();
          setUploading(null);
          if (d.ok) { showToast(`Uploaded: ${uploadRef.current.product}`); load(); }
          else showToast(d.error || "Upload failed", false);
          e.target.value = "";
        }}
      />
    </div>
  );
}
