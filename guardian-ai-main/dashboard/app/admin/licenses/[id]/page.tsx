"use client";
export const runtime = "edge";
import { useEffect, useState } from "react";
import { getSessionUser, signOut } from "@/lib/client-auth";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const STATUS_BADGE: Record<string,string> = {
  active:"badge-green",suspended:"badge-yellow",expired:"badge-amber",revoked:"badge-red",
};

export default function LicenseDetailPage() {
  const { id } = useParams<{id:string}>();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string|null>(null);
  const [actionError, setActionError] = useState<string|null>(null);
  const [extending, setExtending]         = useState(false);
  const [extMonths, setExtMonths]         = useState(12);
  const [copied, setCopied]               = useState(false);
  const router = useRouter();

  useEffect(()=>{
    (async()=>{
      const user = await getSessionUser();
      if(!user||user.role!=="admin"){router.push("/auth/login");return;}
      await load();
    })();
  },[id]);

  async function load(){
    setLoading(true);
    const res = await fetch(`/api/admin/licenses?id=${id}`);
    if(res.ok) setData(await res.json());
    setLoading(false);
  }

  async function action(act:string, extra?:any){
    setActionLoading(act);
    const res = await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:act,licenseId:id,...extra})});
    const d = await res.json();
    if(!d.success) setActionError(d.error||"Action failed");
    else { setActionError(null); await load(); }
    setActionLoading(null);
  }

  async function extendLicense(){
    setActionLoading("extend");
    const res = await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"extend",licenseId:id,months:extMonths})});
    const d = await res.json();
    if(!d.success) setActionError(d.error||"Extend failed");
    else { setActionError(null); setExtending(false); await load(); }
    setActionLoading(null);
  }

  function copyKey(){
    if(!data?.license) return;
    navigator.clipboard.writeText(data.license.license_key);
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  }

  if(loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background: "#f0f9ff"}}>
      <div className="text-cyan-400 animate-pulse">Loading license…</div>
    </div>
  );
  if(!data) return (
    <div className="min-h-screen flex items-center justify-center" style={{background: "#f0f9ff"}}>
      <div className="text-red-400">License not found.</div>
    </div>
  );

  const { license, client, nodes, heartbeats } = data;
  const daysLeft = Math.ceil((new Date(license.expires_at).getTime()-Date.now())/(1000*3600*24));

  return (
    <div className="min-h-screen" style={{background: "#f0f9ff"}}>
      <nav className="border-b border-slate-200 bg-[#f0f9ff]/90 backdrop-blur-xl px-6 h-16 flex items-center gap-3 sticky top-0 z-50">
        <Link href="/admin/licenses" className="text-slate-400 hover:text-white transition-colors">← Licenses</Link>
        <span className="text-white font-bold">{client?.name}</span>
        <span className={`badge ${STATUS_BADGE[license.status]||"badge-slate"}`}>{license.status}</span>
        <span className="badge badge-cyan ml-1">{license.package_code}</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {actionError && (
          <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"10px 16px",marginBottom:16,color:"#ef4444",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>⚠ {actionError}</span>
            <button onClick={()=>setActionError(null)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16}}>×</button>
          </div>
        )}
        {/* License Key Card */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="input-label mb-2">License Key</p>
              <code className="license-key text-sm block">{license.license_key}</code>
              <div className="text-xs text-slate-500 mt-2">
                Created: {new Date(license.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})} ·
                Expires: <span className={daysLeft<0?"text-red-400":daysLeft<=30?"text-yellow-400":"text-green-400"}>
                  {new Date(license.expires_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}
                  {daysLeft>0?` (${daysLeft}d left)`:` (expired ${Math.abs(daysLeft)}d ago)`}
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={copyKey} className="glass glass-hover text-sm px-3 py-2 rounded-xl text-slate-400 hover:text-white">
                {copied?"✓ Copied":"📋 Copy Key"}
              </button>
              <button onClick={()=>action("resend_email")} disabled={!!actionLoading} className="glass glass-hover text-sm px-3 py-2 rounded-xl text-cyan-400 disabled:opacity-40">📧 Resend Email</button>
              {license.status==="active"?(
                <>
                  <button onClick={()=>setExtending(true)} className="glass glass-hover text-sm px-3 py-2 rounded-xl text-green-400">⊕ Extend</button>
                  <button onClick={()=>action("suspend")} disabled={!!actionLoading} className="glass glass-hover text-sm px-3 py-2 rounded-xl text-yellow-400 disabled:opacity-40">⏸ Suspend</button>
                  <button onClick={()=>{if(confirm("Revoke this license?"))action("revoke")}} disabled={!!actionLoading} className="glass glass-hover text-sm px-3 py-2 rounded-xl text-red-400 disabled:opacity-40">✕ Revoke</button>
                </>
              ):(
                <button onClick={()=>action("reactivate")} disabled={!!actionLoading} className="glass glass-hover text-sm px-3 py-2 rounded-xl text-green-400 disabled:opacity-40">▶ Activate</button>
              )}
            </div>
          </div>

          {extending&&(
            <div className="mt-4 p-4 bg-white/5 border border-slate-200 rounded-xl flex items-center gap-3">
              <span className="text-sm text-slate-400">Extend by</span>
              <input type="number" min={1} max={60} value={extMonths} onChange={e=>setExtMonths(parseInt(e.target.value))} className="input text-sm" style={{width:"80px"}}/>
              <span className="text-sm text-slate-400">months</span>
              <button onClick={extendLicense} disabled={!!actionLoading} className="bg-gradient-to-r from-green-700 to-green-500 text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50">
                {actionLoading==="extend"?"Extending…":"Confirm"}
              </button>
              <button onClick={()=>setExtending(false)} className="glass glass-hover text-sm px-3 py-2 rounded-xl text-slate-400">Cancel</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Info */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Client Information</h3>
            <dl className="space-y-3">
              {[
                {label:"Name",     value:client?.name},
                {label:"Email",    value:client?.email},
                {label:"Org",      value:client?.organization||"—"},
                {label:"Country",  value:client?.country||"—"},
                {label:"Member since", value:new Date(client?.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})},
              ].map(r=>(
                <div key={r.label} className="flex justify-between items-start gap-2">
                  <dt className="text-xs text-slate-500 uppercase tracking-wider">{r.label}</dt>
                  <dd className="text-sm text-slate-300 text-right">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Package Info */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Package Details</h3>
            <dl className="space-y-3">
              {[
                {label:"Package",   value:license.package_code},
                {label:"Max Nodes", value:license.max_nodes===-1?"Unlimited":license.max_nodes},
                {label:"Active Nodes",value:nodes?.length||0},
                {label:"Status",    value:license.status},
                {label:"Bound Machine",value:license.bound_machine_id||"Not bound"},
              ].map(r=>(
                <div key={r.label} className="flex justify-between items-start gap-2">
                  <dt className="text-xs text-slate-500 uppercase tracking-wider">{r.label}</dt>
                  <dd className="text-sm text-slate-300 text-right font-mono">{r.value}</dd>
                </div>
              ))}
            </dl>
            {license.notes&&(
              <div className="mt-4 p-3 bg-white/5 rounded-xl text-xs text-slate-400">{license.notes}</div>
            )}
          </div>
        </div>

        {/* Connected Nodes */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-bold text-white mb-4">Connected Nodes ({nodes?.length||0})</h3>
          {nodes?.length>0?(
            <table className="data-table">
              <thead><tr><th>Node ID</th><th>Hostname</th><th>OS</th><th>Status</th><th>Last Seen</th></tr></thead>
              <tbody>
                {nodes.map((n:any)=>(
                  <tr key={n.id}>
                    <td><code className="text-xs text-cyan-400 font-mono">{n.node_id}</code></td>
                    <td>{n.hostname||"—"}</td>
                    <td>{n.os_type||"—"}</td>
                    <td><span className={`badge ${n.status==="active"?"badge-green":"badge-slate"}`}>{n.status}</span></td>
                    <td className="text-xs">{n.last_seen_at?new Date(n.last_seen_at).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ):(
            <p className="text-slate-500 text-sm">No nodes connected.</p>
          )}
        </div>

        {/* Heartbeat History */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-bold text-white mb-4">Recent Heartbeats</h3>
          {heartbeats?.length>0?(
            <table className="data-table">
              <thead><tr><th>Time</th><th>Machine ID</th><th>IP</th><th>Node Count</th><th>Version</th><th>Status</th></tr></thead>
              <tbody>
                {heartbeats.map((h:any)=>(
                  <tr key={h.id}>
                    <td className="text-xs">{new Date(h.created_at).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</td>
                    <td><code className="text-xs text-slate-400 font-mono">{h.machine_id?.substring(0,16)||"—"}</code></td>
                    <td className="text-xs font-mono">{h.ip_address||"—"}</td>
                    <td className="text-center">{h.node_count}</td>
                    <td className="text-xs">{h.guardian_version||"—"}</td>
                    <td><span className={`badge ${h.status==="ok"?"badge-green":"badge-red"}`}>{h.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ):(
            <p className="text-slate-500 text-sm">No heartbeats recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
