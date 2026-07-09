/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, newId, now } from "@/lib/db";
import { signJWT, setSessionCookie, createMagicToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";


function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bytesToHex(salt);
  const keyMat = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" } as any, false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" } as any, keyMat, 256);
  return `pbkdf2:100000:${saltHex}:${bytesToHex(new Uint8Array(derived))}`;
}
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const [algo, iterations, salt, storedHash] = hash.split(":");
    if (algo !== "pbkdf2") return false;
    const keyMat = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" } as any, false, ["deriveBits"]);
    const saltBuf = hexToBytes(salt);
    const derived = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBuf.buffer as unknown as ArrayBuffer, iterations: parseInt(iterations), hash: "SHA-256" } as any, keyMat, 256);
    return bytesToHex(new Uint8Array(derived)) === storedHash;
  } catch { return false; }
}
async function checkRateLimit(db: any, email: string, ip: string): Promise<boolean> {
  const row = await dbFirst<{ cnt: number }>(db,
    `SELECT COUNT(*) as cnt FROM login_attempts WHERE (email = ? OR ip_address = ?) AND created_at > datetime('now', '-15 minutes')`,
    [email, ip]).catch(() => null);
  return (row?.cnt ?? 0) >= 10;
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action } = body;

  // ── Magic Link (admin) ─────────────────────────────────────────────────
  if (action === "magic_link" || action === "client_magic_link") {
    const email = (body.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    let db: any;
    try { db = getDB(req); } catch (e: any) {
      console.error("[AUTH] D1 binding error:", e.message);
      return NextResponse.json({ error: "Database not ready. Contact admin." }, { status: 503 });
    }

    let user = await dbFirst<{ id: string; role: string }>(db, `SELECT id, role FROM users WHERE email = ?`, [email]);

    if (!user) {
      const client = await dbFirst<{ id: string }>(db, `SELECT id FROM clients WHERE email = ?`, [email]);
      if (client) {
        const userId = newId();
        await dbRun(db, `INSERT INTO users (id, email, role, created_at, updated_at) VALUES (?, ?, 'client', ?, ?)`, [userId, email, now(), now()]);
        user = { id: userId, role: "client" };
      }
    }

    // Always return success to prevent email enumeration
    if (user) {
      try {
        const token = await createMagicToken(email, req);
        const redirect = body.redirect || (user.role === "admin" ? "/admin" : "/portal");
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
        const link = `${appUrl}/api/auth/callback?token=${token}&redirect=${encodeURIComponent(redirect)}`;
        await sendEmail({
          to: email,
          subject: "Your AXTO Login Link",
          html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head>
<body style="background:#060c14;color:#e2f4ff;font-family:-apple-system,sans-serif;padding:40px 24px;margin:0">
<div style="max-width:480px;margin:0 auto">
  <div style="font-size:24px;font-weight:800;color:#22d3ee;margin-bottom:24px">AXTO</div>
  <h2 style="color:#fff;margin:0 0 12px">Sign in to AXTO</h2>
  <p style="color:#94a3b8;margin:0 0 28px;line-height:1.6">Click the button below. This link is valid for <strong style="color:#fff">15 minutes</strong>.</p>
  <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#0e7490,#22d3ee);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Sign in to AXTO</a>
  <p style="color:#475569;font-size:12px;margin-top:32px">Or copy: <code style="color:#22d3ee;word-break:break-all;font-size:11px">${link}</code></p>
  <hr style="border:none;border-top:1px solid #1e293b;margin:28px 0">
  <p style="color:#334155;font-size:11px">If you did not request this, ignore this email.</p>
</div></body></html>`,
        });
      } catch (e: any) {
        console.error("[AUTH] Magic link send error:", e.message);
      }
    }

    return NextResponse.json({ ok: true, message: "If your email is registered, a login link has been sent." });
  }

  // ── Admin Password Login ────────────────────────────────────────────────
  if (action === "password_login") {
    const email    = (body.email    || "").trim().toLowerCase();
    const password = (body.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    let db: any;
    try { db = getDB(req); } catch {
      return NextResponse.json({ error: "Database not ready" }, { status: 503 });
    }

    const user = await dbFirst<{ id: string; email: string; role: string; password_hash: string | null }>(
      db, `SELECT id, email, role, password_hash FROM users WHERE email = ?`, [email]
    );

    if (!user || user.role !== "admin") {
      await new Promise(r => setTimeout(r, 300));
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    let valid = false;
    const envPass = process.env.ADMIN_PASSWORD;
    if (envPass && password === envPass) valid = true;
    if (!valid && user.password_hash) valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      await new Promise(r => setTimeout(r, 300));
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const jwt = await signJWT({ sub: user.id, email: user.email, role: "admin" });
    const res = NextResponse.json({ ok: true });
    return setSessionCookie(res, jwt);
  }

  // ── Client Registration ─────────────────────────────────────────────────
  if (action === "client_register") {
    const email        = (body.email        || "").trim().toLowerCase();
    const password     = (body.password     || "").trim();
    const name         = (body.name         || "").trim();
    const organization = (body.organization || "").trim();

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "Full name is required" }, { status: 400 });

    let db: any;
    try { db = getDB(req); } catch {
      return NextResponse.json({ error: "Database not ready. Contact admin." }, { status: 503 });
    }

    const existing = await dbFirst<{ id: string }>(db, `SELECT id FROM users WHERE email = ?`, [email]);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists. Please sign in instead." }, { status: 409 });
    }

    try {
      const passwordHash = await hashPassword(password);
      const userId = newId();
      const ts = now();
      const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "";

      await dbRun(db,
        `INSERT INTO users (id, email, role, password_hash, created_at, updated_at) VALUES (?,?,'client',?,?,?)`,
        [userId, email, passwordHash, ts, ts]
      );

      const clientExists = await dbFirst(db, `SELECT id FROM clients WHERE email = ?`, [email]);
      if (!clientExists) {
        await dbRun(db,
          `INSERT INTO clients (id, email, name, organization, country, phone, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
          [newId(), email, name, organization, "", "", ts, ts]
        );
      }

      await dbRun(db,
        `INSERT INTO registrations (id, email, name, organization, password_hash, email_verified, status, source, ip_address, created_at, updated_at) VALUES (?,?,?,?,?,1,'completed','register_password',?,?,?)`,
        [newId(), email, name, organization, passwordHash, ip, ts, ts]
      ).catch(() => {});

      const jwt = await signJWT({ sub: userId, email, role: "client" });
      const res = NextResponse.json({ ok: true, message: "Account created successfully." });
      return setSessionCookie(res, jwt);

    } catch (e: any) {
      console.error("[REGISTER] Error:", e.message);
      if (e.message?.includes("UNIQUE")) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
    }
  }

  // ── Client Password Login ───────────────────────────────────────────────
  if (action === "client_password_login") {
    const email    = (body.email    || "").trim().toLowerCase();
    const password = (body.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    let db: any;
    try { db = getDB(req); } catch {
      return NextResponse.json({ error: "Database not ready" }, { status: 503 });
    }

    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "";
    const rateLimited = await checkRateLimit(db, email, ip);
    if (rateLimited) {
      return NextResponse.json({ error: "Too many login attempts. Please wait 15 minutes." }, { status: 429 });
    }

    const user = await dbFirst<{ id: string; email: string; role: string; password_hash: string | null }>(
      db, `SELECT id, email, role, password_hash FROM users WHERE email = ?`, [email]
    );

    if (!user || !user.password_hash) {
      await new Promise(r => setTimeout(r, 300));
      await dbRun(db, `INSERT INTO login_attempts (id, email, ip_address, success, created_at) VALUES (?,?,?,0,?)`,
        [newId(), email, ip, now()]).catch(() => {});
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);

    await dbRun(db, `INSERT INTO login_attempts (id, email, ip_address, success, created_at) VALUES (?,?,?,?,?)`,
      [newId(), email, ip, valid ? 1 : 0, now()]).catch(() => {});

    if (!valid) {
      await new Promise(r => setTimeout(r, 300));
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const jwt = await signJWT({ sub: user.id, email: user.email, role: user.role as "admin" | "client" });
    const redirect = body.redirect || (user.role === "admin" ? "/admin" : "/portal");
    const res = NextResponse.json({ ok: true, redirect });
    return setSessionCookie(res, jwt);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
