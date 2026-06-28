[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hallo@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# 🚀 AXTO — Push ke GitLab via Termux

Ikuti langkah ini URUT dari atas ke bawah.

---

## LANGKAH 1 — Install tools di Termux

```bash
pkg update -y && pkg upgrade -y
pkg install -y git openssh zip unzip wget curl python
```

---

## LANGKAH 2 — Buat SSH key (buat akses ke GitLab)

```bash
ssh-keygen -t ed25519 -C "axto-gitlab" -f ~/.ssh/gitlab_key -N ""
cat ~/.ssh/gitlab_key.pub
```

**Copy semua output di atas** → Buka GitLab di browser:
`GitLab → Settings (pojok kanan atas) → SSH Keys → Add new key → Paste → Add key`

Lalu test koneksi:
```bash
echo "Host gitlab.com
  IdentityFile ~/.ssh/gitlab_key
  StrictHostKeyChecking no" >> ~/.ssh/config

ssh -T git@gitlab.com
# Harusnya muncul: Welcome to GitLab, @username!
```

---

## LANGKAH 3 — Ekstrak ZIP project

```bash
# Pindahkan ZIP yang sudah didownload ke Termux
# Biasanya ada di /sdcard/Download/
ls /sdcard/Download/ | grep guardian

cp /sdcard/Download/guardian-ai-maximal.zip ~/
cd ~
unzip guardian-ai-maximal.zip
ls guardian-ai-fixed/
```

---

## LANGKAH 4 — Setup git & push ke GitLab

```bash
cd ~/guardian-ai-fixed

git init
git config user.email "kamu@email.com"
git config user.name "AXTO Admin"

# Add semua file (kecuali yang di .gitignore)
git add .
git status

git commit -m "feat: AXTO Guardian AI — maximal build

- sklearn IsolationForest ML anomaly detection
- 16 AI providers (Guardian + Orchestra)  
- Worker GPU full: torch+CUDA, diffusers, whisper, SDXL
- GitLab CI/CD pipeline
- Engine Builder dashboard redesign
- Upload to R2 support"

# Ganti SSH remote ke GitLab
git remote add origin git@gitlab.com:axto-platform/guardian-ai.git

git push -u origin main
```

> Jika error `main not found`, coba:
> ```bash
> git push -u origin master
> ```
> atau rename branch:
> ```bash
> git branch -M main
> git push -u origin main
> ```

---

## LANGKAH 5 — Set Variables CI/CD di GitLab

Buka: `GitLab → guardian-ai project → Settings → CI/CD → Variables → Expand`

Tambahkan satu per satu (klik **Add variable**):

| Key | Value | Protected | Masked |
|-----|-------|-----------|--------|
| `CF_ACCOUNT_ID` | `(Cloudflare Account ID kamu)` | ✅ | ✅ |
| `CF_R2_ACCESS_KEY` | `(R2 Access Key dari CF)` | ✅ | ✅ |
| `CF_R2_SECRET_KEY` | `(R2 Secret Key dari CF)` | ✅ | ✅ |
| `R2_BUCKET_NAME` | `axto-builds` | ✅ | ❌ |
| `BUILD_WEBHOOK_SECRET` | `(random string, misal: axto-secret-2025)` | ✅ | ✅ |
| `NEXT_PUBLIC_APP_URL` | `https://axto.io` | ❌ | ❌ |

---

## LANGKAH 6 — Update dashboard agar trigger GitLab (bukan GitHub)

Edit file `.env` atau environment variables di Cloudflare Pages:

```
# Hapus / biarkan kosong:
GITHUB_TOKEN=
GITHUB_REPO=

# Tambah ini:
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_PROJECT_ID=xxxxxxxx
GITLAB_PROJECT_PATH=axto-platform/guardian-ai
```

> GitLab Token: `GitLab → Settings → Access Tokens → Add new token`
> Centang: `api`, `read_repository`, `write_repository`

---

## LANGKAH 7 — Test trigger build manual

Di GitLab: `CI/CD → Pipelines → Run pipeline`

Set variables:
```
BUILD_ID     = test-001
PRODUCT      = guardian-bundle
BUILD_TYPE   = docker
ARCH         = linux/amd64
```

Klik **Run pipeline** → tunggu ~15 menit.

---

## Tips Termux

```bash
# Kalau mau update file setelah push:
cd ~/guardian-ai-fixed
git add .
git commit -m "fix: update"
git push

# Cek status
git log --oneline -5
git status

# Kalau internet putus saat push, lanjut:
git push origin main
```

