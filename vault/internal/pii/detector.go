/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
package pii

import (
	"crypto/sha256"
	"fmt"
	"regexp"
	"strings"
)

// DetectionResult represents a found PII entity
type DetectionResult struct {
	Type       string `json:"type"`
	Original   string `json:"original"`
	Redacted   string `json:"redacted"`
	StartIndex int    `json:"start_index"`
	EndIndex   int    `json:"end_index"`
}

// Detector holds compiled regex patterns for PII detection
type Detector struct {
	patterns map[string]*regexp.Regexp
	mode     string // "redact" | "hash" | "mask"
}

// NewDetector creates a PII detector with built-in patterns
func NewDetector(mode string, enablePII, enablePHI, enableFinancial, enableSecrets bool) *Detector {
	d := &Detector{
		patterns: make(map[string]*regexp.Regexp),
		mode:     mode,
	}

	if enablePII {
		// Email addresses
		d.patterns["email"] = regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
		// Phone numbers (international)
		d.patterns["phone"] = regexp.MustCompile(`(?:\+?[1-9]\d{0,2}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}`)
		// US SSN
		d.patterns["ssn"] = regexp.MustCompile(`\b\d{3}[\-\s]?\d{2}[\-\s]?\d{4}\b`)
		// Passport numbers
		d.patterns["passport"] = regexp.MustCompile(`\b[A-Z]{1,2}\d{6,9}\b`)
		// IP addresses
		d.patterns["ip_address"] = regexp.MustCompile(`\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b`)
		// Names (common patterns near identifiers)
		d.patterns["person_name"] = regexp.MustCompile(`(?i)(?:my name is|i am|name:\s*|patient:\s*|client:\s*|user:\s*)([A-Z][a-z]+ [A-Z][a-z]+)`)
		// Date of birth
		d.patterns["dob"] = regexp.MustCompile(`(?i)(?:born|dob|date of birth|birthday)[\s:]*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})`)
		// Physical addresses
		d.patterns["address"] = regexp.MustCompile(`\d{1,5}\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct)\b`)
	}

	if enablePHI {
		// Medical record numbers
		d.patterns["mrn"] = regexp.MustCompile(`(?i)(?:MRN|medical record|patient id)[\s:#]*([A-Z0-9\-]{6,15})`)
		// ICD codes
		d.patterns["icd_code"] = regexp.MustCompile(`\b[A-Z]\d{2}(?:\.\d{1,4})?\b`)
		// Drug/medication names (common patterns)
		d.patterns["medication"] = regexp.MustCompile(`(?i)\b\d+\s*(?:mg|mcg|ml|units?)\s+(?:of\s+)?[A-Z][a-z]+(?:in|ol|ine|ide|ate|one)\b`)
		// Lab values
		d.patterns["lab_value"] = regexp.MustCompile(`(?i)(?:glucose|hemoglobin|cholesterol|creatinine|bilirubin|albumin)[\s:]*\d+(?:\.\d+)?\s*(?:mg/dl|g/dl|mmol/l|u/l)`)
	}

	if enableFinancial {
		// Credit card numbers (Visa, MC, Amex, Discover)
		d.patterns["credit_card"] = regexp.MustCompile(`\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{3,4}\b`)
		// Bank account numbers
		d.patterns["bank_account"] = regexp.MustCompile(`(?i)(?:account|acct)[\s#:]*\d{8,17}`)
		// Routing numbers
		d.patterns["routing"] = regexp.MustCompile(`(?i)(?:routing|aba)[\s#:]*\d{9}`)
		// IBAN
		d.patterns["iban"] = regexp.MustCompile(`\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}\s?\d{4}\s?\d{4}\s?\d{4}(?:\s?\d{4}){0,4}\b`)
		// Tax IDs
		d.patterns["tax_id"] = regexp.MustCompile(`(?i)(?:tax id|tin|ein|npwp)[\s#:]*[\d\-\.]{9,20}`)
	}

	if enableSecrets {
		// API keys (common patterns)
		d.patterns["api_key_openai"] = regexp.MustCompile(`sk-[a-zA-Z0-9]{20,}`)
		d.patterns["api_key_anthropic"] = regexp.MustCompile(`sk-ant-[a-zA-Z0-9\-]{20,}`)
		d.patterns["api_key_generic"] = regexp.MustCompile(`(?i)(?:api[_\-]?key|secret[_\-]?key|access[_\-]?token)[\s=:]+["']?([a-zA-Z0-9\-_]{20,})["']?`)
		// AWS keys
		d.patterns["aws_key"] = regexp.MustCompile(`(?:AKIA|ASIA)[A-Z0-9]{16}`)
		// Private keys
		d.patterns["private_key"] = regexp.MustCompile(`-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----`)
		// JWT tokens
		d.patterns["jwt"] = regexp.MustCompile(`eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+`)
		// Connection strings
		d.patterns["connection_string"] = regexp.MustCompile(`(?i)(?:postgres|mysql|mongodb|redis)://[^\s"']+`)
	}

	return d
}

// Detect finds all PII in text and returns results
func (d *Detector) Detect(text string) []DetectionResult {
	var results []DetectionResult

	for piiType, pattern := range d.patterns {
		matches := pattern.FindAllStringIndex(text, -1)
		for _, match := range matches {
			original := text[match[0]:match[1]]
			results = append(results, DetectionResult{
				Type:       piiType,
				Original:   original,
				Redacted:   d.redact(piiType, original),
				StartIndex: match[0],
				EndIndex:   match[1],
			})
		}
	}

	return results
}

// Redact replaces all PII in text with redacted values
func (d *Detector) Redact(text string) (string, []DetectionResult, map[string]string) {
	results := d.Detect(text)
	redactMap := make(map[string]string) // redacted → original (for re-injection)

	// Sort by position (reverse) to replace from end to start
	for i := len(results) - 1; i >= 0; i-- {
		r := results[i]
		redactMap[r.Redacted] = r.Original
		text = text[:r.StartIndex] + r.Redacted + text[r.EndIndex:]
	}

	return text, results, redactMap
}

// ReInject restores original values in response text
func (d *Detector) ReInject(text string, redactMap map[string]string) string {
	for redacted, original := range redactMap {
		text = strings.ReplaceAll(text, redacted, original)
	}
	return text
}

func (d *Detector) redact(piiType, original string) string {
	switch d.mode {
	case "hash":
		h := sha256.Sum256([]byte(original))
		return fmt.Sprintf("[%s:%x]", strings.ToUpper(piiType), h[:4])
	case "mask":
		if len(original) <= 4 {
			return strings.Repeat("*", len(original))
		}
		return original[:2] + strings.Repeat("*", len(original)-4) + original[len(original)-2:]
	default: // "redact"
		return fmt.Sprintf("[%s_REDACTED]", strings.ToUpper(piiType))
	}
}

// AddCustomRule adds a custom regex-based detection rule
func (d *Detector) AddCustomRule(name, pattern string) error {
	compiled, err := regexp.Compile(pattern)
	if err != nil {
		return fmt.Errorf("invalid pattern for %s: %w", name, err)
	}
	d.patterns[name] = compiled
	return nil
}
