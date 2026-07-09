/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime  = "edge";
export const dynamic  = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { renderGuide, GUIDE_PRODUCTS, type Lang } from "@/lib/product-guides";

const GUIDES: Record<string, Record<string, string>> = {
  en: {
    guardian: `# AXTO Guardian AI — Complete Setup Guide\n\n## Prerequisites\n- Ubuntu 20.04+ / Debian 10+ / CentOS 8+\n- Docker 24+ and Docker Compose v2+\n- 2+ CPU cores, 4+ GB RAM, 40+ GB disk\n- Outbound HTTPS to axto.io (license heartbeat only)\n\n## 1. Purchase License\nVisit https://axto.io → select Guardian plan → checkout via Stripe, PayPal, Xendit, or Midtrans.\nYour license key (GUARD-XXXX-XXXX-XXXX-XXXX) arrives by email within 60 seconds.\n\n## 2. Download Package\nLogin to https://axto.io/portal → Licenses tab → click ⬇ Download.\nChoose: Docker Linux (recommended) · EXE Linux · EXE Windows.\n\n## 3. Install\n\`\`\`bash\nunzip axto-guardian-bundle-docker-linux.zip\ncd guardian-bundle-docker-linux\nsudo bash install.sh   # loads Docker images offline\n\`\`\`\n\n## 4. Configure guardian.yml\n\`\`\`yaml\nguardian:\n  license_key: \"GUARD-YOUR-KEY-HERE\"\n  db_path: \"/guardian/data/guardian.db\"\n  port: 8080\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-...\"  # Your key — never sent to AXTO\n      model: \"gpt-4o-mini\"\n\`\`\`\n\n## 5. Start\n\`\`\`bash\ndocker compose up -d\n# Open http://YOUR_SERVER:8080\n# Activation wizard appears automatically\n\`\`\`\n\n## 6. Key Dashboard Menus\n- **Threats**: Real-time detections with severity and MITRE ATT&CK mapping\n- **Incidents**: NIST SP 800-61 lifecycle management\n- **Nodes**: Add scanner nodes for multi-server monitoring\n- **Compliance**: Generate SOC 2 / ISO 27001 / HIPAA / PCI-DSS reports\n- **SIEM**: Configure forwarding to Splunk, Elastic, or syslog\n- **Settings → License**: View expiry date and activation status\n\n## 7. License Enforcement\n- Validated every 30 minutes against axto.io\n- 4-hour offline grace window on network failure\n- After grace expiry: ALL requests blocked — restore connectivity and restart\n- Renew at https://axto.io/portal\n\n## 8. Troubleshooting\n\`\`\`bash\n# View logs\ndocker compose logs -f guardian\n# License issues: check key prefix is GUARD-\n# 503 errors: grace expired, renew at axto.io/portal\n# High CPU: adjust scan_interval in guardian.yml\n\`\`\`\n\n## Support\nhello@axto.io · response within 1 business day`,

    vault: `# AXTO Vault — AI Privacy Layer Setup Guide\n\n## Overview\nVault is a transparent proxy between your applications and AI providers.\nAutomatically redacts 120+ PII/PHI/financial entity types before AI calls.\nZero application code changes required.\n\n## Prerequisites\n- Docker 24+ and Docker Compose v2+\n- 1+ CPU core, 2+ GB RAM\n- Vault license key (prefix: VAULT-)\n\n## 1. Download\nLogin to https://axto.io/portal → Licenses → Download vault-core\n\n## 2. Configure vault.yml\n\`\`\`yaml\nvault:\n  license_key: \"VAULT-YOUR-KEY-HERE\"\n  port: 8081\n  api_key: \"your-strong-api-key\"\n  log_level: \"INFO\"\n  audit_retention_days: 90\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-...\"\n      model: \"gpt-4o\"\n\`\`\`\n\n## 3. Start\n\`\`\`bash\ndocker compose -f vault-compose.yml up -d\n# Dashboard: http://YOUR_SERVER:8081\n\`\`\`\n\n## 4. Point Your Application at Vault\n\`\`\`python\n# Before (direct to OpenAI)\nclient = OpenAI(base_url=\"https://api.openai.com/v1\")\n\n# After (through Vault — auto-redaction on every call)\nclient = OpenAI(\n    base_url=\"http://vault-server:8081/v1/proxy\",\n    api_key=\"your-strong-api-key\"\n)\n\`\`\`\n\n## 5. Dashboard Menus\n- **Redaction Log**: Every redaction event with entity types and risk score\n- **Policies**: Configure per-project redaction rules\n- **Audit Export**: Download CSV/JSON evidence for compliance\n- **Statistics**: Throughput, entity type distribution, daily request count\n- **Settings → License**: Expiry date, daily request limit, remaining quota\n\n## 6. What Gets Redacted\n- PII: emails, phones, SSN, addresses, passport, IP, API keys, JWT tokens\n- PHI: MRN, BPJS, ICD-10 codes, medications, FHIR patient fields\n- Financial: credit cards (Luhn-validated), IBAN, SWIFT, crypto wallets\n- Custom: your regex patterns via vault.yml policies\n\n## Support\nhello@axto.io`,

    soc: `# AXTO SOC — Security Operations Center Setup Guide\n\n## Overview\nSelf-hosted SIEM + SOAR + Threat Intelligence.\nReplaces managed SOC contracts at $500K–2M/year.\n\n## Prerequisites\n- 4+ CPU cores, 8+ GB RAM, 500+ GB SSD\n- SOC license key (prefix: SOC-)\n- Network access to receive syslog (port 514/UDP-TCP)\n\n## 1. Configure soc.yml\n\`\`\`yaml\nsoc:\n  license_key: \"SOC-YOUR-KEY-HERE\"\n  port: 8083\n  api_key: \"your-strong-api-key\"\n  log_retention_days: 90\n  ueba_enabled: true\n  soar_enabled: true\n  ti_enrichment_enabled: true\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-...\"\n      model: \"gpt-4o-mini\"\n\`\`\`\n\n## 2. Start\n\`\`\`bash\ndocker compose -f soc-compose.yml up -d\n# Dashboard: http://YOUR_SERVER:8083\n\`\`\`\n\n## 3. Send Logs\n\`\`\`bash\n# Syslog (rsyslog)\necho '*.* @@YOUR_SOC_SERVER:514;RSYSLOG_SyslogProtocol23Format' > /etc/rsyslog.d/axto-soc.conf\nsystemctl restart rsyslog\n\`\`\`\n\n## 4. Dashboard Menus\n- **Alerts**: All detections with MITRE ATT&CK mapping and TI enrichment\n- **Incidents**: Full NIST SP 800-61 lifecycle with MTTD/MTTR tracking\n- **UEBA**: Behavioral baselines and anomaly detection per entity\n- **SOAR**: Automated response playbooks — 100+ built-in actions\n- **Rules**: 500+ detection rules + custom Sigma rule import\n- **Reports**: Executive summary, compliance evidence (SOC 2, ISO 27001)\n- **Sources**: Log source management and ingestion statistics\n\n## 5. SOAR Quick Setup\n\`\`\`bash\ncurl -X POST http://localhost:8083/v1/soar/playbooks \\\n  -H \"X-SOC-Key: your-api-key\" \\\n  -d '{\"name\":\"block-ssh-brute-force\",\"trigger\":\"ssh_brute_force\",\"actions\":[\"block_ip\",\"notify_slack\"]}'\n\`\`\`\n\n## Support\nhello@axto.io`,

    compliance: `# AXTO Compliance — Automated Audit Platform Setup Guide\n\n## Overview\nContinuous compliance monitoring for SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA.\nCuts 80% of annual audit preparation cost.\n\n## Prerequisites\n- Docker 24+ and Docker Compose v2+\n- 2+ CPU cores, 4+ GB RAM\n- Compliance license key (prefix: CMPL-)\n\n## 1. Configure compliance.yml\n\`\`\`yaml\ncompliance:\n  license_key: \"CMPL-YOUR-KEY-HERE\"\n  port: 8084\n  api_key: \"your-strong-api-key\"\n  frameworks: [\"soc2\", \"iso27001\"]\n  evidence_auto_collect: true\n  audit_retention_days: 365\n\n# Optional: AWS integration for evidence collection\naws:\n  access_key_id: \"\"     # Read-only IAM role recommended\n  secret_access_key: \"\"\n  region: \"us-east-1\"\n\`\`\`\n\n## 2. Start\n\`\`\`bash\ndocker compose -f compliance-compose.yml up -d\n# Dashboard: http://YOUR_SERVER:8084\n\`\`\`\n\n## 3. Dashboard Menus\n- **Overview**: Framework coverage scores and control status summary\n- **Gap Analysis**: Run → prioritized control gap list with remediation steps\n- **Controls**: All controls per framework with evidence status\n- **Evidence**: Collected evidence linked to controls\n- **Policies**: 150+ template library with version control\n- **Risk Register**: Live risk tracking with mitigation status\n- **Reports**: Generate audit-ready PDF for any framework\n- **Auditor Access**: Create time-limited read-only links for external auditors\n- **Vendors**: Third-party risk assessment tracking\n\n## 4. Run First Gap Analysis\n\`\`\`bash\ncurl -X POST http://localhost:8084/v1/gap-analysis \\\n  -H \"X-Compliance-Key: your-api-key\" \\\n  -d '{\"framework\":\"soc2\"}'\n# Returns: control_gaps[], coverage_percent, priority_items[]\n\`\`\`\n\n## Support\nhello@axto.io`,

    sentinel: `# AXTO Sentinel — IoT/OT Security Platform Setup Guide\n\n## Overview\nPassive industrial network monitoring. Zero agent installation.\nSupports Modbus, DNP3, EtherNet/IP, BACnet, OPC-UA, IEC 61850, PROFINET.\n\n## Prerequisites\n- Docker 24+ and Docker Compose v2+\n- Network interface with access to OT network SPAN/mirror port\n- 2+ CPU cores, 4+ GB RAM\n- Sentinel license key (prefix: SNTL-)\n\n## 1. Configure sentinel.yml\n\`\`\`yaml\nsentinel:\n  license_key: \"SNTL-YOUR-KEY-HERE\"\n  port: 8085\n  api_key: \"your-strong-api-key\"\n  capture_interface: \"eth1\"  # interface connected to SPAN port\n  alert_retention_days: 90\n  device_retention_days: 365\n\nnotifications:\n  slack_webhook: \"\"\n  email: \"\"\n\`\`\`\n\n## 2. Configure SPAN Port\n\`\`\`bash\n# Example: Cisco switch\n# interface GigabitEthernet0/1\n#  switchport monitor session 1 source interface range Gi0/2-24\n#  switchport monitor session 1 destination interface Gi0/1\n\`\`\`\n\n## 3. Start\n\`\`\`bash\ndocker compose -f sentinel-compose.yml up -d\n# Dashboard: http://YOUR_SERVER:8085\n# Discovery begins within 60 seconds of startup\n\`\`\`\n\n## 4. Dashboard Menus\n- **Assets**: Complete OT device inventory — auto-discovered, classified\n- **Alerts**: Anomaly detections with MITRE ATT&CK for ICS mapping\n- **Topology**: Network diagram showing IT/OT segments and connections\n- **Protocols**: Protocol-level traffic analysis per device\n- **CVEs**: Vulnerability tracking per identified device model\n- **Purdue Map**: Segmentation violations highlighted in real time\n- **Integrations**: Configure SIEM forwarding and SOC integration\n\n## 5. SIEM Forwarding\n\`\`\`bash\ncurl -X POST http://localhost:8085/v1/config \\\n  -H \"X-Sentinel-Key: your-api-key\" \\\n  -d '{\"siem_forward_url\":\"syslog://your-siem:514\",\"siem_format\":\"cef\"}'\n\`\`\`\n\n## Support\nhello@axto.io`,

    orchestra: `# AXTO Orchestra AI — Self-Hosted AI Orchestration Setup Guide\n\n## Overview\nRoute AI workloads across 15+ providers with cost optimization.\nSupports OpenAI, Claude, Gemini, Groq, Ollama, and custom endpoints.\n\n## Prerequisites\n- Docker 24+ and Docker Compose v2+\n- 2+ CPU cores, 4+ GB RAM (GPU server for GPU workers)\n- Orchestra license key (prefix: ORCH-)\n\n## 1. Configure orchestra.yml\n\`\`\`yaml\norchestra:\n  license_key: \"ORCH-YOUR-KEY-HERE\"\n  port: 7890\n  api_key: \"your-strong-api-key\"\n  routing_strategy: \"cost_optimized\"\n  semantic_cache_enabled: true\n  cache_ttl_seconds: 3600\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-...\"\n      model: \"gpt-4o\"\n      weight: 60\n    - provider: anthropic\n      api_key: \"sk-ant-...\"\n      model: \"claude-3-5-sonnet-20241022\"\n      weight: 40\n\`\`\`\n\n## 2. Start\n\`\`\`bash\ndocker compose -f orchestra-compose.yml up -d\n# Console: http://YOUR_SERVER:7890/console\n\`\`\`\n\n## 3. Dashboard Menus\n- **Console**: Job queue status, worker health, routing decisions\n- **Workers**: CPU/GPU worker management and scaling\n- **Analytics**: Cost per model, latency P95, cache hit rate\n- **Routing**: Configure routing strategies per job type\n- **Settings → License**: Worker limits, expiry date\n\n## Support\nhello@axto.io`,

    edge: `# AXTO Edge — AI Gateway Setup Guide\n\n## Overview\n\"Stripe for AI API billing\" — unified gateway with per-customer metering,\nsemantic caching, prompt injection firewall, and billing webhooks.\n\n## Prerequisites\n- Docker 24+ and Docker Compose v2+\n- 2+ CPU cores, 4+ GB RAM\n- Edge license key (prefix: EDGE-)\n\n## 1. Configure edge.yml\n\`\`\`yaml\nedge:\n  license_key: \"EDGE-YOUR-KEY-HERE\"\n  port: 8082\n  api_key: \"your-admin-api-key\"\n  semantic_cache_enabled: true\n  cache_ttl_seconds: 3600\n  prompt_firewall_enabled: true\n  rate_limit_rpm: 60\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-...\"\n      model: \"gpt-4o\"\n    - provider: anthropic\n      api_key: \"sk-ant-...\"\n      model: \"claude-3-5-haiku-20241022\"\n\`\`\`\n\n## 2. Start\n\`\`\`bash\ndocker compose -f edge-compose.yml up -d\n# Dashboard: http://YOUR_SERVER:8082\n\`\`\`\n\n## 3. Dashboard Menus\n- **Customers**: API key management, per-customer rate limits and quotas\n- **Analytics**: Request volume, cost attribution, cache hit rate, latency\n- **Billing**: Token metering records, webhook configuration\n- **Firewall**: Prompt injection detection log and policy configuration\n- **A/B Tests**: Model and prompt variant traffic splitting\n- **Settings**: Routing rules, fallback chain, content filtering\n\n## 4. Create Customer API Key\n\`\`\`bash\ncurl -X POST http://localhost:8082/v1/customers \\\n  -H \"X-Edge-Key: your-admin-api-key\" \\\n  -d '{\"name\":\"Acme Corp\",\"daily_token_limit\":100000,\"rate_limit_rpm\":30}'\n\`\`\`\n\n## Support\nhello@axto.io`,
  },
  id: {
    guardian: `# AXTO Guardian AI — Panduan Setup Lengkap\n\n## Persyaratan Sistem\n- Ubuntu 20.04+ / Debian 10+ / CentOS 8+\n- Docker 24+ dan Docker Compose v2+\n- Minimum 2 CPU core, 4 GB RAM, 40 GB disk\n- Koneksi HTTPS keluar ke axto.io (heartbeat lisensi)\n\n## 1. Beli Lisensi\nKunjungi https://axto.io → pilih paket Guardian → checkout.\nLicense key (GUARD-XXXX-XXXX-XXXX-XXXX) dikirim ke email dalam 60 detik.\n\n## 2. Download Package\nLogin ke https://axto.io/portal → tab Licenses → tombol ⬇ Download.\nPilih: Docker Linux (disarankan) · EXE Linux · EXE Windows.\n\n## 3. Instalasi\n\`\`\`bash\nunzip axto-guardian-bundle-docker-linux.zip\ncd guardian-bundle-docker-linux\nsudo bash install.sh\n\`\`\`\n\n## 4. Konfigurasi guardian.yml\n\`\`\`yaml\nguardian:\n  license_key: \"GUARD-KEY-KAMU-DI-SINI\"\n  db_path: \"/guardian/data/guardian.db\"\n  port: 8080\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-...\"  # Key milikmu — tidak pernah dikirim ke AXTO\n      model: \"gpt-4o-mini\"\n\`\`\`\n\n## 5. Jalankan\n\`\`\`bash\ndocker compose up -d\n# Buka http://IP_SERVER:8080 — wizard aktivasi muncul otomatis\n\`\`\`\n\n## 6. Menu Dashboard\n- **Threats**: Deteksi real-time dengan severity dan MITRE ATT&CK\n- **Incidents**: Manajemen insiden lifecycle NIST SP 800-61\n- **Nodes**: Tambah node scanner untuk monitoring multi-server\n- **Compliance**: Generate laporan SOC 2 / ISO 27001 / HIPAA / PCI-DSS\n- **SIEM**: Konfigurasi forwarding ke Splunk, Elastic, atau syslog\n- **Settings → License**: Tanggal expiry dan status aktivasi\n\n## 7. Penegakan Lisensi\n- Validasi setiap 30 menit ke axto.io\n- Grace period 4 jam saat jaringan bermasalah\n- Setelah grace habis: SEMUA request diblokir\n- Perpanjang di https://axto.io/portal\n\n## Support\nhello@axto.io · respons dalam 1 hari kerja`,

    vault: `# AXTO Vault — Panduan Setup Layer Privasi AI\n\n## Overview\nVault adalah proxy transparan antara aplikasi dan AI provider.\nOtomatis menyensor 120+ tipe entitas PII/PHI/finansial.\nTidak perlu perubahan kode apapun.\n\n## Persyaratan\n- Docker 24+ dan Docker Compose v2+\n- 1+ CPU core, 2+ GB RAM\n- License key Vault (prefix: VAULT-)\n\n## 1. Download\nLogin ke https://axto.io/portal → Licenses → Download vault-core\n\n## 2. Konfigurasi vault.yml\n\`\`\`yaml\nvault:\n  license_key: \"VAULT-KEY-KAMU-DI-SINI\"\n  port: 8081\n  api_key: \"api-key-yang-kuat\"\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-...\"\n      model: \"gpt-4o\"\n\`\`\`\n\n## 3. Jalankan\n\`\`\`bash\ndocker compose -f vault-compose.yml up -d\n# Dashboard: http://IP_SERVER:8081\n\`\`\`\n\n## 4. Arahkan Aplikasi ke Vault\n\`\`\`python\n# Sebelum — langsung ke OpenAI\nclient = OpenAI(base_url=\"https://api.openai.com/v1\")\n\n# Sesudah — PII otomatis disensor\nclient = OpenAI(\n    base_url=\"http://vault-server:8081/v1/proxy\",\n    api_key=\"api-key-yang-kuat\"\n)\n\`\`\`\n\n## Support: hello@axto.io`,
  }
};

