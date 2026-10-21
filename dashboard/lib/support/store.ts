/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Support conversations.
 *   DATA support_threads — one small document per conversation (inbox list)
 *   R2  support/threads/<id>.json — the messages (append with etag check, so a
 *       visitor and an admin writing at the same moment never lose a message)
 *   R2  support/presence.json — is an admin at the inbox right now?
 * Visitors reach their conversation with a random token (only its SHA-256 is
 * stored); signed-in members also by their account.
 * ============================================================================ */
import { getR2, newId, now } from "../db";
import type { Data } from "../data";
import type { SupportThreadDoc } from "../data/schema";

export type Sender = "visitor" | "admin" | "ai" | "system";

export interface SupportMessage { id: string; from: Sender; name: string; text: string; at: string }
export interface ThreadDoc { id: string; messages: SupportMessage[] }
export interface ThreadRow {
  id: string; token_hash: string; user_id: string | null; name: string; email: string; topic: string;
  source: "chat" | "contact" | "payment"; status: "open" | "answered" | "closed"; needs_admin: number; ai_enabled: number;
  subject: string; last_from: string; last_preview: string; unread_admin: number; message_count: number;
  last_message_at: string; created_at: string;
}

export const MAX_TEXT = 4000;
const key = (id: string) => `support/threads/${id}.json`;
const PRESENCE = "support/presence.json";
const ONLINE_WINDOW_MS = 3 * 60_000;

export async function sha256Hex(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(d).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function cleanText(v: unknown, max = MAX_TEXT): string {
  return String(v ?? "").replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
}

export async function readThread(id: string): Promise<{ doc: ThreadDoc; etag: string } | null> {
  const obj = await getR2().get(key(id));
  if (!obj) return null;
  return { doc: JSON.parse(await obj.text()) as ThreadDoc, etag: obj.etag };
}

/** Appends messages to the R2 document (optimistic concurrency, 5 attempts). */
async function appendDoc(id: string, msgs: SupportMessage[]): Promise<ThreadDoc> {
  const r2 = getR2();
  for (let attempt = 0; attempt < 5; attempt++) {
    const cur = await r2.get(key(id));
    const doc: ThreadDoc = cur ? JSON.parse(await cur.text()) : { id, messages: [] };
    doc.messages.push(...msgs);
    const put = await r2.put(key(id), JSON.stringify(doc), {
      httpMetadata: { contentType: "application/json" },
      ...(cur ? { onlyIf: { etagMatches: cur.etag } } : {}),
    });
    if (put) return doc;               // null = someone else wrote first → retry on the fresh copy
    await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
  }
  throw new Error("Conversation is busy, please retry.");
}

export async function getThreadRow(db: Data, id: string): Promise<ThreadRow | null> {
  if (!/^[\w-]{1,80}$/.test(id)) return null;
  return (await db.supportThreads.get(id)) as ThreadRow | null;
}

export async function createThread(db: Data, t: {
  name: string; email: string; topic: string; source: ThreadRow["source"]; userId?: string | null;
  subject?: string; needsAdmin: boolean; first: { name: string; text: string };
}): Promise<{ id: string; token: string; doc: ThreadDoc }> {
  const id = newId("sup");
  const token = randomToken();
  const at = now();
  const msg: SupportMessage = { id: newId("m"), from: "visitor", name: t.first.name, text: t.first.text, at };
  const doc = await appendDoc(id, [msg]);
  const row: SupportThreadDoc = {
    id, token_hash: await sha256Hex(token), user_id: t.userId || "", name: t.name, email: t.email, topic: t.topic, source: t.source, status: "open",
    needs_admin: t.needsAdmin ? 1 : 0, ai_enabled: 1, subject: (t.subject || t.first.text).slice(0, 140), last_from: "visitor",
    last_preview: t.first.text.slice(0, 160), unread_admin: 1, message_count: 1, last_message_at: at, created_at: at,
  };
  await db.supportThreads.create(row);
  return { id, token, doc };
}

export async function addMessage(db: Data, row: ThreadRow, from: Sender, name: string, text: string): Promise<SupportMessage> {
  const msg: SupportMessage = { id: newId("m"), from, name, text, at: now() };
  const doc = await appendDoc(row.id, [msg]);
  await db.supportThreads.update(row.id, (t) => ({
    ...t, last_from: from, last_preview: text.slice(0, 160), last_message_at: msg.at, message_count: doc.messages.length,
    status: from === "visitor" ? "open" : from === "admin" ? "answered" : t.status === "closed" ? "open" : t.status,
    unread_admin: from === "visitor" ? t.unread_admin + 1 : from === "admin" ? 0 : t.unread_admin,
  }));
  return msg;
}

/** Visitor access: the thread token, or the signed-in owner. */
export async function canAccess(row: ThreadRow | null, token: string, userId?: string): Promise<boolean> {
  if (!row) return false;
  if (userId && row.user_id && row.user_id === userId) return true;
  if (!token || token.length < 20) return false;
  const h = await sha256Hex(token);
  let diff = h.length ^ row.token_hash.length;
  for (let i = 0; i < Math.min(h.length, row.token_hash.length); i++) diff |= h.charCodeAt(i) ^ row.token_hash.charCodeAt(i);
  return diff === 0;
}

/** Messages as the visitor sees them (no internal system notes). */
export function publicMessages(doc: ThreadDoc): SupportMessage[] {
  return doc.messages.map((m) => ({ ...m, name: m.from === "admin" ? (m.name || "AXTO team") : m.from === "ai" ? "AXTO Assistant" : m.name }));
}

// ── admin presence ───────────────────────────────────────────────────────────
export interface Presence { online: boolean; name: string; at: number }

export async function getPresence(): Promise<Presence> {
  try {
    const o = await getR2().get(PRESENCE);
    if (!o) return { online: false, name: "", at: 0 };
    const p = JSON.parse(await o.text()) as Presence;
    return { ...p, online: p.online && Date.now() - p.at < ONLINE_WINDOW_MS };
  } catch {
    return { online: false, name: "", at: 0 };
  }
}

export async function setPresence(online: boolean, name: string): Promise<Presence> {
  const p: Presence = { online, name, at: Date.now() };
  await getR2().put(PRESENCE, JSON.stringify(p), { httpMetadata: { contentType: "application/json" } });
  return p;
}
