/* The AXTO ecosystem as one list (docs/BLUEPRINT-V4.md §18.3): the 7 cloud apps
 * (lib/apps.ts) and the 10 self-hosted apps (lib/product-catalog.ts), with the
 * colour of each app from the owner's "AXTO Digital Global" picture. Pure data. */
import { CLOUD_APPS } from "./apps";
import { PRODUCT_CATALOG } from "./product-catalog";

/** App colours (tailwind.config.cjs `app.*`), by self-hosted slug. */
export const APP_COLORS: Record<string, string> = {
  guardian: "#2f82ff", orchestra: "#9b6bff", vault: "#22c55e", edge: "#38bdf8", soc: "#f43f5e",
  compliance: "#f59e0b", sentinel: "#ef4444", antivirus: "#84cc16", studio: "#ec4899", legal: "#3b82f6",
};
/** Colours of the cloud apps, by cloud slug (kept close to their self-hosted siblings). */
export const CLOUD_COLORS: Record<string, string> = {
  legal: "#3b82f6", prompts: "#9b6bff", studio: "#ec4899", clipper: "#f43f5e", vault: "#22c55e", compliance: "#f59e0b", security: "#2f82ff",
};

export interface EcoApp { slug: string; name: string; href: string; color: string; kind: "cloud" | "self" }

export const ECOSYSTEM_CLOUD: EcoApp[] = CLOUD_APPS.map((a) => ({ slug: a.slug, name: a.name, href: `/apps/${a.slug}`, color: CLOUD_COLORS[a.slug] || "#2f82ff", kind: "cloud" }));
export const ECOSYSTEM_SELF: EcoApp[] = PRODUCT_CATALOG.map((p) => ({ slug: p.slug, name: p.name, href: `/self-hosted/${p.slug}`, color: APP_COLORS[p.slug] || p.color, kind: "self" }));
export const ECOSYSTEM_COUNT = ECOSYSTEM_CLOUD.length + ECOSYSTEM_SELF.length;
