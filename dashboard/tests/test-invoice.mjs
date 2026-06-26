// Invoice helper tests: render (trial/crypto/standard) + writeInvoice schema integrity.
// Run: node --experimental-strip-types dashboard/tests/test-invoice.mjs
import { renderInvoiceHTML, writeInvoice } from "../lib/invoice.ts";

const R = [];
const ok = (n, c) => R.push({ n, ok: !!c });

// ── render: trial ───────────────────────────────────────────────────────────
const trial = renderInvoiceHTML({ id: "inv_t1", kind: "trial", product: "legal", client_email: "a@b.co", created_at: "2026-06-25T00:00:00Z", amount_usd: 0 });
ok("trial shows Complimentary — No Charge", trial.includes("Complimentary"));
ok("trial total is $0.00", trial.includes("$0.00"));
ok("trial has elegant note", trial.toLowerCase().includes("no charge") && trial.includes("complimentary"));
ok("trial labelled Trial Invoice", trial.includes("Trial Invoice"));

// ── render: crypto ──────────────────────────────────────────────────────────
const crypto = renderInvoiceHTML({ id: "inv_c1", kind: "crypto", product: "guardian", client_email: "a@b.co", created_at: "2026-06-25T00:00:00Z", amount_usd: 4990, amount_crypto: 0.0831, symbol: "ETH", network: "Ethereum", tx_hash: "0xabc123" });
ok("crypto shows symbol + network", crypto.includes("ETH") && crypto.includes("Ethereum"));
ok("crypto shows tx hash", crypto.includes("0xabc123"));
ok("crypto shows USD equivalent", crypto.includes("4,990"));

// ── render: standard ────────────────────────────────────────────────────────
const std = renderInvoiceHTML({ id: "inv_s1", kind: "standard", product: "studio", client_email: "a@b.co", created_at: "2026-06-25", amount_usd: 1990, currency: "USD", gateway: "stripe" });
ok("standard shows USD amount", std.includes("1,990"));
ok("standard not labelled trial", !std.includes("Trial Invoice"));

// ── render: escaping (no injection) ─────────────────────────────────────────
const xss = renderInvoiceHTML({ id: "x", kind: "standard", product: "<script>", client_email: "<b>x</b>@b.co", created_at: "2026-06-25", amount_usd: 1 });
ok("html-escapes user fields", !xss.includes("<script>") && xss.includes("&lt;script&gt;"));

// ── writeInvoice: INSERT column/placeholder integrity (the bug we fixed) ─────
let captured = null;
const mockDb = {
  prepare(sql) {
    return {
      _sql: sql,
      bind(...args) { this._args = args; return this; },
      async first() { return null; },          // clients lookup → no client
      async run() { captured = { sql: this._sql, args: this._args }; return {}; },
    };
  },
};
const invId = await writeInvoice(mockDb, {
  email: "buyer@firm.co", product: "legal", licenseId: "lic1", kind: "crypto",
  amountUsd: 49000, orderId: "ord1", txHash: "0xdead", amountCrypto: 16.3, symbol: "BTC", network: "Bitcoin",
});
ok("writeInvoice returns an id", typeof invId === "string" && invId.startsWith("inv_"));
const cols = (captured.sql.match(/\(([^)]*)\)\s*VALUES/i)?.[1] || "").split(",").length;
const valuesClause = captured.sql.match(/VALUES\s*\(([^)]*)\)/i)?.[1] || "";
const valueItems = valuesClause.split(",").length;
const qMarks = (valuesClause.match(/\?/g) || []).length;
ok("INSERT columns == value items", cols === valueItems);
ok("INSERT ? placeholders == bound args", qMarks === captured.args.length);
ok("uses real schema column client_email", /client_email/.test(captured.sql));
ok("does NOT use the old wrong column user_email", !/user_email/.test(captured.sql));

const passed = R.filter((r) => r.ok).length, failed = R.length - passed;
for (const r of R) if (!r.ok) console.log("FAIL:", r.n);
console.log(`\nINVOICE: ${passed}/${R.length} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
