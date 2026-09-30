/* SECURITY ANALYST v4 — Phishing: the analysis of every e-mail in the case:
 * verdict and score, findings, SPF / DKIM / DMARC, the delivery path, links
 * and attachments (SHA-256 with a VirusTotal look-up). */
"use client";
import type { Computed } from "@/lib/security/case";
import type { SecurityDict } from "@/lib/i18n-pages/security";
import { Sev } from "./shared";

const AUTH_TONE = (v: string) => (v === "pass" ? "bg-emerald-100 text-emerald-800" : v === "fail" || v === "softfail" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600");

export default function Phishing({ t, k }: { t: SecurityDict; k: Computed }) {
  if (!k.emails.length) return <div className="card-pad text-sm text-slate-500">{t.noEmails}</div>;
  return (
    <div className="space-y-4">
      {k.emails.map((a) => {
        const e = a.email!;
        const tone = e.verdict === "phishing" ? "bg-rose-600 text-white" : e.verdict === "suspicious" ? "bg-amber-400 text-ink-950" : "bg-emerald-500 text-white";
        return (
          <section key={a.id} className="card-pad" data-testid="sec-email">
            <div className="flex flex-wrap items-start gap-4">
              <div className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl ${tone}`}><div className="text-2xl font-black">{e.score}</div><div className="text-[10px] font-bold uppercase">{t.score}</div></div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-slate-900" data-testid="sec-email-verdict">{t.verdictEmail[e.verdict]}</div>
                <div className="truncate font-semibold text-slate-800">{e.subject || a.name}</div>
                <div className="text-xs text-slate-500">{e.from} · {e.date}</div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className="font-semibold text-slate-600">{t.auth}:</span>
                  {(["spf", "dkim", "dmarc"] as const).map((x) => <span key={x} className={`rounded px-1.5 py-0.5 font-mono ${AUTH_TONE(e.auth[x])}`}>{x.toUpperCase()} {e.auth[x]}</span>)}
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{t.findings}</div>
            {e.findings.length ? <ul className="mt-1 space-y-1.5">{e.findings.map((f, i) => <li key={i} className="flex flex-wrap items-baseline gap-2 text-sm"><Sev t={t} s={f.severity} /><span className="font-semibold text-slate-800">{f.title}</span><span className="text-slate-600">{f.detail}</span></li>)}</ul> : <p className="mt-1 text-sm text-slate-500">{t.noFindings}</p>}
            {e.hops.length ? (
              <>
                <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{t.hops}</div>
                <div className="mt-1 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="text-slate-500"><tr><th className="py-1">#</th><th>{t.hopFrom}</th><th>{t.hopBy}</th><th>IP</th><th>{t.hopDelay}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 font-mono">{e.hops.map((h, i) => <tr key={i}><td className="py-1">{i + 1}</td><td>{h.from}</td><td>{h.by}</td><td>{h.ip}</td><td>{h.delaySec != null ? `${h.delaySec}s` : "—"}</td></tr>)}</tbody></table></div>
              </>
            ) : null}
            {e.links.length ? (
              <>
                <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{t.links} · {e.links.length}</div>
                <ul className="mt-1 space-y-1">{e.links.slice(0, 40).map((l, i) => <li key={i} className="break-all text-xs"><span className="font-mono text-slate-800">{l.href.replace(/^http/i, "hxxp").replace(/\./g, "[.]")}</span>{l.text ? <span className="text-slate-500"> — {t.linkShown}: “{l.text}”</span> : null}{l.flags.map((f) => <span key={f} className="ml-1 rounded bg-rose-100 px-1 text-[10px] font-bold text-rose-800">{f}</span>)}</li>)}</ul>
              </>
            ) : null}
            {e.attachments.length ? (
              <>
                <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{t.attachments}</div>
                <ul className="mt-1 space-y-1">{e.attachments.map((x, i) => <li key={i} className="text-xs"><span className="font-semibold">{x.name}</span> <span className="text-slate-500">{x.type} · {x.size} B</span>{x.flags.map((f) => <span key={f} className="ml-1 rounded bg-rose-100 px-1 text-[10px] font-bold text-rose-800">{f}</span>)}<div className="font-mono text-[11px] text-slate-600">sha256 {x.sha256} <a className="underline" href={`https://www.virustotal.com/gui/file/${x.sha256}`} target="_blank" rel="noopener noreferrer">VirusTotal ↗</a></div></li>)}</ul>
              </>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
