/* AXTO — Connect (developer API & realtime) E2E on the local runtime.
 * Keys (hashed, scopes, origins, plan limits, revoke), events over REST,
 * long polling, Server-Sent Events (resume with Last-Event-ID), WebSocket,
 * stream tokens, NDJSON / SSE AI streaming on the member's own key (mock
 * model), the Connect protocol (gRPC-compatible framing), WebRTC rooms,
 * signed webhooks, the MCP server, OpenAPI and .proto, and the admin switch. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { adminCookie } from "./admin-session";
import { doc, update, userByEmail } from "./data";

setGlobalDispatcher(new Agent({ keepAliveTimeout: 10, keepAliveMaxTimeout: 10, pipelining: 0 }));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const RUN = Date.now().toString(36);
const MOCK_PORT = 8796;

class Client {
  cookie = ""; ip = `10.77.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`; bearer = "";
  async call(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(BASE + p, {
      method, redirect: "manual", signal: AbortSignal.timeout(90_000),
      headers: { "cf-connecting-ip": this.ip, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...(this.bearer ? { Authorization: `Bearer ${this.bearer}` } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === "string" || body instanceof Uint8Array ? body as any : JSON.stringify(body),
    });
    const m = (res.headers.get("set-cookie") || "").match(/axto_session=([^;]*)/);
    if (m) this.cookie = m[1] ? `axto_session=${m[1]}` : "";
    const text = await res.text(); let json: any = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p: string, h?: Record<string, string>) => this.call("GET", p, undefined, h);
  post = (p: string, b: unknown = {}, h?: Record<string, string>) => this.call("POST", p, b, h);
  patch = (p: string, b: unknown = {}) => this.call("PATCH", p, b);
  del = (p: string) => this.call("DELETE", p);
}

const admin = new Client(), member = new Client(), free = new Client(), api = new Client();
let apiKey = "", keyId = "";
const hooks: { headers: http.IncomingHttpHeaders; body: string }[] = [];
let mock: http.Server;

before(async () => {
  mock = http.createServer((req, res) => {
    let raw = ""; req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (req.url === "/v1/chat/completions") {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        for (const t of ["Hello", " from", " the member's model."]) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`);
        res.end("data: [DONE]\n\n");
      } else if (req.url === "/hook") { hooks.push({ headers: req.headers, body: raw }); res.writeHead(204); res.end(); }
      else { res.writeHead(404); res.end(); }
    });
  }).listen(MOCK_PORT);
  admin.cookie = await adminCookie();
  for (const [c, e] of [[member, `connect-${RUN}@example.com`], [free, `connect-free-${RUN}@example.com`]] as const) {
    assert.equal((await c.post("/api/auth/register", { email: e, name: "Connect", password: "abcdefgh1", acceptTerms: true })).status, 200);
  }
  const uid = (await userByEmail(`connect-${RUN}@example.com`)).id;
  assert.equal((await admin.post(`/api/admin/members/${uid}`, { action: "grant", plan: "pro", cycle: "monthly" })).status, 200);
  await member.get("/api/auth/me");
  assert.equal((await member.post("/api/byox/keys", { provider: "custom", value: "", model: "mock", baseUrl: `http://127.0.0.1:${MOCK_PORT}/v1` })).status, 200);
});
after(() => mock?.close());

test("connect: keys are plan-limited, shown once, stored hashed; a free account gets none", async () => {
  assert.equal((await free.post("/api/connect/keys", { name: "x" })).status, 402);
  const r = await member.post("/api/connect/keys", { name: "Server", scopes: ["ai:run", "events:read", "events:write", "rtc", "mcp"], origins: ["https://shop.example.com", "javascript:alert(1)"] });
  assert.equal(r.status, 200, r.text);
  apiKey = r.json.apiKey; keyId = r.json.key.id;
  assert.match(apiKey, /^axto_sk_[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(r.json.key.origins, ["https://shop.example.com"], "only real origins are kept");
  const row = await doc("apiKeys", keyId);
  assert.equal(row.hash, crypto.createHash("sha256").update(apiKey).digest("hex"));
  assert.ok(!JSON.stringify(row).includes(apiKey), "the key itself is never stored");
  const list = await member.get("/api/connect");
  assert.equal(list.json.limits.apiKeys, 5);
  assert.ok(!list.text.includes(apiKey));
  api.bearer = apiKey;
  const me = await api.get("/api/v1/me");
  assert.equal(me.status, 200, me.text);
  assert.equal(me.json.plan, "pro");
  assert.ok(me.json.transports.includes("websocket"));
  assert.equal((await new Client().get("/api/v1/me")).status, 401);
  const bad = new Client(); bad.bearer = "axto_sk_" + "A".repeat(43);
  assert.equal((await bad.get("/api/v1/me")).status, 401);
  assert.equal((await new Client().get(`/api/v1/me?token=${apiKey}`)).status, 400, "keys are refused in URLs");
});

test("connect: CORS — only the key's origins may call from a browser", async () => {
  const ok = await api.get("/api/v1/me", { Origin: "https://shop.example.com" });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("access-control-allow-origin"), "https://shop.example.com");
  assert.equal((await api.get("/api/v1/me", { Origin: "https://evil.example.net" })).status, 403);
  const pre = await new Client().call("OPTIONS", "/api/v1/events", undefined, { Origin: "https://shop.example.com", "Access-Control-Request-Method": "POST" });
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get("access-control-allow-headers") || "", /Authorization/);
});

test("connect: publish → list, long polling wakes up, SSE streams and resumes with Last-Event-ID", async () => {
  const p = await api.post("/api/v1/events", { channel: `orders.${RUN}`, type: "order.paid", data: { total: 42 } });
  assert.equal(p.status, 201, p.text);
  const first = p.json.event.id;
  assert.equal((await api.post("/api/v1/events", { channel: "bad channel!", data: 1 })).status, 400);
  assert.equal((await api.post("/api/v1/events", { channel: "big", data: "x".repeat(70_000) })).status, 413);
  const l = await api.get(`/api/v1/events?channels=orders.*&after=${first - 1}`);
  assert.deepEqual(l.json.events.map((e: any) => [e.id, e.type, e.data.total]), [[first, "order.paid", 42]]);
  const stored = await doc("connectEvents", String(first));
  assert.ok(stored && !JSON.stringify(stored.data).includes("42"), "payload encrypted at rest");

  // Long poll: nothing yet → a publish 1.5 s later wakes it.
  const t0 = Date.now();
  const waiting = api.get(`/api/v1/events/poll?channels=orders.*&after=${first}&wait=20`);
  setTimeout(() => api.post("/api/v1/events", { channel: `orders.${RUN}`, type: "order.shipped", data: { n: 2 } }), 1500);
  const woke = await waiting;
  assert.equal(woke.json.events[0].type, "order.shipped");
  assert.ok(Date.now() - t0 < 12_000, "answered as soon as the event arrived");
  const second = woke.json.cursor;

  // SSE from the first cursor: both events, with ids, then the stream ends by itself.
  const sse = await api.get(`/api/v1/events/stream?channels=orders.*&after=${first - 1}&maxSeconds=5`, { Accept: "text/event-stream" });
  assert.equal(sse.status, 200);
  assert.match(sse.headers.get("content-type") || "", /text\/event-stream/);
  assert.match(sse.text, /^retry: 2000/m);
  assert.match(sse.text, new RegExp(`^id: ${first}$`, "m"));
  assert.match(sse.text, new RegExp(`^id: ${second}$`, "m"));
  assert.match(sse.text, /event: reconnect/);
  const resumed = await api.get(`/api/v1/events/stream?channels=orders.*&maxSeconds=5`, { Accept: "text/event-stream", "Last-Event-ID": String(first) });
  assert.ok(!new RegExp(`^id: ${first}$`, "m").test(resumed.text) && new RegExp(`^id: ${second}$`, "m").test(resumed.text), "resumes after Last-Event-ID");
});

test("connect: stream tokens for browsers — channel-scoped, expiring; WebSocket subscribe + publish", async () => {
  const t = await api.post("/api/v1/tokens", { channels: [`chat.${RUN}`], ttl: 600, scopes: ["events:read", "events:write"] });
  assert.equal(t.status, 201, t.text);
  const token = t.json.token;
  assert.match(token, /^axto_st_/);
  assert.equal((await new Client().get(`/api/v1/events?token=${token}&channels=orders.*`)).json.events.length, 0, "a token cannot read other channels");
  assert.equal((await member.post("/api/v1/tokens", {})).status, 401, "tokens are minted with a key, not a session");

  const ws = new WebSocket(`${BASE.replace(/^http/, "ws")}/api/v1/ws?token=${encodeURIComponent(token)}`);
  const got: any[] = [];
  await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = (e: any) => rej(new Error(`websocket failed: ${e?.message || e}`)); setTimeout(() => rej(new Error("websocket timeout")), 15000); });
  ws.onmessage = (m) => got.push(JSON.parse(String(m.data)));
  ws.send(JSON.stringify({ op: "subscribe", channels: [`chat.${RUN}`] }));
  await new Promise((r) => setTimeout(r, 800));
  ws.send(JSON.stringify({ op: "publish", channel: `chat.${RUN}`, type: "message", data: { text: "hi over ws" }, ref: "c1" }));
  ws.send(JSON.stringify({ op: "ping" }));
  for (let i = 0; i < 40 && !got.some((m) => m.op === "event"); i++) await new Promise((r) => setTimeout(r, 250));
  ws.close();
  assert.ok(got.some((m) => m.op === "subscribed"));
  assert.ok(got.some((m) => m.op === "ack" && m.ref === "c1" && m.id > 0));
  assert.ok(got.some((m) => m.op === "pong"));
  assert.ok(got.some((m) => m.op === "event" && m.event.data.text === "hi over ws"), JSON.stringify(got));
});

test("connect: AI on the member's own key — NDJSON, SSE and JSON; Connect protocol server streaming", async () => {
  const nd = await api.post("/api/v1/ai/run", { prompt: "Say hello" }, { Accept: "application/x-ndjson" });
  assert.equal(nd.status, 200, nd.text);
  const lines = nd.text.trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(lines[0].type, "meta");
  assert.equal(lines.filter((l) => l.type === "delta").map((l) => l.text).join(""), "Hello from the member's model.");
  assert.equal(lines.at(-1).type, "done");
  const sse = await api.post("/api/v1/ai/run?format=sse", { prompt: "Say hello" });
  assert.match(sse.text, /^event: meta/m);
  assert.match(sse.text, /^event: done/m);
  const js = await api.post("/api/v1/ai/run?format=json", { prompt: "Say hello" });
  assert.equal(js.json.text, "Hello from the member's model.");

  // Connect: enveloped JSON messages, end-stream frame last.
  const env = (m: unknown) => { const b = Buffer.from(JSON.stringify(m)); const h = Buffer.alloc(5); h.writeUInt32BE(b.length, 1); return new Uint8Array(Buffer.concat([h, b])); };
  const res = await fetch(`${BASE}/api/v1/connect/axto.connect.v1.AiService/Run`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/connect+json", "cf-connecting-ip": api.ip }, body: env({ messages: [{ role: "user", content: "hi" }] }) });
  assert.equal(res.headers.get("content-type"), "application/connect+json");
  const buf = Buffer.from(await res.arrayBuffer());
  const frames: { flags: number; msg: any }[] = [];
  for (let i = 0; i + 5 <= buf.length;) { const len = buf.readUInt32BE(i + 1); frames.push({ flags: buf[i], msg: JSON.parse(buf.subarray(i + 5, i + 5 + len).toString() || "{}") }); i += 5 + len; }
  assert.equal(frames.filter((f) => f.msg.text).map((f) => f.msg.text).join(""), "Hello from the member's model.");
  assert.equal(frames.at(-1)!.flags, 2, "end-stream frame");
  const unary = await api.post("/api/v1/connect/axto.connect.v1.EventService/Publish", { channel: `grpc.${RUN}`, data: { via: "connect" } });
  assert.equal(unary.status, 200, unary.text);
  assert.ok(unary.json.event.id > 0);
  const miss = await api.post("/api/v1/connect/axto.connect.v1.Nope/Call", {});
  assert.equal(miss.json.code, "unimplemented");
  assert.match((await new Client().get("/api/v1/axto.proto")).text, /service EventService/);
  const oa = await new Client().get("/api/v1/openapi.json");
  assert.equal(oa.json.openapi, "3.1.0");
  assert.ok(oa.json.paths["/events/stream"]);
});

test("connect: WebRTC rooms give a signalling channel and ICE servers", async () => {
  const r = await api.post("/api/v1/rtc/rooms", {});
  assert.equal(r.status, 201, r.text);
  assert.match(r.json.room, /^[a-z2-9]{9}$/);
  assert.equal(r.json.channel, `rtc.${r.json.room}`);
  assert.ok(r.json.iceServers[0].urls.includes("stun:stun.cloudflare.com:3478"));
  assert.equal(r.json.turn, false, "TURN only when the operator configured it");
});

test("connect: signed webhooks with delivery log; test delivery; secret shown once", async () => {
  // The local runtime is not a public HTTPS host, so register a valid public URL, then point it at the mock for delivery.
  assert.equal((await member.post("/api/connect/webhooks", { url: "http://127.0.0.1/hook" })).status, 400, "HTTPS public hosts only");
  const c = await member.post("/api/connect/webhooks", { url: "https://hooks.example.com/axto", channels: [`pay.${RUN}`], types: ["*"] });
  assert.equal(c.status, 200, c.text);
  const { webhook, secret } = c.json;
  assert.match(secret, /^whsec_/);
  await update("webhooks", webhook.id, { url: `http://127.0.0.1:${MOCK_PORT}/hook` });
  await api.post("/api/v1/events", { channel: `pay.${RUN}`, type: "invoice.paid", data: { amount: 99 } });
  for (let i = 0; i < 40 && !hooks.length; i++) await new Promise((r) => setTimeout(r, 250));
  assert.equal(hooks.length, 1, "delivered");
  const h = hooks[0];
  const [, t, v1] = /t=(\d+),v1=([0-9a-f]+)/.exec(String(h.headers["x-axto-signature"]))!;
  assert.equal(v1, crypto.createHmac("sha256", secret).update(`${t}.${h.body}`).digest("hex"), "HMAC-SHA256 over t.body");
  assert.equal(JSON.parse(h.body).data.amount, 99);
  assert.equal(h.headers["x-axto-event"], "invoice.paid");
  const dl = await member.get(`/api/connect/webhooks/${webhook.id}/deliveries`);
  assert.equal(dl.json.deliveries[0].status, 204);
  const hookDoc = await doc("webhooks", webhook.id);
  assert.ok(hookDoc && !JSON.stringify(hookDoc).includes(secret), "secret encrypted at rest");
  const test2 = await member.post(`/api/connect/webhooks/${webhook.id}/test`, {});
  assert.equal(test2.json.result.status, 204);
  assert.equal((await member.del(`/api/connect/webhooks/${webhook.id}`)).status, 200);
});

test("connect: MCP server — initialize, tools/list, tools/call (legal deadline, AI on own key)", async () => {
  const init = await api.post("/api/v1/mcp", { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1" } } });
  assert.equal(init.status, 200, init.text);
  assert.equal(init.json.result.serverInfo.name, "axto-connect");
  assert.equal((await api.post("/api/v1/mcp", { jsonrpc: "2.0", method: "notifications/initialized" })).status, 202);
  const tools = await api.post("/api/v1/mcp", { jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.ok(tools.json.result.tools.some((t: any) => t.name === "legal_deadline"));
  const dl = await api.post("/api/v1/mcp", { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "legal_deadline", arguments: { preset: "id-banding-perdata", trigger: "2026-08-03" } } });
  assert.equal(dl.json.result.structuredContent.due, "2026-08-18");
  const ai = await api.post("/api/v1/mcp", { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "ai_run", arguments: { prompt: "hello" } } });
  assert.equal(ai.json.result.content[0].text, "Hello from the member's model.");
  const unknown = await api.post("/api/v1/mcp", { jsonrpc: "2.0", id: 5, method: "nope" });
  assert.equal(unknown.json.error.code, -32601);
  assert.equal((await api.get("/api/v1/mcp")).status, 405);
});

test("connect: revoking a key stops it at once; the admin can switch the API off", async () => {
  const k2 = await member.post("/api/connect/keys", { name: "Read only", scopes: ["events:read"] });
  const ro = new Client(); ro.bearer = k2.json.apiKey;
  assert.equal((await ro.post("/api/v1/events", { channel: "x", data: 1 })).status, 403, "scope enforced");
  const st = await admin.get("/api/admin/connect");
  assert.equal(st.status, 200);
  assert.ok(st.json.keys.some((k: any) => k.id === keyId && k.email === `connect-${RUN}@example.com`));
  assert.ok(!st.text.includes(apiKey));
  assert.equal((await admin.call("PUT", "/api/admin/connect", { settings: { enabled: false } })).status, 200);
  assert.equal((await api.get("/api/v1/me")).status, 503);
  assert.equal((await admin.call("PUT", "/api/admin/connect", { settings: { enabled: true, retentionDays: 7 } })).status, 200);
  assert.equal((await member.del(`/api/connect/keys/${keyId}`)).status, 200);
  assert.equal((await api.get("/api/v1/me")).status, 401, "revoked");
  assert.equal((await member.get("/api/connect")).status, 200);
  assert.equal((await new Client().get("/api/admin/connect")).status, 403);
});
