/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO AutoPost — Classified Sites Direct Publisher
 *
 * Strategy per site:
 * - Sites with API (OLX ID, Locanto): call API directly
 * - Sites without API: generate a deep-link URL that pre-fills the form
 *   Admin clicks "Post Now" → opens site with content pre-filled → one submit click
 * - System also queues posts and tracks status
 */

export interface ClassifiedPostRequest {
  platform: string;
  credentials: Record<string, string>;  // may be empty for no-auth sites
  post: {
    title: string;
    body_text: string;
    category?: string;
    location?: string;
    price?: string;
    contact_email?: string;
    contact_phone?: string;
    website?: string;
    image_url?: string;
  };
}

export interface ClassifiedResult {
  success: boolean;
  method: "api" | "quicklink" | "queued";
  platform_url?: string;   // direct link to the submitted ad (if API)
  quicklink_url?: string;  // pre-filled form URL (if no API)
  post_id?: string;
  error?: string;
  note?: string;
}

// ── Truncate text to char limit ───────────────────────────────────────────────
function trunc(text: string, limit: number): string {
  return text.length <= limit ? text : text.slice(0, limit - 3) + "...";
}

// ── OLX Indonesia (has API) ───────────────────────────────────────────────────
async function postToOLX(req: ClassifiedPostRequest): Promise<ClassifiedResult> {
  const { access_token, user_id } = req.credentials;

  if (!access_token) {
    // No token → generate deep-link
    return generateDeepLink(req);
  }

  const { title, body_text, category, location, price } = req.post;

  try {
    const payload: Record<string, unknown> = {
      title: trunc(title, 70),
      description: trunc(body_text, 4000),
      category_id: category || "270",  // default: software/tech category
      location: location || "Jakarta",
      price: price ? Number(price) : 0,
      price_type: price ? "fixed" : "free",
    };

    const res = await fetch("https://api.olx.co.id/api/partner/adverts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "User-Agent": "AXTO-AutoPost/2.0",
      },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json();

    if (res.ok && (data.id || data.advert_id)) {
      const adId = data.id || data.advert_id;
      return {
        success: true, method: "api",
        post_id: String(adId),
        platform_url: `https://www.olx.co.id/item/${adId}`,
      };
    }

    // API failed → fallback to deep-link
    return generateDeepLink(req);
  } catch {
    return generateDeepLink(req);
  }
}

// ── Locanto (form pre-fill via URL) ───────────────────────────────────────────
function buildLocantoLink(req: ClassifiedPostRequest): ClassifiedResult {
  const { title, body_text, contact_email, contact_phone, location } = req.post;
  const params = new URLSearchParams({
    subject: trunc(title, 80),
    ad_text: trunc(body_text, 3000),
    ...(contact_email ? { email: contact_email } : {}),
    ...(contact_phone ? { phone: contact_phone } : {}),
    ...(location ? { city: location } : {}),
  });
  return {
    success: true, method: "quicklink",
    quicklink_url: `https://www.locanto.net/Software-Internet/M/?${params.toString()}`,
    note: "Halaman Locanto terbuka dengan form pre-filled. Klik Submit untuk publish.",
  };
}

// ── Craigslist (deep-link to posting page) ────────────────────────────────────
function buildCraigslistLink(req: ClassifiedPostRequest): ClassifiedResult {
  const { title, body_text } = req.post;
  const encoded = encodeURIComponent(
    `${title}\n\n${trunc(body_text, 2000)}\n\nhttps://axto.io`
  );
  return {
    success: true, method: "quicklink",
    quicklink_url: `https://post.craigslist.org/k/software`,
    note: `Craigslist tidak support URL pre-fill. Konten siap di-copy:\n\n${title}\n\n${trunc(body_text, 500)}`,
  };
}

// ── Gumtree (pre-fill via URL params) ────────────────────────────────────────
function buildGumtreeLink(req: ClassifiedPostRequest): ClassifiedResult {
  const { title, body_text, location } = req.post;
  const params = new URLSearchParams({
    title: trunc(title, 80),
    description: trunc(body_text, 4000),
    ...(location ? { location } : {}),
  });
  return {
    success: true, method: "quicklink",
    quicklink_url: `https://www.gumtree.com/p/for-sale/software-tech/${params.toString()}`,
    note: "Form Gumtree terbuka pre-filled. Lengkapi dan submit.",
  };
}

// ── ClassifiedAds.com ─────────────────────────────────────────────────────────
function buildClassifiedAdsLink(req: ClassifiedPostRequest): ClassifiedResult {
  const { title, body_text, contact_email } = req.post;
  const params = new URLSearchParams({
    title: trunc(title, 80),
    description: trunc(body_text, 3000),
    ...(contact_email ? { email: contact_email } : {}),
    website: req.post.website || "https://axto.io",
    category: "computers-internet",
  });
  return {
    success: true, method: "quicklink",
    quicklink_url: `https://www.classifiedads.com/post-ad?${params.toString()}`,
    note: "Form ClassifiedAds terbuka. Klik Post Ad.",
  };
}

// ── Adpost.com ────────────────────────────────────────────────────────────────
function buildAdpostLink(req: ClassifiedPostRequest): ClassifiedResult {
  const { title, body_text } = req.post;
  const params = new URLSearchParams({
    title: trunc(title, 80),
    description: trunc(body_text, 3000),
    url: req.post.website || "https://axto.io",
    category: "software",
  });
  return {
    success: true, method: "quicklink",
    quicklink_url: `https://www.adpost.com/post/?${params.toString()}`,
    note: "Form Adpost terbuka. Isi email dan submit.",
  };
}

