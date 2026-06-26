# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Edge — AI API Gateway & Billing Engine v1.0

The "Stripe for AI API Billing" — for SaaS companies that embed AI.
Deploy Edge between YOUR customers and any AI provider.

Architecture:
  Your App's Customer → AXTO Edge (your server) → AI Provider (your BYOK key)

Features:
  • Per-customer API key management (issue/revoke instantly)
  • Token metering: input + output tokens tracked per customer
  • Per-customer rate limiting (configurable per tier)
  • Tiered billing plans (free / pro / enterprise with markup)
  • Prompt injection firewall (detect + block attacks)
  • Content filtering (block NSFW / harmful / competitor mentions)
  • Abuse detection (anomaly patterns, velocity checks)
  • Real-time usage analytics + dashboard
  • Webhooks: quota exceeded, abuse detected, billing events
  • OpenAI-compatible proxy (drop-in for your customers)
  • Multi-provider BYOK (OpenAI, Anthropic, Gemini, Groq, etc.)

Endpoints:
  /               → Dashboard HTML UI
  /health         → Health + stats
  /v1/*           → OpenAI-compatible proxy (customer-facing)
  /edge/keys      → API key management (admin)
  /edge/customers → Customer management (admin)
  /edge/plans     → Billing plan management (admin)
  /edge/usage     → Usage analytics (admin + customer self-serve)
  /edge/billing   → Invoice generation (admin)
  /edge/firewall  → Firewall rules (admin)
  /edge/webhooks  → Webhook config (admin)
  /support        → AI support chat
  /ws/usage       → Real-time usage stream (WebSocket)
"""
from __future__ import annotations

import asyncio
import json
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel
import structlog

from src.core import EdgeCore

log = structlog.get_logger()

app = FastAPI(
    title="AXTO Edge — AI API Gateway & Billing",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    await EdgeCore.get().startup()

@app.on_event("shutdown")
async def on_shutdown():
    await EdgeCore.get().shutdown()


# ── Root: Dashboard ───────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def root():
    core = EdgeCore.get()
    if not (core.license_info and core.license_info.valid):
        with open("/edge/src/activation.html") as f:
            return HTMLResponse(content=f.read())
    with open("/edge/src/dashboard.html") as f:
        return HTMLResponse(content=f.read())

@app.post("/activate")
async def activate(req: Request):
    body = await req.json()
    key  = (body.get("license_key") or "").strip().upper()
    if not key.startswith("EDGE-"):
        raise HTTPException(400, "Invalid key format. Key must start with EDGE-")
    core = EdgeCore.get()
    info = await core.license_validator.validate(force=True, key_override=key)
    if not info.valid:
        raise HTTPException(403, info.reason or "Invalid license key")
    (core.cfg.data_dir / "license.key").write_text(key)
    core.license_info = info
    return {"ok": True, "product": info.product, "package": info.package,
            "expires_at": info.expires_at, "max_customers": info.max_customers}


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    core = EdgeCore.get()
    stats = await core.meter.get_today_stats()
    return {
        "status":   "ok",
        "version":  "1.0.0",
        "product":  "edge",
        "license":  core.license_info.package if core.license_info else "unlicensed",
        "valid":    core.license_info.valid    if core.license_info else False,
        "uptime_s": core.uptime_seconds(),
        "stats": {
            "customers_active":   await core.key_mgr.count_active_customers(),
            "api_keys_issued":    await core.key_mgr.count_keys(),
            "requests_today":     stats["requests"],
            "tokens_today":       stats["tokens"],
            "blocked_today":      stats["blocked"],
            "revenue_usd_today":  stats["revenue_usd"],
        },
        "providers": core.proxy.provider_count,
        "firewall": {
            "prompt_injection":  core.cfg.firewall_prompt_injection,
            "content_filter":    core.cfg.firewall_content_filter,
            "abuse_detection":   core.cfg.firewall_abuse_detection,
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
# CUSTOMER-FACING PROXY (OpenAI-compatible)
# Customers call this with their Edge API key (X-API-Key or Authorization header)
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/v1/chat/completions")
async def proxy_chat(req: Request):
    return await _proxy_request(req, "/v1/chat/completions")

@app.post("/v1/messages")
async def proxy_messages(req: Request):
    return await _proxy_request(req, "/v1/messages")

@app.post("/v1/embeddings")
async def proxy_embeddings(req: Request):
    return await _proxy_request(req, "/v1/embeddings")

@app.post("/v1/completions")
async def proxy_completions(req: Request):
    return await _proxy_request(req, "/v1/completions")

@app.get("/v1/models")
async def proxy_models(req: Request):
    """Return available models for this customer's plan."""
    customer = await _authenticate(req)
    plan     = EdgeCore.get().plan_mgr.get_plan(customer["plan_code"])
    return {"object": "list", "data": [{"id": m, "object": "model"} for m in (plan.allowed_models or ["gpt-4o-mini"])]}

@app.api_route("/v1/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_passthrough(path: str, req: Request):
    return await _proxy_request(req, f"/v1/{path}")


async def _authenticate(req: Request) -> Dict:
    """Extract + validate customer API key. Returns customer record."""
    # Support: X-API-Key header, Authorization: Bearer sk-edge-xxx, or ?api_key= param
    key = (
        req.headers.get("x-api-key") or
        req.headers.get("x-edge-key") or
        _extract_bearer(req.headers.get("authorization", "")) or
        req.query_params.get("api_key") or ""
    )
    if not key:
        raise HTTPException(401, detail="API key required. Pass X-API-Key header or Authorization: Bearer <key>")

    core     = EdgeCore.get()
    customer = await core.key_mgr.lookup_customer(key)
    if not customer:
        raise HTTPException(401, detail="Invalid API key. Create your key at your provider's portal.")
    if customer["status"] == "suspended":
        raise HTTPException(403, detail="Account suspended. Contact your provider.")
    if customer["status"] == "quota_exceeded":
        raise HTTPException(429, detail="Monthly quota exceeded. Upgrade your plan or contact your provider.")
    return customer


async def _proxy_request(req: Request, path: str) -> Response:
    """Full gateway pipeline: auth → firewall → rate-limit → proxy → meter → respond."""
    core   = EdgeCore.get()
    t0     = time.monotonic()
    req_id = str(uuid.uuid4())[:12]

    # ── 1. Authenticate ───────────────────────────────────────────────────────
    customer = await _authenticate(req)
    cid      = customer["id"]
    plan     = core.plan_mgr.get_plan(customer["plan_code"])

    # ── 2. Rate limiting ──────────────────────────────────────────────────────
    rl_ok, rl_remaining, rl_reset = await core.rate_limiter.check(cid, plan)
    if not rl_ok:
        await core.meter.record_blocked(cid, "rate_limit")
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Limit: {plan.rate_limit_rpm} req/min.",
            headers={
                "X-RateLimit-Limit":     str(plan.rate_limit_rpm),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset":     str(rl_reset),
                "Retry-After":           "60",
            },
        )

    # ── 3. Parse body ─────────────────────────────────────────────────────────
    try:
        body = await req.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON body")

    # ── 4. Firewall: prompt injection detection ───────────────────────────────
    if core.cfg.firewall_prompt_injection:
        messages = body.get("messages", [])
        inj = core.firewall.check_prompt_injection(messages)
        if inj["blocked"]:
            await core.meter.record_blocked(cid, "prompt_injection")
            await core.webhook_mgr.fire("abuse_detected", {
                "customer_id": cid, "type": "prompt_injection",
                "pattern": inj["pattern"], "req_id": req_id,
            })
            raise HTTPException(
                400,
                detail=f"Request blocked: prompt injection detected ({inj['pattern']}). "
                       f"Please review your AI integration.",
                headers={"X-Edge-Blocked": "prompt_injection", "X-Edge-Req-ID": req_id},
            )

    # ── 5. Firewall: content filter ───────────────────────────────────────────
    if core.cfg.firewall_content_filter:
        content_ok, content_reason = core.firewall.check_content(body.get("messages", []), plan)
        if not content_ok:
            await core.meter.record_blocked(cid, "content_filter")
            raise HTTPException(
                400,
                detail=f"Request blocked by content policy: {content_reason}",
                headers={"X-Edge-Blocked": "content_filter"},
            )

    # ── 6. Model validation (plan check) ──────────────────────────────────────
    requested_model = body.get("model", "")
    if plan.allowed_models and requested_model and requested_model not in plan.allowed_models:
        # Swap to plan's default model instead of blocking
        body["model"] = plan.allowed_models[0]
        log.info("edge_model_swap", from_model=requested_model, to_model=body["model"], customer=cid)

    # ── 7. Quota check ────────────────────────────────────────────────────────
    quota_ok = await core.meter.check_quota(cid, plan)
    if not quota_ok:
        customer_updated = await core.key_mgr.set_status(cid, "quota_exceeded")
        await core.webhook_mgr.fire("quota_exceeded", {
            "customer_id": cid, "plan": plan.code,
            "quota_tokens": plan.monthly_token_quota,
        })
        raise HTTPException(
            429,
            detail=f"Monthly token quota exceeded ({plan.monthly_token_quota:,} tokens). "
                   f"Upgrade your plan to continue.",
            headers={"X-Edge-Quota-Exceeded": "true"},
        )

    # ── 8. Forward to AI provider ─────────────────────────────────────────────
    streaming = bool(body.get("stream", False))
    try:
        if streaming:
            return await _handle_stream(body, path, cid, plan, req_id, t0, core)

        ai_resp = await core.proxy.forward(body, path, plan)

    except Exception as e:
        log.error("edge_proxy_error", req_id=req_id, customer=cid, error=str(e))
        raise HTTPException(502, f"AI provider error: {str(e)}")

    # ── 9. Token metering ─────────────────────────────────────────────────────
    usage = ai_resp["body"].get("usage", {})
    input_tokens  = usage.get("prompt_tokens", 0) or usage.get("input_tokens", 0)
    output_tokens = usage.get("completion_tokens", 0) or usage.get("output_tokens", 0)
    elapsed_ms    = int((time.monotonic() - t0) * 1000)

    cost_usd = core.billing.calculate_cost(
        input_tokens, output_tokens,
        model=body.get("model", ""), plan=plan
    )

    await core.meter.record_request(
        customer_id=cid,
        req_id=req_id,
        model=body.get("model", ""),
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=cost_usd,
        elapsed_ms=elapsed_ms,
        path=path,
    )

    # ── 10. Abuse detection ───────────────────────────────────────────────────
    if core.cfg.firewall_abuse_detection:
        asyncio.create_task(
            core.firewall.check_abuse_async(cid, input_tokens + output_tokens, elapsed_ms),
            name=f"abuse-{req_id[:8]}"
        )

    # ── 11. Broadcast to WebSocket ────────────────────────────────────────────
    asyncio.create_task(core.ws_mgr.broadcast({
        "type":          "request",
        "customer_id":   cid,
        "model":         body.get("model", ""),
        "tokens":        input_tokens + output_tokens,
        "cost_usd":      cost_usd,
        "elapsed_ms":    elapsed_ms,
        "ts":            _now(),
    }))

    return Response(
        content=json.dumps(ai_resp["body"]),
        media_type="application/json",
        headers={
            "X-Edge-Req-ID":       req_id,
            "X-Edge-Customer":     cid,
            "X-Edge-Tokens-In":    str(input_tokens),
            "X-Edge-Tokens-Out":   str(output_tokens),
            "X-Edge-Cost-USD":     f"{cost_usd:.6f}",
            "X-Edge-Latency-Ms":   str(elapsed_ms),
            "X-RateLimit-Remaining": str(rl_remaining),
        },
    )


async def _handle_stream(body, path, cid, plan, req_id, t0, core: EdgeCore) -> StreamingResponse:
    token_accumulator = {"input": 0, "output": 0}

    async def generate():
        try:
            async for chunk in core.proxy.forward_stream(body, path, plan):
                if chunk.startswith("data: ") and chunk[6:].strip() != "[DONE]":
                    try:
                        data = json.loads(chunk[6:])
                        # Count delta tokens (approximate)
                        delta = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        token_accumulator["output"] += max(1, len(delta.split()) * 4 // 3)
                    except Exception:
                        pass
                yield f"{chunk}\n"
        finally:
            elapsed_ms  = int((time.monotonic() - t0) * 1000)
            in_t        = token_accumulator["input"]
            out_t       = token_accumulator["output"]
            cost_usd    = core.billing.calculate_cost(in_t, out_t, model=body.get("model",""), plan=plan)
            asyncio.create_task(core.meter.record_request(
                customer_id=cid, req_id=req_id, model=body.get("model",""),
                input_tokens=in_t, output_tokens=out_t, cost_usd=cost_usd,
                elapsed_ms=elapsed_ms, path=path,
            ))

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "X-Edge-Req-ID":   req_id,
            "X-Edge-Customer": cid,
            "Cache-Control":   "no-cache",
            "Connection":      "keep-alive",
        },
    )


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN: API Key Management
# ══════════════════════════════════════════════════════════════════════════════

class CustomerCreate(BaseModel):
    name:        str
    email:       str
    plan_code:   str = "free"
    description: Optional[str] = ""
    metadata:    Optional[Dict] = {}

class KeyCreate(BaseModel):
    customer_id: str
    label:       Optional[str] = ""
    expires_days:Optional[int] = None  # None = never expires

@app.get("/edge/customers")
async def list_customers(limit: int = 100, offset: int = 0, status: Optional[str] = None):
    return await EdgeCore.get().key_mgr.list_customers(limit=limit, offset=offset, status=status)

@app.post("/edge/customers")
async def create_customer(body: CustomerCreate):
    return await EdgeCore.get().key_mgr.create_customer(body.dict())

@app.get("/edge/customers/{customer_id}")
async def get_customer(customer_id: str):
    c = await EdgeCore.get().key_mgr.get_customer(customer_id)
    if not c: raise HTTPException(404, "Customer not found")
    return c

@app.patch("/edge/customers/{customer_id}")
async def update_customer(customer_id: str, req: Request):
    body = await req.json()
    return await EdgeCore.get().key_mgr.update_customer(customer_id, body)

@app.delete("/edge/customers/{customer_id}")
async def delete_customer(customer_id: str):
    await EdgeCore.get().key_mgr.delete_customer(customer_id)
    return {"ok": True}

@app.post("/edge/customers/{customer_id}/suspend")
async def suspend_customer(customer_id: str):
    await EdgeCore.get().key_mgr.set_status(customer_id, "suspended")
    return {"ok": True}

@app.post("/edge/customers/{customer_id}/activate")
async def activate_customer(customer_id: str):
    await EdgeCore.get().key_mgr.set_status(customer_id, "active")
    return {"ok": True}

@app.get("/edge/keys")
async def list_keys(customer_id: Optional[str] = None):
    return await EdgeCore.get().key_mgr.list_keys(customer_id=customer_id)

@app.post("/edge/keys")
async def create_key(body: KeyCreate):
    return await EdgeCore.get().key_mgr.create_key(
        customer_id=body.customer_id,
        label=body.label or "",
        expires_days=body.expires_days,
    )

@app.delete("/edge/keys/{key_id}")
async def revoke_key(key_id: str):
    await EdgeCore.get().key_mgr.revoke_key(key_id)
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN: Plans
# ══════════════════════════════════════════════════════════════════════════════

class PlanCreate(BaseModel):
    code:               str
    name:               str
    description:        Optional[str] = ""
    monthly_token_quota:int  = 1_000_000
    rate_limit_rpm:     int  = 60
    price_per_1k_tokens:float = 0.002      # What YOU charge YOUR customers
    allowed_models:     List[str] = []     # Empty = all models
    max_context_tokens: int  = 128_000
    features:           List[str] = []

@app.get("/edge/plans")
async def list_plans():
    return EdgeCore.get().plan_mgr.list_plans()

@app.post("/edge/plans")
async def create_plan(body: PlanCreate):
    return EdgeCore.get().plan_mgr.create_plan(body.dict())

@app.put("/edge/plans/{plan_code}")
async def update_plan(plan_code: str, body: PlanCreate):
    return EdgeCore.get().plan_mgr.update_plan(plan_code, body.dict())

@app.delete("/edge/plans/{plan_code}")
async def delete_plan(plan_code: str):
    EdgeCore.get().plan_mgr.delete_plan(plan_code)
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
# USAGE & ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/edge/usage")
async def usage_summary(
    customer_id: Optional[str] = None,
    since:       Optional[str] = None,
    period:      str = "day",   # "hour" | "day" | "week" | "month"
):
    return await EdgeCore.get().meter.get_usage(
        customer_id=customer_id, since=since, period=period
    )

@app.get("/edge/usage/timeline")
async def usage_timeline(customer_id: Optional[str] = None, days: int = 30):
    return await EdgeCore.get().meter.get_timeline(customer_id=customer_id, days=days)

@app.get("/edge/usage/top-customers")
async def top_customers(limit: int = 20, days: int = 30):
    return await EdgeCore.get().meter.get_top_customers(limit=limit, days=days)

@app.get("/edge/usage/models")
async def model_breakdown(customer_id: Optional[str] = None, days: int = 30):
    return await EdgeCore.get().meter.get_model_breakdown(customer_id=customer_id, days=days)

@app.get("/edge/usage/customer/{customer_id}")
async def customer_usage(customer_id: str, days: int = 30):
    return await EdgeCore.get().meter.get_customer_detail(customer_id=customer_id, days=days)


# ══════════════════════════════════════════════════════════════════════════════
# BILLING
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/edge/billing/invoices")
async def list_invoices(customer_id: Optional[str] = None, limit: int = 50):
    return await EdgeCore.get().billing.list_invoices(customer_id=customer_id, limit=limit)

@app.post("/edge/billing/invoices/generate")
async def generate_invoices(req: Request):
    """Generate invoices for all customers for current billing period."""
    body    = await req.json()
    period  = body.get("period", "current_month")
    results = await EdgeCore.get().billing.generate_invoices(period=period)
    return {"ok": True, "invoices_generated": len(results), "results": results}

@app.get("/edge/billing/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, format: str = "json"):
    inv = await EdgeCore.get().billing.get_invoice(invoice_id)
    if not inv: raise HTTPException(404, "Invoice not found")
    if format == "text":
        return Response(
            content=_format_invoice_text(inv),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="invoice-{invoice_id[:8]}.txt"'},
        )
    return inv

@app.get("/edge/billing/revenue")
async def revenue_summary(days: int = 30):
    return await EdgeCore.get().billing.get_revenue_summary(days=days)


# ══════════════════════════════════════════════════════════════════════════════
# FIREWALL
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/edge/firewall/stats")
async def firewall_stats(days: int = 7):
    return await EdgeCore.get().meter.get_blocked_stats(days=days)

@app.get("/edge/firewall/rules")
async def list_firewall_rules():
    return EdgeCore.get().firewall.list_rules()

@app.post("/edge/firewall/rules")
async def add_firewall_rule(req: Request):
    body = await req.json()
    return EdgeCore.get().firewall.add_rule(body)

@app.delete("/edge/firewall/rules/{rule_id}")
async def remove_firewall_rule(rule_id: str):
    EdgeCore.get().firewall.remove_rule(rule_id)
    return {"ok": True}

@app.post("/edge/firewall/test")
async def test_firewall(req: Request):
    """Test a message against the firewall without forwarding."""
    body     = await req.json()
    messages = body.get("messages", [])
    core     = EdgeCore.get()
    inj      = core.firewall.check_prompt_injection(messages)
    content  = core.firewall.check_content(messages, plan=None)
    return {
        "prompt_injection": inj,
        "content_filter":   {"blocked": not content[0], "reason": content[1]},
    }


# ══════════════════════════════════════════════════════════════════════════════
# WEBHOOKS CONFIG
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/edge/webhooks")
async def list_webhooks():
    return EdgeCore.get().webhook_mgr.list_webhooks()

@app.post("/edge/webhooks")
async def add_webhook(req: Request):
    body = await req.json()
    return EdgeCore.get().webhook_mgr.add_webhook(body)

@app.delete("/edge/webhooks/{webhook_id}")
async def remove_webhook(webhook_id: str):
    EdgeCore.get().webhook_mgr.remove_webhook(webhook_id)
    return {"ok": True}

@app.post("/edge/webhooks/test")
async def test_webhook(req: Request):
    body = await req.json()
    result = await EdgeCore.get().webhook_mgr.fire("test", {"message": "Webhook test from AXTO Edge"})
    return {"ok": True, "sent": result}


# ══════════════════════════════════════════════════════════════════════════════
# PROVIDERS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/edge/providers")
async def list_providers():
    return EdgeCore.get().proxy.list_providers()

@app.post("/edge/providers/test")
async def test_provider(req: Request):
    body = await req.json()
    return await EdgeCore.get().proxy.test_provider(body)


# ══════════════════════════════════════════════════════════════════════════════
# SUPPORT + WEBSOCKET
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/support", response_class=HTMLResponse)
async def support():
    with open("/edge/src/support_ui.html") as f:
        return HTMLResponse(content=f.read())

@app.websocket("/ws/usage")
async def ws_usage(ws: WebSocket):
    """Real-time usage stream — per-subscriber queue, no stealing."""
    await ws.accept()
    core  = EdgeCore.get()
    sub_q = await core.ws_mgr.subscribe()
    try:
        while True:
            try:
                event = await asyncio.wait_for(sub_q.get(), timeout=30.0)
                await ws.send_json(event)
            except asyncio.TimeoutError:
                await ws.send_json({"type": "heartbeat", "ts": _now()})
    except WebSocketDisconnect:
        pass
    finally:
        await core.ws_mgr.unsubscribe(sub_q)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _extract_bearer(auth: str) -> str:
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return ""

def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()

def _format_invoice_text(inv: Dict) -> str:
    lines = [
        "═" * 58,
        "  AXTO EDGE — USAGE INVOICE",
        "═" * 58,
        f"Invoice #:    {inv.get('id','')[:8].upper()}",
        f"Period:       {inv.get('period_start','')} → {inv.get('period_end','')}",
        f"Customer:     {inv.get('customer_name','')} ({inv.get('customer_email','')})",
        f"Plan:         {inv.get('plan_code','')}",
        "─" * 58,
        f"Input tokens:   {inv.get('input_tokens',0):>12,}",
        f"Output tokens:  {inv.get('output_tokens',0):>12,}",
        f"Total tokens:   {inv.get('total_tokens',0):>12,}",
        f"Total requests: {inv.get('total_requests',0):>12,}",
        "─" * 58,
        f"Amount due:   ${inv.get('amount_usd',0):,.4f} USD",
        "═" * 58,
        "AXTO Edge — AI API Gateway & Billing | axto.io",
    ]
    return "\n".join(lines)
