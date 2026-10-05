/* Public site footer — every link here points to a page that exists. */
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CLOUD_APPS } from "@/lib/apps";
import { SELF_HOSTED, catalogEntry } from "@/lib/selfhosted";
import { SITE } from "@/lib/site";
import T from "@/components/site/T";

export default function SiteFooter() {
  const col = (title: React.ReactNode, links: { href: string; label: React.ReactNode }[]) => (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((l) => <li key={l.href}><Link href={l.href} className="text-sm text-slate-400 no-underline hover:text-white">{l.label}</Link></li>)}
      </ul>
    </div>
  );
  return (
    <footer className="surface-ink border-t border-white/5">
      <div className="gilded-rule" />
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Logo dark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400"><T k="foot.tagline" /></p>
          <p className="mt-4 text-sm"><a href={`mailto:${SITE.email}`} className="text-brand-300 no-underline hover:text-brand-200">{SITE.email}</a></p>
        </div>
        {col(<T k="foot.apps" />, CLOUD_APPS.map((a) => ({ href: `/apps/${a.slug}`, label: a.name })))}
        {col(<T k="foot.selfhosted" />, SELF_HOSTED.map((p): { href: string; label: React.ReactNode } => ({ href: `/self-hosted/${p.slug}`, label: catalogEntry(p.slug)?.name || p.slug })).concat([{ href: "/self-hosted", label: <T k="foot.allEditions" /> }]))}
        {col(<T k="foot.resources" />, [{ href: "/pricing", label: <T k="site.pricing" /> }, { href: "/pricing#lifetime", label: <T k="foot.lifetime" /> }, { href: "/acquire", label: <T k="site.acquire" /> }, { href: "/help", label: <T k="foot.guides" /> }, { href: "/developers", label: <T k="foot.developers" /> }, { href: "/blog", label: <T k="site.blog" /> }, { href: "/status", label: <T k="foot.status" /> }, { href: "/contact", label: <T k="foot.contact" /> }])}
        {col(<T k="foot.legal" />, [{ href: "/about", label: <T k="foot.about" /> }, { href: "/editorial-policy", label: <T k="foot.editorial" /> }, { href: "/terms", label: <T k="foot.terms" /> }, { href: "/privacy", label: <T k="foot.privacy" /> }, { href: "/cookies", label: <T k="foot.cookies" /> }, { href: "/disclaimer", label: <T k="foot.disclaimer" /> }, { href: "/dpa", label: <T k="foot.dpa" /> }, { href: "/subprocessors", label: <T k="foot.subprocessors" /> }, { href: "/refund", label: <T k="foot.refund" /> }, { href: "/security", label: <T k="foot.security" /> }])}
      </div>
      <div className="border-t border-white/5">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {SITE.legalName}. <T k="foot.rights" /></span>
          <span><T k="foot.badge" /></span>
        </div>
      </div>
    </footer>
  );
}
