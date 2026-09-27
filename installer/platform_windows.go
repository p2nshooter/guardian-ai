// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//go:build windows

package main

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
)

// hideWindow keeps docker/powershell from flashing console windows (the
// installer itself is a GUI-subsystem program).
func hideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
}

func openBrowser(url string) error {
	cmd := exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	hideWindow(cmd)
	return cmd.Start()
}

func startMenuDir() string {
	return filepath.Join(os.Getenv("APPDATA"), "Microsoft", "Windows", "Start Menu", "Programs", "AXTO")
}

func psQuote(s string) string { return "'" + strings.ReplaceAll(s, "'", "''") + "'" }

// CreateShortcuts adds Start-menu entries: "AXTO <App>" (opens the app in the
// browser) and "AXTO Manager" (this program, installed next to the configs).
func CreateShortcuts(st *Installed) error {
	dir := startMenuDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	url := fmt.Sprintf("[InternetShortcut]\r\nURL=http://localhost:%d/\r\n", st.Port)
	if err := os.WriteFile(filepath.Join(dir, st.Name+".url"), []byte(url), 0o644); err != nil {
		return err
	}
	// Keep a copy of the installer as the manager (update / stop / uninstall).
	self, err := os.Executable()
	if err != nil {
		return err
	}
	mgr := filepath.Join(BaseDir(), "AXTO-Manager.exe")
	if !strings.EqualFold(self, mgr) {
		if in, err := os.Open(self); err == nil {
			if out, err := os.Create(mgr); err == nil {
				_, _ = io.Copy(out, in)
				out.Close()
			}
			in.Close()
		}
	}
	script := fmt.Sprintf("$s=(New-Object -ComObject WScript.Shell).CreateShortcut(%s);$s.TargetPath=%s;$s.Arguments='manage';$s.Description='Install, update and manage AXTO apps';$s.Save()",
		psQuote(filepath.Join(dir, "AXTO Manager.lnk")), psQuote(mgr))
	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script)
	hideWindow(cmd)
	return cmd.Run()
}

func RemoveShortcuts(st *Installed) {
	_ = os.Remove(filepath.Join(startMenuDir(), st.Name+".url"))
	if len(LoadState()) <= 1 {
		_ = os.RemoveAll(startMenuDir())
	}
}
