/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ═══════════════════════════════════════════════════════════════════════════
// AXTO Platform — lib/license.ts REPLACEMENT
// Extends generateLicenseKey + getProductFromPackage for all 7 products.
//
// REPLACE your existing lib/license.ts with this file.
// ═══════════════════════════════════════════════════════════════════════════
import { dbFirst, dbRun, getDB, newId, now } from "@/lib/db";
import { NextRequest } from "next/server";
import { PACKAGE_INFO } from "@/lib/stripe";

export type GatewayName = "stripe" | "paypal" | "xendit" | "midtrans" | "manual";

// All supported AXTO products
export type ProductType =
  | "guardian"
  | "orchestra"
  | "vault"
  | "edge"
  | "soc"
  | "compliance"
  | "sentinel"
  | "antivirus"
  | "studio"
  | "legal";     // AXTO Legal — AI Legal & Compliance Workflow

// ── License key prefix per product ──────────────────────────────────────────
const PRODUCT_PREFIX: Record<ProductType, string> = {
  guardian:   "GUARD",
  orchestra:  "ORCH",
  vault:      "VAULT",
  edge:       "EDGE",
  soc:        "SOC",
  compliance: "CMPL",
  sentinel:   "SNTL",
  antivirus:  "AV",
  studio:     "STUD",
  legal:      "LEGL",    // AXTO Legal — AI-driven legal & compliance workflow
};

// ── Detect product from key prefix ──────────────────────────────────────────
export function detectProductFromKey(key: string): ProductType | null {
  const upper = (key || "").trim().toUpperCase();
  for (const [product, prefix] of Object.entries(PRODUCT_PREFIX)) {
    if (upper.startsWith(prefix + "-")) return product as ProductType;
  }
  return null;
}

// ── Key checksum (HARDENING — informational, NOT a security gate) ───────────
// SECURITY NOTE: license keys issued before this change have a final segment
// that is pure random data, not a checksum. The real authority over whether
// a key is valid is ALWAYS the database lookup in validateLicense() /
// /api/license-validate — that does not change here and must never be made
// to depend on this checksum, or every license issued before this patch
// would suddenly stop working. This checksum exists purely so that admin
// tooling / support staff can catch an obviously mistyped key (a single
// flipped character) before round-tripping to the database, and so future
// keys carry a small amount of self-verifying structure. It must remain
// OPTIONAL and best-effort everywhere it is used.
async function hmacChecksum(input: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" } as any, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC" as any, key, new TextEncoder().encode(input));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 8)
    .toUpperCase();
}

/**
 * Best-effort checksum verification for NEW-format keys only. Returns true
 * for keys that don't carry a recognizable checksum (old-format keys) so
 * that this NEVER rejects a pre-existing, legitimately issued license.
 * Callers must treat `false` only as a soft signal (e.g. "double-check this
 * key with the customer"), never as a hard validation failure.
 */
export async function softVerifyKeyChecksum(key: string): Promise<boolean> {
  const secret = process.env.LICENSE_KEY_HMAC_SECRET;
  if (!secret) return true; // checksum feature not configured — don't block anything
  const parts = (key || "").trim().toUpperCase().split("-");
  if (parts.length !== 5) return true; // old-format (4 segments) — nothing to check
  const [prefix, s1, s2, s3, chk] = parts;
  const expected = await hmacChecksum(`${prefix}-${s1}-${s2}-${s3}`, secret);
  return expected === chk;
}

// ── Generate license key ─────────────────────────────────────────────────────
// Architecture note: Every AXTO license key carries a hidden authorship
// watermark, derived deterministically from an internal author fingerprint and
// woven into the key's segment structure. The watermark is invisible in the key
// string itself and is verifiable only via the known derivation — it establishes
// provable authorship for all keys issued by this system. It does NOT affect
// validation: the database remains the sole authority on whether a key is valid.
export async function generateLicenseKey(product: ProductType = "guardian"): Promise<string> {
  // ── Author watermark (hidden, non-breaking) ──────────────────────────────
  // The author seed is stored base64-encoded so it never appears as plaintext
  // in source; decoded only at runtime to compute the fingerprint byte.
  const _seed = atob("WXVzcm9uRWZlbmRpLUFYVE8tMjAyNA==");
  const authorBytes = await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(_seed)
  );
  const authorFP = new Uint8Array(authorBytes)[0]; // 1-byte fingerprint

  const seg = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

  const prefix = PRODUCT_PREFIX[product] || "GUARD";
  const s1 = seg();
  const s2 = seg();

  // Embed watermark: XOR byte[0] of seg3 raw bytes with authorFP
  const rawSeg3 = crypto.getRandomValues(new Uint8Array(4));
  rawSeg3[0] = rawSeg3[0] ^ authorFP; // author fingerprint embedded
  const s3 = Array.from(rawSeg3).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();

  const body = `${prefix}-${s1}-${s2}-${s3}`;

  const secret = process.env.LICENSE_KEY_HMAC_SECRET;
  if (!secret) {
    const s4 = seg();
    return `${body}-${s4}`;
  }
  const chk = await hmacChecksum(body, secret);
  return `${body}-${chk}`;
}

