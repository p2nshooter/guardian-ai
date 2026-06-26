/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, newId, now } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { encryptObj, decryptObj } from "@/lib/gateway-crypto";

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/studio — Load tenant dashboard data
// POST /api/studio — CRUD operations (credentials, sessions, artifacts)
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Get or create tenant
  let tenant = await dbFirst<any>(db,
    `SELECT * FROM studio_tenants WHERE email = ?`, [user.email]);

  if (!tenant) {
    // Auto-create tenant from client
    const client = await dbFirst<any>(db,
      `SELECT id, name, email FROM clients WHERE email = ?`, [user.email]);
    if (!client) {
      return NextResponse.json({ error: "No client account. Register first at axto.io/register" }, { status: 404 });
    }
    const tid = newId();
    await dbRun(db,
      `INSERT INTO studio_tenants (id, client_id, email, display_name, plan, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?)`,
      [tid, client.id, user.email, client.name || user.email, "starter", now(), now()]);
    tenant = await dbFirst(db, `SELECT * FROM studio_tenants WHERE id = ?`, [tid]);
  }

  // Load credentials (decrypt labels only, not full keys)
  const credentials = await dbQuery<any>(db,
    `SELECT id, provider, category, label, is_active, is_verified, last_used, total_requests, total_tokens, total_cost_usd, created_at
     FROM studio_credentials WHERE tenant_id = ? ORDER BY category, provider`, [tenant.id]);

  // Load recent sessions (14-day window)
  const sessions = await dbQuery<any>(db,
    `SELECT id, studio_type, title, provider, model, total_tokens, total_cost_usd, is_pinned, created_at, updated_at, expires_at
     FROM studio_sessions WHERE tenant_id = ? AND expires_at > datetime('now')
     ORDER BY updated_at DESC LIMIT 50`, [tenant.id]);

  // Load artifacts
  const artifacts = await dbQuery<any>(db,
    `SELECT id, studio_type, artifact_type, title, file_size, mime_type, created_at, expires_at
     FROM studio_artifacts WHERE tenant_id = ? AND expires_at > datetime('now')
     ORDER BY created_at DESC LIMIT 100`, [tenant.id]);

  // GPU instances
  const gpuInstances = await dbQuery<any>(db,
    `SELECT id, instance_name, provider, gpu_type, gpu_count, vram_gb, endpoint_url, status, deployed_model, last_health
     FROM studio_gpu_instances WHERE tenant_id = ? ORDER BY created_at DESC`, [tenant.id]);

  // Pipelines
  const pipelines = await dbQuery<any>(db,
    `SELECT id, title, description, status, last_run, run_count, created_at, expires_at
     FROM studio_pipelines WHERE tenant_id = ? AND expires_at > datetime('now')
     ORDER BY updated_at DESC LIMIT 20`, [tenant.id]);

  // Usage stats (today + this month)
  const usageToday = await dbFirst<any>(db,
    `SELECT COUNT(*) as requests, COALESCE(SUM(input_tokens+output_tokens),0) as tokens, COALESCE(SUM(cost_usd),0) as cost
     FROM studio_usage_log WHERE tenant_id = ? AND created_at >= date('now')`, [tenant.id]);
  const usageMonth = await dbFirst<any>(db,
    `SELECT COUNT(*) as requests, COALESCE(SUM(input_tokens+output_tokens),0) as tokens, COALESCE(SUM(cost_usd),0) as cost
     FROM studio_usage_log WHERE tenant_id = ? AND created_at >= date('now','start of month')`, [tenant.id]);

  return NextResponse.json({
    tenant: {
      id: tenant.id, plan: tenant.plan, status: tenant.status,
      display_name: tenant.display_name,
      quota_ai_requests: tenant.quota_ai_requests,
      quota_gpu_hours: tenant.quota_gpu_hours,
      quota_storage_mb: tenant.quota_storage_mb,
    },
    credentials,
    sessions,
    artifacts,
    gpuInstances,
    pipelines,
    usage: { today: usageToday, month: usageMonth },
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const tenant = await dbFirst<any>(db,
    `SELECT * FROM studio_tenants WHERE email = ?`, [user.email]);
  if (!tenant) return NextResponse.json({ error: "No studio account" }, { status: 404 });

  const { action } = body;

  // ── Add credential ──────────────────────────────────────────────────────
  if (action === "add_credential") {
    const { provider, category, label, api_key, endpoint, extra } = body;
    if (!provider || !api_key) {
      return NextResponse.json({ error: "provider and api_key required" }, { status: 400 });
    }

    // Verify API key by making a test call
    const verified = await verifyProviderKey(provider, api_key, endpoint);

    const credsJson = JSON.stringify({ api_key, endpoint: endpoint || "", ...extra });
    let encCreds: string;
    try {
      encCreds = await encryptObj(credsJson);
    } catch {
      encCreds = credsJson; // fallback if encryption not configured
    }

    const id = newId();
    await dbRun(db,
      `INSERT INTO studio_credentials (id, tenant_id, provider, category, label, credentials_enc, is_active, is_verified, created_at, updated_at)
       VALUES (?,?,?,?,?,?,1,?,?,?)`,
      [id, tenant.id, provider, category || "ai", label || provider, encCreds, verified ? 1 : 0, now(), now()]);

    return NextResponse.json({ ok: true, id, verified, message: verified ? "Connected & verified!" : "Saved (verification pending)" });
  }

  // ── Remove credential ───────────────────────────────────────────────────
  if (action === "remove_credential") {
    const { credential_id } = body;
    // Ensure tenant ownership
    await dbRun(db, `DELETE FROM studio_credentials WHERE id = ? AND tenant_id = ?`, [credential_id, tenant.id]);
    return NextResponse.json({ ok: true });
  }

  // ── Create session ──────────────────────────────────────────────────────
  if (action === "create_session") {
    const { studio_type, title, provider, model, system_prompt } = body;
    const id = newId();
    await dbRun(db,
      `INSERT INTO studio_sessions (id, tenant_id, studio_type, title, provider, model, system_prompt, created_at, updated_at, expires_at)
       VALUES (?,?,?,?,?,?,?,?,?,datetime('now','+14 days'))`,
      [id, tenant.id, studio_type || "ai", title || "Untitled", provider || "", model || "", system_prompt || "", now(), now()]);
    return NextResponse.json({ ok: true, id });
  }

  // ── Delete session ──────────────────────────────────────────────────────
  if (action === "delete_session") {
    const { session_id } = body;
    await dbRun(db, `DELETE FROM studio_sessions WHERE id = ? AND tenant_id = ?`, [session_id, tenant.id]);
    await dbRun(db, `DELETE FROM studio_artifacts WHERE session_id = ? AND tenant_id = ?`, [session_id, tenant.id]);
    return NextResponse.json({ ok: true });
  }

  // ── Chat completion (AI Studio) ─────────────────────────────────────────
  if (action === "chat") {
    const { session_id, credential_id, model, messages, settings } = body;
    if (!credential_id || !messages?.length) {
      return NextResponse.json({ error: "credential_id and messages required" }, { status: 400 });
    }

    // Get credential (tenant-scoped)
    const cred = await dbFirst<any>(db,
      `SELECT * FROM studio_credentials WHERE id = ? AND tenant_id = ?`, [credential_id, tenant.id]);
    if (!cred) return NextResponse.json({ error: "Credential not found" }, { status: 404 });

    let decrypted: any;
    try {
      const raw = await decryptObj<string>(cred.credentials_enc);
      decrypted = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      try { decrypted = JSON.parse(cred.credentials_enc); } catch {
        return NextResponse.json({ error: "Failed to decrypt credentials" }, { status: 500 });
      }
    }

    // Route to provider
    const startTime = Date.now();
    const result = await callProvider(cred.provider, decrypted, model || "", messages, settings || {});
    const latency = Date.now() - startTime;

    // Log usage
    const logId = newId();
    await dbRun(db,
      `INSERT INTO studio_usage_log (id, tenant_id, session_id, studio_type, provider, model, input_tokens, output_tokens, latency_ms, cost_usd, status, error_msg, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [logId, tenant.id, session_id || "", "ai", cred.provider, model || "",
       result.usage?.input_tokens || 0, result.usage?.output_tokens || 0,
       latency, result.cost || 0, result.error ? "error" : "success", result.error || "", now()]);

    // Update credential stats
    await dbRun(db,
      `UPDATE studio_credentials SET total_requests = total_requests + 1, total_tokens = total_tokens + ?, total_cost_usd = total_cost_usd + ?, last_used = ?, updated_at = ? WHERE id = ?`,
      [(result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0), result.cost || 0, now(), now(), credential_id]);

    // Update session messages if session exists
    if (session_id) {
      const sess = await dbFirst<any>(db,
        `SELECT messages FROM studio_sessions WHERE id = ? AND tenant_id = ?`, [session_id, tenant.id]);
      if (sess) {
        let allMessages: any[];
        try { allMessages = JSON.parse(sess.messages); } catch { allMessages = []; }
        // Add user message + assistant response
        const userMsg = messages[messages.length - 1];
        allMessages.push(userMsg);
        if (result.content) {
          allMessages.push({ role: "assistant", content: result.content });
        }
        await dbRun(db,
          `UPDATE studio_sessions SET messages = ?, total_tokens = total_tokens + ?, total_cost_usd = total_cost_usd + ?, updated_at = ? WHERE id = ?`,
          [JSON.stringify(allMessages), (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0), result.cost || 0, now(), session_id]);
      }
    }

    if (result.error) {
      return NextResponse.json({ error: result.error, latency }, { status: 502 });
    }

    return NextResponse.json({
      content: result.content,
      usage: result.usage,
      cost: result.cost,
      model: result.model || model,
      latency,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// ═══════════════════════════════════════════════════════════════════════════
// Provider call router
// ═══════════════════════════════════════════════════════════════════════════
async function callProvider(
  provider: string,
  creds: { api_key: string; endpoint?: string },
  model: string,
  messages: any[],
  settings: any
): Promise<{ content?: string; usage?: any; cost?: number; model?: string; error?: string }> {
  const { api_key, endpoint } = creds;
  const temperature = settings.temperature ?? 0.7;
  const max_tokens = settings.max_tokens ?? 2048;

  // OpenAI-compatible format for all providers
  const body = JSON.stringify({
    model: model || getDefaultModel(provider),
    messages,
    temperature,
    max_tokens,
    stream: false,
  });

  const baseUrls: Record<string, string> = {
    openai:    "https://api.openai.com/v1",
    anthropic: "https://api.anthropic.com/v1",
    google:    "https://generativelanguage.googleapis.com/v1beta",
    groq:      "https://api.groq.com/openai/v1",
    mistral:   "https://api.mistral.ai/v1",
    deepseek:  "https://api.deepseek.com/v1",
    xai:       "https://api.x.ai/v1",
    cohere:    "https://api.cohere.com/v1",
    ollama:    endpoint || "http://localhost:11434/v1",
    custom_ai: endpoint || "",
  };

  // Anthropic uses different format
  if (provider === "anthropic") {
    return callAnthropic(api_key, model || "claude-sonnet-4-20250514", messages, temperature, max_tokens);
  }

  // Google Gemini uses different format
  if (provider === "google") {
    return callGemini(api_key, model || "gemini-2.5-flash", messages, temperature, max_tokens);
  }

  // All others: OpenAI-compatible
  const baseUrl = baseUrls[provider] || endpoint;
  if (!baseUrl) return { error: `No endpoint configured for ${provider}` };

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${api_key}`,
        "Content-Type": "application/json",
      },
      body,
    });

    const data: any = await res.json();
    if (!res.ok) {
      return { error: data.error?.message || data.message || `${provider} API error: ${res.status}` };
    }

    const choice = data.choices?.[0];
    return {
      content: choice?.message?.content || "",
      usage: {
        input_tokens: data.usage?.prompt_tokens || 0,
        output_tokens: data.usage?.completion_tokens || 0,
      },
      cost: estimateCost(provider, model, data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0),
      model: data.model || model,
    };
  } catch (e: any) {
    return { error: e.message || "Network error" };
  }
}

