/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Client-facing self-service launch-promo trial claim. Draws from the same
 * 100-per-tier pool the admin generates. 1 email + 1 IP + 1 device = 1 trial
 * per product; each claim activates a 7-day trial immediately.
 * ============================================================================ */
"use client";
import { useEffect, useState, useCallback } from "react";
import { PACKAGE_INFO, PRODUCT_NAMES, PRODUCT_ICONS } from "@/lib/stripe";

const PRODUCTS = ["guardian", "orchestra", "vault", "edge", "soc", "compliance", "sentinel", "antivirus", "studio", "legal"];

function tiersFor(product: string) {
  return Object.entries(PACKAGE_INFO)
    .filter(([, v]: any) => v.product === product && !v.isBundle && !v.isTrial)
    .map(([code, v]: any) => ({ code, name: v.name }));
}

// Lightweight, stable device fingerprint (best-effort anti-abuse signal — the
// server also binds by email + IP, so this never needs to be cryptographic).
function deviceFingerprint(): string {
  try {
    const raw = [navigator.userAgent, navigator.language, screen.width + "x" + screen.height, screen.colorDepth,
      new Date().getTimezoneOffset(), (navigator as any).hardwareConcurrency || ""].join("|");
    let h = 0;
    for (let i = 0; i < raw.length; i++) { h = (h << 5) - h + raw.charCodeAt(i); h |= 0; }
    return "fp_" + Math.abs(h).toString(36);
  } catch { return ""; }
}

interface PoolRow { product: string; package_code: string; available: number }
interface ClaimRow { product: string; package_code: string; claimed_at: string }

export default function TrialPromo() {
  const [win, setWin] = useState<{ open: boolean; startsAt: string; endsAt: string } | null>(null);
  const [pool, setPool] = useState<PoolRow[]>([]);
  const [claimed, setClaimed] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/portal/trial-claim", { credentials: "include" });
      const d = await r.json();
      setWin(d.window ?? null);
      setPool(d.pool ?? []);
      setClaimed(d.claimed ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const availFor = (product: string, code: string) => pool.find(p => p.product === product && p.package_code === code)?.available ?? 0;
  const claimedProduct = (product: string) => claimed.find(c => c.product === product);

  async function claim(packageCode: string) {
    setBusy(packageCode); setMsg(null);
    try {
      const r = await fetch("/api/portal/trial-claim", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageCode, fingerprint: deviceFingerprint() }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ kind: "err", text: d.error || "Could not claim trial" }); }
      else {
        setMsg({ kind: "ok", text: `✅ Trial activated! Key: ${d.licenseKey} — valid ${d.trialDays} days. See it in Licenses.` });
        await load();
      }
    } catch (e: any) { setMsg({ kind: "err", text: e?.message || "Network error" }); }
    setBusy(null);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading trial promo…</div>;

  const windowClosed = !win?.open;

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", borderRadius: 16, padding: "24px 26px", marginBottom: 20, color: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#7dd3fc", letterSpacing: "0.5px", textTransform: "uppercase" }}>🎁 Launch Promo · AXTO 2026–2027</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>Free 7-Day Trial — On Us</div>
        <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 8, lineHeight: 1.6, maxWidth: 640 }}>
          Claim a full-featured 7-day trial of any product, courtesy of axto.io. The clock starts the moment you claim.
          One trial per product per person — bound to your email, network and device. Limited pool: when a tier runs out, it&apos;s gone.
        </div>
        {win && (
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 10 }}>
            {win.open ? `Promo open until ${new Date(win.endsAt.replace(" ", "T") + "Z").toLocaleDateString()}` : "Promo is currently closed."}
          </div>
        )}
      </div>

      {msg && (
        <div style={{ background: msg.kind === "ok" ? "#f0fdf4" : "#fef2f2", border: `1.5px solid ${msg.kind === "ok" ? "#86efac" : "#fca5a5"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 18, color: msg.kind === "ok" ? "#166534" : "#dc2626", fontWeight: 700, fontSize: 13, fontFamily: msg.kind === "ok" ? "monospace" : "inherit" }}>
          {msg.text}
        </div>
      )}

      {PRODUCTS.map(product => {
        const tiers = tiersFor(product).filter(t => availFor(product, t.code) > 0 || claimedProduct(product)?.package_code === t.code);
        const anyPool = tiersFor(product).some(t => availFor(product, t.code) > 0);
        const mine = claimedProduct(product);
        if (!anyPool && !mine) return null; // nothing to show for this product
        return (
          <div key={product} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", marginBottom: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{PRODUCT_ICONS[product]}</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: "#0a1628" }}>{PRODUCT_NAMES[product]}</span>
              {mine && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#16a34a", background: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: 6 }}>✓ Trial claimed</span>}
            </div>
            <div style={{ padding: "6px 12px" }}>
              {tiersFor(product).map(t => {
                const avail = availFor(product, t.code);
                const claimedThis = mine?.package_code === t.code;
                const disabledProduct = !!mine; // one trial per product
                if (avail === 0 && !claimedThis) return null;
                return (
                  <div key={t.code} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px", borderBottom: "1px solid #f8fafc" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{avail} trial{avail === 1 ? "" : "s"} left</div>
                    </div>
                    {claimedThis ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>Activated ✓</span>
                    ) : (
                      <button
                        onClick={() => claim(t.code)}
                        disabled={busy === t.code || windowClosed || disabledProduct}
                        title={disabledProduct ? "You already claimed a trial for this product" : windowClosed ? "Promo closed" : ""}
                        style={{
                          padding: "7px 16px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12,
                          cursor: (windowClosed || disabledProduct) ? "not-allowed" : "pointer",
                          background: (windowClosed || disabledProduct) ? "#e2e8f0" : "linear-gradient(135deg,#0284c7,#0d9488)",
                          color: (windowClosed || disabledProduct) ? "#94a3b8" : "#fff", whiteSpace: "nowrap",
                        }}>
                        {busy === t.code ? "…" : "🎁 Claim Trial"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {pool.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13, background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0" }}>
          No trial codes are available right now. Please check back soon.
        </div>
      )}
    </div>
  );
}
