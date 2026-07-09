#!/bin/bash
# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
echo ""
echo " ╔══════════════════════════════════════════════╗"
echo " ║   AXTO Deployer — Build executable           ║"
echo " ╚══════════════════════════════════════════════╝"
echo ""

# ── Check Node.js ─────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js tidak ditemukan!"
  echo "Download dari: https://nodejs.org (pilih versi LTS)"
  exit 1
fi
echo "Node.js: $(node --version)"

# ── Go to script dir ─────────────────────────────────────────
cd "$(dirname "$0")"

# ── Install deps ─────────────────────────────────────────────
echo ""
echo "[1/3] Install dependencies..."
npm install || { echo "[ERROR] npm install gagal"; exit 1; }

echo ""
echo "[2/3] Install build tool (pkg)..."
npm install -g pkg || { echo "[ERROR] Gagal install pkg"; exit 1; }

mkdir -p dist

# ── Detect platform ──────────────────────────────────────────
echo ""
echo "[3/3] Building executable..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  TARGET="node18-macos-x64"; OUT="dist/axto-deploy-macos"
  echo "     Platform: macOS"
else
  TARGET="node18-linux-x64"; OUT="dist/axto-deploy-linux"
  echo "     Platform: Linux"
fi

pkg . --target "$TARGET" --output "$OUT" --compress GZip || {
  echo "[ERROR] Build gagal"; exit 1
}
chmod +x "$OUT"

echo ""
echo " ╔══════════════════════════════════════════════╗"
echo " ║   ✅  BUILD SUKSES!                           ║"
echo " ╠══════════════════════════════════════════════╣"
echo " ║                                              ║"
echo " ║  File: $OUT"
echo " ║                                              ║"
echo " ╠══════════════════════════════════════════════╣"
echo " ║  LANGKAH SELANJUTNYA:                        ║"
echo " ║  1. Rename .env.example → .env               ║"
echo " ║  2. Isi credentials Cloudflare di .env       ║"
echo " ║  3. Taruh PDF di folder playbooks-pdf/       ║"
echo " ║  4. Jalankan: ./${OUT##*/}         ║"
echo " ╚══════════════════════════════════════════════╝"
echo ""
