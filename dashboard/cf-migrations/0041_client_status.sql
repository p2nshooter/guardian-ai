-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════
-- Migration 0041: Client ban/suspension status
-- ═══════════════════════════════════════════════════════════════════
-- Adds a `status` column to clients so admins can BAN a client from the
-- admin panel. Banning a client suspends all their licenses (downloads &
-- activation are blocked by the portal); deleting removes them entirely.
--   status: 'active' (default) | 'banned'

ALTER TABLE clients ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
