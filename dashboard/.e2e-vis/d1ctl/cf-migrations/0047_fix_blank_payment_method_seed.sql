-- ============================================================================
-- 0047_fix_blank_payment_method_seed.sql
-- Corrective. app/api/admin/payment-methods/route.ts has a self-healing
-- GET fallback that creates payment_methods with BLANK addresses / enabled=0
-- for usdt_trc20, bnb, eth, btc whenever the table is empty. If that route
-- was ever hit before migration 0037 applied, its INSERT OR IGNORE won the
-- race and permanently locked in blank/disabled rows — 0037's real-address
-- INSERT OR IGNORE can never override an existing row by primary key.
--
-- This repairs any row that is still blank/off, using the same real
-- addresses migration 0037 always intended. It never touches a row an
-- admin has since edited (address already non-empty).
-- ============================================================================

UPDATE payment_methods SET
  address = 'TNo8jgJqmnUGAPUDb159cC8uhAeFDP8keW',
  contract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  enabled = 1,
  updated_at = datetime('now')
WHERE id = 'usdt_trc20' AND TRIM(address) = '';

UPDATE payment_methods SET
  address = '0x1bed722b27b3d2bdab3dfe06ea75b84a3a824f3d',
  enabled = 1,
  updated_at = datetime('now')
WHERE id = 'bnb' AND TRIM(address) = '';

UPDATE payment_methods SET
  address = '0x1bed722b27b3d2bdab3dfe06ea75b84a3a824f3d',
  enabled = 1,
  updated_at = datetime('now')
WHERE id = 'eth' AND TRIM(address) = '';

UPDATE payment_methods SET
  address = '1AzqohLY6XPGbabHmMhstYMPFUThoiBnya',
  enabled = 1,
  updated_at = datetime('now')
WHERE id = 'btc' AND TRIM(address) = '';
