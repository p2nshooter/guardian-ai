/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * BIP21 is a well-supported standard every BTC wallet parses correctly, so we
 * embed the exact amount for Bitcoin. For every other chain (TRC20/EVM/SOL/
 * DOGE) amount-embedding URI conventions vary by wallet — encoding one wrong
 * could show a WRONG amount, which is worse than the client re-typing the
 * already-copyable amount shown next to the code. So those QR codes carry
 * just the address: the highest-error-risk field to hand-copy, auto-filled
 * correctly by any wallet's camera scan.
 * ============================================================================ */
export function cryptoQrValue(symbol: string, address: string, amount: number): string {
  if (symbol === "BTC") return `bitcoin:${address}?amount=${amount}`;
  return address;
}
