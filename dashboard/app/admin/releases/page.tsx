"use client";
export const runtime = "edge";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Product catalog — mirrors landing page ───────────────────────────────────
const GUARDIAN_COMPONENTS = [
  {
    id: "guardian-bundle",
    icon: "🛡️", label: "Guardian Full Bundle",
    desc: "Core API + Node Agent + ClamAV Antivirus — complete Guardian deployment",
    ci: true, variants: ["docker-linux","exe-linux","exe-windows"],
    setupGuide: `## Guardian Full Bundle — Setup Guide

### Apa isinya?
- **guardian-core**: REST API + Web Dashboard (port 8080)
- **guardian-node**: Threat detection agent
- **guardian-clamav**: Real-time antivirus scanner

### Docker (Linux/ARM64)
\`\`\`bash
# 1. Unzip paket
unzip guardian-bundle-docker-linux.zip
cd guardian-bundle/

# 2. Load semua image
docker load < guardian-core.tar.gz
docker load < guardian-node.tar.gz
docker load < guardian-clamav.tar.gz

# 3. Jalankan install script
chmod +x install.sh && ./install.sh

# 4. Atau manual dengan docker compose
docker compose up -d

# 5. Cek status
docker compose ps
curl http://localhost:8080/health
\`\`\`

### EXE (Linux)
\`\`\`bash
unzip guardian-bundle-exe-linux.zip
cd guardian-bundle-exe-linux/
chmod +x install.sh && ./install.sh
# Atau jalankan langsung:
./guardian-core &
./guardian-node &
\`\`\`

### EXE (Windows)
\`\`\`bat
unzip guardian-bundle-exe-windows.zip
cd guardian-bundle-exe-windows
install.bat
REM Atau jalankan langsung:
guardian-core.exe
guardian-node.exe
\`\`\`

### Aktivasi License
Buka browser → http://SERVER_IP:8080 → masukkan license key → klik Activate

### Menu Dashboard Guardian
| Menu | Fungsi |
|------|--------|
| **Overview** | Status sistem, threat count, node health |
| **Threats** | Daftar ancaman terdeteksi, severity, timeline |
| **Nodes** | Kelola server yang dilindungi, tambah/hapus node |
| **Alerts** | Konfigurasi email/webhook alert |
| **Quarantine** | File yang diisolasi otomatis |
| **Reports** | Export laporan compliance (SOC2, ISO) |
| **Settings** | License key, AI API key, threshold config |
| **Support Bot** | AI assistant untuk analisis threat |`,
  },
  {
    id: "guardian-core-node",
    icon: "🛡️", label: "Guardian Core + Node",
    desc: "Core API + Node Agent — tanpa ClamAV (lebih ringan)",
    ci: true, variants: ["docker-linux","exe-linux","exe-windows"],
    setupGuide: `## Guardian Core + Node — Setup Guide

### Docker
\`\`\`bash
unzip guardian-core-node-docker-linux.zip
cd guardian-core-node/
docker load < guardian-core.tar.gz
docker load < guardian-node.tar.gz
chmod +x install.sh && ./install.sh
\`\`\`

### Kapan pakai ini?
- Server dengan RAM terbatas (ClamAV butuh ~500MB RAM tambahan)
- Sudah punya antivirus lain (ClamSentinel, Sophos, dll)
- Development / staging environment`,
  },
  {
    id: "guardian-core",
    icon: "🖥️", label: "Guardian Core only",
    desc: "REST API + Dashboard saja — tambah node agent secara terpisah",
    ci: true, variants: ["docker-linux","exe-linux","exe-windows"],
    setupGuide: `## Guardian Core — Setup Guide

### Docker
\`\`\`bash
unzip guardian-core-docker-linux.zip
cd guardian-core/
docker load < guardian-core.tar.gz
./install.sh
\`\`\`

### Kapan pakai ini?
- Mau install Node Agent di server lain secara terpisah
- Central management server saja`,
  },
  {
    id: "guardian-node",
    icon: "🤖", label: "Guardian Node Agent",
    desc: "Threat detection agent saja — deploy ke setiap server yang dilindungi",
    ci: true, variants: ["docker-linux","exe-linux","exe-windows"],
    setupGuide: `## Guardian Node Agent — Setup Guide

Node Agent diinstall di setiap server yang ingin dilindungi.
Harus ada Guardian Core yang sudah running sebagai central server.

### Docker
\`\`\`bash
unzip guardian-node-docker-linux.zip
cd guardian-node/
docker load < guardian-node.tar.gz
# Edit GUARDIAN_CORE_URL di docker-compose
GUARDIAN_CORE_URL=http://CORE_IP:8080 ./install.sh
\`\`\`

### EXE
\`\`\`bash
./guardian-node --core http://CORE_IP:8080 --token NODE_TOKEN
\`\`\`

Node Token didapat dari Guardian Core → Settings → Node Tokens → Generate New`,
  },
  {
    id: "guardian-clamav",
    icon: "🦠", label: "ClamAV Antivirus",
    desc: "Antivirus sidecar saja — tambahkan ke install Guardian yang sudah ada",
    ci: true, variants: ["docker-linux"],
    setupGuide: `## ClamAV Antivirus — Setup Guide

### Docker
\`\`\`bash
unzip guardian-clamav-docker-linux.zip
cd guardian-clamav/
docker load < guardian-clamav.tar.gz
./install.sh
\`\`\`

ClamAV sidecar akan otomatis connect ke guardian-core di network yang sama.`,
  },
];

