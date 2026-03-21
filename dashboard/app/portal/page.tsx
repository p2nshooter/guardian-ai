"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GUARDIAN_DOCS = {
  name: "Guardian AI", icon: "🛡️",
  overview: "Self-hosted AI cybersecurity engine. 7-layer threat detection, automated incident response, compliance reporting. Deploy via Docker.",
  menus: [
    { title: "Dashboard", desc: "Real-time security overview. Active threats, scan status, protected nodes, recent alerts, threat timeline, system health." },
    { title: "Threat Scanner", desc: "7-layer engine: (1) Hash Lookup vs malware DB, (2) Magic Bytes — file type spoofing, (3) Entropy — packed/encrypted payloads, (4) Binary Signatures, (5) YARA-like patterns for webshells/ransomware, (6) AI Deep Scan — neural network, (7) Behavioral Analysis — runtime behavior." },
    { title: "File Integrity Monitor", desc: "Real-time file change tracking. SHA-256 hashing. Monitors /etc, /var/www, custom paths. Alerts on unauthorized changes. Required for SOC2/PCI-DSS." },
    { title: "Process Monitor", desc: "All running processes with parent-child tree. Detects: unauthorized executables, privilege escalation, crypto miners, reverse shells. Auto-kill option." },
    { title: "Network Monitor", desc: "All inbound/outbound connections. DNS logging, port scan detection, C2 domain blocking, data exfiltration alerts, IP reputation." },
    { title: "DNS Monitor", desc: "DNS tunneling detection, DNS poisoning prevention, malicious domain blocking, DGA pattern recognition." },
    { title: "Quarantine", desc: "Isolated storage for threats. View details, restore false positives, delete, re-analyze. Retained for forensics." },
    { title: "Incident Response", desc: "Auto workflow: (1) Kill process → (2) Block IP → (3) Quarantine file → (4) Alert admin → (5) Forensic report. Under 30 seconds." },
    { title: "Node Management", desc: "Multi-server dashboard. Each node runs Guardian agent. Shows: name, IP, OS, status, heartbeat, scan results. License tier = max nodes." },
    { title: "Compliance Reports", desc: "One-click reports: SOC 2 Type II, ISO 27001, HIPAA, PCI-DSS, GDPR. Access logs, incident history, baselines." },
    { title: "AI Analyst Chat", desc: "BYOK AI assistant. Ask: 'What happened at 3am?', 'Show SSH failures this week'. AI has full security context." },
    { title: "Settings", desc: "Scan intervals, paths, alerts (email/Slack/Discord/PagerDuty/webhook), AI keys, mTLS, log retention, access control." },
  ],
  setup: [
    "1. Download docker-compose.yml + guardian.yml from portal (below)",
    "2. Edit guardian.yml — paste your license key + AI API key",
    "3. Run: docker compose up -d",
    "4. Browser: http://YOUR_SERVER:8080",
    "5. Guardian is now protecting your server",
    "6. Add nodes: deploy guardian-node on each additional server",
  ],
};

