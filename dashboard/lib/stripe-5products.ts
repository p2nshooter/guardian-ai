/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * DEPRECATED — stripe-5products.ts
 *
 * Semua paket dari file ini telah di-merge ke lib/stripe.ts (canonical).
 * File ini hanya shim agar import lama tidak breaking.
 *
 * Jangan tambahkan paket baru di sini — edit lib/stripe.ts langsung.
 */
export {
  PACKAGE_INFO,
  PACKAGE_PRODUCTS,
  getPackagePrice,
  getMaxNodes,
  getMaxWorkers,
  getMaxDevices,
  getMaxRequests,
  getMaxEPS,
  getProductFromCode,
  getPackagesByProduct,
} from "@/lib/stripe";

// Legacy aliases
export { PACKAGE_INFO as NEW_PRODUCT_PACKAGES } from "@/lib/stripe";
export { PACKAGE_PRODUCTS as NEW_PACKAGE_PRODUCTS } from "@/lib/stripe";
export const NEW_VALID_PRODUCTS = ["vault", "soc", "compliance", "edge", "sentinel", "antivirus"];
