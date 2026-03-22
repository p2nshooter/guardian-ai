# AXTO — Panduan Setup Client

## 🐳 Guardian AI

### 1. Pull image dari GHCR

```bash
# Login GHCR (butuh token dari Admin AXTO)
echo "GHCR_TOKEN_DARI_ADMIN" | docker login ghcr.io -u p2nshooter --password-stdin

# Pull image
docker pull ghcr.io/p2nshooter/guardian-engine:latest
```

### 2. Edit konfigurasi

```bash
# guardian.yml sudah ada — tinggal isi license_key dan AI key
nano guardian.yml
```

Bagian yang wajib diisi:
```yaml
guardian:
  license_key: "GUARDIAN-XXXX-XXXX-XXXX-XXXXXXXXXXXX"  # dari Client Portal
  ai_pool:
    vendors:
      - provider: openai
        api_key: "sk-..."  # API key AI vendor kamu
```

### 3. Jalankan

```bash
docker compose up -d

# Cek status
docker compose ps
docker compose logs -f guardian-core
```

### 4. Verifikasi

```bash
curl http://localhost:8080/health
# Response: {"status":"ok","license":"valid","nodes":1}
```

---

## 🎼 Orchestra AI

### 1. Pull image

```bash
docker pull ghcr.io/p2nshooter/orchestra-engine:latest
```

### 2. Edit konfigurasi

```bash
nano orchestra.yml
```

Bagian yang wajib diisi:
```yaml
orchestra:
  license_key: "ORCH-XXXX-XXXX-XXXX-XXXX"  # dari Client Portal
  ai_pool:
    vendors:
      - provider: openai
        api_key: "sk-..."
```

### 3. Jalankan

```bash
docker compose -f orchestra-compose.yml up -d

# Cek status
curl http://localhost:7890/health
```

---

## 📋 File yang dibutuhkan client

| File | Fungsi |
|------|--------|
| `docker-compose.yml` | Docker compose Guardian |
| `orchestra-compose.yml` | Docker compose Orchestra |
| `guardian.yml` | Config Guardian (isi license + AI key) |
| `orchestra.yml` | Config Orchestra (isi license + AI key) |

Semua file ini ada di repo GitHub: `github.com/p2nshooter/guardian-ai`

---

## 🔑 Client Portal

Dapatkan license key di: https://axto.io/portal