const ORCHESTRA_DOCS = {
  name: "Orchestra AI", icon: "⚡",
  overview: "Self-hosted AI orchestration. Routes across OpenAI, Claude, Gemini, Groq, Ollama with cost optimization, failover, GPU management.",
  menus: [
    { title: "Console Dashboard", desc: "localhost:8080/console — active workers, queue depth, requests/min, cost today, provider health, latency P50/P95." },
    { title: "AI Providers", desc: "Supported: OpenAI, Claude, Gemini, Groq, DeepSeek, Mistral, Ollama, any OpenAI-compatible. Each shows: status, latency, cost/1K tokens, error rate." },
    { title: "Routing Strategies", desc: "6 modes: (1) cost_first — cheapest, (2) quality_first — best model, (3) smart_balance — cost×quality score, (4) round_robin — even spread, (5) local_first — GPU then cloud, (6) failover — cascade on error." },
    { title: "Workers (CPU)", desc: "Cloud API workers. Config: provider, model, concurrency. Auto-scale on queue depth." },
    { title: "Workers (GPU)", desc: "Local inference via Ollama/vLLM. Needs NVIDIA GPU + nvidia-docker. WORKER_IDLE_SHUTDOWN saves power when idle." },
    { title: "Job Queue", desc: "All requests queued. Priority tiers (urgent/normal/batch), retry, timeout, dead letter queue. Monitor: depth, wait, processing time." },
    { title: "Cost Analytics", desc: "Per provider/model/day: tokens, cost USD, requests, latency. Export CSV. Daily budget cap — hard-stops at limit." },
    { title: "Autoscaler", desc: "Auto worker scaling. Config: queue threshold, max workers, scale-down delay." },
    { title: "API Endpoint", desc: "OpenAI-compatible at localhost:8080/v1/chat/completions. Drop-in replacement. Supports streaming, tools, multimodal." },
    { title: "Webhooks", desc: "Events: job_completed, job_failed, worker_offline, budget_80%, budget_exceeded. Any HTTP endpoint." },
    { title: "Settings", desc: "License key, AI keys (BYOK local), worker tokens, console password, autoscaler, budget, CORS." },
  ],
  setup: [
    "1. Download orchestra-compose.yml + orchestra.yml from portal",
    "2. Edit orchestra.yml — paste license key + AI API keys",
    "3. Run: docker compose -f orchestra-compose.yml up -d",
    "4. Console: http://YOUR_SERVER:8080/console",
    "5. API: http://YOUR_SERVER:8080/v1/chat/completions",
    "6. In your app: change OpenAI base_url to Orchestra endpoint",
    "7. Add GPU: uncomment worker-gpu in compose, needs nvidia-docker",
  ],
};

