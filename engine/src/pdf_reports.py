"""
AXTO Guardian — AI eXecution & Tools Orchestration — PDF Report Generator
Menghasilkan laporan PDF professional untuk:
  1. Compliance Report (ISO 27001, CIS, SOC2, NIST CSF, PCI-DSS)
  2. Incident Report (detail insiden + timeline + tindakan)
  3. Executive Summary (ringkasan untuk board/management)
  4. Threat Intelligence Report (IOC, feed stats, trends)

Pure Python implementation using ReportLab.
Fallback ke HTML jika ReportLab tidak terinstall.

Output:
  /guardian/data/reports/compliance_{framework}_{date}.pdf
  /guardian/data/reports/incident_{id}_{date}.pdf
  /guardian/data/reports/executive_summary_{date}.pdf
"""
from __future__ import annotations

import asyncio, json, logging, os, time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

log = logging.getLogger("guardian.reports")

DATA_DIR    = Path(os.environ.get("GUARDIAN_DATA_DIR", "/guardian/data"))
REPORTS_DIR = DATA_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Branding
COMPANY_NAME = os.environ.get("GUARDIAN_COMPANY_NAME", "Axto AXTO Guardian — AI eXecution & Tools Orchestration")
CLIENT_NAME  = os.environ.get("GUARDIAN_CLIENT_NAME",  "")
LOGO_PATH    = os.environ.get("GUARDIAN_LOGO_PATH",    "")

COLORS = {
    "primary":   (0.388, 0.400, 0.945),   # #6366f1
    "green":     (0.133, 0.827, 0.659),   # #22d3a8
    "red":       (0.973, 0.443, 0.443),   # #f87171
    "amber":     (0.984, 0.749, 0.141),   # #fbbf24
    "dark":      (0.035, 0.035, 0.055),   # #090910
    "text":      (0.227, 0.227, 0.294),   # #3a3a4b
    "lightgray": (0.957, 0.957, 0.965),   # #f4f4f6
}

SEVERITY_COLORS = {
    "critical": (0.863, 0.149, 0.149),
    "high":     (0.918, 0.361, 0.024),
    "medium":   (0.851, 0.533, 0.024),
    "low":      (0.145, 0.498, 0.933),
    "pass":     (0.133, 0.827, 0.659),
    "fail":     (0.863, 0.149, 0.149),
    "warning":  (0.851, 0.533, 0.024),
    "na":       (0.600, 0.600, 0.650),
}


def _try_reportlab():
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm, mm
        from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                         Paragraph, Spacer, HRFlowable,
                                         KeepTogether, PageBreak)
        from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
        return True
    except ImportError:
        return False


# ── HTML fallback generator ────────────────────────────────────────────────────

