// Renders every product guide (all languages) to markdown files.
// Used by CI before the PDF build step. Run:
//   node --experimental-strip-types scripts/ci/render-guides.mjs <outDir>
import { renderGuide, GUIDE_PRODUCTS } from "../../dashboard/lib/product-guides.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outDir = resolve(process.argv[2] || "dist/guides");
mkdirSync(outDir, { recursive: true });

const LANGS = ["en", "id"];
let n = 0;
for (const product of GUIDE_PRODUCTS) {
  for (const lang of LANGS) {
    const md = renderGuide(product, lang);
    writeFileSync(`${outDir}/axto-${product}-guide-${lang}.md`, md, "utf8");
    n++;
  }
}
console.log(`Rendered ${n} guide markdown files to ${outDir}`);
