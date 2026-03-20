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

export async function sendWelcomeEmail(params: {
  to: string; name: string; licenseKey: string;
  packageName: string; expiresAt: string; product?: string;
}): Promise<void> {
  const { to, name, licenseKey, packageName, expiresAt, product } = params;
  const icon = product === "orchestra" ? "🎼" : "🛡️";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  const isOrchestra = product === "orchestra";

  const deploySteps = isOrchestra
    ? `<div style="background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.15);border-radius:12px;padding:20px;margin:20px 0">
        <div style="color:#7c3aed;font-size:13px;font-weight:700;margin-bottom:12px">🚀 Quick Deploy (3 steps)</div>
        <div style="color:#94a3b8;font-size:13px;line-height:1.8;font-family:monospace">
          <div>1. Edit <code style="color:#22d3ee">orchestra.yml</code> → paste your AI API keys</div>
          <div>2. Edit <code style="color:#22d3ee">orchestra.yml</code> → set license_key: <code style="color:#22d3ee">${licenseKey.substring(0, 12)}...</code></div>
          <div>3. Run: <code style="color:#22d3ee;background:rgba(34,211,238,0.08);padding:2px 6px;border-radius:4px">docker compose -f orchestra-compose.yml up -d</code></div>
        </div>
        <div style="color:#475569;font-size:12px;margin-top:12px;line-height:1.8">
          <strong style="color:#94a3b8">Docker Registry:</strong><br>
          Core: <code style="color:#22d3ee">${process.env.GHCR_OWNER||"p2nshooter"}/orchestra-core:latest</code><br>
          Worker CPU: <code style="color:#22d3ee">${process.env.GHCR_OWNER||"p2nshooter"}/orchestra-worker-cpu:latest</code><br>
          Worker GPU: <code style="color:#22d3ee">${process.env.GHCR_OWNER||"p2nshooter"}/orchestra-worker-gpu:latest</code><br>
          Console: http://YOUR_SERVER:8080/console · Full docs at ${appUrl}/portal
        </div>
      </div>`
    : `<div style="background:rgba(2,132,199,0.06);border:1px solid rgba(2,132,199,0.15);border-radius:12px;padding:20px;margin:20px 0">
        <div style="color:#0284c7;font-size:13px;font-weight:700;margin-bottom:12px">🚀 Quick Deploy (3 steps)</div>
        <div style="color:#94a3b8;font-size:13px;line-height:1.8;font-family:monospace">
          <div>1. Edit <code style="color:#22d3ee">guardian.yml</code> → set license_key: <code style="color:#22d3ee">${licenseKey.substring(0, 12)}...</code></div>
          <div>2. Edit <code style="color:#22d3ee">guardian.yml</code> → configure your AI engine</div>
          <div>3. Run: <code style="color:#22d3ee;background:rgba(34,211,238,0.08);padding:2px 6px;border-radius:4px">docker compose up -d</code></div>
        </div>
        <div style="color:#475569;font-size:12px;margin-top:12px;line-height:1.8">
          <strong style="color:#94a3b8">Docker Registry:</strong> <code style="color:#22d3ee">${process.env.GHCR_OWNER||"p2nshooter"}/guardian-engine:latest</code><br>
          Dashboard: http://YOUR_SERVER:8080 · Full docs at ${appUrl}/portal
        </div>
      </div>`;

  await sendEmail({
    to,
    subject: `${icon} Your AXTO ${packageName} License is Ready`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="background:#060c14;color:#e2f4ff;font-family:-apple-system,sans-serif;padding:40px 24px;margin:0">
<div style="max-width:520px;margin:0 auto">
  <div style="font-size:24px;font-weight:800;color:#22d3ee;margin-bottom:24px">${icon} AXTO</div>
  <h2 style="color:#fff;margin:0 0 12px">Welcome, ${name}!</h2>
  <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px">Your <strong style="color:#fff">${packageName}</strong> license has been activated.</p>
  <div style="background:rgba(34,211,238,0.06);border:1px solid rgba(34,211,238,0.15);border-radius:12px;padding:20px;margin-bottom:24px">
    <div style="color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">License Key</div>
    <code style="color:#22d3ee;font-size:14px;font-family:'JetBrains Mono',monospace;word-break:break-all">${licenseKey}</code>
  </div>
  ${deploySteps}
  <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 8px"><strong style="color:#cbd5e1">Expires:</strong> ${new Date(expiresAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</p>
  <a href="${appUrl}/portal" style="display:inline-block;background:linear-gradient(135deg,#0e7490,#22d3ee);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-top:16px">Access Your Portal →</a>
  <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0">
  <p style="color:#334155;font-size:11px">Need help? Contact <a href="mailto:hallo@axto.io" style="color:#22d3ee">hallo@axto.io</a></p>
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
