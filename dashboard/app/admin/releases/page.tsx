/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Build availability types ──────────────────────────────────────────────────
const ALL_FORMATS = ["docker", "exe-linux", "exe-windows"] as const;
type BuildFormat = typeof ALL_FORMATS[number];

const FORMAT_LABELS: Record<BuildFormat, { label: string; icon: string; desc: string }> = {
  "docker":      { label: "Docker (.tar.gz)", icon: "🐳", desc: "Linux server — Docker image" },
  "exe-linux":   { label: "EXE Linux",        icon: "🐧", desc: "Linux binary — systemd service" },
  "exe-windows": { label: "EXE Windows",      icon: "🪟", desc: "Windows self-extracting installer" },
};

const AVAIL_PRODUCTS = [
  { key: "guardian",   icon: "🛡️", name: "Guardian AI",   color: "#0ea5e9" },
  { key: "orchestra",  icon: "⚡", name: "Orchestra AI",   color: "#7c3aed" },
  { key: "vault",      icon: "🔐", name: "Vault",          color: "#8b5cf6" },
  { key: "edge",       icon: "🌐", name: "Edge Agent",     color: "#06b6d4" },
  { key: "soc",        icon: "🛡️", name: "SOC Engine",    color: "#ef4444" },
  { key: "compliance", icon: "📋", name: "Compliance",     color: "#22c55e" },
  { key: "sentinel",   icon: "📡", name: "Sentinel OT",    color: "#f59e0b" },
  { key: "antivirus",  icon: "🦠", name: "Antivirus",      color: "#e879f9" },
  { key: "studio",     icon: "🧠", name: "AXTO Studio",    color: "#f97316" },
  { key: "legal",      icon: "⚖️", name: "AXTO Legal",     color: "#0f766e" },
];

// ── Catalog — mirrors CI output + R2 structure exactly (product names below
// are the real matrix entries from auto-build-all.yml / auto-build-exe.yml,
// not the earlier fictional "vault-enterprise" / "soc-engine" style names
// that never matched anything CI ever built). ──────────────────────────────
const GROUPS: {
  id: string; label: string; icon: string; color: string; border: string;
  products: {
    id: string; ciName: string; label: string; desc: string;
    hasDocker: boolean; hasExe: boolean; manualGpu?: boolean;
  }[];
}[] = [
  {
    id: "guardian", label: "Guardian AI", icon: "🛡️", color: "#0ea5e9", border: "#0ea5e920",
    products: [
      { id: "guardian-core", ciName: "guardian-core", label: "Guardian Core",       desc: "API server + security dashboard", hasDocker: true, hasExe: true },
      { id: "guardian-node", ciName: "guardian-node", label: "Guardian Node Agent", desc: "Per-server threat detection agent", hasDocker: true, hasExe: true },
    ],
  },
  {
    id: "antivirus", label: "Antivirus", icon: "🦠", color: "#e879f9", border: "#e879f920",
    products: [
      { id: "guardian-antivirus", ciName: "guardian-antivirus", label: "Guardian Antivirus", desc: "ClamAV + AI file scanning — bundled in Guardian, also sold standalone", hasDocker: true, hasExe: true },
    ],
  },
  {
    id: "orchestra", label: "Orchestra AI", icon: "⚡", color: "#7c3aed", border: "#7c3aed20",
    products: [
      { id: "orchestra-core",       ciName: "orchestra-core",       label: "Orchestra Core",       desc: "AI router + orchestration console", hasDocker: true, hasExe: true },
      { id: "orchestra-worker-cpu", ciName: "orchestra-worker-cpu", label: "Orchestra Worker CPU", desc: "Cloud AI routing (15+ providers)", hasDocker: true, hasExe: true },
      { id: "orchestra-worker-gpu", ciName: "orchestra-worker-gpu", label: "Orchestra Worker GPU", desc: "Local GPU inference — MANUAL BUILD via Docker Desktop (~6GB, VPN required)", hasDocker: true, hasExe: false, manualGpu: true },
    ],
  },
  {
    id: "vault", label: "Vault", icon: "🔐", color: "#8b5cf6", border: "#8b5cf620",
    products: [
      { id: "vault-core", ciName: "vault-core", label: "Vault Core", desc: "AI Privacy Layer — PII/PHI/Financial redaction", hasDocker: true, hasExe: true },
    ],
  },
  {
    id: "edge", label: "Edge Agent", icon: "🌐", color: "#06b6d4", border: "#06b6d420",
    products: [
      { id: "edge-core", ciName: "edge-core", label: "Edge Core", desc: "AI API Gateway — rate limiting, billing, abuse detection", hasDocker: true, hasExe: true },
    ],
  },
  {
    id: "soc", label: "SOC Engine", icon: "🛡️", color: "#ef4444", border: "#ef444420",
    products: [
      { id: "soc-core", ciName: "soc-core", label: "SOC Core", desc: "Security Operations Center — SIEM, SOAR, threat intel", hasDocker: true, hasExe: true },
    ],
  },
  {
    id: "compliance", label: "Compliance", icon: "📋", color: "#22c55e", border: "#22c55e20",
    products: [
      { id: "compliance-core", ciName: "compliance-core", label: "Compliance Core", desc: "Automated audit — SOC2, ISO, HIPAA, PCI-DSS", hasDocker: true, hasExe: true },
    ],
  },
  {
    id: "sentinel", label: "Sentinel OT", icon: "📡", color: "#f59e0b", border: "#f59e0b20",
    products: [
      { id: "sentinel-core", ciName: "sentinel-core", label: "Sentinel Core", desc: "IoT/OT Security — asset discovery, IEC 62443", hasDocker: true, hasExe: true },
    ],
  },
  {
    id: "studio", label: "AXTO Studio", icon: "🧠", color: "#f97316", border: "#f9731620",
    products: [
      { id: "studio-core",    ciName: "studio-core",    label: "Studio Core",         desc: "AI & GPU pool platform — client-facing app", hasDocker: true, hasExe: true },
      { id: "ai-studio",      ciName: "ai-studio",      label: "AI Studio (image)",   desc: "AI workspace sub-container", hasDocker: true, hasExe: false },
      { id: "gpu-studio",     ciName: "gpu-studio",     label: "GPU Studio (image)",  desc: "GPU pool sub-container", hasDocker: true, hasExe: false },
      { id: "hybrid-studio",  ciName: "hybrid-studio",  label: "Hybrid Studio (image)", desc: "Hybrid pipeline sub-container", hasDocker: true, hasExe: false },
    ],
  },
  {
    id: "legal", label: "AXTO Legal", icon: "⚖️", color: "#0f766e", border: "#0f766e20",
    products: [
      { id: "legal-core", ciName: "legal-core", label: "Legal Core", desc: "AI legal research & document intelligence", hasDocker: true, hasExe: true },
    ],
  },
];

