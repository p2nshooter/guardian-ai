/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * ==============================================================================
 */
export const runtime = "edge";
import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "Blog — Security & AI Engineering",
  description:
    "Original articles from the AXTO team on self-hosted security, behavioral threat detection, AI orchestration, secrets management, and compliance automation.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold sm:text-4xl">AXTO Blog</h1>
      <p className="mt-3 max-w-2xl text-sm opacity-70">
        Field notes on self-hosted security, AI orchestration, and running serious infrastructure without
        handing your data to anyone.
      </p>
      <div className="mt-10 space-y-8">
        {posts.map((p) => (
          <article key={p.slug} className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/25">
            <div className="flex flex-wrap items-center gap-3 text-xs opacity-60">
              <span className="rounded-full border border-white/20 px-2 py-0.5">{p.tag}</span>
              <time dateTime={p.date}>{p.date}</time>
              <span>{p.minutes} min read</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold">
              <Link href={`/blog/${p.slug}`} className="hover:underline">
                {p.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm opacity-75">{p.description}</p>
            <Link href={`/blog/${p.slug}`} className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline">
              Read article →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
