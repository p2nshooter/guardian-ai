/* AXTO — Developers → Overview: limits, transports, quick-start snippets for every way to connect. */
"use client";
import { useState } from "react";
import Link from "next/link";
import type { DevelopersDict } from "@/lib/i18n-pages/developers";
import { Code } from "./shared";

const SNIPPETS = (base: string): [string, string, string][] => [
  ["curl", "REST · publish", `curl -X POST ${base}/api/v1/events \\
  -H "Authorization: Bearer $AXTO_KEY" -H "Content-Type: application/json" \\
  -d '{"channel":"orders","type":"order.paid","data":{"id":42}}'`],
  ["js-sse", "Browser · Server-Sent Events", `// 1) on YOUR server: mint a short-lived token with the secret key
const { token } = await fetch("${base}/api/v1/tokens", { method: "POST",
  headers: { Authorization: \`Bearer \${process.env.AXTO_KEY}\`, "Content-Type": "application/json" },
  body: JSON.stringify({ channels: ["orders*"], ttl: 3600 }) }).then((r) => r.json());
// 2) in the browser
const es = new EventSource(\`${base}/api/v1/events/stream?channels=orders*&token=\${token}\`);
es.onmessage = (m) => console.log(JSON.parse(m.data));   // resumes by itself after a drop`],
  ["js-ws", "Browser / Node · WebSocket", `const ws = new WebSocket("${base.replace(/^http/, "ws")}/api/v1/ws", ["axto.v1", \`axto.token.\${token}\`]);
ws.onopen = () => ws.send(JSON.stringify({ op: "subscribe", channels: ["chat:*"] }));
ws.onmessage = (m) => console.log(JSON.parse(m.data));
ws.send(JSON.stringify({ op: "publish", channel: "chat:lobby", data: { text: "hi" } }));`],
  ["poll", "Long polling (any proxy)", `let cursor = "now";
for (;;) {
  const r = await fetch(\`${base}/api/v1/events/poll?channels=orders*&after=\${cursor}&wait=25&token=\${token}\`).then((r) => r.json());
  r.events.forEach(handle); cursor = r.cursor;
}`],
  ["ai", "AI stream · NDJSON over HTTP/2", `curl -N ${base}/api/v1/ai/run -H "Authorization: Bearer $AXTO_KEY" \\
  -H "Accept: application/x-ndjson" -H "Content-Type: application/json" \\
  -d '{"prompt":"Summarise this contract clause: …"}'`],
  ["python", "Python · SSE AI stream", `import json, os, requests
r = requests.post("${base}/api/v1/ai/run?format=sse", stream=True,
    headers={"Authorization": f"Bearer {os.environ['AXTO_KEY']}"}, json={"prompt": "Hello"})
for line in r.iter_lines(decode_unicode=True):
    if line.startswith("data: "): print(json.loads(line[6:]).get("text", ""), end="", flush=True)`],
  ["grpc", "gRPC-compatible · Connect", `# buf generate from ${base}/api/v1/axto.proto, then with @connectrpc/connect-web:
const transport = createConnectTransport({ baseUrl: "${base}/api/v1/connect", useBinaryFormat: false,
  interceptors: [(next) => (req) => { req.header.set("Authorization", \`Bearer \${token}\`); return next(req); }] });
for await (const ev of createClient(EventService, transport).subscribe({ channels: ["orders*"] })) console.log(ev);`],
  ["mcp", "MCP · Claude Desktop / Cursor", `{
  "mcpServers": {
    "axto": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${base}/api/v1/mcp", "--header", "Authorization: Bearer \${AXTO_KEY}"],
      "env": { "AXTO_KEY": "axto_sk_…" }
    }
  }
}`],
  ["sdk", "AXTO Connect SDK (auto transport)", `<script type="module">
  import { AxtoConnect } from "${base}/sdk/axto-connect.js";
  const axto = new AxtoConnect({ token });            // WebSocket → SSE → long polling
  axto.subscribe(["orders*"], (event) => console.log(event));
</script>`],
];

export default function Overview({ t, base, limits, usage, retentionDays }: { t: DevelopersDict; base: string; limits: { apiKeys: number; apiRpm: number; webhooks: number }; usage: { events24h: number }; retentionDays: number }) {
  const snippets = SNIPPETS(base);
  const [pick, setPick] = useState(snippets[0][0]);
  const cur = snippets.find((s) => s[0] === pick) || snippets[0];
  return (
    <div className="space-y-5" data-testid="dev-overview">
      <section className="card-pad">
        <p className="text-sm font-semibold" data-testid="dev-limits">{t.limits.replace("{keys}", String(limits.apiKeys)).replace("{rpm}", limits.apiRpm.toLocaleString()).replace("{hooks}", String(limits.webhooks))}</p>
        <p className="mt-1 text-xs text-slate-500">{t.usage.replace("{n}", usage.events24h.toLocaleString())} · {t.retention.replace("{days}", String(retentionDays))}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href="/developers" className="btn-secondary btn-sm">📘 {t.docs}</Link>
          <a href="/api/v1/openapi.json" target="_blank" rel="noopener" className="btn-ghost btn-sm">{t.openapi}</a>
          <a href="/api/v1/axto.proto" target="_blank" rel="noopener" className="btn-ghost btn-sm">{t.proto}</a>
        </div>
      </section>
      <section className="card-pad">
        <h2 className="mb-3 text-base font-semibold">{t.transports}</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {t.transportList.map(([name, desc]) => (
            <div key={name} className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm font-semibold">{name}</div>
              <div className="mt-0.5 text-xs text-slate-600">{desc}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">ℹ️ {t.webtransport}</p>
      </section>
      <section className="card-pad">
        <h2 className="mb-3 text-base font-semibold">{t.quickstart}</h2>
        <div className="mb-3 flex flex-wrap gap-1">
          {snippets.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setPick(id)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pick === id ? "bg-ink-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{label}</button>
          ))}
        </div>
        <Code t={t} code={cur[2]} label={cur[1]} />
      </section>
    </div>
  );
}
