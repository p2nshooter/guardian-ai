/* Public site footer — every link here points to a page that exists. */
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CLOUD_APPS } from "@/lib/apps";
import { SELF_HOSTED, catalogEntry } from "@/lib/selfhosted";
import { SITE } from "@/lib/site";

export default function SiteFooter() {
  const col = (title: string, links: { href: string; label: string }[]) => (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((l) => <li key={l.href}><Link href={l.href} className="text-sm text-slate-400 no-underline hover:text-white">{l.label}</Link></li>)}
      </ul>
    </div>
  );
  return (
    <footer className="surface-ink border-t border-white/5">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Logo dark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">{SITE.tagline}. Your keys, your data — in the browser or on your own servers.</p>
          <p className="mt-4 text-sm"><a href={`mailto:${SITE.email}`} className="text-brand-300 no-underline hover:text-brand-200">{SITE.email}</a></p>
        </div>
        {col("Apps", CLOUD_APPS.map((a) => ({ href: `/apps/${a.slug}`, label: a.name })))}
        {col("Self-hosted", SELF_HOSTED.slice(0, 7).map((p) => ({ href: `/self-hosted/${p.slug}`, label: catalogEntry(p.slug)?.name || p.slug })).concat([{ href: "/self-hosted", label: "All 10 editions →" }]))}
        {col("Resources", [{ href: "/pricing", label: "Pricing" }, { href: "/help", label: "Guides & help" }, { href: "/blog", label: "Blog" }, { href: "/contact", label: "Contact sales" }])}
        {col("Legal", [{ href: "/terms", label: "Terms of Service" }, { href: "/privacy", label: "Privacy Policy" }, { href: "/refund", label: "Refund Policy" }, { href: "/security", label: "Security" }])}
      </div>
      <div className="border-t border-white/5">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {SITE.legalName}. All rights reserved.</span>
          <span>BYOK · BYOX · Zero data exposure</span>
        </div>
      </div>
    </footer>
  );
}
