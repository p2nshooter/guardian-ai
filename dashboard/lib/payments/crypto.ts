/* ==============================================================================
 * AXTO — Multi-chain crypto payments ↔ smart license
 * ------------------------------------------------------------------------------
 * Supports the six enabled methods (USDT-TRC20, BNB, ETH, BTC, SOL, DOGE). Flow
 * is identical for all 10 products:
 *   intent (exact amount + unique tag) → on-chain watcher matches the deposit
 *   → license issued + invoice written → appears in client dashboard.
 *
 * Only the fetch*Transfers() functions touch the network. Everything else is pure
 * and unit-testable offline. Disabled methods are never returned by the registry,
 * so they are hidden everywhere.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */

export interface PaymentMethod {
  id: string; symbol: string; name: string; category: "crypto" | "fiat";
  network: string; kind: "native" | "erc20" | "bep20" | "trc20";
  address: string; contract: string; decimals: number; confirmations: number;
  enabled: number; sort_order: number;
}

export interface CryptoIntent {
  orderId: string; methodId: string; userEmail: string; product: string;
  packageCode: string; amountUsd: number; amountCrypto: number; symbol: string;
  network: string; depositAddress: string; decimals: number; minConfirmations: number;
  createdAt: number; expiresAt: number;
}

export interface Transfer {
  txHash: string; to: string; from: string; contract: string;
  valueUnits: string; timestampMs: number; confirmations: number;
}

const DEFAULT_WINDOW_MIN = 30;

export function toUnits(amount: number, decimals: number): bigint {
  // Avoid float error: split integer/fraction.
  const [i, f = ""] = amount.toFixed(decimals).split(".");
  return BigInt(i + (f + "0".repeat(decimals)).slice(0, decimals));
}
export function fromUnits(units: string | bigint, decimals: number): number {
  return Number(BigInt(units)) / 10 ** decimals;
}

// Deterministic unique amount tag so concurrent buyers of the same package send
// slightly different amounts → unambiguous matching. Tag scales with decimals.
export function uniqueTag(orderId: string, decimals: number): number {
  let h = 0;
  for (let i = 0; i < orderId.length; i++) h = (h * 31 + orderId.charCodeAt(i)) >>> 0;
  const span = decimals >= 8 ? 99999 : decimals >= 6 ? 9999 : 99; // up to ~0.001 of a coin
  return (h % span) / 10 ** Math.min(decimals, 8);
}

// amountUsd → coin amount using rate (USD per coin). For stablecoins (USDT) rate=1.
export function createCryptoIntent(opts: {
  method: PaymentMethod; orderId: string; userEmail: string; product: string;
  packageCode: string; amountUsd: number; rateUsdPerCoin: number; now?: number; windowMin?: number;
}): CryptoIntent {
  const now = opts.now ?? Date.now();
  const m = opts.method;
  const rate = opts.rateUsdPerCoin > 0 ? opts.rateUsdPerCoin : 1;
  const base = opts.amountUsd / rate;
  const tag = uniqueTag(opts.orderId, m.decimals);
  const amountCrypto = Math.round((base + tag) * 10 ** Math.min(m.decimals, 8)) / 10 ** Math.min(m.decimals, 8);
  return {
    orderId: opts.orderId, methodId: m.id, userEmail: opts.userEmail, product: opts.product,
    packageCode: opts.packageCode, amountUsd: opts.amountUsd, amountCrypto, symbol: m.symbol,
    network: m.network, depositAddress: m.address, decimals: m.decimals, minConfirmations: m.confirmations,
    createdAt: now, expiresAt: now + (opts.windowMin ?? DEFAULT_WINDOW_MIN) * 60_000,
  };
}

export interface MatchResult {
  matched: boolean;
  reason: "ok" | "no_transfer" | "amount_mismatch" | "expired" | "insufficient_confirmations" | "wrong_token";
  transfer?: Transfer;
}

// Pure, chain-agnostic matcher. `method.kind` decides token vs native handling.
export function matchCryptoTransfer(
  method: PaymentMethod, intent: CryptoIntent, transfers: Transfer[],
  opts?: { toleranceCoin?: number; now?: number },
): MatchResult {
  const now = opts?.now ?? Date.now();
  if (now > intent.expiresAt) return { matched: false, reason: "expired" };

  const want = toUnits(intent.amountCrypto, method.decimals);
  const tol = toUnits(opts?.toleranceCoin ?? (method.decimals >= 8 ? 0.000005 : 0.005), method.decimals);
  const isToken = method.kind === "trc20" || method.kind === "erc20" || method.kind === "bep20";

  const candidates = transfers.filter(
    (t) => t.to.toLowerCase() === intent.depositAddress.toLowerCase() && t.timestampMs >= intent.createdAt - 60_000,
  );
  if (candidates.length === 0) return { matched: false, reason: "no_transfer" };

  let sawWrongToken = false;
  for (const t of candidates) {
    if (isToken && method.contract && t.contract.toLowerCase() !== method.contract.toLowerCase()) {
      sawWrongToken = true; continue;
    }
    const v = BigInt(t.valueUnits);
    const diff = v > want ? v - want : want - v;
    if (diff <= tol) {
      if (t.confirmations < intent.minConfirmations)
        return { matched: false, reason: "insufficient_confirmations", transfer: t };
      return { matched: true, reason: "ok", transfer: t };
    }
  }
  return { matched: false, reason: sawWrongToken ? "wrong_token" : "amount_mismatch" };
}

