/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 * POST /api/license-validate — called by every self-hosted engine (Docker/EXE).
 *
 * v3: PAID LICENCES ONLY. The Free Full-Access Program has ended; its shared
 * keys (<PREFIX>-FREE-ACCESS-2026) receive a signed "program_ended" answer so
 * engines lock themselves read-only with a clear message.
 *
 * Wire protocol is unchanged from v2 so existing engines keep working:
 *   • every licence-specific answer is Ed25519-signed (lib/license-signing.ts)
 *   • the signed payload binds key, machine, product, status, expiry and the
 *     serialized entitlements, so no MITM or local edit can unlock a higher tier
 *   • licences are always issued at the TOP tier of each engine
 * D1-lean: no heartbeat log table — one row update at most once per hour.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, now } from "@/lib/db";
import { signLicenseResponse, SignableLicenseFields } from "@/lib/license-signing";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { SELF_HOSTED, productFromKey } from "@/lib/selfhosted";
import { absoluteUrl } from "@/lib/site";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};
const PORTAL = absoluteUrl("/app/self-hosted");
const PRICING = absoluteUrl("/pricing");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

async function signed(body: Record<string, any>, sign: SignableLicenseFields, status = 200) {
  return NextResponse.json({ ...body, ...(await signLicenseResponse(sign)) }, { status, headers: CORS });
}

function plain(body: Record<string, any>, status = 200) {
  return NextResponse.json(body, { status, headers: CORS });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const ipLimit = await rateLimit(req, "license-validate-ip", ip, { max: 40, windowSeconds: 60 });
  if (ipLimit.limited) {
    return NextResponse.json({ valid: false, error: "Too many validation requests from this IP. Please slow down." },
      { status: 429, headers: { ...CORS, "Retry-After": String(ipLimit.retryAfterSeconds) } });
  }

  let body: any;
  try { body = await req.json(); } catch { return plain({ valid: false, error: "Invalid JSON request body" }, 400); }

  const {
    license_key, machine_id, product: requestedProduct, node_count,
    version: versionField, vault_version, guardian_version, orchestra_version,
    edge_version, soc_version, compliance_version, sentinel_version,
  } = body || {};
  if (!license_key || typeof license_key !== "string") return plain({ valid: false, error: "license_key is required" }, 400);

  const key = license_key.trim().toUpperCase();
  const mid = typeof machine_id === "string" ? machine_id.trim().slice(0, 200) : "";
  const keyLimit = await rateLimit(req, "license-validate-key", key, { max: 30, windowSeconds: 60 });
  if (keyLimit.limited) {
    return NextResponse.json({ valid: false, error: "Too many validation requests for this license key. Please slow down." },
      { status: 429, headers: { ...CORS, "Retry-After": String(keyLimit.retryAfterSeconds) } });
  }

  const keyProduct = productFromKey(key);
  if (!keyProduct) {
    return plain({ valid: false, error: `Unrecognized license key format. Key must start with one of: ${SELF_HOSTED.map((p) => p.keyPrefix + "-").join(", ")}` });
  }

  // ── Former free-program keys: signed lock ────────────────────────────────
  if (/-FREE-ACCESS-\d{4}$/.test(key)) {
    return signed({
      valid: false, reason: "program_ended",
      error: `The AXTO free program has ended. This app is now locked (read-only) — your data is untouched. Subscribe to a Business or Enterprise plan at ${PRICING} and paste your licence key from ${PORTAL} to continue.`,
      renew_url: PRICING,
    }, { licenseKey: key, machineId: mid, product: keyProduct, valid: false, status: "program_ended", expiresAt: new Date().toISOString() });
  }

  let db: any;
  try { db = getDB(req); } catch { return plain({ valid: false, error: "Service temporarily unavailable. Try again in a moment." }, 503); }

  const lic = await dbFirst<any>(db,
    `SELECT l.*, u.name AS client_name, u.organization AS organization, u.status AS user_status
       FROM sh_licenses l LEFT JOIN users u ON u.id = l.user_id WHERE l.license_key = ?`, [key]);
  if (!lic) return plain({ valid: false, error: `License key not found. Get your key at ${PORTAL}` });

  const sign = (status: string, valid = false, extra: Partial<SignableLicenseFields> = {}): SignableLicenseFields =>
    ({ licenseKey: key, machineId: mid, product: lic.product, valid, status, expiresAt: lic.expires_at, ...extra });

  if (lic.status === "revoked") {
    return signed({ valid: false, reason: "revoked", error: "License has been revoked. Contact hello@axto.io for assistance." }, sign("revoked"));
  }
  if (lic.status === "suspended" || (lic.user_status && lic.user_status !== "active")) {
    return signed({ valid: false, reason: "suspended", error: `License is suspended — your plan no longer includes this app. Manage it at ${PORTAL}.`, renew_url: PORTAL }, sign("suspended"));
  }
  const expiresAt = new Date(lic.expires_at);
  if (!(expiresAt.getTime() > Date.now())) {
    return signed({ valid: false, reason: "expired", error: `License expired. Renew your plan at ${PORTAL} to restore access.`, expired_at: lic.expires_at, renew_url: PORTAL }, sign("expired"));
  }

  const reqProduct = String(requestedProduct || "").toLowerCase().trim();
  const licProduct = String(lic.product).toLowerCase();
  if (reqProduct && reqProduct !== licProduct) {
    const expected = SELF_HOSTED.find((p) => p.slug === reqProduct)?.keyPrefix;
    return signed({
      valid: false, reason: "product_mismatch", key_is_for: lic.product,
      error: `This key is for "${lic.product}", not "${reqProduct}". Use a ${expected ? expected + "-" : ""}key for ${reqProduct}.`,
    }, sign("product_mismatch"));
  }

  if (mid) {
    if (!lic.bound_machine_id) {
      await dbRun(db, `UPDATE sh_licenses SET bound_machine_id = ?, updated_at = ? WHERE id = ? AND bound_machine_id = ''`, [mid, now(), lic.id]).catch(() => {});
    } else if (lic.bound_machine_id !== mid) {
      return signed({ valid: false, reason: "machine_mismatch", error: `License is bound to a different server. Reset the binding at ${PORTAL}.`, reset_url: PORTAL }, sign("machine_mismatch"));
    }
  }

  const maxNodes = Number(lic.max_nodes ?? 1);
  if (maxNodes !== -1 && typeof node_count === "number" && node_count > maxNodes) {
    return signed({
      valid: false, reason: "node_limit_exceeded", max_nodes: maxNodes, current_nodes: node_count, upgrade_url: PRICING,
      error: `Node limit exceeded. Your ${lic.product} licence allows ${maxNodes} node(s); you have ${node_count}. Upgrade to Enterprise for unlimited nodes.`,
    }, sign("node_limit_exceeded"));
  }

  // Heartbeat: a single row update, at most once per hour.
  const version = String(versionField || guardian_version || orchestra_version || vault_version || edge_version || soc_version || compliance_version || sentinel_version || "unknown").slice(0, 40);
  dbRun(db,
    `UPDATE sh_licenses SET last_seen_at = ?, last_version = ?, last_ip = ? WHERE id = ? AND (last_seen_at = '' OR last_seen_at < ?)`,
    [now(), version, ip, lic.id, new Date(Date.now() - 3600_000).toISOString()]).catch(() => {});

  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  const features = buildFeatures(licProduct, lic.package_code, maxNodes);
  const response: Record<string, any> = {
    valid: true, status: "active", license_key: key, product: lic.product,
    package: lic.package_code, package_code: lic.package_code, expires_at: lic.expires_at,
    days_left: daysLeft, max_nodes: maxNodes, client_name: lic.client_name || "", organization: lic.organization || "",
    features,
  };
  if (daysLeft <= 14) response.warning = `License renews with your plan in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Keep your plan active at ${PORTAL}.`;
  if (daysLeft <= 3) response.critical_warning = `⚠️ License expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}! Renew your plan at ${PORTAL}.`;

  return signed(response, sign("active", true, { entitlements: serializeEntitlements(features, lic.package_code) }));
}

