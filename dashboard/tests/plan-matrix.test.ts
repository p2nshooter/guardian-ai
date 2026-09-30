/* AXTO — the plan comparison matrix is derived from the enforced plan limits,
 * so what the member / admin / public pages show is what the portal grants. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { planMatrix, improves } from "../lib/plan-matrix";
import { PLANS, PLAN_ORDER } from "../lib/plans";
import { CLOUD_APPS } from "../lib/apps";
import { PM } from "../lib/i18n-pages/planmatrix";

const row = (k: string) => planMatrix().find((r) => r.key === k)!;

test("plan matrix: every live app and every limit has a row that matches lib/plans", () => {
  const rows = planMatrix();
  for (const a of CLOUD_APPS.filter((x) => x.live)) assert.ok(rows.some((r) => r.key === a.slug), a.slug);
  for (const id of PLAN_ORDER) {
    const L = PLANS[id].limits;
    for (const a of CLOUD_APPS.filter((x) => x.live)) assert.equal(row(a.slug).cells[id].kind !== "no", L.apps.includes(a.slug), `${id}/${a.slug}`);
    assert.deepEqual(row("storage").cells[id], { kind: "count", n: L.storageGB, unit: "gb" });
    assert.deepEqual(row("prompts").cells[id], { kind: "levels", levels: L.promptLevels });
  }
  assert.deepEqual(row("legal").cells.starter, { kind: "count", n: 6, unit: "workspaces" });
  assert.deepEqual(row("legal").cells.pro, { kind: "count", n: 36, unit: "workspaces" });
  assert.deepEqual(row("clipper").cells.enterprise, { kind: "unlimited" });
  assert.deepEqual(row("shApps").cells.starter, { kind: "no" });
  assert.deepEqual(row("shApps").cells.business, { kind: "count", n: 3, unit: "apps" });
});

test("plan matrix: differences and 'new in this plan' badges", () => {
  assert.equal(row("aiByok").differs, false, "BYOK is unlimited everywhere");
  assert.equal(row("compliance").differs, true);
  assert.ok(improves(row("compliance"), "pro") && !improves(row("compliance"), "business"));
  assert.ok(improves(row("shApps"), "business") && improves(row("shApps"), "enterprise"));
  assert.ok(!improves(row("storage"), "starter"), "the first plan never shows 'new'");
});

test("plan matrix: every row and unit has a label in every language", () => {
  for (const [lang, d] of Object.entries(PM)) {
    for (const r of planMatrix()) assert.ok(r.label || (d.rows as Record<string, string>)[r.key], `${lang}: ${r.key}`);
    for (const u of ["gb", "videos", "nodes", "apps", "workspaces"] as const) assert.match(d.units[u], /\{n\}/, `${lang}: ${u}`);
  }
});