async function callAnthropic(apiKey: string, model: string, messages: any[], temperature: number, maxTokens: number) {
  // Extract system message
  const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
  const chatMessages = messages.filter((m: any) => m.role !== "system");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemMsg,
        messages: chatMessages,
      }),
    });

    const data: any = await res.json();
    if (!res.ok) return { error: data.error?.message || `Anthropic error: ${res.status}` };

    return {
      content: data.content?.[0]?.text || "",
      usage: {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
      },
      cost: estimateCost("anthropic", model, data.usage?.input_tokens || 0, data.usage?.output_tokens || 0),
      model,
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

async function callGemini(apiKey: string, model: string, messages: any[], temperature: number, maxTokens: number) {
  const contents = messages.filter((m: any) => m.role !== "system").map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const systemInstruction = messages.find((m: any) => m.role === "system");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } } : {}),
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      }
    );

    const data: any = await res.json();
    if (!res.ok) return { error: data.error?.message || `Gemini error: ${res.status}` };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const usage = data.usageMetadata || {};
    return {
      content: text,
      usage: {
        input_tokens: usage.promptTokenCount || 0,
        output_tokens: usage.candidatesTokenCount || 0,
      },
      cost: estimateCost("google", model, usage.promptTokenCount || 0, usage.candidatesTokenCount || 0),
      model,
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    openai: "gpt-4o-mini", anthropic: "claude-sonnet-4-20250514",
    google: "gemini-2.5-flash", groq: "llama-3.3-70b-versatile",
    mistral: "mistral-large-latest", deepseek: "deepseek-chat",
    xai: "grok-3-mini", cohere: "command-r-plus",
  };
  return defaults[provider] || "";
}

