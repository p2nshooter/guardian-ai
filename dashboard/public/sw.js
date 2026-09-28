/* AXTO service worker — installable app + fast, resilient loading on phones.
 *   /_next/static/*, icons, fonts, /vendor/*   cache-first (immutable, versioned)
 *   page navigations                           network-first → cached copy → offline page
 *   /api/*, /admin/*, non-GET, other origins   never cached (always live, never stored)
 * Member pages are cached only as a fallback shell; account data always comes
 * from the network through /api. */
const VERSION = "axto-v3.1.0";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const OFFLINE = "/offline";
const PRECACHE = [OFFLINE, "/icon-192.png", "/icon-512.png", "/favicon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k);
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

const isStatic = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/vendor/") ||
  /\.(?:png|svg|ico|jpg|jpeg|webp|woff2?)$/.test(url.pathname);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") || url.pathname === "/sw.js") return;

  if (isStatic(url)) {
    e.respondWith(caches.open(STATIC).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const preload = await e.preloadResponse;
        const res = preload || await fetch(req);
        if (res.ok && res.type === "basic" && !url.searchParams.has("token")) {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(url.pathname, copy));
        }
        return res;
      } catch {
        const cached = await caches.match(url.pathname, { cacheName: PAGES });
        return cached || (await caches.match(OFFLINE)) || new Response("Offline", { status: 503 });
      }
    })());
  }
});
