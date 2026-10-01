/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PLAN COMPARISON — every row is derived from PLANS[...].limits (lib/plans.ts),
 * so the public pricing page, the member billing page and the admin plans page
 * show exactly what the entitlement checks enforce. Pure: no React, no i18n —
 * rows carry a key the page translates.
 * ============================================================================ */
import { PLANS, PLAN_ORDER, type PlanId } from "./plans";
import { CLOUD_APPS } from "./apps";

export type Cell =
  | { kind: "yes" }
  | { kind: "no" }
  | { kind: "unlimited" }
  | { kind: "count"; n: number; unit?: "gb" | "videos" | "nodes" | "apps" | "workspaces" | "keys" | "rpm" | "hooks" }
  | { kind: "levels"; levels: string[] };

export type RowGroup = "ai" | "apps" | "limits" | "dev" | "selfHosted" | "support";
export interface Row {
  key: string;                 // i18n key (or an app slug for app rows)
  group: RowGroup;
  label?: string;              // brand names (apps) are not translated
  cells: Record<PlanId, Cell>;
  differs: boolean;            // not the same on every plan
}

const per = (f: (id: PlanId) => Cell) => Object.fromEntries(PLAN_ORDER.map((id) => [id, f(id)])) as Record<PlanId, Cell>;
const num = (n: number, unit?: Extract<Cell, { kind: "count" }>["unit"]): Cell => (n === -1 ? { kind: "unlimited" } : n === 0 ? { kind: "no" } : { kind: "count", n, unit });
const same = (a: Cell, b: Cell) => JSON.stringify(a) === JSON.stringify(b);

export function planMatrix(): Row[] {
  const L = (id: PlanId) => PLANS[id].limits;
  const rows: Omit<Row, "differs">[] = [
    { key: "aiByok", group: "ai", cells: per(() => ({ kind: "unlimited" })) },
    { key: "localMode", group: "ai", cells: per((id) => (L(id).localMode ? { kind: "yes" } : { kind: "no" })) },
    ...CLOUD_APPS.filter((a) => a.live).map((a): Omit<Row, "differs"> => ({
      key: a.slug, group: "apps", label: a.name,
      cells: per((id) => !L(id).apps.includes(a.slug) ? { kind: "no" }
        : a.slug === "legal" ? { kind: "count", n: L(id).legalWorkspaces === "all" ? 36 : 6, unit: "workspaces" }
        : a.slug === "clipper" ? num(L(id).clipperVideosPerMonth, "videos")
        : a.slug === "prompts" ? { kind: "levels", levels: L(id).promptLevels }
        : { kind: "yes" }),
    })),
    { key: "storage", group: "limits", cells: per((id) => num(L(id).storageGB, "gb")) },
    { key: "apiKeys", group: "dev", cells: per((id) => num(L(id).apiKeys, "keys")) },
    { key: "apiRpm", group: "dev", cells: per((id) => num(L(id).apiRpm, "rpm")) },
    { key: "webhooks", group: "dev", cells: per((id) => num(L(id).webhooks, "hooks")) },
    { key: "realtime", group: "dev", cells: per((id) => (L(id).apiKeys > 0 ? { kind: "yes" } : { kind: "no" })) },
    { key: "shApps", group: "selfHosted", cells: per((id) => num(L(id).selfHostedApps, "apps")) },
    { key: "shNodes", group: "selfHosted", cells: per((id) => num(L(id).selfHostedNodes, "nodes")) },
    { key: "shDocker", group: "selfHosted", cells: per((id) => (L(id).selfHostedApps !== 0 ? { kind: "yes" } : { kind: "no" })) },
    { key: "airGapped", group: "selfHosted", cells: per((id) => (L(id).selfHostedApps === -1 ? { kind: "yes" } : { kind: "no" })) },
    { key: "support", group: "support", cells: per((id) => (id === "enterprise" ? { kind: "yes" } : { kind: "no" })) },
  ];
  return rows.map((r) => ({ ...r, differs: PLAN_ORDER.some((id) => !same(r.cells[id], r.cells[PLAN_ORDER[0]])) }));
}

/** Better than on the plan below? (for the "new in this plan" badge) */
export function improves(row: Row, id: PlanId): boolean {
  const i = PLAN_ORDER.indexOf(id);
  if (i <= 0) return false;
  return !same(row.cells[id], row.cells[PLAN_ORDER[i - 1]]) && row.cells[id].kind !== "no";
}