// ── Oodle ─────────────────────────────────────────────────────────────────────
function buildOodleLink(req: ClassifiedPostRequest): ClassifiedResult {
  const { title, body_text } = req.post;
  return {
    success: true, method: "quicklink",
    quicklink_url: `https://www.oodle.com/info/post-ad/`,
    note: `Oodle memerlukan login. Konten siap:\n\nJudul: ${trunc(title, 80)}\n\n${trunc(body_text, 500)}`,
  };
}

// ── Vivastreet ────────────────────────────────────────────────────────────────
function buildVivastreetLink(req: ClassifiedPostRequest): ClassifiedResult {
  const { title, body_text } = req.post;
  const params = new URLSearchParams({
    category: "services",
    title: trunc(title, 80),
    description: trunc(body_text, 3000),
    website: req.post.website || "https://axto.io",
  });
  return {
    success: true, method: "quicklink",
    quicklink_url: `https://www.vivastreet.co.uk/post-ad?${params.toString()}`,
    note: "Form Vivastreet terbuka. Isi kontak dan submit.",
  };
}

// ── Hoobly ────────────────────────────────────────────────────────────────────
function buildHooblyLink(req: ClassifiedPostRequest): ClassifiedResult {
  const { title, body_text } = req.post;
  return {
    success: true, method: "quicklink",
    quicklink_url: `https://www.hoobly.com/listing/create`,
    note: `Hoobly memerlukan akun. Konten siap:\n\nJudul: ${trunc(title, 80)}\n\n${trunc(body_text, 400)}`,
  };
}

// ── Trovit ────────────────────────────────────────────────────────────────────
function buildTrovitLink(req: ClassifiedPostRequest): ClassifiedResult {
  return {
    success: true, method: "quicklink",
    quicklink_url: `https://partner.trovit.com/register`,
    note: "Trovit adalah aggregator. Daftar sebagai partner untuk auto-indexing iklan dari situsmu.",
  };
}

// ── FreeAds.in ────────────────────────────────────────────────────────────────
function buildFreeAdsLink(req: ClassifiedPostRequest): ClassifiedResult {
  const { title, body_text, contact_email } = req.post;
  const params = new URLSearchParams({
    title: trunc(title, 80),
    description: trunc(body_text, 3000),
    ...(contact_email ? { email: contact_email } : {}),
  });
  return {
    success: true, method: "quicklink",
    quicklink_url: `https://www.freeads.in/post-free-ad?${params.toString()}`,
    note: "Form FreeAds.in terbuka. Pilih kategori dan submit.",
  };
}

// ── Generic deep-link fallback ────────────────────────────────────────────────
function generateDeepLink(req: ClassifiedPostRequest): ClassifiedResult {
  const urls: Record<string, () => ClassifiedResult> = {
    olx:           () => buildClassifiedAdsLink(req), // fallback
    locanto:       () => buildLocantoLink(req),
    craigslist:    () => buildCraigslistLink(req),
    gumtree:       () => buildGumtreeLink(req),
    adpost:        () => buildAdpostLink(req),
    classifiedads: () => buildClassifiedAdsLink(req),
    vivastreet:    () => buildVivastreetLink(req),
    hoobly:        () => buildHooblyLink(req),
    trovit:        () => buildTrovitLink(req),
    oodle:         () => buildOodleLink(req),
    freeads:       () => buildFreeAdsLink(req),
  };
  const builder = urls[req.platform];
  if (builder) return builder();
  return {
    success: true, method: "quicklink",
    quicklink_url: `https://www.google.com/search?q=post+free+ad+${encodeURIComponent(req.platform)}`,
    note: `Platform ${req.platform} — buka link untuk posting manual.`,
  };
}

// ── MASTER CLASSIFIED DISPATCHER ─────────────────────────────────────────────
export async function postToClassifiedSite(req: ClassifiedPostRequest): Promise<ClassifiedResult> {
  try {
    switch (req.platform) {
      case "olx":        return await postToOLX(req);
      case "locanto":    return buildLocantoLink(req);
      case "craigslist": return buildCraigslistLink(req);
      case "gumtree":    return buildGumtreeLink(req);
      case "adpost":     return buildAdpostLink(req);
      case "classifiedads": return buildClassifiedAdsLink(req);
      case "vivastreet": return buildVivastreetLink(req);
      case "hoobly":     return buildHooblyLink(req);
      case "trovit":     return buildTrovitLink(req);
      case "oodle":      return buildOodleLink(req);
      case "freeads":    return buildFreeAdsLink(req);
      default:           return generateDeepLink(req);
    }
  } catch (e: any) {
    return { success: false, method: "quicklink", error: e.message };
  }
}

// ── Generate quick post content from template ─────────────────────────────────
export function buildClassifiedPost(
  templateText: string,
  language: "id" | "en" = "id",
  options: { contactEmail?: string; contactPhone?: string; location?: string } = {}
) {
  const title = language === "id"
    ? "AXTO AI Platform — Guardian AI + Orchestra AI (Enterprise)"
    : "AXTO AI Platform — AI eXecution & Tools Orchestration for Your Servers";

  const contact = [
    options.contactEmail ? `Email: ${options.contactEmail}` : "",
    options.contactPhone ? `WhatsApp: ${options.contactPhone}` : "",
    "Website: https://axto.io",
  ].filter(Boolean).join("\n");

  return {
    title,
    body_text: `${templateText}\n\n${contact}`,
    category: "software",
    location: options.location || (language === "id" ? "Jakarta, Indonesia" : "Remote / Worldwide"),
    website: "https://axto.io",
    contact_email: options.contactEmail || "hallo@axto.io",
    contact_phone: options.contactPhone || "",
  };
}
