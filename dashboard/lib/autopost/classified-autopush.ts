/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO AutoPost — Classified Mass Auto-Push Engine
 * ================================================
 * Push iklan ke classified sites otomatis via HTTP form POST.
 * 
 * ❌ TANPA register, login, API key, buka browser
 * ✅ Murni HTTP POST
 * ✅ Setiap post WAJIB ada link axto.io
 * ✅ 1 setting interval → semua classified ikut
 */

export interface ClassifiedAdPayload {
  title: string;
  description: string;   // wajib ada https://axto.io di dalamnya
  category: string;
  website: string;        // selalu "https://axto.io"
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  price?: string;
  imageUrl?: string;
  language?: string;
}

export interface PushResult {
  site: string;
  success: boolean;
  method: string;
  statusCode?: number;
  error?: string;
}

const SITES: Array<{
  name: string;
  url: string;
  method: "form" | "ping";
  fields?: Record<string, string>;
}> = [
  { name: "FreeAdLists",        url: "https://www.freeadlists.com/submit-ad.php",    method: "form", fields: { title: "ad_title", description: "ad_body", website: "website", category: "category" } },
  { name: "WallClassifieds",    url: "https://www.wallclassifieds.com/submit",        method: "form", fields: { title: "title", description: "description", website: "url" } },
  { name: "PostFreeAds",        url: "https://www.postfreeads.com/post-free-ad/",    method: "form", fields: { title: "ad_title", description: "ad_text", website: "website" } },
  { name: "FreeGlobalAds",      url: "https://www.freeglobalads.com/post.php",       method: "form", fields: { title: "title", description: "desc", website: "url" } },
  { name: "ClassifiedsFactor",  url: "https://www.classifiedsfactor.com/post",        method: "form", fields: { title: "adTitle", description: "adBody" } },
  { name: "USAFreeClassifieds", url: "https://www.usafreeclassifieds.com/submit/",   method: "form", fields: { title: "title", description: "description", website: "url" } },
  { name: "AdlandPro",          url: "https://www.adlandpro.com/submit-ad",           method: "form", fields: { title: "title", description: "body", website: "website" } },
  { name: "ClassifiedsForFree", url: "https://www.classifiedsforfree.com/post",       method: "form", fields: { title: "adTitle", description: "adDescription" } },
  { name: "FreeAdList",         url: "https://www.freeadlist.com/submit",             method: "form", fields: { title: "title", description: "description" } },
  { name: "Kugli",              url: "https://www.kugli.com/submit-ad",               method: "form", fields: { title: "title", description: "description", website: "url" } },
  { name: "FreeAdsTime",        url: "https://www.freeadstime.org/submit-ad/",        method: "form", fields: { title: "title", description: "body", website: "url" } },
  { name: "H1Ad",               url: "https://www.h1ad.com/post-ad",                 method: "form", fields: { title: "title", description: "description", website: "website" } },
  { name: "Expatriates",        url: "https://www.expatriates.com/submit.php",        method: "form", fields: { title: "subject", description: "message" } },
  { name: "OzFreeOnline",       url: "https://www.ozfreeonline.com/post-ad/",         method: "form", fields: { title: "title", description: "body" } },
  { name: "FreeAdsIndia",       url: "https://www.freeadsindia.in/submit",            method: "form", fields: { title: "title", description: "description" } },
  { name: "Geebo",              url: "https://www.geebo.com/post-listing",            method: "form", fields: { title: "title", description: "description" } },
  { name: "Bedpage",            url: "https://www.bedpage.com/post",                  method: "form", fields: { title: "title", description: "body" } },
  { name: "ClassifiedAds",      url: "https://www.classifiedads.com/cgi-bin/ads/post_ad.cgi", method: "form", fields: { title: "title", description: "body" } },
  { name: "Best Web Directory",  url: "https://www.best-web-directory.com/submit",    method: "form", fields: { title: "site_title", description: "site_description", website: "site_url" } },
  { name: "SoMuch",              url: "https://www.somuch.com/submit-links/",         method: "form", fields: { title: "title", description: "description", website: "url" } },
  { name: "9Sites",              url: "https://www.9sites.net/addurl.php",            method: "form", fields: { title: "title", description: "description", website: "url" } },
  // Search engine pings
  { name: "Google Ping",        url: "https://www.google.com/ping?sitemap=https://axto.io/sitemap.xml", method: "ping" },
  { name: "Bing Ping",          url: "https://www.bing.com/ping?sitemap=https://axto.io/sitemap.xml",   method: "ping" },
];

async function pushOne(site: typeof SITES[0], ad: ClassifiedAdPayload): Promise<PushResult> {
  try {
    if (site.method === "ping") {
      const r = await fetch(site.url, { method: "GET", signal: AbortSignal.timeout(10000) });
      return { site: site.name, success: r.ok || r.status < 400, method: "ping", statusCode: r.status };
    }
    const params = new URLSearchParams();
    const map: Record<string, string> = { title: ad.title, description: ad.description, category: ad.category, website: ad.website };
    for (const [our, their] of Object.entries(site.fields || {})) {
      if (map[our]) params.set(their, map[our]);
    }
    const r = await fetch(site.url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0 (compatible; AXTO/2.0; +https://axto.io)", "Accept": "text/html,*/*" },
      body: params.toString(), redirect: "follow", signal: AbortSignal.timeout(12000),
    });
    return { site: site.name, success: r.ok || r.status === 302 || r.status === 301, method: "form", statusCode: r.status };
  } catch (e: any) {
    return { site: site.name, success: false, method: site.method, error: e.message?.slice(0, 80) || "timeout" };
  }
}

export async function massAutoPush(ad: ClassifiedAdPayload, options: { concurrency?: number; timeout?: number } = {}): Promise<{ total: number; success: number; failed: number; results: PushResult[]; duration_ms: number }> {
  const t0 = Date.now();
  const conc = options.concurrency || 8;
  const results: PushResult[] = [];
  for (let i = 0; i < SITES.length; i += conc) {
    const batch = SITES.slice(i, i + conc);
    const settled = await Promise.allSettled(batch.map(s => pushOne(s, ad)));
    for (const r of settled) results.push(r.status === "fulfilled" ? r.value : { site: "?", success: false, method: "error", error: r.reason?.message });
  }
  return { total: results.length, success: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results, duration_ms: Date.now() - t0 };
}

export function getClassifiedSiteCount(): number { return SITES.length; }
export function getClassifiedSites() { return SITES.map(s => ({ name: s.name, method: s.method })); }
