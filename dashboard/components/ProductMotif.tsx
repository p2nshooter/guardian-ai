/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * One reusable, theme-able hero animation per product, keyed by AnimMotif.
 * Reuses the keyframes already defined in globals.css (float, pulseRing,
 * scanLine, routeDot, workerBeat, dataFlow, spin, fadeIn + delay-*) so no new
 * CSS is needed — only the SVG/DOM composition differs per motif.
 * ============================================================================ */
"use client";
import type { AnimMotif } from "@/lib/product-catalog";

const ICONS: Record<AnimMotif, string> = {
  shield: "🛡️", route: "🛣️", lock: "🔒", gateway: "🌐", radar: "🎯",
  checklist: "📋", factory: "🏭", scan: "🦠", spark: "✨", scales: "⚖️",
};

export default function ProductMotif({ motif, color }: { motif: AnimMotif; color: string }) {
  const icon = ICONS[motif];
  return (
    <div style={{ position: "relative", width: "100%", height: 260, borderRadius: 20, overflow: "hidden", background: `radial-gradient(circle at 50% 35%, ${color}22, transparent 70%)`, border: `1px solid ${color}30` }}>
      <div className="mesh-grid" style={{ position: "absolute", inset: 0, opacity: 0.35 }} />

      {/* Motif-specific background layer */}
      {motif === "shield" && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: "-10%", height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, animation: "scanLine 2.6s linear infinite" }} />
        </div>
      )}
      {motif === "route" && (
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} viewBox="0 0 400 260">
          <path d="M40 210 Q 140 60 200 130 T 360 60" fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={2} strokeDasharray="6 6" />
          {[[40,210],[200,130],[360,60]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r={5} fill={color}><animate attributeName="r" values="4;7;4" dur="1.8s" begin={`${i*0.3}s`} repeatCount="indefinite" /></circle>
          ))}
          <circle r={4} fill="#fff">
            <animateMotion dur="3.2s" repeatCount="indefinite" path="M40 210 Q 140 60 200 130 T 360 60" />
          </circle>
        </svg>
      )}
      {motif === "lock" && (
        <div style={{ position: "absolute", inset: 0 }}>
          {["email","phone","card","ssn"].map((tag,i) => (
            <span key={tag} className={`animate-fade-in delay-${(i+1)*200}`} style={{ position: "absolute", left: `${18 + i*20}%`, top: `${20 + (i%2)*55}%`, fontSize: 10, fontFamily: "monospace", color, background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 6, padding: "3px 7px" }}>
              [{tag.toUpperCase()}]
            </span>
          ))}
        </div>
      )}
      {motif === "gateway" && (
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} viewBox="0 0 400 260">
          <rect x="60" y="40" width="10" height="180" rx="4" fill={color} fillOpacity={0.3} />
          <rect x="330" y="40" width="10" height="180" rx="4" fill={color} fillOpacity={0.3} />
          {[0,1,2].map(i => (
            <circle key={i} r={4} fill={color}>
              <animateMotion dur="2.4s" begin={`${i*0.5}s`} repeatCount="indefinite" path="M70 130 L330 130" />
            </circle>
          ))}
        </svg>
      )}
      {motif === "radar" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: 180, height: 180, borderRadius: "50%", border: `1px solid ${color}30` }}>
            <div style={{ position: "absolute", inset: 20, borderRadius: "50%", border: `1px solid ${color}25` }} />
            <div style={{ position: "absolute", inset: 60, borderRadius: "50%", border: `1px solid ${color}20` }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `conic-gradient(${color}55, transparent 30%)`, animation: "spin 2.6s linear infinite" }} />
          </div>
        </div>
      )}
      {motif === "checklist" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, padding: "0 20%" }}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`animate-fade-in delay-${(i+1)*200}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>✓</span>
              <span style={{ flex: 1, height: 6, borderRadius: 3, background: `${color}25` }} />
            </div>
          ))}
        </div>
      )}
      {motif === "factory" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, paddingBottom: 40 }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{ width: 10, height: 60, borderRadius: 3, background: color, opacity: 0.6, animation: `workerBeat ${0.8 + (i%3)*0.2}s ease-in-out infinite`, animationDelay: `${i*0.1}s`, transformOrigin: "bottom" }} />
          ))}
        </div>
      )}
      {motif === "scan" && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: "10%", right: "10%", top: "-10%", height: 3, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: `0 0 12px ${color}`, animation: "scanLine 1.8s linear infinite" }} />
        </div>
      )}
      {motif === "spark" && (
        <div style={{ position: "absolute", inset: 0 }}>
          {[[20,25],[70,15],[35,60],[80,55],[55,35]].map(([x,y],i) => (
            <span key={i} className="animate-float" style={{ position: "absolute", left: `${x}%`, top: `${y}%`, fontSize: 12 + (i%3)*4, animationDelay: `${i*0.4}s`, opacity: 0.85 }}>✨</span>
          ))}
        </div>
      )}
      {motif === "scales" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>
          <span className="animate-float" style={{ fontSize: 22, animationDelay: "0s" }}>⚖️</span>
        </div>
      )}

      {/* Central icon */}
      <div className="animate-float" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 84, height: 84, borderRadius: 22, background: `linear-gradient(135deg, ${color}, ${color}aa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, boxShadow: `0 12px 40px ${color}55` }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
