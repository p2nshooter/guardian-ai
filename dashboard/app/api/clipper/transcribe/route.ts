/* AXTO — POST /api/clipper/transcribe  (multipart: audio, language?, provider?, job?, part?, parts?)
 * Transcribes the member's audio on THEIR OWN speech-to-text key (BYOX: Deepgram,
 * Groq or OpenAI). The audio is streamed to the member's provider and never
 * stored by AXTO.
 *
 * A long video is sent as several parts of one job: part 0 counts ONE Clipper
 * video against the monthly quota and opens the job (KV, 6 h); parts 1…n of the
 * same job are free, and are refused without an open job. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getKV } from "@/lib/db";
import { loadSessionFor, unauthorized, effectiveTier, setSessionCookie } from "@/lib/auth";
import { resolveStt, ByoxMissingKey } from "@/lib/ai/byox";
import { transcribe } from "@/lib/ai/providers";
import { limitsFor, planForApp, PLANS, isPlanId } from "@/lib/plans";
import { getCloudApp } from "@/lib/apps";
import { reserveClipperVideo } from "@/lib/usage";
import { fail } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const MAX_AUDIO = 26 * 1024 * 1024; // whisper/groq accept up to ~25MB per request

export async function POST(req: NextRequest) {
  const ctx = await loadSessionFor(req, (tier) => limitsFor(tier).apps.includes("clipper"));
  if (!ctx) return unauthorized();
  const s = ctx.session;
  const tier = effectiveTier(s);
  if (!getCloudApp("clipper")?.live) return fail("This app is coming soon.", 503);
  if (!limitsFor(tier).apps.includes("clipper")) {
    const need = planForApp("clipper");
    return fail(`Clipper needs the ${isPlanId(need) ? PLANS[need].name : "a paid"} plan or higher.`, 402, { upgrade: true });
  }
  const rl = await rateLimit(req, "clipper-stt", s.sub, { max: 20, windowSeconds: 300 });
  if (rl.limited) return fail("You're transcribing very quickly. Please wait a moment.", 429);

  let form: FormData;
  try { form = await req.formData(); } catch { return fail("Send the audio as multipart form data."); }
  const file = form.get("audio");
  if (!(file instanceof Blob) || file.size === 0) return fail("Attach the audio to transcribe.");
  if (file.size > MAX_AUDIO) return fail("This audio is too large (max ~25MB). Clipper extracts a compressed audio track in your browser — try a shorter video.", 413);
  const language = String(form.get("language") || "").trim().slice(0, 10) || undefined;
  const want = String(form.get("provider") || "").trim() || undefined;

  const db = getDB(req);
  // Confirm the member has a speech-to-text key BEFORE spending a monthly quota slot.
  const conn = await resolveStt(db, s.sub, want).catch((e) => { if (e instanceof ByoxMissingKey) return null; throw e; });
  if (!conn) return fail(new ByoxMissingKey("stt").message, 412, { needKey: true, stt: true });

  // Count the video against the monthly quota (once per job), then make the paid STT call.
  const job = String(form.get("job") || "").trim();
  const part = Math.max(0, parseInt(String(form.get("part") || "0"), 10) || 0);
  const parts = Math.max(1, Math.min(40, parseInt(String(form.get("parts") || "1"), 10) || 1));
  if (job && !/^[a-z0-9]{8,40}$/.test(job)) return fail("Bad job id.");
  if (part >= parts) return fail("Bad part number.");
  const jobKey = `clipjob:${s.sub}:${job}`;
  if (job && part > 0) {
    const open = await getKV(req).get(jobKey).catch(() => null);
    if (!open) return fail("This transcription job has expired — upload the video again.", 409);
  } else {
    const quota = await reserveClipperVideo(db, s.sub, tier);
    if (quota) return fail(quota, 402, { upgrade: true });
    if (job) await getKV(req).put(jobKey, String(parts), { expirationTtl: 6 * 3600 });
  }

  try {
    const name = (file as File).name || "audio.webm";
    const tr = await transcribe(conn, file, name, language);
    // A silent stretch in the middle of a long video is fine; only a silent single upload is an error.
    if (!tr.text.trim() && parts === 1) return fail("No speech was detected in this audio.", 422);
    const res = NextResponse.json({ ...tr, provider: conn.provider, model: conn.model });
    if (ctx.refreshed) setSessionCookie(res, ctx.refreshed);
    return res;
  } catch (e: any) {
    return fail(`Transcription failed: ${String(e?.message || e).slice(0, 200)}`, 502);
  }
}
