/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getR2Builds, getDB, dbFirst, dbRun, now } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// Product mapping defined in PRODUCT_LINE_FILES below

function r2Key(product: string, type: "docker" | "exe") {
  // product is like "guardian-core", "vault-core", "soc-core" etc.
  if (type === "exe") {
    return `builds/latest/exe/${product}-linux`;
  }
  return `builds/latest/raw/${product}.tar.gz`;
}

// Package definitions - client mendapat bundle sesuai package yang dibeli
// Product line → R2 file key mapping
const PRODUCT_LINE_FILES: Record<string, string[]> = {
  guardian:   ["guardian-core", "guardian-node", "guardian-antivirus"],
  orchestra:  ["orchestra-core", "orchestra-worker-cpu"],
  vault:      ["vault-core"],
  edge:       ["edge-core"],
  soc:        ["soc-core"],
  compliance: ["compliance-core"],
  sentinel:   ["sentinel-core"],
};

interface BundleInfo {
  products: string[];  // product line keys
  label: string;
  includeGpu?: boolean;
}

const PACKAGE_BUNDLES: Record<string, BundleInfo> = {
  // ── Guardian AI packages ──────────────────────────────────────────────────
  lite:   { products: ["guardian"], label: "Guardian Sentinel" },
  pro:    { products: ["guardian"], label: "Guardian Professional" },
  shield: { products: ["guardian"], label: "Guardian Business" },
  aegis:  { products: ["guardian"], label: "Guardian Enterprise" },
  // ── Orchestra AI packages ─────────────────────────────────────────────────
  orchestra_core:      { products: ["orchestra"], label: "Orchestra Starter" },
  orchestra_scale:     { products: ["orchestra"], label: "Orchestra Professional" },
  orchestra_unlimited: { products: ["orchestra"], label: "Orchestra Enterprise", includeGpu: true },
  // ── Vault AI packages ─────────────────────────────────────────────────────
  vault_growth:        { products: ["vault"], label: "Vault Growth" },
  vault_professional:  { products: ["vault"], label: "Vault Professional" },
  vault_enterprise:    { products: ["vault"], label: "Vault Enterprise" },
  vault_unlimited:     { products: ["vault"], label: "Vault Sovereign" },
  // ── Edge AI packages ──────────────────────────────────────────────────────
  edge_growth:         { products: ["edge"], label: "Edge Growth" },
  edge_professional:   { products: ["edge"], label: "Edge Professional" },
  edge_enterprise:     { products: ["edge"], label: "Edge Enterprise" },
  edge_platform:       { products: ["edge"], label: "Edge Platform" },
  // ── SOC AI packages ───────────────────────────────────────────────────────
  soc_growth:          { products: ["soc"], label: "SOC Growth" },
  soc_professional:    { products: ["soc"], label: "SOC Professional" },
  soc_enterprise:      { products: ["soc"], label: "SOC Enterprise" },
  soc_platform:        { products: ["soc"], label: "SOC Platform" },
  // ── Compliance AI packages ────────────────────────────────────────────────
  compliance_growth:       { products: ["compliance"], label: "Compliance Growth" },
  compliance_professional: { products: ["compliance"], label: "Compliance Professional" },
  compliance_enterprise:   { products: ["compliance"], label: "Compliance Enterprise" },
  compliance_sovereign:    { products: ["compliance"], label: "Compliance Sovereign" },
  // ── Sentinel OT packages ──────────────────────────────────────────────────
  sentinel_growth:       { products: ["sentinel"], label: "Sentinel Growth" },
  sentinel_professional: { products: ["sentinel"], label: "Sentinel Professional" },
  sentinel_enterprise:   { products: ["sentinel"], label: "Sentinel Enterprise" },
  sentinel_critical:     { products: ["sentinel"], label: "Sentinel Critical" },
  // ── Multi-product Bundle packages ─────────────────────────────────────────
  bundle_starter:      { products: ["guardian", "orchestra"], label: "Security + AI Starter" },
  bundle_professional: { products: ["guardian", "orchestra"], label: "Security + AI Professional" },
  bundle_enterprise:   { products: ["guardian", "orchestra"], label: "Security + AI Enterprise", includeGpu: true },
};

// TAR archive helpers
function createTarHeader(name: string, size: number): Uint8Array {
  const header = new Uint8Array(512);
  const encoder = new TextEncoder();
  
  const nameBytes = encoder.encode(name.slice(0, 99));
  header.set(nameBytes, 0);
  header.set(encoder.encode("0000644\0"), 100);
  header.set(encoder.encode("0000000\0"), 108);
  header.set(encoder.encode("0000000\0"), 116);
  
  const sizeStr = size.toString(8).padStart(11, "0") + "\0";
  header.set(encoder.encode(sizeStr), 124);
  
  const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + "\0";
  header.set(encoder.encode(mtime), 136);
  header.set(encoder.encode("        "), 148);
  header[156] = 48;
  
  let checksum = 0;
  for (let i = 0; i < 512; i++) checksum += header[i];
  const checksumStr = checksum.toString(8).padStart(6, "0") + "\0 ";
  header.set(encoder.encode(checksumStr), 148);
  
  return header;
}

