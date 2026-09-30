/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Which self-hosted build files exist in R2 right now (images + Windows EXEs),
 * cached in KV for 10 minutes. The portal only links files that exist.
 * ============================================================================ */
import type { NextRequest } from "next/server";
import { getEnv, getR2Builds } from "./db";

export async function availableBuilds(req: NextRequest): Promise<Set<string>> {
  const kv = getEnv(req).KV;
  try {
    const hit = kv ? await kv.get("builds:available") : null;
    if (hit) return new Set(JSON.parse(hit));
  } catch {}
  const names: string[] = [];
  try {
    const r2 = getR2Builds(req);
    for (const prefix of ["builds/latest/raw/", "builds/latest/exe/"]) {
      const res = await r2.list({ prefix, limit: 500 });
      for (const o of res.objects || []) names.push(o.key);
    }
  } catch {}
  try { if (kv) await kv.put("builds:available", JSON.stringify(names), { expirationTtl: 600 }); } catch {}
  return new Set(names);
}

export const imageKey = (name: string) => `builds/latest/raw/${name}.tar.gz`;
export const exeKey = (exe: string) => `builds/latest/exe/${exe}-windows.exe`;

/** Docker engine architecture as the installer reports it → "amd64" | "arm64" ("" = unsupported). Default amd64. */
export function normArch(a: unknown): "amd64" | "arm64" | "" {
  const s = String(a ?? "").trim().toLowerCase();
  if (!s || s === "amd64" || s === "x86_64") return "amd64";
  if (s === "arm64" || s === "aarch64") return "arm64";
  return "";
}

/** R2 file base for an image: amd64 keeps the historical name, arm64 builds are <name>-arm64. */
export const archImageName = (name: string, arch: string) => (arch === "arm64" ? `${name}-arm64` : name);
