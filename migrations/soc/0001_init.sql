-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- AXTO SOC — PostgreSQL / SQLite Schema
-- Migration: 0001_init.sql
-- ============================================================

-- ── Alerts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id              TEXT    PRIMARY KEY,
    ts              REAL    NOT NULL,
    source          TEXT    NOT NULL DEFAULT 'json_api',
    raw_log         TEXT    NOT NULL DEFAULT '',
    rule_id         TEXT    NOT NULL DEFAULT '',
    rule_name       TEXT    NOT NULL DEFAULT '',
    severity        TEXT    NOT NULL DEFAULT 'medium',  -- critical|high|medium|low|info
    host            TEXT    NOT NULL DEFAULT '',
    user_field      TEXT    NOT NULL DEFAULT '',
    src_ip          TEXT    NOT NULL DEFAULT '',
    dst_ip          TEXT    NOT NULL DEFAULT '',
    src_port        INTEGER NOT NULL DEFAULT 0,
    dst_port        INTEGER NOT NULL DEFAULT 0,
    program         TEXT    NOT NULL DEFAULT '',
    mitre_tactics   TEXT    NOT NULL DEFAULT '[]',   -- JSON array ["TA0001",...]
    ti_enrichment   TEXT    NOT NULL DEFAULT '{}',   -- JSON {src_ip: {malicious,score,...}}
    ueba_anomaly    TEXT,                            -- JSON or NULL
    incident_id     TEXT,
    false_positive  INTEGER NOT NULL DEFAULT 0,
    acknowledged    INTEGER NOT NULL DEFAULT 0,
    acknowledged_by TEXT    NOT NULL DEFAULT '',
    acknowledged_at REAL
);

CREATE INDEX IF NOT EXISTS idx_alerts_ts       ON alerts (ts DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity);
CREATE INDEX IF NOT EXISTS idx_alerts_src_ip   ON alerts (src_ip)   WHERE src_ip != '';
CREATE INDEX IF NOT EXISTS idx_alerts_host     ON alerts (host)      WHERE host != '';
CREATE INDEX IF NOT EXISTS idx_alerts_rule     ON alerts (rule_id);
CREATE INDEX IF NOT EXISTS idx_alerts_incident ON alerts (incident_id) WHERE incident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_fp       ON alerts (false_positive);

-- ── Incidents ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
    id              TEXT    PRIMARY KEY,
    created_at      REAL    NOT NULL,
    updated_at      REAL    NOT NULL,
    title           TEXT    NOT NULL DEFAULT '',
    severity        TEXT    NOT NULL DEFAULT 'medium',
    status          TEXT    NOT NULL DEFAULT 'new',
    -- Status: new|triaging|confirmed|contained|eradicated|recovered|closed|false_positive
    alert_ids       TEXT    NOT NULL DEFAULT '[]',    -- JSON array
    assignee        TEXT    NOT NULL DEFAULT '',
    description     TEXT    NOT NULL DEFAULT '',
    timeline        TEXT    NOT NULL DEFAULT '[]',    -- JSON array of events
    mitre_tactics   TEXT    NOT NULL DEFAULT '[]',    -- JSON array
    playbook        TEXT    NOT NULL DEFAULT '',
    playbook_steps  TEXT    NOT NULL DEFAULT '[]',    -- JSON array
    soar_log        TEXT    NOT NULL DEFAULT '[]',    -- JSON array of SOAR actions taken
    resolution      TEXT    NOT NULL DEFAULT '',
    sla_breach      INTEGER NOT NULL DEFAULT 0,
    sla_deadline    REAL,
    mttd_sec        REAL    NOT NULL DEFAULT 0.0,     -- Mean Time to Detect
    mttr_sec        REAL    NOT NULL DEFAULT 0.0,     -- Mean Time to Respond
    ai_triage       TEXT    NOT NULL DEFAULT '{}',    -- JSON AI analysis result
    tags            TEXT    NOT NULL DEFAULT '[]',    -- JSON array for custom tagging
    linked_incidents TEXT   NOT NULL DEFAULT '[]'     -- JSON array of related incident IDs
);

CREATE INDEX IF NOT EXISTS idx_incidents_status   ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created  ON incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_sla      ON incidents (sla_breach) WHERE sla_breach = 1;
CREATE INDEX IF NOT EXISTS idx_incidents_assignee ON incidents (assignee)   WHERE assignee != '';

