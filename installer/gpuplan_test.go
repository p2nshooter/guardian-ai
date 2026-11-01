// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//
// The one GPU decision (REQUESTS 136, BLUEPRINT-V4 §31.F G2): the same hardware gets the
// same answer on Windows and Linux; every "no" names the real cause and the fix.
package main

import (
	"errors"
	"strings"
	"testing"
)

func host(runtimes, kernel string, cdi bool) gpuHost {
	return gpuHost{
		Runtimes: func() string { return runtimes },
		Kernel:   func() string { return kernel },
		CDI:      func() bool { return cdi },
		Ollama:   func() (bool, bool) { return false, false },
	}
}

var rtx = []GPU{{Vendor: "nvidia", Label: "NVIDIA", Name: "NVIDIA GeForce RTX 4090", VRAMGB: 24, Driver: "560.35.03", Source: "nvidia-smi"}}

func TestNvidiaReadyOnLinuxAndWindowsGivesTheSamePlan(t *testing.T) {
	lin := planGPU(rtx, "linux", host(`{"nvidia":{"path":"nvidia-container-runtime"},"runc":{}}`, "6.8.0-45-generic", false))
	win := planGPU([]GPU{{Vendor: "nvidia", Label: "NVIDIA", Name: "NVIDIA GeForce RTX 4090", VRAMGB: 24, Driver: "32.0.15.6094", Source: "win32"}},
		"windows", host(`{"runc":{}}`, "5.15.153.1-microsoft-standard-WSL2", false))
	for name, p := range map[string]GPUPlan{"linux": lin, "windows": win} {
		if !p.Ready || !p.Auto || p.Mode != "container" || p.Profile != "gpu" || p.Vendor != "nvidia" {
			t.Fatalf("%s: %+v", name, p)
		}
		if !strings.Contains(p.Note, "tested inside the worker image") {
			t.Fatalf("%s note: %q", name, p.Note)
		}
	}
	if win.Driver != "560.94" || lin.Driver != "560.35.03" {
		t.Fatalf("driver versions: windows %q linux %q", win.Driver, lin.Driver)
	}
}

func TestLinuxWithCDIInsteadOfTheNvidiaRuntimeIsReady(t *testing.T) {
	if p := planGPU(rtx, "linux", host(`{"runc":{}}`, "6.8", true)); !p.Ready {
		t.Fatalf("CDI spec present must be ready: %+v", p)
	}
}

func TestLinuxWithoutToolkitNamesTheFix(t *testing.T) {
	p := planGPU(rtx, "linux", host(`{"io.containerd.runc.v2":{},"runc":{}}`, "6.8", false))
	if p.Ready || p.Auto || !strings.Contains(p.Fix, "nvidia-ctk runtime configure") || p.FixURL != nvidiaToolkitURL {
		t.Fatalf("%+v", p)
	}
}

func TestWindowsOnTheHyperVEngineCannotPassAGPU(t *testing.T) {
	p := planGPU(rtx, "windows", host("", "5.15.49-linuxkit", false))
	if p.Ready || !strings.Contains(p.Fix, "WSL 2 based engine") {
		t.Fatalf("%+v", p)
	}
}

func TestADriverTooOldForCUDA121IsCaughtOnBothSystems(t *testing.T) {
	old := []GPU{{Vendor: "nvidia", Name: "NVIDIA GeForce GTX 1080", Driver: "470.256.02", Source: "nvidia-smi"}}
	if p := planGPU(old, "linux", host(`{"nvidia":{}}`, "6.8", false)); p.Ready || !strings.Contains(p.Note, "too old") {
		t.Fatalf("linux: %+v", p)
	}
	oldWin := []GPU{{Vendor: "nvidia", Name: "NVIDIA GeForce GTX 1080", Driver: "27.21.14.5671", Source: "win32"}}
	p := planGPU(oldWin, "windows", host("", "microsoft-standard-WSL2", false))
	if p.Ready || p.Driver != "456.71" || !strings.Contains(p.Note, "528.33") {
		t.Fatalf("windows: %+v", p)
	}
}

func TestAmdAndIntelUseOllamaOnTheHostWithTheRealReason(t *testing.T) {
	amd := []GPU{{Vendor: "amd", Label: "AMD", Name: "AMD Radeon RX 7900 XTX", VRAMGB: 24}}
	win := planGPU(amd, "windows", host("", "microsoft-standard-WSL2", false))
	if win.Ready || win.Mode != "host" || !strings.Contains(win.Note, "Docker Desktop passes only NVIDIA") || !strings.Contains(win.Note, "Install Ollama") {
		t.Fatalf("windows: %+v", win)
	}
	h := host("", "6.8", false)
	h.Ollama = func() (bool, bool) { return true, true }
	lin := planGPU(amd, "linux", h)
	if lin.Ready || !strings.Contains(lin.Note, "Add an Ollama worker") || !strings.Contains(lin.Note, "NVIDIA CUDA") {
		t.Fatalf("linux: %+v", lin)
	}
}

