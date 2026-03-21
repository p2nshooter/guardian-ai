export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getR2Builds, dbQuery, dbRun, dbFirst, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generateLicenseKey } from "@/lib/license";

// ── R2 key helper ───────────────────────────────────────────────────────────
function r2KeyForBuild(buildId: string, product: string, buildType: string, arch: string): string {
  const a = arch === "windows/amd64" ? "windows" : arch === "linux/arm64" ? "linux-arm64" : "linux";
  return `builds/${buildId}/axto-${product}-${buildType}-${a}.zip`;
}

// ── Trigger GitHub Actions build ──────────────────────────────────────────────
async function triggerGitHubBuild(p: {
  product:string; buildType:string; buildId:string; licenseKey:string;
  licenseType:string; trialDays:number; maxNodes:number; maxGpu:number;
  maxWorkers:number; unlimited:boolean; arch:string; version:string;
  clientName:string; clientEmail:string; label:string; r2Key:string;
}) {
  const token   = process.env.GITHUB_TOKEN;
  const owner   = process.env.GITHUB_OWNER || process.env.GHCR_OWNER || "p2nshooter";
  const repo    = process.env.GITHUB_REPO  || "guardian-ai";
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  const secret  = process.env.BUILD_WEBHOOK_SECRET || "";
  if (!token) return { triggered: false, status: 0 };

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/build-release.yml/dispatches`,
    {
      method: "POST",
      headers: { Authorization:`Bearer ${token}`, Accept:"application/vnd.github+json", "Content-Type":"application/json" },
      body: JSON.stringify({
        ref: p.version === "latest" ? "main" : p.version,
        inputs: {
          build_id:         p.buildId,
          product:          p.product,
          build_type:       p.buildType,
          license_key:      p.licenseKey,
          license_type:     p.licenseType,
          trial_days:       String(p.trialDays),
          max_nodes:        p.unlimited ? "0" : String(p.maxNodes),
          max_gpu:          p.unlimited ? "0" : String(p.maxGpu),
          max_workers:      p.unlimited ? "0" : String(p.maxWorkers),
          unlimited:        p.unlimited ? "1" : "0",
          arch:             p.arch,
          client_name:      p.clientName,
          client_email:     p.clientEmail,
          r2_upload_key:    p.r2Key,           // R2 key for GH Actions to upload binary
          callback_url:     `${appUrl}/api/admin/engine-builder`,
          callback_secret:  secret,
        },
      }),
    }
  );
  return { triggered: res.ok, status: res.status };
}

// ── Delete GitHub Release (cleanup if it exists) ──────────────────────────────
async function deleteGitHubRelease(releaseTag: string) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || process.env.GHCR_OWNER || "p2nshooter";
  const repo  = process.env.GITHUB_REPO  || "guardian-ai";
  if (!token || !releaseTag) return;
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${releaseTag}`,
      { headers: { Authorization:`Bearer ${token}`, Accept:"application/vnd.github+json" } });
    if (!r.ok) return;
    const rel: any = await r.json();
    await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/${rel.id}`,
      { method:"DELETE", headers: { Authorization:`Bearer ${token}`, Accept:"application/vnd.github+json" } });
    await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/tags/${releaseTag}`,
      { method:"DELETE", headers: { Authorization:`Bearer ${token}`, Accept:"application/vnd.github+json" } });
  } catch {}
}

