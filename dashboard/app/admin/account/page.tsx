/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser, signOut } from "@/lib/client-auth";

export default function AdminAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"password" | "email" | null>(null);
  const [form, setForm] = useState({ currentPassword: "", newEmail: "", newPassword: "", confirmPassword: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/account", { credentials: "include" });
      if (r.status === 401 || r.status === 403) { router.push("/auth/login?redirect=/admin/account"); return; }
      const d = await r.json();
      setEmail(d.email || "");
      setForm(f => ({ ...f, newEmail: d.email || "" }));
    } catch {
      setError("Failed to load account info");
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    (async () => {
      const u = await getSessionUser();
      if (!u || u.role !== "admin") { router.push("/auth/login?redirect=/admin/account"); return; }
      await load();
    })();
  }, [load, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setDone(null);
    if (!form.currentPassword) { setError("Enter your current password to confirm changes"); return; }
    const changingEmail = form.newEmail.trim().toLowerCase() !== email.toLowerCase();
    const changingPassword = !!form.newPassword;
    if (!changingEmail && !changingPassword) { setError("Nothing to change"); return; }
    if (changingPassword && form.newPassword !== form.confirmPassword) { setError("New password and confirmation don't match"); return; }
    if (changingPassword && form.newPassword.length < 8) { setError("New password must be at least 8 characters"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newEmail: changingEmail ? form.newEmail.trim() : undefined,
          newPassword: changingPassword ? form.newPassword : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Failed to update account"); setSaving(false); return; }
      if (changingEmail) {
        setDone("email");
        setTimeout(() => { signOut(); router.push("/auth/login"); }, 2500);
      } else {
        setDone("password");
        setForm(f => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }));
      }
    } catch { setError("Network error — please try again"); }
    setSaving(false);
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>Loading…</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ background: "#0a1628", padding: "0 32px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>⚙️ Account Settings</span>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 16px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 900, fontSize: 22, color: "#0a1628" }}>Your Account</div>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Currently signed in as <strong>{email}</strong>. Changing your email will sign you out — log back in with the new address.</div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontWeight: 700, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}
        {done === "password" && (
          <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#166534", fontWeight: 700, fontSize: 13 }}>
            ✅ Password updated.
          </div>
        )}
        {done === "email" && (
          <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#166534", fontWeight: 700, fontSize: 13 }}>
            ✅ Email updated — signing you out to log back in with your new email…
          </div>
        )}

        <form onSubmit={submit} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Login Email (Username)</label>
            <input type="email" value={form.newEmail} onChange={e => setForm(f => ({ ...f, newEmail: e.target.value }))}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>New Password (optional)</label>
              <input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="Leave blank to keep current"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Confirm New Password</label>
              <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ marginBottom: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>Current Password *</label>
            <input type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              placeholder="Required to confirm any change"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
          </div>

          <button type="submit" disabled={saving}
            style={{ padding: "11px 24px", borderRadius: 10, border: "none", background: "#0284c7", color: "#fff", fontWeight: 800, fontSize: 13, cursor: saving ? "default" : "pointer", width: "100%" }}>
            {saving ? "Saving…" : "💾 Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
