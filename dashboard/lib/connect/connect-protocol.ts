/* ==============================================================================
 * AXTO CONNECT — the Connect protocol (connectrpc.com), JSON codec.
 * gRPC-compatible services over plain HTTP/1.1, HTTP/2 or HTTP/3, which is what
 * an edge runtime can serve (native gRPC needs HTTP/2 trailers, which Cloudflare
 * Workers cannot send). Connect clients — connect-es, connect-go, connect-swift,
 * connect-kotlin — talk to these endpoints with codegen from /api/v1/axto.proto.
 *   unary            POST application/json  → JSON body; errors {code, message}
 *   server streaming POST application/connect+json, each message enveloped:
 *                    1 byte flags (0x00 data, 0x02 end-stream) + 4-byte length + JSON
 * ============================================================================ */

export const CONNECT_JSON = "application/connect+json";
const enc = new TextEncoder();

export function envelope(msg: unknown, end = false): Uint8Array {
  const body = enc.encode(JSON.stringify(msg));
  const out = new Uint8Array(5 + body.length);
  out[0] = end ? 0x02 : 0x00;
  new DataView(out.buffer).setUint32(1, body.length, false);
  out.set(body, 5);
  return out;
}

/** First enveloped message of a streaming request body. */
export function readEnvelope(buf: Uint8Array): unknown {
  if (buf.length < 5) throw new Error("empty request");
  const len = new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(1, false);
  if (buf[0] & 0x01) throw new Error("compressed messages are not supported");
  if (5 + len > buf.length) throw new Error("truncated message");
  return JSON.parse(new TextDecoder().decode(buf.subarray(5, 5 + len)) || "{}");
}

/** Decode every envelope in a buffer (used by tests and the reference client). */
export function readAllEnvelopes(buf: Uint8Array): { end: boolean; msg: any }[] {
  const out: { end: boolean; msg: any }[] = [];
  let i = 0;
  while (i + 5 <= buf.length) {
    const len = new DataView(buf.buffer, buf.byteOffset + i, 4 + 1).getUint32(1, false);
    const msg = JSON.parse(new TextDecoder().decode(buf.subarray(i + 5, i + 5 + len)) || "{}");
    out.push({ end: !!(buf[i] & 0x02), msg });
    i += 5 + len;
  }
  return out;
}

/** Connect error codes ↔ HTTP status (unary). */
export const CODE_STATUS: Record<string, number> = {
  invalid_argument: 400, unauthenticated: 401, permission_denied: 403, not_found: 404, resource_exhausted: 429,
  failed_precondition: 412, unimplemented: 404, internal: 500, unavailable: 503, deadline_exceeded: 504,
};
export const statusCode = (status: number): string =>
  status === 400 ? "invalid_argument" : status === 401 ? "unauthenticated" : status === 402 || status === 412 ? "failed_precondition"
    : status === 403 ? "permission_denied" : status === 404 ? "not_found" : status === 413 ? "resource_exhausted" : status === 429 ? "resource_exhausted"
      : status === 503 ? "unavailable" : "internal";

export const PROTO = `// AXTO Connect — gRPC / Connect service definitions (JSON codec on the wire).
// Base URL: https://axto.io/api/v1/connect   e.g. POST /axto.connect.v1.EventService/Publish
syntax = "proto3";
package axto.connect.v1;
import "google/protobuf/struct.proto";

message Event { int64 id = 1; string channel = 2; string type = 3; google.protobuf.Value data = 4; string created_at = 5; }

message PublishRequest { string channel = 1; string type = 2; google.protobuf.Value data = 3; }
message PublishResponse { Event event = 1; }
message SubscribeRequest { repeated string channels = 1; int64 after = 2; int32 max_seconds = 3; }
message ListRequest { repeated string channels = 1; int64 after = 2; int32 limit = 3; }
message ListResponse { repeated Event events = 1; int64 cursor = 2; }

service EventService {
  rpc Publish(PublishRequest) returns (PublishResponse);
  rpc List(ListRequest) returns (ListResponse);
  rpc Subscribe(SubscribeRequest) returns (stream Event);   // server streaming; resume with "after"
}

message ChatMessage { string role = 1; string content = 2; }
message RunRequest { string app = 1; string task = 2; repeated ChatMessage messages = 3; string provider = 4; string model = 5; map<string, string> options = 6; }
message RunChunk { string text = 1; string note = 2; bool done = 3; string provider = 4; string model = 5; }

service AiService {
  rpc Run(RunRequest) returns (stream RunChunk);   // on the member's own AI keys (BYOK)
}
`;
