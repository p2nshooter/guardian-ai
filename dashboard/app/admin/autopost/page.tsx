/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/client-auth";

const INTERVAL_OPTIONS = [
  { value: "hourly",  label: "Every 1 hour" },
  { value: "2hours",  label: "Every 2 hours" },
  { value: "6hours",  label: "Every 6 hours" },
  { value: "12hours", label: "Every 12 hours" },
  { value: "daily",   label: "Once a day" },
  { value: "weekly",  label: "Once a week" },
];

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminAutopostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Classified autopilot
  const [classifiedEnabled, setClassifiedEnabled] = useState(true);
  const [classifiedInterval, setClassifiedInterval] = useState("6hours");
  const [classifiedLastRun, setClassifiedLastRun] = useState("");

  // Social autopilot
  const [socialEnabled, setSocialEnabled] = useState(false);
  const [socialInterval, setSocialInterval] = useState("daily");
  const [socialLastRun, setSocialLastRun] = useState("");
  const [ayrshareStatus, setAyrshareStatus] = useState<any>(null);
  const [ayrshareKey, setAyrshareKey] = useState("");
  const [showConnect, setShowConnect] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Stats
  const [posts, setPosts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);

  const connectedPlatforms = ayrshareStatus?.platforms || [];
  const publishedCount = posts.filter((p: any) => p.status === "published").length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/autopost", { credentials: "include" });
      if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
      if (!res.ok) { setError("Failed to load"); return; }
      const d = await res.json();
      setPosts(d.posts || []);

      const cSched = (d.schedules || []).find((s: any) => s.platform === "classified_all");
      const sSched = (d.schedules || []).find((s: any) => s.platform === "social_all");
      if (cSched) {
        setClassifiedEnabled(cSched.is_active === 1);
        setClassifiedInterval(cSched.frequency || "6hours");
        setClassifiedLastRun(cSched.last_run || "");
      }
      if (sSched) {
        setSocialEnabled(sSched.is_active === 1);
        setSocialInterval(sSched.frequency || "daily");
        setSocialLastRun(sSched.last_run || "");
      }

      try {
        const aRes = await fetch("/api/admin/autopost/ayrshare", { credentials: "include" });
        if (aRes.ok) setAyrshareStatus(await aRes.json());
      } catch {}
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    getSessionUser().then(u => {
      if (!u || u.role !== "admin") { router.push("/auth/login"); return; }
      load();
    });
  }, []);

  async function saveSchedule(type: "classified" | "social") {
    setSaving(true); setError(null);
    const isClassified = type === "classified";
    try {
      const res = await fetch("/api/admin/autopost", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          platform: isClassified ? "classified_all" : "social_all",
          frequency: isClassified ? classifiedInterval : socialInterval,
          language: "en",
          is_active: isClassified ? classifiedEnabled : socialEnabled,
        }),
      });
      const d = await res.json();
      if (d.success) setMsg(`✅ ${isClassified ? "Classified" : "Social"} schedule saved!`);
      else setError(d.error || "Failed to save");
    } catch { setError("Network error"); }
    finally { setSaving(false); setTimeout(() => setMsg(null), 4000); }
  }

  async function pushNow() {
    setPushing(true); setError(null);
    try {
      const res = await fetch("/api/admin/autopost/classified-push", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "en", max_sites: 1000, concurrency: 30, randomize: true }),
      });
      const d = await res.json();
      if (d.ok) {
        setMsg(`✅ Pushed to ${d.success}/${d.total} sites in ${(d.duration_ms/1000).toFixed(1)}s`);
        await load();
      } else setError(d.error || "Push failed");
    } catch (e: any) { setError(e.message); }
    finally { setPushing(false); }
  }

  async function connectAyrshare() {
    if (!ayrshareKey.trim()) return;
    setConnecting(true); setError(null);
    try {
      const res = await fetch("/api/admin/autopost/ayrshare", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_key", api_key: ayrshareKey }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setAyrshareStatus({ connected: true, ...d });
        setAyrshareKey("");
        setShowConnect(false);
        setMsg(`✅ Connected! ${d.platforms?.length || 0} platforms active`);
        await load();
      } else setError(d.error || "Failed");
    } catch (e: any) { setError(e.message); }
    finally { setConnecting(false); }
  }

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} style={{ width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: on ? "#22c55e" : "#cbd5e1", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff" }}>
      <div style={{ display: "flex" }}>
        <nav style={{ width: 220, background: "#fff", borderRight: "1px solid #e2e8f0", padding: "20px 12px", display: "flex", flexDirection: "column", gap: 2, position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
          <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 24, textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛡</div>
            <span style={{ fontSize: 18, fontWeight: 900, color: "#0a1628" }}>AXTO</span>
          </Link>
          {[
            { href: "/admin", icon: "📊", label: "Dashboard" },
            { href: "/admin/playbooks", icon: "📦", label: "Playbooks" },
            { href: "/admin/licenses", icon: "🔑", label: "Licenses" },
            { href: "/admin/clients", icon: "👥", label: "Clients" },
            { href: "/admin/gateways", icon: "💳", label: "Gateways" },
            { href: "/admin/revenue", icon: "💰", label: "Revenue" },
            { href: "/admin/content", icon: "📝", label: "Content" },
            { href: "/admin/autopost", icon: "📢", label: "AutoPost" },
          ].map(n => (
            <Link key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, textDecoration: "none", fontSize: 13, fontWeight: 600, color: n.href === "/admin/autopost" ? "#7c3aed" : "#475569", background: n.href === "/admin/autopost" ? "rgba(124,58,237,0.06)" : "transparent" }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>

        <main style={{ flex: 1, padding: "28px 32px", minWidth: 0 }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", margin: "0 0 4px" }}>📢 AutoPost — Autopilot Mode</h1>
            <p style={{ color: "#475569", fontSize: 13, margin: "0 0 24px" }}>
              Set the interval. Everything else is automatic — template selection, region scaling, language matching, and rotation.
            </p>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#ef4444", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                <span>⚠ {error}</span>
                <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
            )}
            {msg && <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>{msg}</div>}

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { icon: "🌍", label: "Classified Sites", val: "1,050+", color: "#0284c7", sub: "All regions, auto-rotate" },
                { icon: "📱", label: "Social Media", val: connectedPlatforms.length || "—", color: "#7c3aed", sub: ayrshareStatus?.connected ? "Connected" : "Not connected" },
                { icon: "✅", label: "Published", val: publishedCount, color: "#22c55e", sub: "Total successful" },
                { icon: "📋", label: "Templates", val: "200+", color: "#f59e0b", sub: "Auto-rotated, no repeats" },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {loading ? <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>Loading...</div> : (
              <>
                {/* CLASSIFIED AUTOPILOT */}
                <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#0284c7,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🌍</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "#0a1628" }}>Classified Sites — Autopilot</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>1,050+ sites • All regions • English templates • Auto-rotate</div>
                      </div>
                    </div>
                    <Toggle on={classifiedEnabled} onClick={() => setClassifiedEnabled(!classifiedEnabled)} />
                  </div>

                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Push every:</span>
                      <select value={classifiedInterval} onChange={e => setClassifiedInterval(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <button onClick={() => saveSchedule("classified")} disabled={saving} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "#0284c7", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save"}</button>
                    <button onClick={pushNow} disabled={pushing} style={{ padding: "7px 18px", borderRadius: 8, border: "1.5px solid #22c55e", background: "transparent", color: "#22c55e", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: pushing ? 0.6 : 1 }}>{pushing ? "Pushing..." : "🚀 Push Now"}</button>
                    {classifiedLastRun && <span style={{ fontSize: 11, color: "#94a3b8" }}>Last: {fmtDate(classifiedLastRun)}</span>}
                  </div>

                  <div style={{ marginTop: 14, padding: "12px 16px", background: "rgba(34,197,94,0.05)", borderRadius: 8, fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
                    <strong style={{ color: "#166534" }}>Autopilot handles:</strong> Template selection (200+ English templates, no repeats in 30 days) • All 7 regions (USA, Global, UK, AU, CA, IN, EU) • All 5 categories (General, Business, Tech, SEO, Pings) • 30 concurrent connections • Random order each push
                  </div>
                </div>

                {/* SOCIAL MEDIA AUTOPILOT */}
                <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📱</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "#0a1628" }}>Social Media — Autopilot</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{ayrshareStatus?.connected ? `✅ ${connectedPlatforms.length} platforms connected via Ayrshare` : "Connect Ayrshare to enable"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {ayrshareStatus?.connected ? (
                        <Toggle on={socialEnabled} onClick={() => setSocialEnabled(!socialEnabled)} />
                      ) : (
                        <button onClick={() => setShowConnect(true)} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🔗 Connect</button>
                      )}
                    </div>
                  </div>

                  {ayrshareStatus?.connected && (
                    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Post every:</span>
                        <select value={socialInterval} onChange={e => setSocialInterval(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <button onClick={() => saveSchedule("social")} disabled={saving} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save"}</button>
                      {socialLastRun && <span style={{ fontSize: 11, color: "#94a3b8" }}>Last: {fmtDate(socialLastRun)}</span>}
                    </div>
                  )}
                </div>

                {/* QUICK PUSH PER PRODUCT — All 7 Products */}
                <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", marginBottom: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#0a1628", marginBottom: 4 }}>⚡ Quick Push — Per Product</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                    Instantly push one marketing post per product to all active classified platforms. Same rules: no repeats within 30 days, picks unused templates automatically.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                    {([
                      { key: "guardian_ai",   icon: "🛡️", label: "Guardian AI",    color: "#0284c7" },
                      { key: "orchestra_ai",  icon: "⚡", label: "Orchestra AI",   color: "#7c3aed" },
                      { key: "vault",         icon: "🔒", label: "Vault AI",       color: "#0d9488" },
                      { key: "edge",          icon: "🌐", label: "Edge AI",        color: "#f59e0b" },
                      { key: "soc",           icon: "🎯", label: "SOC AI",         color: "#ef4444" },
                      { key: "compliance",    icon: "📋", label: "Compliance AI",  color: "#6366f1" },
                      { key: "sentinel",      icon: "🏭", label: "Sentinel OT",    color: "#ea580c" },
                      { key: "bundle",        icon: "🎁", label: "Bundles",        color: "#0a1628" },
                      { key: "announcement",  icon: "📣", label: "Announcements",  color: "#22c55e" },
                      { key: "playbook",      icon: "📦", label: "Playbooks",      color: "#0284c7" },
                      { key: "self_hosted",   icon: "🏠", label: "Self-Hosted",    color: "#475569" },
                      { key: "feature",       icon: "✨", label: "Features",       color: "#6366f1" },
                    ] as const).map(prod => (
                      <button key={prod.key}
                        onClick={async () => {
                          setPushing(true);
                          try {
                            const res = await fetch("/api/admin/autopost/quickpost", {
                              method: "POST",
                              credentials: "include",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ category: prod.key, language: "en" }),
                            });
                            const d = await res.json();
                            if (d.ok || d.success) {
                              setMsg(`✅ ${prod.label} post pushed to classified platforms`);
                            } else {
                              setError(d.error || `Push failed for ${prod.label}`);
                            }
                            await load();
                          } catch {
                            setError("Network error");
                          } finally {
                            setPushing(false);
                          }
                        }}
                        disabled={pushing}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${prod.color}22`, background: `${prod.color}08`, color: prod.color, fontSize: 12, fontWeight: 700, cursor: pushing ? "not-allowed" : "pointer", opacity: pushing ? 0.6 : 1, textAlign: "left" }}>
                        <span style={{ fontSize: 18 }}>{prod.icon}</span>
                        <span style={{ flex: 1 }}>{prod.label}</span>
                        <span style={{ fontSize: 10, opacity: 0.6 }}>Push →</span>
                      </button>
                    ))}
                  </div>
                  {msg && (
                    <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#166534", fontSize: 12, fontWeight: 600 }}>
                      {msg}
                    </div>
                  )}
                </div>

                                {/* HISTORY */}
                <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "22px 24px" }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#0a1628", marginBottom: 16 }}>📝 Recent Activity</div>
                  {posts.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No posts yet. Enable autopilot or click "Push Now" to start.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {posts.slice(0, 30).map((p: any) => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "#f8fafc" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.status === "published" ? "#22c55e" : p.status === "failed" ? "#ef4444" : "#94a3b8", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0a1628" }}>{p.platform === "classified_batch" ? "🌍 Classified Push" : p.platform === "social_all" ? "📱 Social Post" : p.platform}</div>
                            <div style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.error_msg || p.title || p.body_text?.slice(0, 80)}</div>
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{fmtDate(p.created_at)}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, flexShrink: 0, background: p.status === "published" ? "#dcfce7" : p.status === "failed" ? "#fee2e2" : "#f1f5f9", color: p.status === "published" ? "#166534" : p.status === "failed" ? "#dc2626" : "#64748b" }}>{p.status}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Ayrshare Connect Modal */}
      {showConnect && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowConnect(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", maxWidth: 460, width: "90%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#0a1628", marginBottom: 6 }}>🔗 Connect Social Media</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>One API key for Facebook, Instagram, Twitter/X, LinkedIn, TikTok, Telegram, YouTube, Pinterest</div>
            <div style={{ background: "#f0f9ff", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#475569", lineHeight: 1.8 }}>
              1. Go to <a href="https://ayrshare.com" target="_blank" rel="noreferrer" style={{ color: "#7c3aed", fontWeight: 700 }}>ayrshare.com</a> → Sign up free<br/>
              2. Dashboard → <strong>Social Accounts</strong> → connect your accounts<br/>
              3. Copy <strong>API Key</strong> → paste below
            </div>
            <input type="password" value={ayrshareKey} onChange={e => setAyrshareKey(e.target.value)} onKeyDown={e => e.key === "Enter" && connectAyrshare()} placeholder="Paste Ayrshare API Key..." style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowConnect(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "transparent", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={connectAyrshare} disabled={connecting || !ayrshareKey} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: connecting ? "not-allowed" : "pointer", opacity: connecting || !ayrshareKey ? 0.6 : 1 }}>{connecting ? "Connecting..." : "🔗 Connect"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
