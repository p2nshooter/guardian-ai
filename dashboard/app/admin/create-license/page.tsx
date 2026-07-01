/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── All AXTO packages across all product lines ──────────────────────────────
const PACKAGES = [
  // Guardian AI
  { code: "lite",                name: "Guardian Sentinel",       product: "guardian",    price: "$490/yr",    limit: "1 server",       color: "#0284c7" },
  { code: "pro",                 name: "Guardian Professional",   product: "guardian",    price: "$1,990/yr",  limit: "25 servers",     color: "#0284c7" },
  { code: "shield",              name: "Guardian Business",       product: "guardian",    price: "$7,990/yr",  limit: "100 servers",    color: "#0284c7" },
  { code: "aegis",               name: "Guardian Enterprise",     product: "guardian",    price: "$29,900/yr", limit: "1,000 servers",  color: "#0284c7" },
  // Orchestra AI
  { code: "orchestra_core",      name: "Orchestra Starter",       product: "orchestra",   price: "$14,900/yr", limit: "10 workers",     color: "#7c3aed" },
  { code: "orchestra_scale",     name: "Orchestra Professional",  product: "orchestra",   price: "$39,900/yr", limit: "50 workers",     color: "#7c3aed" },
  { code: "orchestra_unlimited", name: "Orchestra Enterprise",    product: "orchestra",   price: "$89,900/yr", limit: "Unlimited",      color: "#7c3aed" },
  // AXTO Vault
  { code: "vault_starter",       name: "Vault Starter",           product: "vault",       price: "$1,990/yr",  limit: "5 projects",     color: "#6366f1" },
  { code: "vault_professional",  name: "Vault Professional",      product: "vault",       price: "$5,990/yr",  limit: "Unlimited",      color: "#6366f1" },
  { code: "vault_business",      name: "Vault Business",          product: "vault",       price: "$14,900/yr", limit: "Multi-tenant",   color: "#6366f1" },
  { code: "vault_enterprise",    name: "Vault Enterprise",        product: "vault",       price: "$49,900/yr", limit: "Unlimited req",  color: "#6366f1" },
  // AXTO Edge
  { code: "edge_starter",        name: "Edge Starter",            product: "edge",        price: "$2,990/yr",  limit: "1M req/day",     color: "#0891b2" },
  { code: "edge_professional",   name: "Edge Professional",       product: "edge",        price: "$7,990/yr",  limit: "10M req/day",    color: "#0891b2" },
  { code: "edge_enterprise",     name: "Edge Enterprise",         product: "edge",        price: "$24,900/yr", limit: "Unlimited",      color: "#0891b2" },
  // AXTO SOC
  { code: "soc_starter",         name: "SOC Starter",             product: "soc",         price: "$9,990/yr",  limit: "10 sources",     color: "#dc2626" },
  { code: "soc_professional",    name: "SOC Professional",        product: "soc",         price: "$29,900/yr", limit: "100 sources",    color: "#dc2626" },
  { code: "soc_enterprise",      name: "SOC Enterprise",          product: "soc",         price: "$99,900/yr", limit: "Unlimited",      color: "#dc2626" },
  // AXTO Compliance
  { code: "compliance_starter",  name: "Compliance Starter",      product: "compliance",  price: "$2,990/yr",  limit: "3 frameworks",   color: "#16a34a" },
  { code: "compliance_pro",      name: "Compliance Professional", product: "compliance",  price: "$7,990/yr",  limit: "All frameworks", color: "#16a34a" },
  { code: "compliance_enterprise",name:"Compliance Enterprise",   product: "compliance",  price: "$19,900/yr", limit: "Multi-tenant",   color: "#16a34a" },
  // AXTO Sentinel
  { code: "sentinel_starter",    name: "Sentinel Starter",        product: "sentinel",    price: "$4,990/yr",  limit: "100 devices",    color: "#ca8a04" },
  { code: "sentinel_professional",name:"Sentinel Professional",   product: "sentinel",    price: "$14,900/yr", limit: "1,000 devices",  color: "#ca8a04" },
  { code: "sentinel_enterprise", name: "Sentinel Enterprise",     product: "sentinel",    price: "$49,900/yr", limit: "Unlimited",      color: "#ca8a04" },
  // Guardian Antivirus
  { code: "antivirus_starter",       name: "Antivirus Starter",       product: "antivirus",  price: "$2,900/yr",  limit: "10 endpoints",   color: "#e879f9" },
  { code: "antivirus_professional",  name: "Antivirus Professional",  product: "antivirus",  price: "$9,900/yr",  limit: "100 endpoints",  color: "#e879f9" },
  { code: "antivirus_enterprise",    name: "Antivirus Enterprise",    product: "antivirus",  price: "$29,900/yr", limit: "Unlimited",      color: "#e879f9" },
  // AXTO Legal — AI Legal & Compliance Platform
  { code: "legal_starter",       name: "Legal Starter",           product: "legal",       price: "$14,900/yr", limit: "3 workspaces, 30 jurisdictions",  color: "#0f766e" },
  { code: "legal_professional",  name: "Legal Professional",      product: "legal",       price: "$49,000/yr", limit: "10 workspaces, 100 jurisdictions",color: "#0f766e" },
  { code: "legal_business",      name: "Legal Business",          product: "legal",       price: "$99,000/yr", limit: "18 workspaces, 195+ jurisdictions",color: "#0f766e" },
  { code: "legal_enterprise",    name: "Legal Enterprise",        product: "legal",       price: "$249,000/yr",limit: "Unlimited, custom jurisdictions",color: "#0f766e" },
  // AXTO Studio — Central AI & GPU Pool
  { code: "studio_pro",          name: "Studio Professional",     product: "studio",      price: "$9,900/yr",  limit: "Shared GPU pool",color: "#9333ea" },
];

