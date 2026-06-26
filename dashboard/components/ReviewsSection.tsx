/* ==============================================================================
 * Public index — customer reviews section. Fetches approved + featured reviews
 * from /api/reviews and renders star ratings, optional company logo/name.
 * Renders nothing if there are no approved reviews (no fake/demo content).
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
"use client";
import { useEffect, useState } from "react";

interface Review {
  id: string; name: string; logo: string; product: string;
  rating: number; title: string; body: string; date: string;
}

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} out of 5 stars`} style={{ letterSpacing: 1 }}>
      {"★★★★★".slice(0, n)}<span style={{ color: "#cbd5e1" }}>{"★★★★★".slice(n)}</span>
    </span>
  );
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((j) => { setReviews(j.reviews || []); setAvg(j.average || 0); setCount(j.count || 0); })
      .catch(() => {});
  }, []);

  if (count === 0) return null; // no approved reviews → show nothing (never fake)

  return (
    <section id="reviews" style={{ padding: "100px 24px", background: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ display: "inline-block", fontSize: 13, fontWeight: 700, letterSpacing: 1, color: "#0284c7", textTransform: "uppercase", marginBottom: 12 }}>Loved by teams</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: "#0a1628", letterSpacing: "-1px", margin: 0, fontFamily: "Sora, sans-serif" }}>What our customers say</h2>
          <div style={{ marginTop: 14, fontSize: 18, color: "#f59e0b", fontWeight: 800 }}>
            <Stars n={Math.round(avg)} /> <span style={{ color: "#334155" }}>{avg.toFixed(1)}</span>
            <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 500 }}> · {count} verified review{count > 1 ? "s" : ""}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22, marginTop: 44 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 24px 20px", display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#f59e0b", fontSize: 18, marginBottom: 12 }}><Stars n={r.rating} /></div>
              {r.title && <div style={{ fontWeight: 800, color: "#0a1628", fontSize: 16, marginBottom: 8 }}>{r.title}</div>}
              <p style={{ color: "#334155", fontSize: 14.5, lineHeight: 1.7, margin: "0 0 18px", flex: 1 }}>{r.body}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
                {r.logo
                  ? <img src={r.logo} alt={r.name} style={{ width: 40, height: 40, borderRadius: 9, objectFit: "contain", background: "#fff", border: "1px solid #e2e8f0" }} />
                  : <div style={{ width: 40, height: 40, borderRadius: 9, background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{(r.name || "?").charAt(0).toUpperCase()}</div>}
                <div>
                  <div style={{ fontWeight: 800, color: "#0a1628", fontSize: 14 }}>{r.name}</div>
                  {r.product && <div style={{ fontSize: 12, color: "#64748b" }}>AXTO {r.product.charAt(0).toUpperCase() + r.product.slice(1)}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
