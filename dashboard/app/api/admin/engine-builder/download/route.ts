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
import { getR2Builds, getDB, dbFirst } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const PRODUCTS = [
  "guardian-core", "guardian-node", "guardian-antivirus",
  "orchestra-core", "orchestra-worker-cpu", "orchestra-worker-gpu",
  "vault-core", "edge-core", "soc-core", "compliance-core", "sentinel-core", "antivirus-core",
];

function r2Key(product: string, type: "image" | "exe") {
  return type === "image"
    ? `builds/latest/raw/${product}.tar.gz`
    : `builds/latest/exe/${product}-windows.exe`;
}

// Bundle definitions - paket yang dijual ke client
const BUNDLES: Record<string, {
  products: string[];
  type: "image" | "exe";
  label: string;
  description: string;
  packageCodes: string[]; // package_code dari stripe.ts yang bisa akses bundle ini
}> = {
  // Guardian Bundles
  "guardian-image-bundle": {
    products: ["guardian-core", "guardian-node", "guardian-antivirus"],
    type: "image",
    label: "Guardian-AI-Docker-Bundle",
    description: "Guardian AI Complete - Docker Images (Core + Node + Antivirus)",
    packageCodes: ["lite", "pro", "shield", "aegis", "bundle_starter", "bundle_professional", "bundle_enterprise"],
  },
  "guardian-exe-bundle": {
    products: ["guardian-core", "guardian-node", "guardian-antivirus"],
    type: "exe",
    label: "Guardian-AI-Windows-Bundle",
    description: "Guardian AI Complete - Windows EXE (Core + Node + Antivirus)",
    packageCodes: ["lite", "pro", "shield", "aegis", "bundle_starter", "bundle_professional", "bundle_enterprise"],
  },

  // Orchestra Bundles
  "orchestra-image-bundle": {
    products: ["orchestra-core", "orchestra-worker-cpu", "orchestra-worker-gpu"],
    type: "image",
    label: "Orchestra-AI-Docker-Bundle",
    description: "Orchestra AI Complete - Docker Images (Core + CPU Worker + GPU Worker)",
    packageCodes: ["orchestra_core", "orchestra_scale", "orchestra_unlimited", "bundle_starter", "bundle_professional", "bundle_enterprise"],
  },
  "orchestra-exe-bundle": {
    products: ["orchestra-core", "orchestra-worker-cpu", "orchestra-worker-gpu"],
    type: "exe",
    label: "Orchestra-AI-Windows-Bundle",
    description: "Orchestra AI Complete - Windows EXE (Core + CPU Worker + GPU Worker)",
    packageCodes: ["orchestra_core", "orchestra_scale", "orchestra_unlimited", "bundle_starter", "bundle_professional", "bundle_enterprise"],
  },

  // AXTO Vault
  "vault-image-bundle": {
    products: ["vault-core"],
    type: "image",
    label: "AXTO-Vault-Docker",
    description: "AXTO Vault - AI Privacy Layer Docker Image",
    packageCodes: ["vault_starter", "vault_professional", "vault_enterprise", "bundle_professional", "bundle_enterprise"],
  },
  "vault-exe-bundle": {
    products: ["vault-core"],
    type: "exe",
    label: "AXTO-Vault-Windows",
    description: "AXTO Vault - AI Privacy Layer Windows EXE",
    packageCodes: ["vault_starter", "vault_professional", "vault_enterprise", "bundle_professional", "bundle_enterprise"],
  },

  // AXTO Edge
  "edge-image-bundle": {
    products: ["edge-core"],
    type: "image",
    label: "AXTO-Edge-Docker",
    description: "AXTO Edge - AI Gateway Docker Image",
    packageCodes: ["edge_starter", "edge_professional", "bundle_professional", "bundle_enterprise"],
  },

  // AXTO SOC
  "soc-image-bundle": {
    products: ["soc-core"],
    type: "image",
    label: "AXTO-SOC-Docker",
    description: "AXTO SOC - SIEM + SOAR Docker Image",
    packageCodes: ["soc_starter", "soc_professional", "bundle_enterprise"],
  },

  // AXTO Compliance
  "compliance-image-bundle": {
    products: ["compliance-core"],
    type: "image",
    label: "AXTO-Compliance-Docker",
    description: "AXTO Compliance - Automated Audit Docker Image",
    packageCodes: ["compliance_starter", "compliance_professional", "bundle_enterprise"],
  },

  // AXTO Sentinel
  "sentinel-image-bundle": {
    products: ["sentinel-core"],
    type: "image",
    label: "AXTO-Sentinel-Docker",
    description: "AXTO Sentinel - IoT/OT Security Docker Image",
    packageCodes: ["sentinel_starter", "bundle_enterprise"],
  },

  // Full Platform Bundles
  "full-image-bundle": {
    products: PRODUCTS,
    type: "image",
    label: "AXTO-Full-Platform-Docker-Bundle",
    description: "Full AXTO Platform - All 12 Docker Images",
    packageCodes: ["bundle_starter", "bundle_professional", "bundle_enterprise"],
  },
  "full-exe-bundle": {
    products: PRODUCTS,
    type: "exe",
    label: "AXTO-Full-Platform-Windows-Bundle",
    description: "Full AXTO Platform - All 12 Windows EXE",
    packageCodes: ["bundle_starter", "bundle_professional", "bundle_enterprise"],
  },
};

