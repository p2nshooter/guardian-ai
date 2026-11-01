/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * TEST-ONLY access to the records, for the end-to-end suite on the local
 * runtime (tests/e2e). Off everywhere else: it needs ALL of
 *   • E2E_TEST_DATA=1 and ALLOW_INSECURE_ENDPOINTS=1 (set only by
 *     tests/e2e/serve-local.sh, never in Cloudflare),
 *   • a request to 127.0.0.1 / localhost,
 *   • the cron secret.
 * Production answers 404 as if the route did not exist.
 * ============================================================================ */
import type { NextRequest } from "next/server";
import { getKV, secret } from "./db";
import { cronAuthorized } from "./cron";

export function testDataEnabled(req?: NextRequest): boolean {
  if (secret("E2E_TEST_DATA") !== "1" || secret("ALLOW_INSECURE_ENDPOINTS") !== "1") return false;
  if (!req) return true;
  const host = req.nextUrl.hostname;
  return (host === "127.0.0.1" || host === "localhost") && cronAuthorized(req);
}

/** In the local test run, keep the last e-mails per address (KV, one hour) so tests can follow links. */
export async function recordTestMail(to: string, subject: string, html: string): Promise<void> {
  if (!testDataEnabled()) return;
  try {
    const kv = getKV();
    const key = `e2e-mail:${to.trim().toLowerCase()}`;
    const list = JSON.parse((await kv.get(key)) || "[]") as { subject: string; html: string; at: string }[];
    list.unshift({ subject, html, at: new Date().toISOString() });
    await kv.put(key, JSON.stringify(list.slice(0, 10)), { expirationTtl: 3600 });
  } catch {}
}

export async function testMails(to: string): Promise<{ subject: string; html: string; at: string }[]> {
  try { return JSON.parse((await getKV().get(`e2e-mail:${to.trim().toLowerCase()}`)) || "[]"); } catch { return []; }
}
