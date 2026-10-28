// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//
// GPU detection for every brand (REQUESTS 113, BLUEPRINT-V4 §31). The same rules as
// orchestra_worker/gpu_inventory.py, so the installer and the GPU worker agree:
//
//	Linux    lspci (pciutils) names the PCI vendors of the world; /sys/bus/pci if lspci is missing
//	Windows  Win32_VideoController; VRAM from the driver registry (AdapterRAM stops at 4 GB)
//	macOS    system_profiler (Apple silicon and older Macs)
//
// nvidia-smi, rocm-smi and xpu-smi add the exact model and VRAM when they are installed.
// Virtual adapters (Microsoft Basic Display, QEMU, VMware, VirtIO …) are not GPUs.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
)

// GPU is one graphics or accelerator card of this computer, of any brand.
type GPU struct {
	Vendor string  `json:"vendor"`       // nvidia, amd, intel, apple, moore, huawei, … or other
	Label  string  `json:"vendor_label"` // NVIDIA, AMD, Intel, Apple, …
	Name   string  `json:"name"`
	VRAMGB float64 `json:"vram_gb"`
	Driver string  `json:"driver,omitempty"`
	Source string  `json:"source"` // lspci, sysfs, win32, system_profiler, nvidia-smi, rocm-smi, xpu-smi
}

type brand struct {
	key, label string
	words      []string
}

// Brand keys in the order a primary GPU is chosen: dedicated AI cards first.
var brands = []brand{
	{"nvidia", "NVIDIA", []string{"nvidia"}},
	{"amd", "AMD", []string{"advanced micro devices", "amd/ati", "ati technologies", "amd ", "radeon"}},
	{"intel", "Intel", []string{"intel"}},
	{"apple", "Apple", []string{"apple"}},
	{"moore", "Moore Threads", []string{"moore threads", "mthreads"}},
	{"huawei", "Huawei Ascend", []string{"huawei", "hisilicon", "ascend"}},
	{"biren", "Biren", []string{"biren"}},
	{"iluvatar", "Iluvatar CoreX", []string{"iluvatar", "corex"}},
	{"metax", "MetaX", []string{"metax", "muxi"}},
	{"enflame", "Enflame", []string{"enflame"}},
	{"cambricon", "Cambricon", []string{"cambricon"}},
	{"hygon", "Hygon", []string{"hygon"}},
	{"qualcomm", "Qualcomm", []string{"qualcomm", "adreno"}},
	{"arm", "Arm", []string{"arm mali", "mali-", "arm ltd"}},
	{"matrox", "Matrox", []string{"matrox"}},
}

var virtualMarkers = []string{"microsoft basic", "microsoft remote display", "remote display adapter", "vmware",
	"virtualbox", "innotek", "qemu", "bochs", "virtio", "hyper-v", "parallels", "citrix", "virtual display", "virtual desktop"}

// PCI vendor ids for /sys/bus/pci when lspci is not installed.
var sysfsVendors = map[int64][2]string{
	0x10de: {"nvidia", "NVIDIA"}, 0x1002: {"amd", "AMD"}, 0x8086: {"intel", "Intel"}, 0x106b: {"apple", "Apple"},
	0x1ed5: {"moore", "Moore Threads"}, 0x19e5: {"huawei", "Huawei Ascend"}, 0x5143: {"qualcomm", "Qualcomm"},
	0x13b5: {"arm", "Arm"},
}
var sysfsVirtual = map[int64]bool{0x1414: true, 0x15ad: true, 0x1234: true, 0x1af4: true, 0x80ee: true}

var (
	quotedField = regexp.MustCompile(`"([^"]*)"`)
	bracketed   = regexp.MustCompile(`\[([^\]]+)\]`)
	hexPCIID    = regexp.MustCompile(`^[0-9a-fA-F]{4}:[0-9a-fA-F]{4}$`)
	vendorNoise = regexp.MustCompile(`(?i)\s*\[.*?\]|,?\s*\b(inc|corporation|corp|co|ltd|limited)\b\.?`)
)

// ollamaPSURL is where the model server on this computer reports loaded models.
var ollamaPSURL = "http://127.0.0.1:11434/api/ps"

// brandOf returns the brand key and label for the names a computer reports.
func brandOf(names ...string) (string, string) {
	text := strings.ToLower(strings.Join(names, " "))
	for _, b := range brands {
		for _, w := range b.words {
			if strings.Contains(text, w) {
				return b.key, b.label
			}
		}
	}
	for _, n := range names {
		if strings.TrimSpace(n) != "" {
			return "other", strings.Trim(vendorNoise.ReplaceAllString(n, ""), " ,.")
		}
	}
	return "other", "Other"
}

