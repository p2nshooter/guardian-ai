#!/usr/bin/env bash
# ==============================================================================
# AXTO v3 — full end-to-end run on a FRESH local Cloudflare runtime:
# build → clean state → serve (local D1/KV/R2) → API + browser tests → stop.
#   Usage: bash tests/e2e/run.sh [--no-build]
# ==============================================================================
set -uo pipefail
cd "$(dirname "$0")/../.."
LOG=".e2e-state-serve.log"
if [ "${1:-}" != "--no-build" ]; then
  { npx @cloudflare/next-on-pages && node scripts/patch-worker.mjs; } > .e2e-build.log 2>&1 || { tail -40 .e2e-build.log; exit 1; }
fi
bash tests/e2e/stop-local.sh
rm -rf .e2e-state
bash tests/e2e/serve-local.sh > "$LOG" 2>&1 &
for i in $(seq 1 90); do
  curl -s http://127.0.0.1:8788/api/health 2>/dev/null | grep -q '"jwt":true' && break
  sleep 2
done
curl -s http://127.0.0.1:8788/api/health | grep -q '"jwt":true' || { echo "server did not start"; tail -40 "$LOG"; bash tests/e2e/stop-local.sh; exit 1; }
npx tsx --test --test-concurrency=1 tests/e2e/*.e2e.ts
CODE=$?
bash tests/e2e/stop-local.sh
exit $CODE
