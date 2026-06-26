[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Author & Architect: Yusron Efendi <hallo@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# 🔐 AXTO Vault — AI Privacy Layer

> **Transparently redact PII, PHI, and Financial data from every AI API call — in a single line of code.**

[![Product](https://img.shields.io/badge/AXTO-Vault%201.0-6366f1)](https://axto.io/vault)
[![BYOK](https://img.shields.io/badge/100%25-BYOK-brightgreen)](https://axto.io)
[![License](https://img.shields.io/badge/License-Commercial-blue)](https://axto.io/portal)
[![Compliance](https://img.shields.io/badge/Compliant-HIPAA%20%7C%20GDPR%20%7C%20SOC2%20%7C%20PCI--DSS-success)](https://axto.io/vault)

---

## The Problem

Every day, applications send thousands of requests to OpenAI, Claude, Gemini, and other AI providers. Those requests routinely contain:

- Customer emails, phone numbers, and addresses
- Patient records, diagnoses, and lab results
- Credit card numbers, IBANs, and API keys
- Employee SSNs and personnel data

Your AI vendor's terms allow data use. Your compliance team needs a paper trail. Your security team wants none of this leaving your perimeter.

## The Solution

AXTO Vault is a transparent proxy. You point your application at Vault instead of the AI provider. Vault:

1. **Intercepts** every AI API request
2. **Redacts** sensitive data (replaces with safe tokens like `[VAULT_EMAIL_1]`)
3. **Forwards** the sanitized request to your AI provider using your own API key
4. **Re-injects** original values into the AI's response
5. **Returns** the full response to your application — unchanged

**Your application never changes. Your users never notice. The AI never sees sensitive data.**

---

## Quick Integration

```python
# Before (data leak risk)
client = OpenAI(api_key="sk-...")

# After (full PII/PHI/Financial protection — 1 line change)
client = OpenAI(
    api_key="anything",
    base_url="http://your-vault:8080/v1",
)

# Your code stays exactly the same
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Patient John Smith (SSN: 123-45-6789)..."}]
)
# AI received: "Patient [VAULT_PII_NAME_1] (SSN: [VAULT_SSN_1])..."
# You received: Full response with original values restored
```

Works with **Python, Node.js, Go, PHP, Ruby, Java** — any OpenAI-compatible SDK.

---

## What Gets Protected

| Category | Examples | Token Format |
|----------|---------|-------------|
| **PII** | Email, phone, SSN, passport, national ID, address, DOB | `[VAULT_EMAIL_1]` |
| **PHI** | Medical records, ICD codes, lab values, insurance IDs | `[VAULT_MRN_1]` |
| **Financial** | Credit cards, IBAN, bank accounts, API keys, crypto wallets | `[VAULT_CREDIT_CARD_1]` |
| **Custom** | Your own regex patterns per project | `[VAULT_CUSTOM_1]` |

**50+ built-in patterns.** Add unlimited custom patterns per project.

---

## Architecture

```
Your App → AXTO Vault (your server) → AI Provider (your API key)
                    ↓
            [Redact PII/PHI/Financial]
            [Log to audit trail]
            [Re-inject on response]
```

- **Self-hosted** — runs on your infrastructure via Docker
- **100% BYOK** — your AI API keys in vault.yml, never touch AXTO
- **Zero external calls** during redaction — regex engine runs in memory
- **Sub-10ms overhead** — no latency impact on your application

---

## Quick Start

```bash
# 1. Download from portal
# https://axto.io/portal → Licenses → Download → Docker

mkdir axto-vault && cd axto-vault
# (extract vault-package.zip)

# 2. Load image
docker load < vault-core.tar.gz

# 3. Configure
# Edit vault.yml: add license_key + AI API key

# 4. Start
docker compose -f vault-compose.yml up -d

# 5. Verify
curl http://localhost:8080/health
# {"status":"ok","product":"vault","valid":true}
```

**Setup time: under 5 minutes.**

---

## Compliance Coverage

| Standard | What Vault Provides |
|----------|-------------------|
| **HIPAA** | PHI redaction + audit trail + access controls |
| **GDPR** | PII protection + erasure support + processing records |
| **SOC 2** | Audit log + policy management + access controls |
| **PCI-DSS** | Card/financial data redaction + audit trail |
| **ISO 27001** | Data classification + audit trail + policy enforcement |
| **PDPA** | Southeast Asia personal data protection |

---

## Pricing

| Tier | Price | Requests/Day | Projects |
|------|-------|-------------|---------|
| **Starter** | $1,990/yr | 50,000 | 5 |
| **Professional** | $5,990/yr | 250,000 | Unlimited |
| **Business** | $14,900/yr | 1,000,000 | Multi-tenant |
| **Enterprise** | $49,900/yr | Unlimited | Unlimited |

[Purchase at axto.io →](https://axto.io/portal)

---

## Dashboard APIs

```
GET  /health                    → Status, stats, license info
POST /vault/test                → Test redaction (no AI forwarding)
GET  /vault/stats               → Aggregated statistics
GET  /vault/audit               → Audit log (paginated)
GET  /vault/policies            → List policies
POST /vault/policies            → Create policy
GET  /support                   → AI support chat
WS   /ws/audit                  → Real-time audit stream
POST /v1/chat/completions       → OpenAI-compatible proxy
POST /v1/messages               → Anthropic-compatible proxy
```

---

## Supported AI Providers

OpenAI · Anthropic · Google Gemini · Groq · Mistral · DeepSeek · Ollama · Azure OpenAI · Any OpenAI-compatible endpoint

---

## Repository Structure

```
axto-vault/
├── vault/                          # Engine (Python/FastAPI)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       ├── api.py                  # FastAPI application + endpoints
│       ├── core.py                 # VaultCore singleton
│       ├── redactor.py             # PII/PHI/Financial redaction engine (50+ patterns)
│       ├── proxy.py                # BYOK AI provider proxy
│       ├── policy.py               # Per-project policy manager
│       ├── audit.py                # SQLite audit trail
│       ├── license.py              # License validator
│       ├── config/settings.py      # Configuration loader
│       ├── activation.html         # First-run activation wizard
│       └── support_ui.html         # AI support chat
├── vault.yml                       # Client configuration
├── vault.example.yml               # Configuration reference
├── vault-compose.yml               # Docker Compose
├── CHANGELOG.md                    # Release history
├── docs/client/
│   └── SETUP_VAULT.md              # Complete 18-section setup guide
├── dashboard-additions/            # Platform integration
│   ├── cf-migrations/
│   │   └── 0021_vault_product.sql  # D1 schema for Vault packages
│   ├── lib/
│   │   ├── license.ts              # Updated: all 7 products
│   │   ├── vault-stripe-packages.ts
│   │   ├── vault-landing-data.ts
│   │   └── autopost-vault-templates.ts
│   └── app/api/
│       ├── admin/engine-builder/route.ts  # Updated: all products
│       ├── portal/download/route.ts       # Updated: Vault + 10-lang guides
│       ├── license-validate/route.ts      # Updated: all 7 products
│       └── admin/create-license/page.tsx  # Updated: all packages
└── .github/workflows/
    ├── auto-build-all.yml          # Job 7: Vault Core build
    └── build-release.yml           # vault-core, vault-bundle support
```

---

## Support

| Channel | Contact |
|---------|---------|
| **AI Support Chat** | http://localhost:8080/support |
| **Client Portal** | https://axto.io/portal |
| **Email** | hallo@axto.io |
| **Documentation** | https://axto.io/guide |

---

*© AXTO Platform — AI eXecution & Tools Orchestration*
*100% BYOK — Your keys, your data, your infrastructure. Built for enterprises that take data privacy seriously.*
