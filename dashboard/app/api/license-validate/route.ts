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
 *   • every licence-specific answer is Ed25519-signed (lib/license-sign.ts, fail-closed)
 *   • the signed payload binds key, machine, product, status, expiry and the
 *     serialized entitlements, so no MITM or local edit can unlock a higher tier
 *   • licences are always issued at the TOP tier of each engine
 * Storage-lean: no heartbeat log — the licence document is updated at most once per hour.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getData, now, background } from "@/lib/db";
import type { Data } from "@/lib/data";
import { signLicense, signEntitlements, SigningUnavailable, type SignFields } from "@/lib/license-sign";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { SELF_HOSTED, productFromKey } from "@/lib/selfhosted";
import { absoluteUrl } from "@/lib/site";
import { buildFeatures, serializeEntitlements } from "@/lib/entitlements";

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

async function signed(db: Data, body: Record<string, any>, sign: SignFields, status = 200) {
  try {
    return NextResponse.json({ ...body, ...(await signLicense(db, sign)) }, { status, headers: CORS });
  } catch (e) {
    // Fail closed: never send an unsigned licence decision. Engines treat this
    // like "server unreachable" and fall back to their last verified proof.
    if (e instanceof SigningUnavailable) return plain({ valid: false, error: "Licensing service is temporarily unavailable." }, 503);
    throw e;
  }
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
    edge_version, soc_version, compliance_version, sentinel_version, nonce,
  } = body || {};
  if (!license_key || typeof license_key !== "string") return plain({ valid: false, error: "license_key is required" }, 400);

  const key = license_key.trim().toUpperCase();
  const mid = typeof machine_id === "string" ? machine_id.trim().replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 128) : "";
  const keyLimit = await rateLimit(req, "license-validate-key", key, { max: 30, windowSeconds: 60 });
  if (keyLimit.limited) {
    return NextResponse.json({ valid: false, error: "Too many validation requests for this license key. Please slow down." },
      { status: 429, headers: { ...CORS, "Retry-After": String(keyLimit.retryAfterSeconds) } });
  }

  const keyProduct = productFromKey(key);
  if (!keyProduct) {
    return plain({ valid: false, error: `Unrecognized license key format. Key must start with one of: ${SELF_HOSTED.map((p) => p.keyPrefix + "-").join(", ")}` });
  }

  let db: Data;
  try { db = getData(req); } catch { return plain({ valid: false, error: "Service temporarily unavailable. Try again in a moment." }, 503); }

  // ── Former free-program keys: signed lock ────────────────────────────────
  if (/-FREE-ACCESS-\d{4}$/.test(key)) {
    return signed(db, {
      valid: false, reason: "program_ended",
      error: `The AXTO free program has ended. This app is now locked (read-only) — your data is untouched. Subscribe to a Business or Enterprise plan at ${PRICING} and paste your licence key from ${PORTAL} to continue.`,
      renew_url: PRICING,
    }, { licenseKey: key, machineId: mid, product: keyProduct, valid: false, status: "program_ended", expiresAt: new Date().toISOString(), nonce });
  }

  const doc = await db.shLicenses.find("license_key", key);
  if (!doc) return plain({ valid: false, error: `License key not found. Get your key at ${PORTAL}` });
  const owner = doc.user_id ? await db.users.get(doc.user_id) : null;
  const lic = { ...doc, client_name: owner?.name || "", organization: owner?.organization || "", user_status: owner?.status || "" };

  const sign = (status: string, valid = false, extra: Partial<SignFields> = {}): SignFields =>
    ({ licenseKey: key, machineId: mid, product: lic.product, valid, status, expiresAt: lic.expires_at, nonce, ...extra });

  if (lic.status === "revoked") {
    return signed(db, { valid: false, reason: "revoked", error: "License has been revoked. Contact hello@axto.io for assistance." }, sign("revoked"));
  }
  if (lic.status === "suspended" || (lic.user_status && lic.user_status !== "active")) {
    return signed(db, { valid: false, reason: "suspended", error: `License is suspended — your plan no longer includes this app. Manage it at ${PORTAL}.`, renew_url: PORTAL }, sign("suspended"));
  }
  const expiresAt = new Date(lic.expires_at);
  const trial = lic.source === "trial";
  if (!(expiresAt.getTime() > Date.now())) {
    if (trial) return signed(db, { valid: false, reason: "trial_expired", license_type: "trial", error: `Your trial has ended — your data is kept. Buy an edition at ${PORTAL} to continue.`, expired_at: lic.expires_at, renew_url: PORTAL }, sign("expired"));
    return signed(db, { valid: false, reason: "expired", error: `License expired. Renew at ${PORTAL} to restore access.`, expired_at: lic.expires_at, renew_url: PORTAL }, sign("expired"));
  }

  const reqProduct = String(requestedProduct || "").toLowerCase().trim();
  const licProduct = String(lic.product).toLowerCase();
  if (reqProduct && reqProduct !== licProduct) {
    const expected = SELF_HOSTED.find((p) => p.slug === reqProduct)?.keyPrefix;
    return signed(db, {
      valid: false, reason: "product_mismatch", key_is_for: lic.product,
      error: `This key is for "${lic.product}", not "${reqProduct}". Use a ${expected ? expected + "-" : ""}key for ${reqProduct}.`,
    }, sign("product_mismatch"));
  }

  if (mid) {
    let bound = lic.bound_machine_id;
    if (!bound && trial) {
      // One trial per app per machine: a server that already ran a trial of this app cannot start another.
      const used = await db.shLicenses.list("trial_machine", `${lic.product}|${mid}`, { limit: 5 }).catch(() => ({ entries: [] }));
      if (used.entries.some((e) => e.id !== lic.id)) return signed(db, { valid: false, reason: "trial_used_on_machine", license_type: "trial", error: `This server has already used a trial of ${lic.product}. Buy an edition at ${PORTAL}.`, renew_url: PORTAL }, sign("trial_used"));
    }
    if (!bound) {
      // First machine wins; a second server racing for the same key sees the winner and is refused.
      // Compare-and-swap: only an unbound licence takes the machine.
      const after = await db.shLicenses.update(lic.id, (l) => (l.bound_machine_id ? null : { ...l, bound_machine_id: mid, updated_at: now() })).catch(() => null);
      bound = after?.bound_machine_id || mid;
    }
    if (bound && bound !== mid) {
      return signed(db, { valid: false, reason: "machine_mismatch", error: `License is bound to a different server. Reset the binding at ${PORTAL}.`, reset_url: PORTAL }, sign("machine_mismatch"));
    }
  }

  const maxNodes = Number(lic.max_nodes ?? 1);
  if (maxNodes !== -1 && typeof node_count === "number" && node_count > maxNodes) {
    return signed(db, {
      valid: false, reason: "node_limit_exceeded", max_nodes: maxNodes, current_nodes: node_count, upgrade_url: PRICING,
      error: `Node limit exceeded. Your ${lic.product} licence allows ${maxNodes} node(s); you have ${node_count}. Upgrade to Enterprise for unlimited nodes.`,
    }, sign("node_limit_exceeded"));
  }

  // Heartbeat: one document update, at most once per hour (after the answer is sent).
  const version = String(versionField || guardian_version || orchestra_version || vault_version || edge_version || soc_version || compliance_version || sentinel_version || "unknown").slice(0, 40);
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  if (!lic.last_seen_at || lic.last_seen_at < hourAgo) {
    background(db.shLicenses.update(lic.id, (l) => (l.last_seen_at && l.last_seen_at >= hourAgo ? null : { ...l, last_seen_at: now(), last_version: version, last_ip: ip })));
  }

  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  const features = buildFeatures(licProduct, lic.package_code, maxNodes);
  // A trial is signed as such so the engine can watermark it and show the buy button.
  if (trial) features.trial = true;
  const response: Record<string, any> = {
    valid: true, status: "active", license_key: key, product: lic.product, license_type: trial ? "trial" : "paid", source: lic.source || "plan",
    package: lic.package_code, package_code: lic.package_code, expires_at: lic.expires_at,
    days_left: daysLeft, max_nodes: maxNodes, client_name: lic.client_name || "", organization: lic.organization || "",
    features,
  };
  const plural = daysLeft === 1 ? "" : "s";
  if (trial) {
    response.warning = `Trial licence — ${daysLeft} day${plural} left. Buy an edition at ${PORTAL} to keep using it.`;
  } else {
    const how = (lic.source || "plan") === "plan" ? "with your plan" : "when you renew the edition";
    if (daysLeft <= 14) response.warning = `License renews ${how} in ${daysLeft} day${plural}. Manage it at ${PORTAL}.`;
    if (daysLeft <= 3) response.critical_warning = `⚠️ License expires in ${daysLeft} day${plural}! Renew at ${PORTAL}.`;
  }

  const entitlements = serializeEntitlements(features, lic.package_code);
  try {
    // Legal and the Studio modules (ai/gpu/hybrid) read their feature set from
    // this separately-signed block; the other engines ignore it.
    Object.assign(response, await signEntitlements(db, { licenseKey: key, machineId: mid, product: lic.product, entitlements, nonce }));
  } catch (e) {
    if (e instanceof SigningUnavailable) return plain({ valid: false, error: "Licensing service is temporarily unavailable." }, 503);
    throw e;
  }
  return signed(db, response, sign("active", true, { entitlements }));
}
