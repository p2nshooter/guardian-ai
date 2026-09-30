/* SECURITY ANALYST v4 — Evidence: paste or drop logs, alerts, e-mails and
 * text; any other file is hashed on the device. E-mails are analysed at once
 * (phishing report stored with the case; the raw message is not kept). */
"use client";
import { useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import { MAX_ARTIFACT_CHARS, MAX_CASE_CHARS, caseChars, newId, type Artifact, type ArtifactKind, type Case, type Computed } from "@/lib/security/case";
import { sniff } from "@/lib/security/parse";
import { analyzeEmail } from "@/lib/security/eml";
import { md5 } from "@/lib/security/decode";
import type { SecurityDict } from "@/lib/i18n-pages/security";

export const looksEmail = (s: string) => /^(?:Received|Return-Path|Delivered-To|From|Message-ID|MIME-Version|X-[\w-]+):/im.test(s.slice(0, 4000)) && /^Subject:/im.test(s.slice(0, 20000)) && /^From:/im.test(s.slice(0, 20000));
const isBinary = (b: Uint8Array) => { const n = Math.min(b.length, 8000); let bad = 0; for (let i = 0; i < n; i++) if (b[i] === 0 || (b[i] < 9 && b[i] !== 0)) bad++; return n > 0 && bad / n > 0.02; };
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, "0")).join("");

/** Build an artifact from text (kind auto-detected). */
export async function makeArtifact(name: string, text: string, kind?: ArtifactKind): Promise<Artifact> {
  const k: ArtifactKind = kind || (looksEmail(text) ? "email" : sniff(text) === "text" && !/\n.*\n/.test(text) && text.length < 4000 ? "text" : "log");
  const fmt = k === "log" ? sniff(text) : undefined;
  const fallback = k === "email" ? "message.eml" : k === "log" ? `pasted-${fmt}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}.log` : "note.txt";
  const base = { id: newId("a"), name: name || fallback, kind: k, size: text.length, addedAt: new Date().toISOString() };
  if (k === "email") {
    const r = await analyzeEmail(text);
    const { html: _h, text: body, headers: _hd, ...rest } = r;
    return { ...base, text: "", email: { ...rest, textSample: body.slice(0, 4000) } };
  }
  return { ...base, text, format: fmt };
}

export default function Evidence({ t, c, k, onCase }: { t: SecurityDict; c: Case; k: Computed; onCase: (c: Case) => void }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const counts = new Map<string, number>();
  for (const e of k.events) if (e.artifact) counts.set(e.artifact, (counts.get(e.artifact) || 0) + 1);

  async function addArtifacts(list: Artifact[]) {
    const room = MAX_CASE_CHARS - caseChars(c);
    const ok = list.filter((a) => a.text.length <= Math.min(MAX_ARTIFACT_CHARS, room));
    const bad = list.filter((a) => !ok.includes(a));
    if (bad.length) setErr(bad.map((a) => t.tooLarge.replace("{name}", a.name).replace("{mb}", String(Math.round(MAX_CASE_CHARS / 1e6)))).join(" "));
    if (ok.length) onCase({ ...c, artifacts: [...c.artifacts, ...ok], title: c.title || ok[0].email?.subject || "" });
  }
  async function addText() {
    if (!text.trim()) return;
    setErr(""); setBusy("…");
    try { await addArtifacts([await makeArtifact(name.trim(), text)]); setText(""); setName(""); } catch (e: any) { setErr(String(e?.message || e)); }
    setBusy("");
  }
  async function addFiles(files: FileList | File[]) {
    setErr("");
    const out: Artifact[] = [];
    for (const f of Array.from(files).slice(0, 30)) {
      setBusy(f.name);
      try {
        const buf = await f.arrayBuffer();
        const bytes = new Uint8Array(buf);
        if (isBinary(bytes) && !/\.(?:eml|txt|log|json|csv|xml|evtx\.xml)$/i.test(f.name)) {
          const [s256, s1] = await Promise.all([crypto.subtle.digest("SHA-256", buf), crypto.subtle.digest("SHA-1", buf)]);
          const body = `${t.hashed}: ${f.name}\nsize=${f.size}\nsha256=${hex(s256)}\nsha1=${hex(s1)}\nmd5=${md5(bytes)}\n`;
          out.push({ id: newId("a"), name: f.name, kind: "text", size: body.length, addedAt: new Date().toISOString(), text: body });
        } else {
          const s = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
          out.push(await makeArtifact(f.name, s, /\.eml$/i.test(f.name) ? "email" : undefined));
        }
      } catch (e: any) { setErr(String(e?.message || e)); }
    }
    await addArtifacts(out);
    setBusy("");
  }

  return (
    <div className="space-y-4">
      <section className="card-pad">
        <h3 className="font-bold text-slate-900">{t.addEvidence}</h3>
        <input className="input mt-2" placeholder={t.evidenceName} value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="textarea mt-2 min-h-[180px] w-full font-mono text-xs" placeholder={t.evidencePh} value={text} onChange={(e) => setText(e.target.value)} data-testid="sec-evidence-text" spellCheck={false} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={addText} disabled={!text.trim() || !!busy} data-testid="sec-evidence-add">{busy === "…" ? <Spinner /> : "＋"} {t.add}</button>
          {text.trim() ? <span className="text-xs text-slate-500">{t.format}: <span className="font-mono">{looksEmail(text) ? "email" : sniff(text)}</span></span> : null}
        </div>
        <button type="button" onClick={() => input.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
          className={`mt-4 flex w-full items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm ${drag ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50 text-slate-600"}`}>
          {busy && busy !== "…" ? <><Spinner /> {t.reading.replace("{name}", busy)}</> : `📂 ${t.dropFiles}`}
        </button>
        <input ref={input} type="file" multiple className="hidden" data-testid="sec-evidence-files" onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }} />
        {err ? <p className="mt-2 text-sm text-rose-700">{err}</p> : null}
        <p className="mt-2 text-xs text-emerald-700">🛡️ {t.onDevice}</p>
      </section>

      {c.artifacts.length ? (
        <section className="card-pad">
          <ul className="divide-y divide-slate-100" data-testid="sec-artifacts">
            {c.artifacts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="text-lg">{a.kind === "email" ? "✉️" : a.kind === "log" ? "📜" : "📝"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-800">{a.name}</div>
                  <div className="text-xs text-slate-500">
                    {a.kind === "email" ? t.kindEmail : a.kind === "log" ? t.kindLog : t.kindText}
                    {a.format ? ` · ${a.format}` : ""} · {a.size.toLocaleString()} B
                    {a.kind === "log" ? ` · ${t.eventsN.replace("{n}", String(counts.get(a.name) || 0))}` : ""}
                    {a.email ? ` · ${a.email.verdict} (${a.email.score})` : ""}
                  </div>
                </div>
                <button type="button" className="btn-ghost btn-sm" onClick={() => onCase({ ...c, artifacts: c.artifacts.filter((x) => x.id !== a.id) })}>✕ {t.remove}</button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
