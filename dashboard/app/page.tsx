/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { PACKAGE_INFO, isProductForSale } from "@/lib/stripe";
import ReviewsSection from "@/components/ReviewsSection";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

// ── Updated pricing (USD, market-competitive, BYOK premium) ─────────────
const GUARDIAN_PRICING = [
  {
    name: "Sentinel",
    code: "lite",
    price: 990,
    period: "/year",
    servers: "1 server",
    desc: "Deploy enterprise-grade AI threat detection on your most critical server — from a home lab to a production workload. Your keys, your infrastructure, absolute privacy.",
    features: ["7-Layer AI Behavioral Analysis","Real-time Global Threat Intelligence","Automated Quarantine & Kill","Built-in ClamAV Antivirus Engine","Email, Slack & Discord Alerts","Self-Learning Malware Detection"],
    popular: false,
    color: "#0284c7",
  },
  {
    name: "Professional",
    code: "pro",
    price: 4990,
    period: "/year",
    servers: "Up to 25 servers",
    desc: "Complete infrastructure visibility with AI-powered threat hunting. From a startup rack to a growing enterprise — compliance-ready, self-hosted, BYOK.",
    features: ["Everything in Sentinel","AI Threat Hunting & UEBA Analytics","Multi-Server Central Command","SOC 2, ISO 27001, HIPAA, PCI-DSS Reports","SIEM Forwarding (Splunk, ELK, Datadog)","Standalone Antivirus with REST API"],
    popular: true,
    color: "#0284c7",
  },
  {
    name: "Business",
    code: "shield",
    price: 19900,
    period: "/year",
    servers: "Up to 100 servers",
    desc: "Enterprise-grade kernel-level inspection with eBPF and encrypted node mesh. Zero blind spots. Zero data leaves your network. Zero compromise.",
    features: ["Everything in Professional","eBPF Deep Kernel Inspection","mTLS Encrypted Node Mesh","Rootkit & Memory Forensics","Custom Incident Runbooks","Deception Engine (Honeypots & Decoys)"],
    popular: false,
    color: "#0284c7",
  },
  {
    name: "Enterprise",
    code: "aegis",
    price: 79000,
    period: "/year",
    servers: "Up to 1,000 servers",
    desc: "Global-scale protection for organizations that demand absolute sovereignty. Multi-tenant architecture, white-label ready, custom threat intelligence.",
    features: ["Everything in Business","1,000 Node Global Scale","White-Label Dashboard","Custom Threat Intelligence Feed","Multi-Tenant Architecture","Comprehensive Interactive Setup Guide (10 Languages)"],
    popular: false,
    color: "#7c3aed",
  },
];

const ORCHESTRA_PRICING = [
  {
    name: "Starter",
    code: "orchestra_core",
    price: 34900,
    period: "/year",
    workers: "Up to 10 workers",
    desc: "Route AI workloads across OpenAI, Claude, Gemini, Groq, DeepSeek & 15+ providers with intelligent cost optimization. Your API keys, your control.",
    features: ["CPU & GPU Auto-Detect Workers","Smart Routing (5 Strategies)","OpenAI, Claude, Gemini, Groq, Ollama","Cost Optimization & Budget Caps","Real-time Analytics Dashboard","OpenAI-Compatible Drop-in API"],
    popular: false,
  },
  {
    name: "Professional",
    code: "orchestra_scale",
    price: 89900,
    period: "/year",
    workers: "Up to 50 workers",
    desc: "Scale AI operations across multiple teams with advanced failover, autoscaling, and cost analytics. Built for organizations that run AI at the core of their business.",
    features: ["Everything in Starter","All 6 Routing Strategies","Priority Job Queue & Dead Letter","Autoscaler (scale-to-zero capable)","Federated Multi-Region Support","Custom Provider Endpoints"],
    popular: true,
  },
  {
    name: "Enterprise",
    code: "orchestra_unlimited",
    price: 249000,
    period: "/year",
    workers: "Unlimited workers",
    desc: "Unlimited scale. Full sovereignty. White-label ready. For enterprises that demand absolute control over their AI infrastructure.",
    features: ["Everything in Professional","Unlimited Workers (CPU + GPU)","White-Label API Gateway","Custom Routing Logic","Credential Vault & Rotation","Comprehensive Interactive Setup Guide (10 Languages)"],
    popular: false,
  },
];

const BUNDLE_PRICING = [
  {
    name: "Starter Bundle",
    code: "bundle_starter",
    guardian: "Guardian Professional",
    orchestra: "Orchestra Starter",
    originalPrice: 4990 + 34900,
    bundlePrice: 33900,
    savings: 4990 + 34900 - 33900,
    color: "#0284c7",
    highlight: false,
  },
  {
    name: "Professional Bundle",
    code: "bundle_professional",
    guardian: "Guardian Business",
    orchestra: "Orchestra Professional",
    originalPrice: 19900 + 89900,
    bundlePrice: 93300,
    savings: 19900 + 89900 - 93300,
    color: "#0d9488",
    highlight: true,
  },
  {
    name: "Enterprise Bundle",
    code: "bundle_enterprise",
    guardian: "Guardian Enterprise",
    orchestra: "Orchestra Enterprise",
    originalPrice: 79000 + 249000,
    bundlePrice: 278800,
    savings: 79000 + 249000 - 278800,
    color: "#7c3aed",
    highlight: false,
  },
];

const GUARDIAN_FEATURES = [
  { icon: "🔬", title: "AI Behavioral Analysis", desc: "Detect zero-day threats that signature-based tools miss, by profiling process behavior in real time — no rule updates needed." },
  { icon: "🌐", title: "Live Threat Intelligence", desc: "Continuously refreshed global threat feeds — malicious IPs, C2 domains, and known malware hashes updated in real time." },
  { icon: "⚡", title: "Automated Response", desc: "Instantly quarantine compromised files, kill rogue processes, and block attacker IPs — all before your team is even paged." },
  { icon: "🔐", title: "eBPF Deep Inspection", desc: "Kernel-level visibility into every system call, network event, and file operation. Impossible for attackers to hide from." },
  { icon: "📊", title: "Compliance Automation", desc: "One-click audit reports for SOC 2, ISO 27001, HIPAA, and PCI-DSS. Turn weeks of manual work into minutes." },
  { icon: "🤖", title: "AI Support Assistant", desc: "Built-in AI analyst explains every threat alert in plain language, suggests remediation steps, and answers security questions." },
];

const ORCHESTRA_FEATURES = [
  { icon: "⚡", title: "Intelligent Job Routing", desc: "6 routing strategies: cost, latency, load, quality, failover, and custom. Automatically select the best provider for every request." },
  { icon: "🔄", title: "Universal AI Provider Pool", desc: "OpenAI, Anthropic Claude, Google Gemini, Groq, Mistral, Ollama, and any OpenAI-compatible endpoint. Switch without code changes." },
  { icon: "🖥️", title: "GPU Cluster Orchestration", desc: "Manage your own GPU workers alongside cloud providers. Auto-scale workers based on queue depth and cost thresholds." },
  { icon: "💰", title: "Cost Intelligence", desc: "Track spend per provider, per model, per team. Route to cheaper providers during off-peak hours. Reduce AI costs by 30-60%." },
  { icon: "🔁", title: "Zero-Downtime Failover", desc: "If any provider has an outage, in-flight requests automatically retry on the next available provider within milliseconds." },
  { icon: "📈", title: "Deep Analytics", desc: "Token usage, p50/p95 latency, cost trends, error rates — all in one dashboard. Export to Grafana, Datadog, or any SIEM." },
];

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", "@id": `${APP_URL}/#org`, name: "AXTO", url: APP_URL,
      email: "hallo@axto.io",
      description: "AI eXecution & Tools Orchestration. 100% BYOK — your keys, your data, your infrastructure.",
    },
    {
      "@type": "SoftwareApplication", name: "Guardian AI",
      applicationCategory: "SecurityApplication", operatingSystem: "Linux",
      offers: GUARDIAN_PRICING.map(p => ({ "@type": "Offer", name: `Guardian ${p.name}`, price: String(p.price), priceCurrency: "USD", billingDuration: "P1Y" })),
      description: "Guardian AI — self-hosted threat detection, automated incident response, and compliance reporting.",
      provider: { "@id": `${APP_URL}/#org` },
    },
    {
      "@type": "SoftwareApplication", name: "Orchestra AI",
      applicationCategory: "DeveloperApplication", operatingSystem: "Linux",
      offers: ORCHESTRA_PRICING.map(p => ({ "@type": "Offer", name: `Orchestra ${p.name}`, price: String(p.price), priceCurrency: "USD", billingDuration: "P1Y" })),
      description: "Self-hosted AI workflow orchestration. Route jobs across GPU clusters and multiple LLM providers with your own API keys.",
      provider: { "@id": `${APP_URL}/#org` },
    },
  ],
};

// ── Coming Soon / Buy Button helper ─────────────────────────────────────
function LocalPriceTag({ usd, period }: { usd: number; period?: string }) {
  const { currency, fmtPrice } = useLocale();
  if (currency === "USD" || usd === 0) return null;
  return (
    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
      ≈ {fmtPrice(usd)}{period || ""}
    </div>
  );
}

/** Reusable price display: shows USD price with local currency subtitle */
function PriceDisplay({ usd, period, color }: { usd: number; period?: string; color?: string }) {
  return (
    <>
      <div className="price-tag" style={{ marginBottom: 2, color: color || "#0a1628" }}>
        <sup>$</sup>{usd.toLocaleString("en-US")}
      </div>
      <LocalPriceTag usd={usd} period={period || "/yr"} />
    </>
  );
}

function ProductBuyButton({ code, popular, color, label }: { code: string; popular?: boolean; color: string; label?: string }) {
  const forSale = (PACKAGE_INFO[code]?.forSale !== false);
  if (!forSale) {
    return (
      <div style={{ display: "block", textAlign: "center", padding: "14px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1.5px solid rgba(148,163,184,0.2)", cursor: "not-allowed", position: "relative" }}>
        🔜 Coming Soon
      </div>
    );
  }
  return (
    <Link href={`/register?pkg=${code}`} style={{ display: "block", textAlign: "center", padding: "14px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", background: popular ? `linear-gradient(135deg,${color},${color}cc)` : "transparent", color: popular ? "#fff" : color, border: popular ? "none" : `1.5px solid ${color}`, boxShadow: popular ? `0 4px 20px ${color}40` : "none" }}>
      {label || "Get Started"}
    </Link>
  );
}

function ComingSoonBanner({ product, color }: { product: string; color: string }) {
  if (isProductForSale(product)) return null;
  return (
    <div style={{ textAlign: "center", marginBottom: 24, padding: "12px 20px", borderRadius: 12, background: `${color}08`, border: `1.5px dashed ${color}40`, display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 20 }}>🔜</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>Coming Soon — Not Yet Available for Purchase</span>
    </div>
  );
}

// ── Inline SVG animations ───────────────────────────────────────────────