const ORCHESTRA_COMPONENTS = [
  {
    id: "orchestra-bundle",
    icon: "⚡", label: "Orchestra Full Bundle",
    desc: "Core + CPU Worker + GPU Worker — complete Orchestra deployment",
    ci: false, manual: true, variants: ["docker-linux","exe-linux","exe-windows"],
    assembleFrom: ["orchestra-core","orchestra-worker-cpu","orchestra-worker-gpu"],
    setupGuide: `## Orchestra Full Bundle — Setup Guide

### Apa isinya?
- **orchestra-core**: AI orchestration API + Console UI (port 8080)
- **orchestra-worker-cpu**: Cloud AI worker (OpenAI, Claude, Gemini, Groq)
- **orchestra-worker-gpu**: Local GPU inference (Ollama, llama.cpp)

### Docker
\`\`\`bash
unzip orchestra-bundle-docker-linux.zip
cd orchestra-bundle/
docker load < orchestra-core.tar.gz
docker load < orchestra-worker-cpu.tar.gz
docker load < orchestra-worker-gpu.tar.gz  # Butuh NVIDIA GPU + nvidia-docker
./install.sh
\`\`\`

### Aktivasi License
Buka browser → http://SERVER_IP:8080 → masukkan license key → Activate

### Menu Console Orchestra
| Menu | Fungsi |
|------|--------|
| **Dashboard** | Active workers, queue depth, req/min, cost today |
| **Workers** | List semua worker (CPU+GPU), status, latency |
| **Jobs** | Queue aktif, job history, retry failed |
| **Providers** | Konfigurasi OpenAI/Claude/Gemini/Groq/Ollama |
| **Routing** | Pilih strategi: cost/latency/load/quality/failover |
| **Analytics** | Token usage, cost trends, P50/P95 latency |
| **Webhooks** | Set endpoint untuk events (job_done, worker_offline) |
| **Settings** | License key, AI API keys, budget limits, CORS |`,
  },
  {
    id: "orchestra-core-cpu",
    icon: "⚡", label: "Orchestra Core + CPU Worker",
    desc: "Core + CPU Worker — cloud AI saja, tidak butuh GPU",
    ci: true, variants: ["docker-linux","exe-linux","exe-windows"],
    setupGuide: `## Orchestra Core + CPU Worker — Setup Guide

### Docker
\`\`\`bash
unzip orchestra-core-cpu-docker-linux.zip
cd orchestra-core-cpu/
docker load < orchestra-core.tar.gz
docker load < orchestra-worker-cpu.tar.gz
./install.sh
\`\`\`

### Paket ini cocok untuk
- Cloud AI routing (OpenAI, Claude, Gemini, Groq)
- Server tanpa GPU
- Paling umum dipakai client`,
  },
  {
    id: "orchestra-core",
    icon: "🖥️", label: "Orchestra Core only",
    desc: "API + Console UI saja — tambah worker secara terpisah",
    ci: true, variants: ["docker-linux","exe-linux","exe-windows"],
    setupGuide: `## Orchestra Core — Setup Guide

### Docker
\`\`\`bash
unzip orchestra-core-docker-linux.zip
cd orchestra-core/
docker load < orchestra-core.tar.gz
./install.sh
\`\`\`

Tambah worker CPU/GPU setelah core berjalan via menu Workers → Add Worker.`,
  },
  {
    id: "orchestra-worker-cpu",
    icon: "💻", label: "Orchestra Worker CPU",
    desc: "Cloud AI worker saja — OpenAI, Claude, Gemini, Groq, Anthropic",
    ci: false, manual: true, variants: ["docker-linux","exe-linux","exe-windows"],
    setupGuide: `## Orchestra Worker CPU — Setup Guide

Worker CPU menghubungkan Orchestra Core ke provider AI cloud.

### Docker
\`\`\`bash
unzip orchestra-worker-cpu-docker-linux.zip
cd orchestra-worker-cpu/
# Set ORCHESTRA_CORE_URL ke IP core
ORCHESTRA_CORE_URL=http://CORE_IP:8080 ./install.sh
\`\`\`

### Provider yang didukung
- OpenAI (GPT-4, GPT-4o, GPT-3.5)
- Anthropic Claude (claude-3-opus, sonnet, haiku)
- Google Gemini (pro, flash)
- Groq (llama3, mixtral) — very fast
- Mistral AI
- Custom OpenAI-compatible endpoints`,
  },
  {
    id: "orchestra-worker-gpu",
    icon: "🎮", label: "Orchestra Worker GPU",
    desc: "Local GPU inference — Ollama, llama.cpp. Butuh NVIDIA GPU + nvidia-docker",
    ci: false, manual: true, variants: ["docker-linux"],
    setupGuide: `## Orchestra Worker GPU — Setup Guide

### Requirements
- NVIDIA GPU (GTX 1080 min, RTX recommended)
- nvidia-docker / NVIDIA Container Toolkit

### Install nvidia-docker
\`\`\`bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
\`\`\`

### Deploy Worker GPU
\`\`\`bash
unzip orchestra-worker-gpu-docker-linux.zip
cd orchestra-worker-gpu/
ORCHESTRA_CORE_URL=http://CORE_IP:8080 ./install.sh
\`\`\`

### Model yang bisa jalan
- Llama 3 8B (4GB VRAM)
- Llama 3 70B (40GB VRAM)
- Mistral 7B (4GB VRAM)
- Gemma 2 9B (6GB VRAM)
- Otomatis download via Ollama`,
  },
];