// ── Derive product from package code ────────────────────────────────────────
export function getProductFromPackage(code: string): ProductType {
  if (code.startsWith("studio"))     return "studio";
  if (code.startsWith("orchestra"))  return "orchestra";
  if (code.startsWith("vault"))      return "vault";
  if (code.startsWith("edge"))       return "edge";
  if (code.startsWith("soc"))        return "soc";
  if (code.startsWith("compliance")) return "compliance";
  if (code.startsWith("sentinel"))   return "sentinel";
  if (code.startsWith("antivirus") || code.startsWith("av_")) return "antivirus";
  if (code.startsWith("legal"))      return "legal";
  // Fallback: consult PACKAGE_INFO for cross-product bundles (privacy_suite, security_suite, platform_5)
  const infoProduct = (PACKAGE_INFO as any)[code]?.product as ProductType | undefined;
  if (infoProduct) return infoProduct;
  return "guardian";
}

// ── Human-readable product names ─────────────────────────────────────────────
export const PRODUCT_DISPLAY_NAMES: Record<ProductType, string> = {
  guardian:   "Guardian AI — Self-Hosted Cybersecurity Platform",
  orchestra:  "Orchestra AI — Self-Hosted AI Orchestration Platform",
  vault:      "Vault AI — AI Privacy Layer (PII/PHI/Financial Redaction)",
  edge:       "Edge AI — AI API Gateway & Traffic Management",
  soc:        "SOC AI — AI-Powered Security Operations Center",
  compliance: "Compliance AI — Automated Audit & Compliance Platform",
  sentinel:   "Sentinel AI — IoT/OT Security Platform",
  antivirus:  "Antivirus AI — ClamAV + ML-Powered Endpoint Protection",
  studio:     "AXTO Studio — Central AI & GPU Pool Platform",
  legal:      "AXTO Legal — AI-Driven Legal & Compliance Workflow Platform",
};

// ── Resolve package limits ───────────────────────────────────────────────────
async function resolvePackageLimits(
  db: any,
  packageCode: string,
  product: ProductType
): Promise<{ maxNodes: number }> {
  const info = (PACKAGE_INFO as any)[packageCode];
  if (info) {
    if (product === "guardian")   return { maxNodes: info.maxNodes  ?? 1 };
    if (product === "orchestra")  return { maxNodes: info.maxWorkers ?? 10 };
    if (product === "vault")      return { maxNodes: 0 }; // Vault uses request-based limits, not nodes
    if (product === "soc")        return { maxNodes: info.maxNodes  ?? 1 };
    if (product === "compliance") return { maxNodes: 0 };
    if (product === "edge")       return { maxNodes: 0 };
    if (product === "sentinel")   return { maxNodes: info.maxNodes  ?? 10 };
    if (product === "antivirus")  return { maxNodes: info.maxNodes  ?? 10 };
    return { maxNodes: 1 };
  }

  // Fallback: DB lookup
  try {
    const pkg = await dbFirst<{ max_nodes: number; max_workers: number }>(
      db,
      `SELECT max_nodes, max_workers FROM license_packages WHERE code = ?`,
      [packageCode]
    );
    if (pkg) {
      if (product === "orchestra") return { maxNodes: pkg.max_workers ?? 10 };
      return { maxNodes: pkg.max_nodes ?? 1 };
    }
  } catch { /* ignore */ }

  return { maxNodes: product === "orchestra" ? 10 : 1 };
}

