#!/usr/bin/env bash
# ==============================================================================
# AXTO v3 — local end-to-end server.
# Runs the next-on-pages build with LOCAL D1 / KV / R2 (miniflare) and test
# secrets. Workers AI is omitted (Managed AI is locked; BYOX never uses it).
#   Usage: bash tests/e2e/serve-local.sh [state_dir] [port]
# ==============================================================================
set -euo pipefail
cd "$(dirname "$0")/../.."
STATE="${1:-.e2e-state}"
PORT="${2:-8788}"
WORK="$STATE/site"
mkdir -p "$WORK"
# Same bindings as wrangler.toml, minus the remote-only Workers AI binding.
sed '/^\[ai\]/,/^binding = "AI"/d' wrangler.toml | sed 's#pages_build_output_dir = ".vercel/output/static"#pages_build_output_dir = "static"#' > "$WORK/wrangler.toml"
rm -rf "$WORK/static" && cp -r .vercel/output/static "$WORK/static"
cp -r cf-migrations "$WORK/cf-migrations"
# Separate control dir for `wrangler d1 execute` (tests) so the dev server never sees file churn.
CTL="$STATE/d1ctl"; mkdir -p "$CTL"; cp "$WORK/wrangler.toml" "$CTL/wrangler.toml"; rm -rf "$CTL/cf-migrations"; cp -r cf-migrations "$CTL/cf-migrations"
cat > "$WORK/.dev.vars" <<VARS
JWT_SECRET=e2e-jwt-secret-0123456789abcdef0123456789abcdef
ENCRYPTION_KEY=$(printf '0%.0s' {1..64})
ADMIN_PASSWORD=e2e-admin-Pass-2026
CRON_SECRET=e2e-cron-secret
ALLOW_INSECURE_ENDPOINTS=1
# TEST-ONLY Ed25519 key (public half in tests/e2e/api.e2e.ts). Never trusted by engines.
LICENSE_SIGNING_PRIVATE_KEY_B64=TNo9bCSB4MG26GMf8QyIEqBNHVsHoDeHh15U0xMxpBE=
NEXT_PUBLIC_APP_URL=http://localhost:${PORT}
# TEST-ONLY: Sandbox PayPal goes to the local stand-in (tests/e2e/paypal-mock.ts). Live is never redirected.
PAYPAL_SANDBOX_API=http://127.0.0.1:8899
VARS
(cd "$CTL" && CI=1 WRANGLER_SEND_METRICS=false npx wrangler d1 migrations apply axto-db --local --persist-to ../persist >/dev/null)
cd "$WORK"
# --log-level info logs one line per request, so a request that hangs is named in the CI log.
# Pass every var explicitly as well (pages dev + wrangler.toml [vars] can shadow .dev.vars).
BINDINGS=()
while IFS= read -r line; do [ -n "$line" ] && BINDINGS+=(--binding "$line"); done < .dev.vars
exec env CI=1 WRANGLER_SEND_METRICS=false npx wrangler pages dev static --port "$PORT" --persist-to ../persist --ip 127.0.0.1 --log-level info "${BINDINGS[@]}"
