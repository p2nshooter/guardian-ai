// Copies browser-only libraries into public/vendor so they are served from our
// own origin (documents are processed in the browser and never leave it).
import { mkdirSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  ["node_modules/pdfjs-dist/build/pdf.min.mjs", "public/vendor/pdfjs/pdf.min.mjs"],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "public/vendor/pdfjs/pdf.worker.min.mjs"],
];
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
