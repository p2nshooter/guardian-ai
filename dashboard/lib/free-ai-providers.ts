/* ==============================================================================
 * AXTO — Worldwide catalog of FREE / free-tier public AI API providers (BYOK).
 * Mirrors legal/connectors/free_ai_providers.yml. No keys stored — only where to
 * get one. Surfaced in the Setup Guide so clients can start at zero cost.
 * ============================================================================ */
export type FreeAIProvider = {
  name: string;
  region: string;
  openaiCompat: boolean;
  signup: string;
  free: string;
  local?: boolean;
};

export const FREE_AI_PROVIDERS: FreeAIProvider[] = [
  { name: "Groq Cloud",          region: "Global",        openaiCompat: true,  signup: "https://console.groq.com/keys",            free: "Generous free tier, very fast (Llama, Mixtral, Gemma)." },
  { name: "Cerebras Inference",  region: "Global",        openaiCompat: true,  signup: "https://cloud.cerebras.ai",                free: "Free tier with the fastest token throughput." },
  { name: "SambaNova Cloud",     region: "Global",        openaiCompat: true,  signup: "https://cloud.sambanova.ai",               free: "Free tier — Llama 3.1/3.3 incl. 405B." },
  { name: "Google AI Studio",    region: "Global",        openaiCompat: true,  signup: "https://aistudio.google.com/app/apikey",   free: "Free Gemini Flash/Pro — large context, multimodal." },
  { name: "Mistral La Plateforme", region: "EU (France)", openaiCompat: true,  signup: "https://console.mistral.ai",               free: "Free experimentation tier — EU-hosted." },
  { name: "Cohere",              region: "Global",        openaiCompat: false, signup: "https://dashboard.cohere.com/api-keys",    free: "Free trial keys — strong RAG & rerank." },
  { name: "DeepSeek",            region: "Asia",          openaiCompat: true,  signup: "https://platform.deepseek.com",            free: "Periodic free credits — strong reasoning & coding." },
  { name: "OpenRouter",          region: "Global",        openaiCompat: true,  signup: "https://openrouter.ai/keys",               free: "Hundreds of models, many tagged ':free' ($0)." },
  { name: "GitHub Models",       region: "Global",        openaiCompat: true,  signup: "https://github.com/marketplace/models",    free: "Free for developers (GPT-4o, Llama, Phi) via a GitHub PAT." },
  { name: "Cloudflare Workers AI", region: "Global (edge)", openaiCompat: true, signup: "https://dash.cloudflare.com",             free: "Free daily allocation — Llama, Mistral, Whisper at the edge." },
  { name: "Hugging Face",        region: "Global / EU",   openaiCompat: true,  signup: "https://huggingface.co/settings/tokens",   free: "Free serverless inference for thousands of models." },
  { name: "NVIDIA NIM",          region: "Global",        openaiCompat: true,  signup: "https://build.nvidia.com",                 free: "Free API credits — Llama, Nemotron, Mistral." },
  { name: "Together AI",         region: "Global",        openaiCompat: true,  signup: "https://api.together.ai",                  free: "Free signup credits — 100+ open models." },
  { name: "Fireworks AI",        region: "Global",        openaiCompat: true,  signup: "https://fireworks.ai",                     free: "Free signup credits — fast open-model serving." },
  { name: "Scaleway",            region: "EU (France)",   openaiCompat: true,  signup: "https://console.scaleway.com",             free: "Free beta tier — EU-sovereign hosting." },
  { name: "Ollama (local)",      region: "Self-hosted",   openaiCompat: true,  signup: "https://ollama.com/download",              free: "100% free & offline — nothing leaves your machine.", local: true },
  { name: "llama.cpp (local)",   region: "Self-hosted",   openaiCompat: true,  signup: "https://github.com/ggml-org/llama.cpp",    free: "Free & offline — any GGUF model, OpenAI-compatible.", local: true },
  { name: "vLLM (self-hosted)",  region: "Self-hosted",   openaiCompat: true,  signup: "https://github.com/vllm-project/vllm",     free: "Free & offline — high-throughput serving on your GPU.", local: true },
];