// Deterministic, signable entitlements: "package=<code>;<k>=<v>;…" (keys sorted).
function serializeEntitlements(features: Record<string, any>, packageCode: string): string {
  const parts = [`package=${packageCode || ""}`];
  for (const k of Object.keys(features).sort()) {
    const v = features[k];
    parts.push(`${k}=${typeof v === "boolean" ? (v ? "true" : "false") : String(v)}`);
  }
  return parts.join(";");
}

// Top-tier feature sets — identical to the v2 server's answers for the top
// package of each engine, so the engines unlock their most complete version.
function buildFeatures(product: string, packageCode: string, maxNodes: number): Record<string, any> {
  const base = { ai_pool: true, support_chat: true, byok: true, self_hosted: true };
  switch (product) {
    case "guardian":
      return { ...base, max_nodes: maxNodes, compliance_reports: true, threat_hunting: true, ebpf: true, mtls: true, multi_tenant: true, white_label: true };
    case "orchestra":
      return { ...base, max_workers: maxNodes, gpu_workers: true, autoscaler: true, cost_analytics: true, federation: true };
    case "vault":
      return { ...base, pii_redaction: true, phi_redaction: true, financial_redaction: true, audit_trail: true, custom_policies: true, soc2_report: true, hipaa_report: true, multi_tenant: true, siem_integration: true, max_requests_daily: -1 };
    case "edge":
      return { ...base, rate_limiting: true, token_metering: true, abuse_detection: true };
    case "soc":
      return { ...base, siem: true, soar: true, threat_hunting: true, incident_management: true };
    case "compliance":
      return { ...base, soc2: true, iso27001: true, hipaa: true, pci_dss: true, gdpr: true };
    case "sentinel":
      return { ...base, iot_monitoring: true, ot_security: true, max_devices: maxNodes };
    case "antivirus":
      return { ...base, clamav: true, yara_rules: true, rest_api: true, guardian_ml: true };
    case "studio":
      return { ...base, central_ai_pool: true, gpu_pool: true, byo_gpu: true, image_generation: true, max_concurrent_jobs: maxNodes, studios: ["ai", "gpu", "hybrid"], hybrid_pool: true };
    case "legal":
      return { ...base, air_gapped: true, regulatory_updates: true, document_analysis: true, prompt_library: true, ai_task_advisor: true, max_countries: -1, workspaces: -1, max_frameworks: -1, multi_jurisdiction: true, byo_everything: true, offline_storage: true };
    default:
      return base;
  }
}
