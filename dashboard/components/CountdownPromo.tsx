"use client";
/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * CountdownPromo — the animated promo banner shown across the site and portal.
 * Live ticking countdown to the end of the free year, a marquee of product
 * logos, and elegant motion throughout. Two states, driven by the program:
 *   • active → "Full enterprise, free for a year" + live countdown.
 *   • ended  → "Free access has ended — licence required, contact admin".
 * Always visible (renders the promo optimistically before the status resolves),
 * so it never flashes blank.
 * ============================================================================ */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useFreeProgram } from "@/lib/use-free-program";

const PRODUCTS: { icon: string; name: string; color: string }[] = [
  { icon: "🛡️", name: "Guardian AI", color: "#38bdf8" },
  { icon: "🎼", name: "Orchestra AI", color: "#a78bfa" },
  { icon: "⚖️", name: "AXTO Legal", color: "#818cf8" },
  { icon: "🧠", name: "AXTO Studio", color: "#2dd4bf" },
  { icon: "🦠", name: "AXTO Antivirus", color: "#fb923c" },
  { icon: "🔒", name: "AXTO Vault", color: "#a5b4fc" },
  { icon: "🌐", name: "AXTO Edge", color: "#22d3ee" },
  { icon: "🎯", name: "AXTO SOC", color: "#f87171" },
  { icon: "📋", name: "AXTO Compliance", color: "#4ade80" },
  { icon: "🏭", name: "AXTO Sentinel", color: "#facc15" },
];

const DEFAULT_END = "2027-07-23T00:00:00.000Z";

function useTick() {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

function parts(endISO: string) {
  const end = new Date(endISO || DEFAULT_END).getTime();
  const ms = Math.max(0, end - Date.now());
  return {
    ms,
    d: Math.floor(ms / 86_400_000),
    h: Math.floor(ms / 3_600_000) % 24,
    m: Math.floor(ms / 60_000) % 60,
    s: Math.floor(ms / 1000) % 60,
  };
}

function Digit({ value, label }: { value: number; label: string }) {
  const v = String(value).padStart(2, "0");
  return (
    <div className="cd-floaty" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <div style={{
        minWidth: 58, padding: "10px 8px", borderRadius: 12, textAlign: "center",
        background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)",
        backdropFilter: "blur(6px)", boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
      }}>
        <span key={v} className="cd-tick" style={{ display: "inline-block", fontSize: 30, fontWeight: 900, color: "#fff", fontFamily: "Sora, monospace", letterSpacing: 1, lineHeight: 1 }}>{v}</span>
      </div>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>{label}</span>
    </div>
  );
}

function LogoMarquee() {
  const strip = [...PRODUCTS, ...PRODUCTS];
  return (
    <div style={{ overflow: "hidden", maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}>
      <div className="cd-marquee">
        {strip.map((p, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: "0 16px", fontSize: 13.5, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
            <span style={{ fontSize: 17, filter: `drop-shadow(0 0 6px ${p.color}88)` }}>{p.icon}</span>
            {p.name}
            <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 16 }}>•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CountdownPromo({ compact = false }: { compact?: boolean }) {
  const p = useFreeProgram();
  useTick(); // 1s re-render for the live countdown
  const t = parts(p.endISO);

  const contacts = (
    <span style={{ fontWeight: 700 }}>
      <a href="https://wa.me/6285691234561" style={{ color: "inherit" }}>WhatsApp +62 856-9123-4561</a>
      {" · "}
      <a href="mailto:hello@axto.io" style={{ color: "inherit" }}>hello@axto.io</a>
      {" · "}
      <a href="mailto:salam@ulyah.com" style={{ color: "inherit" }}>salam@ulyah.com</a>
    </span>
  );

  // ── ENDED → locked / contact admin ──────────────────────────────────────
  if (p.ended) {
    return (
      <div className="cd-bg cd-sheen" style={{ borderRadius: 18, padding: compact ? "16px 20px" : "22px 26px", color: "#fee2e2", background: "linear-gradient(120deg,#7f1d1d,#450a0a,#7f1d1d)", border: "1px solid #b91c1c" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span className="cd-glow" style={{ fontSize: 26 }}>🔒</span>
          <span style={{ fontSize: compact ? 16 : 19, fontWeight: 900, color: "#fff", fontFamily: "Sora, sans-serif" }}>The free year has ended — a licence is now required</span>
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
          Every app is locked (read-only); your data and files were left untouched. There are no self-service prices — {contacts} to arrange a licence.
        </p>
      </div>
    );
  }

  // ── ACTIVE → animated promo + live countdown ────────────────────────────
  return (
    <div className="cd-bg cd-sheen" style={{
      borderRadius: 20, overflow: "hidden", color: "#fff", position: "relative",
      background: "linear-gradient(120deg,#0f766e,#0284c7,#7c3aed,#0f766e)",
      border: "1px solid rgba(255,255,255,0.16)", boxShadow: "0 12px 40px rgba(2,132,199,0.28)",
    }}>
      <div style={{ padding: compact ? "18px 22px" : "26px 30px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: compact ? 16 : 28, justifyContent: "space-between" }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <div className="cd-pop" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", padding: "5px 14px", borderRadius: 999, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.8, marginBottom: 12 }}>
              <span className="cd-glow">✨</span> LAUNCH OFFER · LIMITED TIME
            </div>
            <h3 style={{ fontSize: compact ? 20 : 27, fontWeight: 900, lineHeight: 1.12, margin: "0 0 8px", fontFamily: "Sora, sans-serif", letterSpacing: "-0.6px" }}>
              Every AXTO app — full enterprise, <span style={{ color: "#fde68a" }}>free for one year</span>
            </h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, color: "rgba(255,255,255,0.9)", maxWidth: 520 }}>
              No licence key, no limits, no payment. Download, self-host, and run the complete suite on your own machines. When the countdown ends, apps lock gracefully — your data stays yours.
            </p>
            {!compact && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                <Link href="/portal/downloads" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#0f766e", padding: "11px 22px", borderRadius: 11, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
                  <span style={{ fontSize: 16 }}>⬇</span> Download free
                </Link>
                <Link href="/#products" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.14)", color: "#fff", padding: "11px 22px", borderRadius: 11, fontWeight: 700, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,0.3)" }}>
                  Explore the apps
                </Link>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,0.75)", marginBottom: 10 }}>
              Free access ends in
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Digit value={t.d} label="Days" />
              <Digit value={t.h} label="Hrs" />
              <Digit value={t.m} label="Min" />
              <Digit value={t.s} label="Sec" />
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.75)", marginTop: 10 }}>
              until {(p.endISO || DEFAULT_END).slice(0, 10)}
            </div>
          </div>
        </div>
      </div>

      {!compact && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)", padding: "12px 0", background: "rgba(0,0,0,0.12)" }}>
          <LogoMarquee />
        </div>
      )}
    </div>
  );
}
