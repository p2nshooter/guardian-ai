// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//
// AXTO Setup — installs and manages AXTO self-hosted apps on Docker.
//
//	Windows: double-click AXTO-Setup.exe → a guided installer opens in the browser
//	         (checks WSL 2 / Docker Desktop, licence, download, start, shortcuts).
//	Linux:   ./axto-setup install --key GUARD-…            (same pipeline, CLI)
//	         ./axto-setup status | start | stop | update | uninstall | logs <app>
//	         ./axto-setup wizard                           (browser UI on a server with a desktop)
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"
)

var Version = "3.2.2"

const defaultPortal = "https://axto.io"

type cliProgress struct{ last string }

func (c *cliProgress) Step(pct int, msg string) {
	if msg == c.last {
		return
	}
	c.last = msg
	fmt.Printf("\r\033[K[%3d%%] %s", pct, msg)
	if !strings.HasPrefix(msg, "Downloading") {
		fmt.Println()
	}
}

func usage() {
	fmt.Printf(`AXTO Setup %s — install and manage AXTO self-hosted apps

Usage:
  axto-setup                               open the guided installer (Windows default)
  axto-setup install --key KEY [--port N] [--lan] [--dir PATH] [--gpu] [--with IMG,…] [--images DIR]
  axto-setup install <app> --key LIFE-…    lifetime licence: install + activate this device
  axto-setup update  <app>                 download the latest images and restart

  --gpu         Orchestra: also install the NVIDIA GPU worker (≈ 6 GB image)
  --with        optional images by name (orchestra-worker-gpu), or "none" to remove them
  --images DIR  offline package: load images from DIR (default: images/ next to axto-setup)
  axto-setup status | start | stop | restart | logs  <app>
  axto-setup uninstall <app> [--keep-data]
  axto-setup doctor                        check Docker / WSL 2
  axto-setup list                          installed apps
  axto-setup machine-id <app>              machine ID for a Lifetime (offline) activation
  axto-setup activate <app> <file>         install a .axto-license file and restart the app

Apps: %s
Your licence key is in https://axto.io/app/self-hosted (lifetime: https://axto.io/app/lifetime)
`, Version, strings.Join(slugs(), ", "))
}

func slugs() []string {
	out := make([]string, len(Products))
	for i, p := range Products {
		out[i] = p.Slug
	}
	return out
}

