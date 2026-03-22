# AXTO — AI eXecution & Tools Orchestration — Context
> **Dokumen referensi arsitektur penuh untuk AI assistant.**
> Baca ini sebelum menyentuh satu baris pun kode AXTO.
> **ATURAN KERAS: TIDAK ADA Supabase. TIDAK ADA Vercel. TIDAK ADA ORM (Prisma/Drizzle). TIDAK ADA managed DB cloud selain Cloudflare D1.**

---

## 1. Ringkasan Platform

AXTO adalah **platform lisensi + delivery** untuk dua produk AI enterprise:

| Produk | Fungsi | Deploy Target |
|--------|--------|---------------|
| **Guardian AI** | Cybersecurity engine — deteksi malware behavioral + static, threat feed real-time | Server client (Docker) |
| **Orchestra AI** | AI workflow orchestration — routing job ke GPU cluster, multi-vendor LLM | Server client (Docker) |

**Model bisnis:** Client beli lisensi → Dashboard validasi → Client deploy engine di server mereka sendiri → Engine call `/api/license-validate` ke Dashboard saat startup + periodik.

---

## 2. Stack Teknologi — WAJIB dipatuhi

```
BOLEH                          DILARANG KERAS
─────────────────────────────  ─────────────────────────────
✅ Cloudflare Pages            ❌ Vercel (platform maupun CLI)
✅ Cloudflare D1 (SQLite)      ❌ Supabase (auth, db, storage)
✅ Cloudflare KV               ❌ Neon / PlanetScale / Railway
✅ Cloudflare R2               ❌ Prisma / Drizzle / TypeORM
✅ Cloudflare Workers (cron)   ❌ NextAuth / Auth.js
✅ GitHub (source control)     ❌ Vercel Edge Functions
✅ GitHub Actions (CI/CD)      ❌ Firebase / AWS / GCP
✅ GHCR (container images)     ❌ Docker Hub untuk engine images
✅ Resend (email)              ❌ SendGrid / Mailgun / SES
✅ next-on-pages               ❌ @vercel/og, @vercel/analytics
✅ Stripe / PayPal / Xendit / Midtrans
✅ Web Crypto API (JWT, AES-GCM)
```

---

## 3. Arsitektur Sistem — Two-Layer

### Layer 1: AXTO Dashboard (Cloudflare)
Platform lisensi yang dikelola tim AXTO. Berjalan 100% di Cloudflare.

```
GitHub Repo
    │
    ├── Push ke main
    │       │
    │       ▼
    │  GitHub Actions
    │       │
    │  ┌────┴────────────────────┐
    │  │  npm run build          │
    │  │  (next-on-pages)        │
    │  └────┬────────────────────┘
    │       │
    │       ▼
    │  Cloudflare Pages          ← Next.js 15 App Router
    │       │                    ← Edge Runtime (semua route)
    │       ├── /app/api/        ← API Routes
    │       ├── /app/admin/      ← Admin Dashboard
    │       ├── /app/portal/     ← Client Portal
    │       └── /app/auth/       ← Login (magic link / password)
    │
    ├── Cloudflare D1            ← SQLite database (lisensi, client, invoice)
    ├── Cloudflare KV            ← Cache / session data
    ├── Cloudflare R2            ← File storage (threat feeds)
    └── Cloudflare Workers       ← Cron: autopost, expire licenses, threat feed
```

### Layer 2: Engine di Server Client (Docker on-premise)
Engine yang dibeli client berjalan **sepenuhnya di server mereka sendiri**. AXTO tidak punya akses ke infrastruktur client.

