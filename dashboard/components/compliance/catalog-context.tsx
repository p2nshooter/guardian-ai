/* COMPLIANCE CENTER — the catalogue in the member's language for every screen
 * (lib/compliance/catalog.ts): the page loads it once and shares it. */
"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n-shared";
import { COMP_CATALOG_EN, cachedCompCatalog, loadCompCatalog, localize, type CompCatalog, type CompLocal } from "@/lib/compliance/catalog";

const EN_LOCAL = localize(COMP_CATALOG_EN);
export const CompCatalogContext = createContext<CompLocal>(EN_LOCAL);
/** The localised catalogue in any compliance screen (English until the language module has loaded). */
export const useComp = () => useContext(CompCatalogContext);

/** Load the catalogue for `lang` (used once, by the page). */
export function useCompCatalog(lang: Lang): CompLocal {
  const [cat, setCat] = useState<CompCatalog>(cachedCompCatalog(lang) || COMP_CATALOG_EN);
  useEffect(() => {
    let live = true;
    const hit = cachedCompCatalog(lang);
    if (hit) { setCat(hit); return; }
    loadCompCatalog(lang).then((c) => { if (live) setCat(c); });
    return () => { live = false; };
  }, [lang]);
  return useMemo(() => (cat === COMP_CATALOG_EN ? EN_LOCAL : localize(cat)), [cat]);
}
