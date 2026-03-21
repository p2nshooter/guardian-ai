/**
 * CF R2 Presigned URL generator (AWS SigV4)
 * Works in Edge runtime — uses Web Crypto only, no Node.js deps
 *
 * Required env vars:
 *   R2_ACCOUNT_ID       — Cloudflare account ID
 *   R2_ACCESS_KEY_ID    — R2 API token (read from R2 > Manage API Tokens)
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME      — default: axto-storage
 */

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(data: string | ArrayBuffer): Promise<ArrayBuffer> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return crypto.subtle.digest("SHA-256", buf);
}

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
}

async function signingKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate    = await hmac(new TextEncoder().encode("AWS4" + secret), date);
  const kRegion  = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

export async function r2PresignGet(
  r2Key: string,
  expiresSeconds = 3600
): Promise<string> {
  const accountId  = process.env.R2_ACCOUNT_ID || "";
  const accessKey  = process.env.R2_ACCESS_KEY_ID || "";
  const secretKey  = process.env.R2_SECRET_ACCESS_KEY || "";
  const bucket     = process.env.R2_BUCKET_NAME || "axto-artifacts";

  if (!accountId || !accessKey || !secretKey) return "";

  const region   = "auto";
  const service  = "s3";
  const now      = new Date();
  const dateStr  = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const dateOnly = dateStr.slice(0, 8);

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const host     = `${accountId}.r2.cloudflarestorage.com`;
  const path     = `/${bucket}/${r2Key}`;

  const credential  = `${accessKey}/${dateOnly}/${region}/${service}/aws4_request`;
  const signedHdrs  = "host";

  const queryParams = new URLSearchParams({
    "X-Amz-Algorithm":     "AWS4-HMAC-SHA256",
    "X-Amz-Credential":    credential,
    "X-Amz-Date":          dateStr,
    "X-Amz-Expires":       String(expiresSeconds),
    "X-Amz-SignedHeaders": signedHdrs,
  });
  // Sort query params for canonical request
  const sortedQuery = Array.from(queryParams.entries())
    .sort(([a], [b]) => a < b ? -1 : 1)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalReq = [
    "GET",
    path,
    sortedQuery,
    `host:${host}\n`,
    signedHdrs,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const hashedCanonical = toHex(await sha256(canonicalReq));

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    dateStr,
    `${dateOnly}/${region}/${service}/aws4_request`,
    hashedCanonical,
  ].join("\n");

  const key = await signingKey(secretKey, dateOnly, region, service);
  const sig = toHex(await hmac(key, stringToSign));

  return `${endpoint}${path}?${sortedQuery}&X-Amz-Signature=${sig}`;
}

export function r2KeyForBuild(buildId: string, product: string, buildType: string, arch: string): string {
  const archSlug = arch === "windows/amd64" ? "windows" : arch === "linux/arm64" ? "linux-arm64" : "linux";
  return `builds/${buildId}/axto-${product}-${buildType}-${archSlug}.zip`;
}
