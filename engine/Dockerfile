# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
FROM python:3.11-slim

LABEL org.opencontainers.image.source="https://github.com/your-org/guardian-ai"
LABEL org.opencontainers.image.title="AXTO Guardian Engine"
LABEL org.opencontainers.image.description="AXTO Guardian — AI-Powered Cybersecurity Engine"
LABEL org.opencontainers.image.licenses="Commercial"

# System deps:
#   gcc/g++/dev libs    : build psutil, asyncpg, cryptography, uvloop
#   python3-bcc         : eBPF kernel monitoring (CAP_BPF required at runtime)
#   libpcap0.8+libpcap-dev : packet capture
#   nftables            : advanced firewall enforcement
#   libmagic1+libmagic-dev : file-type detection (magic bytes)
#   iproute2+iptables   : network response (block IPs, rate-limit)
#   libcap2-bin         : capability management
#   procps strace       : process inspection
#   net-tools           : netstat / ifconfig for node agent
#   curl                : healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ python3-dev libssl-dev libffi-dev libpq-dev \
    libpcap0.8 libpcap-dev \
    nftables \
    libmagic1 libmagic-dev \
    curl procps iproute2 iptables libcap2-bin \
    strace \
    && apt-get install -y --no-install-recommends python3-bcc 2>/dev/null || true \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /guardian

COPY requirements.txt .

# Compile + install all Python deps, then strip build tools to keep image lean
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt \
 && apt-get purge -y gcc g++ python3-dev libssl-dev libffi-dev libpq-dev libpcap-dev libmagic-dev \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* /root/.cache/pip

COPY src/ ./src/

RUN mkdir -p /guardian/data /guardian/logs /guardian/config /guardian/quarantine /guardian/data/ml_models

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["python", "-m", "uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8080"]
