/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * The revision of the list prices (plans, self-hosted editions, lifetime).
 *   2 — Asia market prices (REQUESTS 140, docs/PRICING-BLUEPRINT.md, 1 Nov 2026).
 * Prices an admin stored before this revision were the old list prices, so they
 * give way to the new defaults once; anything saved after it is kept as it is.
 * Switches that are not prices (an edition turned off) are always kept.
 * ============================================================================ */
export const PRICE_REV = 2;

/** True when a stored price setting was saved at the current revision. */
export const currentRev = (v: unknown): boolean => !!v && typeof v === "object" && !Array.isArray(v) && Number((v as any).priceRev) >= PRICE_REV;