const FULL_BUNDLE = {
  id: "full-bundle",
  icon: "📦", label: "AXTO Full Platform",
  desc: "Guardian + Orchestra complete — semua komponen dalam satu paket",
  ci: false, manual: true, variants: ["docker-linux","exe-linux","exe-windows"],
  assembleFrom: ["guardian-bundle","orchestra-bundle"],
  setupGuide: `## AXTO Full Platform — Setup Guide

Full Bundle berisi semua komponen Guardian + Orchestra.

### Docker
\`\`\`bash
unzip full-bundle-docker-linux.zip
cd full-bundle/
# Load semua images
for f in *.tar.gz; do docker load < $f; done
./install.sh
\`\`\`

### Port yang dipakai
| Service | Port |
|---------|------|
| Guardian Dashboard | 8080 |
| Orchestra Console | 7890 |
| Guardian Node | 8090 |
| ClamAV | internal |

### Aktivasi
1. Buka http://SERVER_IP:8080 → masukkan Guardian license key
2. Buka http://SERVER_IP:7890 → masukkan Orchestra license key`,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const s = { background:"#fff", borderRadius:14, border:"1.5px solid #e2e8f0" };

function fmtSize(mb:number) {
  if (!mb) return "";
  return mb >= 1000 ? `${(mb/1024).toFixed(1)}GB` : `${mb}MB`;
}
function fmtDate(s:string) {
  if (!s) return "";
  try { return new Date(s).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}); }
  catch { return ""; }
}

