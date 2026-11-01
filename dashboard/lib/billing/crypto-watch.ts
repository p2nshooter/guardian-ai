/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * Direct-wallet crypto orders: quote at checkout, automatic confirmation.
 *
 *   quoteCrypto()        unique stablecoin amount (e.g. 49.37) + spot quotes
 *                        for BTC/ETH/SOL, stored in orders.meta.crypto
 *   watchCryptoOrders()  cron: match incoming stablecoin transfers by exact
 *                        amount; re-check submitted transaction hashes
 *   verifyCryptoProof()  the customer's transaction hash → paid, or pending
 *
 * A payment is accepted only when: it went to OUR configured address, on the
 * right network/token, for at least the quoted amount, after the order was
 * created, with enough confirmations, and the tx never paid another order.
 * ============================================================================ */
import { now } from "../db";
import type { Data } from "../data";
import type { OrderDoc } from "../data/schema";
import { ids } from "../data/schema";
import { patchMeta } from "../data/meta";
import { gatewayCreds, CRYPTO_ASSETS } from "./gateways";
import { markOrderPaid } from "./activate";
import { STABLE, VOLATILE, incomingTransfers, transferByHash, spotUsd, cents, type Network, type Transfer } from "./chain";

export interface CryptoQuote {
  amount: string;                                   // stablecoins, e.g. "49.37"
  quotes: Record<string, { price: number; amount: number }>;   // BTC/ETH/SOL
  at: string;
  proof?: { network: Network; tx: string; at: string; status: "pending" | "rejected"; reason?: string };
}

const WINDOW_MS = 72 * 3600_000;
const QUOTE_TTL_MS = 2 * 3600_000;

function meta(o: any): any {
  try { return JSON.parse(o.meta || "{}"); } catch { return {}; }
}

/** Unique amount among open crypto orders of the same price + volatile quotes. */
/** Open crypto orders of the last WINDOW_MS, oldest first. */
async function openCryptoOrders(db: Data): Promise<OrderDoc[]> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const page = await db.orders.listAllDocs("pending", "crypto", 2000);
  return page.filter((o) => o.status === "pending" && o.created_at > since);
}

export async function quoteCrypto(db: Data, amountUsd: number, creds: Record<string, string>): Promise<CryptoQuote> {
  const open = (await openCryptoOrders(db)).filter((o) => o.amount_usd === amountUsd);
  const taken = new Set(open.map((o) => meta(o)?.crypto?.amount).filter(Boolean));
  let amount = "";
  for (let i = 0; i < 200 && !amount; i++) {
    const c = cents(Math.floor(amountUsd) + (1 + Math.floor(Math.random() * 99)) / 100 + (amountUsd - Math.floor(amountUsd)));
    if (!taken.has(c)) amount = c;
  }
  const quotes: CryptoQuote["quotes"] = {};
  for (const v of VOLATILE) {
    if (!creds[v.network]) continue;
    try {
      const price = await spotUsd(v.coinbase);
      quotes[v.symbol] = { price, amount: Number((Number(amount || amountUsd) / price).toFixed(v.symbol === "BTC" ? 8 : 6)) };
    } catch {}
  }
  return { amount: amount || cents(amountUsd), quotes, at: now() };
}

/** One transaction pays one order: the proof is created once (create-only), and only the creator settles. */
async function claimTx(db: Data, t: Transfer, orderId: string): Promise<boolean> {
  const hash = `${t.network}:${t.network.startsWith("usdt_trc") || t.network === "btc" || t.network === "sol" ? t.tx : t.tx.toLowerCase()}`;
  const id = ids.proof(hash);
  // Already recorded for this same order (a run that stopped before settling): settling again is safe, markOrderPaid is idempotent.
  const existing = await db.paymentProofs.get(id);
  if (existing) return existing.order_id === orderId;
  if (await db.paymentProofs.createIfAbsent({ id, tx_hash: hash, network: t.network, order_id: orderId, amount: t.amount, created_at: now() })) return true;
  return (await db.paymentProofs.get(id))?.order_id === orderId;
}

function acceptable(order: any, q: CryptoQuote, t: Transfer, livePrice?: number): { ok: boolean; reason?: string } {
  const created = Date.parse(order.created_at.endsWith("Z") ? order.created_at : `${order.created_at}Z`);
  if (t.ts && t.ts < created - 10 * 60_000) return { ok: false, reason: "The transaction is older than the order." };
  if (!t.confirmed) return { ok: false, reason: "Waiting for confirmations." };
  if (STABLE.includes(t.network)) {
    return t.amount + 0.000001 >= Number(q.amount) ? { ok: true } : { ok: false, reason: `Received ${t.amount} but the order needs ${q.amount}.` };
  }
  const sym = VOLATILE.find((v) => v.network === t.network)?.symbol || "";
  const quote = q.quotes[sym];
  const fresh = quote && Date.now() - Date.parse(q.at) < QUOTE_TTL_MS;
  const needed = fresh ? quote!.amount : livePrice ? Number(q.amount) / livePrice : Infinity;
  return t.amount >= needed * 0.99 ? { ok: true } : { ok: false, reason: `Received ${t.amount} ${sym}, expected about ${needed.toFixed(8)} ${sym}.` };
}