// Helper: Create TAR archive header (simplified for web)
function createTarHeader(name: string, size: number): Uint8Array {
  const header = new Uint8Array(512);
  const encoder = new TextEncoder();
  
  // File name (100 bytes)
  const nameBytes = encoder.encode(name.slice(0, 99));
  header.set(nameBytes, 0);
  
  // File mode (8 bytes) - 0644
  header.set(encoder.encode("0000644\0"), 100);
  
  // Owner UID (8 bytes)
  header.set(encoder.encode("0000000\0"), 108);
  
  // Group GID (8 bytes)
  header.set(encoder.encode("0000000\0"), 116);
  
  // File size (12 bytes, octal)
  const sizeStr = size.toString(8).padStart(11, "0") + "\0";
  header.set(encoder.encode(sizeStr), 124);
  
  // Mtime (12 bytes)
  const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + "\0";
  header.set(encoder.encode(mtime), 136);
  
  // Checksum placeholder (8 spaces)
  header.set(encoder.encode("        "), 148);
  
  // Type flag ('0' = regular file)
  header[156] = 48; // '0'
  
  // Calculate checksum
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i];
  }
  const checksumStr = checksum.toString(8).padStart(6, "0") + "\0 ";
  header.set(encoder.encode(checksumStr), 148);
  
  return header;
}

// Pad to 512-byte boundary
function padTo512(size: number): Uint8Array {
  const remainder = size % 512;
  if (remainder === 0) return new Uint8Array(0);
  return new Uint8Array(512 - remainder);
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const product = url.searchParams.get("product");
  const type = url.searchParams.get("type") as "image" | "exe" | null;
  const bundle = url.searchParams.get("bundle");
  const format = url.searchParams.get("format") || "tar"; // tar or individual

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error: "R2 not available" }, { status: 503 });
  }

  // ── Single product download ─────────────────────────────────────────────
  if (product && type && !bundle) {
    if (!PRODUCTS.includes(product))
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });

    const key = r2Key(product, type);
    const obj = await r2.get(key).catch(() => null);
    if (!obj) return NextResponse.json({ error: "File not found", key }, { status: 404 });

    const ext = type === "image" ? ".tar.gz" : "-windows.exe";
    return new NextResponse(obj.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${product}${ext}"`,
        "Content-Length": String(obj.size || ""),
        "Cache-Control": "no-store",
      },
    });
  }

  // ── Bundle download - PACKAGING (all files in one archive) ──────────────
  if (bundle && BUNDLES[bundle]) {
    const b = BUNDLES[bundle];
    
    // Collect all files
    const files: { name: string; data: ArrayBuffer; size: number }[] = [];
    let totalSize = 0;
    const missing: string[] = [];

    for (const p of b.products) {
      const key = r2Key(p, b.type);
      const obj = await r2.get(key).catch(() => null);
      
      if (!obj) {
        missing.push(p);
        continue;
      }

      const ext = b.type === "image" ? ".tar.gz" : "-windows.exe";
      const filename = `${p}${ext}`;
      const data = await obj.arrayBuffer();
      files.push({ name: filename, data, size: data.byteLength });
      totalSize += data.byteLength;
    }

    if (files.length === 0) {
      return NextResponse.json({ 
        error: "No files available for this bundle. Build products first.",
        missing,
      }, { status: 404 });
    }

    // Return info if format=info
    if (format === "info") {
      return NextResponse.json({
        bundle,
        label: b.label,
        description: b.description,
        totalFiles: b.products.length,
        readyFiles: files.length,
        missingFiles: missing,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round(totalSize / 1024 / 1024 * 10) / 10,
        files: files.map(f => ({ name: f.name, size: f.size, sizeMB: Math.round(f.size / 1024 / 1024 * 10) / 10 })),
      });
    }

    // Create TAR archive with all files
    const chunks: Uint8Array[] = [];
    
    for (const file of files) {
      // Add TAR header
      const header = createTarHeader(file.name, file.size);
      chunks.push(header);
      
      // Add file content
      chunks.push(new Uint8Array(file.data));
      
      // Add padding to 512-byte boundary
      const padding = padTo512(file.size);
      if (padding.length > 0) chunks.push(padding);
    }
    
    // Add end-of-archive markers (two 512-byte zero blocks)
    chunks.push(new Uint8Array(1024));
    
    // Combine all chunks
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const tarData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      tarData.set(chunk, offset);
      offset += chunk.length;
    }

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `${b.label}-${timestamp}.tar`;

    return new NextResponse(tarData, {
      headers: {
        "Content-Type": "application/x-tar",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(tarData.length),
        "Cache-Control": "no-store",
        "X-Bundle": bundle,
        "X-Files-Included": String(files.length),
        "X-Files-Missing": missing.join(",") || "none",
      },
    });
  }

  // ── List available bundles ──────────────────────────────────────────────
  if (!product && !bundle) {
    const bundleStatus: any[] = [];
    
    for (const [id, b] of Object.entries(BUNDLES)) {
      const files: any[] = [];
      for (const p of b.products) {
        const key = r2Key(p, b.type);
        const head = await r2.head(key).catch(() => null);
        files.push({
          product: p,
          ready: !!head,
          size: head?.size || 0,
        });
      }
      
      bundleStatus.push({
        id,
        label: b.label,
        description: b.description,
        type: b.type,
        products: b.products,
        readyCount: files.filter(f => f.ready).length,
        totalCount: b.products.length,
        allReady: files.every(f => f.ready),
        files,
        downloadUrl: `/api/admin/engine-builder/download?bundle=${id}`,
        infoUrl: `/api/admin/engine-builder/download?bundle=${id}&format=info`,
      });
    }

    return NextResponse.json({
      bundles: bundleStatus,
      totalBundles: Object.keys(BUNDLES).length,
    });
  }

  return NextResponse.json({ error: "Specify product+type or bundle" }, { status: 400 });
}
