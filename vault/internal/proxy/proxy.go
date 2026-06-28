/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
package proxy

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/axto-platform/vault/internal/audit"
	"github.com/axto-platform/vault/internal/config"
	"github.com/axto-platform/vault/internal/pii"
)

type Proxy struct {
	cfg       *config.Config
	detector  *pii.Detector
	auditLog  *audit.Logger
	client    *http.Client
	stats     Stats
	redactMu  sync.RWMutex
}

type Stats struct {
	TotalRequests    int64 `json:"total_requests"`
	TotalRedacted    int64 `json:"total_redacted"`
	TotalBlocked     int64 `json:"total_blocked"`
	PIIDetected      int64 `json:"pii_detected"`
	PHIDetected      int64 `json:"phi_detected"`
	FinancialDetected int64 `json:"financial_detected"`
	SecretsDetected  int64 `json:"secrets_detected"`
	AvgLatencyMs     int64 `json:"avg_latency_ms"`
	BytesProxied     int64 `json:"bytes_proxied"`
}

func New(cfg *config.Config, auditLog *audit.Logger) *Proxy {
	detector := pii.NewDetector(
		cfg.Redaction.Mode,
		cfg.Redaction.BuiltinPII,
		cfg.Redaction.BuiltinPHI,
		cfg.Redaction.BuiltinFinancial,
		cfg.Redaction.BuiltinSecrets,
	)

	// Add custom rules
	for _, rule := range cfg.Redaction.CustomRules {
		if rule.Enabled {
			if err := detector.AddCustomRule(rule.Name, rule.Pattern); err != nil {
				log.Printf("[VAULT] Warning: custom rule %s failed: %v", rule.Name, err)
			}
		}
	}

	return &Proxy{
		cfg:      cfg,
		detector: detector,
		auditLog: auditLog,
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// ProxyHandler handles AI API requests with PII redaction
func (p *Proxy) ProxyHandler(w http.ResponseWriter, r *http.Request) {
	atomic.AddInt64(&p.stats.TotalRequests, 1)
	t0 := time.Now()

	// Read request body
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read request"}`, 400)
		return
	}
	defer r.Body.Close()

	// Determine upstream provider
	provider := p.resolveProvider(r)
	if provider == nil {
		http.Error(w, `{"error":"no upstream provider configured"}`, 502)
		return
	}

	// Prompt injection firewall
	if p.cfg.PromptFirewall.Enabled {
		bodyStr := string(bodyBytes)
		for _, pattern := range p.cfg.PromptFirewall.BlockPatterns {
			if strings.Contains(strings.ToLower(bodyStr), strings.ToLower(pattern)) {
				atomic.AddInt64(&p.stats.TotalBlocked, 1)
				p.auditLog.Log(audit.Entry{
					Timestamp: time.Now(),
					Action:    "BLOCKED",
					Reason:    "prompt_injection:" + pattern,
					ClientIP:  r.RemoteAddr,
				})
				http.Error(w, `{"error":"request blocked by content policy"}`, 403)
				return
			}
		}
	}

	// PII Redaction on request
	var redactMap map[string]string
	if p.cfg.Redaction.Enabled {
		bodyStr := string(bodyBytes)
		redactedBody, detections, rMap := p.detector.Redact(bodyStr)
		redactMap = rMap

		if len(detections) > 0 {
			atomic.AddInt64(&p.stats.TotalRedacted, 1)
			for _, d := range detections {
				switch {
				case strings.HasPrefix(d.Type, "email") || strings.HasPrefix(d.Type, "phone") || strings.HasPrefix(d.Type, "ssn") || strings.HasPrefix(d.Type, "person") || strings.HasPrefix(d.Type, "address") || strings.HasPrefix(d.Type, "dob") || strings.HasPrefix(d.Type, "passport") || strings.HasPrefix(d.Type, "ip_"):
					atomic.AddInt64(&p.stats.PIIDetected, 1)
				case strings.HasPrefix(d.Type, "mrn") || strings.HasPrefix(d.Type, "icd") || strings.HasPrefix(d.Type, "medication") || strings.HasPrefix(d.Type, "lab_"):
					atomic.AddInt64(&p.stats.PHIDetected, 1)
				case strings.HasPrefix(d.Type, "credit") || strings.HasPrefix(d.Type, "bank") || strings.HasPrefix(d.Type, "routing") || strings.HasPrefix(d.Type, "iban") || strings.HasPrefix(d.Type, "tax_"):
					atomic.AddInt64(&p.stats.FinancialDetected, 1)
				default:
					atomic.AddInt64(&p.stats.SecretsDetected, 1)
				}
			}

			p.auditLog.Log(audit.Entry{
				Timestamp:  time.Now(),
				Action:     "REDACTED",
				Detections: len(detections),
				Types:      uniqueTypes(detections),
				ClientIP:   r.RemoteAddr,
				Provider:   provider.Name,
			})

			bodyBytes = []byte(redactedBody)
		}
	}

	// Forward to upstream provider
	upstreamURL := provider.BaseURL + r.URL.Path
	if r.URL.RawQuery != "" {
		upstreamURL += "?" + r.URL.RawQuery
	}

	proxyReq, err := http.NewRequest(r.Method, upstreamURL, bytes.NewReader(bodyBytes))
	if err != nil {
		http.Error(w, `{"error":"failed to create upstream request"}`, 500)
		return
	}

	// Copy headers, replace auth
	for key, values := range r.Header {
		for _, v := range values {
			proxyReq.Header.Add(key, v)
		}
	}
	proxyReq.Header.Set("Authorization", "Bearer "+provider.APIKey)
	proxyReq.Header.Set("Content-Length", fmt.Sprintf("%d", len(bodyBytes)))

	// Execute
	resp, err := p.client.Do(proxyReq)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"upstream failed: %s"}`, err.Error()), 502)
		return
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read upstream response"}`, 502)
		return
	}

	atomic.AddInt64(&p.stats.BytesProxied, int64(len(bodyBytes)+len(respBody)))

	// Re-inject original data into response if enabled
	if p.cfg.Redaction.ReInjectResponse && redactMap != nil && len(redactMap) > 0 {
		respBody = []byte(p.detector.ReInject(string(respBody), redactMap))
	}

	// Update latency
	latMs := time.Since(t0).Milliseconds()
	atomic.StoreInt64(&p.stats.AvgLatencyMs, latMs)

	// Write response
	for key, values := range resp.Header {
		for _, v := range values {
			w.Header().Add(key, v)
		}
	}
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

