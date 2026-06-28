/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbRun, dbFirst, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";


// ── PKCE helpers (for Twitter OAuth 2.0) ─────────────────────────────────────
async function generateCodeVerifier(): Promise<string> {
  const array = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...Array.from(array)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(digest))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function randomState(): string {
  const array = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
}

interface OAuthConfig {
  authUrl: string;
  scopes: string[];
  pkce?: boolean;
  extra?: Record<string, string>;
  clientIdEnv: string;  // fallback env var name
  secretEnv?: string;
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  facebook: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    scopes: ["pages_show_list","pages_read_engagement","pages_manage_posts",
             "instagram_basic","instagram_content_publish","public_profile"],
    clientIdEnv: "FACEBOOK_APP_ID",
    extra: { response_type: "code" },
  },
  instagram: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    scopes: ["pages_show_list","instagram_basic","instagram_content_publish","pages_read_engagement"],
    clientIdEnv: "FACEBOOK_APP_ID",
    extra: { response_type: "code" },
  },
  twitter: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    scopes: ["tweet.read","tweet.write","users.read","offline.access"],
    pkce: true,
    clientIdEnv: "TWITTER_CLIENT_ID",
    extra: { code_challenge_method: "S256" },
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    scopes: ["openid","profile","email","w_member_social","w_organization_social"],
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    extra: { response_type: "code" },
  },
  pinterest: {
    authUrl: "https://www.pinterest.com/oauth/",
    scopes: ["boards:read","boards:write","pins:read","pins:write"],
    clientIdEnv: "PINTEREST_APP_ID",
    extra: { response_type: "code" },
  },
  youtube_community: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: ["https://www.googleapis.com/auth/youtube","https://www.googleapis.com/auth/youtube.force-ssl"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    extra: { response_type: "code", access_type: "offline", prompt: "consent" },
  },
  threads: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    scopes: ["pages_show_list","instagram_basic","threads_basic","threads_content_publish","pages_read_engagement","instagram_content_publish"],
    clientIdEnv: "FACEBOOK_APP_ID",
    extra: { response_type: "code" },
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    scopes: ["user.info.basic","video.upload","video.publish"],
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    extra: { response_type: "code" },
  },
};

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform") || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

  const config = OAUTH_CONFIGS[platform];
  if (!config) {
    return NextResponse.json({
      error: `Platform '${platform}' does not support OAuth.`,
    }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  // ── Get client ID: check D1 first, then fall back to env var ─────────────
  let clientId = "";
  const dbCreds = await dbFirst<any>(db,
    `SELECT app_id FROM platform_app_credentials WHERE platform=? AND app_id!=''`,
    // facebook creds also cover instagram & threads
    [platform === "instagram" || platform === "threads" ? "facebook" : platform]
  ).catch(() => null);

  if (dbCreds?.app_id) {
    clientId = dbCreds.app_id;
  } else {
    // Fallback to env var
    clientId = (process.env as Record<string, string | undefined>)[config.clientIdEnv] || "";
  }

  if (!clientId) {
    return NextResponse.json({
      error: `App credentials not configured for ${platform}. Go to AutoPost → Platform Credentials to add your App ID.`,
      needs_setup: true,
      platform,
    }, { status: 503 });
  }

  // Generate state + optional PKCE
  const state = randomState();
  const redirectUri = `${appUrl}/api/admin/autopost/oauth/callback`;
  let codeVerifier = "";

  const extra: Record<string, string> = { ...(config.extra || {}) };
  if (config.pkce) {
    codeVerifier = await generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    extra.code_challenge = codeChallenge;
    extra.code_challenge_method = "S256";
  }

  const stateExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await dbRun(db,
    `INSERT OR REPLACE INTO autopost_oauth_states (id, platform, state, code_verifier, redirect_uri, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newId(), platform, state, codeVerifier, redirectUri, stateExpiry, now()]
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(platform === "tiktok" ? "," : " "),
    state,
    ...extra,
  });

  const authUrl = `${config.authUrl}?${params.toString()}`;

  return NextResponse.json({ ok: true, auth_url: authUrl, platform, expires_in: 600 });
}
