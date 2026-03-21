"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/client-auth";

export default function AdminContentPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editVal,    setEditVal]    = useState("");
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/content", { credentials: "include" });
      if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
      if (!res.ok) { setError("Failed to load content"); return; }
      const d = await res.json();
      setSettings(d.settings || []);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    getSessionUser().then(u => {
      if (!u || u.role !== "admin") { router.push("/auth/login"); return; }
      load();
    });
  }, []);

  async function saveSetting(key: string, value: string) {
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "setting", key, value }),
      });
      if (res.ok) {
        setEditingKey(null);
        setSaveMsg(`Saved "${key}" successfully`);
        setTimeout(() => setSaveMsg(null), 3000);
        await load();
      } else {
        const d = await res.json();
        setError(d.error || "Save failed");
      }
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0a1628", fontSize: 13, outline: "none", fontFamily: "inherit" } as const;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", padding: "28px 32px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>← Dashboard</Link>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", marginTop: 8, marginBottom: 6, fontFamily: "Sora, sans-serif" }}>Site Content</h1>
        <p style={{ color: "#475569", fontSize: 13, marginBottom: 24 }}>Edit the hero titles, stats, and other text shown on the landing page.</p>

        {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>⚠ {error}</div>}
        {saveMsg && <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>✓ {saveMsg}</div>}

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>Loading...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {settings.map(s => (
              <div key={s.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" }}>
                {editingKey === s.key ? (
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>{s.key}</div>
                    <input value={editVal} onChange={e => setEditVal(e.target.value)} style={inputStyle} />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => saveSetting(s.key, editVal)} disabled={saving}
                        style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button onClick={() => setEditingKey(null)}
                        style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>{s.key}</div>
                      <div style={{ color: "#0a1628", fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.value || <span style={{ color: "#334155" }}>—</span>}</div>
                    </div>
                    <button onClick={() => { setEditingKey(s.key); setEditVal(s.value || ""); }}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "transparent", color: "#38bdf8", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Edit</button>
                  </div>
                )}
              </div>
            ))}
            {settings.length === 0 && (
              <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>No settings found. Run DB migrations first.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
