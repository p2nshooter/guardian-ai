/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * One portal shell for members AND admins: the same sidebar, top bar and
 * behaviour everywhere, only the menu differs. Loads the signed-in account
 * once (/api/auth/me) and shares it with every page through useMe().
 * ============================================================================ */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { api, signOut } from "@/lib/client";
import { useI18n, formatDate, type Key } from "@/lib/i18n";
import { CLOUD_APPS } from "@/lib/apps";
import { Spinner } from "@/components/ui";
import ChatWidget from "@/components/support/ChatWidget";
import { InstallButton } from "@/components/pwa/Pwa";

export interface Me {
  user: { id: string; email: string; role: "admin" | "member"; name: string; organization: string; country: string; createdAt: string };
  tier: "none" | "starter" | "pro" | "business" | "enterprise";
  planName: string;
  subscription: { plan: string; cycle: string; status: string; current_period_start: string; current_period_end: string } | null;
  limits: { clipperVideosPerMonth: number; storageGB: number; promptLevels: string[]; legalWorkspaces: string; apps: string[]; selfHostedApps: number; selfHostedNodes: number };
  usage: { month: string; requests: number; clipperVideos: number; clipperLimit: number; storageBytes: number; storageLimit: number };
}

const MeCtx = createContext<{ me: Me | null; reload: () => Promise<void> }>({ me: null, reload: async () => {} });
export const useMe = () => useContext(MeCtx);

interface NavItem { href: string; label: Key | string; icon: string; badge?: string; match?: string }

function memberNav(): { section: Key; items: NavItem[] }[] {
  return [
    { section: "nav.section.workspace", items: [
      { href: "/app", label: "nav.home", icon: "🏠" },
      { href: "/app/apps", label: "nav.apps", icon: "🧩", match: "/app/apps" },
      ...CLOUD_APPS.map((a) => ({ href: `/app/${a.slug}`, label: a.name, icon: a.icon, badge: a.live ? undefined : "soon" })),
      { href: "/app/self-hosted", label: "nav.selfhosted", icon: "🖥️" },
      { href: "/app/managed", label: "nav.managed", icon: "☁️", badge: "locked" },
    ] },
    { section: "nav.section.account", items: [
      { href: "/app/billing", label: "nav.billing", icon: "💳" },
      { href: "/app/settings", label: "nav.settings", icon: "⚙️" },
      { href: "/help", label: "nav.help", icon: "📘" },
    ] },
  ];
}

export function adminNav(): { section: string; items: NavItem[] }[] {
  return [
    { section: "Business", items: [
      { href: "/admin", label: "Overview", icon: "📊" },
      { href: "/admin/members", label: "Members", icon: "👥", match: "/admin/members" },
      { href: "/admin/orders", label: "Orders & payments", icon: "🧾" },
      { href: "/admin/licenses", label: "Licences", icon: "🔑" },
      { href: "/admin/support", label: "Support inbox", icon: "💬" },
    ] },
    { section: "Configuration", items: [
      { href: "/admin/plans", label: "Plans & pricing", icon: "🏷️" },
      { href: "/admin/payments", label: "Payment & email", icon: "💳" },
      { href: "/admin/managed", label: "Managed AI", icon: "☁️", badge: "locked" },
      { href: "/admin/releases", label: "Releases", icon: "📦" },
      { href: "/admin/settings", label: "Settings", icon: "⚙️" },
      { href: "/admin/audit", label: "Audit log", icon: "🕵️" },
    ] },
  ];
}

