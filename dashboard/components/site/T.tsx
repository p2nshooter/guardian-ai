/* <T> — a tiny client leaf that renders a translated string by key using the
 * site i18n context. Lets server components (which keep SEO + metadata) show
 * copy that switches language live when the visitor changes it. */
"use client";
import { useI18n } from "@/lib/i18n";

export default function T({ k }: { k: string }) {
  const { t } = useI18n();
  return <>{t(k as never)}</>;
}
