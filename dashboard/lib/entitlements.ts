/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Top-tier entitlements per self-hosted engine — signed into every online
 * licence answer (/api/license-validate) AND every Lifetime activation file,
 * so an engine always takes its limits from signed data, never from plain JSON.
 * ============================================================================ */

// Deterministic, signable entitlements: "package=<code>;<k>=<v>;…" (keys sorted).
export function serializeEntitlements(features: Record<string, any>, packageCode: string): string {
  const parts = [`package=${packageCode || ""}`];
  for (const k of Object.keys(features).sort()) {
    const v = features[k];
    parts.push(`${k}=${typeof v === "boolean" ? (v ? "true" : "false") : String(v)}`);
  }
  return parts.join(";");
}

// Top-tier feature sets — identical to the v2 server's answers for the top
// package of each engine, so the engines unlock their most complete version.
export function buildFeatures(product: string, packageCode: string, maxNodes: number): Record<string, any> {
  // max_nodes is in every signed entitlement set, so no engine ever falls back to an unsigned limit.
  const base = { ai_pool: true, support_chat: true, byok: true, self_hosted: true, max_nodes: maxNodes };
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
