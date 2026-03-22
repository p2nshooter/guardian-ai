"use client";
export const runtime = "edge";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const PRODUCT_META: Record<string,{icon:string;label:string;group:string}> = {
  "guardian-core":       { icon:"🛡️", label:"Guardian Core",        group:"Guardian" },
  "guardian-node":       { icon:"🤖", label:"Guardian Node",         group:"Guardian" },
  "guardian-clamav":     { icon:"🦠", label:"ClamAV Antivirus",      group:"Guardian" },
  "guardian-core-node":  { icon:"🛡️", label:"Guardian Core+Node",    group:"Guardian" },
  "guardian-bundle":     { icon:"🛡️", label:"Guardian Full Bundle",  group:"Guardian" },
  "orchestra-core":      { icon:"⚡", label:"Orchestra Core",         group:"Orchestra" },
  "orchestra-worker-cpu":{ icon:"💻", label:"Orchestra Worker CPU",   group:"Orchestra" },
  "orchestra-worker-gpu":{ icon:"🎮", label:"Orchestra Worker GPU",   group:"Orchestra" },
  "orchestra-core-cpu":  { icon:"⚡", label:"Orchestra Core+CPU",     group:"Orchestra" },
  "orchestra-bundle":    { icon:"⚡", label:"Orchestra Full Bundle",  group:"Orchestra" },
  "full-bundle":         { icon:"📦", label:"AXTO Full Platform",     group:"Bundle" },
};

const TYPE_ICON: Record<string,string> = { docker:"🐳", exe:"💾" };
const ARCH_ICON: Record<string,string> = { linux:"🐧", arm64:"📱", windows:"🪟" };

function fmtSize(mb:number) {
  if (mb >= 1000) return `${(mb/1024).toFixed(1)}GB`;
  return `${mb}MB`;
}
function fmtDate(s:string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}); }
  catch { return s; }
}

