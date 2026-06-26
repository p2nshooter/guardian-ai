/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
package proxy

import (
	"strings"
	"unicode/utf8"
)

// EstimateTokens provides a rough token count estimate
// Uses the GPT tokenizer approximation: ~4 chars = 1 token for English
// This avoids needing tiktoken dependency
func EstimateTokens(text string) int {
	if text == "" {
		return 0
	}
	// Count by whitespace-separated words (rough but fast)
	words := len(strings.Fields(text))
	chars := utf8.RuneCountInString(text)

	// GPT models: ~0.75 words per token, or ~4 chars per token
	byWords := int(float64(words) / 0.75)
	byChars := chars / 4

	// Take the average
	estimate := (byWords + byChars) / 2
	if estimate < 1 {
		estimate = 1
	}
	return estimate
}

// CountRequestTokens estimates tokens in a chat completion request
func CountRequestTokens(messages []map[string]interface{}) int {
	total := 0
	for _, msg := range messages {
		if content, ok := msg["content"].(string); ok {
			total += EstimateTokens(content) + 4 // message overhead
		}
	}
	return total + 3 // request overhead
}
