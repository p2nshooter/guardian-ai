/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getR2Builds, getDB, dbFirst, dbRun, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * AXTO Engine Builder API — Dual CI/CD (GitHub Actions + GitLab CI)
 *
 * Both pipelines do the full job:
 *   GitHub Actions: build → upload R2
 *   GitLab CI:      build → push registry.gitlab.com → upload R2
 *
 * Auto-selection: if GITLAB_TRIGGER_TOKEN is set → GitLab first.
 * If not → GitHub. If both set → try GitLab, fallback GitHub.
 */

const PRODUCTS = [
  { id: "guardian-core",        icon: "🖥️", name: "Guardian Core",        group: "guardian",   color: "#0284c7", desc: "Central API + security dashboard" },
  { id: "guardian-node",        icon: "🤖", name: "Guardian Node Agent",  group: "guardian",   color: "#0284c7", desc: "Per-server threat detection" },
  { id: "guardian-antivirus",   icon: "🦠", name: "Guardian Antivirus",   group: "guardian",   color: "#0284c7", desc: "ClamAV + AI scanner" },
  { id: "orchestra-core",       icon: "⚡", name: "Orchestra Core",       group: "orchestra",  color: "#7c3aed", desc: "AI router + console" },
  { id: "orchestra-worker-cpu", icon: "💻", name: "Orchestra Worker CPU", group: "orchestra",  color: "#7c3aed", desc: "Cloud AI routing" },
  { id: "orchestra-worker-gpu", icon: "🎮", name: "Orchestra Worker GPU", group: "orchestra",  color: "#7c3aed", desc: "Local GPU inference" },
  { id: "vault-core",           icon: "🔐", name: "Vault Core",           group: "vault",      color: "#6366f1", desc: "AI Privacy Layer — PII/PHI/financial redaction" },
  { id: "edge-core",            icon: "🌐", name: "Edge Core",            group: "edge",       color: "#0891b2", desc: "AI Gateway — token metering & billing" },
  { id: "soc-core",             icon: "🛡️", name: "SOC Core",             group: "soc",        color: "#dc2626", desc: "SIEM + SOAR + threat intelligence" },
  { id: "compliance-core",      icon: "📋", name: "Compliance Core",      group: "compliance", color: "#16a34a", desc: "Automated audit — SOC2/ISO/HIPAA/GDPR" },
  { id: "sentinel-core",        icon: "📡", name: "Sentinel Core",        group: "sentinel",   color: "#ca8a04", desc: "IoT/OT security — device discovery & CVE" },
  { id: "antivirus-core",       icon: "🦠", name: "Antivirus Core",       group: "antivirus",  color: "#ea580c", desc: "ClamAV + ML behavioral detection" },
  { id: "legal-core",           icon: "⚖️", name: "AXTO Legal Core",      group: "legal",      color: "#0d9488", desc: "AI legal & compliance workflow — multi-jurisdiction, BYOK" },
];

const BUILDABLE_NOW = new Set([
  "guardian-core","guardian-node","guardian-antivirus",
  "orchestra-core","orchestra-worker-cpu","orchestra-worker-gpu",
  "vault-core","edge-core","soc-core","compliance-core","sentinel-core","antivirus-core",
  "legal-core",
]);

const BUILD_TYPES = ["image","exe"] as const;
type BuildType = typeof BUILD_TYPES[number];
type CIProvider = "github" | "gitlab" | "auto";

function r2LatestKey(product: string, type: BuildType) {
  return type === "image"
    ? `builds/latest/raw/${product}.tar.gz`
    : `builds/latest/exe/${product}-windows.exe`;
}
function r2VersionKey(product: string, type: BuildType, version: string) {
  return type === "image"
    ? `builds/${version}/raw/${product}.tar.gz`
    : `builds/${version}/exe/${product}-windows.exe`;
}

