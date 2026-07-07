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
import { getDB, dbFirst, dbRun, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getRandomTemplate, autoFillTemplate } from "@/lib/autopost/generator";
import { getBufferCredentials, createBufferIdea } from "@/lib/autopost/buffer";

/**
 * AXTO AutoPost — Buffer Push API
 *
 * POST /api/admin/autopost/buffer-push
 *
 * IMPORTANT — this sends a DRAFT "Idea" into Buffer's content calendar via
 * Buffer's GraphQL API. It does NOT publish live to any social platform —
 * someone still has to open Buffer and turn the Idea into a scheduled post.
 * Every response/log line below says "draft", never "published", on purpose.
 */
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try {
    db = getDB(req);
  } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}

  const language = body.language || "en";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

  const creds = await getBufferCredentials(db);
  if (!creds) {
    return NextResponse.json({
      ok: false,
      error: "Buffer not connected. Add an Access Token and Organization ID at Admin → Gateways → Buffer.",
    }, { status: 400 });
  }

  const tmpl = getRandomTemplate({ language: language as "id" | "en" });
  const filledText = tmpl
    ? autoFillTemplate(tmpl.body_text || "", { appUrl, language })
    : (language === "id"
        ? "AXTO AI Platform — Keamanan server enterprise dengan Guardian AI. Gratis trial 7 hari! axto.io"
        : "AXTO AI Platform — Enterprise server security with Guardian AI. Free 7-day trial! axto.io"
      );

  const title = language === "id"
    ? "AXTO AI Platform — Keamanan Server Enterprise"
    : "AXTO AI Platform — Enterprise Server Security";

  const result = await createBufferIdea(creds.accessToken, creds.organizationId, title, `${filledText}\n\n🔗 ${appUrl}`);

  await dbRun(db,
    `INSERT INTO autopost_posts (id, template_id, platform, category, title, body_text, status, error_msg, published_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId(),
      tmpl?.id || "default",
      "buffer_draft",
      "social",
      title,
      filledText,
      result.success ? "draft" : "failed",
      result.success ? `Draft Idea created in Buffer (id: ${result.ideaId}) — open Buffer to schedule it` : result.error,
      result.success ? now() : null,
      now(),
    ]
  ).catch(() => {});

  if (result.success) {
    return NextResponse.json({ ok: true, draft: true, idea_id: result.ideaId, template_used: tmpl?.id || "default" });
  }
  return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
}
