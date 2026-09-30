/* PRIVACY VAULT — Files: redact a whole batch on the device with ONE key.
 *   text types   redacted as text, same file type out
 *   DOCX / XLSX  redacted in place (lib/vault/office) — layout kept
 *   PDF          rebuilt as images with black boxes (lib/vault/visual) — no text layer
 *   images       OCR, black boxes, new image
 * Then: per-file download, all as a ZIP, and an audit report (counts only). */
"use client";
import { useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import { auditReport, createRedactor, type Finding } from "@/lib/vault/pii";
import { FILE_ACCEPT, MAX_FILE_MB, auditMarkdown, engineOptions, fileKind, redactedName, type FileKind, type VaultSettings } from "@/lib/vault/settings";
import { redactOffice } from "@/lib/vault/office";
import { zipStore } from "@/lib/export/docx";
import type { VaultDict } from "@/lib/i18n-pages/vault";
import { download, short, typeName } from "./shared";

type Status = "waiting" | "running" | "done" | "failed";
interface Item {
  id: string; file: File; kind: FileKind; status: Status; progress: number;
  findings: Finding[]; pages?: number; ocrPages?: number; preview?: string;
  out?: { name: string; bytes: Uint8Array; mime: string }; error?: string;
}
type Redactor = ReturnType<typeof createRedactor>;

const MIME: Record<FileKind, string> = {
  text: "text/plain;charset=utf-8", pdf: "application/pdf", image: "image/jpeg",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
const ICON: Record<FileKind, string> = { text: "📝", docx: "📘", xlsx: "📗", pdf: "📕", image: "🖼️" };
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function FilesTab({ t, settings, onMap }: { t: VaultDict; settings: VaultSettings; onMap: (map: Record<string, string>) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const red = useRef<Redactor | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const patch = (id: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  function add(list: FileList | File[]) {
    const bad: string[] = [];
    const next: Item[] = [];
    for (const f of Array.from(list)) {
      const kind = fileKind(f.name, f.type);
      if (!kind) { bad.push(t.unsupported.replace("{name}", f.name)); continue; }
      if (f.size > MAX_FILE_MB * 1048576) { bad.push(t.tooBig.replace("{name}", f.name).replace("{mb}", String(MAX_FILE_MB))); continue; }
      next.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, file: f, kind, status: "waiting", progress: 0, findings: [] });
    }
    setErrs(bad);
    setItems((xs) => [...xs, ...next].slice(0, 100));
  }

  async function one(it: Item, r: Redactor) {
    patch(it.id, { status: "running", progress: 0.02 });
    const before = r.findings.length;
    try {
      const buf = await it.file.arrayBuffer();
      if (it.kind === "text") {
        const txt = new TextDecoder().decode(buf);
        const { redacted } = r.redact(txt);
        patch(it.id, { status: "done", progress: 1, findings: r.findings.slice(before), out: { name: redactedName(it.file.name, "text"), bytes: new TextEncoder().encode(redacted), mime: it.file.type || MIME.text } });
      } else if (it.kind === "docx" || it.kind === "xlsx") {
        const { bytes } = await redactOffice(buf, it.kind, (s) => r.redact(s).redacted);
        patch(it.id, { status: "done", progress: 1, findings: r.findings.slice(before), out: { name: redactedName(it.file.name, it.kind), bytes, mime: MIME[it.kind] } });
      } else if (it.kind === "pdf") {
        const { redactPdf } = await import("@/lib/vault/visual");
        const res = await redactPdf(buf, r, (p) => patch(it.id, { progress: Math.max(0.05, p) }));
        patch(it.id, { status: "done", progress: 1, findings: res.findings, pages: res.pages, ocrPages: res.ocrPages, preview: res.preview, out: { name: redactedName(it.file.name, "pdf"), bytes: res.bytes, mime: MIME.pdf } });
      } else {
        const { redactImage } = await import("@/lib/vault/visual");
        const res = await redactImage(it.file, r);
        patch(it.id, { status: "done", progress: 1, findings: res.findings, pages: 1, ocrPages: 1, preview: res.preview, out: { name: redactedName(it.file.name, "image", res.mime), bytes: res.bytes, mime: res.mime } });
      }
    } catch (e: any) {
      patch(it.id, { status: "failed", progress: 0, error: String(e?.message || e).slice(0, 200) });
    }
    onMap({ ...r.map });
  }

  async function run() {
    const { enabled, options } = engineOptions(settings);
    if (!red.current) red.current = createRedactor(settings.style, enabled, options);
    setBusy(true);
    for (const it of items.filter((x) => x.status === "waiting" || x.status === "failed")) await one(it, red.current);
    setBusy(false);
  }
  function clear() { setItems([]); setErrs([]); red.current = null; onMap({}); }

  const done = items.filter((x) => x.status === "done" && x.out);
  const pending = items.filter((x) => x.status === "waiting" || x.status === "failed").length;

  function zipAll() {
    const used = new Set<string>();
    const files = done.map((x) => {
      let name = x.out!.name, n = 2;
      while (used.has(name)) name = x.out!.name.replace(/(\.[^.]+)?$/, (e) => `-${n++}${e}`);
      used.add(name);
      return { name, data: x.out!.bytes };
    });
    download("axto-redacted.zip", zipStore(files), "application/zip");
  }
  function report(kind: "json" | "md") {
    const r = auditReport(done.map((x) => ({ source: x.file.name, findings: x.findings })), { style: settings.style, minScore: settings.minScore });
    if (kind === "json") download("axto-vault-audit.json", JSON.stringify(r, null, 2), "application/json");
    else download("axto-vault-audit.md", auditMarkdown(r, (type) => typeName(t, { type, label: type })), "text/markdown;charset=utf-8");
  }

  return (
    <div className="space-y-4">
      <section className="card-pad">
        <h2 className="text-base font-bold text-slate-900">{t.filesTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.filesSub}</p>
        <button type="button" onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) add(e.dataTransfer.files); }}
          className={`mt-4 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${drag ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50 hover:border-brand-400"}`} data-testid="vault-drop">
          <span className="text-3xl">🗂️</span>
          <span className="mt-2 font-semibold text-slate-800">{t.drop}</span>
          <span className="mt-1 text-xs text-slate-500">{t.dropHint.replace("{mb}", String(MAX_FILE_MB))}</span>
        </button>
        <input ref={input} type="file" multiple className="hidden" accept={FILE_ACCEPT} data-testid="vault-files-input" onChange={(e) => { if (e.target.files?.length) add(e.target.files); e.target.value = ""; }} />
        {errs.length ? <ul className="mt-3 space-y-1 text-xs text-rose-700">{errs.map((x, i) => <li key={i}>⚠️ {x}</li>)}</ul> : null}
      </section>

      {items.length ? (
        <section className="card-pad">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary" onClick={run} disabled={busy || !pending} data-testid="vault-run">
              {busy ? <><Spinner /> {t.running}</> : pending ? `🛡️ ${t.runAll.replace("{n}", String(pending))}` : `✓ ${t.done}`}
            </button>
            <button type="button" className="btn-secondary" onClick={zipAll} disabled={busy || !done.length} data-testid="vault-zip">📦 {t.downloadAll}</button>
            <span className="inline-flex items-center gap-1 text-sm text-slate-600">{t.report}:
              <button type="button" className="btn-ghost btn-sm" onClick={() => report("json")} disabled={!done.length}>{t.reportJson}</button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => report("md")} disabled={!done.length}>{t.reportMd}</button>
            </span>
            <button type="button" className="btn-ghost btn-sm ml-auto" onClick={clear} disabled={busy}>{t.clearAll}</button>
          </div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200" data-testid="vault-file-list">
            {items.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap" data-status={x.status}>
                {x.preview ? <img src={x.preview} alt="" className="h-14 w-11 shrink-0 rounded border border-slate-200 object-cover" /> : <span className="flex h-14 w-11 shrink-0 items-center justify-center rounded bg-slate-100 text-xl">{ICON[x.kind]}</span>}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800" title={x.file.name}>{x.file.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
                    <span>{x.kind.toUpperCase()} · {size(x.file.size)}</span>
                    {x.pages ? <span>{t.pages.replace("{n}", String(x.pages))}</span> : null}
                    {x.ocrPages ? <span className="rounded bg-violet-50 px-1 text-violet-700">{t.ocr} ×{x.ocrPages}</span> : null}
                    {x.status === "done" ? <span className="font-semibold text-emerald-700">{t.foundN.replace("{n}", String(x.findings.length))}</span> : null}
                  </div>
                  {x.status === "running" ? (
                    <div className="mt-1.5">
                      <div className="h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round(x.progress * 100)}%` }} /></div>
                      {x.kind === "image" ? <div className="mt-1 text-[11px] text-slate-500">{t.loadingOcr}</div> : null}
                    </div>
                  ) : null}
                  {x.error ? <div className="mt-1 text-xs text-rose-700">{short(x.error, 140)}</div> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${x.status === "done" ? "bg-emerald-100 text-emerald-800" : x.status === "failed" ? "bg-rose-100 text-rose-800" : x.status === "running" ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-600"}`}>
                    {x.status === "done" ? t.done : x.status === "failed" ? t.failed : x.status === "running" ? t.running : t.waiting}
                  </span>
                  {x.out ? <button type="button" className="btn-secondary btn-sm" onClick={() => download(x.out!.name, x.out!.bytes, x.out!.mime)} data-testid="vault-file-dl">⬇️ {t.download}</button> : null}
                  {x.status !== "running" ? <button type="button" className="btn-ghost btn-sm" onClick={() => setItems((xs) => xs.filter((y) => y.id !== x.id))} aria-label={t.remove}>✕</button> : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">🔑 {t.batchKey}</p>
        </section>
      ) : null}
    </div>
  );
}
