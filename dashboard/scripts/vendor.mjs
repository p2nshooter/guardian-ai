// Copies browser-only libraries into public/vendor so they are served from our
// own origin (documents are processed in the browser and never leave it).
import { mkdirSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  ["node_modules/pdfjs-dist/build/pdf.min.mjs", "public/vendor/pdfjs/pdf.min.mjs"],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "public/vendor/pdfjs/pdf.worker.min.mjs"],
  // Clipper: on-device face tracking for auto-reframe (MediaPipe, Apache-2.0).
  ["node_modules/@mediapipe/tasks-vision/vision_bundle.mjs", "public/vendor/mediapipe/vision_bundle.mjs"],
  ["node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js", "public/vendor/mediapipe/wasm/vision_wasm_internal.js"],
  ["node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm", "public/vendor/mediapipe/wasm/vision_wasm_internal.wasm"],
  ["node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js", "public/vendor/mediapipe/wasm/vision_wasm_nosimd_internal.js"],
  ["node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm", "public/vendor/mediapipe/wasm/vision_wasm_nosimd_internal.wasm"],
  ["assets/models/blaze_face_short_range.tflite", "public/vendor/mediapipe/blaze_face_short_range.tflite"],
  // AI Studio: diagrams in artifact previews (MIT).
  ["node_modules/mermaid/dist/mermaid.min.js", "public/vendor/mermaid/mermaid.min.js"],
  // Clipper: caption fonts drawn on the canvas (SIL Open Font License).
  ...[
    ["anton", "400"], ["bebas-neue", "400"], ["bangers", "400"],
    ["montserrat", "800"], ["montserrat", "900"], ["poppins", "700"], ["poppins", "800"],
  ].flatMap(([f, w]) => ["latin", "latin-ext"].map((s) =>
    [`node_modules/@fontsource/${f}/files/${f}-${s}-${w}-normal.woff2`, `public/vendor/fonts/${f}-${s}-${w}.woff2`])),
];
// Clipper: ffmpeg.wasm's JS (its worker MUST be same-origin — a CDN worker is
// blocked by the browser). The 31 MB core .wasm is above the Pages file limit,
// so the page fetches it from the CDN into a blob: URL at run time.
for (const [pkg, dest] of [["@ffmpeg/ffmpeg", "ffmpeg"], ["@ffmpeg/util", "ffmpeg-util"]]) {
  const dir = `node_modules/${pkg}/dist/esm`;
  if (!existsSync(join(root, dir))) { console.error(`vendor: missing ${dir} — run npm install`); process.exit(1); }
  for (const f of readdirSync(join(root, dir))) if (f.endsWith(".js")) files.push([`${dir}/${f}`, `public/vendor/${dest}/${f}`]);
}
for (const [from, to] of files) {
  const src = join(root, from);
  if (!existsSync(src)) { console.error(`vendor: missing ${from} — run npm install`); process.exit(1); }
  mkdirSync(dirname(join(root, to)), { recursive: true });
  copyFileSync(src, join(root, to));
}
console.log(`vendor: copied ${files.length} files`);

// Self-hosted config files members download from /configs/* — the repo root
// holds the source of truth (the installer bundles the same files), so copy
// them in on every build and the website can never serve a stale copy.
const cfgDir = join(root, "public/configs");
let synced = 0;
for (const name of readdirSync(cfgDir)) {
  const src = join(root, "..", name);
  if (existsSync(src)) { copyFileSync(src, join(cfgDir, name)); synced++; }
}
console.log(`vendor: synced ${synced} self-hosted config files from the repo root`);
