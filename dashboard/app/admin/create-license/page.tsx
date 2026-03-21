"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PACKAGES = [
  { code: "lite",               name: "Guardian Sentinel",    product: "guardian",  price: "$249/yr",   nodes: "1 server" },
  { code: "pro",                name: "Guardian Pro",         product: "guardian",  price: "$990/yr",   nodes: "20 servers" },
  { code: "shield",             name: "Guardian Business",    product: "guardian",  price: "$3,990/yr", nodes: "100 servers" },
  { code: "aegis",              name: "Guardian Enterprise",  product: "guardian",  price: "$17,900/yr",nodes: "1,000 servers" },
  { code: "orchestra_core",     name: "Orchestra Core",       product: "orchestra", price: "$9,900/yr", nodes: "10 workers" },
  { code: "orchestra_scale",    name: "Orchestra Scale",      product: "orchestra", price: "$24,900/yr",nodes: "50 workers" },
  { code: "orchestra_unlimited",name: "Orchestra Enterprise", product: "orchestra", price: "$59,900/yr",nodes: "Unlimited" },
];

const LICENSE_TYPES = [
  { value: "trial",        label: "🕐 Trial",                 desc: "1–7 days, any product",        engineOnly: false },
  { value: "monthly",      label: "📅 Monthly",              desc: "Renews every 30 days",         engineOnly: false },
  { value: "yearly",       label: "📆 Yearly",               desc: "12-month license",             engineOnly: false },
  { value: "lifetime",     label: "♾️ Lifetime",             desc: "One-time, never expires",      engineOnly: false },
  { value: "per_instance", label: "🖥 Per Instance",         desc: "Locked to one machine",        engineOnly: false },
];

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1px solid #e2e8f0", background: "#f8fafc",
  color: "#0a1628", fontSize: 14, outline: "none", fontFamily: "inherit",
  boxSizing: "border-box" as const,
} as const;

const labelStyle = {
  color: "#64748b", fontSize: 11, fontWeight: 700,
  display: "block" as const, marginBottom: 6,
  textTransform: "uppercase" as const, letterSpacing: "0.5px",
};

