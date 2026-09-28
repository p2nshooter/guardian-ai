/* Public site header (client) — translated chrome, a mobile menu that closes on
 * navigation, a live language switch, and a hidden admin entry: tap the logo 5×. */
"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { InstallButton } from "@/components/pwa/Pwa";
import { useI18n } from "@/lib/i18n";
import { LANGS, dirOf, type Lang } from "@/lib/i18n-shared";

export default function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const taps = useRef<number[]>([]);

  const LINKS = [
    { href: "/apps", label: t("site.apps") },
    { href: "/prompts", label: t("site.prompts") },
    { href: "/self-hosted", label: t("site.selfhosted") },
    { href: "/pricing", label: t("site.pricing") },
    { href: "/help", label: t("site.guides") },
    { href: "/blog", label: t("site.blog") },
  ];

  // Close the mobile menu whenever the route changes or Escape is pressed.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Hidden admin entry — five quick taps on the logo opens the sign-in page.
  function onLogoTap(e: React.MouseEvent) {
    const now = Date.now();
    taps.current = [...taps.current.filter((tt) => now - tt < 2500), now];
    if (taps.current.length >= 5) {
      e.preventDefault(); // stop the link's own navigation to "/" overriding this one
      taps.current = [];
      router.push("/login?admin=1");
    }
  }

  function changeLang(l: Lang) {
    setLang(l);
    if (typeof document !== "undefined") { document.documentElement.lang = l; document.documentElement.dir = dirOf(l); }
  }

  const LangSelect = ({ className = "" }: { className?: string }) => (
    <select aria-label={t("nav.language")} value={lang} onChange={(e) => changeLang(e.target.value as Lang)}
      className={`rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 ${className}`}>
      {LANGS.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
    </select>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-6">
        <Link href="/" onClick={onLogoTap} className="select-none no-underline" style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }} aria-label="AXTO home"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 no-underline hover:bg-slate-100 hover:text-slate-900">{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <LangSelect />
          <InstallButton className="btn-ghost" />
          <Link href="/login" className="btn-ghost">{t("site.signin")}</Link>
          <Link href="/register" className="btn-primary">{t("site.getstarted")}</Link>
        </div>

        {/* Mobile controls */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <LangSelect />
          <InstallButton className="btn-secondary btn-sm" />
          <button type="button" className="btn-ghost" aria-label={t("site.menu")} aria-expanded={open} onClick={() => setOpen((v) => !v)}>☰</button>
        </div>
      </div>

      {/* Mobile menu */}
      {open ? (
        <div className="md:hidden">
          <div className="fixed inset-0 top-16 z-40 bg-ink-950/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 z-50 border-b border-slate-200 bg-white p-3 shadow-lift">
            <div className="container-page">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-800 no-underline hover:bg-slate-100">{l.label}</Link>
              ))}
              <div className="mt-2 grid gap-2 border-t border-slate-200 pt-2">
                <Link href="/login" onClick={() => setOpen(false)} className="btn-secondary">{t("site.signin")}</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn-primary">{t("site.getstarted")}</Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
