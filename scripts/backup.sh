#!/usr/bin/env bash
# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
# AXTO 5 Products — Backup Script
# Backs up all product data volumes and config files
# Usage: bash backup.sh [/path/to/backup/dir]
set -euo pipefail

BACKUP_DIR="${1:-/opt/axto-backups/$(date +%Y%m%d_%H%M%S)}"
PRODUCTS=(vault soc compliance edge sentinel)

echo "=== AXTO Platform Backup ==="
echo "Destination: ${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}"

for PROD in "${PRODUCTS[@]}"; do
    INSTALL_DIR="/opt/axto-${PROD}"
    echo ""
    echo "[${PROD}] Backing up..."

    # Backup config
    if [[ -f "${INSTALL_DIR}/${PROD}.yml" ]]; then
        cp "${INSTALL_DIR}/${PROD}.yml" "${BACKUP_DIR}/${PROD}.yml"
        echo "  ✓ Config: ${PROD}.yml"
    fi

    # Backup SQLite DB
    DB_PATH="${INSTALL_DIR}/data/${PROD}.db"
    if [[ -f "${DB_PATH}" ]]; then
        # Use SQLite online backup (safe with running DB)
        sqlite3 "${DB_PATH}" ".backup ${BACKUP_DIR}/${PROD}-backup.db"
        echo "  ✓ SQLite DB: ${PROD}-backup.db ($(du -sh "${BACKUP_DIR}/${PROD}-backup.db" | cut -f1))"
    fi

    # Backup Docker volume (if tier2 PostgreSQL)
    CONTAINER="axto-${PROD}-postgres"
    if docker ps --format "{{.Names}}" | grep -q "^${CONTAINER}$"; then
        docker exec "${CONTAINER}" pg_dump -U "${PROD}" "${PROD}" | gzip > "${BACKUP_DIR}/${PROD}-postgres.sql.gz"
        echo "  ✓ PostgreSQL: ${PROD}-postgres.sql.gz"
    fi
done

# Create manifest
python3 -c "
import json, os, time
files = os.listdir('${BACKUP_DIR}')
manifest = {
    'created_at': time.time(),
    'backup_dir': '${BACKUP_DIR}',
    'files': files,
    'products': ['vault','soc','compliance','edge','sentinel'],
    'axto_version': '1.0.0',
}
open('${BACKUP_DIR}/manifest.json','w').write(json.dumps(manifest, indent=2))
print('  ✓ Manifest written')
"

echo ""
echo "=== Backup Complete ==="
echo "Location: ${BACKUP_DIR}"
echo "Size: $(du -sh "${BACKUP_DIR}" | cut -f1)"
echo ""
echo "To restore: bash restore.sh ${BACKUP_DIR}"