export default function Shell({ variant, children }: { variant: "member" | "admin"; children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const path = usePathname() || "";
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    const r = await api<Me>("/api/auth/me");
    if (r.ok) { setMe(r.data); setFailed(false); } else if (r.status !== 401) setFailed(true);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { setOpen(false); }, [path]);

  const nav = variant === "admin" ? adminNav() : memberNav();
  const label = (l: string) => (l.includes(".") ? t(l as Key) : l);
  const isActive = (it: NavItem) => it.href === "/app" || it.href === "/admin" ? path === it.href : path === it.href || path.startsWith((it.match || it.href) + "/");

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Main">
      <Link href={variant === "admin" ? "/admin" : "/app"} className="mb-4 px-2 no-underline"><Logo suffix={variant === "admin" ? "Admin" : undefined} /></Link>
      {nav.map((g) => (
        <div key={g.section} className="mb-3">
          <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label(g.section)}</div>
          {g.items.map((it) => (
            <Link key={it.href} href={it.href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium no-underline transition-colors ${isActive(it) ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`}>
              <span className="w-5 text-center" aria-hidden="true">{it.icon}</span>
              <span className="flex-1 truncate">{label(it.label)}</span>
              {it.badge ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">{it.badge === "soon" ? t("common.comingSoon") : "🔒"}</span> : null}
            </Link>
          ))}
        </div>
      ))}
      <div className="mt-auto border-t border-slate-200 pt-3">
        {me?.user.role === "admin" ? (
          <Link href={variant === "admin" ? "/app" : "/admin"} className="mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 no-underline hover:bg-slate-100">
            <span className="w-5 text-center">↔️</span>{variant === "admin" ? t("nav.member") : t("nav.admin")}
          </Link>
        ) : null}
        <div className="flex items-center gap-2 px-2.5 py-2 text-sm">
          <span className="text-slate-500">🌐 {t("nav.language")}</span>
          <div className="ml-auto inline-flex rounded-md border border-slate-200 p-0.5">
            {(["en", "id"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`rounded px-2 py-0.5 text-xs font-bold ${lang === l ? "bg-ink-900 text-white" : "text-slate-600"}`}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">
          <span className="w-5 text-center">↩︎</span>{t("nav.signout")}
        </button>
      </div>
    </nav>
  );

  return (
    <MeCtx.Provider value={{ me, reload }}>
      <div className="min-h-screen bg-slate-50">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>
        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-ink-950/40" />
            <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-lift" onClick={(e) => e.stopPropagation()}>{sidebar}</aside>
          </div>
        ) : null}
        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
            <button className="btn-ghost btn-sm lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
            <div className="lg:hidden"><Logo size={22} /></div>
            <div className="ml-auto flex items-center gap-3">
              <InstallButton lang={lang} className="btn-secondary btn-sm" />
              {me ? (
                <>
                  {variant === "member" ? (
                    <Link href="/app/billing" className={`hidden no-underline sm:inline-flex ${me.tier === "none" ? "badge-amber" : "badge-brand"}`}>
                      {me.tier === "none" ? t("plan.free") : `${me.planName}${me.subscription ? ` · ${t("plan.until", { date: formatDate(me.subscription.current_period_end, lang) })}` : ""}`}
                    </Link>
                  ) : <span className="badge-dark">Admin</span>}
                  <span className="hidden max-w-[220px] truncate text-sm text-slate-600 md:inline">{me.user.name || me.user.email}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">
                    {(me.user.name || me.user.email).slice(0, 1).toUpperCase()}
                  </span>
                </>
              ) : <Spinner className="h-4 w-4 text-slate-400" />}
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:py-8 lg:pb-8">
            {failed ? (
              <div className="alert-error">⛔ {t("common.error")} <button className="ml-2 underline" onClick={reload}>{t("common.retry")}</button></div>
            ) : children}
          </main>
        </div>
        {variant === "member" && me ? <ChatWidget lang={lang} defaultName={me.user.name} defaultEmail={me.user.email} raised /> : null}
        {/* Phone: app-style bottom navigation (thumb reach, safe-area aware) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Quick">
          <div className="grid grid-cols-5">
            {(variant === "admin"
              ? [["/admin", "📊", "Overview"], ["/admin/members", "👥", "Members"], ["/admin/orders", "🧾", "Orders"], ["/admin/support", "💬", "Support"], ["menu", "☰", "Menu"]]
              : [["/app", "🏠", t("nav.home")], ["/app/legal", "⚖️", "Legal"], ["/app/apps", "🧩", t("nav.apps")], ["/app/billing", "💳", lang === "id" ? "Paket" : "Plan"], ["menu", "☰", "Menu"]]
            ).map(([href, icon, label]) => href === "menu" ? (
              <button key={href} onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-600">
                <span className="text-lg leading-none" aria-hidden="true">{icon}</span>{label}
              </button>
            ) : (
              <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium no-underline ${(href === "/app" || href === "/admin" ? path === href : path.startsWith(href)) ? "text-brand-700" : "text-slate-600"}`}>
                <span className="text-lg leading-none" aria-hidden="true">{icon}</span>{label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </MeCtx.Provider>
  );
}
