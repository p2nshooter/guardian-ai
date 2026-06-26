/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
const RESEND_URL = "https://api.resend.com/emails";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not configured");

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "AXTO <noreply@axto.io>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${res.status} — ${err}`);
  }
}

// ── Per-product branding config ───────────────────────────────────────────
interface ProductBranding {
  icon: string;
  color: string;
  colorRgb: string;
  port: string;
  consolePath: string;
  tagline: string;
  composeFlag: string;
}

const PRODUCT_BRANDING: Record<string, ProductBranding> = {
  guardian:   { icon: "🛡️",  color: "#0284c7", colorRgb: "2,132,199",   port: "8080", consolePath: "",         tagline: "Your self-hosted cybersecurity engine is ready.",           composeFlag: "" },
  orchestra:  { icon: "🎼",  color: "#7c3aed", colorRgb: "124,58,237",  port: "7890", consolePath: "/console", tagline: "Your self-hosted AI orchestration platform is ready.",      composeFlag: "-f orchestra-compose.yml" },
  vault:      { icon: "🔐",  color: "#0d9488", colorRgb: "13,148,136",  port: "8200", consolePath: "/ui",      tagline: "Your AI privacy & PII redaction layer is ready.",           composeFlag: "-f vault-compose.yml" },
  edge:       { icon: "⚡",  color: "#d97706", colorRgb: "217,119,6",   port: "9000", consolePath: "/dashboard",tagline: "Your AI API gateway & traffic layer is ready.",            composeFlag: "-f edge-compose.yml" },
  soc:        { icon: "🔍",  color: "#dc2626", colorRgb: "220,38,38",   port: "5601", consolePath: "/soc",     tagline: "Your AI-powered Security Operations Center is ready.",     composeFlag: "-f soc-compose.yml" },
  compliance: { icon: "📋",  color: "#16a34a", colorRgb: "22,163,74",   port: "8400", consolePath: "/compliance",tagline: "Your automated compliance & audit platform is ready.",   composeFlag: "-f compliance-compose.yml" },
  sentinel:   { icon: "📡",  color: "#9333ea", colorRgb: "147,51,234",  port: "8500", consolePath: "/sentinel",tagline: "Your IoT/OT security monitoring platform is ready.",       composeFlag: "-f sentinel-compose.yml" },
  antivirus:  { icon: "🦠",  color: "#059669", colorRgb: "5,150,105",   port: "8600", consolePath: "/av",      tagline: "Your ClamAV + ML antivirus engine is ready.",              composeFlag: "-f antivirus-compose.yml" },
};

const DEFAULT_BRANDING: ProductBranding = {
  icon: "🔑", color: "#0284c7", colorRgb: "2,132,199", port: "8080",
  consolePath: "", tagline: "Your AXTO license is ready.", composeFlag: "",
};