```
SERVER MILIK CLIENT
─────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────┐
│                    docker compose up                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  guardian-core  (ghcr.io/p2nshooter/guardian)   │   │
│  │  Port: 8080                                     │   │
│  │  DB:   guardian-db (PostgreSQL — ikut compose)  │   │
│  │  Vol:  guardian-data, guardian-logs             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  guardian-node  (ghcr.io/p2nshooter/guardian)   │   │
│  │  Mode: scanner node, terhubung ke core          │   │
│  │  DB:   pakai PostgreSQL yang sama di core       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  guardian-db  (postgres:16-alpine)              │   │
│  │  Port: 5432 (internal only)                     │   │
│  │  Data: /var/lib/postgresql/data (persisted vol) │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

SERVER MILIK CLIENT (Orchestra)
┌─────────────────────────────────────────────────────────┐
│                docker compose -f orchestra-compose.yml  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  orchestra-core  (ghcr.io/p2nshooter/orchestra) │   │
│  │  Port: 7890                                     │   │
│  │  DB:   orchestra-db (PostgreSQL — ikut compose) │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  orchestra-worker-cpu (ghcr.io/p2nshooter/...)  │   │
│  │  Connects to: orchestra-core:7890               │   │
│  │  DB:   TIDAK ada — stateless worker             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  orchestra-worker-gpu (ghcr.io/p2nshooter/...)  │   │
│  │  Connects to: orchestra-core:7890               │   │
│  │  Runtime: nvidia (CUDA)                         │   │
│  │  DB:   TIDAK ada — stateless worker             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  orchestra-db  (postgres:16-alpine)             │   │
│  │  Port: 5432 (internal only)                     │   │
│  │  Data: /var/lib/postgresql/data (persisted vol) │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**PRINSIP KUNCI:**
- Database (PostgreSQL) untuk Guardian dan Orchestra **ikut di dalam Docker Compose** di server client — **bukan** Cloudflare D1
- Cloudflare D1 hanya untuk **Dashboard** (lisensi, user, invoice, gateway config)
- Client bawa AI keys sendiri (BYOK) — diset di `guardian.yml` / `orchestra.yml` di server mereka
- AXTO tidak menyentuh, melihat, atau menyimpan data AI client
- Satu-satunya koneksi keluar dari engine client adalah `POST https://axto.io/api/license-validate` (heartbeat periodik)

---

## 4. GHCR Images

Semua engine di-publish ke **GitHub Container Registry (GHCR)** — bukan Docker Hub.

```
ghcr.io/p2nshooter/guardian-engine:latest    ← Guardian Core + Node
ghcr.io/p2nshooter/orchestra-core:latest     ← Orchestra Core
ghcr.io/p2nshooter/orchestra-worker-cpu:latest ← CPU Worker (stateless)
ghcr.io/p2nshooter/orchestra-worker-gpu:latest ← GPU Worker (CUDA, stateless)
```

**Catatan GHCR:**
- Image di-pull langsung oleh Docker di server client saat `docker compose up`
- Authentication: `docker login ghcr.io -u USERNAME -p GITHUB_TOKEN`
- Build + push image dilakukan via GitHub Actions di repo engine masing-masing
- Dashboard hanya menyimpan `GHCR_OWNER` env var untuk generate URL download

---

## 5. Database Architecture

### 5a. Cloudflare D1 (Dashboard — axto-db)
**Siapa yang pakai:** AXTO Dashboard saja
**Teknologi:** SQLite via Cloudflare D1
**File migrasi:** `dashboard/cf-migrations/`

```
Tabel D1 (axto-db):
├── users              ← admin + client account (JWT auth)
├── magic_links        ← one-time login tokens
├── clients            ← data client (nama, email, org)
├── license_packages   ← katalog paket (harga, fitur)
├── licenses           ← kunci lisensi yang diterbitkan
├── license_nodes      ← node yang terdaftar per lisensi
├── license_heartbeats ← log heartbeat dari engine
├── invoices           ← riwayat pembayaran
├── payment_gateways   ← credentials gateway (AES-256-GCM encrypted)
├── site_settings      ← konfigurasi landing page
├── site_content       ← konten CMS (features, FAQs, dll)
├── autopost_platform_configs ← credentials social media
├── autopost_posts     ← riwayat + jadwal posting
└── autopost_schedules ← jadwal auto-post
```

### 5b. PostgreSQL per Engine (di server client)
**Siapa yang pakai:** Guardian Core, Orchestra Core (berjalan di server client)
**Teknologi:** `postgres:16-alpine` di dalam Docker Compose
**Lokasi data:** Volume Docker di server client — `guardian-db-data` / `orchestra-db-data`
**AXTO tidak punya akses ke database ini sama sekali**

