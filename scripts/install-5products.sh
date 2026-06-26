#!/usr/bin/env bash
# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
# ============================================================
# AXTO 5 Products — Universal Install Script
# Works for: vault | soc | compliance | edge | sentinel
#
# Usage:
#   sudo bash install.sh              # auto-detect product from directory
#   sudo bash install.sh vault        # explicit product
#   sudo bash install.sh all          # install all 5
#
# What this does:
#   1. Detect OS (Ubuntu/Debian/RHEL/CentOS/Arch)
#   2. Install Docker + Docker Compose if missing
#   3. Load pre-bundled Docker images from .tar.gz (offline)
#   4. Configure systemd service for auto-start
#   5. Set up log rotation
#   6. Open required firewall ports
#   7. Print access URL + next steps
#
# Compatible: Linux (Ubuntu 20+, Debian 11+, RHEL 8+, CentOS 8+)
# Requires:   bash 4+, curl, 4GB RAM minimum, 20GB disk
# ============================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Product Catalog ───────────────────────────────────────────────────────────
declare -A PRODUCT_PORT=([vault]=8091 [soc]=8092 [compliance]=8093 [edge]=8094 [sentinel]=8095)
declare -A PRODUCT_NAME=([vault]="AXTO Vault" [soc]="AXTO SOC" [compliance]="AXTO Compliance" [edge]="AXTO Edge" [sentinel]="AXTO Sentinel")
declare -A PRODUCT_DESC=([vault]="Privacy Intelligence Engine" [soc]="Security Operations Center" [compliance]="Automated Audit Platform" [edge]="AI Gateway & API Management" [sentinel]="IoT/OT Security")
declare -A PRODUCT_ENV=([vault]=VAULT [soc]=SOC [compliance]=COMPLIANCE [edge]=EDGE [sentinel]=SENTINEL)

# ── Logging ───────────────────────────────────────────────────────────────────
log()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*" >&2; }
info()  { echo -e "${BLUE}[i]${NC} $*"; }
step()  { echo -e "\n${CYAN}${BOLD}── $* ──────────────────────────────────────${NC}"; }

# ── Root check ────────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    error "Run as root: sudo bash install.sh"
    exit 1
fi

