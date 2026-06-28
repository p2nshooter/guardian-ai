/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/axto-platform/vault/internal/config"
	"github.com/axto-platform/vault/internal/license"
	"github.com/axto-platform/vault/internal/proxy"
	"github.com/axto-platform/vault/internal/audit"
)

const version = "1.0.0"

func main() {
	fmt.Printf(`
   ╔══════════════════════════════════════╗
   ║   AXTO Vault — AI Data Privacy      ║
   ║   v%s                            ║
   ╚══════════════════════════════════════╝
`, version)

	// Load configuration
	cfgPath := os.Getenv("VAULT_CONFIG")
	if cfgPath == "" {
		cfgPath = "/vault/config/vault.yml"
	}

	cfg, err := config.Load(cfgPath)
	if err != nil {
		log.Fatalf("[VAULT] Failed to load config: %v", err)
	}

	// Validate license
	lic, err := license.Validate(cfg.LicenseKey, cfg.LicenseValidateURL)
	if err != nil {
		log.Fatalf("[VAULT] License validation failed: %v", err)
	}
	log.Printf("[VAULT] License valid: %s (tier: %s, expires: %s)", lic.ID, lic.Tier, lic.ExpiresAt)

	// Initialize audit logger
	auditLog, err := audit.NewLogger(cfg.AuditPath)
	if err != nil {
		log.Fatalf("[VAULT] Failed to initialize audit: %v", err)
	}
	defer auditLog.Close()

	// Create proxy handler
	p := proxy.New(cfg, auditLog)

	// Health endpoint
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","version":"%s","license":"%s","tier":"%s","uptime_s":%d}`,
			version, lic.ID[:8]+"...", lic.Tier, int(time.Since(startTime).Seconds()))
	})

	// Vault dashboard (simple stats page)
	mux.HandleFunc("/dashboard", p.DashboardHandler)

	// API routes
	mux.HandleFunc("/v1/", p.ProxyHandler)           // OpenAI-compatible proxy
	mux.HandleFunc("/audit/", p.AuditQueryHandler)    // Audit log query
	mux.HandleFunc("/stats", p.StatsHandler)          // Real-time stats JSON
	mux.HandleFunc("/config/redaction", p.RedactionConfigHandler) // Update redaction rules

	// Catch-all proxy for any AI provider endpoint
	mux.HandleFunc("/", p.ProxyHandler)

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	server := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  120 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  300 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		log.Println("[VAULT] Shutting down gracefully...")
		server.Close()
	}()

	log.Printf("[VAULT] Listening on %s", addr)
	log.Printf("[VAULT] Proxy: http://%s/v1/chat/completions", addr)
	log.Printf("[VAULT] Dashboard: http://%s/dashboard", addr)
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("[VAULT] Server error: %v", err)
	}
}

var startTime = time.Now()
