/* AXTO E2E — a small stand-in for PayPal's Sandbox REST API, so PayPal can be
 * tested end to end with no network and no real keys. serve-local.sh points the
 * Sandbox environment at it (PAYPAL_SANDBOX_API); Live can never be redirected.
 * Implements what lib/billing/providers.ts calls: OAuth, create / get / capture
 * an order, webhook list / create / patch and signature verification — plus the
 * buyer's approval link (?action=approve|cancel). */
import http from "node:http";

export const MOCK_CLIENT_ID = "mock-sandbox-client-id";
export const MOCK_SECRET = "mock-sandbox-secret";
const TOKEN = "mock-access-token";

export interface PayPalMock {
  url: string;
  orders: Map<string, any>;
  webhooks: Map<string, { id: string; url: string; event_types: { name: string }[] }>;
  close: () => Promise<void>;
}

export function startPayPalMock(port = 8899): Promise<PayPalMock> {
  const orders = new Map<string, any>();
  const webhooks: PayPalMock["webhooks"] = new Map();
  let seq = 0;
  const base = `http://127.0.0.1:${port}`;
  const view = (o: any) => ({
    id: o.id, status: o.status,
    purchase_units: o.purchase_units.map((pu: any) => ({ ...pu, ...(o.capture ? { payments: { captures: [o.capture] } } : {}) })),
    links: o.status === "CREATED" ? [{ rel: "approve", href: `${base}/checkoutnow?token=${o.id}`, method: "GET" }] : [],
  });
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", base);
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const send = (code: number, body: unknown, headers: Record<string, string> = {}) => {
      res.writeHead(code, { "Content-Type": "application/json", ...headers });
      res.end(typeof body === "string" ? body : JSON.stringify(body));
    };
    const auth = String(req.headers.authorization || "");
    if (req.method === "POST" && url.pathname === "/v1/oauth2/token") {
      if (auth !== "Basic " + Buffer.from(`${MOCK_CLIENT_ID}:${MOCK_SECRET}`).toString("base64")) return send(401, { error: "invalid_client" });
      return send(200, { access_token: TOKEN, token_type: "Bearer", expires_in: 32400 });
    }
    if (req.method === "GET" && url.pathname === "/checkoutnow") {
      const o = orders.get(url.searchParams.get("token") || "");
      if (!o) return send(404, { error: "unknown order" });
      const ctx = o.ctx || {};
      const action = url.searchParams.get("action");
      if (action === "cancel") return send(302, "", { Location: `${ctx.cancel_url}${ctx.cancel_url.includes("?") ? "&" : "?"}token=${o.id}` });
      if (action === "approve") {
        o.status = "APPROVED";
        return send(302, "", { Location: `${ctx.return_url}${ctx.return_url.includes("?") ? "&" : "?"}token=${o.id}&PayerID=MOCKPAYER` });
      }
      return send(200, { order: o.id });
    }
    if (auth !== `Bearer ${TOKEN}`) return send(401, { name: "AUTHENTICATION_FAILURE" });
    if (req.method === "POST" && url.pathname === "/v2/checkout/orders") {
      const b = JSON.parse(raw || "{}");
      const id = `MOCK${++seq}`;
      orders.set(id, { id, status: "CREATED", purchase_units: b.purchase_units, ctx: b.application_context || b.payment_source?.paypal?.experience_context });
      return send(201, view(orders.get(id)));
    }
    const om = url.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)(\/capture)?$/);
    if (om) {
      const o = orders.get(decodeURIComponent(om[1]));
      if (!o) return send(404, { name: "RESOURCE_NOT_FOUND" });
      if (req.method === "GET" && !om[2]) return send(200, view(o));
      if (req.method === "POST" && om[2]) {
        if (o.status === "COMPLETED") return send(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] });
        if (o.status !== "APPROVED") return send(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_NOT_APPROVED" }] });
        const pu = o.purchase_units[0];
        o.status = "COMPLETED";
        o.capture = { id: `CAP-${o.id}`, status: "COMPLETED", amount: pu.amount, custom_id: pu.custom_id };
        return send(201, view(o));
      }
    }
    if (url.pathname === "/v1/notifications/webhooks") {
      if (req.method === "GET") return send(200, { webhooks: [...webhooks.values()] });
      if (req.method === "POST") {
        const b = JSON.parse(raw || "{}");
        if ([...webhooks.values()].some((w) => w.url === b.url)) return send(400, { name: "WEBHOOK_URL_ALREADY_EXISTS", details: [{ issue: "WEBHOOK_URL_ALREADY_EXISTS" }] });
        if (webhooks.size >= 10) return send(400, { name: "WEBHOOK_NUMBER_LIMIT_EXCEEDED", details: [{ issue: "WEBHOOK_NUMBER_LIMIT_EXCEEDED" }] });
        const w = { id: `WH-${++seq}`, url: String(b.url), event_types: b.event_types || [] };
        webhooks.set(w.id, w);
        return send(201, w);
      }
    }
    const wm = url.pathname.match(/^\/v1\/notifications\/webhooks\/([^/]+)$/);
    if (wm && req.method === "PATCH") {
      const w = webhooks.get(decodeURIComponent(wm[1]));
      if (!w) return send(404, { name: "INVALID_RESOURCE_ID" });
      for (const op of JSON.parse(raw || "[]")) if (op.path === "/event_types") w.event_types = op.value;
      return send(200, w);
    }
    if (req.method === "POST" && url.pathname === "/v1/notifications/verify-webhook-signature") {
      const b = JSON.parse(raw || "{}");
      return send(200, { verification_status: webhooks.has(b.webhook_id) && b.transmission_sig === "mock-signature" ? "SUCCESS" : "FAILURE" });
    }
    send(404, { name: "NOT_FOUND", path: url.pathname });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({
    url: base, orders, webhooks,
    close: () => new Promise<void>((r) => server.close(() => r())),
  })));
}
