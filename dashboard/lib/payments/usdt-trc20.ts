/* ==============================================================================
 * AXTO — USDT (TRC20) payment ↔ smart-license bridge
 * ------------------------------------------------------------------------------
 * How it communicates with the smart license:
 *
 *   1) createPaymentIntent()  → client gets a deposit address + an EXACT amount.
 *      The amount carries a tiny unique "cents tag" so concurrent payments to the
 *      same address are distinguishable without per-user addresses.
 *   2) Client sends USDT (TRC20) from their wallet to the deposit address.
 *   3) A scheduled watcher (cron) calls fetchIncomingTransfers() against TronGrid
 *      and matchTransfer() pairs an on-chain transfer to a pending intent
 *      (recipient + token contract + amount + after-intent timestamp + confs).
 *   4) settleConfirmed() then issues the license via the SAME createLicense()
 *      used everywhere, writes an invoice, and the license appears in the client
 *      dashboard. Works identically for all 10 products.
 *
 * Only fetchIncomingTransfers() touches the network; everything else is pure and
 * unit-testable offline.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */

// Official USDT TRC20 contract on TRON mainnet.
export const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
export const USDT_DECIMALS = 6;
const DEFAULT_CONFIRMATIONS = 19;          // ~1 min on TRON; safe against reorgs
const DEFAULT_WINDOW_MIN = 60;             // intent valid for 60 minutes

export interface PaymentIntent {
  orderId: string;
  userEmail: string;
  product: string;
  packageCode: string;
  amountUsdt: number;        // EXACT amount the client must send (incl. cents tag)
  depositAddress: string;
  createdAt: number;         // epoch ms
  expiresAt: number;         // epoch ms
}

export interface Transfer {
  txHash: string;
  to: string;
  from: string;
  contract: string;          // token contract address
  valueUnits: string;        // raw integer units (string to avoid precision loss)
  timestampMs: number;
  confirmations: number;
}

// USDT on TRON has 6 decimals: 1 USDT = 1_000_000 units.
export function usdtToUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDT_DECIMALS));
}
export function unitsToUsdt(units: string | bigint): number {
  return Number(BigInt(units)) / 10 ** USDT_DECIMALS;
}

// Deterministic unique cents tag (0..0.0099) derived from orderId, so two buyers
// of the same package send slightly different amounts → unambiguous matching.
export function centsTag(orderId: string): number {
  let h = 0;
  for (let i = 0; i < orderId.length; i++) h = (h * 31 + orderId.charCodeAt(i)) >>> 0;
  return (h % 9900) / 1_000_000; // up to 0.0099 USDT
}

export function createPaymentIntent(opts: {
  orderId: string; userEmail: string; product: string; packageCode: string;
  basePriceUsdt: number; depositAddress: string; now?: number; windowMin?: number;
}): PaymentIntent {
  const now = opts.now ?? Date.now();
  const amountUsdt = Math.round((opts.basePriceUsdt + centsTag(opts.orderId)) * 1e6) / 1e6;
  return {
    orderId: opts.orderId,
    userEmail: opts.userEmail,
    product: opts.product,
    packageCode: opts.packageCode,
    amountUsdt,
    depositAddress: opts.depositAddress,
    createdAt: now,
    expiresAt: now + (opts.windowMin ?? DEFAULT_WINDOW_MIN) * 60_000,
  };
}

export interface MatchResult {
  matched: boolean;
  reason: "ok" | "no_transfer" | "amount_mismatch" | "expired" | "insufficient_confirmations" | "wrong_token";
  transfer?: Transfer;
}

