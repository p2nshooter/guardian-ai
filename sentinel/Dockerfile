# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
FROM python:3.11-slim
LABEL org.opencontainers.image.title="AXTO Sentinel Engine"
LABEL org.opencontainers.image.description="AXTO Sentinel — IoT/OT Security: Device discovery, OT protocol detection, CVE tracking, risk scoring"
LABEL org.opencontainers.image.licenses="Commercial"
LABEL io.axto.product="sentinel"
LABEL io.axto.version="1.0.0"
RUN apt-get update && apt-get install -y --no-install-recommends gcc g++ curl && rm -rf /var/lib/apt/lists/*
WORKDIR /sentinel
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt && apt-get purge -y gcc g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* /root/.cache/pip
COPY src/ ./src/
RUN mkdir -p /sentinel/data /sentinel/logs
EXPOSE 8087
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD curl -f http://localhost:8087/health || exit 1
CMD ["python", "-m", "uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8087"]
