/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Product catalog per license type ────────────────────────────────────────
const PRODUCT_CATALOG: Record<string, {
  label: string; icon: string; color: string; gradient: string;
  packages: { id: string; name: string; desc: string; variants: { type: "docker"|"exe"; arch: string; label: string; icon: string }[] }[];
  port: string; compose: string; guide: string[];
}> = {
  guardian: {
    label: "Guardian AI", icon: "🛡️", color: "#0ea5e9",
    gradient: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)",
    port: "8080", compose: "docker compose up -d",
    guide: [
      "Unzip paket download ke folder axto-guardian/",
      "Load image: docker load < guardian-core.tar.gz",
      "Edit guardian.yml — masukkan license key + AI API key",
      "Jalankan: docker compose up -d",
      "Buka browser: http://SERVER_IP:8080",
      "Aktivasi license key di wizard yang muncul",
      "Deploy guardian-node ke tiap server yang dilindungi",
    ],
    packages: [
      {
        id: "guardian-bundle", name: "Guardian Full Bundle", desc: "Core + Node Agent + ClamAV Antivirus — deployment lengkap",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",   icon: "🐳" },
          { type: "exe",   arch: "windows", label: "Windows EXE",    icon: "🪟" },
          { type: "exe",   arch: "linux",   label: "Linux Binary",   icon: "🐧" },
        ],
      },
      {
        id: "guardian-core", name: "Guardian Core", desc: "API server + security dashboard saja",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
          { type: "exe",   arch: "windows", label: "Windows EXE",   icon: "🪟" },
        ],
      },
      {
        id: "guardian-node", name: "Guardian Node Agent", desc: "Deploy ke tiap server yang dilindungi",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
          { type: "exe",   arch: "windows", label: "Windows EXE",   icon: "🪟" },
          { type: "exe",   arch: "linux",   label: "Linux Binary",  icon: "🐧" },
        ],
      },
      {
        id: "guardian-antivirus", name: "ClamAV Antivirus", desc: "Sidecar antivirus — docker only",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
        ],
      },
    ],
  },
  orchestra: {
    label: "Orchestra AI", icon: "⚡", color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #2e1065 0%, #5b21b6 50%, #7c3aed 100%)",
    port: "8080", compose: "docker compose -f orchestra-compose.yml up -d",
    guide: [
      "Unzip paket ke folder axto-orchestra/",
      "Load images: for f in *.tar.gz; do docker load < $f; done",
      "Edit orchestra.yml — masukkan license key + AI API keys",
      "Jalankan: docker compose -f orchestra-compose.yml up -d",
      "Console UI: http://SERVER_IP:8080/console",
      "API endpoint: http://SERVER_IP:8080/v1/chat/completions",
      "Ganti base_url di aplikasi ke Orchestra endpoint",
    ],
    packages: [
      {
        id: "orchestra-core-cpu", name: "Orchestra Core + CPU Worker", desc: "Core + Cloud AI worker — paling umum dipakai",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
          { type: "exe",   arch: "windows", label: "Windows EXE",   icon: "🪟" },
        ],
      },
      {
        id: "orchestra-core", name: "Orchestra Core", desc: "API + Console UI saja",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
          { type: "exe",   arch: "windows", label: "Windows EXE",   icon: "🪟" },
        ],
      },
      {
        id: "orchestra-worker-cpu", name: "Orchestra Worker CPU", desc: "Cloud AI worker — OpenAI, Claude, Gemini, Groq",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
        ],
      },
      {
        id: "orchestra-worker-gpu", name: "Orchestra Worker GPU", desc: "Local GPU inference — butuh NVIDIA GPU",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
        ],
      },
    ],
  },
  vault: {
    label: "Vault", icon: "🔐", color: "#6366f1",
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%)",
    port: "8080", compose: "docker compose -f vault-compose.yml up -d",
    guide: [
      "Unzip paket ke folder axto-vault/",
      "docker load < vault-core.tar.gz",
      "Edit vault.yml — masukkan license key + AI API keys",
      "docker compose -f vault-compose.yml up -d",
      "Verify: curl http://localhost:8080/health",
      "Ganti base_url AI client ke http://SERVER:8080/v1",
    ],
    packages: [
      {
        id: "vault-enterprise", name: "Vault Enterprise", desc: "AI Privacy Layer — PII/PHI/Financial redaction proxy",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
          { type: "exe",   arch: "windows", label: "Windows EXE",   icon: "🪟" },
        ],
      },
    ],
  },
  soc: {
    label: "SOC Engine", icon: "🛡️", color: "#ef4444",
    gradient: "linear-gradient(135deg, #450a0a 0%, #991b1b 50%, #dc2626 100%)",
    port: "8085", compose: "docker compose -f soc-compose.yml up -d",
    guide: [
      "Unzip paket ke folder axto-soc/",
      "docker load < soc-engine.tar.gz",
      "Edit soc.yml — masukkan license key",
      "docker compose -f soc-compose.yml up -d",
      "Dashboard: http://SERVER_IP:8085",
    ],
    packages: [
      {
        id: "soc-engine", name: "SOC Engine", desc: "Security Operations Center — SIEM, SOAR, threat intel",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
          { type: "exe",   arch: "windows", label: "Windows EXE",   icon: "🪟" },
        ],
      },
    ],
  },
  compliance: {
    label: "Compliance Engine", icon: "📋", color: "#22c55e",
    gradient: "linear-gradient(135deg, #052e16 0%, #166534 50%, #16a34a 100%)",
    port: "8086", compose: "docker compose -f compliance-compose.yml up -d",
    guide: [
      "Unzip paket ke folder axto-compliance/",
      "docker load < compliance-engine.tar.gz",
      "Edit compliance.yml — masukkan license key",
      "docker compose -f compliance-compose.yml up -d",
      "Dashboard: http://SERVER_IP:8086",
    ],
    packages: [
      {
        id: "compliance-engine", name: "Compliance Engine", desc: "Automated Audit Platform — SOC2, ISO, HIPAA, PCI-DSS",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
          { type: "exe",   arch: "windows", label: "Windows EXE",   icon: "🪟" },
        ],
      },
    ],
  },
  sentinel: {
    label: "Sentinel", icon: "📡", color: "#f59e0b",
    gradient: "linear-gradient(135deg, #451a03 0%, #92400e 50%, #b45309 100%)",
    port: "8087", compose: "docker compose -f sentinel-compose.yml up -d",
    guide: [
      "Unzip paket ke folder axto-sentinel/",
      "docker load < sentinel-engine.tar.gz",
      "Edit sentinel.yml — masukkan license key",
      "docker compose -f sentinel-compose.yml up -d",
      "Dashboard: http://SERVER_IP:8087",
    ],
    packages: [
      {
        id: "sentinel-enterprise", name: "Sentinel Enterprise", desc: "IoT/OT Security — device discovery, OT protocol detection",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
          { type: "exe",   arch: "windows", label: "Windows EXE",   icon: "🪟" },
        ],
      },
    ],
  },
  edge: {
    label: "Edge Agent", icon: "🌐", color: "#06b6d4",
    gradient: "linear-gradient(135deg, #082f49 0%, #0c4a6e 50%, #0284c7 100%)",
    port: "8084", compose: "docker compose -f edge-compose.yml up -d",
    guide: [
      "Unzip paket ke folder axto-edge/",
      "docker load < edge-engine.tar.gz",
      "Edit edge.yml — masukkan license key",
      "docker compose -f edge-compose.yml up -d",
      "Dashboard: http://SERVER_IP:8084",
    ],
    packages: [
      {
        id: "edge-engine", name: "Edge Agent", desc: "AI API Gateway — rate limiting, billing, abuse detection",
        variants: [
          { type: "docker", arch: "linux",   label: "Docker Linux",  icon: "🐳" },
          { type: "exe",   arch: "windows", label: "Windows EXE",   icon: "🪟" },
        ],
      },
    ],
  },
};

