/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO AutoPost — Ayrshare Integration
 *
 * Ayrshare (ayrshare.com) adalah social media API aggregator.
 * Dengan 1 API key, bisa post ke:
 * Facebook, Instagram, Twitter/X, LinkedIn, Pinterest, TikTok,
 * YouTube, Telegram, Reddit, GMB, dan lainnya.
 *
 * Cara setup (hanya sekali, 5 menit):
 * 1. Daftar gratis di ayrshare.com
 * 2. Connect akun sosmed di dashboard Ayrshare (klik + login — tidak perlu bikin app)
 * 3. Copy API Key dari dashboard
 * 4. Set AYRSHARE_API_KEY di Cloudflare Pages env vars
 *
 * Tidak perlu App ID, App Secret, OAuth setup, atau developer account.
 */

export interface AyrsharePost {
  post:        string;          // caption/text
  platforms:   string[];        // ["facebook","instagram","twitter","linkedin","pinterest","tiktok","youtube"]
  mediaUrls?:  string[];        // optional image/video URLs
  scheduleDate?: string;        // ISO 8601 — optional scheduling
  hashtags?:   string[];
  title?:      string;          // for YouTube/Pinterest
  shortenLinks?: boolean;
}

export interface AyrshareResult {
  success:  boolean;
  id?:      string;             // Ayrshare post ID
  postIds?: Record<string, string>; // per-platform post IDs
  errors?:  Record<string, string>;
  error?:   string;
}

const AYRSHARE_BASE = "https://api.ayrshare.com/api";

// Platform name mapping: our names → Ayrshare names
const PLATFORM_MAP: Record<string, string> = {
  facebook:          "facebook",
  instagram:         "instagram",
  twitter:           "twitter",
  linkedin:          "linkedin",
  pinterest:         "pinterest",
  tiktok:            "tiktok",
  youtube_community: "youtube",
  threads:           "threads",
  telegram:          "telegram",
  reddit:            "reddit",
  gmb:               "gmb",
  snapchat:          "snapchat",
};

