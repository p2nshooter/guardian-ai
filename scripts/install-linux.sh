#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "=== AXTO Platform — Linux Installer ==="
chmod +x "${DIR}"/* 2>/dev/null || true
for bin in "${DIR}"/*; do
  [[ -x "$bin" && ! "$bin" == *.sh && ! "$bin" == *.log ]] || continue
  name=$(basename "$bin")
  if command -v systemctl &>/dev/null; then
    cat > "/etc/systemd/system/axto-${name}.service" << SVC
[Unit]
Description=AXTO ${name}
After=network.target
[Service]
ExecStart=${bin}
WorkingDirectory=${DIR}
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
SVC
    systemctl daemon-reload
    systemctl enable "axto-${name}"
    systemctl start "axto-${name}"
    echo "  Started: ${name} (systemd)"
  else
    nohup "$bin" > "${DIR}/${name}.log" 2>&1 &
    echo "  Started: ${name} (background)"
  fi
done
echo ""
echo "Dashboard: http://$(hostname -I | awk '{print $1}'):8080"
echo "Enter your license key when prompted."
