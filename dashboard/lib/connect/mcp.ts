/* ==============================================================================
 * AXTO CONNECT — MCP server (Model Context Protocol, Streamable HTTP transport,
 * stateless). AI agents and desktop assistants (Claude Desktop, Cursor, VS Code
 * and any MCP client) connect with:  URL https://axto.io/api/v1/mcp
 *                                    header Authorization: Bearer axto_sk_…
 * Tools run the member's own AI (BYOK) and AXTO's on-server engines; nothing is
 * stored except events the agent chooses to publish.
 * ============================================================================ */
import type { Data } from "../data";
import { prepareRun, splitStatus } from "../ai/run-core";
import { compute, RULES, type Unit, type Roll, type HolidayCountry } from "../legal/deadlines";
import { extractCitations } from "../legal/citations";
import { redline, redlineMarkdown } from "../legal/redline";
import { detect } from "../vault/pii";
import { PROMPTS, publicPrompt } from "../prompts/catalog";
import { publishEvent, eventsAfter, parsePatterns } from "./events";
import { requireScope, type Caller } from "./auth";
import { VERSION } from "../site";

export const MCP_PROTOCOL = "2025-06-18";
const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Json = Record<string, any>;
interface Tool { name: string; title: string; description: string; inputSchema: Json; scope?: Parameters<typeof requireScope>[1]; run: (args: Json, caller: Caller, db: Data) => Promise<{ text: string; data?: unknown; isError?: boolean }> }

const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);

export const TOOLS: Tool[] = [
  {
    name: "ai_run", title: "Ask your AI (AXTO AI Studio)", scope: "ai:run",
    description: "Send a prompt to the member's own AI model through AXTO (bring-your-own-key). Returns the full answer.",
    inputSchema: { type: "object", properties: { prompt: { type: "string", description: "What to ask" }, instructions: { type: "string", description: "Optional system instructions" }, provider: { type: "string" }, model: { type: "string" } }, required: ["prompt"] },
    async run(a, c, db) {
      const r = await prepareRun(db, c.userId, c.tier, { app: "studio", messages: [{ role: "user", content: str(a.prompt, 100_000) }], provider: a.provider, model: a.model, options: { role: str(a.instructions, 8000) } });
      if (!r.ok) return { text: r.error, isError: true };
      let out = "";
      const t0 = Date.now();
      for await (const chunk of r.stream) { out += splitStatus(chunk).text; if (Date.now() - t0 > 110_000) { out += "\n\n[stopped after 110 s]"; break; } }
      return { text: out.trim(), data: { provider: r.meta.provider, model: r.meta.model } };
    },
  },
  {
    name: "events_publish", title: "Publish a realtime event", scope: "events:write",
    description: "Publish an event on one of the member's AXTO Connect channels. Subscribers (SSE, WebSocket, long polling, webhooks) receive it at once.",
    inputSchema: { type: "object", properties: { channel: { type: "string" }, type: { type: "string" }, data: {} }, required: ["channel"] },
    async run(a, c, db) {
      const ev = await publishEvent(db, c.userId, { channel: a.channel, type: a.type, data: a.data }, `mcp:${c.keyId || "session"}`);
      return { text: `Published event ${ev.id} on ${ev.channel}.`, data: ev };
    },
  },
  {
    name: "events_list", title: "Read recent events", scope: "events:read",
    description: "List events after a cursor on channels or patterns such as \"orders.*\".",
    inputSchema: { type: "object", properties: { channels: { type: "array", items: { type: "string" } }, after: { type: "integer" }, limit: { type: "integer", maximum: 100 } } },
    async run(a, c, db) {
      const events = await eventsAfter(db, c.userId, Number(a.after) || 0, parsePatterns(a.channels ?? "*"), Math.min(100, Number(a.limit) || 20));
      return { text: events.length ? events.map((e) => `#${e.id} ${e.channel} ${e.type} ${JSON.stringify(e.data).slice(0, 300)}`).join("\n") : "No events.", data: { events } };
    },
  },
  {
    name: "legal_deadline", title: "Compute a legal deadline",
    description: "Count a period from a trigger date (calendar or business days, weeks, months, years, hours) with public holidays for ID, US, GB, SG or AU, rolling off closed days. Presets: " + RULES.map((r) => r.id).join(", "),
    inputSchema: { type: "object", properties: { trigger: { type: "string", description: "YYYY-MM-DD (or YYYY-MM-DDTHH:mm for hours)" }, amount: { type: "integer" }, unit: { type: "string", enum: ["days", "business", "weeks", "months", "years", "hours"] }, direction: { type: "string", enum: ["after", "before"] }, roll: { type: "string", enum: ["following", "preceding", "modified", "none"] }, calendar: { type: "string", enum: ["ID", "US", "GB", "SG", "AU", "none"] }, preset: { type: "string" } }, required: ["trigger"] },
    async run(a) {
      const p = RULES.find((r) => r.id === a.preset);
      const r = compute({ trigger: str(a.trigger, 16), amount: Number(a.amount ?? p?.amount ?? 0), unit: (a.unit || p?.unit || "days") as Unit, direction: a.direction || p?.direction, roll: (a.roll || p?.roll) as Roll, country: (a.calendar || (p && ["ID", "US", "GB", "SG", "AU"].includes(p.country) ? p.country : "none")) as HolidayCountry });
      if ("error" in r) return { text: r.error, isError: true };
      return { text: `Due ${r.due}${r.rolled ? ` (period ends ${r.unrolled}: ${r.reason}; moved)` : ""}.${p ? ` Rule: ${p.source}.` : ""} General information — check the current rule.`, data: r };
    },
  },
  {
    name: "legal_citations", title: "Find legal citations",
    description: "Extract statute, regulation and case citations (ID, US, UK, EU, SG, MY, AU, CA, IN, NZ, HK) with links to official sources for verification.",
    inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    async run(a) {
      const list = extractCitations(str(a.text, 500_000));
      return { text: list.length ? list.map((c) => `${c.text} [${c.jurisdiction} ${c.kind}] ${c.links[0]?.url || ""}`).join("\n") : "No citations found.", data: { citations: list } };
    },
  },
  {
    name: "contract_redline", title: "Redline two contract versions",
    description: "Compare two versions of a contract clause by clause and return a Markdown redline with material changes flagged.",
    inputSchema: { type: "object", properties: { original: { type: "string" }, revised: { type: "string" } }, required: ["original", "revised"] },
    async run(a) {
      const r = redline(str(a.original, 400_000), str(a.revised, 400_000));
      return { text: redlineMarkdown(r, "Redline", 40_000), data: { stats: r.stats } };
    },
  },
  {
    name: "pii_scan", title: "Scan text for personal data and secrets",
    description: "Detect personal data (emails, phone numbers, ID numbers, cards, IBANs …) and secrets (API keys, tokens) in text. Returns findings with positions; nothing is stored.",
    inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    async run(a) {
      const f = detect(str(a.text, 500_000));
      return { text: f.length ? f.map((x) => `${x.label}: ${x.value.slice(0, 4)}… at ${x.start}`).join("\n") : "Nothing found.", data: { findings: f.map(({ type, label, category, start, end, score }) => ({ type, label, category, start, end, score })) } };
    },
  },
  {
    name: "prompt_library_search", title: "Search the AXTO Prompt Library",
    description: "Find expert prompts (240 across 24 professions) by keyword. Returns ids, titles, fields and levels.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, field: { type: "string" } }, required: ["query"] },
    async run(a) {
      const q = str(a.query, 200).toLowerCase();
      const hits = PROMPTS.filter((p) => (!a.field || p.field === a.field) && `${p.title} ${p.summary}`.toLowerCase().includes(q)).slice(0, 20).map(publicPrompt);
      return { text: hits.length ? hits.map((p: any) => `${p.id} — ${p.title} (${p.field}, ${p.level})`).join("\n") : "No prompts match.", data: { prompts: hits } };
    },
  },
];

