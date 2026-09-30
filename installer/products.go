// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//
// Product catalogue of the AXTO installer. Must match dashboard/lib/selfhosted.ts
// (key prefixes, default ports, image names) and the compose files in the repo
// root, which build.sh copies into bundle/ before compiling.
package main

import "strings"

type Product struct {
	Slug        string   // matches the portal
	Name        string   // shown to the user
	KeyPrefix   string   // licence key prefix
	Port        int      // default host port of the web UI
	Service     string   // compose service that serves the UI on Port
	StateDir    string   // AXTO_STATE_DIR inside Service (machine id + Lifetime activation file)
	Compose     string   // compose file in bundle/
	Config      string   // example config in bundle/ ("" = none)
	ConfigAs    string   // file name the compose file mounts
	Services    []string // services to start ("" = all); see WindowsServices
	WindowsOnly []string // on Windows start only these (e.g. no host agent)
	Extra       []string // extra bundle files copied as-is
	Dirs        []string // directories the compose file bind-mounts
	Note        string   // shown on the product card
	WindowsNote string
}

var Products = []Product{
	{Slug: "guardian", Name: "AXTO Guardian AI", KeyPrefix: "GUARD", Port: 8080, Service: "guardian-core", StateDir: "/guardian/data/.axto",
		Compose: "docker-compose.yml", Config: "guardian.example.yml", ConfigAs: "guardian.yml", Dirs: []string{"certs"},
		WindowsOnly: []string{"guardian-core"},
		Note:        "Security dashboard + node agent that protects this Linux host.",
		WindowsNote: "On Windows the dashboard runs locally; install the node agent on the Linux servers you want to protect."},
	{Slug: "orchestra", Name: "AXTO Orchestra AI", KeyPrefix: "ORCH", Port: 8088, Service: "orchestra-core", StateDir: "/app/data/.axto",
		Compose: "orchestra-compose.yml", Config: "orchestra.example.yml", ConfigAs: "orchestra.yml",
		Note: "AI orchestration core + CPU worker. Your own AI vendor keys stay on this machine."},
	{Slug: "vault", Name: "AXTO Vault", KeyPrefix: "VAULT", Port: 8081, Service: "vault-core", StateDir: "/vault/data/.axto",
		Compose: "vault-compose.yml", Config: "vault.example.yml", ConfigAs: "vault.yml",
		Note: "Privacy proxy: redacts personal data before prompts leave your network."},
	{Slug: "edge", Name: "AXTO Edge", KeyPrefix: "EDGE", Port: 8082, Service: "edge-core", StateDir: "/edge/data/.axto",
		Compose: "edge-compose.yml", Config: "edge.example.yml", ConfigAs: "edge.yml",
		Note: "AI API gateway with keys, quotas and metering for your own customers."},
	{Slug: "soc", Name: "AXTO SOC", KeyPrefix: "SOC", Port: 8083, Service: "soc-core", StateDir: "/soc/data/.axto",
		Compose: "soc-compose.yml", Config: "soc.example.yml", ConfigAs: "soc.yml",
		Note: "Security operations: alerts, correlation, incidents and threat hunting."},
	{Slug: "compliance", Name: "AXTO Compliance", KeyPrefix: "CMPL", Port: 8084, Service: "compliance-core", StateDir: "/compliance/data/.axto",
		Compose: "compliance-compose.yml", Config: "compliance.example.yml", ConfigAs: "compliance.yml",
		Note: "Continuous compliance: SOC 2, ISO 27001, HIPAA, PCI DSS, GDPR evidence and reports."},
	{Slug: "sentinel", Name: "AXTO Sentinel", KeyPrefix: "SNTL", Port: 8085, Service: "sentinel-core", StateDir: "/sentinel/data/.axto",
		Compose: "sentinel-compose.yml", Config: "sentinel.example.yml", ConfigAs: "sentinel.yml",
		Note: "IoT / OT security: device discovery, industrial protocols, CVE risk."},
	{Slug: "antivirus", Name: "AXTO Antivirus", KeyPrefix: "AV", Port: 8086, Service: "antivirus", StateDir: "/guardian/data/.axto",
		Compose: "antivirus-compose.yml", Config: "antivirus.example.yml", ConfigAs: "antivirus.yml",
		Note: "ClamAV + YARA + ML scanning API with a dashboard."},
	{Slug: "studio", Name: "AXTO Studio", KeyPrefix: "STUD", Port: 8090, Service: "studio-core", StateDir: "/axto-state",
		Compose: "studio-compose.yml", Config: "studio.example.yml", ConfigAs: "studio.yml",
		Note: "Private AI studio on your own models and keys."},
	{Slug: "legal", Name: "AXTO Legal", KeyPrefix: "LEGL", Port: 8096, Service: "legal-core", StateDir: "/legal/data/.axto",
		Compose: "legal-compose.yml", Config: "legal.env.example", ConfigAs: "legal.env",
		Note: "Legal AI workspaces, fully on-premise."},
}

func ProductBySlug(slug string) *Product {
	for i := range Products {
		if Products[i].Slug == slug {
			return &Products[i]
		}
	}
	return nil
}

// ProductForKey finds the product a licence key belongs to (by its prefix).
func ProductForKey(key string) *Product {
	k := strings.ToUpper(strings.TrimSpace(key))
	for i := range Products {
		if strings.HasPrefix(k, Products[i].KeyPrefix+"-") {
			return &Products[i]
		}
	}
	return nil
}

// LifetimePrefix starts a lifetime licence's installer key (LIFE-8HEX-8HEX-8HEX-8HEX,
// shown at https://axto.io/app/lifetime). One key can cover one app or the whole suite.
const LifetimePrefix = "LIFE"

func hex8(s string) bool {
	if len(s) != 8 {
		return false
	}
	for _, c := range s {
		if !strings.ContainsRune("0123456789ABCDEF", c) {
			return false
		}
	}
	return true
}

// IsLifetimeKey reports whether key is a lifetime installer key.
func IsLifetimeKey(key string) bool {
	parts := strings.Split(strings.ToUpper(strings.TrimSpace(key)), "-")
	if len(parts) != 5 || parts[0] != LifetimePrefix {
		return false
	}
	for _, p := range parts[1:] {
		if !hex8(p) {
			return false
		}
	}
	return true
}

// ValidKeyShape checks PREFIX-8HEX-8HEX-8HEX-8HEX (last group may be an HMAC).
func ValidKeyShape(key string) bool {
	parts := strings.Split(strings.ToUpper(strings.TrimSpace(key)), "-")
	if len(parts) != 5 || ProductForKey(key) == nil {
		return false
	}
	for _, p := range parts[1:] {
		if len(p) != 8 {
			return false
		}
		for _, c := range p {
			if !strings.ContainsRune("0123456789ABCDEF", c) {
				return false
			}
		}
	}
	return true
}