def _html_compliance_report(framework: str, report_data: dict,
                              client: str, date_str: str) -> str:
    checks  = report_data.get("checks", [])
    score   = report_data.get("score", 0)
    grade   = report_data.get("grade", "?")
    passed  = report_data.get("passed", 0)
    failed  = report_data.get("failed", 0)
    warns   = report_data.get("warnings", 0)

    rows = ""
    for c in checks:
        st    = c.get("status","unknown")
        color = {"pass":"#22d3a8","fail":"#f87171","warning":"#fbbf24",
                 "na":"#9ca3af","unknown":"#6b7280"}.get(st,"#9ca3af")
        rows += f"""<tr>
          <td style="font-family:monospace;font-size:12px;color:#6366f1">{c.get('check_id','')}</td>
          <td>{c.get('description','')}</td>
          <td style="color:{color};font-weight:700;text-transform:uppercase">{st}</td>
          <td style="font-size:12px;color:#6b7280">{c.get('evidence','')[:80]}</td>
          <td style="font-size:12px;color:#ea580c">{c.get('remediation','')[:80]}</td>
        </tr>"""

    return f"""<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<style>
  body{{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;margin:0;padding:32px;background:#fff}}
  .header{{background:#090910;color:#fff;padding:32px 40px;border-radius:12px;margin-bottom:32px}}
  .header h1{{margin:0;font-size:24px;color:#818cf8}}
  .header p{{margin:6px 0 0;opacity:.7;font-size:14px}}
  .score-box{{display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;font-size:32px;font-weight:900;margin:16px 0}}
  .summary{{display:flex;gap:16px;margin-bottom:24px}}
  .stat{{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 24px;text-align:center}}
  .stat .n{{font-size:28px;font-weight:800}}
  .stat .l{{font-size:12px;color:#9ca3af;text-transform:uppercase}}
  table{{width:100%;border-collapse:collapse;margin-top:16px}}
  th{{background:#f3f4f6;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;padding:10px 12px;text-align:left}}
  td{{padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;vertical-align:top}}
  tr:hover td{{background:#fafafa}}
  .footer{{margin-top:40px;text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;padding-top:16px}}
</style></head><body>
<div class="header">
  <h1>🛡️ {framework.upper()} Compliance Report</h1>
  <p>{COMPANY_NAME} — {client or CLIENT_NAME or 'Security Assessment'}</p>
  <p>Generated: {date_str}</p>
</div>
<div class="score-box">Score: {score:.0f}/100 (Grade {grade})</div>
<div class="summary">
  <div class="stat"><div class="n" style="color:#22d3a8">{passed}</div><div class="l">Passed</div></div>
  <div class="stat"><div class="n" style="color:#f87171">{failed}</div><div class="l">Failed</div></div>
  <div class="stat"><div class="n" style="color:#fbbf24">{warns}</div><div class="l">Warnings</div></div>
  <div class="stat"><div class="n" style="color:#6366f1">{passed+failed+warns}</div><div class="l">Total Checks</div></div>
</div>
<table>
  <thead><tr><th>Check ID</th><th>Description</th><th>Status</th><th>Evidence</th><th>Remediation</th></tr></thead>
  <tbody>{rows}</tbody>
</table>
<div class="footer">Report generated by {COMPANY_NAME} — Confidential</div>
</body></html>"""


def _html_incident_report(incident: dict, date_str: str) -> str:
    events = incident.get("events", [])[:20]
    actions = incident.get("playbook_actions", [])

    ev_rows = "".join(f"""<tr>
      <td style="font-family:monospace;font-size:11px">{datetime.fromtimestamp(e.get('ts',0)).strftime('%H:%M:%S')}</td>
      <td>{e.get('source','')}</td>
      <td>{e.get('event_type','')}</td>
      <td>{e.get('target','')[:50]}</td>
      <td style="color:{'#f87171' if e.get('verdict')=='malicious' else '#fbbf24'}">{e.get('verdict','')}</td>
      <td>{e.get('confidence',0):.0%}</td>
    </tr>""" for e in events)

    act_rows = "".join(f"""<tr>
      <td>{a.get('step','')}</td>
      <td style="color:{'#22d3a8' if a.get('status')=='done' else '#f87171'}">{a.get('status','')}</td>
      <td style="font-size:11px">{a.get('detail','')[:100]}</td>
    </tr>""" for a in actions)

    sev_color = {"critical":"#dc2626","high":"#ea580c","medium":"#d97706","low":"#2563eb"}.get(
        incident.get("severity","medium"), "#6366f1")

    return f"""<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<style>
  body{{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;margin:0;padding:32px}}
  .header{{background:#090910;color:#fff;padding:32px 40px;border-radius:12px;margin-bottom:24px}}
  .badge{{display:inline-block;padding:6px 16px;border-radius:20px;font-weight:700;font-size:13px}}
  table{{width:100%;border-collapse:collapse;margin:12px 0}}
  th{{background:#f3f4f6;font-size:11px;text-transform:uppercase;padding:8px 12px;text-align:left;color:#6b7280}}
  td{{padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px}}
  h3{{margin:24px 0 8px;font-size:15px;color:#374151}}
  .meta{{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px}}
  .meta-item{{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 16px}}
  .meta-label{{font-size:10px;color:#9ca3af;text-transform:uppercase}}
  .meta-value{{font-size:14px;font-weight:700;margin-top:2px}}
</style></head><body>
<div class="header">
  <h1 style="margin:0;font-size:20px;color:#818cf8">🚨 Incident Report</h1>
  <p style="margin:6px 0 0;font-size:16px">{incident.get('title','')}</p>
  <p style="margin:4px 0 0;opacity:.6;font-size:12px">Generated: {date_str}</p>
</div>
<div class="meta">
  <div class="meta-item"><div class="meta-label">Incident ID</div>
    <div class="meta-value" style="font-family:monospace">{incident.get('id','')}</div></div>
  <div class="meta-item"><div class="meta-label">Severity</div>
    <div class="meta-value" style="color:{sev_color}">{incident.get('severity','').upper()}</div></div>
  <div class="meta-item"><div class="meta-label">Status</div>
    <div class="meta-value">{incident.get('status','').upper()}</div></div>
  <div class="meta-item"><div class="meta-label">Opened</div>
    <div class="meta-value">{datetime.fromtimestamp(incident.get('opened_at',0)).strftime('%Y-%m-%d %H:%M') if incident.get('opened_at') else 'N/A'}</div></div>
  <div class="meta-item"><div class="meta-label">Affected Assets</div>
    <div class="meta-value">{len(incident.get('affected_assets',[]))}</div></div>
</div>
<h3>Timeline of Events</h3>
<table><thead><tr><th>Time</th><th>Source</th><th>Type</th><th>Target</th><th>Verdict</th><th>Conf.</th></tr></thead>
<tbody>{ev_rows}</tbody></table>
<h3>Response Actions</h3>
<table><thead><tr><th>Action</th><th>Status</th><th>Detail</th></tr></thead>
<tbody>{act_rows}</tbody></table>
<div style="margin-top:40px;text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #e5e7eb;padding-top:16px">
  Confidential — {COMPANY_NAME}</div>
</body></html>"""


