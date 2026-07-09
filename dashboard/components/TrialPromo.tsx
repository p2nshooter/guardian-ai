/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
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
interface MyReview { product: string; rating: number; status: string }

// Compact 5-star picker + short comment, posted to the same moderated review
// pipeline the public testimonials use (lib/reviews.ts) — one per (client,
// product), scoped here to products the client actually trialed.
function RatingBox({ product, onSubmit }: { product: string; onSubmit: (rating: number, body: string) => Promise<void> }) {
  const [hover, setHover] = useState(0);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!rating) { setErr("Pick a star rating first"); return; }
    if (body.trim().length < 12) { setErr("A couple more words please (min 12 characters)"); return; }
    setBusy(true); setErr(null);
    try { await onSubmit(rating, body.trim()); } catch (e: any) { setErr(e?.message || "Could not submit"); }
    setBusy(false);
  }

  return (
    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginTop: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>How was the {PRODUCT_NAMES[product]} trial?</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: 0, lineHeight: 1, color: n <= (hover || rating) ? "#f59e0b" : "#e2e8f0" }}>★</button>
        ))}
      </div>
      <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={1000} placeholder="What worked, what didn't — your honest take..."
        rows={2} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12.5, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
      {err && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 4 }}>{err}</div>}
      <button onClick={submit} disabled={busy} style={{ marginTop: 8, padding: "7px 16px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", opacity: busy ? 0.7 : 1 }}>
        {busy ? "Sending…" : "Submit rating"}
      </button>
    </div>
  );
}

export default function TrialPromo() {
  const [win, setWin] = useState<{ open: boolean; startsAt: string; endsAt: string } | null>(null);
  const [pool, setPool] = useState<PoolRow[]>([]);
  const [claimed, setClaimed] = useState<ClaimRow[]>([]);
  const [maxProducts, setMaxProducts] = useState(2);
  const [claimedProductCount, setClaimedProductCount] = useState(0);
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
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
      setMaxProducts(d.maxProducts ?? 2);
      setClaimedProductCount(d.claimedProductCount ?? 0);
      try {
        const rr = await fetch("/api/portal/reviews", { credentials: "include" });
        const rd = await rr.json();
        setMyReviews((rd.reviews ?? []).map((x: any) => ({ product: x.product, rating: x.rating, status: x.status })));
      } catch {}
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

  const myReviewFor = (product: string) => myReviews.find(r => r.product === product);

  async function submitRating(product: string, rating: number, body: string) {
    const r = await fetch("/api/portal/reviews", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, rating, body, title: "" }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Could not submit rating");
    setMyReviews(prev => [...prev, { product, rating, status: "pending" }]);
    setMsg({ kind: "ok", text: "✅ Thanks for the feedback! Your rating is on its way to our team." });
  }

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading trial promo…</div>;

  const windowClosed = !win?.open;

  return (
    <div>
      <div className="trial-cta" style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", borderRadius: 16, padding: "24px 26px", marginBottom: 14, color: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#7dd3fc", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          <span className="trial-cta-emoji">🎁</span> Launch Promo · AXTO 2026–2027
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>AXTO just launched — claim a full-featured 7-day Enterprise trial, on us</div>
        <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 8, lineHeight: 1.6, maxWidth: 640 }}>
          Every tier's complete feature set, no limits, courtesy of axto.io. The clock starts the moment you claim.
          One trial per product per person, up to {maxProducts} different products — bound to your email, network and device.
          Limited pool: when a tier runs out, it&apos;s gone. Like what you tested? Continuing to a real license gets you
          50% off your first year, automatically.
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap" }}>
          {win && <span>{win.open ? `Promo open until ${new Date(win.endsAt.replace(" ", "T") + "Z").toLocaleDateString()}` : "Promo is currently closed."}</span>}
          <span>{claimedProductCount}/{maxProducts} trial products claimed</span>
        </div>
      </div>

      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "14px 18px", marginBottom: 20, fontSize: 12.5, color: "#075985", lineHeight: 1.6 }}>
        <strong>Two ways to try AXTO:</strong> This <em>Launch Promo</em> pool gives you the full Enterprise tier
        of any product for 7 days, unlimited features — but the pool is limited and one-time per product/person.
        If it's empty or you want a quicker start, every product also has its own always-available <strong>core-feature
        trial</strong> (limited requests, watermarked, 1 device) — pick any &quot;Trial&quot; plan on the{" "}
        <a href="/register" style={{ color: "#0284c7", fontWeight: 700 }}>Register</a> page, no waiting.
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
                const productCapped = !mine && claimedProductCount >= maxProducts; // hit the N-distinct-products cap
                const disabledProduct = !!mine || productCapped;
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
                        title={mine ? "You already claimed a trial for this product" : productCapped ? `You've reached the ${maxProducts}-product trial limit` : windowClosed ? "Promo closed" : ""}
                        style={{
                          padding: "7px 16px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 12,
                          cursor: (windowClosed || disabledProduct) ? "not-allowed" : "pointer",
                          background: (windowClosed || disabledProduct) ? "#e2e8f0" : "linear-gradient(135deg,#0284c7,#0d9488)",
                          color: (windowClosed || disabledProduct) ? "#94a3b8" : "#fff", whiteSpace: "nowrap",
                        }}>
                        {busy === t.code ? "…" : productCapped ? "Limit reached" : "🎁 Claim Trial"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {mine && (
              <div style={{ padding: "0 12px 12px" }}>
                {myReviewFor(product) ? (
                  <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#166534" }}>
                    Thanks — you rated this trial {"⭐".repeat(myReviewFor(product)!.rating)}
                    {myReviewFor(product)!.status === "pending" ? " (awaiting review)" : ""}.
                  </div>
                ) : (
                  <RatingBox product={product} onSubmit={(rating, body) => submitRating(product, rating, body)} />
                )}
              </div>
            )}
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
