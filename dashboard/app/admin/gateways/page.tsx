/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser } from "@/lib/client-auth";
import Link from "next/link";

const GW_INFO: Record<string, {
  label: string;
  icon: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
}> = {
  stripe: {
    label: "Stripe", icon: "💳",
    fields: [
      { key: "secret_key",      label: "Secret Key",      placeholder: "sk_live_...", secret: true },
      { key: "webhook_secret",  label: "Webhook Secret",  placeholder: "whsec_...",   secret: true },
    ],
  },
  paypal: {
    label: "PayPal", icon: "🅿️",
    fields: [
      { key: "client_id",     label: "Client ID",              placeholder: "AcXXX..." },
      { key: "client_secret", label: "Client Secret",          placeholder: "ELxXXX...", secret: true },
      { key: "webhook_id",    label: "Webhook ID",             placeholder: "WH-XXX..." },
      { key: "mode",          label: "Mode (sandbox / live)",  placeholder: "live" },
    ],
  },
  xendit: {
    label: "Xendit", icon: "🏦",
    fields: [
      { key: "secret_key",    label: "Secret Key",     placeholder: "xnd_production_...", secret: true },
      { key: "webhook_token", label: "Webhook Token",  placeholder: "token",              secret: true },
    ],
  },
  midtrans: {
    label: "Midtrans", icon: "🇮🇩",
    fields: [
      { key: "server_key",     label: "Server Key",             placeholder: "Mid-server-...", secret: true },
      { key: "client_key",     label: "Client Key",             placeholder: "Mid-client-..." },
      { key: "is_production",  label: "Production? (true/false)", placeholder: "true" },
    ],
  },
  resend: {
    label: "Resend (Transactional Email)", icon: "📧",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "re_...", secret: true },
    ],
  },
  nowpayments: {
    label: "NOWPayments (Crypto Checkout)", icon: "🪙",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "...", secret: true },
      { key: "ipn_secret", label: "IPN Callback Secret", placeholder: "...", secret: true },
    ],
  },
};