func isVirtual(name string) bool {
	l := strings.ToLower(name)
	for _, m := range virtualMarkers {
		if strings.Contains(l, m) {
			return true
		}
	}
	return false
}

// named puts the brand in front of a model name unless the model already says it.
func named(label, model string) string {
	if model == "" {
		return label
	}
	if strings.Contains(strings.ToLower(model), strings.ToLower(label)) {
		return model
	}
	return label + " " + model
}

// lspciModel takes the marketing name from lspci's device string: "GA102 [GeForce RTX 3090]" → "GeForce RTX 3090".
func lspciModel(device string) string {
	m := bracketed.FindAllStringSubmatch(device, -1)
	for i := len(m) - 1; i >= 0; i-- {
		if v := strings.TrimSpace(m[i][1]); !hexPCIID.MatchString(v) {
			return v
		}
	}
	return strings.TrimSpace(device)
}

func displayClass(c string) bool {
	for _, d := range []string{"vga compatible controller", "3d controller", "display controller", "processing accelerators"} {
		if strings.Contains(c, d) {
			return true
		}
	}
	return false
}

// parseLspci reads `lspci -mm` output: display and accelerator devices only.
func parseLspci(text string) []GPU {
	var out []GPU
	for _, line := range strings.Split(text, "\n") {
		f := quotedField.FindAllStringSubmatch(line, -1)
		if len(f) < 3 {
			continue
		}
		cls, vendor, device := strings.ToLower(f[0][1]), f[1][1], f[2][1]
		if !displayClass(cls) || isVirtual(vendor+" "+device) {
			continue
		}
		key, label := brandOf(vendor)
		out = append(out, GPU{Vendor: key, Label: label, Name: named(label, lspciModel(device)), Source: "lspci"})
	}
	return out
}

func readHex(path string) (int64, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}
	return strconv.ParseInt(strings.TrimPrefix(strings.TrimSpace(string(b)), "0x"), 16, 64)
}

// sysfsGPUs reads the kernel's PCI tree — works with no tool installed.
func sysfsGPUs(root string) []GPU {
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil
	}
	var out []GPU
	for _, e := range entries {
		dir := filepath.Join(root, e.Name())
		cls, err1 := readHex(filepath.Join(dir, "class"))
		ven, err2 := readHex(filepath.Join(dir, "vendor"))
		if err1 != nil || err2 != nil {
			continue
		}
		if (cls>>16) != 0x03 && (cls>>16) != 0x12 { // display controllers and processing accelerators
			continue
		}
		if sysfsVirtual[ven] {
			continue
		}
		key, label := "other", fmt.Sprintf("PCI %04x", ven)
		if v, ok := sysfsVendors[ven]; ok {
			key, label = v[0], v[1]
		}
		dev, _ := os.ReadFile(filepath.Join(dir, "device"))
		out = append(out, GPU{Vendor: key, Label: label, Source: "sysfs",
			Name: fmt.Sprintf("%s GPU (PCI %04x:%s)", label, ven, strings.TrimPrefix(strings.TrimSpace(string(dev)), "0x"))})
	}
	return out
}

func toFloat(v any) float64 {
	switch x := v.(type) {
	case float64:
		return x
	case string:
		f, _ := strconv.ParseFloat(strings.TrimSpace(x), 64)
		return f
	}
	return 0
}

// parseNvidiaSMI reads `nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits`.
func parseNvidiaSMI(text string) []GPU {
	var out []GPU
	for _, line := range strings.Split(strings.TrimSpace(text), "\n") {
		f := strings.Split(line, ",")
		if len(f) == 0 || strings.TrimSpace(f[0]) == "" {
			continue
		}
		g := GPU{Vendor: "nvidia", Label: "NVIDIA", Source: "nvidia-smi", Name: named("NVIDIA", strings.TrimSpace(f[0]))}
		if len(f) > 1 {
			g.VRAMGB = toFloat(strings.TrimSpace(f[1])) / 1024
		}
		if len(f) > 2 {
			g.Driver = strings.TrimSpace(f[2])
		}
		out = append(out, g)
	}
	return out
}