// R2 keys must match exactly what CI writes and what the portal reads:
//   docker → builds/latest/raw/<name>.tar.gz   (auto-build-* / _build-image / build-release)
//   exe    → builds/latest/exe/<name>-windows.exe   (auto-build-exe) — note: NO "axto-"
//            prefix in the R2 key, that prefix only exists in the local dist/ filename
//            before upload (dist/axto-<name>.exe → uploaded as <name>-windows.exe).
function r2ImageKey(ciName: string) { return `builds/latest/raw/${ciName}.tar.gz`; }
function r2ExeKey(ciName: string)   { return `builds/latest/exe/${ciName}-windows.exe`; }

function fmtSize(bytes: number | null) {
  if (!bytes) return null;
  const mb = bytes / 1024 / 1024;
  return mb >= 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}
function fmtDate(s: string) {
  if (!s) return null;
  try { return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return null; }
}

type R2Info = { size: number; uploaded: string } | null;
type FileMap = Record<string, R2Info>;

export default function AdminReleasesPage() {
  const [files, setFiles]       = useState<FileMap>({});
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState<Record<string, boolean>>({});
  const [avail,     setAvail]     = useState<Record<string, boolean>>({});
  const [availLoad, setAvailLoad] = useState(true);
  const [toggling,  setToggling]  = useState<string | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 5000);
  };

  const loadAvail = useCallback(async () => {
    setAvailLoad(true);
    try {
      const r = await fetch("/api/admin/build-availability", { credentials: "include" });
      if (r.ok) { const d = await r.json(); setAvail(d.availability || {}); }
    } catch {}
    setAvailLoad(false);
  }, []);

  async function toggleAvail(product: string, format: BuildFormat) {
    const key = `${product}:${format}`;
    const newVal = !avail[key];
    setToggling(key);
    try {
      const r = await fetch("/api/admin/build-availability", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, format, enabled: newVal }),
      });
      if (r.ok) {
        setAvail(s => ({ ...s, [key]: newVal }));
        showToast(`${product} ${format}: ${newVal ? "✅ Enabled" : "🔜 Coming Soon"}`);
      } else {
        showToast("Toggle failed", false);
      }
    } catch { showToast("Network error", false); }
    setToggling(null);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/releases", { credentials: "include" });
      if (!r.ok) { showToast("Failed to load releases", false); return; }
      const d = await r.json();
      const map: FileMap = {};
      for (const f of d.files || []) {
        map[f.key] = { size: f.size, uploaded: f.uploaded };
      }
      setFiles(map);
    } catch { showToast("Network error", false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); loadAvail(); }, [load, loadAvail]);

  async function deleteFile(key: string, label: string) {
    if (!confirm(`Delete "${label}" from R2?\nClients won't be able to download until rebuilt.`)) return;
    setDeleting(key);
    try {
      const r = await fetch("/api/admin/releases", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_file", key }),
      });
      const d = await r.json();
      if (d.ok) { showToast(`Deleted: ${label}`); load(); }
      else showToast(d.error || "Delete failed", false);
    } catch { showToast("Network error", false); }
    finally { setDeleting(null); }
  }

  async function downloadAdmin(key: string, filename: string) {
    try {
      const r = await fetch(`/api/admin/releases/download?key=${encodeURIComponent(key)}`, { credentials: "include" });
      if (!r.ok) { showToast("Download failed", false); return; }
      const blob = await r.blob();
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
      a.click(); URL.revokeObjectURL(a.href);
    } catch { showToast("Download error", false); }
  }

  function getFile(key: string): R2Info { return files[key] || null; }

  const allProducts = GROUPS.flatMap(g => g.products);
  const totalImages = allProducts.filter(p => p.hasDocker && getFile(r2ImageKey(p.ciName))).length;
  const totalExe    = allProducts.filter(p => p.hasExe    && getFile(r2ExeKey(p.ciName))).length;
  const maxImages   = allProducts.filter(p => p.hasDocker).length;
  const maxExe      = allProducts.filter(p => p.hasExe).length;

  const visibleGroups = filter === "all" ? GROUPS : GROUPS.filter(g => g.id === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#080d1a", color: "#e2e8f0", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .row-hover:hover { background: rgba(255,255,255,0.025) !important; }
        .action-btn:hover { filter: brightness(1.2); }
        .filter-btn:hover { border-color: rgba(255,255,255,0.2) !important; }
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .anim { animation: fadeIn 0.3s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link href="/admin" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>← Admin</Link>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.07)" }}/>
            <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 17, color: "#f1f5f9", letterSpacing: "-0.3px" }}>
              ☁️ Releases & Packaging
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, padding: "6px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: totalImages === maxImages ? "#34d399" : "#fbbf24" }}>{totalImages}/{maxImages}</div>
                <div style={{ fontSize: 10, color: "#475569" }}>Docker</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }}/>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: totalExe === maxExe ? "#34d399" : "#fbbf24" }}>{totalExe}/{maxExe}</div>
                <div style={{ fontSize: 10, color: "#475569" }}>EXE</div>
              </div>
            </div>
            <Link href="/admin/trial-batch" style={{ padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#94a3b8", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
              🎟️ Trial Batch
            </Link>
            <button onClick={load} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, color: "#64748b", fontSize: 12, cursor: "pointer" }}>
              {loading ? <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #1e293b", borderTopColor: "#475569", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}/> : "↻"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>

        {/* CI Pipeline banner */}
        <div style={{ background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.12)", borderRadius: 14, padding: "14px 20px", marginBottom: 20, display: "flex", gap: 16, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "#38bdf8", marginBottom: 5 }}>⚡ GitLab CI — vpn-win runner (Windows + Docker Desktop)</div>
            <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#475569", flexWrap: "wrap" }}>
              <span><span style={{ color: "#34d399" }}>●</span> Auto — push to main</span>
              <span><span style={{ color: "#fbbf24" }}>●</span> Manual — GPU images (VPN)</span>
              <span style={{ fontFamily: "'DM Mono', sans-serif", fontSize: 11 }}>R2: axto-builds → builds/latest/images/ + exe/</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/trial-batch" style={{ padding: "7px 14px", background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.18)", borderRadius: 8, color: "#38bdf8", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              🎟️ Trial Batch →
            </Link>
          </div>
        </div>

        {/* ── Build Availability Panel ─────────────────────────────────────────── */}
        <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 15, color: "#f1f5f9", marginBottom: 4 }}>
                🎛️ Client Download Availability
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                Toggle per-product per-format. OFF = client sees <span style={{ color: "#f59e0b", fontWeight: 700 }}>🔜 Coming Soon</span> — download is blocked even if they already paid. ON = download enabled.
              </div>
            </div>
            {availLoad && <div style={{ width: 18, height: 18, border: "2px solid #1e293b", borderTopColor: "#0ea5e9", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }}/>}
          </div>

          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: "160px repeat(3, 1fr)", gap: 6, marginBottom: 8, padding: "0 8px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: "0.6px", textTransform: "uppercase" }}>Product</div>
            {ALL_FORMATS.map(f => (
              <div key={f} style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: "0.5px", textTransform: "uppercase", textAlign: "center" }}>
                {FORMAT_LABELS[f].icon} {FORMAT_LABELS[f].label}
              </div>
            ))}
          </div>

          {/* Product rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {AVAIL_PRODUCTS.map(prod => (
              <div key={prod.key} style={{ display: "grid", gridTemplateColumns: "160px repeat(3, 1fr)", gap: 6, padding: "10px 8px", borderRadius: 10, background: "rgba(255,255,255,0.012)", border: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 16 }}>{prod.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: prod.color }}>{prod.name}</span>
                </div>
                {ALL_FORMATS.map(fmt => {
                  const key  = `${prod.key}:${fmt}`;
                  const on   = avail[key] ?? false;
                  const busy = toggling === key;
                  return (
                    <div key={fmt} style={{ display: "flex", justifyContent: "center" }}>
                      <button
                        onClick={() => toggleAvail(prod.key, fmt)}
                        disabled={busy || availLoad}
                        title={on ? `Disable ${prod.name} ${fmt} — clients will see Coming Soon` : `Enable ${prod.name} ${fmt} — clients can download`}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "6px 14px", borderRadius: 8,
                          border: `1.5px solid ${on ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.2)"}`,
                          background: on ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.06)",
                          color: on ? "#34d399" : "#f87171",
                          fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer",
                          opacity: busy || availLoad ? 0.6 : 1, transition: "all 0.15s",
                          minWidth: 120, justifyContent: "center",
                        }}>
                        {busy
                          ? <span style={{ width: 12, height: 12, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }}/>
                          : on ? "✅ Enabled" : "🔜 Coming Soon"
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 10, fontSize: 11, color: "#b45309" }}>
            ⚠️ <strong>Note:</strong> Toggling OFF blocks download API even if the file exists in R2. Client will see <strong>🔜 Coming Soon</strong> in their portal.
            Toggling ON only unlocks the download gate — the file must also exist in R2 (built by CI) for the download to actually work.
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
          <button className="filter-btn" onClick={() => setFilter("all")}
            style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid", fontFamily: "'DM Sans', sans-serif",
              borderColor: filter === "all" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
              background: filter === "all" ? "rgba(255,255,255,0.07)" : "transparent",
              color: filter === "all" ? "#f1f5f9" : "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>
            All
          </button>
          {GROUPS.map(g => {
            const built = g.products.filter(p => getFile(r2ImageKey(p.ciName))).length;
            const active = filter === g.id;
            return (
              <button key={g.id} className="filter-btn" onClick={() => setFilter(active ? "all" : g.id)}
                style={{ padding: "7px 12px", borderRadius: 9, border: "1px solid", fontFamily: "'DM Sans', sans-serif",
                  borderColor: active ? `${g.color}35` : "rgba(255,255,255,0.06)",
                  background: active ? `${g.color}10` : "transparent",
                  color: active ? g.color : "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 6 }}>
                {g.icon} {g.label}
                <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 5,
                  background: built === g.products.length ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.1)",
                  color: built === g.products.length ? "#34d399" : "#fbbf24" }}>
                  {built}/{g.products.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Product groups */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}>
            <div style={{ width: 36, height: 36, border: "3px solid #1e293b", borderTopColor: "#0ea5e9", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}/>
            Loading R2 status…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {visibleGroups.map(group => {
              const isExpanded = expanded[group.id] !== false;
              const allBuilt   = group.products.every(p => (!p.hasDocker || getFile(r2ImageKey(p.ciName))) && (!p.hasExe || getFile(r2ExeKey(p.ciName))));
              const anyBuilt   = group.products.some(p => getFile(r2ImageKey(p.ciName)) || (p.hasExe && getFile(r2ExeKey(p.ciName))));

              return (
                <div key={group.id} className="anim" style={{ background: "rgba(255,255,255,0.018)", border: `1px solid ${group.color}18`, borderRadius: 16, overflow: "hidden" }}>

                  <button onClick={() => setExpanded(e => ({ ...e, [group.id]: !isExpanded }))}
                    style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "15px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 18 }}>{group.icon}</span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 14, color: group.color }}>{group.label}</span>
                      <span style={{ fontSize: 11, color: "#334155" }}>{group.products.length} product{group.products.length !== 1 ? "s" : ""}</span>
                      <div style={{ padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                        background: allBuilt ? "rgba(34,197,94,0.1)" : anyBuilt ? "rgba(251,191,36,0.08)" : "rgba(239,68,68,0.08)",
                        color: allBuilt ? "#34d399" : anyBuilt ? "#fbbf24" : "#f87171",
                        border: `1px solid ${allBuilt ? "rgba(34,197,94,0.18)" : anyBuilt ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.15)"}` }}>
                        {allBuilt ? "✅ ALL BUILT" : anyBuilt ? "⚠ PARTIAL" : "❌ NOT BUILT"}
                      </div>
                    </div>
                    <span style={{ color: "#334155", fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      {/* Column headers */}
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr auto", padding: "8px 22px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.035)" }}>
                        {["Product", "Docker Image (.tar.gz)", "Windows EXE (.zip)", ""].map((h, hi) => (
                          <div key={hi} style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: "0.6px", textTransform: "uppercase" }}>{h}</div>
                        ))}
                      </div>

                      {group.products.map((prod, pi) => {
                        const imgFile = prod.hasDocker ? getFile(r2ImageKey(prod.ciName)) : null;
                        const exeFile = prod.hasExe    ? getFile(r2ExeKey(prod.ciName))    : null;
                        const imgKey  = r2ImageKey(prod.ciName);
                        const exeKey  = r2ExeKey(prod.ciName);

                        return (
                          <div key={prod.id} className="row-hover"
                            style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr auto", padding: "13px 22px", borderBottom: pi < group.products.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center", transition: "background 0.15s" }}>

                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>{prod.label}</span>
                                {prod.manualGpu && <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 5, fontWeight: 700, letterSpacing: "0.3px" }}>MANUAL GPU</span>}
                              </div>
                              <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono', monospace" }}>{prod.ciName}</div>
                              <div style={{ fontSize: 11, color: "#374151", marginTop: 2 }}>{prod.desc}</div>
                            </div>

                            {/* Docker status */}
                            <div>
                              {!prod.hasDocker ? <span style={{ fontSize: 11, color: "#1e293b" }}>—</span>
                              : imgFile ? (
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 5px #34d39960" }}/>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: "#34d399" }}>Available</span>
                                  </div>
                                  <div style={{ fontSize: 10, color: "#475569", fontFamily: "'DM Mono', monospace" }}>
                                    {fmtSize(imgFile.size) || "—"} · {fmtDate(imgFile.uploaded) || "—"}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f87171", display: "inline-block" }}/>
                                  <span style={{ fontWeight: 600, fontSize: 12, color: "#f87171" }}>Not Built</span>
                                </div>
                              )}
                            </div>

                            {/* EXE status */}
                            <div>
                              {!prod.hasExe ? <span style={{ fontSize: 11, color: "#1e293b" }}>—</span>
                              : exeFile ? (
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", display: "inline-block", boxShadow: "0 0 5px #34d39960" }}/>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: "#34d399" }}>Available</span>
                                  </div>
                                  <div style={{ fontSize: 10, color: "#475569", fontFamily: "'DM Mono', monospace" }}>
                                    {fmtSize(exeFile.size) || "—"} · {fmtDate(exeFile.uploaded) || "—"}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f87171", display: "inline-block" }}/>
                                  <span style={{ fontWeight: 600, fontSize: 12, color: "#f87171" }}>Not Built</span>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                              {imgFile && (
                                <>
                                  <button className="action-btn" onClick={() => downloadAdmin(imgKey, `${prod.ciName}.tar.gz`)}
                                    style={{ padding: "5px 10px", background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.18)", borderRadius: 7, color: "#38bdf8", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "filter 0.15s" }}>
                                    ⬇ Docker
                                  </button>
                                  <button className="action-btn" disabled={deleting === imgKey} onClick={() => deleteFile(imgKey, `${prod.label} Docker`)}
                                    style={{ padding: "5px 8px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 7, color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "filter 0.15s", opacity: deleting === imgKey ? 0.5 : 1 }}>
                                    🗑
                                  </button>
                                </>
                              )}
                              {exeFile && (
                                <>
                                  <button className="action-btn" onClick={() => downloadAdmin(exeKey, `axto-${prod.ciName}-windows.exe`)}
                                    style={{ padding: "5px 10px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 7, color: "#a78bfa", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "filter 0.15s" }}>
                                    ⬇ EXE
                                  </button>
                                  <button className="action-btn" disabled={deleting === exeKey} onClick={() => deleteFile(exeKey, `${prod.label} EXE`)}
                                    style={{ padding: "5px 8px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 7, color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "filter 0.15s", opacity: deleting === exeKey ? 0.5 : 1 }}>
                                    🗑
                                  </button>
                                </>
                              )}
                              {!imgFile && !exeFile && (
                                <Link href="/admin/trial-batch" style={{ padding: "5px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, color: "#334155", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                                  Build →
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Packaging guide */}
        <div style={{ marginTop: 24, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "20px 24px" }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "#64748b", marginBottom: 14, letterSpacing: "-0.2px" }}>
            📦 Packaging per Lisensi — Client download path per produk
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {[
              { product: "guardian",   label: "Guardian AI",   color: "#0ea5e9", ci: ["guardian-core", "guardian-node"] },
              { product: "antivirus",  label: "Antivirus",     color: "#e879f9", ci: ["guardian-antivirus"] },
              { product: "orchestra",  label: "Orchestra AI",  color: "#7c3aed", ci: ["orchestra-core", "orchestra-worker-cpu"] },
              { product: "vault",      label: "Vault",         color: "#8b5cf6", ci: ["vault-core"] },
              { product: "edge",       label: "Edge Agent",    color: "#06b6d4", ci: ["edge-core"] },
              { product: "soc",        label: "SOC Engine",    color: "#ef4444", ci: ["soc-core"] },
              { product: "compliance", label: "Compliance",    color: "#22c55e", ci: ["compliance-core"] },
              { product: "sentinel",   label: "Sentinel",      color: "#f59e0b", ci: ["sentinel-core"] },
              { product: "studio",     label: "AXTO Studio",   color: "#f97316", ci: ["studio-core"] },
              { product: "legal",      label: "AXTO Legal",    color: "#0f766e", ci: ["legal-core"] },
            ].map(p => (
              <div key={p.product} style={{ padding: "12px 14px", background: `${p.color}07`, border: `1px solid ${p.color}15`, borderRadius: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: p.color, marginBottom: 7 }}>{p.label}</div>
                <div style={{ fontSize: 10, color: "#475569", fontFamily: "'DM Mono', monospace", lineHeight: 2 }}>
                  {p.ci.map(c => (
                    <span key={c}>🐳 raw/{c}.tar.gz &nbsp;🪟 exe/{c}-windows.exe<br/></span>
                  ))}
                  <span style={{ color: "#334155" }}>Gate: license.product = '{p.product}' &amp; status = 'active'</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GPU manual guide */}
        <div style={{ marginTop: 14, background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.1)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#fbbf24", marginBottom: 8 }}>⚡ Orchestra Worker GPU — Manual (size ~4GB, tidak bisa di CI)</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#4b5563", lineHeight: 2 }}>
            <div style={{ color: "#374151" }}># Build + push dari local (VPN aktif + Docker Desktop running)</div>
            <div>docker buildx build --platform linux/amd64 --file orchestra/Dockerfile.gpu \</div>
            <div>&nbsp;&nbsp;--tag registry.gitlab.com/&lt;NS&gt;/&lt;PROJ&gt;/orchestra-worker-gpu:latest \</div>
            <div>&nbsp;&nbsp;--tag ghcr.io/your-org/orchestra-worker-gpu:latest --push orchestra/</div>
            <div style={{ color: "#374151", marginTop: 6 }}># Lalu trigger manual job di GitLab:</div>
            <div>Pipeline → r2:gpu-worker → ▶ Play &nbsp;&nbsp;(akan pull &amp; upload ke R2)</div>
          </div>
        </div>

      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999,
          background: toast.ok ? "#052e16" : "#450a0a",
          border: `1px solid ${toast.ok ? "#166534" : "#991b1b"}`,
          borderRadius: 12, padding: "12px 20px",
          color: toast.ok ? "#34d399" : "#fca5a5",
          fontSize: 13, fontWeight: 700, maxWidth: 360,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          animation: "fadeIn 0.2s ease" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
