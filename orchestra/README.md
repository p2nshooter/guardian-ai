[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# Orchestra AI - AI eXecution & Tools Orchestration — Orchestra

## Overview

Orchestra is an AI workflow orchestration engine that manages:
- **CPU Workers**: Text-based AI tasks (chat, completion, embeddings)
- **GPU Workers**: Heavy compute tasks (image, audio, video processing)
- **Central AI Pool**: BYOK - Bring Your Own API Keys (OpenAI, Claude, Gemini, Groq, Mistral, Ollama)
- **Job Routing**: Smart routing based on cost, latency, or load balancing
- **License Enforcement**: Hardware-bound commercial licensing

## Quick Start

### Docker

```bash
# Pull from GHCR
docker pull ghcr.io/your-org/orchestra:latest

# Run with license
docker run -d \
  --name orchestra \
  -p 7890:7890 \
  -e ORCHESTRA_LICENSE_KEY=your-license-key \
  -v orchestra-data:/app/data \
  ghcr.io/your-org/orchestra:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  orchestra:
    image: ghcr.io/your-org/orchestra:latest
    ports:
      - "7890:7890"
    environment:
      - ORCHESTRA_LICENSE_KEY=${ORCHESTRA_LICENSE_KEY}
      - ORCHESTRA_CONSOLE_PASSWORD=${CONSOLE_PASSWORD:-orchestra}
    volumes:
      - orchestra-data:/app/data
      - ./orchestra.yml:/app/orchestra.yml:ro
    restart: unless-stopped

volumes:
  orchestra-data:
```

## Configuration

Create `orchestra.yml`:

```yaml
# Orchestra Configuration
license:
  key: "${ORCHESTRA_LICENSE_KEY}"
  validate_url: "https://axto.io/api/license/validate"

console:
  password: "your-secure-password"

# BYOK - Your AI API Keys
ai_vendors:
  - provider: openai
    api_key: "${OPENAI_API_KEY}"
    models: ["gpt-4o-mini", "gpt-4o"]
  
  - provider: anthropic
    api_key: "${ANTHROPIC_API_KEY}"
    models: ["claude-3-haiku", "claude-3-sonnet"]
  
  - provider: ollama
    base_url: "http://localhost:11434"
    models: ["llama3", "mistral"]

routing:
  mode: "smart_balance"  # cost_first | latency_first | load_balance | round_robin | priority | smart_balance
  fallback_enabled: true

workers:
  cpu:
    max_concurrent: 10
    timeout_sec: 60
  gpu:
    max_concurrent: 5
    timeout_sec: 120
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/console` | GET | Web console UI |
| `/api/license/status` | GET | License status |
| `/api/vault/providers` | GET | List configured AI providers |
| `/api/workers` | GET | List workers |
| `/api/jobs/submit` | POST | Submit AI job |
| `/api/jobs/queue` | GET | View job queue |
| `/api/routing/rules` | GET/PUT | Routing configuration |

## License Tiers

| Tier | CPU Workers | GPU Workers | Max Nodes | Price |
|------|-------------|-------------|-----------|-------|
| Core | 10 | 5 | 10 | $590/mo |
| Scale | 50 | Unlimited | 50 | $1,790/mo |
| Unlimited | Unlimited | Unlimited | Unlimited | $3,490/mo |

## Support

This is a self-hosted commercial software license.
- **No SLA**: Not a managed service
- **No Support**: Full documentation provided
- **License Issues**: hello@axto.io

---

© AXTO - Self-hosted software license
