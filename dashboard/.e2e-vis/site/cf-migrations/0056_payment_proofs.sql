-- ==============================================================================
-- AXTO v3 — one row per on-chain transaction that paid an order.
-- The primary key guarantees a transaction can never pay two orders.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS payment_proofs (
  tx_hash    TEXT PRIMARY KEY,          -- network:hash (lower-case for EVM)
  network    TEXT NOT NULL,
  order_id   TEXT NOT NULL,
  amount     REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order ON payment_proofs (order_id);
