/**
 * R2 Store — the application's database on Cloudflare R2 (docs/R2-DATA-BLUEPRINT.md).
 *
 * Keys:
 *   c/<collection>/<id>.json                    a document (the source of truth)
 *   u/<collection>/<unique>/<sha256(value)>     uniqueness guard, body = id of the holder
 *   i/<collection>/<index>/<value>/<sort>~<id>  index entry, customMetadata.m = summary JSON
 *   k/<name>                                    a single document (settings), JSON
 *   n/<name>                                    a counter
 *   l/<stream>/<ulid>                           append-only log entry
 *
 * Correctness rests on R2's documented guarantees: strong consistency for
 * reads, writes, deletes and lists, and atomic conditional writes
 * (If-None-Match: * → create once; If-Match / etagMatches → compare-and-swap).
 *
 * Write order for a change touching several objects: guards → document →
 * index entries. The document decides the truth: list(..., { resolve: true })
 * drops index entries that no longer match their document (and deletes them),
 * a guard whose holder does not hold the value is reclaimed after two
 * minutes, and reindex() rebuilds every index and guard from the documents.
 *
 * update() callbacks must be written as state transitions ("if the payment is
 * still pending, mark it confirmed; otherwise change nothing") because a
 * compare-and-swap that loses a race runs the callback again on the newer
 * document.
 */
import type { R2Head, R2Like, Sleep } from './bucket';
import { CREATE_ONLY, backoff, realSleep, withRetry } from './bucket';
import { newestFirst } from './ulid';

export interface Doc {
  id: string;
}

export interface IndexDef<T> {
  name: string;
  /** Value(s) the document is listed under; empty / null = not listed. */
  key: (doc: T) => string | number | null | undefined | (string | number | null | undefined)[];
  /** Order inside one value (default: newest first by created_at). */
  sort?: (doc: T) => string;
  /** Small summary kept on the entry, so lists need no document reads. */
  meta?: (doc: T) => Record<string, unknown>;
}

export interface UniqueDef<T> {
  name: string;
  value: (doc: T) => string | null | undefined;
}

export interface CollectionDef<T extends Doc> {
  name: string;
  indexes?: IndexDef<T>[];
  unique?: UniqueDef<T>[];
}

export interface StoreOptions {
  sleep?: Sleep;
  now?: () => number;
}

export interface ListOptions {
  limit?: number;
  cursor?: string;
  /** Only entries whose sort key is greater than this one (ignored when a cursor is given). */
  afterSort?: string;
}

export interface IndexEntry {
  id: string;
  key: string;
  meta: Record<string, unknown>;
}

export class ConflictError extends Error {
  field: string;
  constructor(field: string, message?: string) {
    super(message ?? `That ${field} is already in use.`);
    this.name = 'ConflictError';
    this.field = field;
  }
}

export class BusyError extends Error {
  constructor(what: string) {
    super(`${what} is being changed by someone else right now. Please try again.`);
    this.name = 'BusyError';
  }
}

/** A guard whose holder does not hold the value is reclaimed after this long. */
const ORPHAN_MS = 2 * 60_000;

async function sha256hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function encValue(v: string): Promise<string> {
  const e = encodeURIComponent(v);
  return e.length <= 200 ? e : `h_${await sha256hex(v)}`;
}

const normUnique = (v: string | null | undefined): string => (v ?? '').trim().toLowerCase();

