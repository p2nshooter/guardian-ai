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
import { PACKAGE_INFO, PRODUCT_ICONS, PRODUCT_NAMES, isForSale, isProductForSale } from "@/lib/stripe";

// ── Product definitions ───────────────────────────────────────────────────────
const GUARDIAN_PRODUCTS = [
  { id: "guardian-core",      icon: "🖥️", name: "Guardian Core",      desc: "API server + web dashboard. Install this first — it is the central command center." },
  { id: "guardian-node",      icon: "🤖", name: "Guardian Node Agent", desc: "Threat detection agent. Deploy on every server you want to protect." },
  { id: "guardian-antivirus", icon: "🦠", name: "Guardian Antivirus",  desc: "ClamAV antivirus engine. File scanning + automatic quarantine." },
];
const ORCHESTRA_PRODUCTS = [
  { id: "orchestra-core",        icon: "🖥️", name: "Orchestra Core",       desc: "API + web console. Central router & scheduler." },
  { id: "orchestra-worker-cpu",  icon: "💻", name: "Orchestra Worker CPU",  desc: "Cloud API worker. Handles requests via cloud AI providers." },
  { id: "orchestra-worker-gpu",  icon: "🎮", name: "Orchestra Worker GPU",  desc: "Local GPU inference. Requires NVIDIA GPU + nvidia-docker runtime." },
];

const GUARDIAN_DOCS = {
  name: "Guardian AI", icon: "🛡️",
  overview: "Self-hosted AI cybersecurity engine. 7-layer threat detection, automated incident response, compliance reporting. Deploy via Docker.",
  menus: [
    { title: "Dashboard",          desc: "Real-time security overview. Active threats, scan status, protected nodes, recent alerts, threat timeline, system health." },
    { title: "Threat Scanner",     desc: "7-layer engine: (1) Hash Lookup vs malware DB, (2) Magic Bytes, (3) Entropy, (4) Binary Signatures, (5) YARA patterns, (6) AI Deep Scan, (7) Behavioral Analysis." },
    { title: "File Integrity",     desc: "Real-time file change tracking. SHA-256 hashing. Monitors /etc, /var/www, custom paths. Alerts on unauthorized changes." },
    { title: "Process Monitor",    desc: "All running processes with parent-child tree. Detects privilege escalation, miners, reverse shells. Auto-kill option." },
    { title: "Network Monitor",    desc: "All inbound/outbound connections. DNS logging, port scan detection, C2 domain blocking, exfiltration alerts." },
    { title: "DNS Monitor",        desc: "DNS tunneling detection, poisoning prevention, malicious domain blocking, DGA pattern recognition." },
    { title: "Quarantine",         desc: "Isolated storage for threats. View, restore false positives, delete, re-analyze." },
    { title: "Incident Response",  desc: "Auto workflow: Kill process → Block IP → Quarantine file → Alert admin → Forensic report. Under 30 seconds." },
    { title: "Node Management",    desc: "Multi-server dashboard. Each node runs Guardian agent. License tier = max nodes." },
    { title: "Compliance Reports", desc: "One-click: SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR." },
    { title: "AI Analyst Chat",    desc: "BYOK AI assistant. Ask: 'What happened at 3am?', 'Show SSH failures this week'." },
    { title: "Settings",           desc: "Scan intervals, paths, alerts (email/Slack/Discord), AI keys, mTLS, log retention." },
  ],
  setup: [
    "1. Download docker-compose.yml + guardian.yml from this portal",
    "2. Edit guardian.yml — enter your license key + AI API key",
    "3. Run: docker compose up -d",
    "4. Open: http://YOUR_SERVER:8080",
    "5. Paste your license key in the activation wizard",
    "6. Add servers: deploy guardian-node on each additional server",
  ],
};
const ORCHESTRA_DOCS = {
  name: "Orchestra AI", icon: "⚡",
  overview: "Self-hosted AI orchestration. Routes OpenAI, Claude, Gemini, Groq, Ollama with cost optimization, failover, GPU management.",
  menus: [
    { title: "Console Dashboard",  desc: "localhost:8080/console — active workers, queue depth, requests/min, cost today, provider health." },
    { title: "AI Providers",       desc: "OpenAI, Claude, Gemini, Groq, DeepSeek, Mistral, Ollama, any OpenAI-compatible API." },
    { title: "Routing Strategies", desc: "6 modes: cost_first, quality_first, smart_balance, round_robin, local_first, failover." },
    { title: "Workers CPU",        desc: "Cloud API workers. Config: provider, model, concurrency. Auto-scale on queue depth." },
    { title: "Workers GPU",        desc: "Local inference via Ollama/vLLM. Needs NVIDIA GPU + nvidia-docker." },
    { title: "Job Queue",          desc: "Priority tiers (urgent/normal/batch), retry, timeout, dead letter queue." },
    { title: "Cost Analytics",     desc: "Per provider/model/day: tokens, cost USD, latency. Daily budget cap." },
    { title: "Autoscaler",         desc: "Auto worker scaling. Config: queue threshold, max workers, scale-down delay." },
    { title: "API Endpoint",       desc: "OpenAI-compatible at localhost:8080/v1/chat/completions. Drop-in replacement." },
    { title: "Webhooks",           desc: "Events: job_completed, job_failed, worker_offline, budget_exceeded." },
    { title: "Settings",           desc: "License key, AI keys (BYOK), worker tokens, console password, autoscaler, CORS." },
  ],
  setup: [
    "1. Download orchestra-compose.yml + orchestra.yml from this portal",
    "2. Edit orchestra.yml — enter license key + AI API keys + console password",
    "3. Run: docker compose -f orchestra-compose.yml up -d",
    "4. Console: http://YOUR_SERVER:8080/console",
    "5. API: http://YOUR_SERVER:8080/v1/chat/completions",
    "6. In your app: replace OpenAI base_url with the Orchestra endpoint",
  ],
};

