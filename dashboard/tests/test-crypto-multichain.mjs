// Multi-chain crypto payment tests (BTC/ETH/BNB/USDT). No network.
// Run: node --experimental-strip-types dashboard/tests/test-crypto-multichain.mjs
import {
  createCryptoIntent, matchCryptoTransfer, settleCryptoPayment, toUnits,
} from "../lib/payments/crypto.ts";

const R = [];
const ok = (n, c) => R.push({ n, ok: !!c });
const T0 = Date.UTC(2026, 0, 1);

const METHODS = {
  usdt: { id: "usdt_trc20", symbol: "USDT", name: "Tether", category: "crypto", network: "TRC20", kind: "trc20",
          address: "TNo8jgJqmnUGAPUDb159cC8uhAeFDP8keW", contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
          decimals: 6, confirmations: 20, enabled: 1, sort_order: 10 },
  bnb:  { id: "bnb", symbol: "BNB", name: "BNB", category: "crypto", network: "BEP20", kind: "native",
          address: "0x1bed722b27b3d2bdab3dfe06ea75b84a3a824f3d", contract: "", decimals: 18, confirmations: 12, enabled: 1, sort_order: 20 },
  eth:  { id: "eth", symbol: "ETH", name: "Ethereum", category: "crypto", network: "Ethereum", kind: "native",
          address: "0x1bed722b27b3d2bdab3dfe06ea75b84a3a824f3d", contract: "", decimals: 18, confirmations: 50, enabled: 1, sort_order: 30 },
  btc:  { id: "btc", symbol: "BTC", name: "Bitcoin", category: "crypto", network: "Bitcoin", kind: "native",
          address: "1AzqohLY6XPGbabHmMhstYMPFUThoiBnya", contract: "", decimals: 8, confirmations: 1, enabled: 1, sort_order: 40 },
};

const RATES = { usdt: 1, bnb: 600, eth: 3000, btc: 60000 };

function intentFor(key, amountUsd = 49000) {
  return createCryptoIntent({
    method: METHODS[key], orderId: `ord_${key}_001`, userEmail: "buyer@firm.co",
    product: "legal", packageCode: "legal_professional", amountUsd, rateUsdPerCoin: RATES[key], now: T0,
  });
}

// ── Intent amount conversion ────────────────────────────────────────────────
ok("USDT intent ≈ USD amount (stablecoin)", Math.abs(intentFor("usdt").amountCrypto - 49000) < 0.01);
ok("BTC intent = USD/rate (+tag)", Math.abs(intentFor("btc").amountCrypto - 49000 / 60000) < 0.001);
ok("ETH intent = USD/rate (+tag)", Math.abs(intentFor("eth").amountCrypto - 49000 / 3000) < 0.001);
ok("BNB intent = USD/rate (+tag)", Math.abs(intentFor("bnb").amountCrypto - 49000 / 600) < 0.01);
ok("each method carries its own confirmations", intentFor("btc").minConfirmations === 1 && intentFor("eth").minConfirmations === 50 && intentFor("bnb").minConfirmations === 12 && intentFor("usdt").minConfirmations === 20);

