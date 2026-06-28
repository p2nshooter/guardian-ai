#!/usr/bin/env bash
# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
# ══════════════════════════════════════════════════════════════════════════════
# AXTO — Build ALL .exe (Windows executables) via PyInstaller
# Runner: Windows + GitBash + Python 3.11
#
# Usage: bash build-scripts/build-all-exe.sh [product]
#   - product: optional, build satu produk saja
#   - tanpa argumen: build semua
#
# Requirements (install sekali di runner):
#   pip install pyinstaller pyinstaller-hooks-contrib
#   pip install fastapi uvicorn[standard] pydantic pyyaml httpx aiosqlite cryptography
#   pip install structlog pydantic-settings python-dotenv aiofiles tenacity websockets
#   pip install psutil openai anthropic google-generativeai aiosmtplib reportlab
#   pip install numpy scikit-learn pandas dnspython python-multipart
# ══════════════════════════════════════════════════════════════════════════════
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENTRY_DIR="${REPO_ROOT}/build-scripts/exe-entrypoints"
OUT_DIR="${REPO_ROOT}/dist/exe"
BUILD_DIR="${REPO_ROOT}/dist/build-tmp"

mkdir -p "${OUT_DIR}" "${BUILD_DIR}"

G='\033[0;32m'; C='\033[0;36m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
ok()   { echo -e "${G}✅ $1${N}"; }
info() { echo -e "${C}➤  $1${N}"; }
err()  { echo -e "${R}❌ $1${N}"; exit 1; }

# ── Hidden imports wajib untuk FastAPI + uvicorn frozen exe ──────────────────
UVICORN_HIDDEN=(
  "uvicorn.logging"
  "uvicorn.loops"
  "uvicorn.loops.auto"
  "uvicorn.loops.asyncio"
  "uvicorn.protocols"
  "uvicorn.protocols.http"
  "uvicorn.protocols.http.auto"
  "uvicorn.protocols.http.h11_impl"
  "uvicorn.protocols.http.httptools_impl"
  "uvicorn.protocols.websockets"
  "uvicorn.protocols.websockets.auto"
  "uvicorn.protocols.websockets.websockets_impl"
  "uvicorn.lifespan"
  "uvicorn.lifespan.on"
  "uvicorn.lifespan.off"
  "fastapi"
  "fastapi.middleware.cors"
  "fastapi.staticfiles"
  "starlette"
  "starlette.middleware"
  "starlette.middleware.cors"
  "starlette.routing"
  "pydantic"
  "pydantic_settings"
  "anyio"
  "anyio._backends._asyncio"
  "h11"
  "httptools"
  "aiosqlite"
  "yaml"
  "structlog"
  "cryptography"
  "cryptography.hazmat.primitives"
  "cryptography.hazmat.backends"
  "multipart"
)

build_hidden_flags() {
  local flags=""
  for imp in "${UVICORN_HIDDEN[@]}"; do
    flags="${flags} --hidden-import=${imp}"
  done
  echo "${flags}"
}

HIDDEN_FLAGS=$(build_hidden_flags)

# ── Fungsi build satu produk ─────────────────────────────────────────────────
build_exe() {
  local PRODUCT="$1"
  local SRC_DIR="$2"
  local ENTRY="$3"
  local NAME="$4"
  local EXTRA_HIDDEN="${5:-}"

  info "Building ${NAME}.exe ..."

  # Masuk ke folder produk agar relative imports (src.*) bekerja
  cd "${REPO_ROOT}/${SRC_DIR}"

  # Copy entry script ke folder produk sementara
  cp "${ENTRY_DIR}/${ENTRY}" "./_build_entry.py"

  # PyInstaller command
  python -m PyInstaller \
    --onefile \
    --name "${NAME}" \
    --distpath "${OUT_DIR}" \
    --workpath "${BUILD_DIR}/${NAME}" \
    --specpath "${BUILD_DIR}/${NAME}" \
    --noconfirm \
    --clean \
    ${HIDDEN_FLAGS} \
    ${EXTRA_HIDDEN} \
    --collect-all "fastapi" \
    --collect-all "uvicorn" \
    --collect-all "starlette" \
    --collect-all "pydantic" \
    "./_build_entry.py"

  rm -f "./_build_entry.py"
  cd "${REPO_ROOT}"

  if [ -f "${OUT_DIR}/${NAME}.exe" ]; then
    SIZE=$(du -sh "${OUT_DIR}/${NAME}.exe" | cut -f1)
    ok "${NAME}.exe built successfully (${SIZE})"
  else
    err "${NAME}.exe tidak terbuat — cek log PyInstaller di ${BUILD_DIR}/${NAME}"
  fi
}