/** Run async work over items with bounded concurrency, keeping order. */
async function mapLimit<A, B>(items: A[], limit: number, fn: (a: A) => Promise<B>): Promise<B[]> {
  const out = new Array<B>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export class Store {
  readonly bucket: R2Like;
  readonly sleep: Sleep;
  readonly now: () => number;

  constructor(bucket: R2Like, opts: StoreOptions = {}) {
    this.bucket = bucket;
    this.sleep = opts.sleep ?? realSleep;
    this.now = opts.now ?? (() => Date.now());
  }

  collection<T extends Doc>(def: CollectionDef<T>): Collection<T> {
    return new Collection<T>(this, def);
  }

  retry<T>(fn: () => Promise<T>): Promise<T> {
    return withRetry(fn, this.sleep);
  }

  /* ── single documents (settings) ─────────────────────────────────── */

  async getDoc<T>(name: string, fallback: T): Promise<T> {
    const obj = await this.retry(() => this.bucket.get(`k/${name}`));
    return obj ? (JSON.parse(await obj.text()) as T) : fallback;
  }

  /** Change a single document with compare-and-swap; `fn` returning null changes nothing. */
  updateDoc<T>(name: string, fallback: T, fn: (cur: T) => T | null): Promise<T> {
    return this.cas(`k/${name}`, name, fallback, fn);
  }

  private async cas<T>(key: string, what: string, fallback: T, fn: (cur: T) => T | null): Promise<T> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const obj = await this.retry(() => this.bucket.get(key));
      const cur = obj ? (JSON.parse(await obj.text()) as T) : structuredClone(fallback);
      const next = fn(structuredClone(cur));
      if (next === null || next === undefined) return cur;
      const body = JSON.stringify(next);
      const res = await this.retry(() =>
        this.bucket.put(key, body, { onlyIf: obj ? { etagMatches: obj.etag } : CREATE_ONLY(), httpMetadata: { contentType: 'application/json' } }),
      );
      if (res) return next;
      await this.sleep(backoff(attempt));
    }
    throw new BusyError(what);
  }

  /**
   * Write a single document only if it does not exist yet. Returns the
   * document that is stored now — ours, or the one another caller wrote first
   * — and whether this call wrote it (a retry after an ambiguous failure
   * reports false, so "created" is never claimed twice).
   */
  async createDoc<T>(name: string, value: T): Promise<{ doc: T; created: boolean }> {
    const key = `k/${name}`;
    const body = JSON.stringify(value);
    const res = await this.retry(() => this.bucket.put(key, body, { onlyIf: CREATE_ONLY(), httpMetadata: { contentType: 'application/json' } }));
    const obj = await this.retry(() => this.bucket.get(key));
    if (!obj) return this.createDoc(name, value); // deleted in between: try again
    const text = await obj.text();
    return { doc: JSON.parse(text) as T, created: Boolean(res) };
  }

  async deleteDoc(name: string): Promise<void> {
    await this.retry(() => this.bucket.delete(`k/${name}`));
  }

  /* ── counters ─────────────────────────────────────────────────────── */

  /**
   * The next value of a counter (1, 2, 3 …), never handed out twice. A retry
   * after an ambiguous failure can skip a number, so use it for references
   * (invoice numbers), not for counting things — counts come from listing.
   */
  async next(name: string, start = 1): Promise<number> {
    const v = await this.cas<{ value: number }>(`n/${name}`, `counter ${name}`, { value: start - 1 }, (c) => ({ value: c.value + 1 }));
    return v.value;
  }

  /* ── append-only logs ─────────────────────────────────────────────── */

  /** Append an entry; the key is time-ordered, so reading the stream back is chronological. */
  async append<T>(stream: string, id: string, value: T, meta?: Record<string, string>): Promise<void> {
    const key = `l/${stream}/${id}`;
    const res = await this.retry(() =>
      this.bucket.put(key, JSON.stringify(value), { onlyIf: CREATE_ONLY(), customMetadata: meta, httpMetadata: { contentType: 'application/json' } }),
    );
    if (!res) {
      // Retried after an ambiguous failure: the first attempt may have committed.
      const existing = await this.bucket.get(key);
      if (!existing || (await existing.text()) !== JSON.stringify(value)) throw new ConflictError('log entry');
    }
  }

  /** Entries of a stream in order, optionally only those after a given id. */
  async readLog<T>(stream: string, opts: { after?: string; limit?: number } = {}): Promise<{ id: string; value: T }[]> {
    const prefix = `l/${stream}/`;
    const heads = await this.listAllKeys(prefix, { startAfter: opts.after ? prefix + opts.after : undefined, max: opts.limit ?? 1000 });
    const bodies = await mapLimit(heads, 16, async (h) => {
      const o = await this.retry(() => this.bucket.get(h.key));
      return o ? { id: h.key.slice(prefix.length), value: JSON.parse(await o.text()) as T } : null;
    });
    return bodies.filter((b): b is { id: string; value: T } => b !== null);
  }

  async deleteLog(stream: string, ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i += 1000) {
      const part = ids.slice(i, i + 1000).map((id) => `l/${stream}/${id}`);
      await this.retry(() => this.bucket.delete(part));
    }
  }

  /** Every key under a prefix (paged through the cursor), up to `max`. */
  async listAllKeys(prefix: string, opts: { startAfter?: string; max?: number; meta?: boolean } = {}): Promise<R2Head[]> {
    const out: R2Head[] = [];
    const max = opts.max ?? 100_000;
    let cursor: string | undefined;
    do {
      const res = await this.retry(() =>
        this.bucket.list({
          prefix,
          cursor,
          startAfter: cursor ? undefined : opts.startAfter,
          limit: Math.min(1000, max - out.length),
          include: opts.meta ? ['customMetadata'] : undefined,
        }),
      );
      out.push(...res.objects);
      cursor = res.truncated ? res.cursor : undefined;
    } while (cursor && out.length < max);
    return out;
  }
}