function GuardianAnimation() {
  return (
    <div style={{ position: "relative", width: "100%", height: 280, overflow: "hidden", borderRadius: 16 }}>
      <svg width="100%" height="280" viewBox="0 0 480 280" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(2,132,199,0.08)" strokeWidth="0.5"/>
          </pattern>
          <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0)" />
            <stop offset="50%" stopColor="rgba(56,189,248,0.4)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </linearGradient>
          <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <rect width="480" height="280" fill="url(#grid)"/>

        {/* Central server rack */}
        <g transform="translate(170, 70)">
          <rect x="0" y="0" width="140" height="140" rx="12" fill="white" stroke="rgba(2,132,199,0.2)" strokeWidth="1.5"/>
          {/* Server units */}
          {[0,1,2,3,4].map(i => (
            <g key={i} transform={`translate(12, ${16 + i*24})`}>
              <rect width="116" height="18" rx="4" fill={i===2 ? "rgba(239,68,68,0.1)" : "rgba(2,132,199,0.06)"} stroke={i===2 ? "rgba(239,68,68,0.3)" : "rgba(2,132,199,0.12)"} strokeWidth="1"/>
              <circle cx="8" cy="9" r="3" fill={i===2 ? "#ef4444" : "#22c55e"}>
                {i===2 && <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite"/>}
              </circle>
              <rect x="18" y="5" width="60" height="3" rx="1.5" fill="rgba(2,132,199,0.15)"/>
              <rect x="18" y="10" width="40" height="3" rx="1.5" fill="rgba(2,132,199,0.1)"/>
              {i===2 && (
                <text x="85" y="12" fill="#ef4444" fontSize="8" fontWeight="700" fontFamily="monospace">
                  THREAT
                  <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
                </text>
              )}
            </g>
          ))}
          {/* Scan line */}
          <rect x="0" y="0" width="140" height="12" rx="0" fill="url(#scanGrad)" opacity="0.9">
            <animateTransform attributeName="transform" type="translate" from="0,0" to="0,140" dur="2.5s" repeatCount="indefinite"/>
          </rect>
          {/* Shield overlay on threat */}
          <g opacity="0">
            <rect x="0" y="56" width="140" height="26" rx="0" fill="rgba(239,68,68,0.08)"/>
            <animate attributeName="opacity" values="0;0;1;1;0" dur="3s" repeatCount="indefinite" keyTimes="0;0.3;0.5;0.8;1"/>
          </g>
        </g>

        {/* Shield icon */}
        <g transform="translate(222,90)">
          <path d="M18 2L4 7v7c0 8 14 14 14 14s14-6 14-14V7L18 2z" fill="url(#shieldGrad)" opacity="0.15">
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur="2s" repeatCount="indefinite"/>
          </path>
          <path d="M18 2L4 7v7c0 8 14 14 14 14s14-6 14-14V7L18 2z" fill="none" stroke="#0284c7" strokeWidth="1.5"/>
        </g>

        {/* Left threat node */}
        <g transform="translate(40, 110)">
          <rect width="90" height="60" rx="10" fill="white" stroke="rgba(239,68,68,0.25)" strokeWidth="1.5"/>
          <text x="12" y="22" fill="#64748b" fontSize="9" fontWeight="600">Incoming Threat</text>
          <text x="12" y="38" fill="#ef4444" fontSize="11" fontWeight="700" fontFamily="monospace">
            185.234.x.x
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
          </text>
          <text x="12" y="52" fill="#94a3b8" fontSize="8">Port scan detected</text>
          <circle cx="78" cy="12" r="5" fill="#ef4444">
            <animate attributeName="r" values="5;8;5" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite"/>
          </circle>
        </g>

        {/* Arrow threat → server */}
        <line x1="130" y1="140" x2="170" y2="140" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2">
          <animate attributeName="stroke-dashoffset" values="0;-12" dur="0.8s" repeatCount="indefinite"/>
        </line>
        <text x="137" y="135" fill="#ef4444" fontSize="8">blocked</text>

        {/* Right: alert output */}
        <g transform="translate(320, 80)">
          <rect width="110" height="120" rx="10" fill="white" stroke="rgba(2,132,199,0.15)" strokeWidth="1.5"/>
          <text x="10" y="18" fill="#0284c7" fontSize="9" fontWeight="700">GUARDIAN ALERTS</text>
          {[
            { t: "Process killed", c: "#ef4444", d: "0s" },
            { t: "IP blocked", c: "#f97316", d: "0.3s" },
            { t: "File quarantined", c: "#eab308", d: "0.6s" },
            { t: "Alert sent", c: "#22c55e", d: "0.9s" },
            { t: "✓ System clean", c: "#0d9488", d: "1.2s" },
          ].map((a, i) => (
            <g key={i} transform={`translate(8, ${28 + i*18})`} opacity="0">
              <rect width="94" height="14" rx="3" fill={`${a.c}15`}/>
              <circle cx="6" cy="7" r="3" fill={a.c}/>
              <text x="14" y="10" fill={a.c} fontSize="8" fontWeight="600">{a.t}</text>
              <animate attributeName="opacity" values="0;0;1;1" dur={`${3 + parseFloat(a.d)}s`} begin={a.d} repeatCount="indefinite" keyTimes="0;0.2;0.3;1"/>
            </g>
          ))}
        </g>

        {/* Arrow server → alerts */}
        <line x1="310" y1="140" x2="320" y2="140" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2">
          <animate attributeName="stroke-dashoffset" values="0;-12" dur="0.8s" repeatCount="indefinite"/>
        </line>

        {/* Label */}
        <text x="240" y="258" fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="600">
          Guardian AI — Real-time threat detection & automated response
        </text>
      </svg>
    </div>
  );
}

function OrchestraAnimation() {
  return (
    <div style={{ position: "relative", width: "100%", height: 280, overflow: "hidden", borderRadius: 16 }}>
      <svg width="100%" height="280" viewBox="0 0 480 280" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="ogrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(13,148,136,0.07)" strokeWidth="0.5"/>
          </pattern>
          <linearGradient id="routerGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0d9488"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </linearGradient>
        </defs>
        <rect width="480" height="280" fill="url(#ogrid)"/>

        {/* Central orchestra router */}
        <g transform="translate(190, 100)">
          <rect width="100" height="80" rx="14" fill="url(#routerGrad)" opacity="0.9"/>
          <text x="50" y="30" fill="white" fontSize="9" fontWeight="700" textAnchor="middle">ORCHESTRA</text>
          <text x="50" y="44" fill="rgba(255,255,255,0.8)" fontSize="8" textAnchor="middle">ROUTER</text>
          {/* Pulsing ring */}
          <circle cx="50" cy="40" r="42" fill="none" stroke="rgba(13,148,136,0.3)" strokeWidth="2">
            <animate attributeName="r" values="42;55;42" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/>
          </circle>
          {/* Job counter */}
          <text x="50" y="62" fill="white" fontSize="11" fontWeight="800" textAnchor="middle">
            <animate attributeName="textLength" values="20;20" dur="0.1s"/>
            247 req/s
          </text>
          <text x="50" y="74" fill="rgba(255,255,255,0.7)" fontSize="7" textAnchor="middle">routing now</text>
        </g>

        {/* Left input: API request */}
        <g transform="translate(16, 100)">
          <rect width="100" height="80" rx="10" fill="white" stroke="rgba(13,148,136,0.2)" strokeWidth="1.5"/>
          <text x="10" y="18" fill="#0d9488" fontSize="9" fontWeight="700">AI REQUESTS</text>
          {["GPT-4 call","Claude opus","Gemini Pro","Llama-3 70B"].map((r,i)=>(
            <g key={i} transform={`translate(6, ${24+i*14})`}>
              <rect width="88" height="12" rx="2" fill={`rgba(13,148,136,${0.05+i*0.02})`} stroke="rgba(13,148,136,0.1)"/>
              <text x="6" y="9" fill="#334155" fontSize="7.5" fontWeight="500">{r}</text>
              <circle cx="82" cy="6" r="2.5" fill="#0d9488">
                <animate attributeName="opacity" values="1;0.2;1" dur={`${0.8+i*0.3}s`} repeatCount="indefinite"/>
              </circle>
            </g>
          ))}
        </g>

        {/* Arrow input → router */}
        <line x1="116" y1="140" x2="190" y2="140" stroke="#0d9488" strokeWidth="2" strokeDasharray="5 3">
          <animate attributeName="stroke-dashoffset" values="0;-16" dur="0.7s" repeatCount="indefinite"/>
        </line>

        {/* Right output: providers */}
        <g>
          {[
            { name:"OpenAI",    y:40,  cost:"$0.012/1K", lat:"320ms", fill:"#10a37f" },
            { name:"Claude",    y:100, cost:"$0.015/1K", lat:"290ms", fill:"#d97706" },
            { name:"Gemini",    y:160, cost:"$0.007/1K", lat:"410ms", fill:"#4285f4" },
            { name:"Ollama",    y:220, cost:"$0.000/1K", lat:"180ms", fill:"#7c3aed" },
          ].map((p,i)=>(
            <g key={i} transform={`translate(354, ${p.y})`}>
              <rect width="110" height="48" rx="8" fill="white" stroke={`${p.fill}30`} strokeWidth="1.5"/>
              <circle cx="14" cy="24" r="8" fill={`${p.fill}20`}/>
              <text x="14" y="28" fill={p.fill} fontSize="9" fontWeight="800" textAnchor="middle">{p.name[0]}</text>
              <text x="28" y="18" fill="#0f172a" fontSize="9" fontWeight="700">{p.name}</text>
              <text x="28" y="30" fill="#64748b" fontSize="7.5">{p.cost}</text>
              <text x="28" y="41" fill={p.lat==="180ms"?"#0d9488":"#64748b"} fontSize="7.5" fontWeight={p.lat==="180ms"?"700":"400"}>{p.lat}</text>
              {/* active indicator */}
              <circle cx="102" cy="8" r="3" fill="#22c55e" opacity={i===0||i===3?1:0.3}/>
            </g>
          ))}
        </g>

        {/* Router → provider lines */}
        {[40+24, 100+24, 160+24, 220+24].map((y,i)=>(
          <line key={i} x1="290" y1="140" x2="354" y2={y} stroke={i===0||i===3?"#0d9488":"rgba(13,148,136,0.2)"} strokeWidth={i===0||i===3?2:1} strokeDasharray="4 3">
            {(i===0||i===3) && <animate attributeName="stroke-dashoffset" values="0;-14" dur="0.6s" repeatCount="indefinite"/>}
          </line>
        ))}

        {/* Route label */}
        <g transform="translate(300,120)">
          <rect width="48" height="16" rx="8" fill="rgba(13,148,136,0.1)" stroke="rgba(13,148,136,0.3)"/>
          <text x="24" y="11" fill="#0d9488" fontSize="7.5" fontWeight="700" textAnchor="middle">COST MODE</text>
        </g>

        <text x="240" y="258" fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="600">
          Orchestra AI — Smart routing across GPU workers &amp; AI providers
        </text>
      </svg>
    </div>
  );
}