```
Guardian DB (PostgreSQL — di server client):
├── scan_results       ← hasil scan file/proses
├── threat_events      ← ancaman yang terdeteksi
├── quarantine_items   ← file yang dikarantina
├── nodes              ← node Guardian yang terhubung
├── ai_pool_status     ← status vendor AI (BYOK)
└── config_cache       ← cache konfigurasi

Orchestra DB (PostgreSQL — di server client):
├── jobs               ← AI jobs yang di-queue
├── job_results        ← hasil job
├── workers            ← worker nodes yang terhubung
├── routing_stats      ← statistik routing per vendor
├── ai_vendors         ← daftar vendor AI (BYOK)
└── cluster_config     ← konfigurasi cluster
```

---

## 6. Auth System (Dashboard)

**Tidak ada Supabase Auth. Tidak ada NextAuth. Murni Web Crypto API + JWT.**

```
Flow Magic Link:
1. User input email di /auth/login
2. POST /api/auth { action: "magic_link", email }
3. Dashboard buat token (crypto.randomUUID) → simpan di D1 magic_links
4. Email dikirim via Resend (link: /api/auth/callback?token=XXX)
5. User klik link → GET /api/auth/callback?token=XXX
6. Dashboard verify token di D1 → mark used=1
7. Buat JWT (HS256, Web Crypto) → set httpOnly cookie "axto_session"
8. Redirect ke /portal atau /admin

Flow Admin Password:
1. POST /api/auth { action: "password_login", email, password }
2. Lookup user di D1, role harus "admin"
3. Verify password vs PBKDF2 hash (atau ADMIN_PASSWORD env var)
4. Buat JWT → set cookie → redirect /admin

JWT Payload:
{ sub: userId, email, role: "admin"|"client", iat, exp }
Key: JWT_SECRET (Cloudflare Pages Secret)
Algo: HS256 via Web Crypto API (100% edge-compatible)
Expiry: 7 hari

Cookie: axto_session (httpOnly, secure, sameSite: lax)
```

---

## 7. License Validation Flow

```
Engine (server client) ─────────────→ Dashboard (Cloudflare)
                         POST /api/license-validate
                         Body: { license_key, machine_id, product }

Dashboard checks:
1. Cari license_key di D1
2. Cek status: active / suspended / expired / revoked
3. Cek expires_at > now()
4. Machine binding: simpan machine_id jika pertama kali
5. Jika machine_id berbeda → tolak (kecuali sudah direset client dari portal)
6. Catat heartbeat di license_heartbeats
7. Response: { valid: true/false, expires_at, max_nodes, ... }

Engine behavior berdasarkan response:
- valid: true  → Engine berjalan normal
- valid: false → Engine masuk grace period (4 jam) lalu shutdown
```

---

## 8. Payment Flow

```
Client (Browser) → /register atau /portal (tab Upgrade)
         │
         │  POST /api/checkout { pkg, gateway, email, billing }
         ▼
    Dashboard
         │
         ├── gateway=stripe   → Stripe Checkout Session → redirect
         ├── gateway=paypal   → PayPal Order → redirect ke PayPal
         ├── gateway=xendit   → Xendit Invoice → redirect
         └── gateway=midtrans → Midtrans Snap → redirect
         │
         ▼
    Client bayar di gateway
         │
         ▼ Webhook callback
    /api/webhooks/{stripe|paypal|xendit|midtrans}
         │
         ├── Verify signature
         ├── Idempotency check (payment_ref di D1)
         ├── createLicense() → insert ke D1
         ├── sendWelcomeEmail() via Resend
         └── Response 200

Credentials gateway tersimpan di D1 payment_gateways (encrypted AES-256-GCM)
Kunci enkripsi: ENCRYPTION_KEY (Cloudflare Pages Secret, 64 hex chars)
```

---

## 9. API Routes Map