export default function ReleasesPage() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState<string|null>(null);
  const [ok,      setOk]      = useState<string|null>(null);
  const [deleting,setDeleting]= useState<string|null>(null);
  const [filter,  setFilter]  = useState<"all"|"docker"|"exe">("all");
  const [group,   setGroup]   = useState<"all"|"Guardian"|"Orchestra"|"Bundle">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/releases",{credentials:"include"});
      if (r.ok) setData(await r.json());
      else setErr("Failed to load releases");
    } catch { setErr("Network error"); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  async function deleteFile(key:string, label:string) {
    if (!confirm(`Delete "${label}" from CF R2?\n\nThis cannot be undone. Clients who haven't downloaded yet won't be able to get this file until the next build.`)) return;
    setDeleting(key);
    try {
      const r = await fetch("/api/admin/releases",{method:"POST",credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"delete_file",key})});
      const d = await r.json();
      if (d.ok) { setOk(`Deleted: ${label}`); load(); }
      else setErr(d.error||"Delete failed");
    } catch { setErr("Network error"); } finally { setDeleting(null); }
  }

  async function deleteProduct(product:string) {
    const meta = PRODUCT_META[product];
    if (!confirm(`Delete ALL builds of "${meta?.label||product}"?\n\nThis removes all Docker + EXE + all arch variants from CF R2.`)) return;
    setDeleting(product);
    try {
      const r = await fetch("/api/admin/releases",{method:"POST",credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"delete_product",product,channel:"latest"})});
      const d = await r.json();
      if (d.ok) { setOk(`Deleted ${d.deleted_count} files for ${product}`); load(); }
      else setErr(d.error||"Delete failed");
    } catch { setErr("Network error"); } finally { setDeleting(null); }
  }

  const s  = { background:"#fff", borderRadius:14, border:"1.5px solid #e2e8f0" };
  const files = (data?.files||[]).filter((f:any) =>
    (filter==="all" || f.type===filter) &&
    (group==="all"  || (PRODUCT_META[f.product]?.group||"?")===group)
  );

  // Group by product
  const byProduct: Record<string,any[]> = {};
  for (const f of files) {
    if (!byProduct[f.product]) byProduct[f.product] = [];
    byProduct[f.product].push(f);
  }

  const manifest = data?.manifest;
  const hasR2 = data?.hasR2 !== false;

  return (
    <div style={{minHeight:"100vh",background:"#f0f9ff",padding:"28px 24px"}}>
      <div style={{maxWidth:1140,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <Link href="/admin" style={{color:"#94a3b8",fontSize:12,textDecoration:"none"}}>← Admin</Link>
            <h1 style={{fontSize:26,fontWeight:900,color:"#0a1628",margin:"6px 0 3px",letterSpacing:"-0.5px"}}>
              ☁️ Auto-Build Releases
            </h1>
            <p style={{color:"#64748b",fontSize:13,margin:0}}>
              All products auto-built on push to main → stored in CF R2. Clients download one-click from portal.
            </p>
          </div>
          <button onClick={load} style={{padding:"8px 18px",borderRadius:9,border:"1.5px solid #e2e8f0",background:"#fff",color:"#64748b",fontWeight:700,fontSize:13,cursor:"pointer"}}>
            ↻ Refresh
          </button>
        </div>

        {/* Alerts */}
        {err&&<div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,color:"#dc2626",fontSize:13}}>
          ⚠ {err} <button onClick={()=>setErr(null)} style={{float:"right",background:"none",border:"none",cursor:"pointer",color:"#dc2626"}}>✕</button>
        </div>}
        {ok&&<div style={{background:"rgba(34,197,94,.07)",border:"1px solid rgba(34,197,94,.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,color:"#16a34a",fontSize:13}}>
          ✅ {ok} <button onClick={()=>setOk(null)} style={{float:"right",background:"none",border:"none",cursor:"pointer",color:"#16a34a"}}>✕</button>
        </div>}

        {/* Build Status Banner */}
        {!loading && (
          <div style={{...s,padding:"16px 20px",marginBottom:20,
            background:manifest?"rgba(34,197,94,.05)":"rgba(251,191,36,.06)",
            borderColor:manifest?"rgba(34,197,94,.2)":"rgba(251,191,36,.3)"}}>
            {manifest ? (
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap" as const,gap:10}}>
                <div>
                  <div style={{fontWeight:800,fontSize:14,color:"#16a34a",marginBottom:4}}>
                    ✅ Latest Build Available — Channel: {manifest.channel} · Tag: {manifest.tag}
                  </div>
                  <div style={{fontSize:12,color:"#64748b"}}>
                    Built: {fmtDate(manifest.built_at)} · Commit: {(manifest.commit||"").slice(0,8)} · {manifest.files || data?.total || 0} files
                  </div>
                </div>
                <div style={{fontSize:12,color:"#64748b"}}>
                  Total: {data?.total||0} files · {!hasR2&&<span style={{color:"#dc2626"}}>⚠ R2 not configured</span>}
                </div>
              </div>
            ) : (
              <div>
                <div style={{fontWeight:800,fontSize:14,color:"#b45309",marginBottom:4}}>
                  ⚠️ No builds found in CF R2
                </div>
                <div style={{fontSize:12,color:"#64748b"}}>
                  {hasR2
                    ? "Push to main branch to trigger auto-build. First build takes ~30 min."
                    : "R2 storage not connected. Set CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_ACCESS_KEY, CF_R2_ACCOUNT_ID, CF_R2_BUCKET in GitHub Secrets."}
                </div>
              </div>
            )}
          </div>
        )}

        {/* GitHub Secrets Checklist */}
        <div style={{...s,padding:"16px 20px",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:13,color:"#0a1628",marginBottom:12}}>📋 Required GitHub Secrets for Auto-Build</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8,fontSize:12}}>
            {[
              {k:"CF_R2_ACCESS_KEY_ID",    d:"R2 access key"},
              {k:"CF_R2_SECRET_ACCESS_KEY",d:"R2 secret key"},
              {k:"CF_R2_ACCOUNT_ID",       d:"Cloudflare account ID"},
              {k:"CF_R2_BUCKET",           d:"R2 bucket name (e.g. axto-artifacts)"},
              {k:"AXTO_APP_URL",           d:"Your dashboard URL (for webhook callback)"},
              {k:"BUILD_WEBHOOK_SECRET",   d:"Secret for build webhook"},
            ].map(({k,d})=>(
              <div key={k} style={{padding:"8px 10px",borderRadius:7,background:"#f8fafc",border:"1px solid #e2e8f0"}}>
                <code style={{fontSize:10,color:"#0284c7",display:"block",marginBottom:2}}>{k}</code>
                <span style={{color:"#64748b"}}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap" as const}}>
          {(["all","docker","exe"] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{padding:"6px 14px",borderRadius:8,border:"1.5px solid",
                borderColor:filter===f?"#0284c7":"#e2e8f0",
                background:filter===f?"rgba(2,132,199,.07)":"#fff",
                color:filter===f?"#0284c7":"#94a3b8",fontWeight:700,fontSize:12,cursor:"pointer"}}>
              {f==="all"?"All Types":f==="docker"?"🐳 Docker":"💾 EXE"}
            </button>
          ))}
          <div style={{width:1,background:"#e2e8f0",margin:"0 4px"}}/>
          {(["all","Guardian","Orchestra","Bundle"] as const).map(g=>(
            <button key={g} onClick={()=>setGroup(g)}
              style={{padding:"6px 14px",borderRadius:8,border:"1.5px solid",
                borderColor:group===g?"#7c3aed":"#e2e8f0",
                background:group===g?"rgba(124,58,237,.07)":"#fff",
                color:group===g?"#7c3aed":"#94a3b8",fontWeight:700,fontSize:12,cursor:"pointer"}}>
              {g}
            </button>
          ))}
        </div>

        {/* Files by product */}
        {loading ? (
          <div style={{...s,padding:48,textAlign:"center",color:"#94a3b8"}}>Loading releases...</div>
        ) : Object.keys(byProduct).length === 0 ? (
          <div style={{...s,padding:56,textAlign:"center"}}>
            <div style={{fontSize:44,marginBottom:12}}>☁️</div>
            <p style={{color:"#64748b",marginBottom:12}}>No releases found for this filter.</p>
            <p style={{fontSize:12,color:"#94a3b8"}}>Push to main branch on GitHub to trigger auto-build.</p>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column" as const,gap:14}}>
            {Object.entries(byProduct).map(([product,pfiles])=>{
              const meta = PRODUCT_META[product] || {icon:"📦",label:product,group:"?"};
              const totalMB = pfiles.reduce((a:number,f:any)=>a+(f.size_mb||0),0);
              return (
                <div key={product} style={s}>
                  <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:20}}>{meta.icon}</span>
                      <div>
                        <div style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>{meta.label}</div>
                        <div style={{fontSize:11,color:"#94a3b8"}}>{pfiles.length} variants · {fmtSize(totalMB)} total</div>
                      </div>
                    </div>
                    <button onClick={()=>deleteProduct(product)} disabled={deleting===product}
                      style={{padding:"5px 14px",borderRadius:8,background:"rgba(127,29,29,.07)",
                        border:"1px solid rgba(127,29,29,.2)",color:"#991b1b",fontSize:12,fontWeight:700,
                        cursor:"pointer",opacity:deleting===product?.5:1}}>
                      🗑 Delete All
                    </button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:1}}>
                    {pfiles.map((f:any)=>(
                      <div key={f.key} style={{padding:"12px 20px",borderRight:"1px solid #f8fafc",
                        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:"#0a1628"}}>
                            {TYPE_ICON[f.type]||"📦"} {f.type?.toUpperCase()} · {ARCH_ICON[f.arch]||"?"} {f.arch}
                          </div>
                          <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                            {f.size_mb > 0 ? fmtSize(f.size_mb) : "—"} · {fmtDate(f.uploaded)}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>deleteFile(f.key, `${product}-${f.type}-${f.arch}`)}
                            disabled={deleting===f.key}
                            title="Delete from CF R2"
                            style={{padding:"4px 10px",borderRadius:6,background:"rgba(239,68,68,.06)",
                              border:"1px solid rgba(239,68,68,.15)",color:"#dc2626",fontSize:11,
                              cursor:"pointer",fontWeight:700,opacity:deleting===f.key?.5:1}}>
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* How to trigger info */}
        <div style={{...s,padding:20,marginTop:20,background:"rgba(2,132,199,.03)"}}>
          <div style={{fontWeight:800,fontSize:13,color:"#0284c7",marginBottom:10}}>⚡ How Auto-Build Works</div>
          <div style={{fontSize:12,color:"#475569",lineHeight:2}}>
            <strong>1. Push to main branch</strong> → GitHub Actions starts automatically (~30–45 min for all products)<br/>
            <strong>2. All 11 products built</strong> → Docker (Linux) + EXE (Linux + Windows) = ~30 files total<br/>
            <strong>3. Auto-uploaded to CF R2</strong> → <code>releases/latest/product-type-arch.zip</code><br/>
            <strong>4. Client downloads from portal</strong> → <code>/api/portal/download?license_id=xxx</code><br/>
            <strong>5. Client runs install.sh</strong> → loads Docker images or starts EXE → opens browser → enters license key<br/>
            <br/>
            <strong style={{color:"#dc2626"}}>Admin delete:</strong> Click 🗑 on any file above — removes from R2 immediately.
            Client will get "build not available" until next push to main.
          </div>
        </div>

      </div>
    </div>
  );
}
