/* AXTO — POST /api/selfhosted/installer {license_key}
 * Called by the AXTO installer (Windows/Linux) with the member's licence key.
 * Answers which product the key is for and returns signed, 6-hour download
 * links for that product's Docker images (see lib/download-links.ts).
 * No session: the licence key is the credential; rate-limited per IP. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getR2Builds, dbFirst } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { readJson, ipOf, audit } from "@/lib/http";
import { SELF_HOSTED, productFromKey, catalogEntry } from "@/lib/selfhosted";
import { signedImageUrl } from "@/lib/download-links";
import { absoluteUrl } from "@/lib/site";

const PORTAL = absoluteUrl("/app/self-hosted");
const no = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "installer", ipOf(req) || "anon", { max: 30, windowSeconds: 3600 });
  if (rl.limited) return no("Too many attempts. Please wait a few minutes.", 429);
  const b = await readJson(req);
  const key = String(b?.license_key || "").trim().toUpperCase();
  const slug = productFromKey(key);
  if (!slug) return no(`That doesn't look like an AXTO licence key. Copy it from ${PORTAL}.`);
  const db = getDB(req);
  const lic = await dbFirst<any>(db,
    `SELECT l.id, l.user_id, l.product, l.status, l.expires_at, l.max_nodes, u.status AS user_status
       FROM sh_licenses l LEFT JOIN users u ON u.id = l.user_id WHERE l.license_key = ?`, [key]);
  if (!lic) return no(`Licence key not found. Copy it from ${PORTAL}.`, 404);
  if (lic.status !== "active" || (lic.user_status && lic.user_status !== "active")) return no(`This licence is ${lic.status === "active" ? "suspended" : lic.status}. Manage it at ${PORTAL}.`, 403);
  if (!(new Date(lic.expires_at).getTime() > Date.now())) return no(`This licence expired on ${String(lic.expires_at).slice(0, 10)}. Renew at ${PORTAL}.`, 403);

  const p = SELF_HOSTED.find((x) => x.slug === lic.product)!;
  const r2 = getR2Builds(req);
  const images = await Promise.all(p.images.map(async (img) => {
    const head = await r2.head(`builds/latest/raw/${img.name}.tar.gz`).catch(() => null);
    const link = await signedImageUrl(img.name, lic.id);
    return { name: img.name, label: img.label, optional: !!img.optional, available: !!head, size: head?.size || 0,
             uploaded: head?.uploaded ? new Date(head.uploaded).toISOString() : "", url: link.url, expires: link.expires };
  }));
  await audit(db, { sub: lic.user_id }, "installer.links", "sh_license", lic.id, { product: p.slug }, req);
  return NextResponse.json({
    ok: true, product: p.slug, name: catalogEntry(p.slug)?.name || p.slug, port: p.port,
    expires_at: lic.expires_at, max_nodes: lic.max_nodes, images, portal: PORTAL,
  }, { headers: { "Cache-Control": "no-store" } });
}
