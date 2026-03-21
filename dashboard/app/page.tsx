"use client";
export const runtime = "edge";
import Link from "next/link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

// ── Updated pricing (USD, market-competitive, BYOK premium) ─────────────
const GUARDIAN_PRICING = [
  {
    name: "Sentinel",
    code: "lite",
    price: 249,
    period: "/year",
    servers: "1 server",
    desc: "Perfect for individual developers & small workloads.",
    features: ["AI Behavioral Analysis","Real-time Threat Feed","Email & Webhook Alerts","Automated Quarantine","1 Node Dashboard"],
    popular: false,
    color: "#0284c7",
  },
  {
    name: "Pro",
    code: "pro",
    price: 990,
    period: "/year",
    servers: "Up to 20 servers",
    desc: "The right scale for growing teams and infrastructure.",
    features: ["All Sentinel features","Threat Hunting & UEBA","Central Multi-Server Dashboard","API Access & Integrations","Compliance Reports (SOC2, ISO)"],
    popular: true,
    color: "#0284c7",
  },
  {
    name: "Business",
    code: "shield",
    price: 3990,
    period: "/year",
    servers: "Up to 100 servers",
    desc: "Enterprise-grade protection for serious operations.",
    features: ["All Pro features","eBPF Deep Inspection","mTLS Node Encryption","SIEM / SOAR Integration","Rootkit & Memory Scanner","Custom Alert Runbooks"],
    popular: false,
    color: "#0284c7",
  },
  {
    name: "Enterprise",
    code: "aegis",
    price: 17900,
    period: "/year",
    servers: "Up to 1,000 servers",
    desc: "Unlimited scale, white-label, dedicated SLA.",
    features: ["All Business features","1,000 Node Support","Custom SLA & Uptime Guarantee","White-label Dashboard","Priority Dedicated Support","Custom Threat Feed"],
    popular: false,
    color: "#7c3aed",
  },
];

const ORCHESTRA_PRICING = [
  {
    name: "Core",
    code: "orchestra_core",
    price: 9900,
    period: "/year",
    workers: "Up to 10 workers",
    desc: "Ideal for startups routing AI workloads across providers.",
    features: ["CPU & GPU Worker Support","5 Routing Strategies","OpenAI, Claude, Gemini, Ollama","Cost Optimization Engine","Basic Analytics Dashboard"],
    popular: false,
  },
  {
    name: "Scale",
    code: "orchestra_scale",
    price: 24900,
    period: "/year",
    workers: "Up to 50 workers",
    desc: "For teams running multiple AI pipelines at scale.",
    features: ["All Core features","All Routing Modes (6 strategies)","Priority Job Queue","Auto Failover & Health Checks","Advanced Performance Analytics","Custom Provider Endpoints"],
    popular: true,
  },
  {
    name: "Enterprise",
    code: "orchestra_unlimited",
    price: 59900,
    period: "/year",
    workers: "Unlimited workers",
    desc: "No limits. Full control. Dedicated support.",
    features: ["All Scale features","Unlimited Workers (CPU + GPU)","Custom Routing Logic","White-label API Gateway","Dedicated Infrastructure Support","Federation (Multi-Region)"],
    popular: false,
  },
];

