/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime  = "edge";
export const dynamic  = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getR2Builds, dbFirst, dbRun, now } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DISCLAIMER_VERSION } from "@/lib/disclaimer";

// ── Product → R2 key mapping ────────────────────────────────────────────────
function r2Key(product: string, type: "docker" | "exe" | "exe-linux") {
  if (type === "exe") return `builds/latest/exe/${product}-windows.exe`;
  if (type === "exe-linux") return `builds/latest/exe/${product}-linux`;
  return `builds/latest/raw/${product}.tar.gz`;
}
function filename(product: string, type: "docker" | "exe" | "exe-linux") {
  if (type === "exe") return `axto-${product}-windows.exe`;
  if (type === "exe-linux") return `axto-${product}-linux`;
  return `axto-${product}.tar.gz`;
}

// ── Product groups ───────────────────────────────────────────────────────────
const GUARDIAN_PRODUCTS   = ["guardian-core", "guardian-node", "guardian-antivirus"];
const ORCHESTRA_PRODUCTS  = ["orchestra-core", "orchestra-worker-cpu", "orchestra-worker-gpu"];
const VAULT_PRODUCTS      = ["vault-core"];
const EDGE_PRODUCTS       = ["edge-core"];
const SOC_PRODUCTS        = ["soc-core", "soc-worker"];
const COMPLIANCE_PRODUCTS = ["compliance-core"];
const SENTINEL_PRODUCTS   = ["sentinel-core", "sentinel-agent"];
const ANTIVIRUS_PRODUCTS  = ["guardian-antivirus"];
const STUDIO_PRODUCTS     = ["studio-core"];
const LEGAL_PRODUCTS      = ["legal-core"];

const ALL_PRODUCTS = [
  ...GUARDIAN_PRODUCTS, ...ORCHESTRA_PRODUCTS, ...VAULT_PRODUCTS,
  ...EDGE_PRODUCTS, ...SOC_PRODUCTS, ...COMPLIANCE_PRODUCTS, ...SENTINEL_PRODUCTS,
  ...STUDIO_PRODUCTS, ...LEGAL_PRODUCTS,
];

const PRODUCT_LABELS: Record<string, string> = {
  "guardian-core":      "Guardian Core — API Server + Security Dashboard",
  "guardian-node":      "Guardian Node Agent — Per-Server Threat Detection",
  "guardian-antivirus": "Guardian Antivirus — ClamAV + AI Learning",
  "orchestra-core":     "Orchestra Core — AI Router + Orchestration Console",
  "orchestra-worker-cpu": "Orchestra Worker CPU — Cloud AI Routing (15+ providers)",
  "orchestra-worker-gpu": "Orchestra Worker GPU — Local GPU Inference",
  "vault-core":         "Vault Core — AI Privacy Layer (PII/PHI/Financial Redaction)",
  "edge-core":          "Edge Core — AI API Gateway & Billing",
  "soc-core":           "SOC Core — Security Operations Center",
  "soc-worker":         "SOC Worker — Distributed Threat Analysis",
  "compliance-core":    "Compliance Core — Automated Audit Platform",
  "sentinel-core":      "Sentinel Core — IoT/OT Security",
  "sentinel-agent":     "Sentinel Agent — IoT Edge Agent",
  "studio-core":        "Studio Core — AI & GPU Pool Platform (AI Studio + GPU Studio + Hybrid Studio)",
  "legal-core":         "AXTO Legal Core — AI Legal Research, Contract Intelligence & Document Builder",
};

