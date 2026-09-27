/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Lifetime (perpetual, offline) licences — list prices.
 * One-time payment, no subscription, no connection to axto.io after activation;
 * limited by the number of devices (1–100). Enterprise deals are negotiated by
 * a person through Support (topic "Lifetime licence"), never by the AI.
 * ============================================================================ */
export type LifetimeScope = "app" | "suite";

export interface LifetimeTier { devices: number; label: string; app: number; suite: number }

/** List prices in USD. `app` = one self-hosted app, `suite` = all 10 apps. */
export const LIFETIME_TIERS: LifetimeTier[] = [
  { devices: 1,   label: "1 device",      app: 24_900,    suite: 149_000 },
  { devices: 5,   label: "up to 5",       app: 99_000,    suite: 590_000 },
  { devices: 10,  label: "up to 10",      app: 179_000,   suite: 990_000 },
  { devices: 25,  label: "up to 25",      app: 390_000,   suite: 1_990_000 },
  { devices: 50,  label: "up to 50",      app: 690_000,   suite: 3_490_000 },
  { devices: 100, label: "up to 100",     app: 1_190_000, suite: 5_900_000 },
];

export const LIFETIME_INCLUDES = [
  "Top-tier features of the chosen app(s), forever, for the purchased major version",
  "Works fully offline — Ed25519-signed activation file per device, no calls to axto.io",
  "12 months of updates included",
  "Windows installer (EXE) and Docker images",
  "Payment by bank/wire transfer (invoice), crypto, or card",
];

export function lifetimePrice(devices: number, scope: LifetimeScope): number | null {
  const t = LIFETIME_TIERS.find((x) => devices <= x.devices);
  return t ? t[scope] : null;
}