const STATUS_LABEL: Record<string, string> = {
  active:    "Active",
  suspended: "Suspended",
  revoked:   "Revoked",
  expired:   "Expired",
  pending:   "Pending Payment",
};

function fmtDate(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return s; }
}

function fmtExpiry(s: string) {
  if (!s) return "Lifetime";
  const d = new Date(s);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 86400));
  const label = fmtDate(s);
  if (diff < 0) return `Expired ${label}`;
  if (diff <= 30) return `⚠ Expires in ${diff} days (${label})`;
  return label;
}

export default function ClientDownloads() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dlStatus, setDlStatus] = useState<Record<string, "idle"|"loading"|"done"|"error">>({});
  const [dlError, setDlError] = useState<string|null>(null);
  const [guide, setGuide] = useState<string|null>(null);
  const [copied, setCopied] = useState<string|null>(null);
  const [tab, setTab] = useState(0);
  // Live per-format availability (build_formats, admin-controlled) -- checked
  // up front via HEAD so "Windows EXE — In Development" shows BEFORE the
  // client clicks download, not as an error after.
  const [formatAvail, setFormatAvail] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/portal", { credentials: "include" });
      if (r.status === 401) { router.push("/auth/login"); return; }
      if (r.ok) setData(await r.json());
    } catch {} finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const licenses = (data?.licenses || []).filter((l: any) => l.product);
    if (licenses.length === 0) return;
    let cancelled = false;
    (async () => {
      const checks: [string, Promise<boolean>][] = [];
      for (const lic of licenses) {
        if (lic.status !== "active") continue;
        const cat = PRODUCT_CATALOG[lic.product];
        if (!cat) continue;
        for (const pkg of cat.packages) {
          for (const v of pkg.variants) {
            const key = `${lic.id}|${pkg.id}|${v.type}|${v.arch}`;
            checks.push([key, fetch(
              `/api/portal/download?license_id=${lic.id}&product=${pkg.id}&type=${v.type}&arch=${v.arch}`,
              { method: "HEAD", credentials: "include" }
            ).then(r => r.ok).catch(() => false)]);
          }
        }
      }
      const results = await Promise.all(checks.map(([, p]) => p));
      if (cancelled) return;
      const next: Record<string, boolean> = {};
      checks.forEach(([key], i) => { next[key] = results[i]; });
      setFormatAvail(next);
    })();
    return () => { cancelled = true; };
  }, [data]);

  async function download(licId: string, product: string, type: string, arch: string) {
    const key = `${licId}|${product}|${type}|${arch}`;
    setDlStatus(s => ({ ...s, [key]: "loading" }));
    setDlError(null);
    try {
      const r = await fetch(
        `/api/portal/download?license_id=${licId}&product=${product}&type=${type}&arch=${arch}`,
        { credentials: "include" }
      );
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setDlError(d.error || "File belum tersedia — hubungi hello@axto.io");
        setDlStatus(s => ({ ...s, [key]: "error" }));
        return;
      }
      const blob = await r.blob();
      const fn = r.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/)?.[1]
        || `${product}-${type}-${arch}.zip`;
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob), download: fn,
      });
      a.click(); URL.revokeObjectURL(a.href);
      setDlStatus(s => ({ ...s, [key]: "done" }));
      setTimeout(() => setDlStatus(s => ({ ...s, [key]: "idle" })), 3000);
    } catch {
      setDlError("Network error. Coba lagi.");
      setDlStatus(s => ({ ...s, [key]: "error" }));
    }
  }

  function copyKey(k: string) {
    navigator.clipboard.writeText(k).then(() => { setCopied(k); setTimeout(() => setCopied(null), 2000); });
  }

  const licenses = (data?.licenses || []).filter((l: any) => l.product);
  const client   = data?.client || {};

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#0284c7", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}/>
        <p style={{ color: "#64748b", fontFamily: "system-ui, sans-serif" }}>Loading downloads…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f6ff", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .dl-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .dl-btn:active { transform: translateY(0); }
        .pkg-card:hover { border-color: rgba(255,255,255,0.25) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
        .key-copy:hover { background: rgba(255,255,255,0.15) !important; }
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .animate-in { animation: slideIn 0.3s ease forwards; }
        .guide-step { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .guide-step:last-child { border-bottom: none; }
      `}</style>

      {/* ── Top navigation bar ── */}
      <div style={{ background: "linear-gradient(90deg, #0a1628 0%, #0f2040 100%)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 18, color: "#fff", letterSpacing: "-0.3px" }}>
              AXTO Platform
            </span>
            <div style={{ height: 20, width: 1, background: "rgba(255,255,255,0.12)" }}/>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>Client Portal</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{client.name || client.email}</div>
              {client.organization && <div style={{ color: "#64748b", fontSize: 11 }}>{client.organization}</div>}
            </div>
            <a href="/portal" style={{ padding: "6px 14px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#94a3b8", fontSize: 12, fontWeight: 500, textDecoration: "none" }}>
              ← Back to Portal
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 28, animation: "fadeIn 0.4s ease" }}>
          <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 700, color: "#0a1628", letterSpacing: "-0.5px", marginBottom: 6 }}>
            Downloads
          </h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>
            Download software sesuai lisensi yang sudah diverifikasi.
          </p>
        </div>

        {/* ── Error banner ── */}
        {dlError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", animation: "slideIn 0.2s ease" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, color: "#991b1b", fontSize: 14 }}>Download Error</div>
                <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 2 }}>{dlError}</div>
              </div>
            </div>
            <button onClick={() => setDlError(null)} style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
        )}

        {/* ── No licenses state ── */}
        {licenses.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: "64px 32px", textAlign: "center", animation: "slideIn 0.4s ease" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 20, color: "#0a1628", marginBottom: 8 }}>
              Belum Ada Lisensi Aktif
            </h2>
            <p style={{ color: "#64748b", maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.6 }}>
              Download hanya tersedia setelah pembelian dikonfirmasi. Link download akan muncul di sini otomatis setelah pembayaran diverifikasi.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <a href="https://axto.io" target="_blank" rel="noopener" style={{ padding: "10px 20px", background: "#0284c7", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
                Beli Lisensi
              </a>
              <a href="mailto:hello@axto.io" style={{ padding: "10px 20px", background: "#f1f5f9", borderRadius: 10, color: "#475569", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
                Hubungi Support
              </a>
            </div>
          </div>
        )}

        {/* ── License tabs ── */}
        {licenses.length > 1 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
            {licenses.map((lic: any, i: number) => {
              const cat = PRODUCT_CATALOG[lic.product];
              return (
                <button key={lic.id} onClick={() => setTab(i)}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid", fontFamily: "'DM Sans', sans-serif",
                    borderColor: tab === i ? (cat?.color || "#0284c7") : "#e2e8f0",
                    background: tab === i ? `${cat?.color}15` : "#fff",
                    color: tab === i ? (cat?.color || "#0284c7") : "#64748b",
                    fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
                    boxShadow: tab === i ? `0 0 0 3px ${cat?.color}20` : "none",
                    transition: "all 0.2s",
                  }}>
                  {cat?.icon || "📦"} {cat?.label || lic.product} {lic.status !== "active" && "🔒"}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Per-license cards ── */}
        {licenses.map((lic: any, i: number) => {
          if (licenses.length > 1 && i !== tab) return null;
          const cat    = PRODUCT_CATALOG[lic.product];
          const active = lic.status === "active";

          return (
            <div key={lic.id} style={{ animation: "slideIn 0.35s ease" }}>

              {/* License header card */}
              <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
                <div style={{ background: cat?.gradient || "linear-gradient(135deg,#0a1628,#1e3a5f)", padding: "24px 28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 28 }}>{cat?.icon || "📦"}</span>
                        <div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", letterSpacing: "-0.3px" }}>
                            {cat?.label || lic.product} {lic.package_name ? `— ${lic.package_name}` : ""}
                          </div>
                          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 2 }}>
                            {lic.max_nodes === -1 || lic.max_nodes >= 9999 ? "Unlimited nodes" : `${lic.max_nodes} node limit`}
                            {" · "}
                            Expires: {fmtExpiry(lic.expires_at)}
                          </div>
                        </div>
                      </div>

                      {/* License key */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>License Key:</span>
                        <button className="key-copy" onClick={() => copyKey(lic.license_key)}
                          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "5px 12px", color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s" }}>
                          {lic.license_key}
                          <span style={{ fontSize: 10, opacity: 0.6 }}>{copied === lic.license_key ? "✓ Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      {/* Status badge */}
                      <div style={{
                        padding: "6px 14px", borderRadius: 20, fontWeight: 700, fontSize: 12, letterSpacing: "0.3px",
                        background: active ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                        color: active ? "#86efac" : "#fca5a5",
                        border: `1px solid ${active ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                      }}>
                        {active ? "● VERIFIED & ACTIVE" : `● ${STATUS_LABEL[lic.status] || lic.status}`.toUpperCase()}
                      </div>

                      {/* Guide button */}
                      {cat && (
                        <button onClick={() => setGuide(guide === lic.id ? null : lic.id)}
                          style={{ padding: "6px 14px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}>
                          {guide === lic.id ? "▲ Close Guide" : "📖 Setup Guide"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Setup guide inline */}
                  {guide === lic.id && cat && (
                    <div style={{ marginTop: 20, background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: "16px 20px", animation: "slideIn 0.2s ease" }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "#fff", fontSize: 14, marginBottom: 12 }}>
                        🚀 Quick Start — {cat.label}
                      </div>
                      {cat.guide.map((step, si) => (
                        <div key={si} className="guide-step">
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, marginTop: 1 }}>
                            {si + 1}
                          </div>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{step}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                        Port default: <span style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'DM Mono', monospace" }}>{cat.port}</span>
                        {" · "}
                        Activate license di browser setelah container up
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment not verified warning */}
                {!active && (
                  <div style={{ background: "#fff7ed", borderTop: "1px solid #fed7aa", padding: "16px 28px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 22, marginTop: 2 }}>⏳</span>
                    <div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "#9a3412" }}>
                        {lic.status === "pending" ? "Menunggu Verifikasi Pembayaran" : STATUS_LABEL[lic.status] || "Lisensi Tidak Aktif"}
                      </div>
                      <div style={{ color: "#c2410c", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                        {lic.status === "pending"
                          ? "Pembayaran sedang diverifikasi. Download akan tersedia otomatis setelah verifikasi selesai (biasanya < 1 jam)."
                          : "Lisensi ini tidak dapat digunakan untuk download. Hubungi hello@axto.io untuk informasi lebih lanjut."
                        }
                      </div>
                      <a href="mailto:hello@axto.io" style={{ display: "inline-block", marginTop: 8, padding: "6px 14px", background: "#ea580c", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                        Hubungi Support
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Download packages ── */}
              {active && cat && (
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#334155", marginBottom: 14, paddingLeft: 4 }}>
                    📦 Packages
                  </div>
                  <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
                    {cat.packages.map((pkg) => (
                      <div key={pkg.id} className="pkg-card"
                        style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", overflow: "hidden", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                        {/* Package header */}
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg, #f8faff 0%, #f0f7ff 100%)" }}>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#0a1628", marginBottom: 4 }}>
                            {pkg.name}
                          </div>
                          <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{pkg.desc}</div>
                        </div>

                        {/* Variants */}
                        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                          {pkg.variants.map((v) => {
                            const dlKey = `${lic.id}|${pkg.id}|${v.type}|${v.arch}`;
                            const status = dlStatus[dlKey] || "idle";
                            const available = formatAvail[dlKey] !== false;
                            return (
                              <div key={dlKey} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", opacity: available ? 1 : 0.6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ fontSize: 18 }}>{v.icon}</span>
                                  <div>
                                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{v.label}</div>
                                    <div style={{ color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                                      {available ? `.${v.type === "docker" ? "tar.gz" : "zip"}` : "Still in development"}
                                    </div>
                                  </div>
                                </div>

                                {available ? (
                                  <button className="dl-btn"
                                    disabled={status === "loading"}
                                    onClick={() => download(lic.id, pkg.id, v.type, v.arch)}
                                    style={{
                                      padding: "8px 16px", borderRadius: 10, border: "none",
                                      background: status === "done" ? "#dcfce7" : status === "error" ? "#fee2e2" : status === "loading" ? "#f1f5f9" : cat.color,
                                      color: status === "done" ? "#166534" : status === "error" ? "#991b1b" : status === "loading" ? "#64748b" : "#fff",
                                      fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12,
                                      cursor: status === "loading" ? "wait" : "pointer",
                                      transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
                                      boxShadow: status === "idle" ? `0 2px 8px ${cat.color}40` : "none",
                                    }}>
                                    {status === "loading" && (
                                      <span style={{ width: 12, height: 12, border: "2px solid #cbd5e1", borderTopColor: "#64748b", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }}/>
                                    )}
                                    {status === "loading" ? "Downloading…" : status === "done" ? "✓ Done" : status === "error" ? "✕ Error" : "⬇ Download"}
                                  </button>
                                ) : (
                                  <span title="Not published by admin yet — check back soon or contact hello@axto.io"
                                    style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(148,163,184,0.15)", color: "#64748b", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
                                    🚧 In Development
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Package footer */}
                        <div style={{ padding: "10px 16px 14px", display: "flex", gap: 8, borderTop: "1px solid #f1f5f9" }}>
                          <a href={`/api/portal/download?license_id=${lic.id}&product=${pkg.id}&action=guide&format=pdf`}
                            target="_blank" rel="noopener"
                            style={{ flex: 1, padding: "8px 0", textAlign: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, color: "#475569", fontSize: 12, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            📄 Setup Guide PDF
                          </a>
                          <a href={`/api/portal/download?license_id=${lic.id}&product=${pkg.id}&action=invoice`}
                            style={{ flex: 1, padding: "8px 0", textAlign: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, color: "#475569", fontSize: 12, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            🧾 Invoice
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements note */}
              {active && lic.product === "orchestra" && (
                <div style={{ marginTop: 14, padding: "14px 18px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 4 }}>⚠ Orchestra Worker GPU</div>
                  <div style={{ fontSize: 12, color: "#a16207", lineHeight: 1.5 }}>
                    Worker GPU membutuhkan NVIDIA GPU + nvidia-docker runtime. Image size ~4GB.
                    Jika build belum tersedia, hubungi hello@axto.io.
                  </div>
                </div>
              )}

            </div>
          );
        })}

        {/* ── Footer ── */}
        <div style={{ marginTop: 40, padding: "24px 28px", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "#0a1628", marginBottom: 4 }}>Butuh bantuan?</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Support: <a href="mailto:hello@axto.io" style={{ color: "#0284c7" }}>hello@axto.io</a> · Docs: <a href="https://axto.io/guide" style={{ color: "#0284c7" }}>axto.io/guide</a></div>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
            AXTO Platform — 100% BYOK<br/>
            Your keys · Your data · Your infrastructure
          </div>
        </div>

      </div>
    </div>
  );
}
