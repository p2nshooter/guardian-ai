// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//
// The one GPU decision AXTO Setup makes for Orchestra's GPU worker — the same rules on
// Windows, Linux and macOS, for the wizard and the command line (REQUESTS 136,
// BLUEPRINT-V4 §31.F G2).
//
//  1. Before any download: which GPU, which driver, can Docker hand it to a container
//     (Linux: nvidia runtime or CDI; Windows: Docker Desktop on the WSL 2 engine), is the
//     driver new enough for the image's CUDA, and can containers reach Ollama on this
//     computer. The answer ticks the GPU worker by itself (Auto) on every OS alike.
//  2. After the image is loaded: a real GPU test inside the worker image
//     (probeGPU). A failed test never breaks the install: the GPU worker stays off,
//     the reason is shown, everything else starts.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// GPUPlan is what AXTO Setup will do with the GPU worker on this computer.
type GPUPlan struct {
	Mode    string `json:"mode"`              // "container": the GPU worker runs on the GPU · "host": Ollama here uses it · "none"
	Vendor  string `json:"vendor"`            // nvidia, amd, intel, apple, … ("" = no GPU)
	GPU     string `json:"gpu"`               // the card(s), one line
	Driver  string `json:"driver,omitempty"`  // driver version as the vendor writes it (560.94)
	Profile string `json:"profile,omitempty"` // compose profile of the GPU worker ("gpu")
	Ready   bool   `json:"ready"`             // the GPU worker container can use this GPU
	Auto    bool   `json:"auto"`              // ticked / included by itself (same on every OS)
	Note    string `json:"note"`
	Fix     string `json:"fix,omitempty"`
	FixURL  string `json:"fix_url,omitempty"`
}

// gpuHost is what the plan asks this computer; tests replace each question.
type gpuHost struct {
	Runtimes     func() string // docker info {{json .Runtimes}}
	Kernel       func() string // docker info {{.KernelVersion}} (Docker Desktop: …microsoft-standard-WSL2)
	CDI          func() bool   // an NVIDIA CDI spec exists (Linux, nvidia-ctk cdi generate)
	Ollama       func() (reachable, onGPU bool)
	OllamaBridge func() (loopback, bridge bool)           // Linux: Ollama on 127.0.0.1 and on Docker's bridge address
	AMDDevices   func() (kfd, render bool, driver string) // Linux: /dev/kfd, an AMD render node and its kernel driver
}

// The GPU worker image is built on CUDA 12.1: the NVIDIA driver must be at least this.
const (
	minNvidiaLinux   = 525.60
	minNvidiaWindows = 528.33
	nvidiaDriverURL  = "https://www.nvidia.com/Download/index.aspx"
	wslGPUURL        = "https://docs.docker.com/desktop/features/gpu/"
	rocmInstallURL   = "https://rocm.docs.amd.com/projects/install-on-linux/en/latest/"
)

func firstVendor(gpus []GPU, vendor string) *GPU {
	for i := range gpus {
		if gpus[i].Vendor == vendor {
			return &gpus[i]
		}
	}
	return nil
}

// gpuProfileVendor is the GPU brand a compose profile hands to its container.
func gpuProfileVendor(profile string) string {
	switch profile {
	case "gpu-amd":
		return "amd"
	case "gpu-intel":
		return "intel"
	}
	return "nvidia"
}

func isGPUProfile(profile string) bool { return profile == "gpu" || strings.HasPrefix(profile, "gpu-") }

var winDriverRe = regexp.MustCompile(`^\d+\.\d+\.(\d+)\.(\d+)$`)

// nvidiaDriver turns what the system reports into NVIDIA's own version number.
// nvidia-smi says "560.35.03"; Windows says "32.0.15.6094", whose last five digits are 560.94.
func nvidiaDriver(raw string) (float64, string) {
	raw = strings.TrimSpace(raw)
	if m := winDriverRe.FindStringSubmatch(raw); m != nil {
		digits := m[1] + fmt.Sprintf("%04s", m[2])
		digits = strings.ReplaceAll(digits, " ", "0")
		if len(digits) >= 5 {
			d := digits[len(digits)-5:]
			v, _ := strconv.ParseFloat(d[:3]+"."+d[3:], 64)
			return v, d[:3] + "." + d[3:]
		}
	}
	parts := strings.Split(raw, ".")
	if len(parts) >= 2 {
		v, err := strconv.ParseFloat(parts[0]+"."+parts[1], 64)
		if err == nil && v > 100 {
			return v, raw
		}
	}
	return 0, raw
}

