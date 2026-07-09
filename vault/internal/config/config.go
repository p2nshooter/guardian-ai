/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type RedactionRule struct {
	Name    string `yaml:"name"`
	Pattern string `yaml:"pattern"`
	Replace string `yaml:"replace"`
	Enabled bool   `yaml:"enabled"`
}

type ProviderConfig struct {
	Name    string `yaml:"name"`
	BaseURL string `yaml:"base_url"`
	APIKey  string `yaml:"api_key"`
}

type Config struct {
	LicenseKey         string           `yaml:"license_key"`
	LicenseValidateURL string           `yaml:"license_validate_url"`
	Host               string           `yaml:"host"`
	Port               int              `yaml:"port"`
	LogLevel           string           `yaml:"log_level"`
	AuditPath          string           `yaml:"audit_path"`

	// Upstream AI providers (BYOK)
	Providers []ProviderConfig `yaml:"providers"`

	// Default upstream (if client doesn't specify)
	DefaultProvider string `yaml:"default_provider"`

	// Redaction rules
	Redaction struct {
		Enabled          bool            `yaml:"enabled"`
		Mode             string          `yaml:"mode"` // "redact", "hash", "mask"
		CustomRules      []RedactionRule `yaml:"custom_rules"`
		BuiltinPII       bool            `yaml:"builtin_pii"`       // names, emails, phones, SSN, passport
		BuiltinPHI       bool            `yaml:"builtin_phi"`       // medical records, diagnoses, prescriptions
		BuiltinFinancial bool            `yaml:"builtin_financial"` // credit cards, bank accounts, tax IDs
		BuiltinSecrets   bool            `yaml:"builtin_secrets"`   // API keys, passwords, tokens
		ReInjectResponse bool            `yaml:"re_inject_response"` // restore original data in response
	} `yaml:"redaction"`

	// Rate limiting
	RateLimit struct {
		Enabled       bool `yaml:"enabled"`
		RequestsPerMin int  `yaml:"requests_per_min"`
		TokensPerMin   int  `yaml:"tokens_per_min"`
	} `yaml:"rate_limit"`

	// Prompt injection firewall
	PromptFirewall struct {
		Enabled        bool     `yaml:"enabled"`
		BlockPatterns  []string `yaml:"block_patterns"`
		AlertOnBlock   bool     `yaml:"alert_on_block"`
	} `yaml:"prompt_firewall"`

	// Content filtering
	ContentFilter struct {
		Enabled       bool     `yaml:"enabled"`
		BlockTopics   []string `yaml:"block_topics"`
		AllowTopics   []string `yaml:"allow_topics"`
	} `yaml:"content_filter"`

	// Alerts
	Alerts struct {
		SlackWebhook   string `yaml:"slack_webhook"`
		DiscordWebhook string `yaml:"discord_webhook"`
		EmailTo        string `yaml:"email_to"`
		WebhookURL     string `yaml:"webhook_url"`
	} `yaml:"alerts"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	// Expand environment variables
	expanded := os.ExpandEnv(string(data))

	cfg := &Config{
		Host:               "0.0.0.0",
		Port:               8443,
		LogLevel:           "INFO",
		AuditPath:          "/vault/data/audit",
		LicenseValidateURL: "https://axto.io/api/license-validate",
	}

	if err := yaml.Unmarshal([]byte(expanded), cfg); err != nil {
		return nil, err
	}

	// Defaults
	if cfg.Redaction.Mode == "" {
		cfg.Redaction.Mode = "redact"
	}

	return cfg, nil
}
