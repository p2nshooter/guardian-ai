export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, now } from "@/lib/db";


// ── Token exchange endpoints ──────────────────────────────────────────────────
const TOKEN_URLS: Record<string, string> = {
  facebook:          "https://graph.facebook.com/v18.0/oauth/access_token",
  instagram:         "https://graph.facebook.com/v18.0/oauth/access_token",
  twitter:           "https://api.twitter.com/2/oauth2/token",
  linkedin:          "https://www.linkedin.com/oauth/v2/accessToken",
  pinterest:         "https://api.pinterest.com/v5/oauth/token",
  youtube_community: "https://oauth2.googleapis.com/token",
  tiktok:            "https://open.tiktokapis.com/v2/oauth/token/",
  threads:           "https://graph.facebook.com/v18.0/oauth/access_token",
};

const CLIENT_ID_ENVS: Record<string, string> = {
  facebook:          "FACEBOOK_APP_ID",
  instagram:         "FACEBOOK_APP_ID",
  twitter:           "TWITTER_CLIENT_ID",
  linkedin:          "LINKEDIN_CLIENT_ID",
  pinterest:         "PINTEREST_APP_ID",
  youtube_community: "GOOGLE_CLIENT_ID",
  tiktok:            "TIKTOK_CLIENT_KEY",
  threads:           "FACEBOOK_APP_ID",
};

const CLIENT_SECRET_ENVS: Record<string, string> = {
  facebook:          "FACEBOOK_APP_SECRET",
  instagram:         "FACEBOOK_APP_SECRET",
  twitter:           "TWITTER_CLIENT_SECRET",
  linkedin:          "LINKEDIN_CLIENT_SECRET",
  pinterest:         "PINTEREST_APP_SECRET",
  youtube_community: "GOOGLE_CLIENT_SECRET",
  tiktok:            "TIKTOK_CLIENT_SECRET",
  threads:           "FACEBOOK_APP_SECRET",
};

