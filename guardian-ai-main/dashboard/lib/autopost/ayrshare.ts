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

const AYRSHARE_BASE = "https://app.ayrshare.com/api";

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

  if (post.mediaUrls?.length) body.mediaUrls = post.mediaUrls;
  if (post.scheduleDate)      body.scheduleDate = post.scheduleDate;
  if (post.title)             body.title = post.title;
  if (post.shortenLinks)      body.shortenLinks = true;

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
    const res = await fetch(`${AYRSHARE_BASE}/profiles`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const data: any = await res.json();

    if (!res.ok) {
      return { connected: [], profiles: {}, error: data.message || "API error" };
    }

    const profiles: Record<string, { name: string; username: string; avatar?: string }> = {};
    const connected: string[] = [];

    // Ayrshare returns user object with connected platforms
    const user = data.user || data;

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
