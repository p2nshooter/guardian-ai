# AXTO — AI eXecution & Tools Orchestration — Admin Setup Guide
# Panduan Setup Admin AXTO (Complete)

> **Status: LOGIN TIDAK BISA?** Ikuti bagian "SOLUSI LOGIN" di bawah ini terlebih dahulu.

---

## 🚨 SOLUSI LOGIN — Kenapa Tidak Bisa Login?

### Root Cause (Penyebab Utama)

Ada **2 alasan** kenapa login admin belum bisa:

1. **Admin user belum ada di database** — Row dengan email admin belum di-INSERT ke tabel `users`
2. **`ADMIN_PASSWORD` env variable belum di-set** di Cloudflare Pages

Sistem auth bekerja seperti ini:
```
POST /api/auth  { action: "password_login", email: "...", password: "..." }
  → Cari user di DB WHERE email = ?  AND role = 'admin'
  → Cek ADMIN_PASSWORD env var  ← HARUS COCOK dengan password yang diinput
  → Jika cocok → issue JWT → redirect ke /admin
```

---

## ✅ LANGKAH FIX — Urutan Wajib Diikuti

### STEP 1: Set Environment Variable di Cloudflare Pages

1. Buka [dash.cloudflare.com](https://dash.cloudflare.com)
2. Klik **Workers & Pages** → klik project `axto-dashboard`
3. Klik tab **Settings** → **Environment Variables**
4. Klik **Add variable** untuk setiap baris berikut:

| Variable Name      | Value (contoh)                                     | Keterangan |
|--------------------|---------------------------------------------------|------------|
| `ADMIN_PASSWORD`   | `ulyahM1980`                                      | ⚠️ Password login admin |
| `JWT_SECRET`       | _(hasil: `openssl rand -hex 32`)_                 | Wajib min 32 chars |
| `ENCRYPTION_KEY`   | _(hasil: `openssl rand -hex 32`)_                 | Wajib 64 hex chars |
| `RESEND_API_KEY`   | `re_xxxxxxxxxxxx`                                 | Untuk magic link email |
| `EMAIL_FROM`       | `AXTO <hallo@axto.io>`                           | From address email |
| `NEXT_PUBLIC_APP_URL` | `https://axto.io`                             | URL utama |

> ⚠️ **Penting:** Setelah set env variable, Cloudflare Pages butuh **redeploy** agar perubahan aktif.

---

### STEP 2: Insert Admin User ke Database

Buka terminal lokal yang sudah ada `wrangler` ter-install, lalu jalankan:

```bash
# Set dulu credentials Cloudflare
export CLOUDFLARE_API_TOKEN=<api_token_kamu>
export CLOUDFLARE_ACCOUNT_ID=<account_id_kamu>

# Insert admin user ke D1 database
npx wrangler d1 execute axto-db --remote --command="
  INSERT OR IGNORE INTO users (id, email, role, created_at, updated_at)
  VALUES (
    lower(hex(randomblob(16))),
    'alghoniy2026@gmail.com',
    'admin',
    datetime('now'),
    datetime('now')
  );
"

# Verifikasi — harus muncul 1 row
npx wrangler d1 execute axto-db --remote --command="
  SELECT id, email, role, created_at FROM users WHERE email = 'alghoniy2026@gmail.com';
"
```

**Output yang benar:**
```
┌──────────────────────────────────┬──────────────────────────┬───────┬─────────────────────┐
│ id                               │ email                    │ role  │ created_at          │
├──────────────────────────────────┼──────────────────────────┼───────┼─────────────────────┤
│ a1b2c3d4e5f6...                  │ alghoniy2026@gmail.com   │ admin │ 2025-xx-xx xx:xx:xx │
└──────────────────────────────────┴──────────────────────────┴───────┴─────────────────────┘
```

---

### STEP 3: Jalankan Database Migration

```bash
cd dashboard

# Run migration 0001 (schema utama)
npx wrangler d1 migrations apply axto-db --remote

# Atau manual jika migration gagal:
npx wrangler d1 execute axto-db --remote --file=./cf-migrations/0001_init.sql
npx wrangler d1 execute axto-db --remote --file=./cf-migrations/0002_autopost.sql
npx wrangler d1 execute axto-db --remote --file=./cf-migrations/0003_admin_seed.sql
```

---

### STEP 4: Trigger Redeploy Cloudflare Pages

Setelah env variable di-set, wajib redeploy:

```bash
# Opsi A — Push kosong untuk trigger redeploy
git commit --allow-empty -m "trigger: redeploy after env config"
git push origin main

# Opsi B — Manual di dashboard
# CF Dashboard → Workers & Pages → axto-dashboard → Deployments → klik "Retry deployment"
```

---

### STEP 5: Coba Login

1. Buka `https://axto.io/auth/login`
2. Klik tab **"Admin Password"**
3. Masukkan:
   - **Email:** `alghoniy2026@gmail.com`
   - **Password:** `ulyahM1980`
4. Klik **Sign In**
5. Seharusnya redirect ke `/admin`

---

## 🔍 TROUBLESHOOTING — Masih Tidak Bisa Login?

### Cek health endpoint dulu:
```
GET https://axto.io/api/health
```

Response sehat:
```json
{
  "ok": true,
  "db": "ok",
  "timestamp": "2025-..."
}
```

Jika `"db": "error"` → database D1 binding belum dikonfigurasi di wrangler.toml

---

### Cek wrangler.toml sudah benar:
```toml
# dashboard/wrangler.toml
name = "axto-dashboard"
compatibility_date = "2024-09-23"
pages_build_output_dir = ".vercel/output/static"

[[d1_databases]]
binding = "DB"
database_name = "axto-db"
database_id = "GANTI_DENGAN_DATABASE_ID_KAMU"   # ← WAJIB DIISI

[[kv_namespaces]]
binding = "KV"
id = "GANTI_DENGAN_KV_ID_KAMU"                  # ← WAJIB DIISI
```

Cara dapat `database_id` dan `kv id`:
```bash
npx wrangler d1 list          # copy "Database ID"
npx wrangler kv namespace list # copy "id"
```

---

### Error "Database not ready":
→ `DB` binding di wrangler.toml kosong atau salah `database_id`

### Error "Invalid email or password":
→ Salah satu dari: (1) user belum ada di DB, (2) `ADMIN_PASSWORD` env var belum di-set, atau (3) typo password

### Magic link tidak masuk email:
→ `RESEND_API_KEY` belum di-set, atau domain email pengirim belum diverifikasi di resend.com

---

## 📋 SETUP LENGKAP — Pertama Kali Deploy

### Prerequisites
- Node.js >= 18.x
- Akun Cloudflare (free plan cukup untuk mulai)
- `wrangler` CLI: `npm install -g wrangler`
- Akun Resend (free tier: 100 email/hari)

### 1. Clone & Install

```bash
git clone https://github.com/p2nshooter/guardian-ai.git axto-platform
cd axto-platform
```

### 2. Buat Cloudflare Resources

```bash
wrangler login

# Buat D1 database
npx wrangler d1 create axto-db
# → Catat: database_id = "xxxx-xxxx-xxxx-xxxx"

# Buat KV namespace
npx wrangler kv namespace create "AXTO_CACHE"
# → Catat: id = "xxxx..."

# Buat R2 bucket (opsional, untuk download files)
npx wrangler r2 bucket create axto-files
```

### 3. Update wrangler.toml

```toml
# dashboard/wrangler.toml
name = "axto-dashboard"
compatibility_date = "2024-09-23"
pages_build_output_dir = ".vercel/output/static"

[[d1_databases]]
binding = "DB"
database_name = "axto-db"
database_id = "PASTE_DATABASE_ID_HERE"

[[kv_namespaces]]
binding = "KV"
id = "PASTE_KV_ID_HERE"
```

### 4. Set GitHub Secrets

Di GitHub repo → Settings → Secrets → Actions:

```
CLOUDFLARE_API_TOKEN   = (CF Dashboard → My Profile → API Tokens → Create Token)
CLOUDFLARE_ACCOUNT_ID  = (CF Dashboard → Overview → Account ID kanan atas)
CF_D1_DATABASE_ID      = (output dari wrangler d1 create)
CF_KV_NAMESPACE_ID     = (output dari wrangler kv namespace create)
JWT_SECRET             = (openssl rand -hex 32)
ENCRYPTION_KEY         = (openssl rand -hex 32)
ADMIN_PASSWORD         = ulyahM1980
RESEND_API_KEY         = re_xxxxxxxxxxxx
CRON_SECRET            = (string random bebas)
```

### 5. Set Cloudflare Pages Secrets

```bash
cd dashboard

npx wrangler pages secret put JWT_SECRET        --project-name=axto-dashboard
# → Masukkan nilai dari openssl rand -hex 32

npx wrangler pages secret put ENCRYPTION_KEY    --project-name=axto-dashboard
# → Masukkan nilai dari openssl rand -hex 32

npx wrangler pages secret put ADMIN_PASSWORD    --project-name=axto-dashboard
# → Masukkan: ulyahM1980

npx wrangler pages secret put RESEND_API_KEY    --project-name=axto-dashboard
# → Masukkan API key dari resend.com

npx wrangler pages secret put CRON_SECRET       --project-name=axto-dashboard
# → Masukkan string random bebas
```

### 6. Run Database Migrations

```bash
cd dashboard
npx wrangler d1 migrations apply axto-db --remote
```

### 7. Insert Admin User

```bash
npx wrangler d1 execute axto-db --remote --command="
  INSERT OR IGNORE INTO users (id, email, role, created_at, updated_at)
  VALUES (
    lower(hex(randomblob(16))),
    'alghoniy2026@gmail.com',
    'admin',
    datetime('now'),
    datetime('now')
  );
"
```

### 8. Connect CF Pages ke GitHub

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. Pilih repository
3. Konfigurasi:
   - **Framework preset:** `Next.js`
   - **Root directory:** `dashboard`
   - **Build command:** `npm run build`
   - **Output directory:** `.vercel/output/static` _(otomatis terisi)_
4. Klik **Save and Deploy**

### 9. Set Custom Domain (Opsional)

CF Pages → axto-dashboard → Custom Domains → Add domain → `axto.io`

---

## 🛡️ Panduan Setup Guardian AI (Client)

Setelah admin selesai setup, ini yang klien lakukan:

### 1. Download & extract
```bash
docker pull ghcr.io/p2nshooter/guardian-ai:latest
mkdir -p ~/guardian && cd ~/guardian
curl -O https://raw.githubusercontent.com/p2nshooter/guardian-ai/main/guardian.example.yml
cp guardian.example.yml guardian.yml
```

### 2. Edit guardian.yml
```yaml
guardian:
  license_key: "AXTO-XXXX-XXXX-XXXX"   # dari email setelah beli
  license_server: "https://axto.io/api/license-validate"

monitoring:
  interval: 30          # scan setiap 30 detik
  deep_scan: true
  ml_anomaly: true
  rootkit_detection: true

response:
  auto_quarantine: true
  auto_kill: true
  alert_webhook: "https://hooks.slack.com/..."  # opsional

database:
  path: "/data/guardian.db"
```

### 3. Jalankan
```bash
docker run -d \
  --name guardian \
  --privileged \
  -v $(pwd)/guardian.yml:/app/guardian.yml:ro \
  -v guardian-data:/data \
  -p 9090:9090 \
  --restart unless-stopped \
  ghcr.io/p2nshooter/guardian-ai:latest

# Cek status
docker logs -f guardian
# Seharusnya muncul: "Guardian AI started — license valid"
```

---

## 🎼 Panduan Setup Orchestra AI (Client)

### 1. Edit orchestra.yml
```yaml
license:
  key: "AXTO-XXXX-XXXX-XXXX"
  server: "https://axto.io/api/license-validate"

orchestra:
  host: "0.0.0.0"
  port: 8080
  workers:
    cpu_workers: 4
    gpu_workers: 2           # 0 jika tidak ada GPU

ai_pool:
  routing_mode: "cost"       # cost | latency | load | quality | failover | custom
  vendors:
    - provider: openai
      api_key: "sk-proj-..."  # API key kamu, disimpan di sini
      models: ["gpt-4o", "gpt-4o-mini"]
      weight: 1.0

    - provider: anthropic
      api_key: "sk-ant-..."
      models: ["claude-3-5-sonnet-20241022"]
      weight: 0.8

    - provider: ollama
      base_url: "http://localhost:11434"
      models: ["llama3:70b"]
      weight: 0.5
```

### 2. Jalankan
```bash
# Core (routing engine)
docker run -d \
  --name orchestra-core \
  -v $(pwd)/orchestra.yml:/app/orchestra.yml:ro \
  -p 8080:8080 \
  --restart unless-stopped \
  ghcr.io/p2nshooter/orchestra-core:latest

# Worker CPU (tambah sesuai kebutuhan)
docker run -d \
  --name orchestra-worker-cpu \
  -e ORCHESTRA_CORE_URL=http://orchestra-core:8080 \
  --link orchestra-core \
  --restart unless-stopped \
  ghcr.io/p2nshooter/orchestra-worker:latest worker_cpu.py

# Worker GPU (jika ada GPU)
docker run -d \
  --name orchestra-worker-gpu \
  --gpus all \
  -e ORCHESTRA_CORE_URL=http://orchestra-core:8080 \
  --link orchestra-core \
  --restart unless-stopped \
  ghcr.io/p2nshooter/orchestra-worker:latest worker_gpu.py

# Cek status
curl http://localhost:8080/health
# Response: {"status": "ok", "license": "valid", "workers": 3}
```

### 3. Test routing
```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 🔑 Autopilot License — Cara Kerja

License heartbeat bekerja otomatis setelah deploy:

```
Setiap 1 jam → Guardian / Orchestra kirim heartbeat ke:
POST https://axto.io/api/license-validate
{
  "license_key": "AXTO-XXXX-XXXX-XXXX",
  "machine_id": "<hash dari hardware ID — tidak bisa reverse>",
  "product": "guardian",
  "node_count": 3
}

Response:
{
  "valid": true,
  "expires_at": "2026-12-31",
  "max_nodes": 10,
  "features": ["ml_anomaly", "rootkit", "compliance"]
}
```

**Catatan penting:**
- Jika license tidak valid → Guardian/Orchestra masuk mode read-only (tidak stop)
- Grace period 7 hari setelah expire sebelum fitur terkunci
- Machine ID adalah hash satu arah — AXTO tidak tahu spesifikasi hardware Anda

---

## 🖥️ Cara Akses Admin Dashboard

URL: `https://axto.io/admin`

Login dengan:
- Email: `alghoniy2026@gmail.com`
- Password: `ulyahM1980`

Fitur admin yang tersedia:
- **Dashboard** → stats total license, revenue, klien aktif
- **Licenses** → buat, suspend, revoke, extend license
- **Clients** → kelola data klien
- **Revenue** → grafik pendapatan per gateway
- **Gateways** → konfigurasi Stripe, PayPal, Xendit, Midtrans
- **Content** → edit konten website
- **AutoPost** → posting otomatis ke social media

---

## 📞 Butuh Bantuan?

Email: hallo@axto.io

---

*Dokumen ini dibuat untuk keperluan internal admin AXTO. Jangan dibagikan ke publik.*
