/* ==============================================================================
 * GET /api/reviews   (public) — approved + featured reviews for the index.
 *   Returns ONLY safe display fields (display name honoring client + admin
 *   preferences, rating, title, body, logo, product). No emails are exposed.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { publicDisplayName } from "@/lib/reviews";

export async function GET(req: NextRequest) {
  try {
    const db = getDB(req);
    const rows = await db.prepare(
      "SELECT id, client_name, company_name, show_company, admin_show_company, logo_data, product, rating, title, body, language, created_at FROM reviews WHERE status='approved' AND featured=1 ORDER BY created_at DESC LIMIT 30",
    ).all();
    const reviews = (rows?.results || []).map((r: any) => ({
      id: r.id,
      name: publicDisplayName(r),
      logo: r.show_company === 1 && r.admin_show_company === 1 ? r.logo_data : "",
      product: r.product,
      rating: Math.max(1, Math.min(5, Number(r.rating) || 5)),
      title: r.title,
      body: r.body,
      language: r.language,
      date: (r.created_at || "").slice(0, 10),
    }));
    const avg = reviews.length ? Math.round((reviews.reduce((s: number, x: any) => s + x.rating, 0) / reviews.length) * 10) / 10 : 0;
    return NextResponse.json({ reviews, count: reviews.length, average: avg });
  } catch {
    return NextResponse.json({ reviews: [], count: 0, average: 0 });
  }
}