func TestLinuxWarnsWhenOllamaOnlyListensOnLoopback(t *testing.T) {
	h := host(`{"nvidia":{}}`, "6.8", false)
	h.OllamaBridge = func() (bool, bool) { return true, false }
	if p := planGPU(rtx, "linux", h); !p.Ready || !strings.Contains(p.Note, "OLLAMA_HOST=0.0.0.0") {
		t.Fatalf("%+v", p)
	}
	h.OllamaBridge = func() (bool, bool) { return true, true }
	if p := planGPU(rtx, "linux", h); strings.Contains(p.Note, "OLLAMA_HOST") {
		t.Fatalf("reachable Ollama must not warn: %q", p.Note)
	}
}

func TestNoGPU(t *testing.T) {
	if p := planGPU(nil, "linux", gpuHost{}); p.Mode != "none" || p.Ready || p.Auto {
		t.Fatalf("%+v", p)
	}
}

func TestNvidiaDriverVersions(t *testing.T) {
	for raw, want := range map[string]string{"560.35.03": "560.35.03", "32.0.15.6094": "560.94", "31.0.15.2849": "528.49", "30.0.14.7141": "471.41"} {
		if _, got := nvidiaDriver(raw); got != want {
			t.Errorf("%s → %s, want %s", raw, got, want)
		}
	}
}

func TestProbeArgsHandTheGPUOverLikeCompose(t *testing.T) {
	nv := strings.Join(probeArgs("axto/orchestra-worker-gpu:latest", "nvidia", "python", "-m", "orchestra_worker.probe"), " ")
	if nv != "run --rm --gpus all --entrypoint python axto/orchestra-worker-gpu:latest -m orchestra_worker.probe" {
		t.Fatal(nv)
	}
	amd := strings.Join(probeArgs("img", "amd", "python"), " ")
	if !strings.Contains(amd, "--device /dev/kfd --device /dev/dri --group-add video") {
		t.Fatal(amd)
	}
}

func TestParseProbe(t *testing.T) {
	ok := parseProbe("some log\n{\"ok\": true, \"gpus\": [\"NVIDIA GeForce RTX 4090 (24 GB)\"], \"torch\": \"cuda×1\", \"detail\": \"\"}\n", nil)
	if !ok.OK || ok.GPUs[0] != "NVIDIA GeForce RTX 4090 (24 GB)" || ok.Torch != "cuda×1" {
		t.Fatalf("%+v", ok)
	}
	bad := parseProbe(`{"ok": false, "gpus": [], "torch": "", "detail": "NVIDIA GeForce RTX 4090: this container has no /dev/nvidia*"}`, errors.New("exit 3"))
	if bad.OK || !strings.Contains(bad.Detail, "/dev/nvidia") {
		t.Fatalf("%+v", bad)
	}
	crash := parseProbe("docker: Error response from daemon: could not select device driver \"\" with capabilities: [[gpu]].", errors.New("exit 125"))
	if crash.OK || !strings.Contains(crash.Detail, "could not select device driver") {
		t.Fatalf("%+v", crash)
	}
}

var radeon = []GPU{{Vendor: "amd", Label: "AMD", Name: "AMD Radeon RX 7900 XTX", VRAMGB: 24}}

func TestAmdOnLinuxWithROCmDevicesGetsTheAMDWorker(t *testing.T) {
	h := host("", "6.8", false)
	h.AMDDevices = func() (bool, bool, string) { return true, true, "amdgpu" }
	p := planGPU(radeon, "linux", h)
	if !p.Ready || !p.Auto || p.Mode != "container" || p.Profile != "gpu-amd" || p.Vendor != "amd" {
		t.Fatalf("%+v", p)
	}
	if gpuProfileVendor(p.Profile) != "amd" || !isGPUProfile(p.Profile) || isGPUProfile("ollama") {
		t.Fatal("profile helpers")
	}
}

func TestAmdOnLinuxWithoutROCmNamesTheFix(t *testing.T) {
	for name, dev := range map[string][3]any{
		"no kfd":     {false, true, "amdgpu"},
		"no render":  {true, false, "amdgpu"},
		"radeon drv": {true, true, "radeon"},
	} {
		h := host("", "6.8", false)
		d := dev
		h.AMDDevices = func() (bool, bool, string) { return d[0].(bool), d[1].(bool), d[2].(string) }
		p := planGPU(radeon, "linux", h)
		if p.Ready || p.Mode != "host" || p.Profile != "gpu-amd" || !strings.Contains(p.Fix, "amdgpu-install") || p.FixURL != rocmInstallURL {
			t.Fatalf("%s: %+v", name, p)
		}
	}
}

func TestAmdOnWindowsStaysOnHostOllama(t *testing.T) {
	h := host("", "microsoft-standard-WSL2", false)
	h.AMDDevices = func() (bool, bool, string) { t.Fatal("Windows never checks Linux devices"); return false, false, "" }
	if p := planGPU(radeon, "windows", h); p.Ready || p.Mode != "host" || p.Profile != "" {
		t.Fatalf("%+v", p)
	}
}

func TestNvidiaWinsWhenBothBrandsArePresent(t *testing.T) {
	both := append(append([]GPU{}, radeon...), rtx...)
	h := host(`{"nvidia":{}}`, "6.8", false)
	h.AMDDevices = func() (bool, bool, string) { return true, true, "amdgpu" }
	if p := planGPU(both, "linux", h); p.Profile != "gpu" || !p.Ready {
		t.Fatalf("%+v", p)
	}
}