// ── Per-chain matching ──────────────────────────────────────────────────────
function xfer(method, intent, over = {}) {
  return {
    txHash: "0xtx", to: method.address, from: "0xbuyer",
    contract: method.kind === "trc20" ? method.contract : "",
    valueUnits: toUnits(intent.amountCrypto, method.decimals).toString(),
    timestampMs: T0 + 5 * 60_000, confirmations: method.confirmations + 5, ...over,
  };
}
for (const key of ["usdt", "bnb", "eth", "btc"]) {
  const m = METHODS[key], it = intentFor(key);
  const now = T0 + 6 * 60_000;
  ok(`${key}: exact confirmed payment matches`, matchCryptoTransfer(m, it, [xfer(m, it)], { now }).matched);
  ok(`${key}: wrong amount → mismatch`, matchCryptoTransfer(m, it, [xfer(m, it, { valueUnits: "123" })], { now }).reason === "amount_mismatch");
  ok(`${key}: too few confirmations → pending`, matchCryptoTransfer(m, it, [xfer(m, it, { confirmations: 0 })], { now }).reason === "insufficient_confirmations");
  ok(`${key}: to other address ignored`, matchCryptoTransfer(m, it, [xfer(m, it, { to: "0xother" })], { now }).reason === "no_transfer");
  ok(`${key}: expired intent`, matchCryptoTransfer(m, it, [xfer(m, it)], { now: it.expiresAt + 1 }).reason === "expired");
}
// USDT token-contract enforcement
{
  const m = METHODS.usdt, it = intentFor("usdt");
  ok("USDT: wrong token contract rejected", matchCryptoTransfer(m, it, [xfer(m, it, { contract: "TWrongTokenXXXX" })], { now: T0 + 6 * 60_000 }).reason === "wrong_token");
}
// EVM address case-insensitivity
{
  const m = METHODS.eth, it = intentFor("eth");
  ok("ETH: address match is case-insensitive", matchCryptoTransfer(m, it, [xfer(m, it, { to: m.address.toUpperCase() })], { now: T0 + 6 * 60_000 }).matched);
}

// ── Settlement issues license + MANDATORY invoice ────────────────────────────
for (const key of ["usdt", "btc", "eth", "bnb"]) {
  const m = METHODS[key], it = intentFor(key);
  let lic = null, inv = null;
  const res = await settleCryptoPayment(m, it, {
    fetchTransfers: async () => [xfer(m, it)],
    issueLicense: async (a) => { lic = a; return { licenseId: `lic_${key}` }; },
    writeInvoice: async (a) => { inv = a; return { invoiceId: `inv_${key}` }; },
    now: T0 + 6 * 60_000,
  });
  ok(`${key}: settlement issues license`, res.settled && res.licenseId === `lic_${key}`);
  ok(`${key}: settlement ALWAYS writes an invoice`, res.invoiceId === `inv_${key}` && inv && inv.symbol === m.symbol);
}
// Unconfirmed payment issues NOTHING (no license, no invoice)
{
  const m = METHODS.btc, it = intentFor("btc");
  let issued = false, invoiced = false;
  const res = await settleCryptoPayment(m, it, {
    fetchTransfers: async () => [xfer(m, it, { confirmations: 0 })],
    issueLicense: async () => { issued = true; return { licenseId: "x" }; },
    writeInvoice: async () => { invoiced = true; return { invoiceId: "y" }; },
    now: T0 + 6 * 60_000,
  });
  ok("unconfirmed → no license, no invoice", !res.settled && !issued && !invoiced);
}

// ── Enabled-only registry filter (disabled hidden everywhere) ────────────────
function getEnabled(rows) { return rows.filter((r) => r.enabled === 1); }
const rows = [
  { id: "usdt_trc20", enabled: 1 }, { id: "bnb", enabled: 1 }, { id: "eth", enabled: 1 }, { id: "btc", enabled: 1 },
  { id: "stripe", enabled: 0 }, { id: "paypal", enabled: 0 }, { id: "xendit", enabled: 0 }, { id: "midtrans", enabled: 0 },
];
const en = getEnabled(rows).map((r) => r.id);
ok("only 4 crypto methods enabled by default", en.length === 4 && en.includes("usdt_trc20") && en.includes("btc"));
ok("fiat methods hidden by default", !en.includes("stripe") && !en.includes("paypal") && !en.includes("xendit") && !en.includes("midtrans"));

const passed = R.filter((r) => r.ok).length, failed = R.length - passed;
for (const r of R) if (!r.ok) console.log("FAIL:", r.n);
console.log(`\nCRYPTO-MULTICHAIN: ${passed}/${R.length} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
