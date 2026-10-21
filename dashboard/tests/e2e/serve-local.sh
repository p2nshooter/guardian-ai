#!/usr/bin/env bash
# ==============================================================================
# AXTO v3 — local end-to-end server.
# Runs the next-on-pages build with LOCAL R2 / KV (miniflare) and test secrets.
# The local D1 gets the old schema plus a few "legacy" rows, so every run moves
# real records from D1 to R2 the way production did (tests/e2e/migration.e2e.ts).
# Workers AI is omitted (Managed AI is locked; BYOX never uses it).
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
# Separate control dir for `wrangler d1|r2 … --local` (setup and tests) so the dev server never sees file churn.
# The old D1 schema (cf-migrations, frozen: nothing new is ever added) builds the legacy database.
CTL="$STATE/ctl"; mkdir -p "$CTL"; sed 's#^database_id .*#&\nmigrations_dir = "cf-migrations"#' "$WORK/wrangler.toml" > "$CTL/wrangler.toml"; rm -rf "$CTL/cf-migrations"; cp -r cf-migrations "$CTL/cf-migrations"
cat > "$WORK/.dev.vars" <<VARS
JWT_SECRET=e2e-jwt-secret-0123456789abcdef0123456789abcdef
ENCRYPTION_KEY=$(printf '0%.0s' {1..64})
ADMIN_PASSWORD=e2e-admin-Pass-2026
CRON_SECRET=e2e-cron-secret
ALLOW_INSECURE_ENDPOINTS=1
# TEST-ONLY: /api/test/data (lib/test-data.ts) — local runtime only, never set in Cloudflare.
E2E_TEST_DATA=1
# TEST-ONLY Ed25519 key (public half in tests/e2e/api.e2e.ts). Never trusted by engines.
LICENSE_SIGNING_PRIVATE_KEY_B64=TNo9bCSB4MG26GMf8QyIEqBNHVsHoDeHh15U0xMxpBE=
NEXT_PUBLIC_APP_URL=http://localhost:${PORT}
# TEST-ONLY: Sandbox PayPal goes to the local stand-in (tests/e2e/paypal-mock.ts). Live is never redirected.
PAYPAL_SANDBOX_API=http://127.0.0.1:8899
VARS
(cd "$CTL" && CI=1 WRANGLER_SEND_METRICS=false npx wrangler d1 migrations apply axto-db --local --persist-to ../persist >/dev/null)
# Legacy records the one-time move must carry over (checked by tests/e2e/migration.e2e.ts).
(cd "$CTL" && CI=1 WRANGLER_SEND_METRICS=false npx wrangler d1 execute axto-db --local --persist-to ../persist --command "
  INSERT INTO users (id, email, role, password_hash, name, organization, country, status, created_at, updated_at)
    VALUES ('legacy-user-1', 'legacy-member@example.com', 'client', '', 'Legacy Member', 'Old Co', 'ID', 'active', '2026-01-02 03:04:05', '2026-01-02 03:04:05');
  INSERT INTO subscriptions (user_id, plan, cycle, status, current_period_start, current_period_end, created_at, updated_at)
    VALUES ('legacy-user-1', 'pro', 'yearly', 'active', '2026-01-02T03:04:05.000Z', '2099-01-02T03:04:05.000Z', '2026-01-02 03:04:05', '2026-01-02 03:04:05');
  INSERT INTO orders (id, invoice_no, user_id, email, plan, cycle, amount_usd, currency, gateway, status, meta, created_at, paid_at)
    VALUES ('ord_legacy_1', 'AXTO-2026-000001', 'legacy-user-1', 'legacy-member@example.com', 'pro', 'yearly', 490, 'USD', 'manual', 'paid', '{\"env\":\"live\"}', '2026-01-02 03:04:05', '2026-01-02 03:05:00');
  INSERT INTO platform_config (key, value, updated_at) VALUES ('e2e_legacy_setting', 'carried-over', '2026-01-02 03:04:05');
" >/dev/null)
cd "$WORK"
# --log-level info logs one line per request, so a request that hangs is named in the CI log.
# Pass every var explicitly as well (pages dev + wrangler.toml [vars] can shadow .dev.vars).
BINDINGS=()
while IFS= read -r line; do [ -n "$line" ] && BINDINGS+=(--binding "$line"); done < .dev.vars
exec env CI=1 WRANGLER_SEND_METRICS=false npx wrangler pages dev static --port "$PORT" --persist-to ../persist --ip 127.0.0.1 --log-level info "${BINDINGS[@]}"
