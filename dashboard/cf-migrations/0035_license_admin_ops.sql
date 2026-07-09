-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- Migration 0035: Admin license operations (manual licensing)
--
-- 100% ADDITIVE — no existing column is altered or dropped, no existing
-- row's behavior changes. Adds three columns to `licenses` plus one new
-- append-only `license_audit` table. Safe to apply on a live database.
--
-- Adds:
--   1. licenses.activated_manually  — 1 when an admin issued / approved the
--      license by hand (manual "acc") instead of via a payment gateway.
--   2. licenses.manual_activated_at — ISO timestamp of the manual approval.
--   3. licenses.is_enabled          — explicit ON/OFF switch independent of
--      the lifecycle status. 1 = ON (default, so old rows stay ON),
--      0 = OFF. Validation treats is_enabled=0 like "suspended" but the
--      flag survives expiry/renewal, so an admin can pre-disable/-enable.
--   4. license_audit                 — append-only trail of every admin action
--      against a license (create/extend/add_days/enable/disable/suspend/
--      reactivate/revoke/reset_binding/manual_activate/resend_email).
--
-- Note: week-based trials (1–4 weeks) do NOT need seeded package rows — the
-- admin "create" path computes expiry directly from a day count and tags the
-- license with license_type='trial' + trial_days, so this migration adds no
-- license_packages rows (avoids coupling to that table's exact columns).
-- ============================================================

-- 1–3. New columns on licenses (DEFAULTs chosen so old rows keep working) -------
ALTER TABLE licenses ADD COLUMN activated_manually  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE licenses ADD COLUMN manual_activated_at  TEXT    NOT NULL DEFAULT '';
ALTER TABLE licenses ADD COLUMN is_enabled           INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_lic_enabled ON licenses(is_enabled);
CREATE INDEX IF NOT EXISTS idx_lic_manual  ON licenses(activated_manually);

-- 4. Append-only admin audit trail ---------------------------------------------
CREATE TABLE IF NOT EXISTS license_audit (
  id          TEXT PRIMARY KEY,
  license_id  TEXT NOT NULL,
  action      TEXT NOT NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  detail      TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (license_id) REFERENCES licenses(id)
);
CREATE INDEX IF NOT EXISTS idx_audit_lic     ON license_audit(license_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON license_audit(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON license_audit(created_at);
