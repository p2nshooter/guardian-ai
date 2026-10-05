/* Public site header (client) — crystal glass on obsidian (docs/BLUEPRINT-V4.md
 * §18): translated chrome, an "Apps" mega menu with all 17 apps, a mobile menu
 * that closes on navigation, a live language switch, and a hidden admin entry:
 * tap the logo 5×. */
"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/Logo";
import AppIcon from "@/components/site/AppIcon";
import { InstallButton } from "@/components/pwa/Pwa";
import { useI18n } from "@/lib/i18n";
import { LANGS, dirOf, type Lang } from "@/lib/i18n-shared";
import { ECOSYSTEM_CLOUD, ECOSYSTEM_SELF, type EcoApp } from "@/lib/ecosystem";

export default function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);
  const megaRef = useRef<HTMLDivElement | null>(null);
  const taps = useRef<number[]>([]);

  const LINKS = [
    { href: "/prompts", label: t("site.prompts") },
    { href: "/self-hosted", label: t("site.selfhosted") },
    { href: "/pricing", label: t("site.pricing") },
    { href: "/help", label: t("site.guides") },
    { href: "/blog", label: t("site.blog") },
  ];

  // Close the menus whenever the route changes, on Escape, or on a click outside.
  useEffect(() => { setOpen(false); setMega(false); }, [pathname]);
  useEffect(() => {
    if (!open && !mega) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setMega(false); } };
    const onDown = (e: MouseEvent) => { if (mega && megaRef.current && !megaRef.current.contains(e.target as Node)) setMega(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open, mega]);

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
      className={`rounded-md border border-white/15 bg-ink-900 px-2 py-1.5 text-xs font-semibold text-slate-200 ${className}`}>
      {LANGS.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
    </select>
  );

  const MegaItem = ({ a }: { a: EcoApp }) => (
    <Link href={a.href} onClick={() => setMega(false)} className="group flex items-center gap-3 rounded-xl px-2.5 py-2 no-underline transition-colors hover:bg-white/[.06]" data-testid={`mega-${a.kind}-${a.slug}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10" style={{ background: `${a.color}1f`, color: a.color }}><AppIcon slug={a.slug} kind={a.kind} size={16} /></span>
      <span className="text-sm font-medium text-slate-200 group-hover:text-white">{a.name}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/85 text-slate-200 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center gap-6">
        <Link href="/" onClick={onLogoTap} className="select-none no-underline" style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }} aria-label="AXTO home"><Logo dark /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          <div className="relative" ref={megaRef} onMouseLeave={() => setMega(false)}>
            <button type="button" className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white" aria-expanded={mega} aria-haspopup="true"
              onClick={() => setMega(true)} onMouseEnter={() => setMega(true)} data-testid="nav-apps">
              {t("site.apps")} <ChevronDown size={14} className={`transition-transform duration-300 ${mega ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {mega ? (
              <div className="absolute left-0 top-full z-50 pt-2" data-testid="mega-menu">
                <div className="palace-rise grid w-[640px] grid-cols-2 gap-6 rounded-2xl border border-white/10 bg-ink-900/95 p-5 shadow-crystal backdrop-blur-xl">
                  <div>
                    <div className="px-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-200">{t("lp.eco.cloud")}</div>
                    <div className="mt-2 grid gap-0.5">{ECOSYSTEM_CLOUD.map((a) => <MegaItem key={a.slug} a={a} />)}</div>
                    <Link href="/apps" onClick={() => setMega(false)} className="mt-2 block px-2.5 text-xs font-semibold text-brand-300 hover:text-gold-200">{t("lp.eco.allCloud")} →</Link>
                  </div>
                  <div>
                    <div className="px-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-200">{t("site.selfhosted")} · Docker</div>
                    <div className="mt-2 grid grid-cols-1 gap-0.5">{ECOSYSTEM_SELF.map((a) => <MegaItem key={a.slug} a={a} />)}</div>
                    <Link href="/self-hosted" onClick={() => setMega(false)} className="mt-2 block px-2.5 text-xs font-semibold text-brand-300 hover:text-gold-200">{t("lp.eco.allSelf")} →</Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 no-underline hover:bg-white/5 hover:text-white">{l.label}</Link>
          ))}
          <Link href="/acquire" className="ml-1 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1.5 text-sm font-semibold text-gold-100 no-underline hover:bg-gold-400/20 hover:text-gold-50" data-testid="nav-acquire">🏛️ {t("site.acquire")}</Link>
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <LangSelect />
          <InstallButton className="btn text-slate-200 hover:bg-white/10 hover:text-white" />
          <Link href="/login" className="btn text-slate-200 hover:bg-white/10 hover:text-white">{t("site.signin")}</Link>
          <Link href="/register" className="btn-primary">{t("site.getstarted")}</Link>
        </div>

        {/* Mobile controls */}
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <LangSelect />
          <InstallButton className="btn-crystal btn-sm" />
          <button type="button" className="btn text-slate-100 hover:bg-white/10" aria-label={t("site.menu")} aria-expanded={open} onClick={() => setOpen((v) => !v)}>☰</button>
        </div>
      </div>

      {/* Mobile menu */}
      {open ? (
        <div className="lg:hidden">
          <div className="fixed inset-0 top-16 z-40 bg-ink-950/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-white/10 bg-ink-950 p-3 shadow-crystal">
            <div className="container-page">
              <div className="px-3 pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-200">{t("site.apps")}</div>
              <div className="mt-1 grid grid-cols-2 gap-0.5">{[...ECOSYSTEM_CLOUD, ...ECOSYSTEM_SELF].map((a) => <MegaItem key={`${a.kind}-${a.slug}`} a={a} />)}</div>
              <div className="gilded-rule my-2" />
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-200 no-underline hover:bg-white/5">{l.label}</Link>
              ))}
              <Link href="/acquire" onClick={() => setOpen(false)} className="mt-1 block rounded-md border border-gold-400/30 bg-gold-400/10 px-3 py-2.5 text-sm font-semibold text-gold-100 no-underline">🏛️ {t("site.acquire")}</Link>
              <div className="mt-2 grid gap-2 border-t border-white/10 pt-2">
                <Link href="/login" onClick={() => setOpen(false)} className="btn-crystal">{t("site.signin")}</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn-primary">{t("site.getstarted")}</Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
