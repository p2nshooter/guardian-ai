/* /llms.txt (llmstxt.org) — what AXTO is and where its public pages are, for AI search engines and
 * assistants (owner, 27 Oct 2026: "perbaiki dulu seluruh SEO websitenya … file2 lain yg d butuhkan").
 * The same pages as sitemap.xml, with their one-line summaries. Static, rebuilt on deploy. */
import { CLOUD_APPS } from "@/lib/apps";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { PRODUCT_CATALOG } from "@/lib/product-catalog";
import { SITE, absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const link = (name: string, path: string, note = "") => `- [${name}](${absoluteUrl(path)})${note ? `: ${note}` : ""}`;
  const posts = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));
  const text = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.tagline}. ${SITE.description}`,
    "",
    "Files, videos and documents are processed on the member's own device; AI requests use the member's own provider keys and are only relayed; saved work is encrypted per account. Local Mode runs the AI itself in the browser.",
    "",
    "## Cloud apps",
    "",
    ...CLOUD_APPS.map((a) => link(a.name, `/apps/${a.slug}`, a.short)),
    "",
    "## Self-hosted apps (Docker, Linux and Windows)",
    "",
    link("All self-hosted apps", "/self-hosted"),
    ...PRODUCT_CATALOG.map((p) => link(p.name, `/self-hosted/${p.slug}`, p.tagline)),
    "",
    "## Buying",
    "",
    link("Pricing", "/pricing", "plans, editions per app and lifetime licences"),
    link("Licence auction", "/auction", "every package auctioned every two weeks, ending Friday 07:00 WIB, opening at 25 % of the price"),
    link("Acquire AXTO", "/acquire", "the platform itself is for sale"),
    "",
    "## Libraries",
    "",
    link("Legal AI by jurisdiction", "/legal-ai"),
    link("AI prompt library", "/prompts"),
    link("Developer API", "/developers"),
    link("Help centre", "/help"),
    "",
    "## Blog",
    "",
    ...posts.map((p) => link(p.title, `/blog/${p.slug}`, p.description)),
    "",
    "## Optional",
    "",
    ...[["About", "/about"], ["Contact", "/contact"], ["Security", "/security"], ["Privacy policy", "/privacy"], ["Terms", "/terms"], ["Editorial policy", "/editorial-policy"], ["Refund policy", "/refund"], ["Status", "/status"]].map(([n, p]) => link(n, p)),
    "",
  ].join("\n");
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
