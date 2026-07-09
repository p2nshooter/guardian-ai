/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Self-service admin account settings — change your own login email
 * ("username") and/or password. Always requires the current password,
 * verified server-side, regardless of the already-authenticated session —
 * a stolen/left-open admin session should not be enough on its own to
 * take over the account permanently.
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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
  const keyMat = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" } as any, false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: "SHA-256" } as any, keyMat, 256);
  return `pbkdf2:100000:${bytesToHex(salt)}:${bytesToHex(new Uint8Array(derived))}`;
}
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const [algo, iterations, salt, storedHash] = hash.split(":");
    if (algo !== "pbkdf2") return false;
    const keyMat = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" } as any, false, ["deriveBits"]);
    const derived = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: hexToBytes(salt).buffer as unknown as ArrayBuffer, iterations: parseInt(iterations), hash: "SHA-256" } as any, keyMat, 256);
    return bytesToHex(new Uint8Array(derived)) === storedHash;
  } catch { return false; }
}

// ── GET /api/admin/account ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ email: user.email });
}

// ── POST /api/admin/account ───────────────────────────────────────────────────
// Body: { currentPassword: string, newEmail?: string, newPassword?: string }
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { currentPassword, newEmail, newPassword } = body;
  if (!currentPassword) return NextResponse.json({ error: "Current password is required" }, { status: 400 });
  if (!newEmail && !newPassword) return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  if (newPassword && newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  const row = await dbFirst<{ id: string; password_hash: string }>(
    db, `SELECT id, password_hash FROM users WHERE email = ? AND role = 'admin'`, [user.email.toLowerCase()]
  );
  if (!row || !row.password_hash) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const ok = await verifyPassword(currentPassword, row.password_hash);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

  if (newEmail && newEmail.toLowerCase() !== user.email.toLowerCase()) {
    const existing = await dbFirst(db, `SELECT id FROM users WHERE email = ?`, [newEmail.toLowerCase()]);
    if (existing) return NextResponse.json({ error: "That email is already in use" }, { status: 400 });
  }

  const fields: string[] = [];
  const values: any[] = [];
  if (newEmail && newEmail.toLowerCase() !== user.email.toLowerCase()) {
    fields.push("email = ?"); values.push(newEmail.toLowerCase());
  }
  if (newPassword) {
    fields.push("password_hash = ?"); values.push(await hashPassword(newPassword));
  }
  fields.push("updated_at = ?"); values.push(now());
  values.push(row.id);

  await dbRun(db, `UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

  return NextResponse.json({ success: true, email: (newEmail || user.email).toLowerCase() });
}
