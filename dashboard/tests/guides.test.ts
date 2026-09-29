/* AXTO — self-hosted installation guides (web + PDF source). Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { GUIDE_PRODUCTS, GUIDE_LANGS, guideFor, renderGuide } from "../lib/product-guides";
import { SELF_HOSTED } from "../lib/selfhosted";

test("guides: one per self-hosted app, in every guide language, with the same sections", () => {
  assert.deepEqual(GUIDE_PRODUCTS, SELF_HOSTED.map((p) => p.slug));
  const ids = guideFor("vault", "en")!.sections.map((s) => s.id);
  assert.deepEqual(ids, ["requirements", "setup", "docker", "online", "offline", "update", "data", "troubleshooting"]);
  for (const slug of GUIDE_PRODUCTS) for (const lang of GUIDE_LANGS) {
    const g = guideFor(slug, lang)!;
    assert.deepEqual(g.sections.map((s) => s.id), ids, `${slug}/${lang}`);
    for (const s of g.sections) assert.ok(s.title && s.steps.length, `${slug}/${lang}/${s.id}`);
  }
  assert.equal(guideFor("nope"), null);
});

test("guides: every command uses the product's real files, service, port and state dir", () => {
  for (const p of SELF_HOSTED) {
    const md = renderGuide(p.slug, "en");
    assert.ok(md.includes(`-f ${p.compose} up -d`), `${p.slug} start command`);
    assert.ok(md.includes(`exec -T ${p.service} cat ${p.stateDir}/machine-id`), `${p.slug} machine id`);
    assert.ok(md.includes(`${p.service}:${p.stateDir}/${p.slug}.axto-license`), `${p.slug} activation copy`);
    assert.ok(md.includes(`http://localhost:${p.port}`), `${p.slug} port`);
    assert.ok(md.includes(`--key ${p.keyPrefix}-`), `${p.slug} key prefix`);
    for (const i of p.images.filter((x) => !x.optional)) assert.ok(md.includes(`docker load -i ${i.name}.tar.gz`), `${p.slug} image ${i.name}`);
    assert.equal((md.match(/```/g) || []).length % 2, 0, `${p.slug} fenced code balanced`);
  }
});
