FROM python:3.11-slim

LABEL org.opencontainers.image.source="https://github.com/p2nshooter/guardian-ai"
LABEL org.opencontainers.image.title="AXTO Guardian Engine"
LABEL org.opencontainers.image.description="AXTO Guardian — AI-Powered Cybersecurity Engine"
LABEL org.opencontainers.image.licenses="Commercial"

# Install system deps + build tools (needed for psutil, asyncpg, cryptography, uvloop)
# Build tools are removed after pip install to keep image lean
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ python3-dev libssl-dev libffi-dev libpq-dev \
    curl procps iproute2 iptables libcap2-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /guardian

COPY requirements.txt .

# Compile and install all Python deps, then strip build tools
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt \
 && apt-get purge -y gcc g++ python3-dev libssl-dev libffi-dev libpq-dev \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* /root/.cache/pip

COPY src/ ./src/

RUN mkdir -p /guardian/data /guardian/logs /guardian/config /guardian/quarantine

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["python", "-m", "uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8080"]
