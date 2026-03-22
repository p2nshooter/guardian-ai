"use client";
export const runtime = "edge";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ── Styles ──────────────────────────────────────────────────────────────────
const inp = { width:"100%", padding:"10px 14px", borderRadius:9, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#0a1628", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" as const };
const lbl = { color:"#64748b", fontSize:11, fontWeight:700, display:"block" as const, marginBottom:5, textTransform:"uppercase" as const, letterSpacing:"0.5px" };
const card = { background:"#fff", borderRadius:14, border:"1.5px solid #e2e8f0" };

// ── Constants ────────────────────────────────────────────────────────────────
const PRODUCTS = [
  // ── Guardian components ───────────────────────────────────────────────────
  { v:"guardian-core",      icon:"🛡️", name:"Guardian Core",        desc:"REST API + Dashboard backend (port 8080)", group:"Guardian" },
  { v:"guardian-node",      icon:"🤖", name:"Guardian Node Agent",   desc:"Threat detection agent — runs on each protected server", group:"Guardian" },
  { v:"guardian-clamav",    icon:"🦠", name:"ClamAV Antivirus",      desc:"Real-time file scanning + signature updates (sidecar)", group:"Guardian" },
  { v:"guardian-core-node", icon:"🛡️", name:"Guardian Core + Node",  desc:"Core API + Node Agent — no antivirus (lighter)", group:"Guardian" },
  { v:"guardian-bundle",    icon:"🛡️", name:"Guardian Full Stack",   desc:"Core + Node Agent + ClamAV — complete Guardian deploy", group:"Guardian" },
  // ── Orchestra components ──────────────────────────────────────────────────
  { v:"orchestra-core",       icon:"⚡", name:"Orchestra Core",         desc:"AI orchestration API + Console UI (port 8080)", group:"Orchestra" },
  { v:"orchestra-worker-cpu", icon:"💻", name:"Orchestra Worker CPU",   desc:"Cloud AI worker (OpenAI, Groq, Anthropic, etc.)", group:"Orchestra" },
  { v:"orchestra-worker-gpu", icon:"🎮", name:"Orchestra Worker GPU",   desc:"Local GPU inference worker (Ollama, llama.cpp)", group:"Orchestra" },
  { v:"orchestra-core-cpu",   icon:"⚡", name:"Orchestra Core + CPU",   desc:"Core + CPU Worker — no GPU required (most common)", group:"Orchestra" },
  { v:"orchestra-bundle",     icon:"⚡", name:"Orchestra Full Stack",   desc:"Core + CPU Worker + GPU Worker — complete Orchestra deploy", group:"Orchestra" },
  // ── Full bundle ───────────────────────────────────────────────────────────
  { v:"full-bundle",      icon:"📦", name:"AXTO Full Platform",    desc:"Everything: Guardian + Orchestra complete stack", group:"Bundle" },
];
const BUILD_TYPES = [
  { v:"docker", icon:"🐳", name:"Docker Image",   desc:"docker-compose.yml + config files" },
  { v:"exe",    icon:"💾", name:"EXE / Script",   desc:"install.sh / install.bat + config" },
];
const LICENSE_TYPES = [
  { v:"trial",        icon:"🕐", name:"Trial",        desc:"1–7 days (Guardian & Orchestra)" },
  { v:"monthly",      icon:"📅", name:"Monthly",       desc:"30 days, renewable" },
  { v:"yearly",       icon:"📆", name:"Yearly",        desc:"12 months" },
  { v:"lifetime",     icon:"♾️", name:"Lifetime",      desc:"One-time, never expires" },
  { v:"per_instance", icon:"🖥️", name:"Per Instance",  desc:"Locked to 1 machine" },
];
const ARCHS = [
  { v:"linux/amd64",   l:"Linux x86-64 (default)" },
  { v:"linux/arm64",   l:"Linux ARM64" },
  { v:"windows/amd64", l:"Windows x64" },
];

// ── Animated guide steps ─────────────────────────────────────────────────────
const GUIDE_STEPS = [
  { icon:"☁️", title:"Auto-Build on Push", body:"Push ke branch main → GitHub Actions otomatis build SEMUA produk (11 produk × 3 format = ~30 file). Tidak perlu trigger manual." },
  { icon:"🐳", title:"Semua Format Tersedia", body:"Setiap produk dibangun dalam 3 format: Docker Linux, EXE Linux, EXE Windows. Client tinggal pilih yang sesuai OS mereka." },
  { icon:"🔑", title:"License Input di Runtime", body:"Binary TIDAK embed license key. Client download ZIP → install → buka browser → masukkan license key → semua fitur unlock." },
  { icon:"⬇️", title:"Client Download dari Portal", body:"Client login portal → tab Licenses → pilih produk → klik Download. File di-stream langsung dari CF R2." },
  { icon:"🛡️", title:"License Wizard di Browser", body:"Pertama kali buka http://SERVER:8080, muncul halaman aktivasi. Client paste license key → validasi ke axto.io → redirect ke dashboard." },
  { icon:"🗑️", title:"Admin Hapus dari Releases", body:"Buka Admin → ☁️ Releases → hapus per file atau per produk dari CF R2. Build baru otomatis setiap push ke main." },
];

function fmtDate(d:string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"}); }
  catch { return d; }
}

function statusPill(s:string) {
  const m: Record<string,{bg:string;c:string}> = {
    ready:   {bg:"rgba(34,197,94,.1)",   c:"#16a34a"},
    building:{bg:"rgba(2,132,199,.1)",   c:"#0284c7"},
    failed:  {bg:"rgba(239,68,68,.1)",   c:"#dc2626"},
    deleted: {bg:"rgba(100,116,139,.1)", c:"#94a3b8"},
  };
  const x = m[s]||m.building;
  return <span style={{padding:"2px 9px",borderRadius:6,fontSize:11,fontWeight:700,background:x.bg,color:x.c}}>{s}</span>;
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({pct,logs}:{pct:number;logs:any[]}) {
  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:13,fontWeight:700,color:"#0a1628"}}>Building…</span>
        <span style={{fontSize:13,fontWeight:700,color:"#0284c7"}}>{pct}%</span>
      </div>
      <div style={{height:10,background:"#e2e8f0",borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#0284c7,#0d9488)",borderRadius:99,transition:"width .5s ease"}}/>
      </div>
      <div style={{marginTop:14,display:"flex",flexDirection:"column" as const,gap:4}}>
        {logs.map((l,i)=>(
          <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:12,color: l.level==="error"?"#dc2626":"#475569"}}>
            <span style={{color:l.message.startsWith("[5/5")?"#16a34a":l.message.startsWith("[")?"#0284c7":"#94a3b8",marginTop:1}}>
              {l.message.startsWith("[5/5")?"✅":l.message.startsWith("[")?"⚙":"·"}
            </span>
            <span>{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type QBItem = { product:string; icon:string; name:string; desc:string; manualOnly?:boolean; variants?:string[] };
type QBGroup = { group:string; color:string; items:QBItem[] };
// ── Quick Build catalog — mirrors landing page ────────────────────────────────
const QB_VARIANTS = [
  {type:"docker", arch:"linux",   icon:"🐳🐧", label:"Docker Linux"},
  {type:"exe",    arch:"linux",   icon:"💾🐧", label:"EXE Linux"},
  {type:"exe",    arch:"windows", icon:"💾🪟", label:"EXE Windows"},
];
const QB_CATALOG = [
  {
    group:"🛡️ Guardian AI", color:"#0284c7",
    items:[
      {product:"guardian-bundle",    icon:"🛡️", name:"Guardian Full Bundle",   desc:"Core + Node + ClamAV"},
      {product:"guardian-core-node", icon:"🛡️", name:"Core + Node",            desc:"Without Antivirus"},
      {product:"guardian-core",      icon:"🖥️", name:"Guardian Core",          desc:"API + Dashboard only"},
      {product:"guardian-node",      icon:"🤖", name:"Guardian Node Agent",    desc:"Threat detection agent"},
      {product:"guardian-clamav",    icon:"🦠", name:"ClamAV Antivirus",       desc:"Antivirus sidecar", variants:["docker-linux"]},
    ],
  },
  {
    group:"⚡ Orchestra AI", color:"#7c3aed",
    items:[
      {product:"orchestra-bundle",     icon:"⚡", name:"Orchestra Full Bundle",  desc:"Core + CPU + GPU Workers", manualOnly:true},
      {product:"orchestra-core-cpu",   icon:"⚡", name:"Core + CPU Worker",      desc:"No GPU required"},
      {product:"orchestra-core",       icon:"🖥️", name:"Orchestra Core",         desc:"API + Console only"},
      {product:"orchestra-worker-cpu", icon:"💻", name:"Worker CPU",             desc:"Cloud AI worker", manualOnly:true},
      {product:"orchestra-worker-gpu", icon:"🎮", name:"Worker GPU",             desc:"Local GPU inference", manualOnly:true, variants:["docker-linux"]},
    ],
  },
  {
    group:"📦 Full Platform", color:"#0d9488",
    items:[
      {product:"full-bundle", icon:"📦", name:"AXTO Full Platform", desc:"Guardian + Orchestra complete", manualOnly:true},
    ],
  },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function EngineBuilderPage() {
  const [tab,    setTab]    = useState<"quick"|"builds"|"create"|"guide">("quick");
  // Per-variant progress: key = "product-type-arch"
  const [qbState, setQbState] = useState<Record<string,{
    status:"idle"|"building"|"done"|"failed";
    pct:number; logs:string[]; buildId:string|null; dlUrl:string|null; runUrl:string|null;
  }>>({});
  const qbPolls = useRef<Record<string,any>>({});

  function qbGet(key:string) {
    return qbState[key] || {status:"idle",pct:0,logs:[],buildId:null,dlUrl:null,runUrl:null};
  }
  function qbSet(key:string, patch:any) {
    setQbState(s=>({...s,[key]:{...(s[key]||{status:"idle",pct:0,logs:[],buildId:null,dlUrl:null,runUrl:null}),...patch}}));
  }
  function qbPoll(key:string, id:string, ghBuild=false) {
    if (qbPolls.current[key]) clearInterval(qbPolls.current[key]);
    const iv = ghBuild ? 10000 : 1500;
    qbPolls.current[key] = setInterval(async()=>{
      try {
        const r = await fetch("/api/admin/engine-builder",{method:"POST",credentials:"include",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({action:"get_progress",id})});
        const d = await r.json();
        const pct   = d.progress || 0;
        const logs  = (d.logs||[]).map((l:any)=>l.message||"");
        const runUrl= d.run_url || d.build?.run_url || null;
        qbSet(key,{pct, logs, runUrl});
        if (d.build?.status==="ready" || d.build?.status==="failed") {
          const done = d.build.status==="ready";
          qbSet(key,{status:done?"done":"failed", pct:done?100:0,
            dlUrl:d.build?.download_url||null, logs});
          clearInterval(qbPolls.current[key]);
          delete qbPolls.current[key];
          await load(); // refresh DB builds → Quick Build colors update
        }
      } catch {}
    }, iv);
  }
  useEffect(()=>()=>{Object.values(qbPolls.current).forEach(clearInterval);},[]);
  const [builds, setBuilds] = useState<any[]>([]);
  const [stats,  setStats]  = useState<any>({});
  const [r2Files,setR2Files]= useState<any[]>([]);
  const [loading,setLoading]= useState(true);
  const [err,    setErr]    = useState<string|null>(null);
  const [ok,     setOk]     = useState<string|null>(null);
  const [dlFiles,setDlFiles]= useState<any>(null);
  const [delId,  setDelId]  = useState<string|null>(null);
  const [hasGH,  setHasGH]  = useState<boolean|null>(null);
  const [hasR2,  setHasR2]  = useState<boolean|null>(null);

  // Build progress state
  const [building,  setBuilding]  = useState(false);
  const [ghTriggered, setGhTriggered] = useState(false);
  const [ghRunUrl,    setGhRunUrl]    = useState("");
  const [dlUrl,       setDlUrl]       = useState("");
  const [buildId,   setBuildId]   = useState<string|null>(null);
  const [buildPct,  setBuildPct]  = useState(0);
  const [buildLogs, setBuildLogs] = useState<any[]>([]);
  const [buildDone, setBuildDone] = useState(false);
  const pollRef = useRef<any>(null);

  // Guide animation
  const [guideStep, setGuideStep] = useState(0);
  useEffect(()=>{
    const t = setInterval(()=>setGuideStep(s=>(s+1)%GUIDE_STEPS.length), 3500);
    return ()=>clearInterval(t);
  },[]);

  // Form
  const [form, setForm] = useState({
    product:"guardian-core", build_type:"docker", license_type:"yearly",
    trial_days:"3", max_nodes:"1", max_gpu:"0", max_workers:"10",
    unlimited:false, client_name:"", client_email:"", client_org:"",
    label:"", arch:"linux/amd64", version:"latest",
    notes:"", existing_license_key:"",
  });
  const set = (k:string,v:any)=>setForm(f=>({...f,[k]:v}));

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [ebRes, relRes] = await Promise.all([
        fetch("/api/admin/engine-builder",{credentials:"include"}),
        fetch("/api/admin/releases",{credentials:"include"}),
      ]);
      if (ebRes.ok) {
        const d = await ebRes.json();
        setBuilds(d.builds||[]);
        setStats(d.stats||{});
        setHasGH(!!d.hasGithubToken);
        setHasR2(!!d.hasR2);
      }
      if (relRes.ok) {
        const d = await relRes.json();
        setR2Files(d.files||[]);
      }
    } catch {} finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  // Resume polling for any "building" builds from DB on page load
  useEffect(()=>{
    if (!builds.length) return;
    const building = builds.filter((b:any)=>b.status==="building");
    building.forEach((b:any)=>{
      // Find which QB variant this matches
      const archRevMap:Record<string,string> = {"linux/amd64":"linux","windows/amd64":"windows","linux/arm64":"arm64"};
      const arch = archRevMap[b.arch] || "linux";
      const qkey = `${b.product}-${b.build_type}-${arch}`;
      // Only resume if not already polling
      if (!qbPolls.current[qkey]) {
        qbSet(qkey,{status:"building",pct:20,buildId:b.id,logs:["Resuming poll..."],dlUrl:null,runUrl:b.run_url||null});
        qbPoll(qkey, b.id, true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[builds]);

  // Poll build progress
  // BUG FIX: use 10s interval — GitHub Actions builds take 10-20 min, 800ms was wasteful
  // BUG FIX: read run_url from response and set ghRunUrl state
  const startPoll = useCallback((id:string, ghBuild=false)=>{
    if (pollRef.current) clearInterval(pollRef.current);
    const interval = ghBuild ? 10000 : 2000; // 10s for real GH builds, 2s for config-only
    pollRef.current = setInterval(async()=>{
      try {
        const r = await fetch("/api/admin/engine-builder",{method:"POST",credentials:"include",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({action:"get_progress",id})});
        const d = await r.json();
        setBuildPct(d.progress||0);
        setBuildLogs(d.logs||[]);
        // Set run_url as soon as it's available (comes from webhook callback)
        if (d.run_url || d.build?.run_url) setGhRunUrl(d.run_url || d.build?.run_url || "");
        if (d.build?.status==="ready" || d.build?.status==="failed") {
          setBuildPct(d.build.status==="ready"?100:0); setBuildDone(true);
          if (d.build?.download_url) setDlUrl(d.build.download_url);
          clearInterval(pollRef.current);
          await load();
        }
      } catch {}
    }, interval);
  },[load]);

  useEffect(()=>()=>{if(pollRef.current)clearInterval(pollRef.current);},[]);

  async function handleCreate(e:React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null);
    setBuilding(true); setBuildPct(0); setBuildLogs([]); setBuildDone(false); setBuildId(null);
    setTab("create");
    try {
      const r = await fetch("/api/admin/engine-builder",{method:"POST",credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"create_build",...form,
          trial_days:Number(form.trial_days),max_nodes:Number(form.max_nodes),
          max_gpu:Number(form.max_gpu),max_workers:Number(form.max_workers)})});
      const d = await r.json();
      if (d.ok) {
        setBuildId(d.id);
        setGhTriggered(!!d.githubTriggered);
        startPoll(d.id, !!d.githubTriggered);
      } else {
        setErr(d.error||"Failed to create build");
        setBuilding(false);
      }
    } catch { setErr("Network error"); setBuilding(false); }
  }

  async function deleteBuild(id:string, label:string, hard=false) {
    const msg = hard
      ? `HAPUS PERMANEN "${label}"?\n\nIni akan menghapus record dari database Cloudflare D1 sepenuhnya untuk menghemat space.\n\nLicense yang sudah dikirim ke client tetap valid sampai expired.`
      : `Hapus build "${label}"?\n\nRecord akan disembunyikan (soft delete). Gunakan Hard Delete untuk benar-benar hapus dari DB.`;
    if (!confirm(msg)) return;
    setDelId(id);
    try {
      const r = await fetch("/api/admin/engine-builder",{method:"POST",credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"delete_build",id,hard})});
      const d = await r.json();
      if (d.ok) { setOk(hard ? "✅ Hard deleted dari DB" : "Build dihapus"); await load(); }
      else setErr(d.error||"Failed");
    } catch { setErr("Network error"); } finally { setDelId(null); }
  }

  async function purgeAllDeleted() {
    if (!confirm("Purge semua soft-deleted builds dari DB?\n\nIni akan hapus permanen semua build yang sudah di-soft-delete untuk mengosongkan space Cloudflare D1.")) return;
    try {
      const r = await fetch("/api/admin/engine-builder",{method:"POST",credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"purge_all_deleted"})});
      const d = await r.json();
      if (d.ok) { setOk(`✅ Purged ${d.purged} build dari DB`); await load(); }
      else setErr(d.error||"Failed");
    } catch { setErr("Network error"); }
  }

  async function openDownload(id:string) {
    try {
      const r = await fetch("/api/admin/engine-builder",{method:"POST",credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"get_download_files",id})});
      const d = await r.json();
      if (!d.ok) { setErr(d.error||"Failed"); return; }

      if (d.has_binary) {
        // Binary ada di CF R2 — download langsung
        window.location.href = `/api/admin/engine-builder/download?id=${id}`;
        return;
      }
      // Config-only: GitHub Actions belum trigger binary build
      setDlFiles(d);
    } catch { setErr("Network error"); }
  }

  function dlText(content:string, filename:string) {
    const a = Object.assign(document.createElement("a"),{
      href:URL.createObjectURL(new Blob([content],{type:"text/plain"})),
      download:filename
    });
    a.click(); URL.revokeObjectURL(a.href);
  }

  function dlAll(files:any) {
    Object.entries(files).forEach(([,f]:any,i)=>{
      setTimeout(()=>dlText(f.content,f.name||Object.keys(files)[i]),i*300);
    });
  }

  return (
    <div style={{minHeight:"100vh",background:"#f0f9ff",padding:"28px 24px"}}>
      <div style={{maxWidth:1140,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <Link href="/admin" style={{color:"#94a3b8",fontSize:12,textDecoration:"none"}}>← Admin</Link>
            <h1 style={{fontSize:26,fontWeight:900,color:"#0a1628",margin:"6px 0 3px",letterSpacing:"-0.5px"}}>🔧 Engine Builder</h1>
            <p style={{color:"#64748b",fontSize:13,margin:0}}>Internal admin tool — build Docker images and EXE binaries. Not for client self-service.</p>
          </div>
          <Link href="/admin/releases" style={{padding:"8px 18px",borderRadius:9,
            background:"linear-gradient(135deg,#0284c7,#0d9488)",border:"none",color:"#fff",
            fontWeight:700,fontSize:13,textDecoration:"none"}}>
            ☁️ View Auto-Releases →
          </Link>
        </div>

        {/* ── GitHub Actions + R2 Status Banner ── */}
        {hasGH !== null && (
          <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap" as const}}>
            <div style={{flex:1,minWidth:240,padding:"12px 16px",borderRadius:10,border:"1.5px solid",
              borderColor:hasGH?"rgba(34,197,94,.3)":"rgba(251,191,36,.4)",
              background:hasGH?"rgba(34,197,94,.06)":"rgba(251,191,36,.07)",
              display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>{hasGH?"✅":"⚠️"}</span>
              <div>
                <div style={{fontWeight:800,fontSize:12,color:hasGH?"#16a34a":"#b45309"}}>
                  GitHub Actions {hasGH?"Connected":"Not Configured"}
                </div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                  {hasGH
                    ? "Builds will compile real Docker images & EXE binaries (200MB–2GB) via CI/CD"
                    : "GITHUB_TOKEN not set → Config-only mode. Builds generate YAML files only, NO actual Docker image or EXE binary."}
                </div>
              </div>
            </div>
            <div style={{flex:1,minWidth:240,padding:"12px 16px",borderRadius:10,border:"1.5px solid",
              borderColor:hasR2?"rgba(2,132,199,.3)":"rgba(251,191,36,.4)",
              background:hasR2?"rgba(2,132,199,.06)":"rgba(251,191,36,.07)",
              display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>{hasR2?"☁️":"⚠️"}</span>
              <div>
                <div style={{fontWeight:800,fontSize:12,color:hasR2?"#0284c7":"#b45309"}}>
                  Cloudflare R2 {hasR2?"Storage Ready":"Not Configured"}
                </div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                  {hasR2
                    ? "Build artifacts saved to CF R2 axto-storage. Admin can download & delete anytime."
                    : "R2_ACCOUNT_ID not set → artifacts won't be stored. Set R2 binding in CF Pages settings."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:22}}>
          {[
            {l:"Total Builds",v:stats.total||0,c:"#0284c7"},
            {l:"Ready",v:stats.ready||0,c:"#16a34a"},
            {l:"Building",v:stats.building_count||0,c:"#d97706"},
            {l:"Failed",v:stats.failed||0,c:"#dc2626"},
            {l:"Storage",v:stats.total_bytes>0?`${Math.round((stats.total_bytes||0)/1024/1024)}MB`:"0MB",c:"#7c3aed"},
          ].map(s=>(
            <div key={s.l} style={{...card,padding:"12px 16px"}}>
              <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap" as const}}>
          {([
            ["quick",  "⚡ Quick Build"],
            ["builds", "🗂 All Builds"],
            ["create", "+ New Build (Detail)"],
            ["guide",  "📖 Guide"],
          ] as const).map(([t,l])=>{
            // dot indicator for quick tab
            const allQB = QB_CATALOG.flatMap(g=>g.items.flatMap(item=>
              (item.variants||QB_VARIANTS.map(v=>v.type+"-"+v.arch)).map((vk:string)=>{const[t,...r]=vk.split("-");return `${item.product}-${t}-${r.join("-")}`;})
            ));
            const builtQB = allQB.filter(k=>{
              const [,,type,arch] = k.split("-",4);
              const prod = k.replace(`-${type}-${arch}`,"");
              return builds.some(b=>b.product===prod && b.build_type===type &&
                (b.arch==="linux/amd64"&&arch==="linux"||b.arch==="windows/amd64"&&arch==="windows"||b.arch==="linux/arm64"&&arch==="arm64") &&
                b.status==="ready");
            }).length;
            const dot = t==="quick"
              ? builtQB===allQB.length ? "#22c55e" : builtQB>0 ? "#f59e0b" : "#ef4444"
              : null;
            return (
              <button key={t} onClick={()=>setTab(t as any)}
                style={{padding:"8px 20px",borderRadius:9,border:"1.5px solid",
                  borderColor:tab===t?"#0284c7":"#e2e8f0",
                  background:tab===t?"rgba(2,132,199,0.08)":"#fff",
                  color:tab===t?"#0284c7":"#94a3b8",
                  fontWeight:700,fontSize:13,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:6}}>
                {l}
                {dot && <span style={{width:8,height:8,borderRadius:"50%",background:dot,display:"inline-block"}}/>}
              </button>
            );
          })}
        </div>

        {/* Alerts */}
        {err&&<div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,color:"#dc2626",fontSize:13}}>
          ⚠ {err} <button onClick={()=>setErr(null)} style={{float:"right",background:"none",border:"none",cursor:"pointer",color:"#dc2626"}}>✕</button>
        </div>}
        {ok&&<div style={{background:"rgba(34,197,94,.07)",border:"1px solid rgba(34,197,94,.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,color:"#16a34a",fontSize:13}}>
          ✅ {ok} <button onClick={()=>setOk(null)} style={{float:"right",background:"none",border:"none",cursor:"pointer",color:"#16a34a"}}>✕</button>
        </div>}

        {/* ════ TAB: QUICK BUILD ═══════════════════════════════════════════ */}
        {tab==="quick"&&(
          <div>
            <div style={{...card,padding:"14px 20px",marginBottom:16,background:"rgba(2,132,199,.03)",border:"1.5px solid rgba(2,132,199,.12)"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0284c7",marginBottom:4}}>⚡ Quick Build — satu klik build per variant</div>
              <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>
                Binary tanpa license — client input license key sendiri saat first-run wizard. Progress bar tampil langsung setelah klik.
              </div>
              <div style={{display:"flex",gap:16,fontSize:12,flexWrap:"wrap" as const}}>
                <span><span style={{color:"#22c55e",fontWeight:800}}>●</span> Ready + Download</span>
                <span><span style={{color:"#0284c7",fontWeight:800}}>●</span> Sedang build</span>
                <span><span style={{color:"#ef4444",fontWeight:800}}>●</span> Belum ada / gagal</span>
                <span><span style={{color:"#94a3b8",fontWeight:800}}>●</span> Manual only</span>
              </div>
            </div>

            {QB_CATALOG.map((grp:QBGroup)=>(
              <div key={grp.group} style={{...card,marginBottom:14,overflow:"hidden"}}>
                {/* Group header */}
                <div style={{padding:"11px 18px",borderBottom:"1px solid #f1f5f9",
                  background:`linear-gradient(90deg,${grp.color}0a,transparent)`,
                  display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:15,fontWeight:900,color:grp.color}}>{grp.group}</span>
                  {(()=>{
                    const AMAP:Record<string,string>={linux:"linux/amd64",windows:"windows/amd64",arm64:"linux/arm64"};
                    let total=0,built=0;
                    grp.items.forEach((item:QBItem)=>{
                      const vars = item.variants||QB_VARIANTS.map(v=>v.type+"-"+v.arch);
                      vars.forEach(vk=>{
                        const [type,...rest]=vk.split("-"); const arch=rest.join("-");
                        total++;
                        const qkey=`${item.product}-${type}-${arch}`;
                        const qs=qbGet(qkey);
                        if(qs.status==="done"){built++;return;}
                        const dbArch=AMAP[arch]||arch;
                        const inDb=builds.some((b:any)=>b.product===item.product&&b.build_type===type&&b.arch===dbArch&&b.status==="ready"&&!b.deleted_at);
                        const inR2=r2Files.some((f:any)=>f.product===item.product&&f.type===type&&f.arch===arch&&f.size_mb>0);
                        if(inDb||inR2) built++;
                      });
                    });
                    const c=built===total?"#22c55e":built>0?"#f59e0b":"#ef4444";
                    return <span style={{fontSize:11,color:c,fontWeight:700}}>{built}/{total} built</span>;
                  })()}
                </div>

                {/* Items */}
                {grp.items.map((item:QBItem)=>{
                  const vars = item.variants
                    ? QB_VARIANTS.filter(v=>item.variants!.includes(v.type+"-"+v.arch))
                    : QB_VARIANTS;

                  // Check BOTH DB (manual builds) AND R2 (CI builds)
                  const ARCH_MAP:Record<string,string> = {linux:"linux/amd64", windows:"windows/amd64", arm64:"linux/arm64"};

                  function getDbBuild(type:string, arch:string) {
                    const dbArch = ARCH_MAP[arch] || arch;
                    return builds
                      .filter((b:any) =>
                        b.product === item.product &&
                        b.build_type === type &&
                        b.arch === dbArch &&
                        b.status === "ready" &&
                        !b.deleted_at
                      )
                      .sort((a:any,b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
                  }

                  function isInR2(type:string, arch:string) {
                    return r2Files.some((f:any) =>
                      f.product === item.product &&
                      f.type === type &&
                      f.arch === arch &&
                      f.size_mb > 0
                    );
                  }

                  function getExistingBuild(type:string, arch:string) {
                    return getDbBuild(type, arch);
                  }

                  const builtCount = vars.filter(v=>{
                    const qkey=`${item.product}-${v.type}-${v.arch}`;
                    return qbGet(qkey).status==="done" || !!getDbBuild(v.type,v.arch) || isInR2(v.type,v.arch);
                  }).length;
                  const dotC = builtCount===vars.length?"#22c55e":builtCount>0?"#f59e0b":"#ef4444";

                  return (
                    <div key={item.product} style={{padding:"12px 18px",borderBottom:"1px solid #f8fafc"}}>
                      {/* Product name row */}
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:dotC,flexShrink:0}}/>
                        <span style={{fontSize:18}}>{item.icon}</span>
                        <div style={{flex:1}}>
                          <span style={{fontWeight:700,fontSize:13,color:"#0a1628"}}>{item.name}</span>
                          <span style={{fontSize:11,color:"#94a3b8",marginLeft:8}}>{item.desc}</span>
                        </div>
                        {item.manualOnly&&<span style={{fontSize:10,background:"rgba(245,158,11,.1)",color:"#b45309",borderRadius:4,padding:"2px 7px",fontWeight:700}}>MANUAL</span>}
                      </div>

                      {/* Variant cards */}
                      <div style={{display:"flex",gap:8,flexWrap:"wrap" as const}}>
                        {vars.map(v=>{
                          const qkey=`${item.product}-${v.type}-${v.arch}`;
                          const qs=qbGet(qkey);
                          const existing  = getDbBuild(v.type, v.arch);
                          const inR2      = isInR2(v.type, v.arch);
                          const isReady   = qs.status==="done" || (qs.status==="idle" && (!!existing || inR2));
                          const isBuilding= qs.status==="building" ||
                            builds.some((b:any)=>b.product===item.product&&b.build_type===v.type&&
                              b.arch===(ARCH_MAP[v.arch]||v.arch)&&b.status==="building");
                          const isFailed  = qs.status==="failed" ||
                            (!existing && !inR2 && builds.some((b:any)=>b.product===item.product&&b.build_type===v.type&&
                              b.arch===(ARCH_MAP[v.arch]||v.arch)&&b.status==="failed"));
                          const isManual  = !!item.manualOnly;
                          // Source label for info
                          const source    = inR2&&!existing?"CI":existing?"DB":"—";

                          const bc=isReady?"rgba(34,197,94,.25)":isBuilding?"rgba(2,132,199,.25)":isFailed?"rgba(239,68,68,.25)":isManual?"rgba(148,163,184,.2)":"rgba(239,68,68,.2)";
                          const bg=isReady?"rgba(34,197,94,.06)":isBuilding?"rgba(2,132,199,.06)":isFailed?"rgba(239,68,68,.06)":isManual?"rgba(148,163,184,.06)":"rgba(239,68,68,.03)";
                          const tc=isReady?"#16a34a":isBuilding?"#0284c7":isFailed?"#dc2626":isManual?"#94a3b8":"#dc2626";

                          const dlBuildId = qs.buildId || existing?.id;
                          const fileSize  = existing?.file_size>0?Math.round(existing.file_size/1024/1024)+"MB":"";
                          const buildDate = existing?.created_at?new Date(existing.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"";

                          async function doQuickBuild() {
                            if (isManual||isBuilding) return;
                            qbSet(qkey,{status:"building",pct:5,logs:["Starting build..."],buildId:null,dlUrl:null,runUrl:null});
                            const archParam = ARCH_MAP[v.arch] || "linux/amd64";
                            try {
                              const r=await fetch("/api/admin/engine-builder",{
                                method:"POST",credentials:"include",
                                headers:{"Content-Type":"application/json"},
                                body:JSON.stringify({
                                  action:"create_build",
                                  product:item.product, build_type:v.type, arch:archParam,
                                  license_type:"yearly", unlimited:true,
                                  label:`${item.product}-${v.type}-${v.arch}-${new Date().toISOString().slice(0,10)}`,
                                  version:"latest",
                                }),
                              });
                              const d=await r.json();
                              if(d.ok){
                                qbSet(qkey,{status:"building",pct:10,buildId:d.id,logs:["Build queued..."]});
                                qbPoll(qkey,d.id,!!d.githubTriggered);
                              } else {
                                qbSet(qkey,{status:"failed",logs:[d.error||"Failed"]});
                                setErr(d.error||"Build failed");
                              }
                            } catch(e:any) {
                              qbSet(qkey,{status:"failed",logs:[e.message]});
                            }
                          }

                          return (
                            <div key={v.label} style={{border:`1.5px solid ${bc}`,borderRadius:10,
                              background:bg,padding:"10px 12px",minWidth:150,flex:"0 0 auto"}}>

                              {/* Header */}
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                                <span style={{fontSize:12,fontWeight:700,color:tc}}>{v.icon} {v.label}</span>
                                <span style={{fontSize:10,fontWeight:800,color:tc}}>
                                  {isReady?"✅":isBuilding?"⟳":isFailed?"✕":"○"}
                                </span>
                              </div>

                              {/* Progress bar — show when building or done */}
                              {(isBuilding||qs.status==="done"||qs.status==="failed")&&(
                                <div style={{marginBottom:6}}>
                                  <div style={{height:5,background:"#e2e8f0",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                                    <div style={{height:"100%",
                                      width:`${isBuilding?qs.pct:qs.status==="done"?100:qs.pct}%`,
                                      background:qs.status==="done"?"#22c55e":qs.status==="failed"?"#ef4444":"linear-gradient(90deg,#0284c7,#0d9488)",
                                      borderRadius:99,transition:"width 1s ease"}}/>
                                  </div>
                                  <div style={{fontSize:9,color:"#94a3b8",maxHeight:32,overflow:"hidden"}}>
                                    {qs.logs.slice(-2).map((l,i)=><div key={i}>{l.slice(0,50)}</div>)}
                                  </div>
                                  {qs.runUrl&&(
                                    <a href={qs.runUrl} target="_blank" rel="noopener noreferrer"
                                      style={{fontSize:9,color:"#0284c7",textDecoration:"none"}}>
                                      → View GH Actions
                                    </a>
                                  )}
                                </div>
                              )}

                              {isReady&&qs.status==="idle"&&(
                                <div style={{fontSize:9,color:"#94a3b8",marginBottom:5}}>
                                  <span style={{background:source==="CI"?"rgba(2,132,199,.1)":"rgba(124,58,237,.1)",
                                    color:source==="CI"?"#0284c7":"#7c3aed",borderRadius:3,padding:"1px 4px",fontWeight:700}}>
                                    {source}
                                  </span>
                                  {fileSize&&<span style={{marginLeft:4}}>{fileSize}</span>}
                                  {buildDate&&<span style={{marginLeft:4}}>{buildDate}</span>}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div style={{display:"flex",gap:5}}>
                                {!isManual&&(
                                  <button onClick={doQuickBuild} disabled={isBuilding}
                                    style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",
                                      background:isReady?"rgba(34,197,94,.15)":isBuilding?"rgba(2,132,199,.15)":"rgba(239,68,68,.15)",
                                      color:tc,fontSize:11,fontWeight:700,cursor:isBuilding?"not-allowed":"pointer"}}>
                                    {isBuilding?"Building…":isReady?"🔄 Rebuild":"🔨 Build"}
                                  </button>
                                )}
                                {isReady&&(
                                  <button onClick={()=>{
                                    const url=`/api/admin/releases/download?product=${item.product}&type=${v.type}&arch=${v.arch}`;
                                    const a=document.createElement("a");
                                    a.href=url; a.download=`${item.product}-${v.type}-${v.arch}.zip`; a.click();
                                  }}
                                    style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",
                                      background:"rgba(34,197,94,.2)",color:"#16a34a",
                                      fontSize:11,fontWeight:700,cursor:"pointer"}}>
                                    ⬇ Download
                                  </button>
                                )}
                                {isManual&&(
                                  <span style={{fontSize:10,color:"#94a3b8",padding:"5px 0",display:"block",textAlign:"center" as const,width:"100%"}}>
                                    Build via Engine Builder
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{...card,padding:"12px 18px",marginTop:8,background:"rgba(34,197,94,.03)",border:"1.5px solid rgba(34,197,94,.15)"}}>
              <div style={{fontSize:12,color:"#16a34a",fontWeight:700,marginBottom:4}}>💡 Binary tanpa license</div>
              <div style={{fontSize:11,color:"#64748b"}}>
                Semua build tidak embed license key. Client download → install → buka browser → input license key → aktivasi.<br/>
                Untuk build dengan license spesifik per client → tab <strong>+ New Build (Detail)</strong>.
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB: BUILDS ════════════════════════════════════════════════════ */}
        {tab==="builds"&&(
          <div style={card}>
            <div style={{padding:"18px 24px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:"#0a1628"}}>Engine Builds ({builds.length})</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:3}}>
                  {hasR2
                    ? "☁️ Files saved to Cloudflare R2 axto-storage. Use ✕DB for hard delete (removes DB + R2 + GitHub Release)."
                    : "Config-only mode — no binary files stored."}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={purgeAllDeleted}
                  style={{padding:"7px 14px",borderRadius:9,background:"rgba(127,29,29,.07)",border:"1px solid rgba(127,29,29,.2)",color:"#991b1b",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                  🧹 Purge Deleted
                </button>
                <button onClick={()=>setTab("create")} style={{padding:"8px 18px",borderRadius:9,background:"linear-gradient(135deg,#0284c7,#0d9488)",border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ New Build</button>
              </div>
            </div>
            {loading ? (
              <div style={{padding:48,textAlign:"center",color:"#94a3b8"}}>Loading builds…</div>
            ) : builds.length===0 ? (
              <div style={{padding:56,textAlign:"center"}}>
                <div style={{fontSize:44,marginBottom:12}}>🔧</div>
                <p style={{color:"#64748b",marginBottom:18}}>No builds yet. Create your first engine build.</p>
                <button onClick={()=>setTab("create")} style={{padding:"10px 28px",borderRadius:10,background:"linear-gradient(135deg,#0284c7,#0d9488)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer"}}>+ Create Build</button>
              </div>
            ) : (
              <div style={{overflowX:"auto" as const}}>
                <table style={{width:"100%",borderCollapse:"collapse" as const,fontSize:13}}>
                  <thead><tr style={{borderBottom:"1.5px solid #f1f5f9"}}>
                    {["Label","Product","Type","License","Limits","Client","Expires","Status",""].map(h=>(
                      <th key={h} style={{padding:"10px 14px",textAlign:"left" as const,color:"#94a3b8",fontWeight:700,fontSize:11,textTransform:"uppercase" as const,letterSpacing:"0.4px"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {builds.map(b=>(
                      <tr key={b.id} style={{borderBottom:"1px solid #f8fafc",transition:"background .15s"}}
                        onMouseEnter={e=>(e.currentTarget.style.background="#f8fafc")}
                        onMouseLeave={e=>(e.currentTarget.style.background="")}>
                        <td style={{padding:"12px 14px"}}>
                          <div style={{fontWeight:700,color:"#0a1628"}}>{b.label}</div>
                          <div style={{fontSize:10,color:"#cbd5e1",fontFamily:"monospace"}}>{b.id.slice(0,8)}</div>
                        </td>
                        <td style={{padding:"12px 14px"}}>
                          {PRODUCTS.find(p=>p.v===b.product)?.icon} {b.product}
                        </td>
                        <td style={{padding:"12px 14px"}}>
                          {BUILD_TYPES.find(t=>t.v===b.build_type)?.icon} {b.build_type}
                        </td>
                        <td style={{padding:"12px 14px",color:"#475569"}}>
                          {LICENSE_TYPES.find(t=>t.v===b.license_type)?.icon} {b.license_type}
                          {b.trial_days>0&&<span style={{color:"#0284c7",marginLeft:4}}>({b.trial_days}d)</span>}
                        </td>
                        <td style={{padding:"12px 14px",fontSize:12}}>
                          {b.unlimited ? <span style={{color:"#7c3aed",fontWeight:700}}>♾ Unlimited</span> : (
                            <span>🖥{b.max_nodes}{b.max_gpu>0?` 🎮${b.max_gpu}`:""}{b.product!=="guardian"?` ⚙${b.max_workers}`:""}</span>
                          )}
                        </td>
                        <td style={{padding:"12px 14px",fontSize:12}}>
                          <div>{b.client_name||"—"}</div>
                          <div style={{color:"#94a3b8",fontSize:11}}>{b.client_email||""}</div>
                        </td>
                        <td style={{padding:"12px 14px",fontSize:12,color:"#64748b"}}>{fmtDate(b.expires_at)}</td>
                        <td style={{padding:"12px 14px"}}>{statusPill(b.status)}</td>
                        <td style={{padding:"12px 14px"}}>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap" as const}}>
                            {b.status==="ready"&&(
                              <button onClick={()=>openDownload(b.id)}
                                title={b.r2_key?"Download dari CF R2":b.download_url?"Download dari GitHub":"Download config files"}
                                style={{padding:"5px 10px",borderRadius:7,background:"rgba(2,132,199,.07)",border:"1px solid rgba(2,132,199,.2)",color:"#0284c7",fontSize:12,cursor:"pointer",fontWeight:600}}>
                                ⬇ {b.r2_key ? `${b.build_type==="exe"?"Binary":"Package"} ${b.file_size>0?Math.round(b.file_size/1024/1024)+"MB":""}` : b.download_url ? "Package" : "Config"}
                              </button>
                            )}
                            {b.status==="building"&&b.run_url&&(
                              <a href={b.run_url} target="_blank" rel="noopener noreferrer"
                                style={{padding:"5px 10px",borderRadius:7,background:"rgba(251,191,36,.1)",border:"1px solid rgba(251,191,36,.3)",color:"#d97706",fontSize:12,fontWeight:600,textDecoration:"none"}}>
                                ⚙ GH Run
                              </a>
                            )}
                            {b.status!=="deleted"&&(
                              <>
                                <button onClick={()=>deleteBuild(b.id,b.label,false)} disabled={delId===b.id}
                                  title="Soft delete (hide from list)"
                                  style={{padding:"5px 8px",borderRadius:7,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.15)",color:"#dc2626",fontSize:12,cursor:"pointer",opacity:delId===b.id?.5:1}}>
                                  🗑
                                </button>
                                <button onClick={()=>deleteBuild(b.id,b.label,true)} disabled={delId===b.id}
                                  title="Hard delete: removes DB record + GitHub Release binary"
                                  style={{padding:"5px 8px",borderRadius:7,background:"rgba(127,29,29,.08)",border:"1px solid rgba(127,29,29,.25)",color:"#991b1b",fontSize:11,cursor:"pointer",fontWeight:800,opacity:delId===b.id?.5:1}}>
                                  ✕DB
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ TAB: CREATE ════════════════════════════════════════════════════ */}
        {tab==="create"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:24}}>

            {/* Form or Progress */}
            <div style={{...card,padding:28}}>
              {building ? (
                /* ── Progress View ── */
                <div>
                  <h2 style={{margin:"0 0 6px",fontSize:18,fontWeight:800,color:"#0a1628"}}>
                    {ghTriggered ? (buildDone ? "Build Complete!" : "🔨 Compiling on GitHub Actions…") : "Building Config Package…"}
                  </h2>
                  <p style={{color:"#64748b",fontSize:13,margin:"0 0 20px"}}>
                    {ghTriggered && !buildDone
                      ? `Compiling Docker images / binaries (200MB–2GB). This takes 10–20 min. Page auto-refreshes every 10s.`
                      : "Generating config files and embedding license key."}
                  </p>
                  <ProgressBar pct={buildPct} logs={buildLogs}/>
                  {buildDone&&(
                    <div style={{marginTop:20,display:"flex",flexDirection:"column" as const,gap:12}}>
                      {buildLogs.some((l:any)=>l.level==="error") ? (
                        <div style={{padding:"14px 18px",background:"rgba(220,38,38,.07)",border:"1px solid rgba(220,38,38,.2)",borderRadius:12}}>
                          <div style={{fontWeight:800,color:"#dc2626",marginBottom:4}}>❌ Build Failed</div>
                          <div style={{fontSize:12,color:"#475569"}}>Check the error log below. {ghRunUrl&&<a href={ghRunUrl} target="_blank" rel="noopener noreferrer" style={{color:"#0284c7"}}>View GitHub Actions run →</a>}</div>
                        </div>
                      ) : (
                        <div style={{padding:"14px 18px",background:"rgba(34,197,94,.07)",border:"1px solid rgba(34,197,94,.2)",borderRadius:12}}>
                          <div style={{fontWeight:800,color:"#16a34a",marginBottom:4}}>✅ Build Complete</div>
                          {ghTriggered ? (
                            <div style={{fontSize:12,color:"#475569"}}>
                              GitHub Actions built your package.{" "}
                              {dlUrl ? <><strong>Download ready!</strong></> : <>Config files available below.</>}
                              {" "}{ghRunUrl&&<a href={ghRunUrl} target="_blank" rel="noopener noreferrer" style={{color:"#0284c7"}}>View build run →</a>}
                            </div>
                          ) : (
                            <div style={{fontSize:12,color:"#475569"}}>Config files ready. Click ⬇ Download.</div>
                          )}
                        </div>
                      )}
                      {ghRunUrl&&(
                        <a href={ghRunUrl} target="_blank" rel="noopener noreferrer"
                          style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,textDecoration:"none",color:"#0a1628",fontSize:12,fontWeight:600}}>
                          🔧 View GitHub Actions Build Log →
                        </a>
                      )}
                      {dlUrl&&(
                        <a href={dlUrl} target="_blank" rel="noopener noreferrer"
                          style={{display:"flex",alignItems:"center",gap:8,padding:"11px 14px",background:"linear-gradient(135deg,#16a34a,#22c55e)",borderRadius:10,textDecoration:"none",color:"#fff",fontSize:13,fontWeight:700}}>
                          ⬇ Download Build Package (GitHub Release)
                        </a>
                      )}
                      <div style={{display:"flex",gap:10}}>
                        <button onClick={()=>{setBuilding(false);setBuildDone(false);setTab("builds");load();}}
                          style={{flex:1,padding:"11px",borderRadius:10,background:"linear-gradient(135deg,#0284c7,#0d9488)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer"}}>
                          View All Builds →
                        </button>
                        {buildId&&(
                          <button onClick={()=>openDownload(buildId)}
                            style={{flex:1,padding:"11px",borderRadius:10,background:"linear-gradient(135deg,#7c3aed,#a855f7)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer"}}>
                            ⬇ Config Files
                          </button>
                        )}
                      </div>
                      <button onClick={()=>{setBuilding(false);setBuildDone(false);setGhTriggered(false);setGhRunUrl("");setDlUrl("");setForm(f=>({...f,label:"",client_name:"",client_email:"",client_org:"",existing_license_key:"",notes:""}));}}
                        style={{padding:"10px",borderRadius:10,border:"1.5px solid #e2e8f0",background:"#fff",color:"#64748b",fontWeight:600,cursor:"pointer"}}>
                        + Create Another Build
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Build Form ── */
                <form onSubmit={handleCreate} style={{display:"flex",flexDirection:"column" as const,gap:20}}>
                  <div>
                    <h2 style={{margin:"0 0 4px",fontSize:18,fontWeight:800,color:"#0a1628"}}>New Engine Build</h2>
                    <p style={{color:"#64748b",fontSize:13,margin:"0 0 10px"}}>Build Docker images and standalone EXE binaries for internal use or custom client orders.</p>
                    {hasGH === false && (
                      <div style={{padding:"10px 14px",background:"rgba(251,191,36,.08)",border:"1.5px solid rgba(251,191,36,.35)",borderRadius:10,fontSize:12,color:"#92400e",lineHeight:1.7}}>
                        ⚠️ <strong>Config-Only Mode</strong> — GITHUB_TOKEN belum di-set.<br/>
                        Build ini akan menghasilkan <strong>config YAML files saja</strong> (guardian.yml, docker-compose.yml, install.sh/bat) — <strong>BUKAN</strong> Docker image atau EXE binary yang sebenarnya.<br/>
                        Untuk build image/EXE nyata (200MB–2GB): set <code style={{background:"rgba(0,0,0,.05)",padding:"1px 5px",borderRadius:4}}>GITHUB_TOKEN</code> + <code style={{background:"rgba(0,0,0,.05)",padding:"1px 5px",borderRadius:4}}>GITHUB_REPO</code> di Cloudflare Pages env vars.
                      </div>
                    )}
                    {hasGH === true && hasR2 === false && (
                      <div style={{padding:"10px 14px",background:"rgba(251,191,36,.08)",border:"1.5px solid rgba(251,191,36,.35)",borderRadius:10,fontSize:12,color:"#92400e"}}>
                        ⚠️ <strong>R2 Storage tidak tersambung.</strong> GitHub Actions bisa compile tapi artifact tidak bisa di-store. Set R2 binding di CF Pages.
                      </div>
                    )}
                    {hasGH === true && hasR2 === true && (
                      <div style={{padding:"10px 14px",background:"rgba(34,197,94,.07)",border:"1.5px solid rgba(34,197,94,.25)",borderRadius:10,fontSize:12,color:"#166534"}}>
                        ✅ <strong>Full Build Mode</strong> — GitHub Actions + CF R2 siap. Build akan compile Docker image / EXE binary nyata dan di-upload ke Cloudflare R2 axto-storage.
                      </div>
                    )}
                  </div>

                  {/* Product */}
                  <div>
                    <label style={lbl}>Product *</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {["Guardian","Orchestra","Bundle"].map(grp=>(
                        <div key={grp}>
                          <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,marginTop:10}}>{grp}</div>
                          {PRODUCTS.filter(p=>p.group===grp).map(p=>(
                            <button key={p.v} type="button" onClick={()=>set("product",p.v)}
                              style={{padding:"10px 8px",borderRadius:10,border:"1.5px solid",
                                borderColor:form.product===p.v?"#0284c7":"#e2e8f0",
                                background:form.product===p.v?"rgba(2,132,199,.07)":"#f8fafc",
                                cursor:"pointer",textAlign:"center" as const,width:"100%"}}>
                              <div style={{fontSize:18}}>{p.icon}</div>
                              <div style={{fontSize:11,fontWeight:700,color:form.product===p.v?"#0284c7":"#0a1628",marginTop:2}}>{p.name}</div>
                              <div style={{fontSize:10,color:"#94a3b8",lineHeight:1.3}}>{p.desc}</div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Build Type */}
                  <div>
                    <label style={lbl}>Build Type *</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {BUILD_TYPES.map(bt=>(
                        <button key={bt.v} type="button" onClick={()=>set("build_type",bt.v)}
                          style={{padding:"12px",borderRadius:10,border:"1.5px solid",
                            borderColor:form.build_type===bt.v?"#0284c7":"#e2e8f0",
                            background:form.build_type===bt.v?"rgba(2,132,199,.07)":"#f8fafc",
                            cursor:"pointer",textAlign:"left" as const}}>
                          <div style={{fontSize:18}}>{bt.icon}</div>
                          <div style={{fontSize:12,fontWeight:700,color:form.build_type===bt.v?"#0284c7":"#0a1628"}}>{bt.name}</div>
                          <div style={{fontSize:11,color:"#94a3b8"}}>{bt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* License Type */}
                  <div>
                    <label style={lbl}>License Type *</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {LICENSE_TYPES.map(lt=>(
                        <button key={lt.v} type="button" onClick={()=>set("license_type",lt.v)}
                          style={{padding:"10px 12px",borderRadius:10,border:"1.5px solid",
                            borderColor:form.license_type===lt.v?"#7c3aed":"#e2e8f0",
                            background:form.license_type===lt.v?"rgba(124,58,237,.07)":"#f8fafc",
                            cursor:"pointer",textAlign:"left" as const}}>
                          <div style={{fontSize:13,fontWeight:700,color:form.license_type===lt.v?"#7c3aed":"#0a1628"}}>{lt.icon} {lt.name}</div>
                          <div style={{fontSize:11,color:"#94a3b8"}}>{lt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trial days */}
                  {form.license_type==="trial"&&(
                    <div>
                      <label style={lbl}>Trial Duration (1–7 days) *</label>
                      <div style={{display:"flex",gap:8}}>
                        {[1,2,3,4,5,6,7].map(d=>(
                          <button key={d} type="button" onClick={()=>set("trial_days",String(d))}
                            style={{width:42,height:42,borderRadius:9,border:"1.5px solid",
                              borderColor:form.trial_days===String(d)?"#0284c7":"#e2e8f0",
                              background:form.trial_days===String(d)?"rgba(2,132,199,.1)":"#f8fafc",
                              color:form.trial_days===String(d)?"#0284c7":"#475569",
                              fontWeight:800,fontSize:14,cursor:"pointer"}}>{d}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resource Limits */}
                  <div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <label style={{...lbl,margin:0}}>Resource Limits</label>
                      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12}}>
                        <input type="checkbox" checked={form.unlimited} onChange={e=>set("unlimited",e.target.checked)} style={{width:15,height:15}}/>
                        <span style={{fontWeight:700,color:form.unlimited?"#7c3aed":"#64748b"}}>♾️ Unlimited</span>
                      </label>
                    </div>
                    {!form.unlimited&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                        <div><label style={{...lbl,marginBottom:4}}>🖥 CPU Nodes</label><input type="number" min="1" value={form.max_nodes} onChange={e=>set("max_nodes",e.target.value)} style={inp}/></div>
                        <div><label style={{...lbl,marginBottom:4}}>🎮 GPU Count</label><input type="number" min="0" value={form.max_gpu} onChange={e=>set("max_gpu",e.target.value)} style={inp}/></div>
                        {form.product!=="guardian"&&<div><label style={{...lbl,marginBottom:4}}>⚙ Workers</label><input type="number" min="1" value={form.max_workers} onChange={e=>set("max_workers",e.target.value)} style={inp}/></div>}
                      </div>
                    )}
                  </div>

                  {/* Client + Config */}
                  <div style={{borderTop:"1px solid #f1f5f9",paddingTop:18}}>
                    <label style={{...lbl,marginBottom:10}}>Client Information</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div><label style={lbl}>Name</label><input value={form.client_name} onChange={e=>set("client_name",e.target.value)} placeholder="Acme Corp" style={inp}/></div>
                      <div><label style={lbl}>Email</label><input type="email" value={form.client_email} onChange={e=>set("client_email",e.target.value)} placeholder="admin@acme.com" style={inp}/></div>
                    </div>
                    <div style={{marginTop:12}}><label style={lbl}>Organization</label><input value={form.client_org} onChange={e=>set("client_org",e.target.value)} placeholder="Acme Corporation Ltd." style={inp}/></div>
                  </div>

                  <div style={{borderTop:"1px solid #f1f5f9",paddingTop:18}}>
                    <label style={{...lbl,marginBottom:10}}>Build Configuration</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div><label style={lbl}>Build Label</label><input value={form.label} onChange={e=>set("label",e.target.value)} placeholder="Acme Corp v1 Enterprise" style={inp}/></div>
                      <div><label style={lbl}>Version Tag</label><input value={form.version} onChange={e=>set("version",e.target.value)} placeholder="latest" style={inp}/></div>
                    </div>
                    <div style={{marginTop:12}}><label style={lbl}>Architecture</label>
                      <select value={form.arch} onChange={e=>set("arch",e.target.value)} style={{...inp,appearance:"auto" as any,cursor:"pointer"}}>
                        {ARCHS.map(a=><option key={a.v} value={a.v}>{a.l}</option>)}
                      </select>
                    </div>
                    <div style={{marginTop:12}}><label style={lbl}>Existing License Key <span style={{fontWeight:400,color:"#94a3b8",textTransform:"none" as const,letterSpacing:0}}>(optional — leave blank to auto-generate)</span></label>
                      <div style={{background:"rgba(124,58,237,.04)",border:"1px solid rgba(124,58,237,.15)",borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:11,color:"#64748b",lineHeight:1.7}}>
                        💡 <strong style={{color:"#7c3aed"}}>License is always auto-generated</strong> — tidak perlu diisi manual.
                        Kosongkan = buat license key baru (GUARD-XXXX atau ORCH-XXXX) yang otomatis ter-embed ke config files.
                        Isi field ini HANYA jika client sudah punya license key aktif dan mau dipakai ulang untuk build baru.
                      </div>
                      <input value={form.existing_license_key} onChange={e=>set("existing_license_key",e.target.value)} placeholder="GUARD-XXXX-XXXX-XXXX-XXXX (opsional)" style={inp}/>
                    </div>
                    <div style={{marginTop:12}}><label style={lbl}>Notes</label>
                      <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} placeholder="Internal notes, payment reference, special conditions…" style={{...inp,resize:"vertical"} as any}/>
                    </div>
                  </div>

                  <button type="submit"
                    style={{padding:"13px 20px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#0284c7,#0d9488)",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>
                    🔧 Create Build & Generate Files →
                  </button>
                </form>
              )}
            </div>

            {/* Sidebar info */}
            <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>
              <div style={{...card,padding:20,background:"rgba(2,132,199,.04)",border:"1.5px solid rgba(2,132,199,.15)"}}>
                <div style={{fontWeight:800,fontSize:13,color:"#0284c7",marginBottom:10}}>⚡ What gets generated</div>
                <div style={{fontSize:12,color:"#475569",lineHeight:1.9}}>
                  <strong style={{color:"#0a1628"}}>Docker build:</strong><br/>
                  • docker-compose.yml with all services<br/>
                  • guardian.yml / orchestra.yml with embedded license<br/>
                  • README.txt with setup instructions<br/><br/>
                  <strong style={{color:"#0a1628"}}>EXE / Script build adds:</strong><br/>
                  • install.sh (Linux/macOS) or install.bat (Windows)<br/>
                  • Auto-creates .env with secure credentials
                </div>
              </div>
              <div style={{...card,padding:20}}>
                <div style={{fontWeight:800,fontSize:13,color:"#7c3aed",marginBottom:10}}>🔑 License Types</div>
                {LICENSE_TYPES.map(lt=>(
                  <div key={lt.v} style={{marginBottom:7}}>
                    <span style={{fontWeight:700,color:"#0a1628",fontSize:12}}>{lt.icon} {lt.name}</span>
                    <span style={{color:"#94a3b8",fontSize:11,marginLeft:6}}>{lt.desc}</span>
                  </div>
                ))}
              </div>
              <div style={{...card,padding:20,background:"rgba(15,23,42,.02)"}}>
                <div style={{fontWeight:800,fontSize:13,color:"#0a1628",marginBottom:10}}>🐳 Docker Registry</div>
                <div style={{fontSize:11,color:"#64748b",fontFamily:"monospace",lineHeight:2.1}}>
                  {["guardian-engine","orchestra-core","orchestra-worker-cpu","orchestra-worker-gpu"].map(img=>(
                    <div key={img} style={{color:"#0284c7"}}>ghcr.io/{process.env.NEXT_PUBLIC_GHCR_OWNER||"p2nshooter"}/{img}:latest</div>
                  ))}
                </div>
              </div>

              <div style={{...card,padding:20,background:"rgba(2,132,199,.03)",border:"1.5px solid rgba(2,132,199,.15)"}}>
                <div style={{fontWeight:800,fontSize:13,color:"#0284c7",marginBottom:10}}>☁️ Cloudflare R2 Storage</div>
                <div style={{fontSize:12,color:"#475569",lineHeight:1.8}}>
                  Build artifacts (Docker .tar / .exe) disimpan <strong>sementara</strong> di CF R2 bucket <code style={{fontSize:11}}>axto-storage</code>.<br/><br/>
                  <strong>Cara hapus:</strong><br/>
                  🗑 = Soft delete (hide dari list, file tetap di R2)<br/>
                  ✕DB = <span style={{color:"#dc2626",fontWeight:700}}>Hard delete</span> — hapus record dari DB + file dari R2 + GitHub Release<br/>
                  🧹 Purge = Hapus semua yang sudah soft-deleted<br/><br/>
                  <span style={{color:"#94a3b8",fontSize:11}}>License key yang sudah terkirim ke client tetap valid sampai expired meski build dihapus.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ TAB: GUIDE ═════════════════════════════════════════════════════ */}
        {tab==="guide"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>

            {/* Animated step-by-step */}
            <div style={{...card,padding:28}}>
              <h2 style={{margin:"0 0 6px",fontSize:18,fontWeight:800,color:"#0a1628"}}>How to Use Engine Builder</h2>
              <p style={{color:"#64748b",fontSize:13,margin:"0 0 24px"}}>Step-by-step guide for building and distributing engine packages.</p>

              {/* Active step animated */}
              <div style={{background:"linear-gradient(135deg,rgba(2,132,199,.06),rgba(13,148,136,.06))",borderRadius:14,border:"1.5px solid rgba(2,132,199,.15)",padding:24,marginBottom:20,minHeight:140,transition:"all .4s"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#0284c7,#0d9488)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                    {GUIDE_STEPS[guideStep].icon}
                  </div>
                  <div>
                    <div style={{fontSize:12,color:"#0284c7",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Step {guideStep+1} of {GUIDE_STEPS.length}</div>
                    <div style={{fontSize:16,fontWeight:800,color:"#0a1628"}}>{GUIDE_STEPS[guideStep].title}</div>
                  </div>
                </div>
                <p style={{color:"#475569",fontSize:13,lineHeight:1.7,margin:0}}>{GUIDE_STEPS[guideStep].body}</p>
              </div>

              {/* Step dots */}
              <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:20}}>
                {GUIDE_STEPS.map((_,i)=>(
                  <button key={i} onClick={()=>setGuideStep(i)}
                    style={{width:i===guideStep?24:8,height:8,borderRadius:99,border:"none",cursor:"pointer",
                      background:i===guideStep?"#0284c7":"#e2e8f0",transition:"all .3s"}}/>
                ))}
              </div>

              {/* All steps list */}
              <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
                {GUIDE_STEPS.map((s,i)=>(
                  <div key={i} onClick={()=>setGuideStep(i)}
                    style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",borderRadius:10,cursor:"pointer",
                      background:guideStep===i?"rgba(2,132,199,.07)":"transparent",
                      border:guideStep===i?"1.5px solid rgba(2,132,199,.2)":"1.5px solid transparent",
                      transition:"all .2s"}}>
                    <div style={{width:32,height:32,borderRadius:8,background:guideStep===i?"rgba(2,132,199,.15)":"rgba(0,0,0,.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{s.icon}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:guideStep===i?"#0284c7":"#0a1628"}}>{s.title}</div>
                      <div style={{fontSize:11,color:"#94a3b8"}}>{s.body.slice(0,60)}…</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin workflow */}
            <div style={{display:"flex",flexDirection:"column" as const,gap:16}}>
              <div style={{...card,padding:24}}>
                <div style={{fontWeight:800,fontSize:15,color:"#0a1628",marginBottom:16}}>📋 Complete Admin Workflow</div>
                {[
                  {n:1,t:"Create a Build",b:"Go to + New Build. Select product, build type, license type, set limits, enter client info. Click Create Build.",c:"#0284c7"},
                  {n:2,t:"Watch the Progress Bar",b:"The 5-step progress bar tracks: initiation → license generation → config creation → CI/CD dispatch → ready.",c:"#7c3aed"},
                  {n:3,t:"Download Config Files",b:"Click ⬇ Files on any ready build. Download all files at once or individually. Files include README with setup steps.",c:"#0d9488"},
                  {n:4,t:"Send to Client",b:"Send the ZIP to your client. They edit the config (add their API keys) and run docker compose up -d. That's it.",c:"#16a34a"},
                  {n:5,t:"Delete When Done",b:"Use the 🗑 button to remove a build record. The config files already sent to clients remain valid until the license expires.",c:"#dc2626"},
                ].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:14,marginBottom:16,alignItems:"flex-start"}}>
                    <div style={{width:28,height:28,borderRadius:8,background:s.c,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,flexShrink:0}}>{s.n}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:"#0a1628",marginBottom:3}}>{s.t}</div>
                      <div style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>{s.b}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{...card,padding:24,background:"rgba(124,58,237,.03)",border:"1.5px solid rgba(124,58,237,.15)"}}>
                <div style={{fontWeight:800,fontSize:13,color:"#7c3aed",marginBottom:12}}>🔑 License Expiry Reference</div>
                <table style={{width:"100%",fontSize:12,borderCollapse:"collapse" as const}}>
                  <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>{["Type","Expiry","Use Case"].map(h=><th key={h} style={{textAlign:"left" as const,padding:"6px 0",color:"#94a3b8",fontWeight:700}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[
                      ["Trial","1–7 days","Evaluation for any product"],
                      ["Monthly","30 days","Short-term or pay-as-you-go"],
                      ["Yearly","365 days","Standard subscription"],
                      ["Lifetime","Never","One-time enterprise sale"],
                      ["Per Instance","Never","Single-machine deployment"],
                    ].map(([t,e,u])=>(
                      <tr key={t} style={{borderBottom:"1px solid #f8fafc"}}>
                        <td style={{padding:"8px 0",fontWeight:700,color:"#0a1628"}}>{t}</td>
                        <td style={{padding:"8px 0",color:"#0284c7"}}>{e}</td>
                        <td style={{padding:"8px 0",color:"#64748b"}}>{u}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{...card,padding:20,background:"rgba(34,197,94,.04)",border:"1.5px solid rgba(34,197,94,.15)"}}>
                <div style={{fontWeight:700,fontSize:13,color:"#16a34a",marginBottom:8}}>✅ What Clients Receive</div>
                <ul style={{margin:0,paddingLeft:16,fontSize:12,color:"#475569",lineHeight:2}}>
                  <li>docker-compose.yml (or install script)</li>
                  <li>Config file with license key pre-embedded</li>
                  <li>README.txt with exact setup commands</li>
                  <li>Access to portal at {(typeof window!=="undefined"&&window.location.origin)||"axto.io"}/portal</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ════ DOWNLOAD MODAL ════════════════════════════════════════════════ */}
        {dlFiles&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
            <div style={{background:"#fff",borderRadius:18,padding:28,maxWidth:640,width:"100%",maxHeight:"88vh",overflow:"auto",boxShadow:"0 24px 64px rgba(0,0,0,.25)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <h3 style={{margin:0,fontSize:17,fontWeight:800,color:"#0a1628"}}>⬇ Download Files — {dlFiles.build?.label}</h3>
                <button onClick={()=>setDlFiles(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#94a3b8"}}>✕</button>
              </div>

              {/* License summary */}
              <div style={{background:"rgba(34,211,238,.05)",border:"1px solid rgba(34,211,238,.2)",borderRadius:10,padding:"12px 16px",marginBottom:18}}>
                <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase" as const,letterSpacing:"0.5px",marginBottom:6}}>Embedded License Key</div>
                <code style={{color:"#22d3ee",fontSize:13,fontFamily:"monospace",wordBreak:"break-all" as const}}>{dlFiles.build?.license_key}</code>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>
                  Type: {dlFiles.build?.license_type}{dlFiles.build?.trial_days>0?` · ${dlFiles.build.trial_days} days`:""} ·
                  Nodes: {dlFiles.build?.unlimited?"∞":dlFiles.build?.max_nodes} ·
                  GPU: {dlFiles.build?.unlimited?"∞":dlFiles.build?.max_gpu} ·
                  Expires: {fmtDate(dlFiles.build?.expires_at)}
                </div>
              </div>

              {/* Download all button */}
              <button onClick={()=>dlAll(dlFiles.files)}
                style={{width:"100%",padding:"12px",marginBottom:16,borderRadius:10,background:"linear-gradient(135deg,#0284c7,#0d9488)",border:"none",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>
                ⬇ Download All Files ({Object.keys(dlFiles.files||{}).length} files)
              </button>

              {/* Individual files */}
              <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
                {Object.entries(dlFiles.files||{}).map(([,file]:any)=>(
                  <div key={file.name} style={{border:"1.5px solid #e2e8f0",borderRadius:10,padding:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:"#0a1628"}}>{file.name}</div>
                        <div style={{fontSize:11,color:"#94a3b8"}}>{file.name.endsWith(".yml")?"YAML config":file.name.endsWith(".txt")?"README":"Installer script"}</div>
                      </div>
                      <button onClick={()=>dlText(file.content,file.name)}
                        style={{padding:"7px 16px",borderRadius:8,background:"rgba(2,132,199,.08)",border:"1px solid rgba(2,132,199,.2)",color:"#0284c7",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                        ⬇ Download
                      </button>
                    </div>
                    <pre style={{margin:0,background:"#f8fafc",borderRadius:8,padding:"10px 12px",fontSize:10,color:"#475569",overflow:"auto" as const,maxHeight:120,fontFamily:"monospace"}}>
                      {file.content.slice(0,350)}{file.content.length>350?"\n…":""}
                    </pre>
                  </div>
                ))}
              </div>

              <div style={{marginTop:18,padding:"12px 14px",background:"rgba(34,197,94,.05)",border:"1px solid rgba(34,197,94,.2)",borderRadius:10,fontSize:12,color:"#16a34a",lineHeight:1.8}}>
                <strong>Client setup instructions:</strong><br/>
                1. Download all files to a folder on the server<br/>
                2. Edit the .yml config — replace REPLACE_WITH_YOUR_* API keys<br/>
                3. Set env: <code>GUARDIAN_DB_PASSWORD=$(openssl rand -hex 16)</code><br/>
                4. Run: <code>docker compose up -d</code><br/>
                5. Dashboard: <code>http://SERVER_IP:8080</code>
              </div>

              <button onClick={()=>setDlFiles(null)}
                style={{marginTop:14,width:"100%",padding:11,borderRadius:10,border:"1.5px solid #e2e8f0",background:"#fff",color:"#64748b",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
