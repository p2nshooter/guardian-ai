import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, newId, now } from "@/lib/db";
import { signJWT, setSessionCookie } from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// ── PBKDF2 password hashing (Edge Runtime compatible) ──────────────────────
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const keyMat = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password),
    { name: "PBKDF2" } as any, false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" } as any,
    keyMat, 256
  );
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [algo, iterations, salt, hash] = storedHash.split(":");
    if (algo !== "pbkdf2") return false;
    const keyMat = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password),
      { name: "PBKDF2" } as any, false, ["deriveBits"]
    );
    const saltBuf = new Uint8Array(salt.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const derived = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: saltBuf.buffer as ArrayBuffer, iterations: parseInt(iterations), hash: "SHA-256" } as any,
      keyMat, 256
    );
    const derivedHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, "0")).join("");
    return derivedHex === hash;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action } = body;

  // ── Register: Create account with password ────────────────────────────
  if (action === "register") {
    const email = (body.email || "").trim().toLowerCase();
    const name = (body.name || "").trim();
    const password = body.password || "";
    const organization = (body.organization || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    let db: any;
    try { db = getDB(req); } catch {
      return NextResponse.json({ error: "Database not ready" }, { status: 503 });
    }

    // Check if user/client already exists
    const existingUser = await dbFirst(db, `SELECT id FROM users WHERE email = ?`, [email]);
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists. Please sign in instead." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const userId = newId();
    const clientId = newId();
    const timestamp = now();

    // Create user with password
    await dbRun(db,
      `INSERT INTO users (id, email, role, password_hash, created_at, updated_at) VALUES (?, ?, 'client', ?, ?, ?)`,
      [userId, email, passwordHash, timestamp, timestamp]
    );

    // Create client record
    const existingClient = await dbFirst(db, `SELECT id FROM clients WHERE email = ?`, [email]);
    if (!existingClient) {
      await dbRun(db,
        `INSERT INTO clients (id, email, name, organization, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [clientId, email, name, organization, timestamp, timestamp]
      );
    }

    // Log registration
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "";
    try {
      await dbRun(db,
        `INSERT INTO registrations (id, email, name, organization, password_hash, status, source, ip_address, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'completed', 'self_register', ?, ?, ?)`,
        [newId(), email, name, organization, "set", ip, timestamp, timestamp]
      );
    } catch {} // Non-critical, table might not exist yet

    // Auto-login: create JWT session
    const jwt = await signJWT({ sub: userId, email, role: "client" });
    const res = NextResponse.json({ ok: true, message: "Account created successfully" });
    return setSessionCookie(res, jwt);
  }

  // ── Password Login: Client login with email + password ────────────────
  if (action === "password_login") {
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

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

    if (!user || !user.password_hash) {
      await new Promise(r => setTimeout(r, 300)); // timing attack prevention
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Check ADMIN_PASSWORD env var for admin users
    let valid = false;
    if (user.role === "admin") {
      const envPass = process.env.ADMIN_PASSWORD;
      if (envPass && password === envPass) valid = true;
    }

    if (!valid) {
      valid = await verifyPassword(password, user.password_hash);
    }

    if (!valid) {
      await new Promise(r => setTimeout(r, 300));
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const jwt = await signJWT({ sub: user.id, email: user.email, role: user.role as "admin" | "client" });
    const res = NextResponse.json({ ok: true, role: user.role });
    return setSessionCookie(res, jwt);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