const BUNDLE_PRICING = [
  {
    name: "Starter Bundle",
    code: "bundle_starter",
    guardian: "Guardian Pro",
    orchestra: "Orchestra Core",
    originalPrice: 990 + 9900,
    bundlePrice: 9490,
    savings: 990 + 9900 - 9490,
    color: "#0284c7",
    highlight: false,
  },
  {
    name: "Professional Bundle",
    code: "bundle_professional",
    guardian: "Guardian Business",
    orchestra: "Orchestra Scale",
    originalPrice: 3990 + 24900,
    bundlePrice: 24900,
    savings: 3990 + 24900 - 24900,
    color: "#0d9488",
    highlight: true,
  },
  {
    name: "Enterprise Bundle",
    code: "bundle_enterprise",
    guardian: "Guardian Enterprise",
    orchestra: "Orchestra Enterprise",
    originalPrice: 17900 + 59900,
    bundlePrice: 69900,
    savings: 17900 + 59900 - 69900,
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
  const fmtUSD = (n: number) =>
    "$" + n.toLocaleString("en-US");

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
            {[["#features","Features"],["#pricing","Pricing"],["#byok","BYOK"],["#playbooks","Playbooks"],["#faq","FAQ"],["/guide","📖 Guide"]].map(([href,label])=>(
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
            AI eXecution & Tools Orchestration · Self-Hosted · BYOK
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
              { value: "99.9%", label: "Uptime SLA", icon: "📈" },
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

      {/* ── BYOK SECTION ──────────────────────────────────────────── */}
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
                  MOST POPULAR
                </div>
              )}
              <div style={{ marginBottom: 6 }}>
                <span style={{ background: "rgba(2,132,199,0.08)", color: "#0284c7", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>GUARDIAN</span>
              </div>
              <h4 style={{ fontSize: 22, fontWeight: 800, color: "#0a1628", marginBottom: 2, fontFamily: "Sora, sans-serif" }}>{p.name}</h4>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>{p.servers}</p>
              <div className="price-tag" style={{ marginBottom: 4, color: "#0a1628" }}>
                <sup>$</sup>{p.price.toLocaleString("en-US")}
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
                  MOST POPULAR
                </div>
              )}
              <div style={{ marginBottom: 6 }}>
                <span style={{ background: "rgba(13,148,136,0.08)", color: "#0d9488", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>ORCHESTRA</span>
              </div>
              <h4 style={{ fontSize: 22, fontWeight: 800, color: "#0a1628", marginBottom: 2, fontFamily: "Sora, sans-serif" }}>{p.name}</h4>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>{p.workers}</p>
              <div className="price-tag" style={{ marginBottom: 4, color: "#0a1628" }}>
                <sup>$</sup>{p.price.toLocaleString("en-US")}
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
                  <span style={{ fontSize: 28, fontWeight: 900, color: "#0a1628", fontFamily: "Sora, sans-serif" }}>${p.price}</span>
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

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section id="faq" style={{ background: "linear-gradient(160deg, #f0f9ff, #ecfdf5)", padding: "100px 24px", borderTop: "1px solid rgba(2,132,199,0.08)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 className="font-display" style={{ fontSize: 38, fontWeight: 800, color: "#0a1628", letterSpacing: "-1px", marginBottom: 12 }}>Frequently Asked Questions</h2>
            <p style={{ color: "#64748b", fontSize: 16 }}>Everything you need to know before you deploy</p>
          </div>
          {[
            {
              q: "Does AXTO have access to my server data or AI responses?",
              a: "Absolutely not. Guardian and Orchestra are fully self-hosted on your infrastructure. The only communication with AXTO's servers is a periodic license heartbeat — a machine fingerprint hash, nothing more. Your server telemetry, AI queries, API keys, and responses never leave your environment.",
            },
            {
              q: "What does BYOK (Bring Your Own Keys) mean in practice?",
              a: "Your AI provider credentials (OpenAI, Anthropic, Gemini, etc.) are stored in a config file on your own server. Orchestra reads these keys locally and makes API calls directly from your infrastructure. AXTO has no copy of your keys and no route to access them.",
            },
            {
              q: "How long does the initial setup take?",
              a: "Most clients complete Guardian or Orchestra setup in under 30 minutes using Docker Compose. Our setup guide walks through every step, including certificate generation, environment configuration, and database initialization. Admin portal is accessible immediately after deployment.",
            },
            {
              q: "Can I run Guardian and Orchestra on the same server?",
              a: "Yes. Both products are containerized and can run on the same host using separate Docker Compose stacks. For large-scale deployments, we recommend separate hosts for better isolation and resource control.",
            },
            {
              q: "Is there a free trial?",
              a: "We offer a 14-day evaluation license on request. Contact us at hallo@axto.io with your use case and we will issue a trial key promptly.",
            },
            {
              q: "What happens if my license expires?",
              a: "Both products will continue operating in read-only mode for a 7-day grace period after expiry. You will receive automated renewal reminders at 30 days, 14 days, and 3 days before the license expiry date.",
            },
          ].map((item, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", marginBottom: 14, border: "1px solid rgba(2,132,199,0.1)", boxShadow: "0 2px 8px rgba(2,132,199,0.06)" }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: "#0a1628", marginBottom: 10 }}>{item.q}</h4>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.75 }}>{item.a}</p>
            </div>
          ))}
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
            <a href="#pricing" className="btn-primary" style={{ fontSize: 16, padding: "15px 36px" }}>Get Your License →</a>
            <a href="mailto:hallo@axto.io" className="btn-secondary" style={{ fontSize: 16, padding: "15px 36px" }}>Talk to Sales</a>
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
              {["Guardian AI","Orchestra AI","Bundle Plans","Pricing"].map(l => <div key={l} style={{ marginBottom: 10 }}><a href="#features" style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>{l}</a></div>)}
            </div>
            <div>
              <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Resources</h4>
              {["Documentation","Setup Guide","API Reference","Changelog"].map(l => <div key={l} style={{ marginBottom: 10 }}><a href="#" style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>{l}</a></div>)}
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
