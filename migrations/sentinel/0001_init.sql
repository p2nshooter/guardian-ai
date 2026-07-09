-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- AXTO Sentinel — PostgreSQL / SQLite Schema
-- Migration: 0001_init.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS devices (
    id              TEXT    PRIMARY KEY,
    ip              TEXT    UNIQUE NOT NULL,
    mac             TEXT    NOT NULL DEFAULT '',
    hostname        TEXT    NOT NULL DEFAULT '',
    vendor          TEXT    NOT NULL DEFAULT '',
    product         TEXT    NOT NULL DEFAULT '',
    device_type     TEXT    NOT NULL DEFAULT 'unknown',
    firmware_ver    TEXT    NOT NULL DEFAULT '',
    firmware_hash   TEXT    NOT NULL DEFAULT '',
    protocols       TEXT    NOT NULL DEFAULT '[]',
    open_ports      TEXT    NOT NULL DEFAULT '[]',
    known_cves      TEXT    NOT NULL DEFAULT '[]',
    cve_scores      TEXT    NOT NULL DEFAULT '{}',   -- JSON {cve_id: cvss_score}
    first_seen      REAL    NOT NULL,
    last_seen       REAL    NOT NULL,
    last_polled     REAL    NOT NULL DEFAULT 0,
    last_scanned    REAL    NOT NULL DEFAULT 0,
    is_authorized   INTEGER NOT NULL DEFAULT 0,
    ot_zone         TEXT    NOT NULL DEFAULT '',
    it_zone         TEXT    NOT NULL DEFAULT '',
    criticality     TEXT    NOT NULL DEFAULT 'medium',
    alert_count     INTEGER NOT NULL DEFAULT 0,
    tags            TEXT    NOT NULL DEFAULT '[]',
    notes           TEXT    NOT NULL DEFAULT '',
    risk_score      REAL    NOT NULL DEFAULT 0.0
);
CREATE INDEX IF NOT EXISTS idx_dev_ip      ON devices (ip);
CREATE INDEX IF NOT EXISTS idx_dev_type    ON devices (device_type);
CREATE INDEX IF NOT EXISTS idx_dev_auth    ON devices (is_authorized);
CREATE INDEX IF NOT EXISTS idx_dev_zone    ON devices (ot_zone);
CREATE INDEX IF NOT EXISTS idx_dev_risk    ON devices (risk_score DESC);

CREATE TABLE IF NOT EXISTS alerts (
    id              TEXT    PRIMARY KEY,
    ts              REAL    NOT NULL,
    rule_id         TEXT    NOT NULL,
    rule_name       TEXT    NOT NULL DEFAULT '',
    severity        TEXT    NOT NULL DEFAULT 'medium',
    device_id       TEXT    NOT NULL DEFAULT '',
    device_ip       TEXT    NOT NULL DEFAULT '',
    device_type     TEXT    NOT NULL DEFAULT '',
    description     TEXT    NOT NULL DEFAULT '',
    mitre_ics       TEXT    NOT NULL DEFAULT '',
    evidence        TEXT    NOT NULL DEFAULT '{}',
    acknowledged    INTEGER NOT NULL DEFAULT 0,
    acknowledged_by TEXT    NOT NULL DEFAULT '',
    acknowledged_at REAL,
    incident_id     TEXT,
    ai_triage       TEXT    NOT NULL DEFAULT '{}',
    false_positive  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ot_alerts_ts   ON alerts (ts DESC);
CREATE INDEX IF NOT EXISTS idx_ot_alerts_sev  ON alerts (severity);
CREATE INDEX IF NOT EXISTS idx_ot_alerts_dev  ON alerts (device_ip);
CREATE INDEX IF NOT EXISTS idx_ot_alerts_rule ON alerts (rule_id);
CREATE INDEX IF NOT EXISTS idx_ot_alerts_ack  ON alerts (acknowledged);

CREATE TABLE IF NOT EXISTS register_readings (
    id          TEXT    PRIMARY KEY,
    ts          REAL    NOT NULL,
    device_ip   TEXT    NOT NULL,
    device_id   TEXT    NOT NULL DEFAULT '',
    address     INTEGER NOT NULL,
    protocol    TEXT    NOT NULL DEFAULT 'modbus',
    value       REAL    NOT NULL,
    raw_bytes   TEXT    NOT NULL DEFAULT '',
    anomaly     INTEGER NOT NULL DEFAULT 0,
    z_score     REAL    NOT NULL DEFAULT 0.0,
    baseline    REAL    NOT NULL DEFAULT 0.0,
    baseline_std REAL   NOT NULL DEFAULT 0.0
);
CREATE INDEX IF NOT EXISTS idx_readings_ts    ON register_readings (ts DESC);
CREATE INDEX IF NOT EXISTS idx_readings_dev   ON register_readings (device_ip);
CREATE INDEX IF NOT EXISTS idx_readings_anom  ON register_readings (anomaly) WHERE anomaly = 1;

CREATE TABLE IF NOT EXISTS firmware_history (
    id          TEXT    PRIMARY KEY,
    device_id   TEXT    NOT NULL,
    device_ip   TEXT    NOT NULL DEFAULT '',
    ts          REAL    NOT NULL,
    version     TEXT    NOT NULL DEFAULT '',
    hash        TEXT    NOT NULL DEFAULT '',
    change_type TEXT    NOT NULL DEFAULT 'detected',  -- detected|authorized|rollback
    authorized  INTEGER NOT NULL DEFAULT 0,
    authorized_by TEXT  NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_fw_device ON firmware_history (device_id);
CREATE INDEX IF NOT EXISTS idx_fw_ts     ON firmware_history (ts DESC);

CREATE TABLE IF NOT EXISTS compliance_findings (
    id          TEXT    PRIMARY KEY,
    ts          REAL    NOT NULL,
    standard    TEXT    NOT NULL,
    control_id  TEXT    NOT NULL,
    device_id   TEXT    NOT NULL DEFAULT '',
    device_ip   TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'fail',
    finding     TEXT    NOT NULL DEFAULT '',
    remediation TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_cf_standard ON compliance_findings (standard);
CREATE INDEX IF NOT EXISTS idx_cf_device   ON compliance_findings (device_ip);

CREATE TABLE IF NOT EXISTS network_topology (
    id          TEXT    PRIMARY KEY,
    src_ip      TEXT    NOT NULL,
    dst_ip      TEXT    NOT NULL,
    protocol    TEXT    NOT NULL DEFAULT '',
    port        INTEGER NOT NULL DEFAULT 0,
    first_seen  REAL    NOT NULL,
    last_seen   REAL    NOT NULL,
    packet_count INTEGER NOT NULL DEFAULT 0,
    byte_count  INTEGER NOT NULL DEFAULT 0,
    direction   TEXT    NOT NULL DEFAULT 'inbound',
    crosses_boundary INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_topo_src  ON network_topology (src_ip);
CREATE INDEX IF NOT EXISTS idx_topo_dst  ON network_topology (dst_ip);
CREATE INDEX IF NOT EXISTS idx_topo_bnd  ON network_topology (crosses_boundary) WHERE crosses_boundary = 1;
