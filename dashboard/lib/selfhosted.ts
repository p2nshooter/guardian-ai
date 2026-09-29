/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * SELF-HOSTED EDITIONS — Docker products that require a paid licence key.
 * Licences are included in the Business (3 apps) and Enterprise (all apps)
 * plans and are always issued at the TOP tier, so self-hosted customers run the
 * most complete version of every engine.
 *
 * Marketing copy lives in lib/product-catalog.ts; this file adds the technical
 * delivery data (key prefix, images, config files, ports, guides).
 * ============================================================================ */
import { PRODUCT_CATALOG, type ProductCatalogEntry } from "./product-catalog";

export interface SelfHostedProduct {
  slug: string;
  keyPrefix: string;          // licence key prefix the engine expects
  packageCode: string;        // top-tier package code signed into every licence
  images: { name: string; label: string; optional?: boolean }[];  // R2: builds/latest/raw/<name>.tar.gz
  exe?: string;               // R2: builds/latest/exe/<exe>-windows.exe (optional)
  compose: string;            // /configs/<compose>
  config: string;             // /configs/<config>
  configTarget: string;       // filename the user saves it as
  port: number;               // default web UI port
  licenseField: string;       // where the key goes in the config file
  service: string;            // compose service that serves the UI (installer/products.go: Service)
  stateDir: string;           // AXTO_STATE_DIR in that service: machine id + Lifetime activation file
}

export const SELF_HOSTED: SelfHostedProduct[] = [
  { slug: "guardian", keyPrefix: "GUARD", packageCode: "aegis",
    images: [{ name: "guardian-core", label: "Guardian Core (API + dashboard)" }, { name: "guardian-node", label: "Guardian Node agent" }],
    exe: "guardian-core", compose: "docker-compose.yml", config: "guardian.example.yml", configTarget: "guardian.yml", port: 8080, licenseField: "guardian.license_key", service: "guardian-core", stateDir: "/guardian/data/.axto" },
  { slug: "orchestra", keyPrefix: "ORCH", packageCode: "orchestra_unlimited",
    images: [{ name: "orchestra-core", label: "Orchestra Core (router + console)" }, { name: "orchestra-worker-cpu", label: "CPU worker" }, { name: "orchestra-worker-gpu", label: "GPU worker (NVIDIA)", optional: true }],
    exe: "orchestra-core", compose: "orchestra-compose.yml", config: "orchestra.example.yml", configTarget: "orchestra.yml", port: 8088, licenseField: "orchestra.license_key", service: "orchestra-core", stateDir: "/app/data/.axto" },
  { slug: "vault", keyPrefix: "VAULT", packageCode: "vault_enterprise",
    images: [{ name: "vault-core", label: "Vault proxy" }],
    exe: "vault-core", compose: "vault-compose.yml", config: "vault.example.yml", configTarget: "vault.yml", port: 8081, licenseField: "vault.license_key", service: "vault-core", stateDir: "/vault/data/.axto" },
  { slug: "edge", keyPrefix: "EDGE", packageCode: "edge_enterprise",
    images: [{ name: "edge-core", label: "Edge gateway" }],
    exe: "edge-core", compose: "edge-compose.yml", config: "edge.example.yml", configTarget: "edge.yml", port: 8082, licenseField: "edge.license_key", service: "edge-core", stateDir: "/edge/data/.axto" },
  { slug: "soc", keyPrefix: "SOC", packageCode: "soc_enterprise",
    images: [{ name: "soc-core", label: "SOC core" }],
    exe: "soc-core", compose: "soc-compose.yml", config: "soc.example.yml", configTarget: "soc.yml", port: 8083, licenseField: "soc.license_key", service: "soc-core", stateDir: "/soc/data/.axto" },
  { slug: "compliance", keyPrefix: "CMPL", packageCode: "compliance_enterprise",
    images: [{ name: "compliance-core", label: "Compliance core" }],
    exe: "compliance-core", compose: "compliance-compose.yml", config: "compliance.example.yml", configTarget: "compliance.yml", port: 8084, licenseField: "compliance.license_key", service: "compliance-core", stateDir: "/compliance/data/.axto" },
  { slug: "sentinel", keyPrefix: "SNTL", packageCode: "sentinel_enterprise",
    images: [{ name: "sentinel-core", label: "Sentinel core" }],
    exe: "sentinel-core", compose: "sentinel-compose.yml", config: "sentinel.example.yml", configTarget: "sentinel.yml", port: 8085, licenseField: "sentinel.license_key", service: "sentinel-core", stateDir: "/sentinel/data/.axto" },
  { slug: "antivirus", keyPrefix: "AV", packageCode: "antivirus_enterprise",
    images: [{ name: "guardian-antivirus", label: "Antivirus engine" }],
    exe: "guardian-antivirus", compose: "antivirus-compose.yml", config: "antivirus.example.yml", configTarget: "antivirus.yml", port: 8086, licenseField: "antivirus.license_key", service: "antivirus", stateDir: "/guardian/data/.axto" },
  { slug: "studio", keyPrefix: "STUD", packageCode: "studio_enterprise",
    images: [{ name: "studio-core", label: "Studio core" }, { name: "ai-studio", label: "AI Studio module", optional: true }, { name: "gpu-studio", label: "GPU Studio module", optional: true }, { name: "hybrid-studio", label: "Hybrid Studio module", optional: true }],
    exe: "studio-core", compose: "studio-compose.yml", config: "studio.example.yml", configTarget: "studio.yml", port: 8090, licenseField: "studio.license_key", service: "studio-core", stateDir: "/axto-state" },
  { slug: "legal", keyPrefix: "LEGL", packageCode: "legal_enterprise",
    images: [{ name: "legal-core", label: "Legal core" }],
    exe: "legal-core", compose: "legal-compose.yml", config: "legal.env.example", configTarget: "legal.env", port: 8096, licenseField: "LEGL_LICENSE_KEY", service: "legal-core", stateDir: "/legal/data/.axto" },
];

export const SELF_HOSTED_SLUGS = SELF_HOSTED.map((p) => p.slug);

export function getSelfHosted(slug: string): SelfHostedProduct | undefined {
  return SELF_HOSTED.find((p) => p.slug === slug);
}

export function productFromKey(key: string): string | null {
  const prefix = key.trim().toUpperCase().split("-")[0];
  return SELF_HOSTED.find((p) => p.keyPrefix === prefix)?.slug ?? null;
}

export function catalogEntry(slug: string): ProductCatalogEntry | undefined {
  return PRODUCT_CATALOG.find((p) => p.slug === slug);
}

/** Generate a licence key in the format every engine accepts: PREFIX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX. */
export async function generateLicenseKey(product: string, hmacSecret?: string): Promise<string> {
  const p = getSelfHosted(product);
  if (!p) throw new Error(`Unknown self-hosted product: ${product}`);
  const seg = () => Array.from(crypto.getRandomValues(new Uint8Array(4))).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const body = `${p.keyPrefix}-${seg()}-${seg()}-${seg()}`;
  if (!hmacSecret) return `${body}-${seg()}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(hmacSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return `${body}-${Array.from(sig.slice(0, 4)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
