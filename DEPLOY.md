[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO — AI eXecution & Tools Orchestration — Deploy Guide

## Arsitektur

```
GitHub → push ke main
  ├── GitHub Actions
  │     ├── D1 migrations (wrangler)
  │     ├── Guardian Engine → GitLab Registry
  │     ├── Orchestra Engine → GitLab Registry
  │     ├── Threat Feed → R2 (wrangler)
  │     └── CF Workers deploy (wrangler)
  │
  └── Cloudflare Pages (Git Integration)
        └── Build Next.js natively → deploy axto.io
```

## Stack 100% Cloudflare

| Layer       | Service              |
|-------------|----------------------|
| Frontend    | Cloudflare Pages     |
| Database    | Cloudflare D1        |
| Cache       | Cloudflare KV        |
| Storage     | Cloudflare R2        |
| Cron        | Cloudflare Workers   |
| DNS/CDN     | Cloudflare           |

Docker images → GitLab Registry (untuk client self-host Guardian & Orchestra)

---

## Setup Awal (sekali saja)

### 1. Clone & setup CF resources

```bash
git clone https://github.com/your-org/guardian-ai.git
cd guardian-ai

export CF_API_TOKEN=your_token
export CF_ACCOUNT_ID=your_account_id
./setup.sh
```

### 2. Isi wrangler.toml

Setelah `setup.sh` selesai, copy `database_id` dan KV `id` ke `dashboard/wrangler.toml`.

### 3. Connect CF Pages ke GitHub

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. Pilih repo ini
3. Konfigurasi:
   - **Framework preset**: Next.js
   - **Root directory**: `dashboard`
   - **Build command**: `npm run build`
4. Klik **Save and Deploy**

CF Pages akan build dan deploy otomatis setiap push ke `main`.

### 4. Set GitHub Secrets

Di repo → Settings → Secrets → Actions:

| Secret | Cara dapat |
|--------|-----------|
| `CF_API_TOKEN` | Cloudflare → My Profile → API Tokens |
| `CF_ACCOUNT_ID` | Cloudflare → Overview (kanan atas) |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `RESEND_API_KEY` | resend.com → API Keys |
| `CRON_SECRET` | String random bebas |

### 5. Set CF Pages secrets

```bash
wrangler pages secret put JWT_SECRET        --project-name=axto-dashboard
wrangler pages secret put ENCRYPTION_KEY    --project-name=axto-dashboard
wrangler pages secret put RESEND_API_KEY    --project-name=axto-dashboard
wrangler pages secret put CRON_SECRET       --project-name=axto-dashboard
```

### 6. Buat admin user pertama

```bash
wrangler d1 execute axto-db --remote --command="
  INSERT INTO users (id, email, role, created_at)
  VALUES (lower(hex(randomblob(16))), 'hello@axto.io', 'admin', datetime('now'))
"
```

---

## Deploy Manual (opsional)

```bash
export CF_API_TOKEN=your_token
export CF_ACCOUNT_ID=your_account_id

# D1 migrations saja
./deploy.sh --db-only

# Workers saja
./deploy.sh --workers-only

# Semua (kecuali Docker)
./deploy.sh --skip-docker
```
