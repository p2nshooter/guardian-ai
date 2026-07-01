/* ==============================================================================
 * GET /api/portal/invoice/[id]   (client)
 *   Renders the client's invoice as an elegant, printable HTML page (print-to-PDF
 *   friendly). Only the invoice owner may view it.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { renderInvoiceHTML } from "@/lib/invoice";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDB(req);
  const id = (await ctx.params).id;
  const inv: any = await db.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first();
  if (!inv) return NextResponse.json({ error: "invoice not found" }, { status: 404 });

  // Owner-only: the invoice's email must match the session user.
  if ((inv.client_email || "").toLowerCase() !== String((user as any).email || "").toLowerCase())
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const html = renderInvoiceHTML(inv);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="axto-invoice-${id}.html"`,
    },
  });
}
