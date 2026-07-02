# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
YP hardcoded, comprehensive in-app usage guide.

Shipped inside the binary so it is always available offline — served at
GET /guide (Markdown) and rendered in the console UI. Per the product-owner's
requirement, YP carries a deeper guide than any other AXTO product.
"""

GUIDE_MD = r"""# Yusron Power (YP) — Operator's Guide

**Yusron Power** is a single, self-hosted super-application whose native
capabilities cover and exceed every AXTO product: endpoint security & antivirus,
AI orchestration with live provider-scaling, privacy redaction, an AI API
gateway with metering, security operations (SIEM/SOAR), compliance automation,
IoT/OT asset security, an AI + GPU studio, and an expanded global legal-research
module — all in one binary, on **your** infrastructure.

**Everything is BYO.** Your API keys (BYOK), your infrastructure (BYOI), your
data (BYOD), your models (BYOM), your everything (BYOX). YP ships zero keys and
operates zero shared infrastructure. Your prompts, responses, and credentials
never leave your server.

---

## 1. Install & First Run

### Docker (Linux)
```bash
docker compose -f yp-compose.yml up -d
# then open http://YOUR_SERVER:8100
```

### Windows EXE (portable)
Double-click `axto-yp-windows.exe`. No Python install required. Ideal for
Windows Server or air-gapped evaluation.

### Set your license key
```yaml
# yp.yml
yp:
  license_key: "YP-XXXX-XXXX-XXXX-XXXX"
```
or environment variable `YP_LICENSE_KEY`. YP is invite-only — contact
hallo@axto.io.

---

## 2. License Modes

| Mode | Behaviour |
|------|-----------|
| **Annual** ($500k/yr) | Validates against axto.io every 30 minutes, with a 4-hour offline grace window. |
| **Lifetime — Disconnect** ($5M) | On the FIRST successful check, YP writes a locally-signed certificate and then **never contacts axto.io again**. Fully portable, move it between servers forever, no reactivation, no dependency. |
| **Trial** | 7 days (existing Enterprise clients) or 30 days ($100k non-refundable download fee, credited toward a purchase). |

The lifetime disconnect is intentional and permanent: you bought perpetual,
unconditional use. The single online check exists only to confirm the key is a
genuine lifetime key before cutting the cord.

---

## 3. Configure Your BYOK AI Providers

```yaml
yp:
  routing_strategy: quality      # quality | cost | weighted | round_robin
  ai_providers:
    - name: openai-primary
      provider: openai
      api_key: "sk-YOUR-OWN-KEY"
      default_model: gpt-4o
      weight: 2.0
    - name: claude
      provider: anthropic
      api_key: "sk-ant-YOUR-OWN-KEY"
      default_model: claude-sonnet-4
    - name: local-llama
      provider: ollama
      base_url: "http://localhost:11434/v1"
      default_model: llama3.1
```

**Provider-scaling.** YP scores every provider on live success rate and latency.
With `routing_strategy: quality` (default) each job goes to the best-performing
provider right now; a failing provider is automatically cooled down and routed
around, then re-tried once it recovers. Choose `cost` to always prefer the
cheapest healthy provider, `weighted` for biased random spread, or `round_robin`
for even distribution.

Call it:
```bash
curl -X POST http://YOUR_SERVER:8100/ai/complete \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Summarize this contract clause..."}]}'
```
The response tells you which provider served the job and its latency.

---

## 4. Privacy Layer (auto-redaction)

With `redact_before_forward: true` (default), YP strips PII/PHI/financial data
(emails, cards, IBAN, SSN, NIK, phones, IPs, API keys, crypto wallets, DOBs)
from every prompt before it reaches any provider, then re-injects the originals
into the response. The provider never sees raw sensitive data; your app sees
full text. Test it standalone:
```bash
curl -X POST http://YOUR_SERVER:8100/privacy/redact \
  -H "Content-Type: application/json" \
  -d '{"text":"Email me at a@b.com, card 4111 1111 1111 1111"}'
```

