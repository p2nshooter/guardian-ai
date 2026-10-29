/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * APPLICATIONS TO THE RESELLER AND WHITE-LABEL PROGRAMMES (docs/BUSINESS-MASTER-
 * BLUEPRINT.md §7.2 step 1, REQUESTS 131). Until a programme's portal ships (P4,
 * P5) its page takes applications: one per member and programme, created once
 * ("<program>_<user>"), listed in Admin → Programs. When the portal opens, the
 * applicants are the first to be invited; nobody pays before that.
 * ============================================================================ */
import type { Data } from "./data";
import type { PartnerAppDoc } from "./data/schema";
import { getPrograms, isOpen, type Programs } from "./programs";
import { netHash } from "./affiliate";

export const PARTNER_TERMS_VERSION = "2026-10-29";
export type PartnerProgram = PartnerAppDoc["program"];
export const isPartnerProgram = (v: unknown): v is PartnerProgram => v === "reseller" || v === "whitelabel";

const s = (v: unknown, max = 160) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export interface ApplyInput { program?: unknown; name?: unknown; company?: unknown; country?: unknown; website?: unknown; languages?: unknown; volume?: unknown; message?: unknown; ack?: unknown }
export type ApplyError = "closed" | "admin" | "name" | "company" | "country" | "ack" | "program";

export async function applyPartner(db: Data, user: { sub: string; email: string; role?: string }, i: ApplyInput, ip: string, nowMs = Date.now(), programs?: Programs): Promise<{ app: PartnerAppDoc; created: boolean } | { error: ApplyError }> {
  if (!isPartnerProgram(i.program)) return { error: "program" };
  const p = programs ?? (await getPrograms(db));
  if (!isOpen(p, i.program)) return { error: "closed" };
  if (user.role === "admin") return { error: "admin" };
  const name = s(i.name, 120), company = s(i.company, 160), country = s(i.country, 60);
  if (name.length < 2) return { error: "name" };
  if (company.length < 2) return { error: "company" };
  if (country.length < 2) return { error: "country" };
  if (i.ack !== true) return { error: "ack" };
  const website = s(i.website, 200);
  const at = new Date(nowMs).toISOString();
  const doc: PartnerAppDoc = {
    id: `${i.program}_${user.sub}`, program: i.program, user_id: user.sub, email: user.email, name, company, country,
    website: /^https?:\/\//i.test(website) || !website ? website : `https://${website}`,
    languages: i.program === "whitelabel" ? s(i.languages, 80) : "", volume: s(i.volume, 120), message: String(i.message ?? "").trim().slice(0, 2000),
    status: "new", terms_version: PARTNER_TERMS_VERSION, ip: await netHash(ip), note: "", created_at: at, updated_at: at,
  };
  if (await db.partnerApps.createIfAbsent(doc)) return { app: doc, created: true };
  const existing = await db.partnerApps.get(doc.id);
  return existing ? { app: existing, created: false } : { error: "closed" };
}

export const APP_STATUSES: PartnerAppDoc["status"][] = ["new", "contacted", "invited", "declined"];

export async function setApplicationStatus(db: Data, id: string, status: unknown, note: unknown, nowMs = Date.now()): Promise<PartnerAppDoc | { error: string }> {
  if (!APP_STATUSES.includes(status as PartnerAppDoc["status"])) return { error: "Unknown status." };
  if (!(await db.partnerApps.get(id))) return { error: "Application not found." };
  return db.partnerApps.update(id, (a) => ({ ...a, status: status as PartnerAppDoc["status"], note: String(note ?? a.note).slice(0, 500), updated_at: new Date(nowMs).toISOString() }));
}
