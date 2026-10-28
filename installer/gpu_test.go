// Copyright (c) 2024-2026 Axto AI. All rights reserved.
package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const lspciSample = `00:02.0 "VGA compatible controller" "Intel Corporation" "Alder Lake-P GT2 [Iris Xe Graphics]" -r0c
01:00.0 "VGA compatible controller" "NVIDIA Corporation" "GA102 [GeForce RTX 3090]" -ra1
03:00.0 "Display controller" "Advanced Micro Devices, Inc. [AMD/ATI]" "Navi 31 [Radeon RX 7900 XT/7900 XTX]" -rc8
04:00.0 "VGA compatible controller" "Moore Threads Technology Co., Ltd." "MTT S80 [MUSA GPU]" -r01
05:00.0 "Processing accelerators" "Huawei Technologies Co., Ltd." "Ascend 910 [AI Processor]" -r00
06:00.0 "VGA compatible controller" "Microsoft Corporation" "Hyper-V virtual display adapter" -r00
07:00.0 "VGA compatible controller" "Red Hat, Inc." "Virtio GPU" -r00
08:00.0 "Ethernet controller" "Intel Corporation" "I210 Gigabit Network Connection" -r03
`

func TestBrandOfEveryMaker(t *testing.T) {
	cases := map[string]string{
		"NVIDIA Corporation":                     "nvidia",
		"Advanced Micro Devices, Inc. [AMD/ATI]": "amd",
		"Intel Corporation":                      "intel",
		"Apple Inc.":                             "apple",
		"Moore Threads Technology":               "moore",
		"Huawei Technologies Co., Ltd.":          "huawei",
		"Biren Technology":                       "biren",
		"Iluvatar CoreX":                         "iluvatar",
		"MetaX Integrated Circuits":              "metax",
		"Enflame Technology":                     "enflame",
		"Cambricon Technologies":                 "cambricon",
		"Hygon":                                  "hygon",
		"Qualcomm Technologies, Inc.":            "qualcomm",
		"Arm Ltd. Mali-G78":                      "arm",
		"Matrox Electronics":                     "matrox",
	}
	for name, want := range cases {
		if key, _ := brandOf(name); key != want {
			t.Errorf("brandOf(%q) = %q, want %q", name, key, want)
		}
	}
	if key, label := brandOf("Acme Compute Corp."); key != "other" || label != "Acme Compute" {
		t.Errorf("unknown maker: got %q %q", key, label)
	}
}

func TestLspciFindsEveryDisplayBrandAndSkipsVirtualAndNetwork(t *testing.T) {
	gpus := parseLspci(lspciSample)
	var keys []string
	names := map[string]string{}
	for _, g := range gpus {
		keys = append(keys, g.Vendor)
		names[g.Vendor] = g.Name
	}
	if strings.Join(keys, ",") != "intel,nvidia,amd,moore,huawei" {
		t.Fatalf("vendors = %v", keys)
	}
	want := map[string]string{
		"nvidia": "NVIDIA GeForce RTX 3090",
		"amd":    "AMD Radeon RX 7900 XT/7900 XTX",
		"intel":  "Intel Iris Xe Graphics",
		"moore":  "Moore Threads MUSA GPU",
		"huawei": "Huawei Ascend AI Processor",
	}
	for k, v := range want {
		if names[k] != v {
			t.Errorf("%s name = %q, want %q", k, names[k], v)
		}
	}
}

func TestSysfsIsTheFallbackWithoutLspci(t *testing.T) {
	root := t.TempDir()
	card := func(name, cls, vendor, device string) {
		d := filepath.Join(root, name)
		if err := os.MkdirAll(d, 0o755); err != nil {
			t.Fatal(err)
		}
		for f, v := range map[string]string{"class": cls, "vendor": vendor, "device": device} {
			if err := os.WriteFile(filepath.Join(d, f), []byte(v+"\n"), 0o644); err != nil {
				t.Fatal(err)
			}
		}
	}
	card("pci-0000-01-00.0", "0x030000", "0x10de", "0x2204")
	card("pci-0000-03-00.0", "0x030000", "0x1002", "0x744c")
	card("pci-0000-05-00.0", "0x120000", "0x19e5", "0xd802")
	card("pci-0000-06-00.0", "0x030000", "0x1414", "0x008c") // Microsoft: virtual
	card("pci-0000-08-00.0", "0x020000", "0x8086", "0x1533") // network card
	gpus := sysfsGPUs(root)
	var keys []string
	for _, g := range gpus {
		keys = append(keys, g.Vendor)
	}
	if strings.Join(keys, ",") != "nvidia,amd,huawei" {
		t.Fatalf("vendors = %v", keys)
	}
	if gpus[0].Name != "NVIDIA GPU (PCI 10de:2204)" || gpus[0].Source != "sysfs" {
		t.Errorf("first = %+v", gpus[0])
	}
}