```
/api/auth                    POST  magic_link | password_login
/api/auth/me                 GET   return session user dari cookie
/api/auth/callback           GET   verifikasi magic link token
/api/auth/logout             POST  hapus cookie

/api/license-validate        POST  dipakai engine client (heartbeat)
/api/checkout                POST  buat payment session

/api/portal                  GET   data lisensi + invoice client login
                             POST  action: reset_binding

/api/admin                   GET   stats dashboard + semua lisensi
                             POST  suspend|reactivate|revoke|extend|resend_email|create|create_bundle
/api/admin/clients           GET   semua client | POST update
/api/admin/licenses          GET   semua / single lisensi
/api/admin/revenue           GET   semua invoice
/api/admin/content           GET|POST CMS sections
/api/admin/gateways          GET|POST save|toggle|get_credentials
/api/admin/autopost          GET   stats|platforms|posts|schedules
                             POST  add_platform|toggle|delete|schedule|save_post
/api/admin/autopost/generate POST  generate AI variation (Anthropic)
/api/admin/autopost/publish  POST  publish | retry_failed

/api/webhooks/stripe         POST  Stripe webhook
/api/webhooks/paypal         POST  PayPal webhook
/api/webhooks/xendit         POST  Xendit webhook
/api/webhooks/midtrans       POST  Midtrans webhook

/api/cron/autopost           GET   dipakai Cloudflare Workers (CRON_SECRET)
/api/cron/expire-licenses    GET   expire lisensi kadaluarsa

/api/downloads               GET   list file
/api/downloads/[file]        GET   download docker-compose, config template
/api/health                  GET   health check (DB latency, status)
```

---

## 10. Cloudflare Workers (Cron)

```
cloudflare-workers/
├── autopost-cron.ts          ← Hit /api/cron/autopost setiap N jam
│   Config: wrangler-autopost.toml
│   Cron: "0 */6 * * *" (setiap 6 jam)
│
├── threat-intel-sync.ts      ← Sync threat feed dari NVD, abuse.ch, OTX → R2
│   Config: wrangler-threat-intel.toml
│   Cron: "0 */6 * * *"
│   Output: guardian-threat-feed R2 bucket
│
└── threat-feed-proxy.js      ← Proxy R2 threat feed ke engine Guardian
    (optional, bisa pakai R2 public URL langsung)
```

**Deploy Workers:**
```bash
cd cloudflare-workers
wrangler deploy --config wrangler-autopost.toml
wrangler deploy --config wrangler-threat-intel.toml
```

---

## 11. GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
Trigger: push ke main
Steps:
  1. Checkout
  2. npm ci
  3. wrangler d1 migrations apply axto-db --remote   ← D1 auto-migrate
  4. npm run build  (next-on-pages → .vercel/output/static)
     NOTE: .vercel/output adalah OUTPUT FOLDER dari next-on-pages,
           BUKAN deployment Vercel. Cloudflare Pages membaca folder ini.
  5. cloudflare/pages-action → deploy ke Cloudflare Pages

Secrets GitHub yang dibutuhkan:
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID
  NEXT_PUBLIC_APP_URL
```

---

## 12. Secrets Management

**Semua secrets via `wrangler pages secret put` — TIDAK ADA .env di production.**

```bash
wrangler pages secret put JWT_SECRET          # Min 48 karakter random
wrangler pages secret put ENCRYPTION_KEY      # TEPAT 64 hex chars (32 bytes)
wrangler pages secret put ADMIN_PASSWORD      # Password admin panel
wrangler pages secret put RESEND_API_KEY      # Email delivery
wrangler pages secret put CRON_SECRET         # Auth cron Workers
```

**Enkripsi credential gateway:** AES-256-GCM via Web Crypto API
- Key derivasi dari `ENCRYPTION_KEY` env var
- Format cipher: `iv(24 hex) + ciphertext+tag (hex)`
- File: `dashboard/lib/gateway-crypto.ts`

---

## 13. BYOK — Bring Your Own Keys

**Prinsip terpenting AXTO.** Client menyediakan API key AI provider sendiri.

```
Yang terjadi di server CLIENT (bukan dashboard AXTO):
guardian.yml:
  ai_pool:
    vendors:
      - provider: openai
        api_key: sk-...         ← Key client, di server client
      - provider: anthropic
        api_key: sk-ant-...     ← Key client, di server client

