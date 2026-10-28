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
	WSL            string `json:"wsl"`       // windows only: "ok" | "missing" | ""
	Arch           string `json:"arch"`      // Docker engine architecture: "amd64" | "arm64"
	OSType         string `json:"os_type"`   // "linux" (required) | "windows" (Windows containers mode)
	GPU            string `json:"gpu"`       // NVIDIA GPU(s) nvidia-smi reports ("" = none / no driver)
	GPUReady       bool   `json:"gpu_ready"` // containers can use that GPU (Linux: nvidia runtime; Windows: WSL 2)
	GPUNote        string `json:"gpu_note"`  // why a GPU that exists cannot be used yet, and how to fix it
	DesktopPath    string `json:"desktop_path"`
	Ready          bool   `json:"ready"`
	Problem        string `json:"problem"`
	Fix            string `json:"fix"`
	FixURL         string `json:"fix_url"`
}

const dockerDesktopURL = "https://www.docker.com/products/docker-desktop/"

// composeStandalone is set when only the standalone docker-compose v2 binary
// exists (no "docker compose" plugin); compose calls then go to that binary.
var composeStandalone bool

func dockerCmd(ctx context.Context, args ...string) (string, error) {
	name := "docker"
	if composeStandalone && len(args) > 0 && args[0] == "compose" {
		name, args = "docker-compose", args[1:]
	}
	cmd := exec.CommandContext(ctx, name, args...)
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

// engineArch maps `docker info` .Architecture to Go / image naming.
func engineArch(a string) string {
	switch strings.ToLower(strings.TrimSpace(a)) {
	case "x86_64", "amd64":
		return "amd64"
	case "aarch64", "arm64":
		return "arm64"
	}
	return strings.ToLower(strings.TrimSpace(a))
}

func CheckDocker(ctx context.Context) DockerStatus {
	s := DockerStatus{OS: runtime.GOOS, DesktopPath: desktopExe(), GPU: DetectGPU(ctx)}
	c, cancel := context.WithTimeout(ctx, 45*time.Second)
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
	// Engine facts first: AXTO images are Linux images.
	if info, err := dockerCmd(c, "info", "--format", "{{.OSType}} {{.Architecture}} {{.MemTotal}} {{.NCPU}}"); err == nil {
		f := strings.Fields(info)
		if len(f) == 4 {
			s.OSType = f[0]
			s.Arch = engineArch(f[1])
			mem, _ := strconv.ParseInt(f[2], 10, 64)
			s.MemoryGB = int((mem + (1 << 29)) >> 30)
			s.CPUs, _ = strconv.Atoi(f[3])
		}
	}
	if s.OSType == "windows" {
		s.Problem = "Docker Desktop is set to Windows containers."
		s.Fix = "Right-click the Docker icon in the taskbar → “Switch to Linux containers…”, wait until it restarts, then click “Check again”."
		s.FixURL = "https://docs.docker.com/desktop/troubleshoot-and-support/faqs/windowsfaqs/"
		return s
	}
	if s.GPU != "" {
		s.GPUReady, s.GPUNote = gpuUsable(runtime.GOOS, func() string {
			out, _ := dockerCmd(c, "info", "--format", "{{json .Runtimes}}")
			return out
		})
	}
	composeStandalone = false
	cv, err := dockerCmd(c, "compose", "version", "--short")
	if err != nil {
		// Older Linux setups: the standalone docker-compose v2 binary works the same way.
		dc := exec.CommandContext(c, "docker-compose", "version", "--short")
		hideWindow(dc)
		if sv, serr := dc.Output(); serr == nil && strings.HasPrefix(strings.TrimPrefix(strings.TrimSpace(string(sv)), "v"), "2") {
			composeStandalone = true
			cv, err = string(sv), nil
		}
	}
	if err != nil {
		s.Problem = "Docker Compose v2 is missing."
		s.Fix = "Update Docker Desktop / install the docker-compose-plugin package."
		s.FixURL = "https://docs.docker.com/compose/install/"
		return s
	}
	s.Compose = true
	s.ComposeVersion = strings.TrimPrefix(strings.TrimSpace(cv), "v")
	s.Ready = true
	return s
}

// DetectGPU names the NVIDIA GPUs the driver reports, e.g. "NVIDIA GeForce RTX 4090 (24564 MiB)".
// Docker Desktop hands them to containers through WSL 2; on Linux the
// nvidia-container-toolkit does. "" = no NVIDIA GPU or no driver.
func DetectGPU(ctx context.Context) string {
	c, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	cmd := exec.CommandContext(c, "nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader")
	hideWindow(cmd)
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	var gpus []string
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		f := strings.SplitN(line, ",", 2)
		if name := strings.TrimSpace(f[0]); name != "" {
			if len(f) == 2 {
				name += " (" + strings.TrimSpace(f[1]) + ")"
			}
			gpus = append(gpus, name)
		}
	}
	return strings.Join(gpus, " + ")
}

const nvidiaToolkitURL = "https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html"

// gpuUsable says whether Docker can hand an NVIDIA GPU to containers. Docker Desktop
// (Windows, macOS) passes it through WSL 2 by itself; a Linux engine needs the
// nvidia runtime that nvidia-container-toolkit registers.
func gpuUsable(goos string, runtimes func() string) (bool, string) {
	if goos != "linux" {
		return true, ""
	}
	if strings.Contains(runtimes(), `"nvidia"`) {
		return true, ""
	}
	return false, "An NVIDIA GPU is present, but Docker cannot use it yet: install nvidia-container-toolkit, run `sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker`, then run AXTO Setup again — " + nvidiaToolkitURL
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
