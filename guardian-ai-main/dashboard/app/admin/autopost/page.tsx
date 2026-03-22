"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/client-auth";

// ── Platform definitions ──────────────────────────────────────────────────
// oauth: true  → "Connect" button (1-click OAuth)
// oauth: false → manual credential fields (Telegram bot token, classified webhooks)
const SOCIAL_PLATFORMS = [
  { id: "facebook",         label: "Facebook",           icon: "f",   color: "#1877f2", type: "social", oauth: true,  oauthLabel: "Connect Facebook Page",    fields: [{k:"access_token",l:"Page Access Token",p:"EAAx..."},{k:"page_id",l:"Page ID",p:"123456789"}] },
  { id: "instagram",        label: "Instagram",          icon: "📸",  color: "#e1306c", type: "social", oauth: true,  oauthLabel: "Connect Instagram Business",fields: [{k:"access_token",l:"Access Token",p:"EAAx..."},{k:"ig_user_id",l:"IG User ID",p:"17841..."}] },
  { id: "twitter",          label: "X / Twitter",        icon: "𝕏",   color: "#000000", type: "social", oauth: true,  oauthLabel: "Connect X (Twitter)",      fields: [{k:"bearer_token",l:"Bearer Token",p:"AAAA..."},{k:"oauth_token",l:"Access Token",p:""}] },
  { id: "linkedin",         label: "LinkedIn",           icon: "in",  color: "#0a66c2", type: "social", oauth: true,  oauthLabel: "Connect LinkedIn",          fields: [{k:"access_token",l:"Access Token",p:"AQV..."},{k:"organization_urn",l:"Organization URN",p:"urn:li:organization:12345"}] },
  { id: "pinterest",        label: "Pinterest",          icon: "🅿",  color: "#e60023", type: "social", oauth: true,  oauthLabel: "Connect Pinterest",         fields: [{k:"access_token",l:"Access Token",p:"pina_..."},{k:"board_id",l:"Board ID",p:"123456789"}] },
  { id: "youtube_community",label: "YouTube Community", icon: "▶️",  color: "#ff0000", type: "social", oauth: true,  oauthLabel: "Connect YouTube",           fields: [{k:"access_token",l:"OAuth Access Token",p:"ya29..."}] },
  { id: "tiktok",           label: "TikTok",             icon: "🎵",  color: "#ff0050", type: "social", oauth: true,  oauthLabel: "Connect TikTok",            fields: [{k:"access_token",l:"Access Token",p:""},{k:"open_id",l:"Open ID",p:""},{k:"webhook_url",l:"Automation Webhook (Make/Zapier)",p:"https://hook.make.com/..."}] },
  { id: "threads",          label: "Threads",            icon: "🧵",  color: "#000000", type: "social", oauth: true,  oauthLabel: "Connect Threads",           fields: [{k:"access_token",l:"Access Token (sama dgn Instagram)",p:"EAAx..."},{k:"ig_user_id",l:"IG User ID",p:"17841..."}] },
  { id: "telegram",         label: "Telegram",           icon: "✈️",  color: "#0088cc", type: "social", oauth: false, oauthLabel: "",                          fields: [{k:"bot_token",l:"Bot Token",p:"6123456789:AAF..."},{k:"channel_id",l:"Channel ID",p:"@mychannel or -1001234"}] },
];

const FREE_PLATFORMS = [
  { id: "olx",           label: "OLX",           icon: "🛍️", color: "#4caf50", note: "API + Quick Post" },
  { id: "craigslist",    label: "Craigslist",    icon: "📋", color: "#7c0000", note: "Quick Post Link" },
  { id: "locanto",       label: "Locanto",       icon: "📍", color: "#ff6600", note: "Quick Post Link" },
  { id: "gumtree",       label: "Gumtree",       icon: "🌿", color: "#00b140", note: "Quick Post Link" },
  { id: "adpost",        label: "Adpost",        icon: "📢", color: "#ff9900", note: "Quick Post Link" },
  { id: "classifiedads", label: "ClassifiedAds", icon: "🗒️", color: "#336699", note: "Quick Post Link" },
  { id: "vivastreet",    label: "Vivastreet",    icon: "🏪", color: "#ff3300", note: "Quick Post Link" },
  { id: "hoobly",        label: "Hoobly",        icon: "🐾", color: "#cc6600", note: "Quick Post Link" },
  { id: "trovit",        label: "Trovit",        icon: "🔍", color: "#ff6666", note: "Aggregator" },
  { id: "oodle",         label: "Oodle",         icon: "⭕", color: "#0066cc", note: "Quick Post Link" },
  { id: "freeads",       label: "FreeAds",       icon: "📰", color: "#009900", note: "Quick Post Link" },
];

const ALL_PLATFORMS = [...SOCIAL_PLATFORMS, ...FREE_PLATFORMS];

const INTERVAL_OPTIONS = [
  { value: "10min",   label: "Every 10 minutes" },
  { value: "30min",   label: "Every 30 minutes" },
  { value: "hourly",  label: "Every 1 hour" },
  { value: "2hours",  label: "Every 2 hours" },
  { value: "6hours",  label: "Every 6 hours" },
  { value: "12hours", label: "Every 12 hours" },
  { value: "daily",   label: "Once a day" },
  { value: "weekly",  label: "Once a week" },
];