// ── Config file generator (always available as ZIP alongside binary) ──────────
function buildConfigFiles(b: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  const owner  = process.env.GHCR_OWNER || "p2nshooter";
  const tag    = b.version || "latest";
  const ts     = new Date().toISOString();
  const maxN   = b.unlimited ? 9999 : b.max_nodes;
  const maxW   = b.unlimited ? 9999 : b.max_workers;
  const maxG   = b.unlimited ? 99   : b.max_gpu;
  const isWin  = b.arch === "windows/amd64";

  const gYml = `# AXTO Guardian AI\n# Build: ${b.label} | Client: ${b.client_name||"—"} <${b.client_email||""}> | ${ts}\nguardian:\n  license_key: "${b.license_key}"\n  license_validate_url: "${appUrl}/api/license-validate"\n  max_nodes: ${maxN}\n  scan_mode: "auto"\n  scan_interval: 300\n  scan_paths: [/host, /tmp, /var/www]\n  ai_pool:\n    routing: cost\n    fallback: true\n    providers:\n      - provider: openai\n        api_key: "sk-REPLACE_YOUR_KEY"\n        model: "gpt-4o-mini"\n      # - provider: groq\n      #   api_key: "gsk_REPLACE_ME"\n      # - provider: ollama\n      #   base_url: "http://localhost:11434"\n      #   model: "llama3"\n  alerts: { email: "", slack_webhook: "", discord_webhook: "" }\n  log_retention_days: 90\n`;

  const gCompose = `version: "3.9"\n# AXTO Guardian AI | Build: ${b.label} | ${ts}\nservices:\n  guardian-db:\n    image: postgres:16-alpine\n    restart: unless-stopped\n    environment:\n      POSTGRES_USER: guardian\n      POSTGRES_PASSWORD: \${GUARDIAN_DB_PASSWORD:?set GUARDIAN_DB_PASSWORD}\n      POSTGRES_DB: guardian\n    volumes: [guardian-db-data:/var/lib/postgresql/data]\n    networks: [guardian-net]\n  guardian-core:\n    image: ghcr.io/${owner}/guardian-core:${tag}\n    restart: unless-stopped\n    ports: ["8080:8080"]\n    volumes: [./guardian.yml:/guardian/config/guardian.yml:ro, guardian-data:/guardian/data]\n    environment: [GUARDIAN_CONFIG=/guardian/config/guardian.yml, "GUARDIAN_DB_URL=postgresql://guardian:\${GUARDIAN_DB_PASSWORD}@guardian-db:5432/guardian"]\n    networks: [guardian-net]\n  guardian-node:\n    image: ghcr.io/${owner}/guardian-node:${tag}\n    restart: unless-stopped\n    privileged: true\n    cap_add: [NET_ADMIN, SYS_PTRACE, KILL]\n    volumes: [/:/host:ro, ./guardian.yml:/guardian/config/guardian.yml:ro]\n    environment: [GUARDIAN_CORE_URL=http://guardian-core:8080]\n    networks: [guardian-net]\n  clamav:\n    image: ghcr.io/${owner}/guardian-clamav:${tag}\n    restart: unless-stopped\n    volumes: [clamav-db:/var/lib/clamav, /:/scan-host:ro]\n    networks: [guardian-net]\nvolumes: { guardian-db-data: {}, guardian-data: {}, clamav-db: {} }\nnetworks: { guardian-net: { driver: bridge } }\n`;

  const oYml = `# AXTO Orchestra AI\n# Build: ${b.label} | Client: ${b.client_name||"—"} | ${ts}\norchestra:\n  license_key: "${b.license_key}"\n  license_validate_url: "${appUrl}/api/license-validate"\n  console_password: "CHANGE_THIS_PASSWORD"\n  worker_token: "CHANGE_THIS_TOKEN"\n  max_workers: ${maxW}\n  ai_pool:\n    default_routing: cost\n    fallback: true\n    providers:\n      - provider: groq\n        api_key: "gsk_REPLACE_YOUR_GROQ_KEY"\n        model: "llama-3.1-8b-instant"\n      - provider: deepseek\n        api_key: "sk-REPLACE_YOUR_DEEPSEEK_KEY"\n        model: "deepseek-chat"\n  autoscaler: { enabled: false, threshold: 20, max_cpu_workers: ${maxW}, max_gpu_workers: ${maxG} }\n  log_retention_days: 90\n`;

  const oCompose = `version: "3.9"\n# AXTO Orchestra AI | Build: ${b.label} | ${ts}\nservices:\n  orchestra-db:\n    image: postgres:16-alpine\n    restart: unless-stopped\n    environment: { POSTGRES_USER: orchestra, POSTGRES_PASSWORD: "\${ORCHESTRA_DB_PASSWORD}", POSTGRES_DB: orchestra }\n    volumes: [orchestra-db-data:/var/lib/postgresql/data]\n    networks: [orchestra-net]\n  orchestra-core:\n    image: ghcr.io/${owner}/orchestra-core:${tag}\n    restart: unless-stopped\n    ports: ["8080:8080"]\n    volumes: [./orchestra.yml:/app/config/orchestra.yml:ro, orchestra-data:/app/data]\n    environment: [ORCHESTRA_CONFIG=/app/config/orchestra.yml, "DATABASE_URL=postgresql://orchestra:\${ORCHESTRA_DB_PASSWORD}@orchestra-db:5432/orchestra", "WORKER_TOKEN=\${WORKER_TOKEN}"]\n    networks: [orchestra-net]\n  worker-cpu:\n    image: ghcr.io/${owner}/orchestra-worker-cpu:${tag}\n    restart: unless-stopped\n    environment: [ORCHESTRA_CORE_URL=http://orchestra-core:8080, "ORCHESTRA_WORKER_TOKEN=\${WORKER_TOKEN}"]\n    networks: [orchestra-net]\n${maxG > 0 ? `  worker-gpu:\n    image: ghcr.io/${owner}/orchestra-worker-gpu:${tag}\n    restart: unless-stopped\n    runtime: nvidia\n    environment: [ORCHESTRA_CORE_URL=http://orchestra-core:8080, "ORCHESTRA_WORKER_TOKEN=\${WORKER_TOKEN}", WORKER_MODEL=llama3.2]\n    networks: [orchestra-net]` : ""}\nvolumes: { orchestra-db-data: {}, orchestra-data: {} }\nnetworks: { orchestra-net: { driver: bridge } }\n`;

  const archSlug = isWin ? "windows" : b.arch === "linux/arm64" ? "linux-arm64" : "linux";
  const installer = isWin
    ? `@echo off\nREM AXTO ${b.product} | ${b.label}\nnet session >nul 2>&1 || (echo Run as Administrator & pause & exit /b 1)\ndocker pull ghcr.io/${owner}/${b.product.includes("orchestra")?"orchestra-core":"guardian-core"}:${tag}\ndocker compose -f docker-compose.yml up -d\necho Ready: http://localhost:8080\npause`
    : `#!/bin/bash\n# AXTO ${b.product} | ${b.label}\nset -euo pipefail\ncommand -v docker &>/dev/null || { echo "Install Docker: https://docs.docker.com/get-docker/"; exit 1; }\n[ ! -f .env ] && printf 'GUARDIAN_DB_PASSWORD=%s\\nORCHESTRA_DB_PASSWORD=%s\\nWORKER_TOKEN=%s\\n' "$(openssl rand -hex 16)" "$(openssl rand -hex 16)" "$(openssl rand -hex 24)" > .env\ndocker compose pull\ndocker compose up -d\necho "Done! Dashboard: http://localhost:8080"`;

  const readme = `AXTO ${b.product}\nBuild : ${b.label}\nClient: ${b.client_name||"—"} <${b.client_email||""}>\nLicense: ${b.license_type}${b.trial_days>0?" ("+b.trial_days+"d)":""}\nNodes: ${b.unlimited?"∞":b.max_nodes} | GPU: ${b.unlimited?"∞":b.max_gpu} | Workers: ${b.unlimited?"∞":b.max_workers}\n\nQUICK START (Docker)\n1. Edit guardian.yml / orchestra.yml — add AI API keys + change passwords\n2. docker compose pull\n3. docker compose up -d\n4. Dashboard: http://YOUR_SERVER:8080\n\nQUICK START (EXE/Binary — Linux)\n1. chmod +x ./install.sh\n2. sudo ./install.sh\n3. Dashboard: http://YOUR_SERVER:8080\n\nSupport: hallo@axto.io | Portal: ${appUrl}/portal\n`;

  const isG = b.product.includes("guardian");
  const isO = b.product.includes("orchestra");
  const isB = b.product === "full-bundle";

  const files: any = { "README.txt": { content:readme, type:"text/plain" } };
  if (isG || isB) {
    files["guardian.yml"]       = { content:gYml,     type:"text/yaml" };
    files["guardian-compose.yml"] = { content:gCompose, type:"text/yaml" };
  }
  if (isO || isB) {
    files["orchestra.yml"]       = { content:oYml,     type:"text/yaml" };
    files["orchestra-compose.yml"] = { content:oCompose, type:"text/yaml" };
  }
  if (!isG && !isO && !isB) {
    files["docker-compose.yml"] = { content:gCompose, type:"text/yaml" };
    files["config.yml"]         = { content:gYml,     type:"text/yaml" };
  }
  if (b.build_type === "exe") {
    files[isWin?"install.bat":"install.sh"] = { content:installer, type:"text/plain" };
  }
  return files;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — list builds + stats
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  let db: any;
  try { db = getDB(req); } catch { return NextResponse.json({ error:"DB unavailable" }, { status:503 }); }

  const builds = await dbQuery<any>(db,
    `SELECT * FROM engine_builds WHERE deleted_at='' ORDER BY created_at DESC LIMIT 500`
  ).catch(() => []);

  const stats = await dbFirst<any>(db,
    `SELECT COUNT(*) as total,
       SUM(CASE WHEN status='ready'    THEN 1 ELSE 0 END) as ready,
       SUM(CASE WHEN status='building' THEN 1 ELSE 0 END) as building_count,
       SUM(CASE WHEN status='failed'   THEN 1 ELSE 0 END) as failed,
       SUM(COALESCE(file_size,0))                         as total_bytes
     FROM engine_builds WHERE deleted_at=''`
  ).catch(() => ({}));

  return NextResponse.json({
    builds: builds || [],
    stats: stats || {},
    hasGithubToken: !!process.env.GITHUB_TOKEN,
    hasR2: !!process.env.R2_ACCOUNT_ID,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — actions
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body: any = await req.json().catch(() => ({}));
  const { action } = body;

  // ── Webhook from GitHub Actions (no admin session — secured by secret) ────
  if (action === "webhook_build_complete") {
    const webhookSecret = process.env.BUILD_WEBHOOK_SECRET || "";
    const reqSecret     = req.headers.get("X-Build-Webhook-Secret") || "";
    if (!webhookSecret || reqSecret !== webhookSecret)
      return NextResponse.json({ error:"Unauthorized" }, { status:401 });

    let db: any;
    try { db = getDB(req); } catch { return NextResponse.json({ error:"DB unavailable" }, { status:503 }); }

    const { build_id, status, tag="", r2_key="", download_url="",
            run_url="", artifact_size=0 } = body;
    if (!build_id) return NextResponse.json({ error:"build_id required" }, { status:400 });

    const newStatus = status === "ready" ? "ready" : "failed";
    const sizeBytes = Number(artifact_size) || 0;
    const sizeMB    = sizeBytes > 0 ? `${Math.round(sizeBytes/1024/1024)}MB` : "—";
    // r2_key from GH Actions = builds/BUILD_ID/axto-product-type-arch.zip
    const storedR2Key = r2_key || "";
    // download_url: only used as fallback if no R2 (e.g. GH Release URL)
    const storedDlUrl = storedR2Key ? "" : (download_url || "");
    const releaseTag  = `build-${build_id}`;

    await dbRun(db,
      `UPDATE engine_builds
         SET status=?, r2_key=?, download_url=?, version=?, file_size=?, run_url=?, gh_release_tag=?, updated_at=?
       WHERE id=?`,
      [newStatus, storedR2Key, storedDlUrl, tag, sizeBytes, run_url, releaseTag, now(), build_id]
    );
    await dbRun(db,
      `INSERT INTO engine_build_logs (id,build_id,level,message,created_at) VALUES (?,?,?,?,?)`,
      [newId(), build_id, newStatus==="ready"?"info":"error",
        newStatus==="ready"
          ? `[✅] Build complete! Size: ${sizeMB}. ${storedR2Key ? "Stored in CF R2: "+storedR2Key : "URL: "+storedDlUrl}`
          : `[❌] Build failed. Run: ${run_url}`,
        now()]
    );
    // If stored on GH Release AND R2 both, clean up GH Release (no longer needed)
    if (storedR2Key && download_url && download_url.includes("github.com")) {
      deleteGitHubRelease(releaseTag); // fire-and-forget
    }
    return NextResponse.json({ ok:true });
  }

  // ── All other actions require admin session ───────────────────────────────
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  let db: any;
  try { db = getDB(req); } catch { return NextResponse.json({ error:"DB unavailable" }, { status:503 }); }

  // ── create_build ──────────────────────────────────────────────────────────
  if (action === "create_build") {
    const {
      build_type="docker", product="guardian", label="",
      license_type="yearly", trial_days=0,
      max_nodes=1, max_gpu=0, max_workers=10, unlimited=false,
      client_name="", client_email="", client_org="",
      arch="linux/amd64", notes="", version="latest",
      existing_license_key="",
    } = body;

    const validProducts = ["guardian-core","guardian-node","guardian-clamav","guardian-bundle",
                           "orchestra-core","orchestra-worker-cpu","orchestra-worker-gpu","orchestra-bundle","full-bundle"];
    if (!validProducts.includes(product))
      return NextResponse.json({ error:"Invalid product" }, { status:400 });

    let expires_at = "2099-12-31T23:59:59Z";
    if (license_type==="trial")   { const d=Math.min(Math.max(Number(trial_days)||3,1),7); const e=new Date(); e.setDate(e.getDate()+d); expires_at=e.toISOString(); }
    if (license_type==="monthly") { const e=new Date(); e.setMonth(e.getMonth()+1); expires_at=e.toISOString(); }
    if (license_type==="yearly")  { const e=new Date(); e.setFullYear(e.getFullYear()+1); expires_at=e.toISOString(); }

    const isOrchestra = product.startsWith("orchestra");
    const licKey = existing_license_key || generateLicenseKey(isOrchestra?"orchestra":"guardian");
    const id   = newId();
    const nN   = unlimited ? 9999 : Math.max(1, Number(max_nodes)||1);
    const nG   = unlimited ? 99   : Math.max(0, Number(max_gpu)||0);
    const nW   = unlimited ? 9999 : Math.max(1, Number(max_workers)||10);
    const lbl  = label || `${product}-${build_type}-${new Date().toISOString().slice(0,10)}`;

    // Pre-compute R2 key so GH Actions knows where to upload
    const r2Key = r2KeyForBuild(id, product, build_type, arch);

    await dbRun(db,
      `INSERT INTO engine_builds
         (id,build_type,product,status,label,license_key,license_type,trial_days,
          max_nodes,max_gpu,max_workers,unlimited,client_name,client_email,client_org,
          r2_key,download_url,file_size,run_url,gh_release_tag,version,arch,notes,
          expires_at,deleted_at,created_by,created_at,updated_at)
       VALUES (?,?,?,'building',?,?,?,?,?,?,?,?,?,?,?,?,''  ,0,'','',?,?,?,?,?,'admin',?,?)`,
      [id,build_type,product,lbl,licKey,license_type,Number(trial_days)||0,
       nN,nG,nW,unlimited?1:0,client_name,client_email,client_org,
       r2Key,        // pre-set R2 key so client/admin can find it
       version,arch,notes,expires_at,"",now(),now()]
    );

    const log = (level:string, msg:string) => dbRun(db,
      `INSERT INTO engine_build_logs (id,build_id,level,message,created_at) VALUES (?,?,?,?,?)`,
      [newId(),id,level,msg,now()]
    );

    await log("info", `[1/5] Build initiated — ${build_type.toUpperCase()} | ${product} | ${license_type} | ${arch}`);
    await log("info", `[2/5] License key generated — ${licKey.slice(0,12)}...`);
    await log("info", `[3/5] R2 destination set: ${r2Key}`);

    const hasGH = !!process.env.GITHUB_TOKEN;
    let ghTriggered = false;

    if (hasGH) {
      try {
        const gh = await triggerGitHubBuild({
          product, buildType:build_type, buildId:id, licenseKey:licKey,
          licenseType:license_type, trialDays:Number(trial_days)||0,
          maxNodes:nN, maxGpu:nG, maxWorkers:nW, unlimited:!!unlimited,
          arch, version, clientName:client_name, clientEmail:client_email,
          label:lbl, r2Key,
        });
        ghTriggered = gh.triggered;
        if (!ghTriggered)
          await log("warn", `[4/5] ⚠️ GitHub Actions dispatch failed (HTTP ${gh.status})`);
      } catch (e:any) {
        await log("warn", `[4/5] ⚠️ GitHub error: ${e.message}`);
      }
    }

    if (ghTriggered) {
      const sizeHint = build_type==="exe" ? "200MB–1GB per binary" : "200MB–2GB per image tarball";
      await log("info", `[4/5] 🔨 GitHub Actions compiling (${sizeHint}) → upload to CF R2 axto-storage/${r2Key}`);
      await log("info", `[5/5] ⏳ Waiting for compile… dashboard polls every 10s`);
    } else {
      // Config-only fallback
      await log("info", `[4/5] 📦 Config-only — no GITHUB_TOKEN. Client uses: docker compose pull && up -d`);
      await dbRun(db, `UPDATE engine_builds SET status='ready', updated_at=? WHERE id=?`, [now(),id]);
      await log("info", `[5/5] ✅ Config files ready`);
    }

    return NextResponse.json({ ok:true, id, licenseKey:licKey, githubTriggered:ghTriggered, configOnly:!ghTriggered, r2Key });
  }

  // ── get_progress ──────────────────────────────────────────────────────────
  if (action === "get_progress") {
    const { id } = body;
    if (!id) return NextResponse.json({ error:"id required" }, { status:400 });
    const build = await dbFirst<any>(db,
      `SELECT id,status,label,license_key,product,build_type,arch,expires_at,r2_key,download_url,run_url,file_size
       FROM engine_builds WHERE id=?`, [id]);
    const logs = await dbQuery<any>(db,
      `SELECT level,message,created_at FROM engine_build_logs WHERE build_id=? ORDER BY created_at ASC`, [id]
    ).catch(()=>[]);
    const steps  = (logs||[]).filter((l:any)=>/^\[\d/.test(l.message)).length;
    const isDone = build?.status==="ready" || build?.status==="failed";
    const pct    = isDone ? (build.status==="ready"?100:0) : Math.min(steps*20,80);
    return NextResponse.json({ build, logs:logs||[], progress:pct, run_url:build?.run_url||"" });
  }

  // ── get_download_files ────────────────────────────────────────────────────
  if (action === "get_download_files") {
    const { id } = body;
    if (!id) return NextResponse.json({ error:"id required" }, { status:400 });
    const build = await dbFirst<any>(db, `SELECT * FROM engine_builds WHERE id=? AND deleted_at=''`, [id]);
    if (!build) return NextResponse.json({ error:"Build not found" }, { status:404 });
    if (build.status !== "ready") return NextResponse.json({ error:"Build not ready yet" }, { status:400 });

    const hasBinary = !!build.r2_key;  // true = real artifact stored in CF R2
    const sizeMB    = build.file_size > 0 ? Math.round(build.file_size/1024/1024) : 0;

    return NextResponse.json({
      ok: true,
      build,
      has_binary:   hasBinary,
      file_size_mb: sizeMB,
      // Download via /api/admin/engine-builder/download?id=BUILD_ID (streams from R2)
      files: buildConfigFiles(build),
    });
  }

  // ── delete_build ──────────────────────────────────────────────────────────
  // hard=false → soft delete (hide from list, keep in DB + R2)
  // hard=true  → delete from DB + R2 + GitHub Release
  if (action === "delete_build") {
    const { id, hard=false } = body;
    if (!id) return NextResponse.json({ error:"id required" }, { status:400 });
    const build = await dbFirst<any>(db,
      `SELECT id,label,r2_key,gh_release_tag FROM engine_builds WHERE id=? AND deleted_at=''`, [id]);
    if (!build) return NextResponse.json({ error:"Not found" }, { status:404 });

    if (hard) {
      let r2Deleted = false;
      // Delete from CF R2
      if (build.r2_key) {
        try {
          const r2 = getR2Builds(req);
          await r2.delete(build.r2_key);
          r2Deleted = true;
        } catch {}
      }
      // Delete GitHub Release if still exists
      if (build.gh_release_tag) {
        deleteGitHubRelease(build.gh_release_tag);
      }
      // Hard delete from DB
      await dbRun(db, `DELETE FROM engine_build_logs WHERE build_id=?`, [id]);
      await dbRun(db, `DELETE FROM engine_builds WHERE id=?`, [id]);
      return NextResponse.json({ ok:true, hard:true, r2Deleted });
    } else {
      await dbRun(db, `UPDATE engine_builds SET status='deleted',deleted_at=?,updated_at=? WHERE id=?`, [now(),now(),id]);
      await dbRun(db, `INSERT INTO engine_build_logs (id,build_id,level,message,created_at) VALUES (?,?,?,?,?)`,
        [newId(),id,"warn","Soft-deleted by admin",now()]);
      return NextResponse.json({ ok:true, hard:false });
    }
  }

  // ── purge_all_deleted ─────────────────────────────────────────────────────
  if (action === "purge_all_deleted") {
    const rows = await dbQuery<any>(db,
      `SELECT id,r2_key,gh_release_tag FROM engine_builds WHERE deleted_at!=''`
    ).catch(()=>[]);
    let r2Count = 0;
    for (const r of (rows||[])) {
      if (r.r2_key) {
        try { const r2 = getR2Builds(req); await r2.delete(r.r2_key); r2Count++; } catch {}
      }
      if (r.gh_release_tag) deleteGitHubRelease(r.gh_release_tag);
      await dbRun(db, `DELETE FROM engine_build_logs WHERE build_id=?`, [r.id]);
      await dbRun(db, `DELETE FROM engine_builds WHERE id=?`, [r.id]);
    }
    return NextResponse.json({ ok:true, purged:(rows||[]).length, r2FilesDeleted:r2Count });
  }

  return NextResponse.json({ error:"Unknown action" }, { status:400 });
}
