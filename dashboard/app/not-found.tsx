/* Branded 404 for every unknown URL (public site and portals), with the
 * places people usually meant to go. Never indexed. */
import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

const LINKS: [string, string][] = [["/", "Home"], ["/apps", "Apps"], ["/pricing", "Pricing"], ["/self-hosted", "Self-hosted"], ["/help", "Help & guides"], ["/app", "My workspace"]];

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
      <Link href="/" className="no-underline" aria-label="AXTO home"><Logo /></Link>
      <p className="mt-10 text-sm font-bold uppercase tracking-wider text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">This page doesn&apos;t exist</h1>
      <p className="mt-3 max-w-md text-slate-600">The link may be old or mistyped. These are the places people usually look for:</p>
      <nav className="mt-6 flex max-w-xl flex-wrap justify-center gap-2" aria-label="Suggestions">
        {LINKS.map(([href, label]) => <Link key={href} href={href} className="btn-secondary btn-sm">{label}</Link>)}
      </nav>
      <p className="mt-8 text-sm text-slate-500">Still stuck? <Link href="/contact">Contact us</Link> — we reply within one business day.</p>
    </main>
  );
}
