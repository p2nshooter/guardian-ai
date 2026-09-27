/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * On-chain payment verification for direct wallet transfers — no admin needed.
 *
 *   Stablecoins (USDT/USDC on TRC20, ERC20, BEP20): every order gets a UNIQUE
 *   amount (e.g. 49.37). The watcher (cron, every minute) lists incoming
 *   transfers to our wallets and matches the exact amount → the order is paid
 *   and the licence issued automatically.
 *   BTC / ETH / SOL (volatile): the customer pastes the transaction hash; we
 *   verify destination, amount (≥ 99 % of the quote) and confirmations.
 *   Every transaction can pay exactly one order (payment_proofs primary key).
 *
 * Explorers: TronGrid (public, optional key), Etherscan API v2 (one free key
 * covers Ethereum + BNB Chain), mempool.space (public), Solana public RPC.
 * ============================================================================ */

export type Network = "usdt_trc20" | "usdt_erc20" | "usdt_bep20" | "usdc_erc20" | "btc" | "eth" | "sol";

export interface Transfer { network: Network; tx: string; to: string; amount: number; ts: number; confirmed: boolean }

interface Token { contract: string; decimals: number; chainId?: number; minConf: number }
export const TOKENS: Partial<Record<Network, Token>> = {
  usdt_trc20: { contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", decimals: 6, minConf: 1 },
  usdt_erc20: { contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, chainId: 1, minConf: 12 },
  usdc_erc20: { contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, chainId: 1, minConf: 12 },
  usdt_bep20: { contract: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, chainId: 56, minConf: 15 },
};
export const STABLE: Network[] = ["usdt_trc20", "usdt_erc20", "usdt_bep20", "usdc_erc20"];
export const VOLATILE: { network: Network; symbol: string; coinbase: string }[] = [
  { network: "btc", symbol: "BTC", coinbase: "BTC-USD" },
  { network: "eth", symbol: "ETH", coinbase: "ETH-USD" },
  { network: "sol", symbol: "SOL", coinbase: "SOL-USD" },
];

const TIMEOUT = 15_000;
async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const r = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`${new URL(url).host} HTTP ${r.status}`);
  return r.json();
}
async function postJson(url: string, body: unknown): Promise<any> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`${new URL(url).host} HTTP ${r.status}`);
  return r.json();
}

/** Units → decimal number without float surprises for 6/18-decimal tokens. */
function units(raw: string, decimals: number): number {
  const s = String(raw).replace(/^0+/, "") || "0";
  const whole = s.length > decimals ? s.slice(0, s.length - decimals) : "0";
  const frac = s.padStart(decimals, "0").slice(-decimals).slice(0, 8);
  return Number(`${whole}.${frac}`);
}

// ── incoming stablecoin transfers ────────────────────────────────────────────
export async function incomingTransfers(network: Network, address: string, sinceMs: number, keys: { tron?: string; etherscan?: string }): Promise<Transfer[]> {
  const t = TOKENS[network];
  if (!t || !address) return [];
  if (network === "usdt_trc20") {
    const q = new URLSearchParams({ only_to: "true", only_confirmed: "true", limit: "200", contract_address: t.contract, min_timestamp: String(Math.max(0, sinceMs)) });
    const j = await getJson(`https://api.trongrid.io/v1/accounts/${encodeURIComponent(address)}/transactions/trc20?${q}`, keys.tron ? { "TRON-PRO-API-KEY": keys.tron } : {});
    return (j?.data || []).filter((x: any) => x?.to === address).map((x: any) => ({
      network, tx: String(x.transaction_id), to: x.to, amount: units(x.value, Number(x.token_info?.decimals ?? t.decimals)), ts: Number(x.block_timestamp), confirmed: true,
    }));
  }
  if (!keys.etherscan) return [];                   // ERC20/BEP20 need a (free) Etherscan API v2 key
  const q = new URLSearchParams({ chainid: String(t.chainId), module: "account", action: "tokentx", contractaddress: t.contract, address, page: "1", offset: "200", sort: "desc", apikey: keys.etherscan });
  const j = await getJson(`https://api.etherscan.io/v2/api?${q}`);
  const list = Array.isArray(j?.result) ? j.result : [];
  return list.filter((x: any) => String(x.to).toLowerCase() === address.toLowerCase() && Number(x.timeStamp) * 1000 >= sinceMs).map((x: any) => ({
    network, tx: String(x.hash), to: x.to, amount: units(x.value, Number(x.tokenDecimal ?? t.decimals)), ts: Number(x.timeStamp) * 1000,
    confirmed: Number(x.confirmations || 0) >= t.minConf,
  }));
}

