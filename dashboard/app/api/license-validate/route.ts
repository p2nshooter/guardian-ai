export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, newId, now } from "@/lib/db";


const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ valid: false, error: "Invalid request body" }, { status: 400, headers: CORS });
  }

  const { license_key, machine_id, product, node_count } = body;

  if (!license_key || typeof license_key !== "string") {
    return NextResponse.json({ valid: false, error: "license_key is required" }, { status: 400, headers: CORS });
  }

  const cleanKey = license_key.trim().toUpperCase();

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ valid: false, error: "Service temporarily unavailable" }, { status: 503, headers: CORS });
  }

  const lic = await dbFirst<any>(db, `
    SELECT l.*, c.name as client_name, c.email as client_email
    FROM licenses l LEFT JOIN clients c ON c.id = l.client_id
    WHERE l.license_key = ?
  `, [cleanKey]);

  if (!lic) {
    return NextResponse.json({ valid: false, error: "License key not found. Check your key at axto.io/portal" }, { headers: CORS });
  }

  if (lic.status === "revoked") {
    return NextResponse.json({ valid: false, error: "License has been revoked. Contact support at hallo@axto.io" }, { headers: CORS });
  }
  if (lic.status === "suspended") {
    return NextResponse.json({ valid: false, error: "License is suspended. Log in to your portal to resolve." }, { headers: CORS });
  }

  // Expiry check
  const expiresAt = new Date(lic.expires_at);
  const isExpired = expiresAt < new Date();
  if (isExpired) {
    if (lic.status !== "expired") {
      await dbRun(db, `UPDATE licenses SET status='expired', updated_at=? WHERE id=?`, [now(), lic.id]).catch(() => {});
    }
    return NextResponse.json({
      valid: false, error: "License expired", expired_at: lic.expires_at,
      renew_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://axto.io"}/portal`,
    }, { headers: CORS });
  }

  // Product mismatch check
  const requestedProduct = (product || "").toLowerCase();
  const licenseProduct = (lic.product || "").toLowerCase();
  if (requestedProduct && licenseProduct && requestedProduct !== licenseProduct) {
    return NextResponse.json({
      valid: false,
      reason: "product_mismatch",
      error: `This license key is for "${lic.product}", not "${product}". Use a ${product === "guardian" ? "GUARD-" : "ORCH-"} key instead.`,
      key_is_for: lic.product,
      message: `Wrong product. This key is for ${lic.product}. You need a ${product} license key.`,
    }, { headers: CORS });
  }

  // Machine binding
  if (machine_id && typeof machine_id === "string" && machine_id.trim()) {
    const mid = machine_id.trim();
    if (!lic.bound_machine_id) {
      await dbRun(db, `UPDATE licenses SET bound_machine_id=?, updated_at=? WHERE id=?`, [mid, now(), lic.id]).catch(() => {});
    } else if (lic.bound_machine_id !== mid) {
      return NextResponse.json({
        valid: false,
        error: "License is bound to a different server. Reset binding from your portal at axto.io/portal",
        reset_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://axto.io"}/portal`,
      }, { headers: CORS });
    }
  }

  // Node count check
  const maxNodes = lic.max_nodes ?? 1;
  if (maxNodes !== -1 && typeof node_count === "number" && node_count > maxNodes) {
    return NextResponse.json({
      valid: false,
      error: `Node limit exceeded. Your license allows ${maxNodes} node(s), you have ${node_count}. Upgrade at axto.io/portal`,
      max_nodes: maxNodes, current_nodes: node_count,
    }, { headers: CORS });
  }

  // Record heartbeat (fire-and-forget)
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "";
  // Fire-and-forget heartbeat — intentional, don't block response
  dbRun(db,
    `INSERT INTO license_heartbeats (id, license_id, machine_id, ip, product, node_count, created_at) VALUES (?,?,?,?,?,?,?)`,
    [newId(), lic.id, machine_id || "", ip, product || "unknown", node_count ?? 0, now()]
  ).catch(() => {}); // Non-critical — swallow errors intentionally

  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000);

  return NextResponse.json({
    valid: true, status: lic.status, license_key: cleanKey,
    package_code: lic.package_code, product: lic.product,
    expires_at: lic.expires_at, days_left: daysLeft,
    max_nodes: maxNodes, client_name: lic.client_name || "",
    ...(daysLeft <= 30 ? { warning: `License expires in ${daysLeft} days. Renew at axto.io/portal` } : {}),
  }, { headers: CORS });
}
