FROM python:3.11-slim

LABEL org.opencontainers.image.source="https://github.com/p2nshooter/guardian-ai"
LABEL org.opencontainers.image.title="AXTO Orchestra Core"
LABEL org.opencontainers.image.description="AXTO Orchestra — AI Workload Orchestration Engine"
LABEL org.opencontainers.image.licenses="Commercial"

# Build tools needed for: psutil, cryptography, uvloop, asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ python3-dev libssl-dev libffi-dev libpq-dev \
    curl procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps and strip build tools afterward
COPY orchestra_core/requirements.txt ./requirements-core.txt
COPY orchestra_worker/requirements.txt ./requirements-worker.txt

RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements-core.txt \
 && pip install --no-cache-dir -r requirements-worker.txt \
 && apt-get purge -y gcc g++ python3-dev libssl-dev libffi-dev libpq-dev \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* /root/.cache/pip

COPY orchestra_core/ ./orchestra_core/
COPY orchestra_worker/ ./orchestra_worker/

RUN mkdir -p /app/data /app/logs /app/console

WORKDIR /app/orchestra_core

EXPOSE 8080

ENV ORCHESTRA_HOST=0.0.0.0
ENV ORCHESTRA_PORT=8080
ENV ORCHESTRA_LOG_LEVEL=INFO

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
