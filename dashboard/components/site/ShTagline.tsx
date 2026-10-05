/* Tagline of a self-hosted app in the visitor's language (lib/i18n-pages/shtaglines.ts). */
"use client";
import { useI18n } from "@/lib/i18n";
import { SH_TAGLINES } from "@/lib/i18n-pages/shtaglines";

export default function ShTagline({ slug, fallback }: { slug: string; fallback: string }) {
  const { lang } = useI18n();
  return <>{SH_TAGLINES[lang]?.[slug] || fallback}</>;
}
