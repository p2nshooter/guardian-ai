/* Feature lines of lib/editions.ts in the visitor's language (lib/i18n-pages/editions.ts). */
import type { Lang } from "./i18n-shared";
import { ED } from "./i18n-pages/editions";

/** Translated feature line; falls back to English for a line that is not in the list. */
export function featureText(lang: Lang, line: string): string {
  const i = ED.en.feat.indexOf(line);
  return i >= 0 ? ED[lang]?.feat[i] || line : line;
}