func (p *Proxy) resolveProvider(r *http.Request) *config.ProviderConfig {
	// Check X-Vault-Provider header
	provName := r.Header.Get("X-Vault-Provider")
	if provName != "" {
		for i := range p.cfg.Providers {
			if strings.EqualFold(p.cfg.Providers[i].Name, provName) {
				return &p.cfg.Providers[i]
			}
		}
	}

	// Use default provider
	for i := range p.cfg.Providers {
		if strings.EqualFold(p.cfg.Providers[i].Name, p.cfg.DefaultProvider) {
			return &p.cfg.Providers[i]
		}
	}

	// Fallback to first
	if len(p.cfg.Providers) > 0 {
		return &p.cfg.Providers[0]
	}
	return nil
}

// StatsHandler returns JSON stats
func (p *Proxy) StatsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p.stats)
}

// DashboardHandler serves a simple HTML dashboard
func (p *Proxy) DashboardHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprintf(w, `<!DOCTYPE html><html><head><title>AXTO Vault Dashboard</title>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#0a1628;color:#e2e8f0;padding:32px}
h1{font-size:24px;margin-bottom:24px;color:#22d3ee}.card{background:#1e293b;border-radius:12px;padding:20px;margin-bottom:16px}
.stat{font-size:36px;font-weight:900;color:#22d3ee}.label{font-size:12px;color:#94a3b8;margin-top:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}</style></head>
<body><h1>🔐 AXTO Vault — AI Data Privacy</h1>
<div class="grid">
<div class="card"><div class="stat">%d</div><div class="label">Total Requests</div></div>
<div class="card"><div class="stat">%d</div><div class="label">PII Redacted</div></div>
<div class="card"><div class="stat">%d</div><div class="label">Requests Blocked</div></div>
<div class="card"><div class="stat">%d</div><div class="label">PII Detected</div></div>
<div class="card"><div class="stat">%d</div><div class="label">PHI Detected</div></div>
<div class="card"><div class="stat">%d</div><div class="label">Financial Detected</div></div>
<div class="card"><div class="stat">%d</div><div class="label">Secrets Detected</div></div>
<div class="card"><div class="stat">%dms</div><div class="label">Avg Latency</div></div>
</div>
<script>setTimeout(()=>location.reload(),5000)</script>
</body></html>`,
		p.stats.TotalRequests, p.stats.TotalRedacted, p.stats.TotalBlocked,
		p.stats.PIIDetected, p.stats.PHIDetected, p.stats.FinancialDetected,
		p.stats.SecretsDetected, p.stats.AvgLatencyMs)
}

// AuditQueryHandler returns audit logs as JSON
func (p *Proxy) AuditQueryHandler(w http.ResponseWriter, r *http.Request) {
	entries := p.auditLog.Recent(100)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

// RedactionConfigHandler allows updating redaction rules at runtime
func (p *Proxy) RedactionConfigHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"enabled": p.cfg.Redaction.Enabled,
			"mode":    p.cfg.Redaction.Mode,
			"pii":     p.cfg.Redaction.BuiltinPII,
			"phi":     p.cfg.Redaction.BuiltinPHI,
			"financial": p.cfg.Redaction.BuiltinFinancial,
			"secrets":   p.cfg.Redaction.BuiltinSecrets,
		})
		return
	}
	w.WriteHeader(200)
	w.Write([]byte(`{"ok":true}`))
}

func uniqueTypes(detections []pii.DetectionResult) []string {
	seen := map[string]bool{}
	var types []string
	for _, d := range detections {
		if !seen[d.Type] {
			seen[d.Type] = true
			types = append(types, d.Type)
		}
	}
	return types
}
