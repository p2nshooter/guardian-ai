/* ==============================================================================
 * Admin · Payment Methods
 * Toggle methods ON/OFF and edit deposit address / network / confirmations.
 * Disabled methods are hidden from clients everywhere; visible only here.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
"use client";
import { useEffect, useState } from "react";

interface Method {
  id: string; symbol: string; name: string; category: string; network: string;
  kind: string; address: string; contract: string; decimals: number;
  confirmations: number; enabled: number; sort_order: number;
}

export default function AdminPaymentMethods() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Method>>({});
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/payment-methods");
      const j = await r.json();
      setMethods(j.methods || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function act(id: string, action: string, extra: any = {}) {
    setMsg("");
    const r = await fetch("/api/admin/payment-methods", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...extra }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setEdit(null); await load();
  }

  const crypto = methods.filter((m) => m.category === "crypto");
  const fiat = methods.filter((m) => m.category === "fiat");

  const card = (m: Method) => (
    <div key={m.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 12, boxShadow: "0 1px 3px rgba(10,22,40,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "linear-gradient(135deg,rgba(2,132,199,.1),rgba(13,148,136,.1))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#0f172a", fontSize: 13 }}>{m.symbol}</div>
          <div>
            <div style={{ fontWeight: 800, color: "#0a1628", fontSize: 15 }}>{m.name}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#7c3aed", background: "rgba(124,58,237,.1)", border: "1px solid rgba(124,58,237,.25)", borderRadius: 999, padding: "2px 9px", letterSpacing: .3 }}>
                NETWORK: {m.network || "—"}
              </span>
              <span style={{ fontSize: 11, color: "#64748b" }}>{m.confirmations} conf</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {m.category === "crypto" ? (
            <button onClick={() => { setEdit(m.id); setDraft({ address: m.address, network: m.network, confirmations: m.confirmations, name: m.name }); }}
              style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✎ Edit</button>
          ) : (
            <a href="/admin/gateways" style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>🔑 Configure credentials</a>
          )}
          <button onClick={() => act(m.id, "toggle")}
            style={{ padding: "7px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 13, color: "#fff", background: m.enabled ? "linear-gradient(135deg,#16a34a,#22c55e)" : "linear-gradient(135deg,#94a3b8,#cbd5e1)" }}>
            {m.enabled ? "🟢 ON" : "🔴 OFF"}
          </button>
        </div>
      </div>
      {m.category === "crypto" && (
        <div style={{ marginTop: 12, fontFamily: "monospace", fontSize: 12.5, color: "#475569", wordBreak: "break-all", background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: "8px 12px" }}>
          {m.address || <span style={{ color: "#b45309" }}>⚠ no address configured — set it before enabling</span>}
        </div>
      )}
      {m.category === "fiat" && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
          API credentials (client ID/secret, API keys) are managed at <a href="/admin/gateways" style={{ color: "#0284c7", fontWeight: 700 }}>Admin → Gateways</a>, not here — this toggle only controls client-facing visibility.
        </div>
      )}
      {edit === m.id && m.category === "crypto" && (
        <div style={{ marginTop: 14, borderTop: "1px dashed #e2e8f0", paddingTop: 14, display: "grid", gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Deposit address
            <input value={draft.address || ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              style={{ width: "100%", marginTop: 4, padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "monospace", fontSize: 13 }} />
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", flex: 1 }}>Network (shown to client)
              <input value={draft.network || ""} onChange={(e) => setDraft({ ...draft, network: e.target.value })}
                style={{ width: "100%", marginTop: 4, padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", width: 130 }}>Confirmations
              <input type="number" value={draft.confirmations ?? 1} onChange={(e) => setDraft({ ...draft, confirmations: Number(e.target.value) })}
                style={{ width: "100%", marginTop: 4, padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => act(m.id, "update", draft)}
              style={{ padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 13, color: "#fff", background: "linear-gradient(135deg,#0284c7,#0d9488)" }}>Save</button>
            <button onClick={() => setEdit(null)}
              style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 80px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0a1628", letterSpacing: "-0.5px" }}>Payment Methods</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginTop: 4, marginBottom: 24 }}>
        Methods that are <strong>OFF</strong> are hidden from clients everywhere. Crypto requires a verified deposit address before it can be turned on.
      </p>
      {msg && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{msg}</div>}
      {loading ? <div style={{ color: "#94a3b8" }}>Loading…</div> : (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Crypto</h2>
          {crypto.map(card)}
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, margin: "24px 0 12px" }}>Fiat (off by default)</h2>
          {fiat.map(card)}
        </>
      )}
    </div>
  );
}