function padTo512(size: number): Uint8Array {
  const remainder = size % 512;
  if (remainder === 0) return new Uint8Array(0);
  return new Uint8Array(512 - remainder);
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const licenseId = url.searchParams.get("license_id") || "";
  const type = (url.searchParams.get("type") || "docker") as "docker" | "exe";
  const action = url.searchParams.get("action") || "download"; // download | info

  if (!licenseId)
    return NextResponse.json({ error: "license_id required" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }

  // Validate license
  const lic = await dbFirst<any>(db,
    `SELECT l.id, l.product, l.license_key, l.status, l.expires_at, l.max_nodes,
            l.package_code, l.billing_cycle, l.amount_usd, l.created_at,
            c.name as client_name, c.email as client_email, c.organization
     FROM licenses l JOIN clients c ON c.id = l.client_id
     WHERE l.id = ? AND c.email = ?`,
    [licenseId, user.email]
  );

  if (!lic)
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  if (lic.status === "revoked" || lic.status === "suspended")
    return NextResponse.json({ error: `License ${lic.status}` }, { status: 403 });
  if (lic.expires_at && new Date(lic.expires_at) < new Date())
    return NextResponse.json({ error: "License expired" }, { status: 403 });

  // Determine what product files client can access based on package
  const pkgInfo = PACKAGE_BUNDLES[lic.package_code];
  let allowedFiles: string[] = [];
  let bundleLabel = lic.package_code;
  let includeGpu = false;

  if (pkgInfo) {
    bundleLabel = pkgInfo.label;
    includeGpu  = pkgInfo.includeGpu ?? false;
    for (const productLine of pkgInfo.products) {
      const files = PRODUCT_LINE_FILES[productLine] || [];
      allowedFiles.push(...files);
    }
  } else {
    // Fallback: derive from license.product field
    const line = lic.product || "guardian";
    allowedFiles = PRODUCT_LINE_FILES[line] || PRODUCT_LINE_FILES["guardian"];
    bundleLabel  = line.charAt(0).toUpperCase() + line.slice(1) + " AI";
  }

  if (allowedFiles.length === 0) {
    return NextResponse.json({ error: "No products available for this license" }, { status: 403 });
  }

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error: "Storage not available" }, { status: 503 });
  }

  // Collect all files for this bundle
  const files: { name: string; data: ArrayBuffer; size: number; product: string }[] = [];
  const missing: string[] = [];

  for (const p of allowedFiles) {
    const key = r2Key(p, type);
    const obj = await r2.get(key).catch(() => null);
    
    if (!obj) {
      missing.push(p);
      continue;
    }

    const ext = type === "docker" ? ".tar.gz" : "-linux";
    const filename = type === "docker" ? `${p}.tar.gz` : `${p}-linux`;
    const data = await obj.arrayBuffer();
    files.push({ name: filename, data, size: data.byteLength, product: p });
  }

  // Return info only
  if (action === "info") {
    return NextResponse.json({
      license_id: licenseId,
      package_code: lic.package_code,
      bundle_label: bundleLabel,
      type,
      total_products: allowedFiles.length,
      ready_products: files.length,
      missing_products: missing,
      files: files.map(f => ({ 
        name: f.name, 
        product: f.product,
        size: f.size, 
        sizeMB: Math.round(f.size / 1024 / 1024 * 10) / 10 
      })),
      totalSizeBytes: files.reduce((sum, f) => sum + f.size, 0),
      totalSizeMB: Math.round(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024 * 10) / 10,
      downloadUrl: `/api/portal/bundle?license_id=${licenseId}&type=${type}`,
    });
  }

  if (files.length === 0) {
    return NextResponse.json({ 
      error: "No files available. Admin is processing builds.",
      missing,
    }, { status: 404 });
  }

  // Create TAR archive with all files
  const chunks: Uint8Array[] = [];
  
  for (const file of files) {
    const header = createTarHeader(file.name, file.size);
    chunks.push(header);
    chunks.push(new Uint8Array(file.data));
    const padding = padTo512(file.size);
    if (padding.length > 0) chunks.push(padding);
  }
  chunks.push(new Uint8Array(1024)); // End of archive
  
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const tarData = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    tarData.set(chunk, offset);
    offset += chunk.length;
  }

  // Log download
  try {
    await dbRun(db,
      `INSERT INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
       VALUES (?, 'bundle_download', 'license', ?, ?, ?, ?)`,
      [
        crypto.randomUUID(), 
        licenseId, 
        user.email,
        JSON.stringify({ 
          type, 
          license_key: lic.license_key, 
          package_code: lic.package_code,
          files_count: files.length,
          total_size: tarData.length,
        }),
        now()
      ]
    ).catch(() => {});
  } catch {}

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const typeLabel = type === "docker" ? "Docker" : "Windows";
  const filename = `AXTO-${bundleLabel.replace(/\s+/g, "-")}-${typeLabel}-${timestamp}.tar`;

  return new NextResponse(tarData, {
    headers: {
      "Content-Type": "application/x-tar",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(tarData.length),
      "Cache-Control": "no-store",
      "X-License-Key": lic.license_key,
      "X-Package": lic.package_code,
      "X-Files-Included": String(files.length),
    },
  });
}
