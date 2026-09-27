#!/usr/bin/env bash
# ==============================================================================
# Builds AXTO Setup. The compose files and example configs from the repo root
# are embedded (bundle/) so the installer always ships the exact files CI tests.
#   bash installer/build.sh [version]   → dist/AXTO-Setup.exe, dist/axto-setup-linux-amd64, …
# ==============================================================================
set -euo pipefail
cd "$(dirname "$0")"
VERSION="${1:-3.0.0}"
rm -rf bundle && mkdir -p bundle dist
for f in docker-compose.yml orchestra-compose.yml vault-compose.yml edge-compose.yml soc-compose.yml \
         compliance-compose.yml sentinel-compose.yml antivirus-compose.yml studio-compose.yml legal-compose.yml \
         guardian.example.yml orchestra.example.yml vault.example.yml edge.example.yml soc.example.yml \
         compliance.example.yml sentinel.example.yml antivirus.example.yml studio.example.yml legal.env.example; do
  cp "../$f" "bundle/$f"
done
LDFLAGS="-s -w -X main.Version=${VERSION}"
go vet ./...
go test ./...
# Windows: GUI subsystem (no console window); the wizard opens in the browser.
[ -f rsrc_windows_amd64.syso ] || echo "note: no Windows resource file (icon/version info) — run go-winres in CI"
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "${LDFLAGS} -H=windowsgui" -o dist/AXTO-Setup.exe .
GOOS=linux   GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "${LDFLAGS}" -o dist/axto-setup-linux-amd64 .
GOOS=linux   GOARCH=arm64 CGO_ENABLED=0 go build -trimpath -ldflags "${LDFLAGS}" -o dist/axto-setup-linux-arm64 .
GOOS=darwin  GOARCH=arm64 CGO_ENABLED=0 go build -trimpath -ldflags "${LDFLAGS}" -o dist/axto-setup-macos-arm64 .
ls -lh dist/
