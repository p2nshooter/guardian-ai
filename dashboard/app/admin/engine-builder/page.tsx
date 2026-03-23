"use client";
export const runtime = "edge";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ── Design tokens ─────────────────────────────────────────────────────────────
const S = {
  inp: { width:"100%", padding:"9px 13px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#0a1628", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" as const },
  lbl: { color:"#64748b", fontSize:11, fontWeight:700, display:"block" as const, marginBottom:4, textTransform:"uppercase" as const, letterSpacing:"0.5px" },
  card: { background:"#fff", borderRadius:14, border:"1.5px solid #e2e8f0", overflow:"hidden" as const },
  pill: (c:string) => ({ padding:"2px 8px", borderRadius:5, fontSize:10, fontWeight:700, background:`${c}18`, color:c }),
};

// ── Product catalog ───────────────────────────────────────────────────────────
const CATALOG = [
  {
    group: "Guardian AI", icon: "🛡️", color: "#0284c7",
    products: [
      {
        id: "guardian-bundle", icon: "🛡️", name: "Guardian Full Bundle",
        desc: "Complete security stack", badge: "RECOMMENDED",
        includes: ["Guardian Core (API + Dashboard)", "Guardian Node Agent (per-server detection)", "ClamAV Antivirus (sidecar)"],
        formats: ["docker-linux","docker-arm64","exe-linux","exe-windows"],
      },
      {
        id: "guardian-core-node", icon: "🔗", name: "Core + Node Agent",
        desc: "Without antivirus sidecar",
        includes: ["Guardian Core (API + Dashboard)", "Guardian Node Agent (per-server detection)"],
        formats: ["docker-linux","docker-arm64","exe-linux","exe-windows"],
      },
      {
        id: "guardian-core", icon: "🖥️", name: "Guardian Core",
        desc: "API + Dashboard backend only",
        includes: ["Guardian Core (API + Dashboard, port 8080)"],
        formats: ["docker-linux","docker-arm64","exe-linux","exe-windows"],
      },
      {
        id: "guardian-node", icon: "🤖", name: "Guardian Node Agent",
        desc: "Per-server threat detection agent",
        includes: ["Guardian Node Agent (installs on each protected server)"],
        formats: ["docker-linux","docker-arm64","exe-linux","exe-windows"],
      },
      {
        id: "guardian-clamav", icon: "🦠", name: "ClamAV Antivirus",
        desc: "Real-time antivirus sidecar",
        includes: ["ClamAV (stable_base image + freshclam auto-updates)"],
        formats: ["docker-linux"],
      },
    ],
  },
  {
    group: "Orchestra AI", icon: "⚡", color: "#7c3aed",
    products: [
      {
        id: "orchestra-bundle", icon: "⚡", name: "Orchestra Full Bundle",
        desc: "Complete AI orchestration stack", badge: "RECOMMENDED",
        includes: ["Orchestra Core (router + console, port 8080)", "Worker CPU (cloud API routing, 15 providers)", "Worker GPU (local inference: Ollama, Whisper, SDXL)"],
        formats: ["docker-linux","docker-arm64","exe-linux","exe-windows"],
      },
      {
        id: "orchestra-core-cpu", icon: "🔗", name: "Core + CPU Worker",
        desc: "No GPU required — most common",
        includes: ["Orchestra Core (router + console)", "Worker CPU (cloud API: OpenAI, Groq, Anthropic, etc.)"],
        formats: ["docker-linux","docker-arm64","exe-linux","exe-windows"],
      },
      {
        id: "orchestra-core", icon: "🖥️", name: "Orchestra Core",
        desc: "Router + console only",
        includes: ["Orchestra Core (AI job router + web console, port 8080)"],
        formats: ["docker-linux","docker-arm64","exe-linux","exe-windows"],
      },
      {
        id: "orchestra-worker-cpu", icon: "💻", name: "Worker CPU",
        desc: "Cloud AI routing (15 providers)",
        includes: ["Worker CPU (routes to OpenAI, Groq, Anthropic, Gemini, DeepSeek, xAI, Mistral, etc.)"],
        formats: ["docker-linux","docker-arm64","exe-linux","exe-windows"],
      },
      {
        id: "orchestra-worker-gpu", icon: "🎮", name: "Worker GPU",
        desc: "Local inference: Ollama + Whisper + SDXL (~4-5GB)",
        includes: ["Worker GPU (Ollama local LLM, faster-whisper transcription, Stable Diffusion XL image gen, sentence-transformers embeddings)"],
        formats: ["docker-linux"],
        note: "~4-5GB image (PyTorch+CUDA included)",
      },
    ],
  },
  {
    group: "Full Platform", icon: "📦", color: "#0d9488",
    products: [
      {
        id: "full-bundle", icon: "📦", name: "AXTO Full Platform",
        desc: "Everything — Guardian + Orchestra", badge: "ENTERPRISE",
        includes: [
          "Guardian Core + Node Agent + ClamAV",
          "Orchestra Core + Worker CPU + Worker GPU",
          "6 Docker images, 5 EXE binaries",
        ],
        formats: ["docker-linux","docker-arm64","exe-linux","exe-windows"],
      },
    ],
  },
];

const FORMAT_META: Record<string,{icon:string;label:string;arch:string;type:string}> = {
  "docker-linux":   { icon:"🐳🐧", label:"Docker Linux",   arch:"linux",   type:"docker" },
  "docker-arm64":   { icon:"🐳💪", label:"Docker ARM64",   arch:"arm64",   type:"docker" },
  "exe-linux":      { icon:"💾🐧", label:"EXE Linux",      arch:"linux",   type:"exe"    },
  "exe-windows":    { icon:"💾🪟", label:"EXE Windows",    arch:"windows", type:"exe"    },
};

const ARCH_MAP: Record<string,string> = { linux:"linux/amd64", arm64:"linux/arm64", windows:"windows/amd64" };

function fmt(d:string){if(!d)return"—";try{return new Date(d).toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"});}catch{return d;}}
function fmtSize(b:number){if(!b)return"";const m=Math.round(b/1024/1024);return m>0?`${m}MB`:"";}

function StatusPill({s}:{s:string}){
  const m:Record<string,{bg:string;c:string;label:string}>={
    ready:   {bg:"rgba(34,197,94,.1)",  c:"#16a34a", label:"Ready"},
    building:{bg:"rgba(2,132,199,.1)",  c:"#0284c7", label:"Building"},
    failed:  {bg:"rgba(239,68,68,.1)",  c:"#dc2626", label:"Failed"},
    deleted: {bg:"rgba(148,163,184,.1)",c:"#94a3b8", label:"Deleted"},
  };
  const x=m[s]||m.building;
  return <span style={{padding:"2px 8px",borderRadius:5,fontSize:11,fontWeight:700,background:x.bg,color:x.c}}>{x.label}</span>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EngineBuilderPage() {
  const [tab, setTab] = useState<"products"|"builds"|"guide">("products");
  const [builds, setBuilds]   = useState<any[]>([]);
  const [r2Files, setR2Files] = useState<any[]>([]);
  const [stats, setStats]     = useState<any>({});
  const [hasGH, setHasGH]     = useState<boolean|null>(null);
  const [hasR2, setHasR2]     = useState<boolean|null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState<{msg:string;ok:boolean}|null>(null);
  const [delId, setDelId]     = useState<string|null>(null);
  const [retryId, setRetryId] = useState<string|null>(null);
  const [ghTest, setGhTest]   = useState<any>(null);
  const [ghTesting, setGhTesting] = useState(false);

  // per-format build state  key = "product-type-arch"
  const [bldState, setBldState] = useState<Record<string,{
    status:"idle"|"building"|"done"|"failed"; pct:number; logs:string[]; id:string|null; runUrl:string|null;
  }>>({});
  const polls = useRef<Record<string,any>>({});

  // upload state
  const [uploadKey, setUploadKey] = useState<string|null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function bkey(product:string, type:string, arch:string){return`${product}__${type}__${arch}`;}
  function bget(k:string){return bldState[k]||{status:"idle",pct:0,logs:[],id:null,runUrl:null};}
  function bset(k:string,p:any){setBldState(s=>({...s,[k]:{...bget(k),...p}}));}

  const showToast=(msg:string,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),4500);};

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [ebR, relR] = await Promise.all([
        fetch("/api/admin/engine-builder",{credentials:"include"}),
        fetch("/api/admin/releases",{credentials:"include"}),
      ]);
      if(ebR.ok){const d=await ebR.json();setBuilds(d.builds||[]);setStats(d.stats||{});setHasGH(!!d.hasGithubToken);setHasR2(!!d.hasR2);}
      if(relR.ok){const d=await relR.json();setR2Files(d.files||[]);}
    } catch{}
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>()=>{Object.values(polls.current).forEach(clearInterval);},[]);

  // Resume polling building rows
  useEffect(()=>{
    builds.filter((b:any)=>b.status==="building").forEach((b:any)=>{
      const archS = b.arch==="windows/amd64"?"windows":b.arch==="linux/arm64"?"arm64":"linux";
      const k = bkey(b.product, b.build_type, archS);
      if(!polls.current[k]){bset(k,{status:"building",pct:20,id:b.id,runUrl:b.run_url||null,logs:["Resuming…"]});startPoll(k,b.id);}
    });
  },[builds]); // eslint-disable-line

  function startPoll(k:string, id:string){
    if(polls.current[k]) clearInterval(polls.current[k]);
    polls.current[k]=setInterval(async()=>{
      try{
        const r=await fetch("/api/admin/engine-builder",{method:"POST",credentials:"include",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({action:"get_progress",id})});
        const d=await r.json();
        bset(k,{pct:d.progress||0,logs:(d.logs||[]).map((l:any)=>l.message||""),runUrl:d.run_url||d.build?.run_url||null});
        if(d.build?.status==="ready"||d.build?.status==="failed"){
          const ok=d.build.status==="ready";
          bset(k,{status:ok?"done":"failed",pct:ok?100:0});
          clearInterval(polls.current[k]); delete polls.current[k];
          await load();
        }
      }catch{}
    },8000);
  }

  async function triggerBuild(product:string,type:string,arch:string){
    const k=bkey(product,type,arch);
    bset(k,{status:"building",pct:5,logs:["Queuing…"],id:null,runUrl:null});
    try{
      const r=await fetch("/api/admin/engine-builder",{method:"POST",credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          action:"create_build", product, build_type:type,
          arch:ARCH_MAP[arch]||"linux/amd64",
          license_type:"yearly", unlimited:true,
          label:`${product}-${type}-${arch}-${new Date().toISOString().slice(0,10)}`,
          version:"latest",
        })});
      const d=await r.json();
      if(d.ok){bset(k,{id:d.id,pct:10,logs:["Build queued on GitHub Actions…"]});startPoll(k,d.id);}
      else{bset(k,{status:"failed",logs:[d.error||"Failed"]});showToast(d.error||"Build failed",false);}
    }catch(e:any){bset(k,{status:"failed",logs:[e.message]});showToast(e.message,false);}
  }

  async function handleUploadClick(product:string,type:string,arch:string){
    setUploadKey(bkey(product,type,arch));
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e:React.ChangeEvent<HTMLInputElement>){
    if(!uploadKey||!e.target.files?.[0]) return;
    const file=e.target.files[0];
    e.target.value="";
    setUploading(true);
    try{
      const [,type,arch]=uploadKey.split("__");
      const product=uploadKey.split("__")[0];
      const fd=new FormData();
      fd.append("file",file);
      fd.append("product",product);
      fd.append("type",type);
      fd.append("arch",arch);
      const r=await fetch("/api/admin/releases",{method:"PUT",credentials:"include",body:fd});
      const d=await r.json();
      if(d.ok){showToast(`✅ Uploaded ${file.name} → R2 (${Math.round(file.size/1024/1024)}MB)`);await load();}
      else showToast(d.error||"Upload failed",false);
    }catch(e:any){showToast(e.message||"Upload failed",false);}
    finally{setUploading(false);setUploadKey(null);}
  }

  function getR2File(product:string,type:string,arch:string){
    return r2Files.find((f:any)=>f.product===product&&f.type===type&&f.arch===arch&&f.size_mb>0)||null;
  }

  function getDbBuild(product:string,type:string,arch:string){
    const dbArch=ARCH_MAP[arch]||arch;
    return builds.filter((b:any)=>b.product===product&&b.build_type===type&&b.arch===dbArch&&b.status==="ready"&&!b.deleted_at)
      .sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime())[0]||null;
  }

  async function deleteBuildRow(id:string,label:string){
    if(!confirm(`Hard delete build "${label}"?\nThis removes the DB record. R2 file in releases/ remains until next upload.`)) return;
    setDelId(id);
    try{
      const r=await fetch("/api/admin/engine-builder",{method:"POST",credentials:"include",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete_build",id,hard:true})});
      const d=await r.json();
      if(d.ok){showToast("Build deleted");await load();}
      else showToast(d.error||"Failed",false);
    }catch{showToast("Network error",false);}
    finally{setDelId(null);}
  }

  async function deleteR2File(product:string,type:string,arch:string){
    if(!confirm(`Delete R2 file: ${product}-${type}-${arch}.zip?`)) return;
    try{
      const r=await fetch("/api/admin/releases",{method:"DELETE",credentials:"include",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({product,type,arch})});
      const d=await r.json();
      if(d.ok){showToast("R2 file deleted");await load();}
      else showToast(d.error||"Failed",false);
    }catch{showToast("Network error",false);}
  }

  async function testGitHub(){
    setGhTesting(true);setGhTest(null);
    try{const r=await fetch("/api/admin/engine-builder",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"test_github_connection"})});setGhTest(await r.json());}
    catch(e:any){setGhTest({ok:false,error:e.message});}
    finally{setGhTesting(false);}
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"#f0f4f8",padding:"28px 20px"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>

        {/* ── Toast ── */}
        {toast&&(
          <div style={{position:"fixed",top:20,right:20,zIndex:9999,
            padding:"12px 20px",borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,.18)",
            background:toast.ok?"#16a34a":"#dc2626",color:"#fff",fontWeight:700,fontSize:13,
            display:"flex",alignItems:"center",gap:10,maxWidth:400}}>
            {toast.ok?"✅":"❌"} {toast.msg}
          </div>
        )}

        {/* ── Hidden file input ── */}
        <input ref={fileInputRef} type="file" accept=".zip" style={{display:"none"}} onChange={handleFileSelected}/>

        {/* ── Header ── */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
          <div>
            <Link href="/admin" style={{color:"#94a3b8",fontSize:12,textDecoration:"none"}}>← Admin</Link>
            <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:"6px 0 3px"}}>🔧 Engine Builder</h1>
            <p style={{color:"#64748b",fontSize:13,margin:0}}>Build & manage Docker images and EXE binaries. Upload finished builds to Cloudflare R2.</p>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Link href="/admin/licenses" style={{padding:"8px 16px",borderRadius:9,
              background:"rgba(124,58,237,.1)",border:"1.5px solid rgba(124,58,237,.3)",
              color:"#7c3aed",fontWeight:700,fontSize:13,textDecoration:"none"}}>
              🔑 Manage Licenses →
            </Link>
            <Link href="/admin/releases" style={{padding:"8px 16px",borderRadius:9,
              background:"linear-gradient(135deg,#0284c7,#0d9488)",border:"none",
              color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none"}}>
              ☁️ Auto-Releases →
            </Link>
          </div>
        </div>

        {/* ── Status Banners ── */}
        {(hasGH!==null||hasR2!==null)&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
            {/* GitHub */}
            <div style={{padding:"12px 16px",borderRadius:10,border:"1.5px solid",
              borderColor:hasGH?"rgba(34,197,94,.3)":"rgba(251,191,36,.4)",
              background:hasGH?"rgba(34,197,94,.05)":"rgba(251,191,36,.07)",
              display:"flex",alignItems:"flex-start",gap:10}}>
              <span style={{fontSize:20,marginTop:1}}>{hasGH?"✅":"⚠️"}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:12,color:hasGH?"#16a34a":"#b45309"}}>
                  GitHub Actions {hasGH?"Connected":"Not Configured"}
                </div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2,lineHeight:1.6}}>
                  {hasGH?"Builds trigger real Docker+EXE compilation on CI/CD.":"Set GITHUB_TOKEN + GITHUB_REPO in CF Pages env vars to enable real binary builds."}
                </div>
                {ghTest&&(
                  <div style={{marginTop:6,padding:"7px 10px",borderRadius:7,fontSize:11,
                    background:ghTest.ok?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",
                    border:`1px solid ${ghTest.ok?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>
                    {ghTest.ok
                      ?<><strong style={{color:"#16a34a"}}>✅ OK</strong> — {ghTest.user} / {ghTest.repo} ({ghTest.workflow})</>
                      :<><strong style={{color:"#dc2626"}}>❌ {ghTest.error}</strong> — {ghTest.fix}</>}
                  </div>
                )}
              </div>
              <button onClick={testGitHub} disabled={ghTesting}
                style={{padding:"5px 11px",borderRadius:7,border:"1px solid rgba(34,197,94,.3)",
                  background:"rgba(34,197,94,.1)",color:"#16a34a",fontSize:11,fontWeight:700,
                  cursor:ghTesting?"not-allowed":"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                {ghTesting?"…":"🔍 Test"}
              </button>
            </div>

            {/* R2 */}
            <div style={{padding:"12px 16px",borderRadius:10,border:"1.5px solid",
              borderColor:hasR2?"rgba(2,132,199,.3)":"rgba(239,68,68,.4)",
              background:hasR2?"rgba(2,132,199,.05)":"rgba(239,68,68,.05)",
              display:"flex",alignItems:"flex-start",gap:10}}>
              <span style={{fontSize:20,marginTop:1}}>{hasR2?"☁️":"❌"}</span>
              <div>
                <div style={{fontWeight:800,fontSize:12,color:hasR2?"#0284c7":"#dc2626"}}>
                  Cloudflare R2 {hasR2?"Storage Ready":"Binding Missing"}
                </div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2,lineHeight:1.6}}>
                  {hasR2
                    ?"Build artifacts stored in R2. Admin can download & share with clients."
                    :"Add R2 binding: CF Pages → Settings → Bindings → R2 Bucket → Name: R2_BUILDS"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:22}}>
          {[
            {l:"Total Builds",v:stats.total||0,c:"#0284c7"},
            {l:"Ready in R2",v:r2Files.length,c:"#16a34a"},
            {l:"Building",v:stats.building_count||0,c:"#d97706"},
            {l:"Failed",v:stats.failed||0,c:"#dc2626"},
            {l:"Storage",v:r2Files.reduce((a:number,f:any)=>a+(f.size_mb||0),0)+"MB",c:"#7c3aed"},
          ].map(s=>(
            <div key={s.l} style={{...S.card,padding:"12px 16px"}}>
              <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {([
            ["products","📦 Products & Build","Build and manage all product packages"],
            ["builds",`🗂 Build History (${builds.length})`,"All build records from database"],
            ["guide","📖 Guide","How to use Engine Builder"],
          ] as const).map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t as any)}
              style={{padding:"8px 18px",borderRadius:9,border:"1.5px solid",
                borderColor:tab===t?"#0284c7":"#e2e8f0",
                background:tab===t?"rgba(2,132,199,.08)":"#fff",
                color:tab===t?"#0284c7":"#64748b",
                fontWeight:700,fontSize:13,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            TAB: PRODUCTS
        ════════════════════════════════════════════════════════════════════ */}
        {tab==="products"&&(
          <div>
            {/* Legend */}
            <div style={{padding:"10px 16px",borderRadius:10,marginBottom:16,
              background:"rgba(2,132,199,.04)",border:"1px solid rgba(2,132,199,.15)",
              display:"flex",gap:20,flexWrap:"wrap",alignItems:"center",fontSize:12}}>
              <span style={{fontWeight:700,color:"#0284c7"}}>Color guide:</span>
              <span><span style={{color:"#16a34a",fontWeight:800}}>●</span> File exists in R2 — ready to download</span>
              <span><span style={{color:"#0284c7",fontWeight:800}}>●</span> Currently building</span>
              <span><span style={{color:"#ef4444",fontWeight:800}}>●</span> Not built yet</span>
              <span style={{marginLeft:"auto",color:"#94a3b8"}}>Click <strong>⬆ Upload</strong> to send local ZIP to R2 · Click <strong>🔨 Build</strong> to trigger GitHub Actions</span>
            </div>

            {CATALOG.map(grp=>(
              <div key={grp.group} style={{marginBottom:24}}>
                {/* Group header */}
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <span style={{fontSize:22}}>{grp.icon}</span>
                  <h2 style={{fontSize:18,fontWeight:900,color:grp.color,margin:0}}>{grp.group}</h2>
                  <div style={{flex:1,height:1,background:"#e2e8f0",marginLeft:8}}/>
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {grp.products.map(prod=>{
                    // Count how many formats are ready
                    const readyCount = prod.formats.filter(fmt=>{
                      const [type,arch]=fmt.split("-");
                      const k=bkey(prod.id,type,arch);
                      const bs=bget(k);
                      return bs.status==="done"||getR2File(prod.id,type,arch)!==null||getDbBuild(prod.id,type,arch)!==null;
                    }).length;
                    const dotC = readyCount===prod.formats.length?"#16a34a":readyCount>0?"#f59e0b":"#ef4444";

                    return (
                      <div key={prod.id} style={{...S.card,overflow:"visible"}}>
                        {/* Product header */}
                        <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",
                          background:`linear-gradient(90deg,${grp.color}08,transparent)`,
                          display:"flex",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:220}}>
                            <span style={{width:9,height:9,borderRadius:"50%",background:dotC,flexShrink:0,marginTop:3}}/>
                            <span style={{fontSize:22}}>{prod.icon}</span>
                            <div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontWeight:800,fontSize:15,color:"#0a1628"}}>{prod.name}</span>
                                {prod.badge&&<span style={{...S.pill(grp.color)}}>{prod.badge}</span>}
                                {(prod as any).note&&<span style={{...S.pill("#d97706")}}>{(prod as any).note}</span>}
                              </div>
                              <span style={{fontSize:12,color:"#64748b"}}>{prod.desc}</span>
                              <span style={{fontSize:11,color:"#94a3b8",marginLeft:8}}>
                                [{readyCount}/{prod.formats.length} formats ready]
                              </span>
                            </div>
                          </div>

                          {/* Includes list (bundle info) */}
                          {prod.includes.length>1&&(
                            <div style={{fontSize:11,color:"#64748b",lineHeight:1.8,padding:"2px 0"}}>
                              <span style={{fontWeight:700,color:"#0a1628"}}>Includes: </span>
                              {prod.includes.map((inc,i)=>(
                                <span key={i} style={{display:"inline-flex",alignItems:"center",gap:3,
                                  background:"rgba(0,0,0,.04)",borderRadius:4,padding:"1px 7px",margin:"1px 2px",
                                  border:"1px solid rgba(0,0,0,.06)"}}>
                                  ✓ {inc}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Format buttons */}
                        <div style={{padding:"14px 20px",display:"flex",gap:10,flexWrap:"wrap"}}>
                          {prod.formats.map(fmt=>{
                            const fmeta=FORMAT_META[fmt];
                            if(!fmeta) return null;
                            const {type,arch}=fmeta;
                            const k=bkey(prod.id,type,arch);
                            const bs=bget(k);
                            const r2f=getR2File(prod.id,type,arch);
                            const dbBuild=getDbBuild(prod.id,type,arch);
                            const isBuilding=bs.status==="building";
                            const isReady=bs.status==="done"||r2f!==null||dbBuild!==null;
                            const isFailed=bs.status==="failed"&&!isReady;

                            const bc=isReady?"rgba(34,197,94,.3)":isBuilding?"rgba(2,132,199,.3)":isFailed?"rgba(239,68,68,.3)":"rgba(203,213,225,.4)";
                            const bg=isReady?"rgba(34,197,94,.05)":isBuilding?"rgba(2,132,199,.05)":isFailed?"rgba(239,68,68,.04)":"#f8fafc";
                            const tc=isReady?"#16a34a":isBuilding?"#0284c7":isFailed?"#dc2626":"#94a3b8";

                            const fileInfo=r2f?`${r2f.size_mb}MB in R2`:dbBuild&&dbBuild.file_size>0?`${Math.round(dbBuild.file_size/1024/1024)}MB`:null;
                            const fileDate=r2f?.uploaded||dbBuild?.created_at;

                            const dlUrl=r2f
                              ?`/api/admin/releases/download?product=${prod.id}&type=${type}&arch=${arch}`
                              :dbBuild?`/api/admin/engine-builder/download?id=${dbBuild.id}`:null;

                            return (
                              <div key={fmt} style={{border:`1.5px solid ${bc}`,borderRadius:12,
                                background:bg,padding:"12px 14px",minWidth:165,flex:"0 0 auto",
                                display:"flex",flexDirection:"column",gap:7}}>

                                {/* Format label + status */}
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                  <span style={{fontSize:13,fontWeight:700,color:tc}}>{fmeta.icon} {fmeta.label}</span>
                                  <span style={{fontSize:12,fontWeight:900,color:tc}}>
                                    {isReady?"✅":isBuilding?"⟳":isFailed?"✕":"○"}
                                  </span>
                                </div>

                                {/* File info */}
                                {isReady&&fileInfo&&(
                                  <div style={{fontSize:10,color:"#94a3b8",lineHeight:1.6}}>
                                    <span style={{background:r2f?"rgba(2,132,199,.1)":"rgba(124,58,237,.1)",
                                      color:r2f?"#0284c7":"#7c3aed",borderRadius:3,padding:"1px 5px",fontWeight:700}}>
                                      {r2f?"R2":"DB"}
                                    </span>
                                    {" "}{fileInfo}
                                    {fileDate&&<span style={{marginLeft:4}}>{new Date(fileDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
                                  </div>
                                )}

                                {/* Progress bar when building */}
                                {isBuilding&&(
                                  <div>
                                    <div style={{height:4,background:"#e2e8f0",borderRadius:99,overflow:"hidden"}}>
                                      <div style={{height:"100%",width:`${bs.pct}%`,
                                        background:"linear-gradient(90deg,#0284c7,#0d9488)",
                                        borderRadius:99,transition:"width 1s ease"}}/>
                                    </div>
                                    {bs.runUrl&&(
                                      <a href={bs.runUrl} target="_blank" rel="noopener noreferrer"
                                        style={{fontSize:9,color:"#0284c7",textDecoration:"none",display:"block",marginTop:3}}>
                                        → GitHub Actions
                                      </a>
                                    )}
                                    <div style={{fontSize:9,color:"#94a3b8",marginTop:2,maxHeight:24,overflow:"hidden"}}>
                                      {bs.logs.slice(-1)[0]?.slice(0,55)}
                                    </div>
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div style={{display:"flex",gap:5}}>
                                  {/* Build */}
                                  <button onClick={()=>triggerBuild(prod.id,type,arch)}
                                    disabled={isBuilding}
                                    title={isBuilding?"Building…":isReady?"Rebuild (overwrite)":"Build with GitHub Actions"}
                                    style={{flex:1,padding:"5px 0",borderRadius:7,border:"none",
                                      background:isReady?"rgba(34,197,94,.13)":isBuilding?"rgba(2,132,199,.13)":"rgba(203,213,225,.3)",
                                      color:tc,fontSize:10,fontWeight:700,
                                      cursor:isBuilding?"not-allowed":"pointer",opacity:isBuilding?.6:1}}>
                                    {isBuilding?"⟳ Building":isReady?"🔄 Rebuild":"🔨 Build"}
                                  </button>

                                  {/* Upload */}
                                  <button onClick={()=>handleUploadClick(prod.id,type,arch)}
                                    disabled={uploading&&uploadKey===k}
                                    title="Upload local ZIP to R2"
                                    style={{flex:1,padding:"5px 0",borderRadius:7,border:"none",
                                      background:"rgba(124,58,237,.12)",color:"#7c3aed",
                                      fontSize:10,fontWeight:700,cursor:"pointer",
                                      opacity:uploading&&uploadKey===k?.5:1}}>
                                    {uploading&&uploadKey===k?"⟳":"⬆"} {uploading&&uploadKey===k?"Uploading":"Upload"}
                                  </button>
                                </div>

                                {/* Download + Delete R2 */}
                                {isReady&&dlUrl&&(
                                  <div style={{display:"flex",gap:5}}>
                                    <a href={dlUrl} download
                                      style={{flex:1,padding:"5px 0",borderRadius:7,border:"none",
                                        background:"rgba(34,197,94,.18)",color:"#16a34a",
                                        fontSize:10,fontWeight:700,textDecoration:"none",
                                        textAlign:"center",display:"block"}}>
                                      ⬇ Download
                                    </a>
                                    {r2f&&(
                                      <button onClick={()=>deleteR2File(prod.id,type,arch)}
                                        title="Delete from R2"
                                        style={{padding:"5px 8px",borderRadius:7,border:"none",
                                          background:"rgba(239,68,68,.1)",color:"#dc2626",
                                          fontSize:10,fontWeight:700,cursor:"pointer"}}>
                                        🗑
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB: BUILD HISTORY
        ════════════════════════════════════════════════════════════════════ */}
        {tab==="builds"&&(
          <div style={S.card}>
            <div style={{padding:"16px 22px",borderBottom:"1px solid #f1f5f9",
              display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:"#0a1628"}}>Build History</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>
                  Records from GitHub Actions builds. R2 files managed in Products tab.
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={async()=>{
                  if(!confirm("Purge all soft-deleted builds from DB?")) return;
                  const r=await fetch("/api/admin/engine-builder",{method:"POST",credentials:"include",
                    headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"purge_all_deleted"})});
                  const d=await r.json();
                  if(d.ok){showToast(`Purged ${d.purged} builds`);await load();}
                  else showToast(d.error||"Failed",false);
                }} style={{padding:"7px 14px",borderRadius:9,background:"rgba(239,68,68,.08)",
                  border:"1px solid rgba(239,68,68,.2)",color:"#dc2626",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                  🧹 Purge Deleted
                </button>
              </div>
            </div>

            {loading?(
              <div style={{padding:48,textAlign:"center",color:"#94a3b8"}}>Loading…</div>
            ):builds.length===0?(
              <div style={{padding:56,textAlign:"center",color:"#94a3b8"}}>
                <div style={{fontSize:44,marginBottom:12}}>🗂</div>
                No build history. Trigger builds from the Products tab.
              </div>
            ):(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{borderBottom:"1.5px solid #f1f5f9"}}>
                    {["Label","Product","Type / Arch","File","Status","Date",""].map(h=>(
                      <th key={h} style={{padding:"10px 14px",textAlign:"left",color:"#94a3b8",
                        fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:"0.4px"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {builds.map((b:any)=>(
                      <tr key={b.id} style={{borderBottom:"1px solid #f8fafc"}}
                        onMouseEnter={e=>(e.currentTarget.style.background="#f8fafc")}
                        onMouseLeave={e=>(e.currentTarget.style.background="")}>
                        <td style={{padding:"11px 14px"}}>
                          <div style={{fontWeight:700,color:"#0a1628"}}>{b.label}</div>
                          <div style={{fontSize:10,color:"#cbd5e1",fontFamily:"monospace"}}>{b.id.slice(0,8)}</div>
                        </td>
                        <td style={{padding:"11px 14px",color:"#475569"}}>{b.product}</td>
                        <td style={{padding:"11px 14px",color:"#475569"}}>
                          <div>{b.build_type}</div>
                          <div style={{fontSize:11,color:"#94a3b8"}}>{b.arch}</div>
                        </td>
                        <td style={{padding:"11px 14px",fontSize:12}}>
                          {b.file_size>0?<span style={{color:"#16a34a",fontWeight:700}}>{fmtSize(b.file_size)}</span>:<span style={{color:"#94a3b8"}}>—</span>}
                        </td>
                        <td style={{padding:"11px 14px"}}><StatusPill s={b.status}/></td>
                        <td style={{padding:"11px 14px",color:"#64748b",fontSize:12}}>{fmt(b.created_at)}</td>
                        <td style={{padding:"11px 14px"}}>
                          <div style={{display:"flex",gap:5}}>
                            {b.status==="ready"&&b.r2_key&&(
                              <a href={`/api/admin/engine-builder/download?id=${b.id}`}
                                style={{padding:"4px 10px",borderRadius:7,background:"rgba(2,132,199,.08)",
                                  border:"1px solid rgba(2,132,199,.2)",color:"#0284c7",fontSize:12,
                                  fontWeight:600,textDecoration:"none"}}>
                                ⬇ Download
                              </a>
                            )}
                            {b.status==="building"&&b.run_url&&(
                              <a href={b.run_url} target="_blank" rel="noopener noreferrer"
                                style={{padding:"4px 10px",borderRadius:7,background:"rgba(251,191,36,.1)",
                                  border:"1px solid rgba(251,191,36,.3)",color:"#d97706",fontSize:12,fontWeight:600,textDecoration:"none"}}>
                                ⚙ GH Run
                              </a>
                            )}
                            {b.status!=="deleted"&&(
                              <button onClick={()=>deleteBuildRow(b.id,b.label)} disabled={delId===b.id}
                                style={{padding:"4px 9px",borderRadius:7,background:"rgba(239,68,68,.07)",
                                  border:"1px solid rgba(239,68,68,.2)",color:"#dc2626",fontSize:12,
                                  cursor:"pointer",opacity:delId===b.id?.5:1,fontWeight:700}}>
                                {delId===b.id?"…":"✕"}
                              </button>
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

        {/* ════════════════════════════════════════════════════════════════════
            TAB: GUIDE
        ════════════════════════════════════════════════════════════════════ */}
        {tab==="guide"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div style={{...S.card,padding:24}}>
              <div style={{fontWeight:800,fontSize:15,color:"#0a1628",marginBottom:16}}>📋 Admin Workflow</div>
              {[
                {n:1,t:"Build a Product",b:"Click 🔨 Build on any format. GitHub Actions compiles Docker image or EXE binary. Takes 10–20 min.",c:"#0284c7"},
                {n:2,t:"Watch Progress",b:"Status indicator turns blue while building. Click '→ GitHub Actions' to watch live logs.",c:"#7c3aed"},
                {n:3,t:"Or Upload Manually",b:"Already have a build ZIP? Click ⬆ Upload to send directly to R2. File becomes green immediately.",c:"#0d9488"},
                {n:4,t:"Client Downloads",b:"Go to Admin → Licenses → assign a build. Client login → portal → Licenses → Download.",c:"#16a34a"},
                {n:5,t:"Delete When Done",b:"Click 🗑 on R2 file to free storage. Build history records can be purged from Build History tab.",c:"#dc2626"},
              ].map(s=>(
                <div key={s.n} style={{display:"flex",gap:14,marginBottom:16}}>
                  <div style={{width:28,height:28,borderRadius:8,background:s.c,color:"#fff",
                    display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,flexShrink:0}}>{s.n}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:"#0a1628"}}>{s.t}</div>
                    <div style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>{s.b}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{...S.card,padding:22,background:"rgba(2,132,199,.04)",border:"1.5px solid rgba(2,132,199,.15)"}}>
                <div style={{fontWeight:800,fontSize:13,color:"#0284c7",marginBottom:12}}>⚡ Product Format Matrix</div>
                <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
                  <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>
                    {["Format","Size","GPU?","Use Case"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 0",color:"#94a3b8",fontWeight:700}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {[
                      ["🐳 Docker Linux","~200MB–5GB","GPU Worker only","Production server deploy"],
                      ["🐳 Docker ARM64","~200MB–1.5GB","No","Raspberry Pi / AWS Graviton"],
                      ["💾 EXE Linux","~80–250MB","No","Single-binary, no Docker needed"],
                      ["💾 EXE Windows","~80–250MB","No","Windows Server deployment"],
                    ].map(([f,s,g,u])=>(
                      <tr key={f} style={{borderBottom:"1px solid #f8fafc"}}>
                        <td style={{padding:"8px 0",fontWeight:600}}>{f}</td>
                        <td style={{padding:"8px 0",color:"#0284c7"}}>{s}</td>
                        <td style={{padding:"8px 0",color:g!=="No"?"#7c3aed":"#94a3b8"}}>{g}</td>
                        <td style={{padding:"8px 0",color:"#64748b"}}>{u}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{...S.card,padding:22}}>
                <div style={{fontWeight:800,fontSize:13,color:"#7c3aed",marginBottom:10}}>🔑 License Management</div>
                <div style={{fontSize:12,color:"#64748b",lineHeight:1.9}}>
                  License creation is <strong>separate</strong> from builds.<br/>
                  Go to <Link href="/admin/licenses" style={{color:"#7c3aed",fontWeight:700}}>Admin → Licenses</Link> to:<br/>
                  • Create trial / monthly / yearly / lifetime licenses<br/>
                  • Assign to clients<br/>
                  • Link to specific product builds<br/>
                  • Revoke or extend expiry<br/><br/>
                  <em style={{color:"#94a3b8"}}>Builds do NOT embed license keys by default. Clients enter their license key on first launch.</em>
                </div>
              </div>

              <div style={{...S.card,padding:22,background:"rgba(13,148,136,.04)",border:"1.5px solid rgba(13,148,136,.15)"}}>
                <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:10}}>☁️ R2 Storage Structure</div>
                <div style={{fontFamily:"monospace",fontSize:11,color:"#475569",lineHeight:2.2}}>
                  {[
                    "releases/latest/",
                    "  guardian-bundle-docker-linux.zip",
                    "  guardian-bundle-docker-arm64.zip",
                    "  guardian-bundle-exe-linux.zip",
                    "  orchestra-bundle-docker-linux.zip",
                    "  orchestra-worker-gpu-docker-linux.zip",
                    "  ...",
                    "",
                    "builds/{build_id}/   ← manual builds",
                    "  axto-{product}-{type}-{arch}.zip",
                  ].map((line,i)=><div key={i} style={{color:line.startsWith("  ")?line.includes("{")?"#7c3aed":"#0284c7":"#0a1628",fontWeight:line.startsWith("  ")?400:700}}>{line||" "}</div>)}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
