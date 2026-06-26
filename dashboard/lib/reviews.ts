/* ==============================================================================
 * AXTO — Customer reviews: validation, polite-language filter, logo limit.
 * Pure & testable. The polite filter flags impolite content for admin attention;
 * the admin always has the final say on what appears on the index.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */

export const MAX_LOGO_BYTES = 200 * 1024; // 200 KB upload cap
export const MIN_BODY = 12;
export const MAX_BODY = 1000;

// Clearly-offensive terms (EN + ID) used to FLAG a review for moderation, not to
// silently censor. Kept conservative to avoid false positives on normal words.
const IMPOLITE = [
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "cunt", "motherfucker",
  "bangsat", "kontol", "memek", "anjing", "babi", "tolol", "goblok", "bajingan", "ngentot",
  "idiot", "stupid", "scam", "fraud", "garbage", "trash", "useless",
];

export interface PoliteResult { clean: boolean; reason: string }

export function politeFilter(text: string): PoliteResult {
  const t = " " + text.toLowerCase().replace(/[^a-z\u00C0-\u024F\s]/g, " ") + " ";
  for (const w of IMPOLITE) {
    // word-boundary match to avoid catching substrings (e.g. "class" vs "ass")
    if (new RegExp(`(^|\\s)${w}(\\s|$)`).test(t)) return { clean: false, reason: `impolite term: ${w}` };
  }
  // Excessive shouting / spam heuristics.
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length > 20 && letters === letters.toUpperCase()) return { clean: false, reason: "all-caps shouting" };
  if (/(https?:\/\/|www\.)/i.test(text)) return { clean: false, reason: "contains link" };
  return { clean: true, reason: "" };
}

export interface ReviewInput {
  rating: number; body: string; title?: string; companyName?: string;
  showCompany?: boolean; language?: string; product?: string; logoDataUrl?: string;
}
export interface ValidateResult { ok: boolean; errors: string[]; flagged: boolean; flagReason: string }

export function validateReview(input: ReviewInput): ValidateResult {
  const errors: string[] = [];
  const r = Number(input.rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) errors.push("rating must be an integer 1..5");
  const body = (input.body || "").trim();
  if (body.length < MIN_BODY) errors.push(`review is too short (min ${MIN_BODY} chars)`);
  if (body.length > MAX_BODY) errors.push(`review is too long (max ${MAX_BODY} chars)`);
  if (input.logoDataUrl) {
    const lg = checkLogo(input.logoDataUrl);
    if (!lg.ok) errors.push(lg.reason);
  }
  const p = politeFilter(`${input.title || ""} ${body}`);
  return { ok: errors.length === 0, errors, flagged: !p.clean, flagReason: p.reason };
}

export interface LogoCheck { ok: boolean; bytes: number; reason: string }

export function checkLogo(dataUrl: string): LogoCheck {
  const m = /^data:(image\/(png|jpeg|jpg|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) return { ok: false, bytes: 0, reason: "logo must be a base64 image (png/jpeg/webp/svg)" };
  const b64 = m[3];
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  if (bytes > MAX_LOGO_BYTES) return { ok: false, bytes, reason: `logo too large (${Math.round(bytes / 1024)} KB > ${MAX_LOGO_BYTES / 1024} KB)` };
  return { ok: true, bytes, reason: "" };
}

// What name to show publicly, honoring BOTH the client's preference AND the
// admin's final override. If either says hide, show "Verified customer".
export function publicDisplayName(review: {
  client_name?: string; company_name?: string; show_company?: number; admin_show_company?: number;
}): string {
  const showCompany = review.show_company === 1 && review.admin_show_company === 1 && !!review.company_name;
  if (showCompany) return review.company_name!;
  if (review.client_name) return review.client_name;
  return "Verified customer";
}

// Only approved + featured reviews ever appear on the public index.
export function isPubliclyVisible(review: { status?: string; featured?: number }): boolean {
  return review.status === "approved" && review.featured === 1;
}
