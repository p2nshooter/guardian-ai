[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO Platform — axto.io

AI workspace for legal, security and business teams. **Your keys, your data** — in the browser, or on your own servers.

The full product and engineering plan is [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md) (latest audit: §19).

## What is in this repository

| Part | Where | What it is |
|---|---|---|
| **axto.io** | [`dashboard/`](dashboard) | Next.js 15 on Cloudflare Pages: public site, member portal (`/app`), admin portal (`/admin`) and all APIs |
| **7 cloud apps** | `dashboard/app/app/*` | Legal AI · Prompt Library · AI Studio · Clipper · Privacy Vault · Compliance Center · Security Analyst — run in the browser on the member's own AI keys (BYOX) |
| **10 self-hosted editions** | `engine/` `orchestra/` `vault/` `edge/` `soc/` `compliance/` `sentinel/` `antivirus/` `studio/` (+ `ai-studio/` `gpu-studio/` `hybrid-studio/` modules) `legal/` | Docker images for Linux x86-64 **and ARM64**, installed on Windows (Docker Desktop / WSL 2), Linux or macOS with AXTO Setup; licensed online (Business / Enterprise plans) or fully offline (Lifetime licences) |
| **AXTO Setup** | [`installer/`](installer) | Go installer / manager for the self-hosted editions — Windows GUI wizard + CLI (`axto-setup install · update · activate · doctor …`); subscription keys and Lifetime installer keys (`LIFE-…`, installs + activates the device) |
| **CI/CD** | [`.github/workflows/`](.github/workflows) | Deploy to Cloudflare, build images → R2, installer builds, Docker smoke tests, guide PDFs |

## Plans

Starter · Pro · Business · Enterprise, monthly or yearly (prices in `dashboard/lib/plans.ts`, editable by the admin). Business and Enterprise include self-hosted licences. **Lifetime** licences (1–100 devices per app, one app or the full suite) run with no connection to axto.io — see `dashboard/lib/lifetime.ts`.

## Develop

```bash
cd dashboard
npm ci
npm run typecheck && npm test        # types + unit tests
npm run build                        # production build
bash tests/e2e/run.sh                # full E2E on a local Cloudflare runtime (D1/KV/R2)
```

The E2E suite runs the real engine licence code and the installer in Docker when Docker is available.

## Deploy

Merging to `main` deploys axto.io (Cloudflare Pages + D1 migrations) and publishes the installation-guide PDFs. Required secrets are listed in [`DEPLOY.md`](DEPLOY.md) and `dashboard/wrangler.toml`.

## Links

| | |
|---|---|
| Website | https://axto.io |
| Member portal | https://axto.io/app |
| Self-hosted guides | https://axto.io/self-hosted |
| Status | https://axto.io/status |
| Contact | hello@axto.io |