// ── a single transaction (customer-supplied hash) ────────────────────────────
export async function transferByHash(network: Network, tx: string, address: string, keys: { tron?: string; etherscan?: string }): Promise<Transfer | null> {
  const hash = tx.trim();
  if (!/^[A-Za-z0-9]{32,100}$/.test(hash.replace(/^0x/, ""))) return null;
  if (STABLE.includes(network)) {
    const list = await incomingTransfers(network, address, Date.now() - 7 * 86_400_000, keys);
    return list.find((x) => x.tx.toLowerCase() === hash.toLowerCase()) || null;
  }
  if (network === "btc") {
    const j = await getJson(`https://mempool.space/api/tx/${encodeURIComponent(hash)}`);
    const sats = (j?.vout || []).filter((v: any) => v.scriptpubkey_address === address).reduce((n: number, v: any) => n + Number(v.value || 0), 0);
    if (!sats) return null;
    return { network, tx: hash, to: address, amount: sats / 1e8, ts: (j?.status?.block_time || Date.now() / 1000) * 1000, confirmed: !!j?.status?.confirmed };
  }
  if (network === "eth") {
    if (!keys.etherscan) return null;
    const base = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&apikey=${encodeURIComponent(keys.etherscan)}`;
    const [t, head] = await Promise.all([getJson(`${base}&action=eth_getTransactionByHash&txhash=${encodeURIComponent(hash)}`), getJson(`${base}&action=eth_blockNumber`)]);
    const x = t?.result;
    if (!x || String(x.to).toLowerCase() !== address.toLowerCase()) return null;
    const confirmations = x.blockNumber ? parseInt(head?.result, 16) - parseInt(x.blockNumber, 16) + 1 : 0;
    return { network, tx: hash, to: x.to, amount: Number(BigInt(x.value)) / 1e18, ts: Date.now(), confirmed: confirmations >= 12 };
  }
  if (network === "sol") {
    const j = await postJson("https://api.mainnet-beta.solana.com", { jsonrpc: "2.0", id: 1, method: "getTransaction", params: [hash, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "finalized" }] });
    const r = j?.result;
    if (!r || r.meta?.err) return null;
    const keysList: string[] = (r.transaction?.message?.accountKeys || []).map((k: any) => (typeof k === "string" ? k : k.pubkey));
    const i = keysList.indexOf(address);
    if (i < 0) return null;
    const lamports = Number(r.meta.postBalances?.[i] || 0) - Number(r.meta.preBalances?.[i] || 0);
    if (lamports <= 0) return null;
    return { network, tx: hash, to: address, amount: lamports / 1e9, ts: (r.blockTime || Date.now() / 1000) * 1000, confirmed: true };
  }
  return null;
}

/** USD spot price for a volatile asset (Coinbase public API). */
export async function spotUsd(pair: string): Promise<number> {
  const j = await getJson(`https://api.coinbase.com/v2/prices/${pair}/spot`);
  const p = Number(j?.data?.amount);
  if (!(p > 0)) throw new Error("no price");
  return p;
}

/** Same amount, 2 decimals, as a stable comparable string. */
export const cents = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
