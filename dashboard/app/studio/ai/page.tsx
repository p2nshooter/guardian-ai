/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AI_PROVIDERS, STUDIO_TYPES } from "@/lib/studio";

const S = STUDIO_TYPES.ai;

type Message = { role: "user" | "assistant" | "system"; content: string };
type Credential = { id: string; provider: string; label: string; is_active: number; is_verified: number; total_requests: number; total_cost_usd: number };
type Session = { id: string; title: string; provider: string; model: string; total_tokens: number; total_cost_usd: number; updated_at: string };

export default function AIStudioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [usage, setUsage] = useState<any>({ today: {}, month: {} });

  // Chat state
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedCred, setSelectedCred] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Add credential modal
  const [showAddCred, setShowAddCred] = useState(false);
  const [newCred, setNewCred] = useState({ provider: "openai", api_key: "", label: "", endpoint: "" });
  const [addingCred, setAddingCred] = useState(false);

  // Tab
  const [tab, setTab] = useState<"chat" | "credentials" | "history" | "analytics">("chat");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/studio", { credentials: "include" });
      if (res.status === 401) { router.push("/auth/login"); return; }
      if (res.ok) {
        const d = await res.json();
        setTenant(d.tenant);
        setCredentials(d.credentials?.filter((c: any) => c.category === "ai") || []);
        setSessions(d.sessions?.filter((s: any) => s.studio_type === "ai") || []);
        setUsage(d.usage);
        if (d.credentials?.length && !selectedCred) {
          const first = d.credentials.find((c: any) => c.category === "ai" && c.is_active);
          if (first) setSelectedCred(first.id);
        }
      }
    } catch {} finally { setLoading(false); }
  }, [router, selectedCred]);

  useEffect(() => { load(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function addCredential() {
    setAddingCred(true);
    try {
      const res = await fetch("/api/studio", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_credential", ...newCred, category: "ai" }),
      });
      const d = await res.json();
      if (res.ok) {
        setShowAddCred(false);
        setNewCred({ provider: "openai", api_key: "", label: "", endpoint: "" });
        await load();
      } else {
        alert(d.error || "Failed to add");
      }
    } catch {} finally { setAddingCred(false); }
  }

  async function removeCred(id: string) {
    if (!confirm("Remove this credential?")) return;
    await fetch("/api/studio", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_credential", credential_id: id }),
    });
    await load();
  }

  async function sendMessage() {
    if (!input.trim() || !selectedCred || sending) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const allMessages = [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      ...messages,
      userMsg,
    ];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/studio", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat", credential_id: selectedCred, model: selectedModel,
          session_id: activeSession, messages: allMessages,
          settings: { temperature, max_tokens: 4096 },
        }),
      });
      const d = await res.json();
      if (d.content) {
        setMessages(prev => [...prev, { role: "assistant", content: d.content }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${d.error || "Unknown error"}` }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Network error" }]);
    } finally { setSending(false); }
  }

  const currentProvider = credentials.find(c => c.id === selectedCred);
  const providerInfo = AI_PROVIDERS.find(p => p.id === currentProvider?.provider);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Loading AI Studio...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", color: "#e2e8f0", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ── Top Bar ── */}
      <nav style={{ background: "rgba(10,10,26,0.95)", borderBottom: "1px solid rgba(139,92,246,0.15)", padding: "0 20px", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/portal" style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>← Portal</Link>
            <div style={{ width: 1, height: 24, background: "rgba(139,92,246,0.2)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>🧠</span>
              <span style={{ fontSize: 16, fontWeight: 800, background: S.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI Studio</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/studio/gpu" style={{ color: "#64748b", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>⚡ GPU Studio</Link>
            <Link href="/studio/hybrid" style={{ color: "#64748b", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>🔀 Hybrid</Link>
            <div style={{ fontSize: 11, color: "#475569" }}>
              {usage?.today?.requests || 0} req today · ${(usage?.month?.cost || 0).toFixed(4)}
            </div>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", gap: 0, minHeight: "calc(100vh - 56px)" }}>
        {/* ── Sidebar ── */}
        <div style={{ width: 260, borderRight: "1px solid rgba(139,92,246,0.1)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, background: "rgba(10,10,26,0.6)", flexShrink: 0 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, marginBottom: 12, background: "rgba(139,92,246,0.06)", borderRadius: 10, padding: 3 }}>
            {([["chat","💬"],["credentials","🔑"],["history","📋"],["analytics","📊"]] as const).map(([t, icon]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                background: tab === t ? "rgba(139,92,246,0.2)" : "transparent",
                color: tab === t ? "#a78bfa" : "#64748b",
              }}>{icon}</button>
            ))}
          </div>

          {tab === "credentials" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={() => setShowAddCred(true)} style={{
                padding: "10px 14px", borderRadius: 10, border: "1.5px dashed rgba(139,92,246,0.3)",
                background: "transparent", color: "#a78bfa", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              }}>+ Add AI Provider</button>
              {credentials.map(c => (
                <div key={c.id} style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: selectedCred === c.id ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selectedCred === c.id ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}`,
                  cursor: "pointer",
                }} onClick={() => setSelectedCred(c.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{AI_PROVIDERS.find(p => p.id === c.provider)?.icon || "🔧"}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{c.label || c.provider}</span>
                    </div>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: c.is_verified ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)", color: c.is_verified ? "#22c55e" : "#f59e0b", fontWeight: 700 }}>
                      {c.is_verified ? "✓" : "?"}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>
                    {c.total_requests} requests · ${c.total_cost_usd.toFixed(4)}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeCred(c.id); }} style={{
                    marginTop: 4, padding: "2px 8px", borderRadius: 4, border: "none",
                    background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                  }}>Remove</button>
                </div>
              ))}
            </div>
          )}

          {tab === "chat" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Provider selector */}
              <div>
                <label style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Provider</label>
                <select value={selectedCred} onChange={e => setSelectedCred(e.target.value)} style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.2)",
                  background: "rgba(139,92,246,0.06)", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit", marginTop: 4,
                }}>
                  <option value="">Select provider...</option>
                  {credentials.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{AI_PROVIDERS.find(p => p.id === c.provider)?.icon} {c.label || c.provider}</option>
                  ))}
                </select>
              </div>

              {/* Model selector */}
              <div>
                <label style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Model</label>
                <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.2)",
                  background: "rgba(139,92,246,0.06)", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit", marginTop: 4,
                }}>
                  <option value="">Auto (default)</option>
                  {providerInfo?.models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Temperature */}
              <div>
                <label style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Temperature: {temperature.toFixed(1)}
                </label>
                <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))}
                  style={{ width: "100%", marginTop: 4, accentColor: "#8b5cf6" }} />
              </div>

              {/* System prompt */}
              <div>
                <label style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>System Prompt</label>
                <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant..."
                  rows={3} style={{
                    width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.2)",
                    background: "rgba(139,92,246,0.06)", color: "#e2e8f0", fontSize: 11, fontFamily: "inherit",
                    marginTop: 4, resize: "vertical",
                  }} />
              </div>

              <button onClick={() => { setMessages([]); setActiveSession(null); }} style={{
                padding: "8px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.2)",
                background: "transparent", color: "#a78bfa", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>🗑️ Clear Chat</button>
            </div>
          )}

          {tab === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ padding: "14px", borderRadius: 10, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Today</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#a78bfa", marginTop: 4 }}>{usage?.today?.requests || 0}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>requests · ${(usage?.today?.cost || 0).toFixed(4)}</div>
              </div>
              <div style={{ padding: "14px", borderRadius: 10, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)" }}>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>This Month</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0ea5e9", marginTop: 4 }}>{usage?.month?.requests || 0}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>requests · ${(usage?.month?.cost || 0).toFixed(4)}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{((usage?.month?.tokens || 0) / 1000).toFixed(1)}K tokens</div>
              </div>
            </div>
          )}

          {tab === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "#475569", fontSize: 12 }}>No sessions yet</div>
              ) : sessions.map(s => (
                <div key={s.id} style={{
                  padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{s.title}</div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{s.model} · {s.total_tokens} tok · ${s.total_cost_usd.toFixed(4)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Main Chat Area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>🧠</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, background: S.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>
                  AI Studio
                </h2>
                <p style={{ color: "#64748b", fontSize: 14, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
                  Your keys. Your models. Your studio.<br />
                  Add a provider credential in the sidebar, then start chatting.
                </p>
                {credentials.length === 0 && (
                  <button onClick={() => { setTab("credentials"); setShowAddCred(true); }} style={{
                    marginTop: 20, padding: "12px 28px", borderRadius: 12,
                    background: S.gradient, color: "#fff", border: "none",
                    fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>🔑 Add Your First AI Provider</button>
                )}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 12,
              }}>
                <div style={{
                  maxWidth: "75%", padding: "12px 16px", borderRadius: 14,
                  background: m.role === "user"
                    ? "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))"
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${m.role === "user" ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.08)"}`,
                  borderBottomRightRadius: m.role === "user" ? 4 : 14,
                  borderBottomLeftRadius: m.role === "assistant" ? 4 : 14,
                }}>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: "#e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div style={{ display: "flex", gap: 4, padding: "12px 16px" }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6",
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(139,92,246,0.1)", background: "rgba(10,10,26,0.8)" }}>
            <div style={{ display: "flex", gap: 8, maxWidth: 900, margin: "0 auto" }}>
              <input
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={selectedCred ? "Type your message..." : "Add a provider credential first →"}
                disabled={!selectedCred || sending}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 12,
                  border: "1.5px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.06)",
                  color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none",
                }}
              />
              <button onClick={sendMessage} disabled={!selectedCred || sending || !input.trim()} style={{
                padding: "12px 24px", borderRadius: 12, border: "none",
                background: selectedCred && input.trim() ? S.gradient : "rgba(139,92,246,0.1)",
                color: selectedCred && input.trim() ? "#fff" : "#475569",
                fontSize: 14, fontWeight: 700, cursor: selectedCred ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}>
                {sending ? "..." : "Send →"}
              </button>
            </div>
            <div style={{ textAlign: "center", fontSize: 10, color: "#334155", marginTop: 8 }}>
              All data processed through YOUR API keys — AXTO never sees your prompts or responses. Artifacts auto-delete after 14 days.
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Credential Modal ── */}
      {showAddCred && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
        }} onClick={() => setShowAddCred(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#0f0f23", borderRadius: 20, padding: 32, width: "100%", maxWidth: 480,
            border: "1px solid rgba(139,92,246,0.2)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0", marginBottom: 20 }}>🔑 Add AI Provider</h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Provider</label>
              <select value={newCred.provider} onChange={e => setNewCred(c => ({ ...c, provider: e.target.value }))} style={{
                width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)",
                background: "rgba(139,92,246,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", marginTop: 4,
              }}>
                {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>API Key</label>
              <input type="password" value={newCred.api_key} onChange={e => setNewCred(c => ({ ...c, api_key: e.target.value }))}
                placeholder="sk-..." style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)",
                  background: "rgba(139,92,246,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", marginTop: 4,
                }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Label (optional)</label>
              <input value={newCred.label} onChange={e => setNewCred(c => ({ ...c, label: e.target.value }))}
                placeholder="My OpenAI Key" style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)",
                  background: "rgba(139,92,246,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", marginTop: 4,
                }} />
            </div>

            {(newCred.provider === "ollama" || newCred.provider === "custom_ai") && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Endpoint URL</label>
                <input value={newCred.endpoint} onChange={e => setNewCred(c => ({ ...c, endpoint: e.target.value }))}
                  placeholder="http://localhost:11434/v1" style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)",
                    background: "rgba(139,92,246,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", marginTop: 4,
                  }} />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAddCred(false)} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)",
                background: "transparent", color: "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
              <button onClick={addCredential} disabled={addingCred || !newCred.api_key} style={{
                flex: 2, padding: "12px", borderRadius: 10, border: "none",
                background: newCred.api_key ? S.gradient : "rgba(139,92,246,0.1)",
                color: newCred.api_key ? "#fff" : "#475569",
                fontSize: 13, fontWeight: 700, cursor: newCred.api_key ? "pointer" : "not-allowed", fontFamily: "inherit",
              }}>{addingCred ? "Verifying..." : "Add & Verify →"}</button>
            </div>

            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.1)" }}>
              <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, marginBottom: 4 }}>🔒 Security</div>
              <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.6 }}>
                Your API key is encrypted with AES-256-GCM and stored in your isolated tenant namespace.
                No other user can access your credentials. AXTO never uses your key for any purpose other than
                routing YOUR requests to YOUR provider.
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
