/* Error boundary for every page: a clear message and a retry instead of a
 * blank screen. The digest helps support find the matching server log. */
"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-wider text-rose-600">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-900">This page could not load</h1>
      <p className="mt-3 max-w-md text-slate-600">Your saved work is safe. Try again — if it keeps happening, contact us and mention the code below.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button className="btn-primary" onClick={reset}>Try again</button>
        <Link href="/" className="btn-secondary">Home</Link>
        <Link href="/contact" className="btn-ghost">Contact support</Link>
      </div>
      {error.digest ? <p className="mt-6 font-mono text-xs text-slate-400">Error code: {error.digest}</p> : null}
    </main>
  );
}