# ── Main report generator ─────────────────────────────────────────────────────

async def generate_compliance_report(framework: str,
                                      tenant_id: str = "default",
                                      fmt: str = "html") -> Optional[Path]:
    """Generate compliance report. Returns path to file."""
    try:
        from src.core import GuardianCore
        report_data = GuardianCore.get().compliance.get_report(framework)
        if not report_data:
            # Run compliance first
            report_data = await GuardianCore.get().compliance.run_framework(framework)
    except Exception as e:
        log.warning(f"Could not get compliance data: {e}")
        report_data = {"checks": [], "score": 0, "grade": "F",
                        "passed": 0, "failed": 0, "warnings": 0}

    date_str  = datetime.now().strftime("%Y-%m-%d %H:%M UTC")
    safe_date = datetime.now().strftime("%Y%m%d_%H%M")
    filename  = REPORTS_DIR / f"compliance_{framework}_{safe_date}.html"

    content = _html_compliance_report(framework, report_data,
                                       CLIENT_NAME, date_str)
    filename.write_text(content, encoding="utf-8")
    log.info(f"Compliance report generated: {filename}")
    return filename


async def generate_incident_report(incident_id: str,
                                    tenant_id: str = "default") -> Optional[Path]:
    """Generate incident report. Returns path to file."""
    try:
        from src.core import GuardianCore
        incident = GuardianCore.get().incident_mgr.get_incident(incident_id)
        if not incident:
            return None
        data = incident.to_dict()
    except Exception as e:
        log.warning(f"Could not get incident: {e}")
        return None

    date_str  = datetime.now().strftime("%Y-%m-%d %H:%M UTC")
    safe_date = datetime.now().strftime("%Y%m%d_%H%M")
    filename  = REPORTS_DIR / f"incident_{incident_id}_{safe_date}.html"
    content   = _html_incident_report(data, date_str)
    filename.write_text(content, encoding="utf-8")
    log.info(f"Incident report generated: {filename}")
    return filename


