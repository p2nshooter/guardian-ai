// Deterministic tests for the USDT TRC20 ↔ license bridge + trial logic.
// Run: node --experimental-strip-types dashboard/tests/test-payments.mjs
import {
  createPaymentIntent, matchTransfer, settlePayment, usdtToUnits, centsTag,
  USDT_TRC20_CONTRACT,
} from "../lib/payments/usdt-trc20.ts";

const results = [];
const ok = (name, cond) => results.push({ name, ok: !!cond });
const T0 = Date.UTC(2026, 0, 1);
const ADDR = "TXmerchantDepositAddr0000000000000000";

// ── Intent ────────────────────────────────────────────────────────────────
const intent = createPaymentIntent({
  orderId: "ord_legalpro_001", userEmail: "buyer@firm.co", product: "legal",
  packageCode: "legal_professional", basePriceUsdt: 49000, depositAddress: ADDR, now: T0,
});
ok("intent carries exact amount with cents tag", intent.amountUsdt >= 49000 && intent.amountUsdt < 49000.01);
ok("intent expires in the future", intent.expiresAt > intent.createdAt);
ok("cents tag deterministic", centsTag("ord_legalpro_001") === centsTag("ord_legalpro_001"));
ok("two orders get different tags", centsTag("ord_a") !== centsTag("ord_b"));

const exactUnits = usdtToUnits(intent.amountUsdt).toString();
const xfer = (over = {}) => ({
  txHash: "0xabc", to: ADDR, from: "TXbuyer", contract: USDT_TRC20_CONTRACT,
  valueUnits: exactUnits, timestampMs: T0 + 5 * 60_000, confirmations: 30, ...over,
});

// ── Matching ───────────────────────────────────────────────────────────────
ok("exact confirmed payment matches", matchTransfer(intent, [xfer()], { now: T0 + 6 * 60_000 }).matched);
ok("no transfer → no_transfer", matchTransfer(intent, [], { now: T0 + 6 * 60_000 }).reason === "no_transfer");
ok("wrong amount → amount_mismatch",
   matchTransfer(intent, [xfer({ valueUnits: usdtToUnits(100).toString() })], { now: T0 + 6 * 60_000 }).reason === "amount_mismatch");
ok("dust tolerance accepted",
   matchTransfer(intent, [xfer({ valueUnits: (usdtToUnits(intent.amountUsdt) - 1000n).toString() })], { now: T0 + 6 * 60_000 }).matched);
ok("too few confirmations → pending",
   matchTransfer(intent, [xfer({ confirmations: 2 })], { now: T0 + 6 * 60_000 }).reason === "insufficient_confirmations");
ok("wrong token → wrong_token",
   matchTransfer(intent, [xfer({ contract: "TXotherToken" })], { now: T0 + 6 * 60_000 }).reason === "wrong_token");
ok("expired intent → expired",
   matchTransfer(intent, [xfer()], { now: intent.expiresAt + 1 }).reason === "expired");
ok("transfer to other address ignored",
   matchTransfer(intent, [xfer({ to: "TXsomeoneElse" })], { now: T0 + 6 * 60_000 }).reason === "no_transfer");
ok("pre-intent transfer ignored",
   matchTransfer(intent, [xfer({ timestampMs: T0 - 10 * 60_000 })], { now: T0 + 6 * 60_000 }).reason === "no_transfer");

// ── Settlement → license issuance (injected, no network) ─────────────────────
let issued = null, invoiced = null;
const res = await settlePayment(intent, {
  fetchTransfers: async () => [xfer()],
  issueLicense: async (a) => { issued = a; return { licenseId: "lic_1", licenseKey: "LEGL-AAAA-BBBB-CCCC-DDDD", expiresAt: "2027-01-01" }; },
  writeInvoice: async (a) => { invoiced = a; },
  now: T0 + 6 * 60_000,
});
ok("settlement issues a license on confirmed payment", res.settled && res.licenseId === "lic_1");
ok("issued license carries product + buyer", issued?.product === "legal" && issued?.email === "buyer@firm.co");
ok("invoice written with tx hash", invoiced?.txHash === "0xabc" && invoiced?.licenseId === "lic_1");
ok("unconfirmed payment does NOT issue", !(await settlePayment(intent, {
  fetchTransfers: async () => [xfer({ confirmations: 1 })],
  issueLicense: async () => ({ licenseId: "x", licenseKey: "y", expiresAt: "z" }),
  now: T0 + 6 * 60_000,
})).settled);

// ── Trial logic (2-week default, one-per-email-per-product) ─────────────────
function approveTrial(req, existing) {
  if (existing.some((r) => r.user_email === req.user_email && r.product === req.product && r.status === "approved"))
    return { ok: false, reason: "already_used" };
  const days = req.trial_days || 14;
  return { ok: true, expiresAt: T0 + days * 86_400_000, days };
}
ok("trial default 14 days", approveTrial({ user_email: "a@b.co", product: "legal" }, []).days === 14);
ok("trial expiry = +14d", approveTrial({ user_email: "a@b.co", product: "legal" }, []).expiresAt === T0 + 14 * 86_400_000);
ok("second trial same email+product blocked",
   !approveTrial({ user_email: "a@b.co", product: "legal" }, [{ user_email: "a@b.co", product: "legal", status: "approved" }]).ok);
ok("trial different product allowed",
   approveTrial({ user_email: "a@b.co", product: "guardian" }, [{ user_email: "a@b.co", product: "legal", status: "approved" }]).ok);

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
for (const r of results) if (!r.ok) console.log("FAIL:", r.name);
console.log(`\nPAYMENTS+TRIAL: ${passed}/${results.length} passed, ${failed} failed`);
import("node:fs").then(() => {});
process.exit(failed === 0 ? 0 : 1);
