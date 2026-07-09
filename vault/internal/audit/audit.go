/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
package audit

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Entry struct {
	Timestamp  time.Time `json:"timestamp"`
	Action     string    `json:"action"`
	Reason     string    `json:"reason,omitempty"`
	Detections int       `json:"detections,omitempty"`
	Types      []string  `json:"types,omitempty"`
	ClientIP   string    `json:"client_ip,omitempty"`
	Provider   string    `json:"provider,omitempty"`
}

type Logger struct {
	mu      sync.Mutex
	file    *os.File
	entries []Entry
}

func NewLogger(dir string) (*Logger, error) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}
	filename := filepath.Join(dir, "vault-audit-"+time.Now().Format("2006-01-02")+".jsonl")
	f, err := os.OpenFile(filename, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return nil, err
	}
	return &Logger{file: f, entries: make([]Entry, 0, 1000)}, nil
}

func (l *Logger) Log(entry Entry) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.entries = append(l.entries, entry)
	if len(l.entries) > 10000 {
		l.entries = l.entries[len(l.entries)-5000:]
	}

	data, _ := json.Marshal(entry)
	l.file.Write(append(data, '\n'))
}

func (l *Logger) Recent(limit int) []Entry {
	l.mu.Lock()
	defer l.mu.Unlock()

	if limit > len(l.entries) {
		limit = len(l.entries)
	}
	result := make([]Entry, limit)
	copy(result, l.entries[len(l.entries)-limit:])
	return result
}

func (l *Logger) Close() error {
	return l.file.Close()
}
