/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ═══════════════════════════════════════════════════════════════════════════
// AXTO Platform — /api/license-validate (HARDENED)
// Supports all products: guardian, orchestra, vault, edge, soc, compliance,
// sentinel, antivirus.
//
// HARDENING ADDED IN THIS REVISION (see AXTO Security Hardening Report):
//   1. Every response is now signed with Ed25519 (lib/license-signing.ts).
//      On-prem products verify this signature locally before trusting
//      "valid": true, which defeats DNS-spoofing / rogue-proxy / fake
//      "axto.io" MITM attacks that previously could return a hand-crafted
//      {"valid":true} JSON body and be believed unconditionally.
//   2. Per-IP and per-license-key rate limiting (lib/rate-limit.ts) blocks
//      brute-force probing of the key space and volumetric abuse.
//   3. All existing validation logic (status checks, expiry, product
//      mismatch, machine binding, node limits, heartbeat logging) is
//      UNCHANGED — every license issued before this patch keeps working
//      exactly as before; this is purely additive hardening.
// ═══════════════════════════════════════════════════════════════════════════
export const runtime  = "edge";
export const dynamic  = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, newId, now } from "@/lib/db";
import { signLicenseResponse, SignableLicenseFields } from "@/lib/license-signing";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  resolveFreeAccess, computeFreeAccess, isFreeAccessKey, freeTopPackage,
  FREE_ACCESS_PROGRAM_NAME,
} from "@/lib/free-access";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── Product prefix map (must match generateLicenseKey in lib/license.ts) ────
const KEY_PREFIXES: Record<string, string> = {
  "GUARD": "guardian",
  "ORCH":  "orchestra",
  "VAULT": "vault",
  "EDGE":  "edge",
  "SOC":   "soc",
  "CMPL":  "compliance",
  "SNTL":  "sentinel",
  "AV":    "antivirus",
  "STUD":  "studio",     // AXTO Studio — Central AI & GPU Pool
  "LEGL":  "legal",      // AXTO Legal — AI Legal & Compliance Workflow
  "YP":    "yp",         // Yusron Power — super-enterprise super-application
};

// ── Derive product from key prefix ────────────────────────────────────────────
function productFromKey(key: string): string | null {
  const parts = key.split("-");
  if (parts.length < 2) return null;
  return KEY_PREFIXES[parts[0]] ?? null;
}

