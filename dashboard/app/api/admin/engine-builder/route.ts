import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, dbFirst, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generateLicenseKey } from "@/lib/license";

export const runtime = "edge";
export const dynamic = "force-dynamic";

async function triggerGitHubBuild(p: {
  product:string;buildType:string;buildId:string;licenseKey:string;
  licenseType:string;trialDays:number;maxNodes:number;maxGpu:number;
  maxWorkers:number;unlimited:boolean;arch:string;version:string;
  clientName:string;clientEmail:string;label:string;
}) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || process.env.GHCR_OWNER || "p2nshooter";
  const repo  = process.env.GITHUB_REPO  || "guardian-engine";
  if (!token) return { triggered: false };
  const wf = p.buildType === "exe" ? "build-exe.yml" : "build-release.yml";
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${wf}/dispatches`,
    { method:"POST",
      headers:{ Authorization:`Bearer ${token}`, Accept:"application/vnd.github+json", "Content-Type":"application/json" },
      body: JSON.stringify({ ref: p.version==="latest"?"main":p.version,
        inputs:{ build_id:p.buildId, product:p.product, build_type:p.buildType,
          license_key:p.licenseKey, license_type:p.licenseType, trial_days:String(p.trialDays),
          max_nodes:p.unlimited?"0":String(p.maxNodes), max_gpu:p.unlimited?"0":String(p.maxGpu),
          max_workers:p.unlimited?"0":String(p.maxWorkers), unlimited:p.unlimited?"1":"0",
          arch:p.arch, client_name:p.clientName, client_email:p.clientEmail } }) }
  );
  return { triggered: res.ok, status: res.status };
}

function buildConfigFiles(b: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  const owner  = process.env.GHCR_OWNER || "p2nshooter";
  const tag    = b.version || "latest";
  const ts     = new Date().toISOString();
  const maxN   = b.unlimited ? 9999 : b.max_nodes;
  const maxW   = b.unlimited ? 9999 : b.max_workers;
  const maxG   = b.unlimited ? 99   : b.max_gpu;
  const isWin  = b.arch === "windows/amd64";

  const gYml = `# AXTO Guardian AI — Production Configuration
# Build: ${b.label} | Client: ${b.client_name||"—"} <${b.client_email||""}> | Generated: ${ts}
guardian:
  license_key: "${b.license_key}"
  license_validate_url: "${appUrl}/api/license-validate"
  max_nodes: ${maxN}
  scan_mode: "auto"
  scan_interval: 300
  scan_paths: [/host, /tmp, /var/www]
  ai_pool:
    routing: cost
    fallback: true
    providers:
      - provider: openai
        api_key: "sk-REPLACE_WITH_YOUR_OPENAI_KEY"
        model: "gpt-4o-mini"
      # - provider: anthropic
      #   api_key: "sk-ant-REPLACE_ME"
      # - provider: groq
      #   api_key: "gsk_REPLACE_ME"
      # - provider: ollama
      #   base_url: "http://localhost:11434"
      #   model: "llama3"
  alerts: { email: "", slack_webhook: "", discord_webhook: "" }
  log_retention_days: 90
`;
  const gCompose = `version: "3.9"
