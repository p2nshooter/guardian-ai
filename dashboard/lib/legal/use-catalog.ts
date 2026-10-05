/* The Legal AI catalogue in the portal language, as a React hook (see catalog.ts). */
"use client";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n-shared";
import { CATALOG_EN, cachedLegalCatalog, loadLegalCatalog, type LegalCatalog } from "./catalog";

/** The catalogue for the portal language; English until the language module has loaded. */
export function useLegalCatalog(lang: Lang): LegalCatalog {
  const [cat, setCat] = useState<LegalCatalog>(cachedLegalCatalog(lang) || CATALOG_EN);
  useEffect(() => {
    let live = true;
    if (cachedLegalCatalog(lang)) { setCat(cachedLegalCatalog(lang)!); return; }
    loadLegalCatalog(lang).then((c) => { if (live) setCat(c); });
    return () => { live = false; };
  }, [lang]);
  return cat;
}
