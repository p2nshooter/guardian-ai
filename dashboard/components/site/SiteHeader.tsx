/* Public site header — server component; the mobile menu uses <details> (no JS). */
import Link from "next/link";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/apps", label: "Apps" },
  { href: "/self-hosted", label: "Self-hosted" },
  { href: "/pricing", label: "Pricing" },
  { href: "/help", label: "Guides" },
  { href: "/blog", label: "Blog" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-6">
        <Link href="/" className="no-underline" aria-label="AXTO home"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 no-underline hover:bg-slate-100 hover:text-slate-900">{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/register" className="btn-primary">Get started</Link>
        </div>
        <details className="relative ml-auto md:hidden">
          <summary className="btn-ghost cursor-pointer list-none" aria-label="Menu">☰</summary>
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lift">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-800 no-underline hover:bg-slate-100">{l.label}</Link>
            ))}
            <div className="mt-2 grid gap-2 border-t border-slate-200 pt-2">
              <Link href="/login" className="btn-secondary">Sign in</Link>
              <Link href="/register" className="btn-primary">Get started</Link>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
