-- ==============================================================================
-- Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Author & Architect: Yusron Efendi <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- Migration 0033: License security hardening (forward-compat only)
--
-- This migration is intentionally minimal and 100% additive:
--   - Adds key_version to licenses (DEFAULT 1) so future tooling can tell
--     old-format keys (4 random segments) apart from new-format keys
--     (3 random segments + checksum) WITHOUT breaking any key already
--     issued to a paying customer. No existing row's behavior changes.
--   - Rate limiting for /api/license-validate is implemented in Cloudflare
--     KV (binding "KV", already provisioned), not D1, so it needs no table
--     here — see dashboard/lib/rate-limit.ts.
--   - Ed25519 response signing uses an env secret
--     (LICENSE_SIGNING_PRIVATE_KEY_B64), not a DB-stored key, so it also
--     needs no table here — see dashboard/lib/license-signing.ts.
-- ============================================================

ALTER TABLE licenses ADD COLUMN key_version INTEGER NOT NULL DEFAULT 1;

-- Index used by the admin dashboard to flag licenses bound to more distinct
-- IPs than the heartbeat history would normally suggest for a single node
-- (soft anomaly signal — see AXTO_Security_Hardening_Report.pdf §6).
CREATE INDEX IF NOT EXISTS idx_heartbeats_lic_ip
  ON license_heartbeats(license_id, ip, created_at);