export default function CreateLicensePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    organization: "",
    packageCode: "pro",
    licenseType: "yearly",
    trialDays: "3",
    expiresMonths: "12",
    maxCpu: "",
    maxGpu: "",
    notes: "",
    sendEmailFlag: true,
  });
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  const isTrialType   = form.licenseType === "trial";
  const isLifetime    = form.licenseType === "lifetime" || form.licenseType === "per_instance";
  const selectedPkg   = PACKAGES.find(p => p.code === form.packageCode);
  const isOrchestra   = selectedPkg?.product === "orchestra";

  // All license types available for all products
  const availableTypes = LICENSE_TYPES;

  // expiresMonths derived from licenseType
  function getExpiresMonths(): number {
    if (isTrialType) return 0; // handled via trial_days in backend
    if (isLifetime)  return 12 * 100; // 100 years = lifetime
    if (form.licenseType === "monthly") return 1;
    return Number(form.expiresMonths) || 12;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInlineError(null);
    if (!form.clientEmail || !form.packageCode) {
      setInlineError("Client email and package are required"); return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          clientName: form.clientName,
          clientEmail: form.clientEmail,
          organization: form.organization,
          packageCode: form.packageCode,
          expiresMonths: getExpiresMonths(),
          licenseType: form.licenseType,
          trialDays: isTrialType ? Number(form.trialDays) : 0,
          maxCpu: form.maxCpu ? Number(form.maxCpu) : undefined,
          maxGpu: form.maxGpu ? Number(form.maxGpu) : undefined,
          notes: form.notes,
          sendEmailFlag: form.sendEmailFlag,
        }),
      });
      const d = await res.json();
      if (d.success) setResult(d.licenseKey);
      else setInlineError(d.error || "Failed to create license");
    } catch {
      setInlineError("Network error — please retry");
    } finally { setLoading(false); }
  }

  if (result) return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: "#0a1628", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>License Created</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
          {form.licenseType === "trial"
            ? `Trial license (${form.trialDays} days) has been generated${form.sendEmailFlag ? " and emailed to the client" : ""}.`
            : `License has been generated${form.sendEmailFlag ? " and emailed to the client" : ""}.`}
        </p>
        <div style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>License Key</div>
          <code style={{ color: "#22d3ee", fontSize: 16, fontFamily: "monospace", wordBreak: "break-all", fontWeight: 700 }}>{result}</code>
        </div>
        <div style={{ background: "rgba(2,132,199,0.05)", border: "1px solid rgba(2,132,199,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 28, fontSize: 12, color: "#64748b", textAlign: "left" }}>
          <strong style={{ color: "#0284c7" }}>Type:</strong> {form.licenseType}
          {isTrialType && ` · ${form.trialDays} days`} ·
          <strong style={{ color: "#0284c7" }}> Package:</strong> {selectedPkg?.name} ·
          <strong style={{ color: "#0284c7" }}> Client:</strong> {form.clientEmail}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => {
            setResult(null);
            setForm({ clientName: "", clientEmail: "", organization: "", packageCode: "pro", licenseType: "yearly", trialDays: "3", expiresMonths: "12", maxCpu: "", maxGpu: "", notes: "", sendEmailFlag: true });
          }} style={{ padding: "11px 24px", borderRadius: 10, border: "1px solid #e2e8f0", background: "transparent", color: "#94a3b8", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            + Create Another
          </button>
          <Link href="/admin" style={{ padding: "11px 24px", borderRadius: 10, background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f9ff", padding: "32px 24px" }}>
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#64748b", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>← Back to Dashboard</Link>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0a1628", marginTop: 16, marginBottom: 4, fontFamily: "Sora, sans-serif" }}>Create Manual License</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 28 }}>Issue any license type directly — no payment required for admin.</p>

        {inlineError && (
          <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
            ⚠ {inlineError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Client info */}
          <div>
            <label style={labelStyle}>Client Name</label>
            <input value={form.clientName} onChange={e => set("clientName", e.target.value)} placeholder="Jane Smith" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Client Email *</label>
            <input value={form.clientEmail} onChange={e => set("clientEmail", e.target.value)} placeholder="client@company.com" type="email" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Organization</label>
            <input value={form.organization} onChange={e => set("organization", e.target.value)} placeholder="Acme Corp" style={inputStyle} />
          </div>

          {/* Package */}
          <div>
            <label style={labelStyle}>Package *</label>
            <select value={form.packageCode} onChange={e => set("packageCode", e.target.value)}
              style={{ ...inputStyle, appearance: "auto" as any, cursor: "pointer" }}>
              <optgroup label="🛡 Guardian AI">
                {PACKAGES.filter(p => p.product === "guardian").map(p => (
                  <option key={p.code} value={p.code}>{p.name} — {p.nodes} — {p.price}</option>
                ))}
              </optgroup>
              <optgroup label="⚡ Orchestra AI">
                {PACKAGES.filter(p => p.product === "orchestra").map(p => (
                  <option key={p.code} value={p.code}>{p.name} — {p.nodes} — {p.price}</option>
                ))}
              </optgroup>
            </select>
            {selectedPkg && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(2,132,199,0.06)", borderRadius: 8, border: "1px solid rgba(2,132,199,0.15)", fontSize: 12, color: "#0284c7" }}>
                {selectedPkg.product === "guardian" ? "🛡" : "⚡"} {selectedPkg.name} — {selectedPkg.nodes} — {selectedPkg.price}
              </div>
            )}
          </div>

          {/* License Type */}
          <div>
            <label style={labelStyle}>License Type *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {availableTypes.map(lt => (
                <button key={lt.value} type="button" onClick={() => set("licenseType", lt.value)}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid",
                    borderColor: form.licenseType === lt.value ? "#7c3aed" : "#e2e8f0",
                    background: form.licenseType === lt.value ? "rgba(124,58,237,0.06)" : "#f8fafc",
                    cursor: "pointer", textAlign: "left" as const }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: form.licenseType === lt.value ? "#7c3aed" : "#0a1628" }}>{lt.label}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{lt.desc}</div>
                </button>
              ))}
            </div>

          </div>

          {/* Trial days */}
          {isTrialType && (
            <div>
              <label style={labelStyle}>Trial Duration (1–7 days)</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                {[1,2,3,4,5,6,7].map(d => (
                  <button key={d} type="button" onClick={() => set("trialDays", String(d))}
                    style={{ width: 40, height: 40, borderRadius: 8, border: "1.5px solid",
                      borderColor: form.trialDays === String(d) ? "#0284c7" : "#e2e8f0",
                      background: form.trialDays === String(d) ? "rgba(2,132,199,0.09)" : "#f8fafc",
                      color: form.trialDays === String(d) ? "#0284c7" : "#475569",
                      fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                    {d}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>License expires in {form.trialDays} day(s)</div>
            </div>
          )}

          {/* Duration for non-trial, non-lifetime */}
          {!isTrialType && !isLifetime && form.licenseType !== "monthly" && (
            <div>
              <label style={labelStyle}>Duration (months)</label>
              <select value={form.expiresMonths} onChange={e => set("expiresMonths", e.target.value)}
                style={{ ...inputStyle, appearance: "auto" as any, cursor: "pointer" }}>
                {[1,3,6,12,24,36].map(m => (
                  <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}{m === 12 ? " (1 year)" : m === 24 ? " (2 years)" : m === 36 ? " (3 years)" : ""}</option>
                ))}
              </select>
            </div>
          )}

          {/* Resource overrides */}
          <div>
            <label style={labelStyle}>Custom Resource Limits (optional — leave blank to use package defaults)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ ...labelStyle, color: "#94a3b8" }}>🖥 Max CPU Nodes</label>
                <input type="number" min="1" value={form.maxCpu}
                  onChange={e => set("maxCpu", e.target.value)}
                  placeholder="Package default" style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, color: "#94a3b8" }}>🎮 Max GPU Nodes</label>
                <input type="number" min="0" value={form.maxGpu}
                  onChange={e => set("maxGpu", e.target.value)}
                  placeholder="0" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Internal Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={3} placeholder="Payment reference, special conditions, discount applied, etc."
              style={{ ...inputStyle, resize: "vertical" } as any} />
          </div>

          {/* Send email */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={form.sendEmailFlag} onChange={e => set("sendEmailFlag", e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }} />
            Send welcome email with license key, setup guide and registry info to client
          </label>

          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "13px 20px", borderRadius: 12, border: "none",
              background: loading ? "#0369a1" : "linear-gradient(135deg,#0284c7,#0d9488)",
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? "Creating..." : "Create License →"}
          </button>
        </form>

        {/* Quick link to engine builder */}
        <div style={{ marginTop: 16, padding: "14px 18px", background: "rgba(124,58,237,0.05)", border: "1.5px solid rgba(124,58,237,0.15)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed" }}>🔧 Need a Docker build or EXE installer?</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Use the Engine Builder to generate files with an embedded license</div>
          </div>
          <Link href="/admin/engine-builder"
            style={{ padding: "8px 16px", borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" as const }}>
            Engine Builder →
          </Link>
        </div>
      </div>
    </div>
  );
}