export default function HomePage() {
  const { t, fmtPrice, locale, setLocale, currency, fxRate, fxSymbol } = useLocale();

  // Legacy compat - same function name, uses context
  const fmtUSD = fmtPrice;

  // ── Live prices from DB (admin-editable, no deploy needed) ─────────────
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  useEffect(() => {
    fetch("/api/packages")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.prices) {
          const m: Record<string, number> = {};
          for (const [code, v] of Object.entries(d.prices as Record<string, any>)) {
            m[code] = v.price ?? 0;
          }
          setLivePrices(m);
        }
      })
      .catch(() => {}); // silently fall back to static prices on error
  }, []);

  // Helper: get live price with static fallback
  function lp(code: string, staticPrice: number): number {
    return livePrices[code] && livePrices[code] > 0 ? livePrices[code] : staticPrice;
  }


  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />

      {/* ── NAVBAR ────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(240,249,255,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(2,132,199,0.12)",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 12px rgba(2,132,199,0.3)" }}>🛡</div>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif", letterSpacing: "-0.5px" }}>AXTO</span>
          </Link>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {[["#products","Platform"],["#features","Products"],["#pricing","Pricing"],["#vault","Vault"],["#soc","SOC"],["#compliance","Compliance"],["#edge","Edge"],["#sentinel","Sentinel"],["#studio","Studio"],["#byok","BYOK"],["#faq","FAQ"],["/guide","📖 Guide"]].map(([href,label])=>(
              <a key={label} href={href} style={{ color: "#475569", fontSize: 14, fontWeight: 600, padding: "8px 14px", borderRadius: 8, transition: "all 0.15s", textDecoration: "none" }}
                onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background="rgba(2,132,199,0.08)";(e.currentTarget as HTMLElement).style.color="#0284c7";}}
                onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background="transparent";(e.currentTarget as HTMLElement).style.color="#475569";}}
              >{label}</a>
            ))}
            <Link href="/register" style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: "#0284c7", textDecoration: "none", borderRadius: 8, border: "1.5px solid #0284c7", marginLeft: 4 }}>
              Register
            </Link>
            <Link href="/auth/login" className="btn-primary" style={{ padding: "9px 22px", fontSize: 14, marginLeft: 4 }}>
              Client Portal →
            </Link>

          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="hero-bg mesh-grid" style={{ paddingTop: 100, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, position: "relative", overflow: "hidden" }}>
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative" }}>
          {/* Trust badge */}
          <div className="animate-fade-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "7px 20px", fontSize: 13, color: "#0284c7", fontWeight: 700, marginBottom: 28 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            {t("hero.badge")}
          </div>

          <h1 className="font-display animate-fade-up delay-100" style={{ fontSize: "clamp(36px, 5.5vw, 64px)", fontWeight: 800, lineHeight: 1.08, marginBottom: 24, color: "#0a1628", letterSpacing: "-1.5px" }}>
            AI eXecution & Tools Orchestration<br />
            <span className="gradient-text">You Own & Control</span>
          </h1>

          <p className="animate-fade-up delay-200" style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#475569", lineHeight: 1.7, maxWidth: 680, margin: "0 auto 40px" }}>
            Defend your servers with AI-powered cybersecurity. Orchestrate AI workloads across GPU clusters.
            Your API keys, your data, your infrastructure — <strong style={{ color: "#0284c7" }}>AXTO never touches any of it.</strong>
          </p>

          <div className="animate-fade-up delay-300" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
            <a href="#pricing" className="btn-primary" style={{ fontSize: 16, padding: "15px 36px" }}>Explore Plans →</a>
            <a href="#features" className="btn-secondary" style={{ fontSize: 16, padding: "15px 36px" }}>See How It Works</a>
          </div>

          {/* Stats row */}
          <div className="animate-fade-up delay-400" style={{ display: "flex", gap: 0, justifyContent: "center", flexWrap: "wrap", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(2,132,199,0.12)", borderRadius: 20, padding: "24px 8px", maxWidth: 720, margin: "0 auto", boxShadow: "0 4px 24px rgba(2,132,199,0.08)" }}>
            {[
              { value: "100%", label: "BYOK — Your Keys Only", icon: "🔑" },
              { value: "0 bytes", label: "Data Sent to AXTO", icon: "🛡️" },
              { value: "< 30 min", label: "Deployment Time", icon: "⚡" },
              { value: "9 products", label: "Complete Platform", icon: "📈" },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: "1 1 140px", textAlign: "center", padding: "8px 16px", borderRight: i < 3 ? "1px solid rgba(2,132,199,0.1)" : "none" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0284c7", fontFamily: "Sora, sans-serif" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUARDIAN FEATURES ─────────────────────────────────────── */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Guardian header */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 16 }}>SECURITY ENGINE</span>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1px", marginBottom: 14 }}>
            Guardian AI — <span className="gradient-text">Server Protection</span>
          </h2>
          <p style={{ color: "#475569", fontSize: 17, maxWidth: 580, margin: "0 auto 48px", lineHeight: 1.7 }}>
            AI-powered threat detection that runs entirely on your infrastructure. Detect, quarantine, and respond — automatically.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, marginBottom: 64 }}>
          {/* Animation card */}
          <div className="card" style={{ padding: 24, gridColumn: "1 / -1" }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0a1628", marginBottom: 4 }}>Guardian AI — Live Threat Detection</h3>
              <p style={{ fontSize: 13, color: "#64748b" }}>Guardian continuously scans every file, process and network connection — automatically quarantining threats</p>
            </div>
            <div style={{ background: "linear-gradient(135deg, #f0f9ff, #ecfdf5)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(2,132,199,0.1)" }}>
              <GuardianAnimation />
            </div>
          </div>

          {GUARDIAN_FEATURES.map((f, i) => (
            <div key={f.title} className="card animate-fade-up" style={{ padding: 28 }} data-delay={i * 100}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, rgba(2,132,199,0.1), rgba(13,148,136,0.1))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", marginBottom: 10, letterSpacing: "-0.3px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Orchestra header */}
        <div style={{ textAlign: "center", marginBottom: 16, marginTop: 40 }}>
          <span style={{ display: "inline-block", background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0d9488", fontWeight: 700, marginBottom: 16 }}>ORCHESTRATION ENGINE</span>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1px", marginBottom: 14 }}>
            Orchestra AI — <span style={{ background: "linear-gradient(135deg,#0d9488,#0284c7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Workload Orchestration</span>
          </h2>
          <p style={{ color: "#475569", fontSize: 17, maxWidth: 580, margin: "0 auto 48px", lineHeight: 1.7 }}>
            Route AI jobs to the right provider, at the right cost, with zero downtime. Your keys live only on your servers.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
          <div className="card" style={{ padding: 24, gridColumn: "1 / -1" }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0a1628", marginBottom: 4 }}>Orchestra AI — Real-time Workload Routing</h3>
              <p style={{ fontSize: 13, color: "#64748b" }}>Orchestra routes requests in real time across all AI providers — selecting lowest cost and lowest latency automatically</p>
            </div>
            <div style={{ background: "linear-gradient(135deg, #f0fdfa, #eff6ff)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(13,148,136,0.1)" }}>
              <OrchestraAnimation />
            </div>
          </div>

          {ORCHESTRA_FEATURES.map((f, i) => (
            <div key={f.title} className="card animate-fade-up" style={{ padding: 28 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, rgba(13,148,136,0.1), rgba(2,132,199,0.1))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", marginBottom: 10, letterSpacing: "-0.3px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLATFORM OVERVIEW — compact, elegant product grid (code-driven availability) ── */}
      <section id="products" style={{ padding: "96px 24px", background: "linear-gradient(180deg,#ffffff,#f8fafc)", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 8px" }}>
            <div style={{ display: "inline-block", fontSize: 13, fontWeight: 700, letterSpacing: 1, color: "#0284c7", textTransform: "uppercase", marginBottom: 12 }}>The AXTO Platform</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: "#0a1628", letterSpacing: "-1px", marginBottom: 14, fontFamily: "Sora, sans-serif" }}>Ten focused products, one platform</h2>
            <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.65 }}>
              Self-hosted, bring-your-own-key. Your servers, your keys, your data — nothing leaves your network.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))", gap: 16, marginTop: 44 }}>
            {[
              { product: "guardian", icon: "🛡️", name: "Guardian AI", tag: "Self-hosted AI cybersecurity for your servers." },
              { product: "orchestra", icon: "🎼", name: "Orchestra AI", tag: "Smart AI routing across 15+ model providers." },
              { product: "legal", icon: "⚖️", name: "AXTO Legal", tag: "Private AI for legal research & compliance." },
              { product: "studio", icon: "🧠", name: "AXTO Studio", tag: "AI & GPU workspace — chat, pipelines, APIs." },
              { product: "antivirus", icon: "🦠", name: "AXTO Antivirus", tag: "ClamAV + ML endpoint protection." },
              { product: "vault", icon: "🔒", name: "AXTO Vault", tag: "Redact PII before it reaches any model." },
              { product: "edge", icon: "🌐", name: "AXTO Edge", tag: "AI gateway & API management for customers." },
              { product: "soc", icon: "🎯", name: "AXTO SOC", tag: "AI-assisted SIEM + SOAR operations." },
              { product: "compliance", icon: "📋", name: "AXTO Compliance", tag: "Automated, continuous audit monitoring." },
              { product: "sentinel", icon: "🏭", name: "AXTO Sentinel", tag: "Security for industrial IoT & OT." },
            ].map((p) => {
              const available = isProductForSale(p.product);
              return (
                <div key={p.product} style={{ position: "relative", background: "#fff", border: "1px solid #e8edf3", borderRadius: 16, padding: "22px 20px", display: "flex", flexDirection: "column", gap: 10, transition: "transform .15s, box-shadow .15s", boxShadow: "0 1px 2px rgba(10,22,40,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, rgba(2,132,199,0.10), rgba(13,148,136,0.10))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{p.icon}</div>
                    <span title={available ? "Available now" : "Coming soon"} style={{ width: 9, height: 9, borderRadius: 999, background: available ? "#10b981" : "#f59e0b", boxShadow: `0 0 0 3px ${available ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}` }} />
                  </div>
                  <h3 style={{ fontSize: 16.5, fontWeight: 800, color: "#0a1628", letterSpacing: "-0.3px", margin: 0 }}>{p.name}</h3>
                  <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.55, margin: 0, flex: 1 }}>{p.tag}</p>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: available ? "#047857" : "#b45309", letterSpacing: 0.3 }}>
                    {available ? "Available now" : "Coming soon"}
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", marginTop: 32, maxWidth: 640, marginLeft: "auto", marginRight: "auto", lineHeight: 1.65 }}>
            Availability reflects our live catalog. Every plan is self-hosted and bring-your-own-key.
          </p>
        </div>
      </section>

      {/* ── BYOK SECTION ──────────────────────────────────────────── */}
      {/* ── STATS & TRUST BAR ──────────────────────────────────────────── */}
      <section style={{ background: "#0a1628", padding: "44px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 32, textAlign: "center" }}>
          {[
            { stat: "12", label: "Security Products", icon: "🛡️" },
            { stat: "40+", label: "Pricing Tiers", icon: "💰" },
            { stat: "100%", label: "Self-Hosted", icon: "🏠" },
            { stat: "0 bytes", label: "Data to AXTO", icon: "🔒" },
            { stat: "10", label: "Guide Languages", icon: "🌍" },
            { stat: "$0", label: "Cloud AI Fees", icon: "⚡" },
          ].map(({ stat, label, icon }) => (
            <div key={label}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>{stat}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY AXTO — value cards (honest, no competitor/margin data) ───── */}
      <section style={{ background: "#f8fafc", padding: "100px 24px", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 16 }}>WHY AXTO</span>
            <h2 className="font-display" style={{ fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 900, color: "#0a1628", letterSpacing: "-1px", marginBottom: 14 }}>
              One Platform. Fully Yours.
            </h2>
            <p style={{ color: "#475569", fontSize: 16, maxWidth: 620, margin: "0 auto" }}>
              Replace a stack of disconnected tools with a single self-hosted platform — clear, predictable pricing and complete ownership of your data.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
            {[
              { icon: "🏠", title: "100% Self-Hosted", body: "Runs entirely on your own servers. Your data never leaves your infrastructure — no third-party custody." },
              { icon: "🧩", title: "One Unified Platform", body: "Endpoint security, AI orchestration, privacy and compliance — consolidated into a single platform instead of a dozen separate tools." },
              { icon: "💎", title: "Transparent Pricing", body: "Straightforward annual or lifetime licenses. No per-request cloud fees, no hidden usage bills, no surprises." },
              { icon: "🔓", title: "No Lock-In", body: "Open standards and OpenAI-compatible APIs. Keep full ownership of your data and leave whenever you choose." },
            ].map((c) => (
              <div key={c.title} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "28px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{c.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{c.body}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 28, fontSize: 13, color: "#64748b" }}>
            Self-hosted by design — zero per-request cloud fees, zero data custody, zero lock-in.{" "}
            <a href="mailto:hallo@axto.io" style={{ color: "#0284c7", textDecoration: "none", fontWeight: 600 }}>Talk to us about enterprise plans →</a>
          </p>
        </div>
      </section>

      <section id="byok" style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%)", padding: "100px 24px", borderTop: "1px solid rgba(2,132,199,0.08)", borderBottom: "1px solid rgba(2,132,199,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <div>
              <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 20 }}>
                🔑 BYOK — BRING YOUR OWN KEYS
              </span>
              <h2 className="font-display" style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 800, color: "#0a1628", lineHeight: 1.15, letterSpacing: "-1px", marginBottom: 20 }}>
                Your Credentials.<br />
                <span className="gradient-text">Never Leave Your Server.</span>
              </h2>
              <p style={{ color: "#475569", fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
                AXTO operates on a strict architectural principle: <strong style={{ color: "#0a1628" }}>zero data custody.</strong> Your AI provider API keys, server telemetry, and operational data are stored exclusively within your own infrastructure. AXTO's only contact with your environment is a lightweight, periodic license heartbeat — nothing more.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: "🔐", text: "API keys stored in your config file — never transmitted" },
                  { icon: "🏗️", text: "Deploy on your VPS, bare metal, or private cloud" },
                  { icon: "📡", text: "License validation sends only a machine fingerprint hash" },
                  { icon: "🕵️", text: "AXTO has zero visibility into your AI queries or responses" },
                  { icon: "✅", text: "Fully auditable — open architecture, no hidden callbacks" },
                ].map(item => (
                  <div key={item.icon} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 15, color: "#334155" }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            <div>
              {/* Code terminal */}
              <div style={{ background: "#0f172a", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 64px rgba(2,132,199,0.2)" }}>
                {/* Terminal bar */}
                <div style={{ background: "#1e293b", padding: "12px 20px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ color: "#475569", fontSize: 12, marginLeft: 8 }}>orchestra.yml — your server</span>
                </div>
                <div style={{ padding: "24px", fontFamily: "ui-monospace, 'Cascadia Code', Consolas, monospace", fontSize: 13, lineHeight: 1.9 }}>
                  <div style={{ color: "#64748b" }}># ~/orchestra/orchestra.yml — stays on YOUR server</div>
                  <div style={{ color: "#94a3b8" }}><span style={{ color: "#38bdf8" }}>orchestra:</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;<span style={{ color: "#38bdf8" }}>license_key:</span> <span style={{ color: "#fbbf24" }}>ORCH-XXXX-XXXX-XXXX</span> <span style={{ color: "#475569" }}># the only thing we see</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;<span style={{ color: "#38bdf8" }}>ai_pool:</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#38bdf8" }}>routing_mode:</span> <span style={{ color: "#4ade80" }}>cost_first</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#38bdf8" }}>vendors:</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style={{ color: "#4ade80" }}>provider: openai</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#fbbf24" }}>api_key: sk-proj-...</span> <span style={{ color: "#475569" }}># 🔒 never leaves here</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style={{ color: "#4ade80" }}>provider: anthropic</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#fbbf24" }}>api_key: sk-ant-...</span> <span style={{ color: "#475569" }}># 🔒 your infra only</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style={{ color: "#4ade80" }}>provider: ollama</span></div>
                  <div style={{ color: "#94a3b8" }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#fbbf24" }}>base_url: http://localhost:11434</span></div>
                </div>
              </div>

              {/* Trust indicators */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                {[
                  { icon: "🔒", label: "E2E Encrypted", sub: "All comms over TLS 1.3" },
                  { icon: "🏠", label: "Self-Hosted", sub: "Your server, your rules" },
                  { icon: "📋", label: "Auditable", sub: "Open architecture" },
                  { icon: "🚫", label: "No Tracking", sub: "Zero telemetry to AXTO" },
                ].map(t => (
                  <div key={t.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(2,132,199,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0a1628" }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{t.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 16 }}>TRANSPARENT PRICING · USD</span>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
            Simple Annual Licensing
          </h2>
          <p style={{ color: "#475569", fontSize: 17, maxWidth: 560, margin: "0 auto" }}>
            One annual license. All updates included. No per-seat fees, no usage metering, no hidden costs.
          </p>
        </div>

        {/* Guardian Pricing */}
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0a1628", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡</span>
          Guardian AI — Cybersecurity
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 64 }}>
          {GUARDIAN_PRICING.map((p) => (
            <div key={p.name} className="card" style={{
              padding: 28, position: "relative",
              border: p.popular ? "2px solid #0284c7" : "1px solid rgba(2,132,199,0.12)",
              background: p.popular ? "linear-gradient(160deg,#f0f9ff,#ecfdf5)" : "#fff",
            }}>
              {p.popular && (
                <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 16px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: "0.5px" }}>
                  {t("pricing.popular")}
                </div>
              )}
              <div style={{ marginBottom: 6 }}>
                <span style={{ background: "rgba(2,132,199,0.08)", color: "#0284c7", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>GUARDIAN</span>
              </div>
              <h4 style={{ fontSize: 22, fontWeight: 800, color: "#0a1628", marginBottom: 2, fontFamily: "Sora, sans-serif" }}>{p.name}</h4>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>{p.servers}</p>
              <div className="price-tag" style={{ marginBottom: 4, color: "#0a1628" }}>
                <sup>$</sup>{lp(p.code, p.price).toLocaleString("en-US")}
              </div>
              <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>per year · billed annually</p>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: 20, lineHeight: 1.5 }}>{p.desc}</p>
              <div style={{ borderTop: "1px solid rgba(2,132,199,0.08)", paddingTop: 16, marginBottom: 20 }}>
                {p.features.map(f => (
                  <div key={f} className="check-item">
                    <div className="check-icon">✓</div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link href={`/register?pkg=${p.code}`} style={{
                display: "block", textAlign: "center", padding: "12px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none",
                background: p.popular ? "linear-gradient(135deg,#0284c7,#0d9488)" : "transparent",
                color: p.popular ? "#fff" : "#0284c7",
                border: p.popular ? "none" : "1.5px solid #0284c7",
                boxShadow: p.popular ? "0 4px 16px rgba(2,132,199,0.3)" : "none",
              }}>
                Get Started
              </Link>
            </div>
          ))}
        </div>

        {/* Orchestra Pricing */}
        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0a1628", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#0d9488,#0284c7)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎼</span>
          Orchestra AI — Workload Orchestration
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 80 }}>
          {ORCHESTRA_PRICING.map((p) => (
            <div key={p.name} className="card" style={{
              padding: 28, position: "relative",
              border: p.popular ? "2px solid #0d9488" : "1px solid rgba(13,148,136,0.12)",
              background: p.popular ? "linear-gradient(160deg,#f0fdfa,#eff6ff)" : "#fff",
            }}>
              {p.popular && (
                <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#0d9488,#0284c7)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 16px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: "0.5px" }}>
                  {t("pricing.popular")}
                </div>
              )}
              <div style={{ marginBottom: 6 }}>
                <span style={{ background: "rgba(13,148,136,0.08)", color: "#0d9488", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>ORCHESTRA</span>
              </div>
              <h4 style={{ fontSize: 22, fontWeight: 800, color: "#0a1628", marginBottom: 2, fontFamily: "Sora, sans-serif" }}>{p.name}</h4>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>{p.workers}</p>
              <div className="price-tag" style={{ marginBottom: 4, color: "#0a1628" }}>
                <sup>$</sup>{lp(p.code, p.price).toLocaleString("en-US")}
              </div>
              <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>per year · billed annually</p>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: 20, lineHeight: 1.5 }}>{p.desc}</p>
              <div style={{ borderTop: "1px solid rgba(13,148,136,0.08)", paddingTop: 16, marginBottom: 20 }}>
                {p.features.map(f => (
                  <div key={f} className="check-item">
                    <div className="check-icon" style={{ background: "rgba(13,148,136,0.1)", color: "#0d9488" }}>✓</div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link href={`/register?pkg=${p.code}`} style={{
                display: "block", textAlign: "center", padding: "12px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none",
                background: p.popular ? "linear-gradient(135deg,#0d9488,#0284c7)" : "transparent",
                color: p.popular ? "#fff" : "#0d9488",
                border: p.popular ? "none" : "1.5px solid #0d9488",
                boxShadow: p.popular ? "0 4px 16px rgba(13,148,136,0.3)" : "none",
              }}>
                Get Started
              </Link>
            </div>
          ))}
        </div>

        {/* Bundle Pricing */}
        <div style={{ background: "linear-gradient(135deg, #f8faff, #f0fdfa)", borderRadius: 24, padding: "48px 40px", border: "1px solid rgba(2,132,199,0.12)" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ display: "inline-block", background: "linear-gradient(135deg,rgba(2,132,199,0.1),rgba(13,148,136,0.1))", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 14 }}>🎁 BUNDLE & SAVE</span>
            <h3 className="font-display" style={{ fontSize: 30, fontWeight: 800, color: "#0a1628", letterSpacing: "-0.7px", marginBottom: 10 }}>Guardian + Orchestra Combined</h3>
            <p style={{ color: "#475569", fontSize: 15 }}>Deploy both products together at a significant discount.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {BUNDLE_PRICING.map((b) => (
              <div key={b.name} className="card" style={{
                padding: 28, position: "relative", overflow: "hidden",
                border: b.highlight ? `2px solid ${b.color}` : "1px solid rgba(2,132,199,0.12)",
                background: b.highlight ? `linear-gradient(160deg, ${b.color}08, ${b.color}04)` : "#fff",
              }}>
                {b.highlight && <div style={{ position: "absolute", top: 0, right: 0, background: `linear-gradient(135deg,${b.color},#0284c7)`, color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: "0 0 0 12px", letterSpacing: "0.5px" }}>BEST VALUE</div>}
                <h4 style={{ fontSize: 18, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>{b.name}</h4>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ background: "rgba(2,132,199,0.08)", color: "#0284c7", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>🛡 {b.guardian}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <span style={{ background: "rgba(13,148,136,0.08)", color: "#0d9488", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>🎼 {b.orchestra}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                  <div className="price-tag" style={{ color: "#0a1628" }}><sup>$</sup>{b.bundlePrice.toLocaleString("en-US")}</div>
                  <span style={{ fontSize: 13, color: "#94a3b8", textDecoration: "line-through" }}>{fmtUSD(b.originalPrice)}</span>
                </div>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>per year · billed annually</p>
                <div style={{ background: `${b.color}10`, border: `1px solid ${b.color}25`, borderRadius: 8, padding: "8px 12px", marginBottom: 20 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: b.color }}>Save {fmtUSD(b.savings)}/year</span>
                </div>
                <Link href={`/register?pkg=${b.code}`} style={{
                  display: "block", textAlign: "center", padding: "12px 16px", borderRadius: 10,
                  fontWeight: 700, fontSize: 14, textDecoration: "none",
                  background: b.highlight ? `linear-gradient(135deg, ${b.color}, #0d9488)` : "transparent",
                  color: b.highlight ? "#fff" : b.color,
                  border: b.highlight ? "none" : `1.5px solid ${b.color}`,
                  boxShadow: b.highlight ? `0 4px 16px ${b.color}40` : "none",
                }}>
                  Get Bundle
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLAYBOOKS ──────────────────────────────────────────── */}
      <section id="playbooks" style={{ padding: "100px 24px", background: "#fff", borderTop: "1px solid rgba(2,132,199,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#7c3aed", fontWeight: 700, marginBottom: 16 }}>📦 NEW — AXTO PLAYBOOKS</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
              AI Prompt Playbooks
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 620, margin: "0 auto", lineHeight: 1.7 }}>
              Ready-to-use prompt collections for ChatGPT, Claude, and Gemini.
              Crafted by professionals, tested across 100+ real projects. Download and use instantly.
            </p>
          </div>

          {/* Category grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 48 }}>
            {[
              { icon: "✍️", name: "Copywriting", count: "50+ prompts" },
              { icon: "💼", name: "Business", count: "65+ prompts" },
              { icon: "⚖️", name: "Legal & HR", count: "30+ prompts" },
              { icon: "🛒", name: "E-Commerce", count: "45+ prompts" },
              { icon: "📈", name: "SaaS & Startup", count: "35+ prompts" },
              { icon: "👔", name: "Career", count: "30+ prompts" },
              { icon: "📊", name: "Data Analytics", count: "25+ prompts" },
              { icon: "🎓", name: "Education", count: "20+ prompts" },
              { icon: "🏠", name: "Real Estate", count: "25+ prompts" },
              { icon: "📝", name: "Content & SEO", count: "110+ prompts" },
            ].map(cat => (
              <Link key={cat.name} href="/playbooks" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", textDecoration: "none", transition: "all 0.15s" }}>
                <span style={{ fontSize: 22 }}>{cat.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0a1628" }}>{cat.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{cat.count}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Featured playbooks — dynamic from catalog */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 48 }}>
            {[
              { icon: "🔥", name: "Ultimate Sales Copy Pack", prompts: 50, price: 29, original: 49, badge: "BEST SELLER", color: "#ef4444" },
              { icon: "⚖️", name: "Legal Document Vault", prompts: 30, price: 39, original: 79, badge: "HIGH VALUE", color: "#7c3aed" },
              { icon: "👔", name: "Career Accelerator Pack", prompts: 30, price: 19, original: 34, badge: "POPULAR", color: "#0284c7" },
            ].map(p => (
              <div key={p.name} className="card" style={{ padding: 24, position: "relative" }}>
                {p.badge && <div style={{ position: "absolute", top: 12, right: 12, background: `${p.color}15`, color: p.color, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, letterSpacing: "0.3px" }}>{p.badge}</div>}
                <div style={{ fontSize: 32, marginBottom: 12 }}>{p.icon}</div>
                <h4 style={{ fontSize: 17, fontWeight: 800, color: "#0a1628", marginBottom: 6 }}>{p.name}</h4>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>{p.prompts} prompts · PDF download · Works with ChatGPT, Claude, Gemini</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>${lp(p.code, p.price)}</span>
                  <span style={{ fontSize: 14, color: "#94a3b8", textDecoration: "line-through" }}>${p.original}</span>
                </div>
                <Link href="/playbooks" style={{ display: "block", textAlign: "center", padding: "11px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none", background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", boxShadow: "0 4px 12px rgba(124,58,237,0.2)" }}>
                  Get Playbook →
                </Link>
              </div>
            ))}
          </div>

          {/* Mega bundle CTA */}
          <div style={{ background: "linear-gradient(135deg,#7c3aed08,#0284c708)", borderRadius: 20, padding: "40px 48px", border: "2px solid rgba(124,58,237,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6 }}>BEST VALUE</span>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", marginBottom: 6 }}>Mega Bundle — All Access</h3>
              <p style={{ color: "#475569", fontSize: 15 }}>Every playbook in our catalog. 400+ prompts. Lifetime access.</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: "#7c3aed", fontFamily: "Sora, sans-serif" }}>$99</span>
                <span style={{ fontSize: 16, color: "#94a3b8", textDecoration: "line-through" }}>$290</span>
              </div>
              <Link href="/playbooks" style={{ display: "inline-block", padding: "13px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none", background: "linear-gradient(135deg,#7c3aed,#0284c7)", color: "#fff", boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}>
                Get All Playbooks →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CUSTOMER REVIEWS (real, moderated; renders nothing if none) ── */}
      <ReviewsSection />

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section id="faq" style={{ background: "linear-gradient(160deg, #f0f9ff, #ecfdf5)", padding: "100px 24px", borderTop: "1px solid rgba(2,132,199,0.08)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 className="font-display" style={{ fontSize: 38, fontWeight: 800, color: "#0a1628", letterSpacing: "-1px", marginBottom: 12 }}>{t("faq.title")}</h2>
            <p style={{ color: "#64748b", fontSize: 16 }}>Everything you need to know before you deploy</p>
          </div>
          {(({
            en:[
              { q:"Does AXTO have access to my server data or AI responses?", a:"Absolutely not. Guardian and Orchestra are fully self-hosted on your infrastructure. AXTO only validates your license — we never see or store your data, API keys, or AI responses." },
              { q:"What does BYOK (Bring Your Own Keys) mean?", a:"Your AI provider credentials (OpenAI, Anthropic, etc.) are stored on your server. Orchestra reads them locally. AXTO has no copy of your keys." },
              { q:"How long does initial setup take?", a:"Under 30 minutes. Download ZIP from portal → run install.sh → open browser → enter license key. Admin dashboard is live immediately." },
              { q:"Can I run Guardian and Orchestra on the same server?", a:"Yes. Both products run as separate Docker Compose stacks on the same host. For large deployments, separate hosts are recommended." },
              { q:"Is there a free trial?", a:"Yes. Every product offers a free 3-day trial — full features, limited capacity, locked to one server/IP. Register at axto.io, select any Trial plan, and your license key is delivered instantly. One trial per product per email. No credit card required." },
              { q:"What happens if my license expires?", a:"Products continue in read-only mode for a 7-day grace period. Automated renewal reminders sent at 30, 14, and 3 days before expiry." },
            ],
            id:[
              { q:"Apakah AXTO bisa mengakses data server saya?", a:"Tidak sama sekali. Guardian dan Orchestra berjalan 100% di server Anda. AXTO hanya memvalidasi lisensi — kami tidak pernah melihat atau menyimpan data, API key, atau respons AI Anda." },
              { q:"Apa itu BYOK?", a:"Bring Your Own Keys — API key AI Anda (OpenAI, Anthropic, dll) disimpan di server Anda sendiri. Orchestra membacanya secara lokal. AXTO tidak punya salinan key Anda." },
              { q:"Berapa lama setup awal?", a:"Di bawah 30 menit. Download ZIP dari portal → jalankan install.sh → buka browser → masukkan license key. Dashboard admin langsung aktif." },
              { q:"Bisakah Guardian dan Orchestra di server yang sama?", a:"Ya. Keduanya berjalan sebagai Docker Compose stack terpisah di host yang sama. Untuk deployment skala besar, server terpisah lebih disarankan." },
              { q:"Apakah ada trial gratis?", a:"Ya. Setiap produk menawarkan trial gratis 3 hari — fitur lengkap, kapasitas terbatas, terkunci ke 1 server/IP. Daftar di axto.io, pilih paket Trial, dan license key langsung dikirim. Satu trial per produk per email. Tanpa kartu kredit." },
              { q:"Apa yang terjadi jika lisensi kedaluwarsa?", a:"Produk terus beroperasi dalam mode read-only selama 7 hari. Pengingat pembaruan dikirim 30, 14, dan 3 hari sebelum kedaluwarsa." },
            ],
            zh:[
              { q:"AXTO能访问我的服务器数据吗？", a:"绝对不会。Guardian和Orchestra完全在您的服务器上运行。AXTO只验证您的许可证——我们从不查看或存储您的数据。" },
              { q:"BYOK是什么意思？", a:"自带密钥——您的AI提供商凭证存储在您的服务器上。AXTO无法访问您的密钥。" },
              { q:"初始设置需要多长时间？", a:"30分钟以内。从门户下载ZIP → 运行install.sh → 打开浏览器 → 输入许可证密钥。" },
              { q:"有免费试用吗？", a:"有！可直接从管理面板申请1-7天试用许可证。所有付费计划享有30天满意保证。" },
              { q:"许可证到期后会怎样？", a:"产品在7天宽限期内以只读模式运行。到期前30、14和3天发送续期提醒。" },
            ],
            ar:[
              { q:"هل تصل AXTO إلى بيانات خادمي؟", a:"لا على الإطلاق. يعمل Guardian وOrchestra بنسبة 100٪ على خوادمك. AXTO تتحقق فقط من الترخيص — نحن لا نرى بياناتك أبدًا." },
              { q:"ما معنى BYOK؟", a:"أحضر مفاتيحك الخاصة — يتم تخزين بيانات اعتماد AI الخاصة بك على خادمك. لا تملك AXTO نسخة من مفاتيحك." },
              { q:"كم يستغرق الإعداد الأولي؟", a:"أقل من 30 دقيقة. قم بتنزيل ZIP من البوابة ← شغّل install.sh ← افتح المتصفح ← أدخل مفتاح الترخيص." },
              { q:"هل هناك تجربة مجانية؟", a:"نعم! تتوفر تراخيص تجريبية لمدة 1-7 أيام مباشرةً من لوحة المشرف. ضمان الرضا 30 يومًا." },
            ],
          } as Record<string,{q:string;a:string}[]>)[locale as string] || [
              { q:"Does AXTO have access to my server data or AI responses?", a:"Absolutely not. AXTO only validates your license." },
              { q:"What does BYOK mean?", a:"Your AI keys stay on your server. AXTO never has access to them." },
              { q:"How long does setup take?", a:"Under 30 minutes. Download ZIP → install.sh → enter license key in browser." },
            ]).map((item: {q:string;a:string}, i: number) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", marginBottom: 14, border: "1px solid rgba(2,132,199,0.1)", boxShadow: "0 2px 8px rgba(2,132,199,0.06)" }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: "#0a1628", marginBottom: 10 }}>{item.q}</h4>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.75 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── VAULT PRICING ─────────────────────────────────────────── */}
      <section id="vault" style={{ padding: "100px 24px", background: "linear-gradient(160deg,#f5f3ff,#ede9fe)", borderTop: "1px solid rgba(99,102,241,0.1)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#6366f1", fontWeight: 700, marginBottom: 16 }}>🔐 AXTO VAULT — AI DATA PRIVACY PLATFORM</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
              Your AI Must Never See<br /><span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sensitive Data</span>
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 680, margin: "0 auto", lineHeight: 1.7 }}>
              Banks, hospitals, and law firms cannot send raw PII, PHI, or financial data to OpenAI or Claude. Vault intercepts every AI API call, automatically redacts sensitive entities, and re-injects original values after the response — invisible to the AI, invisible to your users. EU AI Act, HIPAA, PCI-DSS and GDPR compliant by design — so your teams can safely adopt AI without exposing regulated data.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
              {["150+ entity types", "Session-based re-injection", "Auditor-ready exports"].map(c => (
                <div key={c} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>{c}</div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <ComingSoonBanner product="vault" color="#6366f1" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {[
              {
                name: "Professional", code: "vault_professional", price: 14900,
                limit: "Up to 500K intercepts/day · Single tenant",
                target: "Regulated mid-market: fintech, healthtech, legal SaaS",
                features: [
                  "Intercept & redact: PII, PHI, PCI, NPI (150+ entity types)",
                  "Session-based re-injection — AI never sees original",
                  "Proxy: OpenAI, Anthropic, Gemini, Azure AI compatible",
                  "Audit log with masked evidence — auditor-ready export",
                  "HIPAA & SOC 2 pre-built compliance reports",
                  "Custom regex patterns + dictionary-based entities",
                  "Real-time SIEM stream (Splunk, Elastic, Datadog)",
                  "Interactive multi-language setup guide",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Business", code: "vault_business", price: 39900,
                limit: "Up to 5M intercepts/day · Multi-department",
                target: "Enterprise: banks, hospital networks, insurance, law firms",
                features: [
                  "Everything in Professional",
                  "AI-assisted NLP entity detection (fine-tunable per industry)",
                  "Multi-department isolation with separate audit streams",
                  "GDPR data subject request automation",
                  "PCI-DSS tokenization for payment card data",
                  "Custom redaction policies per AI use case",
                  "SIEM + ticketing integration (Jira, ServiceNow, PagerDuty)",
                  "Comprehensive interactive setup guide (40hr onboarding)",
                  "Automated compliance health dashboard",
                ],
                popular: true, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Enterprise", code: "vault_enterprise", price: 119000,
                limit: "Unlimited intercepts · Multi-region · Custom Deployment",
                target: "Fortune 500 / Tier-1 banks / Global health systems",
                features: [
                  "Everything in Business",
                  "Custom redaction AI model — trained on your entity taxonomy",
                  "Multi-region active-active deployment",
                  "Real-time compliance dashboard for Board/DPO",
                  "Cross-border data residency enforcement",
                  "Automated DPIA (Data Protection Impact Assessment) generation",
                  "High-availability architecture with automated failover",
                  "Email community support",
                  "Pen-test ready architecture documentation",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
            ].map(p => (
              <div key={p.name} className="card" style={{ padding: 32, position: "relative", border: p.popular ? "2px solid #6366f1" : "1px solid rgba(99,102,241,0.15)", background: p.popular ? "linear-gradient(160deg,#f5f3ff,#ede9fe)" : "#fff" }}>
                {p.popular && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 18px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: "0.5px" }}>MOST SELECTED BY ENTERPRISE</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>VAULT</span>
                  <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, background: "rgba(22,163,74,0.08)", padding: "2px 8px", borderRadius: 6 }}>{p.savings}</span>
                </div>
                <h4 style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", marginBottom: 2 }}>{p.name}</h4>
                <p style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, marginBottom: 4 }}>{p.limit}</p>
                <p style={{ fontSize: 11, color: "#64748b", marginBottom: 18, fontStyle: "italic" }}>{p.target}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <div className="price-tag" style={{ color: "#0a1628" }}><sup>$</sup>{lp(p.code, p.price).toLocaleString("en-US")}</div>
                </div>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 22 }}>per year · annual contract · self-hosted</p>
                <div style={{ borderTop: "1px solid rgba(99,102,241,0.1)", paddingTop: 18, marginBottom: 22 }}>
                  {p.features.map(f => <div key={f} className="check-item" style={{ marginBottom: 8 }}><div className="check-icon" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", flexShrink: 0 }}>✓</div><span style={{ fontSize: 13, lineHeight: 1.5 }}>{f}</span></div>)}
                </div>
                <ProductBuyButton code={p.code} popular={p.popular} color="#6366f1" />
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#94a3b8" }}>All tiers include: Self-hosted. No cloud dependency. 3-day free trial available. · <a href="mailto:hallo@axto.io" style={{ color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>Contact us for volume pricing</a></p>
        </div>
      </section>

      {/* ── SOC PRICING ───────────────────────────────────────────── */}
      <section id="soc" style={{ padding: "100px 24px", background: "#fff", borderTop: "1px solid rgba(220,38,38,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#dc2626", fontWeight: 700, marginBottom: 16 }}>🛡️ AXTO SOC — AI SECURITY OPERATIONS CENTER</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
              Enterprise-Grade SOC.<br /><span style={{ background: "linear-gradient(135deg,#dc2626,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Self-Hosted and Simple.</span>
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 680, margin: "0 auto", lineHeight: 1.7 }}>
              A complete security operations center on your own infrastructure: full SIEM aggregation from every data source, SOAR automation that responds in under 30 seconds, AI-assisted threat hunting, real-time threat intelligence, incident management, and executive reporting. Your logs never leave your network.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
              {["Real-time SIEM aggregation", "Automated SOAR response", "Compliance-ready reporting"].map(c => (
                <div key={c} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", fontSize: 12, color: "#dc2626", fontWeight: 600 }}>{c}</div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <ComingSoonBanner product="soc" color="#dc2626" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {[
              {
                name: "Starter", code: "soc_starter", price: 24900,
                limit: "Up to 5 log sources · 30-day retention",
                target: "SMB and growing companies: 50–500 employees",
                features: [
                  "SIEM: syslog UDP, CEF, API push ingestion",
                  "5 automated detection rules (MITRE ATT&CK)",
                  "Threat intel: 1M+ IOCs, updated daily",
                  "Email + Slack alert delivery",
                  "Basic incident tracking dashboard",
                  "Weekly executive summary report",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Professional", code: "soc_professional", price: 79000,
                limit: "Up to 25 log sources · 90-day retention",
                target: "Mid-market: 500–2,000 employee companies",
                features: [
                  "SIEM: syslog UDP, CEF, API push from unlimited agents",
                  "SOAR: 20 automated playbooks (block IP, isolate, alert)",
                  "Threat intel: 5M+ IOCs, updated every 6 hours",
                  "Incident management: create, assign, track, resolve",
                  "Guardian AI deep integration — correlated threat view",
                  "90-day compressed log retention",
                  "Executive security report (weekly + monthly)",
                  "Email, Slack, PagerDuty alerting",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Business", code: "soc_business", price: 136900,
                limit: "Up to 100 log sources · 1-year retention",
                target: "Enterprise: 2,000–20,000 employee companies",
                features: [
                  "Everything in Professional",
                  "AI-assisted threat hunting — proactive IOC correlation",
                  "Custom SOAR playbooks via visual workflow editor",
                  "Private threat intelligence feed integration",
                  "1-year encrypted log retention with audit chain",
                  "SIEM forwarding: Splunk, Elastic, Microsoft Sentinel",
                  "MITRE ATT&CK framework mapping per incident",
                  "Comprehensive onboarding documentation",
                  "Automated threat landscape dashboard",
                ],
                popular: true, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Enterprise", code: "soc_enterprise", price: 249000,
                limit: "Unlimited log sources · Unlimited retention",
                target: "Fortune 500, critical infrastructure, government",
                features: [
                  "Everything in Business",
                  "Multi-tenant SOC: isolate subsidiaries / business units",
                  "White-label SOC platform for MSSPs",
                  "Custom threat intelligence exchange (STIX/TAXII)",
                  "Unlimited log retention with tamper-proof chain-of-custody",
                  "Air-gap deployment support",
                  "SOAR integration: Jira, ServiceNow, Palo Alto XSOAR",
                  "High-availability architecture with automated failover",
                  "Email community support",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
            ].map(p => (
              <div key={p.name} className="card" style={{ padding: 32, position: "relative", border: p.popular ? "2px solid #dc2626" : "1px solid rgba(220,38,38,0.1)", background: p.popular ? "linear-gradient(160deg,#fff5f5,#fef2f2)" : "#fff" }}>
                {p.popular && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#dc2626,#7c3aed)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 18px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: "0.5px" }}>MOST SELECTED BY ENTERPRISE</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>SOC</span>
                  <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, background: "rgba(22,163,74,0.08)", padding: "2px 8px", borderRadius: 6 }}>{p.savings}</span>
                </div>
                <h4 style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", marginBottom: 2 }}>{p.name}</h4>
                <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 600, marginBottom: 4 }}>{p.limit}</p>
                <p style={{ fontSize: 11, color: "#64748b", marginBottom: 18, fontStyle: "italic" }}>{p.target}</p>
                <div className="price-tag" style={{ marginBottom: 4, color: "#0a1628" }}><sup>$</sup>{lp(p.code, p.price).toLocaleString("en-US")}</div>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 22 }}>per year · annual contract · self-hosted</p>
                <div style={{ borderTop: "1px solid rgba(220,38,38,0.08)", paddingTop: 18, marginBottom: 22 }}>
                  {p.features.map(f => <div key={f} className="check-item" style={{ marginBottom: 8 }}><div className="check-icon" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626", flexShrink: 0 }}>✓</div><span style={{ fontSize: 13, lineHeight: 1.5 }}>{f}</span></div>)}
                </div>
                <ProductBuyButton code={p.code} popular={p.popular} color="#dc2626" />
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#94a3b8" }}>All tiers: self-hosted, your logs never leave your network, 3-day free trial available · <a href="mailto:hallo@axto.io" style={{ color: "#dc2626", textDecoration: "none", fontWeight: 600 }}>Get SOC Started</a></p>
        </div>
      </section>

      {/* ── COMPLIANCE PRICING ────────────────────────────────────── */}
      <section id="compliance" style={{ padding: "100px 24px", background: "linear-gradient(160deg,#f0fdf4,#dcfce7)", borderTop: "1px solid rgba(22,163,74,0.1)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#16a34a", fontWeight: 700, marginBottom: 16 }}>📋 AXTO COMPLIANCE — AUTOMATED AUDIT PLATFORM</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
              Cut Audit Costs by 80%.<br /><span style={{ background: "linear-gradient(135deg,#16a34a,#0d9488)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Be Audit-Ready in 30 Days.</span>
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 680, margin: "0 auto", lineHeight: 1.7 }}>
              Compliance work normally means months of consultants, auditor pre-work, and manual evidence collection. AXTO Compliance automates all of it: continuous monitoring for SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA, and NIST CSF — evidence collected automatically, gaps identified in real time, audit-ready reports in minutes — all running on your own infrastructure.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
              {["7 frameworks built-in", "Continuous evidence collection", "Runs on your infra"].map(c => (
                <div key={c} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)", fontSize: 12, color: "#16a34a", fontWeight: 600 }}>{c}</div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <ComingSoonBanner product="compliance" color="#16a34a" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {[
              {
                name: "Starter", code: "compliance_starter", price: 7990,
                limit: "SOC 2 + GDPR · 2 frameworks",
                target: "Startups seeking first SOC 2 certification",
                features: [
                  "SOC 2 Type II + GDPR continuous monitoring",
                  "80+ automated control checks",
                  "Gap analysis with prioritized remediation list",
                  "Evidence collection dashboard",
                  "One-click audit-ready PDF export",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Professional", code: "compliance_professional", price: 19900,
                limit: "6 frameworks · Daily automated scans",
                target: "SaaS companies pursuing SOC 2, ISO 27001, HIPAA certification",
                features: [
                  "SOC 2 Type II continuous control monitoring",
                  "ISO 27001:2022 — all 93 controls mapped",
                  "HIPAA technical & administrative safeguards",
                  "PCI-DSS v4.0 — 12 requirements tracked",
                  "GDPR + PDPA automated controls",
                  "Automated evidence collection every 24 hours",
                  "Gap analysis with prioritized remediation roadmap",
                  "Audit-ready reports exportable to PDF",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Business", code: "compliance_business", price: 31900,
                limit: "7 frameworks · Hourly scans · API-first",
                target: "Enterprise handling EU customer data or healthcare records",
                features: [
                  "Everything in Professional",
                  "NIST Cybersecurity Framework 2.0",
                  "API-first: compliance gates in your CI/CD pipeline",
                  "Guardian + SOC integration — security + compliance unified",
                  "Evidence version history with tamper-proof timestamps",
                  "Vendor risk assessment",
                  "Comprehensive onboarding documentation",
                  "Auditor collaboration portal (share evidence packages)",
                ],
                popular: true, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Enterprise", code: "compliance_enterprise", price: 49000,
                limit: "Custom frameworks · Multi-tenant · M&A support",
                target: "Global enterprises, MSPs, M&A compliance programs",
                features: [
                  "Everything in Business",
                  "Custom framework builder (any standard or internal policy)",
                  "Multi-tenant: isolate BUs, subsidiaries, acquired companies",
                  "M&A due diligence compliance package (rapid target assessment)",
                  "Continuous regulatory change monitoring (EU AI Act, DORA)",
                  "White-label for MSSPs and compliance consulting firms",
                  "Board-level compliance dashboard with risk heat maps",
                  "Automated compliance health dashboard",
                  "Email community support",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
            ].map(p => (
              <div key={p.name} className="card" style={{ padding: 32, position: "relative", border: p.popular ? "2px solid #16a34a" : "1px solid rgba(22,163,74,0.15)", background: p.popular ? "linear-gradient(160deg,#f0fdf4,#dcfce7)" : "#fff" }}>
                {p.popular && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#16a34a,#0d9488)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 18px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: "0.5px" }}>MOST SELECTED BY ENTERPRISE</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>COMPLIANCE</span>
                  <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, background: "rgba(22,163,74,0.08)", padding: "2px 8px", borderRadius: 6 }}>{p.savings}</span>
                </div>
                <h4 style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", marginBottom: 2 }}>{p.name}</h4>
                <p style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, marginBottom: 4 }}>{p.limit}</p>
                <p style={{ fontSize: 11, color: "#64748b", marginBottom: 18, fontStyle: "italic" }}>{p.target}</p>
                <div className="price-tag" style={{ marginBottom: 4, color: "#0a1628" }}><sup>$</sup>{lp(p.code, p.price).toLocaleString("en-US")}</div>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 22 }}>per year · annual contract · self-hosted</p>
                <div style={{ borderTop: "1px solid rgba(22,163,74,0.1)", paddingTop: 18, marginBottom: 22 }}>
                  {p.features.map(f => <div key={f} className="check-item" style={{ marginBottom: 8 }}><div className="check-icon" style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a", flexShrink: 0 }}>✓</div><span style={{ fontSize: 13, lineHeight: 1.5 }}>{f}</span></div>)}
                </div>
                <ProductBuyButton code={p.code} popular={p.popular} color="#16a34a" />
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#94a3b8" }}>All tiers: Self-hosted. Evidence never leaves your network. 3-day free trial available. · <a href="mailto:hallo@axto.io" style={{ color: "#16a34a", textDecoration: "none", fontWeight: 600 }}>Get Compliance Started</a></p>
        </div>
      </section>

      {/* ── SENTINEL PRICING ──────────────────────────────────────── */}
      <section id="sentinel" style={{ padding: "100px 24px", background: "#fff", borderTop: "1px solid rgba(124,58,237,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#7c3aed", fontWeight: 700, marginBottom: 16 }}>📡 AXTO SENTINEL — IoT/OT SECURITY PLATFORM</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
              Your Factory Floor Is<br /><span style={{ background: "linear-gradient(135deg,#7c3aed,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>the #1 Unprotected Attack Surface</span>
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 680, margin: "0 auto", lineHeight: 1.7 }}>
              The average manufacturing plant has 3,000+ connected OT devices — PLCs, SCADA, HMIs, sensors — and most have never been inventoried. AXTO Sentinel brings them into full view: device discovery, 15+ industrial protocol detection, real-time risk scoring, CVE tracking, and IEC 62443 compliance reporting — all self-hosted.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
              {["15+ industrial protocols", "Real-time risk scoring", "IEC 62443 reporting"].map(c => (
                <div key={c} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>{c}</div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <ComingSoonBanner product="sentinel" color="#7c3aed" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {[
              {
                name: "Starter", code: "sentinel_starter", price: 12900,
                limit: "Up to 50 OT/IoT devices · passive only",
                target: "Small facilities: single-site manufacturers, utilities",
                features: [
                  "Passive asset discovery (zero traffic injection)",
                  "Modbus, DNP3, EtherNet/IP protocol support",
                  "50-device inventory with CVE matching",
                  "IEC 62443 compliance reporting",
                  "Email and Slack anomaly alerts",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Professional", code: "sentinel_professional", price: 39900,
                limit: "Up to 500 devices · Single facility",
                target: "Mid-size manufacturers, hospitals, smart buildings",
                features: [
                  "Active + passive network discovery (ARP, mDNS, SNMP)",
                  "OT protocol detection: Modbus, DNP3, BACnet, S7, EtherNet/IP, MQTT, 15+",
                  "Per-device risk score 0–100 with full justification",
                  "New device instant alert (rogue asset detection)",
                  "CVE database matching per device firmware",
                  "Default credential detection (500+ known device default passwords)",
                  "IEC 62443 zone/conduit mapping",
                  "SOC + Guardian integration for correlated OT/IT response",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Business", code: "sentinel_business", price: 68900,
                limit: "Up to 5,000 devices · Multi-facility",
                target: "Enterprise manufacturers, energy companies, large hospitals",
                features: [
                  "Everything in Professional",
                  "Multi-facility centralized OT dashboard",
                  "OT asset lifecycle management (procurement → decommission)",
                  "Firmware vulnerability tracking with patch status",
                  "SOAR auto-response: isolate, alert, ticket creation",
                  "IEC 62443 compliance reporting for auditors",
                  "Network segmentation gap analysis",
                  "Comprehensive onboarding documentation",
                  "Automated OT threat landscape dashboard",
                ],
                popular: true, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Enterprise", code: "sentinel_enterprise", price: 129000,
                limit: "Unlimited devices · Unlimited sites · Custom protocols",
                target: "Critical infrastructure: energy grids, utilities, global manufacturers",
                features: [
                  "Everything in Business",
                  "Custom OT protocol decoder development",
                  "Air-gap deployment support (offline IOC updates)",
                  "NERC CIP compliance package (energy sector)",
                  "OT threat intelligence: curated industrial threat feeds",
                  "Multi-org white-label for MSSPs and system integrators",
                  "Board-level OT risk dashboard",
                  "Air-gap deployment documentation",
                  "Comprehensive setup documentation",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
            ].map(p => (
              <div key={p.name} className="card" style={{ padding: 32, position: "relative", border: p.popular ? "2px solid #7c3aed" : "1px solid rgba(124,58,237,0.12)", background: p.popular ? "linear-gradient(160deg,#faf5ff,#f3e8ff)" : "#fff" }}>
                {p.popular && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#7c3aed,#3b82f6)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 18px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: "0.5px" }}>MOST SELECTED BY ENTERPRISE</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>SENTINEL</span>
                  <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, background: "rgba(22,163,74,0.08)", padding: "2px 8px", borderRadius: 6 }}>{p.savings}</span>
                </div>
                <h4 style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", marginBottom: 2 }}>{p.name}</h4>
                <p style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, marginBottom: 4 }}>{p.limit}</p>
                <p style={{ fontSize: 11, color: "#64748b", marginBottom: 18, fontStyle: "italic" }}>{p.target}</p>
                <div className="price-tag" style={{ marginBottom: 4, color: "#0a1628" }}><sup>$</sup>{lp(p.code, p.price).toLocaleString("en-US")}</div>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 22 }}>per year · annual contract · self-hosted</p>
                <div style={{ borderTop: "1px solid rgba(124,58,237,0.08)", paddingTop: 18, marginBottom: 22 }}>
                  {p.features.map(f => <div key={f} className="check-item" style={{ marginBottom: 8 }}><div className="check-icon" style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed", flexShrink: 0 }}>✓</div><span style={{ fontSize: 13, lineHeight: 1.5 }}>{f}</span></div>)}
                </div>
                <ProductBuyButton code={p.code} popular={p.popular} color="#7c3aed" />
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#94a3b8" }}>3-day free trial available for all tiers · <a href="mailto:hallo@axto.io" style={{ color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>Get Sentinel Started</a></p>
        </div>
      </section>

      {/* ── EDGE PRICING ──────────────────────────────────────────── */}
      <section id="edge" style={{ padding: "100px 24px", background: "linear-gradient(160deg,#eff6ff,#dbeafe)", borderTop: "1px solid rgba(59,130,246,0.1)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#3b82f6", fontWeight: 700, marginBottom: 16 }}>⚡ AXTO EDGE — AI GATEWAY & API MANAGEMENT</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
              The Revenue & Security Layer<br /><span style={{ background: "linear-gradient(135deg,#3b82f6,#0d9488)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Every AI SaaS Needs</span>
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 680, margin: "0 auto", lineHeight: 1.7 }}>
              Every SaaS company embedding AI faces the same three problems: how to bill customers for AI usage, how to prevent prompt injection and abuse, and how to stay profitable as AI costs scale. Edge solves all three. Deploy it between your customers and AI providers — it meters every token, enforces rate limits, detects abuse in real time, and generates invoices automatically. Think of it as Stripe for AI API billing.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
              {["OpenAI-compatible gateway", "Usage metering & billing", "Self-hosted"].map(c => (
                <div key={c} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>{c}</div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <ComingSoonBanner product="edge" color="#3b82f6" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {[
              {
                name: "Starter", code: "edge_starter", price: 7990,
                limit: "Up to 100K req/day · 5 customer API keys",
                target: "Startups building AI products with multiple providers",
                features: [
                  "7 AI providers (OpenAI, Claude, Gemini, Groq, Ollama + 2)",
                  "5 customer API keys with independent rate limits",
                  "Cost-optimized routing",
                  "Prompt injection firewall",
                  "Basic request analytics dashboard",
                ],
                popular: false, savings: "100% self-hosted — no AWS API Gateway fees",
              },
              {
                name: "Professional", code: "edge_professional", price: 24900,
                limit: "Unlimited customers · 1M req/day",
                target: "SaaS startups monetizing embedded AI",
                features: [
                  "Per-customer API key issuance & revocation",
                  "Token metering: input, output, cached — per model",
                  "Rate limiting per customer tier (requests/min, tokens/day)",
                  "Prompt injection detection (50+ attack patterns)",
                  "Content filtering — block PII, NSFW, custom topics",
                  "Real-time usage dashboard per customer",
                  "OpenAI-compatible proxy — zero code change to integrate",
                  "Webhook events: quota exceeded, abuse detected",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
              {
                name: "Business", code: "edge_business", price: 40900,
                limit: "Unlimited customers · 10M req/day",
                target: "Growing AI SaaS with $1M+ ARR",
                features: [
                  "Everything in Professional",
                  "Automatic invoice generation (PDF + webhook)",
                  "Tiered customer billing plans with markup",
                  "Stripe sync for subscription management",
                  "Advanced abuse detection: jailbreak, multi-turn attacks",
                  "Model cost analytics: margin per customer",
                  "Custom firewall rules via no-code rule builder",
                  "SIEM forwarding for security events",
                  "Interactive Multi-Language Setup Guide (PDF Download)",
                ],
                popular: true, savings: "ROI in <30 days from AI cost control",
              },
              {
                name: "Enterprise", code: "edge_enterprise", price: 69000,
                limit: "Unlimited · White-label · Multi-tenant",
                target: "AI infrastructure providers, telcos, large SaaS platforms",
                features: [
                  "Everything in Business",
                  "White-label: deploy as your own branded AI gateway",
                  "Multi-tenant: resell AI gateway capacity to your customers",
                  "Custom billing engine (prepaid credits, postpaid, subscriptions)",
                  "Regulatory compliance: EU AI Act, FTC AI guidelines",
                  "Custom LLM routing logic via programmable middleware",
                  "Air-gap + VPC deployment support",
                  "Comprehensive Interactive Setup Guide (PDF, 10 Languages)",
                  "Email community support",
                ],
                popular: false, savings: "Self-hosted • predictable pricing",
              },
            ].map(p => (
              <div key={p.name} className="card" style={{ padding: 32, position: "relative", border: p.popular ? "2px solid #3b82f6" : "1px solid rgba(59,130,246,0.15)", background: p.popular ? "linear-gradient(160deg,#eff6ff,#dbeafe)" : "#fff" }}>
                {p.popular && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#3b82f6,#0d9488)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 18px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: "0.5px" }}>HIGHEST ROI</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>EDGE</span>
                  <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, background: "rgba(22,163,74,0.08)", padding: "2px 8px", borderRadius: 6 }}>{p.savings}</span>
                </div>
                <h4 style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", marginBottom: 2 }}>{p.name}</h4>
                <p style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600, marginBottom: 4 }}>{p.limit}</p>
                <p style={{ fontSize: 11, color: "#64748b", marginBottom: 18, fontStyle: "italic" }}>{p.target}</p>
                <div className="price-tag" style={{ marginBottom: 4, color: "#0a1628" }}><sup>$</sup>{lp(p.code, p.price).toLocaleString("en-US")}</div>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 22 }}>per year · annual contract · self-hosted</p>
                <div style={{ borderTop: "1px solid rgba(59,130,246,0.08)", paddingTop: 18, marginBottom: 22 }}>
                  {p.features.map(f => <div key={f} className="check-item" style={{ marginBottom: 8 }}><div className="check-icon" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", flexShrink: 0 }}>✓</div><span style={{ fontSize: 13, lineHeight: 1.5 }}>{f}</span></div>)}
                </div>
                <ProductBuyButton code={p.code} popular={p.popular} color="#3b82f6" />
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#94a3b8" }}>3-day free trial available · No credit card required · <a href="mailto:hallo@axto.io" style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}>Get Edge Started</a></p>
        </div>
      </section>

      {/* ── ANTIVIRUS PRICING ─────────────────────────────────────── */}
      <section id="antivirus" style={{ padding: "100px 24px", background: "#fff", borderTop: "1px solid rgba(234,88,12,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#ea580c", fontWeight: 700, marginBottom: 16 }}>🦠 AXTO ANTIVIRUS — ClamAV + ML ENDPOINT PROTECTION</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 14 }}>
              Enterprise Antivirus.<br /><span style={{ background: "linear-gradient(135deg,#ea580c,#dc2626)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Self-Hosted. AI-Enhanced.</span>
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 680, margin: "0 auto", lineHeight: 1.7 }}>
              ClamAV signature engine combined with ML behavioral detection and YARA custom rules. Integrates with Guardian AI for correlated threat response. REST API for CI/CD pipeline scanning. All data stays on your infrastructure.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {[
              { name: "Starter", code: "antivirus_starter", price: 2900, limit: "Up to 10 endpoints", features: ["ClamAV signature engine", "YARA custom rules", "REST API for scanning", "Quarantine management", "Scheduled & on-demand scans", "Email alerts"] },
              { name: "Professional", code: "antivirus_professional", price: 9900, limit: "Up to 100 endpoints", popular: true, features: ["All Starter features", "ML behavioral detection", "Guardian AI integration", "Real-time file monitoring", "Process reputation scoring", "SIEM log forwarding"] },
              { name: "Enterprise", code: "antivirus_enterprise", price: 29900, limit: "Unlimited endpoints", features: ["All Professional features", "Custom YARA rule builder", "SOC integration", "White-label dashboard", "Multi-tenant support", "Centralized management"] },
            ].map(p => (
              <div key={p.name} className="card" style={{ padding: 32, position: "relative", border: p.popular ? "2px solid #ea580c" : "1px solid rgba(234,88,12,0.12)", background: p.popular ? "linear-gradient(160deg,#fff7ed,#ffedd5)" : "#fff" }}>
                {p.popular && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#ea580c,#dc2626)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 18px", borderRadius: 20, whiteSpace: "nowrap" }}>BEST VALUE</div>}
                <span style={{ background: "rgba(234,88,12,0.08)", color: "#ea580c", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>ANTIVIRUS</span>
                <h4 style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", marginBottom: 2, marginTop: 8 }}>{p.name}</h4>
                <p style={{ fontSize: 12, color: "#ea580c", fontWeight: 600, marginBottom: 18 }}>{p.limit}</p>
                <div className="price-tag" style={{ marginBottom: 4, color: "#0a1628" }}><sup>$</sup>{lp(p.code, p.price).toLocaleString("en-US")}</div>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 22 }}>per year · self-hosted</p>
                <div style={{ borderTop: "1px solid rgba(234,88,12,0.08)", paddingTop: 18, marginBottom: 22 }}>
                  {p.features.map(f => <div key={f} className="check-item" style={{ marginBottom: 8 }}><div className="check-icon" style={{ background: "rgba(234,88,12,0.08)", color: "#ea580c", flexShrink: 0 }}>✓</div><span style={{ fontSize: 13, lineHeight: 1.5 }}>{f}</span></div>)}
                </div>
                <ProductBuyButton code={p.code} popular={p.popular} color="#ea580c" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STUDIO PRICING ──────────────────────────────────────── */}
      <section id="studio" style={{ padding: "100px 24px", background: "linear-gradient(160deg,#0f0a1e,#1a0f2e)", borderTop: "1px solid rgba(139,92,246,0.15)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#a78bfa", fontWeight: 700, marginBottom: 16 }}>🧠 AXTO STUDIO — AI & GPU POOL PLATFORM</span>
            <h2 style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 800, color: "#fff", letterSpacing: "-1.2px", marginBottom: 14, fontFamily: "Sora, sans-serif" }}>
              Your AI. Your GPU.<br /><span style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Your Professional Studio.</span>
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 17, maxWidth: 700, margin: "0 auto", lineHeight: 1.7 }}>
              Stop paying AI markup. Bring your own API keys — OpenAI, Claude, Gemini, Groq, DeepSeek, and 14+ providers — and use them in a professional workspace. Generate images and videos via GPU APIs. Automate full content workflows with the visual pipeline builder. Everything runs on your server. Your data never leaves your infrastructure.
            </p>
          </div>

          {/* 3 Studios visual */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 48 }}>
            {[
              { icon: "🧠", name: "AI Studio", color: "#8b5cf6", desc: "Chat with 14+ AI providers using your own API keys. Prompt library, batch processing, multi-model comparison, session history, and per-provider cost analytics." },
              { icon: "🎨", name: "GPU Studio", color: "#f59e0b", desc: "Generate images and videos using Stability AI, Replicate, Fal.ai, ComfyUI, or Automatic1111. Connect any GPU endpoint — cloud API or self-hosted." },
              { icon: "⚡", name: "Hybrid Studio", color: "#06b6d4", desc: "Visual pipeline builder — chain AI text, image generation, voice TTS/STT, sound effects, and translation into fully automated workflows." },
            ].map(s => (
              <div key={s.name} style={{ background: `${s.color}08`, border: `1.5px solid ${s.color}25`, borderRadius: 16, padding: "28px 24px" }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{s.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{s.name}</h3>
                <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Pricing cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {[
              {
                name: "Starter", code: "studio_starter", price: 49, period: "/mo",
                annual: "$490/yr (2 months free)",
                target: "Solo developers, freelancers, small teams",
                features: ["AI Studio — Chat, Batch Processing & Prompt Library", "GPU Studio — Image & Video Generation (1 endpoint)", "5 AI providers: OpenAI, Claude, Gemini, Groq, Mistral", "WebSocket streaming + REST API", "Usage analytics & per-provider cost tracking", "30-day session retention, 90-day usage logs", "Complete setup guide with menu-level documentation", "Docker Image + Windows EXE — identical builds"],
                popular: false, color: "#8b5cf6",
              },
              {
                name: "Professional", code: "studio_professional", price: 199, period: "/mo",
                annual: "$1,990/yr (2 months free)",
                target: "Teams shipping AI products, startups, agencies",
                features: ["All 3 Studios: AI Chat + GPU Generation + Hybrid Pipeline", "14+ AI providers + any OpenAI-compatible endpoint", "Unlimited GPU endpoints: Stability, Replicate, Fal.ai, ComfyUI, A1111", "REST API + WebSocket streaming on all endpoints", "Hybrid Pipeline Builder — 18 node types", "Batch AI processing with CSV export", "Multi-model compare (up to 6 models side-by-side)", "Cartoon & Animation studio + Sound & Music generation", "Voice TTS/STT in 16 languages + Voice Cloning"],
                popular: true, color: "#8b5cf6",
              },
              {
                name: "Enterprise", code: "studio_enterprise", price: 799, period: "/mo",
                annual: "$7,990/yr (2 months free)",
                target: "Organizations running AI at scale",
                features: ["All Professional features — fully unlocked", "Priority license with 4-hour offline grace period", "Dedicated support channel via email & Slack", "Access to all future Studio modules at no extra cost", "Credential encryption (Fernet/AES) — machine-bound keys", "Unlimited pipeline workflows in Hybrid Studio", "10 cartoon film templates + 6 sound design workflows", "Extended data retention: 90-day sessions, 1-year logs", "Custom endpoint support for any GPU or AI provider"],
                popular: false, color: "#8b5cf6",
              },
            ].map(p => (
              <div key={p.name} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 32, position: "relative", border: p.popular ? "2px solid #8b5cf6" : "1px solid rgba(255,255,255,0.08)" }}>
                {p.popular && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 18px", borderRadius: 20, whiteSpace: "nowrap" }}>MOST POPULAR</div>}
                <span style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>STUDIO</span>
                <h4 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 2, marginTop: 8 }}>{p.name}</h4>
                <p style={{ fontSize: 11, color: "#64748b", marginBottom: 16, fontStyle: "italic" }}>{p.target}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: "#fff", fontFamily: "Sora, sans-serif" }}><sup style={{ fontSize: 18 }}>$</sup>{p.price}</span>
                  <span style={{ fontSize: 14, color: "#64748b" }}>{p.period}</span>
                </div>
                <p style={{ fontSize: 12, color: "#a78bfa", marginBottom: 20 }}>{p.annual}</p>
                <div style={{ borderTop: "1px solid rgba(139,92,246,0.15)", paddingTop: 18, marginBottom: 22 }}>
                  {p.features.map(f => <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}><span style={{ color: "#8b5cf6", fontWeight: 700, flexShrink: 0 }}>✓</span>{f}</div>)}
                </div>
                <ProductBuyButton code={p.code} popular={p.popular} color="#8b5cf6" />
              </div>
            ))}
          </div>

          {/* Security & Privacy notice */}
          <div style={{ marginTop: 32, padding: "20px 28px", borderRadius: 14, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <span style={{ fontSize: 28 }}>🔒</span>
            <div style={{ flex: 1, minWidth: 280 }}>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Enterprise-Grade Isolation</h4>
              <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
                Every Studio instance runs on your own server with your own SQLite database. API credentials are encrypted with Fernet (AES-128-CBC) using a machine-bound key derived from your host identity — keys are never transmitted to AXTO. License validates every 30 minutes with a 4-hour offline grace period. Session data auto-purges after 30 days. Usage logs after 90 days.
              </p>
            </div>
          </div>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#475569" }}>3-day free trial · No credit card required · <a href="mailto:hallo@axto.io" style={{ color: "#a78bfa", textDecoration: "none", fontWeight: 600 }}>Contact us</a></p>
        </div>
      </section>

      {/* ── WHAT YOU GET — Delivery & Packaging ──────────────────── */}
      <section id="delivery" style={{ padding: "100px 24px", background: "linear-gradient(160deg,#f8fafc,#f1f5f9)", borderTop: "1px solid rgba(2,132,199,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ display: "inline-block", background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: 100, padding: "5px 18px", fontSize: 12, color: "#0284c7", fontWeight: 700, marginBottom: 16 }}>📦 WHAT YOU GET</span>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1px", marginBottom: 14 }}>
              Every License Includes<br /><span className="gradient-text">Docker Image + Windows EXE</span>
            </h2>
            <p style={{ color: "#475569", fontSize: 17, maxWidth: 640, margin: "0 auto", lineHeight: 1.7 }}>
              Purchase any plan — from Starter to Enterprise — and receive the complete product package. No feature gates hidden behind upsells. What your tier includes is exactly what you get.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 48 }}>
            {[
              { icon: "🐳", title: "Docker Image (Linux)", desc: "Production-ready Docker Compose stack. Pull from your private registry, run `docker compose up -d`, and your product is live in under 5 minutes. Includes health checks, auto-restart, and log rotation.", tag: "docker compose up -d" },
              { icon: "💻", title: "Windows EXE (Portable)", desc: "Single-file PyInstaller executable. No Python installation required. Double-click to run. Ideal for Windows Server environments, air-gapped networks, and quick evaluation.", tag: "axto-vault.exe --port 8080" },
              { icon: "📖", title: "Interactive Setup Guide", desc: "Step-by-step guide in 10 languages (EN, ID, AR, ZH, FR, DE, ES, PT, RU, JA). Covers installation, configuration, AI provider setup, and production hardening. Downloadable as PDF.", tag: "axto.io/guide → Download PDF" },
              { icon: "🔑", title: "License Key (Instant)", desc: "Delivered to your email within 60 seconds of purchase. Locked to 1 server (machine-id + IP). Enter in YAML config, restart, and your product activates immediately.", tag: "VAULT-A1B2-C3D4-E5F6-G7H8..." },
              { icon: "🆓", title: "3-Day Free Trial", desc: "Every product offers a free 3-day trial — full features, limited capacity, locked to one server. No credit card required. One trial per product per email address.", tag: "Register → Select Trial → Instant activation" },
              { icon: "🔄", title: "All Updates Included", desc: "Your annual license includes every update released during the license period. New features, security patches, and performance improvements — all included at no extra cost.", tag: "docker pull :latest → restart" },
            ].map(item => (
              <div key={item.title} className="card" style={{ padding: 28 }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 14 }}>{item.desc}</p>
                <code style={{ fontSize: 11, color: "#0284c7", background: "rgba(2,132,199,0.06)", padding: "6px 10px", borderRadius: 6, display: "block", wordBreak: "break-all" }}>{item.tag}</code>
              </div>
            ))}
          </div>

          {/* License enforcement notice */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "32px 40px", border: "1px solid rgba(2,132,199,0.12)", display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ fontSize: 36 }}>🔒</div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>License Enforcement</h3>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
                Each license key is cryptographically bound to a single machine (machine-id + IP address + instance). License validation occurs every 30 minutes with a 4-hour offline grace period. Attempting to run on multiple servers or share keys will result in automatic suspension. This ensures every client receives the full value of their investment without unfair usage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRIAL CTA BANNER ─────────────────────────────────────── */}
      <section style={{ padding: "60px 24px", background: "linear-gradient(135deg,#0284c7,#0d9488)", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, color: "#fff", marginBottom: 14, letterSpacing: "-0.5px" }}>
            Try Any Product Free for 3 Days
          </h2>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, lineHeight: 1.7, marginBottom: 28, maxWidth: 560, margin: "0 auto 28px" }}>
            Full features. No credit card. One click to activate. Experience the complete AXTO platform on your own infrastructure before you commit.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {["Guardian","Orchestra","Vault","Edge","SOC","Compliance","Sentinel","Antivirus"].map(p => {
              const product = p.toLowerCase();
              const forSale = isProductForSale(product);
              if (!forSale) {
                return (
                  <span key={p} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 700 }}>
                    {p} — Coming Soon
                  </span>
                );
              }
              return (
                <Link key={p} href={`/register?pkg=trial_${product}`} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", transition: "all 0.15s", backdropFilter: "blur(4px)" }}>
                  {p} Trial →
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 800, color: "#0a1628", letterSpacing: "-1.2px", marginBottom: 18 }}>
            Ready to Take Control of<br />
            <span className="gradient-text">Your AI Infrastructure?</span>
          </h2>
          <p style={{ color: "#475569", fontSize: 17, lineHeight: 1.7, marginBottom: 40 }}>
            Deploy in under 30 minutes. No vendor lock-in. No data sharing. Just powerful, enterprise-grade AI infrastructure — fully under your control.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#pricing" className="btn-primary" style={{ fontSize: 16, padding: "15px 36px" }}>{t("hero.cta")}</a>
            <a href="mailto:hallo@axto.io" className="btn-secondary" style={{ fontSize: 16, padding: "15px 36px" }}>Contact Us</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer style={{ background: "#0a1628", color: "#94a3b8", padding: "56px 24px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡</div>
                <span style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "Sora, sans-serif" }}>AXTO</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>AI eXecution & Tools Orchestration that you own, control, and deploy on your own servers. Zero data custody. 100% BYOK.</p>
              <p style={{ fontSize: 13, marginTop: 16 }}>✉ hallo@axto.io</p>
            </div>
            <div>
              <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Products</h4>
              {["Guardian AI","Orchestra AI","Vault","Edge","SOC","Compliance","Sentinel","Antivirus","Studio"].map(l => <div key={l} style={{ marginBottom: 10 }}><a href={`#${l.toLowerCase().replace(" ai","")}`} style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>{l}</a></div>)}
            </div>
            <div>
              <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Resources</h4>
              {[["Setup Guide","/guide"],["Playbooks","/playbooks"],["Terms of Service","/terms"],["Privacy Policy","/privacy"]].map(([l,h]) => <div key={l} style={{ marginBottom: 10 }}><Link href={h} style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>{l}</Link></div>)}
            </div>
            <div>
              <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Legal</h4>
              {[["Terms of Service","/terms"],["Privacy Policy","/privacy"],["Security","/privacy"]].map(([l,h]) => <div key={l} style={{ marginBottom: 10 }}><Link href={h} style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>{l}</Link></div>)}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#334155" }}>
            <span>© {new Date().getFullYear()} AXTO. All rights reserved. Prices in USD.</span>
            <span style={{ color: "#0284c7" }}>100% BYOK — Your keys never leave your server</span>
          </div>
        </div>
      </footer>
    </>
  );
}