// ── Cost estimation (approximate, per 1M tokens) ───────────────────────
function estimateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4o":           { input: 2.50, output: 10.00 },
    "gpt-4o-mini":      { input: 0.15, output: 0.60 },
    "gpt-4-turbo":      { input: 10.00, output: 30.00 },
    "o1":               { input: 15.00, output: 60.00 },
    "claude-sonnet-4-20250514": { input: 3.00, output: 15.00 },
    "claude-3-5-haiku-20241022": { input: 0.80, output: 4.00 },
    "claude-opus-4-20250514":   { input: 15.00, output: 75.00 },
    "gemini-2.5-pro":   { input: 1.25, output: 10.00 },
    "gemini-2.5-flash": { input: 0.15, output: 0.60 },
    "llama-3.3-70b":    { input: 0.59, output: 0.79 },
    "mistral-large":    { input: 2.00, output: 6.00 },
    "deepseek-chat":    { input: 0.14, output: 0.28 },
    "grok-3":           { input: 3.00, output: 15.00 },
    "grok-3-mini":      { input: 0.30, output: 0.50 },
  };

  // Find best match
  const p = Object.entries(pricing).find(([k]) => model.includes(k));
  if (!p) return 0;
  const [, rates] = p;
  return (inputTokens * rates.input / 1_000_000) + (outputTokens * rates.output / 1_000_000);
}

// ── Provider key verification ──────────────────────────────────────────
async function verifyProviderKey(provider: string, apiKey: string, endpoint?: string): Promise<boolean> {
  try {
    switch (provider) {
      case "openai":
        return (await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } })).ok;
      case "anthropic":
        return (await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-3-5-haiku-20241022", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
        })).ok;
      case "google":
        return (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)).ok;
      case "groq":
        return (await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } })).ok;
      case "mistral":
        return (await fetch("https://api.mistral.ai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } })).ok;
      case "deepseek":
        return (await fetch("https://api.deepseek.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } })).ok;
      default:
        return true; // Can't verify custom providers
    }
  } catch {
    return false;
  }
}
