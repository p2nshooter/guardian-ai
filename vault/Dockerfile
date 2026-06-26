# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
FROM python:3.11-slim

LABEL org.opencontainers.image.title="AXTO Vault Engine"
LABEL org.opencontainers.image.description="AXTO Vault — AI Privacy Layer: Auto-redact PII/PHI/Financial data from AI requests"
LABEL org.opencontainers.image.licenses="Commercial"
LABEL io.axto.product="vault"
LABEL io.axto.version="1.0.0"

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ python3-dev libssl-dev libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /vault

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt \
 && apt-get purge -y gcc g++ python3-dev libssl-dev libffi-dev \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* /root/.cache/pip

COPY src/ ./src/

RUN mkdir -p /vault/data /vault/logs /vault/config /vault/data/policies

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["python", "-m", "uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8080"]