# ── Determine which product to install ───────────────────────────────────────
PRODUCT="${1:-auto}"
if [[ "$PRODUCT" == "auto" ]]; then
    # Detect from current directory name
    DIRNAME="$(basename "$(pwd)")"
    for p in vault soc compliance edge sentinel; do
        if [[ "$DIRNAME" == *"$p"* ]]; then
            PRODUCT="$p"; break
        fi
    done
    # Check if tar.gz files exist
    if [[ "$PRODUCT" == "auto" ]]; then
        for p in vault soc compliance edge sentinel; do
            if ls ./*${p}*.tar.gz 2>/dev/null | head -1 | grep -q .; then
                PRODUCT="$p"; break
            fi
        done
    fi
    if [[ "$PRODUCT" == "auto" ]]; then
        error "Cannot auto-detect product. Run: sudo bash install.sh <product>"
        echo "Available: vault | soc | compliance | edge | sentinel | all"
        exit 1
    fi
fi

INSTALL_ALL=false
if [[ "$PRODUCT" == "all" ]]; then
    INSTALL_ALL=true
    PRODUCTS_TO_INSTALL=(vault soc compliance edge sentinel)
else
    PRODUCTS_TO_INSTALL=("$PRODUCT")
fi

# ── System Requirements Check ─────────────────────────────────────────────────
step "System Requirements Check"

# RAM
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))
if [[ $TOTAL_RAM_GB -lt 2 ]]; then
    warn "Low RAM: ${TOTAL_RAM_GB}GB detected. Minimum 2GB recommended per product."
else
    log "RAM: ${TOTAL_RAM_GB}GB available"
fi

# Disk
DISK_FREE_GB=$(df -BG / | awk 'NR==2{print $4}' | tr -d 'G')
if [[ "${DISK_FREE_GB:-0}" -lt 10 ]]; then
    warn "Low disk: ${DISK_FREE_GB}GB free. Minimum 10GB recommended."
else
    log "Disk: ${DISK_FREE_GB}GB free"
fi

# CPU
CPU_CORES=$(nproc)
log "CPU: ${CPU_CORES} cores"

# OS detection
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME="${NAME:-Linux}"
    OS_VER="${VERSION_ID:-}"
    log "OS: ${OS_NAME} ${OS_VER}"
else
    OS_NAME="Linux"
fi

# ── Docker Installation ───────────────────────────────────────────────────────
step "Docker Installation"

install_docker_ubuntu() {
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
}

install_docker_rhel() {
    yum install -y -q yum-utils
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    yum install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
}

if ! command -v docker &>/dev/null; then
    info "Installing Docker..."
    case "$OS_NAME" in
        *Ubuntu*|*Debian*|*Mint*) install_docker_ubuntu ;;
        *CentOS*|*RHEL*|*Rocky*|*Alma*) install_docker_rhel ;;
        *) 
            info "Attempting generic Docker install via get.docker.com..."
            curl -fsSL https://get.docker.com | sh
            ;;
    esac
    systemctl enable docker
    systemctl start docker
    log "Docker installed"
else
    DOCKER_VER=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
    log "Docker already installed: v${DOCKER_VER}"
fi

# Verify Docker Compose
if ! docker compose version &>/dev/null; then
    info "Installing Docker Compose plugin..."
    COMPOSE_VER="v2.24.0"
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VER}/docker-compose-linux-$(uname -m)" \
         -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    log "Docker Compose installed"
fi

# ── Install each product ──────────────────────────────────────────────────────
for PROD in "${PRODUCTS_TO_INSTALL[@]}"; do
    step "Installing ${PRODUCT_NAME[$PROD]} — ${PRODUCT_DESC[$PROD]}"

    PORT="${PRODUCT_PORT[$PROD]}"
    ENV_PREFIX="${PRODUCT_ENV[$PROD]}"
    INSTALL_DIR="/opt/axto-${PROD}"
    SERVICE_NAME="axto-${PROD}"

    # Create install directory
    mkdir -p "${INSTALL_DIR}"/{data,logs,config}
    cd "${INSTALL_DIR}"

    # ── Copy config if not already present ───────────────────────────────────
    if [[ ! -f "${INSTALL_DIR}/${PROD}.yml" ]]; then
        # Look for config in script directory
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [[ -f "${SCRIPT_DIR}/${PROD}.yml" ]]; then
            cp "${SCRIPT_DIR}/${PROD}.yml" "${INSTALL_DIR}/${PROD}.yml"
            log "Config copied to ${INSTALL_DIR}/${PROD}.yml"
        elif [[ -f "${SCRIPT_DIR}/configs/${PROD}.yml" ]]; then
            cp "${SCRIPT_DIR}/configs/${PROD}.yml" "${INSTALL_DIR}/${PROD}.yml"
        else
            warn "Config not found. Creating minimal config at ${INSTALL_DIR}/${PROD}.yml"
            cat > "${INSTALL_DIR}/${PROD}.yml" << CFEOF
${PROD}:
  license_key: "$(echo "${PROD^^}" | cut -c1-4)-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  license_validate_url: "https://axto.io/api/license-validate"
  db_path: "/${PROD}/data/${PROD}.db"
CFEOF
        fi
    fi

    # ── Load Docker image (offline or pull) ───────────────────────────────────
    TARFILE=""
    # Search current dir and script dir for .tar.gz
    for SEARCH_DIR in "$(pwd)" "${SCRIPT_DIR:-/opt}" "/tmp"; do
        if ls "${SEARCH_DIR}"/*${PROD}*.tar.gz 2>/dev/null | head -1 | grep -q .; then
            TARFILE="$(ls "${SEARCH_DIR}"/*${PROD}*.tar.gz | head -1)"
            break
        fi
    done

    if [[ -n "${TARFILE}" ]]; then
        info "Loading image from ${TARFILE} (offline install)..."
        docker load -i "${TARFILE}"
        log "Image loaded: $(du -sh "${TARFILE}" | cut -f1)"
    else
        info "Pulling image from registry..."
        # Try GitLab first, fall back to GHCR
        if docker pull "registry.gitlab.com/axto-platform/${PROD}-engine/${PROD}-engine:latest" 2>/dev/null; then
            docker tag "registry.gitlab.com/axto-platform/${PROD}-engine/${PROD}-engine:latest" \
                       "axto/${PROD}-engine:latest"
            log "Pulled from GitLab CR"
        elif docker pull "ghcr.io/your-org/${PROD}-engine:latest" 2>/dev/null; then
            docker tag "ghcr.io/your-org/${PROD}-engine:latest" "axto/${PROD}-engine:latest"
            log "Pulled from GHCR"
        else
            error "Cannot pull image for ${PROD}. Provide .tar.gz or configure registry authentication."
            exit 1
        fi
    fi

    # ── Write docker-compose.yml ───────────────────────────────────────────────
    cat > "${INSTALL_DIR}/docker-compose.yml" << DCEOF
version: "3.9"
services:
  ${PROD}-core:
    image: registry.gitlab.com/axto-platform/${PROD}-engine/${PROD}-engine:latest
    container_name: axto-${PROD}
    restart: unless-stopped
    ports:
      - "${PORT}:${PORT}"
    volumes:
      - ./${PROD}.yml:/${PROD}/config/${PROD}.yml:ro
      - ${PROD}-data:/${PROD}/data
      - ${PROD}-logs:/${PROD}/logs
    environment:
      - ${ENV_PREFIX}_CONFIG=/${PROD}/config/${PROD}.yml
      - ${ENV_PREFIX}_PORT=${PORT}
    healthcheck:
      test: ["CMD","curl","-sf","http://localhost:${PORT}/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "5"
volumes:
  ${PROD}-data:
  ${PROD}-logs:
DCEOF

    # ── Create systemd service ─────────────────────────────────────────────────
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" << SVCEOF
[Unit]
Description=AXTO ${PRODUCT_NAME[$PROD]} - ${PRODUCT_DESC[$PROD]}
Documentation=https://axto.io/docs/${PROD}
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStartPre=/usr/bin/docker compose pull --quiet
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose stop
ExecReload=/usr/bin/docker compose restart
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
SVCEOF

    # ── Log rotation ──────────────────────────────────────────────────────────
    cat > "/etc/logrotate.d/${SERVICE_NAME}" << LREOF
${INSTALL_DIR}/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        docker compose -f ${INSTALL_DIR}/docker-compose.yml restart ${PROD}-core 2>/dev/null || true
    endscript
}
LREOF

    # ── Firewall port opening ─────────────────────────────────────────────────
    if command -v ufw &>/dev/null; then
        ufw allow "${PORT}/tcp" comment "AXTO ${PRODUCT_NAME[$PROD]}" 2>/dev/null || true
        log "UFW: port ${PORT} opened"
    elif command -v firewall-cmd &>/dev/null; then
        firewall-cmd --permanent --add-port="${PORT}/tcp" 2>/dev/null || true
        firewall-cmd --reload 2>/dev/null || true
        log "Firewalld: port ${PORT} opened"
    fi

    # ── Start service ─────────────────────────────────────────────────────────
    systemctl daemon-reload
    systemctl enable "${SERVICE_NAME}"
    
    cd "${INSTALL_DIR}"
    docker compose up -d

    # Wait for healthy
    info "Waiting for ${PRODUCT_NAME[$PROD]} to start..."
    ATTEMPTS=0
    while [[ $ATTEMPTS -lt 30 ]]; do
        if curl -sf "http://localhost:${PORT}/health" &>/dev/null; then
            log "${PRODUCT_NAME[$PROD]} is healthy ✓"
            break
        fi
        ATTEMPTS=$((ATTEMPTS+1))
        sleep 2
    done

    if ! curl -sf "http://localhost:${PORT}/health" &>/dev/null; then
        warn "${PRODUCT_NAME[$PROD]} did not become healthy in 60s. Check logs:"
        warn "  docker logs axto-${PROD}"
    fi

    # ── Print product info ────────────────────────────────────────────────────
    echo ""
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ${PRODUCT_NAME[$PROD]} — INSTALLED SUCCESSFULLY${NC}"
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════${NC}"
    echo -e "  ${BOLD}URL:${NC}        http://$(hostname -I | awk '{print $1}'):${PORT}"
    echo -e "  ${BOLD}Health:${NC}     http://$(hostname -I | awk '{print $1}'):${PORT}/health"
    echo -e "  ${BOLD}Config:${NC}     ${INSTALL_DIR}/${PROD}.yml"
    echo -e "  ${BOLD}Data:${NC}       ${INSTALL_DIR}/data/"
    echo -e "  ${BOLD}Logs:${NC}       docker logs axto-${PROD} -f"
    echo -e "  ${BOLD}Service:${NC}    systemctl {start|stop|restart|status} ${SERVICE_NAME}"
    echo ""
    echo -e "  ${YELLOW}${BOLD}NEXT STEP:${NC} Edit ${INSTALL_DIR}/${PROD}.yml"
    echo -e "  ${YELLOW}         Set license_key from: https://axto.io/portal${NC}"
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════${NC}"
done

# ── Summary ───────────────────────────────────────────────────────────────────
if [[ "${#PRODUCTS_TO_INSTALL[@]}" -gt 1 ]]; then
    step "Installation Complete — All Products"
    for P in "${PRODUCTS_TO_INSTALL[@]}"; do
        STATUS=$(curl -sf "http://localhost:${PRODUCT_PORT[$P]}/health" 2>/dev/null \
                 | grep -o '"status":"ok"' | head -1 && echo "✓ Running" || echo "⚠ Check logs")
        printf "  %-12s  Port %-5s  %s\n" "${PRODUCT_NAME[$P]}" "${PRODUCT_PORT[$P]}" "${STATUS}"
    done
fi

echo ""
echo -e "${BLUE}📖 Full documentation: https://axto.io/docs${NC}"
echo -e "${BLUE}🔑 License portal:     https://axto.io/portal${NC}"
echo -e "${BLUE}💬 Support:            hallo@axto.io${NC}"
