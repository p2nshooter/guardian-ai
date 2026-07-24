/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * Admin — Program Akses Gratis. One control room for the Free Full-Access
 * Program: the global countdown, the install register (one ID = one install,
 * with per-ID extend / revoke / ban), and the rollout progress board.
 * ============================================================================ */
"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser } from "@/lib/client-auth";

const APP_NAMES: Record<string, string> = {
  guardian: "Guardian AI", orchestra: "Orchestra AI", legal: "AXTO Legal",
  studio: "AXTO Studio", antivirus: "AXTO Antivirus", vault: "AXTO Vault",
  edge: "AXTO Edge", soc: "AXTO SOC", compliance: "AXTO Compliance", sentinel: "AXTO Sentinel",
};

// Rollout progress board — the stages of the total overhaul, marked live.
const ROADMAP: { n: string; title: string; state: "done" | "active" | "todo" }[] = [
  { n: "0", title: "Backup snapshot (restorable)", state: "done" },
  { n: "1", title: "Audit: bugs & inconsistencies", state: "done" },
  { n: "2", title: "Free full-access core (1-year global countdown)", state: "done" },
  { n: "3", title: "Landing + product pages: prices removed → Download", state: "done" },
  { n: "3c", title: "Playbooks → free AdSense articles", state: "done" },
  { n: "4b", title: "No-licence install-ID model + synchronized lock", state: "done" },
  { n: "5", title: "Admin: this control room + progress board", state: "active" },
  { n: "4", title: "Client portal overhaul + countdown + contacts", state: "active" },
  { n: "6", title: "In-app lock notices (no data deletion)", state: "todo" },
  { n: "8", title: "End-to-end testing + screenshots", state: "todo" },
];