func planGPU(gpus []GPU, goos string, h gpuHost) GPUPlan {
	plan := GPUPlan{Mode: "none", GPU: gpuNames(gpus)}
	if len(gpus) == 0 {
		plan.Note = "No GPU found — Orchestra runs on the CPU worker and your cloud AI keys."
		return plan
	}
	var nv *GPU
	for i := range gpus {
		if gpus[i].Vendor == "nvidia" {
			if nv == nil || gpus[i].Source == "nvidia-smi" {
				nv = &gpus[i]
			}
		}
	}
	ollamaHint := ""
	if goos == "linux" && h.OllamaBridge != nil {
		if loop, bridge := h.OllamaBridge(); loop && !bridge {
			ollamaHint = " Ollama on this computer only listens on 127.0.0.1, so containers cannot reach it: run `sudo systemctl edit ollama`, add `Environment=OLLAMA_HOST=0.0.0.0` under [Service], then `sudo systemctl restart ollama`."
		}
	}

	if nv != nil {
		plan.Mode, plan.Vendor, plan.Profile = "container", "nvidia", "gpu"
		v, shown := nvidiaDriver(nv.Driver)
		plan.Driver = shown
		min := minNvidiaLinux
		if goos == "windows" {
			min = minNvidiaWindows
		}
		switch {
		case goos == "darwin":
			plan.Note = "Macs cannot pass an NVIDIA GPU into containers."
		case v > 0 && v < min:
			plan.Note = fmt.Sprintf("NVIDIA driver %s is too old for the GPU worker (CUDA 12.1 needs %.2f or newer).", shown, min)
			plan.Fix, plan.FixURL = "Update the NVIDIA driver, restart the computer, then run AXTO Setup again.", nvidiaDriverURL
		case goos == "linux":
			if strings.Contains(h.Runtimes(), `"nvidia"`) || (h.CDI != nil && h.CDI()) {
				plan.Ready = true
			} else {
				plan.Note = "An NVIDIA GPU is present, but Docker cannot use it yet."
				plan.Fix = "Install nvidia-container-toolkit, run `sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker`, then run AXTO Setup again."
				plan.FixURL = nvidiaToolkitURL
			}
		default: // windows
			k := strings.ToLower(h.Kernel())
			if strings.Contains(k, "wsl2") || strings.Contains(k, "microsoft") {
				plan.Ready = true
			} else {
				plan.Note = "Docker Desktop runs on the Hyper-V engine, which cannot pass a GPU to containers."
				plan.Fix = "Docker Desktop → Settings → General → tick “Use the WSL 2 based engine”, Apply & restart, then click “Check again”."
				plan.FixURL = wslGPUURL
			}
		}
		if plan.Ready {
			plan.Auto = true
			plan.Note = fmt.Sprintf("%s is ready for the GPU worker", plan.GPU)
			if plan.Driver != "" {
				plan.Note += " (driver " + plan.Driver + ")"
			}
			plan.Note += " — it is tested inside the worker image before it starts."
		}
		plan.Note += ollamaHint
		return plan
	}

	// AMD on Linux: the ROCm build of the same worker image, with /dev/kfd and /dev/dri.
	if amd := firstVendor(gpus, "amd"); amd != nil && goos == "linux" && h.AMDDevices != nil {
		plan.Vendor, plan.Profile, plan.Driver = "amd", "gpu-amd", amd.Driver
		kfd, render, drv := h.AMDDevices()
		if kfd && render && (drv == "" || drv == "amdgpu") {
			plan.Mode, plan.Ready, plan.Auto = "container", true, true
			plan.Note = plan.GPU + " is ready for the AMD GPU worker (ROCm) — it is tested inside the worker image before it starts." + ollamaHint
			return plan
		}
		plan.Mode = "host"
		switch {
		case drv != "" && drv != "amdgpu":
			plan.Note = fmt.Sprintf("%s uses the %s kernel driver; the AMD GPU worker needs amdgpu (ROCm).", plan.GPU, drv)
		case !kfd:
			plan.Note = plan.GPU + " found, but /dev/kfd is missing, so containers cannot compute on it."
		default:
			plan.Note = plan.GPU + " found, but no AMD render node (/dev/dri/renderD*) is present."
		}
		plan.Fix, plan.FixURL = "Install the amdgpu driver with ROCm (amdgpu-install --usecase=rocm), reboot, then run AXTO Setup again. Until then Ollama on this computer can use the card.", rocmInstallURL
		plan.Note += ollamaHint
		return plan
	}

	// Intel, Apple, AMD on Windows/macOS and every other brand: Ollama on this computer drives them directly.
	plan.Mode, plan.Vendor = "host", gpus[0].Vendor
	reachable, onGPU := false, false
	if h.Ollama != nil {
		reachable, onGPU = h.Ollama()
	}
	why := "Docker Desktop passes only NVIDIA GPUs into containers"
	if goos == "linux" {
		why = "the GPU worker image is built for NVIDIA CUDA"
	}
	if reachable && onGPU {
		plan.Note = plan.GPU + ": Ollama on this computer already runs its models on this GPU. Add an Ollama worker in Orchestra → Workers (provider Ollama) to use it; " + why + "."
	} else {
		plan.Note = plan.GPU + " found; " + why + ". Install Ollama (https://ollama.com), run a model once (`ollama run llama3.2`) and check that `ollama ps` shows GPU, then add an Ollama worker in Orchestra → Workers."
	}
	plan.Note += ollamaHint
	return plan
}

