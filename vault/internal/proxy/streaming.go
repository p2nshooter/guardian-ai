/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
package proxy

import (
	"bufio"
	"io"
	"net/http"
	"strings"
)

// StreamingProxy handles SSE streaming responses
// It reads from the upstream SSE stream, applies re-injection to each chunk,
// and forwards to the client in real-time
func StreamResponse(w http.ResponseWriter, upstreamResp *http.Response, redactMap map[string]string) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		// Fallback to non-streaming
		body, _ := io.ReadAll(upstreamResp.Body)
		if len(redactMap) > 0 {
			text := string(body)
			for redacted, original := range redactMap {
				text = strings.ReplaceAll(text, redacted, original)
			}
			body = []byte(text)
		}
		w.Write(body)
		return
	}

	// Copy headers
	for key, vals := range upstreamResp.Header {
		for _, v := range vals {
			w.Header().Add(key, v)
		}
	}
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(upstreamResp.StatusCode)

	scanner := bufio.NewScanner(upstreamResp.Body)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024) // 1MB max line

	for scanner.Scan() {
		line := scanner.Text()

		// Apply re-injection to streaming chunks
		if len(redactMap) > 0 {
			for redacted, original := range redactMap {
				line = strings.ReplaceAll(line, redacted, original)
			}
		}

		w.Write([]byte(line + "\n"))
		flusher.Flush()
	}
}

// IsStreamingRequest checks if the request asks for streaming
func IsStreamingRequest(body []byte) bool {
	return strings.Contains(string(body), `"stream":true`) ||
		strings.Contains(string(body), `"stream": true`)
}
