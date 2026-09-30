// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//
// Where things live and what is installed.
//
//	Windows: %ProgramData%\AXTO (fallback %LOCALAPPDATA%\AXTO)
//	Linux:   /opt/axto when root, else ~/.axto
//	macOS:   ~/Library/Application Support/AXTO
package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"sync"
)

var stateMu sync.Mutex

func writable(dir string) bool {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return false
	}
	f, err := os.CreateTemp(dir, ".w")
	if err != nil {
		return false
	}
	f.Close()
	os.Remove(f.Name())
	return true
}

var baseDirOverride string

func BaseDir() string {
	if baseDirOverride != "" {
		return baseDirOverride
	}
	var candidates []string
	home, _ := os.UserHomeDir()
	switch runtime.GOOS {
	case "windows":
		candidates = []string{filepath.Join(os.Getenv("ProgramData"), "AXTO"), filepath.Join(os.Getenv("LOCALAPPDATA"), "AXTO")}
	case "darwin":
		candidates = []string{filepath.Join(home, "Library", "Application Support", "AXTO")}
	default:
		if os.Geteuid() == 0 {
			candidates = append(candidates, "/opt/axto")
		}
		candidates = append(candidates, filepath.Join(home, ".axto"))
	}
	for _, c := range candidates {
		if c != "" && writable(c) {
			return c
		}
	}
	return filepath.Join(os.TempDir(), "AXTO")
}

func statePath() string { return filepath.Join(BaseDir(), "installed.json") }

func LoadState() map[string]*Installed {
	stateMu.Lock()
	defer stateMu.Unlock()
	m := map[string]*Installed{}
	if b, err := os.ReadFile(statePath()); err == nil {
		_ = json.Unmarshal(b, &m)
	}
	return m
}

func saveState(m map[string]*Installed) {
	b, _ := json.MarshalIndent(m, "", "  ")
	_ = os.MkdirAll(BaseDir(), 0o755)
	_ = os.WriteFile(statePath(), b, 0o644)
}

func SaveInstalled(st *Installed) {
	m := LoadState()
	stateMu.Lock()
	defer stateMu.Unlock()
	m[st.Slug] = st
	saveState(m)
}

func RemoveInstalled(slug string) {
	m := LoadState()
	stateMu.Lock()
	defer stateMu.Unlock()
	delete(m, slug)
	saveState(m)
}