const S = {
  page: { padding: "28px 32px", color: "#e2e8f0", fontFamily: "Inter, system-ui, sans-serif" } as React.CSSProperties,
  h1: { fontSize: 24, fontWeight: 900, color: "#fff", fontFamily: "Sora, sans-serif", margin: 0 } as React.CSSProperties,
  card: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 22, marginBottom: 20 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "#64748b" } as React.CSSProperties,
  btn: { padding: "8px 14px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 12.5, fontWeight: 700, cursor: "pointer" } as React.CSSProperties,
  btnPrimary: { padding: "9px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" } as React.CSSProperties,
  input: { padding: "8px 10px", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", fontSize: 13 } as React.CSSProperties,
  th: { textAlign: "left", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", padding: "8px 10px", borderBottom: "1px solid #1e293b" } as React.CSSProperties,
  td: { fontSize: 12.5, color: "#cbd5e1", padding: "9px 10px", borderBottom: "1px solid #14202f", verticalAlign: "middle" } as React.CSSProperties,
};

export default function AdminFreeAccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [installs, setInstalls] = useState<any[]>([]);
  const [byProduct, setByProduct] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({});
  const [program, setProgram] = useState<any>(null);
  const [fProduct, setFProduct] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [q, setQ] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fProduct) params.set("product", fProduct);
      if (fStatus) params.set("status", fStatus);
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/installs?${params}`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
      const d = await res.json();
      setInstalls(d.installs || []);
      setByProduct(d.byProduct || []);
      setTotals(d.totals || {});
      setProgram(d.program || null);
      if (d.program?.endISO) setEndDate(d.program.endISO.slice(0, 10));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [router, fProduct, fStatus, q]);

  useEffect(() => {
    getSessionUser().then((u: any) => {
      if (!u || u.role !== "admin") { router.push("/auth/login"); return; }
      load();
    });
  }, []); // eslint-disable-line

  async function program_(action: string, body: any = {}) {
    setBusy("program"); setMsg("");
    try {
      const res = await fetch("/api/admin/free-access", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const d = await res.json();
      if (res.ok) { setProgram(d.status); setMsg("✓ Countdown updated"); }
      else setMsg(d.error || "Failed");
    } catch { setMsg("Network error"); }
    finally { setBusy(null); }
  }

  async function installAction(install_id: string, product: string, action: string, extra: any = {}) {
    setBusy(install_id + action); setMsg("");
    try {
      const res = await fetch("/api/admin/installs", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ install_id, product, action, ...extra }),
      });
      const d = await res.json();
      if (res.ok) { setMsg("✓ Updated"); await load(); }
      else setMsg(d.error || "Failed");
    } catch { setMsg("Network error"); }
    finally { setBusy(null); }
  }

  const daysLeft = program?.daysLeft ?? "—";
  const ranking = [...byProduct].sort((a, b) => (b.c || 0) - (a.c || 0));

  return (
    <main style={S.page}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={S.h1}>🎁 Program Akses Gratis</h1>
        <button style={S.btn} onClick={load}>↻ Refresh</button>
      </div>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0, marginBottom: 20 }}>
        One global countdown drives every install. When it ends, all apps lock simultaneously (read-only) — client data is never deleted. Everything below is admin-controlled.
      </p>
      {msg && <div style={{ ...S.card, padding: "10px 16px", color: msg.startsWith("✓") ? "#4ade80" : "#f87171", marginBottom: 16 }}>{msg}</div>}

      {/* Countdown control */}
      <div style={S.card}>
        <div style={S.label}>Global Countdown</div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 44, fontWeight: 900, color: "#fff", fontFamily: "Sora, sans-serif", lineHeight: 1 }}>
              {daysLeft}<span style={{ fontSize: 15, color: "#64748b", fontWeight: 600 }}> days left</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 6 }}>
              Ends {program?.endISO?.slice(0, 10) || "—"} · {program?.active ? <span style={{ color: "#4ade80" }}>● active</span> : <span style={{ color: "#f87171" }}>● inactive</span>}
              {" · "}source: {program?.source || "—"}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={S.input} />
            <button style={S.btnPrimary} disabled={busy === "program"} onClick={() => program_("set_end", { endISO: endDate })}>Set end date</button>
            <button style={S.btn} disabled={busy === "program"} onClick={() => program_("add_days", { days: 30 })}>+30d</button>
            <button style={S.btn} disabled={busy === "program"} onClick={() => program_("add_days", { days: 90 })}>+90d</button>
            <button style={S.btn} disabled={busy === "program"} onClick={() => program_("add_days", { days: 365 })}>+1yr</button>
            <button style={S.btn} disabled={busy === "program"} onClick={() => program_("set_enabled", { enabled: !program?.enabled })}>
              {program?.enabled ? "Disable program" : "Enable program"}
            </button>
          </div>
        </div>
      </div>

      {/* Install stats + viral ranking */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
        <div style={S.card}>
          <div style={S.label}>Installs</div>
          <div style={{ display: "flex", gap: 22, marginTop: 12, flexWrap: "wrap" }}>
            {[["Total", totals.total, "#fff"], ["Active", totals.active, "#4ade80"], ["Revoked", totals.revoked, "#fbbf24"], ["Banned", totals.banned, "#f87171"]].map(([l, v, c]) => (
              <div key={l as string}>
                <div style={{ fontSize: 28, fontWeight: 900, color: c as string, fontFamily: "Sora, sans-serif" }}>{Number(v || 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.label}>By app (viral ranking · public counter)</div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
            {ranking.length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>No installs yet.</div>}
            {ranking.map((p: any) => (
              <div key={p.product} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#cbd5e1" }}>{APP_NAMES[p.product] || p.product}</span>
                <span style={{ color: "#fff", fontWeight: 700 }}>{Number(p.c || 0).toLocaleString()} <span style={{ color: "#475569", fontWeight: 500 }}>({Number(p.active || 0)} active)</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rollout progress board */}
      <div style={S.card}>
        <div style={S.label}>Rollout Progress</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10, marginTop: 12 }}>
          {ROADMAP.map((r) => {
            const c = r.state === "done" ? "#4ade80" : r.state === "active" ? "#38bdf8" : "#475569";
            const icon = r.state === "done" ? "✓" : r.state === "active" ? "▸" : "○";
            return (
              <div key={r.n} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 12px", background: "#0b1220", border: "1px solid #1e293b", borderRadius: 8 }}>
                <span style={{ color: c, fontWeight: 900, fontSize: 15 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 12.5, color: "#e2e8f0", fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: 10.5, color: c, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>Stage {r.n} · {r.state}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Install register + per-ID controls */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={S.label}>Install Register — per-ID control</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input placeholder="search id / hostname" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} style={S.input} />
            <select value={fProduct} onChange={e => setFProduct(e.target.value)} style={S.input}>
              <option value="">all apps</option>
              {Object.keys(APP_NAMES).map(p => <option key={p} value={p}>{APP_NAMES[p]}</option>)}
            </select>
            <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={S.input}>
              <option value="">any status</option>
              <option value="active">active</option>
              <option value="revoked">revoked</option>
              <option value="banned">banned</option>
            </select>
            <button style={S.btn} onClick={load}>Apply</button>
          </div>
        </div>
        <div style={{ overflowX: "auto", marginTop: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
            <thead>
              <tr>
                {["Install ID", "App", "Status", "First seen", "Last seen", "Override", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td style={S.td} colSpan={7}>Loading…</td></tr>}
              {!loading && installs.length === 0 && <tr><td style={S.td} colSpan={7}>No installs match.</td></tr>}
              {installs.map((r) => {
                const sc = r.status === "active" ? "#4ade80" : r.status === "revoked" ? "#fbbf24" : "#f87171";
                return (
                  <tr key={r.install_id + r.product}>
                    <td style={{ ...S.td, fontFamily: "ui-monospace, monospace", fontSize: 11.5 }} title={r.install_id}>{r.install_id.slice(0, 12)}…</td>
                    <td style={S.td}>{APP_NAMES[r.product] || r.product}</td>
                    <td style={S.td}><span style={{ color: sc, fontWeight: 700 }}>● {r.status}</span></td>
                    <td style={S.td}>{(r.first_seen || "").slice(0, 10)}</td>
                    <td style={S.td}>{(r.last_seen || "").slice(0, 10)}</td>
                    <td style={S.td}>{r.expires_override ? r.expires_override.slice(0, 10) : "—"}</td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <button style={S.btn} disabled={!!busy} onClick={() => installAction(r.install_id, r.product, "extend", { days: 30 })}>+30d</button>
                        <button style={S.btn} disabled={!!busy} onClick={() => installAction(r.install_id, r.product, "extend", { days: 365 })}>+1yr</button>
                        {r.status !== "revoked" && <button style={{ ...S.btn, color: "#fbbf24" }} disabled={!!busy} onClick={() => installAction(r.install_id, r.product, "revoke")}>Revoke</button>}
                        {r.status !== "banned" && <button style={{ ...S.btn, color: "#f87171" }} disabled={!!busy} onClick={() => installAction(r.install_id, r.product, "ban")}>Ban</button>}
                        {r.status !== "active" && <button style={{ ...S.btn, color: "#4ade80" }} disabled={!!busy} onClick={() => installAction(r.install_id, r.product, "activate")}>Activate</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11.5, color: "#475569", marginTop: 12 }}>
          Revoked/banned IDs lock on their next check. Reinstall requests (WhatsApp +6285691234561 / hello@axto.io / salam@ulyah.com, $1000) are handled here by revoking the old ID.
        </p>
      </div>
    </main>
  );
}
