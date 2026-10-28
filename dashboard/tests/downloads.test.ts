/* AXTO — large self-hosted downloads (owner, 28 Oct 2026, REQUESTS 110, BLUEPRINT-V4 §30):
 * the 6 GB Orchestra GPU worker and the offline packages must resume after a
 * dropped connection, and every app's offline package must carry exactly the
 * images AXTO Setup loads. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseRange, buildSize } from "../lib/byte-range";
import { offlineKey } from "../lib/builds";
import { SELF_HOSTED } from "../lib/selfhosted";
import { L } from "../lib/i18n-pages/selfhosted";

const REPO = path.resolve(import.meta.dirname, "../..");
const GB6 = 6_550_000_000; // the GPU worker is ≈ 6.1 GiB

test("Range: resume, open end, suffix and clamping on multi-GB files", () => {
  assert.deepEqual(parseRange("bytes=5000000000-", GB6), { start: 5_000_000_000, end: GB6 - 1 });
  assert.deepEqual(parseRange("bytes=0-1023", GB6), { start: 0, end: 1023 });
  assert.deepEqual(parseRange("bytes=100-99999999999", 1000), { start: 100, end: 999 });
  assert.deepEqual(parseRange("bytes=-500", 1000), { start: 500, end: 999 });
  assert.deepEqual(parseRange("bytes=-5000", 1000), { start: 0, end: 999 });
  assert.equal(parseRange("bytes=1000-", 1000), "unsatisfiable");
  assert.equal(parseRange("bytes=-0", 1000), "unsatisfiable");
});

test("Range: anything else gets the whole file", () => {
  for (const h of [null, "", "bytes=", "bytes=-", "items=0-5", "bytes=5-2", "bytes=0-5,10-20", "bytes=a-b"]) {
    assert.equal(parseRange(h, 1000), null, String(h));
  }
});

test("sizes read like the build list (binary units)", () => {
  assert.equal(buildSize(0), "0 B");
  assert.equal(buildSize(512), "512 B");
  assert.equal(buildSize(1536), "1.50 KB");
  assert.equal(buildSize(6.1 * 1024 ** 3), "6.10 GB");
  assert.equal(buildSize(250 * 1024 ** 2), "250 MB");
});

test("offline packages: every app is packaged with the images AXTO Setup loads (build-offline.yml)", () => {
  const wf = fs.readFileSync(path.join(REPO, ".github/workflows/build-offline.yml"), "utf8").replace(/\r\n/g, "\n");
  const rows = [...wf.matchAll(/- \{ app: ([a-z-]+),\s+images: "([^"]+)" \}/g)].map((m) => ({ app: m[1], images: m[2].split(" ") }));
  assert.equal(rows.length, SELF_HOSTED.length);
  for (const p of SELF_HOSTED) {
    const row = rows.find((r) => r.app === p.slug);
    assert.ok(row, `${p.slug} has no offline package`);
    assert.deepEqual(row!.images, p.images.filter((i) => !i.optional || i.gpu).map((i) => i.name), `${p.slug} offline images`);
    assert.equal(offlineKey(p.slug), `builds/latest/offline/axto-${p.slug}-offline-amd64.zip`);
  }
  assert.match(wf, /builds\/latest\/offline\/\$PKG\.zip/);
  assert.match(wf, /PKG="axto-\$\{APP\}-offline-amd64"/);
});

test("Orchestra's GPU worker is the one optional image AXTO Setup installs on request", () => {
  const orch = SELF_HOSTED.find((p) => p.slug === "orchestra")!;
  assert.deepEqual(orch.images.filter((i) => i.gpu).map((i) => i.name), ["orchestra-worker-gpu"]);
  const go = fs.readFileSync(path.join(REPO, "installer/products.go"), "utf8");
  assert.match(go, /Optional: map\[string\]string\{"orchestra-worker-gpu": "gpu"\}/);
  const compose = fs.readFileSync(path.join(REPO, "orchestra-compose.yml"), "utf8").replace(/\r\n/g, "\n");
  assert.match(compose, /\n  orchestra-worker-gpu:\n    image: axto\/orchestra-worker-gpu:latest\n    container_name: orchestra-worker-gpu-1\n    profiles: \["gpu"\]/);
});

test("download texts: every language keeps the {size} placeholder", () => {
  for (const [lang, d] of Object.entries(L)) {
    for (const k of ["offlineBody", "gpuHint"] as const) assert.match(d[k], /\{size\}/, `${lang}.${k}`);
  }
});
