/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * A new order document with every field set (the defaults the D1 table had).
 * ============================================================================ */
import { now } from "../db";
import type { Data } from "../data";
import type { OrderDoc } from "../data/schema";

export function newOrder(f: Pick<OrderDoc, "id" | "user_id" | "email" | "plan" | "cycle" | "amount_usd" | "gateway"> & Partial<OrderDoc>): OrderDoc {
  return {
    invoice_no: "", currency: "USD", amount_local: 0, gateway_ref: "", status: "pending", meta: "{}", created_at: now(), paid_at: "",
    ...f,
  };
}

/** The member's own order, or null (another member's order is "not found"). */
export async function ownOrder(db: Data, id: string, userId: string): Promise<OrderDoc | null> {
  const o = await db.orders.get(String(id || ""));
  return o && o.user_id === userId ? o : null;
}

/** A gateway's failure/expiry notice: pending → status, for that gateway's own order only. */
export async function closePending(db: Data, id: string, gateway: string, status: string): Promise<void> {
  if (!(await db.orders.get(String(id || "")))) return;
  await db.orders.update(id, (o) => (o.status === "pending" && o.gateway === gateway ? { ...o, status } : null));
}
