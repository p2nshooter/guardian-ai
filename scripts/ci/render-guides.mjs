// Renders every self-hosted installation guide (all guide languages) to
// markdown, from the same source as the /self-hosted/<slug>/guide pages.
// Used by CI before the PDF build step. Run from dashboard/ (tsx resolves the
// TypeScript imports):
//   cd dashboard && npx tsx ../scripts/ci/render-guides.mjs ../dist/guides
import { renderGuide, GUIDE_PRODUCTS, GUIDE_LANGS } from "../../dashboard/lib/product-guides.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outDir = resolve(process.argv[2] || "dist/guides");
mkdirSync(outDir, { recursive: true });

let n = 0;
for (const product of GUIDE_PRODUCTS) {
  for (const lang of GUIDE_LANGS) {
    writeFileSync(`${outDir}/axto-${product}-guide-${lang}.md`, renderGuide(product, lang), "utf8");
    n++;
  }
}
console.log(`Rendered ${n} guide markdown files to ${outDir}`);