func TestVendorToolsGiveExactModelAndVRAM(t *testing.T) {
	smi := parseNvidiaSMI("NVIDIA GeForce RTX 4090, 24564, 560.35.03\nNVIDIA RTX A4000, 16376, 560.35.03\n")
	if smi[0].Name != "NVIDIA GeForce RTX 4090" || smi[0].Driver != "560.35.03" || smi[1].VRAMGB < 15.9 {
		t.Errorf("nvidia-smi = %+v", smi)
	}
	rocm := parseRocmSMI(`{"card0":{"Card series":"Radeon RX 7900 XTX","Card model":"0x744c","VRAM Total Memory (B)":"` +
		"25769803776" + `"},"system":{"Driver version":"6.10"}}`)
	if len(rocm) != 1 || rocm[0].Name != "AMD Radeon RX 7900 XTX" || rocm[0].VRAMGB != 24 {
		t.Errorf("rocm-smi = %+v", rocm)
	}
	// Only a PCI id: no made-up name.
	if r := parseRocmSMI(`{"card0":{"Card model":"0x744c"}}`); len(r) != 1 || r[0].Name != "AMD Radeon GPU" {
		t.Errorf("rocm-smi without a series = %+v", r)
	}
	xpu := parseXpuSMI(`{"device_list":[{"device_id":0,"device_name":"Intel(R) Arc(TM) A770 Graphics","memory_physical_size_byte":17179869184}]}`)
	if len(xpu) != 1 || xpu[0].Name != "Intel(R) Arc(TM) A770 Graphics" || xpu[0].VRAMGB != 16 {
		t.Errorf("xpu-smi = %+v", xpu)
	}
}

func TestMergePrefersTheVendorToolForItsBrand(t *testing.T) {
	base := parseLspci(lspciSample)
	exact := map[string][]GPU{"nvidia": {{Vendor: "nvidia", Label: "NVIDIA", Name: "NVIDIA GeForce RTX 3090", VRAMGB: 24, Source: "nvidia-smi"}}}
	out := merge(base, exact)
	var nvidia []GPU
	for _, g := range out {
		if g.Vendor == "nvidia" {
			nvidia = append(nvidia, g)
		}
	}
	if len(nvidia) != 1 || nvidia[0].Source != "nvidia-smi" {
		t.Fatalf("nvidia entries = %+v", nvidia)
	}
	if len(out) != len(base) {
		t.Errorf("other brands must stay: %d → %d", len(base), len(out))
	}
}

func TestWindowsRowsUseRegistryVRAMAndSkipBasicDisplay(t *testing.T) {
	rows := `[{"Name":"Microsoft Basic Display Adapter","AdapterCompatibility":"Microsoft","DriverVersion":"10.0"},` +
		`{"Name":"NVIDIA GeForce RTX 4080","AdapterCompatibility":"NVIDIA","DriverVersion":"566.36"},` +
		`{"Name":"Intel(R) Arc(TM) A380 Graphics","AdapterCompatibility":"Intel Corporation","DriverVersion":"31.0"}]`
	gpus := parseWindowsGPUs(rows, map[string]float64{"NVIDIA GeForce RTX 4080": 16})
	if len(gpus) != 2 || gpus[0].Vendor != "nvidia" || gpus[0].VRAMGB != 16 || gpus[0].Driver != "566.36" || gpus[1].Vendor != "intel" {
		t.Errorf("windows = %+v", gpus)
	}
	single := parseWindowsGPUs(`{"Name":"AMD Radeon RX 6600","AdapterCompatibility":"Advanced Micro Devices, Inc."}`, nil)
	if len(single) != 1 || single[0].Vendor != "amd" {
		t.Errorf("single row = %+v", single)
	}
}

