/**
 * An in-memory R2 bucket with the documented semantics, for tests and local
 * development without Cloudflare:
 *   - conditional puts (If-None-Match: *, If-Match / etagMatches,
 *     etagDoesNotMatch) are checked and applied atomically;
 *   - list is lexicographic, filtered by prefix / startAfter, paged by cursor,
 *     max 1000, and returns customMetadata only when asked;
 *   - limits: keys ≤ 1024 bytes, customMetadata ≤ 8192 bytes, and at most one
 *     write per second to the same key (R2 answers 429 beyond that).
 * Every call yields to the event loop first, so concurrent callers interleave
 * the way they would against the real service.
 */
import type { R2Body, R2Condition, R2Head, R2Like, R2ListOpts, R2ListResult, R2PutOpts } from './bucket';

interface Stored {
  /** Text for the JSON store; bytes for buckets that hold encrypted or binary objects (USER_FILES). */
  body: string | Uint8Array;
  etag: string;
  uploaded: Date;
  customMetadata: Record<string, string>;
  lastWrite: number;
}

export interface FakeOptions {
  /** Clock used for upload times and the one-write-per-second limit. */
  now?: () => number;
  /** Enforce R2's one-write-per-second-per-key limit (default true). */
  rateLimit?: boolean;
}

const bytes = (s: string): number => new TextEncoder().encode(s).length;
const asBytes = (b: string | Uint8Array): Uint8Array => (typeof b === 'string' ? new TextEncoder().encode(b) : b);
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

export class FakeR2 implements R2Like {
  readonly objects = new Map<string, Stored>();
  readonly ops = { classA: 0, classB: 0 };
  private now: () => number;
  private rateLimit: boolean;

  constructor(opts: FakeOptions = {}) {
    this.now = opts.now ?? (() => Date.now());
    this.rateLimit = opts.rateLimit ?? true;
  }

  private head0(key: string, s: Stored, withMeta = true): R2Head {
    return { key, etag: s.etag, uploaded: s.uploaded, ...(withMeta ? { customMetadata: { ...s.customMetadata } } : {}) };
  }

  async head(key: string): Promise<R2Head | null> {
    await tick();
    this.ops.classB += 1;
    const s = this.objects.get(key);
    return s ? this.head0(key, s) : null;
  }

  async get(key: string): Promise<R2Body | null> {
    await tick();
    this.ops.classB += 1;
    const s = this.objects.get(key);
    if (!s) return null;
    const body = s.body;
    return {
      ...this.head0(key, s),
      size: asBytes(body).length,
      text: async () => (typeof body === 'string' ? body : new TextDecoder().decode(body)),
      arrayBuffer: async () => asBytes(body).slice().buffer,
    } as R2Body;
  }

  private passes(cond: R2Condition | undefined, cur: Stored | undefined): boolean {
    if (!cond) return true;
    let match: string | null = null;
    let noneMatch: string | null = null;
    if (cond instanceof Headers) {
      match = cond.get('If-Match');
      noneMatch = cond.get('If-None-Match');
    } else {
      match = cond.etagMatches ?? null;
      noneMatch = cond.etagDoesNotMatch ?? null;
    }
    const strip = (e: string) => e.replace(/^W\//, '').replace(/^"|"$/g, '');
    if (match !== null && (!cur || (match !== '*' && strip(match) !== cur.etag))) return false;
    if (noneMatch !== null) {
      if (noneMatch === '*' ? Boolean(cur) : Boolean(cur) && strip(noneMatch) === cur!.etag) return false;
    }
    return true;
  }

  async put(key: string, value: string | Uint8Array, options: R2PutOpts = {}): Promise<R2Head | null> {
    await tick();
    this.ops.classA += 1;
    if (bytes(key) > 1024) throw new Error('InvalidObjectName (10020): key longer than 1024 bytes');
    const meta = options.customMetadata ?? {};
    const metaBytes = Object.entries(meta).reduce((n, [k, v]) => n + bytes(k) + bytes(v), 0);
    if (metaBytes > 8192) throw new Error('MetadataTooLarge (10012): custom metadata over 8192 bytes');
    const cur = this.objects.get(key);
    if (!this.passes(options.onlyIf, cur)) return null;
    const t = this.now();
    if (this.rateLimit && cur && t - cur.lastWrite < 1000) {
      throw new Error('429 TooManyRequests (10058): more than one write per second to the same key');
    }
    const stored: Stored = {
      body: typeof value === 'string' ? value : value.slice(),
      etag: Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join(''),
      uploaded: new Date(t),
      customMetadata: { ...meta },
      lastWrite: t,
    };
    this.objects.set(key, stored);
    return this.head0(key, stored);
  }

  async delete(keys: string | string[]): Promise<void> {
    await tick();
    const list = Array.isArray(keys) ? keys : [keys];
    if (list.length > 1000) throw new Error('delete accepts at most 1000 keys');
    for (const k of list) this.objects.delete(k);
  }

  async list(opts: R2ListOpts = {}): Promise<R2ListResult> {
    await tick();
    this.ops.classA += 1;
    const limit = Math.min(1000, Math.max(1, opts.limit ?? 1000));
    const after = opts.cursor ? atob(opts.cursor) : opts.startAfter;
    const prefix = opts.prefix ?? '';
    const keys = [...this.objects.keys()].filter((k) => k.startsWith(prefix) && (after === undefined || k > after)).sort();
    const page = keys.slice(0, limit);
    const withMeta = Boolean(opts.include?.includes('customMetadata'));
    const objects = page.map((k) => this.head0(k, this.objects.get(k)!, withMeta));
    const truncated = keys.length > limit;
    return truncated ? { objects, truncated, cursor: btoa(page[page.length - 1]!) } : { objects, truncated };
  }
}

/** A test clock: `sleep` advances time instantly, so backoff and rate limits cost nothing in tests. */
export function fakeClock(start = Date.parse('2026-10-20T00:00:00Z')) {
  let t = start;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += Math.max(1, ms);
      await tick();
    },
    advance: (ms: number) => {
      t += ms;
    },
  };
}
