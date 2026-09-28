/* Public site language switcher — persists the choice in the axto_lang cookie
 * (1 year) so it stays consistent across refreshes, pages and the portal. */
"use client";
import { useEffect, useState } from "react";
import { LANGS, LANG_COOKIE, isLang, dirOf, type Lang } from "@/lib/i18n-shared";

export default function LangSwitcher({ className = "" }: { className?: string }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )axto_lang=([a-z]{2})/);
    if (m && isLang(m[1])) setLang(m[1]);
  }, []);
  return (
    <select aria-label="Language" value={lang}
      onChange={(e) => {
        const l = e.target.value as Lang;
        document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = l;
        document.documentElement.dir = dirOf(l);
        setLang(l);
        // Re-render server components that read the cookie (portal, future localized pages).
        location.reload();
      }}
      className={`rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 ${className}`}>
      {LANGS.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
    </select>
  );
}
