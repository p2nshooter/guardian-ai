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
import { signJWT, setSessionCookie } from "@/lib/auth";


/**
 * Client self-registration with email + password.
 * Fallback for when Resend (magic link email) is down.
 * Creates: users entry + clients entry. No license yet — they buy after.
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email    = (body.email    || "").trim().toLowerCase();
  const password = (body.password || "").trim();
  const name     = (body.name     || "").trim();
  const organization = (body.organization || "").trim();

  // ── Validation ────────────────────────────────────────────────────────
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "Full name is required" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch (e: any) {
    console.error("[REGISTER] D1 error:", e.message);
    return NextResponse.json({ error: "Database not ready. Contact admin." }, { status: 503 });
  }

  // ── Check if email already exists ─────────────────────────────────────
  const existingUser = await dbFirst<{ id: string }>(db, `SELECT id FROM users WHERE email = ?`, [email]);
  if (existingUser) {
    return NextResponse.json({ error: "An account with this email already exists. Please sign in instead." }, { status: 409 });
  }

  // ── Hash password with PBKDF2 (Web Crypto, edge-compatible) ──────────
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const iterations = 100000;

  const keyMat = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password),
    { name: "PBKDF2" } as any, false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations, hash: "SHA-256" } as any,
    keyMat, 256
  );
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, "0")).join("");
  const passwordHash = `pbkdf2:${iterations}:${saltHex}:${hashHex}`;

  // ── Create user + client entries ──────────────────────────────────────
  const userId   = newId();
  const clientId = newId();
  const ts       = now();

  try {
    // Create user with password
    await dbRun(db,
      `INSERT INTO users (id, email, role, password_hash, created_at, updated_at) VALUES (?,?,'client',?,?,?)`,
      [userId, email, passwordHash, ts, ts]
    );

    // Create client profile
    const existingClient = await dbFirst(db, `SELECT id FROM clients WHERE email = ?`, [email]);
    if (!existingClient) {
      await dbRun(db,
        `INSERT INTO clients (id, email, name, organization, country, phone, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
        [clientId, email, name, organization, "", "", ts, ts]
      );
    }

    // Also log in registrations table if it exists
    try {
      await dbRun(db,
        `INSERT INTO registrations (id, email, name, organization, password_hash, email_verified, status, source, ip_address, created_at, updated_at)
         VALUES (?,?,?,?,?,1,'completed','register_password',?,?,?)`,
        [newId(), email, name, organization, passwordHash,
         req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "", ts, ts]
      );
    } catch { /* registrations table might not exist yet */ }

    // ── Auto-login after registration ───────────────────────────────────
    const jwt = await signJWT({ sub: userId, email, role: "client" });
    const res = NextResponse.json({ ok: true, message: "Account created successfully." });
    return setSessionCookie(res, jwt);

  } catch (e: any) {
    console.error("[REGISTER] Insert error:", e.message);
    // Check for unique constraint (race condition)
    if (e.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
