/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * WORKSPACE HISTORY — one reusable, encrypted per-member store every cloud app
 * uses to save the client's work so they never lose it and can browse, reopen,
 * rename, duplicate, export and delete it (full CRUD). Legal AI keeps its own
 * richer "matters" store; simpler apps (AI Studio conversations, Clipper
 * projects, Prompt runs, Compliance/Security reports) use this.
 *
 *   R2 (USER_FILES):  app/<slug>/<uid>/index.enc                 list (sidebar)
 *                     app/<slug>/<uid>/items/<id>.enc             one item's full body
 *                     app/<slug>/<uid>/versions/<id>/<rev>.enc    earlier versions (opt-in)
 *   cipher: AES-256-GCM, key unique per member (lib/user-crypto). The member's
 *   record holds nothing but their storage total (users.storage_bytes).
 *
 * Safe across devices and tabs (Clipper C1, docs/apps/CLIPPER-BLUEPRINT.md §11):
 *   - every write of an item is a compare-and-swap on its etag, and every item
 *     carries a revision number. A save that says which revision it edited
 *     (`rev`) is refused with a conflict when another device saved in between,
 *     instead of silently overwriting that work;
 *   - with versions on, the copy being replaced is kept first: at most one
 *     automatic version per interval, always before another device's work is
 *     overwritten, and always before a restore. The newest N are kept; every
 *     version counts in the member's storage and is skipped (never the save)
 *     when storage is full.
 * ============================================================================ */
import type { Data } from "./data";
import { newId, now } from "./db";
import { CREATE_ONLY, realSleep, withRetry } from "./r2/bucket";
import { getSealedJson, openForUser, sealForUser } from "./user-crypto";
import { addStorage } from "./usage";

type Meta = Record<string, string | number | boolean>;
export interface HistoryEntry { id: string; title: string; updatedAt: string; createdAt: string; rev?: number; meta?: Meta }
export interface HistoryItem<T = unknown> {
  id: string; title: string; createdAt: string; updatedAt: string; body: T; meta?: Meta;
  /** Goes up by one with every save of the body (missing on items saved before C1 = 0). */
  rev?: number;
  /** When the last version of this item was kept. */
  versionAt?: string;
}
export type VersionReason = "auto" | "overwrite" | "restore";
export interface HistoryVersion { rev: number; at: string; reason: VersionReason; bytes: number }
export interface VersionPolicy { keep: number; everyMs: number }

export class HistoryError extends Error {
  constructor(message: string, public status = 400, public extra: Record<string, unknown> = {}) { super(message); }
}

/** Another device or tab saved this item after the revision the caller edited. */
export class HistoryConflict extends HistoryError {
  constructor(public current: HistoryEntry) {
    super("This was changed on another device or tab after you opened it.", 409, { conflict: true, current });
  }
}

const APP_RE = /^[a-z][a-z0-9-]{1,30}$/;
const ID_RE = /^[a-zA-Z0-9_-]{6,40}$/;
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const pad = (n: number) => String(n).padStart(9, "0");
const REASONS: VersionReason[] = ["auto", "overwrite", "restore"];
const CT = { contentType: "application/octet-stream" };

/** Apps whose items keep earlier versions. */
export const VERSIONED: Partial<Record<string, VersionPolicy>> = { clipper: { keep: 10, everyMs: 10 * 60_000 } };

export interface SaveInput<T> {
  id?: string;
  /** Missing on an existing item = keep its title (an autosave must not undo a rename). */
  title?: string;
  body: T;
  meta?: Meta;
  /** The revision the caller edited. Omit for last-write-wins (older clients). */
  rev?: number;
  /** Save even if another device saved since `rev` (their copy is kept as a version first). */
  force?: boolean;
  /** Why this save happens; "restore" always keeps the copy it replaces. */
  reason?: "save" | "restore";
  /** Storage check for the bytes this save adds: a message refuses the save (413). */
  room?: (addBytes: number) => string | null;
}
export interface SaveResult extends HistoryEntry { rev: number; created: boolean; overwrote: boolean; bytes: number; versioned: VersionReason | null }

