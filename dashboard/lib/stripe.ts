// ── AXTO Package Catalog ───────────────────────────────────────────────────
// Single source of truth for pricing, package codes, and metadata.
// Synced with: DB migration 0004_pricing_update.sql

export interface PackageInfo {
  name: string;
  description: string;
  price: number;        // annual USD
  priceMonthly: number; // monthly USD (for display; billing is annual)
  product: "guardian" | "orchestra";
  maxNodes?: number;    // -1 = unlimited
  maxWorkers?: number;  // -1 = unlimited
  isBundle?: boolean;
  guardianPackage?: string;
  orchestraPackage?: string;
}

export const PACKAGE_INFO: Record<string, PackageInfo> = {
  // ── Guardian AI ─────────────────────────────────────────────────────────
  lite: {
    name: "Guardian Sentinel",
    description: "1 server protected",
    price: 249, priceMonthly: 25,
    product: "guardian", maxNodes: 1,
  },
  pro: {
    name: "Guardian Pro",
    description: "Up to 20 servers",
    price: 990, priceMonthly: 99,
    product: "guardian", maxNodes: 20,
  },
  shield: {
    name: "Guardian Business",
    description: "Up to 100 servers",
    price: 3990, priceMonthly: 399,
    product: "guardian", maxNodes: 100,
  },
  aegis: {
    name: "Guardian Enterprise",
    description: "Up to 1,000 servers",
    price: 17900, priceMonthly: 1790,
    product: "guardian", maxNodes: 1000,
  },

  // ── Orchestra AI ─────────────────────────────────────────────────────────
  orchestra_core: {
    name: "Orchestra Core",
    description: "Up to 10 workers (CPU + GPU)",
    price: 9900, priceMonthly: 990,
    product: "orchestra", maxWorkers: 10,
  },
  orchestra_scale: {
    name: "Orchestra Scale",
    description: "Up to 50 workers",
    price: 24900, priceMonthly: 2490,
    product: "orchestra", maxWorkers: 50,
  },
  orchestra_unlimited: {
    name: "Orchestra Enterprise",
    description: "Unlimited workers",
    price: 59900, priceMonthly: 5990,
    product: "orchestra", maxWorkers: -1,
  },

  // ── Bundle Plans ─────────────────────────────────────────────────────────
  bundle_starter: {
    name: "Starter Bundle",
    description: "Guardian Pro + Orchestra Core",
    price: 9490, priceMonthly: 949,
    product: "guardian", isBundle: true,
    guardianPackage: "pro", orchestraPackage: "orchestra_core",
  },
  bundle_professional: {
    name: "Professional Bundle",
    description: "Guardian Business + Orchestra Scale",
    price: 24900, priceMonthly: 2490,
    product: "guardian", isBundle: true,
    guardianPackage: "shield", orchestraPackage: "orchestra_scale",
  },
  bundle_enterprise: {
    name: "Enterprise Bundle",
    description: "Guardian Enterprise + Orchestra Enterprise",
    price: 69900, priceMonthly: 6990,
    product: "guardian", isBundle: true,
    guardianPackage: "aegis", orchestraPackage: "orchestra_unlimited",
  },
};

/** Get the default annual price for a package code. */
export function getPackagePrice(code: string): number {
  return PACKAGE_INFO[code]?.price ?? 0;
}

/** Get max nodes for a guardian package code. */
export function getMaxNodes(code: string): number {
  return PACKAGE_INFO[code]?.maxNodes ?? 1;
}

/** Get max workers for an orchestra package code. */
export function getMaxWorkers(code: string): number {
  return PACKAGE_INFO[code]?.maxWorkers ?? 0;
}