const LANG_OPTIONS = [
  { value: "id", label: "🇮🇩 Indonesian" },
  { value: "en", label: "🇺🇸 English" },
  { value: "both", label: "🌐 Both languages" },
];

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  published: { color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  scheduled:  { color: "#38bdf8", bg: "rgba(56,189,248,0.1)" },
  draft:      { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  failed:     { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Input style ───────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1.5px solid #e2e8f0", background: "#f8fafc",
  color: "#0a1628", fontSize: 13, outline: "none", boxSizing: "border-box",
};

export default function AdminAutopostPage() {
  const router = useRouter();
  const [tab,     setTab]     = useState<"scheduler"|"posts"|"platforms"|"templates">("scheduler");
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [msg,     setMsg]     = useState<string | null>(null);
  const [busy,    setBusy]    = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);

  // Template preview state
  const [templates, setTemplates] = useState<any[]>([]);
  const [tmplLoading, setTmplLoading] = useState(false);
  const [tmplFilter, setTmplFilter] = useState({ category: "", platform: "", language: "" });
  const [tmplExpanded, setTmplExpanded] = useState<string | null>(null);

  // Platform config edit state
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [platformForm,    setPlatformForm]    = useState<Record<string, string>>({});
  const [platformSaving,  setPlatformSaving]  = useState(false);

  // OAuth state
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // App Credentials state
  const [appCreds, setAppCreds]           = useState<Record<string, any>>({});
  const [appCredForm, setAppCredForm]     = useState<{platform:string;app_id:string;app_secret:string}>({platform:"",app_id:"",app_secret:""});
  const [appCredSaving, setAppCredSaving] = useState(false);
  const [appCredEdit, setAppCredEdit]     = useState<string|null>(null);

  // Ayrshare state
  const [ayrshareKey, setAyrshareKey] = useState("");
  const [ayrshareStatus, setAyrshareStatus] = useState<any>(null);
  const [ayrshareLoading, setAyrshareLoading] = useState(false);
  const [ayrshareSaving, setAyrshareSaving] = useState(false);

  // Quick Post state (classified sites)
  const [quickPostLoading, setQuickPostLoading] = useState<string | null>(null);
  const [quickPostResults, setQuickPostResults] = useState<Record<string, any>>({});
  const [classifiedEnabled, setClassifiedEnabled] = useState<Record<string, boolean>>({});
  const [batchPosting, setBatchPosting] = useState(false);
  const [contactEmail, setContactEmail] = useState("hallo@axto.io");
  const [contactPhone, setContactPhone] = useState("");
  const [postLocation, setPostLocation] = useState("");

  // Scheduler state
  const [schedules, setSchedules] = useState<Record<string, { enabled: boolean; interval: string; language: string }>>({});
  const [schedSaving, setSchedSaving] = useState<string | null>(null);

  const loadAppCreds = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/autopost/app-credentials", { credentials: "include" });
      const d = await r.json();
      if (d.ok) {
        const map: Record<string, any> = {};
        (d.credentials || []).forEach((c: any) => { map[c.platform] = c; });
        setAppCreds(map);
      }
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/autopost", { credentials: "include" });
      if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
      if (!res.ok) { setError("Failed to load data"); return; }
      const d = await res.json();
      setData(d);

      // Build schedules map from DB
      const map: typeof schedules = {};
      for (const pl of ALL_PLATFORMS) {
        const dbSched = (d.schedules || []).find((s: any) => s.platform === pl.id);
        map[pl.id] = {
          enabled:  dbSched ? dbSched.is_active === 1 : false,
          interval: dbSched?.frequency || "daily",
          language: dbSched?.language  || "id",
        };
      }
      setSchedules(map);

      // Load Ayrshare connection status
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
      loadAppCreds();
    });
  }, []);

  // ── Handle OAuth callback result from URL params ─────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    const oauthAccount = params.get("account");
    const oauthError   = params.get("oauth_error");
    const oauthPlatform = params.get("platform");

    if (oauthSuccess) {
      const label = [...SOCIAL_PLATFORMS].find(p => p.id === oauthSuccess)?.label || oauthSuccess;
      setMsg(`✅ ${label} connected${oauthAccount ? ` as ${decodeURIComponent(oauthAccount)}` : ""}!`);
      setTab("platforms");
      load(); // refresh platform list
      // Clean URL
      window.history.replaceState({}, "", "/admin/autopost?tab=platforms");
    } else if (oauthError) {
      const errMsg = decodeURIComponent(oauthError);
      if (errMsg === "app_credentials_missing") {
        const label = [...SOCIAL_PLATFORMS].find(p => p.id === (oauthPlatform || ""))?.label || oauthPlatform;
        setError(`❌ ${label} OAuth setup needed: configure the app Client ID & Secret in Cloudflare Pages env vars. See setup guide below.`);
      } else {
        setError(`❌ OAuth failed: ${errMsg}`);
      }
      setTab("platforms");
      window.history.replaceState({}, "", "/admin/autopost?tab=platforms");
    }
  }, []);

  // ── App Credentials: save per-platform App ID/Secret ───────────────────
  async function saveAppCred() {
    if (!appCredForm.platform || !appCredForm.app_id) return;
    setAppCredSaving(true);
    try {
      const r = await fetch("/api/admin/autopost/app-credentials", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appCredForm),
      });
      const d = await r.json();
      if (d.ok) { setMsg("✅ App credentials saved!"); setAppCredEdit(null); await loadAppCreds(); }
      else setError(d.error || "Failed to save");
    } catch { setError("Network error"); }
    finally { setAppCredSaving(false); setTimeout(() => setMsg(null), 3000); }
  }

  async function deleteAppCred(platform: string) {
    try {
      await fetch(`/api/admin/autopost/app-credentials?platform=${platform}`, {
        method: "DELETE", credentials: "include",
      });
      await loadAppCreds();
    } catch {}
  }

  // ── OAuth Connect: direct redirect to platform login ─────────────────────
  // Klik Connect → langsung buka halaman login FB/Twitter/dll, tidak perlu input token manual
  async function connectOAuth(platformId: string) {
    setOauthLoading(platformId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/autopost/oauth?platform=${platformId}`, {
        credentials: "include",
      });
      const d = await res.json();

      if (!res.ok || !d.auth_url) {
        if (d.needs_setup) {
          setAppCredEdit(platformId);
          setAppCredForm({ platform: platformId, app_id: "", app_secret: "" });
          setError(`⚙️ Isi App ID & App Secret untuk ${platformId} dulu, lalu klik Connect lagi.`);
        } else {
          setError(d.error || "Gagal memulai OAuth");
        }
        setOauthLoading(null);
        return;
      }

      // Buka popup kecil ke halaman login social media (seperti Ayrshare)
      const w = 600, h = 700;
      const left = Math.round(window.screenX + (window.outerWidth  - w) / 2);
      const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
      const popup = window.open(
        d.auth_url,
        `oauth_${platformId}`,
        `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!popup || popup.closed) {
        // Kalau popup diblokir browser → fallback redirect biasa
        window.location.href = d.auth_url;
        return;
      }

      // Poll sampai popup ditutup (setelah user authorize → callback redirect → popup tutup)
      const poll = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(poll);
          setOauthLoading(null);
          load(); // refresh data → tampilkan status Connected
        }
      }, 600);

    } catch (e: any) {
      setError(e.message || "OAuth error");
      setOauthLoading(null);
    }
  }

  // ── Disconnect OAuth platform ────────────────────────────────────────────
  async function disconnectPlatform(platformId: string) {
    if (!confirm(`Disconnect ${platformId}? This will remove stored credentials.`)) return;
    try {
      const res = await fetch("/api/admin/autopost", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_platform", platform: platformId, credentials: {}, is_active: false }),
      });
      if (res.ok) { setMsg(`${platformId} disconnected`); await load(); }
    } catch { setError("Failed to disconnect"); }
  }

  // ── Save Ayrshare API key ─────────────────────────────────────────────────
  async function saveAyrshareKey() {
    if (!ayrshareKey.trim()) { setError("API key tidak boleh kosong"); return; }
    setAyrshareSaving(true); setError(null);
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
        setMsg(`✅ Ayrshare terhubung! ${d.platforms?.length || 0} platform aktif: ${(d.platforms || []).join(", ")}`);
        await load();
      } else {
        setError(d.error || "Gagal menyimpan API key");
      }
    } catch (e: any) { setError(e.message); }
    finally { setAyrshareSaving(false); }
  }

  async function disconnectAyrshare() {
    if (!confirm("Disconnect Ayrshare? Semua platform via Ayrshare akan nonaktif.")) return;
    const res = await fetch("/api/admin/autopost/ayrshare", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    if (res.ok) { setAyrshareStatus(null); setMsg("Ayrshare disconnected"); await load(); }
  }

  async function refreshAyrshare() {
    setAyrshareLoading(true);
    try {
      const res = await fetch("/api/admin/autopost/ayrshare", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const d = await res.json();
      if (d.ok) { setAyrshareStatus((prev: any) => ({ ...prev, ...d })); setMsg("Refreshed!"); }
    } catch {}
    finally { setAyrshareLoading(false); }
  }

  // ── Enable/Disable classified site (1-click activate) ────────────────────
  async function toggleClassified(platformId: string, enable: boolean) {
    try {
      await fetch("/api/admin/autopost", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_platform",
          platform: platformId,
          credentials: { email: contactEmail, phone: contactPhone, location: postLocation },
          is_active: enable ? 1 : 0,
        }),
      });
      setClassifiedEnabled(prev => ({ ...prev, [platformId]: enable }));
      await load();
      setMsg(enable ? `${platformId} aktif — siap Quick Post!` : `${platformId} dinonaktifkan`);
    } catch { setError("Toggle failed"); }
  }

  // ── Quick Post to one classified site ────────────────────────────────────
  async function quickPostOne(platformId: string) {
    setQuickPostLoading(platformId);
    setError(null);
    try {
      const res = await fetch("/api/admin/autopost/quickpost", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "post_now",
          platform: platformId,
          language: "id",
          contact_email: contactEmail,
          contact_phone: contactPhone,
          location: postLocation,
        }),
      });
      const d = await res.json();
      setQuickPostResults(prev => ({ ...prev, [platformId]: d }));

      if (d.quicklink_url) {
        // Open the pre-filled form in a new tab
        window.open(d.quicklink_url, "_blank", "noopener");
        setMsg(`✅ ${platformId}: Form terbuka di tab baru — klik Submit untuk publish!`);
      } else if (d.platform_url) {
        setMsg(`✅ ${platformId}: Berhasil dipost via API → ${d.platform_url}`);
      } else if (d.error) {
        setError(`${platformId}: ${d.error}`);
      }
    } catch (e: any) { setError(e.message); }
    finally { setQuickPostLoading(null); }
  }

  // ── Batch Quick Post to all active classifieds ────────────────────────────
  async function batchQuickPost() {
    setBatchPosting(true); setError(null);
    try {
      const res = await fetch("/api/admin/autopost/quickpost", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch",
          language: "id",
          contact_email: contactEmail,
          contact_phone: contactPhone,
          location: postLocation,
        }),
      });
      const d = await res.json();

      if (d.ok) {
        const newResults: Record<string, any> = {};
        for (const r of d.results || []) newResults[r.platform] = r;
        setQuickPostResults(prev => ({ ...prev, ...newResults }));

        const apiPosted = d.results?.filter((r: any) => r.method === "api" && r.success).length || 0;
        const quickLinks = d.results?.filter((r: any) => r.method === "quicklink").length || 0;

        setMsg(`✅ Batch selesai! ${apiPosted} di-post via API. ${quickLinks} form terbuka di tab baru.`);

        // Open all quicklinks
        for (const r of d.results || []) {
          if (r.quicklink_url) window.open(r.quicklink_url, "_blank", "noopener");
        }
      } else {
        setError(d.error || "Batch failed");
      }
    } catch (e: any) { setError(e.message); }
    finally { setBatchPosting(false); }
  }

  // ── Save schedule for one platform ──────────────────────────────────────
  async function saveSchedule(platformId: string) {
    const sched = schedules[platformId];
    setSchedSaving(platformId); setError(null);
    try {
      const res = await fetch("/api/admin/autopost", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule", platform: platformId, frequency: sched.interval, language: sched.language, is_active: sched.enabled }),
      });
      const d = await res.json();
      if (d.success) setMsg(`Schedule saved for ${ALL_PLATFORMS.find(p=>p.id===platformId)?.label}`);
      else setError(d.error || "Save failed");
    } catch { setError("Network error"); }
    finally { setSchedSaving(null); setTimeout(() => setMsg(null), 3000); }
  }

  // ── Save platform credentials ────────────────────────────────────────────
  async function savePlatformCreds(platformId: string) {
    const creds: Record<string, string> = {};
    Object.entries(platformForm).forEach(([k, v]) => { if (v.trim()) creds[k] = v.trim(); });
    if (Object.keys(creds).length === 0) { setError("Fill in at least one field"); return; }
    setPlatformSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/autopost", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_platform", platform: platformId, credentials: creds, is_active: true }),
      });
      const d = await res.json();
      if (d.success) { setMsg("Platform configured ✓"); setEditingPlatform(null); await load(); }
      else setError(d.error || "Save failed");
    } catch { setError("Network error"); }
    finally { setPlatformSaving(false); setTimeout(() => setMsg(null), 3000); }
  }

  // ── Publish post now ──────────────────────────────────────────────────────
  async function publishPost(postId: string) {
    setPublishing(postId); setError(null);
    try {
      const res = await fetch("/api/admin/autopost/publish", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });
      if (res.ok) { setMsg("Published!"); await load(); }
      else { const d = await res.json(); setError(d.error || "Publish failed"); }
    } catch { setError("Network error"); }
    finally { setPublishing(null); setTimeout(() => setMsg(null), 3000); }
  }

  // ── Push now (manual run for a platform) ─────────────────────────────────
  async function pushNow(platformId: string, language: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/autopost/generate", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platformId, language, auto_publish: true }),
      });
      const d = await res.json();
      if (d.ok || d.success) { setMsg(`Post pushed to ${ALL_PLATFORMS.find(p=>p.id===platformId)?.label} ✓`); await load(); }
      else setError(d.error || "Push failed — make sure platform is configured");
    } catch { setError("Network error"); }
    finally { setBusy(false); setTimeout(() => setMsg(null), 4000); }
  }

  const posts     = data?.posts     || [];
  const platforms = data?.platforms || [];
  const activeSchedules = Object.entries(schedules).filter(([,s]) => s.enabled).length;
  const configuredPlatforms = platforms.filter((p: any) => p.is_active || p.hasCredentials).length;

  // Load templates for preview
  async function loadTemplates() {
    setTmplLoading(true);
    try {
      const params = new URLSearchParams();
      if (tmplFilter.category) params.set("category", tmplFilter.category);
      if (tmplFilter.platform) params.set("platform", tmplFilter.platform);
      if (tmplFilter.language) params.set("language", tmplFilter.language);
      const res = await fetch(`/api/admin/autopost/generate?${params}`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setTemplates(d.templates || []);
      }
    } catch {}
    finally { setTmplLoading(false); }
  }

  useEffect(() => {
    if (tab === "templates" && templates.length === 0) loadTemplates();
  }, [tab]);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff" }}>
      {/* Sidebar + main layout */}
      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <nav style={{ width: 220, background: "#fff", borderRight: "1px solid #e2e8f0", padding: "20px 12px", display: "flex", flexDirection: "column", gap: 2, position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
          <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 24, textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛡</div>
            <span style={{ fontSize: 18, fontWeight: 900, color: "#0a1628" }}>AXTO</span>
          </Link>
          {[
            { href: "/admin",            icon: "📊", label: "Dashboard"  },
            { href: "/admin/playbooks",  icon: "📦", label: "Playbooks"  },
            { href: "/admin/licenses",   icon: "🔑", label: "Licenses"   },
            { href: "/admin/clients",    icon: "👥", label: "Clients"    },
            { href: "/admin/gateways",   icon: "💳", label: "Gateways"   },
            { href: "/admin/revenue",    icon: "💰", label: "Revenue"    },
            { href: "/admin/content",    icon: "📝", label: "Content"    },
            { href: "/admin/autopost",   icon: "📢", label: "AutoPost"   },
          ].map(n => (
            <Link key={n.href} href={n.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, textDecoration: "none", fontSize: 13, fontWeight: 600, color: n.href === "/admin/autopost" ? "#7c3aed" : "#475569", background: n.href === "/admin/autopost" ? "rgba(124,58,237,0.06)" : "transparent" }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, padding: "28px 32px", minWidth: 0 }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", margin: "0 0 4px", fontFamily: "Sora, sans-serif" }}>📢 AutoPost Scheduler</h1>
            <p style={{ color: "#475569", fontSize: 13, margin: "0 0 24px" }}>Auto-push 100+ iklan ke semua social media (Facebook, Instagram, Threads, Twitter, LinkedIn, TikTok, YouTube, Pinterest, Telegram) & free classified worldwide. Set interval, klik aktifkan, selesai.</p>

            {/* Stats bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { icon: "⚡", label: "Active Schedules", val: activeSchedules,    color: "#7c3aed" },
                { icon: "🌐", label: "Platforms Configured", val: configuredPlatforms, color: "#0284c7" },
                { icon: "✅", label: "Posts Published", val: posts.filter((p:any)=>p.status==="published").length, color: "#22c55e" },
                { icon: "📝", label: "Total Posts", val: posts.length, color: "#64748b" },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: s.color, fontFamily: "Sora, sans-serif" }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Alerts */}
            {error && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#ef4444", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                <span>⚠ {error}</span>
                <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
            )}
            {msg && (
              <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>
                ✓ {msg}
              </div>
            )}

            {/* Tab buttons */}
            <div style={{ display: "flex", gap: 4, background: "#e2e8f0", borderRadius: 11, padding: 3, marginBottom: 24, maxWidth: 620 }}>
              {([
                { id: "scheduler", label: `⚡ Scheduler (${activeSchedules})` },
                { id: "templates", label: `📋 Templates (${templates.length || "200+"})` },
                { id: "platforms", label: `🌐 Platforms (${configuredPlatforms})` },
                { id: "posts",     label: `📝 Posts (${posts.length})` },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: tab === t.id ? "linear-gradient(135deg,#7c3aed,#0284c7)" : "transparent", color: tab === t.id ? "#fff" : "#64748b", whiteSpace: "nowrap" }}>
                  {t.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>Loading...</div>
            ) : (

              // ─────────────────────────────────────────────────────────
              // TAB: SCHEDULER
              // ─────────────────────────────────────────────────────────
              tab === "scheduler" ? (
                <div>
                  <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
                    <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
                      💡 <strong>Cara pakai:</strong> Pilih interval posting → aktifkan toggle → klik <strong>Save</strong>. 
                      AutoPost akan otomatis pilih template iklan random dari 100+ template & push ke platform setiap interval yang kamu set. 
                      Cron job jalan otomatis via Cloudflare Workers. Klik <strong>Push Now</strong> untuk test langsung.
                    </p>
                  </div>

                  {/* Social Media Platforms */}
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0a1628", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>📱 Social Media</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {SOCIAL_PLATFORMS.map(pl => {
                      const cfg  = platforms.find((p: any) => p.platform === pl.id);
                      const isConfigured = cfg?.hasCredentials === true || cfg?.is_active === 1;
                      const sched = schedules[pl.id] || { enabled: false, interval: "daily", language: "id" };
                      const isSaving = schedSaving === pl.id;

                      return (
                        <div key={pl.id} style={{ background: "#fff", border: `1.5px solid ${sched.enabled ? "rgba(124,58,237,0.4)" : "#e2e8f0"}`, borderRadius: 12, padding: "14px 18px", transition: "border-color 0.2s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            {/* Platform badge */}
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: pl.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                              {pl.icon}
                            </div>
                            <div style={{ minWidth: 110 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "#0a1628" }}>{pl.label}</div>
                              <div style={{ fontSize: 11, color: isConfigured ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>
                                {isConfigured ? "✓ Configured" : "⚠ Not configured"}
                              </div>
                            </div>

                            {/* Toggle */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, color: "#64748b" }}>Auto-post:</span>
                              <button
                                onClick={() => setSchedules(prev => ({ ...prev, [pl.id]: { ...prev[pl.id], enabled: !prev[pl.id].enabled } }))}
                                style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: sched.enabled ? "#7c3aed" : "#e2e8f0", position: "relative", transition: "background 0.2s" }}>
                                <div style={{ position: "absolute", top: 2, left: sched.enabled ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                              </button>
                            </div>

                            {/* Interval */}
                            <select value={sched.interval}
                              onChange={e => setSchedules(prev => ({ ...prev, [pl.id]: { ...prev[pl.id], interval: e.target.value } }))}
                              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, color: "#0a1628", cursor: "pointer" }}>
                              {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>

                            {/* Language */}
                            <select value={sched.language}
                              onChange={e => setSchedules(prev => ({ ...prev, [pl.id]: { ...prev[pl.id], language: e.target.value } }))}
                              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, color: "#0a1628", cursor: "pointer" }}>
                              {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>

                            {/* Action buttons */}
                            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
                              <button onClick={() => saveSchedule(pl.id)} disabled={isSaving}
                                style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: isSaving ? 0.6 : 1 }}>
                                {isSaving ? "Saving..." : "Save"}
                              </button>
                              <button onClick={() => pushNow(pl.id, sched.language)} disabled={busy || !isConfigured}
                                title={!isConfigured ? "Configure platform first" : "Push one post immediately"}
                                style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid #0284c7", background: "transparent", color: isConfigured ? "#0284c7" : "#94a3b8", fontSize: 12, fontWeight: 700, cursor: isConfigured ? "pointer" : "not-allowed", opacity: busy ? 0.6 : 1 }}>
                                {busy ? "..." : "Push Now"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Free Classified Platforms */}
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0a1628", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    🌍 Free Classified Sites (Worldwide)
                  </h3>
                  <p style={{ color: "#64748b", fontSize: 12, marginBottom: 12 }}>
                    Iklan gratis ke classified sites seluruh dunia via webhook automation (Make.com, Zapier, n8n). Setup webhook di platform tab lalu aktifkan.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                    {FREE_PLATFORMS.map(pl => {
                      const cfg   = platforms.find((p: any) => p.platform === pl.id);
                      const isConfigured = cfg?.hasCredentials === true || cfg?.is_active === 1;
                      const sched = schedules[pl.id] || { enabled: false, interval: "daily", language: "id" };
                      const isSaving = schedSaving === pl.id;

                      return (
                        <div key={pl.id} style={{ background: "#fff", border: `1.5px solid ${sched.enabled ? "rgba(124,58,237,0.3)" : "#e2e8f0"}`, borderRadius: 12, padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 18 }}>{pl.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{pl.label}</div>
                              <div style={{ fontSize: 10, color: isConfigured ? "#22c55e" : "#94a3b8" }}>{isConfigured ? "✓ Webhook set" : "Webhook needed"}</div>
                            </div>
                            <button
                              onClick={() => setSchedules(prev => ({ ...prev, [pl.id]: { ...prev[pl.id], enabled: !prev[pl.id].enabled } }))}
                              style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: sched.enabled ? "#7c3aed" : "#e2e8f0", position: "relative", flexShrink: 0 }}>
                              <div style={{ position: "absolute", top: 2, left: sched.enabled ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
                            </button>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <select value={sched.interval}
                              onChange={e => setSchedules(prev => ({ ...prev, [pl.id]: { ...prev[pl.id], interval: e.target.value } }))}
                              style={{ flex: 1, padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 11, color: "#0a1628" }}>
                              {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <button onClick={() => saveSchedule(pl.id)} disabled={isSaving}
                              style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              {isSaving ? "..." : "Save"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              // ─────────────────────────────────────────────────────────
              // TAB: TEMPLATES PREVIEW
              // ─────────────────────────────────────────────────────────
              ) : tab === "templates" ? (
                <div>
                  <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
                    <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
                      📋 Semua template iklan yang akan otomatis di-post ke social media & classified. Klik template untuk baca isi lengkap.
                    </p>
                  </div>

                  {/* Filters */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                    <select value={tmplFilter.category} onChange={e => { setTmplFilter(prev => ({ ...prev, category: e.target.value })); }} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, background: "#fff" }}>
                      <option value="">All Categories</option>
                      <option value="guardian_ai">🛡️ Guardian AI</option>
                      <option value="orchestra_ai">⚡ Orchestra AI</option>
                      <option value="announcement">📦 Playbooks</option>
                      <option value="pricing">💰 Pricing</option>
                      <option value="comparison">🆚 Comparison</option>
                      <option value="tutorial">📖 Tutorial</option>
                      <option value="testimonial">💬 Testimonial</option>
                      <option value="self_hosted">🏠 Self-Hosted</option>
                      <option value="byok">🔑 BYOK</option>
                      <option value="engagement">🤝 Engagement</option>
                    </select>
                    <select value={tmplFilter.platform} onChange={e => { setTmplFilter(prev => ({ ...prev, platform: e.target.value })); }} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, background: "#fff" }}>
                      <option value="">All Platforms</option>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="twitter">Twitter/X</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="telegram">Telegram</option>
                      <option value="pinterest">Pinterest</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube_community">YouTube</option>
                      <option value="craigslist">Craigslist</option>
                      <option value="olx">OLX</option>
                    </select>
                    <select value={tmplFilter.language} onChange={e => { setTmplFilter(prev => ({ ...prev, language: e.target.value })); }} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, background: "#fff" }}>
                      <option value="">All Languages</option>
                      <option value="en">🇺🇸 English</option>
                      <option value="id">🇮🇩 Indonesian</option>
                    </select>
                    <button onClick={loadTemplates} disabled={tmplLoading} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {tmplLoading ? "Loading..." : "🔍 Filter"}
                    </button>
                  </div>

                  {/* Template count */}
                  <div style={{ fontSize: 13, color: "#475569", marginBottom: 12, fontWeight: 600 }}>
                    Showing {templates.length} templates
                  </div>

                  {/* Template list */}
                  {tmplLoading ? (
                    <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>Loading templates...</div>
                  ) : templates.length === 0 ? (
                    <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                      <p>No templates match this filter. Try different category/platform.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {templates.map((t: any) => {
                        const isExpanded = tmplExpanded === t.id;
                        const catColors: Record<string, string> = {
                          guardian_ai: "#0284c7", orchestra_ai: "#7c3aed", announcement: "#22c55e",
                          pricing: "#f59e0b", comparison: "#ef4444", tutorial: "#0d9488",
                          testimonial: "#6366f1", self_hosted: "#475569", byok: "#0ea5e9", engagement: "#ec4899",
                        };
                        const catIcons: Record<string, string> = {
                          guardian_ai: "🛡️", orchestra_ai: "⚡", announcement: "📦",
                          pricing: "💰", comparison: "🆚", tutorial: "📖",
                          testimonial: "💬", self_hosted: "🏠", byok: "🔑", engagement: "🤝",
                        };
                        return (
                          <div key={t.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                            <div onClick={() => setTmplExpanded(isExpanded ? null : t.id)}
                              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer", gap: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 16 }}>{catIcons[t.category] || "📄"}</span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                                  <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: `${catColors[t.category] || "#64748b"}15`, color: catColors[t.category] || "#64748b", fontWeight: 700 }}>{t.category}</span>
                                    {t.platforms?.slice(0, 3).map((p: string) => (
                                      <span key={p} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#f1f5f9", color: "#64748b" }}>{p}</span>
                                    ))}
                                    {t.platforms?.length > 3 && <span style={{ fontSize: 10, color: "#94a3b8" }}>+{t.platforms.length - 3}</span>}
                                  </div>
                                </div>
                              </div>
                              <span style={{ fontSize: 16, color: "#94a3b8", flexShrink: 0 }}>{isExpanded ? "▲" : "▼"}</span>
                            </div>
                            {isExpanded && (
                              <div style={{ borderTop: "1px solid #f1f5f9", padding: "16px" }}>
                                <pre style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontFamily: "-apple-system, sans-serif", background: "#f8fafc", padding: 16, borderRadius: 10 }}>
                                  {t.preview?.replace(/\\n/g, "\n").replace(/\{\{cta\}\}/g, "🔗 axto.io")}
                                </pre>
                                {t.hashtags?.length > 0 && (
                                  <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
                                    {t.hashtags.map((h: string) => (
                                      <span key={h} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(124,58,237,0.06)", color: "#7c3aed" }}>{h}</span>
                                    ))}
                                  </div>
                                )}
                                <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "#475569" }}>Platforms:</span>
                                  {t.platforms?.map((p: string) => (
                                    <span key={p} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#e2e8f0", color: "#475569" }}>{p}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              // ─────────────────────────────────────────────────────────
              // TAB: PLATFORMS — Ayrshare 1-API-Key setup
              // ─────────────────────────────────────────────────────────
              ) : tab === "platforms" ? (
                <div>

                  {/* ════ AYRSHARE — 1 key connects ALL platforms ════ */}
                  <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(14,116,144,0.06))", border: "2px solid rgba(99,102,241,0.25)", borderRadius: 14, padding: "20px 22px", marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🔑</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "#0a1628" }}>Ayrshare — Opsional (API Aggregator)</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>Sebagai supplement. Utama: gunakan Connect langsung di bawah. Free plan hanya 30 post/bulan.</div>
                      </div>
                      {ayrshareStatus?.connected && (
                        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                          <button onClick={refreshAyrshare} disabled={ayrshareLoading}
                            style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "transparent", fontSize: 11, cursor: "pointer", color: "#64748b" }}>
                            {ayrshareLoading ? "..." : "🔄 Refresh"}
                          </button>
                          <button onClick={disconnectAyrshare}
                            style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #fca5a5", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>
                            Disconnect
                          </button>
                        </div>
                      )}
                    </div>

                    {ayrshareStatus?.connected ? (
                      /* Connected state */
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span style={{ background: "#dcfce7", color: "#16a34a", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                            ✓ Terhubung — {ayrshareStatus.email}
                          </span>
                          {ayrshareStatus.plan && (
                            <span style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: 20, padding: "3px 10px", fontSize: 11 }}>
                              Plan: {ayrshareStatus.plan}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>Platform aktif via Ayrshare:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {(ayrshareStatus.platforms || []).map((pl: string) => {
                            const profile = ayrshareStatus.profiles?.[pl];
                            const platDef = SOCIAL_PLATFORMS.find(p => p.id === pl);
                            return (
                              <div key={pl} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid rgba(34,197,94,0.4)", borderRadius: 30, padding: "5px 12px" }}>
                                <span style={{ fontSize: 14 }}>{platDef?.icon || "📱"}</span>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0a1628" }}>{platDef?.label || pl}</div>
                                  {profile?.name && <div style={{ fontSize: 10, color: "#22c55e" }}>{profile.name}</div>}
                                </div>
                              </div>
                            );
                          })}
                          {(ayrshareStatus.platforms || []).length === 0 && (
                            <div style={{ fontSize: 12, color: "#f59e0b" }}>
                              ⚠️ Belum ada platform yang terkoneksi di Ayrshare.
                              <a href="https://app.ayrshare.com" target="_blank" rel="noreferrer" style={{ color: "#6366f1", marginLeft: 6, fontWeight: 600 }}>
                                Buka Ayrshare →
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Not connected — show setup form */
                      <div>
                        <div style={{ background: "rgba(99,102,241,0.05)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#4338ca", marginBottom: 8 }}>3 Langkah Setup (5 menit, gratis):</div>
                          <div style={{ fontSize: 12, color: "#475569", lineHeight: 2 }}>
                            <div>1️⃣ Buka <a href="https://ayrshare.com" target="_blank" rel="noreferrer" style={{ color: "#6366f1", fontWeight: 700 }}>ayrshare.com</a> → Daftar gratis</div>
                            <div>2️⃣ Di dashboard Ayrshare → <strong>Social Accounts</strong> → klik Login ke setiap sosmed (Facebook, Instagram, dst.) — <em>tidak perlu bikin App</em></div>
                            <div>3️⃣ Copy <strong>API Key</strong> dari dashboard → paste di bawah → klik Hubungkan</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="password"
                            value={ayrshareKey}
                            onChange={e => setAyrshareKey(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && saveAyrshareKey()}
                            placeholder="Paste Ayrshare API Key di sini..."
                            style={{ ...inp, flex: 1, fontSize: 13 }}
                          />
                          <button onClick={saveAyrshareKey} disabled={ayrshareSaving || !ayrshareKey}
                            style={{ padding: "10px 22px", borderRadius: 9, border: "none",
                              background: "linear-gradient(135deg,#6366f1,#0e7490)",
                              color: "#fff", fontWeight: 800, fontSize: 13,
                              cursor: (ayrshareSaving || !ayrshareKey) ? "not-allowed" : "pointer",
                              opacity: (ayrshareSaving || !ayrshareKey) ? 0.6 : 1, whiteSpace: "nowrap" }}>
                            {ayrshareSaving ? "Menghubungkan..." : "🔗 Hubungkan"}
                          </button>
                        </div>
                        <p style={{ fontSize: 11, color: "#94a3b8", margin: "8px 0 0" }}>
                          Ayrshare bersifat opsional — sebagai tambahan di luar direct OAuth.
                          Free plan: 30 post/bulan (sangat terbatas). Paid plan ($29/mo): unlimited.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ════ APP CREDENTIALS SETUP ════ */}
                  <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#0a1628" }}>🔑 Platform App Credentials</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Input App ID &amp; Secret sekali — OAuth 1-click Connect langsung aktif</div>
                      </div>
                    </div>

                    {/* Platform credential rows */}
                    {[
                      { id: "facebook",  label: "Facebook / Instagram / Threads", hint: "Facebook Developer → My Apps → App ID & Secret", link: "https://developers.facebook.com/apps" },
                      { id: "twitter",   label: "X / Twitter",                    hint: "developer.twitter.com → Project → Client ID",      link: "https://developer.twitter.com/en/portal/dashboard" },
                      { id: "linkedin",  label: "LinkedIn",                       hint: "linkedin.com/developers/apps → Client ID & Secret", link: "https://www.linkedin.com/developers/apps" },
                      { id: "pinterest", label: "Pinterest",                       hint: "developers.pinterest.com → Apps → App ID",          link: "https://developers.pinterest.com/apps/" },
                      { id: "youtube_community", label: "YouTube / Google",        hint: "console.cloud.google.com → OAuth 2.0 Client ID",    link: "https://console.cloud.google.com/apis/credentials" },
                      { id: "tiktok",   label: "TikTok",                          hint: "developers.tiktok.com → App → Client Key",          link: "https://developers.tiktok.com/apps/" },
                    ].map(pl => {
                      const saved = appCreds[pl.id];
                      const isEditing = appCredEdit === pl.id;
                      return (
                        <div key={pl.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ fontWeight: 600, fontSize: 12, color: "#0a1628" }}>{pl.label}</div>
                            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
                              <a href={pl.link} target="_blank" rel="noopener noreferrer" style={{ color: "#0284c7", textDecoration: "none" }}>{pl.hint}</a>
                            </div>
                          </div>
                          {saved?.app_id ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>✓ Configured</span>
                              <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{saved.app_id.slice(0,12)}...</span>
                              <button onClick={() => { setAppCredEdit(pl.id); setAppCredForm({ platform: pl.id, app_id: "", app_secret: "" }); }}
                                style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", fontSize: 10, cursor: "pointer", color: "#64748b" }}>Edit</button>
                              <button onClick={() => deleteAppCred(pl.id)}
                                style={{ padding: "3px 8px", borderRadius: 6, border: "none", background: "rgba(220,38,38,0.08)", fontSize: 10, cursor: "pointer", color: "#dc2626" }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => { setAppCredEdit(pl.id); setAppCredForm({ platform: pl.id, app_id: "", app_secret: "" }); }}
                              style={{ padding: "5px 14px", borderRadius: 7, border: "1.5px solid #0284c7", background: "transparent", fontSize: 11, cursor: "pointer", color: "#0284c7", fontWeight: 700 }}>
                              + Add Credentials
                            </button>
                          )}
                          {isEditing && (
                            <div style={{ width: "100%", marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <input placeholder="App ID / Client ID" value={appCredForm.app_id}
                                onChange={e => setAppCredForm(f => ({ ...f, app_id: e.target.value }))}
                                style={{ flex: 1, minWidth: 160, padding: "7px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 12, outline: "none" }} />
                              <input placeholder="App Secret / Client Secret" type="password" value={appCredForm.app_secret}
                                onChange={e => setAppCredForm(f => ({ ...f, app_secret: e.target.value }))}
                                style={{ flex: 1, minWidth: 160, padding: "7px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 12, outline: "none" }} />
                              <button onClick={saveAppCred} disabled={appCredSaving || !appCredForm.app_id}
                                style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#0e7490,#22d3ee)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: appCredSaving ? 0.7 : 1 }}>
                                {appCredSaving ? "Saving..." : "Save"}
                              </button>
                              <button onClick={() => setAppCredEdit(null)}
                                style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "transparent", fontSize: 12, cursor: "pointer", color: "#64748b" }}>Cancel</button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div style={{ marginTop: 12, padding: "10px 14px", background: "#f0f9ff", borderRadius: 8, fontSize: 11, color: "#0284c7" }}>
                      <strong>Redirect URI</strong> — paste ini di setiap OAuth App setting:<br/>
                      <code style={{ fontFamily: "monospace", fontSize: 11 }}>
                        {typeof window !== "undefined" ? window.location.origin : "https://axto.io"}/api/admin/autopost/oauth/callback
                      </code>
                    </div>
                  </div>

                  {/* ════ OAUTH 1-CLICK CONNECT ════ */}
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: "#0a1628", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>📱 Social Media — OAuth 1-Click Connect</h3>
                  {Object.values(appCreds).filter((c:any)=>c?.app_id).length === 0 && (
                    <div style={{background:"rgba(234,179,8,.1)",border:"1px solid rgba(234,179,8,.3)",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#92400e"}}>
                      ⚠️ <strong>Sebelum klik Connect:</strong> Klik <strong>Manage</strong> di tiap platform → isi <strong>App ID</strong> &amp; <strong>App Secret</strong> dari developer portal (Facebook Developers, Twitter Developer Portal, dll).
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {SOCIAL_PLATFORMS.map(pl => {
                      const cfg = platforms.find((p: any) => p.platform === pl.id);
                      const isConnected = cfg?.oauth_connected === 1 || cfg?.hasCredentials === true;
                      const accountName = cfg?.oauth_account_name || "";
                      const isEditing = editingPlatform === pl.id;
                      const isLoadingOAuth = oauthLoading === pl.id;

                      return (
                        <div key={pl.id} style={{ background: "#fff", border: `1.5px solid ${isConnected ? "rgba(34,197,94,0.4)" : "#e2e8f0"}`, borderRadius: 12, padding: "14px 18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: pl.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 900 }}>{pl.icon}</div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "#0a1628" }}>{pl.label}</div>
                                {isConnected && accountName
                                  ? <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>✓ Connected {accountName && `as ${accountName}`}</div>
                                  : <div style={{ fontSize: 11, color: "#94a3b8" }}>Not connected</div>
                                }
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              {/* Disconnect */}
                              {isConnected && (
                                <button onClick={() => disconnectPlatform(pl.id)}
                                  style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #fca5a5", background: "transparent", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                  Disconnect
                                </button>
                              )}

                              {/* OAuth Connect button */}
                              {pl.oauth && (
                                <button
                                  onClick={() => connectOAuth(pl.id)}
                                  disabled={isLoadingOAuth}
                                  style={{ padding: "7px 18px", borderRadius: 8, border: "none",
                                    background: isConnected ? "linear-gradient(135deg,#16a34a,#22c55e)" : `linear-gradient(135deg,${pl.color},${pl.color}cc)`,
                                    color: "#fff", fontSize: 12, fontWeight: 700, cursor: isLoadingOAuth ? "wait" : "pointer",
                                    opacity: isLoadingOAuth ? 0.7 : 1, whiteSpace: "nowrap" }}>
                                  {isLoadingOAuth ? "Opening..." : isConnected ? "🔄 Reconnect" : `🔗 ${pl.oauthLabel}`}
                                </button>
                              )}

                              {/* Manual fallback toggle */}
                              <button onClick={() => {
                                if (isEditing) { setEditingPlatform(null); return; }
                                setEditingPlatform(pl.id);
                                const blank: Record<string,string> = {};
                                pl.fields.forEach(f => { blank[f.k] = ""; });
                                setPlatformForm(blank);
                              }} style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "transparent", color: "#64748b", fontSize: 11, cursor: "pointer" }}>
                                {isEditing ? "Close" : "Manual"}
                              </button>
                            </div>
                          </div>

                          {/* Manual fallback fields (collapsed by default) */}
                          {isEditing && (
                            <div style={{ marginTop: 14, padding: "14px", background: "#f8fafc", borderRadius: 8, borderTop: "1px solid #e2e8f0" }}>
                              <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 10px" }}>⚠️ Manual mode — paste your tokens directly. Use OAuth button above for easier setup.</p>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {pl.fields.map(f => (
                                  <div key={f.k}>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 3 }}>{f.l}</label>
                                    <input type={f.k.includes("secret") || f.k.includes("token") ? "password" : "text"}
                                      value={platformForm[f.k] || ""} onChange={e => setPlatformForm(prev => ({ ...prev, [f.k]: e.target.value }))}
                                      placeholder={f.p} autoComplete="off" style={inp} />
                                  </div>
                                ))}
                                <button onClick={() => savePlatformCreds(pl.id)} disabled={platformSaving}
                                  style={{ padding: "9px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#0e7490,#22d3ee)", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: platformSaving ? 0.7 : 1 }}>
                                  {platformSaving ? "Saving..." : "Save Credentials"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Env vars guide - now INSIDE <details> */}
                  <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: "#92400e", margin: "0 0 8px" }}>Redirect URI untuk semua OAuth app:</p>
                    <code style={{ fontSize: 11, background: "#fef3c7", padding: "4px 8px", borderRadius: 6, color: "#92400e", display: "block", wordBreak: "break-all" }}>
                      {typeof window !== "undefined" ? window.location.origin : "https://axto.io"}/api/admin/autopost/oauth/callback
                    </code>
                  </div>

                  {/* Free Classified — 1-Click Quick Post */}
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: "#0a1628", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>🌍 Free Classified — 1-Click Quick Post</h3>
                  <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
                    <p style={{ fontSize: 12, color: "#166534", margin: "0 0 10px", fontWeight: 600 }}>
                      ✅ Tidak perlu webhook atau API key. Klik Aktifkan → klik Quick Post → form classified terbuka pre-filled → satu klik Submit!
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div>
                        <label style={{ fontSize: 10, color: "#475569", fontWeight: 600, display: "block", marginBottom: 3 }}>Email kontak iklan</label>
                        <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="hallo@axto.io" style={{ ...inp, width: 200 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: "#475569", fontWeight: 600, display: "block", marginBottom: 3 }}>WhatsApp/Phone (opsional)</label>
                        <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+6281234567890" style={{ ...inp, width: 170 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: "#475569", fontWeight: 600, display: "block", marginBottom: 3 }}>Lokasi (opsional)</label>
                        <input value={postLocation} onChange={e => setPostLocation(e.target.value)} placeholder="Jakarta, Indonesia" style={{ ...inp, width: 160 }} />
                      </div>
                      <button onClick={batchQuickPost} disabled={batchPosting}
                        style={{ padding: "9px 20px", borderRadius: 8, border: "none",
                          background: "linear-gradient(135deg,#16a34a,#22c55e)",
                          color: "#fff", fontSize: 12, fontWeight: 700, cursor: batchPosting ? "wait" : "pointer",
                          opacity: batchPosting ? 0.7 : 1, whiteSpace: "nowrap" }}>
                        {batchPosting ? "Memproses..." : "🚀 Quick Post Semua Aktif"}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
                    {FREE_PLATFORMS.map(pl => {
                      const cfg = platforms.find((p: any) => p.platform === pl.id);
                      const isActive = cfg?.is_active === 1 || classifiedEnabled[pl.id];
                      const result = quickPostResults[pl.id];
                      const isPosting = quickPostLoading === pl.id;

                      return (
                        <div key={pl.id} style={{
                          background: "#fff",
                          border: `1.5px solid ${result?.success ? "rgba(34,197,94,0.5)" : isActive ? "rgba(14,116,144,0.3)" : "#e2e8f0"}`,
                          borderRadius: 12, padding: "12px 14px",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 20 }}>{pl.icon}</span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{pl.label}</div>
                                <div style={{ fontSize: 9, color: "#94a3b8" }}>{pl.note}</div>
                              </div>
                            </div>
                            {/* Toggle on/off */}
                            <button
                              onClick={() => toggleClassified(pl.id, !isActive)}
                              style={{ padding: "3px 10px", borderRadius: 20, border: "none",
                                background: isActive ? "#dcfce7" : "#f1f5f9",
                                color: isActive ? "#16a34a" : "#64748b",
                                fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                              {isActive ? "✓ Aktif" : "Aktifkan"}
                            </button>
                          </div>

                          {/* Result badge */}
                          {result && (
                            <div style={{ fontSize: 10, marginBottom: 8,
                              color: result.success ? "#16a34a" : "#dc2626",
                              background: result.success ? "#dcfce7" : "#fee2e2",
                              padding: "3px 8px", borderRadius: 6, display: "inline-block" }}>
                              {result.method === "api" ? "✅ Posted via API" :
                               result.method === "quicklink" ? "🔗 Form dibuka" : "❌ Gagal"}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => quickPostOne(pl.id)}
                              disabled={isPosting}
                              style={{ flex: 1, padding: "7px", borderRadius: 7, border: "none",
                                background: isPosting ? "#e2e8f0" :
                                  "linear-gradient(135deg,#0e7490,#22d3ee)",
                                color: isPosting ? "#94a3b8" : "#fff",
                                fontSize: 11, fontWeight: 700, cursor: isPosting ? "wait" : "pointer" }}>
                              {isPosting ? "⏳" : "⚡ Quick Post"}
                            </button>
                            {result?.quicklink_url && (
                              <a href={result.quicklink_url} target="_blank" rel="noreferrer"
                                style={{ padding: "7px 10px", borderRadius: 7, border: "1.5px solid #22d3ee",
                                  color: "#22d3ee", fontSize: 10, fontWeight: 700, textDecoration: "none",
                                  display: "flex", alignItems: "center" }}>
                                🔗
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, fontStyle: "italic" }}>
                    💡 Tip: Quick Post membuka form classified dengan konten iklan sudah pre-filled. Untuk OLX yang sudah connect via OAuth, posting langsung via API tanpa membuka browser.
                  </p>
                </div>

              // ─────────────────────────────────────────────────────────
              // TAB: POSTS HISTORY
              // ─────────────────────────────────────────────────────────
              ) : (
                <div>
                  {posts.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 48 }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                      <p style={{ color: "#64748b" }}>No posts yet. Set a schedule or click Push Now.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {posts.map((p: any) => {
                        const st = STATUS_STYLE[p.status] || STATUS_STYLE.draft;
                        const pl = ALL_PLATFORMS.find(x => x.id === p.platform);
                        return (
                          <div key={p.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {pl && <div style={{ width: 28, height: 28, borderRadius: 7, background: pl.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 900 }}>{pl.icon}</div>}
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#0a1628" }}>{pl?.label || p.platform}</span>
                                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, background: st.bg, color: st.color, fontWeight: 700 }}>{p.status}</span>
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span style={{ fontSize: 11, color: "#64748b" }}>{fmtDate(p.published_at || p.created_at)}</span>
                                {p.platform_url && <a href={p.platform_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#0284c7", textDecoration: "none" }}>View →</a>}
                                {p.status === "draft" && (
                                  <button onClick={() => publishPost(p.id)} disabled={publishing === p.id}
                                    style={{ padding: "4px 12px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                    {publishing === p.id ? "..." : "Publish"}
                                  </button>
                                )}
                              </div>
                            </div>
                            <p style={{ color: "#475569", fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "hidden" }}>
                              {(p.body_text || "").substring(0, 300)}{p.body_text?.length > 300 ? "..." : ""}
                            </p>
                            {(p.error_message || p.error_msg) && (
                              <div style={{ marginTop: 8, color: "#ef4444", fontSize: 11 }}>⚠ {p.error_message || p.error_msg}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