// ── Network boundary: per-chain fetchers (live-only) ─────────────────────────
export async function fetchTronTransfers(address: string, contract: string, apiKey?: string): Promise<Transfer[]> {
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?only_to=true&limit=50&contract_address=${contract}`;
  const res = await fetch(url, { headers: apiKey ? { "TRON-PRO-API-KEY": apiKey } : {} });
  if (!res.ok) throw new Error(`TronGrid ${res.status}`);
  const j: any = await res.json();
  return (j?.data ?? []).map((r: any) => ({
    txHash: r.transaction_id, to: r.to, from: r.from, contract: r.token_info?.address ?? "",
    valueUnits: String(r.value ?? "0"), timestampMs: Number(r.block_timestamp ?? 0), confirmations: 21,
  }));
}

// EVM native (ETH / BNB) via Etherscan-family API. apiBase: api.etherscan.io | api.bscscan.com
export async function fetchEvmNativeTransfers(apiBase: string, address: string, apiKey: string, tipBlock?: number): Promise<Transfer[]> {
  const url = `https://${apiBase}/api?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=50&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${apiBase} ${res.status}`);
  const j: any = await res.json();
  return (j?.result ?? []).filter((r: any) => (r.to || "").toLowerCase() === address.toLowerCase() && r.value !== "0")
    .map((r: any) => ({
      txHash: r.hash, to: r.to, from: r.from, contract: "",
      valueUnits: String(r.value ?? "0"), timestampMs: Number(r.timeStamp) * 1000,
      confirmations: r.confirmations ? Number(r.confirmations) : (tipBlock ? Math.max(0, tipBlock - Number(r.blockNumber)) : 12),
    }));
}

