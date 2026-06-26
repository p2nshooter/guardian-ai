/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ═══════════════════════════════════════════════════════════════════════════
// AXTO Studio — Pricing & Configuration
// ═══════════════════════════════════════════════════════════════════════════
// Central AI Pool + Central GPU Pool + Hybrid Studio
// BYOK model: client brings own API keys, AXTO provides the studio platform
// Monthly subscription — no per-token fees from AXTO
//
// Benchmark: Vercel AI $20-100/mo | RunPod $50+/mo | Replicate usage-based
// ═══════════════════════════════════════════════════════════════════════════

export interface StudioPlan {
  code: string;
  name: string;
  description: string;
  priceMonthly: number;    // USD/month
  priceYearly: number;     // USD/year (2 months free)
  tier: "starter" | "professional" | "enterprise";
  limits: {
    aiRequestsPerDay: number;   // -1 = unlimited
    gpuInstances: number;       // max connected GPU endpoints
    storageGB: number;          // artifact storage
    sessionsMax: number;        // concurrent sessions
    pipelinesMax: number;       // hybrid pipelines
    providers: number;          // max AI providers connected
    teamMembers: number;        // -1 = unlimited
    retentionDays: number;      // artifact retention (max 14)
    apiAccess: boolean;         // REST/WebSocket API
    priorityQueue: boolean;     // priority routing
    whiteLabel: boolean;
  };
  features: string[];
  studios: ("ai" | "gpu" | "hybrid")[];
}

export const STUDIO_PLANS: StudioPlan[] = [
  {
    code: "studio_starter",
    name: "Studio Starter",
    description: "AI playground + GPU dashboard for solo developers and small teams",
    priceMonthly: 49,
    priceYearly: 490,     // ~$40.8/mo — 2 months free
    tier: "starter",
    limits: {
      aiRequestsPerDay: 500,
      gpuInstances: 1,
      storageGB: 1,
      sessionsMax: 10,
      pipelinesMax: 2,
      providers: 5,
      teamMembers: 1,
      retentionDays: 7,
      apiAccess: false,
      priorityQueue: false,
      whiteLabel: false,
    },
    features: [
      "AI Studio — Chat, Completions, Prompt Builder",
      "GPU Studio — 1 endpoint, model deploy, monitoring",
      "5 AI providers (OpenAI, Claude, Gemini, Groq, Mistral)",
      "500 requests/day through studio",
      "1 GB artifact storage (7-day retention)",
      "10 concurrent sessions",
      "Real-time cost tracking per provider",
      "Interactive setup guide in 10 languages",
    ],
    studios: ["ai", "gpu"],
  },
  {
    code: "studio_professional",
    name: "Studio Professional",
    description: "Full AI + GPU + Hybrid studios for teams shipping AI products",
    priceMonthly: 199,
    priceYearly: 1990,    // ~$165.8/mo — 2 months free
    tier: "professional",
    limits: {
      aiRequestsPerDay: 5000,
      gpuInstances: 5,
      storageGB: 10,
      sessionsMax: 50,
      pipelinesMax: 10,
      providers: 15,
      teamMembers: 5,
      retentionDays: 14,
      apiAccess: true,
      priorityQueue: true,
      whiteLabel: false,
    },
    features: [
      "All 3 Studios: AI + GPU + Hybrid Pipeline",
      "15 AI providers + custom OpenAI-compatible",
      "5 GPU endpoints (RunPod, Lambda, vastai, custom)",
      "5,000 requests/day + REST & WebSocket API",
      "Hybrid Pipeline Builder — visual drag-and-drop",
      "10 GB storage (14-day retention)",
      "A/B model testing + prompt versioning",
      "Batch processing + priority queue",
      "Cost analytics dashboard per provider/model",
      "Team: 5 members with role-based access",
    ],
    studios: ["ai", "gpu", "hybrid"],
  },
  {
    code: "studio_enterprise",
    name: "Studio Enterprise",
    description: "Unlimited scale for organizations running AI at the core of their business",
    priceMonthly: 799,
    priceYearly: 7990,    // ~$665.8/mo — 2 months free
    tier: "enterprise",
    limits: {
      aiRequestsPerDay: -1,
      gpuInstances: -1,
      storageGB: 100,
      sessionsMax: -1,
      pipelinesMax: -1,
      providers: -1,
      teamMembers: -1,
      retentionDays: 14,
      apiAccess: true,
      priorityQueue: true,
      whiteLabel: true,
    },
    features: [
      "All Professional features",
      "Unlimited AI requests + GPU endpoints",
      "Unlimited providers + custom model endpoints",
      "Unlimited team members + SSO-ready",
      "100 GB artifact storage (14-day retention)",
      "White-label studio (custom branding)",
      "Webhook events for CI/CD integration",
      "Audit log export (SOC 2 evidence)",
      "Multi-region routing",
      "Comprehensive interactive setup guide (PDF, 10 languages)",
    ],
    studios: ["ai", "gpu", "hybrid"],
  },
];