# AXTO Guardian AI | Build: ${b.label} | Arch: ${b.arch} | ${ts}
# Products: guardian-core (API) + guardian-node (threat agent) + clamav (antivirus)
services:
  guardian-db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: guardian
      POSTGRES_PASSWORD: \${GUARDIAN_DB_PASSWORD:?set GUARDIAN_DB_PASSWORD}
      POSTGRES_DB: guardian
    volumes: [guardian-db-data:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL","pg_isready -U guardian"], interval: 10s, timeout: 5s, retries: 5 }
    networks: [guardian-net]

  # ── Guardian Core (REST API + dashboard backend) ─────────────────────────────
  guardian-core:
    image: ghcr.io/${owner}/guardian-engine:${tag}
    restart: unless-stopped
    command: uvicorn src.api:app --host 0.0.0.0 --port 8080
    ports: ["8080:8080"]
    depends_on: { guardian-db: { condition: service_healthy } }
    volumes: [./guardian.yml:/guardian/config/guardian.yml:ro, guardian-data:/guardian/data, guardian-logs:/guardian/logs]
    environment: [GUARDIAN_CONFIG=/guardian/config/guardian.yml, "GUARDIAN_DB_URL=postgresql://guardian:\${GUARDIAN_DB_PASSWORD}@guardian-db:5432/guardian"]
    healthcheck: { test: ["CMD","curl","-sf","http://localhost:8080/health"], interval: 30s, timeout: 10s, retries: 3, start_period: 30s }
    networks: [guardian-net]

  # ── Guardian Node (threat detection agent — runs on each protected server) ───
  guardian-node:
    image: ghcr.io/${owner}/guardian-engine:${tag}
    restart: unless-stopped
    depends_on: { guardian-core: { condition: service_healthy } }
    privileged: true
    cap_add: [NET_ADMIN, SYS_PTRACE, KILL]
    environment:
      - GUARDIAN_CORE_URL=http://guardian-core:8080
      - "GUARDIAN_DB_URL=postgresql://guardian:\${GUARDIAN_DB_PASSWORD}@guardian-db:5432/guardian"
      - "GUARDIAN_NODE_NAME=\${HOSTNAME:-node-1}"
      - GUARDIAN_CONFIG=/guardian/config/guardian.yml
    volumes: [/:/host:ro, /tmp:/tmp, guardian-quarantine:/guardian/quarantine, ./guardian.yml:/guardian/config/guardian.yml:ro]
    networks: [guardian-net]

  # ── ClamAV Antivirus (real-time file scanning + signature updates) ───────────
  clamav:
    image: clamav/clamav:stable_base
    restart: unless-stopped
    environment:
      - CLAMAV_NO_FRESHCLAMD=false
      - CLAMAV_NO_CLAMD=false
    volumes:
      - clamav-db:/var/lib/clamav
      - /:/scan-host:ro
      - guardian-quarantine:/guardian/quarantine
    ports: ["3310:3310"]
    healthcheck:
      test: ["CMD", "clamdcheck.sh"]
      interval: 60s
      timeout: 20s
      retries: 3
      start_period: 120s
    networks: [guardian-net]

volumes: { guardian-db-data: {}, guardian-data: {}, guardian-logs: {}, guardian-quarantine: {}, clamav-db: {} }
networks: { guardian-net: { driver: bridge } }
`;
  const oYml = `# AXTO Orchestra AI — Production Configuration
# Build: ${b.label} | Client: ${b.client_name||"—"} <${b.client_email||""}> | Generated: ${ts}
orchestra:
  license_key: "${b.license_key}"
  license_validate_url: "${appUrl}/api/license-validate"
  console_password: "CHANGE_THIS_TO_A_STRONG_PASSWORD"
  worker_token: "CHANGE_THIS_TO_A_STRONG_SECRET_TOKEN"
  max_workers: ${maxW}
  ai_pool:
    default_routing: cost
    fallback: true
    providers:
      - provider: groq
        api_key: "gsk_REPLACE_WITH_YOUR_GROQ_KEY"
        model: "llama-3.1-8b-instant"
      - provider: deepseek
        api_key: "sk-REPLACE_WITH_YOUR_DEEPSEEK_KEY"
        model: "deepseek-chat"
      # - provider: openai
      #   api_key: "sk-REPLACE_ME"
      # - provider: ollama
      #   base_url: "http://localhost:11434"
      #   model: "llama3"
      #   cost_per_1k_tokens: 0
  autoscaler: { enabled: false, threshold: 20, max_cpu_workers: ${maxW}, max_gpu_workers: ${maxG} }
  budget: { daily_limit_usd: 0, alert_at_percent: 80 }
  log_retention_days: 90
`;
  const oCompose = `version: "3.9"
# AXTO Orchestra AI | Build: ${b.label} | Arch: ${b.arch} | ${ts}
services:
  orchestra-db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: orchestra
      POSTGRES_PASSWORD: \${ORCHESTRA_DB_PASSWORD:?set ORCHESTRA_DB_PASSWORD}
      POSTGRES_DB: orchestra
    volumes: [orchestra-db-data:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL","pg_isready -U orchestra"], interval: 10s, timeout: 5s, retries: 5 }
    networks: [orchestra-net]
  orchestra-core:
    image: ghcr.io/${owner}/orchestra-core:${tag}
    restart: unless-stopped
    ports: ["8080:8080"]
    depends_on: { orchestra-db: { condition: service_healthy } }
    volumes: [./orchestra.yml:/app/config/orchestra.yml:ro, orchestra-data:/app/data]
    environment: [ORCHESTRA_CONFIG=/app/config/orchestra.yml, "DATABASE_URL=postgresql://orchestra:\${ORCHESTRA_DB_PASSWORD}@orchestra-db:5432/orchestra", "WORKER_TOKEN=\${WORKER_TOKEN:?set WORKER_TOKEN}"]
    healthcheck: { test: ["CMD","curl","-sf","http://localhost:8080/health"], interval: 30s, timeout: 10s, retries: 3, start_period: 30s }
    networks: [orchestra-net]
  worker-cpu:
    image: ghcr.io/${owner}/orchestra-worker-cpu:${tag}
    restart: unless-stopped
    environment: [ORCHESTRA_CORE_URL=http://orchestra-core:8080, "ORCHESTRA_WORKER_TOKEN=\${WORKER_TOKEN}", WORKER_CONCURRENCY=${Math.min(maxW,20)}]
    depends_on: { orchestra-core: { condition: service_healthy } }
    networks: [orchestra-net]
${maxG > 0 ? `  worker-gpu:\n    image: ghcr.io/${owner}/orchestra-worker-gpu:${tag}\n    restart: unless-stopped\n    runtime: nvidia\n    environment: [ORCHESTRA_CORE_URL=http://orchestra-core:8080, "ORCHESTRA_WORKER_TOKEN=\${WORKER_TOKEN}", WORKER_MODEL=llama3.2, WORKER_IDLE_SHUTDOWN=300]\n    deploy: { resources: { reservations: { devices: [{ capabilities: [gpu] }] } } }\n    depends_on: { orchestra-core: { condition: service_healthy } }\n    networks: [orchestra-net]` : ""}
volumes: { orchestra-db-data: {}, orchestra-data: {} }
networks: { orchestra-net: { driver: bridge } }
`;

  const installer = isWin
    ? `@echo off\nREM AXTO ${b.product==="orchestra"?"Orchestra":"Guardian"} Installer | Build: ${b.label} | ${ts}\necho ============================================\necho  AXTO ${b.product==="orchestra"?"Orchestra AI":"Guardian AI"} Setup\necho ============================================\nwhere docker >nul 2>&1 || (echo ERROR: Install Docker Desktop first: https://docker.com & pause & exit /b 1)\ndocker info >nul 2>&1 || (echo ERROR: Start Docker Desktop first & pause & exit /b 1)\necho Pulling image...\ndocker pull ghcr.io/${owner}/${b.product==="orchestra"?"orchestra-core":"guardian-engine"}:${tag} || (echo Pull failed & pause & exit /b 1)\necho Starting services...\ndocker compose -f docker-compose.yml up -d || (echo Compose failed & pause & exit /b 1)\necho.\necho Ready! Dashboard: http://localhost:8080\necho License is embedded in the config file\npause`
    : `#!/bin/bash\n# AXTO ${b.product==="orchestra"?"Orchestra AI":"Guardian AI"} Installer | Build: ${b.label} | ${ts}\nset -euo pipefail\necho "==========================================="\necho " AXTO ${b.product==="orchestra"?"Orchestra AI":"Guardian AI"} Setup"\necho "==========================================="\ncommand -v docker &>/dev/null || { echo "ERROR: Install Docker first: https://docs.docker.com/get-docker/"; exit 1; }\ndocker info &>/dev/null || { echo "ERROR: Start Docker first"; exit 1; }\n[ ! -f .env ] && { printf '${b.product==="orchestra"?"ORCHESTRA_DB_PASSWORD":"GUARDIAN_DB_PASSWORD"}=%s\\nWORKER_TOKEN=%s\\n' "$(openssl rand -hex 16)" "$(openssl rand -hex 24)" > .env && echo "Generated .env"; }\necho "Pulling image..."\ndocker pull ghcr.io/${owner}/${b.product==="orchestra"?"orchestra-core":"guardian-engine"}:${tag}\necho "Starting services..."\ndocker compose -f docker-compose.yml up -d\necho ""\necho "Ready! Dashboard: http://localhost:8080"\necho "License is embedded in the config file"`;

  const readme = `AXTO ${b.product==="bundle"?"Bundle":"b.product==="orchestra"?"Orchestra AI":"Guardian AI"}\nBuild: ${b.label}\nClient: ${b.client_name||"—"} <${b.client_email||""}>\nLicense: ${b.license_type}${b.trial_days>0?` (${b.trial_days}d)`:""} | Nodes: ${b.unlimited?"Unlimited":b.max_nodes} | GPU: ${b.unlimited?"Unlimited":b.max_gpu} | Workers: ${b.unlimited?"Unlimited":b.max_workers}\n\nQUICK START\n${b.product!=="orchestra"?`1. Edit guardian.yml — add your AI API keys\n2. Set env: GUARDIAN_DB_PASSWORD=$(openssl rand -hex 16)\n3. Run: docker compose${b.product==="bundle"?" -f guardian-compose.yml":""} up -d\n4. Dashboard: http://YOUR_SERVER:8080\n`:""}\n${b.product!=="guardian"?`${b.product==="bundle"?"5":"1"}. Edit orchestra.yml — set console_password, worker_token, add AI keys\n${b.product==="bundle"?"6":"2"}. Set env: ORCHESTRA_DB_PASSWORD=$(openssl rand -hex 16) WORKER_TOKEN=$(openssl rand -hex 24)\n${b.product==="bundle"?"7":"3"}. Run: docker compose${b.product==="bundle"?" -f orchestra-compose.yml":""} up -d\n${b.product==="bundle"?"8":"4"}. Console: http://YOUR_SERVER:${b.product==="bundle"?"8081":"8080"}/console\n`:""}\nDocker Registry:\n  ghcr.io/${owner}/guardian-engine:${tag}\n  ghcr.io/${owner}/orchestra-core:${tag}\n  ghcr.io/${owner}/orchestra-worker-cpu:${tag}\n  ghcr.io/${owner}/orchestra-worker-gpu:${tag}\n\nSupport: hallo@axto.io | Portal: ${appUrl}/portal\n`;

  if (b.product === "guardian") return {
    "guardian.yml":       {content:gYml,     type:"text/yaml"},
    "docker-compose.yml": {content:gCompose,  type:"text/yaml"},
    "README.txt":         {content:readme,    type:"text/plain"},
    ...(b.build_type==="exe"?{[isWin?"install.bat":"install.sh"]:{content:installer,type:"text/plain"}}:{}),
  };
  if (b.product === "orchestra") return {
    "orchestra.yml":      {content:oYml,      type:"text/yaml"},
    "docker-compose.yml": {content:oCompose,  type:"text/yaml"},
    "README.txt":         {content:readme,    type:"text/plain"},
    ...(b.build_type==="exe"?{[isWin?"install.bat":"install.sh"]:{content:installer,type:"text/plain"}}:{}),
  };
  return {
    "guardian.yml":          {content:gYml,      type:"text/yaml"},
    "guardian-compose.yml":  {content:gCompose,  type:"text/yaml"},
    "orchestra.yml":         {content:oYml,      type:"text/yaml"},
    "orchestra-compose.yml": {content:oCompose,  type:"text/yaml"},
    "README.txt":            {content:readme,    type:"text/plain"},
    ...(b.build_type==="exe"?{[isWin?"install.bat":"install.sh"]:{content:installer,type:"text/plain"}}:{}),
  };
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  let db: any;
  try { db = getDB(req); } catch { return NextResponse.json({ error:"DB unavailable" }, { status:503 }); }
  const builds = await dbQuery<any>(db, `SELECT * FROM engine_builds WHERE deleted_at='' ORDER BY created_at DESC LIMIT 500`).catch(()=>[]);
  const stats  = await dbFirst<any>(db, `SELECT COUNT(*) as total, SUM(CASE WHEN status='ready' THEN 1 ELSE 0 END) as ready, SUM(CASE WHEN product='guardian' THEN 1 ELSE 0 END) as guardian_count, SUM(CASE WHEN product='orchestra' THEN 1 ELSE 0 END) as orchestra_count, SUM(CASE WHEN product='bundle' THEN 1 ELSE 0 END) as bundle_count FROM engine_builds WHERE deleted_at=''`).catch(()=>({}));
  return NextResponse.json({ builds:builds||[], stats:stats||{}, hasGithubToken:!!process.env.GITHUB_TOKEN });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error:"Invalid JSON" }, { status:400 }); }
  let db: any;
  try { db = getDB(req); } catch { return NextResponse.json({ error:"DB unavailable" }, { status:503 }); }
  const { action } = body;

  if (action === "create_build") {
    const { build_type="docker", product="guardian", label="", license_type="yearly",
      trial_days=0, max_nodes=1, max_gpu=0, max_workers=10, unlimited=false,
      client_name="", client_email="", client_org="", arch="linux/amd64",
      notes="", version="latest", existing_license_key="" } = body;
    if (!["guardian","orchestra","bundle"].includes(product))
      return NextResponse.json({ error:"Invalid product" }, { status:400 });

    let expires_at = "2099-12-31T23:59:59Z";
    if (license_type==="trial") { const d=Math.min(Math.max(Number(trial_days)||3,1),7); const e=new Date(); e.setDate(e.getDate()+d); expires_at=e.toISOString(); }
    else if (license_type==="monthly") { const e=new Date(); e.setMonth(e.getMonth()+1); expires_at=e.toISOString(); }
    else if (license_type==="yearly") { const e=new Date(); e.setFullYear(e.getFullYear()+1); expires_at=e.toISOString(); }

    const licKey = existing_license_key || (product==="orchestra" ? generateLicenseKey("orchestra") : generateLicenseKey("guardian"));
    const id = newId();
    const nN = unlimited?9999:Math.max(1,Number(max_nodes)||1);
    const nG = unlimited?99:Math.max(0,Number(max_gpu)||0);
    const nW = unlimited?9999:Math.max(1,Number(max_workers)||10);
    const lbl = label || `${product}-${build_type}-${new Date().toISOString().slice(0,10)}`;

    await dbRun(db,
      `INSERT INTO engine_builds (id,build_type,product,status,label,license_key,license_type,trial_days,max_nodes,max_gpu,max_workers,unlimited,client_name,client_email,client_org,r2_key,download_url,version,arch,notes,expires_at,deleted_at,created_by,created_at,updated_at) VALUES (?,?,?,'building',?,?,?,?,?,?,?,?,?,?,?,'','',?,?,?,?,?,'admin',?,?)`,
      [id,build_type,product,lbl,licKey,license_type,Number(trial_days)||0,nN,nG,nW,unlimited?1:0,client_name,client_email,client_org,version,arch,notes,expires_at,"",now(),now()]
    );

    const log = (msg:string) => dbRun(db,
      `INSERT INTO engine_build_logs (id,build_id,level,message,created_at) VALUES (?,?,?,?,?)`,
      [newId(),id,"info",msg,now()]
    );

    await log(`[1/5] Build initiated — ${build_type.toUpperCase()} | ${product} | ${license_type} | ${arch}`);
    await log(`[2/5] License key generated — ${licKey.slice(0,12)}...`);
    await log(`[3/5] Configuration files generated for ${product}`);

    let ghTriggered = false;
    try {
      const gh = await triggerGitHubBuild({ product,buildType:build_type,buildId:id,licenseKey:licKey,licenseType:license_type,trialDays:Number(trial_days)||0,maxNodes:nN,maxGpu:nG,maxWorkers:nW,unlimited:!!unlimited,arch,version,clientName:client_name,clientEmail:client_email,label:lbl });
      ghTriggered = gh.triggered;
    } catch { /* no token configured */ }

    await log(`[4/5] ${ghTriggered?"GitHub Actions workflow dispatched — CI/CD building Docker image":"Config package ready — images pulled from GHCR on first deploy"}`);
    await dbRun(db, `UPDATE engine_builds SET status='ready',updated_at=? WHERE id=?`, [now(),id]);
    await log(`[5/5] Build complete — ready to download`);

    return NextResponse.json({ ok:true, id, licenseKey:licKey, githubTriggered:ghTriggered });
  }

  if (action === "get_progress") {
    const { id } = body;
    if (!id) return NextResponse.json({ error:"id required" }, { status:400 });
    const build = await dbFirst<any>(db, `SELECT id,status,label,license_key,product,build_type,expires_at FROM engine_builds WHERE id=?`, [id]);
    const logs  = await dbQuery<any>(db, `SELECT level,message,created_at FROM engine_build_logs WHERE build_id=? ORDER BY created_at ASC`, [id]).catch(()=>[]);
    const steps = (logs||[]).filter((l:any)=>l.message.startsWith("[")).length;
    return NextResponse.json({ build, logs:logs||[], progress: Math.min(steps*20,100) });
  }

  if (action === "get_download_files") {
    const { id } = body;
    if (!id) return NextResponse.json({ error:"id required" }, { status:400 });
    const build = await dbFirst<any>(db, `SELECT * FROM engine_builds WHERE id=? AND deleted_at=''`, [id]);
    if (!build) return NextResponse.json({ error:"Build not found" }, { status:404 });
    if (build.status !== "ready") return NextResponse.json({ error:"Build not ready" }, { status:400 });
    return NextResponse.json({ ok:true, build, files: buildConfigFiles(build) });
  }

  if (action === "delete_build") {
    const { id } = body;
    if (!id) return NextResponse.json({ error:"id required" }, { status:400 });
    const build = await dbFirst<any>(db, `SELECT id FROM engine_builds WHERE id=? AND deleted_at=''`, [id]);
    if (!build) return NextResponse.json({ error:"Not found" }, { status:404 });
    await dbRun(db, `UPDATE engine_builds SET status='deleted',deleted_at=?,updated_at=? WHERE id=?`, [now(),now(),id]);
    await dbRun(db, `INSERT INTO engine_build_logs (id,build_id,level,message,created_at) VALUES (?,?,?,?,?)`, [newId(),id,"warn","Build manually deleted by admin",now()]);
    return NextResponse.json({ ok:true });
  }

  return NextResponse.json({ error:"Unknown action" }, { status:400 });
}