// ── GitHub Actions dispatch ───────────────────────────────────────────────────
async function triggerGitHub(
  product: string, type: BuildType, version: string,
  callbackUrl: string, env: Record<string,string>
) {
  const token = env.GITHUB_TOKEN;
  const repo  = env.GITHUB_REPO || "axto-platform/axto-products";
  if (!token) return { ok: false, error: "GITHUB_TOKEN not configured" };

  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Authorization:  `token ${token}`,
        Accept:         "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "build_product",
        client_payload: { product, build_type: type, version,
          r2_upload_key: r2LatestKey(product, type), callback_url: callbackUrl },
      }),
    });
    if (r.status === 204) return { ok: true, provider: "github",
      pipeline_url: `https://github.com/${repo}/actions` };
    const detail = await r.text().catch(()=>"");
    return { ok: false, error: `GitHub ${r.status}: ${detail.slice(0,200)}` };
  } catch(e:any) {
    return { ok: false, error: `GitHub error: ${e.message}` };
  }
}

// ── GitLab CI pipeline trigger ────────────────────────────────────────────────
async function triggerGitLab(
  product: string, type: BuildType, version: string,
  callbackUrl: string, env: Record<string,string>
) {
  const token     = env.GITLAB_TRIGGER_TOKEN;
  const projectId = env.GITLAB_PROJECT_ID;
  const ref       = env.GITLAB_BRANCH || "main";
  const host      = env.GITLAB_HOST   || "https://gitlab.com";

  if (!token || !projectId) return {
    ok: false,
    error: "GITLAB_TRIGGER_TOKEN and GITLAB_PROJECT_ID not configured. " +
           "Add them in Cloudflare Dashboard → Workers → axto-dashboard → Settings → Variables."
  };

  try {
    const vars = new URLSearchParams({
      token, ref,
      "variables[BUILD_PRODUCT]": product,
      "variables[BUILD_TYPE]":    type,
      "variables[BUILD_ID]":      version,
      "variables[CALLBACK_URL]":  callbackUrl,
    });

    const r = await fetch(
      `${host}/api/v4/projects/${encodeURIComponent(projectId)}/trigger/pipeline`,
      { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body: vars.toString() }
    );
    if (!r.ok) {
      const detail = await r.text().catch(()=>"");
      return { ok: false, error: `GitLab ${r.status}: ${detail.slice(0,200)}` };
    }
    const data:any = await r.json();
    const namespace = data.project?.path_with_namespace || projectId;
    return { ok: true, provider: "gitlab",
      pipeline_url: `${host}/${namespace}/-/pipelines/${data.id}`,
      pipeline_id: data.id };
  } catch(e:any) {
    return { ok: false, error: `GitLab error: ${e.message}` };
  }
}

