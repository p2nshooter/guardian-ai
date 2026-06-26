-- ==============================================================================
-- Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Author & Architect: Yusron Efendi <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- AXTO Vault — PostgreSQL Schema (Tier 2 / Production)
-- Migration: 0001_init.sql
-- SQLite-compatible schema also used in Tier 1 (aiosqlite)
-- ============================================================

-- Enable extensions (PostgreSQL only)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Scan Log ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_log (
    id           TEXT        PRIMARY KEY,
    ts           REAL        NOT NULL,
    text_length  INTEGER     NOT NULL DEFAULT 0,
    pii_count    INTEGER     NOT NULL DEFAULT 0,
    risk_score   REAL        NOT NULL DEFAULT 0.0,
    frameworks   TEXT        NOT NULL DEFAULT '[]',   -- JSON array
    violations   TEXT        NOT NULL DEFAULT '[]',   -- JSON array
    scan_ms      REAL        NOT NULL DEFAULT 0.0,
    strategy     TEXT        NOT NULL DEFAULT 'redact',
    actor        TEXT        NOT NULL DEFAULT 'api',
    hash_chain   TEXT        NOT NULL DEFAULT '',
    created_at   REAL        NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_scan_ts        ON scan_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_scan_actor     ON scan_log (actor);
CREATE INDEX IF NOT EXISTS idx_scan_risk      ON scan_log (risk_score DESC);

-- ── Token Vault ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_vault (
    token           TEXT    PRIMARY KEY,
    pii_type        TEXT    NOT NULL,
    created_at      REAL    NOT NULL,
    accessed_at     REAL,
    access_count    INTEGER NOT NULL DEFAULT 0,
    expires_at      REAL,               -- NULL = never
    customer_id     TEXT    NOT NULL DEFAULT '',
    revoked         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_token_type     ON token_vault (pii_type);
CREATE INDEX IF NOT EXISTS idx_token_cust     ON token_vault (customer_id);
CREATE INDEX IF NOT EXISTS idx_token_exp      ON token_vault (expires_at) WHERE expires_at IS NOT NULL;

-- ── Audit Log (immutable, hash-chained) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT    PRIMARY KEY,
    ts          REAL    NOT NULL,
    event_type  TEXT    NOT NULL,   -- scan|detokenize|erasure_request|key_rotation|...
    meta        TEXT    NOT NULL DEFAULT '{}',   -- JSON
    hash_chain  TEXT    NOT NULL,
    actor       TEXT    NOT NULL DEFAULT 'system',
    ip_address  TEXT    NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_audit_ts       ON audit_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event    ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_log (actor);

-- ── Data Subjects (GDPR/PDPA right management) ───────────────────────────────
CREATE TABLE IF NOT EXISTS data_subjects (
    id                   TEXT    PRIMARY KEY,
    identifier_hash      TEXT    UNIQUE NOT NULL,   -- SHA-256 of email/ID
    first_seen           REAL    NOT NULL,
    last_seen            REAL    NOT NULL,
    consent_status       TEXT    NOT NULL DEFAULT 'unknown',  -- unknown|given|withdrawn|expired
    consent_given_at     REAL,
    consent_expires_at   REAL,
    consent_basis        TEXT    NOT NULL DEFAULT '',   -- legitimate_interest|contract|consent|...
    erasure_requested    INTEGER NOT NULL DEFAULT 0,
    erasure_requested_at REAL,
    erasure_completed    INTEGER NOT NULL DEFAULT 0,
    erasure_completed_at REAL,
    country_code         TEXT    NOT NULL DEFAULT '',
    data_categories      TEXT    NOT NULL DEFAULT '[]'  -- JSON array of PII types held
);

CREATE INDEX IF NOT EXISTS idx_subject_hash   ON data_subjects (identifier_hash);
CREATE INDEX IF NOT EXISTS idx_subject_erasure ON data_subjects (erasure_requested) WHERE erasure_requested = 1;
CREATE INDEX IF NOT EXISTS idx_subject_consent ON data_subjects (consent_status);

-- ── Data Lineage ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lineage (
    id          TEXT    PRIMARY KEY,
    ts          REAL    NOT NULL,
    source      TEXT    NOT NULL DEFAULT '',   -- system/service that produced data
    destination TEXT    NOT NULL DEFAULT '',   -- system/service that consumed data
    pii_types   TEXT    NOT NULL DEFAULT '[]', -- JSON array
    operation   TEXT    NOT NULL DEFAULT '',   -- scan|mask|tokenize|transfer|delete
    actor       TEXT    NOT NULL DEFAULT '',
    scan_id     TEXT    NOT NULL DEFAULT '',   -- references scan_log.id
    record_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lineage_ts     ON lineage (ts DESC);
CREATE INDEX IF NOT EXISTS idx_lineage_source ON lineage (source);

-- ── Encryption Key Metadata (never stores actual keys) ────────────────────────
CREATE TABLE IF NOT EXISTS key_metadata (
    id              TEXT    PRIMARY KEY,
    key_version     INTEGER NOT NULL DEFAULT 1,
    algorithm       TEXT    NOT NULL DEFAULT 'AES-256-GCM',
    created_at      REAL    NOT NULL,
    rotated_at      REAL,
    active          INTEGER NOT NULL DEFAULT 1,
    purpose         TEXT    NOT NULL DEFAULT 'masking',  -- masking|tokenize|backup
    key_hash        TEXT    NOT NULL DEFAULT ''  -- SHA-256 of key for rotation verification
);

-- ── API Keys ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
    id              TEXT    PRIMARY KEY,
    key_hash        TEXT    UNIQUE NOT NULL,   -- SHA-256 of actual key
    name            TEXT    NOT NULL DEFAULT '',
    customer_id     TEXT    NOT NULL DEFAULT '',
    scopes          TEXT    NOT NULL DEFAULT '["scan","mask"]',  -- JSON array
    rate_limit_rpm  INTEGER NOT NULL DEFAULT 60,
    created_at      REAL    NOT NULL,
    last_used       REAL,
    expires_at      REAL,
    revoked         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_apikey_hash    ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_apikey_cust    ON api_keys (customer_id);

-- ── Statistics Materialized View (refreshed hourly) ───────────────────────────
CREATE TABLE IF NOT EXISTS stats_hourly (
    hour_ts         REAL    PRIMARY KEY,    -- floor to hour
    scan_count      INTEGER NOT NULL DEFAULT 0,
    pii_total       INTEGER NOT NULL DEFAULT 0,
    avg_risk        REAL    NOT NULL DEFAULT 0.0,
    avg_scan_ms     REAL    NOT NULL DEFAULT 0.0,
    by_strategy     TEXT    NOT NULL DEFAULT '{}',  -- JSON {strategy: count}
    by_pii_type     TEXT    NOT NULL DEFAULT '{}',  -- JSON {type: count}
    updated_at      REAL    NOT NULL
);
