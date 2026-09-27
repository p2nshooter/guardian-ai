/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * CLOUD APPS — run in the browser, no Docker, included in a subscription.
 * Used by the public /apps pages, the member portal launcher and plan gating.
 * ============================================================================ */
import { planForApp, type Tier } from "./plans";

export interface CloudApp {
  slug: string;
  live: boolean;               // false = "Coming soon" until the app passes its release gate
  name: string;
  icon: string;
  color: string;               // accent (hex)
  short: string;               // one line, for cards
  hero: string;                // 1–2 sentences, for the app page
  steps: string[];             // "how it works" — plain language
  features: { title: string; desc: string }[];
  useCases: string[];
  selfHosted?: string;         // matching self-hosted product slug
  keywords: string[];          // SEO
}

export const CLOUD_APPS: CloudApp[] = [
  {
    slug: "legal", live: false, name: "Legal AI", icon: "⚖️", color: "#4f46e5",
    short: "18 expert legal workspaces: research, contracts, drafting, due diligence and more.",
    hero: "A private AI legal team in your browser. Research law across jurisdictions, review contracts clause by clause, draft documents and run due diligence — with risk flags, confidence scores and citations you can verify.",
    steps: [
      "Pick a workspace — e.g. Contract Intelligence or Legal Research.",
      "Describe the matter or upload a document (PDF, DOCX or TXT).",
      "Get a structured answer with risks, sources and next steps — then save or export it.",
    ],
    features: [
      { title: "18 expert workspaces", desc: "Research, compliance, contracts, regulatory radar, due diligence, AML/KYC, IP, ESG, litigation, employment, privacy, governance, tax, real estate, immigration, M&A, disputes and drafting." },
      { title: "Document review", desc: "Upload contracts and filings; text is extracted in your browser and analysed clause by clause." },
      { title: "Risk-first output", desc: "Every answer is tagged LOW / MEDIUM / HIGH / CRITICAL risk with a confidence score and what to verify." },
      { title: "Multi-jurisdiction", desc: "Ask about any country; answers state which jurisdiction each rule applies to and point to official sources." },
    ],
    useCases: ["Contract review & redlining", "Legal research memos", "Compliance gap checks", "Due diligence checklists", "Drafting NDAs, policies and letters"],
    selfHosted: "legal",
    keywords: ["legal AI", "AI contract review", "AI legal research", "legal document drafting AI", "due diligence AI"],
  },
  {
    slug: "prompts", live: false, name: "Prompt Library", icon: "📚", color: "#7c3aed",
    short: "Premium, ready-to-run prompts for 24 professions — from quick tasks to global-scale strategy.",
    hero: "Hundreds of expert prompts organised by profession and level — Basic, Pro, Premium and Elite. Fill in the blanks, copy to any AI, or run instantly inside AXTO.",
    steps: [
      "Browse by field (e.g. Marketing, Legal, Finance) or search.",
      "Fill in the highlighted variables — company, audience, market…",
      "Copy it anywhere or press Run to get the result in AI Studio.",
    ],
    features: [
      { title: "24 fields", desc: "Business, marketing, sales, legal, finance, HR, software, data, security, health, education, real estate and more." },
      { title: "4 levels", desc: "Basic for everyday tasks up to Elite for multi-country, board-level work." },
      { title: "Fill-in variables", desc: "Every prompt has clearly marked inputs so you get tailored output, not generic text." },
      { title: "Works everywhere", desc: "Use with AXTO AI Studio, ChatGPT, Claude, Gemini or any model." },
    ],
    useCases: ["Marketing campaigns", "Sales outreach", "Financial analysis", "Hiring & HR", "Product strategy"],
    keywords: ["AI prompt library", "premium ChatGPT prompts", "Claude prompts", "business prompts", "prompt templates"],
  },
  {
    slug: "studio", live: false, name: "AI Studio", icon: "🧠", color: "#0f766e",
    short: "Chat with leading AI models, save conversations and reuse your best prompts.",
    hero: "One workspace for many AI models. Chat, set a system role, keep your history, and bring your own API keys for unlimited use.",
    steps: [
      "Choose a model (or keep the recommended default).",
      "Optionally set a role, e.g. “You are a senior financial analyst”.",
      "Chat — conversations are saved to your private storage.",
    ],
    features: [
      { title: "Multiple models", desc: "Built-in model included; connect Anthropic, OpenAI, Google, Groq or OpenRouter keys for more." },
      { title: "Private history", desc: "Conversations are stored in your own encrypted storage space, never used for training." },
      { title: "Prompt integration", desc: "Launch any Prompt Library item straight into a chat." },
      { title: "Bring your own key", desc: "Runs with your own key do not count against your monthly AI runs." },
    ],
    useCases: ["Writing & editing", "Research & summaries", "Brainstorming", "Code help", "Translation"],
    selfHosted: "studio",
    keywords: ["AI studio", "multi-model AI chat", "BYOK AI chat", "Claude and GPT in one place"],
  },
  {
    slug: "clipper", live: false, name: "Clipper", icon: "🎬", color: "#db2777",
    short: "Turn long videos into short viral clips with captions — using your own AI keys.",
    hero: "Upload a podcast, webinar or interview and get the best moments as ready-to-post vertical clips: transcribed, captioned, reframed and titled. Video is processed on your own device; transcription and highlight detection run on your own AI keys.",
    steps: [
      "Upload a video (MP4, MOV or WebM).",
      "AXTO transcribes it with your speech-to-text key and finds the strongest moments with your AI key.",
      "Review the clips, pick a caption style and aspect ratio, then export MP4s ready for TikTok, Reels and Shorts.",
    ],
    features: [
      { title: "AI highlight detection", desc: "Moments are scored for hook, clarity and shareability, each with a suggested title and hashtags." },
      { title: "Animated captions", desc: "Word-by-word captions from precise timestamps, in several styles." },
      { title: "Smart reframing", desc: "9:16, 1:1 or 16:9 output with adjustable framing." },
      { title: "Private by design", desc: "Your video never leaves your device except the audio track sent to your own transcription provider." },
    ],
    useCases: ["Podcast clips", "Webinar highlights", "Course snippets", "Founder & sales videos"],
    keywords: ["AI video clipper", "long video to shorts", "auto captions", "podcast clips AI", "OpusClip alternative"],
  },
  {
    slug: "vault", live: false, name: "Privacy Vault", icon: "🔒", color: "#4338ca",
    short: "Find and redact personal data in text and documents — entirely inside your browser.",
    hero: "Remove names, emails, phone numbers, card numbers, national IDs and more before you share a document or send it to any AI. Detection runs on your device, so the original never leaves it.",
    steps: [
      "Paste text or open a document.",
      "Review what was found — toggle any item on or off.",
      "Copy the redacted version. Optionally keep a private key to restore the originals later.",
    ],
    features: [
      { title: "Runs on your device", desc: "Detection and redaction happen in your browser — the original text is never uploaded." },
      { title: "20+ data types", desc: "Emails, phones, payment cards (Luhn-checked), IBAN, IP addresses, passports, US SSN, Indonesian NIK & NPWP, and more." },
      { title: "Reversible tokens", desc: "Replace values with tokens like [EMAIL_1] and restore them after the AI responds." },
      { title: "Masking styles", desc: "Choose tokens, full masking (•••) or partial masking (last 4 digits visible)." },
    ],
    useCases: ["Safe AI prompts", "GDPR / UU PDP data minimisation", "Sharing documents with vendors", "Support ticket sanitising"],
    selfHosted: "vault",
    keywords: ["PII redaction tool", "redact personal data", "data masking online", "GDPR redaction"],
  },
  {
    slug: "compliance", live: false, name: "Compliance Center", icon: "📋", color: "#16a34a",
    short: "Gap analysis, remediation plans and policies for SOC 2, ISO 27001, GDPR, HIPAA and more.",
    hero: "Answer a short guided assessment and get an audit-style gap analysis, a prioritised remediation plan and ready-to-edit policy drafts for the frameworks you need.",
    steps: [
      "Choose a framework — SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS, NIST CSF or Indonesia's UU PDP.",
      "Describe your organisation and current controls.",
      "Receive a gap report, a remediation roadmap and policy templates.",
    ],
    features: [
      { title: "7 frameworks", desc: "SOC 2, ISO/IEC 27001, GDPR, HIPAA, PCI DSS v4, NIST CSF 2.0 and UU PDP." },
      { title: "Gap analysis", desc: "Control-by-control findings with severity and evidence to collect." },
      { title: "Remediation roadmap", desc: "30/60/90-day plan with owners and effort estimates." },
      { title: "Policy generator", desc: "Draft information security, privacy, access-control and incident-response policies." },
    ],
    useCases: ["Audit readiness", "Vendor security questionnaires", "Privacy programmes", "Policy writing"],
    selfHosted: "compliance",
    keywords: ["compliance gap analysis", "SOC 2 readiness", "ISO 27001 gap analysis", "GDPR compliance tool", "policy generator"],
  },
  {
    slug: "security", live: false, name: "Security Analyst", icon: "🛡️", color: "#0284c7",
    short: "Paste logs or alerts — get triage, MITRE ATT&CK mapping, IOCs and an incident report.",
    hero: "An AI security analyst on demand. Paste raw logs, alerts or a suspicious script and get a clear verdict, the attacker techniques involved, extracted indicators and a ready-to-send incident report.",
    steps: [
      "Paste logs, an alert or a suspicious command.",
      "Choose what you need — triage, IOC extraction or a full incident report.",
      "Get findings mapped to MITRE ATT&CK with recommended containment steps.",
    ],
    features: [
      { title: "Alert triage", desc: "Verdict (benign / suspicious / malicious), severity and reasoning in plain language." },
      { title: "MITRE ATT&CK mapping", desc: "Tactics and technique IDs for every finding." },
      { title: "IOC extraction", desc: "IPs, domains, URLs, hashes and emails pulled out automatically — even before the AI runs." },
      { title: "Incident reports", desc: "Executive summary, timeline, impact and next steps, ready to share." },
    ],
    useCases: ["SOC alert triage", "Log investigation", "Phishing analysis", "Incident write-ups"],
    selfHosted: "guardian",
    keywords: ["AI security analyst", "log analysis AI", "MITRE ATT&CK mapping", "incident report generator", "IOC extractor"],
  },
];

export function getCloudApp(slug: string): CloudApp | undefined {
  return CLOUD_APPS.find((a) => a.slug === slug);
}

export function minTierForApp(slug: string): Tier {
  return planForApp(slug);
}
