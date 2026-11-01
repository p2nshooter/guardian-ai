// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//
// The install / update / uninstall pipeline, shared by the wizard and the CLI.
package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

//go:embed bundle
var bundle embed.FS

// Progress receives human-readable steps and a 0–100 completion estimate.
type Progress interface {
	Step(pct int, msg string)
}

type Options struct {
	Product  *Product
	Key      string
	Dir      string // install directory for this product (config + compose)
	Port     int
	LAN      bool   // expose on the network (servers) instead of localhost only
	Portal   string // https://axto.io
	KeepData bool   // uninstall: keep Docker volumes
	// With names the optional images to install as well (Orchestra's GPU worker);
	// nil keeps what is installed, an empty list installs none.
	With []string
	// ImagesDir is an offline package's image folder ("" = images/ next to AXTO Setup).
	ImagesDir string
	Profiles  []string // compose profiles to enable (from the optional images)
	// NoGPU skips the GPU worker even when the GPU plan would include it (CLI --no-gpu).
	NoGPU bool
}

type Installed struct {
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Dir         string    `json:"dir"`
	Port        int       `json:"port"`
	LAN         bool      `json:"lan"`
	KeyTail     string    `json:"key_tail"`
	InstalledAt time.Time `json:"installed_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Images      []string  `json:"images"`
	Profiles    []string  `json:"profiles,omitempty"`
	GPU         *GPUPlan  `json:"gpu,omitempty"`      // the GPU decision at the last install / update
	Warnings    []string  `json:"warnings,omitempty"` // what did not start, and why (e.g. a failed GPU test)
}

var (
	keyPlaceholder = regexp.MustCompile(`[A-Z]{2,5}-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX`)
	changeMe       = regexp.MustCompile(`CHANGE_ME[A-Z_]*`)
)

func randomSecret() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// RenderConfig fills in the licence key and replaces every CHANGE_ME placeholder
// with a strong random secret (each placeholder gets its own value).
func RenderConfig(example []byte, key string) []byte {
	out := keyPlaceholder.ReplaceAll(example, []byte(strings.ToUpper(strings.TrimSpace(key))))
	return changeMe.ReplaceAllFunc(out, func([]byte) []byte { return []byte(randomSecret()) })
}

// RenderCompose maps the product's UI port to the chosen host port and, unless
// LAN access is wanted, binds it to localhost only.
func RenderCompose(compose []byte, p *Product, port int, lan bool) ([]byte, error) {
	re := regexp.MustCompile(`"(?:[0-9.]+:)?` + strconv.Itoa(p.Port) + `:(\d+)"`)
	if !re.Match(compose) {
		return nil, fmt.Errorf("port %d not found in %s", p.Port, p.Compose)
	}
	host := ""
	if !lan {
		host = "127.0.0.1:"
	}
	done := false
	return re.ReplaceAllFunc(compose, func(m []byte) []byte {
		if done {
			return m
		}
		done = true
		sub := re.FindSubmatch(m)
		return []byte(fmt.Sprintf(`"%s%d:%s"`, host, port, sub[1]))
	}), nil
}

func readBundle(name string) ([]byte, error) { return bundle.ReadFile("bundle/" + name) }

// ── portal ───────────────────────────────────────────────────────────────────

type imageLink struct {
	Name      string `json:"name"`
	Label     string `json:"label"`
	Optional  bool   `json:"optional"`
	Available bool   `json:"available"`
	Size      int64  `json:"size"`
	URL       string `json:"url"`
}

type licenceInfo struct {
	OK        bool        `json:"ok"`
	Error     string      `json:"error"`
	Product   string      `json:"product"`
	Name      string      `json:"name"`
	ExpiresAt string      `json:"expires_at"`
	Images    []imageLink `json:"images"`
	Arch      string      `json:"arch"`
	// Lifetime licences: a suite answers Choose (which app?) until one is picked.
	Lifetime  bool   `json:"lifetime"`
	LicenseID string `json:"license_id"`
	Choose    []struct {
		Slug string `json:"slug"`
		Name string `json:"name"`
	} `json:"choose"`
}

var httpClient = &http.Client{Timeout: 0}

// CheckLicence asks the portal what a key covers. product picks the app of a
// lifetime suite key ("" otherwise); arch is the Docker engine's architecture.
func CheckLicence(ctx context.Context, portal, key, product, arch string) (*licenceInfo, error) {
	var info licenceInfo
	if err := portalPost(ctx, portal, map[string]string{"license_key": strings.ToUpper(strings.TrimSpace(key)), "product": product, "arch": arch}, &info); err != nil {
		return nil, err
	}
	return &info, nil
}

// portalPost calls /api/selfhosted/installer and decodes the answer (ok:false → error).
func portalPost(ctx context.Context, portal string, payload map[string]string, out any) error {
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, "POST", strings.TrimRight(portal, "/")+"/api/selfhosted/installer", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "AXTO-Installer/"+Version)
	c := &http.Client{Timeout: 45 * time.Second}
	res, err := c.Do(req)
	if err != nil {
		return fmt.Errorf("cannot reach %s — check your internet connection (%v)", portal, err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(res.Body, 4<<20))
	var head struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal(raw, &head); err != nil {
		return fmt.Errorf("unexpected answer from %s (HTTP %d)", portal, res.StatusCode)
	}
	if !head.OK {
		if head.Error == "" {
			head.Error = fmt.Sprintf("licence check failed (HTTP %d)", res.StatusCode)
		}
		return errors.New(head.Error)
	}
	return json.Unmarshal(raw, out)
}

// activateLifetime asks the portal for this installation's signed activation file
// (uses one device slot of the lifetime licence) and returns its path.
func activateLifetime(ctx context.Context, o Options, machineID string) (string, error) {
	host, _ := os.Hostname()
	var r struct {
		File     string `json:"file"`
		Filename string `json:"filename"`
	}
	if err := portalPost(ctx, o.Portal, map[string]string{"license_key": strings.ToUpper(strings.TrimSpace(o.Key)), "action": "activate",
		"product": o.Product.Slug, "machine_id": machineID, "label": "AXTO Setup · " + host}, &r); err != nil {
		return "", err
	}
	if r.File == "" {
		return "", errors.New("the portal returned no activation file")
	}
	path := filepath.Join(o.Dir, o.Product.Slug+".axto-license")
	if err := os.WriteFile(path, []byte(r.File), 0o600); err != nil {
		return "", err
	}
	return path, nil
}

// installKeyFile keeps a lifetime installer key next to the app (config has no key then).
func installKeyFile(dir string) string { return filepath.Join(dir, ".axto-install-key") }

// download fetches url into path, resuming a partial file, reporting progress.
func download(ctx context.Context, url, path string, expected int64, onBytes func(done, total int64)) error {
	var have int64
	if st, err := os.Stat(path + ".part"); err == nil {
		have = st.Size()
	}
	for attempt := 0; attempt < 5; attempt++ {
		req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
		req.Header.Set("User-Agent", "AXTO-Installer/"+Version)
		if have > 0 {
			req.Header.Set("Range", fmt.Sprintf("bytes=%d-", have))
		}
		res, err := httpClient.Do(req)
		if err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			time.Sleep(time.Duration(attempt+1) * 2 * time.Second)
			continue
		}
		// Size: what the portal told us, else Content-Range / Content-Length
		// (streamed responses may omit Content-Length).
		total := expected
		switch {
		case res.StatusCode == http.StatusPartialContent:
			if total <= 0 {
				if i := strings.LastIndex(res.Header.Get("Content-Range"), "/"); i >= 0 {
					total, _ = strconv.ParseInt(res.Header.Get("Content-Range")[i+1:], 10, 64)
				}
			}
		case res.StatusCode == http.StatusOK:
			have = 0
			if total <= 0 {
				total = res.ContentLength
			}
		case res.StatusCode == http.StatusRequestedRangeNotSatisfiable:
			res.Body.Close()
			return os.Rename(path+".part", path)
		default:
			msg, _ := io.ReadAll(io.LimitReader(res.Body, 500))
			res.Body.Close()
			return fmt.Errorf("download failed (HTTP %d): %s", res.StatusCode, strings.TrimSpace(string(msg)))
		}
		flag := os.O_CREATE | os.O_WRONLY
		if have > 0 {
			flag |= os.O_APPEND
		} else {
			flag |= os.O_TRUNC
		}
		f, err := os.OpenFile(path+".part", flag, 0o644)
		if err != nil {
			res.Body.Close()
			return err
		}
		buf := make([]byte, 1<<20)
		last := time.Time{}
		for {
			n, rerr := res.Body.Read(buf)
			if n > 0 {
				if _, werr := f.Write(buf[:n]); werr != nil {
					f.Close()
					res.Body.Close()
					return werr
				}
				have += int64(n)
				if time.Since(last) > 300*time.Millisecond {
					onBytes(have, total)
					last = time.Now()
				}
			}
			if rerr == io.EOF {
				f.Close()
				res.Body.Close()
				onBytes(have, total)
				if total > 0 && have < total {
					break // connection dropped: resume
				}
				if total > 0 && have > total {
					_ = os.Remove(path + ".part")
					return fmt.Errorf("download is larger than expected (%d > %d bytes) — run the installer again", have, total)
				}
				return os.Rename(path+".part", path)
			}
			if rerr != nil {
				f.Close()
				res.Body.Close()
				break // resume
			}
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
	}
	return errors.New("download kept failing — check your connection and run the installer again (it resumes)")
}

// ── install ──────────────────────────────────────────────────────────────────

func projectName(p *Product) string { return "axto-" + p.Slug }

func composeArgs(o Options, rest ...string) []string {
	args := []string{"compose", "-p", projectName(o.Product), "-f", filepath.Join(o.Dir, o.Product.Compose)}
	for _, pr := range o.Profiles {
		args = append(args, "--profile", pr)
	}
	return append(args, rest...)
}

// optionalWanted decides which optional images to install: the ones asked for, or —
// when none are named (an update) — the ones already installed.
func optionalWanted(p *Product, with []string, prev *Installed) map[string]bool {
	src := with
	if src == nil && prev != nil {
		src = prev.Images
	}
	out := map[string]bool{}
	for _, n := range src {
		if _, ok := p.Optional[n]; ok {
			out[n] = true
		}
	}
	return out
}

// offlineDirs lists where an offline package keeps its images: --images first,
// then images/ next to AXTO Setup and AXTO Setup's own folder.
func offlineDirs(o Options) []string {
	var dirs []string
	if o.ImagesDir != "" {
		dirs = append(dirs, o.ImagesDir)
	}
	if exe, err := os.Executable(); err == nil {
		if real, err := filepath.EvalSymlinks(exe); err == nil {
			exe = real
		}
		d := filepath.Dir(exe)
		dirs = append(dirs, filepath.Join(d, "images"), d)
	}
	return dirs
}

// localImage finds <file>.tar.gz of an offline package. It must have the size of the
// portal's current build, or the size the package's images/manifest.json records
// (a package built before the latest image: still complete, the next Update refreshes it).
func localImage(dirs []string, file string, size int64) string {
	for _, d := range dirs {
		path := filepath.Join(d, file+".tar.gz")
		st, err := os.Stat(path)
		if err != nil || st.IsDir() {
			continue
		}
		if size > 0 && st.Size() == size {
			return path
		}
		var man map[string]struct {
			Size int64 `json:"size"`
		}
		if b, err := os.ReadFile(filepath.Join(d, "manifest.json")); err == nil && json.Unmarshal(b, &man) == nil {
			if m, ok := man[file+".tar.gz"]; ok && m.Size == st.Size() {
				return path
			}
		}
		if size <= 0 {
			return path
		}
	}
	return ""
}

func servicesFor(p *Product) []string {
	if runtime.GOOS == "windows" && len(p.WindowsOnly) > 0 {
		return p.WindowsOnly
	}
	return p.Services
}

// writeFiles writes compose + config. Existing configs are kept (update path).
func writeFiles(o Options) error {
	p := o.Product
	if err := os.MkdirAll(o.Dir, 0o755); err != nil {
		return fmt.Errorf("cannot create %s: %v", o.Dir, err)
	}
	for _, d := range p.Dirs {
		_ = os.MkdirAll(filepath.Join(o.Dir, d), 0o755)
	}
	compose, err := readBundle(p.Compose)
	if err != nil {
		return err
	}
	compose, err = RenderCompose(compose, p, o.Port, o.LAN)
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(o.Dir, p.Compose), compose, 0o644); err != nil {
		return err
	}
	if p.Config != "" {
		dst := filepath.Join(o.Dir, p.ConfigAs)
		if cur, err := os.ReadFile(dst); err == nil {
			// Keep the customer's edits; only refresh the licence key.
			upd := regexp.MustCompile(p.KeyPrefix+`-[0-9A-FX]{8}-[0-9A-FX]{8}-[0-9A-FX]{8}-[0-9A-FX]{8}`).ReplaceAll(cur, []byte(strings.ToUpper(o.Key)))
			return os.WriteFile(dst, upd, 0o600)
		}
		example, err := readBundle(p.Config)
		if err != nil {
			return err
		}
		// A lifetime app runs from its activation file: the config gets no licence key.
		cfgKey := o.Key
		if IsLifetimeKey(o.Key) {
			cfgKey = ""
		}
		if err := os.WriteFile(dst, RenderConfig(example, cfgKey), 0o600); err != nil {
			return err
		}
	}
	for _, e := range p.Extra {
		if b, err := readBundle(e); err == nil {
			_ = os.WriteFile(filepath.Join(o.Dir, e), b, 0o644)
		}
	}
	return nil
}

func fmtBytes(n int64) string {
	switch {
	case n >= 1<<30:
		return fmt.Sprintf("%.2f GB", float64(n)/(1<<30))
	case n >= 1<<20:
		return fmt.Sprintf("%.1f MB", float64(n)/(1<<20))
	default:
		return fmt.Sprintf("%d KB", n/1024)
	}
}

// Install runs the whole pipeline. It is idempotent: running it again updates.
func Install(ctx context.Context, o Options, pr Progress) (*Installed, error) {
	p := o.Product
	pr.Step(2, "Checking Docker…")
	d := CheckDocker(ctx)
	if !d.Ready {
		return nil, errors.New(d.Problem)
	}
	lifetime := IsLifetimeKey(o.Key)
	pr.Step(5, "Checking your licence with "+o.Portal+"…")
	want := ""
	if lifetime {
		want = p.Slug
	}
	info, err := CheckLicence(ctx, o.Portal, o.Key, want, d.Arch)
	if err != nil {
		return nil, err
	}
	if info.Product != p.Slug {
		return nil, fmt.Errorf("this key is for %s, not %s", info.Name, p.Name)
	}
	if lifetime {
		pr.Step(8, fmt.Sprintf("Lifetime licence OK — %s, updates included until %s", info.Name, strings.SplitN(info.ExpiresAt, "T", 2)[0]))
	} else {
		pr.Step(8, fmt.Sprintf("Licence OK — %s, valid until %s", info.Name, strings.SplitN(info.ExpiresAt, "T", 2)[0]))
	}

	if err := writeFiles(o); err != nil {
		return nil, err
	}
	pr.Step(10, "Configuration written to "+o.Dir)

	prev := LoadState()[p.Slug]
	wanted := optionalWanted(p, o.With, prev)
	// The same GPU decision as the wizard's tick (gpuplan.go): a fresh install from the
	// command line includes the GPU worker by itself when the GPU is ready; --no-gpu skips it.
	for n, prof := range p.Optional {
		if prof != "gpu" {
			continue
		}
		switch {
		case o.NoGPU:
			delete(wanted, n)
		case o.With == nil && prev == nil && d.GPUPlan.Auto && d.GPUPlan.Profile == prof:
			wanted[n] = true
			pr.Step(10, "GPU worker included: "+d.GPUPlan.Note+" (skip it with --no-gpu)")
		}
	}
	var warnings []string
	dirs := offlineDirs(o)
	type plan struct {
		imageLink
		local string // offline package file ("" = download)
	}
	var need []plan
	for _, im := range info.Images {
		if im.Optional && !wanted[im.Name] {
			continue
		}
		file := im.Name
		if info.Arch == "arm64" {
			file += "-arm64"
		}
		local := localImage(dirs, file, im.Size)
		if !im.Available && local == "" {
			if info.Arch == "arm64" {
				return nil, fmt.Errorf("%s is not available for ARM64 computers yet — install it on an x86-64 (Intel/AMD) machine, or try again later", im.Label)
			}
			return nil, fmt.Errorf("the %s build is being prepared on our side — please try again in a few minutes", im.Label)
		}
		need = append(need, plan{im, local})
	}
	// The GPU worker reserves an NVIDIA device: without a usable GPU its container
	// cannot start, so say so now instead of after a 6 GB download.
	for _, im := range need {
		if p.Optional[im.Name] == "gpu" && !d.GPUPlan.Ready {
			if d.GPUNote != "" {
				return nil, errors.New(d.GPUNote)
			}
			return nil, fmt.Errorf("no GPU the worker container can use was found — %s needs an NVIDIA card with its driver (CUDA); install without it, or install the NVIDIA driver first", im.Label)
		}
	}
	o.Profiles = nil
	for _, im := range need {
		if prof := p.Optional[im.Name]; prof != "" && !contains(o.Profiles, prof) {
			o.Profiles = append(o.Profiles, prof)
		}
	}
	var total int64
	for _, im := range need {
		if im.local == "" {
			total += im.Size
		}
	}
	imgDir := filepath.Join(o.Dir, "images")
	_ = os.MkdirAll(imgDir, 0o755)
	var before int64
	loaded := []string{}
	for i, im := range need {
		file, label := im.local, im.Label
		if file == "" {
			file = filepath.Join(imgDir, im.Name+".tar.gz")
			err := download(ctx, im.URL, file, im.Size, func(done, all int64) {
				pct := 10
				if total > 0 {
					pct = 10 + int(float64(before+done)/float64(total)*60)
				}
				pr.Step(pct, fmt.Sprintf("Downloading %s — %s of %s", label, fmtBytes(done), fmtBytes(all)))
			})
			if err != nil {
				return nil, err
			}
			before += im.Size
			pr.Step(10+int(float64(before)/float64(max64(total, 1))*60), "Loading "+label+" into Docker…")
		} else {
			pr.Step(10+60*i/len(need), fmt.Sprintf("Loading %s from the offline package (%s)…", label, fmtBytes(fileSize(file))))
		}
		if out, err := dockerCmd(ctx, "load", "-i", file); err != nil {
			return nil, fmt.Errorf("docker could not load %s: %s", label, lastLines(out, 5))
		}
		if im.local == "" {
			_ = os.Remove(file)
		}
		loaded = append(loaded, im.Name)
	}

	// Real GPU test inside the worker image, exactly as compose will hand the GPU over, on
	// every OS. A failed test never breaks the install: the GPU worker stays off and the
	// reason is shown; everything else starts.
	if contains(o.Profiles, "gpu") {
		for img, prof := range p.Optional {
			if prof != "gpu" || !contains(loaded, img) {
				continue
			}
			pr.Step(73, "Testing the GPU inside the GPU worker image…")
			r := probeGPU(ctx, "axto/"+img+":latest", d.GPUPlan.Vendor)
			if r.OK {
				msg := "GPU test passed"
				if len(r.GPUs) > 0 {
					msg += ": " + strings.Join(r.GPUs, ", ")
				}
				if r.Detail != "" && r.Detail != "nvidia-smi" {
					msg += " — " + r.Detail
				}
				pr.Step(74, msg)
			} else {
				w := "The GPU worker was not started: the GPU test inside its container failed (" + r.Detail + "). " +
					"Fix it, then run AXTO Setup again (Update) — everything else is running."
				warnings = append(warnings, w)
				pr.Step(74, w)
				o.Profiles = without(o.Profiles, "gpu")
			}
		}
	}

	// An optional part that was installed before and is not wanted now is stopped and removed.
	if prev != nil {
		for _, prof := range prev.Profiles {
			if contains(o.Profiles, prof) {
				continue
			}
			var svcs []string
			for img, pp := range p.Optional {
				if pp == prof {
					svcs = append(svcs, img)
				}
			}
			off := Options{Product: p, Dir: o.Dir, Profiles: []string{prof}}
			_, _ = dockerCmd(ctx, composeArgs(off, append([]string{"rm", "-s", "-f"}, svcs...)...)...)
		}
	}

	pr.Step(75, "Starting "+p.Name+"…")
	args := composeArgs(o, append([]string{"up", "-d", "--remove-orphans"}, servicesFor(p)...)...)
	if out, err := dockerCmd(ctx, args...); err != nil {
		return nil, fmt.Errorf("could not start the containers: %s", lastLines(out, 8))
	}

	pr.Step(85, "Waiting for "+p.Name+" to answer…")
	if err := waitHealthy(ctx, o.Port, 4*time.Minute); err != nil {
		logs, _ := dockerCmd(ctx, composeArgs(o, "logs", "--tail", "30")...)
		return nil, fmt.Errorf("%v\n\nLast log lines:\n%s", err, lastLines(logs, 30))
	}

	now := time.Now().UTC()
	st := &Installed{Slug: p.Slug, Name: p.Name, Dir: o.Dir, Port: o.Port, LAN: o.LAN, KeyTail: keyTail(o.Key), InstalledAt: now, UpdatedAt: now, Images: loaded, Profiles: o.Profiles, Warnings: warnings}
	if len(p.Optional) > 0 && len(d.GPUs) > 0 {
		plan := d.GPUPlan
		st.GPU = &plan
	}
	if prev != nil {
		st.InstalledAt = prev.InstalledAt
	}
	SaveInstalled(st)
	if lifetime {
		_ = os.WriteFile(installKeyFile(o.Dir), []byte(strings.ToUpper(strings.TrimSpace(o.Key))), 0o600)
		if err := activateThisDevice(ctx, o, st, pr); err != nil {
			return nil, err
		}
	}
	pr.Step(95, "Creating shortcuts…")
	_ = CreateShortcuts(st)
	pr.Step(100, fmt.Sprintf("%s is running at http://localhost:%d", p.Name, o.Port))
	return st, nil
}

// activateThisDevice binds a freshly installed lifetime app to this machine: it reads
// the machine id the engine generated, gets the signed file from the portal
// (one device slot) and puts it into the app. Re-installs reuse the same slot.
func activateThisDevice(ctx context.Context, o Options, st *Installed, pr Progress) error {
	pr.Step(90, "Activating this device (lifetime licence)…")
	var mid string
	var err error
	for i := 0; i < 30; i++ { // the engine writes its machine id on first start
		if mid, err = MachineID(ctx, st); err == nil {
			break
		}
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		return err
	}
	file, err := activateLifetime(ctx, o, mid)
	if err != nil {
		return fmt.Errorf("%s is installed, but this device could not be activated: %v\nMachine ID %s — you can also activate it at https://axto.io/app/lifetime and run: axto-setup activate %s <file>", o.Product.Name, err, mid, o.Product.Slug)
	}
	if err := ActivateOffline(ctx, st, file); err != nil {
		return err
	}
	if err := waitHealthy(ctx, o.Port, 4*time.Minute); err != nil {
		return err
	}
	pr.Step(93, "Device activated — "+o.Product.Name+" now runs offline")
	return nil
}

func keyTail(k string) string {
	k = strings.TrimSpace(k)
	if len(k) <= 9 {
		return k
	}
	return k[:strings.Index(k, "-")+1] + "…" + k[len(k)-4:]
}

func without(list []string, s string) []string {
	out := list[:0:0]
	for _, x := range list {
		if x != s {
			out = append(out, x)
		}
	}
	return out
}

func contains(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

func fileSize(path string) int64 {
	if st, err := os.Stat(path); err == nil {
		return st.Size()
	}
	return 0
}

func max64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

func lastLines(s string, n int) string {
	lines := strings.Split(strings.TrimRight(s, "\n"), "\n")
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	return strings.Join(lines, "\n")
}

func waitHealthy(ctx context.Context, port int, limit time.Duration) error {
	deadline := time.Now().Add(limit)
	c := &http.Client{Timeout: 5 * time.Second}
	url := fmt.Sprintf("http://127.0.0.1:%d/health", port)
	for time.Now().Before(deadline) {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if res, err := c.Get(url); err == nil {
			res.Body.Close()
			if res.StatusCode < 500 || res.StatusCode == 503 {
				return nil
			}
		}
		time.Sleep(2 * time.Second)
	}
	return fmt.Errorf("the app did not answer on port %d within %s", port, limit)
}

// Control runs start / stop / restart / logs for an installed product.
func Control(ctx context.Context, st *Installed, action string) (string, error) {
	p := ProductBySlug(st.Slug)
	if p == nil {
		return "", errors.New("unknown product")
	}
	o := Options{Product: p, Dir: st.Dir, Port: st.Port, Profiles: st.Profiles}
	switch action {
	case "start":
		return dockerCmd(ctx, composeArgs(o, append([]string{"up", "-d"}, servicesFor(p)...)...)...)
	case "stop":
		return dockerCmd(ctx, composeArgs(o, "stop")...)
	case "restart":
		return dockerCmd(ctx, composeArgs(o, "restart")...)
	case "logs":
		return dockerCmd(ctx, composeArgs(o, "logs", "--tail", "200", "--no-color")...)
	case "status":
		return dockerCmd(ctx, composeArgs(o, "ps", "--format", "table {{.Service}}\t{{.State}}\t{{.Status}}")...)
	}
	return "", fmt.Errorf("unknown action %q", action)
}

// Uninstall stops and removes the containers (and, unless KeepData, the volumes).
func Uninstall(ctx context.Context, st *Installed, keepData bool) error {
	p := ProductBySlug(st.Slug)
	if p == nil {
		return errors.New("unknown product")
	}
	o := Options{Product: p, Dir: st.Dir, Profiles: st.Profiles}
	args := composeArgs(o, "down", "--remove-orphans")
	if !keepData {
		args = append(args, "-v")
	}
	if out, err := dockerCmd(ctx, args...); err != nil && !strings.Contains(out, "no such file") {
		return fmt.Errorf("docker compose down failed: %s", lastLines(out, 5))
	}
	RemoveShortcuts(st)
	if !keepData {
		_ = os.RemoveAll(st.Dir)
	}
	RemoveInstalled(st.Slug)
	return nil
}
