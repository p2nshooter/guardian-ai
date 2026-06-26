-- ==============================================================================
-- Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Author & Architect: Yusron Efendi <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- AXTO Platform — Pricing Update (USD, Market-Competitive)
-- Safe: uses UPDATE only on columns that exist in 0001_init
-- sort_order and max_workers are handled in 0006
-- ============================================================

-- Update Guardian pricing (only columns guaranteed to exist: price_usd, name, max_nodes)
UPDATE license_packages SET price_usd = 249,   name = 'Guardian Sentinel'   WHERE code = 'lite';
UPDATE license_packages SET price_usd = 990,   name = 'Guardian Pro',       max_nodes = 20 WHERE code = 'pro';
UPDATE license_packages SET price_usd = 3990,  name = 'Guardian Business'   WHERE code = 'shield';
UPDATE license_packages SET price_usd = 17900, name = 'Guardian Enterprise' WHERE code = 'aegis';

-- Update Orchestra pricing
UPDATE license_packages SET price_usd = 9900,  name = 'Orchestra Core'       WHERE code = 'orchestra_core';
UPDATE license_packages SET price_usd = 24900, name = 'Orchestra Scale'      WHERE code = 'orchestra_scale';
UPDATE license_packages SET price_usd = 59900, name = 'Orchestra Enterprise' WHERE code = 'orchestra_unlimited';