export class History {
  constructor(private bucket: any, private db: Data, private uid: string, private app: string, private opts: { maxItems?: number; maxBytes?: number; versions?: VersionPolicy } = {}) {
    if (!APP_RE.test(app)) throw new HistoryError("bad app slug", 500);
  }
  private root() { return `app/${this.app}/${this.uid}`; }
  private kIndex() { return `${this.root()}/index.enc`; }
  private kItem(id: string) { return `${this.root()}/items/${id}.enc`; }
  private kVersions(id: string) { return `${this.root()}/versions/${id}/`; }
  private kVersion(id: string, rev: number) { return `${this.kVersions(id)}${pad(rev)}.enc`; }
  /** R2 takes one write per second per key: a write that meets the limit (429) or a passing fault waits and tries again. */
  private put(key: string, body: Uint8Array, opts: Record<string, unknown>): Promise<unknown> {
    return withRetry(() => this.bucket.put(key, body, opts), realSleep);
  }
  private max = this.opts.maxItems ?? 500;
  private maxBytes = this.opts.maxBytes ?? 5_000_000;

  private async readIndex(): Promise<{ list: HistoryEntry[]; etag?: string; size: number }> {
    const r = await getSealedJson<HistoryEntry[]>(this.bucket, this.uid, this.kIndex());
    return r ? { list: r.value, etag: r.etag, size: r.size } : { list: [], size: 0 };
  }

