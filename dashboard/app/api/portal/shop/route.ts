/* ==============================================================================
 * GET /api/portal/shop
 *
 * Single source of truth for the portal shop tab.
 * Prices   → live from license_packages (admin panel) via getAllPackagesWithLivePrices()
 * forSale  → live from license_packages.for_sale via getAllPackagesWithLivePrices()
 * Metadata → static (icons, colors, limit strings, descriptions) — never changes
 *            without a deploy, so it's fine to keep here.
 *
 * No hardcoded prices anywhere in the portal. If admin edits a price in the
 * admin panel, the next portal shop load reflects it automatically.
 *
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================== */
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAllPackagesWithLivePrices } from "@/lib/pricing";
import { PRODUCT_ICONS, PRODUCT_NAMES } from "@/lib/stripe";

interface PkgMeta { limit: string; popular?: boolean; isMonthly?: boolean }

const CATALOG: Record<string, {
  color: string;
  desc: string;
  packages: Record<string, PkgMeta>;
}> = {
  guardian: { color: "#0284c7", desc: "Self-hosted cybersecurity — 7-layer AI detection, antivirus, compliance. BYOK.",
    packages: { lite: {limit:"1 server"}, pro: {limit:"25 servers", popular:true}, shield: {limit:"100 servers"}, aegis: {limit:"1,000 servers"} } },
  orchestra: { color: "#7c3aed", desc: "Self-hosted AI orchestration — route 15+ providers, GPU auto-detect, autoscale. BYOK.",
    packages: { orchestra_core: {limit:"10 workers"}, orchestra_scale: {limit:"50 workers", popular:true}, orchestra_unlimited: {limit:"∞ workers"} } },
  vault: { color: "#6366f1", desc: "AI data privacy — PII/PHI/financial redaction before AI API calls.",
    packages: { vault_starter:{limit:"50K req/day"}, vault_professional:{limit:"500K req/day",popular:true}, vault_business:{limit:"5M req/day"}, vault_enterprise:{limit:"Unlimited"} } },
  edge: { color: "#3b82f6", desc: "AI API gateway — token metering, rate limiting, prompt firewall.",
    packages: { edge_starter:{limit:"100K req/day"}, edge_professional:{limit:"1M req/day",popular:true}, edge_business:{limit:"10M req/day"}, edge_enterprise:{limit:"Unlimited"} } },
  soc: { color: "#dc2626", desc: "AI Security Operations Center — SIEM, SOAR, threat intelligence.",
    packages: { soc_starter:{limit:"5 log sources"}, soc_professional:{limit:"25 log sources",popular:true}, soc_business:{limit:"100 log sources"}, soc_enterprise:{limit:"Unlimited"} } },
  compliance: { color: "#16a34a", desc: "Automated audit — SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR.",
    packages: { compliance_starter:{limit:"2 frameworks (SOC 2 + GDPR)"}, compliance_professional:{limit:"6 frameworks",popular:true}, compliance_business:{limit:"7 frameworks"}, compliance_enterprise:{limit:"Custom / white-label"} } },
  sentinel: { color: "#0f766e", desc: "IoT/OT security — device discovery, ICS protocol detection, IEC 62443.",
    packages: { sentinel_starter:{limit:"50 OT/IoT devices"}, sentinel_professional:{limit:"500 devices",popular:true}, sentinel_business:{limit:"5,000 devices"}, sentinel_enterprise:{limit:"Unlimited"} } },
  antivirus: { color: "#ea580c", desc: "ClamAV + ML behavioral detection — self-hosted endpoint protection.",
    packages: { antivirus_starter: {limit:"10 endpoints"}, antivirus_professional: {limit:"100 endpoints", popular:true}, antivirus_enterprise: {limit:"Unlimited"} } },
  studio: { color: "#8b5cf6", desc: "Central AI & GPU pool — bring your own API keys, managed inference.",
    packages: { studio_starter: {limit:"500 req/day · 1 GPU", isMonthly:true}, studio_professional: {limit:"5K req/day · 5 GPUs · API", isMonthly:true, popular:true}, studio_enterprise: {limit:"Unlimited", isMonthly:true} } },
  legal: { color: "#4338ca", desc: "Self-hosted AI legal intelligence — 30+ jurisdictions, contract analysis, BYOK.",
    packages: { legal_starter: {limit:"30 jurisdictions · 3 workspaces"}, legal_professional: {limit:"100 jurisdictions · 10 workspaces", popular:true}, legal_business: {limit:"195+ jurisdictions · 18 workspaces"}, legal_enterprise: {limit:"Unlimited"} } },
  bundle: { color: "#0d9488", desc: "Bundle two or more products together and save vs. buying each individually.",
    packages: {
      bundle_starter:       { limit: "Guardian Professional + Orchestra Starter" },
      bundle_professional:  { limit: "Guardian Business + Orchestra Professional", popular: true },
      bundle_enterprise:    { limit: "Guardian Enterprise + Orchestra Enterprise" },
      privacy_suite:        { limit: "Vault Professional + Compliance Professional" },
      security_suite:       { limit: "SOC Professional + Sentinel Professional" },
      platform_5:           { limit: "Vault + Edge + SOC + Compliance + Sentinel (all Professional)" },
    } },
};

const PRODUCT_ORDER = ["guardian","orchestra","vault","edge","soc","compliance","sentinel","antivirus","studio","legal","bundle"];

function fmtPrice(n: number): string {
  if (n === 0) return "Free";
  if (n < 1000) return `${n}`;
  return `${n.toLocaleString("en-US")}`;
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let allPkgs: Awaited<ReturnType<typeof getAllPackagesWithLivePrices>> = [];
  try { allPkgs = await getAllPackagesWithLivePrices(req); } catch { allPkgs = []; }

  const byCode: Record<string, typeof allPkgs[0]> = {};
  for (const p of allPkgs) byCode[p.code] = p;

  const products = PRODUCT_ORDER.map((product) => {
    const meta = CATALOG[product];
    if (!meta) return null;
    const packages = Object.entries(meta.packages).map(([code, pm]) => {
      const live = byCode[code];
      const price = live?.price ?? 0;
      const priceMonthly = live?.priceMonthly ?? 0;
      const forSale = live?.forSale ?? false;
      return {
        code, name: live?.name ?? code, limit: pm.limit,
        popular: pm.popular ?? false, isMonthly: pm.isMonthly ?? false,
        price, priceMonthly,
        priceDisplay: fmtPrice(pm.isMonthly ? priceMonthly : price),
        priceSuffix: pm.isMonthly ? "/mo" : "/yr",
        forSale, source: live?.source ?? "static",
      };
    });
    const productForSale = packages.some((p) => p.forSale);
    return { product, name: PRODUCT_NAMES[product] ?? product, icon: PRODUCT_ICONS[product] ?? "📦",
      color: meta.color, desc: meta.desc, forSale: productForSale, packages };
  }).filter(Boolean);

  return NextResponse.json(
    { products, generatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}