const rpcError = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/** Handle one JSON-RPC message. Returns null for notifications. */
export async function handleMcp(msg: Json, caller: Caller, db: Data): Promise<Json | null> {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return rpcError(msg?.id, -32600, "Invalid Request");
  const isNotification = msg.id === undefined || msg.id === null;
  const reply = (result: Json) => (isNotification ? null : { jsonrpc: "2.0", id: msg.id, result });
  switch (msg.method) {
    case "initialize": {
      const asked = String(msg.params?.protocolVersion || MCP_PROTOCOL);
      return reply({
        protocolVersion: SUPPORTED.includes(asked) ? asked : MCP_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "axto-connect", title: "AXTO Connect", version: VERSION },
        instructions: "AXTO tools for AI, legal work, privacy and realtime events. AI calls run on the member's own model keys.",
      });
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema })) });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === msg.params?.name);
      if (!tool) return rpcError(msg.id, -32602, `Unknown tool: ${String(msg.params?.name).slice(0, 60)}`);
      try {
        requireScope(caller, "mcp");
        if (tool.scope) requireScope(caller, tool.scope);
        const r = await tool.run(msg.params?.arguments || {}, caller, db);
        return reply({ content: [{ type: "text", text: r.text }], ...(r.data !== undefined ? { structuredContent: r.data as Json } : {}), isError: !!r.isError });
      } catch (e: any) {
        return reply({ content: [{ type: "text", text: String(e?.message || e).slice(0, 500) }], isError: true });
      }
    }
    default:
      return isNotification ? null : rpcError(msg.id, -32601, `Method not found: ${msg.method.slice(0, 60)}`);
  }
}