const LICENSE_TYPES = [
  { value: "trial",        label: "🕐 Trial",        desc: "1–7 days, any product"       },
  { value: "monthly",      label: "📅 Monthly",      desc: "Renews every 30 days"         },
  { value: "yearly",       label: "📆 Yearly",       desc: "12-month license"             },
  { value: "lifetime",     label: "♾️ Lifetime",     desc: "One-time, never expires"      },
  { value: "per_instance", label: "🖥 Per Instance", desc: "Locked to one machine"        },
];

const PRODUCT_GROUPS = [
  { id: "all",        label: "All Products",       icon: "📦" },
  { id: "guardian",   label: "Guardian AI",        icon: "🛡️" },
  { id: "orchestra",  label: "Orchestra AI",       icon: "⚡" },
  { id: "vault",      label: "AXTO Vault",         icon: "🔐" },
  { id: "edge",       label: "AXTO Edge",          icon: "🌐" },
  { id: "soc",        label: "AXTO SOC",           icon: "🔴" },
  { id: "compliance", label: "AXTO Compliance",    icon: "📋" },
  { id: "sentinel",   label: "AXTO Sentinel",      icon: "📡" },
  { id: "antivirus",  label: "Guardian Antivirus", icon: "🦠" },
  { id: "legal",      label: "AXTO Legal",         icon: "⚖️" },
  { id: "studio",     label: "AXTO Studio",        icon: "🎨" },
];

const inp: React.CSSProperties = {
  width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #e2e8f0",
  background:"#f8fafc",color:"#0a1628",fontSize:14,outline:"none",
  fontFamily:"inherit",boxSizing:"border-box",
};
const lbl: React.CSSProperties = {
  color:"#64748b",fontSize:11,fontWeight:700,display:"block",
  marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px",
};

