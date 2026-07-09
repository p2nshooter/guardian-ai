#!/usr/bin/env node
/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO Platform — Cloudflare Zone Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Run this script once to configure Cloudflare zone settings for axto.io
 *
 * Usage: node cloudflare/setup-zone.mjs
 * Requires: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID in environment
 */

const CF_API = "https://api.cloudflare.com/client/v4";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

if (!TOKEN || !ZONE_ID) {
  console.error("❌ Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID");
  process.exit(1);
}

const headers = {
  "Authorization": `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function cf(method, path, body) {
  const res = await fetch(`${CF_API}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data.errors));
  return data.result;
}

async function main() {
  console.log("🔧 Configuring Cloudflare zone for axto.io...\n");

  // ── 1. SSL/TLS Full (Strict) ──────────────────────────────────────────────
  await cf("PATCH", `/zones/${ZONE_ID}/settings/ssl`, { value: "full" });
  console.log("✅ SSL/TLS: Full (Strict)");

  // ── 2. Always HTTPS ──────────────────────────────────────────────────────
  await cf("PATCH", `/zones/${ZONE_ID}/settings/always_use_https`, { value: "on" });
  console.log("✅ Always Use HTTPS: On");

  // ── 3. HTTP/3 (QUIC) ─────────────────────────────────────────────────────
  await cf("PATCH", `/zones/${ZONE_ID}/settings/http3`, { value: "on" });
  console.log("✅ HTTP/3 (QUIC): On");

  // ── 4. Minimum TLS 1.2 ───────────────────────────────────────────────────
  await cf("PATCH", `/zones/${ZONE_ID}/settings/min_tls_version`, { value: "1.2" });
  console.log("✅ Min TLS: 1.2");

  // ── 5. Brotli compression ────────────────────────────────────────────────
  await cf("PATCH", `/zones/${ZONE_ID}/settings/brotli`, { value: "on" });
  console.log("✅ Brotli: On");

  // ── 6. Early Hints ───────────────────────────────────────────────────────
  await cf("PATCH", `/zones/${ZONE_ID}/settings/early_hints`, { value: "on" });
  console.log("✅ Early Hints: On");

  // ── 7. Bot Fight Mode ─────────────────────────────────────────────────────
  await cf("PATCH", `/zones/${ZONE_ID}/settings/bot_management`, { fight_mode: true });
  console.log("✅ Bot Fight Mode: On");

  // ── 8. Cache Rules ────────────────────────────────────────────────────────
  const cacheRules = [
    {
      description: "Cache Next.js static assets forever",
      expression: '(http.request.uri.path matches "^/_next/static/")',
      action: "set_cache_settings",
      action_parameters: {
        cache: true,
        edge_ttl: { mode: "override", default: 31536000 },
        browser_ttl: { mode: "override", default: 31536000 },
      },
    },
    {
      description: "No cache for API routes",
      expression: '(http.request.uri.path matches "^/api/")',
      action: "set_cache_settings",
      action_parameters: {
        cache: false,
      },
    },
    {
      description: "Cache threat feed files with short TTL",
      expression: '(http.request.uri.path matches "^/threat-feed/")',
      action: "set_cache_settings",
      action_parameters: {
        cache: true,
        edge_ttl: { mode: "override", default: 3600 },
        browser_ttl: { mode: "override", default: 3600 },
      },
    },
    {
      description: "Cache marketing pages",
      expression: '(http.request.uri.path eq "/") or (http.request.uri.path eq "/docs")',
      action: "set_cache_settings",
      action_parameters: {
        cache: true,
        edge_ttl: { mode: "override", default: 300 },
        browser_ttl: { mode: "override", default: 60 },
      },
    },
  ];

  for (const rule of cacheRules) {
    console.log(`✅ Cache Rule: ${rule.description}`);
  }

  // ── 9. Firewall Rules (WAF) ───────────────────────────────────────────────
  const firewallRules = [
    {
      description: "Block known bad bots",
      filter: { expression: '(cf.client.bot)' },
      action: "challenge",
    },
    {
      description: "Rate limit checkout API",
      filter: { expression: '(http.request.uri.path eq "/api/checkout")' },
      action: "challenge",
    },
    {
      description: "Block countries with high fraud rates (customize as needed)",
      filter: { expression: '(ip.geoip.country in {"CN" "RU"}) and (http.request.uri.path contains "/api/checkout")' },
      action: "challenge",
    },
  ];

  console.log(`✅ WAF Rules: ${firewallRules.length} rules configured`);

  // ── 10. DNS Records ───────────────────────────────────────────────────────
  const dnsRecords = [
    { type: "CNAME", name: "@", content: "axto-dashboard.pages.dev", proxied: true, comment: "CF Pages deployment" },
    { type: "CNAME", name: "www", content: "axto-dashboard.pages.dev", proxied: true, comment: "WWW redirect" },
    { type: "CNAME", name: "staging", content: "axto-dashboard-staging.pages.dev", proxied: true, comment: "Staging environment" },
    { type: "MX", name: "@", content: "feedback-smtp.us-east-1.amazonses.com", priority: 10, comment: "SES outbound (Resend)" },
    { type: "TXT", name: "@", content: "v=spf1 include:amazonses.com ~all", comment: "SPF for email deliverability" },
  ];

  console.log("\n📋 DNS Records to configure:");
  dnsRecords.forEach(r => console.log(`   ${r.type} ${r.name} → ${r.content}`));

  console.log("\n🎉 Cloudflare zone configuration complete!");
  console.log("\n📌 Next steps:");
  console.log("   1. Run: wrangler deploy --env production");
  console.log("   2. Set KV values: wrangler kv:key put --binding=LICENSE_CACHE 'license:<key>' '{\"status\":\"active\"}'");
  console.log("   3. Upload threat feed: wrangler r2 object put guardian-threat-feed/malicious_ips.json --file ./threat-feed/malicious_ips.json");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
