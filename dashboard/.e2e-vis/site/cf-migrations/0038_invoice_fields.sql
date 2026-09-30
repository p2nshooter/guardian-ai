-- ============================================================================
-- 0038_invoice_fields.sql  (additive)
-- Extends the existing `invoices` table so crypto and trial payments record a
-- complete, renderable invoice. The base schema (0001) already has:
--   id, client_id, license_id, client_email, amount_usd, currency,
--   amount_local, gateway, payment_ref, status, created_at
-- These additions carry the extra detail an elegant invoice needs.
-- ============================================================================
ALTER TABLE invoices ADD COLUMN kind          TEXT NOT NULL DEFAULT 'standard'; -- standard | trial | crypto
ALTER TABLE invoices ADD COLUMN product       TEXT NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN order_id      TEXT NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN tx_hash       TEXT NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN amount_crypto REAL NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN symbol        TEXT NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN network       TEXT NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN meta          TEXT NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_inv_kind ON invoices(kind);
CREATE INDEX IF NOT EXISTS idx_inv_order ON invoices(order_id);
