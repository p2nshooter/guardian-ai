/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * i18n primitives shared by server and client (NO "use client" — so server
 * layouts can read dirOf/isLang while the client provider lives in i18n.tsx).
 * ============================================================================ */
export type Lang = "en" | "id" | "de" | "fr" | "it" | "ms" | "ja" | "zh" | "hi" | "ar";

export const LANG_COOKIE = "axto_lang";

/** Display order in the switcher: native name + English name + text direction. */
export const LANGS: { code: Lang; native: string; en: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", native: "English", en: "English", dir: "ltr" },
  { code: "id", native: "Bahasa Indonesia", en: "Indonesian", dir: "ltr" },
  { code: "ms", native: "Bahasa Melayu", en: "Malay", dir: "ltr" },
  { code: "de", native: "Deutsch", en: "German", dir: "ltr" },
  { code: "fr", native: "Français", en: "French", dir: "ltr" },
  { code: "it", native: "Italiano", en: "Italian", dir: "ltr" },
  { code: "zh", native: "中文", en: "Chinese", dir: "ltr" },
  { code: "ja", native: "日本語", en: "Japanese", dir: "ltr" },
  { code: "hi", native: "हिन्दी", en: "Hindi", dir: "ltr" },
  { code: "ar", native: "العربية", en: "Arabic", dir: "rtl" },
];
export const LANG_CODES = LANGS.map((l) => l.code);
export const isLang = (x: unknown): x is Lang => typeof x === "string" && (LANG_CODES as string[]).includes(x);
export const dirOf = (l: Lang): "ltr" | "rtl" => LANGS.find((x) => x.code === l)?.dir || "ltr";
export const LOCALE: Record<Lang, string> = { en: "en-US", id: "id-ID", ms: "ms-MY", de: "de-DE", fr: "fr-FR", it: "it-IT", zh: "zh-CN", ja: "ja-JP", hi: "hi-IN", ar: "ar" };
