/* AXTO — Prompt Library catalogue: size, balance, ids, and {{variables}}. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELDS, LEVELS, PROMPTS, publicPrompt } from "../lib/prompts/catalog";

test("240 prompts: 10 per field, every level in every field", () => {
  assert.equal(FIELDS.length, 24);
  assert.equal(PROMPTS.length, 240);
  for (const f of FIELDS) {
    const list = PROMPTS.filter((p) => p.field === f.id);
    assert.equal(list.length, 10, `${f.id} has ${list.length}`);
    for (const l of LEVELS) assert.ok(list.filter((p) => p.level === l.id).length >= 2, `${f.id}: at least 2 ${l.id}`);
  }
});

test("ids are unique and URL-safe; every prompt is well formed", () => {
  const ids = PROMPTS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "unique ids");
  for (const p of PROMPTS) {
    assert.match(p.id, /^[a-z0-9-]{3,40}$/, p.id);
    assert.ok(FIELDS.some((f) => f.id === p.field), `${p.id}: known field`);
    assert.ok(p.title.length >= 5 && p.title.length <= 70, `${p.id}: title length`);
    assert.ok(p.summary.length >= 20 && p.summary.length <= 160, `${p.id}: summary length ${p.summary.length}`);
    assert.ok(p.template.length >= 200, `${p.id}: template is substantial`);
  }
});

test("every {{variable}} in a template is declared, and every declared variable is used", () => {
  for (const p of PROMPTS) {
    const used = new Set(Array.from(p.template.matchAll(/\{\{(\w+)\}\}/g), (m) => m[1]));
    const declared = new Set(p.variables.map((v) => v.key));
    for (const u of used) assert.ok(declared.has(u), `${p.id}: {{${u}}} not declared`);
    for (const d of declared) assert.ok(used.has(d), `${p.id}: variable ${d} unused`);
    for (const v of p.variables) assert.ok(v.label.trim(), `${p.id}: ${v.key} has a label`);
  }
});

test("the public view never exposes the template body", () => {
  for (const p of PROMPTS) assert.equal((publicPrompt(p) as Record<string, unknown>).template, undefined);
});
