/* AXTO Connect — unit tests for the developer API building blocks: key format,
 * scopes and origins, stream tokens, channel patterns, the Connect protocol
 * envelopes, webhook URL rules and signatures, the MCP server and plan limits.
 * The HTTP transports themselves are covered end to end in tests/e2e/connect.e2e.ts.
 * Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newApiKey, cleanScopes, cleanOrigins, SCOPES, KEY_PREFIX, TOKEN_PREFIX, mintStreamToken, verifyStreamToken, sha256Hex, canReadChannel, requireScope, type Caller } from "../lib/connect/auth";
import { parsePatterns, matches, channelProblem } from "../lib/connect/events";
import { envelope, readEnvelope, readAllEnvelopes, statusCode, CODE_STATUS, PROTO } from "../lib/connect/connect-protocol";
import { webhookUrlProblem, signatureHeader } from "../lib/connect/webhooks";
import { handleMcp, TOOLS, MCP_PROTOCOL } from "../lib/connect/mcp";
import { openApi } from "../lib/connect/openapi";
import { PLANS, PLAN_ORDER, limitsFor } from "../lib/plans";
import { planMatrix } from "../lib/plan-matrix";

process.env.JWT_SECRET = "test-secret-for-unit-tests-only-0123456789";

const caller = (over: Partial<Caller> = {}): Caller => ({ userId: "u1", email: "a@b.c", tier: "pro", scopes: [...SCOPES], origins: [], via: "key", keyId: "k1", ...over });

test("connect: API keys are 256-bit, prefixed and unique; stored as SHA-256", async () => {
  const a = newApiKey(), b = newApiKey();
  assert.ok(a.startsWith(KEY_PREFIX));
  assert.match(a, /^axto_sk_[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
  const h = await sha256Hex(a);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, await sha256Hex(a));
});

test("connect: scopes and origins are cleaned", () => {
  assert.deepEqual(cleanScopes(["events:read", "nope", "events:read"]), ["events:read"]);
  assert.deepEqual(cleanScopes("ai:run, mcp"), ["ai:run", "mcp"]);
  assert.deepEqual(cleanScopes([]), [...SCOPES], "no valid scope → all scopes");
  assert.deepEqual(
    cleanOrigins("https://shop.example.com/\nhttp://localhost:3000 http://evil.example.com https://x.example.com/path *\njavascript:alert(1)"),
    ["https://shop.example.com", "http://localhost:3000", "*"],
  );
  assert.equal(cleanOrigins(Array.from({ length: 30 }, (_, i) => `https://s${i}.example.com`)).length, 20);
});

test("connect: stream tokens round-trip, expire and resist tampering", async () => {
  const { token, expiresAt } = await mintStreamToken({ sub: "u1", kid: "k1", ch: ["orders*"], sc: ["events:read"], og: [] }, 600);
  assert.ok(token.startsWith(TOKEN_PREFIX));
  assert.ok(Date.parse(expiresAt) > Date.now() + 590_000);
  const c = await verifyStreamToken(token);
  assert.equal(c?.sub, "u1");
  assert.deepEqual(c?.ch, ["orders*"]);
  // Tampered body or signature → rejected
  const [body, sig] = token.slice(TOKEN_PREFIX.length).split(".");
  const forged = Buffer.from(JSON.stringify({ sub: "u2", kid: "k1", ch: ["*"], sc: ["events:read"], og: [], exp: 9e9 })).toString("base64url");
  assert.equal(await verifyStreamToken(`${TOKEN_PREFIX}${forged}.${sig}`), null);
  assert.equal(await verifyStreamToken(`${TOKEN_PREFIX}${body}.${sig.slice(0, -2)}AA`), null);
  assert.equal(await verifyStreamToken("axto_sk_whatever"), null);
  // TTL is clamped to at least 60 s and at most 24 h
  const short = await mintStreamToken({ sub: "u1", kid: "k1", ch: ["*"], sc: ["events:read"], og: [] }, 1);
  assert.ok(Date.parse(short.expiresAt) >= Date.now() + 55_000);
  const long = await mintStreamToken({ sub: "u1", kid: "k1", ch: ["*"], sc: ["events:read"], og: [] }, 999_999);
  assert.ok(Date.parse(long.expiresAt) <= Date.now() + 24 * 3600_000 + 5_000);
});

test("connect: channel names, patterns and matching", () => {
  assert.equal(channelProblem("orders"), null);
  assert.equal(channelProblem("chat:room-1.v2"), null);
  assert.ok(channelProblem(""));
  assert.ok(channelProblem("-bad"));
  assert.ok(channelProblem("a".repeat(65)));
  assert.ok(channelProblem("has space"));
  assert.deepEqual(parsePatterns(undefined), ["*"]);
  assert.deepEqual(parsePatterns("orders*, chat:1 orders*"), ["orders*", "chat:1"]);
  assert.throws(() => parsePatterns(Array.from({ length: 21 }, (_, i) => `c${i}`)), /at most 20/);
  assert.throws(() => parsePatterns("or*ders"), /not a valid/);
  assert.ok(matches(["*"], "anything"));
  assert.ok(matches(["orders*"], "orders.paid"));
  assert.ok(matches(["orders.paid"], "orders.paid"));
  assert.ok(!matches(["orders.paid"], "orders.refunded"));
  assert.ok(!matches(["chat*"], "orders"));
});

test("connect: stream-token callers only read their channels; scopes are enforced", () => {
  const t = caller({ via: "token", channels: ["orders*"], scopes: ["events:read"] });
  assert.ok(canReadChannel(t, "orders.paid"));
  assert.ok(!canReadChannel(t, "payroll"));
  assert.ok(canReadChannel(caller(), "payroll"), "keys read every channel");
  assert.throws(() => requireScope(t, "events:write"), /events:write/);
  assert.doesNotThrow(() => requireScope(t, "events:read"));
});

test("connect protocol: envelopes encode, decode and mark end-of-stream", () => {
  const a = envelope({ id: 1, text: "héllo" });
  assert.equal(a[0], 0x00);
  assert.equal(new DataView(a.buffer).getUint32(1, false), a.length - 5);
  assert.deepEqual(readEnvelope(a), { id: 1, text: "héllo" });
  const end = envelope({}, true);
  assert.equal(end[0], 0x02);
  const both = new Uint8Array([...a, ...envelope({ id: 2 }), ...end]);
  const all = readAllEnvelopes(both);
  assert.deepEqual(all.map((x) => x.end), [false, false, true]);
  assert.deepEqual(all.map((x) => x.msg.id), [1, 2, undefined]);
  assert.throws(() => readEnvelope(new Uint8Array([0, 0])), /empty/);
  assert.throws(() => readEnvelope(new Uint8Array([1, 0, 0, 0, 2, 0x7b, 0x7d])), /compressed/);
  assert.throws(() => readEnvelope(new Uint8Array([0, 0, 0, 0, 9, 0x7b])), /truncated/);
  for (const [s, code] of [[400, "invalid_argument"], [401, "unauthenticated"], [403, "permission_denied"], [404, "not_found"], [429, "resource_exhausted"], [503, "unavailable"], [500, "internal"]] as const) {
    assert.equal(statusCode(s), code);
  }
  assert.equal(CODE_STATUS.unauthenticated, 401);
  assert.match(PROTO, /service EventService/);
  assert.match(PROTO, /rpc Subscribe\(.*\) returns \(stream /);
  assert.match(PROTO, /service AiService/);
});

test("connect: webhook URLs must be public HTTPS hostnames without credentials", () => {
  assert.equal(webhookUrlProblem("https://hooks.example.com/axto"), null);
  assert.ok(webhookUrlProblem("http://hooks.example.com/axto"));
  assert.ok(webhookUrlProblem("https://localhost/x"));
  assert.ok(webhookUrlProblem("https://10.0.0.5/x"));
  assert.ok(webhookUrlProblem("https://8.8.8.8/x"), "IP literals refused");
  assert.ok(webhookUrlProblem("https://[2606:4700::1111]/x"));
  assert.ok(webhookUrlProblem("https://user:pw@hooks.example.com/x"));
  assert.ok(webhookUrlProblem("https://x.internal/x"));
  assert.ok(webhookUrlProblem(123));
  assert.ok(webhookUrlProblem("https://a.example.com/" + "x".repeat(600)));
});

test("connect: webhook signatures are HMAC-SHA256 over `t.body`", async () => {
  const secret = "whsec_test", body = '{"id":1}', t = 1_700_000_000;
  const h = await signatureHeader(secret, body, t);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expect = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`))).toString("hex");
  assert.equal(h, `t=${t},v1=${expect}`);
  assert.notEqual(await signatureHeader(secret, body + " ", t), h);
});

test("mcp: initialize, tools/list, tools/call and errors", async () => {
  const c = caller();
  const init = await handleMcp({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } }, c, null);
  assert.equal(init?.result.protocolVersion, "2025-03-26");
  assert.equal(init?.result.serverInfo.name, "axto-connect");
  const unknownVersion = await handleMcp({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "1999-01-01" } }, c, null);
  assert.equal(unknownVersion?.result.protocolVersion, MCP_PROTOCOL);
  assert.equal(await handleMcp({ jsonrpc: "2.0", method: "notifications/initialized" }, c, null), null);
  assert.deepEqual((await handleMcp({ jsonrpc: "2.0", id: 2, method: "ping" }, c, null))?.result, {});

  const list = await handleMcp({ jsonrpc: "2.0", id: 3, method: "tools/list" }, c, null);
  const names = list?.result.tools.map((t: any) => t.name);
  assert.deepEqual(names, TOOLS.map((t) => t.name));
  for (const n of ["ai_run", "events_publish", "events_list", "legal_deadline", "legal_citations", "contract_redline", "pii_scan", "prompt_library_search"]) assert.ok(names.includes(n), n);
  for (const t of list?.result.tools) { assert.equal(t.inputSchema.type, "object"); assert.ok(t.description.length > 20); assert.equal(t.run, undefined, "no functions leak into JSON"); }

  const dl = await handleMcp({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "legal_deadline", arguments: { trigger: "2026-01-02", amount: 14, unit: "days", calendar: "none" } } }, c, null);
  assert.equal(dl?.result.isError, false);
  assert.match(dl?.result.content[0].text, /Due 2026-01-16/);

  const pii = await handleMcp({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "pii_scan", arguments: { text: "Mail budi@example.com now" } } }, c, null);
  assert.ok(pii?.result.structuredContent.findings.some((f: any) => f.type === "EMAIL"));
  assert.ok(!JSON.stringify(pii?.result.structuredContent).includes("budi@example.com"), "structured findings carry positions, not values");

  const cites = await handleMcp({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "legal_citations", arguments: { text: "See Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi." } } }, c, null);
  assert.ok(cites?.result.structuredContent.citations.length >= 1);

  // No mcp scope → the tool refuses with isError (not a protocol error)
  const noScope = await handleMcp({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "pii_scan", arguments: { text: "x" } } }, caller({ scopes: ["events:read"] }), null);
  assert.equal(noScope?.result.isError, true);
  assert.equal((await handleMcp({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "nope" } }, c, null))?.error.code, -32602);
  assert.equal((await handleMcp({ jsonrpc: "2.0", id: 9, method: "resources/list" }, c, null))?.error.code, -32601);
  assert.equal((await handleMcp({ id: 10, method: "ping" } as any, c, null))?.error.code, -32600);
});

test("openapi: documents every public endpoint with bearer auth", () => {
  const doc: any = openApi("https://axto.io");
  assert.equal(doc.openapi.slice(0, 3), "3.1");
  assert.ok(doc.servers[0].url.endsWith("/api/v1"));
  for (const p of ["/events", "/events/stream", "/events/poll", "/ws", "/tokens", "/ai/run", "/rtc/rooms", "/mcp", "/me", "/connect/{method}"]) {
    assert.ok(doc.paths[p], `${p} documented`);
  }
  assert.ok(JSON.stringify(doc.components.securitySchemes).includes("bearer"));
  assert.ok(!/axto_sk_[A-Za-z0-9_-]{43}/.test(JSON.stringify(doc)), "no real-looking key in the spec");
});

test("plans: developer API limits grow with the plan and appear in the matrix", () => {
  let prev = { apiKeys: 0, apiRpm: 0, webhooks: 0 };
  for (const id of PLAN_ORDER) {
    const l = PLANS[id].limits;
    assert.ok(l.apiKeys > prev.apiKeys && l.apiRpm > prev.apiRpm && l.webhooks > prev.webhooks, `${id} limits increase`);
    prev = l;
  }
  const none = limitsFor("none" as any);
  assert.equal(none.apiKeys, 0);
  const keys = planMatrix().map((r) => r.key);
  for (const k of ["apiKeys", "apiRpm", "webhooks", "realtime"]) assert.ok(keys.includes(k), `matrix row ${k}`);
});