// ── Fetch account info after token exchange ───────────────────────────────────
async function fetchAccountInfo(platform: string, accessToken: string): Promise<{name: string; id: string; extra: Record<string,string>}> {
  try {
    switch (platform) {
      case "facebook":
      case "instagram": {
        // Get pages the user manages
        const r = await fetch(
          `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`
        );
        const d: any = await r.json();

        if (platform === "instagram") {
          // Get IG Business account
          const pages = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account{id,name,username}&access_token=${accessToken}`
          );
          const pd: any = await pages.json();
          const page = pd.data?.[0];
          const ig = page?.instagram_business_account;
          if (ig) {
            return {
              name: `@${ig.username || ig.name}`,
              id: ig.id,
              extra: {
                ig_user_id: ig.id,
                page_access_token: page?.access_token || accessToken,
                page_id: page?.id || "",
              },
            };
          }
        }
        // Facebook page token
        const pages2 = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
        );
        const pd2: any = await pages2.json();
        const page2 = pd2.data?.[0];
        return {
          name: page2?.name || d.name || "Facebook Page",
          id: page2?.id || d.id || "",
          extra: page2 ? { page_id: page2.id, page_access_token: page2.access_token || accessToken } : {},
        };
      }

      case "threads": {
        // Threads uses same IG user — fetch IG Business account
        const r = await fetch(
          `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`
        );
        const d: any = await r.json();
        return {
          name: `@${d.username || "threads"}`,
          id: d.id || "",
          extra: { ig_user_id: d.id || "" },
        };
      }
      case "twitter": {
        const r = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const d: any = await r.json();
        return { name: `@${d.data?.username || "twitter"}`, id: d.data?.id || "", extra: {} };
      }

      case "linkedin": {
        const r = await fetch("https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const d: any = await r.json();
        const name = `${d.localizedFirstName || ""} ${d.localizedLastName || ""}`.trim();
        const personUrn = `urn:li:person:${d.id}`;

        // Try to get org URN if user has orgs
        let orgUrn = "";
        try {
          const orgRes = await fetch(
            "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&projection=(elements*(organization~(id,localizedName)))",
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const orgD: any = await orgRes.json();
          const org = orgD.elements?.[0];
          if (org) orgUrn = `urn:li:organization:${org["organization~"]?.id}`;
        } catch {}

        return {
          name,
          id: d.id || "",
          extra: {
            person_urn: personUrn,
            ...(orgUrn ? { organization_urn: orgUrn } : {}),
          },
        };
      }

      case "pinterest": {
        const r = await fetch("https://api.pinterest.com/v5/user_account", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const d: any = await r.json();
        // Get boards
        const br = await fetch("https://api.pinterest.com/v5/boards?page_size=1", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const bd: any = await br.json();
        const board = bd.items?.[0];
        return {
          name: d.username || "Pinterest",
          id: d.account_type || "",
          extra: board ? { board_id: board.id, board_name: board.name } : {},
        };
      }

      case "youtube_community": {
        const r = await fetch(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const d: any = await r.json();
        const ch = d.items?.[0];
        return { name: ch?.snippet?.title || "YouTube Channel", id: ch?.id || "", extra: {} };
      }

      case "tiktok": {
        const r = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const d: any = await r.json();
        const u = d.data?.user;
        return { name: u?.display_name || "TikTok", id: u?.open_id || "", extra: { open_id: u?.open_id || "" } };
      }

      default:
        return { name: "", id: "", extra: {} };
    }
  } catch {
    return { name: "", id: "", extra: {} };
  }
}

// ── Main callback handler ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code  = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const error = url.searchParams.get("error") || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

  // User denied access
  if (error) {
    const desc = url.searchParams.get("error_description") || error;
    return NextResponse.redirect(
      new URL(`/admin/autopost?oauth_error=${encodeURIComponent(desc)}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/admin/autopost?oauth_error=missing_code_or_state", req.url)
    );
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.redirect(
      new URL("/admin/autopost?oauth_error=service_unavailable", req.url)
    );
  }

  // Validate state (CSRF protection)
  const stateRow = await dbFirst<any>(db,
    `SELECT * FROM autopost_oauth_states WHERE state = ? AND expires_at > datetime('now')`,
    [state]
  );
  if (!stateRow) {
    return NextResponse.redirect(
      new URL("/admin/autopost?oauth_error=invalid_or_expired_state", req.url)
    );
  }

  const platform    = stateRow.platform as string;
  const redirectUri = stateRow.redirect_uri as string;
  const codeVerifier = stateRow.code_verifier as string;

  // Clean up state
  await dbRun(db, `DELETE FROM autopost_oauth_states WHERE state = ?`, [state]).catch(() => {});

  // Get credentials: D1 first, then fall back to env vars
  let clientId = "";
  let clientSecret = "";

  // Facebook creds also cover instagram & threads
  const credPlatform = ["instagram","threads"].includes(platform) ? "facebook" : platform;
  const dbCred = await dbFirst<any>(db,
    `SELECT app_id, app_secret FROM platform_app_credentials WHERE platform=? AND app_id!=''`,
    [credPlatform]
  ).catch(() => null);

  if (dbCred?.app_id) {
    clientId     = dbCred.app_id;
    clientSecret = dbCred.app_secret || "";
  } else {
    const env = process.env as Record<string, string | undefined>;
    clientId     = env[CLIENT_ID_ENVS[platform]     || ""] || "";
    clientSecret = env[CLIENT_SECRET_ENVS[platform] || ""] || "";
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`/admin/autopost?oauth_error=${encodeURIComponent("App credentials not configured. Go to AutoPost → Platform Credentials to add your App ID & Secret.")}&platform=${platform}`, req.url)
    );
  }

  const tokenUrl = TOKEN_URLS[platform];
  if (!tokenUrl) {
    return NextResponse.redirect(
      new URL(`/admin/autopost?oauth_error=unsupported_platform&platform=${platform}`, req.url)
    );
  }

  // Exchange code for tokens
  let tokenData: any;
  try {
    const tokenBody: Record<string, string> = {
      grant_type:   "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id:    clientId,
      client_secret: clientSecret,
    };

    // PKCE (Twitter)
    if (codeVerifier) tokenBody.code_verifier = codeVerifier;

    // LinkedIn uses Basic auth header
    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
    if (platform === "twitter") {
      headers["Authorization"] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    }

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers,
      body: new URLSearchParams(tokenBody).toString(),
    });

    tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || tokenData.message || "Token exchange failed";
      return NextResponse.redirect(
        new URL(`/admin/autopost?oauth_error=${encodeURIComponent(errMsg)}&platform=${platform}`, req.url)
      );
    }
  } catch (e: any) {
    return NextResponse.redirect(
      new URL(`/admin/autopost?oauth_error=${encodeURIComponent(e.message || "Token exchange error")}&platform=${platform}`, req.url)
    );
  }

  const accessToken  = tokenData.access_token  as string;
  const refreshToken = tokenData.refresh_token  as string || "";
  const expiresIn    = Number(tokenData.expires_in || 0);
  const tokenExpiry  = expiresIn > 0
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  // Fetch account info (name, id, extra credentials like page_id)
  const accountInfo = await fetchAccountInfo(platform, accessToken);

  // Build credentials object
  const credentials: Record<string, string> = {
    access_token: accessToken,
    ...(accountInfo.id ? { [`${platform === "youtube_community" ? "channel" : platform}_id`]: accountInfo.id } : {}),
    ...accountInfo.extra,
  };

  // Save to DB
  const ts = now();
  const existing = await dbFirst(db, `SELECT id FROM autopost_platform_configs WHERE platform = ?`, [platform]);

  if (existing) {
    await dbRun(db,
      `UPDATE autopost_platform_configs
       SET credentials = ?, is_active = 1, oauth_connected = 1,
           oauth_account_name = ?, oauth_account_id = ?, oauth_scopes = '',
           token_expires_at = ?, refresh_token = ?, updated_at = ?
       WHERE platform = ?`,
      [JSON.stringify(credentials), accountInfo.name, accountInfo.id,
       tokenExpiry || "", refreshToken, ts, platform]
    );
  } else {
    await dbRun(db,
      `INSERT INTO autopost_platform_configs
         (id, platform, credentials, is_active, oauth_connected, oauth_account_name,
          oauth_account_id, token_expires_at, refresh_token, created_at, updated_at)
       VALUES (?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID().replace(/-/g,"").slice(0,16), platform,
       JSON.stringify(credentials), accountInfo.name, accountInfo.id,
       tokenExpiry || "", refreshToken, ts, ts]
    );
  }

  // Redirect back to admin with success
  return NextResponse.redirect(
    new URL(`/admin/autopost?oauth_success=${platform}&account=${encodeURIComponent(accountInfo.name)}`, req.url)
  );
}