export default function CreateLicensePage() {
  const router = useRouter();
  const [productFilter, setProductFilter] = useState("all");
  const [form, setForm] = useState({
    clientName: "", clientEmail: "", organization: "",
    packageCode: "pro", licenseType: "yearly",
    trialDays: "7", trialWeeks: "1", expiresMonths: "12",
    notes: "", sendEmailFlag: true, skipUser: false,
  });
  const [loading, setLoading]   = useState(false);
  const [result,  setResult]    = useState<string|null>(null);
  const [err,     setErr]       = useState<string|null>(null);

  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  const filteredPackages = productFilter === "all"
    ? PACKAGES
    : PACKAGES.filter(p => p.product === productFilter);

  const selectedPkg   = PACKAGES.find(p=>p.code===form.packageCode);
  const isTrialType   = form.licenseType === "trial";
  const isLifetime    = form.licenseType === "lifetime" || form.licenseType === "per_instance";

  function getExpiresMonths(): number {
    if (isTrialType)              return 0;
    if (isLifetime)               return 12 * 100;
    if (form.licenseType === "monthly") return 1;
    return Number(form.expiresMonths) || 12;
  }

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.clientEmail || !form.packageCode) {
      setErr("Client email and package are required"); return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/admin", {
        method:"POST", credentials:"include",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          action:        "create",
          clientName:    form.clientName,
          clientEmail:   form.clientEmail,
          organization:  form.organization,
          packageCode:   form.packageCode,
          licenseType:   form.licenseType,
          trialWeeks:    isTrialType ? Number(form.trialWeeks) : 0,
          trialDays:     isTrialType ? Number(form.trialDays) : 0,
          expiresMonths: getExpiresMonths(),
          notes:         form.notes,
          sendEmail:     form.sendEmailFlag,
          skipUser:      form.skipUser,
          gateway:       "manual",
          source:        "admin",
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { setErr(d.error||"Failed to create license"); }
      else { setResult(JSON.stringify(d, null, 2)); }
    } catch(ex:any) {
      setErr(ex.message||"Network error");
    }
    setLoading(false);
  }

  const groupColor = selectedPkg ? (PACKAGES.find(p=>p.code===form.packageCode)?.color||"#0284c7") : "#0284c7";

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc",padding:"32px 24px",fontFamily:"Inter,-apple-system,sans-serif"}}>
      <div style={{maxWidth:760,margin:"0 auto"}}>

        {/* Header */}
        <div style={{marginBottom:28}}>
          <Link href="/admin" style={{color:"#64748b",fontSize:13,textDecoration:"none"}}>← Admin</Link>
          <h1 style={{fontSize:24,fontWeight:800,color:"#0a1628",marginTop:8}}>Create License</h1>
          <p style={{color:"#64748b",fontSize:14}}>Issue a new license key for any AXTO product.</p>
        </div>

        {result ? (
          <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:12,padding:24}}>
            <h2 style={{color:"#166534",fontSize:16,fontWeight:700,marginBottom:12}}>✅ License Created Successfully</h2>
            <pre style={{background:"#0a1628",color:"#86efac",padding:20,borderRadius:8,fontSize:12,overflow:"auto",lineHeight:1.6}}>
              {result}
            </pre>
            <div style={{marginTop:16,display:"flex",gap:12}}>
              <button onClick={()=>{setResult(null);setForm(f=>({...f,clientName:"",clientEmail:"",organization:"",notes:""}))}}
                style={{padding:"10px 20px",background:"#0284c7",border:"none",borderRadius:8,color:"#fff",fontWeight:600,cursor:"pointer"}}>
                Create Another
              </button>
              <Link href="/admin/licenses"
                style={{padding:"10px 20px",background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:8,color:"#0a1628",fontWeight:600,textDecoration:"none"}}>
                View All Licenses
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{display:"grid",gap:20}}>

              {/* Product Group Filter */}
              <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:20}}>
                <label style={lbl}>Product Line</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {PRODUCT_GROUPS.map(g=>(
                    <button key={g.id} type="button"
                      onClick={()=>{setProductFilter(g.id);if(g.id!=="all"){const first=PACKAGES.find(p=>p.product===g.id);if(first)set("packageCode",first.code);}}}
                      style={{
                        padding:"7px 14px",border:"1px solid",borderRadius:20,cursor:"pointer",
                        fontSize:12,fontWeight:600,transition:"all .15s",
                        borderColor: productFilter===g.id?"#6366f1":"#e2e8f0",
                        background:  productFilter===g.id?"#6366f1":"#f8fafc",
                        color:       productFilter===g.id?"#fff":"#64748b",
                      }}>
                      {g.icon} {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Package Selection */}
              <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:20}}>
                <label style={lbl}>Package *</label>
                <div style={{display:"grid",gap:8,gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))"}}>
                  {filteredPackages.map(p=>(
                    <label key={p.code} style={{
                      display:"flex",gap:10,alignItems:"flex-start",
                      padding:"12px 14px",borderRadius:10,cursor:"pointer",
                      border:`2px solid ${form.packageCode===p.code?p.color:"#e2e8f0"}`,
                      background:form.packageCode===p.code?p.color+"0d":"#f8fafc",
                      transition:"all .15s",
                    }}>
                      <input type="radio" name="packageCode" value={p.code}
                        checked={form.packageCode===p.code}
                        onChange={()=>set("packageCode",p.code)}
                        style={{marginTop:2,accentColor:p.color}}/>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:"#0a1628"}}>{p.name}</div>
                        <div style={{fontSize:11,color:"#64748b"}}>{p.price} · {p.limit}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* License Type */}
              <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:20}}>
                <label style={lbl}>License Type *</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {LICENSE_TYPES.map(t=>(
                    <label key={t.value} style={{
                      display:"flex",gap:8,alignItems:"center",padding:"10px 14px",
                      borderRadius:10,cursor:"pointer",border:"2px solid",
                      borderColor:form.licenseType===t.value?"#6366f1":"#e2e8f0",
                      background:form.licenseType===t.value?"#6366f10d":"#f8fafc",
                    }}>
                      <input type="radio" name="licenseType" value={t.value}
                        checked={form.licenseType===t.value}
                        onChange={()=>set("licenseType",t.value)}
                        style={{accentColor:"#6366f1"}}/>
                      <div>
                        <div style={{fontWeight:700,fontSize:12}}>{t.label}</div>
                        <div style={{fontSize:11,color:"#94a3b8"}}>{t.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {isTrialType && (
                  <div style={{marginTop:14}}>
                    <label style={lbl}>Trial Length</label>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {[
                        {w:"1",label:"1 Week",days:"7 days"},
                        {w:"2",label:"2 Weeks",days:"14 days"},
                        {w:"3",label:"3 Weeks",days:"21 days"},
                        {w:"4",label:"4 Weeks",days:"28 days"},
                      ].map(t=>(
                        <button key={t.w} type="button"
                          onClick={()=>{set("trialWeeks",t.w);set("trialDays",String(Number(t.w)*7));}}
                          style={{
                            padding:"10px 16px",borderRadius:10,cursor:"pointer",border:"2px solid",
                            fontSize:13,fontWeight:700,transition:"all .15s",textAlign:"center",
                            borderColor: form.trialWeeks===t.w?"#0f766e":"#e2e8f0",
                            background:  form.trialWeeks===t.w?"#0f766e0d":"#f8fafc",
                            color:       form.trialWeeks===t.w?"#0f766e":"#64748b",
                          }}>
                          {t.label}
                          <div style={{fontSize:10,fontWeight:500,color:"#94a3b8"}}>{t.days}</div>
                        </button>
                      ))}
                    </div>
                    <p style={{fontSize:11,color:"#94a3b8",marginTop:8}}>
                      One trial per email per product. Trial keys carry no charge and cannot be renewed.
                    </p>
                  </div>
                )}
                {!isTrialType && !isLifetime && form.licenseType==="yearly" && (
                  <div style={{marginTop:12}}>
                    <label style={lbl}>Duration (months)</label>
                    <input type="number" min="1" max="120" value={form.expiresMonths}
                      onChange={e=>set("expiresMonths",e.target.value)} style={{...inp,width:100}}/>
                  </div>
                )}
              </div>

              {/* Client Details */}
              <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:20}}>
                <h3 style={{fontSize:14,fontWeight:700,color:"#0a1628",marginBottom:16}}>Client Details</h3>
                <div style={{display:"grid",gap:14}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                    <div>
                      <label style={lbl}>Full Name</label>
                      <input placeholder="Jane Smith" value={form.clientName}
                        onChange={e=>set("clientName",e.target.value)} style={inp}/>
                    </div>
                    <div>
                      <label style={lbl}>Email Address *</label>
                      <input type="email" required placeholder="jane@company.com" value={form.clientEmail}
                        onChange={e=>set("clientEmail",e.target.value)} style={inp}/>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Organization / Company</label>
                    <input placeholder="Acme Corporation" value={form.organization}
                      onChange={e=>set("organization",e.target.value)} style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Internal Notes (admin only)</label>
                    <textarea placeholder="e.g. Trial for enterprise procurement process Q1 2026"
                      value={form.notes} onChange={e=>set("notes",e.target.value)}
                      style={{...inp,height:72,resize:"vertical"}}/>
                  </div>
                  <label style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer",fontSize:14}}>
                    <input type="checkbox" checked={form.sendEmailFlag}
                      onChange={e=>set("sendEmailFlag",e.target.checked)} style={{accentColor:"#6366f1"}}/>
                    <span style={{fontWeight:600,color:"#0a1628"}}>Send welcome email to client with license key and setup guide</span>
                  </label>
                  <label style={{display:"flex",gap:10,alignItems:"flex-start",cursor:"pointer",fontSize:14,
                    padding:"12px 14px",borderRadius:10,border:"1px dashed #cbd5e1",background:"#f8fafc"}}>
                    <input type="checkbox" checked={form.skipUser}
                      onChange={e=>set("skipUser",e.target.checked)} style={{accentColor:"#0f766e",marginTop:3}}/>
                    <span>
                      <span style={{fontWeight:700,color:"#0a1628"}}>Manual activation — no user account</span>
                      <span style={{display:"block",fontSize:12,color:"#64748b",marginTop:2}}>
                        Issue/approve this license for a customer who already owns the key, without
                        creating a portal login. The key works immediately on validation; no registration required.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Summary */}
              {selectedPkg && (
                <div style={{background:groupColor+"0d",border:`1px solid ${groupColor}33`,borderRadius:12,padding:16}}>
                  <div style={{fontSize:13,color:"#0a1628",lineHeight:1.8}}>
                    <strong>Summary:</strong> {selectedPkg.name} ({selectedPkg.price}) ·
                    {isTrialType ? ` ${form.trialWeeks}-week trial (${Number(form.trialWeeks)*7} days)` : isLifetime ? " Lifetime" : ` ${form.expiresMonths} months`}
                    {form.skipUser ? " · manual (no account)" : ""}
                    {form.clientEmail ? ` → ${form.clientEmail}` : ""}
                    <br/>
                    <span style={{color:"#64748b",fontSize:12}}>
                      License key prefix: {selectedPkg.product==="guardian"?"GUARD-":selectedPkg.product==="orchestra"?"ORCH-":selectedPkg.product==="vault"?"VAULT-":selectedPkg.product.toUpperCase().slice(0,4)+"-"}XXXX-XXXX-XXXX-XXXX
                    </span>
                  </div>
                </div>
              )}

              {err && (
                <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:"12px 16px",color:"#dc2626",fontSize:13}}>
                  {err}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{
                  padding:"14px 28px",background:loading?"#94a3b8":groupColor,
                  border:"none",borderRadius:10,color:"#fff",
                  fontWeight:700,fontSize:15,cursor:loading?"not-allowed":"pointer",
                  width:"100%",transition:"background .2s",
                }}>
                {loading ? "Creating license…" : "✨ Create License Key"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
