// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//go:build !windows

package main

import (
	"os/exec"
	"runtime"
)

func hideWindow(*exec.Cmd) {}

func openBrowser(url string) error {
	name := "xdg-open"
	if runtime.GOOS == "darwin" {
		name = "open"
	}
	return exec.Command(name, url).Start()
}

// Servers have no Start menu; the CLI (`axto-setup status|start|stop|update`) is the manager.
func CreateShortcuts(*Installed) error { return nil }
func RemoveShortcuts(*Installed)       {}