export default function GatewaysPage() {
  const router = useRouter();
  const [gateways, setGateways] = useState<Record<string, any>>({});
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState<string | null>(null);
  const [form,     setForm]     = useState<Record<string, string>>({});
  const [saving,   setSaving]   = useState(false);
  const [testing,  setTesting]  = useState(false);
  const [saveMsg,  setSaveMsg]  = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    getSessionUser().then(u => {
      if (!u || u.role !== "admin") { router.push("/auth/login"); return; }
      load();
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gateways", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      // Convert array to map keyed by gateway name for easy lookup
      const map: Record<string, any> = {};
      (data.gateways || []).forEach((g: any) => { map[g.gateway] = g; });
      setGateways(map);
    } catch {}
    finally { setLoading(false); }
  }, []);

  function startEdit(gwName: string) {
    setSaveMsg(null);
    setEditing(gwName);
    const fields = GW_INFO[gwName]?.fields || [];
    const blank: Record<string, string> = {};
    fields.forEach(f => { blank[f.key] = ""; });
    setForm(blank);
  }

  function cancelEdit() {
    setEditing(null);
    setSaveMsg(null);
    setForm({});
  }

  async function handleSave(gwName: string) {
    setSaveMsg(null);
    // Only send filled fields
    const credentials: Record<string, string> = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v.trim()) credentials[k] = v.trim();
    });
    if (Object.keys(credentials).length === 0) {
      setSaveMsg({ type: "err", text: "Fill in at least one field before saving." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/gateways", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: gwName,
          credentials,
          is_active: true,   // ← always activate when credentials are saved
          meta: {},
        }),
      });
      const d = await res.json();
      if (d.success) {
        setSaveMsg({ type: "ok", text: "Saved & encrypted successfully!" });
        await load();
        setTimeout(() => { setEditing(null); setSaveMsg(null); }, 1500);
      } else {
        setSaveMsg({ type: "err", text: d.error || "Save failed — please retry." });
      }
    } catch {
      setSaveMsg({ type: "err", text: "Network error — please retry." });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(gwName: string) {
    setSaveMsg(null);
    const credentials: Record<string, string> = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v.trim()) credentials[k] = v.trim();
    });
    setTesting(true);
    try {
      const res = await fetch("/api/admin/gateways?test=1", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway: gwName, credentials, is_active: false, meta: {} }),
      });
      const d = await res.json();
      if (d.ok) setSaveMsg({ type: "ok", text: "✓ " + (d.info || "Connection verified!") });
      else setSaveMsg({ type: "err", text: "✗ " + (d.error || "Connection failed") });
    } catch {
      setSaveMsg({ type: "err", text: "Network error during test." });
    } finally { setTesting(false); }
  }

  async function toggleActive(gwName: string) {
    const gw = gateways[gwName];
    const newActive = !(gw?.is_active);
    // Only update is_active flag — do NOT send credentials to avoid accidental overwrite
    await fetch("/api/admin/gateways", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gateway: gwName, toggle_active_only: true, is_active: newActive }),
    });
    await load();
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1.5px solid #e2e8f0", background: "#fff",
    color: "#0a1628", fontSize: 13, outline: "none", boxSizing: "border-box" as const,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", padding: "28px 32px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>← Back to Dashboard</Link>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0a1628", marginTop: 16, marginBottom: 8 }}>💳 Payment Gateways</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 28 }}>
          Credentials are encrypted with AES-256-GCM before storage. Never stored in plaintext.
        </p>

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(["stripe", "paypal", "xendit", "midtrans", "resend", "nowpayments"] as const).map(gwName => {
              const gw = gateways[gwName];
              const info = GW_INFO[gwName];
              const isConfigured = gw?.hasCredentials === true;
              const isActive = gw?.is_active === 1 || gw?.is_active === true;
              const isEditingThis = editing === gwName;

              return (
                <div key={gwName} style={{
                  background: "#fff", borderRadius: 14, padding: 24,
                  border: isActive ? "1.5px solid rgba(74,222,128,0.4)" : "1px solid #e2e8f0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}>
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isEditingThis ? 20 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{info.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0a1628", fontSize: 16 }}>{info.label}</div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>
                          {isConfigured
                            ? <span style={{ color: "#4ade80", fontWeight: 600 }}>✓ Configured</span>
                            : <span style={{ color: "#94a3b8" }}>Not configured</span>}
                          {isConfigured && (
                            <span style={{ marginLeft: 10, color: isActive ? "#4ade80" : "#f59e0b", fontWeight: 600 }}>
                              {isActive ? "● Active" : "● Inactive"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {isConfigured && (
                        <button
                          onClick={() => toggleActive(gwName)}
                          style={{
                            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            border: "1.5px solid",
                            borderColor: isActive ? "rgba(74,222,128,0.4)" : "#e2e8f0",
                            background: isActive ? "rgba(74,222,128,0.08)" : "transparent",
                            color: isActive ? "#4ade80" : "#64748b",
                          }}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </button>
                      )}
                      <button
                        onClick={() => isEditingThis ? cancelEdit() : startEdit(gwName)}
                        style={{
                          padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                          border: "1.5px solid #22d3ee", background: "transparent", color: "#22d3ee",
                        }}
                      >
                        {isEditingThis ? "Cancel" : isConfigured ? "Update" : "Configure"}
                      </button>
                    </div>
                  </div>

                  {/* Edit form */}
                  {isEditingThis && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {info.fields.map(f => (
                        <div key={f.key}>
                          <label style={{ color: "#475569", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>
                            {f.label}
                          </label>
                          <input
                            type={f.secret ? "password" : "text"}
                            value={form[f.key] || ""}
                            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            autoComplete="off"
                            style={inputStyle}
                          />
                        </div>
                      ))}

                      {/* Status message */}
                      {saveMsg && (
                        <div style={{
                          padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                          background: saveMsg.type === "ok" ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)",
                          border: `1px solid ${saveMsg.type === "ok" ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
                          color: saveMsg.type === "ok" ? "#4ade80" : "#ef4444",
                        }}>
                          {saveMsg.text}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => handleTest(gwName)}
                          disabled={testing || saving}
                          style={{
                            flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                            border: "1.5px solid #0284c7", background: "transparent", color: "#0284c7",
                            cursor: "pointer", opacity: testing ? 0.7 : 1,
                          }}
                        >
                          {testing ? "Testing..." : "Test Connection"}
                        </button>
                        <button
                          onClick={() => handleSave(gwName)}
                          disabled={saving || testing}
                          style={{
                            flex: 2, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                            border: "none", background: "linear-gradient(135deg,#0e7490,#22d3ee)",
                            color: "#fff", cursor: "pointer", opacity: saving ? 0.7 : 1,
                          }}
                        >
                          {saving ? "Saving..." : "Save & Encrypt"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
