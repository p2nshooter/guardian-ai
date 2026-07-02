/* ==============================================================================
 * Portal · Crypto Checkout
 * Shows ONLY enabled methods. Network is the most prominent element so a client
 * can never send on the wrong chain. Flow: pick method → create intent → pay
 * exact amount to the address on the EXACT network → license + invoice issue
 * automatically once confirmed on-chain.
 * Query: /portal/pay?product=legal&package=legal_professional
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { cryptoQrValue } from "@/lib/crypto-qr";

interface PublicMethod { id: string; symbol: string; name: string; network: string; category: string; confirmations: number; }
interface Intent {
  orderId: string; symbol: string; network: string; depositAddress: string;
  amountCrypto: number; amountUsd: number; confirmations: number; expiresAt: string;
}

const NETWORK_COLOR: Record<string, string> = {
  TRC20: "#e11d48", BEP20: "#d97706", Ethereum: "#4f46e5", Bitcoin: "#ea580c",
};

export default function CryptoCheckout() {
  const [methods, setMethods] = useState<PublicMethod[]>([]);
  const [pkg, setPkg] = useState<{ product: string; package: string }>({ product: "", package: "" });
  const [intent, setIntent] = useState<Intent | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [left, setLeft] = useState<number>(0);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setPkg({ product: q.get("product") || "", package: q.get("package") || "" });
    fetch("/api/portal/crypto/methods").then((r) => r.json()).then((j) => setMethods(j.methods || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!intent) return;
    const t = setInterval(() => {
      const ms = new Date(intent.expiresAt).getTime() - Date.now();
      setLeft(Math.max(0, Math.floor(ms / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [intent]);

  async function pick(methodId: string) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/portal/crypto/intent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: pkg.product, packageCode: pkg.package, methodId }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Could not start payment"); return; }
      setIntent(j);
    } finally { setBusy(false); }
  }

  function copy(text: string, what: string) {
    navigator.clipboard?.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1500);
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const sec = String(left % 60).padStart(2, "0");

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 18px 80px", color: "#0a1628" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px" }}>Pay with Crypto</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Your license is issued automatically once the payment confirms on-chain. An invoice is always generated.</p>

      {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 10, padding: "10px 14px", margin: "16px 0", fontSize: 13, fontWeight: 600 }}>{err}</div>}

      {!intent && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Choose a network</div>
          {methods.length === 0 && <div style={{ color: "#94a3b8", fontSize: 14 }}>No crypto methods are currently available.</div>}
          {methods.map((m) => (
            <button key={m.id} disabled={busy} onClick={() => pick(m.id)}
              style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 18px", marginBottom: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", cursor: busy ? "wait" : "pointer", boxShadow: "0 1px 3px rgba(10,22,40,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,rgba(2,132,199,.1),rgba(13,148,136,.1))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{m.symbol}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{m.confirmations} confirmations</div>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#fff", background: NETWORK_COLOR[m.network] || "#475569", borderRadius: 999, padding: "5px 12px", letterSpacing: .4 }}>
                {m.network}
              </span>
            </button>
          ))}
        </div>
      )}

      {intent && (
        <div style={{ marginTop: 22 }}>
          {/* NETWORK — the most prominent, safety-critical element */}
          <div style={{ background: NETWORK_COLOR[intent.network] || "#475569", color: "#fff", borderRadius: 14, padding: "16px 18px", textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 12, opacity: .9, fontWeight: 700, letterSpacing: 1 }}>SEND ONLY ON THIS NETWORK</div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: .5, marginTop: 2 }}>{intent.network}</div>
            <div style={{ fontSize: 12.5, opacity: .95, marginTop: 6 }}>
              Sending {intent.symbol} on any other network — or any other token to this address — will be <strong>permanently lost</strong>.
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(10,22,40,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ background: "#fff", border: "1px solid #eef2f7", borderRadius: 12, padding: 12 }}>
                <QRCodeSVG value={cryptoQrValue(intent.symbol, intent.depositAddress, intent.amountCrypto)} size={156} level="M" />
              </div>
            </div>
            {intent.symbol !== "BTC" && (
              <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 14 }}>
                QR code fills in the address only — enter the exact amount below manually in your wallet.
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>Send exactly</span>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>≈ ${intent.amountUsd.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 900 }}>{intent.amountCrypto} {intent.symbol}</span>
              <button onClick={() => copy(String(intent.amountCrypto), "amount")}
                style={{ fontSize: 12, fontWeight: 700, color: "#0284c7", background: "rgba(2,132,199,.08)", border: "1px solid rgba(2,132,199,.2)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
                {copied === "amount" ? "Copied" : "Copy"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#b45309", marginTop: 4 }}>Send the EXACT amount — it identifies your order.</div>

            <div style={{ marginTop: 16, fontSize: 13, color: "#64748b", fontWeight: 700 }}>To address ({intent.network})</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <code style={{ flex: 1, fontSize: 12.5, wordBreak: "break-all", background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: "9px 12px" }}>{intent.depositAddress}</code>
              <button onClick={() => copy(intent.depositAddress, "addr")}
                style={{ fontSize: 12, fontWeight: 700, color: "#0284c7", background: "rgba(2,132,199,.08)", border: "1px solid rgba(2,132,199,.2)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>
                {copied === "addr" ? "Copied" : "Copy"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid #f1f5f9", fontSize: 13 }}>
              <span style={{ color: "#64748b" }}>Confirmations needed</span>
              <strong>{intent.confirmations}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 13 }}>
              <span style={{ color: "#64748b" }}>Expires in</span>
              <strong style={{ color: left < 300 ? "#dc2626" : "#0a1628" }}>{mm}:{sec}</strong>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 12.5, color: "#64748b", lineHeight: 1.6, textAlign: "center" }}>
            After sending, this page can be closed. Your license and invoice will appear in your dashboard automatically once the payment confirms.
          </div>
          <button onClick={() => setIntent(null)}
            style={{ marginTop: 14, width: "100%", padding: "11px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            ← Choose a different network
          </button>
        </div>
      )}
    </div>
  );
}