---

## 5. GPU Endpoints (BYO)

```yaml
yp:
  gpu_endpoints:
    - name: runpod-a100
      provider: runpod
      base_url: "https://your-runpod-endpoint/v1"
      api_key: "YOUR-OWN-KEY"
      model: llama3.1:70b
```
YP works at full capability **with or without** GPU endpoints — they are an
optional accelerator, never a requirement.

---

## 6. Legal Intelligence

```bash
# List curated open legal sources for a jurisdiction
curl "http://YOUR_SERVER:8100/legal/sources?jurisdiction=US"
# Run a research prompt through your best AI provider
curl -X POST http://YOUR_SERVER:8100/legal/research \
  -H "Content-Type: application/json" \
  -d '{"prompt_key":"contract_review","text":"<paste contract>"}'
```
Covers US, EU, UK, Indonesia, and international open-law sources, with a prompt
library for contract review, statute lookup, case research, and compliance
drafting. **Not legal advice** — always have a licensed attorney review outputs.

---

## 7. Operations, Security & Compliance Modules (all real, all wired together)

### Antivirus / content scanning
```bash
# Scan text or base64 content — returns a real verdict + matched signatures
curl -X POST http://YOUR_SERVER:8100/security/scan \
  -H "Content-Type: application/json" \
  -d '{"content":"<paste content>","target":"upload.bin"}'
# Prove the scanner works with the industry-standard EICAR test artifact
curl http://YOUR_SERVER:8100/security/eicar-test
curl http://YOUR_SERVER:8100/security/findings?verdict=malicious
```
A **malicious** verdict automatically raises a SOC alert — the layers talk to
each other.

### SOC (SIEM + correlation)
```bash
# Feed security events; the engine correlates and raises alerts
curl -X POST http://YOUR_SERVER:8100/soc/ingest \
  -d '{"module":"auth","kind":"auth_failure","source":"1.2.3.4"}'
curl http://YOUR_SERVER:8100/soc/alerts?status=open
curl http://YOUR_SERVER:8100/soc/rules
curl -X POST http://YOUR_SERVER:8100/soc/alerts/<id>/acknowledge
```
Default rules include brute-force detection, malware bursts, redaction/exfil
spikes, and provider-failure storms.

### Compliance (real controls engine)
```bash
curl http://YOUR_SERVER:8100/compliance/frameworks   # GDPR, HIPAA, SOC2, ISO27001, PCI-DSS, FedRAMP
curl -X POST http://YOUR_SERVER:8100/compliance/evaluate \
  -d '{"framework":"gdpr","facts":{"erasure_supported":true}}'
```
Evaluation folds in YP's **own live evidence** (redaction active, audit trail
populated, SOC monitoring, asset inventory) so the compliance % reflects what
YP is genuinely doing — not just checkboxes.

### OT / IoT asset security
```bash
# Register an asset; YP classifies the protocol and scores real risk
curl -X POST http://YOUR_SERVER:8100/ot/assets \
  -d '{"name":"PLC-1","ip":"10.0.0.5","asset_type":"plc","protocol":"modbus","exposed":true}'
curl http://YOUR_SERVER:8100/ot/assets
```
High-risk assets raise a SOC alert automatically.

### Gateway & unified status
```bash
# Hand out downstream keys via the X-YP-Key header; each is metered + rate-limited
curl http://YOUR_SERVER:8100/status    # one aggregate view of every module
```

Every module writes to the **smart local database** (`yp.db`) on your server —
no telemetry is ever sent to AXTO.

---

## 8. Health & Status

```bash
curl http://YOUR_SERVER:8100/health     # liveness + license + module state
curl http://YOUR_SERVER:8100/ai/providers  # live provider-scaling scoreboard
```

---

## Support
- Portal: https://axto.io/portal
- Email: hallo@axto.io

© AXTO Platform — Yusron Power. 100% BYOK/BYOI/BYOD/BYOM/BYOX.
Your keys, your data, your infrastructure — always.
"""