function VariantBadge({built,size,date,onDownload,onDelete,deleting,loading}:any) {
  if (!built) return (
    <span style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>❌ not built</span>
  );
  return (
    <div style={{display:"flex",gap:4,alignItems:"center"}}>
      <button onClick={onDownload} disabled={loading}
        style={{padding:"3px 10px",borderRadius:6,background:"rgba(2,132,199,.09)",
          border:"1px solid rgba(2,132,199,.2)",color:"#0284c7",fontSize:11,fontWeight:700,
          cursor:loading?"wait":"pointer",opacity:loading?.6:1}}>
        {loading?"…":"⬇"}
      </button>
      {size>0 && <span style={{fontSize:10,color:"#94a3b8"}}>{fmtSize(size)}</span>}
      <button onClick={onDelete} disabled={deleting}
        title="Delete from R2"
        style={{padding:"3px 7px",borderRadius:6,background:"rgba(239,68,68,.06)",
          border:"1px solid rgba(239,68,68,.15)",color:"#dc2626",fontSize:10,
          cursor:"pointer",opacity:deleting?.5:1}}>🗑</button>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ReleasesPage() {
  const [data,      setData]      = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [err,       setErr]       = useState<string|null>(null);
  const [ok,        setOk]        = useState<string|null>(null);
  const [deleting,  setDeleting]  = useState<string|null>(null);
  const [dlLoading, setDlLoading] = useState<string|null>(null);
  const [openGuide, setOpenGuide] = useState<string|null>(null);
  const [tab,       setTab]       = useState<"guardian"|"orchestra"|"bundle">("guardian");

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

  // Build lookup: "product-type-arch" → file info
  const builtMap: Record<string,any> = {};
  for (const f of (data?.files||[])) {
    builtMap[`${f.product}-${f.type}-${f.arch}`] = f;
  }

  function isBuilt(product:string, type:string, arch:string) {
    return !!builtMap[`${product}-${type}-${arch}`];
  }
  function getFile(product:string, type:string, arch:string) {
    return builtMap[`${product}-${type}-${arch}`];
  }

  async function download(product:string, type:string, arch:string) {
    const key = `${product}-${type}-${arch}`;
    setDlLoading(key);
    try {
      const r = await fetch(`/api/admin/releases/download?product=${product}&type=${type}&arch=${arch}`,
        {credentials:"include"});
      if (!r.ok) { setErr("Download failed"); return; }
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${product}-${type}-${arch}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { setErr("Download error"); }
    finally { setDlLoading(null); }
  }

  async function deleteFile(product:string, type:string, arch:string, label:string) {
    const file = getFile(product, type, arch);
    if (!file) return;
    if (!confirm(`Delete "${label}" (${type}-${arch}) from CF R2?`)) return;
    const key = file.key;
    setDeleting(key);
    try {
      const r = await fetch("/api/admin/releases",{method:"POST",credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"delete_file",key})});
      const d = await r.json();
      if (d.ok) { setOk(`Deleted: ${label} ${type}-${arch}`); load(); }
      else setErr(d.error||"Delete failed");
    } catch { setErr("Network error"); }
    finally { setDeleting(null); }
  }

  // Count built per component
  function countBuilt(variants:string[], id:string) {
    return variants.filter(v => {
      const [type,arch] = v.split("-");
      return isBuilt(id, type, arch);
    }).length;
  }

  function statusDot(built:number, total:number) {
    if (built === 0) return {color:"#ef4444", label:"❌ Not built"};
    if (built < total) return {color:"#f59e0b", label:"⚠ Partial"};
    return {color:"#22c55e", label:"✅ Ready"};
  }

  // Render a product card
  function ProductCard({comp}:{comp:any}) {
    const built  = countBuilt(comp.variants, comp.id);
    const status = statusDot(built, comp.variants.length);
    const isOpen = openGuide === comp.id;

    const variantMap: Record<string,{icon:string;label:string}> = {
      "docker-linux":   {icon:"🐳🐧", label:"Docker Linux"},
      "exe-linux":      {icon:"💾🐧", label:"EXE Linux"},
      "exe-windows":    {icon:"💾🪟", label:"EXE Windows"},
    };

    return (
      <div style={{...s, marginBottom:10, overflow:"hidden"}}>
        {/* Header row */}
        <div style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",
          borderBottom: isOpen ? "1px solid #f1f5f9":"none"}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <span style={{fontSize:22}}>{comp.icon}</span>
            <div>
              <div style={{fontWeight:800,fontSize:14,color:"#0a1628",display:"flex",alignItems:"center",gap:8}}>
                {comp.label}
                <span style={{width:8,height:8,borderRadius:"50%",background:status.color,display:"inline-block"}}/>
                <span style={{fontSize:11,color:status.color,fontWeight:700}}>{status.label}</span>
                {comp.ci && <span style={{fontSize:10,background:"rgba(34,197,94,.1)",color:"#16a34a",borderRadius:4,padding:"1px 6px",fontWeight:700}}>CI AUTO</span>}
                {comp.manual && <span style={{fontSize:10,background:"rgba(245,158,11,.1)",color:"#b45309",borderRadius:4,padding:"1px 6px",fontWeight:700}}>MANUAL BUILD</span>}
              </div>
              <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{comp.desc}</div>
            </div>
          </div>
          <button onClick={()=>setOpenGuide(isOpen?null:comp.id)}
            style={{padding:"5px 12px",borderRadius:7,border:"1.5px solid #e2e8f0",
              background:isOpen?"rgba(2,132,199,.07)":"#f8fafc",
              color:isOpen?"#0284c7":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" as const}}>
            {isOpen?"▲ Hide":"📖 Guide"}
          </button>
        </div>

        {/* Variants row */}
        <div style={{padding:"10px 18px",display:"flex",gap:16,flexWrap:"wrap" as const,
          borderBottom: isOpen ? "1px solid #f1f5f9":"none"}}>
          {comp.variants.map((v:string)=>{
            const [type,arch] = v.split("-");
            const file = getFile(comp.id, type, arch);
            const dlKey = `${comp.id}-${type}-${arch}`;
            return (
              <div key={v} style={{display:"flex",alignItems:"center",gap:8,minWidth:180}}>
                <span style={{fontSize:13,fontWeight:600,color:"#475569"}}>{variantMap[v]?.icon} {variantMap[v]?.label}</span>
                <VariantBadge
                  built={!!file}
                  size={file?.size_mb}
                  date={file?.uploaded}
                  loading={dlLoading===dlKey}
                  deleting={deleting===file?.key}
                  onDownload={()=>download(comp.id, type, arch)}
                  onDelete={()=>deleteFile(comp.id, type, arch, comp.label)}
                />
              </div>
            );
          })}
        </div>

        {/* Guide panel */}
        {isOpen && (
          <div style={{padding:"18px 20px",background:"#f8fafc"}}>
            <pre style={{margin:0,fontFamily:"inherit",fontSize:12,color:"#334155",
              whiteSpace:"pre-wrap" as const,lineHeight:1.8}}>
              {comp.setupGuide}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Plan tiers info banner
  function PlanTierBanner({product}:{product:"guardian"|"orchestra"}) {
    const tiers = product==="guardian"
      ? [{name:"Sentinel",servers:"1 server",price:"$249/yr"},{name:"Pro",servers:"20 servers",price:"$990/yr"},{name:"Business",servers:"100 servers",price:"$3,990/yr"},{name:"Enterprise",servers:"1,000 servers",price:"$17,900/yr"}]
      : [{name:"Core",workers:"10 workers",price:"$9,900/yr"},{name:"Scale",workers:"50 workers",price:"$24,900/yr"},{name:"Enterprise",workers:"∞ workers",price:"$59,900/yr"}];
    return (
      <div style={{...s,padding:"12px 18px",marginBottom:12,background:"rgba(2,132,199,.03)",border:"1.5px solid rgba(2,132,199,.12)"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#0284c7",marginBottom:8,textTransform:"uppercase" as const,letterSpacing:"0.5px"}}>
          💡 License Tiers — Binary sama, limit beda
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap" as const}}>
          {tiers.map((t:any)=>(
            <div key={t.name} style={{padding:"6px 12px",borderRadius:8,background:"#fff",border:"1px solid #e2e8f0",fontSize:11}}>
              <span style={{fontWeight:800,color:"#0a1628"}}>{t.name}</span>
              <span style={{color:"#64748b",marginLeft:6}}>{t.servers||t.workers}</span>
              <span style={{color:"#0284c7",marginLeft:6,fontWeight:700}}>{t.price}</span>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:"#94a3b8",marginTop:8}}>
          Semua tier pakai binary yang sama — perbedaannya hanya di license key yang digenerate admin.
        </div>
      </div>
    );
  }

  const manifest = data?.manifest;
  const totalBuilt = Object.keys(builtMap).length;

  return (
    <div style={{minHeight:"100vh",background:"#f0f9ff",padding:"28px 24px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <Link href="/admin" style={{color:"#94a3b8",fontSize:12,textDecoration:"none"}}>← Admin</Link>
            <h1 style={{fontSize:26,fontWeight:900,color:"#0a1628",margin:"6px 0 3px",letterSpacing:"-0.5px"}}>
              ☁️ Releases & Downloads
            </h1>
            <p style={{color:"#64748b",fontSize:13,margin:0}}>
              Semua produk tersusun seperti katalog landing page. Download manual per komponen.
            </p>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Link href="/admin/engine-builder" style={{padding:"8px 14px",borderRadius:9,border:"1.5px solid #e2e8f0",
              background:"#fff",color:"#64748b",fontWeight:700,fontSize:12,textDecoration:"none"}}>
              🔧 Engine Builder
            </Link>
            <button onClick={load} style={{padding:"8px 16px",borderRadius:9,border:"1.5px solid #e2e8f0",
              background:"#fff",color:"#64748b",fontWeight:700,fontSize:13,cursor:"pointer"}}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {!loading && (
          <div style={{...s,padding:"14px 18px",marginBottom:16,
            background:manifest?"rgba(34,197,94,.05)":"rgba(251,191,36,.05)",
            borderColor:manifest?"rgba(34,197,94,.2)":"rgba(251,191,36,.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap" as const,gap:8}}>
              <div>
                <div style={{fontWeight:800,fontSize:14,color:manifest?"#16a34a":"#b45309"}}>
                  {manifest ? `✅ Last build: ${manifest.tag}` : "⚠️ No builds found in R2"}
                </div>
                {manifest && <div style={{fontSize:12,color:"#64748b",marginTop:2}}>
                  Built: {fmtDate(manifest.built_at)} · Commit: {(manifest.commit||"").slice(0,8)} · {totalBuilt} files in R2
                </div>}
              </div>
              <div style={{display:"flex",gap:16,fontSize:12}}>
                <span><span style={{color:"#22c55e",fontWeight:700}}>●</span> CI Auto build</span>
                <span><span style={{color:"#f59e0b",fontWeight:700}}>●</span> Manual (admin panel)</span>
                <span><span style={{color:"#ef4444",fontWeight:700}}>●</span> Not built</span>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {err && <div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,color:"#dc2626",fontSize:13}}>
          ⚠ {err} <button onClick={()=>setErr(null)} style={{float:"right",background:"none",border:"none",cursor:"pointer",color:"#dc2626"}}>✕</button>
        </div>}
        {ok && <div style={{background:"rgba(34,197,94,.07)",border:"1px solid rgba(34,197,94,.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,color:"#16a34a",fontSize:13}}>
          ✅ {ok} <button onClick={()=>setOk(null)} style={{float:"right",background:"none",border:"none",cursor:"pointer",color:"#16a34a"}}>✕</button>
        </div>}

        {/* Tabs */}
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {([
            {k:"guardian",  label:"🛡️ Guardian AI"},
            {k:"orchestra", label:"⚡ Orchestra AI"},
            {k:"bundle",    label:"📦 Bundles"},
          ] as const).map(({k,label})=>{
            const allComps = k==="guardian" ? GUARDIAN_COMPONENTS : k==="orchestra" ? ORCHESTRA_COMPONENTS : [FULL_BUNDLE];
            const builtCount = allComps.reduce((acc,c)=>acc+countBuilt(c.variants,c.id),0);
            const totalCount = allComps.reduce((acc,c)=>acc+c.variants.length,0);
            return (
              <button key={k} onClick={()=>setTab(k)}
                style={{padding:"9px 20px",borderRadius:10,border:"1.5px solid",
                  borderColor:tab===k?"#0284c7":"#e2e8f0",
                  background:tab===k?"rgba(2,132,199,.08)":"#fff",
                  color:tab===k?"#0284c7":"#94a3b8",
                  fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
                {label}
                <span style={{fontSize:11,background:tab===k?"rgba(2,132,199,.15)":"#f1f5f9",
                  color:tab===k?"#0284c7":"#94a3b8",borderRadius:4,padding:"1px 6px",fontWeight:700}}>
                  {builtCount}/{totalCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{...s,padding:48,textAlign:"center",color:"#94a3b8"}}>Loading releases…</div>
        ) : (
          <>
            {tab === "guardian" && (
              <div>
                <PlanTierBanner product="guardian"/>
                {GUARDIAN_COMPONENTS.map(c => <ProductCard key={c.id} comp={c}/>)}
              </div>
            )}
            {tab === "orchestra" && (
              <div>
                <PlanTierBanner product="orchestra"/>
                {ORCHESTRA_COMPONENTS.map(c => <ProductCard key={c.id} comp={c}/>)}
                <div style={{...s,padding:"12px 16px",marginTop:8,background:"rgba(245,158,11,.04)",border:"1.5px solid rgba(245,158,11,.2)"}}>
                  <div style={{fontSize:12,color:"#b45309",fontWeight:700}}>⚠ orchestra-worker-cpu & orchestra-worker-gpu</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:4}}>
                    Docker image mengandung PyTorch (~4.4GB) — terlalu besar untuk GitHub Actions runner.
                    Build manual via Admin → Engine Builder → New Build.
                    EXE version bisa di-build di CI karena PyInstaller hanya bundle deps yang dipakai.
                  </div>
                </div>
              </div>
            )}
            {tab === "bundle" && (
              <div>
                <div style={{...s,padding:"12px 18px",marginBottom:12,background:"rgba(124,58,237,.03)",border:"1.5px solid rgba(124,58,237,.12)"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#7c3aed",marginBottom:4}}>📦 Bundle Pricing (Landing Page)</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap" as const,fontSize:12}}>
                    {[
                      {name:"Starter Bundle",  g:"Guardian Pro",        o:"Orchestra Core",       price:"$9,490/yr"},
                      {name:"Professional",    g:"Guardian Business",   o:"Orchestra Scale",      price:"$24,900/yr"},
                      {name:"Enterprise",      g:"Guardian Enterprise", o:"Orchestra Enterprise", price:"$69,900/yr"},
                    ].map(b=>(
                      <div key={b.name} style={{padding:"8px 12px",borderRadius:8,background:"#fff",border:"1px solid #e2e8f0"}}>
                        <div style={{fontWeight:800,color:"#0a1628"}}>{b.name}</div>
                        <div style={{color:"#0284c7",fontSize:11}}>{b.g} + {b.o}</div>
                        <div style={{color:"#7c3aed",fontWeight:700,fontSize:11}}>{b.price}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:8}}>
                    Bundle = Guardian binary + Orchestra binary dalam satu ZIP. License terpisah.
                  </div>
                </div>
                <ProductCard comp={FULL_BUNDLE}/>
                <div style={{...s,padding:"14px 18px",marginTop:8,background:"rgba(245,158,11,.04)",border:"1.5px solid rgba(245,158,11,.2)"}}>
                  <div style={{fontSize:12,color:"#b45309",fontWeight:700}}>⚡ Cara assemble Full Bundle</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:4,lineHeight:1.8}}>
                    1. Pastikan <code>guardian-bundle-docker-linux.zip</code> sudah ada di R2<br/>
                    2. Pastikan <code>orchestra-bundle-docker-linux.zip</code> sudah ada di R2 (perlu manual build worker GPU dulu)<br/>
                    3. Download keduanya → unzip → gabungkan isi folder → rezip → upload ke R2 sebagai <code>full-bundle-docker-linux.zip</code><br/>
                    4. Atau: tunggu fitur "Assemble Bundle" di update berikutnya
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer info */}
        <div style={{...s,padding:"16px 20px",marginTop:20,background:"rgba(2,132,199,.02)"}}>
          <div style={{fontWeight:800,fontSize:13,color:"#0284c7",marginBottom:10}}>⚡ Build Pipeline</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,fontSize:12,color:"#475569"}}>
            <div>
              <div style={{fontWeight:700,color:"#0a1628",marginBottom:4}}>CI Auto-Build (push ke main)</div>
              <div style={{lineHeight:1.9}}>
                ✅ guardian-core, guardian-node, guardian-clamav<br/>
                ✅ guardian-core-node, guardian-bundle<br/>
                ✅ orchestra-core, orchestra-core-cpu<br/>
                ✅ EXE Linux + Windows untuk semua di atas<br/>
                ✅ Full bundle EXE (tanpa GPU worker)
              </div>
            </div>
            <div>
              <div style={{fontWeight:700,color:"#b45309",marginBottom:4}}>Manual Build (Admin → Engine Builder)</div>
              <div style={{lineHeight:1.9}}>
                ⚠ orchestra-worker-cpu (Docker image, PyTorch ~1GB)<br/>
                ⚠ orchestra-worker-gpu (Docker image, CUDA ~4.4GB)<br/>
                ⚠ orchestra-bundle Docker (perlu worker GPU)<br/>
                ⚠ full-bundle Docker (perlu orchestra-bundle lengkap)<br/>
                ⚠ Repack bundle setelah semua komponen tersedia
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
