/* ==============================================================================
 * Every app's AI call goes through aiFetch (a drop-in for
 * fetch("/api/byox/run", init)). When the member picked "This device" the run
 * happens in Local Mode — prompt built in the browser, answer from the model on
 * this computer; otherwise the request goes to AXTO's BYOX relay as before.
 * ============================================================================ */
import { LOCAL_PROVIDER } from "./local";

export async function aiFetch(init: RequestInit): Promise<Response> {
  let b: any = null;
  try { b = typeof init.body === "string" ? JSON.parse(init.body) : null; } catch { /* not JSON: normal relay */ }
  if (b?.provider !== LOCAL_PROVIDER) return fetch("/api/byox/run", init);
  const { runLocal } = await import("./local-run");
  return runLocal(b, init.signal || undefined);
}
