#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# AXTO Platform — 1 Command Deploy
# Usage: ./push.sh "commit message"
#
# Otomatis setelah push:
#   Pipeline A — Docker Images → GHCR (public registry)
#     🛡️  guardian-engine  (core + node + ClamAV)
#     ⚡  orchestra-core
#     💻  orchestra-worker-cpu
#     🎮  orchestra-worker-gpu
#
#   Pipeline B — Cloudflare Deploy
#     🗄️  D1 migrations (0001–0015)
#     📦  48 PDFs → R2 (axto-storage)
#     🔨  Build Next.js dashboard
#     🚀  Deploy → Cloudflare Pages
#     ⚡  Deploy CF Workers
#
# NOTE: Engine Builder (admin panel) = tool internal admin untuk build
#       Docker image & EXE custom. Client yang beli paket hanya dapat
#       file registry produk — build di infra mereka sendiri.
# ═══════════════════════════════════════════════════════════════════════════
set -e

G='\033[0;32m'; C='\033[0;36m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
ok()   { echo -e "${G}✅ $1${N}"; }
info() { echo -e "${C}➤  $1${N}"; }
warn() { echo -e "${Y}⚠️  $1${N}"; }
err()  { echo -e "${R}❌ $1${N}"; exit 1; }

MSG="${1:-deploy: update platform}"

info "Staging all changes..."
git add .

CHANGED=$(git diff --cached --name-only | wc -l)
if [ "$CHANGED" -eq 0 ]; then
  warn "Nothing to commit — already up to date"
  exit 0
fi

echo ""
echo "Changed files (${CHANGED}):"
git diff --cached --name-only | head -20 | sed 's/^/  📄 /'
[ "$CHANGED" -gt 20 ] && echo "  ... and $((CHANGED - 20)) more"
echo ""

info "Committing: \"$MSG\""
git commit -m "$MSG"

info "Pushing to origin/main..."
git push origin main

REPO=$(git remote get-url origin | sed 's/.*github.com[:/]//' | sed 's/\.git$//')

echo ""
ok "Push berhasil! Pipeline otomatis berjalan:"
echo ""
echo "  👉 https://github.com/${REPO}/actions"
echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  A) Docker Images → GHCR (~15-40 menit)             │"
echo "  │     guardian-engine | orchestra-core                 │"
echo "  │     orchestra-worker-cpu | orchestra-worker-gpu      │"
echo "  │                                                      │"
echo "  │  B) Cloudflare (~5-10 menit)                        │"
echo "  │     D1 migrations + 48 PDFs → R2                    │"
echo "  │     Build & Deploy dashboard → axto.io              │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""
echo "  Live: https://axto.io"
echo ""
echo "  Engine Builder (admin only):"
echo "  👉 https://axto.io/admin/engine-builder"
echo ""
