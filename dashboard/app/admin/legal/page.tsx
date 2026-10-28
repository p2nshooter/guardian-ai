/* Admin → Legal corpus — the primary-law texts the Legal AI citation verifier
 * checks against (BLUEPRINT-V4 §32): coverage per jurisdiction as it is, and an
 * import of one instrument with its official text. Importers in CI post the same
 * JSON with the LEGAL_IMPORT_TOKEN; every import is in the audit log. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/i18n";
import { Alert, LoadingBlock, PageHeader, Section, Spinner } from "@/components/ui";

interface Row { jurisdiction: string; level: string; instruments: number; complete: number; provisions: number; updated_at: string }

const EXAMPLE = JSON.stringify({
  instrument: { jurisdiction: "ID", kind: "code", ref: "kuhperdata", title: "Kitab Undang-Undang Hukum Perdata", aliases: ["KUHPerdata", "BW"],
    language: "id", source_url: "https://peraturan.bpk.go.id/", source_name: "JDIH BPK" },
  version: "1848-05-01",
  complete: false,
  provisions: [{ pinpoint: "art:1320", text: "Supaya terjadi persetujuan yang sah, perlu dipenuhi empat syarat: …" }],
}, null, 2);

export default function AdminLegalCorpus() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const load = async () => {
    const r = await api<{ coverage: Row[] }>("/api/admin/legal/corpus");
    if (r.ok) setRows(r.data.coverage); else setMsg({ tone: "error", text: r.error });
  };
  useEffect(() => { load(); }, []);

  async function importNow() {
    setMsg(null);
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { setMsg({ tone: "error", text: "That is not valid JSON." }); return; }
    setBusy(true);
    const r = await api<{ instrument: { title: string; versions: { provisions: number }[]; complete: boolean } }>("/api/admin/legal/corpus", { body: parsed });
    setBusy(false);
    if (!r.ok) { setMsg({ tone: "error", text: r.error }); return; }
    const v = r.data.instrument.versions.at(-1);
    setMsg({ tone: "success", text: `Imported ${r.data.instrument.title}${v ? ` — ${v.provisions} provisions${r.data.instrument.complete ? ", complete" : ""}` : ""}.` });
    setBody("");
    load();
  }

  if (!rows) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const total = rows.reduce((s, r) => ({ instruments: s.instruments + r.instruments, provisions: s.provisions + r.provisions }), { instruments: 0, provisions: 0 });
  return (
    <>
      <PageHeader title="Legal corpus" description="Official texts of laws, regulations, treaties and judgments that Legal AI checks citations against. A citation is only ever called verified when its text is here." />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <div className="space-y-5">
        <Section title="Coverage">
          {rows.length ? (
            <>
              <p className="mb-3 text-sm text-slate-600">{rows.length} jurisdictions · {total.instruments} instruments · {total.provisions} provisions. Jurisdictions not listed have no texts yet — citations from them are reported as not covered.</p>
              <div className="overflow-x-auto">
                <table className="table" data-testid="legal-coverage">
                  <thead><tr><th>Jurisdiction</th><th>Level</th><th>Instruments</th><th>Complete texts</th><th>Provisions</th><th>Updated</th></tr></thead>
                  <tbody>{rows.map((r) => (
                    <tr key={r.jurisdiction}><td><code className="text-xs">{r.jurisdiction}</code></td><td className="text-xs">{r.level}</td><td>{r.instruments}</td><td>{r.complete}</td><td>{r.provisions}</td><td className="text-xs">{r.updated_at ? formatDate(r.updated_at) : "—"}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          ) : <Alert tone="info">The corpus is empty. Until texts are imported, every citation is reported as not covered and must be checked at the official source.</Alert>}
        </Section>

        <Section title="Import an instrument">
          <p className="mb-2 text-sm text-slate-600">
            One instrument per import, from its official source (https only). Jurisdictions use ISO codes down to the district
            (<code>ID</code>, <code>ID-JB</code>, <code>ID-JB.3273</code>, <code>US-CA</code>) or <code>EU</code>, <code>ASEAN</code>, <code>AU</code>, <code>OAS</code>, <code>COE</code>, <code>INT</code>.
            Pinpoints: <code>art:1320</code>, <code>art:6(1)(a)</code>, <code>sec:1983</code>. Mark <code>complete</code> only when every provision of that version is included —
            the verifier then reports a missing article as not found.
          </p>
          <textarea className="input h-64 w-full font-mono text-xs" value={body} onChange={(e) => setBody(e.target.value)} placeholder={EXAMPLE} data-testid="legal-import-json" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={busy || !body.trim()} onClick={importNow} data-testid="legal-import">{busy ? <Spinner /> : null} Import</button>
            <button className="btn-secondary" type="button" onClick={() => setBody(EXAMPLE)}>Insert the example</button>
            <span className="text-xs text-slate-500">At most 2,000 provisions per import. Every import is written to the audit log.</span>
          </div>
        </Section>
      </div>
    </>
  );
}