export async function GET(req: NextRequest) {
  const url     = new URL(req.url);
  const product = url.searchParams.get("product") || "guardian";
  const lang    = url.searchParams.get("lang") || "en";
  const format  = url.searchParams.get("format") || "html";

  // Complete, consistent guide for every product (install + usage + features),
  // from the single source of truth. Falls back to legacy guides if unknown.
  const content = GUIDE_PRODUCTS.includes(product)
    ? renderGuide(product, (lang === "id" ? "id" : "en") as Lang)
    : (GUIDES[lang]?.[product] || GUIDES["en"]?.[product] || GUIDES["en"]["guardian"]);
  const productLabel = { guardian:"Guardian AI", vault:"Vault", edge:"Edge", soc:"SOC", compliance:"Compliance", sentinel:"Sentinel", orchestra:"Orchestra AI", antivirus:"Antivirus", legal:"Legal", studio:"Studio" }[product] || product;

  // PDF: serve the branded PDF built by CI and published to R2 (overwritten each
  // deploy / nightly). Falls back to the HTML guide if the PDF isn't there yet.
  if (format === "pdf" && GUIDE_PRODUCTS.includes(product)) {
    try {
      const { getR2Builds } = await import("@/lib/db");
      const r2: any = getR2Builds(req);
      const key = `builds/latest/guides/axto-${product}-guide-${lang === "id" ? "id" : "en"}.pdf`;
      const obj = r2 ? await r2.get(key) : null;
      if (obj && obj.body) {
        return new NextResponse(obj.body, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="axto-${product}-guide-${lang}.pdf"`,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    } catch { /* fall through to HTML below */ }
  }

  if (format === "md") {
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="axto-${product}-guide-${lang}.md"`,
      },
    });
  }

  // Styled HTML for browser save/print-to-PDF
  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AXTO ${productLabel} Setup Guide</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;padding:40px 24px}
