/* AXTO — GET /api/billing/invoice/:orderId · printable HTML invoice (from R2, rebuilt if missing). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, getR2 } from "@/lib/db";
import { loadSession } from "@/lib/auth";
import { renderInvoice, type OrderRow } from "@/lib/billing/activate";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadSession(req);
  if (!ctx) return NextResponse.redirect(new URL(`/login?redirect=/app/billing`, req.url));
  const db = getData(req);
  const o: OrderRow | null = await db.orders.get(id);
  if (!o || o.status !== "paid" || (o.user_id !== ctx.session.sub && ctx.session.role !== "admin")) {
    return new NextResponse("Invoice not found", { status: 404 });
  }
  let html = "";
  try {
    const obj = await getR2(req).get(`invoices/${o.invoice_no.slice(5, 9)}/${o.id}.html`);
    if (obj) html = await obj.text();
  } catch {}
  if (!html) {
    const u = await db.users.get(o.user_id);
    html = renderInvoice(o, { name: u?.name });
  }
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}