# ── Product definitions ──────────────────────────────────────────────────────
# Format: product_key | src_dir | entry_script | output_name | extra_hidden_imports
declare -A PRODUCTS
PRODUCTS=(
  ["guardian-core"]="engine|guardian_core_entry.py|axto-guardian-core|--hidden-import=asyncpg --hidden-import=psutil --hidden-import=numpy --hidden-import=sklearn --hidden-import=pandas --hidden-import=reportlab --hidden-import=aiosmtplib --hidden-import=redis --hidden-import=dnspython"
  ["vault-enterprise"]="vault|vault_enterprise_entry.py|axto-vault-enterprise|"
  ["sentinel-enterprise"]="sentinel|sentinel_enterprise_entry.py|axto-sentinel-enterprise|--hidden-import=aiohttp"
  ["vault-lite"]="vault|vault_entry.py|axto-vault|"
  ["soc"]="soc|soc_entry.py|axto-soc|"
  ["compliance"]="compliance|compliance_entry.py|axto-compliance|"
  ["edge-agent"]="edge-agent|edge_entry.py|axto-edge-agent|"
  ["sentinel-lite"]="sentinel|sentinel_entry.py|axto-sentinel-lite|"
  ["orchestra"]="orchestra|orchestra_entry.py|axto-orchestra|--hidden-import=openai --hidden-import=anthropic --hidden-import=google.generativeai"
  ["antivirus"]="antivirus|antivirus_entry.py|axto-antivirus|--hidden-import=clamd"
  ["ai-studio"]="ai-studio|ai_studio_entry.py|axto-ai-studio|--hidden-import=httpx --hidden-import=aiosqlite --hidden-import=yaml"
  ["gpu-studio"]="gpu-studio|gpu_studio_entry.py|axto-gpu-studio|--hidden-import=httpx --hidden-import=aiosqlite --hidden-import=yaml"
  ["hybrid-studio"]="hybrid-studio|hybrid_studio_entry.py|axto-hybrid-studio|--hidden-import=httpx --hidden-import=aiosqlite --hidden-import=yaml"
)

TARGET="${1:-all}"

if [ "${TARGET}" = "all" ]; then
  KEYS=("guardian-core" "vault-enterprise" "sentinel-enterprise" "vault-lite" "soc" "compliance" "edge-agent" "sentinel-lite")
else
  KEYS=("${TARGET}")
fi

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║       AXTO — Build All EXE (PyInstaller)         ║"
echo "  ║       Runner: Windows VPN + GitBash              ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""
info "Python: $(python --version)"
info "PyInstaller: $(python -m PyInstaller --version)"
info "Output: ${OUT_DIR}"
echo ""

FAILED=()
for KEY in "${KEYS[@]}"; do
  IFS='|' read -r SRC_DIR ENTRY NAME EXTRA <<< "${PRODUCTS[$KEY]}"
  if [ -z "${SRC_DIR}" ]; then
    echo -e "${Y}⚠️  Unknown product: ${KEY} — skip${N}"
    continue
  fi
  build_exe "${KEY}" "${SRC_DIR}" "${ENTRY}" "${NAME}" "${EXTRA}" || FAILED+=("${KEY}")
done

echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │           AXTO EXE Build Summary                    │"
echo "  └─────────────────────────────────────────────────────┘"
ls -lh "${OUT_DIR}"/*.exe 2>/dev/null | awk '{print "  " $5 "  " $9}'
echo ""

if [ ${#FAILED[@]} -gt 0 ]; then
  err "Failed builds: ${FAILED[*]}"
fi
ok "All EXE builds complete → ${OUT_DIR}"
