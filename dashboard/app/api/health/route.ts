/* AXTO — GET /api/health · liveness + binding check (no secrets, no records).
 * `records` says where the data store stands: "ready" (R2, the move from D1
 * done), "moving" (the one-time move is running) or "unavailable". */
export const runtime = "edge";
import { NextResponse } from "next/server";
import { getEnv, getRawData, secret } from "@/lib/db";
import { migrationState } from "@/lib/data/migrate";
import { VERSION } from "@/lib/site";

export async function GET() {
  const env = getEnv();
  let records: "ready" | "moving" | "unavailable" = "unavailable";
  let movedAt = "";
  try {
    const state = await migrationState(getRawData());
    records = state ? "ready" : "moving";
    movedAt = state?.at || "";
  } catch {}
  return NextResponse.json({
    ok: records === "ready", version: VERSION, records, movedAt,
    // The commit this deployment was built from (lets anyone check which build a hostname serves).
    build: (process.env.NEXT_PUBLIC_BUILD_SHA || "dev").slice(0, 12),
    bindings: { data: !!env.DATA, backups: !!env.BACKUPS, kv: !!env.KV, r2: !!env.R2, userFiles: !!env.USER_FILES, builds: !!env.R2_BUILDS },
    // The old D1 database, read-only, kept for seven days after the move and then unbound.
    legacy: { d1: !!env.DB },
    // Presence only — never values.
    secrets: { jwt: !!secret("JWT_SECRET"), encryption: !!secret("ENCRYPTION_KEY"), settings: !!(secret("SETTINGS_ENCRYPTION_KEY") || secret("ENCRYPTION_KEY")), cron: !!secret("CRON_SECRET") },
    time: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