export async function sendWelcomeEmail(params: {
  to: string; name: string; licenseKey: string;
  packageName: string; expiresAt: string; product?: string;
}): Promise<void> {
  const { to, name, licenseKey, packageName, expiresAt, product } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  const b = PRODUCT_BRANDING[product || ""] || DEFAULT_BRANDING;
  const expiryLabel = new Date(expiresAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  const serverUrl = `http://YOUR_SERVER:${b.port}`;

  const deployBlock = `
<div style="background:rgba(${b.colorRgb},0.06);border:1px solid rgba(${b.colorRgb},0.2);border-radius:12px;padding:20px;margin:20px 0">
  <div style="color:${b.color};font-size:13px;font-weight:700;margin-bottom:14px">🚀 Quick Deploy — 4 Steps</div>
  <div style="color:#94a3b8;font-size:13px;line-height:2;font-family:monospace">
    <div><span style="color:#64748b">1.</span> Download ZIP from portal → extract to your server</div>
    <div><span style="color:#64748b">2.</span> Run: <code style="color:#22d3ee;background:rgba(34,211,238,0.08);padding:2px 8px;border-radius:4px">sudo bash install.sh</code></div>
    <div><span style="color:#64748b">3.</span> Run: <code style="color:#22d3ee;background:rgba(34,211,238,0.08);padding:2px 8px;border-radius:4px">docker compose ${b.composeFlag} up -d</code></div>
    <div><span style="color:#64748b">4.</span> Open <code style="color:#22d3ee">${serverUrl}${b.consolePath}</code> → enter license key</div>
  </div>
  <div style="border-top:1px solid rgba(${b.colorRgb},0.15);margin-top:14px;padding-top:14px;color:#475569;font-size:12px;line-height:1.9">
    <strong style="color:#94a3b8">License Key:</strong> <code style="color:#22d3ee">${licenseKey}</code><br>
    <strong style="color:#94a3b8">Activation:</strong> Wizard appears automatically on first run<br>
    <strong style="color:#94a3b8">Portal:</strong> <a href="${appUrl}/portal" style="color:#22d3ee">${appUrl}/portal</a>
  </div>
</div>`;

  await sendEmail({
    to,
    subject: `${b.icon} Your AXTO ${packageName} License is Ready`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="background:#060c14;color:#e2f4ff;font-family:-apple-system,sans-serif;padding:40px 24px;margin:0">
<div style="max-width:520px;margin:0 auto">
  <div style="font-size:24px;font-weight:800;color:#22d3ee;margin-bottom:24px">${b.icon} AXTO</div>
  <h2 style="color:#fff;margin:0 0 8px">Welcome, ${name}!</h2>
  <p style="color:#94a3b8;line-height:1.6;margin:0 0 6px">${b.tagline}</p>
  <p style="color:#64748b;font-size:13px;margin:0 0 24px">Package: <strong style="color:#cbd5e1">${packageName}</strong></p>
  <div style="background:rgba(34,211,238,0.06);border:1px solid rgba(34,211,238,0.15);border-radius:12px;padding:20px;margin-bottom:8px">
    <div style="color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">License Key</div>
    <code style="color:#22d3ee;font-size:14px;font-family:'JetBrains Mono',monospace;word-break:break-all">${licenseKey}</code>
  </div>
  <p style="color:#475569;font-size:12px;margin:0 0 4px">⚠️ Keep this key private — it is tied to your server.</p>
  ${deployBlock}
  <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 8px">
    <strong style="color:#cbd5e1">Expires:</strong> ${expiryLabel}
  </p>
  <a href="${appUrl}/portal" style="display:inline-block;background:linear-gradient(135deg,#0e7490,#22d3ee);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-top:16px">Access Your Portal →</a>
  <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0">
  <p style="color:#334155;font-size:11px">Need help? <a href="mailto:hallo@axto.io" style="color:#22d3ee">hallo@axto.io</a> · <a href="${appUrl}/portal" style="color:#22d3ee">axto.io/portal</a></p>
</div>
</body></html>`,
  });
}

export async function sendBundleEmail(params: {
  to: string; name: string;
  guardianKey: string; guardianPackage: string; guardianExpiry: string;
  orchestraKey: string; orchestraPackage: string; orchestraExpiry: string;
}): Promise<void> {
  const { to, name, guardianKey, guardianPackage, guardianExpiry, orchestraKey, orchestraPackage, orchestraExpiry } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

  await sendEmail({
    to,
    subject: `📦 Your AXTO Bundle Licenses are Ready`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="background:#060c14;color:#e2f4ff;font-family:-apple-system,sans-serif;padding:40px 24px;margin:0">
<div style="max-width:520px;margin:0 auto">
  <div style="font-size:24px;font-weight:800;color:#22d3ee;margin-bottom:24px">📦 AXTO</div>
  <h2 style="color:#fff;margin:0 0 12px">Welcome, ${name}!</h2>
  <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px">Your bundle licenses are activated.</p>
  <div style="background:rgba(34,211,238,0.06);border:1px solid rgba(34,211,238,0.15);border-radius:12px;padding:20px;margin-bottom:16px">
    <div style="color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🛡️ ${guardianPackage}</div>
    <code style="color:#22d3ee;font-size:13px;font-family:monospace;word-break:break-all">${guardianKey}</code>
    <div style="color:#64748b;font-size:12px;margin-top:6px">Expires: ${new Date(guardianExpiry).toLocaleDateString()}</div>
  </div>
  <div style="background:rgba(34,211,238,0.06);border:1px solid rgba(34,211,238,0.15);border-radius:12px;padding:20px;margin-bottom:24px">
    <div style="color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🎼 ${orchestraPackage}</div>
    <code style="color:#22d3ee;font-size:13px;font-family:monospace;word-break:break-all">${orchestraKey}</code>
    <div style="color:#64748b;font-size:12px;margin-top:6px">Expires: ${new Date(orchestraExpiry).toLocaleDateString()}</div>
  </div>
  <a href="${appUrl}/portal" style="display:inline-block;background:linear-gradient(135deg,#0e7490,#22d3ee);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700">Access Your Portal →</a>
</div>
</body></html>`,
  });
}

export async function sendRenewalReminderEmail(params: {
  to: string; name: string; licenseKey: string; packageName: string; expiresAt: string; daysLeft: number;
}): Promise<void> {
  const { to, name, packageName, daysLeft } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  const urgency = daysLeft <= 1 ? "🔴" : daysLeft <= 7 ? "🟡" : "🟢";

  await sendEmail({
    to,
    subject: `${urgency} Your AXTO ${packageName} license expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="background:#060c14;color:#e2f4ff;font-family:-apple-system,sans-serif;padding:40px 24px;margin:0">
<div style="max-width:520px;margin:0 auto">
  <h2 style="color:#fff">License Renewal Reminder</h2>
  <p style="color:#94a3b8;line-height:1.6">Hi ${name}, your <strong style="color:#fff">${packageName}</strong> license expires in <strong style="color:#fbbf24">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.</p>
  <a href="${appUrl}/portal" style="display:inline-block;background:linear-gradient(135deg,#0e7490,#22d3ee);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:16px">Renew Now →</a>
</div>
</body></html>`,
  });
}
