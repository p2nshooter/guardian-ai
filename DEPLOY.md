[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO v3 — Panduan Deploy axto.io

## Alur

```
push / merge ke main
  ├── deploy-dashboard.yml   typecheck + unit test → migrasi D1 → build (next-on-pages) → Cloudflare Pages "axto-dashboard"
  │                          → PDF panduan instalasi (EN/ID) → R2 axto-builds/builds/latest/guides/
  ├── auto-build-all.yml     image Docker 10 produk → R2 axto-builds/builds/latest/raw/
  ├── build-installer.yml    AXTO Setup (Windows/Linux/macOS), uji Linux + Windows → R2 (setiap malam juga)
  ├── docker-smoke.yml       setiap image dijalankan + aktivasi lisensi
  └── e2e.yml                E2E penuh di runtime Cloudflare lokal (+ 13 engine & installer di Docker), juga setiap malam

push ke branch pengembangan (claude/**, ccr-**)
  └── deploy-preview.yml     proyek TERPISAH "axto-preview" (D1/KV/R2 sendiri) → https://axto-preview.pages.dev
```

## Secret Cloudflare Pages (`axto-dashboard`)

`wrangler pages secret put <NAMA> --project-name axto-dashboard`

| Secret | Wajib | Fungsi |
|---|---|---|
| `JWT_SECRET` | ✅ | Tanda tangan sesi |
| `ENCRYPTION_KEY` | ✅ | 64 hex — enkripsi kunci AI member & data per member |
| `ADMIN_PASSWORD` | ✅ | Login admin |
| `CRON_SECRET` | ✅ | Otorisasi `/api/cron/*` |
| `LICENSE_SIGNING_PRIVATE_KEY_B64` | ✅* | Seed Ed25519 penandatangan lisensi online **dan** file aktivasi Lifetime (*atau `platform_config.license_signing_key` di D1 — yang di D1 didahulukan) |
| `SETTINGS_ENCRYPTION_KEY` | – | Kunci terpisah untuk pengaturan rahasia di R2 (default: `ENCRYPTION_KEY`) |
| `DOWNLOAD_SIGNING_SECRET` | – | Tautan unduhan image bertanda tangan untuk installer |
| `LICENSE_KEY_HMAC_SECRET` | – | Segmen HMAC pada kunci lisensi |
| `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | – | Email (bisa juga diisi di Admin → Payment & email) |

Variabel publik: `NEXT_PUBLIC_APP_URL` (default `https://axto.io`), `NEXT_PUBLIC_GSC_VERIFICATION`, `NEXT_PUBLIC_BING_VERIFICATION`.

## Secret GitHub Actions

`CLOUDFLARE_API_TOKEN` (Pages:Edit, D1:Edit) · `CF_R2_ACCESS_KEY_ID` + `CF_R2_SECRET_ACCESS_KEY` (unggah build & PDF ke R2).

## Setelah deploy pertama

1. Admin → **Payment & email**: aktifkan gateway (Stripe, PayPal, Xendit, Midtrans, NOWPayments, crypto langsung, transfer BNI).
2. Admin → **Plans & pricing** dan **Lifetime licences**: sesuaikan harga bila perlu.
3. Managed AI tetap terkunci sampai dibuka di Admin → **Managed AI**.
4. Google Search Console: verifikasi domain (DNS TXT di Cloudflare), kirim `https://axto.io/sitemap.xml`.

## Lokal

```bash
cd dashboard && npm ci
npm run typecheck && npm test
bash tests/e2e/run.sh          # build + D1/KV/R2 lokal + semua E2E
```