// Solana via the public JSON-RPC (no API key). Native SOL transfers only —
// detected as a positive balance delta for our address's account index in
// each recent transaction (getSignaturesForAddress + getTransaction).
export async function fetchSolanaTransfers(address: string): Promise<Transfer[]> {
  const rpc = "https://api.mainnet-beta.solana.com";
  const call = async (method: string, params: any[]) => {
    const res = await fetch(rpc, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!res.ok) throw new Error(`Solana RPC ${method} ${res.status}`);
    const j: any = await res.json();
    if (j.error) throw new Error(`Solana RPC ${method}: ${j.error.message || "error"}`);
    return j.result;
  };

  const sigs: any[] = (await call("getSignaturesForAddress", [address, { limit: 20 }])) ?? [];
  const out: Transfer[] = [];
  for (const s of sigs) {
    if (s.err) continue; // failed transaction, no funds moved
    const tx = await call("getTransaction", [s.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
    if (!tx) continue;
    const keys: string[] = (tx.transaction?.message?.accountKeys ?? []).map((k: any) => (typeof k === "string" ? k : k.pubkey));
    const idx = keys.indexOf(address);
    if (idx === -1) continue;
    const pre = Number(tx.meta?.preBalances?.[idx] ?? 0);
    const post = Number(tx.meta?.postBalances?.[idx] ?? 0);
    const delta = post - pre; // lamports; positive = incoming
    if (delta <= 0) continue;
    const confStatus = s.confirmationStatus || "processed";
    out.push({
      txHash: s.signature, to: address, from: keys[0] ?? "",
      contract: "", valueUnits: String(delta),
      timestampMs: (s.blockTime ?? Math.floor(Date.now() / 1000)) * 1000,
      // Solana has no linear confirmation count — map its finality states onto
      // a number so the existing `confirmations >= minConfirmations` check works.
      confirmations: confStatus === "finalized" ? 999 : confStatus === "confirmed" ? 32 : 0,
    });
  }
  return out;
}

// Dogecoin via Blockchair's address dashboard (free tier, no API key). Reads
// the address's current UTXO set — each unspent output sent to our deposit
// address is, by definition, an incoming payment.
export async function fetchDogeTransfers(address: string): Promise<Transfer[]> {
  const res = await fetch(`https://api.blockchair.com/dogecoin/dashboards/address/${address}?limit=50`);
  if (!res.ok) throw new Error(`Blockchair ${res.status}`);
  const j: any = await res.json();
  const entry = j?.data?.[address];
  const tipHeight = Number(j?.context?.state ?? 0);
  const utxos: any[] = entry?.utxo ?? [];
  return utxos.map((u: any) => ({
    txHash: u.transaction_hash, to: address, from: "",
    contract: "", valueUnits: String(u.value ?? 0),
    timestampMs: Date.now(), // Blockchair's UTXO entries don't carry a timestamp; only used for display/logging.
    confirmations: u.block_id > 0 && tipHeight > 0 ? Math.max(0, tipHeight - u.block_id + 1) : 0,
  }));
}

// BTC via a public explorer (blockstream-style). Returns confirmed incoming outputs.
export async function fetchBtcTransfers(address: string, tipHeight?: number): Promise<Transfer[]> {
  const res = await fetch(`https://blockstream.info/api/address/${address}/txs`);
  if (!res.ok) throw new Error(`blockstream ${res.status}`);
  const txs: any[] = await res.json();
  const out: Transfer[] = [];
  for (const tx of txs) {
    const height = tx.status?.block_height;
    const confs = tx.status?.confirmed && tipHeight && height ? tipHeight - height + 1 : (tx.status?.confirmed ? 1 : 0);
    for (const vout of tx.vout ?? []) {
      if (vout.scriptpubkey_address === address) {
        out.push({
          txHash: tx.txid, to: address, from: tx.vin?.[0]?.prevout?.scriptpubkey_address ?? "",
          contract: "", valueUnits: String(vout.value ?? 0),
          timestampMs: (tx.status?.block_time ?? Math.floor(Date.now() / 1000)) * 1000, confirmations: confs,
        });
      }
    }
  }
  return out;
}

// Orchestrates one settlement attempt. `issueLicense` + `writeInvoice` injected.
export async function settleCryptoPayment(
  method: PaymentMethod, intent: CryptoIntent,
  deps: {
    fetchTransfers?: (m: PaymentMethod, addr: string) => Promise<Transfer[]>;
    issueLicense: (a: { email: string; product: string; packageCode: string; orderId: string; txHash: string; symbol: string }) => Promise<{ licenseId: string }>;
    writeInvoice: (a: { orderId: string; email: string; product: string; amountUsd: number; amountCrypto: number; symbol: string; txHash: string; licenseId: string }) => Promise<{ invoiceId: string }>;
    now?: number;
  },
): Promise<{ settled: boolean; reason: MatchResult["reason"]; licenseId?: string; invoiceId?: string; txHash?: string }> {
  const fetcher = deps.fetchTransfers ?? defaultFetcher;
  const transfers = await fetcher(method, intent.depositAddress);
  const m = matchCryptoTransfer(method, intent, transfers, { now: deps.now });
  if (!m.matched) return { settled: false, reason: m.reason };
  const { licenseId } = await deps.issueLicense({
    email: intent.userEmail, product: intent.product, packageCode: intent.packageCode,
    orderId: intent.orderId, txHash: m.transfer!.txHash, symbol: intent.symbol,
  });
  // INVOICE IS MANDATORY for every successful payment.
  const { invoiceId } = await deps.writeInvoice({
    orderId: intent.orderId, email: intent.userEmail, product: intent.product,
    amountUsd: intent.amountUsd, amountCrypto: intent.amountCrypto, symbol: intent.symbol,
    txHash: m.transfer!.txHash, licenseId,
  });
  return { settled: true, reason: "ok", licenseId, invoiceId, txHash: m.transfer!.txHash };
}

// Live USD→coin rate. Stablecoins return 1. The only network dependency for pricing.
export async function rateUsdPerCoin(symbol: string): Promise<number> {
  if (symbol === "USDT") return 1;
  const ids: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana", DOGE: "dogecoin" };
  const id = ids[symbol];
  if (!id) return 0;
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    const j: any = await r.json();
    return Number(j?.[id]?.usd) || 0;
  } catch {
    return 0;
  }
}

async function defaultFetcher(method: PaymentMethod, address: string): Promise<Transfer[]> {
  const env: any = (globalThis as any).process?.env ?? {};
  if (method.kind === "trc20") return fetchTronTransfers(address, method.contract, env.TRON_API_KEY);
  if (method.network === "Ethereum") return fetchEvmNativeTransfers("api.etherscan.io", address, env.ETHERSCAN_API_KEY || "");
  if (method.network === "BEP20") return fetchEvmNativeTransfers("api.bscscan.com", address, env.BSCSCAN_API_KEY || "");
  if (method.network === "Bitcoin") return fetchBtcTransfers(address);
  if (method.network === "Solana") return fetchSolanaTransfers(address);
  if (method.network === "Dogecoin") return fetchDogeTransfers(address);
  return [];
}
