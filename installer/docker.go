// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//
// Docker / Docker Desktop / WSL2 detection and command execution.
package main

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type DockerStatus struct {
	OS             string `json:"os"`
	Installed      bool   `json:"installed"`
	Running        bool   `json:"running"`
	Compose        bool   `json:"compose"`
	Version        string `json:"version"`
	ComposeVersion string `json:"compose_version"`
	MemoryGB       int    `json:"memory_gb"`
	CPUs           int    `json:"cpus"`
	WSL            string `json:"wsl"` // windows only: "ok" | "missing" | ""
	DesktopPath    string `json:"desktop_path"`
	Ready          bool   `json:"ready"`
	Problem        string `json:"problem"`
	Fix            string `json:"fix"`
	FixURL         string `json:"fix_url"`
}

const dockerDesktopURL = "https://www.docker.com/products/docker-desktop/"

func dockerCmd(ctx context.Context, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, "docker", args...)
	hideWindow(cmd)
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out
	err := cmd.Run()
	return out.String(), err
}

func desktopExe() string {
	if runtime.GOOS != "windows" {
		return ""
	}
	for _, base := range []string{os.Getenv("ProgramFiles"), `C:\Program Files`} {
		p := filepath.Join(base, "Docker", "Docker", "Docker Desktop.exe")
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

func CheckDocker(ctx context.Context) DockerStatus {
	s := DockerStatus{OS: runtime.GOOS, DesktopPath: desktopExe()}
	c, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	if runtime.GOOS == "windows" {
		cmd := exec.CommandContext(c, "wsl.exe", "--status")
		hideWindow(cmd)
		if err := cmd.Run(); err == nil {
			s.WSL = "ok"
		} else {
			s.WSL = "missing"
		}
	}
	if _, err := exec.LookPath("docker"); err != nil && s.DesktopPath == "" {
		s.Problem = "Docker is not installed."
		if runtime.GOOS == "windows" {
			s.Fix = "Install Docker Desktop (it sets up WSL 2 for you), start it once, then click “Check again”."
			s.FixURL = dockerDesktopURL
		} else {
			s.Fix = "Install Docker Engine: curl -fsSL https://get.docker.com | sh"
			s.FixURL = "https://docs.docker.com/engine/install/"
		}
		return s
	}
	s.Installed = true
	v, err := dockerCmd(c, "version", "--format", "{{.Server.Version}}")
	if err != nil || strings.TrimSpace(v) == "" {
		s.Problem = "Docker is installed but not running."
		if runtime.GOOS == "windows" {
			s.Fix = "Start Docker Desktop and wait until it says “Engine running”, then click “Check again”."
		} else {
			s.Fix = "Start the Docker service: sudo systemctl start docker"
		}
		return s
	}
	s.Running = true
	s.Version = strings.TrimSpace(v)
	cv, err := dockerCmd(c, "compose", "version", "--short")
	if err != nil {
		s.Problem = "Docker Compose v2 is missing."
		s.Fix = "Update Docker Desktop / install the docker-compose-plugin package."
		s.FixURL = "https://docs.docker.com/compose/install/"
		return s
	}
	s.Compose = true
	s.ComposeVersion = strings.TrimSpace(cv)
	if info, err := dockerCmd(c, "info", "--format", "{{.MemTotal}} {{.NCPU}}"); err == nil {
		f := strings.Fields(info)
		if len(f) == 2 {
			mem, _ := strconv.ParseInt(f[0], 10, 64)
			s.MemoryGB = int((mem + (1 << 29)) >> 30)
			s.CPUs, _ = strconv.Atoi(f[1])
		}
	}
	s.Ready = true
	return s
}

// StartDockerDesktop launches Docker Desktop on Windows (no-op elsewhere).
func StartDockerDesktop() error {
	p := desktopExe()
	if p == "" {
		return nil
	}
	cmd := exec.Command(p)
	hideWindow(cmd)
	return cmd.Start()
}