export class Collection<T extends Doc> {
  readonly store: Store;
  readonly def: CollectionDef<T>;

  constructor(store: Store, def: CollectionDef<T>) {
    this.store = store;
    this.def = def;
  }

  private get b(): R2Like {
    return this.store.bucket;
  }

  docKey(id: string): string {
    if (!id || /[/~]/.test(id)) throw new Error(`invalid id "${id}"`);
    return `c/${this.def.name}/${id}.json`;
  }

  private async guardKey(unique: string, value: string): Promise<string> {
    return `u/${this.def.name}/${unique}/${await sha256hex(value)}`;
  }

  private uniqueDef(name: string): UniqueDef<T> {
    const u = this.def.unique?.find((x) => x.name === name);
    if (!u) throw new Error(`${this.def.name} has no unique "${name}"`);
    return u;
  }

  private indexDef(name: string): IndexDef<T> {
    const i = this.def.indexes?.find((x) => x.name === name);
    if (!i) throw new Error(`${this.def.name} has no index "${name}"`);
    return i;
  }

  /** Index entry keys (and their summaries) a document should have. */
  async entriesFor(doc: T): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const idx of this.def.indexes ?? []) {
      const raw = idx.key(doc);
      const values = (Array.isArray(raw) ? raw : [raw]).filter((v) => v !== null && v !== undefined && String(v) !== '');
      if (!values.length) continue;
      const created = (doc as unknown as { created_at?: string }).created_at ?? '';
      const sort = idx.sort ? idx.sort(doc) : newestFirst(created);
      const meta = JSON.stringify(idx.meta ? idx.meta(doc) : {});
      for (const v of new Set(values.map(String))) {
        out.set(`i/${this.def.name}/${idx.name}/${await encValue(v)}/${sort}~${doc.id}`, meta);
      }
    }
    return out;
  }

  private async syncIndexes(before: T | null, after: T | null): Promise<void> {
    const a = before ? await this.entriesFor(before) : new Map<string, string>();
    const z = after ? await this.entriesFor(after) : new Map<string, string>();
    const puts = [...z].filter(([k, m]) => a.get(k) !== m);
    const dels = [...a.keys()].filter((k) => !z.has(k));
    await mapLimit(puts, 8, ([k, m]) => this.store.retry(() => this.b.put(k, '', { customMetadata: { m } })));
    if (dels.length) await this.store.retry(() => this.b.delete(dels));
  }

  /** Take a uniqueness guard for `id`; throws ConflictError when someone else holds the value. */
  private async acquire(def: UniqueDef<T>, value: string, id: string): Promise<boolean> {
    const key = await this.guardKey(def.name, value);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const res = await this.store.retry(() => this.b.put(key, id, { onlyIf: CREATE_ONLY() }));
      if (res) return true;
      const g = await this.store.retry(() => this.b.get(key));
      if (!g) continue; // released in between: try again
      const holder = await g.text();
      if (holder === id) return false; // already ours (an earlier attempt committed)
      const held = await this.get(holder);
      if (held && normUnique(def.value(held)) === value) throw new ConflictError(def.name);
      if (this.store.now() - g.uploaded.getTime() < ORPHAN_MS) throw new ConflictError(def.name);
      // An abandoned guard (its holder never finished or has moved on): reclaim it atomically.
      const taken = await this.store.retry(() => this.b.put(key, id, { onlyIf: { etagMatches: g.etag } }));
      if (taken) return true;
    }
    throw new ConflictError(def.name);
  }

  /** Release a guard, but only if `id` still holds it. */
  private async release(def: UniqueDef<T>, value: string, id: string): Promise<void> {
    const key = await this.guardKey(def.name, value);
    const g = await this.store.retry(() => this.b.get(key));
    if (g && (await g.text()) === id) await this.store.retry(() => this.b.delete(key));
  }

  /* ── reads ──────────────────────────────────────────────────────── */

  async get(id: string): Promise<T | null> {
    // An id that can never be a document (empty, or with / or ~ from a URL) is simply not found.
    if (!id || /[/~]/.test(id)) return null;
    const o = await this.store.retry(() => this.b.get(this.docKey(id)));
    return o ? (JSON.parse(await o.text()) as T) : null;
  }

  async getMany(ids: string[]): Promise<(T | null)[]> {
    return mapLimit(ids, 16, (id) => this.get(id));
  }

  /** The document holding a unique value (e.g. a user by email), or null. */
  async find(unique: string, value: string): Promise<T | null> {
    const def = this.uniqueDef(unique);
    const v = normUnique(value);
    if (!v) return null;
    const key = await this.guardKey(def.name, v);
    const g = await this.store.retry(() => this.b.get(key));
    if (!g) return null;
    const doc = await this.get(await g.text());
    return doc && normUnique(def.value(doc)) === v ? doc : null;
  }

  /**
   * One page of an index. With `resolve`, the documents are read too, and
   * entries that no longer match their document are dropped and deleted.
   */
  async list(index: string, value: string | number, opts: ListOptions = {}): Promise<{ entries: IndexEntry[]; cursor?: string }> {
    this.indexDef(index);
    const prefix = `i/${this.def.name}/${index}/${await encValue(String(value))}/`;
    // Keys are <sort>~<id>: starting after "<sort>~\uffff" skips every entry with that sort key.
    const startAfter = !opts.cursor && opts.afterSort !== undefined ? `${prefix}${opts.afterSort}~\uffff` : undefined;
    const res = await this.store.retry(() =>
      this.b.list({ prefix, cursor: opts.cursor, startAfter, limit: Math.min(1000, opts.limit ?? 100), include: ['customMetadata'] }),
    );
    const entries = res.objects.map((o) => ({
      id: o.key.slice(o.key.lastIndexOf('~') + 1),
      key: o.key,
      meta: JSON.parse(o.customMetadata?.m ?? '{}') as Record<string, unknown>,
    }));
    return res.truncated ? { entries, cursor: res.cursor } : { entries };
  }

  /**
   * Documents listed under an index value, in index order, verified against
   * the documents themselves: an entry whose document is gone or no longer
   * belongs there is dropped and deleted, and a stale summary is rewritten.
   */
  async listDocs(index: string, value: string | number, opts: ListOptions = {}): Promise<{ docs: T[]; cursor?: string }> {
    const page = await this.list(index, value, opts);
    const docs = await this.getMany(page.entries.map((e) => e.id));
    const keep: T[] = [];
    const stale: string[] = [];
    const repair: [string, string][] = [];
    for (let i = 0; i < docs.length; i += 1) {
      const d = docs[i];
      const e = page.entries[i]!;
      const want = d ? (await this.entriesFor(d)).get(e.key) : undefined;
      if (d && want !== undefined) {
        keep.push(d);
        if (want !== JSON.stringify(e.meta)) repair.push([e.key, want]);
      } else stale.push(e.key);
    }
    if (stale.length) await this.store.retry(() => this.b.delete(stale));
    await mapLimit(repair, 8, ([k, m]) => this.store.retry(() => this.b.put(k, '', { customMetadata: { m } })).catch(() => null));
    return page.cursor ? { docs: keep, cursor: page.cursor } : { docs: keep };
  }

  /** All documents under an index value (all pages, up to `max`). */
  async listAllDocs(index: string, value: string | number, max = 5000): Promise<T[]> {
    const out: T[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.listDocs(index, value, { cursor, limit: 1000 });
      out.push(...page.docs);
      cursor = page.cursor;
    } while (cursor && out.length < max);
    return out;
  }

  /** How many entries an index value has (counts keys; reads no documents). */
  async count(index: string, value: string | number): Promise<number> {
    this.indexDef(index);
    const prefix = `i/${this.def.name}/${index}/${await encValue(String(value))}/`;
    return (await this.store.listAllKeys(prefix)).length;
  }

  /** How many documents the collection holds (counts keys; reads no documents). */
  async countDocs(): Promise<number> {
    return (await this.store.listAllKeys(`c/${this.def.name}/`)).length;
  }

  /** Every document in the collection (backups, reports, reindex). */
  async all(max = 100_000): Promise<T[]> {
    const heads = await this.store.listAllKeys(`c/${this.def.name}/`, { max });
    const docs = await mapLimit(heads, 16, async (h) => {
      const o = await this.store.retry(() => this.b.get(h.key));
      return o ? (JSON.parse(await o.text()) as T) : null;
    });
    return docs.filter((d): d is T => d !== null);
  }

  /* ── writes ─────────────────────────────────────────────────────── */

  /** Create a document; ConflictError when the id or a unique value is taken. */
  async create(doc: T): Promise<T> {
    const key = this.docKey(doc.id);
    const taken: { def: UniqueDef<T>; value: string }[] = [];
    try {
      for (const def of this.def.unique ?? []) {
        const v = normUnique(def.value(doc));
        if (v && (await this.acquire(def, v, doc.id))) taken.push({ def, value: v });
      }
      const body = JSON.stringify(doc);
      const res = await this.store.retry(() => this.b.put(key, body, { onlyIf: CREATE_ONLY(), httpMetadata: { contentType: 'application/json' } }));
      if (!res) {
        const existing = await this.store.retry(() => this.b.get(key));
        if (!existing || (await existing.text()) !== body) throw new ConflictError('id');
      }
    } catch (err) {
      for (const t of taken) await this.release(t.def, t.value, doc.id).catch(() => undefined);
      throw err;
    }
    await this.syncIndexes(null, doc);
    return doc;
  }

  /** Create unless a document with this id already exists (idempotent import). Returns whether it was created. */
  async createIfAbsent(doc: T): Promise<boolean> {
    if (await this.get(doc.id)) return false;
    try {
      await this.create(doc);
      return true;
    } catch (err) {
      if (err instanceof ConflictError && err.field === 'id') return false;
      throw err;
    }
  }

  /**
   * Change a document with compare-and-swap. `fn` gets a copy of the current
   * document and returns the new one, or null to change nothing.
   */
  async update(id: string, fn: (cur: T) => T | null | undefined): Promise<T> {
    const key = this.docKey(id);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const obj = await this.store.retry(() => this.b.get(key));
      if (!obj) throw new Error(`${this.def.name} ${id} not found`);
      const before = JSON.parse(await obj.text()) as T;
      const next = fn(structuredClone(before));
      if (next === null || next === undefined) return before;
      if (next.id !== id) throw new Error('a document id cannot change');
      const body = JSON.stringify(next);
      if (body === JSON.stringify(before)) return before;

      const gained: { def: UniqueDef<T>; value: string }[] = [];
      const lost: { def: UniqueDef<T>; value: string }[] = [];
      try {
        for (const def of this.def.unique ?? []) {
          const was = normUnique(def.value(before));
          const now = normUnique(def.value(next));
          if (was === now) continue;
          if (now && (await this.acquire(def, now, id))) gained.push({ def, value: now });
          if (was) lost.push({ def, value: was });
        }
        const res = await this.store.retry(() =>
          this.b.put(key, body, { onlyIf: { etagMatches: obj.etag }, httpMetadata: { contentType: 'application/json' } }),
        );
        if (!res) {
          for (const g of gained) await this.release(g.def, g.value, id);
          await this.store.sleep(backoff(attempt));
          continue;
        }
      } catch (err) {
        for (const g of gained) await this.release(g.def, g.value, id).catch(() => undefined);
        throw err;
      }
      for (const l of lost) await this.release(l.def, l.value, id).catch(() => undefined);
      await this.syncIndexes(before, next);
      return next;
    }
    throw new BusyError(`${this.def.name} ${id}`);
  }

  /**
   * Create or change a document in one call: `fn` gets the current document,
   * or null when there is none, and returns the new one (null = no change).
   */
  async upsert(id: string, fn: (cur: T | null) => T | null | undefined): Promise<T | null> {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const cur = await this.get(id);
      if (!cur) {
        const fresh = fn(null);
        if (!fresh) return null;
        try {
          return await this.create(fresh);
        } catch (err) {
          if (err instanceof ConflictError && err.field === 'id') continue; // created in between
          throw err;
        }
      }
      try {
        return await this.update(id, (c) => fn(c));
      } catch (err) {
        if (err instanceof Error && err.message.endsWith('not found')) continue; // deleted in between
        throw err;
      }
    }
    throw new BusyError(`${this.def.name} ${id}`);
  }

  /** Delete a document with its index entries and guards. Returns whether it existed. */
  async delete(id: string): Promise<boolean> {
    const doc = await this.get(id);
    if (!doc) return false;
    await this.syncIndexes(doc, null);
    await this.store.retry(() => this.b.delete(this.docKey(id)));
    for (const def of this.def.unique ?? []) {
      const v = normUnique(def.value(doc));
      if (v) await this.release(def, v, id).catch(() => undefined);
    }
    return true;
  }

  /**
   * Rebuild every index entry and guard from the documents: adds what is
   * missing, fixes changed summaries, removes entries without a matching
   * document and guards whose holder no longer holds the value.
   */
  async reindex(): Promise<{ docs: number; entriesAdded: number; entriesRemoved: number; guardsAdded: number; guardsRemoved: number }> {
    const docs = await this.all();
    const want = new Map<string, string>();
    for (const d of docs) for (const [k, m] of await this.entriesFor(d)) want.set(k, m);
    const have = await this.store.listAllKeys(`i/${this.def.name}/`, { meta: true });
    const haveMap = new Map(have.map((h) => [h.key, h.customMetadata?.m ?? '{}']));
    const add = [...want].filter(([k, m]) => haveMap.get(k) !== m);
    const remove = [...haveMap.keys()].filter((k) => !want.has(k));
    await mapLimit(add, 8, ([k, m]) => this.store.retry(() => this.b.put(k, '', { customMetadata: { m } })));
    for (let i = 0; i < remove.length; i += 1000) {
      const part = remove.slice(i, i + 1000);
      await this.store.retry(() => this.b.delete(part));
    }

    const wantGuards = new Map<string, string>();
    for (const d of docs) {
      for (const def of this.def.unique ?? []) {
        const v = normUnique(def.value(d));
        if (v) wantGuards.set(await this.guardKey(def.name, v), d.id);
      }
    }
    const haveGuards = await this.store.listAllKeys(`u/${this.def.name}/`);
    let guardsAdded = 0;
    let guardsRemoved = 0;
    for (const [k, id] of wantGuards) {
      const g = await this.store.retry(() => this.b.get(k));
      if (!g) {
        await this.store.retry(() => this.b.put(k, id, { onlyIf: CREATE_ONLY() }));
        guardsAdded += 1;
      }
    }
    for (const h of haveGuards) {
      if (!wantGuards.has(h.key) && this.store.now() - h.uploaded.getTime() >= ORPHAN_MS) {
        await this.store.retry(() => this.b.delete(h.key));
        guardsRemoved += 1;
      }
    }
    return { docs: docs.length, entriesAdded: add.length, entriesRemoved: remove.length, guardsAdded, guardsRemoved };
  }
}
