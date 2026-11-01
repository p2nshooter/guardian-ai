/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * LINKEDIN — the promotion library posted automatically, one post a day per
 * brand (owner, 28 Oct 2026, REQUESTS 123: "2 post tiap hari dari xaa.es &
 * axto.io … termasuk hastag nya"). 28 posts per brand = four weeks without a
 * repeat, then the rotation starts again.
 *
 * Every claim comes from the catalogues as shipped — axto.io: lib/apps.ts,
 * lib/product-catalog.ts, lib/trials.ts, lib/auction-terms.ts; xaa.es:
 * src/content/packages.ts, templates.ts, portfolio.ts in the xaa repository.
 * No revenue, user or traffic figures. Prices are "from" prices.
 *
 * `image` describes the 1200×627 card drawn by docs/linkedin/build-library.ts
 * into public/social/linkedin/<brand>/<id>.jpg (HTML allowed: <em>, <b>).
 * ============================================================================ */

export type BrandId = "axto" | "xaa";
export const BRAND_IDS: BrandId[] = ["axto", "xaa"];
export const BRAND_NAMES: Record<BrandId, string> = { axto: "axto.io", xaa: "xaa.es" };
export const BRAND_SITES: Record<BrandId, string> = { axto: "https://axto.io", xaa: "https://xaa.es" };

export interface PostImage { eyebrow: string; title: string; sub?: string; bullets: string[]; big?: [string, string] }
export interface LibraryPost {
  id: string;
  brand: BrandId;
  /** Path on the brand's site the post links to. */
  path: string;
  /** Plain text with line breaks; hashtags are added from `hashtags`. */
  text: string;
  hashtags: string[];
  image: PostImage;
}

const P = (brand: BrandId, id: string, path: string, image: PostImage, text: string, hashtags: string[]): LibraryPost =>
  ({ id: `${brand}-${id}`, brand, path, image, text: text.trim(), hashtags });

/* ── axto.io ─────────────────────────────────────────────────────────────── */
const AXTO: LibraryPost[] = [
  P("axto", "01-ten-apps", "/self-hosted",
    { eyebrow: "Self-hosted suite", title: "Ten apps. <em>Your servers.</em>", sub: "AI & cybersecurity you run yourself — Windows and Linux.", bullets: ["Download from your portal, activate with your licence", "Bring your own AI keys — zero token markup", "Your data stays on your hardware"], big: ["10", "self-hosted<br>applications"] },
    `Ten apps. Your servers.

axto.io is a suite of AI and cybersecurity applications you run yourself:
Guardian AI · Orchestra AI · Vault AI · Edge AI · SOC AI · Compliance AI · Sentinel OT · Antivirus · AXTO Studio · AXTO Legal

Download each one from your portal for Windows or Linux, activate it with your licence, and bring your own AI keys. Your data stays on your hardware.`,
    ["SelfHosted", "Cybersecurity", "ArtificialIntelligence", "OnPremise", "Docker"]),
  P("axto", "02-orchestra", "/self-hosted/orchestra",
    { eyebrow: "Orchestra AI", title: "One console for <em>every AI worker</em>", sub: "Cloud models on your keys and open models on your own GPU.", bullets: ["Seven routing modes with failover and a circuit breaker", "Queue, logs and cost on one screen", "Auto and manual scaling inside your licence"] },
    `One console for every AI worker.

Orchestra AI sends each request to the right worker — a cloud model with your own key, or an open model on your own GPU — and keeps the queue, logs and cost on one screen.

• Seven routing modes: smart balance, cost-first, quality-first, local-first, failover, semantic and round-robin
• A circuit breaker and automatic fallback
• Auto and manual scaling inside your licence

The guide, with screenshots and video:`,
    ["AIOrchestration", "LLM", "MLOps", "GenerativeAI", "DevOps"]),
  P("axto", "03-gpu-worker", "/self-hosted/orchestra",
    { eyebrow: "GPU worker", title: "Your graphics card, <em>working smart</em>", sub: "Run Llama, Qwen or Mistral on your own card.", bullets: ["NVIDIA, AMD, Intel and Apple detected automatically", "Overheat protection moves jobs to a cooler card", "Live suggestions: which GPU is free right now"] },
    `Your graphics card, working smart.

The Orchestra GPU worker runs open models such as Llama, Qwen or Mistral on your own card — prompts stay on your machine and there is no per-token fee.

• NVIDIA, AMD, Intel and Apple GPUs detected automatically
• Overheat protection pauses a hot card and sends the next jobs to a cooler one
• Live suggestions tell you which GPU is free right now`,
    ["GPU", "LocalAI", "OpenSourceAI", "EdgeComputing", "LLM"]),
  P("axto", "04-guardian", "/self-hosted/guardian",
    { eyebrow: "Guardian AI", title: "AI cybersecurity <em>for your servers</em>", sub: "Agents report to your own Guardian core.", bullets: ["Process, network, file-integrity and DNS monitoring", "Incident management and automated response", "Runs on your infrastructure, under your licence"] },
    `AI cybersecurity for your servers.

Guardian AI watches processes, network connections, file integrity and DNS, opens incidents and responds automatically. Its agents report to your own Guardian core — not to a cloud you don't control.`,
    ["Cybersecurity", "ThreatDetection", "IncidentResponse", "InfoSec", "ServerSecurity"]),
  P("axto", "05-vault-ai", "/self-hosted/vault",
    { eyebrow: "Vault AI", title: "Redact personal data <em>before any model sees it</em>", bullets: ["Sits in front of every AI provider", "Real values come back in the answer", "Every redaction logged — the originals never are"] },
    `Redact personal data before any model sees it.

Vault AI sits in front of every AI provider your teams use. Personal, health and financial data is masked before the prompt leaves your network, the real values come back in the answer, and every redaction is logged — the originals never are.`,
    ["DataPrivacy", "GDPR", "AIGovernance", "PII", "ResponsibleAI"]),
  P("axto", "06-security-ops", "/self-hosted",
    { eyebrow: "Security operations", title: "SOC, compliance and OT security — <em>on your premises</em>", bullets: ["SOC AI — AI-assisted SIEM and SOAR", "Compliance AI — continuous audit monitoring", "Sentinel OT and multi-engine Antivirus"] },
    `SOC, compliance and OT security — on your premises.

• SOC AI — AI-assisted SIEM and SOAR
• Compliance AI — continuous, automated audit monitoring
• Sentinel OT — security for industrial IoT and OT networks
• Antivirus — self-hosted, multi-engine malware scanning

Each one is a Docker app for Windows and Linux, activated with an official licence.`,
    ["SOC", "SIEM", "Compliance", "OTSecurity", "Malware"]),
  P("axto", "07-axto-legal", "/self-hosted/legal",
    { eyebrow: "AXTO Legal", title: "Private AI <em>for legal work</em>", sub: "Client documents are not handed to a new vendor.", bullets: ["Research, contract review and drafting", "Due diligence, negotiation and litigation strategy", "Runs on your own AI keys"], big: ["36", "practice<br>workspaces"] },
    `Private AI for legal work.

AXTO Legal brings 36 practice workspaces — research, contract review and drafting, due diligence, negotiation, litigation strategy and compliance — and runs on your own AI keys, so client documents are not handed to a new vendor.`,
    ["LegalTech", "LegalAI", "LawFirms", "ContractReview", "Lawyers"]),
  P("axto", "08-licence", "/pricing",
    { eyebrow: "Download & licence", title: "Download freely. <em>Run it licensed.</em>", bullets: ["Every app from your portal, Windows or Linux", "Licences checked with signed answers", "Lifetime licences can be activated offline"] },
    `Download freely. Run it licensed.

Every AXTO app comes from your portal, for Windows or Linux. Licences are checked with signed answers, a lifetime licence can be activated offline, and you always bring your own AI keys — zero token markup.

Monthly plans and lifetime licences:`,
    ["SoftwareLicensing", "SelfHosted", "Windows", "Linux", "EnterpriseSoftware"]),
  P("axto", "09-legal-ai", "/apps/legal",
    { eyebrow: "Legal AI · cloud", title: "36 expert workspaces, <em>200+ jurisdictions</em>", sub: "Down to the province.", bullets: ["Case Builder, redline and playbook review", "Clause library, deadlines and citations", "Encrypted matters, export anywhere"] },
    `Legal research and drafting, jurisdiction by jurisdiction.

Legal AI on axto.io gives lawyers 36 expert workspaces across 200+ jurisdictions, down to the province — with a Case Builder, redline and playbook review, a clause library, and deadline and citation tools. Matters are encrypted per account.`,
    ["LegalAI", "LegalTech", "LawFirm", "ContractManagement", "LegalResearch"]),
  P("axto", "10-ai-studio", "/apps/studio",
    { eyebrow: "AI Studio", title: "Every leading model, <em>side by side</em>", sub: "One private workspace.", bullets: ["Files, images and voice", "Live code and artifacts", "Your own key — or a model on your device"] },
    `Every leading AI model in one private workspace.

AI Studio puts the models you use side by side — with files, images, voice, live code and artifacts, your own assistants and answer versions. It runs on your own key, or on a model on your own computer.`,
    ["GenerativeAI", "AITools", "Productivity", "LLM", "ArtificialIntelligence"]),
  P("axto", "11-clipper", "/apps/clipper",
    { eyebrow: "Clipper", title: "Long videos into <em>short clips</em>", sub: "Scored, reframed, captioned — rendered on your device.", bullets: ["Virality score with four sub-scores", "Auto-reframe with face tracking", "8 animated caption styles"] },
    `Turn long videos into short clips — on your own device.

Clipper scores every moment for virality, reframes with face tracking, adds animated captions in 8 styles and lets you edit by editing the transcript. The rendering happens in your browser, so the video never has to be uploaded.`,
    ["VideoMarketing", "ContentCreation", "ShortFormVideo", "Reels", "CreatorEconomy"]),
  P("axto", "12-privacy-vault", "/apps/vault",
    { eyebrow: "Privacy Vault", title: "Redact first. <em>Ask AI safely.</em>", sub: "Text, Word, Excel, PDFs and images — on your device.", bullets: ["65 data types, each scored", "True redaction for files", "Compliance profiles and an audit report"], big: ["65", "kinds of personal<br>data and secrets"] },
    `Find and redact personal data before you share it — or ask AI about it.

Privacy Vault detects 65 kinds of personal data and secrets in text, Word, Excel, PDFs and images, on your own device, then lets you ask AI with the sensitive parts removed. Five redaction styles, compliance profiles and an audit report.`,
    ["DataProtection", "Privacy", "GDPR", "PII", "InfoSec"]),
  P("axto", "13-compliance-center", "/apps/compliance",
    { eyebrow: "Compliance Center", title: "342 controls, <em>7 frameworks</em>", sub: "ISO 27001, SOC 2, NIST CSF, PCI DSS, HIPAA, GDPR and UU PDP.", bullets: ["Evidence mapped across frameworks", "Risks, policies and vendors", "Readiness reports and exports"] },
    `Run your compliance programme in one place.

Compliance Center brings 342 real controls across ISO 27001, SOC 2, NIST CSF, PCI DSS, HIPAA, GDPR and Indonesia's UU PDP — with evidence mapped across frameworks, risks, policies, vendors and readiness reports.`,
    ["Compliance", "ISO27001", "SOC2", "GRC", "RiskManagement"]),
  P("axto", "14-security-analyst", "/apps/security",
    { eyebrow: "Security Analyst", title: "Investigate incidents <em>as cases</em>", bullets: ["Logs parsed on your device", "MITRE ATT&CK, IOCs and phishing analysis", "Reports and detection rules"] },
    `Investigate incidents as cases.

Security Analyst parses logs on your own device, maps findings to MITRE ATT&CK, extracts IOCs, analyses phishing and turns the work into reports and detection rules — with an AI analyst on your own keys.`,
    ["SOC", "ThreatHunting", "MITREATTACK", "IncidentResponse", "BlueTeam"]),
  P("axto", "15-prompt-library", "/apps/prompts",
    { eyebrow: "Prompt Library", title: "240 expert prompts, <em>24 professions</em>", bullets: ["Run and compare models in place", "Build and optimise your own prompts", "Multi-step workflows and profiles"], big: ["240", "expert prompts"] },
    `Better answers start with better prompts.

The Prompt Library holds 240 expert prompts for 24 professions at four levels. Run them in place, compare models side by side, and build your own prompts and multi-step workflows.`,
    ["PromptEngineering", "GenerativeAI", "Productivity", "AITools", "FutureOfWork"]),
  P("axto", "16-byok", "/pricing",
    { eyebrow: "Bring your own key", title: "Your AI keys. <em>Zero token markup.</em>", bullets: ["Pay AI providers directly", "Requests are only relayed — never stored", "Keys encrypted at rest"] },
    `Your AI keys. Zero token markup.

On axto.io every AI request runs on your own key with the provider you choose. You pay the provider directly; AXTO relays the request and never stores it or trains on it. Keys are encrypted at rest.`,
    ["BYOK", "AIGovernance", "CloudCost", "GenerativeAI", "DataPrivacy"]),
  P("axto", "17-local-mode", "/",
    { eyebrow: "Local Mode", title: "AI that runs <em>on your own computer</em>", bullets: ["Connect Ollama, LM Studio or any OpenAI-compatible server", "The prompt is built in your browser", "The request never passes through our servers"] },
    `AI that runs on your own computer.

With Local Mode, axto.io connects to Ollama, LM Studio or any OpenAI-compatible server on your machine. The prompt is built in your browser and the AI request never passes through AXTO's servers.`,
    ["LocalAI", "Ollama", "OpenSourceAI", "Privacy", "OnDeviceAI"]),
  P("axto", "18-on-device", "/security",
    { eyebrow: "Privacy by design", title: "Files that <em>never leave the device</em>", bullets: ["PDFs, spreadsheets, scans and videos processed in the browser", "Saved work encrypted per account", "Never store what we do not need"] },
    `Files that never leave the device.

Documents, PDFs, spreadsheets, images, scans and videos are opened, read, redacted, rendered and exported in your browser on axto.io — nothing is uploaded for processing. Saved work is encrypted with a key unique to each account.`,
    ["PrivacyByDesign", "DataSecurity", "ZeroTrust", "Encryption", "CyberSecurity"]),
  P("axto", "19-connect", "/developers",
    { eyebrow: "AXTO Connect", title: "Real-time APIs <em>for developers</em>", bullets: ["REST, SSE, WebSocket, HTTP/2 streaming and WebRTC", "Signed webhooks and a gRPC-compatible Connect API", "An MCP server for AI agents"] },
    `Build on axto.io in real time.

AXTO Connect gives every paid plan API keys, live event channels, AI streaming, WebRTC rooms, signed webhooks and an MCP server for AI agents — over REST, Server-Sent Events, WebSocket, long polling, HTTP/2 streaming and a gRPC-compatible Connect API.`,
    ["API", "Developers", "WebSockets", "MCP", "RealTime"]),
  P("axto", "20-client-api", "/self-hosted/orchestra",
    { eyebrow: "Orchestra client API", title: "Plug your apps into <em>your own AI fleet</em>", bullets: ["OpenAI-compatible /v1 endpoints", "Client keys with budgets", "Routed to cloud keys or your own GPUs"] },
    `Plug your own apps into your own AI fleet.

Orchestra AI exposes an OpenAI-compatible API (/v1/models and /v1/chat/completions). Give each app its own client key and budget, and Orchestra routes every call to the best worker — a cloud model on your key or an open model on your GPU.`,
    ["OpenAI", "APIs", "LLMOps", "AIEngineering", "SelfHosted"]),
  P("axto", "21-scaling", "/self-hosted/orchestra",
    { eyebrow: "Smart scaling", title: "Scale up when busy, <em>cool down when hot</em>", bullets: ["Auto-scale and manual scale inside your licence", "Temperature and load for every GPU", "A hot card is paused before it throttles"] },
    `Scale up when it's busy, cool down when it's hot.

Orchestra AI shows the temperature and load of every GPU, scales workers automatically or on your command within your licence, and pauses a card that runs hot — sending its next jobs to a cooler one.`,
    ["GPU", "Scalability", "MLOps", "Infrastructure", "AIOps"]),
  P("axto", "22-auction", "/auction",
    { eyebrow: "Licence auction", title: "Every package, <em>every two weeks</em>", sub: "Bidding opens below the normal price.", bullets: ["Real bids from signed-in members", "A last-minute bid extends the clock", "The winner pays through the normal checkout"] },
    `The axto.io licence auction.

Every two weeks, the editions go up for auction (and a lifetime licence when our team puts one up). Bidding opens below the normal price, a bid in the last minutes extends the clock, and the winner pays through the normal checkout. The licence is issued the moment the payment is confirmed.`,
    ["Auction", "SoftwareDeals", "SaaS", "Licensing", "Cybersecurity"]),
  P("axto", "23-lifetime", "/pricing",
    { eyebrow: "Lifetime licences", title: "Pay once. <em>Run it for life.</em>", bullets: ["1 to 100 devices", "Ed25519-signed offline activation", "Per app or for the whole suite"] },
    `Pay once. Run it for life.

Lifetime licences on axto.io cover one app or the whole suite, for 1 to 100 devices, with Ed25519-signed offline activation — for networks that are never online.`,
    ["SoftwareLicensing", "OfflineFirst", "AirGapped", "Cybersecurity", "SelfHosted"]),
  P("axto", "24-ten-languages", "/",
    { eyebrow: "Global from day one", title: "Ten languages, <em>one platform</em>", bullets: ["Every app and the member portal translated", "Payments from PayPal and cards to QRIS, crypto and wires", "Run it where your team works"], big: ["10", "languages"] },
    `Built for teams everywhere.

axto.io works in ten languages — every app and the member portal. Payments run from PayPal and cards to QRIS, crypto and bank transfer.`,
    ["Localization", "GlobalBusiness", "SaaS", "AI", "Multilingual"]),
  P("axto", "25-setup", "/self-hosted",
    { eyebrow: "AXTO Setup", title: "One installer for <em>Windows and Linux</em>", bullets: ["Choose the apps, the installer does the rest", "Portal downloads resume after a dropped connection", "An offline package for networks without internet"] },
    `Install the whole stack in one go.

AXTO Setup installs the apps you choose on Windows or Linux. Downloads from your portal resume if the connection drops, and an offline package carries every image for networks that are not connected to the internet.`,
    ["Docker", "Windows", "Linux", "DevOps", "SelfHosted"]),
  P("axto", "26-edge-ai", "/self-hosted/edge",
    { eyebrow: "Edge AI", title: "An AI gateway <em>for your customers</em>", bullets: ["Per-customer API keys, limits and plans", "Token metering, tiered plans and invoices", "A prompt-injection firewall"] },
    `Sell AI to your customers through your own gateway.

Edge AI is an AI gateway and API management layer you host yourself: per-customer API keys with limits and plans, token metering with tiered plans and invoices, and a prompt-injection firewall in front of the models.`,
    ["APIGateway", "APIManagement", "AIInfrastructure", "SaaS", "Developers"]),
  P("axto", "27-studio-sh", "/self-hosted/studio",
    { eyebrow: "AXTO Studio", title: "Your self-hosted <em>AI & GPU workspace</em>", bullets: ["Chat across 10+ providers on your own keys", "Images and video on your GPU endpoints", "Visual pipelines: local first, cloud on overflow"] },
    `Your team's AI workspace, on your own hardware.

AXTO Studio is the self-hosted AI and GPU workspace: chat across 10+ providers on your own keys, create images and video with your connected GPU endpoints, and chain AI and GPU steps in visual pipelines — local first, cloud on overflow.`,
    ["AIWorkspace", "GPU", "OnPremise", "GenerativeAI", "Enterprise"]),
  P("axto", "28-trial", "/self-hosted",
    { eyebrow: "Try before you buy", title: "A free trial licence <em>for every app</em>", sub: "Professional edition, from a limited pool per app.", bullets: ["Claimed in your portal in one click", "The install command arrives by e-mail", "Upgrade to a plan or a lifetime licence"] },
    `Try any AXTO app on your own servers.

Each self-hosted app has a limited pool of free trial licences (Professional edition). Claim one in your portal, receive the install command by e-mail, and run it on your own hardware before you buy.`,
    ["FreeTrial", "Cybersecurity", "SelfHosted", "AI", "Docker"]),
];

/* ── xaa.es ──────────────────────────────────────────────────────────────── */
const XAA: LibraryPost[] = [
  P("xaa", "01-studio", "/",
    { eyebrow: "The studio", title: "Websites & software <em>that sell</em>", sub: "From a first landing page to a global platform.", bullets: ["Websites, commerce, SaaS and enterprise systems", "English, Spanish and Indonesian", "You own what we build"] },
    `Websites & software that sell.

xaa.es builds everything from a first landing page to a global platform:
• Websites — landing pages, portfolios, company and corporate sites
• Commerce — from a first catalogue to multi-warehouse operations
• Products & SaaS, enterprise systems, and AI backup & recovery your team runs

In English, Spanish and Indonesian.`,
    ["WebDevelopment", "SoftwareDevelopment", "Ecommerce", "SaaS", "DigitalAgency"]),
  P("xaa", "02-pay-in-steps", "/process",
    { eyebrow: "How we work", title: "You pay in steps. <em>You own the code.</em>", bullets: ["10% deposit, 40% at production", "The last 50% only after you've seen it running", "Code, designs and accounts transfer at handover"] },
    `You pay in steps. You own the code.

• 10% deposit to start, 40% at production, the last 50% only after you've seen it running
• A real completion date from day one
• Source code, designs and accounts transfer to you at handover`,
    ["ProjectManagement", "ClientExperience", "SoftwareOwnership", "WebDesign", "Transparency"]),
  P("xaa", "03-packages", "/services",
    { eyebrow: "Clear packages", title: "From €500 <em>to enterprise</em>", sub: "Priced in EUR and scoped before you commit.", bullets: ["Landing page from €500", "Professional e-commerce from €10,000", "SaaS / web application from €35,000"] },
    `From €500 to enterprise.

Fixed packages, priced in EUR and scoped before you commit:
• Landing page from €500
• Company profile website from €2,500
• Professional e-commerce from €10,000
• SaaS / web application from €35,000
• Enterprise platforms and global ecosystems, scoped with you`,
    ["WebDevelopment", "SmallBusiness", "Startups", "Ecommerce", "Pricing"]),
  P("xaa", "04-care", "/care",
    { eyebrow: "Setup & care", title: "Backups and recovery <em>your own team runs</em>", bullets: ["One-click backups and restore", "Database reset and an AI web-fix", "No retainer, no lock-in"], big: ["€149", "setup plans<br>from"] },
    `Backups and recovery your own team runs.

We install an AI backup & recovery system once, at setup. From then on you run it from your project portal: one-click daily, weekly and monthly backups, one-click restore and database reset, and an AI web-fix. Setup plans start at €149 — no monthly retainer, no lock-in.`,
    ["BackupAndRecovery", "DevOps", "WebsiteMaintenance", "BusinessContinuity", "CloudOps"]),
  P("xaa", "05-templates", "/templates",
    { eyebrow: "SaaS templates", title: "Start from a <em>working template</em>", bullets: ["18 SaaS templates from €390", "Waitlist & Landing live with a demo", "Others built to order on one shared core"], big: ["18", "SaaS templates"] },
    `Start from a working template.

Our catalogue lists 18 SaaS templates from €390. Waitlist & Landing is live with a demo today; CRM, invoicing, booking, help desk, courses, e-commerce and more are built to order on the same shared core.`,
    ["SaaS", "Startups", "WebApps", "ProductLaunch", "MVP"]),
  P("xaa", "06-civic", "/election-systems",
    { eyebrow: "Election & civic systems", title: "Software that has to work <em>on one particular day</em>", bullets: ["Voter-roll verification", "A field register that works with no signal", "A defensible recapitulation the same evening"] },
    `Software that has to work on one particular day.

Voter-roll verification, a field register that works with no signal, and a tally that produces a defensible recapitulation the same evening — from one village to a nation. Our demos are the real applications, with every person replaced by generated data.`,
    ["CivicTech", "GovTech", "Elections", "DigitalGovernment", "PublicSector"]),
  P("xaa", "07-landing-page", "/services/landing-page",
    { eyebrow: "Landing page", title: "A page that <em>converts</em>", sub: "From €500.", bullets: ["Hero, offer, pricing, testimonials and FAQ", "A Core Web Vitals performance pass", "Analytics and goal tracking installed"] },
    `One offer. One page. Built to convert.

A landing page from xaa.es is laid out for conversion — hero, offer, pricing, testimonials and FAQ — with a contact form that reaches you, a Core Web Vitals performance pass, on-page SEO and analytics with goal tracking. From €500.`,
    ["LandingPage", "ConversionRateOptimization", "Marketing", "WebDesign", "Startups"]),
  P("xaa", "08-portfolio-site", "/services/portfolio-website",
    { eyebrow: "Personal & portfolio", title: "Show your work <em>the way it deserves</em>", sub: "From €1,000.", bullets: ["Custom design — no bought template", "Case-study pages and a blog", "A CMS you are trained to use"] },
    `Show your work the way it deserves.

A personal or portfolio website with a custom design (no bought template), project case-study pages, a blog, and a content management system you are trained to use — with SEO structure and structured data. From €1,000.`,
    ["Portfolio", "PersonalBranding", "Freelance", "WebDesign", "Creatives"]),
  P("xaa", "09-company-profile", "/services/company-profile",
    { eyebrow: "Company profile", title: "The website your company <em>is judged by</em>", sub: "From €2,500.", bullets: ["About, services, products, team and portfolio", "News centre and contact pages with maps", "A CMS with editorial roles"] },
    `The website your company is judged by.

A company profile website with about, services, products, team and portfolio sections, a news centre, contact pages with maps for every office, a CMS with editorial roles and a proper SEO foundation. From €2,500.`,
    ["SmallBusiness", "WebDevelopment", "Branding", "B2B", "CompanyWebsite"]),
  P("xaa", "10-corporate", "/services/corporate-website",
    { eyebrow: "Corporate website", title: "Many teams, many markets, <em>one site</em>", sub: "From €5,000.", bullets: ["Multi-language, per-market content", "Publishing workflow and roles", "Press room, careers and investor pages"] },
    `Many teams, many markets, one website.

A corporate website with per-market content in several languages, a publishing workflow with roles, a press room, careers and investor-relations pages, site-wide search and a migration plan that keeps your rankings. From €5,000.`,
    ["CorporateWebsite", "Enterprise", "Multilingual", "SEO", "DigitalTransformation"]),
  P("xaa", "11-business-platform", "/services/business-platform",
    { eyebrow: "Business web platform", title: "Your operations, <em>online</em>", sub: "From €7,500.", bullets: ["Customer accounts and an admin dashboard", "A booking engine with availability rules", "CRM and third-party integrations"] },
    `Move your operations online.

A business web platform: your public website plus customer accounts, an admin dashboard with roles, a booking engine with availability rules, notifications, reports, and CRM and third-party integrations. From €7,500.`,
    ["BusinessAutomation", "WebApplications", "DigitalTransformation", "SME", "Operations"]),
  P("xaa", "12-ecommerce", "/services/ecommerce",
    { eyebrow: "Professional e-commerce", title: "A store built <em>to grow with you</em>", sub: "From €10,000.", bullets: ["Catalogue, cart, payments and shipping", "Multi-currency and multi-language options", "B2B price lists, subscriptions, ERP links"] },
    `A store built to grow with you.

Professional e-commerce from xaa.es covers catalogue, cart, payments and shipping — with options for subscriptions, B2B price lists, multi-vendor, multi-currency and ERP / CRM integration. From €10,000.`,
    ["Ecommerce", "OnlineStore", "Retail", "DTC", "Payments"]),
  P("xaa", "13-marketplace", "/services/marketplace",
    { eyebrow: "Custom marketplace", title: "Buyers, sellers <em>and the rules between them</em>", sub: "From €25,000.", bullets: ["Seller onboarding, verification and withdrawals", "Search, reviews and dispute management", "A commission, fee and payout engine"] },
    `Buyers, sellers and the rules between them.

A custom marketplace with buyer, seller and admin sides: seller onboarding and verification, withdrawals, search, reviews, dispute management and a commission, fee and payout engine. From €25,000.`,
    ["Marketplace", "PlatformBusiness", "Startups", "Ecommerce", "Fintech"]),
  P("xaa", "14-saas", "/services/saas-platform",
    { eyebrow: "SaaS / web application", title: "Your product, <em>ready for customers</em>", sub: "From €35,000.", bullets: ["Multi-tenant with roles and an API", "Subscriptions and billing", "An admin portal to run it"] },
    `Your product, ready for paying customers.

A SaaS or web application from xaa.es is multi-tenant from the start — subscriptions and billing, roles, an API and an admin portal to run it. From €35,000.`,
    ["SaaS", "ProductDevelopment", "Startups", "B2BSaaS", "SoftwareEngineering"]),
  P("xaa", "15-enterprise", "/services/enterprise-platform",
    { eyebrow: "Enterprise platform", title: "Built for audits, <em>SSO and scale</em>", sub: "From €100,000.", bullets: ["Customer, employee and partner portals", "SSO, MFA and full role-based access", "Audit logs and a disaster recovery plan"] },
    `Built for audits, single sign-on and scale.

Enterprise platforms from xaa.es bring customer, employee and partner portals together, with SSO, MFA, full role-based access, audit logs, and a backup and disaster recovery plan. From €100,000, scoped with you.`,
    ["EnterpriseSoftware", "SSO", "Compliance", "DigitalTransformation", "CIO"]),
  P("xaa", "16-global-ecosystem", "/services/global-ecosystem",
    { eyebrow: "Global enterprise ecosystem", title: "One ecosystem, <em>every market</em>", sub: "From €500,000.", bullets: ["Customer, partner and internal platforms", "An AI layer across all of them", "Enterprise security and AI backup & recovery"] },
    `One ecosystem across every market.

Customer, partner and internal platforms in one ecosystem — with an AI layer for support, analytics and automation, global infrastructure, enterprise security, and AI backup & recovery. From €500,000, scoped with you.`,
    ["GlobalBusiness", "EnterpriseArchitecture", "DigitalTransformation", "CTO", "Scale"]),
  P("xaa", "17-completion-date", "/process",
    { eyebrow: "A real deadline", title: "Your completion date, <em>published on day one</em>", bullets: ["Set the moment your concept lands", "Visible for the whole project", "No moving target"] },
    `Your completion date, published on day one.

At xaa.es the completion date is set the moment your concept lands — and it stays visible in your client portal for the whole project.`,
    ["ProjectDelivery", "Deadlines", "ClientSuccess", "Agile", "WebDevelopment"]),
  P("xaa", "18-live-progress", "/process",
    { eyebrow: "Client portal", title: "Check progress <em>at 2 a.m.</em>", bullets: ["Live progress for every milestone", "A milestone and payment ledger", "A dated activity log"] },
    `Check your project's progress at 2 a.m. — no status meeting needed.

Your xaa.es client portal shows live progress, a milestone ledger and a dated activity log, so you always know what was done and what comes next.`,
    ["Transparency", "ClientPortal", "ProjectManagement", "Remote", "Agency"]),
  P("xaa", "19-ownership", "/process",
    { eyebrow: "Ownership", title: "Everything we build <em>is yours</em>", bullets: ["Source code", "Designs and content", "Accounts and domains"] },
    `Everything we build is yours.

At handover, the source code, designs, content and accounts transfer to you. No licence that holds your business hostage — ever.`,
    ["SoftwareOwnership", "IntellectualProperty", "Startups", "Founders", "WebDevelopment"]),
  P("xaa", "20-three-languages", "/",
    { eyebrow: "Three languages", title: "English, Spanish <em>and Indonesian</em>", bullets: ["Work with us in your language", "Sites for every market you sell in", "Copy and localisation available"] },
    `Work with us in English, Spanish or Indonesian.

xaa.es runs every project in your language and builds sites for every market you sell in — with copywriting and localisation when you need them.`,
    ["Localization", "Multilingual", "GlobalMarketing", "Spain", "Indonesia"]),
  P("xaa", "21-design", "/services",
    { eyebrow: "Design", title: "UI/UX and branding <em>that carry the product</em>", bullets: ["UI/UX design from €2,000", "Branding from €1,500", "A reusable design system"] },
    `Design that carries the product.

Research, wireframes, high-fidelity screens and a reusable design system (UI/UX from €2,000), and a logo, identity system and brand guidelines (branding from €1,500).`,
    ["UXDesign", "UIDesign", "Branding", "DesignSystems", "ProductDesign"]),
  P("xaa", "22-seo", "/services",
    { eyebrow: "SEO programme", title: "Found by the people <em>looking for you</em>", sub: "From €1,000.", bullets: ["Technical SEO and content architecture", "Structured data (schema)", "Ongoing optimisation"] },
    `Be found by the people already looking for you.

The xaa.es SEO programme covers technical SEO, content architecture, structured data and ongoing optimisation. From €1,000.`,
    ["SEO", "TechnicalSEO", "ContentMarketing", "DigitalMarketing", "SearchEngineOptimization"]),
  P("xaa", "23-ai-integration", "/services",
    { eyebrow: "AI integration", title: "AI features <em>inside your product</em>", sub: "From €5,000.", bullets: ["Assistants on your own data", "Retrieval and automation", "AI features inside your product"] },
    `Put AI to work inside your product.

Assistants, retrieval over your own data, automation and AI features built into your product or website. From €5,000.`,
    ["AIIntegration", "GenerativeAI", "Automation", "RAG", "ProductInnovation"]),
  P("xaa", "24-payments", "/services",
    { eyebrow: "Payment integration", title: "Get paid <em>the way customers pay</em>", sub: "From €1,000.", bullets: ["Card, SEPA and wallets", "Crypto when you want it", "Reconciliation built in"] },
    `Get paid the way your customers pay.

Card, SEPA, wallet and crypto payment flows with reconciliation built in. From €1,000.`,
    ["Payments", "Fintech", "Ecommerce", "SEPA", "Checkout"]),
  P("xaa", "25-security-audit", "/services",
    { eyebrow: "Security audit", title: "Find the holes <em>before someone else does</em>", sub: "From €3,000.", bullets: ["Threat model", "Penetration testing", "Dependency and configuration review"] },
    `Find the holes before someone else does.

A threat model, penetration testing, and a review of your dependencies and configuration — with a clear list of fixes. From €3,000.`,
    ["CyberSecurity", "PenetrationTesting", "AppSec", "InfoSec", "SecurityAudit"]),
  P("xaa", "26-performance", "/services",
    { eyebrow: "Performance", title: "Faster pages, <em>more customers</em>", sub: "From €1,500.", bullets: ["Core Web Vitals", "Caching and query tuning", "Right-sized infrastructure"] },
    `Faster pages keep more customers.

Core Web Vitals, caching, query tuning and right-sized infrastructure for the site you already have. From €1,500.`,
    ["WebPerformance", "CoreWebVitals", "PageSpeed", "UX", "Ecommerce"]),
  P("xaa", "27-migration", "/services",
    { eyebrow: "Migration", title: "Leave your old platform <em>without losing rankings</em>", sub: "From €1,500.", bullets: ["Content, catalogue and customers", "Order history kept", "Redirects that keep your SEO"] },
    `Leave your old platform without losing your rankings.

We move your content, catalogue, customers and history to the new site, with the redirects that keep your search rankings. From €1,500.`,
    ["Migration", "Replatforming", "SEO", "Ecommerce", "WebDevelopment"]),
  P("xaa", "28-portfolio", "/portfolio",
    { eyebrow: "Our work", title: "Platforms we build <em>and run</em>", bullets: ["axto.io — AI & cybersecurity platform", "ulyah.com — Islamic learning in 28 languages", "Industry and village systems"] },
    `See the platforms we build and run.

Our portfolio includes axto.io, an AI and cybersecurity platform, and ulyah.com, an Islamic learning platform in 28 languages — alongside industry and village systems.`,
    ["Portfolio", "CaseStudy", "WebDevelopment", "SoftwareDevelopment", "Agency"]),
];

export const LIBRARY: LibraryPost[] = [...AXTO, ...XAA];
export const libraryFor = (brand: BrandId) => LIBRARY.filter((p) => p.brand === brand);
export const getLibraryPost = (id: string) => LIBRARY.find((p) => p.id === id);
export const imagePath = (p: Pick<LibraryPost, "brand" | "id">) => `/social/linkedin/${p.brand}/${p.id}.jpg`;
export const postUrl = (p: Pick<LibraryPost, "brand" | "path">) => `${BRAND_SITES[p.brand]}${p.path === "/" ? "" : p.path}`;
