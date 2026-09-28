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
    slug: "legal", live: true, name: "Legal AI", icon: "⚖️", color: "#4f46e5",
    short: "36 expert legal workspaces for 200+ jurisdictions — research, case building, contracts, litigation and compliance.",
    hero: "A private AI legal team in your browser. Pick any country, state or province, upload the case file, and get it rebuilt against current law — from the constitution down to regional regulations — with sources, risk ratings and a strategy. Plus 35 more expert workspaces for research, contracts, litigation and compliance.",
    steps: [
      "Choose the jurisdiction — country, then state/province and city — and a workspace such as Case Builder or Contract Review.",
      "Upload the documents (PDF, DOCX, TXT, e-mails) or describe the matter. Text is extracted in your browser.",
      "Get a structured, sourced analysis — with live research on current law when your AI supports it — then save it to the matter or export to Word/PDF.",
    ],
    features: [
      { title: "200+ jurisdictions, down to the province", desc: "Every country plus the EU and international law; states, provinces and special regimes (Aceh, Québec, Scotland, DIFC, Louisiana…) and your city or regency." },
      { title: "Case Builder", desc: "Upload a case file and get parties, a sourced chronology, legal issues, the applicable law from the constitution down, element-by-element analysis, evidence gaps, deadlines and strategy." },
      { title: "Current law, with sources", desc: "Live research checks each statute and decision against official sources and lists what it retrieved — and old-vs-new law is compared for the date of your facts." },
      { title: "36 expert workspaces", desc: "Research memos, contract review & drafting, due diligence, pleadings, arbitration, criminal analysis, compliance, privacy, AML, employment, IP, tax, ESG, AI governance and more." },
      { title: "Encrypted matters", desc: "Documents and results are saved per matter, encrypted with a key unique to your account." },
      { title: "Export anywhere", desc: "Word (.docx), PDF and Markdown exports, ready for your letterhead." },
    ],
    useCases: ["Rebuilding a case file for trial", "Contract review & redlining", "Legal research memos with sources", "Due diligence red-flag reports", "Pleadings, appeals and legal opinions", "Multi-country compliance surveys"],
    selfHosted: "legal",
    keywords: ["legal AI", "AI lawyer", "AI legal research", "AI contract review", "case analysis AI", "legal document drafting AI", "due diligence AI", "AI hukum Indonesia"],
  },
  {
    slug: "prompts", live: true, name: "Prompt Library", icon: "📚", color: "#7c3aed",
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
    slug: "studio", live: true, name: "AI Studio", icon: "🧠", color: "#0f766e",
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
    slug: "clipper", live: true, name: "Clipper", icon: "🎬", color: "#db2777",
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
    slug: "vault", live: true, name: "Privacy Vault", icon: "🔒", color: "#4338ca",
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
    slug: "compliance", live: true, name: "Compliance Center", icon: "📋", color: "#16a34a",
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
    slug: "security", live: true, name: "Security Analyst", icon: "🛡️", color: "#0284c7",
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