// hostGPUQuestions answers planGPU's questions on this computer.
func hostGPUQuestions(ctx context.Context) gpuHost {
	return gpuHost{
		Runtimes: func() string { out, _ := dockerCmd(ctx, "info", "--format", "{{json .Runtimes}}"); return out },
		Kernel:   func() string { out, _ := dockerCmd(ctx, "info", "--format", "{{.KernelVersion}}"); return out },
		CDI: func() bool {
			for _, p := range []string{"/etc/cdi/nvidia.yaml", "/var/run/cdi/nvidia.yaml", "/etc/cdi/nvidia.json", "/var/run/cdi/nvidia.json"} {
				if _, err := os.Stat(p); err == nil {
					return true
				}
			}
			return false
		},
		Ollama: func() (bool, bool) { r, g, _ := OllamaOnGPU(ctx); return r, g },
		AMDDevices: func() (bool, bool, string) {
			_, err := os.Stat("/dev/kfd")
			render, drv := false, ""
			nodes, _ := filepath.Glob("/sys/class/drm/renderD*")
			for _, n := range nodes {
				v, _ := os.ReadFile(filepath.Join(n, "device", "vendor"))
				if strings.TrimSpace(string(v)) != "0x1002" {
					continue
				}
				if _, e := os.Stat(filepath.Join("/dev/dri", filepath.Base(n))); e == nil {
					render = true
				}
				if link, e := os.Readlink(filepath.Join(n, "device", "driver")); e == nil {
					drv = filepath.Base(link)
				}
			}
			return err == nil, render, drv
		},
		OllamaBridge: func() (bool, bool) {
			loop := httpOK(ctx, "http://127.0.0.1:11434/api/version")
			if !loop {
				return false, false
			}
			gw, _ := dockerCmd(ctx, "network", "inspect", "bridge", "--format", "{{(index .IPAM.Config 0).Gateway}}")
			gw = strings.TrimSpace(gw)
			if gw == "" {
				return true, true // cannot tell: do not warn
			}
			return true, httpOK(ctx, "http://"+gw+":11434/api/version")
		},
	}
}

func httpOK(ctx context.Context, url string) bool {
	c, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(c, http.MethodGet, url, nil)
	if err != nil {
		return false
	}
	resp, err := (&http.Client{Transport: &http.Transport{Proxy: nil}}).Do(req)
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode < 500
}

// ProbeResult is what the GPU test inside the worker image found.
type ProbeResult struct {
	OK     bool     `json:"ok"`
	GPUs   []string `json:"gpus"`
	Torch  string   `json:"torch"`
	Detail string   `json:"detail"`
}

// probeArgs is the docker run that hands the GPU to the worker image exactly as compose will.
func probeArgs(image, vendor string, entry ...string) []string {
	args := []string{"run", "--rm"}
	switch vendor {
	case "amd":
		args = append(args, "--device", "/dev/kfd", "--device", "/dev/dri", "--group-add", "video")
	case "intel":
		args = append(args, "--device", "/dev/dri")
	default:
		args = append(args, "--gpus", "all")
	}
	return append(append(args, "--entrypoint", entry[0], image), entry[1:]...)
}

// parseProbe reads `python -m orchestra_worker.probe` output (one JSON line).
func parseProbe(out string, err error) ProbeResult {
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "{") {
			var r ProbeResult
			if json.Unmarshal([]byte(line), &r) == nil {
				if !r.OK && r.Detail == "" {
					r.Detail = "no usable GPU inside the worker container"
				}
				return r
			}
		}
	}
	return ProbeResult{OK: false, Detail: strings.TrimSpace(lastLines(out, 4))}
}

// probeGPU runs the GPU test inside the worker image before the GPU worker starts.
// Images built before the test existed answer with nvidia-smi instead.
func probeGPU(ctx context.Context, image, vendor string) ProbeResult {
	c, cancel := context.WithTimeout(ctx, 3*time.Minute)
	defer cancel()
	out, err := dockerCmd(c, probeArgs(image, vendor, "python", "-m", "orchestra_worker.probe")...)
	if strings.Contains(out, "No module named orchestra_worker.probe") && vendor == "nvidia" {
		out2, err2 := dockerCmd(c, probeArgs(image, vendor, "nvidia-smi", "-L")...)
		if err2 == nil && strings.Contains(out2, "GPU ") {
			var names []string
			for _, l := range strings.Split(strings.TrimSpace(out2), "\n") {
				names = append(names, strings.TrimSpace(l))
			}
			return ProbeResult{OK: true, GPUs: names, Detail: "nvidia-smi"}
		}
		return ProbeResult{OK: false, Detail: strings.TrimSpace(lastLines(out2, 4))}
	}
	r := parseProbe(out, err)
	if err != nil && r.OK {
		r.OK = false
	}
	return r
}
