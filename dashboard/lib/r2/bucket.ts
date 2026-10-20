/**
 * The part of Cloudflare's R2 binding the store uses, so the same code runs
 * against the real bucket in production and an exact in-memory fake in tests
 * (r2/fake.ts). Every file under src/server/r2 imports with explicit `.ts`
 * extensions and `import type`, so Node can run the unit tests directly.
 */

export interface R2Head {
  key: string;
  etag: string;
  uploaded: Date;
  customMetadata?: Record<string, string>;
}

export interface R2Body extends R2Head {
  text(): Promise<string>;
}

export type R2Condition = Headers | { etagMatches?: string; etagDoesNotMatch?: string };

export interface R2PutOpts {
  onlyIf?: R2Condition;
  customMetadata?: Record<string, string>;
  httpMetadata?: { contentType?: string };
}

export interface R2ListOpts {
  prefix?: string;
  cursor?: string;
  startAfter?: string;
  limit?: number;
  include?: ('customMetadata' | 'httpMetadata')[];
}

export interface R2ListResult {
  objects: R2Head[];
  truncated: boolean;
  cursor?: string;
}

export interface R2Like {
  get(key: string): Promise<R2Body | null>;
  head(key: string): Promise<R2Head | null>;
  /** Resolves to null when the `onlyIf` condition fails (R2 answers 412). */
  put(key: string, value: string, options?: R2PutOpts): Promise<R2Head | null>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: R2ListOpts): Promise<R2ListResult>;
}

/**
 * `If-None-Match: *` — the write only happens if the key does not exist yet
 * (evaluated atomically at commit, R2 consistency model). Written in the
 * object form rather than as a Headers instance: the binding accepts both,
 * and the object form also crosses the local platform proxy (next dev /
 * next start), which cannot carry a Headers object.
 */
export const CREATE_ONLY = (): R2Condition => ({ etagDoesNotMatch: '*' });

/**
 * R2 allows one write per second to the same key and answers 429 beyond it; it
 * can also fail a request transiently. Those are retried; anything else is a
 * real error and surfaces.
 */
export function isTransient(err: unknown): boolean {
  const m = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /\b(429|500|502|503|504)\b|10058|too many|rate limit|temporar|internal error|network|reset|timed? ?out/i.test(m);
}

export type Sleep = (ms: number) => Promise<void>;
export const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Exponential backoff with jitter: ~250 ms, 500 ms, 1 s, 2 s … capped at 4 s. */
export function backoff(attempt: number, rand: () => number = Math.random): number {
  const base = Math.min(4000, 250 * 2 ** attempt);
  return Math.round(base / 2 + rand() * (base / 2));
}

export async function withRetry<T>(fn: () => Promise<T>, sleep: Sleep, attempts = 6): Promise<T> {
  for (let i = 0; ; i += 1) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts - 1 || !isTransient(err)) throw err;
      await sleep(backoff(i));
    }
  }
}
