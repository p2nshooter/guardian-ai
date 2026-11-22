/* AdSense accounts of axto.io (owner, 7 Nov 2026, REQUESTS 147: "kode2 adsense ini di tumpuk aja di dusun yg rapih agar
 * tidak saling bentrok dan tidak melanggar kebijakan adsense, maksudnya 1 website memakai beberapa kode adsense dari akun
 * yg berbeda"). The list is a copy of adsense-stack.json in the ulyah.com repository (docs/ADSENSE-BLUEPRINT.md §23
 * there), whose scripts/site-audit.mjs checks the live site.
 *
 * - SITE.adsenseClient is the PRIMARY account: the only loader script (app/(site)/layout.tsx). Google ignores a second
 *   AdSense head tag on the same page ("Only one AdSense head tag supported per page").
 * - AD_ACCOUNTS is every account the site authorises — the primary first, then the stacked accounts (four since 22 Nov 2026: + pub-6701063918838796). Each gets
 *   its own google-adsense-account meta tag (app/layout.tsx, metadata verification.other) and its own line in
 *   public/ads.txt, so each account can verify the site. tests/adsense.test.ts keeps public/ads.txt equal to this list.
 * - Auto ads only: no manual ad unit anywhere. */
// 22 Nov 2026 (pemilik): „hapus seluruh kode adsense tumpuk dan meta tag nya … sisakan 3 adsense saja“ — tiga akun saja, akun lama dihapus semua.
import { SITE } from "./site";

export const ADSENSE_STACK = [
  "ca-pub-6560360898389273",
  "ca-pub-4906992051458194",
  "ca-pub-5928074389292014",
  "ca-pub-6701063918838796",
] as const;

export const AD_ACCOUNTS: readonly string[] = [...new Set<string>([SITE.adsenseClient, ...ADSENSE_STACK])];

/** public/ads.txt, one line per account. */
export function adsTxt(): string {
  return AD_ACCOUNTS.map((a) => `google.com, ${a.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0`).join("\n") + "\n";
}
