"use client";
/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * FreeProgramBanner — one banner, two states, driven entirely by the program
 * countdown. While the year is running it shows "free full-enterprise access +
 * days left + how to extend". The moment the global end date passes it swaps —
 * with no code edit — to "programme ended, licence required, contact admin".
 * ============================================================================ */
import { useFreeProgram } from "@/lib/use-free-program";

export default function FreeProgramBanner() {
  const p = useFreeProgram();
  if (p.loading) return null;

  const contacts = (
    <span>
      WhatsApp{" "}
      <a href="https://wa.me/6285691234561" style={{ color: "inherit", fontWeight: 800 }}>+62&nbsp;856-9123-4561</a>
      {" · "}
      <a href="mailto:hello@axto.io" style={{ color: "inherit", fontWeight: 800 }}>hello@axto.io</a>
      {" · "}
      <a href="mailto:salam@ulyah.com" style={{ color: "inherit", fontWeight: 800 }}>salam@ulyah.com</a>
    </span>
  );

  if (p.ended) {
    return (
      <div style={{ background: "linear-gradient(135deg,#7f1d1d,#450a0a)", border: "1px solid #b91c1c", borderRadius: 14, padding: "18px 22px", color: "#fecaca" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Free access has ended — a licence is now required</span>
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
          Every app is now locked (read-only) and needs a licence to continue. Your data and files were left untouched.
          There are no self-service prices — contact the admin to arrange a licence: {contacts}.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "linear-gradient(135deg,#0f766e,#0284c7)", borderRadius: 14, padding: "18px 22px", color: "#e0f2fe" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 20 }}>🎁</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
          Full enterprise access — free{p.endISO ? ` until ${p.endISO.slice(0, 10)}` : ""}
        </span>
        {p.daysLeft > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 800, background: "rgba(255,255,255,0.15)", padding: "4px 12px", borderRadius: 999, color: "#fff" }}>
            {p.daysLeft.toLocaleString()} days left
          </span>
        )}
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
        Every AXTO app runs at the full enterprise tier with no licence key and no limits. When the countdown ends the
        apps lock (read-only) — back up your data before then. Need more time on your install? {contacts}.
      </p>
    </div>
  );
}
