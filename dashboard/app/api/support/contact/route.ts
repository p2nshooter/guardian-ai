/* AXTO — POST /api/support/contact {name, email, company?, topic, message, website?}
 * The contact form: lands in Admin → Support as a conversation (source
 * "contact"), is e-mailed to the admin inbox, and the sender gets an
 * acknowledgement. Rate-limited per IP; `website` is a honeypot. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { loadSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { readJson, fail, ipOf } from "@/lib/http";
import { getTopic } from "@/lib/support/topics";
import { createThread, getThreadRow, cleanText } from "@/lib/support/store";
import { ackContact, notifyAdmin } from "@/lib/support/service";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const b = await readJson(req);
  if (b?.website) return NextResponse.json({ ok: true });
  const rl = await rateLimit(req, "support-contact", ipOf(req) || "anon", { max: 5, windowSeconds: 3600 });
  if (rl.limited) return fail("Too many messages from your network. Please try again later.", 429);

  const ctx = await loadSession(req).catch(() => null);
  const name = cleanText(b?.name, 80);
  const email = cleanText(b?.email, 254).toLowerCase();
  const company = cleanText(b?.company, 120);
  const message = cleanText(b?.message);
  const topic = getTopic(b?.topic);
  if (!name) return fail("Tell us your name.");
  if (!EMAIL_RE.test(email)) return fail("Enter a valid e-mail address so we can reply.");
  if (message.length < 10) return fail("Tell us a bit more (at least 10 characters).");

  const db = getDB(req);
  const text = company ? `${message}\n\n— ${company}` : message;
  const { id } = await createThread(db, {
    name, email, topic: topic.id, source: "contact", userId: ctx?.session.sub || null,
    subject: `${topic.label.en}${company ? ` — ${company}` : ""}`, needsAdmin: true, first: { name, text },
  });
  const row = (await getThreadRow(db, id))!;
  await Promise.all([notifyAdmin(row, text, "Contact form").catch(() => {}), ackContact(row).catch(() => {})]);
  return NextResponse.json({ ok: true });
}