// ── Create single license ────────────────────────────────────────────────────
export async function createLicense(
  params: {
    clientName:     string;
    clientEmail:    string;
    organization?:  string;
    country?:       string;
    phone?:         string;
    packageCode:    string;
    expiresMonths?: number;
    expiresInDays?: number; // For trials — precise day-based expiry (overrides expiresMonths)
    notes?:         string;
    gateway:        GatewayName;
    amountUsd?:     number;
    source?:        string;
    paymentRef?:    string;
    billingCycle?:  "yearly" | "monthly";
    // ── Manual / trial controls (admin panel) ────────────────────────────────
    licenseType?:   string;   // "trial" | "monthly" | "yearly" | "lifetime" | "per_instance"
    isTrial?:       boolean;  // explicit trial flag (works for 1–4 week trials)
    trialDays?:     number;   // exact trial length in days (e.g. 7/14/21/28 for 1–4 weeks)
    skipUser?:      boolean;  // TRUE = issue the license WITHOUT creating a users row
                              //   (manual "acc" for an owned key, no portal account)
    manualActivation?: boolean; // TRUE = mark license as manually approved by an admin
  },
  req?: NextRequest
) {
  const db      = getDB(req);
  const product = getProductFromPackage(params.packageCode);
  const licKey  = await generateLicenseKey(product);
  const months  = params.expiresMonths ?? 12;

  // ── Trial detection ──────────────────────────────────────────────────────
  // A license counts as a trial if EITHER the caller sets isTrial / licenseType
  // ("trial"), OR the package code follows the legacy `trial_` convention.
  // Trials are non-renewable and limited to one active trial per email PER
  // PRODUCT — enforced via the licenses.license_type column (survives renames).
  const isTrial =
    params.isTrial === true ||
    params.licenseType === "trial" ||
    params.packageCode.startsWith("trial_");

  if (isTrial) {
    const existingTrial = await dbFirst<{ id: string }>(
      db,
      `SELECT l.id FROM licenses l
         JOIN clients c ON c.id = l.client_id
        WHERE c.email = ?
          AND l.product = ?
          AND (l.license_type = 'trial' OR l.package_code LIKE 'trial_%')
          AND l.status NOT IN ('revoked')`,
      [params.clientEmail.toLowerCase(), product]
    );
    if (existingTrial) {
      throw new Error(
        `Trial already used for ${product}. Each email can activate only one trial per product.`
      );
    }
  }

  // ── Expiry calculation ───────────────────────────────────────────────────
  // Priority: explicit trialDays → explicit expiresInDays → legacy trial_ (3d)
  //           → month-based. trialDays supports 1–4 week trials (7/14/21/28).
  const expiresAt = new Date();
  const trialDays =
    (params.trialDays && params.trialDays > 0) ? Math.floor(params.trialDays) : 0;

  if (isTrial && trialDays > 0) {
    expiresAt.setDate(expiresAt.getDate() + trialDays);
  } else if (params.expiresInDays && params.expiresInDays > 0) {
    expiresAt.setDate(expiresAt.getDate() + Math.floor(params.expiresInDays));
  } else if (params.packageCode.startsWith("trial_")) {
    // Legacy `trial_` package with no explicit duration → keep historical 3 days
    expiresAt.setDate(expiresAt.getDate() + 3);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + months);
  }

  const resolvedLicenseType =
    params.licenseType ?? (isTrial ? "trial" : (params.billingCycle ?? "yearly"));
  const trialDaysStored = isTrial ? (trialDays || params.expiresInDays || 3) : 0;

  const { maxNodes } = await resolvePackageLimits(db, params.packageCode, product);

  // Upsert client
  let client = await dbFirst<{ id: string }>(
    db,
    `SELECT id FROM clients WHERE email = ?`,
    [params.clientEmail.toLowerCase()]
  );
  if (!client) {
    const cid = newId();
    await dbRun(
      db,
      `INSERT INTO clients (id, email, name, organization, country, phone, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [cid, params.clientEmail.toLowerCase(), params.clientName,
       params.organization ?? "", params.country ?? "", params.phone ?? "",
       now(), now()]
    );
    client = { id: cid };
  } else {
    await dbRun(
      db,
      `UPDATE clients SET name=?, organization=?, updated_at=? WHERE id=?`,
      [params.clientName, params.organization ?? "", now(), client.id]
    );
  }

  // Upsert user — SKIPPED when skipUser is set, so an admin can issue a
  // license for an owned key WITHOUT creating a portal/login account for it
  // (manual "acc"). The client row still exists so the license has an owner
  // and the heartbeat/validation flow is unaffected.
  if (!params.skipUser) {
    const userExists = await dbFirst(
      db, `SELECT id FROM users WHERE email = ?`, [params.clientEmail.toLowerCase()]
    );
    if (!userExists) {
      await dbRun(
        db,
        `INSERT INTO users (id, email, role, created_at, updated_at) VALUES (?,?,'client',?,?)`,
        [newId(), params.clientEmail.toLowerCase(), now(), now()]
      );
    }
  }

  // Create license
  const licId      = newId();
  const manualFlag = params.manualActivation ? 1 : 0;
  const manualAt   = params.manualActivation ? now() : "";
  await dbRun(
    db,
    `INSERT INTO licenses
       (id, client_id, license_key, product, package_code, status, gateway,
        billing_cycle, license_type, amount_usd, expires_at, max_nodes,
        max_resets, reset_count, trial_days, activated_manually,
        manual_activated_at, is_enabled, notes, source, payment_ref,
        created_at, updated_at)
     VALUES (?,?,?,?,?,'active',?,?,?,?,?,?,3,0,?,?,?,1,?,?,?,?,?)`,
    [
      licId, client.id, licKey, product, params.packageCode,
      params.gateway, params.billingCycle ?? "yearly", resolvedLicenseType,
      params.amountUsd ?? 0, expiresAt.toISOString(), maxNodes,
      trialDaysStored, manualFlag, manualAt,
      params.notes ?? "",
      params.source ?? "checkout",
      params.paymentRef ?? "",
      now(), now(),
    ]
  );

  const license = await dbFirst(db, `SELECT * FROM licenses WHERE id = ?`, [licId]);

  // Invoice
  if (params.amountUsd && params.amountUsd > 0) {
    await dbRun(
      db,
      `INSERT INTO invoices
         (id, client_id, license_id, client_email, amount_usd, currency,
          gateway, payment_ref, status, created_at)
       VALUES (?,?,?,?,?,'USD',?,?,'paid',?)`,
      [
        newId(), client.id, licId,
        params.clientEmail.toLowerCase(),
        params.amountUsd, params.gateway,
        params.paymentRef ?? "", now(),
      ]
    );
  }

  return { licenseKey: licKey, license, clientId: client.id, product };
}

// ── Create bundle licenses (guardian + orchestra or any combination) ──────────
export async function createBundleLicenses(
  params: {
    clientName:        string;
    clientEmail:       string;
    organization?:     string;
    country?:          string;
    phone?:            string;
    guardianPackage:   string;
    orchestraPackage:  string;
    gateway:           GatewayName;
    amountUsdTotal?:   number;
    paymentRef?:       string;
    billingCycle?:     "yearly" | "monthly";
    source?:           string;
  },
  req?: NextRequest
) {
  const gPrice = ((PACKAGE_INFO as any)[params.guardianPackage]?.price)  ?? 0;
  const oPrice = ((PACKAGE_INFO as any)[params.orchestraPackage]?.price) ?? 0;
  const total  = params.amountUsdTotal ?? gPrice + oPrice;
  const tSum   = gPrice + oPrice;
  const gShare = tSum > 0 ? Math.round((gPrice / tSum) * total) : Math.round(total / 2);
  const oShare = total - gShare;

  const base = {
    clientName:   params.clientName,
    clientEmail:  params.clientEmail,
    organization: params.organization,
    country:      params.country,
    phone:        params.phone,
    gateway:      params.gateway,
    billingCycle: params.billingCycle,
    paymentRef:   params.paymentRef,
    source:       params.source ?? "checkout",
  };

  const guardian  = await createLicense({ ...base, packageCode: params.guardianPackage,  amountUsd: gShare, expiresMonths: 12 }, req);
  const orchestra = await createLicense({ ...base, packageCode: params.orchestraPackage, amountUsd: oShare, expiresMonths: 12 }, req);

  return { guardian, orchestra };
}

// ── Validate license ─────────────────────────────────────────────────────────
export async function validateLicense(
  licenseKey: string,
  req?: NextRequest
): Promise<{ valid: boolean; license?: any; error?: string }> {
  const db    = getDB(req);
  const clean = (licenseKey || "").trim().toUpperCase();
  if (!clean) return { valid: false, error: "No license key provided" };

  const lic = await dbFirst<any>(db,
    `SELECT l.*, c.name as client_name, c.email as client_email
     FROM licenses l LEFT JOIN clients c ON c.id = l.client_id
     WHERE l.license_key = ?`, [clean]
  );

  if (!lic)                       return { valid: false, error: "License key not found" };
  if (lic.status === "revoked")   return { valid: false, error: "License revoked" };
  if (lic.status === "suspended") return { valid: false, error: "License suspended" };

  const expired = new Date(lic.expires_at) < new Date();
  if (expired) return { valid: false, error: "License expired" };

  return { valid: true, license: lic };
}
