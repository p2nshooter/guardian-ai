"use client";
/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * Public live-install counter for the landing page. Shows ONLY numbers — total
 * installs and a per-app ranking so visitors can see which AXTO apps are the
 * most-used ("viral"). No IDs, no client details — just counts, from the
 * public /api/installs/count endpoint.
 * ============================================================================ */
import { useEffect, useState } from "react";

const APPS: Record<string, { name: string; icon: string; color: string }> = {
  guardian:   { name: "Guardian AI",     icon: "🛡️", color: "#0284c7" },
  orchestra:  { name: "Orchestra AI",    icon: "🎼", color: "#7c3aed" },
  legal:      { name: "AXTO Legal",      icon: "⚖️", color: "#4338ca" },
  studio:     { name: "AXTO Studio",     icon: "🧠", color: "#0f766e" },
  antivirus:  { name: "AXTO Antivirus",  icon: "🦠", color: "#ea580c" },
  vault:      { name: "AXTO Vault",      icon: "🔒", color: "#6366f1" },
  edge:       { name: "AXTO Edge",       icon: "🌐", color: "#0891b2" },
  soc:        { name: "AXTO SOC",        icon: "🎯", color: "#dc2626" },
  compliance: { name: "AXTO Compliance", icon: "📋", color: "#16a34a" },
  sentinel:   { name: "AXTO Sentinel",   icon: "🏭", color: "#ca8a04" },
};

interface CountView { total: number; products: Record<string, number>; }

export default function InstallCounter() {
  const [data, setData] = useState<CountView | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/installs/count", { cache: "no-store" })
        .then((r) => r.json())
        .then((v) => { if (alive) setData({ total: Number(v.total) || 0, products: v.products || {} }); })
        .catch(() => { if (alive) setData({ total: 0, products: {} }); });
    load();
    const t = setInterval(load, 30000); // refresh every 30s — live feel
    return () => { alive = false; clearInterval(t); };
  }, []);

  const ranking = Object.entries(data?.products || {})
    .filter(([slug]) => APPS[slug])
    .sort((a, b) => b[1] - a[1]);
  const max = ranking.length ? Math.max(...ranking.map(([, n]) => n)) : 0;

  return (
    <section id="counter" style={{ padding: "80px 24px", background: "#0a1628", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -120, right: -80, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", textAlign: "center" }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 1.5, color: "#38bdf8", textTransform: "uppercase", marginBottom: 14 }}>
          Live · Community
        </div>
        <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: "#fff", letterSpacing: "-1.2px", lineHeight: 1.1, marginBottom: 10, fontFamily: "Sora, sans-serif" }}>
          Installed on{" "}
          <span style={{ background: "linear-gradient(135deg,#38bdf8,#0d9488)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {data ? data.total.toLocaleString() : "—"}
          </span>{" "}
          machines
        </h2>
        <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.6, maxWidth: 560, margin: "0 auto 40px" }}>
          Real installs, updated live. See which sovereign AI apps the community is running the most.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560, margin: "0 auto", textAlign: "left" }}>
          {ranking.length === 0 && (
            <div style={{ textAlign: "center", color: "#475569", fontSize: 14 }}>
              {data ? "Be the first to install — the counter starts here." : "Loading live counts…"}
            </div>
          )}
          {ranking.map(([slug, n], i) => {
            const a = APPS[slug];
            const pct = max > 0 ? Math.max(6, Math.round((n / max) * 100)) : 6;
            return (
              <div key={slug} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569", width: 22, textAlign: "right" }}>{i + 1}</span>
                <span style={{ fontSize: 20, width: 26, textAlign: "center" }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#e2e8f0" }}>{a.name}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 900, color: "#fff", fontFamily: "Sora, sans-serif" }}>{n.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: `linear-gradient(90deg, ${a.color}, ${a.color}aa)`, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
