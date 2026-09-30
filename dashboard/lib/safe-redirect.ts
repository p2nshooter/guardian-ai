/* Same-site redirect targets only: a path on this origin ("/app/billing"),
 * never "//evil.com", "/\evil.com" (browsers read "\" as "/"), a scheme, or
 * anything with whitespace / control characters. */
export function safeRedirect(r: unknown, fallback: string): string {
  return typeof r === "string" && r.length <= 512 && /^\/(?![/\\])[^\\\s\u0000-\u001f]*$/.test(r) ? r : fallback;
}
