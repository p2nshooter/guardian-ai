/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * LICENCE AUCTION — what can be put up for auction, and at what normal price.
 * A package is one of the products the checkout already sells:
 *   edition:<code>:<yearly|monthly>     one self-hosted app in one edition
 *   lifetime:app:<product>:<devices>    a perpetual offline licence for one app
 *   lifetime:suite:<devices>            the same for all 10 apps
 * The normal price is read from the live price tables (Admin → Plans) when a
 * lot opens, so an auction always starts from what the shop charges that day.
 * Pure: no storage.
 * ============================================================================ */
import { EDITIONS, editionPrice, getEdition, type EditionPrice } from "./editions";
import { LIFETIME_TIERS, type LifetimeTier } from "./lifetime";
import { SELF_HOSTED_SLUGS, catalogEntry } from "./selfhosted";
import { PACKAGE_RE, type LotKind } from "./auction-terms";

export interface PackageSpec {
  key: string; kind: LotKind; app: string; title: string;
  editionCode: string; billing: "yearly" | "monthly" | "once"; scope: "" | "app" | "suite"; product: string; devices: number;
}

const appName = (slug: string) => (slug === "suite" ? "AXTO Suite (all 10 apps)" : catalogEntry(slug)?.name || slug);

export function parsePackage(key: string): PackageSpec | null {
  if (!PACKAGE_RE.test(key)) return null;
  const p = key.split(":");
  if (p[0] === "edition") {
    const e = getEdition(p[1]!);
    if (!e) return null;
    const billing = p[2] === "monthly" ? "monthly" : "yearly";
    return { key, kind: "edition", app: e.app, editionCode: e.code, billing, scope: "", product: e.app, devices: 0,
      title: `${appName(e.app)} — ${e.name} edition, ${billing === "yearly" ? "1 year" : "1 month"}` };
  }
  const suite = p[1] === "suite";
  const product = suite ? "suite" : p[2]!;
  const devices = Number(suite ? p[2] : p[3]);
  if (!suite && !SELF_HOSTED_SLUGS.includes(product)) return null;
  if (!LIFETIME_TIERS.some((t) => t.devices === devices)) return null;
  return { key, kind: "lifetime", app: product, editionCode: "", billing: "once", scope: suite ? "suite" : "app", product, devices,
    title: `${appName(product)} — Lifetime licence, ${devices === 1 ? "1 device" : `up to ${devices} devices`}${suite ? " per app" : ""}` };
}

/** Today's shop price of a package (USD), or null when it is not on sale. */
export function normalPrice(spec: PackageSpec, editions: EditionPrice[], tiers: LifetimeTier[]): number | null {
  if (spec.kind === "edition") return editionPrice(spec.editionCode, spec.billing === "monthly" ? "monthly" : "yearly", editions);
  const t = tiers.find((x) => x.devices === spec.devices);
  return t ? (spec.scope === "suite" ? t.suite : t.app) : null;
}

/** Every package an administrator can choose, grouped by app (Admin → Auctions). */
export function packageCatalog(): { app: string; name: string; packages: PackageSpec[] }[] {
  const groups = SELF_HOSTED_SLUGS.map((slug) => ({
    app: slug, name: appName(slug),
    packages: [
      ...EDITIONS.filter((e) => e.app === slug).flatMap((e) => [`edition:${e.code}:yearly`, `edition:${e.code}:monthly`]),
      ...LIFETIME_TIERS.map((t) => `lifetime:app:${slug}:${t.devices}`),
    ].map((k) => parsePackage(k)).filter((x): x is PackageSpec => !!x),
  }));
  groups.push({ app: "suite", name: appName("suite"), packages: LIFETIME_TIERS.map((t) => parsePackage(`lifetime:suite:${t.devices}`)!).filter(Boolean) });
  return groups;
}

/** A short, id-safe slug of a package key, for deterministic lot ids. */
export const packageSlug = (key: string) => key.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60);