// parseRocmSMI reads `rocm-smi --showproductname --showmeminfo vram --json`: one object per card.
func parseRocmSMI(text string) []GPU {
	var data map[string]any
	if json.Unmarshal([]byte(text), &data) != nil {
		return nil
	}
	cards := make([]string, 0, len(data))
	for k := range data {
		if strings.HasPrefix(k, "card") {
			cards = append(cards, k)
		}
	}
	sort.Strings(cards)
	var out []GPU
	for _, c := range cards {
		info, ok := data[c].(map[string]any)
		if !ok {
			continue
		}
		// Map order is random: pick the name by preference, never by iteration order.
		// "Card series" is the marketing name; "Card model" is often a PCI id (0x744c).
		model, vram := "", 0.0
		for _, want := range []string{"series", "model", "sku"} {
			for k, v := range info {
				s := strings.TrimSpace(fmt.Sprint(v))
				if strings.Contains(strings.ToLower(k), want) && s != "" && !strings.HasPrefix(strings.ToLower(s), "0x") && (model == "" || k < model) {
					model = k
				}
			}
			if model != "" {
				model = strings.TrimSpace(fmt.Sprint(info[model]))
				break
			}
		}
		for k, v := range info {
			if strings.Contains(strings.ToLower(k), "vram total memory") {
				vram = toFloat(v) / (1 << 30)
			}
		}
		if model == "" {
			model = "Radeon GPU"
		}
		out = append(out, GPU{Vendor: "amd", Label: "AMD", Name: named("AMD", model), VRAMGB: vram, Source: "rocm-smi"})
	}
	return out
}

// parseXpuSMI reads `xpu-smi discovery -j` (Intel Arc, Data Center GPU, Xe).
func parseXpuSMI(text string) []GPU {
	var data struct {
		DeviceList []struct {
			Name string  `json:"device_name"`
			Mem  float64 `json:"memory_physical_size_byte"`
		} `json:"device_list"`
	}
	if json.Unmarshal([]byte(text), &data) != nil {
		return nil
	}
	var out []GPU
	for _, d := range data.DeviceList {
		name := strings.TrimSpace(d.Name)
		g := GPU{Vendor: "intel", Label: "Intel", Source: "xpu-smi", VRAMGB: d.Mem / (1 << 30), Name: "Intel GPU"}
		if name != "" {
			g.Name = named("Intel", name)
		}
		out = append(out, g)
	}
	return out
}

// parseWindowsGPUs reads Win32_VideoController rows (ConvertTo-Json: one object or a list).
func parseWindowsGPUs(videoJSON string, vramByName map[string]float64) []GPU {
	rows := parseJSONRows(videoJSON)
	var out []GPU
	for _, r := range rows {
		name := strings.TrimSpace(fmt.Sprint(r["Name"]))
		if name == "" || name == "<nil>" || isVirtual(name) {
			continue
		}
		key, label := brandOf(name, fmt.Sprint(r["AdapterCompatibility"]))
		out = append(out, GPU{Vendor: key, Label: label, Name: named(label, name), VRAMGB: vramByName[name],
			Driver: strings.TrimSpace(fmt.Sprint(r["DriverVersion"])), Source: "win32"})
	}
	return out
}

// parseSystemProfiler reads `system_profiler SPDisplaysDataType -json` (macOS).
func parseSystemProfiler(text string) []GPU {
	var data struct {
		Items []struct {
			Model  string `json:"sppci_model"`
			Vendor string `json:"sppci_vendor"`
		} `json:"SPDisplaysDataType"`
	}
	if json.Unmarshal([]byte(text), &data) != nil {
		return nil
	}
	var out []GPU
	for _, it := range data.Items {
		name := strings.TrimSpace(it.Model)
		if name == "" || isVirtual(name) {
			continue
		}
		key, label := brandOf(name, strings.TrimPrefix(it.Vendor, "sppci_vendor_"))
		out = append(out, GPU{Vendor: key, Label: label, Name: named(label, name), Source: "system_profiler"})
	}
	return out
}

// parseJSONRows decodes one JSON object or a list of objects.
func parseJSONRows(text string) []map[string]any {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	if strings.HasPrefix(text, "{") {
		var one map[string]any
		if json.Unmarshal([]byte(text), &one) == nil {
			return []map[string]any{one}
		}
		return nil
	}
	var many []map[string]any
	if json.Unmarshal([]byte(text), &many) == nil {
		return many
	}
	return nil
}

// runCmd returns a command's output, or nothing when it is not installed or fails.
func runCmd(ctx context.Context, name string, args ...string) string {
	cmd := exec.CommandContext(ctx, name, args...)
	hideWindow(cmd)
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return string(out)
}

