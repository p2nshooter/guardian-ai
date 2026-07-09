# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) — Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
# ==============================================================================
"""
AXTO Legal — Production API Server
18 AI Workspaces · 195+ Jurisdictions · 50+ Compliance Frameworks
BYOK LLM · BYOD Connectors · Real-time Regulatory Radar
Copyright (c) 2024-2026 Axto AI. All rights reserved.
"""

import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

from fastapi import (
    FastAPI, Request, HTTPException, Depends,
    UploadFile, File, Form, BackgroundTasks,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.config.settings import get_config
from src.license import validate, require_valid, PRODUCT_NAME, PRODUCT_VERSION, PRODUCT_AUTHOR

logging.basicConfig(
    level=os.environ.get("LEGL_LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
)
logger = logging.getLogger("axto.legal")

cfg = get_config()
_license_state = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _license_state

    logger.info("=" * 72)
    logger.info("  %s v%s", PRODUCT_NAME, PRODUCT_VERSION)
    logger.info("  Copyright (c) 2024-2026 %s. All rights reserved.", PRODUCT_AUTHOR)
    logger.info("  Platform: AXTO (axto.io) — Sovereign AI Infrastructure")
    logger.info("  18 AI Workspaces · 195+ Jurisdictions · 50+ Frameworks")
    logger.info("=" * 72)

    _license_state = await validate(cfg.license_key)
    require_valid(_license_state)

    for d in [cfg.data_path, cfg.upload_path, cfg.output_path, cfg.index_path]:
        Path(d).mkdir(parents=True, exist_ok=True)

    logger.info("✅ AXTO Legal started — http://%s:%s | LLM: %s/%s",
                cfg.api_host, cfg.api_port, cfg.llm_provider, cfg.llm_model)
    yield


app = FastAPI(
    title="AXTO Legal",
    description=f"Enterprise AI Legal & Compliance Platform. © 2024-2026 {PRODUCT_AUTHOR}",
    version=PRODUCT_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth guard ────────────────────────────────────────────────────────────────
def verify_key(request: Request) -> str:
    if not cfg.require_auth:
        return "noauth"
    key = (request.headers.get("X-Legal-Key")
           or request.headers.get("X-AXTO-Key")
           or request.query_params.get("api_key", ""))
    if not key or key != cfg.api_key:
        raise HTTPException(401, detail={
            "error": "Unauthorized",
            "message": "Sertakan header X-Legal-Key dengan API key yang valid.",
        })
    return key


# ── Daily document counter ────────────────────────────────────────────────────
_counter: dict = {"date": "", "count": 0}

def _check_limit():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _counter["date"] != today:
        _counter.update(date=today, count=0)
    limit = getattr(_license_state, "max_documents", 0)
    if limit and limit > 0 and _counter["count"] >= limit:
        raise HTTPException(429, {
            "error": "Limit harian tercapai",
            "message": f"Batas {limit} dokumen/hari telah tercapai. Upgrade plan di axto.io/portal.",
        })
    _counter["count"] += 1


def _require_workspace_licensed(workspace_id: str):
    """Enforce the per-package workspace entitlement. The 18 AI workspaces unlock
    in registry order — Starter: 5, Professional: 12, Enterprise/Sovereign: 18
    (a value of 18 or -1 means all are unlocked). The entitlement comes from the
    Ed25519-SIGNED license payload, so this gate cannot be bypassed by tampering
    with the local license cache."""
    from src.core.workspaces import WORKSPACES
    allowed = getattr(_license_state, "workspaces", 5) or 5
    total   = len(WORKSPACES)
    if allowed == -1 or allowed >= total:
        return
    order = list(WORKSPACES.keys())
    try:
        idx = order.index(workspace_id)
    except ValueError:
        return  # unknown id — run_workspace will return its own not-found error
    if idx >= allowed:
        ws = WORKSPACES[workspace_id]
        raise HTTPException(403, {
            "error":   "Workspace terkunci untuk paket Anda",
            "message": f"Workspace '{ws['name']}' tidak termasuk dalam paket Anda "
                       f"({allowed} dari {total} workspace aktif). Upgrade paket di "
                       f"axto.io/portal untuk membuka seluruh workspace.",
            "workspace_id":        workspace_id,
            "licensed_workspaces": allowed,
            "total_workspaces":    total,
            "code":                "workspace_locked",
        })


# ══════════════════════════════════════════════════════════════════════════════
# BUILT-IN WEB UI — Served at / and /app
# Elegant single-page application in HTML/CSS/JS (no build step required)
# ══════════════════════════════════════════════════════════════════════════════

WEB_UI_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AXTO Legal — Enterprise AI Legal Platform</title>
<style>
:root{--bg:#0a1628;--surface:#111e34;--surface2:#162340;--border:#1e3050;
--accent:#0d9488;--accent2:#0f766e;--text:#e2e8f0;--muted:#94a3b8;
--danger:#ef4444;--warn:#f59e0b;--success:#10b981;--radius:12px;--r2:8px;
--font:'Inter',system-ui,-apple-system,sans-serif;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;display:flex;flex-direction:column;}
a{color:var(--accent);text-decoration:none;}
/* TOP NAV */
.nav{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;height:56px;display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:100;}
.nav-brand{font-size:17px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;}
.nav-brand span{color:var(--accent);}
.nav-links{display:flex;gap:2px;margin-left:16px;}
.nav-link{padding:6px 14px;border-radius:var(--r2);font-size:13px;color:var(--muted);cursor:pointer;transition:.15s;}
.nav-link:hover,.nav-link.active{background:rgba(13,148,136,.15);color:var(--accent);}
.nav-right{margin-left:auto;display:flex;align-items:center;gap:10px;}
.badge{background:rgba(13,148,136,.15);color:var(--accent);border:1px solid rgba(13,148,136,.3);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
/* LAYOUT */
.layout{display:flex;flex:1;overflow:hidden;}
.sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);padding:16px 0;overflow-y:auto;flex-shrink:0;}
.sidebar-section{padding:0 12px;margin-bottom:4px;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:16px;}
.ws-item{padding:9px 14px;margin:1px 8px;border-radius:var(--r2);cursor:pointer;font-size:13px;display:flex;align-items:center;gap:9px;color:var(--muted);transition:.12s;}
.ws-item:hover,.ws-item.active{background:rgba(13,148,136,.12);color:var(--text);}
.ws-item .icon{font-size:16px;width:22px;text-align:center;}
.ws-item .label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
/* MAIN */
.main{flex:1;overflow-y:auto;padding:28px;}
/* CARD */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:20px;}
.card-title{font-size:15px;font-weight:700;color:#fff;margin-bottom:4px;}
.card-sub{font-size:12px;color:var(--muted);}
/* FORMS */
.form-group{margin-bottom:16px;}
.form-label{font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;display:block;text-transform:uppercase;letter-spacing:.05em;}
.form-input,.form-select,.form-textarea{width:100%;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--r2);padding:10px 14px;color:var(--text);font-size:14px;font-family:var(--font);outline:none;transition:.15s;}
.form-textarea{resize:vertical;min-height:120px;line-height:1.6;}
.form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(13,148,136,.1);}
.form-select option{background:var(--surface);}
/* BUTTONS */
.btn{padding:10px 20px;border-radius:var(--r2);border:none;font-weight:700;font-size:13px;cursor:pointer;transition:.15s;display:inline-flex;align-items:center;gap:6px;}
.btn:disabled{opacity:.45;cursor:default;}
.btn-primary{background:var(--accent);color:#fff;}
.btn-primary:hover:not(:disabled){background:var(--accent2);}
.btn-outline{background:transparent;color:var(--accent);border:1.5px solid var(--accent);}
.btn-outline:hover{background:rgba(13,148,136,.1);}
.btn-danger{background:var(--danger);color:#fff;}
.btn-sm{padding:6px 14px;font-size:12px;}
/* UPLOAD ZONE */
.upload-zone{border:2px dashed var(--border);border-radius:var(--radius);padding:36px;text-align:center;cursor:pointer;transition:.15s;background:rgba(255,255,255,.02);}
.upload-zone:hover,.upload-zone.drag{border-color:var(--accent);background:rgba(13,148,136,.06);}
.upload-zone .upload-icon{font-size:36px;margin-bottom:12px;}
.upload-zone .upload-title{font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;}
.upload-zone .upload-sub{font-size:12px;color:var(--muted);}
/* RESULT */
.result-box{background:var(--bg);border:1px solid var(--border);border-radius:var(--r2);padding:16px;margin-top:16px;}
.result-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.result-title{font-size:13px;font-weight:700;color:#fff;}
.result-body{font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;word-break:break-word;}
/* RISK BADGES */
.risk{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;text-transform:uppercase;}
.risk-critical{background:rgba(239,68,68,.2);color:#f87171;border:1px solid rgba(239,68,68,.3);}
.risk-high{background:rgba(245,158,11,.2);color:#fbbf24;border:1px solid rgba(245,158,11,.3);}
.risk-medium{background:rgba(59,130,246,.2);color:#93c5fd;border:1px solid rgba(59,130,246,.3);}
.risk-low{background:rgba(16,185,129,.2);color:#6ee7b7;border:1px solid rgba(16,185,129,.3);}
/* WARNING */
.warning-box{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:var(--r2);padding:12px 16px;font-size:12px;color:#fbbf24;margin-bottom:16px;}
.disclaimer-box{background:rgba(100,116,139,.06);border:1px solid var(--border);border-radius:var(--r2);padding:12px 16px;font-size:11px;color:var(--muted);margin-top:16px;line-height:1.6;}
/* GRID */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.ws-card{background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;cursor:pointer;transition:.15s;}
.ws-card:hover{border-color:var(--accent);background:rgba(13,148,136,.08);}
.ws-card .ws-icon{font-size:28px;margin-bottom:12px;}
.ws-card .ws-name{font-size:14px;font-weight:700;color:#fff;margin-bottom:6px;}
.ws-card .ws-desc{font-size:12px;color:var(--muted);line-height:1.5;}
/* LOADING */
.spinner{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
@keyframes spin{to{transform:rotate(360deg)}}
/* TABS */
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:20px;}
.tab{padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;transition:.12s;}
.tab.active{color:var(--accent);border-bottom-color:var(--accent);}
/* FILE LIST */
.file-item{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r2);margin-bottom:8px;}
.file-icon{font-size:22px;}
.file-info{flex:1;}
.file-name{font-size:13px;font-weight:600;color:#fff;}
.file-meta{font-size:11px;color:var(--muted);margin-top:2px;}
.file-actions{display:flex;gap:6px;}
/* PROGRESS */
.progress-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:8px;}
.progress-fill{height:100%;background:var(--accent);border-radius:2px;transition:width .3s;}
/* JURISDICTION TAGS */
.jur-tag{display:inline-block;background:rgba(13,148,136,.12);color:var(--accent);border:1px solid rgba(13,148,136,.25);border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;margin:2px;cursor:pointer;}
.jur-tag.selected{background:var(--accent);color:#fff;}
/* SOURCE INDICATORS */
.verified-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px;}
.verified-ok{background:var(--success);}
.verified-warn{background:var(--warn);}
/* RESPONSIVE */
@media(max-width:768px){.sidebar{display:none;}.grid-2,.grid-3{grid-template-columns:1fr;}}
</style>
</head>
<body>

<!-- TOP NAV -->
<nav class="nav">
  <div class="nav-brand">⚖️ AXTO <span>Legal</span></div>
  <div class="nav-links">
    <div class="nav-link active" onclick="showSection('workspaces')">Workspaces</div>
    <div class="nav-link" onclick="showSection('documents')">Documents</div>
    <div class="nav-link" onclick="showSection('sources')">Data Sources</div>
    <div class="nav-link" onclick="showSection('search')">Legal Search</div>
    <div class="nav-link" onclick="showSection('settings')">Settings</div>
  </div>
  <div class="nav-right">
    <span class="badge" id="plan-badge">Loading...</span>
    <span style="font-size:11px;color:var(--muted);">© AXTO</span>
  </div>
</nav>

<!-- LAYOUT -->
<div class="layout">

  <!-- SIDEBAR -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-section">Research</div>
    <div class="ws-item" onclick="openWorkspace('legal-research')"><span class="icon">🔍</span><span class="label">Legal Research</span></div>
    <div class="ws-item" onclick="openWorkspace('regulatory-radar')"><span class="icon">📡</span><span class="label">Regulatory Radar</span></div>
    <div class="ws-item" onclick="openWorkspace('litigation-support')"><span class="icon">⚖️</span><span class="label">Litigation Support</span></div>
    <div class="sidebar-section">Compliance</div>
    <div class="ws-item" onclick="openWorkspace('compliance-center')"><span class="icon">📋</span><span class="label">Compliance Center</span></div>
    <div class="ws-item" onclick="openWorkspace('data-privacy')"><span class="icon">🛡️</span><span class="label">Data Privacy</span></div>
    <div class="ws-item" onclick="openWorkspace('esg-sustainability')"><span class="icon">🌱</span><span class="label">ESG & Sustainability</span></div>
    <div class="sidebar-section">Corporate</div>
    <div class="ws-item" onclick="openWorkspace('contract-intelligence')"><span class="icon">📄</span><span class="label">Contract Intelligence</span></div>
    <div class="ws-item" onclick="openWorkspace('due-diligence')"><span class="icon">🏛️</span><span class="label">Due Diligence</span></div>
    <div class="ws-item" onclick="openWorkspace('corporate-governance')"><span class="icon">🏢</span><span class="label">Corporate Governance</span></div>
    <div class="sidebar-section">Specialist</div>
    <div class="ws-item" onclick="openWorkspace('aml-kyc')"><span class="icon">🔐</span><span class="label">AML/KYC</span></div>
    <div class="ws-item" onclick="openWorkspace('ip-trademark')"><span class="icon">©️</span><span class="label">IP & Trademark</span></div>
    <div class="ws-item" onclick="openWorkspace('tax-fiscal')"><span class="icon">📊</span><span class="label">Tax & Fiscal</span></div>
    <div class="ws-item" onclick="openWorkspace('trade-customs')"><span class="icon">🌐</span><span class="label">Trade & Customs</span></div>
    <div class="ws-item" onclick="openWorkspace('labor-employment')"><span class="icon">👷</span><span class="label">Labor & Employment</span></div>
    <div class="ws-item" onclick="openWorkspace('real-estate')"><span class="icon">🏠</span><span class="label">Real Estate</span></div>
    <div class="ws-item" onclick="openWorkspace('dispute-resolution')"><span class="icon">🤝</span><span class="label">Dispute Resolution</span></div>
    <div class="sidebar-section">Platform</div>
    <div class="ws-item" onclick="openWorkspace('workflow-automation')"><span class="icon">⚡</span><span class="label">Workflow</span></div>
    <div class="ws-item" onclick="openWorkspace('knowledge-center')"><span class="icon">📚</span><span class="label">Knowledge Center</span></div>
  </aside>

  <!-- MAIN CONTENT -->
  <main class="main" id="main-content">

    <!-- WORKSPACES SECTION -->
    <div id="section-workspaces">
      <div style="margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">18 AI Legal Workspaces</h1>
        <p style="color:var(--muted);font-size:13px;">195+ jurisdictions · 50+ compliance frameworks · BYOK LLM · Real-time regulatory updates</p>
      </div>
      <div class="disclaimer-box">
        ⚖️ <strong>Catatan Penting:</strong> AXTO Legal adalah platform riset hukum berbasis AI.
        Hasil analisis bersifat informatif dan tidak menggantikan nasihat hukum profesional.
        Selalu konsultasikan keputusan hukum penting dengan pengacara atau konsultan hukum yang berkualifikasi.
        © 2024-2026 AXTO (axto.io)
      </div>
      <div id="workspace-grid" class="grid-3"></div>
    </div>

    <!-- WORKSPACE ACTIVE SECTION -->
    <div id="section-workspace-active" style="display:none;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <button class="btn btn-outline btn-sm" onclick="showSection('workspaces')">← Kembali</button>
        <div>
          <h1 id="ws-title" style="font-size:18px;font-weight:900;color:#fff;"></h1>
          <p id="ws-subtitle" style="color:var(--muted);font-size:12px;margin-top:2px;"></p>
        </div>
      </div>

      <div class="card">
        <div class="grid-2" style="gap:12px;margin-bottom:16px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Bahasa Respons</label>
            <select class="form-select" id="ws-lang">
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="ru">Русский</option>
              <option value="ar">العربية</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="es">Español</option>
              <option value="pt">Português</option>
              <option value="nl">Nederlands</option>
              <option value="it">Italiano</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Yurisdiksi Utama</label>
            <select class="form-select" id="ws-jurisdiction">
              <option value="">Semua Yurisdiksi</option>
              <option value="id">🇮🇩 Indonesia</option>
              <option value="us">🇺🇸 United States</option>
              <option value="eu">🇪🇺 European Union</option>
              <option value="uk">🇬🇧 United Kingdom</option>
              <option value="sg">🇸🇬 Singapore</option>
              <option value="my">🇲🇾 Malaysia</option>
              <option value="au">🇦🇺 Australia</option>
              <option value="de">🇩🇪 Germany</option>
              <option value="fr">🇫🇷 France</option>
              <option value="jp">🇯🇵 Japan</option>
              <option value="cn">🇨🇳 China</option>
              <option value="in">🇮🇳 India</option>
              <option value="ae">🇦🇪 UAE</option>
              <option value="sa">🇸🇦 Saudi Arabia</option>
              <option value="br">🇧🇷 Brazil</option>
              <option value="ca">🇨🇦 Canada</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Pertanyaan atau Tugas Hukum</label>
          <textarea class="form-textarea" id="ws-query" placeholder="Jelaskan pertanyaan hukum, dokumen yang perlu dianalisis, atau compliance requirement yang perlu dicek..." style="min-height:140px;"></textarea>
        </div>

        <!-- Optional document upload in workspace -->
        <div style="margin-bottom:16px;">
          <label class="form-label">Dokumen Pendukung (Opsional)</label>
          <div class="upload-zone" id="ws-upload-zone" onclick="document.getElementById('ws-file').click()">
            <div class="upload-icon">📎</div>
            <div class="upload-title" id="ws-file-label">Lampirkan dokumen untuk dianalisis</div>
            <div class="upload-sub">PDF, DOCX, TXT — maks. 100MB</div>
            <input type="file" id="ws-file" style="display:none;" accept=".pdf,.docx,.doc,.txt,.html,.rtf"
              onchange="handleWsFile(this)">
          </div>
        </div>

        <div style="display:flex;gap:10px;align-items:center;">
          <button class="btn btn-primary" id="ws-run-btn" onclick="runWorkspace()">
            ⚡ Jalankan Analisis
          </button>
          <button class="btn btn-outline btn-sm" onclick="clearWorkspace()">Bersihkan</button>
        </div>
      </div>

      <!-- Result -->
      <div id="ws-result-container" style="display:none;">
        <div class="card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="font-size:15px;font-weight:700;color:#fff;">Hasil Analisis</div>
            <div style="margin-left:auto;display:flex;gap:8px;">
              <button class="btn btn-outline btn-sm" onclick="downloadResult('pdf')">⬇ PDF</button>
              <button class="btn btn-outline btn-sm" onclick="downloadResult('docx')">⬇ DOCX</button>
              <button class="btn btn-outline btn-sm" onclick="downloadResult('json')">⬇ JSON</button>
            </div>
          </div>
          <div id="ws-result-body"></div>
          <div class="disclaimer-box" id="ws-disclaimer" style="margin-top:16px;display:none;"></div>
        </div>
      </div>
    </div>

    <!-- DOCUMENTS SECTION -->
    <div id="section-documents" style="display:none;">
      <div style="margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Document Center</h1>
        <p style="color:var(--muted);font-size:13px;">Upload, analisis, dan ekspor dokumen hukum. Mendukung PDF, DOCX, TXT, RTF, HTML.</p>
      </div>

      <div class="card">
        <div class="card-title">Upload & Analisis Dokumen</div>
        <div class="card-sub" style="margin-bottom:16px;">Maksimum 100MB per file · PDF, DOCX, DOC, TXT, RTF, HTML</div>

        <div class="upload-zone" id="doc-upload-zone"
          onclick="document.getElementById('doc-file').click()"
          ondragover="event.preventDefault();this.classList.add('drag')"
          ondragleave="this.classList.remove('drag')"
          ondrop="handleDocDrop(event)">
          <div class="upload-icon">📁</div>
          <div class="upload-title">Klik atau seret dokumen ke sini</div>
          <div class="upload-sub">PDF · DOCX · DOC · TXT · RTF · HTML</div>
          <input type="file" id="doc-file" style="display:none;" multiple
            accept=".pdf,.docx,.doc,.txt,.html,.htm,.rtf"
            onchange="handleDocFiles(this.files)">
        </div>

        <div id="doc-queue" style="margin-top:16px;"></div>

        <div class="grid-2" style="margin-top:16px;gap:12px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Jenis Analisis</label>
            <select class="form-select" id="doc-analysis-type">
              <option value="contract_review">Review Kontrak & Risiko</option>
              <option value="compliance_check">Pemeriksaan Kepatuhan</option>
              <option value="clause_extraction">Ekstraksi Klausul</option>
              <option value="legal_research">Riset Hukum Umum</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Bahasa Output</label>
            <select class="form-select" id="doc-lang">
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="ru">Русский</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-top:12px;">
          <label class="form-label">Yurisdiksi / Konteks Tambahan</label>
          <input class="form-input" id="doc-context" placeholder="Contoh: Indonesia, Singapura — fokus pada hukum ketenagakerjaan">
        </div>

        <button class="btn btn-primary" id="doc-analyze-btn" onclick="analyzeDocuments()" disabled>
          🔍 Analisis Dokumen
        </button>
      </div>

      <div id="doc-result-container" style="display:none;" class="card">
        <div style="display:flex;align-items:center;margin-bottom:16px;">
          <div style="font-size:15px;font-weight:700;color:#fff;">Hasil Analisis Dokumen</div>
          <div style="margin-left:auto;display:flex;gap:8px;">
            <button class="btn btn-outline btn-sm" onclick="downloadDocResult('pdf')">⬇ Download PDF</button>
            <button class="btn btn-outline btn-sm" onclick="downloadDocResult('docx')">⬇ Download DOCX</button>
          </div>
        </div>
        <div id="doc-result-body"></div>
      </div>
    </div>

    <!-- LEGAL SEARCH SECTION -->
    <div id="section-search" style="display:none;">
      <div style="margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Legal Search</h1>
        <p style="color:var(--muted);font-size:13px;">Riset hukum multi-yurisdiksi dengan 60+ sumber hukum terverifikasi dari 195+ negara.</p>
      </div>

      <div class="card">
        <div class="form-group">
          <label class="form-label">Pertanyaan Hukum</label>
          <textarea class="form-textarea" id="search-query" placeholder="Contoh: Apa persyaratan GDPR untuk transfer data ke luar EU? Bagaimana hukum ketenagakerjaan di Indonesia untuk PHK? ..." style="min-height:100px;"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Yurisdiksi (pilih satu atau lebih)</label>
          <div id="jur-selector" style="display:flex;flex-wrap:wrap;gap:6px;padding:12px;background:var(--bg);border-radius:var(--r2);border:1px solid var(--border);">
          </div>
        </div>

        <div class="grid-2" style="gap:12px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Bahasa Respons</label>
            <select class="form-select" id="search-lang">
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="ru">Русский</option>
              <option value="ar">العربية</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Topik Hukum (untuk petunjuk regulasi)</label>
            <select class="form-select" id="search-topic">
              <option value="">Deteksi Otomatis</option>
              <option value="data_privacy">Data Privacy</option>
              <option value="employment">Ketenagakerjaan</option>
              <option value="contract">Kontrak & Perjanjian</option>
              <option value="ip">Kekayaan Intelektual</option>
              <option value="financial">Keuangan & Perbankan</option>
              <option value="corporate">Hukum Perusahaan</option>
              <option value="antitrust">Persaingan Usaha</option>
              <option value="cybersecurity">Keamanan Siber</option>
              <option value="ai_regulation">Regulasi AI</option>
              <option value="aml">AML/KYC</option>
              <option value="tax">Perpajakan</option>
              <option value="trade">Perdagangan Internasional</option>
            </select>
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:4px;">
          <button class="btn btn-primary" onclick="runLegalSearch()">🔍 Cari Hukum</button>
          <button class="btn btn-outline btn-sm" onclick="selectAllJur()">Pilih Semua</button>
          <button class="btn btn-outline btn-sm" onclick="clearJur()">Hapus Pilihan</button>
        </div>
      </div>

      <div id="search-result-container" style="display:none;"></div>
    </div>

    <!-- DATA SOURCES SECTION -->
    <div id="section-sources" style="display:none;">
      <div style="margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Data Sources</h1>
        <p style="color:var(--muted);font-size:13px;">60+ sumber hukum terverifikasi dari organisasi internasional, pengadilan, dan badan regulasi.</p>
      </div>
      <div id="sources-summary" class="card" style="margin-bottom:20px;"></div>
      <div id="sources-list"></div>
    </div>

    <!-- SETTINGS SECTION -->
    <div id="section-settings" style="display:none;">
      <div style="margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Settings</h1>
      </div>
      <div class="card">
        <div class="card-title">API Configuration</div>
        <div class="card-sub" style="margin-bottom:16px;">Konfigurasi LLM provider dan API keys</div>
        <div class="form-group">
          <label class="form-label">API Key (X-Legal-Key)</label>
          <input class="form-input" id="settings-apikey" type="password" placeholder="Masukkan API key AXTO Legal Anda">
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveApiKey()">Simpan</button>
      </div>
      <div class="card">
        <div class="card-title">Lisensi & Platform</div>
        <div id="license-info"></div>
      </div>
    </div>

  </main>
</div>

<script>
// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  apiKey: localStorage.getItem('axto_legal_apikey') || '',
  currentWs: null,
  currentWsFile: null,
  uploadedDocs: [],
  currentDocResult: null,
  currentWsResult: null,
  selectedJurs: ['id','us','eu','uk','sg'],
};

const WORKSPACES = [
  {id:'legal-research',name:'Legal Research Hub',icon:'🔍',category:'Research',desc:'Multi-yurisdiksi, 195+ negara, citation engine, real-time regulatory'},
  {id:'compliance-center',name:'Compliance Center',icon:'📋',category:'Compliance',desc:'50+ frameworks: GDPR, ISO 27001, SOC 2, OJK, HIPAA, FATF'},
  {id:'contract-intelligence',name:'Contract Intelligence',icon:'📄',category:'Contracts',desc:'Review kontrak, ekstraksi klausul, risk scoring, redline'},
  {id:'regulatory-radar',name:'Regulatory Radar',icon:'📡',category:'Monitoring',desc:'Pantau perubahan hukum real-time di 195+ yurisdiksi'},
  {id:'due-diligence',name:'Due Diligence Suite',icon:'🏛️',category:'Corporate',desc:'M&A, investasi, dan due diligence vendor dengan matrix risiko'},
  {id:'aml-kyc',name:'AML/KYC Intelligence',icon:'🔐',category:'Financial',desc:'Screening sanksi, PEP check, AML risk scoring, FATF compliance'},
  {id:'ip-trademark',name:'IP & Trademark Center',icon:'©️',category:'IP',desc:'Trademark, patent, copyright — 200+ yurisdiksi via WIPO Lex'},
  {id:'esg-sustainability',name:'ESG & Sustainability',icon:'🌱',category:'ESG',desc:'CSRD, GRI, IFRS S1/S2, TCFD, SEC climate disclosure'},
  {id:'litigation-support',name:'Litigation Support',icon:'⚖️',category:'Litigation',desc:'Riset preseden, strategi kasus, analisis argumen'},
  {id:'labor-employment',name:'Labor & Employment',icon:'👷',category:'Employment',desc:'Hukum ketenagakerjaan 195+ negara, ILO conventions'},
  {id:'data-privacy',name:'Data Privacy Engine',icon:'🛡️',category:'Privacy',desc:'GDPR, CCPA, PDPA, UU PDP — DPIA, consent, data mapping'},
  {id:'corporate-governance',name:'Corporate Governance',icon:'🏢',category:'Corporate',desc:'Board governance, shareholder rights, multi-jurisdiction'},
  {id:'tax-fiscal',name:'Tax & Fiscal Law',icon:'📊',category:'Tax',desc:'Cross-border tax, transfer pricing, BEPS, FATCA/CRS'},
  {id:'trade-customs',name:'Trade & Customs',icon:'🌐',category:'Trade',desc:'WTO, customs, ITAR/EAR, trade remedies, HS codes'},
  {id:'real-estate',name:'Real Estate & Property',icon:'🏠',category:'Property',desc:'Property law, title review, zoning, cross-border investment'},
  {id:'dispute-resolution',name:'Dispute Resolution',icon:'🤝',category:'Arbitration',desc:'ICC, ICSID, arbitration strategy, New York Convention'},
  {id:'workflow-automation',name:'Legal Workflow',icon:'⚡',category:'Platform',desc:'Otomatisasi contract approval, NDA, vendor onboarding'},
  {id:'knowledge-center',name:'Knowledge Center',icon:'📚',category:'Platform',desc:'Private knowledge base — upload, index, query internal docs'},
];

const ALL_JURS = [
  ['id','🇮🇩 Indonesia'],['us','🇺🇸 USA'],['eu','🇪🇺 EU'],['uk','🇬🇧 UK'],
  ['sg','🇸🇬 Singapore'],['my','🇲🇾 Malaysia'],['au','🇦🇺 Australia'],
  ['de','🇩🇪 Germany'],['fr','🇫🇷 France'],['jp','🇯🇵 Japan'],
  ['cn','🇨🇳 China'],['in','🇮🇳 India'],['ae','🇦🇪 UAE'],
  ['sa','🇸🇦 Saudi Arabia'],['br','🇧🇷 Brazil'],['ca','🇨🇦 Canada'],
  ['kr','🇰🇷 Korea'],['ru','🇷🇺 Russia'],['za','🇿🇦 South Africa'],
  ['ng','🇳🇬 Nigeria'],['th','🇹🇭 Thailand'],['ph','🇵🇭 Philippines'],
  ['vn','🇻🇳 Vietnam'],['tw','🇹🇼 Taiwan'],['nz','🇳🇿 New Zealand'],
];

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildWorkspaceGrid();
  buildJurSelector();
  loadLicenseInfo();
  if (state.apiKey) document.getElementById('settings-apikey').value = state.apiKey;
});

function headers() {
  return {'Content-Type':'application/json','X-Legal-Key': state.apiKey};
}

// ── Navigation ─────────────────────────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('[id^="section-"]').forEach(s => s.style.display = 'none');
  const el = document.getElementById('section-' + name);
  if (el) el.style.display = '';
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const link = [...document.querySelectorAll('.nav-link')].find(l =>
    l.getAttribute('onclick') && l.getAttribute('onclick').includes(name));
  if (link) link.classList.add('active');

  if (name === 'sources') loadSources();
  if (name === 'settings') loadLicenseInfo();
}

// ── Workspace Grid ─────────────────────────────────────────────────────────────
function buildWorkspaceGrid() {
  const grid = document.getElementById('workspace-grid');
  grid.innerHTML = WORKSPACES.map(ws => `
    <div class="ws-card" onclick="openWorkspace('${ws.id}')">
      <div class="ws-icon">${ws.icon}</div>
      <div class="ws-name">${ws.name}</div>
      <div style="font-size:10px;color:var(--accent);font-weight:700;margin-bottom:6px;text-transform:uppercase;">${ws.category}</div>
      <div class="ws-desc">${ws.desc}</div>
    </div>
  `).join('');
}

function openWorkspace(wsId) {
  const ws = WORKSPACES.find(w => w.id === wsId);
  if (!ws) return;
  state.currentWs = wsId;
  state.currentWsFile = null;
  state.currentWsResult = null;

  document.querySelectorAll('[id^="section-"]').forEach(s => s.style.display = 'none');
  document.getElementById('section-workspace-active').style.display = '';
  document.getElementById('ws-title').textContent = ws.icon + ' ' + ws.name;
  document.getElementById('ws-subtitle').textContent = ws.desc;
  document.getElementById('ws-result-container').style.display = 'none';
  document.getElementById('ws-query').value = '';
  document.getElementById('ws-file-label').textContent = 'Lampirkan dokumen untuk dianalisis';

  // Highlight sidebar
  document.querySelectorAll('.ws-item').forEach(i => i.classList.remove('active'));
  const item = [...document.querySelectorAll('.ws-item')].find(i =>
    i.getAttribute('onclick') && i.getAttribute('onclick').includes(wsId));
  if (item) item.classList.add('active');
}

function handleWsFile(input) {
  if (input.files[0]) {
    state.currentWsFile = input.files[0];
    document.getElementById('ws-file-label').textContent = '📎 ' + input.files[0].name;
  }
}

async function runWorkspace() {
  const query = document.getElementById('ws-query').value.trim();
  if (!query) { alert('Masukkan pertanyaan atau tugas hukum.'); return; }

  const btn = document.getElementById('ws-run-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menganalisis...';
  document.getElementById('ws-result-container').style.display = 'none';

  try {
    const lang = document.getElementById('ws-lang').value;
    const jur  = document.getElementById('ws-jurisdiction').value;
    const jurisArr = jur ? [jur] : [];

    let body;
    if (state.currentWsFile) {
      const fd = new FormData();
      fd.append('file', state.currentWsFile);
      fd.append('workspace_id', state.currentWs);
      fd.append('query', query);
      fd.append('language', lang);
      if (jur) fd.append('jurisdictions', jur);
      const resp = await fetch('/api/v1/workspace/upload', {
        method:'POST',
        headers: {'X-Legal-Key': state.apiKey},
        body: fd,
      });
      body = await resp.json();
    } else {
      const resp = await fetch('/api/v1/workspace/run', {
        method:'POST',
        headers: headers(),
        body: JSON.stringify({workspace_id: state.currentWs, query, language: lang, jurisdictions: jurisArr}),
      });
      body = await resp.json();
    }

    state.currentWsResult = body;
    renderWsResult(body);
  } catch(e) {
    alert('Error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⚡ Jalankan Analisis';
  }
}

function renderWsResult(body) {
  const container = document.getElementById('ws-result-container');
  const resultBody = document.getElementById('ws-result-body');
  container.style.display = '';

  if (body.error) {
    resultBody.innerHTML = `<div class="warning-box">❌ ${body.error}<br>${body.message || ''}</div>`;
    return;
  }

  const result = body.result || body;
  let html = '';

  // Check for parse error (raw text fallback)
  if (result._parse_error || result.raw) {
    html = `<div class="result-body">${escHtml(result.raw || JSON.stringify(result, null, 2))}</div>`;
  } else {
    html = renderResultObject(result);
  }

  resultBody.innerHTML = html;

  // Disclaimer
  const disc = body.meta?.disclaimer;
  if (disc) {
    const discEl = document.getElementById('ws-disclaimer');
    discEl.style.display = '';
    discEl.textContent = disc;
  }
}

function renderResultObject(obj, depth) {
  depth = depth || 0;
  if (typeof obj === 'string') return `<p style="margin-bottom:8px;line-height:1.7;">${escHtml(obj)}</p>`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return `<span>${obj}</span>`;
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'object') return `<div style="margin-bottom:12px;padding:12px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid var(--border);">${renderResultObject(item, depth+1)}</div>`;
      return `<div style="margin-bottom:6px;padding-left:12px;border-left:2px solid var(--accent);">${escHtml(String(item))}</div>`;
    }).join('');
  }
  if (typeof obj === 'object') {
    return Object.entries(obj).map(([k, v]) => {
      if (k.startsWith('_')) return '';
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      // Detect risk level
      const isRisk = k.includes('risk') || k.includes('level') || k.includes('score');
      const riskClass = getRiskClass(v);

      return `<div style="margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">${label}</div>
        <div style="font-size:13px;color:var(--text);">
          ${isRisk && riskClass ? `<span class="risk ${riskClass}">${v}</span>` : renderResultObject(v, depth+1)}
        </div>
      </div>`;
    }).join('');
  }
  return escHtml(String(obj));
}

function getRiskClass(val) {
  const s = String(val).toUpperCase();
  if (s.includes('CRITICAL')) return 'risk-critical';
  if (s.includes('HIGH')) return 'risk-high';
  if (s.includes('MEDIUM')) return 'risk-medium';
  if (s.includes('LOW')) return 'risk-low';
  return '';
}

function clearWorkspace() {
  document.getElementById('ws-query').value = '';
  document.getElementById('ws-result-container').style.display = 'none';
  state.currentWsFile = null;
  document.getElementById('ws-file-label').textContent = 'Lampirkan dokumen untuk dianalisis';
}

// ── Documents ──────────────────────────────────────────────────────────────────
function handleDocDrop(event) {
  event.preventDefault();
  document.getElementById('doc-upload-zone').classList.remove('drag');
  handleDocFiles(event.dataTransfer.files);
}

function handleDocFiles(files) {
  state.uploadedDocs = [...files];
  const queue = document.getElementById('doc-queue');
  if (!files.length) return;

  queue.innerHTML = [...files].map(f => `
    <div class="file-item">
      <div class="file-icon">${f.name.endsWith('.pdf') ? '📕' : f.name.endsWith('.docx') ? '📘' : '📄'}</div>
      <div class="file-info">
        <div class="file-name">${f.name}</div>
        <div class="file-meta">${(f.size/1024/1024).toFixed(2)} MB</div>
      </div>
      <span style="color:var(--success);font-size:12px;">✓ Siap</span>
    </div>
  `).join('');

  document.getElementById('doc-analyze-btn').disabled = false;
}

async function analyzeDocuments() {
  if (!state.uploadedDocs.length) return;
  const btn = document.getElementById('doc-analyze-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menganalisis...';
  document.getElementById('doc-result-container').style.display = 'none';

  try {
    const fd = new FormData();
    fd.append('file', state.uploadedDocs[0]);
    fd.append('analysis_type', document.getElementById('doc-analysis-type').value);
    fd.append('language', document.getElementById('doc-lang').value);
    fd.append('extra_context', document.getElementById('doc-context').value);

    const resp = await fetch('/api/v1/documents/analyze', {
      method: 'POST',
      headers: {'X-Legal-Key': state.apiKey},
      body: fd,
    });
    const data = await resp.json();
    state.currentDocResult = data;

    const container = document.getElementById('doc-result-container');
    const body = document.getElementById('doc-result-body');
    container.style.display = '';

    if (data.error) {
      body.innerHTML = `<div class="warning-box">❌ ${data.error}</div>`;
    } else {
      const result = data.result || data;
      body.innerHTML = renderResultObject(result);
    }
  } catch(e) {
    alert('Error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔍 Analisis Dokumen';
  }
}

async function downloadDocResult(format) {
  if (!state.currentDocResult) return;
  downloadAnalysisResult(state.currentDocResult, format, 'Document-Analysis');
}

async function downloadResult(format) {
  if (!state.currentWsResult) return;
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(state.currentWsResult, null, 2)], {type:'application/json'});
    downloadBlob(blob, `axto-legal-${state.currentWs}-${Date.now()}.json`);
    return;
  }
  await downloadAnalysisResult(state.currentWsResult, format, state.currentWs);
}

async function downloadAnalysisResult(data, format, name) {
  try {
    const resp = await fetch('/api/v1/documents/export', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({analysis: data, format, title: name, language: 'id'}),
    });
    const contentType = resp.headers.get('content-type') || '';
    const blob = await resp.blob();
    const ext = format === 'pdf' ? 'pdf' : format === 'docx' ? 'docx' : 'txt';
    downloadBlob(blob, `axto-legal-${name}-${Date.now()}.${ext}`);
  } catch(e) {
    alert('Download gagal: ' + e.message);
  }
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// ── Legal Search ───────────────────────────────────────────────────────────────
function buildJurSelector() {
  const sel = document.getElementById('jur-selector');
  if (!sel) return;
  sel.innerHTML = ALL_JURS.map(([code, label]) =>
    `<span class="jur-tag ${state.selectedJurs.includes(code) ? 'selected' : ''}"
      onclick="toggleJur('${code}',this)">${label}</span>`
  ).join('');
}

function toggleJur(code, el) {
  if (state.selectedJurs.includes(code)) {
    state.selectedJurs = state.selectedJurs.filter(j => j !== code);
    el.classList.remove('selected');
  } else {
    state.selectedJurs.push(code);
    el.classList.add('selected');
  }
}

function selectAllJur() {
  state.selectedJurs = ALL_JURS.map(([c]) => c);
  buildJurSelector();
}

function clearJur() {
  state.selectedJurs = [];
  buildJurSelector();
}

async function runLegalSearch() {
  const query = document.getElementById('search-query').value.trim();
  if (!query) { alert('Masukkan pertanyaan hukum.'); return; }
  if (!state.selectedJurs.length) { alert('Pilih minimal satu yurisdiksi.'); return; }

  const container = document.getElementById('search-result-container');
  container.style.display = '';
  container.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><div class="spinner" style="width:32px;height:32px;margin:0 auto 12px;"></div><div style="color:var(--muted);font-size:13px;">Mencari di ${state.selectedJurs.length} yurisdiksi...</div></div>`;

  try {
    const lang  = document.getElementById('search-lang').value;
    const topic = document.getElementById('search-topic').value;
    const resp  = await fetch('/api/v1/search', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        query,
        jurisdictions: state.selectedJurs,
        language: lang,
        topic_hints: topic ? [topic] : null,
      }),
    });
    const data = await resp.json();

    let html = `<div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="font-size:15px;font-weight:700;color:#fff;">Hasil Riset Hukum</div>
        <div style="margin-left:auto;"><span class="badge">${state.selectedJurs.length} yurisdiksi</span></div>
      </div>`;

    if (data.error) {
      html += `<div class="warning-box">❌ ${data.error}</div>`;
    } else {
      html += renderResultObject(data);
    }

    html += `<div class="disclaimer-box">⚖️ Hasil riset ini disediakan sebagai informasi hukum, bukan nasihat hukum. Selalu verifikasi dengan sumber resmi dan konsultasikan dengan pengacara untuk keputusan hukum penting. © 2024-2026 AXTO Legal</div></div>`;
    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = `<div class="card"><div class="warning-box">❌ Error: ${e.message}</div></div>`;
  }
}

// ── Data Sources ───────────────────────────────────────────────────────────────
async function loadSources() {
  const summaryEl = document.getElementById('sources-summary');
  const listEl    = document.getElementById('sources-list');
  summaryEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Loading...</div>';

  try {
    const resp = await fetch('/api/v1/sources', {headers: headers()});
    const data = await resp.json();

    const summ = data.summary || {};
    summaryEl.innerHTML = `
      <div class="grid-3" style="gap:16px;">
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#fff;">${summ.total_sources || 0}</div>
          <div style="font-size:12px;color:var(--muted);">Total Sumber</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:900;color:var(--success);">${summ.verified || 0}</div>
          <div style="font-size:12px;color:var(--muted);">Terverifikasi</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:900;color:var(--warn);">${summ.needs_verification || 0}</div>
          <div style="font-size:12px;color:var(--muted);">Perlu Verifikasi</div>
        </div>
      </div>
      <div class="disclaimer-box" style="margin-top:16px;">${summ.disclaimer || ''}</div>
    `;

    const sources = data.sources || [];
    if (!sources.length) { listEl.innerHTML = ''; return; }

    // Group by category
    const byCategory = {};
    sources.forEach(s => {
      const cat = s._category || 'other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(s);
    });

    const catLabels = {
      intl:'Organisasi Internasional', financial:'Regulator Keuangan',
      courts:'Pengadilan & Yudisial', standards:'Badan Standar',
      privacy:'Privasi & Keamanan Siber', open_data:'Open Data Portal',
      licensed:'Database Berlangganan', gap_sources:'Gap Sources (Perlu Perhatian)',
    };

    listEl.innerHTML = Object.entries(byCategory).map(([cat, sources]) => `
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">${catLabels[cat] || cat}</div>
        ${sources.map(s => `
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;margin-bottom:6px;display:flex;align-items:start;gap:12px;">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-size:13px;font-weight:700;color:#fff;">${s.name}</span>
                <span style="font-size:10px;background:rgba(255,255,255,.06);color:var(--muted);padding:2px 7px;border-radius:4px;">${s.country || 'Global'}</span>
                ${s.avail === 'yes' ? '<span style="font-size:10px;color:var(--success);font-weight:700;">✅ API tersedia</span>' :
                  s.avail === 'partial' ? '<span style="font-size:10px;color:var(--warn);font-weight:700;">⚠️ Sebagian</span>' :
                  '<span style="font-size:10px;color:var(--danger);font-weight:700;">❌ Perlu crawler</span>'}
                ${!s.verified ? '<span style="font-size:10px;color:var(--warn);font-weight:700;">⚠️ Perlu verifikasi</span>' : ''}
              </div>
              <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">${s.desc || ''}</div>
              ${s.notes ? `<div style="font-size:11px;color:var(--warn);margin-top:4px;">${s.notes}</div>` : ''}
              ${s.links ? s.links.slice(0,2).map(l => `
                <a href="${l.url}" target="_blank" style="font-size:11px;color:var(--accent);margin-right:10px;">${l.note || l.url}</a>
              `).join('') : ''}
            </div>
            <span style="font-size:10px;background:rgba(13,148,136,.1);color:var(--accent);padding:3px 8px;border-radius:20px;white-space:nowrap;">${s.auth || 'open'}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  } catch(e) {
    summaryEl.innerHTML = `<div class="warning-box">Gagal memuat sumber: ${e.message}</div>`;
  }
}

// ── License & Settings ─────────────────────────────────────────────────────────
async function loadLicenseInfo() {
  try {
    const resp = await fetch('/api/v1/license', {headers: headers()});
    const data = await resp.json();

    const badgeEl = document.getElementById('plan-badge');
    if (badgeEl) badgeEl.textContent = data.plan ? data.plan.toUpperCase() : 'ACTIVE';

    const infoEl = document.getElementById('license-info');
    if (infoEl) infoEl.innerHTML = `
      <div class="grid-2" style="gap:12px;margin-top:12px;">
        <div><div class="form-label">Status</div><div style="color:${data.valid ? 'var(--success)' : 'var(--danger)'};">${data.valid ? '✅ Aktif' : '❌ Tidak valid'}</div></div>
        <div><div class="form-label">Plan</div><div style="color:#fff;font-weight:700;">${data.plan || '-'}</div></div>
        <div><div class="form-label">Client</div><div style="color:var(--muted);">${data.client_name || '-'}</div></div>
        <div><div class="form-label">Berlaku hingga</div><div style="color:var(--muted);">${data.expires_at ? data.expires_at.split('T')[0] : '-'}</div></div>
        <div><div class="form-label">Max Dokumen/hari</div><div style="color:var(--muted);">${data.max_documents > 0 ? data.max_documents : 'Unlimited'}</div></div>
        <div><div class="form-label">Platform</div><div style="color:var(--muted);">AXTO Legal</div></div>
      </div>
    `;
  } catch(e) {}
}

function saveApiKey() {
  const key = document.getElementById('settings-apikey').value.trim();
  state.apiKey = key;
  localStorage.setItem('axto_legal_apikey', key);
  alert('API Key disimpan.');
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Auto-load plan badge
loadLicenseInfo();
</script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
@app.get("/app", response_class=HTMLResponse)
async def web_ui():
    return HTMLResponse(WEB_UI_HTML)


# ══════════════════════════════════════════════════════════════════════════════
# REST API ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status":   "ok",
        "product":  PRODUCT_NAME,
        "version":  PRODUCT_VERSION,
        "author":   PRODUCT_AUTHOR,
        "vendor":   "AXTO (axto.io)",
        "license":  {
            "valid":      getattr(_license_state, "valid", False),
            "plan":       getattr(_license_state, "plan", ""),
            "expires_at": getattr(_license_state, "expires_at", ""),
        },
        "llm":      {"provider": cfg.llm_provider, "model": cfg.llm_model},
        "workspaces": 18,
        "jurisdictions": "195+",
        "frameworks": "50+",
    }


@app.get("/api/v1/license")
async def license_api(_: str = Depends(verify_key)):
    if not _license_state:
        return {"valid": False}
    return {
        "valid":         _license_state.valid,
        "plan":          _license_state.plan,
        "client_name":   _license_state.client_name,
        "expires_at":    _license_state.expires_at,
        "max_documents": getattr(_license_state, "max_documents", 0),
        "product":       PRODUCT_CODE if hasattr(_license_state, "product") else "legal",
    }


# ── Workspaces ────────────────────────────────────────────────────────────────
@app.get("/api/v1/workspaces")
async def list_workspaces(_: str = Depends(verify_key)):
    from src.core.workspaces import WORKSPACES
    allowed = getattr(_license_state, "workspaces", 5) or 5
    total   = len(WORKSPACES)
    unlocked_all = allowed == -1 or allowed >= total
    out = {}
    for i, (wid, ws) in enumerate(WORKSPACES.items()):
        out[wid] = {**ws, "locked": not (unlocked_all or i < allowed)}
    return {
        "workspaces":          out,
        "licensed_workspaces": total if unlocked_all else allowed,
        "total_workspaces":    total,
    }


class WorkspaceRunRequest(BaseModel):
    workspace_id: str
    query:        str
    language:     str  = "id"
    jurisdictions: List[str] = []
    context:      dict = {}


@app.post("/api/v1/workspace/run")
async def workspace_run(req: WorkspaceRunRequest, _: str = Depends(verify_key)):
    _require_workspace_licensed(req.workspace_id)
    _check_limit()
    from src.core.workspaces import run_workspace
    return await run_workspace(
        req.workspace_id, req.query, req.language,
        req.jurisdictions, context=req.context,
    )


@app.post("/api/v1/workspace/upload")
async def workspace_upload(
    file:         UploadFile = File(...),
    workspace_id: str  = Form("legal-research"),
    query:        str  = Form(""),
    language:     str  = Form("id"),
    jurisdictions: str = Form(""),
    _: str = Depends(verify_key),
):
    _require_workspace_licensed(workspace_id)
    _check_limit()
    content  = await file.read()
    size_mb  = len(content) / 1024 / 1024
    if size_mb > cfg.max_upload_mb:
        raise HTTPException(413, f"File terlalu besar ({size_mb:.1f} MB). Maks {cfg.max_upload_mb} MB.")

    from src.core.documents import extract_text
    text, meta = extract_text(file.filename or "document", content)

    from src.core.workspaces import run_workspace
    jur_list = [j.strip() for j in jurisdictions.split(",") if j.strip()] if jurisdictions else []
    result   = await run_workspace(workspace_id, query, language, jur_list, document_text=text)
    result["document_meta"] = meta
    return result


# ── Document Analysis ─────────────────────────────────────────────────────────
@app.post("/api/v1/documents/analyze")
async def analyze_document(
    file:          UploadFile = File(...),
    analysis_type: str = Form("contract_review"),
    language:      str = Form("id"),
    jurisdiction:  Optional[str] = Form(None),
    extra_context: str = Form(""),
    _: str = Depends(verify_key),
):
    _check_limit()
    content = await file.read()
    if len(content) > cfg.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"File terlalu besar. Maks {cfg.max_upload_mb} MB.")

    from src.core.documents import extract_text
    from src.core.workspaces import run_workspace

    text, meta = extract_text(file.filename or "document", content)
    if not text.strip():
        raise HTTPException(422, "Tidak dapat mengekstrak teks. Pastikan file tidak berupa scan gambar tanpa OCR.")

    # Map analysis_type → workspace_id
    ws_map = {
        "contract_review":   "contract-intelligence",
        "compliance_check":  "compliance-center",
        "clause_extraction": "contract-intelligence",
        "legal_research":    "legal-research",
    }
    ws_id  = ws_map.get(analysis_type, "legal-research")
    _require_workspace_licensed(ws_id)
    jurs   = [jurisdiction] if jurisdiction else []
    query  = extra_context or f"Please perform a thorough {analysis_type.replace('_', ' ')} of this document."

    result = await run_workspace(ws_id, query, language, jurs, document_text=text)
    result["document_meta"] = meta
    result["filename"]      = file.filename
    return result


class ExportRequest(BaseModel):
    analysis: dict
    format:   str   = "pdf"
    title:    str   = "AXTO Legal Analysis"
    language: str   = "id"


@app.post("/api/v1/documents/export")
async def export_document(req: ExportRequest, _: str = Depends(verify_key)):
    from src.core.documents import generate_pdf_report, generate_docx_report

    doc_meta = req.analysis.get("document_meta", {})

    if req.format == "pdf":
        content  = generate_pdf_report(req.title, req.analysis, doc_meta, cfg.output_path, req.language)
        ct       = "application/pdf"
        filename = f"axto-legal-{req.title.replace(' ', '-')}-{int(time.time())}.pdf"
    elif req.format == "docx":
        content  = generate_docx_report(req.title, req.analysis, doc_meta)
        ct       = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"axto-legal-{req.title.replace(' ', '-')}-{int(time.time())}.docx"
    else:
        import json
        content  = json.dumps(req.analysis, indent=2, ensure_ascii=False).encode("utf-8")
        ct       = "application/json"
        filename = f"axto-legal-{req.title.replace(' ', '-')}-{int(time.time())}.json"

    return Response(
        content=content,
        media_type=ct,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Legal Search ──────────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query:         str
    jurisdictions: List[str] = ["id", "us", "eu"]
    language:      str  = "id"
    topic_hints:   Optional[List[str]] = None
    since_days:    int  = 30


@app.post("/api/v1/search")
async def legal_search(req: SearchRequest, _: str = Depends(verify_key)):
    _check_limit()
    from src.core.workspaces import run_workspace
    from src.core.regulatory import get_radar

    jur_names = []
    try:
        radar = get_radar()
        jur_names = [radar.get_country_info(j)["name"] for j in req.jurisdictions]
    except Exception:
        jur_names = req.jurisdictions

    query = req.query
    if req.topic_hints:
        query += f"\n\nTopik fokus: {', '.join(req.topic_hints)}"

    return await run_workspace(
        "legal-research", query, req.language, req.jurisdictions
    )


# ── Regulatory Radar ─────────────────────────────────────────────────────────
@app.post("/api/v1/regulatory/updates")
async def regulatory_updates(
    jurisdictions: List[str] = None,
    topic:         str = "",
    since_days:    int = 30,
    language:      str = "id",
    _: str = Depends(verify_key),
):
    _check_limit()
    from src.core.regulatory import get_radar
    radar   = get_radar()
    updates = await radar.search_recent_updates(
        jurisdictions or ["id", "us", "eu", "uk"],
        topic, since_days
    )
    return {
        "updates":    updates,
        "count":      len(updates),
        "disclaimer": "Informasi pembaruan regulasi berasal dari pengetahuan model AI dan mungkin tidak mencerminkan perubahan terkini. Selalu verifikasi dengan sumber resmi.",
    }


@app.get("/api/v1/regulatory/frameworks")
async def list_frameworks(
    domain: Optional[str] = None,
    region: Optional[str] = None,
    _: str = Depends(verify_key),
):
    from src.core.regulatory import get_radar
    return {"frameworks": get_radar().get_frameworks(domain, region)}


@app.get("/api/v1/regulatory/law/{jurisdiction}")
async def law_info(jurisdiction: str, law: str, language: str = "id", _: str = Depends(verify_key)):
    from src.core.regulatory import get_radar
    return await get_radar().get_law_summary(law, jurisdiction, language)


# ── Data Sources (BYOD Connector Registry) ───────────────────────────────────
@app.get("/api/v1/sources")
async def list_sources(
    category:       Optional[str] = None,
    country:        Optional[str] = None,
    verified_only:  bool = False,
    _: str = Depends(verify_key),
):
    from src.core.connectors import get_registry
    reg     = get_registry()
    all_src = reg.get_all_sources()

    sources = list(all_src.values())
    if category:
        sources = [s for s in sources if s.get("_category") == category]
    if country:
        sources = [s for s in sources if country.lower() in s.get("country", "").lower()]
    if verified_only:
        sources = [s for s in sources if s.get("verified", False)]

    return {
        "sources": [reg.enrich_source(s) for s in sources],
        "summary": reg.get_summary(),
    }


@app.get("/api/v1/sources/{source_id}/health")
async def source_health(source_id: str, _: str = Depends(verify_key)):
    from src.core.connectors import get_fetcher
    return await get_fetcher().health_check(source_id)


# ── Jurisdictions ────────────────────────────────────────────────────────────
@app.get("/api/v1/jurisdictions")
async def list_jurisdictions(_: str = Depends(verify_key)):
    from src.core.regulatory import get_radar
    return {"jurisdictions": get_radar().get_all_countries()}


@app.get("/api/v1/jurisdictions/{code}")
async def jurisdiction_info(code: str, _: str = Depends(verify_key)):
    from src.core.regulatory import get_radar
    return get_radar().get_country_info(code)


# ── Legal knowledge: curated free sources, free AI providers, research prompts ─
@app.get("/api/v1/legal-sources")
async def legal_sources(jurisdiction: str = "", _: str = Depends(verify_key)):
    from src.core.legal_knowledge import LEGAL_SOURCES, sources_for
    if jurisdiction:
        return {"jurisdiction": jurisdiction, "sources": sources_for(jurisdiction)}
    return {"sources": LEGAL_SOURCES}


@app.get("/api/v1/free-ai-providers")
async def free_ai_providers(_: str = Depends(verify_key)):
    from src.core.legal_knowledge import free_providers
    return {"providers": free_providers(),
            "note": "BYOK — bring your own free key. Nothing is shared with AXTO. Ollama runs fully offline."}


@app.get("/api/v1/research-prompts")
async def research_prompts(_: str = Depends(verify_key)):
    from src.core.legal_knowledge import RESEARCH_PROMPTS
    return {"prompts": [{"id": p["id"], "title": p["title"], "prompt": p["prompt"]} for p in RESEARCH_PROMPTS]}


@app.post("/api/v1/research-prompts/{prompt_id}")
async def render_research_prompt(prompt_id: str, payload: dict, _: str = Depends(verify_key)):
    from src.core.legal_knowledge import render_prompt
    text = render_prompt(prompt_id, **(payload or {}))
    if not text:
        return {"error": "unknown prompt id"}
    return {"id": prompt_id, "rendered": text}


# ── LLM Stats ────────────────────────────────────────────────────────────────
@app.get("/api/v1/llm/stats")
async def llm_stats(_: str = Depends(verify_key)):
    try:
        from src.core.llm import get_llm
        return get_llm().stats()
    except Exception:
        return {"provider": cfg.llm_provider, "model": cfg.llm_model}


# ── Error handler ─────────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    logger.error("Unhandled error at %s: %s", request.url, exc)
    return JSONResponse({"error": "Internal server error"}, status_code=500)


PRODUCT_CODE = "legal"