  /** etag-guarded read-modify-write so two tabs can't clobber the list. Returns the bytes it added. */
  private async updateIndex(fn: (list: HistoryEntry[]) => HistoryEntry[]): Promise<number> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { list, etag, size } = await this.readIndex();
      const next = fn(list.slice());
      const key = this.kIndex();
      const body = await sealForUser(this.uid, key, JSON.stringify(next));
      const res = await this.put(key, body, {
        httpMetadata: CT, customMetadata: { enc: "user-v1" },
        onlyIf: etag ? { etagMatches: etag } : CREATE_ONLY(),
      });
      if (res) return body.length - size;
    }
    throw new HistoryError("This list changed at the same time — please retry.", 409);
  }

  private entryOf(item: HistoryItem): HistoryEntry {
    return { id: item.id, title: item.title, createdAt: item.createdAt, updatedAt: item.updatedAt, rev: item.rev ?? 0, meta: item.meta };
  }

  async list(): Promise<HistoryEntry[]> {
    return (await this.readIndex()).list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get<T>(id: string): Promise<HistoryItem<T>> {
    if (!ID_RE.test(id)) throw new HistoryError("not found", 404);
    const r = await getSealedJson<HistoryItem<T>>(this.bucket, this.uid, this.kItem(id));
    if (!r) throw new HistoryError("not found", 404);
    return { ...r.value, rev: r.value.rev ?? 0 };
  }

  /** Keep `item` (as it is now) as version `item.rev`. Returns the bytes it added (0 if it was kept already). */
  private async keepVersion(item: HistoryItem, reason: VersionReason): Promise<number> {
    const rev = item.rev ?? 0;
    const key = this.kVersion(item.id, rev);
    const body = await sealForUser(this.uid, key, JSON.stringify({ ...item, rev }));
    // A revision is written once, so its version is too: create-once, and a second copy of the same revision is a no-op.
    const res = await this.put(key, body, {
      httpMetadata: CT, onlyIf: CREATE_ONLY(),
      customMetadata: { enc: "user-v1", rev: String(rev), at: item.updatedAt, reason, bytes: String(body.length) },
    });
    return res ? body.length : 0;
  }

  private async listVersionObjects(id: string): Promise<{ key: string; v: HistoryVersion }[]> {
    const out: { key: string; v: HistoryVersion }[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.bucket.list({ prefix: this.kVersions(id), cursor, include: ["customMetadata"] });
      for (const o of page.objects) {
        const m = o.customMetadata || {};
        const rev = Number(m.rev ?? o.key.slice(o.key.lastIndexOf("/") + 1, -4));
        out.push({ key: o.key, v: { rev, at: String(m.at || ""), reason: (REASONS.includes(m.reason) ? m.reason : "auto") as VersionReason, bytes: Number(m.bytes) || Number(o.size) || 0 } });
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return out; // oldest first (keys are zero-padded revisions)
  }

  /** Earlier versions of an item, newest first. */
  async versions(id: string): Promise<HistoryVersion[]> {
    if (!ID_RE.test(id)) throw new HistoryError("not found", 404);
    return (await this.listVersionObjects(id)).map((x) => x.v).reverse();
  }

  /** Drop the oldest versions beyond the policy's count. Returns the bytes it freed. */
  private async prune(id: string): Promise<number> {
    const keep = this.opts.versions?.keep ?? 0;
    const all = await this.listVersionObjects(id);
    const old = all.slice(0, Math.max(0, all.length - keep));
    if (!old.length) return 0;
    await this.bucket.delete(old.map((x) => x.key));
    return old.reduce((n, x) => n + x.v.bytes, 0);
  }

  /** One write to the member's storage total per action, whatever it touched. */
  private async account(delta: number): Promise<void> {
    if (Math.round(delta)) await addStorage(this.db, this.uid, delta);
  }

  async save<T>(input: SaveInput<T>): Promise<SaveResult> {
    const given = input.id && ID_RE.test(input.id) ? input.id : "";
    const id = given || newId("h").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
    const policy = this.opts.versions;
    let carried = 0; // versions kept by attempts that then lost the race (real revisions, so they stay and count)
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const existing = given ? await getSealedJson<HistoryItem<T>>(this.bucket, this.uid, this.kItem(id)) : null;
        const cur = existing?.value;
        const curRev = cur?.rev ?? 0;
        if (!cur) {
          const { list } = await this.readIndex();
          if (list.length >= this.max && !list.some((x) => x.id === id)) throw new HistoryError(`You can keep up to ${this.max} saved items here. Delete some to add more.`);
        }
        const stale = !!cur && input.rev !== undefined && input.rev !== curRev;
        if (stale && !input.force) throw new HistoryConflict(this.entryOf({ ...cur!, rev: curRev }));

        const at = now();
        const title = clean(input.title, 200) || cur?.title || "Untitled";
        const draft: HistoryItem<T> = { id, title, createdAt: cur?.createdAt ?? at, updatedAt: at, rev: curRev + 1, versionAt: cur?.versionAt, body: input.body, meta: input.meta };
        if (new TextEncoder().encode(JSON.stringify(draft)).length > this.maxBytes) throw new HistoryError("This item is too large to save.");
        const key = this.kItem(id);
        const sealed = await sealForUser(this.uid, key, JSON.stringify(draft));
        const grow = sealed.length - (existing?.size ?? 0);
        const refused = grow > 0 && input.room ? input.room(grow) : null;
        if (refused) throw new HistoryError(refused, 413, { upgrade: true });

        // Keep the copy this save replaces when the policy says so — and only if storage has room for it.
        let reason: VersionReason | null = null;
        if (cur && policy) {
          if (input.reason === "restore") reason = "restore";
          else if (stale) reason = "overwrite";
          else if (!cur.versionAt || Date.now() - Date.parse(cur.versionAt) >= policy.everyMs) reason = "auto";
        }
        if (reason && input.room && input.room(Math.max(0, grow) + existing!.size)) reason = null;
        let versionBytes = 0;
        if (reason) {
          versionBytes = await this.keepVersion({ ...cur!, rev: curRev }, reason);
          draft.versionAt = at;
        }
        const body = reason ? await sealForUser(this.uid, key, JSON.stringify(draft)) : sealed;
        const res = await this.put(key, body, {
          httpMetadata: CT, customMetadata: { enc: "user-v1" },
          onlyIf: existing ? { etagMatches: existing.etag } : CREATE_ONLY(),
        });
        if (!res) { carried += versionBytes; continue; }

        // The item is written: whatever happens to the housekeeping below, the bytes are counted once.
        const written = body.length - (existing?.size ?? 0) + versionBytes + carried;
        carried = 0;
        let freed = 0, indexBytes = 0;
        const entry = this.entryOf(draft);
        try {
          if (versionBytes) freed = await this.prune(id);
          indexBytes = await this.updateIndex((list) => [entry, ...list.filter((x) => x.id !== id)]);
        } finally {
          await this.account(written - freed + indexBytes);
        }
        return { ...entry, rev: draft.rev!, created: !cur, overwrote: stale, bytes: body.length, versioned: reason };
      }
      throw new HistoryError("This changed at the same time somewhere else — please retry.", 409);
    } finally {
      // A conflict or refusal after a lost race still leaves that version stored: it is counted.
      if (carried) await this.account(carried);
    }
  }

  /** A new title only: the body and its revision stay, so an open editor keeps saving without a conflict. */
  async rename(id: string, title: string): Promise<HistoryEntry> {
    if (!ID_RE.test(id)) throw new HistoryError("not found", 404);
    for (let attempt = 0; attempt < 4; attempt++) {
      const existing = await getSealedJson<HistoryItem>(this.bucket, this.uid, this.kItem(id));
      if (!existing) throw new HistoryError("not found", 404);
      const item: HistoryItem = { ...existing.value, title: clean(title, 200) || existing.value.title };
      const key = this.kItem(id);
      const body = await sealForUser(this.uid, key, JSON.stringify(item));
      const res = await this.put(key, body, { httpMetadata: CT, customMetadata: { enc: "user-v1" }, onlyIf: { etagMatches: existing.etag } });
      if (!res) continue;
      const entry = this.entryOf(item);
      const indexBytes = await this.updateIndex((list) => list.map((x) => (x.id === id ? { ...x, title: item.title } : x)).concat(list.some((x) => x.id === id) ? [] : [entry]));
      await this.account(body.length - existing.size + indexBytes);
      return entry;
    }
    throw new HistoryError("This changed at the same time somewhere else — please retry.", 409);
  }

  async duplicate(id: string, room?: SaveInput<unknown>["room"]): Promise<HistoryEntry> {
    const item = await this.get<unknown>(id);
    return this.save({ title: `${item.title} (copy)`, body: item.body, meta: item.meta, room });
  }

  /** Make version `rev` the current item again; the current one is kept as a version first. */
  async restore(id: string, rev: number, room?: SaveInput<unknown>["room"]): Promise<SaveResult> {
    if (!ID_RE.test(id) || !Number.isInteger(rev) || rev < 0) throw new HistoryError("not found", 404);
    const key = this.kVersion(id, rev);
    const obj = await this.bucket.get(key);
    if (!obj) throw new HistoryError("This version is no longer kept.", 404);
    const v = JSON.parse(new TextDecoder().decode(await openForUser(this.uid, key, new Uint8Array(await obj.arrayBuffer())))) as HistoryItem;
    return this.save({ id, title: v.title, body: v.body, meta: v.meta, force: true, reason: "restore", room });
  }

  async remove(id: string): Promise<void> {
    if (!ID_RE.test(id)) throw new HistoryError("not found", 404);
    const existing = await getSealedJson(this.bucket, this.uid, this.kItem(id));
    await this.bucket.delete(this.kItem(id));
    const versions = await this.listVersionObjects(id);
    for (let i = 0; i < versions.length; i += 1000) await this.bucket.delete(versions.slice(i, i + 1000).map((x) => x.key));
    const freed = (existing?.size ?? 0) + versions.reduce((n, x) => n + x.v.bytes, 0);
    const indexBytes = await this.updateIndex((list) => list.filter((x) => x.id !== id));
    await this.account(indexBytes - freed);
  }
}

/** Which cloud apps use the generic history store (Legal uses its own matters). */
export const HISTORY_APPS = ["studio", "clipper", "prompts", "compliance", "security", "vault"] as const;
export type HistoryApp = (typeof HISTORY_APPS)[number];
export const isHistoryApp = (x: string): x is HistoryApp => (HISTORY_APPS as readonly string[]).includes(x);