func fail(err error) {
	fmt.Fprintf(os.Stderr, "\n✖ %v\n", err)
	os.Exit(1)
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	args := os.Args[1:]
	cmd := ""
	if len(args) > 0 && !strings.HasPrefix(args[0], "-") {
		cmd, args = args[0], args[1:]
	}
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	key := fs.String("key", "", "licence key (from https://axto.io/app/self-hosted)")
	port := fs.Int("port", 0, "host port for the web UI (default: the app's standard port)")
	lan := fs.Bool("lan", runtime.GOOS == "linux", "reachable from other computers (default on Linux servers)")
	dir := fs.String("dir", "", "install directory (default: <base>/<app>)")
	portal := fs.String("portal", envOr("AXTO_PORTAL", defaultPortal), "AXTO portal URL")
	base := fs.String("base", "", "base directory for all apps")
	keepData := fs.Bool("keep-data", false, "uninstall: keep the app's data volumes")
	gpu := fs.Bool("gpu", false, "Orchestra: also install the NVIDIA GPU worker")
	with := fs.String("with", "", "optional images to install (comma-separated), or none")
	images := fs.String("images", "", "offline package: folder with the <image>.tar.gz files")
	fs.Usage = usage
	// flags may come after the app name: `axto-setup update vault --portal …`
	var pos []string
	rest := args
	for len(rest) > 0 {
		_ = fs.Parse(rest)
		rest = fs.Args()
		if len(rest) > 0 {
			pos, rest = append(pos, rest[0]), rest[1:]
		}
	}
	if *base != "" {
		baseDirOverride = *base
	}

	app := func() *Installed {
		if len(pos) == 0 {
			fail(fmt.Errorf("which app? one of: %s", strings.Join(slugs(), ", ")))
		}
		st := LoadState()[pos[0]]
		if st == nil {
			fail(fmt.Errorf("%s is not installed (see `axto-setup list`)", pos[0]))
		}
		return st
	}

	switch cmd {
	case "", "wizard", "manage":
		if err := RunWizard(ctx, *portal, cmd == "manage"); err != nil {
			fail(err)
		}
	case "install", "update":
		var p *Product
		var st *Installed
		k := *key
		if cmd == "update" {
			st = app()
			p = ProductBySlug(st.Slug)
			if k == "" {
				k = readKeyFromConfig(st)
			}
		} else {
			switch {
			case IsLifetimeKey(k):
				// One lifetime key can cover several apps: name the app (or learn which ones it covers).
				if len(pos) == 0 {
					info, err := CheckLicence(ctx, strings.TrimRight(*portal, "/"), k, "", "")
					if err != nil {
						fail(err)
					}
					if len(info.Choose) > 0 {
						var names []string
						for _, c := range info.Choose {
							names = append(names, c.Slug)
						}
						fail(fmt.Errorf("this lifetime licence covers several apps — choose one: axto-setup install <app> --key %s  (apps: %s)", k, strings.Join(names, ", ")))
					}
					pos = append(pos, info.Product)
				}
				p = ProductBySlug(pos[0])
				if p == nil {
					fail(fmt.Errorf("unknown app %q — one of: %s", pos[0], strings.Join(slugs(), ", ")))
				}
			case ValidKeyShape(k):
				p = ProductForKey(k)
			default:
				fail(fmt.Errorf("enter your licence key with --key (format PREFIX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX, or LIFE-… for a lifetime licence)"))
			}
		}
		o := Options{Product: p, Key: k, Portal: strings.TrimRight(*portal, "/"), LAN: *lan}
		o.Port = firstNonZero(*port, pick(st, func(s *Installed) int { return s.Port }), p.Port)
		o.Dir = firstNonEmpty(*dir, pickS(st, func(s *Installed) string { return s.Dir }), filepath.Join(BaseDir(), p.Slug))
		if st != nil {
			o.LAN = st.LAN || *lan
		}
		o.ImagesDir = *images
		if *with != "" || *gpu {
			o.With = []string{}
			for _, n := range strings.Split(*with, ",") {
				if n = strings.TrimSpace(n); n != "" && n != "none" {
					if _, ok := p.Optional[n]; !ok {
						fail(fmt.Errorf("%s has no optional image %q (optional: %s)", p.Name, n, strings.Join(optionalNames(p), ", ")))
					}
					o.With = append(o.With, n)
				}
			}
			if *gpu {
				for n, prof := range p.Optional {
					if prof == "gpu" && !contains(o.With, n) {
						o.With = append(o.With, n)
					}
				}
				if len(o.With) == 0 {
					fail(fmt.Errorf("%s has no GPU worker — --gpu is for Orchestra AI", p.Name))
				}
			}
		}
		res, err := Install(ctx, o, &cliProgress{})
		if err != nil {
			fail(err)
		}
		fmt.Printf("\n✔ %s is running — http://localhost:%d  (config: %s)\n", res.Name, res.Port, res.Dir)
	case "status", "start", "stop", "restart", "logs":
		out, err := Control(ctx, app(), cmd)
		fmt.Print(out)
		if err != nil {
			fail(err)
		}
	case "uninstall":
		st := app()
		if err := Uninstall(ctx, st, *keepData); err != nil {
			fail(err)
		}
		fmt.Printf("✔ %s removed%s\n", st.Name, map[bool]string{true: " (data kept)", false: ""}[*keepData])
	case "machine-id":
		id, err := MachineID(ctx, app())
		if err != nil {
			fail(err)
		}
		fmt.Println(id)
	case "activate":
		st := app()
		if len(pos) < 2 {
			fail(fmt.Errorf("which file? axto-setup activate %s <%s.axto-license>", st.Slug, st.Slug))
		}
		if err := ActivateOffline(ctx, st, pos[1]); err != nil {
			fail(err)
		}
		fmt.Printf("✔ %s is activated offline (Lifetime licence) and restarted — http://localhost:%d\n", st.Name, st.Port)
	case "doctor":
		d := CheckDocker(ctx)
		fmt.Printf("OS: %s\nDocker installed: %v\nDocker running: %v (%s)\nEngine: %s/%s\nCompose: %v (%s)\nResources: %d GB RAM, %d CPUs\n", d.OS, d.Installed, d.Running, d.Version, d.OSType, d.Arch, d.Compose, d.ComposeVersion, d.MemoryGB, d.CPUs)
		if d.WSL != "" {
			fmt.Printf("WSL 2: %s\n", d.WSL)
		}
		if d.GPU != "" {
			fmt.Printf("NVIDIA GPU: %s\n", d.GPU)
		} else {
			fmt.Println("NVIDIA GPU: none found (Orchestra's GPU worker needs one)")
		}
		if !d.Ready {
			fmt.Printf("\n✖ %s\n  %s %s\n", d.Problem, d.Fix, d.FixURL)
			os.Exit(1)
		}
		fmt.Println("\n✔ Ready")
	case "list":
		m := LoadState()
		keys := make([]string, 0, len(m))
		for k := range m {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		if len(keys) == 0 {
			fmt.Println("No AXTO apps installed yet.")
		}
		for _, k := range keys {
			s := m[k]
			fmt.Printf("%-11s http://localhost:%-5d %s  (updated %s)\n", s.Slug, s.Port, s.Dir, s.UpdatedAt.Format(time.DateOnly))
		}
	case "version", "--version":
		fmt.Println(Version)
	default:
		usage()
		os.Exit(2)
	}
}

func optionalNames(p *Product) []string {
	var out []string
	for n := range p.Optional {
		out = append(out, n)
	}
	sort.Strings(out)
	if len(out) == 0 {
		out = []string{"none"}
	}
	return out
}

func envOr(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func firstNonZero(v ...int) int {
	for _, x := range v {
		if x != 0 {
			return x
		}
	}
	return 0
}

func firstNonEmpty(v ...string) string {
	for _, x := range v {
		if x != "" {
			return x
		}
	}
	return ""
}

func pick(st *Installed, f func(*Installed) int) int {
	if st == nil {
		return 0
	}
	return f(st)
}

func pickS(st *Installed, f func(*Installed) string) string {
	if st == nil {
		return ""
	}
	return f(st)
}

// readKeyFromConfig recovers the licence key from an installed app's config
// (or the lifetime installer key kept next to it).
func readKeyFromConfig(st *Installed) string {
	if b, err := os.ReadFile(installKeyFile(st.Dir)); err == nil && IsLifetimeKey(string(b)) {
		return strings.TrimSpace(string(b))
	}
	p := ProductBySlug(st.Slug)
	if p == nil || p.ConfigAs == "" {
		return ""
	}
	b, err := os.ReadFile(filepath.Join(st.Dir, p.ConfigAs))
	if err != nil {
		return ""
	}
	for _, line := range strings.Split(string(b), "\n") {
		if i := strings.Index(line, p.KeyPrefix+"-"); i >= 0 {
			k := line[i:]
			if len(k) >= len(p.KeyPrefix)+37 {
				k = k[:len(p.KeyPrefix)+36]
			}
			if ValidKeyShape(k) {
				return k
			}
		}
	}
	return ""
}