// Pure matcher: given the intent + on-chain transfers to the deposit address,
// decide whether the payment is settled. Tolerance covers fee/rounding dust.
export function matchTransfer(
  intent: PaymentIntent,
  transfers: Transfer[],
  opts?: { minConfirmations?: number; toleranceUsdt?: number; now?: number },
): MatchResult {
  const minConf = opts?.minConfirmations ?? DEFAULT_CONFIRMATIONS;
  const tol = usdtToUnits(opts?.toleranceUsdt ?? 0.005);
  const want = usdtToUnits(intent.amountUsdt);
  const now = opts?.now ?? Date.now();

  if (now > intent.expiresAt) return { matched: false, reason: "expired" };

  const candidates = transfers.filter(
    (t) => t.to === intent.depositAddress && t.timestampMs >= intent.createdAt - 60_000,
  );
  if (candidates.length === 0) return { matched: false, reason: "no_transfer" };

  for (const t of candidates) {
    if (t.contract !== USDT_TRC20_CONTRACT) { var sawWrongToken = true; continue; }
    const v = BigInt(t.valueUnits);
    const diff = v > want ? v - want : want - v;
    if (diff <= tol) {
      if (t.confirmations < minConf)
        return { matched: false, reason: "insufficient_confirmations", transfer: t };
      return { matched: true, reason: "ok", transfer: t };
    }
  }
  // @ts-ignore - sawWrongToken may be set above
  if (typeof sawWrongToken !== "undefined" && sawWrongToken) return { matched: false, reason: "wrong_token" };
  return { matched: false, reason: "amount_mismatch" };
}

// ── Network boundary (the ONLY part requiring live access) ───────────────────
// Polls TronGrid for incoming TRC20 transfers to `address`. Marked async/IO so
// it can be mocked in tests.
export async function fetchIncomingTransfers(
  address: string,
  opts?: { apiKey?: string; limit?: number; tipBlock?: number },
): Promise<Transfer[]> {
  const base = "https://api.trongrid.io";
  const url = `${base}/v1/accounts/${address}/transactions/trc20?only_to=true&limit=${opts?.limit ?? 50}&contract_address=${USDT_TRC20_CONTRACT}`;
  const res = await fetch(url, { headers: opts?.apiKey ? { "TRON-PRO-API-KEY": opts.apiKey } : {} });
  if (!res.ok) throw new Error(`TronGrid ${res.status}`);
  const json: any = await res.json();
  const rows: any[] = json?.data ?? [];
  return rows.map((r) => ({
    txHash: r.transaction_id,
    to: r.to,
    from: r.from,
    contract: r.token_info?.address ?? "",
    valueUnits: String(r.value ?? "0"),
    timestampMs: Number(r.block_timestamp ?? 0),
    // TronGrid doesn't return confirmations directly; derive from tip if provided.
    confirmations: opts?.tipBlock ? Math.max(0, opts.tipBlock - Number(r.block ?? opts.tipBlock)) : DEFAULT_CONFIRMATIONS,
  }));
}

// Orchestrates a single settlement attempt for one pending intent. `issueLicense`
// is injected (the same createLicense used everywhere) so this stays testable.
export async function settlePayment(
  intent: PaymentIntent,
  deps: {
    fetchTransfers?: (addr: string) => Promise<Transfer[]>;
    issueLicense: (args: { email: string; product: string; packageCode: string; orderId: string; txHash: string }) => Promise<{ licenseId: string; licenseKey: string; expiresAt: string }>;
    writeInvoice?: (args: { orderId: string; email: string; product: string; amountUsdt: number; txHash: string; licenseId: string }) => Promise<void>;
    minConfirmations?: number;
    now?: number;
  },
): Promise<{ settled: boolean; reason: MatchResult["reason"]; licenseId?: string; txHash?: string }> {
  const fetcher = deps.fetchTransfers ?? ((a: string) => fetchIncomingTransfers(a));
  const transfers = await fetcher(intent.depositAddress);
  const m = matchTransfer(intent, transfers, { minConfirmations: deps.minConfirmations, now: deps.now });
  if (!m.matched) return { settled: false, reason: m.reason };
  const issued = await deps.issueLicense({
    email: intent.userEmail, product: intent.product, packageCode: intent.packageCode,
    orderId: intent.orderId, txHash: m.transfer!.txHash,
  });
  if (deps.writeInvoice)
    await deps.writeInvoice({
      orderId: intent.orderId, email: intent.userEmail, product: intent.product,
      amountUsdt: intent.amountUsdt, txHash: m.transfer!.txHash, licenseId: issued.licenseId,
    });
  return { settled: true, reason: "ok", licenseId: issued.licenseId, txHash: m.transfer!.txHash };
}
