/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * Support flows shared by the public and admin routes: AI auto-reply when no
 * admin is online, e-mail notifications to the admin inbox and to visitors.
 * ============================================================================ */
import { mails, mailLayout, sendMail, adminInbox } from "../mail";
import { absoluteUrl, SITE } from "../site";
import { getTopic } from "./topics";
import { addMessage, getPresence, readThread, type ThreadRow, type SupportMessage } from "./store";
import { supportAnswer } from "./ai";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const MAX_AI_REPLIES = 40;

export async function notifyAdmin(row: ThreadRow, text: string, reason: string): Promise<void> {
  const topic = getTopic(row.topic);
  const html = mailLayout(`${reason}: ${topic.label.en}`, `
    <p><b>${esc(row.name || "Visitor")}</b> ${row.email ? `&lt;${esc(row.email)}&gt;` : ""} · ${esc(topic.label.en)} · via ${row.source}</p>
    <blockquote style="border-left:3px solid #06bca6;margin:12px 0;padding:4px 12px;color:#334155;white-space:pre-wrap">${esc(text.slice(0, 1500))}</blockquote>`,
    { label: "Open in Admin → Support", href: absoluteUrl(`/admin/support?t=${row.id}`) });
  await sendMail(await adminInbox(), `[${SITE.name} support] ${topic.label.en} — ${row.name || row.email || "visitor"}`, html, row.email || undefined);
}

export async function emailVisitorReply(row: ThreadRow, text: string): Promise<void> {
  if (!row.email) return;
  const html = mailLayout("A reply from the AXTO team", `
    <p>Hi ${esc(row.name || "there")},</p>
    <div style="white-space:pre-wrap;color:#0f172a">${esc(text)}</div>
    <p style="color:#64748b;font-size:13px">You can reply to this e-mail or continue in the chat on ${esc(SITE.url.replace(/^https?:\/\//, ""))}.</p>`,
    { label: `Visit ${SITE.name}`, href: absoluteUrl("/") });
  await sendMail(row.email, `Re: ${row.subject || getTopic(row.topic).label.en}`, html, await adminInbox());
}

export async function ackContact(row: ThreadRow): Promise<void> {
  if (!row.email) return;
  const m = mails.supportReceived({ name: row.name, topic: getTopic(row.topic).label.en });
  await sendMail(row.email, m.subject, m.html, await adminInbox());
}

/**
 * After a visitor message: if no admin is online and the AI may answer, reply.
 * Returns the AI message (or a system note), or null when an admin is online.
 */
export async function autoReply(db: any, row: ThreadRow): Promise<SupportMessage | null> {
  const presence = await getPresence();
  if (presence.online || !row.ai_enabled || row.status === "closed") return null;
  const t = await readThread(row.id);
  if (!t) return null;
  if (t.doc.messages.filter((m) => m.from === "ai").length >= MAX_AI_REPLIES) return null;
  const answer = await supportAnswer(db, row.topic, t.doc.messages);
  if (answer) return addMessage(db, row, "ai", "AXTO Assistant", answer);
  // No AI configured / reachable: say what happens next instead of silence.
  const already = t.doc.messages.some((m) => m.from === "system");
  if (already) return null;
  return addMessage(db, row, "system", "", row.email
    ? "Thanks! Our team is offline right now — we'll reply by e-mail, usually within one business day."
    : "Thanks! Our team is offline right now. Leave your e-mail so we can reply, or check back here later.");
}
