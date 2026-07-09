[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO — GitLab Setup Guide
## Connect Your GitLab Repository for Dual-Registry CI/CD

> ⚠️ **OUTDATED — kept for historical reference only.** This document
> describes an early 5-separate-repo architecture that the project no
> longer uses. The actual, current pipeline is a **single monorepo**
> `.gitlab-ci.yml` at the repository root covering all 12 products with
> smart incremental rebuilds. For accurate, up-to-date setup instructions,
> use **`docs/admin/SETUP_CI_CD.md`** instead.

### Step 1: Create GitLab Group Structure

Create 5 separate GitLab projects (one per product):

```
gitlab.com/axto-platform/
├── vault-engine/
├── soc-engine/
├── compliance-engine/
├── edge-engine/
└── sentinel-engine/
```

Or use one monorepo at:
```
gitlab.com/axto-platform/axto-5products/
```

### Step 2: Push Code to GitLab

```bash
# If using separate repos (recommended for CI isolation):
for prod in vault soc compliance edge sentinel; do
  cd /path/to/axto-5products
  git init $prod-repo
  cp -r $prod/ $prod-repo/
  cp .gitlab-ci.yml $prod-repo/
  cd $prod-repo
  git add .
  git commit -m "AXTO ${prod^} v1.0.0 initial"
  git remote add origin git@gitlab.com:axto-platform/$prod-engine.git
  git push -u origin main
  cd ..
done

# Or monorepo:
git remote add gitlab git@gitlab.com:axto-platform/axto-5products.git
git push gitlab main
```

### Step 3: Configure GitLab CI Variables

Go to: **Settings → CI/CD → Variables** for each project.

| Variable | Value | Protected | Masked |
|----------|-------|-----------|--------|
| `CF_R2_ACCESS_KEY_ID` | Your R2 Access Key | ✓ | ✓ |
| `CF_R2_SECRET_ACCESS_KEY` | Your R2 Secret | ✓ | ✓ |
| `CF_R2_ACCOUNT_ID` | Your Cloudflare Account ID | ✓ | - |
| `CF_R2_BUCKET` | `axto-builds` | ✓ | - |
| `GHCR_TOKEN` | GitHub PAT (write:packages) | ✓ | ✓ |
| `GHCR_USER` | Your GitHub username | ✓ | - |
| `AXTO_DASHBOARD_TOKEN` | AXTO admin token for webhooks | ✓ | ✓ |

### Step 4: Configure GHCR Authentication for Cross-Push

The GitLab CI pushes images to BOTH GitLab CR and GHCR.
Create a GitHub Personal Access Token with `write:packages` scope:

1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with `write:packages` permission
3. Add as `GHCR_TOKEN` variable in GitLab CI

### Step 5: Verify Pipeline Runs

```bash
# Manually trigger a build:
curl -X POST "https://gitlab.com/api/v4/projects/YOUR_PROJECT_ID/pipeline" \
  -H "PRIVATE-TOKEN: YOUR_GITLAB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ref":"main","variables":[{"key":"PRODUCT","value":"vault"}]}'
```

### Step 6: Configure Dashboard

Add these variables to your Cloudflare Pages project (via `wrangler pages secret put`):

```bash
wrangler pages secret put GITLAB_TOKEN     # Your GitLab PAT
wrangler pages secret put GITLAB_PROJECT_ID # e.g., "axto-platform%2Faxto-5products"
wrangler pages secret put GITHUB_TOKEN     # GitHub PAT for GHCR
wrangler pages secret put GITHUB_REPO      # e.g., "your-org/axto-5products"
```

These enable the **Engine Builder** in the admin dashboard to trigger builds directly.

### Registry URLs

| Product | GHCR | GitLab CR |
|---------|------|-----------|
| Vault | `ghcr.io/your-org/vault-engine:latest` | `registry.gitlab.com/axto-platform/vault-engine/vault-engine:latest` |
| SOC | `ghcr.io/your-org/soc-engine:latest` | `registry.gitlab.com/axto-platform/soc-engine/soc-engine:latest` |
| Compliance | `ghcr.io/your-org/compliance-engine:latest` | `registry.gitlab.com/axto-platform/compliance-engine/compliance-engine:latest` |
| Edge | `ghcr.io/your-org/edge-engine:latest` | `registry.gitlab.com/axto-platform/edge-engine/edge-engine:latest` |
| Sentinel | `ghcr.io/your-org/sentinel-engine:latest` | `registry.gitlab.com/axto-platform/sentinel-engine/sentinel-engine:latest` |

### Client Pull Commands

```bash
# GitLab CR (default in docker-compose.yml):
docker pull registry.gitlab.com/axto-platform/vault-engine/vault-engine:latest

# GHCR (alternative):
docker pull ghcr.io/your-org/vault-engine:latest
```