function getProductsForLicense(product: string): string[] {
  switch (product) {
    case "guardian":    return GUARDIAN_PRODUCTS;
    case "orchestra":   return ORCHESTRA_PRODUCTS;
    case "vault":       return VAULT_PRODUCTS;
    case "edge":        return EDGE_PRODUCTS;
    case "soc":         return SOC_PRODUCTS;
    case "compliance":  return COMPLIANCE_PRODUCTS;
    case "sentinel":    return SENTINEL_PRODUCTS;
    case "antivirus":   return ANTIVIRUS_PRODUCTS;
    case "studio":      return STUDIO_PRODUCTS;
    case "legal":       return LEGAL_PRODUCTS;
    default:            return [];
  }
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url       = new URL(req.url);
  const licenseId = url.searchParams.get("license_id") || "";
  const product   = url.searchParams.get("product")    || "";
  const type      = (url.searchParams.get("type") || "docker") as "docker" | "exe" | "exe-linux";
  const action    = url.searchParams.get("action") || "download";
  const lang      = url.searchParams.get("lang")   || "en";

  if (!licenseId)
    return NextResponse.json({ error: "license_id required" }, { status: 400 });

  // Standalone EXE binaries are temporarily disabled platform-wide (in active
  // development). Guides and the Docker build remain fully available. This is a
  // hard backend guard so a direct API call can't bypass the disabled UI.
  if ((type as string).startsWith("exe") && action === "download") {
    return NextResponse.json(
      { error: "The standalone EXE is in active development and not yet available. Please use the Docker build for now.", code: "exe_in_development" },
      { status: 503 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }

  // ── Disclaimer gate: client must accept the CURRENT disclaimer before use ──
  try {
    const accepted = await dbFirst<any>(db,
      "SELECT id FROM disclaimer_acceptances WHERE user_email = ? AND version = ? LIMIT 1",
      [(user as any).email, DISCLAIMER_VERSION]);
    if (!accepted) {
      return NextResponse.json(
        { error: "You must accept the Terms of Use & Liability Disclaimer before downloading.", code: "disclaimer_required", version: DISCLAIMER_VERSION },
        { status: 451 });
    }
  } catch { /* acceptances table absent (pre-migration) → do not block legacy */ }

  // ── Validate license ──────────────────────────────────────────────────────
  const lic = await dbFirst<any>(db,
    `SELECT l.id, l.product, l.license_key, l.status, l.expires_at, l.max_nodes,
            l.package_code, l.billing_cycle, l.amount_usd, l.created_at,
            c.name as client_name, c.email as client_email, c.organization
     FROM licenses l JOIN clients c ON c.id = l.client_id
     WHERE l.id = ? AND c.email = ?`,
    [licenseId, user.email]
  );

  if (!lic)
    return NextResponse.json({ error: "License not found. Please log in with the correct email." }, { status: 404 });
  if (lic.status === "revoked")
    return NextResponse.json({ error: "License has been revoked. Contact hallo@axto.io" }, { status: 403 });
  if (lic.status === "suspended")
    return NextResponse.json({ error: "License is suspended. Log in to the portal for information." }, { status: 403 });
  if (lic.expires_at && new Date(lic.expires_at) < new Date())
    return NextResponse.json({ error: "License expired. Renew at portal → Shop." }, { status: 403 });

  const licProduct = lic.product; // "guardian" | "orchestra" | "vault" | etc.
  const productGroup = getProductsForLicense(licProduct);

  // ── Invoice ───────────────────────────────────────────────────────────────
  if (action === "invoice") {
    const inv = await dbFirst<any>(db,
      `SELECT * FROM invoices WHERE license_id = ? ORDER BY created_at DESC LIMIT 1`,
      [licenseId]
    );

    const productDisplayName: Record<string, string> = {
      guardian:   "Guardian AI — Self-Hosted Cybersecurity Platform",
      orchestra:  "Orchestra AI — Self-Hosted AI Orchestration Platform",
      vault:      "Vault AI — AI Privacy Layer (PII/PHI/Financial Redaction)",
      edge:       "Edge AI — AI API Gateway & Traffic Management",
      soc:        "SOC AI — AI-Powered Security Operations Center",
      compliance: "Compliance AI — Automated Audit & Compliance Platform",
      sentinel:   "Sentinel AI — IoT/OT Security Platform",
      antivirus:  "Antivirus — ClamAV + AI Learning Threat Detection",
      studio:     "AXTO Studio — AI & GPU Pool Platform",
      legal:      "AXTO Legal — AI Legal Research & Document Intelligence",
    };

    const invoiceText = buildInvoiceText({
      number:       `INV-${(inv?.id || licenseId).slice(0,8).toUpperCase()}`,
      date:         inv?.created_at || lic.created_at,
      clientName:   lic.client_name,
      clientEmail:  lic.client_email,
      organization: lic.organization || "",
      product:      productDisplayName[licProduct] || licProduct,
      packageCode:  lic.package_code,
      licenseKey:   lic.license_key,
      amountUsd:    inv?.amount_usd || lic.amount_usd || 0,
      billing:      lic.billing_cycle || "yearly",
      expiresAt:    lic.expires_at,
      maxNodes:     lic.max_nodes,
      items:        productGroup.map(p => ({ name: PRODUCT_LABELS[p] || p, type: "Docker Image + Windows EXE" })),
    });

    return new NextResponse(invoiceText, {
      headers: {
        "Content-Type":        "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="AXTO-Invoice-INV-${licenseId.slice(0,8).toUpperCase()}.txt"`,
        "Cache-Control":       "no-store",
      },
    });
  }

  // ── Setup Guide (10 languages, PDF) ──────────────────────────────────────
  if (action === "guide") {
    const guide = generateVaultGuide(licProduct, lang, lic.license_key, lic.max_nodes);
    const isPdf = url.searchParams.get("format") === "pdf";

    if (isPdf) {
      const pdfBytes = buildGuidePDF(guide, lang);
      const productSlug = licProduct.charAt(0).toUpperCase() + licProduct.slice(1);
      const langLabel   = _langLabel(lang);
      return new NextResponse(pdfBytes, {
        headers: {
          "Content-Type":        "application/pdf",
          "Content-Disposition": `attachment; filename="AXTO-${productSlug}-Setup-Guide-${langLabel}.pdf"`,
          "Cache-Control":       "public, max-age=3600",
        },
      });
    }

    return new NextResponse(guide, {
      headers: {
        "Content-Type":        "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="AXTO-${licProduct}-Setup-Guide-${lang}.md"`,
        "Cache-Control":       "no-store",
      },
    });
  }

  // ── Check availability ────────────────────────────────────────────────────
  if (!product || !ALL_PRODUCTS.includes(product))
    return NextResponse.json({ error: `Unknown product: ${product}` }, { status: 400 });

  if (!productGroup.includes(product))
    return NextResponse.json({
      error: `Product ${product} is not included in your ${licProduct} license. Please purchase the appropriate license at axto.io/portal.`
    }, { status: 403 });

  // ── Build format availability check (admin-controlled) ──────────────────
  // Map download type → build_formats format key
  const fmtKey = type === "exe" ? "exe-windows" : (type === "exe-linux" ? "exe-linux" : "docker");
  const licProduct2 = licProduct; // alias for clarity

  try {
    // Create table if missing (idempotent)
    await dbRun(db,
      `CREATE TABLE IF NOT EXISTS build_formats (
         product TEXT NOT NULL, format TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0,
         updated_at TEXT NOT NULL DEFAULT (datetime('now')),
         PRIMARY KEY (product, format)
       )`, []
    );
    const bfRow = await dbFirst<{ enabled: number }>(db,
      `SELECT enabled FROM build_formats WHERE product = ? AND format = ?`,
      [licProduct2, fmtKey]
    );
    // Default: guardian + antivirus + studio → enabled; everything else → disabled
    const defaultOn = ["guardian", "antivirus", "studio"].includes(licProduct2)
      || (licProduct2 === "orchestra" && fmtKey === "docker");

    if (bfRow !== null && bfRow !== undefined) {
      if (bfRow.enabled === 0) {
        return NextResponse.json({
          error:   "coming_soon",
          message: "This download format is not yet available. The admin has not yet published this build.",
          hint:    "Please check back soon, or contact hallo@axto.io if you need this urgently.",
          product: licProduct2,
          format:  fmtKey,
        }, { status: 503 });
      }
    } else if (!defaultOn) {
      // No DB row + product not in default-enabled set → Coming Soon
      return NextResponse.json({
        error:   "coming_soon",
        message: "This download format is not yet available. The admin has not yet published this build.",
        hint:    "Please check back soon, or contact hallo@axto.io if you need this urgently.",
        product: licProduct2,
        format:  fmtKey,
      }, { status: 503 });
    }
  } catch {
    // If DB check fails, allow the download to proceed (fail-open for DB errors only)
  }

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  }

  const key = r2Key(product, type);

  if (action === "check" || req.method === "HEAD") {
    // Also check build_formats availability for HEAD requests
    // (portal uses HEAD to determine if button should be enabled)
    try {
      const bfRow2 = await dbFirst<{ enabled: number }>(db,
        `SELECT enabled FROM build_formats WHERE product = ? AND format = ?`,
        [licProduct2, fmtKey]
      );
      const defaultOn2 = ["guardian", "antivirus", "studio"].includes(licProduct2)
        || (licProduct2 === "orchestra" && fmtKey === "docker");
      if (bfRow2 !== null && bfRow2 !== undefined && bfRow2.enabled === 0) {
        // Return a special header so portal can distinguish "not built yet" vs "coming soon"
        return new NextResponse(null, {
          status: 404,
          headers: { "X-AXTO-Reason": "coming_soon" },
        });
      } else if (bfRow2 === null || bfRow2 === undefined) {
        if (!defaultOn2) {
          return new NextResponse(null, {
            status: 404,
            headers: { "X-AXTO-Reason": "coming_soon" },
          });
        }
      }
    } catch {}
    const head = await r2.head(key).catch(() => null);
    if (!head) return new NextResponse(null, { status: 404 });
    return new NextResponse(null, {
      status: 200,
      headers: { "Content-Type": "application/octet-stream", "Content-Length": String(head.size || 0) },
    });
  }

  // ── Download ──────────────────────────────────────────────────────────────
  const obj = await r2.get(key).catch(() => null);
  if (!obj) {
    return NextResponse.json({
      error:   "File not yet available. Admin is processing the build. Please try again in a few minutes.",
      hint:    "If the problem persists, contact hallo@axto.io",
      r2_key:  key,
    }, { status: 404 });
  }

  // Audit log
  try {
    await dbRun(db,
      `INSERT INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
       VALUES (?, 'download', 'product', ?, ?, ?, ?)`,
      [crypto.randomUUID(), product, user.email,
       JSON.stringify({ type, license_id: licenseId, license_key: lic.license_key }),
       now()]
    ).catch(() => {});
  } catch {}

  return new NextResponse(obj.body, {
    headers: {
      "Content-Type":        "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename(product, type)}"`,
      "Content-Length":      String(obj.size || ""),
      "Cache-Control":       "no-store",
      "X-Product":           product,
      "X-License-Key":       lic.license_key,
      "X-License-Expires":   lic.expires_at,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// VAULT SETUP GUIDE — 10 LANGUAGES
// ═══════════════════════════════════════════════════════════════════════════
function generateVaultGuide(product: string, lang: string, licenseKey: string, maxNodes: number): string {
  if (product === "studio") {
    return generateStudioGuide(lang, licenseKey);
  }
  if (product !== "vault") {
    return generateLegacyGuide(product, lang, licenseKey, maxNodes);
  }

  const guides: Record<string, () => string> = {
    en: () => vaultGuideEN(licenseKey),
    id: () => vaultGuideID(licenseKey),
    zh: () => vaultGuideZH(licenseKey),
    ar: () => vaultGuideAR(licenseKey),
    es: () => vaultGuideES(licenseKey),
    fr: () => vaultGuideFR(licenseKey),
    de: () => vaultGuideDE(licenseKey),
    pt: () => vaultGuidePT(licenseKey),
    ja: () => vaultGuideJA(licenseKey),
    ko: () => vaultGuideKO(licenseKey),
  };

  return (guides[lang] || guides["en"])();
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDIO GUIDE — Complete multi-language setup guide
// ═══════════════════════════════════════════════════════════════════════════
function generateStudioGuide(lang: string, key: string): string {
  const guides: Record<string, () => string> = {
    en: () => studioGuideEN(key),
    id: () => studioGuideID(key),
  };
  return (guides[lang] || guides["en"])();
}

function studioGuideEN(key: string): string {
  return `# AXTO Studio — Complete Setup & Operations Guide

## Your License
- **License Key:** \`${key}\`
- **Product:** AXTO Studio — Self-Hosted AI & GPU Pool Platform
- **Engine:** Docker Image + Windows EXE

---

## What is AXTO Studio?

AXTO Studio is a **self-hosted** AI & GPU pool platform. You bring your own API keys (OpenAI, Claude, Gemini, Groq, etc.) and GPU endpoints (RunPod, Lambda, vast.ai, custom servers) — and AXTO Studio provides the professional workspace.

**Key Principle:** Your keys, your data, your server. AXTO never sees your prompts, responses, or credentials. Everything runs and is stored on YOUR infrastructure.

---

## Quick Start — 5 Minutes

### Step 1: Download & Configure
\`\`\`bash
# Download the Docker Compose and config
# From: axto.io/portal → Licenses → Studio → Download

# Edit the config file
nano studio.yml
\`\`\`

### Step 2: Set Your License Key
\`\`\`yaml
# In studio.yml:
studio:
  license_key: "${key}"
\`\`\`

### Step 3: Add AI Provider API Keys
\`\`\`yaml
  ai_providers:
    - provider: openai
      api_key: "sk-YOUR-OPENAI-KEY"

    - provider: anthropic
      api_key: "sk-ant-YOUR-CLAUDE-KEY"

    - provider: google
      api_key: "YOUR-GEMINI-KEY"
\`\`\`

### Step 4: Deploy
\`\`\`bash
docker compose -f studio-compose.yml up -d
\`\`\`

### Step 5: Open Studio
\`\`\`
Browser: http://YOUR_SERVER:8090
\`\`\`

---

## 🧠 AI Studio — Features & Menu Guide

### Dashboard (Home)
The main dashboard shows your license status, plan, connected providers, usage stats, and quick links to all three studios.

### Chat Interface
- **Provider Selector:** Choose which AI provider to use (uses YOUR API key)
- **Model Selector:** Pick specific model (GPT-4o, Claude Sonnet, Gemini Flash, etc.)
- **System Prompt:** Set the AI's behavior/personality
- **Temperature:** Control creativity (0.0 = precise, 2.0 = creative)
- **Chat History:** All conversations auto-save for 14 days

### Credential Manager
- **Add Provider:** Input your API key for any supported provider
- **Verify:** Automatic verification that your key works
- **Usage Tracking:** See requests, tokens, and cost per provider
- **Encryption:** All keys encrypted with AES-256-GCM on your disk

### Analytics
- **Today's Usage:** Requests, tokens, estimated cost
- **Monthly Usage:** Cumulative stats with cost breakdown
- **Per-Provider:** Which provider costs you the most

### Supported AI Providers (10+)
| Provider | Models | API Key Format |
|----------|--------|---------------|
| OpenAI | GPT-4o, GPT-4o-mini, o1 | sk-... |
| Anthropic | Claude Sonnet 4, Opus 4, Haiku | sk-ant-... |
| Google | Gemini 2.5 Pro, Flash | AIza... |
| Groq | Llama 3.3 70B, Mixtral | gsk_... |
| Mistral | Large, Medium, Codestral | ... |
| DeepSeek | Chat, Coder, Reasoner | sk-... |
| xAI | Grok-3, Grok-3-mini | xai-... |
| Cohere | Command R+, Embed v3 | ... |
| Ollama | Any local model | (endpoint URL) |
| Custom | Any OpenAI-compatible | (endpoint + key) |

---

## ⚡ GPU Studio — Features & Menu Guide

### GPU Endpoint Manager
- **Add GPU Provider:** Connect RunPod, Lambda, vast.ai, or custom GPU server
- **Health Monitoring:** Real-time online/offline/busy status
- **VRAM Tracking:** See GPU type, count, and available VRAM
- **Model Deployment:** Track which model is loaded on which GPU

### Supported GPU Providers
| Provider | GPU Types | How to Connect |
|----------|-----------|---------------|
| RunPod | A100, H100, RTX 4090 | API key from runpod.io dashboard |
| Lambda | A100, H100, A10G | API key from lambdalabs.com |
| vast.ai | A100, RTX 4090, 3090 | API key from vast.ai dashboard |
| Custom | Any NVIDIA GPU | Endpoint URL (Ollama/vLLM format) |

---

## 🔀 Hybrid Studio — Features & Menu Guide

### Pipeline Builder
Visual drag-and-drop interface to chain AI + GPU nodes:

- **AI Node:** Route to any cloud provider (uses YOUR key)
- **GPU Node:** Route to your connected GPU endpoint
- **Logic Node:** Conditional routing (e.g., "if GPU busy → use cloud")
- **Output Node:** Save results, call webhooks, chain to next step

### Example Pipeline
\`\`\`
User Request → [Check GPU Status]
  ├─ GPU idle → [Local Llama 3 on RunPod] → Response
  └─ GPU busy → [GPT-4o via OpenAI] → Response
      └─ Cost > $0.05 → [DeepSeek fallback] → Response
\`\`\`

---

## API Integration

### REST API
\`\`\`bash
curl -X POST http://YOUR_SERVER:8090/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "credential_id": "YOUR_CRED_ID",
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
\`\`\`

### WebSocket Streaming
\`\`\`javascript
const ws = new WebSocket("ws://YOUR_SERVER:8090/ws/chat");
ws.send(JSON.stringify({
  credential_id: "YOUR_CRED_ID",
  model: "gpt-4o-mini",
  messages: [{role: "user", content: "Hello"}]
}));
ws.onmessage = (e) => console.log(JSON.parse(e.data));
\`\`\`

---

## Data & Retention Policy

- **Sessions:** Auto-delete after 14 days
- **Artifacts:** Auto-delete after 14 days
- **Pipelines:** Auto-delete after 14 days
- **Credentials:** Permanent (until you remove them)
- **Usage Logs:** Kept for 90 days
- **All data stored:** On YOUR server only
- **Cleanup cron:** Runs every 6 hours automatically

---

## License Enforcement

- License validates against axto.io every 30 minutes
- 4-hour offline grace period if your server loses internet
- License locked to 1 machine (machine-id + IP)
- After grace period: all API requests blocked until reconnected
- Key prefix: \`STUD-XXXX-XXXX-XXXX-XXXX\`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "License invalid" | Check license_key in studio.yml matches your portal key |
| "Credential verification failed" | Verify your API key is correct and has credits |
| Can't connect to GPU | Check endpoint URL is reachable from your server |
| Artifacts disappeared | 14-day retention policy — export before expiry |
| High latency | Check network between your server and AI provider |

---

## Support
- Portal: https://axto.io/portal
- Email: hallo@axto.io
- Guide: https://axto.io/guide

© AXTO Platform — 100% BYOK — Your keys never leave your server
`;
}

function studioGuideID(key: string): string {
  return `# AXTO Studio — Panduan Setup & Operasi Lengkap

## Lisensi Anda
- **License Key:** \`${key}\`
- **Produk:** AXTO Studio — Platform AI & GPU Pool Self-Hosted
- **Format:** Docker Image + Windows EXE

---

## Apa itu AXTO Studio?

AXTO Studio adalah platform AI & GPU pool yang di-**deploy di server Anda sendiri**. Anda bawa API key sendiri (OpenAI, Claude, Gemini, Groq, dll) dan GPU endpoint Anda (RunPod, Lambda, vast.ai) — AXTO Studio menyediakan workspace profesional.

**Prinsip Utama:** Key Anda, data Anda, server Anda. AXTO tidak pernah melihat prompt, response, atau credential Anda.

---

## Quick Start — 5 Menit

### Langkah 1: Download & Konfigurasi
\`\`\`bash
# Download Docker Compose dan config dari portal
# axto.io/portal → Licenses → Studio → Download

nano studio.yml
\`\`\`

### Langkah 2: Set License Key
\`\`\`yaml
studio:
  license_key: "${key}"
\`\`\`

### Langkah 3: Tambahkan API Key Provider AI
\`\`\`yaml
  ai_providers:
    - provider: openai
      api_key: "sk-KEY-OPENAI-ANDA"
    - provider: anthropic
      api_key: "sk-ant-KEY-CLAUDE-ANDA"
\`\`\`

### Langkah 4: Deploy
\`\`\`bash
docker compose -f studio-compose.yml up -d
\`\`\`

### Langkah 5: Buka Studio
\`\`\`
Browser: http://SERVER_ANDA:8090
\`\`\`

---

## 🧠 AI Studio — Panduan Menu

### Dashboard
Dashboard utama menampilkan status lisensi, plan, provider terhubung, statistik penggunaan.

### Chat Interface
- **Pilih Provider:** Pilih provider AI (menggunakan KEY ANDA)
- **Pilih Model:** GPT-4o, Claude Sonnet, Gemini Flash, dll
- **System Prompt:** Atur perilaku AI
- **Temperature:** 0.0 = presisi, 2.0 = kreatif
- **Riwayat:** Semua percakapan tersimpan 14 hari

### Credential Manager
- **Tambah Provider:** Input API key untuk provider manapun
- **Verifikasi:** Otomatis cek apakah key valid
- **Tracking:** Lihat request, token, dan biaya per provider
- **Enkripsi:** Semua key dienkripsi AES-256-GCM di disk Anda

### Provider AI Didukung (10+)
OpenAI, Anthropic Claude, Google Gemini, Groq, Mistral, DeepSeek, xAI Grok, Cohere, Ollama, Custom endpoint

---

## ⚡ GPU Studio — Panduan Menu

- **Tambah GPU:** Hubungkan RunPod, Lambda, vast.ai, atau server GPU custom
- **Monitoring:** Status real-time (online/offline/busy)
- **VRAM:** Lihat tipe GPU, jumlah, dan VRAM tersedia
- **Deploy Model:** Track model yang di-load di GPU mana

---

## 🔀 Hybrid Studio — Panduan Menu

Pipeline builder visual untuk menggabungkan AI cloud + GPU lokal:
- **AI Node:** Route ke provider cloud (pakai KEY ANDA)
- **GPU Node:** Route ke GPU endpoint Anda
- **Logic Node:** Routing kondisional (misal: "jika GPU sibuk → pakai cloud")
- **Output Node:** Simpan hasil, panggil webhook

---

## Kebijakan Data & Retensi
- Session: otomatis hapus setelah 14 hari
- Artifact: otomatis hapus setelah 14 hari
- Credential: permanen sampai Anda hapus manual
- Semua data di server ANDA — tidak pernah dikirim ke AXTO

---

## Support
- Portal: https://axto.io/portal | Email: hallo@axto.io

© AXTO Platform — 100% BYOK
`;
}

// ── English ───────────────────────────────────────────────────────────────────
function vaultGuideEN(key: string): string {
  return `# AXTO Vault — Complete Setup & Integration Guide

## Your License
- **License Key:** \`${key}\`
- **Product:** Vault AI — AI Privacy Layer
- **Purpose:** Automatically redact PII, PHI, and Financial data from AI API requests

---

## What Is Vault?

AXTO Vault sits as a transparent proxy between your application and any AI provider
(OpenAI, Anthropic, Gemini, Groq, etc.). It intercepts every request, strips out
sensitive data, forwards clean text to the AI, then re-injects the original values
into the response — all in milliseconds.

**Your application sees:** Normal AI responses with original values intact.
**The AI provider sees:** Sanitized requests with no PII, PHI, or financial data.
**Your users' data:** Never leaves your infrastructure.

---

## Quick Start — 5 Minutes

### Step 1: Download & Extract
\`\`\`bash
# From your portal: Licenses → Download → Docker
mkdir axto-vault && cd axto-vault
# Files included: vault-compose.yml, vault.yml, vault-core.tar.gz
\`\`\`

### Step 2: Load Docker Image
\`\`\`bash
docker load < vault-core.tar.gz
\`\`\`

### Step 3: Configure vault.yml
\`\`\`yaml
vault:
  license_key: "${key}"
  license_validate_url: "https://axto.io/api/license-validate"
  ai_pool:
    vendors:
      - provider: openai
        api_key: "sk-YOUR-OPENAI-KEY"
        default_model: "gpt-4o-mini"
\`\`\`

### Step 4: Start Vault
\`\`\`bash
docker compose -f vault-compose.yml up -d
\`\`\`

### Step 5: Verify
\`\`\`bash
curl http://localhost:8080/health
# → {"status":"ok","product":"vault","license":"starter","valid":true}
\`\`\`

---

## Integrate With Your Application

### Python (OpenAI SDK)
\`\`\`python
from openai import OpenAI

client = OpenAI(
    api_key="anything",  # Vault ignores this — uses your vault.yml key
    base_url="http://YOUR_VAULT_SERVER:8080/v1",
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Summarize this: Patient John Smith (SSN: 123-45-6789, DOB: 1985-03-15) was diagnosed with Type 2 Diabetes."}]
)
# The AI receives: "Summarize this: Patient [VAULT_PII_NAME_1] (SSN: [VAULT_SSN_1], DOB: [VAULT_DOB_1]) was diagnosed with Type 2 Diabetes."
# Your app receives: Full original text — re-injected by Vault.
print(response.choices[0].message.content)
\`\`\`

### Node.js (OpenAI SDK)
\`\`\`javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey:  "anything",
  baseURL: "http://YOUR_VAULT_SERVER:8080/v1",
});
\`\`\`

### Anthropic SDK
\`\`\`python
import anthropic

client = anthropic.Anthropic(
    api_key="anything",
    base_url="http://YOUR_VAULT_SERVER:8080",
)
\`\`\`

### Direct HTTP
\`\`\`bash
curl http://YOUR_VAULT_SERVER:8080/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello, my card is 4532-1234-5678-9012"}]}'
# Vault redacts card number, forwards to AI, re-injects in response
\`\`\`

---

## Dashboard & API

| Endpoint | Description |
|----------|-------------|
| \`GET  /health\`             | Health check + stats |
| \`POST /vault/test\`         | Test redaction without forwarding to AI |
| \`GET  /vault/stats\`        | Redaction statistics |
| \`GET  /vault/audit\`        | Audit log (what was redacted) |
| \`GET  /vault/policies\`     | List redaction policies |
| \`POST /vault/policies\`     | Create new policy |
| \`GET  /support\`            | AI support chat |

---

## What Vault Redacts

### PII (Personal Identifiable Information)
- Email addresses → \`[VAULT_EMAIL_1]\`
- Phone numbers → \`[VAULT_PHONE_1]\`
- Social Security Numbers → \`[VAULT_SSN_1]\`
- Passport numbers → \`[VAULT_PASSPORT_1]\`
- National ID (KTP, NID) → \`[VAULT_NATIONAL_ID_1]\`
- Physical addresses → \`[VAULT_ADDRESS_1]\`
- Dates of birth → \`[VAULT_DOB_1]\`
- IP addresses → \`[VAULT_IP_ADDRESS_1]\`
- Names in context → \`[VAULT_PII_NAME_1]\`

### PHI (Protected Health Information)
- Medical record numbers → \`[VAULT_MRN_1]\`
- ICD diagnosis codes → \`[VAULT_ICD_CODE_1]\`
- Lab values (glucose, cholesterol, etc.) → \`[VAULT_LAB_VALUE_1]\`
- Insurance member IDs → \`[VAULT_INSURANCE_ID_1]\`
- Medication with dosage → \`[VAULT_MEDICATION_DOSAGE_1]\`
- Blood type → \`[VAULT_BLOOD_TYPE_1]\`

### Financial Data
- Credit/debit card numbers → \`[VAULT_CREDIT_CARD_1]\`
- IBAN → \`[VAULT_IBAN_1]\`
- Bank account numbers → \`[VAULT_BANK_ACCOUNT_1]\`
- API keys & bearer tokens → \`[VAULT_API_KEY_1]\`
- Crypto wallet addresses → \`[VAULT_CRYPTO_WALLET_1]\`
- Tax IDs (EIN, NPWP) → \`[VAULT_TAX_ID_1]\`

---

## Redaction Policies

Create per-project policies to customize redaction:

\`\`\`bash
curl -X POST http://localhost:8080/vault/policies \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Medical App Policy",
    "description": "Full PHI protection for healthcare project",
    "redact_pii": true,
    "redact_phi": true,
    "redact_financial": true,
    "whitelist_domains": ["acme-corp.com"],
    "ai_provider": "openai",
    "ai_model": "gpt-4o"
  }'
\`\`\`

Use the policy in your request:
\`\`\`json
{
  "model": "gpt-4o",
  "project_id": "Medical App Policy",
  "messages": [...]
}
\`\`\`

Or via header:
\`\`\`
X-Vault-Project: Medical App Policy
\`\`\`

---

## Compliance Coverage

| Standard | Coverage |
|----------|---------|
| HIPAA    | PHI redaction + audit trail + access controls |
| GDPR     | PII redaction + right to erasure support |
| SOC 2    | Audit log + policy management + access controls |
| PCI-DSS  | Card/financial data redaction + audit |
| ISO 27001| Data classification + audit trail |

---

## Audit Log

Every request is logged (originals never stored — only masked evidence):
\`\`\`bash
curl http://localhost:8080/vault/audit?limit=10
curl http://localhost:8080/vault/audit/{request_id}/redactions
\`\`\`

---

## Test Without Forwarding
\`\`\`bash
curl -X POST http://localhost:8080/vault/test \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello, my email is john@example.com and SSN is 123-45-6789"}'

# Response:
# {
#   "original": "Hello, my email is john@example.com and SSN is 123-45-6789",
#   "redacted": "Hello, my email is [VAULT_EMAIL_1] and SSN is [VAULT_SSN_1]",
#   "replacements": {"[VAULT_EMAIL_1]": "john@example.com", "[VAULT_SSN_1]": "123-45-6789"},
#   "redaction_count": 2
# }
\`\`\`

---

## Support
- Portal:  https://axto.io/portal
- Email:   hallo@axto.io
- Guide:   https://axto.io/guide
- Support: http://YOUR_VAULT_SERVER:8080/support (AI chat)

© AXTO Platform — AI eXecution & Tools Orchestration
100% BYOK — Your keys, your data, your infrastructure.
`;
}

// ── Bahasa Indonesia ──────────────────────────────────────────────────────────
function vaultGuideID(key: string): string {
  return `# AXTO Vault — Panduan Setup & Integrasi Lengkap

## Lisensi Anda
- **License Key:** \`${key}\`
- **Produk:** Vault AI — AI Privacy Layer
- **Tujuan:** Otomatis redaksi PII, PHI, dan data finansial dari request AI API

---

## Apa Itu Vault?

AXTO Vault beroperasi sebagai proxy transparan antara aplikasi Anda dan provider AI mana pun
(OpenAI, Anthropic, Gemini, Groq, dll). Vault mencegat setiap request, mengambil data sensitif,
meneruskan teks yang bersih ke AI, kemudian menyuntikkan kembali nilai asli ke dalam respons —
semuanya dalam milidetik.

**Aplikasi Anda melihat:** Respons AI normal dengan nilai asli yang utuh.
**Provider AI melihat:** Request yang sudah disanitasi tanpa PII, PHI, atau data finansial.
**Data pengguna Anda:** Tidak pernah meninggalkan infrastruktur Anda.

---

## Quick Start — 5 Menit

### Langkah 1: Download & Ekstrak
\`\`\`bash
mkdir axto-vault && cd axto-vault
# Dari portal: Lisensi → Download → Docker
# File termasuk: vault-compose.yml, vault.yml, vault-core.tar.gz
\`\`\`

### Langkah 2: Load Docker Image
\`\`\`bash
docker load < vault-core.tar.gz
\`\`\`

### Langkah 3: Konfigurasi vault.yml
\`\`\`yaml
vault:
  license_key: "${key}"
  ai_pool:
    vendors:
      - provider: openai
        api_key: "sk-API-KEY-ANDA"
        default_model: "gpt-4o-mini"
\`\`\`

### Langkah 4: Jalankan Vault
\`\`\`bash
docker compose -f vault-compose.yml up -d
\`\`\`

### Langkah 5: Verifikasi
\`\`\`bash
curl http://localhost:8080/health
# → {"status":"ok","product":"vault","valid":true}
\`\`\`

---

## Integrasi Aplikasi Anda

### Python (OpenAI SDK)
\`\`\`python
from openai import OpenAI
client = OpenAI(
    api_key="apa-saja",
    base_url="http://SERVER_VAULT_ANDA:8080/v1",
)
\`\`\`

### Node.js
\`\`\`javascript
import OpenAI from "openai";
const client = new OpenAI({
  apiKey:  "apa-saja",
  baseURL: "http://SERVER_VAULT_ANDA:8080/v1",
});
\`\`\`

---

## Data Yang Diredaksi Vault

### PII (Informasi Pribadi yang Dapat Diidentifikasi)
- Email → \`[VAULT_EMAIL_1]\`
- Nomor telepon → \`[VAULT_PHONE_1]\`
- NIK / KTP (16 digit) → \`[VAULT_NATIONAL_ID_1]\`
- NPWP → \`[VAULT_TAX_ID_1]\`
- Alamat fisik → \`[VAULT_ADDRESS_1]\`
- Tanggal lahir → \`[VAULT_DOB_1]\`
- Nomor paspor → \`[VAULT_PASSPORT_1]\`

### PHI (Informasi Kesehatan yang Dilindungi)
- Nomor rekam medis → \`[VAULT_MRN_1]\`
- Kode diagnosa ICD → \`[VAULT_ICD_CODE_1]\`
- Nilai lab (gula darah, kolesterol) → \`[VAULT_LAB_VALUE_1]\`
- ID asuransi BPJS → \`[VAULT_INSURANCE_ID_1]\`

### Data Finansial
- Nomor kartu kredit/debit → \`[VAULT_CREDIT_CARD_1]\`
- Nomor rekening bank → \`[VAULT_BANK_ACCOUNT_1]\`
- API key → \`[VAULT_API_KEY_1]\`
- Alamat wallet crypto → \`[VAULT_CRYPTO_WALLET_1]\`

---

## Test Redaksi (Tanpa Forward ke AI)
\`\`\`bash
curl -X POST http://localhost:8080/vault/test \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Email saya john@example.com dan NIK: 3201234567890001"}'
\`\`\`

---

## Cakupan Compliance
| Standar | Cakupan |
|---------|---------|
| HIPAA   | Redaksi PHI + audit trail |
| GDPR    | Redaksi PII + mendukung hak penghapusan |
| PCI-DSS | Redaksi data kartu + audit |
| ISO 27001 | Klasifikasi data + audit trail |

---

## Dukungan
- Portal:  https://axto.io/portal
- Email:   hallo@axto.io
- Panduan: https://axto.io/guide
- Support AI: http://SERVER_VAULT_ANDA:8080/support

© AXTO Platform — 100% BYOK — Kunci Anda, data Anda, infrastruktur Anda.
`;
}

// ── 简体中文 ───────────────────────────────────────────────────────────────────
function vaultGuideZH(key: string): string {
  return `# AXTO Vault — 完整设置与集成指南

## 您的许可证
- **许可证密钥:** \`${key}\`
- **产品:** Vault AI — AI 隐私层
- **用途:** 自动从 AI API 请求中删除 PII/PHI/金融数据

---

## Vault 是什么？

AXTO Vault 作为透明代理，位于您的应用程序与任何 AI 提供商（OpenAI、Anthropic、Gemini 等）之间。
它拦截每个请求，移除敏感数据，将干净的文本转发给 AI，然后将原始值重新注入响应中——全程毫秒级完成。

---

## 快速开始 — 5 分钟

### 步骤 1: 下载并解压
\`\`\`bash
mkdir axto-vault && cd axto-vault
# 从门户: 许可证 → 下载 → Docker
\`\`\`

### 步骤 2: 加载 Docker 镜像
\`\`\`bash
docker load < vault-core.tar.gz
\`\`\`

### 步骤 3: 配置 vault.yml
\`\`\`yaml
vault:
  license_key: "${key}"
  ai_pool:
    vendors:
      - provider: openai
        api_key: "sk-您的API密钥"
        default_model: "gpt-4o-mini"
\`\`\`

### 步骤 4: 启动 Vault
\`\`\`bash
docker compose -f vault-compose.yml up -d
\`\`\`

### 步骤 5: 验证
\`\`\`bash
curl http://localhost:8080/health
# → {"status":"ok","product":"vault","valid":true}
\`\`\`

---

## 应用程序集成

\`\`\`python
from openai import OpenAI
client = OpenAI(api_key="任意值", base_url="http://您的VAULT服务器:8080/v1")
\`\`\`

---

## Vault 会删除什么数据

- PII: 邮箱、电话、身份证号、护照、地址、生日
- PHI: 病历号、ICD 诊断码、化验值、保险 ID
- 金融: 信用卡、IBAN、银行账号、API 密钥、加密钱包

---

## 支持
- 门户: https://axto.io/portal
- 邮件: hallo@axto.io
- AI 支持: http://您的VAULT服务器:8080/support

© AXTO Platform — 100% BYOK — 您的密钥，您的数据，您的基础设施。
`;
}

// ── العربية ───────────────────────────────────────────────────────────────────
function vaultGuideAR(key: string): string {
  return `# AXTO Vault — دليل الإعداد والتكامل الكامل

## ترخيصك
- **مفتاح الترخيص:** \`${key}\`
- **المنتج:** Vault AI — طبقة الخصوصية للذكاء الاصطناعي

---

## ما هو Vault؟

يعمل AXTO Vault كوكيل شفاف بين تطبيقك وأي مزود للذكاء الاصطناعي.
يعترض كل طلب، ويزيل البيانات الحساسة، ويرسل النص النظيف إلى الذكاء الاصطناعي،
ثم يعيد حقن القيم الأصلية في الاستجابة — كل ذلك في غضون ميلي ثانية.

---

## البدء السريع — 5 دقائق

\`\`\`bash
# 1. تحميل صورة Docker
docker load < vault-core.tar.gz

# 2. تكوين vault.yml
vault:
  license_key: "${key}"
  ai_pool:
    vendors:
      - provider: openai
        api_key: "sk-مفتاح-API-الخاص-بك"

# 3. تشغيل Vault
docker compose -f vault-compose.yml up -d

# 4. التحقق
curl http://localhost:8080/health
\`\`\`

---

## تكامل التطبيق

\`\`\`python
from openai import OpenAI
client = OpenAI(api_key="أي_قيمة", base_url="http://خادم-VAULT:8080/v1")
\`\`\`

---

## ما يحمي Vault
- PII: البريد الإلكتروني، الهاتف، رقم الهوية، جواز السفر، العنوان
- PHI: السجلات الطبية، رموز التشخيص ICD، قيم المختبر
- البيانات المالية: بطاقات الائتمان، IBAN، أرقام الحسابات، مفاتيح API

---

## الدعم
- البوابة: https://axto.io/portal
- البريد: hallo@axto.io

© AXTO Platform — 100% BYOK
`;
}

// ── Español ───────────────────────────────────────────────────────────────────
function vaultGuideES(key: string): string {
  return `# AXTO Vault — Guía Completa de Configuración e Integración

## Su Licencia
- **Clave de Licencia:** \`${key}\`
- **Producto:** Vault AI — Capa de Privacidad AI

---

## ¿Qué es Vault?

AXTO Vault actúa como un proxy transparente entre su aplicación y cualquier proveedor de IA.
Intercepta cada solicitud, elimina datos sensibles, reenvía texto limpio a la IA,
y luego re-inyecta los valores originales en la respuesta — todo en milisegundos.

---

## Inicio Rápido — 5 Minutos

\`\`\`bash
docker load < vault-core.tar.gz
# Configurar vault.yml con license_key y AI API key
docker compose -f vault-compose.yml up -d
curl http://localhost:8080/health
\`\`\`

## Integración

\`\`\`python
from openai import OpenAI
client = OpenAI(api_key="cualquier_valor", base_url="http://SU_VAULT:8080/v1")
\`\`\`

## Qué Redacta Vault
- PII: Emails, teléfonos, DNI/pasaporte, direcciones, fechas de nacimiento
- PHI: Registros médicos, códigos ICD, valores de laboratorio, seguros
- Financiero: Tarjetas de crédito, IBAN, cuentas bancarias, claves API

## Soporte
- Portal: https://axto.io/portal | Email: hallo@axto.io

© AXTO Platform — 100% BYOK
`;
}

// ── Français ──────────────────────────────────────────────────────────────────
function vaultGuideFR(key: string): string {
  return `# AXTO Vault — Guide Complet d'Installation et d'Intégration

## Votre Licence
- **Clé de Licence:** \`${key}\`
- **Produit:** Vault AI — Couche de Confidentialité IA

---

## Qu'est-ce que Vault ?

AXTO Vault agit comme un proxy transparent entre votre application et tout fournisseur IA.
Il intercepte chaque requête, supprime les données sensibles, transmet le texte épuré à l'IA,
puis réinjecte les valeurs originales dans la réponse — le tout en quelques millisecondes.

---

## Démarrage Rapide — 5 Minutes

\`\`\`bash
docker load < vault-core.tar.gz
# Configurer vault.yml avec license_key et clé API IA
docker compose -f vault-compose.yml up -d
curl http://localhost:8080/health
\`\`\`

## Intégration

\`\`\`python
from openai import OpenAI
client = OpenAI(api_key="n'importe_quoi", base_url="http://VOTRE_VAULT:8080/v1")
\`\`\`

## Ce que Vault Rédige
- PII: Emails, téléphones, numéros de sécurité sociale, adresses, dates de naissance
- PHI: Dossiers médicaux, codes ICD, valeurs de laboratoire, assurance
- Financier: Cartes de crédit, IBAN, comptes bancaires, clés API

## Support
- Portail: https://axto.io/portal | Email: hallo@axto.io

© AXTO Platform — 100% BYOK
`;
}

// ── Deutsch ───────────────────────────────────────────────────────────────────
function vaultGuideDE(key: string): string {
  return `# AXTO Vault — Vollständige Einrichtungs- und Integrationsanleitung

## Ihre Lizenz
- **Lizenzschlüssel:** \`${key}\`
- **Produkt:** Vault AI — KI-Datenschutzschicht

---

## Was ist Vault?

AXTO Vault fungiert als transparenter Proxy zwischen Ihrer Anwendung und jedem KI-Anbieter.
Es fängt jede Anfrage ab, entfernt sensible Daten, leitet bereinigten Text an die KI weiter
und injiziert die Originalwerte anschließend wieder in die Antwort — alles in Millisekunden.

---

## Schnellstart — 5 Minuten

\`\`\`bash
docker load < vault-core.tar.gz
# vault.yml mit Lizenzschlüssel und KI-API-Schlüssel konfigurieren
docker compose -f vault-compose.yml up -d
curl http://localhost:8080/health
\`\`\`

## Integration

\`\`\`python
from openai import OpenAI
client = OpenAI(api_key="beliebig", base_url="http://IHR_VAULT:8080/v1")
\`\`\`

## Was Vault Redigiert
- PII: E-Mails, Telefonnummern, Ausweisnummern, Adressen, Geburtsdaten
- PHI: Patientenakten, ICD-Diagnosecodes, Laborwerte, Versicherungs-IDs
- Finanziell: Kreditkarten, IBAN, Bankkonten, API-Schlüssel

## Support
- Portal: https://axto.io/portal | E-Mail: hallo@axto.io

© AXTO Platform — 100% BYOK
`;
}

// ── Português ─────────────────────────────────────────────────────────────────
function vaultGuidePT(key: string): string {
  return `# AXTO Vault — Guia Completo de Configuração e Integração

## Sua Licença
- **Chave de Licença:** \`${key}\`
- **Produto:** Vault AI — Camada de Privacidade de IA

---

## O que é o Vault?

O AXTO Vault atua como um proxy transparente entre sua aplicação e qualquer provedor de IA.
Intercepta cada requisição, remove dados sensíveis, encaminha texto limpo para a IA,
e então re-injeta os valores originais na resposta — tudo em milissegundos.

---

## Início Rápido — 5 Minutos

\`\`\`bash
docker load < vault-core.tar.gz
# Configurar vault.yml com license_key e chave da API de IA
docker compose -f vault-compose.yml up -d
curl http://localhost:8080/health
\`\`\`

## Integração

\`\`\`python
from openai import OpenAI
client = OpenAI(api_key="qualquer_coisa", base_url="http://SEU_VAULT:8080/v1")
\`\`\`

## O que o Vault Redige
- PII: Emails, telefones, CPF/passaporte, endereços, datas de nascimento
- PHI: Registros médicos, códigos CID, valores de laboratório, planos de saúde
- Financeiro: Cartões de crédito, IBAN, contas bancárias, chaves de API

## Suporte
- Portal: https://axto.io/portal | Email: hallo@axto.io

© AXTO Platform — 100% BYOK
`;
}

// ── 日本語 ────────────────────────────────────────────────────────────────────
function vaultGuideJA(key: string): string {
  return `# AXTO Vault — 完全セットアップ＆統合ガイド

## ライセンス情報
- **ライセンスキー:** \`${key}\`
- **製品:** Vault AI — AI プライバシーレイヤー

---

## Vault とは？

AXTO Vault は、アプリケーションと任意の AI プロバイダー（OpenAI、Anthropic、Gemini 等）の間で
透明なプロキシとして機能します。すべてのリクエストをインターセプトし、機密データを削除し、
クリーンなテキストを AI に転送し、その後元の値をレスポンスに再注入します — ミリ秒で完了。

---

## クイックスタート — 5 分

\`\`\`bash
docker load < vault-core.tar.gz
# vault.yml にライセンスキーと AI API キーを設定
docker compose -f vault-compose.yml up -d
curl http://localhost:8080/health
\`\`\`

## アプリケーション統合

\`\`\`python
from openai import OpenAI
client = OpenAI(api_key="任意", base_url="http://お使いのVAULT:8080/v1")
\`\`\`

## Vault が削除するデータ
- PII: メール、電話番号、マイナンバー、パスポート、住所、生年月日
- PHI: 患者記録番号、ICD 診断コード、検査値、保険番号
- 金融: クレジットカード、IBAN、銀行口座番号、API キー

## サポート
- ポータル: https://axto.io/portal | メール: hallo@axto.io

© AXTO Platform — 100% BYOK
`;
}

// ── 한국어 ────────────────────────────────────────────────────────────────────
function vaultGuideKO(key: string): string {
  return `# AXTO Vault — 완전한 설정 및 통합 가이드

## 라이선스 정보
- **라이선스 키:** \`${key}\`
- **제품:** Vault AI — AI 프라이버시 레이어

---

## Vault란?

AXTO Vault는 애플리케이션과 모든 AI 제공자 사이에서 투명한 프록시로 작동합니다.
모든 요청을 가로채고, 민감한 데이터를 제거하고, 정제된 텍스트를 AI에 전달한 후,
원래 값을 응답에 다시 삽입합니다 — 모두 밀리초 안에 완료됩니다.

---

## 빠른 시작 — 5분

\`\`\`bash
docker load < vault-core.tar.gz
# vault.yml에 라이선스 키와 AI API 키 설정
docker compose -f vault-compose.yml up -d
curl http://localhost:8080/health
\`\`\`

## 애플리케이션 통합

\`\`\`python
from openai import OpenAI
client = OpenAI(api_key="아무거나", base_url="http://귀하의VAULT:8080/v1")
\`\`\`

## Vault가 처리하는 데이터
- PII: 이메일, 전화번호, 주민등록번호/여권, 주소, 생년월일
- PHI: 환자 기록 번호, ICD 진단 코드, 검사값, 보험 ID
- 금융: 신용카드, IBAN, 은행 계좌번호, API 키

## 지원
- 포털: https://axto.io/portal | 이메일: hallo@axto.io

© AXTO Platform — 100% BYOK
`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY GUIDE for guardian/orchestra
// ═══════════════════════════════════════════════════════════════════════════
function generateLegacyGuide(product: string, lang: string, licenseKey: string, maxNodes: number): string {
  // Full installation guides for all 10 remaining products
  const GUIDES: Record<string, (key: string, nodes: number) => string> = {

    guardian: (key, nodes) => `# AXTO Guardian AI — Complete Setup Guide

**License Key:** \`${key}\`
**Max Nodes:** ${nodes === -1 ? "Unlimited" : nodes}

## System Requirements
- Linux server (Ubuntu 20.04+ / RHEL 8+ / Debian 11+) or Windows Server 2019+
- Minimum: 2 CPU cores, 2 GB RAM, 20 GB disk
- Docker 24+ and Docker Compose v2
- Outbound HTTPS to axto.io for license validation

## Step 1 — Download
Log in to your AXTO Portal (axto.io/portal → Downloads tab).
Download the Docker archive: **guardian-core-linux.tar.gz** (Linux) or **guardian-core-windows.exe** (Windows agent).

## Step 2 — Load Docker Image
\`\`\`bash
docker load < guardian-core-linux.tar.gz
docker images | grep guardian
\`\`\`

## Step 3 — Configure guardian.yml
\`\`\`yaml
guardian:
  license_key: "${key}"
  api_key: "generate-a-strong-key"
  node_id: "main-server"
  log_level: "INFO"
  max_nodes: ${nodes}

threat_detection:
  engine: "guardian-core"
  update_interval_hours: 6
  quarantine_path: "/guardian/quarantine"
  anomaly_threshold: 0.75

notifications:
  email: ""          # your-email@company.com
  slack_webhook: ""  # optional

ai_pool:
  vendors:
    - provider: openai
      api_key: "sk-..."
      model: "gpt-4o-mini"
\`\`\`

## Step 4 — Start Guardian Core
\`\`\`bash
docker compose -f guardian-compose.yml up -d
docker compose -f guardian-compose.yml logs -f guardian-core
\`\`\`

## Step 5 — Verify Health
\`\`\`bash
curl http://localhost:8080/health | jq .
# Expected: { "status": "ok", "license": { "valid": true } }
\`\`\`

## Step 6 — Deploy Node Agents (multi-server)
On every server you want to monitor, install the Guardian Node agent:
\`\`\`bash
# Linux EXE (no Docker needed on remote servers)
./guardian-node-windows.exe --core-url http://GUARDIAN-CORE-IP:8080 --api-key YOUR-API-KEY

# Or Docker
GUARDIAN_CORE_URL=http://GUARDIAN-CORE-IP:8080 GUARDIAN_NODE_API_KEY=YOUR-KEY \\
  docker compose -f guardian-node-compose.yml up -d
\`\`\`

## Step 7 — Dashboard
Open your AXTO dashboard → Guardian section.
- **Overview**: live threat score per server
- **Alerts**: real-time detections with MITRE ATT&CK classification
- **Nodes**: online/offline status of all registered agents
- **Quarantine**: files blocked by Guardian with one-click restore or delete

## Step 8 — Troubleshooting
\`\`\`bash
# License invalid → check key prefix is GUARD-
# Node offline → verify GUARDIAN_CORE_URL is reachable from the node
# High CPU → reduce anomaly scan interval in guardian.yml
docker compose -f guardian-compose.yml logs guardian-core
\`\`\`

Support: hallo@axto.io | Renewal: https://axto.io/renew
`,

    orchestra: (key, nodes) => `# AXTO Orchestra AI — Complete Setup Guide

**License Key:** \`${key}\`
**Max Workers:** ${nodes === -1 ? "Unlimited" : nodes}

## System Requirements
- Linux server, 4+ CPU cores, 8 GB RAM (16 GB+ for GPU workers)
- Docker 24+, NVIDIA Container Toolkit (for GPU workers)
- Outbound HTTPS to AI providers (OpenAI, Anthropic, etc.)

## Step 1 — Download
Portal → Downloads → **orchestra-core-linux.tar.gz**

## Step 2 — Load Image
\`\`\`bash
docker load < orchestra-core-linux.tar.gz
\`\`\`

## Step 3 — Configure orchestra.yml
\`\`\`yaml
orchestra:
  license_key: "${key}"
  api_key: "your-strong-key"
  max_workers: ${nodes}
  routing_strategy: "cost_optimized"  # cost_optimized|latency|round_robin|weighted|smart

ai_pool:
  vendors:
    - provider: openai
      api_key: "sk-..."
      model: "gpt-4o-mini"
      weight: 60
    - provider: anthropic
      api_key: "sk-ant-..."
      model: "claude-3-5-haiku-20241022"
      weight: 40
    - provider: ollama
      base_url: "http://localhost:11434"
      model: "llama3.2"
      weight: 0          # use only when others unavailable

workers:
  cpu_pool: 4
  gpu_pool: 0           # set > 0 if GPU available
  autoscale: true
  scale_to_zero: true   # spin down idle workers
\`\`\`

## Step 4 — Start Orchestra
\`\`\`bash
docker compose -f orchestra-compose.yml up -d
curl http://localhost:8091/health | jq .
\`\`\`

## Step 5 — First Routed Request
\`\`\`python
from openai import OpenAI
client = OpenAI(
    base_url="http://orchestra:8091/v1",
    api_key="your-strong-key"
)
resp = client.chat.completions.create(
    model="auto",    # Orchestra picks best provider
    messages=[{"role": "user", "content": "Hello!"}]
)
print(resp.choices[0].message.content)
\`\`\`

## Step 6 — Dashboard
- **Workers**: live CPU/GPU utilization per worker
- **Routing**: request log with provider selected, cost, latency
- **Cost**: daily spend chart by provider
- **Autoscaler**: config thresholds for scale-up/down

## Troubleshooting
\`\`\`bash
# No workers up → check ORCHESTRA_MAX_WORKERS in compose env
# Provider failover not working → verify fallback order in orchestra.yml
# High latency → enable caching in routing_strategy: cache_first
docker compose logs orchestra-core
\`\`\`
`,

    "guardian-antivirus": (key, _) => `# AXTO Antivirus AI — Complete Setup Guide

**License Key:** \`${key}\`

## Overview
AXTO Antivirus combines ClamAV with ML behavioral analysis. Runs on-premise, exposes a REST API for file scanning, and integrates with Guardian AI for correlated threat response.

## Step 1 — Download
Portal → Downloads → **guardian-antivirus-linux.tar.gz**

## Step 2 — Load & Start
\`\`\`bash
docker load < guardian-antivirus-linux.tar.gz
docker compose -f antivirus-compose.yml up -d
\`\`\`

## Step 3 — Configure antivirus.yml
\`\`\`yaml
antivirus:
  license_key: "${key}"
  api_key: "your-strong-key"
  scan_mode: "full"          # quick|full|custom
  quarantine_path: "/av/quarantine"
  update_interval_hours: 6   # definition updates
  ml_detection: true          # ML behavioral analysis
\`\`\`

## Step 4 — Scan a File
\`\`\`bash
curl -X POST http://localhost:8088/v1/scan \\
  -H "X-AV-Key: your-api-key" \\
  -F "file=@/path/to/file.exe"
# Returns: { "clean": false, "threat": "Trojan.GenericKD", "action": "quarantined" }
\`\`\`

## Dashboard
Portal → Antivirus: Scan Log, Quarantine Manager, Threat Statistics, Definition Update Status.
`,

    "antivirus-core": (key, _) => `# AXTO Antivirus Core — Complete Setup Guide

**License Key:** \`${key}\`

## Overview
Standalone antivirus engine without Guardian integration. Suitable for standalone scanning pipelines.

## Setup
\`\`\`bash
docker load < antivirus-core-linux.tar.gz
# Configure antivirus.yml with license_key: "${key}"
docker compose -f antivirus-core-compose.yml up -d
curl http://localhost:8088/health
\`\`\`

## REST API
\`\`\`bash
# Scan file
curl -X POST .../v1/scan -H "X-AV-Key: KEY" -F "file=@sample.exe"
# List quarantine
curl .../v1/quarantine -H "X-AV-Key: KEY"
# Update definitions
curl -X POST .../v1/update -H "X-AV-Key: KEY"
\`\`\`
`,

    edge: (key, _) => `# AXTO Edge AI — Complete Setup Guide

**License Key:** \`${key}\`

## System Requirements
- 2 CPU cores, 4 GB RAM, 20 GB disk (SSD recommended for cache)
- Docker 24+, port 8094 open

## Step 1 — Download
Portal → Downloads → **edge-core-linux.tar.gz**

## Step 2 — Configure edge.yml
\`\`\`yaml
edge:
  license_key: "${key}"
  api_key: "your-strong-key"
  port: 8094
  cache_enabled: true
  cache_ttl_seconds: 3600

ai_pool:
  vendors:
    - provider: openai
      api_key: "sk-..."
      model: "gpt-4o-mini"
      weight: 70
    - provider: anthropic
      api_key: "sk-ant-..."
      model: "claude-3-5-haiku-20241022"
      weight: 30
\`\`\`

## Step 3 — Start & Verify
\`\`\`bash
docker compose -f edge-compose.yml up -d
curl http://localhost:8094/health | jq .
\`\`\`

## Step 4 — Use Edge as Drop-in Proxy
\`\`\`python
from openai import OpenAI
client = OpenAI(base_url="http://edge:8094/v1", api_key="your-edge-key")
resp = client.chat.completions.create(model="auto", messages=[...])
\`\`\`

## Dashboard
- **Requests**: per-request log with cost, latency, provider, cache hit
- **Cost**: daily spend by team/customer
- **Rules**: rate limits per API key
- **Customers**: per-customer API key management and usage billing

## Troubleshooting
\`\`\`bash
# Cache not working → verify cache_enabled: true and disk space
# Provider fallback not activating → check weight config
docker compose logs edge-core
\`\`\`
`,

    soc: (key, _) => `# AXTO SOC — Complete Setup Guide

**License Key:** \`${key}\`

## System Requirements
- 4 CPU cores, 8 GB RAM, 100 GB disk (SSD for log storage)
- Docker 24+, port 8092

## Step 1 — Download & Load
\`\`\`bash
docker load < soc-core-linux.tar.gz
\`\`\`

## Step 2 — Configure soc.yml
\`\`\`yaml
soc:
  license_key: "${key}"
  api_key: "your-strong-key"
  log_retention_days: 90
  ueba_enabled: true
  ti_enrichment_enabled: true

ai_pool:
  vendors:
    - provider: openai
      api_key: "sk-..."
      model: "gpt-4o-mini"
\`\`\`

## Step 3 — Start
\`\`\`bash
docker compose -f soc-compose.yml up -d
curl http://localhost:8092/health | jq .
\`\`\`

## Step 4 — Ingest Logs
\`\`\`bash
# API ingestion
curl -X POST http://localhost:8092/v1/ingest \\
  -H "X-SOC-Key: your-api-key" \\
  -d '{"logs":["Failed login from 185.220.101.5"],"source":"syslog"}'

# Rsyslog forward
echo '*.* @@SOC-SERVER-IP:514;RSYSLOG_SyslogProtocol23Format' >> /etc/rsyslog.d/soc.conf
systemctl restart rsyslog
\`\`\`

## Dashboard
- **Alerts**: MITRE ATT&CK-mapped detections with TI enrichment
- **Incidents**: MTTD/MTTR tracking, open case management
- **UEBA**: behavioral anomaly heatmap per user/host
- **Rules**: custom detection rule editor

## Troubleshooting
\`\`\`bash
# High memory → reduce log_retention_days
# No alerts → verify log source format matches 'source' parameter
# TI enrichment slow → check outbound HTTPS to threat intel feeds
docker compose logs soc-core
\`\`\`
`,

    compliance: (key, _) => `# AXTO Compliance — Complete Setup Guide

**License Key:** \`${key}\`

## System Requirements
- 2 CPU cores, 4 GB RAM, 50 GB disk
- Docker 24+, port 8093

## Step 1 — Download & Load
\`\`\`bash
docker load < compliance-core-linux.tar.gz
\`\`\`

## Step 2 — Configure compliance.yml
\`\`\`yaml
compliance:
  license_key: "${key}"
  api_key: "your-strong-key"
  frameworks: ["soc2", "iso27001", "hipaa", "pci_dss", "gdpr"]
  evidence_auto_collect: true
  audit_retention_days: 365

# Optional cloud integrations (read-only)
aws:
  access_key_id: ""
  secret_access_key: ""
  region: "us-east-1"
\`\`\`

## Step 3 — Start & First Gap Analysis
\`\`\`bash
docker compose -f compliance-compose.yml up -d
curl -X POST http://localhost:8093/v1/gap-analysis \\
  -H "X-Compliance-Key: your-api-key" \\
  -d '{"framework":"soc2"}'
# Returns: coverage_percent, control_gaps[], priority_items[]
\`\`\`

## Dashboard
- **Overview**: compliance coverage % per framework (traffic light)
- **Controls**: pass/fail/partial status for each control
- **Evidence**: auto-collected evidence by control with timestamps
- **Policies**: versioned policy documents with approval workflow
- **Reports**: one-click audit-ready PDF export for any framework

## Troubleshooting
\`\`\`bash
# Cloud evidence not collecting → verify IAM credentials are read-only
# Coverage stuck at 0 → ensure frameworks list matches license tier
# Audit report fails → increase report_timeout in compliance.yml
docker compose logs compliance-core
\`\`\`
`,

    sentinel: (key, nodes) => `# AXTO Sentinel OT/IoT — Complete Setup Guide

**License Key:** \`${key}\`
**Max Devices:** ${nodes === -1 ? "Unlimited" : nodes}

## System Requirements
- 4 CPU cores, 8 GB RAM, 100 GB disk
- Docker 24+ with --network host or --cap-add NET_RAW
- Network interface with access to OT/ICS network (mirror port or TAP)
- Port 8095

## Step 1 — Switch/Mirror Configuration
Configure a mirrored/SPAN port on your managed switch pointing all OT network traffic to the Sentinel server's network interface. Sentinel is **passive only** — it never injects traffic.

## Step 2 — Download & Load
\`\`\`bash
docker load < sentinel-core-linux.tar.gz
\`\`\`

## Step 3 — Configure sentinel.yml
\`\`\`yaml
sentinel:
  license_key: "${key}"
  api_key: "your-strong-key"
  monitor_interface: "eth1"   # interface receiving mirrored OT traffic
  protocols: ["modbus", "dnp3", "ethernet_ip", "profinet", "bacnet"]
  asset_discovery: true
  alert_retention_days: 90
  max_devices: ${nodes}

ai_pool:
  vendors:
    - provider: openai
      api_key: "sk-..."
      model: "gpt-4o-mini"
\`\`\`

## Step 4 — Start (requires NET_RAW for packet capture)
\`\`\`bash
docker compose -f sentinel-compose.yml up -d
# Wait 5-10 minutes for initial asset discovery
curl http://localhost:8095/v1/assets -H "X-Sentinel-Key: your-api-key" | jq .
\`\`\`

## Dashboard
- **Network Map**: Purdue model topology of all discovered OT assets
- **Assets**: device inventory with vendor, model, firmware, CVE exposure
- **Alerts**: protocol anomalies, Modbus write commands, unauthorized devices
- **Vulnerabilities**: CVE database match by device type/firmware
- **NERC CIP / IEC 62443**: compliance posture for your OT environment

## Integrate with AXTO SOC
\`\`\`yaml
# In sentinel.yml — forward OT alerts to IT SOC
sentinel:
  siem_forward_url: "http://soc:8092/v1/ingest"
  siem_format: "json_api"
\`\`\`

## Troubleshooting
\`\`\`bash
# No assets discovered → verify monitor_interface in sentinel.yml
# Capture not active → add --cap-add NET_RAW to docker-compose.yml
# Protocol not parsed → add to protocols list
# 503 errors → license expired, renew at axto.io/renew
docker compose logs sentinel-core
\`\`\`
`,

    "orchestra-worker-cpu": (key, _) => `# AXTO Orchestra CPU Worker — Setup Guide

**License Key:** \`${key}\`

This is a CPU-only worker sidecar for Orchestra. Deploy alongside your Orchestra Core instance.

\`\`\`bash
docker load < orchestra-worker-cpu-linux.tar.gz
ORCHESTRA_CORE_URL=http://orchestra:8091 \\
ORCHESTRA_WORKER_API_KEY="${key}" \\
docker compose -f orchestra-worker-cpu-compose.yml up -d
\`\`\`

Workers self-register with the Core and appear in Dashboard → Orchestra → Workers.
`,

  };

  const generator = GUIDES[product];
  if (generator) return generator(licenseKey, maxNodes);

  // Ultimate fallback (should not normally be reached)
  return `# AXTO ${product.charAt(0).toUpperCase() + product.slice(1)} — Setup Guide

**License Key:** \`${licenseKey}\`

For full installation documentation, visit: https://axto.io/guide?product=${product}

Support: hallo@axto.io
`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF Builder (edge-compatible, valid PDF 1.4)
// ═══════════════════════════════════════════════════════════════════════════
function buildGuidePDF(markdownContent: string, lang: string): Uint8Array<ArrayBuffer> {
  const lines      = markdownContent.replace(/```[\s\S]*?```/g, (m) => m.replace(/[()\\]/g, " ")).split("\n");
  const linesPerPage = 55;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage)
    pages.push(lines.slice(i, i + linesPerPage));

  function esc(s: string): string {
    return s.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").replace(/[^\x20-\x7E]/g,"?");
  }

  let pdf = "%PDF-1.4\n";
  const objects: string[] = [];
  let objN = 1;

  const catObj   = objN++;
  const pagesObj = objN++;
  const fontObj  = objN + pages.length * 2;
  const pageNums: number[] = [];
  for (let i = 0; i < pages.length; i++) pageNums.push(objN + i * 2);

  objects.push(`${catObj} 0 obj\n<< /Type /Catalog /Pages ${pagesObj} 0 R >>\nendobj`);
  objects.push(`${pagesObj} 0 obj\n<< /Type /Pages /Kids [${pageNums.map(n=>`${n} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj`);

  for (let p = 0; p < pages.length; p++) {
    const pageObj    = objN++;
    const contentObj = objN++;
    let stream       = "BT\n/F1 8 Tf\n36 760 Td\n10 TL\n";
    for (const line of pages[p])
      stream += `(${esc(line.slice(0, 110))}) Tj T*\n`;
    stream += "ET";
    const sb = new TextEncoder().encode(stream);
    objects.push(`${pageObj} 0 obj\n<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontObj} 0 R >> >> >>\nendobj`);
    objects.push(`${contentObj} 0 obj\n<< /Length ${sb.length} >>\nstream\n${stream}\nendstream\nendobj`);
  }
  objects.push(`${fontObj} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj`);

  const offsets: number[] = [];
  let body = "";
  for (const o of objects) { offsets.push(pdf.length + body.length); body += o + "\n"; }
  pdf += body;
  const xref = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const off of offsets) pdf += `${String(off).padStart(10,"0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catObj} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

// ── Invoice builder ──────────────────────────────────────────────────────────
function buildInvoiceText(d: {
  number: string; date: string; clientName: string; clientEmail: string;
  organization: string; product: string; packageCode: string; licenseKey: string;
  amountUsd: number; billing: string; expiresAt: string; maxNodes: number;
  items: { name: string; type: string }[];
}): string {
  return `
══════════════════════════════════════════════════════════════
  AXTO PLATFORM — OFFICIAL INVOICE
══════════════════════════════════════════════════════════════

Invoice #:    ${d.number}
Date:         ${new Date(d.date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}
Status:       PAID

──────────────────────────────────────────────────────────────
  BILL TO
──────────────────────────────────────────────────────────────
Name:         ${d.clientName}
Email:        ${d.clientEmail}
Organization: ${d.organization || "—"}

──────────────────────────────────────────────────────────────
  LICENSE DETAILS
──────────────────────────────────────────────────────────────
Product:      ${d.product}
Package:      ${d.packageCode}
License Key:  ${d.licenseKey}
Billing:      ${d.billing === "yearly" ? "Annual" : "Monthly"}
Max Nodes:    ${d.maxNodes === -1 || d.maxNodes >= 9999 ? "Unlimited" : d.maxNodes}
Expires:      ${new Date(d.expiresAt).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}

──────────────────────────────────────────────────────────────
  ITEMS INCLUDED
──────────────────────────────────────────────────────────────
${d.items.map((item, i) => `${i + 1}. ${item.name}\n   Format: ${item.type}`).join("\n")}

──────────────────────────────────────────────────────────────
  PAYMENT TOTAL
──────────────────────────────────────────────────────────────
Amount:       $${Number(d.amountUsd).toLocaleString("en-US")} USD
Billing:      ${d.billing === "yearly" ? "Annual Subscription" : "Monthly Subscription"}

══════════════════════════════════════════════════════════════
  AXTO — AI eXecution & Tools Orchestration
  https://axto.io | hallo@axto.io
  100% BYOK — Your keys, your data, your infrastructure.
══════════════════════════════════════════════════════════════
`.trim();
}

function _langLabel(lang: string): string {
  const map: Record<string, string> = {
    en:"English", id:"Bahasa", zh:"Chinese", ar:"Arabic",
    es:"Spanish", fr:"French", de:"German", pt:"Portuguese",
    ja:"Japanese", ko:"Korean",
  };
  return map[lang] || lang.toUpperCase();
}