export default function PortalPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview"|"licenses"|"playbooks"|"shop"|"docs"|"invoices">("overview");
  const [copied, setCopied] = useState<string|null>(null);
  const [docProduct, setDocProduct] = useState<"guardian"|"orchestra">("guardian");
  const [expandedDoc, setExpandedDoc] = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal", { credentials: "include" });
      if (res.status === 401) { router.push("/auth/login"); return; }
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function copyKey(k: string) { navigator.clipboard.writeText(k).then(() => { setCopied(k); setTimeout(() => setCopied(null), 2000); }); }

  const licenses = data?.licenses || [];
  const playbooks = data?.playbook_purchases || [];
  const invoices = data?.invoices || [];
  const client = data?.client || {};
  const docs = docProduct === "guardian" ? GUARDIAN_DOCS : ORCHESTRA_DOCS;
  const C = { card: { background:"#fff", borderRadius:14, border:"1px solid #e2e8f0", padding:"20px 24px", marginBottom:16 } as React.CSSProperties };

  if (loading) return <div style={{ minHeight:"100vh", background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b" }}>Loading portal...</div>;

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc" }}>
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
        <h1 style={{ fontSize:22, fontWeight:800, color:"#0a1628", margin:"0 0 4px" }}>Welcome, {client.name || client.email || "there"}!</h1>
        <p style={{ color:"#64748b", fontSize:13, margin:"0 0 20px" }}>Manage licenses, download products, browse documentation.</p>

        <div style={{ display:"flex", gap:4, background:"#e2e8f0", borderRadius:12, padding:4, marginBottom:24, flexWrap:"wrap" }}>
          {([ {id:"overview",l:"🏠 Overview"},{id:"licenses",l:`🔑 Licenses (${licenses.length})`},{id:"playbooks",l:`📦 Playbooks (${playbooks.filter((p:any)=>p.playbook_id).length})`},{id:"shop",l:"🛒 Buy Products"},{id:"docs",l:"📖 Docs & Guide"},{id:"invoices",l:`🧾 Invoices (${invoices.length})`} ] as const).map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"8px 14px", borderRadius:10, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, background:tab===t.id?"linear-gradient(135deg,#0284c7,#0d9488)":"transparent", color:tab===t.id?"#fff":"#64748b", whiteSpace:"nowrap" }}>{t.l}</button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab==="overview"&&<div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
            {[{i:"🔑",l:"Active Licenses",v:licenses.filter((l:any)=>l.status==="active").length,c:"#0284c7"},{i:"📦",l:"Playbooks",v:playbooks.filter((p:any)=>p.playbook_id).length,c:"#7c3aed"},{i:"🧾",l:"Invoices",v:invoices.length,c:"#22c55e"}].map(s=>(
              <div key={s.l} style={{...C.card,textAlign:"center"}}><div style={{fontSize:24}}>{s.i}</div><div style={{fontSize:28,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:11,color:"#475569"}}>{s.l}</div></div>
            ))}
          </div>
          <div style={C.card}>
            <h3 style={{fontSize:15,fontWeight:800,color:"#0a1628",margin:"0 0 16px"}}>Quick Actions</h3>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button onClick={()=>setTab("shop")} style={{padding:"10px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#0284c7,#0d9488)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>🛒 Buy Guardian / Orchestra</button>
              <Link href="/playbooks" style={{padding:"10px 20px",borderRadius:10,border:"1.5px solid #7c3aed",color:"#7c3aed",fontWeight:700,fontSize:13,textDecoration:"none"}}>📦 Browse Playbooks</Link>
              <button onClick={()=>setTab("docs")} style={{padding:"10px 20px",borderRadius:10,border:"1.5px solid #475569",color:"#475569",fontWeight:700,fontSize:13,cursor:"pointer",background:"transparent"}}>📖 Setup Guide</button>
            </div>
          </div>
          {licenses.length===0&&playbooks.length===0&&<div style={{...C.card,textAlign:"center",padding:48}}><div style={{fontSize:48,marginBottom:12}}>🚀</div><h3 style={{color:"#0a1628",marginBottom:8}}>Get Started</h3><p style={{color:"#64748b",maxWidth:400,margin:"0 auto",lineHeight:1.6}}>Purchase Guardian AI or Orchestra AI to protect your servers, or browse Playbooks for AI prompt templates.</p></div>}
        </div>}

        {/* ── LICENSES ── */}
        {tab==="licenses"&&<div>
          {licenses.length===0?<div style={{...C.card,textAlign:"center",padding:48}}><div style={{fontSize:48,marginBottom:12}}>🔑</div><p style={{color:"#64748b",marginBottom:16}}>No licenses yet.</p><button onClick={()=>setTab("shop")} style={{padding:"10px 24px",borderRadius:10,background:"linear-gradient(135deg,#0284c7,#0d9488)",color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer"}}>🛒 Buy Products</button></div>
          :licenses.map((lic:any)=>{
            const isG=lic.product==="guardian";
            const isActive=lic.status==="active";
            const days=Math.max(0,Math.ceil((new Date(lic.expires_at).getTime()-Date.now())/86400000));
            return <div key={lic.id} style={{...C.card,borderLeft:`4px solid ${isG?"#0284c7":"#7c3aed"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:20}}>{isG?"🛡️":"⚡"}</span>
                    <span style={{fontSize:16,fontWeight:800,color:"#0a1628"}}>{isG?"Guardian AI":"Orchestra AI"} — {lic.package_name||lic.package_code}</span>
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:isActive?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",color:isActive?"#22c55e":"#ef4444",fontWeight:700}}>{lic.status.toUpperCase()}</span>
                  </div>
                  <div style={{fontSize:12,color:"#64748b"}}>Max {lic.max_nodes} nodes · Expires {new Date(lic.expires_at).toLocaleDateString()} ({days}d left)</div>
                </div>
              </div>
              <div style={{background:"#0f172a",borderRadius:10,padding:"14px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <code style={{color:"#22d3ee",fontSize:13,fontFamily:"monospace",wordBreak:"break-all"}}>{lic.license_key}</code>
                <button onClick={()=>copyKey(lic.license_key)} style={{padding:"4px 12px",borderRadius:6,border:"1px solid #334155",background:"transparent",color:copied===lic.license_key?"#22c55e":"#94a3b8",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",marginLeft:12}}>{copied===lic.license_key?"Copied!":"Copy"}</button>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <a href={`/api/downloads?file=${isG?"guardian":"orchestra"}-compose.yml`} style={{padding:"8px 16px",borderRadius:8,background:"linear-gradient(135deg,#0284c7,#0d9488)",color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none"}}>⬇ docker-compose.yml</a>
                <a href={`/api/downloads?file=${isG?"guardian":"orchestra"}.example.yml`} style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid #0284c7",color:"#0284c7",fontSize:12,fontWeight:700,textDecoration:"none",background:"transparent"}}>⬇ Config Template</a>
                <button onClick={()=>{setDocProduct(isG?"guardian":"orchestra");setTab("docs");}} style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid #475569",color:"#475569",fontSize:12,fontWeight:700,cursor:"pointer",background:"transparent"}}>📖 Setup Guide</button>
              </div>
              {lic.node_count>0&&<div style={{fontSize:11,color:"#64748b",marginTop:10}}>Nodes: {lic.node_count}/{lic.max_nodes} · Heartbeat: {lic.last_heartbeat?new Date(lic.last_heartbeat).toLocaleString():"—"}</div>}
            </div>;
          })}
        </div>}

        {/* ── PLAYBOOKS ── */}
        {tab==="playbooks"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{fontSize:15,fontWeight:800,color:"#0a1628",margin:0}}>Your Playbooks</h3>
            <Link href="/playbooks" style={{color:"#7c3aed",fontSize:13,fontWeight:600,textDecoration:"none"}}>Browse Marketplace →</Link>
          </div>
          {playbooks.filter((p:any)=>p.playbook_id).length===0?<div style={{...C.card,textAlign:"center",padding:48}}><div style={{fontSize:48,marginBottom:12}}>📦</div><p style={{color:"#64748b",marginBottom:16}}>No playbooks yet.</p><Link href="/playbooks" style={{display:"inline-block",padding:"10px 24px",borderRadius:10,background:"linear-gradient(135deg,#7c3aed,#0284c7)",color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none"}}>Browse Playbooks →</Link></div>
          :<div style={{display:"flex",flexDirection:"column",gap:10}}>
            {playbooks.filter((p:any)=>p.playbook_id).map((p:any)=>(
              <div key={p.id} style={{...C.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px"}}>
                <div><div style={{fontSize:14,fontWeight:700,color:"#0a1628"}}>{p.playbook_name||"Playbook"}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>Purchased {new Date(p.created_at).toLocaleDateString()}</div></div>
                <a href={`/api/playbooks/download?id=${p.playbook_id}`} style={{padding:"8px 18px",borderRadius:8,background:"linear-gradient(135deg,#7c3aed,#0284c7)",color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>⬇ Download PDF</a>
              </div>
            ))}
          </div>}
        </div>}

        {/* ── SHOP ── */}
        {tab==="shop"&&<div>
          <h3 style={{fontSize:15,fontWeight:800,color:"#0a1628",margin:"0 0 16px"}}>Purchase Products</h3>
          <div style={{...C.card,borderLeft:"4px solid #0284c7"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:24}}>🛡️</span><div><div style={{fontSize:16,fontWeight:800,color:"#0a1628"}}>Guardian AI</div><div style={{fontSize:12,color:"#64748b"}}>Server cybersecurity — self-hosted, BYOK, Docker</div></div></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
              {[{p:"guardian_sentinel",n:"Sentinel",s:"1 server",pr:"$249",b:""},{p:"guardian_pro",n:"Pro",s:"20 servers",pr:"$990",b:"POPULAR"},{p:"guardian_business",n:"Business",s:"100 servers",pr:"$3,990",b:""},{p:"guardian_enterprise",n:"Enterprise",s:"1,000 servers",pr:"$17,900",b:""}].map(x=>(
                <div key={x.p} style={{background:"#f8fafc",borderRadius:10,padding:16,border:"1px solid #e2e8f0",position:"relative"}}>
                  {x.b&&<div style={{position:"absolute",top:8,right:8,fontSize:9,padding:"2px 6px",borderRadius:4,background:"rgba(2,132,199,0.1)",color:"#0284c7",fontWeight:700}}>{x.b}</div>}
                  <div style={{fontSize:14,fontWeight:800,color:"#0a1628"}}>{x.n}</div>
                  <div style={{fontSize:11,color:"#64748b",marginBottom:8}}>{x.s}</div>
                  <div style={{fontSize:22,fontWeight:900,color:"#0284c7",marginBottom:10}}>{x.pr}<span style={{fontSize:12,color:"#94a3b8"}}>/yr</span></div>
                  <Link href={`/register?pkg=${x.p}`} style={{display:"block",textAlign:"center",padding:"8px",borderRadius:8,background:"linear-gradient(135deg,#0284c7,#0d9488)",color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none"}}>Purchase →</Link>
                </div>
              ))}
            </div>
          </div>
          <div style={{...C.card,borderLeft:"4px solid #7c3aed"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:24}}>⚡</span><div><div style={{fontSize:16,fontWeight:800,color:"#0a1628"}}>Orchestra AI</div><div style={{fontSize:12,color:"#64748b"}}>AI orchestration — OpenAI, Claude, Gemini, Groq, Ollama</div></div></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
              {[{p:"orchestra_core",n:"Core",s:"10 workers",pr:"$9,900",b:""},{p:"orchestra_scale",n:"Scale",s:"50 workers",pr:"$29,900",b:"POPULAR"},{p:"orchestra_unlimited",n:"Unlimited",s:"∞ workers",pr:"$59,900",b:""}].map(x=>(
                <div key={x.p} style={{background:"#f8fafc",borderRadius:10,padding:16,border:"1px solid #e2e8f0",position:"relative"}}>
                  {x.b&&<div style={{position:"absolute",top:8,right:8,fontSize:9,padding:"2px 6px",borderRadius:4,background:"rgba(124,58,237,0.1)",color:"#7c3aed",fontWeight:700}}>{x.b}</div>}
                  <div style={{fontSize:14,fontWeight:800,color:"#0a1628"}}>{x.n}</div>
                  <div style={{fontSize:11,color:"#64748b",marginBottom:8}}>{x.s}</div>
                  <div style={{fontSize:22,fontWeight:900,color:"#7c3aed",marginBottom:10}}>{x.pr}<span style={{fontSize:12,color:"#94a3b8"}}>/yr</span></div>
                  <Link href={`/register?pkg=${x.p}`} style={{display:"block",textAlign:"center",padding:"8px",borderRadius:8,background:"linear-gradient(135deg,#7c3aed,#0284c7)",color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none"}}>Purchase →</Link>
                </div>
              ))}
            </div>
          </div>
          <div style={{...C.card,borderLeft:"4px solid #22c55e"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:24}}>📦</span><div><div style={{fontSize:16,fontWeight:800,color:"#0a1628"}}>AI Prompt Playbooks</div><div style={{fontSize:12,color:"#64748b"}}>400+ prompts — Copywriting, Legal, Business, Career</div></div></div>
            <Link href="/playbooks" style={{display:"inline-block",padding:"10px 24px",borderRadius:10,background:"linear-gradient(135deg,#22c55e,#0d9488)",color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none"}}>Browse Playbooks →</Link>
          </div>
        </div>}

        {/* ── DOCS ── */}
        {tab==="docs"&&<div>
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            <button onClick={()=>{setDocProduct("guardian");setExpandedDoc(null);}} style={{padding:"10px 20px",borderRadius:10,border:"1.5px solid",borderColor:docProduct==="guardian"?"#0284c7":"#e2e8f0",background:docProduct==="guardian"?"rgba(2,132,199,0.06)":"#fff",color:docProduct==="guardian"?"#0284c7":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer"}}>🛡️ Guardian AI</button>
            <button onClick={()=>{setDocProduct("orchestra");setExpandedDoc(null);}} style={{padding:"10px 20px",borderRadius:10,border:"1.5px solid",borderColor:docProduct==="orchestra"?"#7c3aed":"#e2e8f0",background:docProduct==="orchestra"?"rgba(124,58,237,0.06)":"#fff",color:docProduct==="orchestra"?"#7c3aed":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer"}}>⚡ Orchestra AI</button>
          </div>

          <div style={C.card}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:28}}>{docs.icon}</span><div><div style={{fontSize:18,fontWeight:800,color:"#0a1628"}}>{docs.name}</div><div style={{fontSize:13,color:"#475569",lineHeight:1.6}}>{docs.overview}</div></div></div>
          </div>

          <div style={{...C.card,background:"#0f172a",borderColor:"#1e293b"}}>
            <h3 style={{fontSize:14,fontWeight:800,color:"#22d3ee",margin:"0 0 12px"}}>🚀 Quick Setup</h3>
            {docs.setup.map((s,i)=><div key={i} style={{fontSize:13,color:"#cbd5e1",lineHeight:1.8,fontFamily:"monospace"}}>{s}</div>)}
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <a href={`/api/downloads?file=${docProduct}-compose.yml`} style={{padding:"8px 16px",borderRadius:8,background:"#22d3ee",color:"#0f172a",fontSize:12,fontWeight:700,textDecoration:"none"}}>⬇ docker-compose.yml</a>
              <a href={`/api/downloads?file=${docProduct}.example.yml`} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #334155",color:"#94a3b8",fontSize:12,fontWeight:700,textDecoration:"none"}}>⬇ Config Template</a>
            </div>
          </div>

          <h3 style={{fontSize:15,fontWeight:800,color:"#0a1628",margin:"20px 0 12px"}}>📋 Menu & Feature Reference ({docs.menus.length} items)</h3>
          <p style={{fontSize:12,color:"#64748b",margin:"0 0 12px"}}>Klik setiap menu untuk baca penjelasan lengkap fungsi dan informasi yang ada.</p>
          <a href="/guide" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:10,background:"linear-gradient(135deg,#0284c7,#0d9488)",color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none",marginBottom:12}}>
            📖 Buka Panduan Animasi Lengkap — Setup, Guardian, Orchestra, Antivirus, API →
          </a>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {docs.menus.map((m,i)=>{
              const open=expandedDoc===m.title;
              return <div key={i} style={{...C.card,padding:0,marginBottom:0,overflow:"hidden"}}>
                <button onClick={()=>setExpandedDoc(open?null:m.title)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{width:28,height:28,borderRadius:7,background:docProduct==="guardian"?"rgba(2,132,199,0.08)":"rgba(124,58,237,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:docProduct==="guardian"?"#0284c7":"#7c3aed"}}>{i+1}</span>
                    <span style={{fontSize:14,fontWeight:700,color:"#0a1628"}}>{m.title}</span>
                  </div>
                  <span style={{fontSize:14,color:"#94a3b8"}}>{open?"▲":"▼"}</span>
                </button>
                {open&&<div style={{padding:"0 20px 16px 58px",fontSize:13,color:"#475569",lineHeight:1.8}}>{m.desc}</div>}
              </div>;
            })}
          </div>

          <div style={{...C.card,marginTop:16,background:"rgba(34,211,238,0.04)",borderColor:"rgba(34,211,238,0.15)"}}>
            <h4 style={{fontSize:13,fontWeight:700,color:"#0a1628",margin:"0 0 8px"}}>Need Help?</h4>
            <p style={{fontSize:12,color:"#475569",lineHeight:1.6,margin:0}}>Every menu and feature is documented above. For additional support: <a href="mailto:hallo@axto.io" style={{color:"#0284c7"}}>hallo@axto.io</a></p>
          </div>
        </div>}

        {/* ── INVOICES ── */}
        {tab==="invoices"&&<div>
          {invoices.length===0?<div style={{...C.card,textAlign:"center",padding:48}}><div style={{fontSize:48,marginBottom:12}}>🧾</div><p style={{color:"#64748b"}}>No invoices yet.</p></div>
          :<div style={C.card}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>{["Date","Product","Amount","Gateway","Status"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",color:"#475569",fontWeight:700,fontSize:11,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
              <tbody>{invoices.map((inv:any)=><tr key={inv.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                <td style={{padding:"10px 12px",color:"#64748b"}}>{new Date(inv.created_at).toLocaleDateString()}</td>
                <td style={{padding:"10px 12px",color:"#0a1628",fontWeight:600}}>{inv.product==="guardian"?"🛡️":"⚡"} {inv.package_code||inv.product}</td>
                <td style={{padding:"10px 12px",fontWeight:700,color:"#22c55e"}}>${inv.amount_usd}</td>
                <td style={{padding:"10px 12px",color:"#64748b"}}>{inv.gateway}</td>
                <td style={{padding:"10px 12px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:inv.status==="paid"?"rgba(34,197,94,0.1)":"rgba(245,158,11,0.1)",color:inv.status==="paid"?"#22c55e":"#f59e0b",fontWeight:700}}>{inv.status}</span></td>
              </tr>)}</tbody>
            </table>
          </div>}
        </div>}
      </div>
    </div>
  );
}
