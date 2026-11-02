/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * The revision of the list prices (plans, self-hosted editions, lifetime).
 *   2 — Asia market prices (REQUESTS 140, 1 Nov 2026).
 *   3 — back to the European market prices (REQUESTS 145, docs/PRICING-BLUEPRINT.md, 2 Nov 2026);
 *       members still find low prices in the auction (lib/auction.ts).
 * Prices an admin stored before this revision belong to an earlier price list, so
 * they give way to the current defaults once; anything saved after it is kept as it is.
 * Switches that are not prices (an edition turned off) are always kept.
 * ============================================================================ */
export const PRICE_REV = 3;

/** True when a stored price setting was saved at the current revision. */
export const currentRev = (v: unknown): boolean => !!v && typeof v === "object" && !Array.isArray(v) && Number((v as any).priceRev) >= PRICE_REV;