// vendorTools returns exact GPUs by brand from whichever vendor tool is installed.
func vendorTools(ctx context.Context) map[string][]GPU {
	out := map[string][]GPU{}
	if g := parseNvidiaSMI(runCmd(ctx, "nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits")); len(g) > 0 {
		out["nvidia"] = g
	}
	if g := parseRocmSMI(runCmd(ctx, "rocm-smi", "--showproductname", "--showmeminfo", "vram", "--json")); len(g) > 0 {
		out["amd"] = g
	}
	if g := parseXpuSMI(runCmd(ctx, "xpu-smi", "discovery", "-j")); len(g) > 0 {
		out["intel"] = g
	}
	return out
}

// windowsGPUs asks Windows for the adapters and the VRAM the driver registered.
func windowsGPUs(ctx context.Context) []GPU {
	video := runCmd(ctx, "powershell", "-NoProfile", "-NonInteractive", "-Command",
		"Get-CimInstance Win32_VideoController | Select-Object Name,AdapterCompatibility,DriverVersion | ConvertTo-Json -Compress")
	reg := runCmd(ctx, "powershell", "-NoProfile", "-NonInteractive", "-Command",
		`Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}' -ErrorAction SilentlyContinue | `+
			`ForEach-Object { [pscustomobject]@{ DriverDesc = $_.GetValue('DriverDesc'); MemoryBytes = $_.GetValue('HardwareInformation.qwMemorySize') } } | ConvertTo-Json -Compress`)
	vram := map[string]float64{}
	for _, r := range parseJSONRows(reg) {
		if d := strings.TrimSpace(fmt.Sprint(r["DriverDesc"])); d != "" {
			vram[d] = toFloat(r["MemoryBytes"]) / (1 << 30)
		}
	}
	return parseWindowsGPUs(video, vram)
}

// merge replaces the GPUs of a brand with the exact ones a vendor tool reported.
func merge(base []GPU, exact map[string][]GPU) []GPU {
	out := base
	for brandKey, found := range exact {
		var keep []GPU
		for _, g := range out {
			if g.Vendor != brandKey {
				keep = append(keep, g)
			}
		}
		out = append(keep, found...)
	}
	return out
}

// DetectGPUs lists every graphics or accelerator card of this computer, best first.
func DetectGPUs(ctx context.Context) []GPU {
	c, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	var gpus []GPU
	switch runtime.GOOS {
	case "linux":
		gpus = parseLspci(runCmd(c, "lspci", "-mm"))
		if len(gpus) == 0 {
			gpus = sysfsGPUs("/sys/bus/pci/devices")
		}
		gpus = merge(gpus, vendorTools(c))
	case "windows":
		gpus = merge(windowsGPUs(c), vendorTools(c))
	case "darwin":
		gpus = parseSystemProfiler(runCmd(c, "system_profiler", "SPDisplaysDataType", "-json"))
	}
	var out []GPU
	for _, g := range gpus {
		if !isVirtual(g.Name) {
			out = append(out, g)
		}
	}
	rank := func(key string) int {
		for i, b := range brands {
			if b.key == key {
				return i
			}
		}
		return len(brands)
	}
	sort.SliceStable(out, func(i, j int) bool {
		if ri, rj := rank(out[i].Vendor), rank(out[j].Vendor); ri != rj {
			return ri < rj
		}
		return out[i].VRAMGB > out[j].VRAMGB
	})
	return out
}

// gpuNames is the one-line form for the console and the portal: "NVIDIA GeForce RTX 4090 (24 GB) + …".
func gpuNames(gpus []GPU) string {
	var parts []string
	for _, g := range gpus {
		if g.VRAMGB >= 0.5 {
			parts = append(parts, fmt.Sprintf("%s (%.0f GB)", g.Name, g.VRAMGB))
		} else {
			parts = append(parts, g.Name)
		}
	}
	return strings.Join(parts, " + ")
}

// OllamaOnGPU asks the model server on this computer whether a loaded model runs on a GPU
// (size_vram > 0). That is the same test for every brand: NVIDIA, AMD, Intel, Apple.
func OllamaOnGPU(ctx context.Context) (reachable, onGPU bool, models int) {
	c, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(c, http.MethodGet, ollamaPSURL, nil)
	if err != nil {
		return false, false, 0
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false, false, 0
	}
	defer resp.Body.Close()
	var body struct {
		Models []struct {
			SizeVRAM int64 `json:"size_vram"`
		} `json:"models"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&body); err != nil {
		return true, false, 0
	}
	var vram int64
	for _, m := range body.Models {
		vram += m.SizeVRAM
	}
	return true, vram > 0, len(body.Models)
}
