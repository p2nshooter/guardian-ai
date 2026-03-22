#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "=== AXTO Platform — Loading Docker images ==="
for f in "${DIR}"/*.tar.gz; do
  [ -f "$f" ] || continue
  echo "  Loading $(basename $f)..."
  docker load < "$f"
done
[ ! -f "${DIR}/.env" ] && \
  printf "GUARDIAN_DB_PASSWORD=%s\nORCHESTRA_DB_PASSWORD=%s\nWORKER_TOKEN=%s\n" \
    "$(openssl rand -hex 16)" "$(openssl rand -hex 16)" "$(openssl rand -hex 24)" \
    > "${DIR}/.env" && echo "  .env generated"
echo ""
echo "All images loaded!"
echo "Run: docker compose up -d"
echo "Dashboard: http://$(hostname -I | awk '{print $1}'):8080"
echo "Enter your license key when prompted."