// ── Dispatch to best available CI ────────────────────────────────────────────
async function dispatchBuild(
  product: string, type: BuildType, version: string,
  callbackUrl: string, env: Record<string,string>, prefer: CIProvider = "auto"
) {
  type Attempt = { provider: string; error?: string };
  const log: Attempt[] = [];

  // Determine order: GitLab primary (it's the primary repo), GitHub fallback
  let order: ("gitlab"|"github")[];
  if (prefer === "github")      order = ["github","gitlab"];
  else if (prefer === "gitlab") order = ["gitlab","github"];
  else order = env.GITLAB_TRIGGER_TOKEN ? ["gitlab","github"] : ["github","gitlab"];

  for (const p of order) {
    const res = p === "gitlab"
      ? await triggerGitLab(product, type, version, callbackUrl, env)
      : await triggerGitHub(product, type, version, callbackUrl, env);

    if (res.ok) return { ...res, log };
    log.push({ provider: p, error: (res as any).error });
  }

  return {
    ok: false,
    error: `CI dispatch failed on all providers. ` +
           log.map(l=>`${l.provider}: ${l.error}`).join(" | "),
    log,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// GET — Dashboard status
// ═════════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const env = (req as any).env || {};
  let r2: any = null; let r2Available = false;
  try { r2 = getR2Builds(req); r2Available = true; } catch {}
  let db: any = null; try { db = getDB(req); } catch {}

  // R2 file status
  const status: Record<string,any> = {};
  if (r2Available) {
    for (const p of PRODUCTS) {
      for (const t of BUILD_TYPES) {
        const head = await r2.head(r2LatestKey(p.id, t)).catch(()=>null);
        status[`${p.id}:${t}`] = head ? {
          exists: true, size: head.size,
          uploaded:  head.uploaded?.toISOString?.() || "",
          commit:    head.customMetadata?.commit    || "",
          build_date:head.customMetadata?.build_date || "",
        } : { exists: false };
      }
    }
  }

  // Active pipelines
  let activePipelines: any[] = [];
  if (db) {
    try {
      const rows = await db.prepare(
        `SELECT product, build_type as type, status, pipeline_url as url,
                pipeline_id, ci_provider, progress, build_id
         FROM product_builds WHERE status IN ('building','pending')
         ORDER BY created_at DESC LIMIT 30`
      ).all();
      activePipelines = rows?.results || [];
    } catch {}
  }

  // GitLab registry info
  const gitlabHost    = env.GITLAB_HOST || "https://gitlab.com";
  const gitlabProject = env.GITLAB_PROJECT_ID || "";
  const gitlabRegistry = gitlabProject
    ? `registry.gitlab.com/${gitlabProject}`
    : "registry.gitlab.com/axto-platform/axto-products";

  return NextResponse.json({
    products:       PRODUCTS,
    buildTypes:     BUILD_TYPES,
    buildableNow:   Array.from(BUILDABLE_NOW),
    status,
    r2Available,
    activePipelines,
    hasR2:          r2Available,
    hasGithub:      !!env.GITHUB_TOKEN,
    hasGitlab:      !!(env.GITLAB_TRIGGER_TOKEN && env.GITLAB_PROJECT_ID),
    hasCi:          !!(env.GITHUB_TOKEN || (env.GITLAB_TRIGGER_TOKEN && env.GITLAB_PROJECT_ID)),
    ciProviders: {
      github: {
        configured: !!env.GITHUB_TOKEN,
        repo:       env.GITHUB_REPO || "",
        actions_url:env.GITHUB_REPO ? `https://github.com/${env.GITHUB_REPO}/actions` : "",
      },
      gitlab: {
        configured: !!(env.GITLAB_TRIGGER_TOKEN && env.GITLAB_PROJECT_ID),
        project_id: gitlabProject,
        host:       gitlabHost,
        branch:     env.GITLAB_BRANCH || "main",
        registry:   gitlabRegistry,
        pipelines_url: gitlabProject
          ? `${gitlabHost}/${gitlabProject}/-/pipelines`
          : "",
      },
    },
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// POST — Actions
// ═════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body:any = {}; try { body = await req.json(); } catch {}
  const action = body.action || "trigger_build";

  const env = (req as any).env || {};
  let r2: any  = null; try { r2  = getR2Builds(req); } catch {}
  let db: any  = null; try { db  = getDB(req); } catch {}

  // ── Trigger build ──────────────────────────────────────────────────────────
  if (action === "trigger_build") {
    const product  = body.product   as string;
    const type     = (body.type     as BuildType) || "image";
    const version  = body.version   || `${new Date().toISOString().slice(0,10).replace(/-/g,"")}.${String(Date.now()).slice(-4)}`;
    const provider = (body.ci_provider || "auto") as CIProvider;

    if (!PRODUCTS.find(p=>p.id===product))
      return NextResponse.json({ error: `Unknown product: ${product}` }, { status: 400 });
    if (!BUILDABLE_NOW.has(product))
      return NextResponse.json({ error: `${product} is not yet buildable (coming soon).` }, { status: 400 });
    if (!BUILD_TYPES.includes(type))
      return NextResponse.json({ error: `Invalid type: ${type}` }, { status: 400 });

    const callbackUrl = env.AXTO_APP_URL ? `${env.AXTO_APP_URL}/api/admin/engine-builder` : "";
    const result = await dispatchBuild(product, type, version, callbackUrl, env, provider);

    if (db) {
      await db.prepare(
        `INSERT OR REPLACE INTO product_builds
           (id, product, build_type, status, pipeline_url, pipeline_id,
            ci_provider, progress, build_id, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        newId(), product, type,
        result.ok ? "building" : "failed",
        (result as any).pipeline_url || "",
        String((result as any).pipeline_id || ""),
        (result as any).provider || "unknown",
        0, version, now(), now()
      ).run().catch(()=>{});
    }

    return NextResponse.json({
      ok:           result.ok,
      product, type, version,
      provider:     (result as any).provider,
      pipeline_url: (result as any).pipeline_url,
      pipeline_id:  (result as any).pipeline_id,
      error:        (result as any).error,
      log:          (result as any).log,
      message: result.ok
        ? `Build triggered via ${(result as any).provider} — ${product} (${type}). Monitor: ${(result as any).pipeline_url}`
        : `Build failed: ${(result as any).error}`,
    });
  }

  // ── Check status ──────────────────────────────────────────────────────────
  if (action === "check_build_status") {
    const product = body.product as string;
    const type    = body.type    as BuildType;

    if (r2) {
      const head = await r2.head(r2LatestKey(product, type)).catch(()=>null);
      if (head) {
        if (db) await db.prepare(
          `UPDATE product_builds SET status='ready',progress=100,updated_at=?
           WHERE product=? AND build_type=? AND status IN ('building','pending')`
        ).bind(now(),product,type).run().catch(()=>{});
        return NextResponse.json({ done:true, status:"ready",
          size:head.size, uploaded:head.uploaded?.toISOString?.()||"",
          commit:head.customMetadata?.commit||"" });
      }
    }

    if (db) {
      try {
        const row = await db.prepare(
          `SELECT status,progress,pipeline_url,pipeline_id,ci_provider
           FROM product_builds WHERE product=? AND build_type=?
           ORDER BY created_at DESC LIMIT 1`
        ).bind(product,type).first();
        if (row) return NextResponse.json({
          done: row.status==="ready"||row.status==="failed",
          status: row.status, progress: row.progress||0,
          pipeline_url: row.pipeline_url, ci_provider: row.ci_provider,
        });
      } catch {}
    }

    return NextResponse.json({ done:false, status:"unknown", progress:0 });
  }

  // ── Webhook callback from CI ───────────────────────────────────────────────
  if (action === "build_callback") {
    const secret   = env.BUILD_WEBHOOK_SECRET;
    const incoming = req.headers.get("x-webhook-secret");
    if (secret && incoming !== secret)
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });

    const { product, type, status: st, pipeline_url } = body;
    const isSuccess = st === "success";

    if (db && product && type) {
      await db.prepare(
        `UPDATE product_builds
         SET status=?, progress=?, pipeline_url=COALESCE(?,pipeline_url), updated_at=?
         WHERE product=? AND build_type=? AND status IN ('building','pending')`
      ).bind(isSuccess?"ready":"failed", isSuccess?100:0,
             pipeline_url||null, now(), product, type
      ).run().catch(()=>{});
    }

    return NextResponse.json({ ok:true, product, type, status: isSuccess?"ready":"failed" });
  }

  // ── Manual upload ──────────────────────────────────────────────────────────
  if (action === "upload") {
    if (!r2) return NextResponse.json({ error: "R2 not configured" }, { status: 503 });
    const product = body.product as string;
    const type    = body.type    as BuildType;
    const version = body.version || "manual";
    const b64     = body.content as string;

    if (!PRODUCTS.find(p=>p.id===product))
      return NextResponse.json({ error: `Unknown product: ${product}` }, { status: 400 });
    if (!b64)
      return NextResponse.json({ error: "content (base64) required" }, { status: 400 });

    const bytes  = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
    const ct     = type==="image" ? "application/gzip" : "application/octet-stream";
    const meta   = { product, type, version, build_date: new Date().toISOString(), manual:"true" };

    await r2.put(r2LatestKey(product,type),        bytes, { httpMetadata:{contentType:ct}, customMetadata:meta });
    await r2.put(r2VersionKey(product,type,version),bytes, { httpMetadata:{contentType:ct}, customMetadata:meta });

    if (db) await db.prepare(
      `INSERT OR REPLACE INTO product_builds
         (id,product,build_type,status,progress,ci_provider,build_id,created_at,updated_at)
       VALUES (?,?,?,'ready',100,'manual',?,?,?)`
    ).bind(newId(),product,type,version,now(),now()).run().catch(()=>{});

    return NextResponse.json({ ok:true, product, type, version,
      r2_key:r2LatestKey(product,type), size:bytes.length });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  if (action === "delete") {
    if (!r2) return NextResponse.json({ error: "R2 not configured" }, { status: 503 });
    const product = body.product as string;
    const type    = body.type    as BuildType;

    await r2.delete(r2LatestKey(product,type)).catch(()=>{});
    if (db) await db.prepare(
      `UPDATE product_builds SET status='pending',progress=0,updated_at=?
       WHERE product=? AND build_type=?`
    ).bind(now(),product,type).run().catch(()=>{});

    return NextResponse.json({ ok:true, deleted: r2LatestKey(product,type) });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
