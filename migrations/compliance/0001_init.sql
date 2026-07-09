-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- AXTO Compliance — PostgreSQL / SQLite Schema
-- Migration: 0001_init.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS assessments (
    id              TEXT    PRIMARY KEY,
    framework       TEXT    NOT NULL,
    started_at      REAL    NOT NULL,
    completed_at    REAL    NOT NULL DEFAULT 0,
    overall_score   REAL    NOT NULL DEFAULT 0.0,
    weighted_score  REAL    NOT NULL DEFAULT 0.0,
    pass_count      INTEGER NOT NULL DEFAULT 0,
    fail_count      INTEGER NOT NULL DEFAULT 0,
    partial_count   INTEGER NOT NULL DEFAULT 0,
    manual_count    INTEGER NOT NULL DEFAULT 0,
    risk_level      TEXT    NOT NULL DEFAULT 'high',
    gaps            TEXT    NOT NULL DEFAULT '[]',
    summary         TEXT    NOT NULL DEFAULT '',
    triggered_by    TEXT    NOT NULL DEFAULT 'auto'
);
CREATE INDEX IF NOT EXISTS idx_assess_fw   ON assessments (framework);
CREATE INDEX IF NOT EXISTS idx_assess_ts   ON assessments (completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_assess_risk ON assessments (risk_level);

CREATE TABLE IF NOT EXISTS control_results (
    id              TEXT    PRIMARY KEY,
    assessment_id   TEXT    NOT NULL REFERENCES assessments(id),
    control_id      TEXT    NOT NULL,
    framework       TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'not_tested',
    score           REAL    NOT NULL DEFAULT 0.0,
    gaps            TEXT    NOT NULL DEFAULT '[]',
    remediation     TEXT    NOT NULL DEFAULT '',
    checked_at      REAL    NOT NULL,
    check_ms        REAL    NOT NULL DEFAULT 0.0,
    check_type      TEXT    NOT NULL DEFAULT 'manual',
    evidence_count  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ctrl_assess  ON control_results (assessment_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_id      ON control_results (control_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_status  ON control_results (status);
CREATE INDEX IF NOT EXISTS idx_ctrl_fw      ON control_results (framework);

CREATE TABLE IF NOT EXISTS evidence (
    id              TEXT    PRIMARY KEY,
    control_id      TEXT    NOT NULL,
    assessment_id   TEXT    NOT NULL DEFAULT '',
    check_type      TEXT    NOT NULL,
    collected_at    REAL    NOT NULL,
    raw_data        TEXT    NOT NULL DEFAULT '{}',
    hash            TEXT    NOT NULL DEFAULT '',
    collector       TEXT    NOT NULL DEFAULT 'auto',
    valid           INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_evidence_ctrl ON evidence (control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_ts   ON evidence (collected_at DESC);

CREATE TABLE IF NOT EXISTS risk_items (
    id              TEXT    PRIMARY KEY,
    title           TEXT    NOT NULL,
    description     TEXT    NOT NULL DEFAULT '',
    risk_level      TEXT    NOT NULL DEFAULT 'medium',
    framework       TEXT    NOT NULL DEFAULT '',
    control_id      TEXT    NOT NULL DEFAULT '',
    remediation     TEXT    NOT NULL DEFAULT '',
    status          TEXT    NOT NULL DEFAULT 'open',
    owner           TEXT    NOT NULL DEFAULT '',
    due_date        REAL,
    created_at      REAL    NOT NULL,
    updated_at      REAL    NOT NULL DEFAULT 0,
    resolved_at     REAL,
    resolution_note TEXT    NOT NULL DEFAULT '',
    priority        INTEGER NOT NULL DEFAULT 3
);
CREATE INDEX IF NOT EXISTS idx_risk_status  ON risk_items (status);
CREATE INDEX IF NOT EXISTS idx_risk_level   ON risk_items (risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_fw      ON risk_items (framework);

CREATE TABLE IF NOT EXISTS policies (
    id              TEXT    PRIMARY KEY,
    name            TEXT    NOT NULL,
    framework       TEXT    NOT NULL DEFAULT '',
    content         TEXT    NOT NULL DEFAULT '',
    version         TEXT    NOT NULL DEFAULT '1.0',
    approved_by     TEXT    NOT NULL DEFAULT '',
    approved_at     REAL,
    effective_at    REAL,
    next_review     REAL,
    status          TEXT    NOT NULL DEFAULT 'draft',
    created_at      REAL    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_policies_fw     ON policies (framework);
CREATE INDEX IF NOT EXISTS idx_policies_review ON policies (next_review) WHERE next_review IS NOT NULL;

CREATE TABLE IF NOT EXISTS vendor_assessments (
    id              TEXT    PRIMARY KEY,
    vendor_name     TEXT    NOT NULL,
    vendor_email    TEXT    NOT NULL DEFAULT '',
    framework       TEXT    NOT NULL DEFAULT 'soc2',
    questionnaire   TEXT    NOT NULL DEFAULT '[]',
    responses       TEXT    NOT NULL DEFAULT '{}',
    score           REAL    NOT NULL DEFAULT 0.0,
    risk_level      TEXT    NOT NULL DEFAULT 'unknown',
    status          TEXT    NOT NULL DEFAULT 'pending',
    created_at      REAL    NOT NULL,
    submitted_at    REAL,
    reviewed_at     REAL,
    next_review     REAL
);
CREATE INDEX IF NOT EXISTS idx_vendor_status ON vendor_assessments (status);

CREATE TABLE IF NOT EXISTS continuous_checks (
    id              TEXT    PRIMARY KEY,
    ts              REAL    NOT NULL,
    framework       TEXT    NOT NULL,
    control_id      TEXT    NOT NULL,
    status          TEXT    NOT NULL,
    score           REAL    NOT NULL DEFAULT 0.0,
    changed         INTEGER NOT NULL DEFAULT 0,
    prev_status     TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_cc_ts     ON continuous_checks (ts DESC);
CREATE INDEX IF NOT EXISTS idx_cc_ctrl   ON continuous_checks (control_id);
CREATE INDEX IF NOT EXISTS idx_cc_change ON continuous_checks (changed) WHERE changed = 1;
