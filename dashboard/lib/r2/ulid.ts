/**
 * Time-ordered ids (ULID: 48-bit milliseconds + 80 random bits, Crockford
 * base32). Sorting the keys sorts by time, which is what R2's lexicographic
 * `list` returns, so "oldest first" needs no extra index.
 */
const ENC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function ulid(now: number = Date.now()): string {
  let t = Math.max(0, Math.floor(now));
  let time = '';
  for (let i = 0; i < 10; i += 1) {
    time = ENC[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const rnd = crypto.getRandomValues(new Uint8Array(16));
  let r = '';
  for (let i = 0; i < 16; i += 1) r += ENC[rnd[i]! % 32];
  return time + r;
}

/** A fixed-width key part that sorts newest first. */
export function newestFirst(iso: string | number): string {
  const ms = typeof iso === 'number' ? iso : Date.parse(iso) || 0;
  return String(9_999_999_999_999 - ms).padStart(13, '0');
}

/** A fixed-width key part that sorts oldest first. */
export function oldestFirst(iso: string | number): string {
  const ms = typeof iso === 'number' ? iso : Date.parse(iso) || 0;
  return String(ms).padStart(13, '0');
}
