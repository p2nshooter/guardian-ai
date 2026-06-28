[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hallo@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO Vault — Changelog

All notable changes to AXTO Vault are documented here.
Format: [Version] — Date — Description

---

## [1.0.0] — 2026-03-27 — Initial Release

### 🎉 First Production Release

#### Engine (vault/)
- **FastAPI proxy engine** — transparent OpenAI & Anthropic-compatible proxy
- **50+ PII patterns** — email, phone, SSN, national ID, passport, address, DOB, IP, MAC, URL credentials
- **PHI patterns** (HIPAA-grade) — MRN, ICD codes, lab values, insurance IDs, medication dosages, blood type
- **Financial patterns** — credit cards, IBAN, bank accounts, routing numbers, API keys, crypto wallets, tax IDs
- **Session-based token mapping** — `[VAULT_EMAIL_1]` → original value, re-injected after AI responds
- **Per-project policies** — customize redaction per application/team with policy name routing
- **Multi-provider BYOK support** — OpenAI, Anthropic, Gemini, Groq, Mistral, DeepSeek, Ollama, Azure OpenAI
- **Automatic format conversion** — OpenAI → Anthropic → Gemini → Ollama format adapters built-in
- **SQLite audit trail** — every request logged (masked, originals never stored)
- **REST API** — `/vault/policies`, `/vault/audit`, `/vault/stats`, `/vault/test`, `/vault/providers`
- **WebSocket audit stream** — real-time audit events via `/ws/audit`
- **License validation** — `VAULT-` prefix, machine binding, heartbeat, 24h offline grace
- **Activation wizard** — elegant first-run HTML UI at `/`
- **AI support chat** — BYOK-powered support at `/support`

#### Dashboard Platform Additions (dashboard-additions/)
- **Migration 0021** — Vault product packages in D1 (4 tiers: Starter/Professional/Business/Enterprise)
- **Engine Builder update** — All 7 product lines in admin UI (Guardian + Orchestra + Vault + Edge + SOC + Compliance + Sentinel)
- **Portal download route** — Vault product download + 10-language guide generation
- **License validation route** — Supports all 7 products with correct prefix validation
- **Create license page** — All packages across all product lines
- **lib/license.ts** — `generateLicenseKey()` for all 7 products, `detectProductFromKey()`
- **Autopost templates** — 200+ marketing templates in 10 languages for Vault

#### Config & Deployment
- `vault.yml` — elegant client configuration (same pattern as guardian.yml)
- `vault.example.yml` — reference configuration with all options
- `vault-compose.yml` — production-ready Docker Compose
- `vault/Dockerfile` — lean Python 3.11 image

#### CI/CD (GitHub Actions)
- `auto-build-all.yml` — Vault Core added as parallel build job (Job 7)
- `build-release.yml` — vault-core, vault-bundle added to product matrix
- GitHub API dispatch trigger from admin dashboard
- Webhook callback to dashboard on build completion
- Auto-update R2 status, disable trigger after successful build

#### Documentation (10 Languages)
- `docs/client/SETUP_VAULT.md` — comprehensive 18-section client guide
- Portal guide generation — 10 languages: EN, ID, ZH, AR, ES, FR, DE, PT, JA, KO
- PDF guide download — edge-compatible PDF generation per language
- Code examples in Python, Node.js, Anthropic SDK, cURL, Next.js, PHP, Go

#### Marketing & Sales
- `vault-landing-data.ts` — pricing tiers, feature list, compliance badges, code example
- `vault-stripe-packages.ts` — package catalog for Stripe/payment integration
- Autopost templates — LinkedIn, Twitter/X, Facebook, Instagram templates in 10 languages

---

## Roadmap

### [1.1.0] — Planned
- Streaming response support (SSE)
- Dashboard web UI for audit log visualization
- Slack/webhook alerts for high-sensitivity detections
- Named entity recognition (NER) for improved name detection

### [1.2.0] — Planned
- Custom AI-based redaction models
- SIEM forwarding (Splunk, ELK, Datadog, QRadar)
- Multi-tenant architecture
- Rate limiting per project

### [2.0.0] — Planned
- AXTO Edge — AI API Gateway & Traffic Management
- AXTO SOC — Full Security Operations Center
- AXTO Compliance — Automated Audit Platform
- AXTO Sentinel — IoT/OT Security

---

*© AXTO Platform — AI eXecution & Tools Orchestration*
*100% BYOK — Your keys, your data, your infrastructure.*
