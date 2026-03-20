import { dbFirst, dbRun, getDB, newId, now } from "@/lib/db";
import { NextRequest } from "next/server";
import { PACKAGE_INFO, getMaxNodes, getMaxWorkers } from "@/lib/stripe";

export type GatewayName = "stripe" | "paypal" | "xendit" | "midtrans" | "manual";

export function generateLicenseKey(product: "guardian" | "orchestra" = "guardian"): string {
  const seg = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  return `${product === "orchestra" ? "ORCH" : "GUARD"}-${seg()}-${seg()}-${seg()}-${seg()}`;
}

export function getProductFromPackage(code: string): "guardian" | "orchestra" {
  return code.startsWith("orchestra") ? "orchestra" : "guardian";
}

/**
 * Resolve max_nodes for a guardian license, or max_workers for orchestra.
 * Falls back to PACKAGE_INFO, then DB lookup, then safe defaults.
 */
async function resolvePackageLimits(
  db: any,
  packageCode: string,
  product: "guardian" | "orchestra"
): Promise<{ maxNodes: number }> {
  // First: use in-code catalog (most reliable)
  const info = PACKAGE_INFO[packageCode];
  if (info) {
    if (product === "guardian") return { maxNodes: info.maxNodes ?? 1 };
    // Orchestra: maxWorkers acts as node count limit for heartbeat
    return { maxNodes: info.maxWorkers ?? 10 };
  }

  // Fallback: DB lookup
  try {
    const pkg = await dbFirst<{ max_nodes: number; max_workers: number }>(
      db,
      `SELECT max_nodes, max_workers FROM license_packages WHERE code = ?`,
      [packageCode]
    );
    if (pkg) {
      return { maxNodes: product === "guardian" ? (pkg.max_nodes ?? 1) : (pkg.max_workers ?? 10) };
    }
  } catch { /* ignore */ }

  return { maxNodes: product === "guardian" ? 1 : 10 };
}

export async function createLicense(
  params: {
    clientName: string;
    clientEmail: string;
    organization?: string;
    country?: string;
    phone?: string;
    packageCode: string;
    expiresMonths?: number;
    notes?: string;
    gateway: GatewayName;
    amountUsd?: number;
    source?: string;
    paymentRef?: string;
    billingCycle?: "yearly" | "monthly";
  },
  req?: NextRequest
) {
  const db      = getDB(req);
  const product = getProductFromPackage(params.packageCode);
  const licKey  = generateLicenseKey(product);
  const months  = params.expiresMonths ?? 12;

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);

  // Resolve correct max_nodes from package catalog ← CRITICAL FIX
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

  // Upsert user (so magic link works immediately after purchase)
  const userExists = await dbFirst(
    db,
    `SELECT id FROM users WHERE email = ?`,
    [params.clientEmail.toLowerCase()]
  );
  if (!userExists) {
    await dbRun(
      db,
      `INSERT INTO users (id, email, role, created_at, updated_at) VALUES (?,?,'client',?,?)`,
      [newId(), params.clientEmail.toLowerCase(), now(), now()]
    );
  }

  // Create license — with correct max_nodes from package
  const licId = newId();
  await dbRun(
    db,
    `INSERT INTO licenses
       (id, client_id, license_key, product, package_code, status, gateway,
        billing_cycle, amount_usd, expires_at, max_nodes, max_resets, reset_count,
        notes, source, payment_ref, created_at, updated_at)
     VALUES (?,?,?,?,?,'active',?,?,?,?,?,3,0,?,?,?,?,?)`,
    [
      licId, client.id, licKey, product, params.packageCode,
      params.gateway, params.billingCycle ?? "yearly",
      params.amountUsd ?? 0, expiresAt.toISOString(),
      maxNodes,                  // ← now correctly set per package
      params.notes ?? "",
      params.source ?? "checkout",
      params.paymentRef ?? "",
      now(), now(),
    ]
  );

  const license = await dbFirst(db, `SELECT * FROM licenses WHERE id = ?`, [licId]);

  // Create invoice
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

export async function createBundleLicenses(
  params: {
    clientName: string;
    clientEmail: string;
    organization?: string;
    country?: string;
    phone?: string;
    guardianPackage: string;
    orchestraPackage: string;
    gateway: GatewayName;
    amountUsdTotal?: number;
    paymentRef?: string;
    billingCycle?: "yearly" | "monthly";
    source?: string;
  },
  req?: NextRequest
) {
  // Split total cost proportionally based on individual package prices
  const gPrice = PACKAGE_INFO[params.guardianPackage]?.price ?? 0;
  const oPrice = PACKAGE_INFO[params.orchestraPackage]?.price ?? 0;
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

  const guardian = await createLicense(
    { ...base, packageCode: params.guardianPackage, amountUsd: gShare, expiresMonths: 12 },
    req
  );
  const orchestra = await createLicense(
    { ...base, packageCode: params.orchestraPackage, amountUsd: oShare, expiresMonths: 12 },
    req
  );

  return { guardian, orchestra };
}

/**
 * Validate a license key against the D1 database.
 * Returns the license record if valid, throws with message if not.
 */
export async function validateLicense(
  licenseKey: string,
  req?: NextRequest
): Promise<{ valid: boolean; license?: any; error?: string }> {
  const db = getDB(req);
  const clean = (licenseKey || "").trim().toUpperCase();
  if (!clean) return { valid: false, error: "No license key provided" };

  const lic = await dbFirst<any>(db,
    `SELECT l.*, c.name as client_name, c.email as client_email
     FROM licenses l LEFT JOIN clients c ON c.id = l.client_id
     WHERE l.license_key = ?`, [clean]
  );

  if (!lic)               return { valid: false, error: "License key not found" };
  if (lic.status === "revoked")   return { valid: false, error: "License revoked" };
  if (lic.status === "suspended") return { valid: false, error: "License suspended" };

  const expired = new Date(lic.expires_at) < new Date();
  if (expired) return { valid: false, error: "License expired" };

  return { valid: true, license: lic };
}
