/**
 * AXTO — Client-side auth helpers (browser only)
 * Pure Cloudflare D1 + JWT — no third-party auth.
 */

export interface SessionUser {
  sub:   string;
  email: string;
  role:  "admin" | "client";
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return null;
    return res.json() as Promise<SessionUser>;
  } catch {
    return null;
  }
}

export async function sendMagicLink(email: string, redirect = "/portal"): Promise<{ error?: string }> {
  try {
    const res = await fetch("/api/auth", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "magic_link", email, redirect }),
    });
    const d = await res.json();
    if (!res.ok) return { error: d.error || "Failed to send link" };
    return {};
  } catch (e: any) {
    return { error: e.message || "Network error" };
  }
}

/** Admin password login */
export async function signInWithPassword(email: string, password: string): Promise<{ error?: string }> {
  try {
    const res = await fetch("/api/auth", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "password_login", email, password }),
    });
    const d = await res.json();
    if (!res.ok) return { error: d.error || "Invalid credentials" };
    return {};
  } catch (e: any) {
    return { error: e.message || "Network error" };
  }
}

/** Client password login */
export async function clientPasswordLogin(
  email: string,
  password: string,
  redirect = "/portal"
): Promise<{ error?: string; redirect?: string }> {
  try {
    const res = await fetch("/api/auth", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "client_password_login", email, password, redirect }),
    });
    const d = await res.json();
    if (!res.ok) return { error: d.error || "Invalid credentials" };
    return { redirect: d.redirect || redirect };
  } catch (e: any) {
    return { error: e.message || "Network error" };
  }
}

/** Client self-registration */
export async function clientRegister(params: {
  email: string;
  password: string;
  name: string;
  organization?: string;
}): Promise<{ error?: string }> {
  try {
    const res = await fetch("/api/auth", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "client_register", ...params }),
    });
    const d = await res.json();
    if (!res.ok) return { error: d.error || "Registration failed" };
    return {};
  } catch (e: any) {
    return { error: e.message || "Network error" };
  }
}

export async function signOut(): Promise<void> {
  try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
  window.location.href = "/auth/login";
}
