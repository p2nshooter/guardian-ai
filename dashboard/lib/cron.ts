/* AXTO — cron authentication: header x-cron-secret or "Authorization: Bearer <secret>". */
import type { NextRequest } from "next/server";
import { secret } from "./db";

export function cronAuthorized(req: NextRequest): boolean {
  const want = secret("CRON_SECRET");
  if (!want) return false;
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const got = req.headers.get("x-cron-secret") || bearer || new URL(req.url).searchParams.get("secret") || "";
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}
