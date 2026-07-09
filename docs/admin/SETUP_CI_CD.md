[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO Platform — CI/CD Setup Guide
## GitHub Actions + GitLab CI/CD (Dual Pipeline)

---

## Architecture Overview

```
Primary Repo: GitLab (gitlab.com/axto-platform/axto-products)
Mirror Repo:  GitHub  (github.com/axto-platform/axto-products)

Build Trigger Sources:
  1. Push to main → auto-build ALL images (both CI systems)
  2. Admin Dashboard → trigger specific product build
  3. Manual run in GitLab/GitHub UI

Build Output:
  A. GitLab Container Registry → docker pull registry.gitlab.com/...
  B. Cloudflare R2 → portal download (.tar.gz for offline/airgapped)

Dashboard:
  Deployed by GitLab CI → Cloudflare Pages (auto on push to main)
```

---

## Required Variables

### GitLab CI Variables
`Settings → CI/CD → Variables`

| Variable | Description | Example |
|----------|-------------|---------|
| `CF_R2_ACCESS_KEY_ID` | R2 Access Key ID | `abc123...` |
| `CF_R2_SECRET_ACCESS_KEY` | R2 Secret Access Key | `xyz456...` |
| `CF_R2_ACCOUNT_ID` | Cloudflare Account ID | `a1b2c3...` |
| `CF_R2_BUCKET` | R2 bucket name | `axto-builds` |
| `CF_PAGES_API_TOKEN` | CF API Token (Pages+D1+R2 edit) | `cf-token...` |
| `CF_ACCOUNT_ID` | Cloudflare Account ID | `a1b2c3...` |
| `AXTO_APP_URL` | Dashboard URL | `https://axto.io` |
| `BUILD_WEBHOOK_SECRET` | Webhook HMAC secret | `secret-key-here` |
| `SLACK_WEBHOOK_URL` | (Optional) Slack webhook | `https://hooks.slack.com/...` |

### GitHub Actions Secrets
`Settings → Secrets and variables → Actions`

| Secret | Description |
|--------|-------------|
| `CF_R2_ACCESS_KEY_ID` | R2 Access Key ID |
| `CF_R2_SECRET_ACCESS_KEY` | R2 Secret Access Key |
| `CF_R2_ACCOUNT_ID` | Cloudflare Account ID |
| `CF_R2_BUCKET` | R2 bucket name |
| `AXTO_APP_URL` | Dashboard URL |
| `BUILD_WEBHOOK_SECRET` | Webhook HMAC secret |

### Cloudflare Worker Variables (for admin dashboard trigger)
`Cloudflare Dashboard → Workers → axto-dashboard → Settings → Variables`

| Variable | Description |
|----------|-------------|
| `GITLAB_TRIGGER_TOKEN` | GitLab pipeline trigger token |
| `GITLAB_PROJECT_ID` | GitLab project ID or namespace/project |
| `GITLAB_HOST` | `https://gitlab.com` (default) |
| `GITLAB_BRANCH` | `main` (default) |
| `GITHUB_TOKEN` | GitHub personal access token (repo scope) |
| `GITHUB_REPO` | `axto-platform/axto-products` |
| `BUILD_WEBHOOK_SECRET` | Same value as CI secrets above |

---

## GitLab Setup

### 1. Create Pipeline Trigger Token
```
GitLab → Your Project → Settings → CI/CD → Pipeline triggers
→ Add trigger
→ Copy the token → set as GITLAB_TRIGGER_TOKEN in CF Worker
```

### 2. Get Project ID
```
GitLab → Your Project → Settings → General
→ "Project ID" is shown at the top
Copy this → set as GITLAB_PROJECT_ID in CF Worker
```

### 3. Configure CI/CD Variables
```
GitLab → Your Project → Settings → CI/CD → Variables
→ Add each variable from the table above
→ Mask sensitive variables (API keys, secrets)
→ Protect for protected branches only if desired
```

### 4. Configure GitLab Container Registry
```bash
# Registry is enabled by default for all GitLab projects.
# Images will be pushed to:
# registry.gitlab.com/YOUR_NAMESPACE/YOUR_PROJECT/<image>:latest

# Clients pull with:
docker login registry.gitlab.com
docker pull registry.gitlab.com/YOUR_NAMESPACE/YOUR_PROJECT/guardian-engine:latest
```

### 5. Add GitLab Runner (if using self-hosted)
```bash
# For Docker builds, runner needs Docker-in-Docker support.
# Add runner tag 'docker' in .gitlab-ci.yml default:tags.

# Install runner:
curl -L --output /usr/local/bin/gitlab-runner \
  "https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64"
chmod +x /usr/local/bin/gitlab-runner
gitlab-runner install && gitlab-runner start

# Register with Docker executor:
gitlab-runner register \
  --url "https://gitlab.com" \
  --token "YOUR_RUNNER_TOKEN" \
  --executor docker \
  --docker-image docker:24 \
  --docker-privileged \
  --description "AXTO Build Runner"
```

### 5b. Add Windows Runner — REQUIRED for the build-exe stage (v3.0+)

The `build-exe:*` jobs in `.gitlab-ci.yml` produce real Windows `.exe` files via
PyInstaller and run on a **Windows** machine with a `windows`-tagged runner.
Without one registered, every `build-exe:*` job will simply sit **pending**
forever — it will never silently "skip", it will block the pipeline stage
until the job times out. If you don't need `.exe` builds yet, you can either
register a Windows runner (below) or temporarily remove the `build-exe` stage
from the `stages:` list to avoid pending jobs.

On a Windows Server/VM with Python 3.11+ and PowerShell installed:
```powershell
# Download the runner
Invoke-WebRequest -Uri "https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-windows-amd64.exe" -OutFile "C:\GitLab-Runner\gitlab-runner.exe"

# Register with the shell executor (defaults to PowerShell on Windows) and
# the "windows" tag — this MUST match the `tags: [windows]` used by every
# build-exe:* job in .gitlab-ci.yml.
cd C:\GitLab-Runner
.\gitlab-runner.exe register `
  --url "https://gitlab.com" `
  --token "YOUR_RUNNER_TOKEN" `
  --executor shell `
  --tag-list "windows" `
  --description "AXTO Windows EXE Builder"

# Install and start as a service
.\gitlab-runner.exe install
.\gitlab-runner.exe start
```
Verify it shows up under **Settings → CI/CD → Runners** with a green dot and
the `windows` tag before relying on `.exe` builds.



## GitHub Actions Setup

### 1. Add Secrets
```
GitHub → Your Repo → Settings → Secrets and variables → Actions → New repository secret
→ Add each secret from the table above
```

### 2. Configure repository_dispatch (for dashboard trigger)
The `GITHUB_TOKEN` in Cloudflare Worker must be a PAT with `repo` scope:
```
GitHub → Settings → Developer settings → Personal access tokens → Fine-grained
→ Repository access: axto-platform/axto-products
→ Permissions: Actions (read/write), Contents (read)
→ Copy token → set as GITHUB_TOKEN in CF Worker
```

---

## How Build Triggers Work

### Auto (push to main)
```
Developer pushes to main
  ↓
GitLab CI auto-starts (push trigger), BUILD_PRODUCT=all, BUILD_TYPE=both
  ↓
SMART REBUILD (v3.0+): each product job only runs if files under its own
folder (or .gitlab-ci.yml itself) actually changed in this push — checked
via GitLab's native `rules:changes:`. A push that only touches dashboard/
rebuilds nothing under the 12 products; a push that only touches vault/
rebuilds only vault-core (docker + .exe).
  ↓
orchestra-worker-gpu is NEVER included here, regardless of what changed —
it only builds via an explicit manual trigger (see below), and even then
requires an extra confirmation click in the GitLab pipeline UI.
  ↓
Each included job: docker build → push registry.gitlab.com → upload R2
  (+ build-exe job on a Windows runner → upload R2 as *-windows.exe)
  ↓
notify-dashboard: POST /api/admin/engine-builder (build_callback)
  ↓
Dashboard shows: ✅ Ready for download
```

### Manual (admin dashboard)
```
Admin clicks "Build Now" for a SPECIFIC product + type in Engine Builder
  ↓
POST /api/admin/engine-builder {action:"trigger_build", product:"vault-core", type:"image"}
  ↓
API tries GitLab first (primary repo) → if GITLAB_TRIGGER_TOKEN set:
  POST https://gitlab.com/api/v4/projects/PROJECT_ID/trigger/pipeline
  variables: BUILD_PRODUCT=vault-core, BUILD_TYPE=image, CALLBACK_URL=...
  ↓
This EXACT product+type ALWAYS builds — smart-rebuild change-detection is
bypassed for explicit single-product requests (the admin asked for it on
purpose). type=image never also triggers a .exe build, and vice versa.
  ↓
If GitLab fails, tries GitHub:
  POST https://api.github.com/repos/REPO/dispatches
  event_type: build_product
  ↓
CI runs → builds → uploads R2 → POSTs callback to dashboard
  ↓
Dashboard polls /check_build_status → shows build progress
  ↓
On R2 file detected: status=ready → Build button becomes Rebuild
```

### Dashboard Build Status Display
```
⬜ Not Built   → File not in R2
⚙️ Building… → Pipeline running (progress bar)
✅ Ready       → File in R2, available for client download
❌ Failed       → Pipeline failed
🔜 Soon         → Product not yet available
```

---

## Product → Registry Image Mapping

| Product | GitLab Registry Path |
|---------|---------------------|
| `guardian-core` | `registry.gitlab.com/NAMESPACE/PROJECT/guardian-core:latest` |
| `guardian-node` | `registry.gitlab.com/NAMESPACE/PROJECT/guardian-node:latest` |
| `guardian-antivirus` | `registry.gitlab.com/NAMESPACE/PROJECT/guardian-antivirus:latest` |
| `orchestra-core` | `registry.gitlab.com/NAMESPACE/PROJECT/orchestra-core:latest` |
| `orchestra-worker-cpu` | `registry.gitlab.com/NAMESPACE/PROJECT/orchestra-worker-cpu:latest` |
| `orchestra-worker-gpu` | `registry.gitlab.com/NAMESPACE/PROJECT/orchestra-worker-gpu:latest` |
| `vault-core` | `registry.gitlab.com/NAMESPACE/PROJECT/vault-core:latest` |

---

## Client docker-compose.yml (for reference)

Clients use the GitLab Container Registry as primary source:

```yaml
services:
  vault-core:
    # Option A: Pull from registry (requires docker login registry.gitlab.com)
    image: registry.gitlab.com/axto-platform/vault/vault-engine:latest
    # Option B: Load from portal download
    # docker load < vault-core.tar.gz → image: axto/vault-core:latest
```

---

## Troubleshooting

**GitLab trigger returns 422:**
→ Check GITLAB_PROJECT_ID is correct (use numeric ID, not namespace/project)
→ Check trigger token is valid and not expired

**GitHub dispatch returns 404:**
→ Check GITHUB_REPO format: `namespace/repo` (no https://)
→ Check PAT has `repo` scope

**R2 upload fails:**
→ Verify CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_ACCESS_KEY are correct
→ Verify R2 bucket exists and token has Object Read & Write permission

**Dashboard not updating after build:**
→ Check AXTO_APP_URL includes https://
→ Check BUILD_WEBHOOK_SECRET matches between CI and CF Worker

**Image push to registry fails (403):**
→ Check CI/CD pipeline has access to GitLab Container Registry
→ GitLab runner must use `docker login` with CI_REGISTRY_USER / CI_REGISTRY_PASSWORD

---

*© AXTO Platform — admin@axto.io*
