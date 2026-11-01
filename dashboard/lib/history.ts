/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * WORKSPACE HISTORY — one reusable, encrypted per-member store every cloud app
 * uses to save the client's work so they never lose it and can browse, reopen,
 * rename, duplicate, export and delete it (full CRUD). Legal AI keeps its own
 * richer "matters" store; simpler apps (AI Studio conversations, Clipper
 * projects, Prompt runs, Compliance/Security reports) use this.
 *
 *   R2 (USER_FILES):  app/<slug>/<uid>/index.enc         list (sidebar)
 *                     app/<slug>/<uid>/items/<id>.enc     one item's full body
 *   cipher: AES-256-GCM, key unique per member (lib/user-crypto). The member's
 *   record holds nothing but their storage total (users.storage_bytes).
 * ============================================================================ */
import type { Data } from "./data";
import { newId, now } from "./db";
import { getSealedJson, putSealedJson, sealForUser } from "./user-crypto";
import { addStorage } from "./usage";

export interface HistoryEntry { id: string; title: string; updatedAt: string; createdAt: string; meta?: Record<string, string | number | boolean> }
export interface HistoryItem<T = unknown> { id: string; title: string; createdAt: string; updatedAt: string; body: T; meta?: Record<string, string | number | boolean> }

export class HistoryError extends Error { constructor(message: string, public status = 400) { super(message); } }

const APP_RE = /^[a-z][a-z0-9-]{1,30}$/;
const ID_RE = /^[a-zA-Z0-9_-]{6,40}$/;
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

export class History {
  constructor(private bucket: any, private db: Data, private uid: string, private app: string, private opts: { maxItems?: number; maxBytes?: number } = {}) {
    if (!APP_RE.test(app)) throw new HistoryError("bad app slug", 500);
  }
  private root() { return `app/${this.app}/${this.uid}`; }
  private kIndex() { return `${this.root()}/index.enc`; }
  private kItem(id: string) { return `${this.root()}/items/${id}.enc`; }
  private max = this.opts.maxItems ?? 500;
  private maxBytes = this.opts.maxBytes ?? 5_000_000;

  private async readIndex(): Promise<{ list: HistoryEntry[]; etag?: string; size: number }> {
    const r = await getSealedJson<HistoryEntry[]>(this.bucket, this.uid, this.kIndex());
    return r ? { list: r.value, etag: r.etag, size: r.size } : { list: [], size: 0 };
  }

  /** etag-guarded read-modify-write so two tabs can't clobber the list. */
  private async updateIndex(fn: (list: HistoryEntry[]) => HistoryEntry[]): Promise<void> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { list, etag, size } = await this.readIndex();
      const next = fn(list.slice());
      const key = this.kIndex();
      const body = await sealForUser(this.uid, key, JSON.stringify(next));
      const res = await this.bucket.put(key, body, {
        httpMetadata: { contentType: "application/octet-stream" }, customMetadata: { enc: "user-v1" },
        ...(etag ? { onlyIf: { etagMatches: etag } } : {}),
      });
      if (res) { await addStorage(this.db, this.uid, body.length - size); return; }
    }
    throw new HistoryError("This list changed at the same time — please retry.", 409);
  }

  async list(): Promise<HistoryEntry[]> {
    return (await this.readIndex()).list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get<T>(id: string): Promise<HistoryItem<T>> {
    if (!ID_RE.test(id)) throw new HistoryError("not found", 404);
    const r = await getSealedJson<HistoryItem<T>>(this.bucket, this.uid, this.kItem(id));
    if (!r) throw new HistoryError("not found", 404);
    return r.value;
  }

  async save<T>(input: { id?: string; title: string; body: T; meta?: Record<string, string | number | boolean> }): Promise<HistoryEntry> {
    const id = input.id && ID_RE.test(input.id) ? input.id : newId("h").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
    const title = clean(input.title, 200) || "Untitled";
    let prevSize = 0, createdAt = now();
    if (input.id) {
      const existing = await getSealedJson<HistoryItem<T>>(this.bucket, this.uid, this.kItem(id));
      if (existing) { prevSize = existing.size; createdAt = existing.value.createdAt; }
    } else {
      const { list } = await this.readIndex();
      if (list.length >= this.max) throw new HistoryError(`You can keep up to ${this.max} saved items here. Delete some to add more.`);
    }
    const item: HistoryItem<T> = { id, title, createdAt, updatedAt: now(), body: input.body, meta: input.meta };
    const bytes = new TextEncoder().encode(JSON.stringify(item)).length;
    if (bytes > this.maxBytes) throw new HistoryError("This item is too large to save.");
    const size = await putSealedJson(this.bucket, this.uid, this.kItem(id), item);
    await addStorage(this.db, this.uid, size - prevSize);
    const entry: HistoryEntry = { id, title, createdAt, updatedAt: item.updatedAt, meta: input.meta };
    await this.updateIndex((list) => [entry, ...list.filter((x) => x.id !== id)]);
    return entry;
  }

  async rename(id: string, title: string): Promise<void> {
    const item = await this.get<unknown>(id);
    item.title = clean(title, 200) || item.title;
    await this.save({ id, title: item.title, body: item.body, meta: item.meta });
  }

  async duplicate(id: string): Promise<HistoryEntry> {
    const item = await this.get<unknown>(id);
    return this.save({ title: `${item.title} (copy)`, body: item.body, meta: item.meta });
  }

  async remove(id: string): Promise<void> {
    if (!ID_RE.test(id)) throw new HistoryError("not found", 404);
    const existing = await getSealedJson(this.bucket, this.uid, this.kItem(id));
    await this.bucket.delete(this.kItem(id));
    if (existing) await addStorage(this.db, this.uid, -existing.size);
    await this.updateIndex((list) => list.filter((x) => x.id !== id));
  }
}

/** Which cloud apps use the generic history store (Legal uses its own matters). */
export const HISTORY_APPS = ["studio", "clipper", "prompts", "compliance", "security", "vault"] as const;
export type HistoryApp = (typeof HISTORY_APPS)[number];
export const isHistoryApp = (x: string): x is HistoryApp => (HISTORY_APPS as readonly string[]).includes(x);