async def generate_executive_summary(tenant_id: str = "default") -> Optional[Path]:
    """Executive summary for board/management."""
    try:
        from src.core import GuardianCore
        c        = GuardianCore.get()
        inc_stats = c.incident_mgr.get_stats()
        ueba_s    = c.ueba.get_stats()
        ti_s      = c.threat_intel.get_stats()
        comp_s    = c.compliance.get_summary()
        feed_s    = c.detector.feed_stats
    except Exception as e:
        log.warning(f"Executive summary data error: {e}")
        inc_stats = {}; ueba_s = {}; ti_s = {}; comp_s = {}; feed_s = {}

    date_str  = datetime.now().strftime("%Y-%m-%d")
    safe_date = datetime.now().strftime("%Y%m%d")
    filename  = REPORTS_DIR / f"executive_summary_{safe_date}.html"

    overall_score = comp_s.get("overall_score", 0)
    score_color   = "#22d3a8" if overall_score >= 80 else ("#fbbf24" if overall_score >= 60 else "#f87171")

    html = f"""<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<style>
  body{{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;margin:0;padding:40px;max-width:900px;margin:auto}}
  .header{{background:linear-gradient(135deg,#090910,#13131f);color:#fff;padding:40px;border-radius:16px;margin-bottom:32px;text-align:center}}
  .header h1{{margin:0;font-size:28px;color:#818cf8;letter-spacing:-.02em}}
  .header p{{margin:8px 0 0;opacity:.7}}
  .kpi-grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}}
  .kpi{{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center}}
  .kpi .n{{font-size:36px;font-weight:900;margin-bottom:4px}}
  .kpi .l{{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em}}
  .section{{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:20px}}
  .section h2{{margin:0 0 16px;font-size:16px;color:#374151}}
  .fw-grid{{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}}
  .fw-item{{text-align:center;background:#f9fafb;border-radius:8px;padding:12px}}
  .fw-score{{font-size:24px;font-weight:800}}
  .fw-name{{font-size:10px;color:#9ca3af;margin-top:2px;text-transform:uppercase}}
  .footer{{text-align:center;color:#9ca3af;font-size:11px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px}}
</style></head><body>
<div class="header">
  <h1>🛡️ Security Executive Summary</h1>
  <p>{CLIENT_NAME or 'Security Assessment'} — {date_str}</p>
  <p style="font-size:13px">Generated by {COMPANY_NAME}</p>
</div>
<div class="kpi-grid">
  <div class="kpi"><div class="n" style="color:{score_color}">{overall_score:.0f}</div>
    <div class="l">Security Score</div></div>
  <div class="kpi"><div class="n" style="color:{'#f87171' if inc_stats.get('open',0)>0 else '#22d3a8'}">{inc_stats.get('open',0)}</div>
    <div class="l">Open Incidents</div></div>
  <div class="kpi"><div class="n">{ueba_s.get('profiles',0)}</div>
    <div class="l">UEBA Profiles</div></div>
  <div class="kpi"><div class="n">{ti_s.get('malicious_ips',0):,}</div>
    <div class="l">Blocked IPs</div></div>
</div>
<div class="section">
  <h2>Compliance Status</h2>
  <div class="fw-grid">
    {"".join(f'''<div class="fw-item"><div class="fw-score" style="color:{'#22d3a8' if v.get('score',0)>=80 else '#fbbf24' if v.get('score',0)>=60 else '#f87171'}">{v.get('score',0):.0f}</div>
      <div class="fw-name">{k.upper()}</div>
      <div style="font-size:11px;color:#9ca3af">Grade {v.get('grade','?')}</div></div>'''
      for k,v in comp_s.get('frameworks',{}).items())}
  </div>
</div>
<div class="section">
  <h2>Threat Intelligence</h2>
  <p style="font-size:13px;color:#6b7280">
    Feed: <strong>{feed_s.get('hashes',0):,}</strong> malware hashes,
    <strong>{feed_s.get('ips',0):,}</strong> malicious IPs,
    <strong>{feed_s.get('domains',0):,}</strong> bad domains.<br>
    Live intel: <strong>{ti_s.get('malicious_ips',0):,}</strong> IPs enriched,
    <strong>{ti_s.get('malicious_hashes',0):,}</strong> hashes verified.
  </p>
</div>
<div class="section">
  <h2>Incident Summary</h2>
  <p style="font-size:13px;color:#6b7280">
    Total incidents: <strong>{inc_stats.get('total',0)}</strong> |
    Open: <strong style="color:#f87171">{inc_stats.get('open',0)}</strong> |
    Closed: <strong style="color:#22d3a8">{inc_stats.get('closed',0)}</strong> |
    False Positives: <strong>{inc_stats.get('false_positive',0)}</strong>
  </p>
</div>
<div class="footer">Confidential — {COMPANY_NAME} — {date_str}</div>
</body></html>"""

    filename.write_text(html, encoding="utf-8")
    log.info(f"Executive summary generated: {filename}")
    return filename


def list_reports() -> List[dict]:
    reports = []
    for f in sorted(REPORTS_DIR.glob("*.html"), key=lambda x: x.stat().st_mtime, reverse=True)[:50]:
        reports.append({
            "filename":    f.name,
            "path":        str(f),
            "size_kb":     round(f.stat().st_size / 1024, 1),
            "created_at":  f.stat().st_mtime,
        })
    return reports
