/* AXTO Connect — OpenAPI 3.1 description (served at /api/v1/openapi.json). */
export function openApi(origin: string) {
  const err = { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } };
  const auth = [{ bearer: [] }];
  return {
    openapi: "3.1.0",
    info: {
      title: "AXTO Connect API", version: "1.0.0",
      description: "Connect other websites, apps and AI agents to AXTO in real time: REST, Server-Sent Events, long polling, WebSocket, NDJSON streaming over HTTP/2 and HTTP/3, the Connect protocol (gRPC-compatible, see /api/v1/axto.proto), WebRTC signalling, signed webhooks and an MCP server. AI calls run on the member's own model keys.",
      contact: { name: "AXTO", url: "https://axto.io/developers" },
    },
    servers: [{ url: `${origin}/api/v1` }],
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer", description: "An API key (axto_sk_…) from Developers → API keys, or a short-lived stream token (axto_st_…)." } },
      schemas: {
        Error: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } } } } },
        Event: { type: "object", properties: { id: { type: "integer" }, channel: { type: "string" }, type: { type: "string" }, data: {}, createdAt: { type: "string", format: "date-time" }, source: { type: "string" } } },
      },
    },
    security: auth,
    paths: {
      "/me": { get: { summary: "The key's plan, scopes and limits", responses: { 200: { description: "OK" }, 401: err } } },
      "/events": {
        get: { summary: "List events after a cursor (polling)", parameters: [{ name: "channels", in: "query", schema: { type: "string" }, description: "Comma-separated channels or patterns (orders.*)" }, { name: "after", in: "query", schema: { type: "integer" } }, { name: "limit", in: "query", schema: { type: "integer", maximum: 500 } }], responses: { 200: { description: "Events", content: { "application/json": { schema: { type: "object", properties: { events: { type: "array", items: { $ref: "#/components/schemas/Event" } }, cursor: { type: "integer" } } } } } }, 401: err, 429: err } },
        post: { summary: "Publish an event", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["channel"], properties: { channel: { type: "string" }, type: { type: "string" }, data: {} } } } } }, responses: { 201: { description: "Published" }, 400: err, 413: err, 429: err } },
      },
      "/events/poll": { get: { summary: "Long polling: waits up to `wait` seconds for new events", parameters: [{ name: "channels", in: "query", schema: { type: "string" } }, { name: "after", in: "query", schema: { type: "string" }, description: "Cursor, or `now`" }, { name: "wait", in: "query", schema: { type: "integer", maximum: 30 } }], responses: { 200: { description: "Events (possibly empty) and the next cursor" } } } },
      "/events/stream": { get: { summary: "Server-Sent Events stream (resume with Last-Event-ID)", parameters: [{ name: "channels", in: "query", schema: { type: "string" } }, { name: "after", in: "query", schema: { type: "string" } }, { name: "token", in: "query", schema: { type: "string" }, description: "Stream token for browsers" }], responses: { 200: { description: "text/event-stream" } } } },
      "/ws": { get: { summary: "WebSocket: subscribe, publish, ping (Upgrade: websocket)", responses: { 101: { description: "Switching protocols" }, 426: err } } },
      "/tokens": { post: { summary: "Mint a short-lived stream token for a browser", requestBody: { content: { "application/json": { schema: { type: "object", properties: { channels: { type: "array", items: { type: "string" } }, ttl: { type: "integer", maximum: 86400 }, scopes: { type: "array", items: { type: "string" } } } } } } }, responses: { 201: { description: "Token" }, 403: err } } },
      "/ai/run": { post: { summary: "Run AI on the member's own keys, streamed (SSE, NDJSON, text or JSON)", requestBody: { content: { "application/json": { schema: { type: "object", properties: { prompt: { type: "string" }, messages: { type: "array", items: { type: "object", properties: { role: { type: "string", enum: ["user", "assistant"] }, content: { type: "string" } } } }, app: { type: "string", default: "studio" }, task: { type: "string" }, provider: { type: "string" }, model: { type: "string" }, options: { type: "object" } } } } } }, parameters: [{ name: "format", in: "query", schema: { type: "string", enum: ["sse", "ndjson", "json", "text"] } }], responses: { 200: { description: "Streamed answer" }, 402: err, 412: err } } },
      "/rtc/rooms": { post: { summary: "Create a WebRTC room: signalling channel + ICE servers (STUN, TURN when configured)", responses: { 201: { description: "Room" } } } },
      "/mcp": { post: { summary: "Model Context Protocol (Streamable HTTP): tools for AI agents", responses: { 200: { description: "JSON-RPC result" }, 202: { description: "Notification accepted" } } } },
      "/connect/{method}": { post: { summary: "Connect protocol (gRPC-compatible, JSON codec) — see /api/v1/axto.proto", parameters: [{ name: "method", in: "path", required: true, schema: { type: "string" }, example: "axto.connect.v1.EventService/Subscribe" }], responses: { 200: { description: "application/json or application/connect+json" } } } },
    },
  };
}
