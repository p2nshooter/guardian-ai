/* AXTO — Prompt Library catalogue integrity unit tests (node:test via tsx). Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELDS, LEVELS, PROMPTS, getPrompt, getField, promptsByField, publicPrompt } from "../lib/prompts/catalog";
import { limitsFor, planForPromptLevel, isPlanId, PLANS } from "../lib/plans";

const LEVEL_IDS = LEVELS.map((l) => l.id);
const FIELD_IDS = new Set(FIELDS.map((f) => f.id));

test("fields & levels: well-formed", () => {
  assert.ok(FIELDS.length >= 20, `≥20 fields (got ${FIELDS.length})`);
  assert.equal(new Set(FIELDS.map((f) => f.id)).size, FIELDS.length, "field ids unique");
  for (const f of FIELDS) {
    assert.ok(f.name && f.icon && f.blurb, `${f.id} has name/icon/blurb`);
    assert.ok(Array.isArray(f.keywords) && f.keywords.length, `${f.id} has SEO keywords`);
  }
  assert.deepEqual(LEVEL_IDS, ["basic", "pro", "premium", "elite"], "four ordered levels");
});

test("prompts: unique ids, valid field & level, non-empty body", () => {
  const ids = PROMPTS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "prompt ids unique");
  assert.ok(PROMPTS.length >= 40, `a substantial library (got ${PROMPTS.length})`);
  for (const p of PROMPTS) {
    assert.ok(FIELD_IDS.has(p.field), `${p.id} → known field ${p.field}`);
    assert.ok(LEVEL_IDS.includes(p.level), `${p.id} → known level ${p.level}`);
    assert.ok(p.title && p.summary, `${p.id} has title + summary`);
    assert.ok(p.template.length > 60, `${p.id} template is substantial`);
    assert.ok(/^[a-z][a-z0-9-]+$/.test(p.id), `${p.id} is a clean slug`);
  }
});

test("prompts: every {{variable}} in a template is declared, and vice-versa", () => {
  for (const p of PROMPTS) {
    const used = new Set(Array.from(p.template.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1]));
    const declared = new Set(p.variables.map((v) => v.key));
    for (const key of used) assert.ok(declared.has(key), `${p.id}: {{${key}}} used but not declared`);
    for (const v of p.variables) {
      assert.ok(/^\w+$/.test(v.key), `${p.id}: variable key '${v.key}' is a word`);
      assert.ok(v.label, `${p.id}: variable '${v.key}' has a label`);
      assert.ok(used.has(v.key), `${p.id}: variable '${v.key}' declared but never used in template`);
    }
  }
});

test("coverage: every field has at least one prompt; all four levels represented", () => {
  for (const f of FIELDS) assert.ok(promptsByField(f.id).length >= 1, `${f.id} has ≥1 prompt`);
  for (const lvl of LEVEL_IDS) assert.ok(PROMPTS.some((p) => p.level === lvl), `level ${lvl} has prompts`);
});

test("publicPrompt never leaks the template body", () => {
  for (const p of PROMPTS) {
    const pub = publicPrompt(p) as Record<string, unknown>;
    assert.equal(pub.template, undefined, `${p.id}: public view hides template`);
    assert.equal(pub.example, undefined, `${p.id}: public view hides example`);
    assert.equal(pub.title, p.title);
  }
});

test("plan gating: level → plan mapping is monotonic and consistent with limits", () => {
  // Free unlocks basic only; each higher level needs a real, higher plan.
  assert.deepEqual(limitsFor("none").promptLevels, ["basic"], "free = basic only");
  for (const lvl of LEVEL_IDS) {
    const need = planForPromptLevel(lvl);
    if (lvl === "basic") { assert.equal(need, "none"); continue; }
    assert.ok(isPlanId(need), `${lvl} maps to a real paid plan (${need})`);
    assert.ok(limitsFor(need).promptLevels.includes(lvl), `${need} actually unlocks ${lvl}`);
    assert.ok(PLANS[need as keyof typeof PLANS], `${need} exists in PLANS`);
  }
});

test("getPrompt / getField lookups", () => {
  assert.ok(getPrompt("biz-swot"), "known prompt resolves");
  assert.equal(getPrompt("nope-nope"), undefined, "unknown prompt → undefined");
  assert.ok(getField("business"), "known field resolves");
});