-- ── SOAR Execution Log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS soar_executions (
    id              TEXT    PRIMARY KEY,
    ts              REAL    NOT NULL,
    incident_id     TEXT    NOT NULL,
    action          TEXT    NOT NULL,      -- block_ip|notify_slack|isolate_host|...
    step_number     INTEGER NOT NULL DEFAULT 0,
    auto_executed   INTEGER NOT NULL DEFAULT 0,
    success         INTEGER NOT NULL DEFAULT 0,
    result          TEXT    NOT NULL DEFAULT '{}',  -- JSON result from action
    error           TEXT    NOT NULL DEFAULT '',
    executed_by     TEXT    NOT NULL DEFAULT 'system',
    duration_ms     REAL    NOT NULL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_soar_incident ON soar_executions (incident_id);
CREATE INDEX IF NOT EXISTS idx_soar_ts       ON soar_executions (ts DESC);
CREATE INDEX IF NOT EXISTS idx_soar_action   ON soar_executions (action);

-- ── Threat Intelligence Cache ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ti_cache (
    indicator       TEXT    PRIMARY KEY,    -- IP/domain/hash
    indicator_type  TEXT    NOT NULL,       -- ip|domain|hash
    malicious       INTEGER NOT NULL DEFAULT 0,
    confidence      REAL    NOT NULL DEFAULT 0.0,
    sources         TEXT    NOT NULL DEFAULT '[]',  -- JSON ["abuseipdb","otx","local"]
    abuse_score     INTEGER NOT NULL DEFAULT 0,
    country         TEXT    NOT NULL DEFAULT '',
    isp             TEXT    NOT NULL DEFAULT '',
    otx_pulses      INTEGER NOT NULL DEFAULT 0,
    raw_data        TEXT    NOT NULL DEFAULT '{}',
    cached_at       REAL    NOT NULL,
    expires_at      REAL    NOT NULL,
    lookup_count    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ti_type       ON ti_cache (indicator_type);
CREATE INDEX IF NOT EXISTS idx_ti_malicious  ON ti_cache (malicious) WHERE malicious = 1;
CREATE INDEX IF NOT EXISTS idx_ti_expires    ON ti_cache (expires_at);

-- ── UEBA Baselines ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ueba_baselines (
    entity_metric   TEXT    PRIMARY KEY,   -- "user@host:metric"
    entity          TEXT    NOT NULL,
    metric          TEXT    NOT NULL,
    n               INTEGER NOT NULL DEFAULT 0,
    mean_val        REAL    NOT NULL DEFAULT 0.0,
    m2_val          REAL    NOT NULL DEFAULT 0.0,   -- Welford M2
    min_val         REAL    NOT NULL DEFAULT 0.0,
    max_val         REAL    NOT NULL DEFAULT 0.0,
    last_value      REAL    NOT NULL DEFAULT 0.0,
    last_updated    REAL    NOT NULL,
    anomaly_count   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ueba_entity ON ueba_baselines (entity);

-- ── False Positive Feedback ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fp_feedback (
    id          TEXT    PRIMARY KEY,
    ts          REAL    NOT NULL,
    alert_id    TEXT    NOT NULL,
    rule_id     TEXT    NOT NULL DEFAULT '',
    src_ip      TEXT    NOT NULL DEFAULT '',
    analyst     TEXT    NOT NULL DEFAULT '',
    reason      TEXT    NOT NULL DEFAULT '',
    auto_suppress INTEGER NOT NULL DEFAULT 0  -- 1 = auto-suppress future similar alerts
);

CREATE INDEX IF NOT EXISTS idx_fp_rule   ON fp_feedback (rule_id);
CREATE INDEX IF NOT EXISTS idx_fp_ip     ON fp_feedback (src_ip) WHERE src_ip != '';

-- ── Metrics Time Series ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metrics (
    ts          REAL    NOT NULL,
    metric      TEXT    NOT NULL,   -- eps_10m|alert_rate|incident_rate|mttd|mttr|...
    value       REAL    NOT NULL,
    labels      TEXT    NOT NULL DEFAULT '{}'  -- JSON {host,rule,...}
);

CREATE INDEX IF NOT EXISTS idx_metrics_ts     ON metrics (ts DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_name   ON metrics (metric);

-- ── Report Cache ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id          TEXT    PRIMARY KEY,
    ts          REAL    NOT NULL,
    report_type TEXT    NOT NULL,   -- daily|weekly|executive|incident
    period      TEXT    NOT NULL,   -- "2025-01-20" or "2025-W03"
    data        TEXT    NOT NULL DEFAULT '{}',  -- JSON report data
    generated_at REAL   NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_type ON reports (report_type, period);

-- ── Suppression Rules (reduce noise) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppressions (
    id          TEXT    PRIMARY KEY,
    rule_id     TEXT    NOT NULL DEFAULT '',   -- suppress specific rule
    src_ip      TEXT    NOT NULL DEFAULT '',   -- suppress specific IP
    host        TEXT    NOT NULL DEFAULT '',   -- suppress specific host
    reason      TEXT    NOT NULL DEFAULT '',
    created_by  TEXT    NOT NULL DEFAULT '',
    created_at  REAL    NOT NULL,
    expires_at  REAL,                          -- NULL = permanent
    active      INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_suppress_rule ON suppressions (rule_id) WHERE active = 1;
CREATE INDEX IF NOT EXISTS idx_suppress_ip   ON suppressions (src_ip)  WHERE active = 1;
