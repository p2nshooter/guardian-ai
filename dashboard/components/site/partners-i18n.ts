/* The partner programmes' copy in the visitor's language: English at once (rendered
 * on the server), the nine others loaded on demand from lib/i18n-pages/partners.ts.
 * Shared by the public pages and the member's affiliate portal. */
"use client";
import { useEffect, useState } from "react";
import { useI18n, formatMoney } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-shared";
import { PARTNERS_EN, fillCopy, type PartnersCopy } from "@/lib/partners-copy";

export const fill = fillCopy;

/** The copy in the visitor's language (English at once, the others loaded on demand). */
export function usePartnersCopy(): { t: PartnersCopy; lang: Lang; money: (n: number) => string } {
  const { lang } = useI18n();
  const [dict, setDict] = useState<Partial<Record<Lang, PartnersCopy>> | null>(null);
  useEffect(() => {
    if (lang === "en" || dict) return;
    import("@/lib/i18n-pages/partners").then((m) => setDict(m.PARTNERS)).catch(() => {});
  }, [lang, dict]);
  const t = lang === "en" ? PARTNERS_EN : dict?.[lang] || PARTNERS_EN;
  return { t, lang, money: (n: number) => formatMoney(n, "USD", lang) };
}
