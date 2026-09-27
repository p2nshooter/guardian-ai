/* Contact form → Admin → Support inbox (+ e-mail to the admin, acknowledgement to the sender). */
"use client";
import { useEffect, useState } from "react";
import { openSupport } from "./ChatWidget";

interface Topic { id: string; label: { en: string; id: string }; hint: { en: string; id: string }; handoff: boolean }

export default function ContactForm({ initialTopic = "" }: { initialTopic?: string }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [f, setF] = useState({ topic: initialTopic, name: "", email: "", company: "", message: "", website: "" });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("topic");
    fetch("/api/support").then((r) => r.json()).then((j) => {
      setTopics(j.topics || []);
      setF((x) => ({ ...x, topic: q || x.topic || j.topics?.[0]?.id || "other" }));
    }).catch(() => {});
  }, []);

  const topic = topics.find((t) => t.id === f.topic);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy"); setError("");
    try {
      const r = await fetch("/api/support/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not send your message.");
      setState("done");
    } catch (err: any) { setError(err.message); setState("idle"); }
  }

  if (state === "done") {
    return (
      <div className="card-pad text-center">
        <div className="text-4xl">✅</div>
        <h2 className="mt-3 text-xl font-bold">Message sent</h2>
        <p className="mt-2 text-slate-600">Thanks, {f.name.split(" ")[0] || "there"} — our team usually replies within one business day. We've e-mailed you a copy.</p>
        <button className="btn-secondary mt-5" onClick={() => openSupport(f.topic)}>Prefer live chat? Open it</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card-pad grid gap-4">
      <div>
        <label className="label" htmlFor="c-topic">Topic</label>
        <select id="c-topic" className="input" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>
          {topics.map((t) => <option key={t.id} value={t.id}>{t.label.en}</option>)}
        </select>
        {topic ? <p className="hint">{topic.hint.en}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="c-name">Name</label><input id="c-name" className="input" required maxLength={80} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="c-email">Work e-mail</label><input id="c-email" type="email" className="input" required maxLength={254} autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      </div>
      <div><label className="label" htmlFor="c-company">Company <span className="font-normal text-slate-400">(optional)</span></label><input id="c-company" className="input" maxLength={120} autoComplete="organization" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></div>
      <div>
        <label className="label" htmlFor="c-msg">Message</label>
        <textarea id="c-msg" className="input min-h-[160px]" required minLength={10} maxLength={4000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })}
          placeholder={f.topic === "lifetime" ? "Which apps, how many devices (1–100), your timeline and budget…" : "How can we help?"} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
      {error ? <p className="text-sm font-medium text-rose-600" role="alert">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Send message"}</button>
        <span className="text-xs text-slate-500">Please don't include passwords, card numbers or private keys.</span>
      </div>
    </form>
  );
}