// ── AI Provider catalog ─────────────────────────────────────────────────
export const AI_PROVIDERS = [
  { id: "openai",     name: "OpenAI",    icon: "🟢", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini", "dall-e-3"], category: "ai" },
  { id: "anthropic",  name: "Anthropic",  icon: "🟤", models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022", "claude-opus-4-20250514"], category: "ai" },
  { id: "google",     name: "Google AI",  icon: "🔵", models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"], category: "ai" },
  { id: "groq",       name: "Groq",       icon: "⚡", models: ["llama-3.3-70b", "mixtral-8x7b", "gemma2-9b"], category: "ai" },
  { id: "mistral",    name: "Mistral",    icon: "🌀", models: ["mistral-large", "mistral-medium", "codestral"], category: "ai" },
  { id: "deepseek",   name: "DeepSeek",   icon: "🐋", models: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"], category: "ai" },
  { id: "xai",        name: "xAI",        icon: "✖️", models: ["grok-3", "grok-3-mini"], category: "ai" },
  { id: "cohere",     name: "Cohere",     icon: "🔶", models: ["command-r-plus", "command-r", "embed-v3"], category: "ai" },
  { id: "ollama",     name: "Ollama",     icon: "🦙", models: ["llama3.3", "mistral", "codellama", "phi-3"], category: "ai", selfHosted: true },
  { id: "custom_ai",  name: "Custom (OpenAI-compatible)", icon: "🔧", models: [], category: "ai", selfHosted: true },
] as const;

export const GPU_PROVIDERS = [
  { id: "runpod",   name: "RunPod",     icon: "🟣", gpuTypes: ["A100-80GB", "H100-80GB", "RTX-4090", "RTX-A6000"], category: "gpu" },
  { id: "lambda",   name: "Lambda",     icon: "λ",  gpuTypes: ["A100-80GB", "H100-80GB", "A10G"], category: "gpu" },
  { id: "vastai",   name: "vast.ai",    icon: "🌊", gpuTypes: ["A100", "RTX-4090", "RTX-3090", "A6000"], category: "gpu" },
  { id: "modal",    name: "Modal",      icon: "◻️", gpuTypes: ["A100", "H100", "T4"], category: "gpu" },
  { id: "custom_gpu", name: "Custom GPU Server", icon: "🖥️", gpuTypes: [], category: "gpu" },
] as const;

// ── Studio type metadata ────────────────────────────────────────────────
export const STUDIO_TYPES = {
  ai: {
    name: "AI Studio",
    icon: "🧠",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)",
    description: "Chat, completions, prompt engineering, batch processing, cost analytics",
    tagline: "Your AI, Your Keys, Your Studio",
  },
  gpu: {
    name: "GPU Studio",
    icon: "⚡",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b, #ea580c)",
    description: "Deploy models, manage GPU endpoints, monitor inference, fine-tuning",
    tagline: "Bring Your GPU, We Handle the Rest",
  },
  hybrid: {
    name: "Hybrid Studio",
    icon: "🔀",
    color: "#0ea5e9",
    gradient: "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
    description: "Visual pipeline builder — chain AI + GPU in automated workflows",
    tagline: "Cloud AI + Your GPU in One Pipeline",
  },
} as const;

// ── Helper: get plan by code ────────────────────────────────────────────
export function getStudioPlan(code: string): StudioPlan | undefined {
  return STUDIO_PLANS.find(p => p.code === code);
}

// ── Helper: format studio price ─────────────────────────────────────────
export function formatStudioPrice(plan: StudioPlan, billing: "monthly" | "yearly" = "monthly"): string {
  const price = billing === "yearly" ? plan.priceYearly : plan.priceMonthly;
  return `$${price.toLocaleString("en-US")}`;
}
