// Copies browser-only libraries into public/vendor so they are served from our
// own origin (documents are processed in the browser and never leave it).
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
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