export async function postViaAyrshare(
  apiKey: string,
  post: AyrsharePost
): Promise<AyrshareResult> {
  if (!apiKey) {
    return { success: false, error: "AYRSHARE_API_KEY tidak diset. Set di Cloudflare Pages → Settings → Environment Variables." };
  }

  // Map platform names
  const platforms = post.platforms
    .map(p => PLATFORM_MAP[p] || p)
    .filter(Boolean);

  if (!platforms.length) {
    return { success: false, error: "Tidak ada platform yang valid" };
  }

  // Build hashtag string
  const hashtagStr = (post.hashtags || []).map(h => h.startsWith("#") ? h : `#${h}`).join(" ");
  const text = hashtagStr ? `${post.post}\n\n${hashtagStr}` : post.post;

  const body: Record<string, unknown> = {
    post: text,
    platforms,
  };

  // Platforms that REQUIRE media: pinterest, instagram, tiktok, snapchat, youtube
  const needsMedia = platforms.some(p => ["pinterest","instagram","tiktok","snapchat","youtube"].includes(p));
  if (post.mediaUrls?.length) {
    body.mediaUrls = post.mediaUrls;
  } else if (needsMedia) {
    // Use default AXTO logo as fallback — prevents "Missing Required Fields" error
    body.mediaUrls = ["https://axto.io/og-image.png"];
  }
  if (post.scheduleDate)      body.scheduleDate = post.scheduleDate;
  if (post.title)             body.title = post.title;
  if (post.shortenLinks)      body.shortenLinks = true;

  // YouTube requires 'title' in youTubeOptions
  if (platforms.includes("youtube")) {
    body.youTubeOptions = { title: post.title || text.slice(0, 70), visibility: "public" };
  }

  try {
    const res = await fetch(`${AYRSHARE_BASE}/post`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data: any = await res.json();

    if (res.ok && data.status === "success") {
      // Extract per-platform post IDs
      const postIds: Record<string, string> = {};
      if (data.postIds) {
        for (const [platform, info] of Object.entries(data.postIds as Record<string, any>)) {
          postIds[platform] = info.id || info.postId || "";
        }
      }

      return { success: true, id: data.id, postIds };
    }

    // Partial success (some platforms worked, some failed)
    if (data.postIds || data.errors) {
      const postIds: Record<string, string> = {};
      const errors: Record<string, string> = {};

      if (data.postIds) {
        for (const [p, info] of Object.entries(data.postIds as Record<string, any>)) {
          if (info.id) postIds[p] = info.id;
          if (info.errors) errors[p] = Array.isArray(info.errors) ? info.errors[0] : info.errors;
        }
      }

      const hasSuccess = Object.keys(postIds).length > 0;
      return { success: hasSuccess, id: data.id, postIds, errors };
    }

    return {
      success: false,
      error: data.message || data.error || `Ayrshare error: ${res.status}`,
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Network error" };
  }
}

// ── Get connected profiles from Ayrshare ─────────────────────────────────────
export async function getAyrshareProfiles(apiKey: string): Promise<{
  connected: string[];
  profiles: Record<string, { name: string; username: string; avatar?: string }>;
  error?: string;
}> {
  if (!apiKey) return { connected: [], profiles: {}, error: "No API key" };

  try {
    const res = await fetch(`${AYRSHARE_BASE}/user`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const data: any = await res.json();

    if (!res.ok) {
      return { connected: [], profiles: {}, error: data.message || data.action || "API error" };
    }

    const profiles: Record<string, { name: string; username: string; avatar?: string }> = {};
    const connected: string[] = [];

    // Ayrshare /user returns { activeSocialAccounts: [...] } on free plan
    const user = data;
    const activeSocials: string[] = user.activeSocialAccounts || [];

    // Map Ayrshare social names to our platform IDs
    const nameMap: Record<string, string> = {
      facebook: "facebook", instagram: "instagram", twitter: "twitter",
      linkedin: "linkedin", pinterest: "pinterest", tiktok: "tiktok",
      youtube: "youtube_community", telegram: "telegram", reddit: "reddit",
      threads: "threads", snapchat: "snapchat",
    };

    for (const social of activeSocials) {
      const ourId = nameMap[social.toLowerCase()] || social.toLowerCase();
      connected.push(ourId);
      profiles[ourId] = {
        name: social,
        username: user.email || "",
      };
    }

    // Also check legacy format with *Profiles fields
    const platformFields: Record<string, string> = {
      facebookProfiles:  "facebook",
      instagramProfiles: "instagram",
      twitterProfiles:   "twitter",
      linkedInProfiles:  "linkedin",
      pinterestProfiles: "pinterest",
      tiktokProfiles:    "tiktok",
      youtubeProfiles:   "youtube_community",
      telegramProfiles:  "telegram",
      redditProfiles:    "reddit",
      threadsProfiles:  "threads",
    };

    for (const [field, platform] of Object.entries(platformFields)) {
      const profileList = user[field];
      if (Array.isArray(profileList) && profileList.length > 0) {
        connected.push(platform);
        const first = profileList[0];
        profiles[platform] = {
          name:     first.name || first.displayName || first.username || platform,
          username: first.username || first.id || "",
          avatar:   first.avatar || first.profileImage || undefined,
        };
      }
    }

    return { connected, profiles };
  } catch (e: any) {
    return { connected: [], profiles: {}, error: e.message };
  }
}

// ── Check API key validity ────────────────────────────────────────────────────
export async function validateAyrshareKey(apiKey: string): Promise<{
  valid: boolean;
  plan?: string;
  email?: string;
  error?: string;
}> {
  if (!apiKey) return { valid: false, error: "No API key provided" };

  try {
    const res = await fetch(`${AYRSHARE_BASE}/user`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const data: any = await res.json();

    if (res.ok) {
      return {
        valid: true,
        plan:  data.plan || data.subscription || "free",
        email: data.email || data.user?.email || "",
      };
    }

    return { valid: false, error: data.message || "Invalid API key" };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}
