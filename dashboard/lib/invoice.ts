/* ==============================================================================
 * AXTO — Invoice helper
 *   writeInvoice()       — records a complete invoice using the REAL invoices
 *                          schema (resolves client_id by email; works for trial,
 *                          crypto and standard payments). Every successful
 *                          payment must produce one.
 *   renderInvoiceHTML()  — elegant, professional, printable invoice (print-to-PDF
 *                          friendly). Trial invoices read "Complimentary — No
 *                          Charge" with dignified wording.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export interface InvoiceInput {
  email: string; product: string; licenseId?: string; kind: "trial" | "crypto" | "standard";
  amountUsd: number; orderId?: string; txHash?: string; amountCrypto?: number;
  symbol?: string; network?: string; gateway?: string; paymentRef?: string;
}

export async function writeInvoice(db: any, inv: InvoiceInput): Promise<string> {
  const id = uid("inv");
  let clientId = "";
  try {
    const c: any = await db.prepare("SELECT id FROM clients WHERE email = ? LIMIT 1").bind(inv.email).first();
    clientId = c?.id || "";
  } catch { /* clients lookup optional */ }

  const currency = inv.kind === "crypto" ? (inv.symbol || "USDT") : "USD";
  const gateway = inv.gateway || (inv.kind === "crypto" ? (inv.symbol || "crypto").toLowerCase() : inv.kind);
  const paymentRef = inv.paymentRef || inv.txHash || inv.orderId || "";

  await db.prepare(
    `INSERT INTO invoices
       (id, client_id, license_id, client_email, amount_usd, currency, amount_local,
        gateway, payment_ref, status, kind, product, order_id, tx_hash, amount_crypto, symbol, network, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'paid', ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, clientId, inv.licenseId || "", inv.email, inv.amountUsd, currency,
    gateway, paymentRef, inv.kind, inv.product, inv.orderId || "", inv.txHash || "",
    inv.amountCrypto || 0, inv.symbol || "", inv.network || "",
    new Date().toISOString(),
  ).run();
  return id;
}

const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function renderInvoiceHTML(inv: any): string {
  const isTrial = inv.kind === "trial";
  const isCrypto = inv.kind === "crypto";
  const date = (inv.created_at || "").slice(0, 10);
  const number = "AXTO-" + String(inv.id || "").toUpperCase().slice(-10);
  const amountLine = isTrial
    ? `<span style="color:#16a34a;font-weight:800">Complimentary — No Charge</span>`
    : isCrypto
      ? `${esc(inv.amount_crypto)} ${esc(inv.symbol)} <span style="color:#94a3b8">(≈ $${Number(inv.amount_usd).toLocaleString()})</span>`
      : `$${Number(inv.amount_usd).toLocaleString()} ${esc(inv.currency || "USD")}`;
  const methodLine = isTrial ? "Trial grant" : isCrypto ? `${esc(inv.symbol)} on ${esc(inv.network)}` : esc(inv.gateway || "—");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ${esc(number)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#0f172a;padding:40px 18px}
.inv{max-width:680px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 40px rgba(11,31,58,.10)}
.top{background:linear-gradient(135deg,#0B1F3A,#1F4E8C);color:#fff;padding:34px 40px;display:flex;justify-content:space-between;align-items:flex-start}
.brand{font-size:26px;font-weight:900;letter-spacing:.5px}.brand small{display:block;font-size:12px;font-weight:500;opacity:.8;letter-spacing:0}
.tag{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:6px 14px}
.meta{padding:28px 40px;display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #eef2f7;flex-wrap:wrap}
.meta div{font-size:13px;line-height:1.7}.meta .k{color:#94a3b8;font-weight:600}.meta .v{color:#0f172a;font-weight:700}
.body{padding:28px 40px}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;padding:0 0 10px;border-bottom:2px solid #eef2f7}
td{padding:16px 0;border-bottom:1px solid #f1f5f9;font-size:14px;vertical-align:top}
.tot{display:flex;justify-content:space-between;align-items:center;margin-top:22px;padding:18px 22px;background:#f8fafc;border:1px solid #eef2f7;border-radius:12px}
.tot .l{font-size:13px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px}
.tot .r{font-size:20px;font-weight:900}
.note{margin:22px 40px;padding:14px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;font-size:13px;color:#166534;line-height:1.6}
.foot{padding:22px 40px 34px;color:#94a3b8;font-size:12px;line-height:1.7;text-align:center;border-top:1px solid #eef2f7}
@media print{body{background:#fff;padding:0}.inv{box-shadow:none;border-radius:0}}
</style></head><body>
<div class="inv">
  <div class="top">
    <div class="brand">AXTO<small>axto.io — Sovereign AI Infrastructure</small></div>
    <div class="tag">${isTrial ? "Trial Invoice" : "Invoice"}</div>
  </div>
  <div class="meta">
    <div><div class="k">Invoice No.</div><div class="v">${esc(number)}</div></div>
    <div><div class="k">Date</div><div class="v">${esc(date)}</div></div>
    <div><div class="k">Billed to</div><div class="v">${esc(inv.client_email)}</div></div>
    <div><div class="k">Status</div><div class="v" style="color:#16a34a">PAID</div></div>
  </div>
  <div class="body">
    <table>
      <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr>
          <td><strong>AXTO ${esc((inv.product || "").charAt(0).toUpperCase() + (inv.product || "").slice(1))}</strong><br>
            <span style="color:#94a3b8;font-size:12.5px">${isTrial ? "Complimentary 14-day evaluation license" : "Software license"}</span><br>
            <span style="color:#94a3b8;font-size:12px">Payment method: ${methodLine}</span>
            ${isCrypto && inv.tx_hash ? `<br><span style="color:#94a3b8;font-size:11px;word-break:break-all">Tx: ${esc(inv.tx_hash)}</span>` : ""}
          </td>
          <td style="text-align:right;font-weight:700">${amountLine}</td>
        </tr>
      </tbody>
    </table>
    <div class="tot"><span class="l">Total</span><span class="r">${isTrial ? '<span style="color:#16a34a">$0.00</span>' : amountLine}</span></div>
  </div>
  ${isTrial ? `<div class="note">This is a complimentary trial license issued at no charge. We hope AXTO proves its value to your team — upgrading to a paid plan is available at any time from your dashboard.</div>` : ""}
  <div class="foot">
    Thank you for choosing AXTO.<br>
    This invoice was generated automatically. For questions, contact hallo@axto.io.
  </div>
</div>
</body></html>`;
}