Yang AXTO lakukan:
- Validasi license key saja
- TIDAK menyimpan, membaca, atau mentransmit API key client
- TIDAK ada telemetri data AI
- Engine client → AI provider langsung (tanpa proxy AXTO)
```

---

## 14. File Structure

```
axto-v2/
├── .github/
│   └── workflows/
│       └── deploy.yml               ← GitHub Actions CI/CD
│
├── cloudflare-workers/
│   ├── autopost-cron.ts             ← Cron: trigger autopost
│   ├── threat-intel-sync.ts         ← Cron: sync threat feeds ke R2
│   ├── threat-feed-proxy.js         ← Proxy threat feed
│   ├── wrangler.toml                ← Default worker config
│   ├── wrangler-autopost.toml       ← AutoPost worker config
│   └── wrangler-threat-intel.toml   ← Threat Intel worker config
│
├── dashboard/                       ← Next.js 15 App (Cloudflare Pages)
│   ├── app/
│   │   ├── auth/login/              ← Login page (magic link + password)
│   │   ├── admin/                   ← Admin dashboard pages
│   │   ├── portal/                  ← Client portal pages
│   │   ├── register/                ← Public purchase page
│   │   ├── api/
│   │   │   ├── auth/                ← Auth endpoints
│   │   │   ├── admin/               ← Admin API
│   │   │   ├── webhooks/            ← Payment webhooks
│   │   │   ├── checkout/            ← Checkout API
│   │   │   ├── license-validate/    ← Dipakai engine client
│   │   │   ├── portal/              ← Client portal API
│   │   │   ├── downloads/           ← File download
│   │   │   └── cron/                ← Cron endpoints
│   │   └── (privacy|terms|...)
│   │
│   ├── lib/
│   │   ├── auth.ts                  ← JWT (Web Crypto, bukan library)
│   │   ├── client-auth.ts           ← Client-side helpers (browser)
│   │   ├── db.ts                    ← D1 client helper
│   │   ├── license.ts               ← License create/validate logic
│   │   ├── email.ts                 ← Email via Resend
│   │   ├── gateway-crypto.ts        ← AES-256-GCM encrypt/decrypt
│   │   ├── gateways.ts              ← Ambil creds gateway dari D1
│   │   ├── stripe.ts                ← Package catalog + price helpers
│   │   ├── paypal.ts                ← PayPal order creation
│   │   ├── xendit.ts                ← Xendit invoice creation
│   │   ├── autopost/
│   │   │   ├── generator.ts         ← AI variation via Anthropic
│   │   │   ├── publisher.ts         ← Post ke social media
│   │   │   └── templates.ts         ← 150+ template konten
│   │   └── webhooks/
│   │       ├── shared.ts            ← processPayment() shared logic
│   │       ├── stripe.ts
│   │       ├── paypal.ts
│   │       ├── xendit.ts
│   │       └── midtrans.ts
│   │
│   ├── cf-migrations/               ← Cloudflare D1 SQL migrations
│   │   ├── 0001_init.sql            ← Core schema
│   │   └── 0002_autopost.sql        ← AutoPost schema
│   │
│   ├── wrangler.toml                ← CF Pages config (D1, KV, R2 bindings)
│   ├── next.config.ts               ← Next.js config
│   ├── tailwind.config.js           ← Tailwind CSS config
│   └── package.json                 ← No Supabase, no Vercel deps
│
├── orchestra.example.yml            ← Contoh config Orchestra (untuk client)
└── DEPLOY.md                        ← Panduan deploy lengkap
```

---

## 15. AutoPost System

AutoPost bekerja **tanpa AI API** — murni template rotation:

- **150+ template** tersimpan di `dashboard/lib/autopost/templates.ts`
- Semua template berisi konten **faktual** tentang Guardian AI dan Orchestra AI
- Template dikategorikan: `guardian_ai`, `orchestra_ai`, `byok`, `comparison`, `pricing`, `feature`, `self_hosted`, `testimonial`, `tutorial`, `announcement`
- Anti-duplikat: `pickUnusedTemplate()` tracking ID template yang sudah diposting
- Rotasi: setelah semua template habis, mulai dari awal (reset)
- Variasi: `light` (ganti CTA), `medium` (template lain kategori sama), `heavy` (template lain produk sama)
- **Tidak ada klaim palsu** — semua konten diambil dari fitur nyata produk

Jadwal posting dikonfigurasi di `/admin/autopost` → tab Schedules:
- Frekuensi: hourly / daily / weekly
- Platform: pilih platform mana yang aktif
- Bahasa: `id` (Indonesia) atau `en`

## 16. Aturan untuk AI Assistant

Jika kamu adalah AI yang membantu develop AXTO, **WAJIB ikuti aturan ini:**

### SELALU:
- ✅ Gunakan `getDB(req)` untuk akses D1 — TIDAK PERNAH import DB library eksternal
- ✅ Gunakan `Web Crypto API` untuk JWT, hash, enkripsi — bukan `jsonwebtoken`, `bcrypt`, dll
- ✅ Tandai semua API route dengan `export const runtime = "edge"`
- ✅ Gunakan `fetch()` native untuk HTTP calls — bukan `axios`, `node-fetch`
- ✅ Simpan database credentials engine (Guardian/Orchestra) **hanya di docker-compose** milik client
- ✅ Gunakan `getSessionUser()` dari `@/lib/client-auth` untuk auth di client component
- ✅ Gunakan `requireAdmin(req)` / `requireUser(req)` dari `@/lib/auth` untuk auth di API route
- ✅ Set `export const dynamic = "force-dynamic"` di setiap API route
- ✅ Gunakan GHCR (`ghcr.io/p2nshooter/...`) untuk semua image reference

### JANGAN PERNAH:
- ❌ Import `@supabase/supabase-js` atau client Supabase apapun
- ❌ Gunakan `createClient()` dari Supabase
- ❌ Gunakan `user.app_metadata`, `user.user_metadata`, `user.identities` (field Supabase)
- ❌ Import `next/headers` untuk cookies di Client Component
- ❌ Gunakan `process.env.VERCEL_*` environment variables
- ❌ Import `@vercel/*` packages
- ❌ Gunakan `localStorage` / `sessionStorage` (tidak tersedia di Edge)
- ❌ Gunakan Node.js built-ins (`fs`, `path`, `crypto` dari Node) — pakai Web API
- ❌ Deploy engine Guardian/Orchestra ke cloud — mereka HARUS di server client
- ❌ Simpan AI provider keys client di dashboard/D1 — BYOK berarti di server client
- ❌ Buat tabel database untuk engine client di D1 — mereka punya PostgreSQL sendiri

### Jika menemukan kode Supabase/Vercel lama:
1. Hapus import
2. Ganti auth pattern: `const { data: { user } } = await getSessionUser()` → `const user = await getSessionUser()`
3. Ganti role check: `user.app_metadata?.role` → `user.role`
4. Ganti DB calls: Supabase client → `getDB(req)` + `dbFirst/dbQuery/dbRun`
5. Ganti auth calls: Supabase auth → `/api/auth` endpoints + JWT cookie

---

## 16. Konvensi Kode

```typescript
// API Route — template minimal
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";    // atau requireUser

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);        // null = unauthorized
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db  = getDB(req);
  const rows = await dbQuery<MyType>(db, `SELECT * FROM table WHERE id = ?`, [id]);
  return NextResponse.json({ data: rows });
}

// Client Component — template minimal
"use client";
import { useEffect, useState } from "react";
import { getSessionUser, signOut } from "@/lib/client-auth";
import { useRouter } from "next/navigation";

export default function MyPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    getSessionUser().then(user => {
      if (!user) { router.push("/auth/login"); return; }
      if (user.role !== "admin") { router.push("/auth/login"); return; }
      setUser(user);
    });
  }, []);
  // ...
}
```

---

*Dokumen ini adalah source of truth arsitektur AXTO. Perbarui jika ada perubahan stack atau keputusan arsitektur baru.*