async function settle(db: Data, order: any, t: Transfer): Promise<boolean> {
  if (!(await claimTx(db, t, order.id))) return false;         // already paid another order
  const r = await markOrderPaid(db, order.id, { gatewayRef: `${t.network}:${t.tx}`, actor: `chain:${t.network}`, gateway: "crypto" });
  return r.ok;
}

/** Customer-supplied transaction hash. */
export async function verifyCryptoProof(db: Data, orderId: string, network: Network, tx: string): Promise<{ status: "paid" | "pending" | "rejected"; message: string }> {
  const order = await db.orders.get(orderId);
  if (!order || order.gateway !== "crypto") return { status: "rejected", message: "Order not found." };
  if (order.status === "paid") return { status: "paid", message: "This order is already paid." };
  const creds = await gatewayCreds(db, "crypto");
  const address = creds?.[network];
  if (!creds || !address) return { status: "rejected", message: "That network isn't accepted for this order." };
  const m = meta(order);
  const q: CryptoQuote = m.crypto || { amount: String(order.amount_usd), quotes: {}, at: order.created_at };
  let t: Transfer | null = null;
  try {
    t = await transferByHash(network, tx, address, { tron: creds.tron_api_key, etherscan: creds.etherscan_api_key });
  } catch {
    t = null;
  }
  const save = async (status: "pending" | "rejected", reason = "") => {
    const proof = { network, tx: tx.trim(), at: now(), status, reason };
    await db.orders.update(orderId, (o) => ({ ...o, meta: patchMeta(o.meta, (m) => { m.crypto = { ...(m.crypto || {}), proof }; }) }));
  };
  if (!t) {
    await save("pending", "Not visible on-chain yet (or not sent to our address).");
    return { status: "pending", message: "We can't see this transaction to our address yet. We'll keep checking automatically for the next 72 hours." };
  }
  let live: number | undefined;
  const sym = VOLATILE.find((v) => v.network === network);
  if (sym) try { live = await spotUsd(sym.coinbase); } catch {}
  const ok = acceptable(order, q, t, live);
  if (!ok.ok) {
    const waiting = ok.reason === "Waiting for confirmations.";
    await save(waiting ? "pending" : "rejected", ok.reason);
    return { status: waiting ? "pending" : "rejected", message: waiting ? "Transaction found — waiting for confirmations. Your licence is issued automatically once confirmed." : ok.reason! };
  }
  if (await settle(db, order, t)) return { status: "paid", message: "Payment confirmed on-chain. Your plan is active and your licences have been issued." };
  await save("rejected", "This transaction already paid another order.");
  return { status: "rejected", message: "This transaction already paid another order." };
}

/** Cron: auto-match stablecoin transfers and re-check submitted hashes. */
export async function watchCryptoOrders(db: Data): Promise<{ checked: number; paid: number }> {
  // One list call when nothing is pending.
  if (!(await db.orders.list("pending", "crypto", { limit: 1 })).entries.length) return { checked: 0, paid: 0 };
  const orders = await openCryptoOrders(db);
  if (!orders.length) return { checked: 0, paid: 0 };
  const creds = await gatewayCreds(db, "crypto");
  if (!creds) return { checked: orders.length, paid: 0 };
  const keys = { tron: creds.tron_api_key, etherscan: creds.etherscan_api_key };
  let paid = 0;

  // 1. Stablecoins: one explorer call per configured network, exact-amount match.
  const since = Math.min(...orders.map((o) => Date.parse(o.created_at.endsWith("Z") ? o.created_at : `${o.created_at}Z`))) - 10 * 60_000;
  const open = new Map(orders.map((o) => [o.id, o]));
  for (const network of STABLE) {
    const address = creds[network];
    if (!address) continue;
    let transfers: Transfer[] = [];
    try { transfers = await incomingTransfers(network, address, since, keys); } catch { continue; }
    for (const t of transfers) {
      if (!t.confirmed) continue;
      for (const o of open.values()) {
        const q: CryptoQuote | undefined = meta(o).crypto;
        if (!q || cents(t.amount) !== q.amount) continue;
        if (!acceptable(o, q, t).ok) continue;
        if (await settle(db, o, t)) { paid++; open.delete(o.id); }
        break;
      }
    }
  }

  // 2. Hashes customers submitted that were still waiting.
  for (const o of open.values()) {
    const proof = meta(o)?.crypto?.proof;
    if (proof?.status === "pending" && proof.tx) {
      const r = await verifyCryptoProof(db, o.id, proof.network, proof.tx);
      if (r.status === "paid") paid++;
    }
  }
  return { checked: orders.length, paid };
}

export const CRYPTO_NETWORKS: Network[] = CRYPTO_ASSETS.map((a) => a.key as Network);
