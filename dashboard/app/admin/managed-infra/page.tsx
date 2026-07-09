/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Admin · Managed Infrastructure — architecture note (PLANNING ONLY).
 * Per the product owner's directive, nothing described here is built yet.
 * This page exists so the plan is recorded in one clear place before work
 * starts, once the full-ecosystem test/report (see Trial Batch → ratings and
 * the platform-wide QA pass) confirms the BYOX products are 100% solid.
 * ============================================================================ */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser } from "@/lib/client-auth";
import Link from "next/link";

const COMPONENTS = [
  {
    icon: "🎼", title: "Orchestra Core (Managed)",
    body: "A separately-scaled deployment of the Orchestra engine — sized and isolated for many concurrent tenants, not a single self-hosted install. This is a distinct build from the client-downloadable Orchestra Core, not the same binary running \"harder.\"",
  },
  {
    icon: "⚙️", title: "GPU / CPU Worker Pool",
    body: "Centrally-operated, autoscaling compute pool with per-tenant isolation, so one Managed client's workload never starves another's.",
  },
  {
    icon: "🔌", title: "WebSocket + REST Gateway",
    body: "The live connection surface a Managed client's app talks to instead of its own self-hosted engine — REST for request/response, WebSocket for streaming and real-time workloads.",
  },
  {
    icon: "🧠", title: "Central AI / GPU Key Vault",
    body: "Already built at Admin → AI Provider Keys — AES-256-GCM encrypted, admin-only. Keys flagged \"managed pool\" there are earmarked for this system and are never referenced by any client-facing code path.",
    link: { href: "/admin/ai-keys", label: "Open AI Provider Keys →" },
  },
  {
    icon: "📚", title: "Per-product data depth",
    body: "The Managed tier needs deeper source data than the BYOK self-hosted version can carry locally. Example: AXTO Legal's Managed tier needs a real-time-synced database of open legal sources (case law, statutes, regulations from public jurisdictional APIs) — the self-hosted BYOK version doesn't ship this at scale.",
  },
];

const CHECKLIST = [
  "Full-ecosystem test complete — zero bugs, zero inconsistencies, no SLA claims anywhere (see the platform-wide QA pass)",
  "Orchestra Core Managed variant designed and load-tested at multi-tenant scale",
  "GPU/CPU worker pool provisioned with per-tenant isolation",
  "WebSocket + REST gateway built and security-reviewed",
  "Per-product \"10× the self-hosted version\" capability audit signed off, product by product",
  "Managed-tier pricing model defined (rental of AXTO's own infra/API, distinct from BYOX license pricing)",
  "Managed tier opened for one pilot product before wider rollout",
];

export default function ManagedInfraPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSessionUser().then(u => {
      if (!u || u.role !== "admin") { router.push("/auth/login"); return; }
      setReady(true);
    });
  }, [router]);

  if (!ready) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", padding: "28px 32px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>← Back to Dashboard</Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, marginBottom: 6 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0a1628", margin: 0 }}>🏗️ Managed Infrastructure</h1>
          <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: "rgba(245,158,11,0.12)", color: "#b45309" }}>PLANNING — NOT BUILT</span>
        </div>
        <p style={{ color: "#64748b", fontSize: 13.5, marginBottom: 24, lineHeight: 1.7 }}>
          A record of the architecture for AXTO's future <strong>Managed</strong> tier — for clients who don&apos;t want to
          bring their own keys/infrastructure (BYOX) and would rather rent access to AXTO&apos;s own centrally-operated
          infrastructure and AI/GPU capacity. Every current product is BYOX/self-hosted; Managed will eventually sit
          alongside it as a second delivery mode, product by product.
        </p>

        <div style={{ background: "#fff", border: "1.5px solid #fde68a", borderLeft: "4px solid #f59e0b", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#92400e", marginBottom: 4 }}>Build sequencing</div>
          <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.7 }}>
            Nothing on this page is deployed. Build starts only after the full-ecosystem test confirms every existing
            BYOX product is 100% production-ready — zero bugs, zero inconsistencies, no SLA promises — with the report
            visible in the admin portal.
          </div>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #fca5a5", borderLeft: "4px solid #dc2626", borderRadius: 12, padding: "16px 20px", marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#991b1b", marginBottom: 4 }}>🔒 Security boundary</div>
          <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.7 }}>
            Managed infrastructure credentials are entered and encrypted in this admin portal only. They must never
            reach any client-facing surface — the exact boundary already enforced by the AI Provider Key Vault
            (admin-only route, never imported by client code).
          </div>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#0a1628", marginBottom: 6 }}>The hard requirement — every Managed capability must be 10×</div>
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
            Every product's Managed tier must be measurably more scalable, more powerful, more optimized, and more
            flexible than what a client downloads and self-hosts — not the same engine running on bigger hardware.
            This is a go/no-go gate checked per product before it ships in Managed form.
          </div>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0a1628", marginBottom: 12 }}>Core components</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {COMPONENTS.map(c => (
            <div key={c.title} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px", display: "flex", gap: 14 }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{c.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0a1628", marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65 }}>{c.body}</div>
                {c.link && <Link href={c.link.href} style={{ display: "inline-block", marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "#0284c7" }}>{c.link.label}</Link>}
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0a1628", marginBottom: 12 }}>Before this is built</h2>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 22px", marginBottom: 40 }}>
          {CHECKLIST.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: i > 0 ? "1px solid #f1f5f9" : "none" }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid #cbd5e1", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
