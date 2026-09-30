-- ============================================================================
-- 0046_add_sol_doge_payment_methods.sql
-- Additive only. Adds Solana (SOL) and Dogecoin (DOGE) as enabled crypto
-- payment methods, using the real receiving addresses the owner provided.
-- Both have working on-chain settlement fetchers as of this migration
-- (lib/payments/crypto.ts: fetchSolanaTransfers / fetchDogeTransfers).
-- ============================================================================

INSERT OR IGNORE INTO payment_methods
  (id, symbol, name, category, network, kind, address, contract, decimals, confirmations, enabled, sort_order)
VALUES
  ('sol','SOL','Solana','crypto','Solana','native',
   'CUnEGFRZvMu8xieLdiM9oHXa5dzS9xJVvNnEiyXRaogD','',9,32,1,50),
  ('doge','DOGE','Dogecoin','crypto','Dogecoin','native',
   'DJUK77iDsus6URWcwNZnsqAyESUr426Df3','',8,6,1,60);
