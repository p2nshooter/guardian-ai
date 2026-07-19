// /ads.txt served by an Edge route handler (function) rather than a static
// public file: on Cloudflare Pages (next-on-pages) the generated _routes.json
// can drop static files past its exclude limit, routing /ads.txt to the app
// and returning HTML. A function route is always served as text/plain.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("google.com, pub-6371903555702163, DIRECT, f08c47fec0942fa0\n", {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