// ── Signs a per-license decision and returns it. Generic protocol-level
//    errors (bad JSON, rate limited, unrecognized format) are NOT signed —
//    they carry no specific claim about a license's status, so there is
//    nothing meaningful to authenticate. Every response that makes a claim
//    about a SPECIFIC license_key's status (valid, revoked, expired,
//    suspended, mismatched, over limit) IS signed, in both the true and
//    false case, so a MITM cannot strip a genuine "invalid" signature and
//    substitute a forged "valid" one. ─────────────────────────────────────
async function signedJson(
  body: Record<string, any>,
  sign: SignableLicenseFields,
  status: number = 200
) {
  const signed = await signLicenseResponse(sign);
  return NextResponse.json({ ...body, ...signed }, { status, headers: CORS });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  // ── Rate limit by IP first — cheapest possible defense against floods ────
  const ipLimit = await rateLimit(req, "license-validate-ip", ip, { max: 40, windowSeconds: 60 });
  if (ipLimit.limited) {
    return NextResponse.json(
      { valid: false, error: "Too many validation requests from this IP. Please slow down." },
      { status: 429, headers: { ...CORS, "Retry-After": String(ipLimit.retryAfterSeconds) } }
    );
  }

  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json(
      { valid: false, error: "Invalid JSON request body" },
      { status: 400, headers: CORS }
    );
  }

  const {
    license_key, machine_id, product: requestedProduct,
    node_count, hostname,
    // "version" is the canonical field sent by all engine clients (v2.0.0+).
    // Product-specific legacy fields kept for backward compatibility.
    version: versionField,
    vault_version, guardian_version, orchestra_version,
    edge_version, soc_version, compliance_version, sentinel_version,
  } = body;

  if (!license_key || typeof license_key !== "string") {
    return NextResponse.json(
      { valid: false, error: "license_key is required" },
      { status: 400, headers: CORS }
    );
  }

  const cleanKey = license_key.trim().toUpperCase();
  const mid = (typeof machine_id === "string" ? machine_id.trim() : "") || "";

  // ── Rate limit by license key — caps abuse of a single (possibly leaked
  //    or guessed) key independent of how many different IPs it's tried from
  const keyLimit = await rateLimit(req, "license-validate-key", cleanKey, { max: 30, windowSeconds: 60 });
  if (keyLimit.limited) {
    return NextResponse.json(
      { valid: false, error: "Too many validation requests for this license key. Please slow down." },
      { status: 429, headers: { ...CORS, "Retry-After": String(keyLimit.retryAfterSeconds) } }
    );
  }

  // ── Validate key format ───────────────────────────────────────────────────
  const keyPrefix = cleanKey.split("-")[0];
  const keyProduct = KEY_PREFIXES[keyPrefix];
  if (!keyProduct) {
    return NextResponse.json({
      valid: false,
      error: `Unrecognized license key format. Key must start with one of: ${Object.keys(KEY_PREFIXES).map(p => p + "-").join(", ")}`,
    }, { headers: CORS });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json(
      { valid: false, error: "Service temporarily unavailable. Try again in a moment." },
      { status: 503, headers: CORS }
    );
  }

  // ── Lookup license ────────────────────────────────────────────────────────
  const lic = await dbFirst<any>(db,
    `SELECT l.*, c.name as client_name, c.email as client_email, c.organization
     FROM licenses l LEFT JOIN clients c ON c.id = l.client_id
     WHERE l.license_key = ?`,
    [cleanKey]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // AXTO Free Full-Access Program — full-tier grant, no paid licence required
  // ---------------------------------------------------------------------------
  // While the program window is OPEN, every recognised product key is granted
  // full access until the GLOBAL program end date. Revoked / suspended keys are
  // still blocked (abuse control). The grant's expires_at == the program end,
  // so when the window closes each on-prem engine's own expiry check trips and
  // it locks itself (read-only) with a clear message — no destructive code.
  // ═══════════════════════════════════════════════════════════════════════════
  const faStatus = computeFreeAccess(await resolveFreeAccess(req));
  if (faStatus.active) {
    // Respect explicit bans even during the free program.
    if (lic && lic.status === "revoked") {
      return signedJson({
        valid: false, reason: "revoked",
        error: "License has been revoked. Contact hello@axto.io for assistance.",
      }, {
        licenseKey: cleanKey, machineId: mid, product: lic.product,
        valid: false, status: "revoked", expiresAt: lic.expires_at,
      });
    }
    if (lic && lic.status === "suspended") {
      return signedJson({
        valid: false, reason: "suspended",
        error: "License is suspended. Log in to axto.io/portal to view details.",
      }, {
        licenseKey: cleanKey, machineId: mid, product: lic.product,
        valid: false, status: "suspended", expiresAt: lic.expires_at,
      });
    }

    const licProductLc  = (lic?.product || "").toLowerCase().trim();
    const reqProductLc   = (requestedProduct || "").toLowerCase().trim();
    const effectiveProduct = licProductLc || keyProduct; // keyProduct: from prefix
    if (reqProductLc && reqProductLc !== effectiveProduct) {
      const expectedPrefix = Object.entries(KEY_PREFIXES).find(([, v]) => v === reqProductLc)?.[0];
      return signedJson({
        valid: false, reason: "product_mismatch",
        error: `This key is for "${effectiveProduct}", not "${reqProductLc}". Use a ${expectedPrefix ? expectedPrefix + "-" : ""}key for ${reqProductLc}.`,
      }, {
        licenseKey: cleanKey, machineId: mid, product: effectiveProduct,
        valid: false, status: "product_mismatch", expiresAt: faStatus.endISO,
      });
    }

    // Grant expires at the program end — unless a real paid licence outlasts it,
    // in which case the paying customer keeps their longer term.
    const grantExpiresISO =
      lic && new Date(lic.expires_at).getTime() > new Date(faStatus.endISO).getTime()
        ? lic.expires_at
        : faStatus.endISO;

    const freePkg  = freeTopPackage(effectiveProduct);
    const features = buildFeatures(effectiveProduct, freePkg, -1); // -1 = unlimited nodes

    // Best-effort heartbeat only when a real licence row exists (shared free
    // keys have no row; we don't fabricate one here).
    if (lic?.id) {
      const hbVersion = versionField
        || guardian_version || orchestra_version || vault_version
        || edge_version || soc_version || compliance_version || sentinel_version
        || "unknown";
      dbRun(db,
        `INSERT INTO license_heartbeats
           (id, license_id, machine_id, hostname, ip, product, version, node_count, worker_count, health, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [newId(), lic.id, mid, hostname || "", ip, effectiveProduct, hbVersion,
         node_count ?? 0, effectiveProduct === "orchestra" ? (node_count ?? 0) : 0, "{}", now()]
      ).catch(() => {});
    }

    const response: Record<string, any> = {
      valid:        true,
      status:       "active",
      access_mode:  "free_program",
      program:      FREE_ACCESS_PROGRAM_NAME,
      license_key:  cleanKey,
      product:      effectiveProduct,
      package:      freePkg,
      package_code: freePkg,
      expires_at:   grantExpiresISO,
      days_left:    faStatus.daysLeft,
      max_nodes:    -1,
      client_name:  lic?.client_name || "",
      organization: lic?.organization || "",
      features,
      notice: `${FREE_ACCESS_PROGRAM_NAME}: full access is free until ${faStatus.endISO.slice(0, 10)}. No licence key required. When the program ends the app locks to read-only — your data and files stay untouched. Back up anything you need before then.`,
    };
    if (faStatus.daysLeft <= 60) {
      response.warning = `Free access ends in ${faStatus.daysLeft} day${faStatus.daysLeft === 1 ? "" : "s"} (${faStatus.endISO.slice(0, 10)}). Export/back up your data before then; the app will lock to read-only afterwards.`;
    }
    if (faStatus.daysLeft <= 14) {
      response.critical_warning = `⚠️ Free access ends in ${faStatus.daysLeft} day${faStatus.daysLeft === 1 ? "" : "s"}. Back up now — the app locks to read-only on ${faStatus.endISO.slice(0, 10)}.`;
    }

    return signedJson(response, {
      licenseKey: cleanKey, machineId: mid, product: effectiveProduct,
      valid: true, status: "active", expiresAt: grantExpiresISO,
      entitlements: serializeEntitlements(features, freePkg),
    });
  }

  // Free program has CLOSED and this is a free key with no paid licence behind
  // it → the app should lock (read-only). Signed so the engine trusts the lock.
  if (isFreeAccessKey(cleanKey) && !lic) {
    return signedJson({
      valid: false, reason: "program_ended", access_mode: "free_program",
      program: FREE_ACCESS_PROGRAM_NAME,
      error: `${FREE_ACCESS_PROGRAM_NAME} has ended. The app is now locked (read-only). Your data and files were left untouched. Visit axto.io/portal for options.`,
      renew_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://axto.io"}/portal`,
    }, {
      licenseKey: cleanKey, machineId: mid, product: keyProduct,
      valid: false, status: "program_ended", expiresAt: faStatus.endISO,
    });
  }

  if (!lic) {
    return NextResponse.json({
      valid: false,
      error: "License key not found. Verify your key at axto.io/portal",
    }, { headers: CORS });
  }

  // ── Status checks ─────────────────────────────────────────────────────────
  if (lic.status === "revoked") {
    return signedJson({
      valid: false, reason: "revoked",
      error: "License has been revoked. Contact hello@axto.io for assistance.",
    }, {
      licenseKey: cleanKey, machineId: mid, product: lic.product,
      valid: false, status: "revoked", expiresAt: lic.expires_at,
    });
  }
  if (lic.status === "suspended") {
    return signedJson({
      valid: false, reason: "suspended",
      error: "License is suspended. Log in to axto.io/portal to view details.",
    }, {
      licenseKey: cleanKey, machineId: mid, product: lic.product,
      valid: false, status: "suspended", expiresAt: lic.expires_at,
    });
  }

  // ── Expiry check ──────────────────────────────────────────────────────────
  const expiresAt  = new Date(lic.expires_at);
  const isExpired  = expiresAt < new Date();
  if (isExpired) {
    if (lic.status !== "expired") {
      await dbRun(db,
        `UPDATE licenses SET status='expired', updated_at=? WHERE id=?`,
        [now(), lic.id]
      ).catch(() => {});
    }
    return signedJson({
      valid: false, reason: "expired",
      error: "License expired. Renew at axto.io/portal to restore access.",
      expired_at:  lic.expires_at,
      renew_url:   `${process.env.NEXT_PUBLIC_APP_URL || "https://axto.io"}/portal`,
    }, {
      licenseKey: cleanKey, machineId: mid, product: lic.product,
      valid: false, status: "expired", expiresAt: lic.expires_at,
    });
  }

  // ── Product mismatch check ────────────────────────────────────────────────
  // Only check if the engine tells us what product it is
  const reqProduct = (requestedProduct || "").toLowerCase().trim();
  const licProduct = (lic.product || "").toLowerCase().trim();

  if (reqProduct && licProduct && reqProduct !== licProduct) {
    const expectedPrefix = Object.entries(KEY_PREFIXES)
      .find(([, v]) => v === reqProduct)?.[0];
    return signedJson({
      valid:        false,
      reason:       "product_mismatch",
      error:        `This key is for "${lic.product}", not "${reqProduct}". Use a ${expectedPrefix ? expectedPrefix + "-" : ""}key for ${reqProduct}.`,
      key_is_for:   lic.product,
      message:      `Wrong product. Your key activates ${lic.product}. You need a ${reqProduct} license key from axto.io/portal.`,
    }, {
      licenseKey: cleanKey, machineId: mid, product: lic.product,
      valid: false, status: "product_mismatch", expiresAt: lic.expires_at,
    });
  }

  // ── Machine binding ───────────────────────────────────────────────────────
  if (mid) {
    if (!lic.bound_machine_id) {
      // First activation — bind to this machine
      await dbRun(db,
        `UPDATE licenses SET bound_machine_id=?, updated_at=? WHERE id=?`,
        [mid, now(), lic.id]
      ).catch(() => {});
    } else if (lic.bound_machine_id !== mid) {
      return signedJson({
        valid:     false,
        reason:    "machine_mismatch",
        error:     "License is bound to a different server. Reset machine binding from axto.io/portal.",
        reset_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://axto.io"}/portal`,
      }, {
        // Sign for the machine_id THAT WAS ACTUALLY REQUESTED, not the bound
        // one — this lets a legitimate client tell "this isn't me" apart
        // from a generic error, while still proving the rejection itself
        // came from axto.io and wasn't injected by a network attacker
        // trying to trick a client into accepting a different machine_id.
        licenseKey: cleanKey, machineId: mid, product: lic.product,
        valid: false, status: "machine_mismatch", expiresAt: lic.expires_at,
      });
    }
  }

  // ── Node/instance limit check ─────────────────────────────────────────────
  const maxNodes = lic.max_nodes ?? 1;
  if (maxNodes !== -1 && typeof node_count === "number" && node_count > maxNodes) {
    return signedJson({
      valid:         false,
      reason:        "node_limit_exceeded",
      error:         `Node limit exceeded. Your ${lic.product} license allows ${maxNodes} node(s), you have ${node_count}. Upgrade at axto.io/portal.`,
      max_nodes:     maxNodes,
      current_nodes: node_count,
      upgrade_url:   `${process.env.NEXT_PUBLIC_APP_URL || "https://axto.io"}/portal`,
    }, {
      licenseKey: cleanKey, machineId: mid, product: lic.product,
      valid: false, status: "node_limit_exceeded", expiresAt: lic.expires_at,
    });
  }

  // ── Record heartbeat (non-blocking) ──────────────────────────────────────
  // Resolve engine version: canonical "version" field (all v2.0.0+ engines) first,
  // then legacy product-specific fields for backward compatibility.
  const version = versionField
    || guardian_version || orchestra_version || vault_version
    || edge_version || soc_version || compliance_version || sentinel_version
    || "unknown";

  dbRun(db,
    `INSERT INTO license_heartbeats
       (id, license_id, machine_id, hostname, ip, product, version, node_count, worker_count, health, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      newId(), lic.id,
      mid,
      hostname   || "",
      ip,
      reqProduct || licProduct || "unknown",
      version,
      node_count ?? 0,
      licProduct === "orchestra" ? (node_count ?? 0) : 0,
      "{}",
      now(),
    ]
  ).catch(() => {}); // Non-critical — intentional fire-and-forget

  // ── Build response ────────────────────────────────────────────────────────
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000);

  // Product-specific features object
  const features = buildFeatures(licProduct, lic.package_code, maxNodes);

  const response: Record<string, any> = {
    valid:        true,
    status:       lic.status,
    license_key:  cleanKey,
    product:      lic.product,
    package:      lic.package_code,
    package_code: lic.package_code,
    expires_at:   lic.expires_at,
    days_left:    daysLeft,
    max_nodes:    maxNodes,
    client_name:  lic.client_name || "",
    organization: lic.organization || "",
    features,
  };

  if (daysLeft <= 30) {
    response.warning = `License expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Renew at axto.io/portal to avoid interruption.`;
  }
  if (daysLeft <= 7) {
    response.critical_warning = `⚠️ License expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}! Renew immediately at axto.io/portal.`;
  }

  return signedJson(response, {
    licenseKey: cleanKey, machineId: mid, product: lic.product,
    valid: true, status: lic.status, expiresAt: lic.expires_at,
    // Bind the exact entitlements into the signed payload so a client cannot
    // edit its cache / a MITM cannot edit the response to unlock a higher tier.
    entitlements: serializeEntitlements(features, lic.package_code),
  });
}

// ── Deterministic, signable serialization of a license's entitlements ─────────
// Format: "package=<code>;<k1>=<v1>;<k2>=<v2>;..." with feature keys sorted so
// the same bytes are produced for the same license every time. Values are only
// booleans / numbers / simple identifiers (never contain ';', '=', or '|'), so
// the string round-trips losslessly and can never break the pipe-delimited
// canonical license payload it becomes the final segment of.
function serializeEntitlements(features: Record<string, any>, packageCode: string): string {
  const parts = [`package=${packageCode || ""}`];
  for (const k of Object.keys(features).sort()) {
    const v = features[k];
    const s = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
    parts.push(`${k}=${s}`);
  }
  return parts.join(";");
}

// ── Build product-specific features object ───────────────────────────────────
function buildFeatures(product: string, packageCode: string, maxNodes: number): Record<string, any> {
  const base = {
    ai_pool:          true,
    support_chat:     true,
    byok:             true,
    self_hosted:      true,
  };

  switch (product) {
    case "guardian":
      return {
        ...base,
        max_nodes:         maxNodes,
        compliance_reports:true,
        threat_hunting:    packageCode !== "lite",
        ebpf:              ["shield","aegis"].includes(packageCode),
        mtls:              ["shield","aegis"].includes(packageCode),
        multi_tenant:      packageCode === "aegis",
        white_label:       packageCode === "aegis",
      };
    case "orchestra":
      return {
        ...base,
        max_workers:       maxNodes,
        gpu_workers:       true,
        autoscaler:        true,
        cost_analytics:    true,
        federation:        ["orchestra_scale","orchestra_unlimited"].includes(packageCode),
      };
    case "vault": {
      // FAIL-CLOSED tier resolution — an unrecognized package gets the Starter
      // entitlement (incl. the lowest daily request cap), never unlimited.
      const pc = (packageCode || "").toLowerCase();
      const tier = pc.includes("enterprise") ? "ent"
                 : pc.includes("business")   ? "biz"
                 : pc.includes("pro")        ? "pro"
                 : "starter";
      return {
        ...base,
        pii_redaction:     true,
        phi_redaction:     true,
        financial_redaction: true,
        audit_trail:       true,
        custom_policies:   tier !== "starter",
        soc2_report:       tier !== "starter",
        hipaa_report:      tier !== "starter",
        multi_tenant:      ["biz","ent"].includes(tier),
        siem_integration:  ["biz","ent"].includes(tier),
        max_requests_daily: tier === "starter" ? 50_000
                          : tier === "pro"     ? 500_000
                          : tier === "biz"     ? 5_000_000
                          : -1,
      };
    }
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
    case "studio": {
      // One Studio license unlocks the ai-studio / gpu-studio / hybrid-studio
      // sub-apps according to tier — must match STUDIO_PLANS[].studios in
      // lib/studio.ts. FAIL-CLOSED: an unrecognized package code gets the
      // Starter set, never the full set.
      const pc = (packageCode || "").toLowerCase();
      const studios = pc.includes("enterprise") || pc.includes("professional")
        ? ["ai", "gpu", "hybrid"]
        : ["ai", "gpu"];
      return {
        ...base,
        central_ai_pool:   true,
        gpu_pool:          true,
        byo_gpu:           true,
        image_generation:  true,
        max_concurrent_jobs: maxNodes,
        studios,
        hybrid_pool:       studios.includes("hybrid"),
      };
    }
    case "legal": {
      // AXTO Legal — feature flags consumed by legal/src (workspaces, country
      // packs, compliance frameworks). Tier is resolved EXPLICITLY and
      // FAIL-CLOSED: an unrecognized package code gets the most restrictive
      // (Starter) entitlement, never full access — so a cheaper or malformed
      // package can never silently unlock the Enterprise tier.
      const pc = (packageCode || "").toLowerCase();
      const tier = (pc.includes("enterprise") || pc.includes("sovereign")) ? "ent"
                 :  pc.includes("business")                                 ? "biz"
                 :  pc.includes("pro")                                      ? "pro"
                 :  "starter";
      // Must match the entitlements promised in lib/stripe.ts PACKAGE_INFO
      // (legal_starter/professional/business/enterprise) — these numbers are
      // what the client paid for, so they must match exactly, not just be
      // "directionally" tiered. -1 means "all". Starter < Pro < Business < Ent.
      const COUNTRIES:  Record<string, number> = { starter: 30, pro: 100, biz: 195, ent: -1 };
      const WORKSPACES: Record<string, number> = { starter: 3,  pro: 10,  biz: 18,  ent: -1 };
      const FRAMEWORKS: Record<string, number> = { starter: 20, pro: 40,  biz: 50,  ent: -1 };
      return {
        ...base,
        air_gapped:            true,
        regulatory_updates:    true,
        document_analysis:     true,
        prompt_library:        true,
        ai_task_advisor:       true,
        max_countries:         COUNTRIES[tier],
        workspaces:            WORKSPACES[tier],
        max_frameworks:        FRAMEWORKS[tier],
        multi_jurisdiction:    tier !== "starter",
        byo_everything:        tier === "ent",
        offline_storage:       true,
      };
    }
    default:
      return base;
  }
}