type Tab = "overview" | "licenses" | "playbooks" | "shop" | "docs" | "invoices";

export default function PortalPage() {
  const router = useRouter();
  const [data,        setData]        = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<Tab>("overview");
  const [copied,      setCopied]      = useState<string|null>(null);
  const [docProduct,  setDocProduct]  = useState<"guardian"|"orchestra">("guardian");
  const [expandedDoc, setExpandedDoc] = useState<string|null>(null);
  const [dlStatus,    setDlStatus]    = useState<Record<string, "idle"|"loading"|"error">>({});
  const [dlError,     setDlError]     = useState<string|null>(null);
  const [avail,       setAvail]       = useState<Record<string, boolean|null>>({});
  // buildFmtAvail: admin-controlled toggle. key = "product:docker" | "product:exe-linux" | "product:exe-windows"
  const [buildFmtAvail, setBuildFmtAvail] = useState<Record<string, boolean>>({});
  const [buildFmtLoaded, setBuildFmtLoaded] = useState(false);

  const loadBuildAvail = useCallback(async () => {
    try {
      const r = await fetch("/api/portal/build-availability", { credentials: "include" });
      if (r.ok) { const d = await r.json(); setBuildFmtAvail(d.availability || {}); }
    } catch {}
    setBuildFmtLoaded(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal", { credentials: "include" });
      if (res.status === 401) { router.push("/auth/login"); return; }
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); loadBuildAvail(); }, [load, loadBuildAvail]);

  function copyKey(k: string) {
    navigator.clipboard.writeText(k).then(() => {
      setCopied(k); setTimeout(() => setCopied(null), 2000);
    });
  }

  function fmtKey(product: string, type: string): string {
    // Map download type to build_formats format key
    if (type === "exe")         return "exe-windows";
    if (type === "exe-linux")   return "exe-linux";
    return "docker";
  }

  function isFormatAdminEnabled(licProduct: string, type: string): boolean {
    if (!buildFmtLoaded) return true; // optimistic while loading
    const key = `${licProduct}:${fmtKey(licProduct, type)}`;
    return buildFmtAvail[key] !== false; // default true if key missing
  }

  async function checkAvail(licId: string, product: string, type: string, licProduct: string) {
    const key = `${licId}|${product}|${type}`;
    if (avail[key] !== undefined) return;
    setAvail(s => ({...s, [key]: null}));

    // First check admin toggle — if disabled, mark as unavailable immediately
    if (!isFormatAdminEnabled(licProduct, type)) {
      setAvail(s => ({...s, [key]: false}));
      return;
    }

    try {
      const r = await fetch(
        `/api/portal/download?license_id=${licId}&product=${product}&type=${type}`,
        { method: "HEAD", credentials: "include" }
      );
      // Check for admin-disabled header
      if (!r.ok && r.headers.get("X-AXTO-Reason") === "coming_soon") {
        setAvail(s => ({...s, [key]: false}));
        return;
      }
      setAvail(s => ({...s, [key]: r.ok}));
    } catch {
      setAvail(s => ({...s, [key]: false}));
    }
  }

  async function download(licId: string, product: string, type: string) {
    const key = `${licId}|${product}|${type}`;
    setDlStatus(s => ({...s, [key]: "loading"}));
    setDlError(null);
    try {
      const url = `/api/portal/download?license_id=${licId}&product=${product}&type=${type}`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        if (d.error === "coming_soon") {
          setDlError("⏳ " + (d.message || "This format is not yet available. The admin is preparing the build. Please check back in a few days.") + (d.hint ? "\n" + d.hint : ""));
        } else {
          setDlError(d.hint || d.error || "File not yet available. Please try again later or contact hallo@axto.io");
        }
        setDlStatus(s => ({...s, [key]: "error"}));
        return;
      }
      const blob = await r.blob();
      const fn   = r.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/)?.[1]
                || `${product}.${type === "exe" ? "exe" : "tar.gz"}`;
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob), download: fn,
      });
      a.click(); URL.revokeObjectURL(a.href);
      setDlStatus(s => ({...s, [key]: "idle"}));
    } catch {
      setDlError("Network error. Please try again.");
      setDlStatus(s => ({...s, [key]: "error"}));
    }
  }

  const licenses  = data?.licenses || [];
  const playbooks = data?.playbook_purchases || [];
  const invoices  = data?.invoices || [];
  const client    = data?.client || {};
  const docs      = docProduct === "guardian" ? GUARDIAN_DOCS : ORCHESTRA_DOCS;

  const S = {
    card: { background:"#fff", borderRadius:14, border:"1px solid #e2e8f0", padding:"20px 24px", marginBottom:16 } as React.CSSProperties,
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b" }}>
      Loading portal...
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc" }}>
      {/* ── Nav ── */}
      <nav style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 24px", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none" }}>
            <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#0284c7,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🛡</div>
            <span style={{ fontSize:18, fontWeight:900, color:"#0a1628" }}>AXTO</span>
            <span style={{ fontSize:13, color:"#64748b", marginLeft:4 }}>Client Portal</span>
          </Link>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:12, color:"#475569" }}>{client.email}</span>
            <Link href="/playbooks" style={{ fontSize:12, color:"#0284c7", textDecoration:"none", fontWeight:600 }}>Store</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 24px 80px" }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:"#0a1628", margin:"0 0 4px" }}>
          Welcome, {client.name || client.email || "there"}!
        </h1>
        <p style={{ color:"#64748b", fontSize:13, margin:"0 0 20px" }}>
          Manage licenses, download products, browse documentation.
        </p>

        {/* ── Tabs ── */}
        <div style={{ display:"flex", gap:4, background:"#e2e8f0", borderRadius:12, padding:4, marginBottom:24, flexWrap:"wrap" }}>
          {([
            { id:"overview"  as Tab, l:`🏠 Overview` },
            { id:"licenses"  as Tab, l:`🔑 Licenses (${licenses.length})` },
            { id:"playbooks" as Tab, l:`📦 Playbooks (${playbooks.filter((p:any)=>p.playbook_id).length})` },
            { id:"shop"      as Tab, l:`🛒 Buy Products` },
            { id:"docs"      as Tab, l:`📖 Docs & Guide` },
            { id:"invoices"  as Tab, l:`🧾 Invoices (${invoices.length})` },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:"8px 14px", borderRadius:10, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
                background: tab===t.id ? "linear-gradient(135deg,#0284c7,#0d9488)" : "transparent",
                color: tab===t.id ? "#fff" : "#64748b", whiteSpace:"nowrap" }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* ══════════════════ OVERVIEW ══════════════════ */}
        {tab==="overview" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
              {[
                { i:"🔑", l:"Active Licenses", v:licenses.filter((l:any)=>l.status==="active").length, c:"#0284c7" },
                { i:"📦", l:"Playbooks",        v:playbooks.filter((p:any)=>p.playbook_id).length,      c:"#7c3aed" },
                { i:"🧾", l:"Invoices",         v:invoices.length,                                      c:"#22c55e" },
              ].map(s => (
                <div key={s.l} style={{...S.card, textAlign:"center"}}>
                  <div style={{fontSize:24}}>{s.i}</div>
                  <div style={{fontSize:28,fontWeight:900,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:11,color:"#475569"}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={S.card}>
              <h3 style={{fontSize:15,fontWeight:800,color:"#0a1628",margin:"0 0 16px"}}>Quick Actions</h3>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button onClick={()=>setTab("shop")}
                  style={{padding:"10px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#0284c7,#0d9488)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  🛒 Buy Products
                </button>
                <Link href="/studio/ai"
                  style={{padding:"10px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#8b5cf6,#6366f1)",color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none"}}>
                  🧠 Open AI Studio
                </Link>
                <Link href="/studio/gpu"
                  style={{padding:"10px 20px",borderRadius:10,border:"1.5px solid #f59e0b",color:"#f59e0b",fontWeight:700,fontSize:13,textDecoration:"none"}}>
                  ⚡ GPU Studio
                </Link>
                <Link href="/playbooks"
                  style={{padding:"10px 20px",borderRadius:10,border:"1.5px solid #7c3aed",color:"#7c3aed",fontWeight:700,fontSize:13,textDecoration:"none"}}>
                  📦 Browse Playbooks
                </Link>
                <button onClick={()=>setTab("docs")}
                  style={{padding:"10px 20px",borderRadius:10,border:"1.5px solid #475569",color:"#475569",fontWeight:700,fontSize:13,cursor:"pointer",background:"transparent"}}>
                  📖 Setup Guide
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ LICENSES ══════════════════ */}
        {tab==="licenses" && (
          <div>
            {/* Global error banner */}
            {dlError && (
              <div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,
                padding:"10px 14px",marginBottom:14,color:"#dc2626",fontSize:13}}>
                ⚠️ {dlError}
                <button onClick={()=>setDlError(null)} style={{float:"right",background:"none",border:"none",cursor:"pointer",color:"#dc2626"}}>✕</button>
              </div>
            )}

            {licenses.length === 0 ? (
              <div style={{...S.card,textAlign:"center",padding:48}}>
                <div style={{fontSize:48,marginBottom:12}}>🔑</div>
                <p style={{color:"#64748b",marginBottom:16}}>{t("portal.no_lic") || "No licenses yet. Purchase a plan to get started."}</p>
                <button onClick={()=>setTab("shop")} style={{padding:"10px 24px",borderRadius:10,background:"linear-gradient(135deg,#0284c7,#0d9488)",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer"}}>
                  🛒 Beli Produk
                </button>
              </div>
            ) : (
              licenses.map((lic: any) => {
                const isG    = lic.product === "guardian";
                const isAct  = lic.status  === "active";
                const days   = Math.max(0, Math.ceil((new Date(lic.expires_at).getTime() - Date.now()) / 86400000));
                const productColors: Record<string,{accent:string,grad:string}> = {
                  guardian:   {accent:"#0284c7",grad:"linear-gradient(135deg,#0284c7,#0d9488)"},
                  orchestra:  {accent:"#7c3aed",grad:"linear-gradient(135deg,#7c3aed,#0284c7)"},
                  vault:      {accent:"#6366f1",grad:"linear-gradient(135deg,#6366f1,#0284c7)"},
                  soc:        {accent:"#dc2626",grad:"linear-gradient(135deg,#dc2626,#f97316)"},
                  compliance: {accent:"#16a34a",grad:"linear-gradient(135deg,#16a34a,#0d9488)"},
                  edge:       {accent:"#3b82f6",grad:"linear-gradient(135deg,#3b82f6,#8b5cf6)"},
                  sentinel:   {accent:"#f59e0b",grad:"linear-gradient(135deg,#f59e0b,#ef4444)"},
                  bundle:     {accent:"#0284c7",grad:"linear-gradient(135deg,#0284c7,#7c3aed)"},
                };
                const pc = productColors[lic.product] || productColors.guardian;
                const accent = pc.accent;
                const grad   = pc.grad;

                const productDownloads: Record<string,{id:string,icon:string,name:string,desc:string}[]> = {
                  guardian: GUARDIAN_PRODUCTS,
                  orchestra: ORCHESTRA_PRODUCTS,
                  vault:      [{id:"vault-core",       icon:"🔐",name:"Vault Core",          desc:"AI Data Privacy Proxy. PII/PHI/Financial redaction."}],
                  soc:        [{id:"soc-core",         icon:"🔴",name:"SOC Core",             desc:"AI Security Operations Center. SIEM + SOAR + Threat Hunting."}],
                  compliance: [{id:"compliance-core",  icon:"📋",name:"Compliance Core",      desc:"Automated audit platform. SOC2, ISO27001, HIPAA, GDPR."}],
                  edge:       [{id:"edge-core",        icon:"🌐",name:"Edge Core",            desc:"AI API Gateway. Rate limiting, billing, prompt firewall."}],
                  sentinel:   [{id:"sentinel-core",    icon:"📡",name:"Sentinel Core",        desc:"IoT/OT Security. Device fingerprinting, anomaly detection."}],
                  bundle:     [...GUARDIAN_PRODUCTS, ...ORCHESTRA_PRODUCTS,
                    {id:"vault-core",icon:"🔐",name:"Vault Core",desc:"AI Data Privacy Proxy."},
                    {id:"soc-core",icon:"🔴",name:"SOC Core",desc:"AI Security Operations Center."},
                    {id:"compliance-core",icon:"📋",name:"Compliance Core",desc:"Automated audit platform."},
                    {id:"edge-core",icon:"🌐",name:"Edge Core",desc:"AI API Gateway."},
                    {id:"sentinel-core",icon:"📡",name:"Sentinel Core",desc:"IoT/OT Security."},
                  ],
                };
                const products = productDownloads[lic.product] || GUARDIAN_PRODUCTS;

                // Trigger availability check for all products on mount
                products.forEach(p => {
                  checkAvail(lic.id, p.id, "docker");
                  checkAvail(lic.id, p.id, "exe");
                });

                return (
                  <div key={lic.id} style={{...S.card, borderLeft:`4px solid ${accent}`, padding:0, overflow:"hidden", marginBottom:20}}>

                    {/* Header */}
                    <div style={{padding:"18px 24px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{fontSize:22}}>{isG?"🛡️":"⚡"}</span>
                          <span style={{fontSize:17,fontWeight:800,color:"#0a1628"}}>
                            {isG?"Guardian AI":"Orchestra AI"}
                          </span>
                          <span style={{fontSize:12,fontWeight:700,padding:"2px 10px",borderRadius:20,
                            background: lic.package_name ? `${accent}15` : "#f1f5f9",
                            color: lic.package_name ? accent : "#64748b"}}>
                            {lic.package_name || lic.package_code}
                          </span>
                          <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,fontWeight:700,
                            background:isAct?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",
                            color:isAct?"#22c55e":"#ef4444"}}>
                            {lic.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{fontSize:12,color:"#64748b"}}>
                          Max {lic.max_nodes} nodes · Expires {new Date(lic.expires_at).toLocaleDateString()} ({days}d left)
                        </div>
                      </div>
                      <div style={{fontSize:11,color:"#94a3b8",textAlign:"right"}}>
                        {lic.node_count > 0 && <div>Nodes: {lic.node_count}/{lic.max_nodes}</div>}
                        {lic.last_heartbeat && <div>Last: {new Date(lic.last_heartbeat).toLocaleString()}</div>}
                      </div>
                    </div>

                    {/* License key */}
                    <div style={{padding:"12px 24px", background:"#0f172a", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:9,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>
                          LICENSE KEY — enter this in the activation wizard
                        </div>
                        <code style={{color:"#22d3ee",fontSize:13,fontFamily:"monospace",letterSpacing:"1px"}}>
                          {lic.license_key}
                        </code>
                      </div>
                      <button onClick={() => copyKey(lic.license_key)}
                        style={{padding:"5px 14px",borderRadius:6,border:"1px solid #334155",background:"transparent",
                          color:copied===lic.license_key?"#22c55e":"#94a3b8",fontSize:11,fontWeight:700,
                          cursor:"pointer",marginLeft:16,whiteSpace:"nowrap",flexShrink:0}}>
                        {copied === lic.license_key ? "✅ Copied!" : "📋 Copy"}
                      </button>
                    </div>

                    {/* ── Download bundles ── */}
                    <div style={{padding:"20px 24px"}}>
                      <div style={{fontWeight:800,fontSize:13,color:"#0a1628",marginBottom:16}}>
                        {t("portal.download_title") || "⬇️ Download"} {isG?"Guardian":"Orchestra"} Products
                      </div>

                      {/* Product table */}
                      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
                        {products.map(prod => {
                          const dk  = `${lic.id}|${prod.id}|docker`;
                          const ek  = `${lic.id}|${prod.id}|exe`;
                          const dav = avail[dk]; // true/false/null/undefined
                          const eav = avail[ek];
                          const dls = dlStatus[dk] || "idle";
                          const els = dlStatus[ek] || "idle";

                          return (
                            <div key={prod.id} style={{background:"#f8fafc",borderRadius:12,padding:"14px 18px",
                              border:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                              <div style={{flex:1,minWidth:200}}>
                                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                                  <span style={{fontSize:18}}>{prod.icon}</span>
                                  <span style={{fontSize:14,fontWeight:700,color:"#0a1628"}}>{prod.name}</span>
                                </div>
                                <div style={{fontSize:11,color:"#64748b"}}>{prod.desc}</div>
                              </div>

                              {/* Download buttons */}
                              <div style={{display:"flex",gap:8,flexShrink:0}}>
                                {/* ── Download buttons — respect admin build-format toggle ── */}
                                {(() => {
                                  const dockerOn    = isFormatAdminEnabled(lic.product, "docker");
                                  // EXE binaries are temporarily in active development — disabled
                                  // platform-wide so clients only get the production-ready Docker build.
                                  const exeLinuxOn  = false;
                                  const exeWinOn    = false;

                                  return (<>
                                    {/* 🐳 Docker */}
                                    {dockerOn ? (
                                      <button
                                        onClick={() => { checkAvail(lic.id, prod.id, "docker", lic.product); download(lic.id, prod.id, "docker"); }}
                                        disabled={dls === "loading" || !isAct}
                                        title="Download Docker image (.tar.gz) for Linux server"
                                        style={{
                                          padding:"8px 14px", borderRadius:8, border:"none", fontSize:12, fontWeight:700,
                                          cursor: dls==="loading"||!isAct ? "not-allowed" : "pointer",
                                          background: dls==="loading" ? "#e2e8f0" : dav===false ? "#f1f5f9" : grad,
                                          color:  dls==="loading" ? "#94a3b8" : dav===false ? "#94a3b8" : "#fff",
                                          display:"flex", alignItems:"center", gap:5, opacity: !isAct ? 0.5 : 1,
                                        }}>
                                        {dls === "loading" ? "⏳ Downloading..." : "🐳 Docker (.tar.gz)"}
                                      </button>
                                    ) : (
                                      <div title="Admin has not yet published this build" style={{
                                        padding:"8px 14px", borderRadius:8, border:"1.5px dashed rgba(245,158,11,0.3)",
                                        background:"rgba(245,158,11,0.06)", color:"#f59e0b", fontSize:12, fontWeight:700,
                                        display:"flex", alignItems:"center", gap:5, cursor:"default", whiteSpace:"nowrap",
                                      }}>
                                        🔜 Docker — Coming Soon
                                      </div>
                                    )}

                                    {/* 🐧 EXE Linux */}
                                    {exeLinuxOn ? (
                                      <button
                                        onClick={() => { checkAvail(lic.id, prod.id, "exe-linux", lic.product); download(lic.id, prod.id, "exe-linux"); }}
                                        disabled={!isAct}
                                        title="Download EXE binary for Linux (systemd service, no Docker required)"
                                        style={{
                                          padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:700,
                                          cursor: !isAct ? "not-allowed" : "pointer",
                                          background:"#fff", border:`1.5px solid ${accent}`,
                                          color: accent, display:"flex", alignItems:"center", gap:5, opacity: !isAct ? 0.5 : 1,
                                        }}>
                                        🐧 EXE Linux
                                      </button>
                                    ) : (
                                      <div title="Admin has not yet published this build" style={{
                                        padding:"8px 14px", borderRadius:8, border:"1.5px dashed rgba(245,158,11,0.3)",
                                        background:"rgba(245,158,11,0.06)", color:"#f59e0b", fontSize:12, fontWeight:700,
                                        display:"flex", alignItems:"center", gap:5, cursor:"default", whiteSpace:"nowrap",
                                      }}>
                                        🔧 EXE Linux — In Development
                                      </div>
                                    )}

                                    {/* 🪟 EXE Windows */}
                                    {exeWinOn ? (
                                      <button
                                        onClick={() => { checkAvail(lic.id, prod.id, "exe", lic.product); download(lic.id, prod.id, "exe"); }}
                                        disabled={els === "loading" || !isAct}
                                        title="Download Windows self-extracting installer"
                                        style={{
                                          padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:700,
                                          cursor: els==="loading"||!isAct ? "not-allowed" : "pointer",
                                          background:"#fff", border:`1.5px solid ${eav===false ? "#e2e8f0" : accent}`,
                                          color: els==="loading" ? "#94a3b8" : eav===false ? "#94a3b8" : accent,
                                          display:"flex", alignItems:"center", gap:5, opacity: !isAct ? 0.5 : 1,
                                        }}>
                                        {els === "loading" ? "⏳ Downloading..." : "🪟 Windows (.exe)"}
                                      </button>
                                    ) : (
                                      <div title="Admin has not yet published this build" style={{
                                        padding:"8px 14px", borderRadius:8, border:"1.5px dashed rgba(245,158,11,0.3)",
                                        background:"rgba(245,158,11,0.06)", color:"#f59e0b", fontSize:12, fontWeight:700,
                                        display:"flex", alignItems:"center", gap:5, cursor:"default", whiteSpace:"nowrap",
                                      }}>
                                        🔧 Windows EXE — In Development
                                      </div>
                                    )}
                                  </>);
                                })()}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Config files */}
                      <div style={{borderTop:"1px solid #e2e8f0",paddingTop:16,marginBottom:16}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>
                          📋 Config Files (required before deployment)
                        </div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <a href={`/api/downloads?file=${isG?"guardian":"orchestra"}-compose.yml`}
                            style={{padding:"8px 16px",borderRadius:8,background:grad,color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:5}}>
                            🐳 docker-compose.yml
                          </a>
                          <a href={`/api/downloads?file=${isG?"guardian":"orchestra"}.example.yml`}
                            style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"#f8fafc",color:"#475569",fontSize:12,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:5}}>
                            ⚙️ {isG?"guardian":"orchestra"}.yml
                          </a>
                        </div>
                      </div>

                      {/* Invoice & Guide Downloads */}
                      <div style={{borderTop:"1px solid #e2e8f0",paddingTop:16,marginBottom:16}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>
                          📄 Invoice & Setup Guide
                        </div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <a href={`/api/portal/download?license_id=${lic.id}&action=invoice`}
                            style={{padding:"8px 16px",borderRadius:8,background:"#0f172a",color:"#22d3ee",fontSize:12,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:5}}>
                            🧾 Download Invoice
                          </a>
                          <a href={`/api/portal/download?license_id=${lic.id}&action=guide&lang=en`}
                            style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid #0284c7",background:"transparent",color:"#0284c7",fontSize:12,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:5}}>
                            🇺🇸 English Guide
                          </a>
                          <a href={`/api/portal/download?license_id=${lic.id}&action=guide&lang=id`}
                            style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid #7c3aed",background:"transparent",color:"#7c3aed",fontSize:12,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:5}}>
                            🇮🇩 Guide (Indonesian)
                          </a>
                        </div>
                      </div>

                      {/* Quick setup */}
                      <div style={{background:"#0f172a",borderRadius:10,padding:"16px 18px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#22d3ee",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.8px"}}>
                          🚀 Quick Setup
                        </div>
                        {(isG ? GUARDIAN_DOCS : ORCHESTRA_DOCS).setup.map((s,i) => (
                          <div key={i} style={{fontSize:12,color:"#94a3b8",lineHeight:2,fontFamily:"monospace"}}>{s}</div>
                        ))}
                        <div style={{marginTop:12,padding:"8px 10px",borderRadius:6,background:"rgba(251,191,36,.08)",border:"1px solid rgba(251,191,36,.2)"}}>
                          <span style={{color:"#fbbf24"}}>⚠️ Butuh bantuan?</span>
                          <span style={{color:"#64748b"}}> Email: hallo@axto.io — sertakan server OS + error message</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══════════════════ PLAYBOOKS ══════════════════ */}
        {tab==="playbooks" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:800,color:"#0a1628",margin:0}}>Your Playbooks</h3>
              <Link href="/playbooks" style={{color:"#7c3aed",fontSize:13,fontWeight:600,textDecoration:"none"}}>Browse Marketplace →</Link>
            </div>
            {playbooks.filter((p:any)=>p.playbook_id).length===0 ? (
              <div style={{...S.card,textAlign:"center",padding:48}}>
                <div style={{fontSize:48,marginBottom:12}}>📦</div>
                <p style={{color:"#64748b",marginBottom:16}}>No playbooks yet.</p>
                <Link href="/playbooks" style={{display:"inline-block",padding:"10px 24px",borderRadius:10,background:"linear-gradient(135deg,#7c3aed,#0284c7)",color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none"}}>
                  Browse Playbooks →
                </Link>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {playbooks.filter((p:any)=>p.playbook_id).map((p:any) => (
                  <div key={p.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:"#0a1628"}}>{p.playbook_name||"Playbook"}</div>
                      <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Purchased {new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                    <a href={`/api/playbooks/download?id=${p.playbook_id}`}
                      style={{padding:"8px 18px",borderRadius:8,background:"linear-gradient(135deg,#7c3aed,#0284c7)",color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
                      ⬇ Download PDF
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ SHOP ══════════════════ */}
        {tab==="shop" && (
          <div>
            <h3 style={{fontSize:15,fontWeight:800,color:"#0a1628",margin:"0 0 16px"}}>Purchase Products</h3>

            {/* All 8 products dynamically */}
            {[
              { product: "guardian", color: "#0284c7", desc: "Self-hosted cybersecurity — 7-layer AI detection, antivirus, compliance. BYOK.", items: [
                {p:"lite",n:"Sentinel",s:"1 server",pr:"$490",b:""},
                {p:"pro",n:"Professional",s:"25 servers",pr:"$1,990",b:"POPULAR"},
                {p:"shield",n:"Business",s:"100 servers",pr:"$7,990",b:""},
                {p:"aegis",n:"Enterprise",s:"1,000 servers",pr:"$29,900",b:""},
              ]},
              { product: "orchestra", color: "#7c3aed", desc: "Self-hosted AI orchestration — route 15+ providers, GPU auto-detect, autoscale. BYOK.", items: [
                {p:"orchestra_core",n:"Starter",s:"10 workers",pr:"$14,900",b:""},
                {p:"orchestra_scale",n:"Professional",s:"50 workers",pr:"$39,900",b:"POPULAR"},
                {p:"orchestra_unlimited",n:"Enterprise",s:"∞ workers",pr:"$89,900",b:""},
              ]},
              { product: "vault", color: "#6366f1", desc: "AI data privacy — PII/PHI/financial redaction before AI API calls.", items: [
                {p:"vault_starter",n:"Starter",s:"50K req/day",pr:"$9,900",b:""},
                {p:"vault_professional",n:"Professional",s:"500K req/day",pr:"$24,900",b:"POPULAR"},
                {p:"vault_business",n:"Business",s:"5M req/day",pr:"$74,900",b:""},
                {p:"vault_enterprise",n:"Enterprise",s:"Unlimited",pr:"$199,000",b:""},
              ]},
              { product: "edge", color: "#3b82f6", desc: "AI API gateway — token metering, rate limiting, prompt firewall.", items: [
                {p:"edge_starter",n:"Starter",s:"100K req/day",pr:"$4,900",b:""},
                {p:"edge_professional",n:"Professional",s:"1M req/day",pr:"$9,900",b:"POPULAR"},
                {p:"edge_business",n:"Business",s:"10M req/day",pr:"$29,900",b:""},
                {p:"edge_enterprise",n:"Enterprise",s:"Unlimited",pr:"$99,000",b:""},
              ]},
              { product: "soc", color: "#dc2626", desc: "AI Security Operations Center — SIEM, SOAR, threat intelligence.", items: [
                {p:"soc_starter",n:"Starter",s:"5 sources",pr:"$19,900",b:""},
                {p:"soc_professional",n:"Professional",s:"25 sources",pr:"$49,900",b:"POPULAR"},
                {p:"soc_business",n:"Business",s:"100 sources",pr:"$149,900",b:""},
                {p:"soc_enterprise",n:"Enterprise",s:"Unlimited",pr:"$499,000",b:""},
              ]},
              { product: "compliance", color: "#16a34a", desc: "Automated audit — SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR.", items: [
                {p:"compliance_starter",n:"Starter",s:"2 frameworks",pr:"$14,900",b:""},
                {p:"compliance_professional",n:"Professional",s:"6 frameworks",pr:"$49,900",b:"POPULAR"},
                {p:"compliance_business",n:"Business",s:"7 frameworks",pr:"$99,000",b:""},
                {p:"compliance_enterprise",n:"Enterprise",s:"Custom",pr:"$199,000",b:""},
              ]},
              { product: "sentinel", color: "#7c3aed", desc: "IoT/OT security — device discovery, protocol detection, IEC 62443.", items: [
                {p:"sentinel_starter",n:"Starter",s:"50 devices",pr:"$9,900",b:""},
                {p:"sentinel_professional",n:"Professional",s:"500 devices",pr:"$29,900",b:"POPULAR"},
                {p:"sentinel_business",n:"Business",s:"5,000 devices",pr:"$79,900",b:""},
                {p:"sentinel_enterprise",n:"Enterprise",s:"Unlimited",pr:"$249,000",b:""},
              ]},
              { product: "antivirus", color: "#ea580c", desc: "ClamAV + ML behavioral detection — self-hosted endpoint protection.", items: [
                {p:"antivirus_starter",n:"Starter",s:"10 endpoints",pr:"$2,900",b:""},
                {p:"antivirus_professional",n:"Professional",s:"100 endpoints",pr:"$9,900",b:"POPULAR"},
                {p:"antivirus_enterprise",n:"Enterprise",s:"Unlimited",pr:"$29,900",b:""},
              ]},
              { product: "studio", color: "#8b5cf6", desc: "Central AI & GPU Pool — bring your own API keys, use our professional studio.", items: [
                {p:"studio_starter",n:"Starter",s:"500 req/day, 1 GPU",pr:"$49/mo",b:""},
                {p:"studio_professional",n:"Professional",s:"5K req/day, 5 GPUs",pr:"$199/mo",b:"POPULAR"},
                {p:"studio_enterprise",n:"Enterprise",s:"Unlimited",pr:"$799/mo",b:""},
              ]},
            ].map(section => {
              const productForSale = isProductForSale(section.product);
              return (
                <div key={section.product} style={{...S.card,borderLeft:`4px solid ${productForSale ? section.color : "#94a3b8"}`, opacity: productForSale ? 1 : 0.85}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <span style={{fontSize:24}}>{PRODUCT_ICONS[section.product]}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:16,fontWeight:800,color:"#0a1628"}}>{PRODUCT_NAMES[section.product]}</div>
                      <div style={{fontSize:12,color:"#64748b"}}>{section.desc}</div>
                    </div>
                    {!productForSale && (
                      <span style={{fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:8,background:"rgba(245,158,11,0.1)",color:"#f59e0b",whiteSpace:"nowrap"}}>🔜 Coming Soon</span>
                    )}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
                    {section.items.map(x=>(
                      <div key={x.p} style={{background: productForSale ? "#f8fafc" : "#f8fafc", borderRadius:10,padding:16,border:"1px solid #e2e8f0",position:"relative"}}>
                        {x.b&&productForSale&&<div style={{position:"absolute",top:8,right:8,fontSize:9,padding:"2px 6px",borderRadius:4,background:`${section.color}15`,color:section.color,fontWeight:700}}>{x.b}</div>}
                        {!productForSale&&<div style={{position:"absolute",top:8,right:8,fontSize:9,padding:"2px 6px",borderRadius:4,background:"rgba(245,158,11,0.1)",color:"#f59e0b",fontWeight:700}}>Coming Soon</div>}
                        <div style={{fontSize:14,fontWeight:800,color:"#0a1628"}}>{x.n}</div>
                        <div style={{fontSize:11,color:"#64748b",marginBottom:8}}>{x.s}</div>
                        <div style={{fontSize:22,fontWeight:900,color: productForSale ? section.color : "#94a3b8",marginBottom:10}}>{x.pr}<span style={{fontSize:12,color:"#94a3b8"}}>/yr</span></div>
                        {productForSale ? (
                          <Link href={`/register?pkg=${x.p}`} style={{display:"block",textAlign:"center",padding:"8px",borderRadius:8,background:`linear-gradient(135deg,${section.color},${section.color}cc)`,color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none"}}>Purchase →</Link>
                        ) : (
                          <div style={{display:"block",textAlign:"center",padding:"8px",borderRadius:8,background:"rgba(148,163,184,0.12)",color:"#94a3b8",fontSize:12,fontWeight:700,cursor:"not-allowed"}}>🔜 Coming Soon</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{...S.card,borderLeft:"4px solid #22c55e"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <span style={{fontSize:24}}>📦</span>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:"#0a1628"}}>AI Prompt Playbooks</div>
                  <div style={{fontSize:12,color:"#64748b"}}>400+ prompts — Copywriting, Legal, Business, Career</div>
                </div>
              </div>
              <Link href="/playbooks" style={{display:"inline-block",padding:"10px 24px",borderRadius:10,background:"linear-gradient(135deg,#22c55e,#0d9488)",color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none"}}>
                Browse Playbooks →
              </Link>
            </div>
          </div>
        )}

        {/* ══════════════════ DOCS ══════════════════ */}
        {tab==="docs" && (
          <div>
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              <button onClick={()=>{setDocProduct("guardian");setExpandedDoc(null);}}
                style={{padding:"10px 20px",borderRadius:10,border:"1.5px solid",borderColor:docProduct==="guardian"?"#0284c7":"#e2e8f0",background:docProduct==="guardian"?"rgba(2,132,199,0.06)":"#fff",color:docProduct==="guardian"?"#0284c7":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                🛡️ Guardian AI
              </button>
              <button onClick={()=>{setDocProduct("orchestra");setExpandedDoc(null);}}
                style={{padding:"10px 20px",borderRadius:10,border:"1.5px solid",borderColor:docProduct==="orchestra"?"#7c3aed":"#e2e8f0",background:docProduct==="orchestra"?"rgba(124,58,237,0.06)":"#fff",color:docProduct==="orchestra"?"#7c3aed":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                ⚡ Orchestra AI
              </button>
            </div>

            <div style={S.card}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:28}}>{docs.icon}</span>
                <div>
                  <div style={{fontSize:18,fontWeight:800,color:"#0a1628"}}>{docs.name}</div>
                  <div style={{fontSize:13,color:"#475569",lineHeight:1.6}}>{docs.overview}</div>
                </div>
              </div>
            </div>

            <div style={{...S.card,background:"#0f172a",borderColor:"#1e293b"}}>
              <h3 style={{fontSize:14,fontWeight:800,color:"#22d3ee",margin:"0 0 12px"}}>🚀 Quick Setup</h3>
              {docs.setup.map((s,i) => <div key={i} style={{fontSize:13,color:"#cbd5e1",lineHeight:1.8,fontFamily:"monospace"}}>{s}</div>)}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <a href={`/api/downloads?file=${docProduct}-compose.yml`}
                  style={{padding:"8px 16px",borderRadius:8,background:"#22d3ee",color:"#0f172a",fontSize:12,fontWeight:700,textDecoration:"none"}}>
                  ⬇ docker-compose.yml
                </a>
                <a href={`/api/downloads?file=${docProduct}.example.yml`}
                  style={{padding:"8px 16px",borderRadius:8,border:"1px solid #334155",color:"#94a3b8",fontSize:12,fontWeight:700,textDecoration:"none"}}>
                  ⬇ Config Template
                </a>
              </div>
            </div>

            <h3 style={{fontSize:15,fontWeight:800,color:"#0a1628",margin:"20px 0 12px"}}>
              📋 Menu & Feature Reference ({docs.menus.length} items)
            </h3>
            <a href="/guide" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:10,background:"linear-gradient(135deg,#0284c7,#0d9488)",color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none",marginBottom:12}}>
              📖 Open Complete Setup Guide →
            </a>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {docs.menus.map((m,i) => {
                const open = expandedDoc === m.title;
                const c    = docProduct === "guardian" ? "#0284c7" : "#7c3aed";
                return (
                  <div key={i} style={{...S.card,padding:0,marginBottom:0,overflow:"hidden"}}>
                    <button onClick={()=>setExpandedDoc(open?null:m.title)}
                      style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{width:28,height:28,borderRadius:7,background:`${c}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:c}}>{i+1}</span>
                        <span style={{fontSize:14,fontWeight:700,color:"#0a1628"}}>{m.title}</span>
                      </div>
                      <span style={{fontSize:14,color:"#94a3b8"}}>{open?"▲":"▼"}</span>
                    </button>
                    {open && <div style={{padding:"0 20px 16px 58px",fontSize:13,color:"#475569",lineHeight:1.8}}>{m.desc}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════ INVOICES ══════════════════ */}
        {tab==="invoices" && (
          <div>
            {invoices.length===0 ? (
              <div style={{...S.card,textAlign:"center",padding:48}}>
                <div style={{fontSize:48,marginBottom:12}}>🧾</div>
                <p style={{color:"#64748b"}}>No invoices yet.</p>
              </div>
            ) : (
              <div style={S.card}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #e2e8f0"}}>
                      {["Date","Product","Amount","Gateway","Status"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",color:"#475569",fontWeight:700,fontSize:11,textTransform:"uppercase"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv:any) => (
                      <tr key={inv.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                        <td style={{padding:"10px 12px",color:"#64748b"}}>{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td style={{padding:"10px 12px",color:"#0a1628",fontWeight:600}}>{PRODUCT_ICONS[inv.product] || "📦"} {inv.package_code||inv.product}</td>
                        <td style={{padding:"10px 12px",fontWeight:700,color:"#22c55e"}}>${inv.amount_usd}</td>
                        <td style={{padding:"10px 12px",color:"#64748b"}}>{inv.gateway}</td>
                        <td style={{padding:"10px 12px"}}>
                          <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,fontWeight:700,
                            background:inv.status==="paid"?"rgba(34,197,94,0.1)":"rgba(245,158,11,0.1)",
                            color:inv.status==="paid"?"#22c55e":"#f59e0b"}}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
