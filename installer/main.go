// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//
// AXTO Setup — installs and manages AXTO self-hosted apps on Docker.
//
//   Windows: double-click AXTO-Setup.exe → a guided installer opens in the browser
//            (checks WSL 2 / Docker Desktop, licence, download, start, shortcuts).
//   Linux:   ./axto-setup install --key GUARD-…            (same pipeline, CLI)
//            ./axto-setup status | start | stop | update | uninstall | logs <app>
//            ./axto-setup wizard                           (browser UI on a server with a desktop)
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

var Version = "3.0.0"

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
  axto-setup install --key KEY [--port N] [--lan] [--dir PATH]
  axto-setup update  <app>                 download the latest images and restart
  axto-setup status | start | stop | restart | logs  <app>
  axto-setup uninstall <app> [--keep-data]
  axto-setup doctor                        check Docker / WSL 2
  axto-setup list                          installed apps

Apps: %s
Your licence key is in https://axto.io/app/self-hosted
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
			if !ValidKeyShape(k) {
				fail(fmt.Errorf("enter your licence key with --key (format PREFIX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX)"))
			}
			p = ProductForKey(k)
		}
		o := Options{Product: p, Key: k, Portal: strings.TrimRight(*portal, "/"), LAN: *lan}
		o.Port = firstNonZero(*port, pick(st, func(s *Installed) int { return s.Port }), p.Port)
		o.Dir = firstNonEmpty(*dir, pickS(st, func(s *Installed) string { return s.Dir }), filepath.Join(BaseDir(), p.Slug))
		if st != nil {
			o.LAN = st.LAN || *lan
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
	case "doctor":
		d := CheckDocker(ctx)
		fmt.Printf("OS: %s\nDocker installed: %v\nDocker running: %v (%s)\nCompose: %v (%s)\nResources: %d GB RAM, %d CPUs\n", d.OS, d.Installed, d.Running, d.Version, d.Compose, d.ComposeVersion, d.MemoryGB, d.CPUs)
		if d.WSL != "" {
			fmt.Printf("WSL 2: %s\n", d.WSL)
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

// readKeyFromConfig recovers the licence key from an installed app's config.
func readKeyFromConfig(st *Installed) string {
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
