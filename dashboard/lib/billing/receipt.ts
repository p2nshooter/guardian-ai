/* AXTO — BNI / bank-transfer receipts.
 * The member uploads a photo or PDF of the transfer; it is kept private in R2
 * (receipts/<orderId>/…), shown only to admins, and the admin approves (plan +
 * licences activate instantly) or rejects with a reason (the member uploads again). */
import { getR2, now } from "../db";

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

export interface ReceiptMeta { key: string; type: string; size: number; name: string; at: string }

/** Detects the real file type from its first bytes — the browser-sent type is not trusted. */
export function sniffReceipt(b: Uint8Array): { type: string; ext: string } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { type: "image/png", ext: "png" };
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return { type: "image/webp", ext: "webp" };
  if (b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === "%PDF-") return { type: "application/pdf", ext: "pdf" };
  return null;
}

/** Validates and stores a receipt; returns its metadata or an error message for the member. */
export async function storeReceipt(orderId: string, file: File): Promise<{ ok: true; receipt: ReceiptMeta } | { ok: false; error: string }> {
  if (!file.size) return { ok: false, error: "The receipt file is empty." };
  if (file.size > RECEIPT_MAX_BYTES) return { ok: false, error: "The receipt is larger than 5 MB — please send a smaller photo or PDF." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffReceipt(bytes);
  if (!kind) return { ok: false, error: "Upload the receipt as a JPG, PNG, WebP photo or a PDF." };
  const at = now();
  const key = `receipts/${orderId}/${Date.now().toString(36)}.${kind.ext}`;
  await getR2().put(key, bytes, { httpMetadata: { contentType: kind.type }, customMetadata: { orderId } });
  const name = String(file.name || `receipt.${kind.ext}`).replace(/[^\w.\- ]+/g, "_").slice(0, 80);
  return { ok: true, receipt: { key, type: kind.type, size: bytes.length, name, at } };
}

/** Reads a stored receipt (admin view). Only keys under receipts/ are ever served. */
export async function readReceipt(key: string) {
  if (!/^receipts\/[\w-]+\/[\w]+\.(jpg|png|webp|pdf)$/.test(key)) return null;
  return getR2().get(key);
}
