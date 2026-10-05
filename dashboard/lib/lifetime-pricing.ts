/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Today's lifetime prices for display (public /pricing, member portal, admin):
 * the list table with the Friday deal applied, plus when the deal ends and when
 * the next one starts. Checkout recomputes the same numbers on the server.
 * ============================================================================ */
import { getLifetimePrices, type LifetimeTier } from "./lifetime";
import { dealState, discounted, getDealConfig, type DealConfig, type DealState } from "./lifetime-deals";

export interface DealTier extends LifetimeTier { appDeal: number; suiteDeal: number }
/** The public rules (shown so customers know when the next deal comes); the offer minimum stays private. */
export interface DealRules { enabled: boolean; fridayPct: number; lastFridayPct: number; tz: string }
export interface DealPayload { deal: DealState; rules: DealRules; tiers: DealTier[]; offersEnabled: boolean; offerValidDays: number }

export function dealTiers(tiers: LifetimeTier[], deal: DealState): DealTier[] {
  const pct = deal.active?.pct || 0;
  return tiers.map((t) => ({ ...t, appDeal: pct ? discounted(t.app, pct) : t.app, suiteDeal: pct ? discounted(t.suite, pct) : t.suite }));
}

export async function dealPayload(db: any, at: Date = new Date()): Promise<DealPayload & { cfg: DealConfig }> {
  const [cfg, tiers] = await Promise.all([getDealConfig(db), getLifetimePrices(db)]);
  const deal = dealState(at, cfg);
  const rules = { enabled: cfg.enabled, fridayPct: cfg.fridayPct, lastFridayPct: cfg.lastFridayPct, tz: cfg.tz };
  return { deal, rules, tiers: dealTiers(tiers, deal), offersEnabled: cfg.offersEnabled, offerValidDays: cfg.offerValidDays, cfg };
}
