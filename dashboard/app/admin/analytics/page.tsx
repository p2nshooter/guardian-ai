/* ==============================================================================
 * Admin → Web Analytics. Daily visitors/views + per-country breakdown.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/client-auth";

type Daily = { day: string; visitors: number; views: number };
type Country = { country: string; visitors: number; views: number };

const flagOf = (cc: string) =>
  cc && /^[A-Z]{2}$/.test(cc)
    ? String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0)))
    : "🌐";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [days, setDays]       = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [data, setData]       = useState<{
    today: { visitors: number; views: number };
    totals: { visitors: number; views: number };
    daily: Daily[]; countries: Country[];
  } | null>(null);

  const load = useCallback(async (d: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
      if (!res.ok) { setError("Failed to load analytics"); return; }
      setData(await res.json());
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    getSessionUser().then(u => {
      if (!u || u.role !== "admin") { router.push("/auth/login"); return; }
      load(days);
    });
  }, []); // eslint-disable-line

  useEffect(() => { if (data) load(days); }, [days]); // eslint-disable-line

  const maxV = Math.max(1, ...(data?.daily || []).map(d => d.visitors));
  const maxC = Math.max(1, ...(data?.countries || []).map(c => c.visitors));

  const card = (label: string, value: number, color: string) => (
    <div style={{ flex: 1, minWidth: 150, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: "Sora, sans-serif" }}>{value.toLocaleString()}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", padding: "28px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>← Dashboard</Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 8, marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif", margin: 0 }}>🌍 Web Analytics</h1>
          <div style={{ display: "flex", gap: 6 }}>
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid", borderColor: days === d ? "#0284c7" : "#e2e8f0", background: days === d ? "rgba(2,132,199,0.08)" : "#fff", color: days === d ? "#0284c7" : "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{d}d</button>
            ))}
          </div>
        </div>

        {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>⚠ {error}</div>}

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>Loading…</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
              {card("Visitors today", data?.today.visitors || 0, "#0284c7")}
              {card("Views today", data?.today.views || 0, "#0d9488")}
              {card(`Visitors (${days}d)`, data?.totals.visitors || 0, "#16a34a")}
              {card(`Views (${days}d)`, data?.totals.views || 0, "#7c3aed")}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
              {/* Daily chart */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0a1628", marginTop: 0, marginBottom: 16 }}>Daily visitors</h3>
                {(!data?.daily.length) ? (
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>No visits recorded yet.</p>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 160 }}>
                    {data!.daily.map(d => (
                      <div key={d.day} title={`${d.day}: ${d.visitors} visitors, ${d.views} views`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                        <div style={{ height: `${(d.visitors / maxV) * 100}%`, minHeight: d.visitors ? 3 : 0, background: "linear-gradient(180deg,#38bdf8,#0284c7)", borderRadius: "4px 4px 0 0" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top countries */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0a1628", marginTop: 0, marginBottom: 16 }}>Top countries</h3>
                {(!data?.countries.length) ? (
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>No country data yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data!.countries.map(c => (
                      <div key={c.country} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18, width: 24 }}>{flagOf(c.country)}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", width: 34 }}>{c.country}</span>
                        <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${(c.visitors / maxC) * 100}%`, height: "100%", background: "linear-gradient(90deg,#0d9488,#16a34a)" }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#16a34a", width: 48, textAlign: "right" }}>{c.visitors.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 16 }}>
              Privacy-light: only daily counts per country are stored — no IP addresses, no per-visitor tracking.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
