-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- AXTO Edge — PostgreSQL / SQLite Schema
-- Migration: 0001_init.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS usage (
    id              TEXT    PRIMARY KEY,
    ts              REAL    NOT NULL,
    api_key         TEXT    NOT NULL DEFAULT '',
    customer_id     TEXT    NOT NULL DEFAULT '',
    provider        TEXT    NOT NULL DEFAULT '',
    model           TEXT    NOT NULL DEFAULT '',
    prompt_tok      INTEGER NOT NULL DEFAULT 0,
    compl_tok       INTEGER NOT NULL DEFAULT 0,
    total_tok       INTEGER NOT NULL DEFAULT 0,
    cost_usd        REAL    NOT NULL DEFAULT 0.0,
    latency_ms      REAL    NOT NULL DEFAULT 0.0,
    cached          INTEGER NOT NULL DEFAULT 0,
    blocked         INTEGER NOT NULL DEFAULT 0,
    block_reason    TEXT    NOT NULL DEFAULT '',
    status          INTEGER NOT NULL DEFAULT 200,
    request_id      TEXT    NOT NULL DEFAULT '',
    fallback_used   INTEGER NOT NULL DEFAULT 0,
    fallback_from   TEXT    NOT NULL DEFAULT '',
    region          TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_usage_key     ON usage (api_key);
CREATE INDEX IF NOT EXISTS idx_usage_ts      ON usage (ts DESC);
CREATE INDEX IF NOT EXISTS idx_usage_cust    ON usage (customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_prov    ON usage (provider);
CREATE INDEX IF NOT EXISTS idx_usage_blocked ON usage (blocked) WHERE blocked = 1;

CREATE TABLE IF NOT EXISTS billing_daily (
    id              TEXT    PRIMARY KEY,
    customer_id     TEXT    NOT NULL,
    date            TEXT    NOT NULL,       -- YYYY-MM-DD
    total_tok       INTEGER NOT NULL DEFAULT 0,
    prompt_tok      INTEGER NOT NULL DEFAULT 0,
    compl_tok       INTEGER NOT NULL DEFAULT 0,
    cost_usd        REAL    NOT NULL DEFAULT 0.0,
    req_count       INTEGER NOT NULL DEFAULT 0,
    blocked_count   INTEGER NOT NULL DEFAULT 0,
    cache_hits      INTEGER NOT NULL DEFAULT 0,
    avg_latency_ms  REAL    NOT NULL DEFAULT 0.0,
    by_provider     TEXT    NOT NULL DEFAULT '{}',  -- JSON {provider: cost}
    by_model        TEXT    NOT NULL DEFAULT '{}',  -- JSON {model: tokens}
    created_at      REAL    NOT NULL,
    UNIQUE(customer_id, date)
);
CREATE INDEX IF NOT EXISTS idx_billing_cust  ON billing_daily (customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_date  ON billing_daily (date DESC);

CREATE TABLE IF NOT EXISTS customers (
    api_key         TEXT    PRIMARY KEY,
    customer_id     TEXT    NOT NULL,
    name            TEXT    NOT NULL DEFAULT '',
    email           TEXT    NOT NULL DEFAULT '',
    rpm             INTEGER NOT NULL DEFAULT 60,
    tpm             INTEGER NOT NULL DEFAULT 100000,
    tpd             INTEGER NOT NULL DEFAULT 2000000,
    budget_daily    REAL    NOT NULL DEFAULT 0.0,
    budget_monthly  REAL    NOT NULL DEFAULT 0.0,
    allowed_models  TEXT    NOT NULL DEFAULT '[]',   -- JSON, empty = all
    allowed_providers TEXT  NOT NULL DEFAULT '[]',
    active          INTEGER NOT NULL DEFAULT 1,
    created_at      REAL    NOT NULL,
    last_seen       REAL
);
CREATE INDEX IF NOT EXISTS idx_cust_id   ON customers (customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_act  ON customers (active);

CREATE TABLE IF NOT EXISTS blocked_keys (
    api_key         TEXT    PRIMARY KEY,
    reason          TEXT    NOT NULL DEFAULT '',
    blocked_at      REAL    NOT NULL,
    auto_unblock_at REAL,
    blocked_by      TEXT    NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT    PRIMARY KEY,
    ts          REAL    NOT NULL,
    event_type  TEXT    NOT NULL,   -- request|block|rate_limit|circuit_open|...
    api_key     TEXT    NOT NULL DEFAULT '',
    detail      TEXT    NOT NULL DEFAULT '{}',
    hash_chain  TEXT    NOT NULL DEFAULT '',
    ip_address  TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_edge_audit_ts  ON audit_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_edge_audit_key ON audit_log (api_key);

CREATE TABLE IF NOT EXISTS provider_health (
    provider        TEXT    PRIMARY KEY,
    last_success    REAL    NOT NULL DEFAULT 0,
    last_failure    REAL    NOT NULL DEFAULT 0,
    error_count     INTEGER NOT NULL DEFAULT 0,
    circuit_open    INTEGER NOT NULL DEFAULT 0,
    circuit_opened_at REAL,
    avg_latency_ms  REAL    NOT NULL DEFAULT 0.0,
    p95_latency_ms  REAL    NOT NULL DEFAULT 0.0,
    total_requests  INTEGER NOT NULL DEFAULT 0,
    total_errors    INTEGER NOT NULL DEFAULT 0,
    uptime_pct      REAL    NOT NULL DEFAULT 100.0
);

CREATE TABLE IF NOT EXISTS cache_stats (
    ts          REAL    NOT NULL,
    entries     INTEGER NOT NULL DEFAULT 0,
    valid       INTEGER NOT NULL DEFAULT 0,
    hits        INTEGER NOT NULL DEFAULT 0,
    hit_rate    REAL    NOT NULL DEFAULT 0.0,
    size_bytes  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cache_ts ON cache_stats (ts DESC);