func TestMacAppleSiliconIsAGPU(t *testing.T) {
	gpus := parseSystemProfiler(`{"SPDisplaysDataType":[{"sppci_model":"Apple M3 Pro","sppci_vendor":"sppci_vendor_Apple"}]}`)
	if len(gpus) != 1 || gpus[0].Name != "Apple M3 Pro" || gpus[0].Vendor != "apple" {
		t.Errorf("system_profiler = %+v", gpus)
	}
}

func TestGPUNamesLine(t *testing.T) {
	line := gpuNames([]GPU{{Name: "NVIDIA GeForce RTX 4090", VRAMGB: 24}, {Name: "Intel Arc", VRAMGB: 0}})
	if line != "NVIDIA GeForce RTX 4090 (24 GB) + Intel Arc" {
		t.Errorf("line = %q", line)
	}
}

func TestOllamaReportsGPUUseForAnyBrand(t *testing.T) {
	body, _ := json.Marshal(map[string]any{"models": []map[string]any{{"name": "llama3.2", "size_vram": 4_000_000_000}}})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write(body) }))
	defer srv.Close()
	old := ollamaPSURL
	ollamaPSURL = srv.URL + "/api/ps"
	defer func() { ollamaPSURL = old }()
	reachable, onGPU, models := OllamaOnGPU(context.Background())
	if !reachable || !onGPU || models != 1 {
		t.Errorf("reachable=%v onGPU=%v models=%d", reachable, onGPU, models)
	}
}

func TestOllamaUnreachableAndOnCPU(t *testing.T) {
	old := ollamaPSURL
	ollamaPSURL = "http://127.0.0.1:9/api/ps"
	defer func() { ollamaPSURL = old }()
	if reachable, _, _ := OllamaOnGPU(context.Background()); reachable {
		t.Error("nothing listens on port 9, yet reachable")
	}
	body := `{"models":[{"name":"phi3","size_vram":0}]}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(body)) }))
	defer srv.Close()
	ollamaPSURL = srv.URL + "/api/ps"
	if _, onGPU, _ := OllamaOnGPU(context.Background()); onGPU {
		t.Error("a model with no VRAM use reported as on the GPU")
	}
}

func TestReadinessNamesTheRealCause(t *testing.T) {
	old := ollamaPSURL
	ollamaPSURL = "http://127.0.0.1:9/api/ps"
	defer func() { ollamaPSURL = old }()
	amd := []GPU{{Vendor: "amd", Label: "AMD", Name: "AMD Radeon RX 7900 XTX", VRAMGB: 24}}
	ready, note, onGPU := gpuReadiness(context.Background(), amd, "linux", func() string { return "" })
	if ready || onGPU || !strings.Contains(note, "Install Ollama") || !strings.Contains(note, "AMD Radeon RX 7900 XTX") {
		t.Errorf("amd without ollama: ready=%v onGPU=%v note=%q", ready, onGPU, note)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"models":[{"name":"llama3.2","size_vram":1}]}`))
	}))
	defer srv.Close()
	ollamaPSURL = srv.URL + "/api/ps"
	ready, note, onGPU = gpuReadiness(context.Background(), amd, "linux", func() string { return "" })
	if ready || !onGPU || !strings.Contains(note, "Add an Ollama worker") {
		t.Errorf("amd with ollama on GPU: ready=%v onGPU=%v note=%q", ready, onGPU, note)
	}
	nv := []GPU{{Vendor: "nvidia", Label: "NVIDIA", Name: "NVIDIA GeForce RTX 4090"}}
	ready, note, _ = gpuReadiness(context.Background(), nv, "linux", func() string { return "" })
	if ready || !strings.Contains(note, "nvidia-container-toolkit") {
		t.Errorf("nvidia without the runtime: ready=%v note=%q", ready, note)
	}
	ready, _, _ = gpuReadiness(context.Background(), nv, "linux", func() string { return `{"nvidia":{}}` })
	if !ready {
		t.Error("nvidia with the nvidia runtime must be ready")
	}
}
