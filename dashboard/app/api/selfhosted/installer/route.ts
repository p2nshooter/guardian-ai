/* AXTO — POST /api/selfhosted/installer — called by AXTO Setup (Windows/Linux/macOS).
 *   {license_key, arch?}                         subscription key (PREFIX-…): which product,
 *                                                and signed 6-hour image links for it
 *   {license_key: "LIFE-…", product?, arch?}     lifetime licence: the same, for one covered app
 *                                                (a suite answers `choose` until an app is picked)
 *   {license_key: "LIFE-…", action: "activate", product, machine_id, label?}
 *                                                activates this device and returns its signed
 *                                                .axto-license file (one device slot)
 * `arch` is the Docker engine's architecture ("amd64" | "arm64"); arm64 gets the
 * <image>-arm64 builds. No session: the key is the credential; rate-limited per IP. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getR2Builds, dbFirst } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { readJson, ipOf, audit } from "@/lib/http";
import { SELF_HOSTED, productFromKey, catalogEntry, type SelfHostedProduct } from "@/lib/selfhosted";
import { signedImageUrl } from "@/lib/download-links";
import { absoluteUrl } from "@/lib/site";
import { archImageName, normArch } from "@/lib/builds";
import { isInstallKey, productsOf } from "@/lib/lifetime";
import { licenseByInstallKey, activateDevice, productName } from "@/lib/lifetime-service";
import { SigningUnavailable } from "@/lib/license-sign";

const PORTAL = absoluteUrl("/app/self-hosted");
const LIFETIME = absoluteUrl("/app/lifetime");
const no = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
const yes = (body: Record<string, unknown>) => NextResponse.json({ ok: true, ...body }, { headers: { "Cache-Control": "no-store" } });

/** Signed links for a product's images, for one architecture. `lic` is what the image route re-checks. */
async function imageLinks(req: NextRequest, p: SelfHostedProduct, lic: string, arch: string) {
  const r2 = getR2Builds(req);
  return Promise.all(p.images.map(async (img) => {
    const file = archImageName(img.name, arch);
    const head = await r2.head(`builds/latest/raw/${file}.tar.gz`).catch(() => null);
    const link = await signedImageUrl(file, lic);
    return { name: img.name, label: img.label, optional: !!img.optional, available: !!head, size: head?.size || 0,
             uploaded: head?.uploaded ? new Date(head.uploaded).toISOString() : "", url: link.url, expires: link.expires };
  }));
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "installer", ipOf(req) || "anon", { max: 30, windowSeconds: 3600 });
  if (rl.limited) return no("Too many attempts. Please wait a few minutes.", 429);
  const b = await readJson(req);
  const key = String(b?.license_key || "").trim().toUpperCase();
  const arch = normArch(b?.arch);
  if (!arch) return no("This computer's processor type is not supported. AXTO apps run on x86-64 (amd64) and ARM64.");
  const db = getDB(req);
  if (isInstallKey(key)) return lifetime(req, db, b, key, arch);

  const slug = productFromKey(key);
  if (!slug) return no(`That doesn't look like an AXTO licence key. Copy it from ${PORTAL} (subscriptions) or ${LIFETIME} (lifetime licences).`);
  const lic = await dbFirst<any>(db,
    `SELECT l.id, l.user_id, l.product, l.status, l.expires_at, l.max_nodes, u.status AS user_status
       FROM sh_licenses l LEFT JOIN users u ON u.id = l.user_id WHERE l.license_key = ?`, [key]);
  if (!lic) return no(`Licence key not found. Copy it from ${PORTAL}.`, 404);
  if (lic.status !== "active" || (lic.user_status && lic.user_status !== "active")) return no(`This licence is ${lic.status === "active" ? "suspended" : lic.status}. Manage it at ${PORTAL}.`, 403);
  if (!(new Date(lic.expires_at).getTime() > Date.now())) return no(`This licence expired on ${String(lic.expires_at).slice(0, 10)}. Renew at ${PORTAL}.`, 403);

  const p = SELF_HOSTED.find((x) => x.slug === lic.product)!;
  const images = await imageLinks(req, p, lic.id, arch);
  await audit(db, { sub: lic.user_id }, "installer.links", "sh_license", lic.id, { product: p.slug, arch }, req);
  return yes({ product: p.slug, name: catalogEntry(p.slug)?.name || p.slug, port: p.port, arch,
               expires_at: lic.expires_at, max_nodes: lic.max_nodes, images, portal: PORTAL });
}

async function lifetime(req: NextRequest, db: any, b: any, key: string, arch: string) {
  const lic = await licenseByInstallKey(db, key);
  if (!lic) return no(`Installer key not found. Copy it from ${LIFETIME}.`, 404);
  if (lic.status !== "active" || (lic.user_status && lic.user_status !== "active")) return no(`This lifetime licence is not active. Contact support from ${LIFETIME}.`, 403);
  const covered = productsOf(lic);
  const requested = String(b?.product || "").toLowerCase();
  const slug = requested || (covered.length === 1 ? covered[0] : "");
  if (!slug) {
    // A suite covers every app: the installer asks which one to install.
    return yes({ lifetime: true, license_id: lic.id, choose: covered.map((s) => ({ slug: s, name: productName(s) })), portal: LIFETIME });
  }
  if (!covered.includes(slug)) return no(`This lifetime licence covers ${covered.map(productName).join(", ")} — not ${productName(slug)}.`);
  const p = SELF_HOSTED.find((x) => x.slug === slug)!;

  if (b?.action === "activate") {
    const rl = await rateLimit(req, "installer-activate", lic.id, { max: 40, windowSeconds: 86400 });
    if (rl.limited) return no("Too many activations today. Please try again tomorrow or contact support.", 429);
    const customer = [lic.organization, lic.name, lic.email].filter(Boolean).join(" · ");
    try {
      const r = await activateDevice(db, lic.user_id, lic.id, slug, String(b?.machine_id || ""), String(b?.label || "AXTO Setup").slice(0, 80), customer);
      if (!r.ok) return no(r.error, r.status);
      await audit(db, { sub: lic.user_id }, "lifetime.activated", "lifetime_activation", r.activation.id, { license: lic.id, product: slug, machine: r.activation.machine_id, via: "installer" }, req);
      return yes({ file: r.file, filename: r.filename, machine_id: r.activation.machine_id });
    } catch (e) {
      if (e instanceof SigningUnavailable) return no("Activation is temporarily unavailable. Please try again shortly.", 503);
      throw e;
    }
  }

  // New builds are included while the licence's update period runs; installed apps keep working after it.
  if (!(lic.updates_until > new Date().toISOString())) {
    return no(`Included updates ended on ${lic.updates_until.slice(0, 10)}: new downloads need an update renewal. Apps you already installed keep working. Contact us from ${LIFETIME}.`, 403);
  }
  const images = await imageLinks(req, p, `lt:${lic.id}`, arch);
  await audit(db, { sub: lic.user_id }, "installer.links", "lifetime_license", lic.id, { product: slug, arch }, req);
  return yes({ lifetime: true, license_id: lic.id, product: slug, name: productName(slug), port: p.port, arch,
               expires_at: lic.updates_until, max_nodes: lic.devices, images, portal: LIFETIME });
}