.page{max-width:760px;margin:0 auto;background:#fff;border-radius:16px;padding:48px 56px;box-shadow:0 4px 32px rgba(0,0,0,.06)}
.hdr{display:flex;align-items:center;gap:16px;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid #e2e8f0}
.logo{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#0284c7,#0d9488);display:flex;align-items:center;justify-content:center;font-size:26px}
.hdr h1{font-size:20px;font-weight:900;color:#0a1628}.hdr p{font-size:12px;color:#64748b;margin-top:4px}
h1{font-size:26px;font-weight:900;color:#0a1628;margin:32px 0 14px;letter-spacing:-.5px}
h2{font-size:18px;font-weight:700;color:#0284c7;margin:28px 0 10px;padding-bottom:6px;border-bottom:1px solid #e0f2fe}
h3{font-size:15px;font-weight:700;color:#374151;margin:18px 0 8px}
p,li{font-size:14px;line-height:1.75;color:#374151}ul,ol{padding-left:22px;margin:10px 0}li{margin-bottom:6px}
pre{background:#0f172a;color:#e2e8f0;padding:18px 22px;border-radius:10px;overflow-x:auto;margin:14px 0;font-family:'Fira Code','JetBrains Mono',monospace;font-size:12.5px;line-height:1.65}
code{background:#eff6ff;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px}
pre code{background:none;color:inherit;padding:0}
strong{font-weight:700;color:#0a1628}
.footer{margin-top:48px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
a{color:#0284c7}
@media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0;padding:32px}pre{page-break-inside:avoid}}
</style></head><body><div class="page">
<div class="hdr"><div class="logo">🛡</div><div><h1>AXTO ${productLabel} — Setup Guide</h1><p>Language: ${lang.toUpperCase()} · ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})} · axto.io</p></div></div>
${content
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/^# (.+)$/gm,'</p><h1>$1</h1><p>')
  .replace(/^## (.+)$/gm,'</p><h2>$1</h2><p>')
  .replace(/^### (.+)$/gm,'</p><h3>$1</h3><p>')
  .replace(/```[a-z]*\n([\s\S]*?)```/g,'</p><pre><code>$1</code></pre><p>')
  .replace(/`([^`]+)`/g,'<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
  .replace(/^- (.+)$/gm,'<li>$1</li>')
  .replace(/\n\n/g,'</p><p>')
}
<div class="footer"><p>© ${new Date().getFullYear()} AXTO Platform &nbsp;·&nbsp; <a href="mailto:hello@axto.io">hello@axto.io</a> &nbsp;·&nbsp; <a href="https://axto.io/portal">axto.io/portal</a></p><p style="margin-top:6px;color:#cbd5e1">Confidential — Licensed customers only</p></div>
</div></body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="axto-${product}-setup-${lang}.html"`,
      "Cache-Control": "no-store",
    },
  });
}
