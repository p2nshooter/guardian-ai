// Copyright (c) 2024-2026 Axto AI. All rights reserved.
package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"testing"
)

func TestKeyShapeAndProduct(t *testing.T) {
	cases := map[string]string{
		"VAULT-0A1B2C3D-4E5F6A7B-8C9D0E1F-2A3B4C5D": "vault",
		"legl-0a1b2c3d-4e5f6a7b-8c9d0e1f-2a3b4c5d":  "legal",
		"AV-00000000-11111111-22222222-33333333":    "antivirus",
		"STUD-DEADBEEF-DEADBEEF-DEADBEEF-DEADBEEF":  "studio",
	}
	for k, want := range cases {
		if !ValidKeyShape(k) {
			t.Fatalf("%s should be valid", k)
		}
		if p := ProductForKey(k); p == nil || p.Slug != want {
			t.Fatalf("%s → %v, want %s", k, p, want)
		}
	}
	for _, bad := range []string{"", "VAULT-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX", "NOPE-00000000-11111111-22222222-33333333", "VAULT-0A1B2C3D-4E5F6A7B-8C9D0E1F"} {
		if ValidKeyShape(bad) {
			t.Fatalf("%q should be invalid", bad)
		}
	}
}

func TestEveryProductHasItsFiles(t *testing.T) {
	for _, p := range Products {
		c, err := readBundle(p.Compose)
		if err != nil {
			t.Fatalf("%s: compose %s not bundled: %v", p.Slug, p.Compose, err)
		}
		if !strings.Contains(string(c), p.Service+":") {
			t.Fatalf("%s: service %s not in %s", p.Slug, p.Service, p.Compose)
		}
		if _, err := RenderCompose(c, &p, 18000, false); err != nil {
			t.Fatalf("%s: %v", p.Slug, err)
		}
		if p.Config != "" {
			ex, err := readBundle(p.Config)
			if err != nil {
				t.Fatalf("%s: config %s not bundled", p.Slug, p.Config)
			}
			if !strings.Contains(string(ex), p.KeyPrefix+"-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX") {
				t.Fatalf("%s: %s has no %s- licence placeholder", p.Slug, p.Config, p.KeyPrefix)
			}
			if !strings.Contains(string(c), "./"+p.ConfigAs) {
				t.Fatalf("%s: %s does not mount/use ./%s", p.Slug, p.Compose, p.ConfigAs)
			}
		}
	}
}

func TestRenderConfig(t *testing.T) {
	ex, _ := readBundle("orchestra.example.yml")
	key := "ORCH-0A1B2C3D-4E5F6A7B-8C9D0E1F-2A3B4C5D"
	out := string(RenderConfig(ex, strings.ToLower(key)))
	if !strings.Contains(out, key) || strings.Contains(out, "XXXXXXXX") {
		t.Fatal("licence key not filled in")
	}
	if strings.Contains(out, "CHANGE_ME") {
		t.Fatal("CHANGE_ME placeholders must be replaced")
	}
	secrets := regexp.MustCompile(`(console_password|worker_token): "([0-9a-f]{48})"`).FindAllStringSubmatch(out, -1)
	if len(secrets) != 2 || secrets[0][2] == secrets[1][2] {
		t.Fatalf("each placeholder gets its own random secret: %v", secrets)
	}
}

func TestRenderComposePort(t *testing.T) {
	c, _ := readBundle("vault-compose.yml")
	p := ProductBySlug("vault")
	local, _ := RenderCompose(c, p, 19081, false)
	if !strings.Contains(string(local), `"127.0.0.1:19081:8080"`) {
		t.Fatalf("localhost binding expected:\n%s", local)
	}
	lan, _ := RenderCompose(c, p, 19081, true)
	if !strings.Contains(string(lan), `"19081:8080"`) || strings.Contains(string(lan), "127.0.0.1:19081") {
		t.Fatal("LAN binding expected")
	}
	g, _ := readBundle("docker-compose.yml")
	out, _ := RenderCompose(g, ProductBySlug("guardian"), 18080, true)
	if strings.Count(string(out), "18080:") != 1 || !strings.Contains(string(out), `"127.0.0.1:5432:5432"`) {
		t.Fatal("only the UI port may change")
	}
}

func TestWriteFilesKeepsCustomerEdits(t *testing.T) {
	dir := t.TempDir()
	p := ProductBySlug("vault")
	o := Options{Product: p, Key: "VAULT-0A1B2C3D-4E5F6A7B-8C9D0E1F-2A3B4C5D", Dir: dir, Port: 18081}
	if err := writeFiles(o); err != nil {
		t.Fatal(err)
	}
	cfg := filepath.Join(dir, "vault.yml")
	b, _ := os.ReadFile(cfg)
	_ = os.WriteFile(cfg, append(b, []byte("\n# my edit\n")...), 0o600)
	o.Key = "VAULT-11111111-22222222-33333333-44444444"
	if err := writeFiles(o); err != nil {
		t.Fatal(err)
	}
	b, _ = os.ReadFile(cfg)
	if !strings.Contains(string(b), "# my edit") || !strings.Contains(string(b), o.Key) || strings.Contains(string(b), "0A1B2C3D") {
		t.Fatalf("update must keep edits and swap the key:\n%s", b)
	}
	// Unix permission bits only exist on Unix; on Windows Go reports every
	// writable file as rw-rw-rw- and privacy comes from the user-profile ACL.
	if runtime.GOOS != "windows" {
		if st, _ := os.Stat(cfg); st.Mode().Perm() != 0o600 {
			t.Fatalf("config must be private, got %v", st.Mode().Perm())
		}
	}
}

func TestActivationFileChecks(t *testing.T) {
	mid := "0123456789abcdef0123456789abcdef"
	file := func(product, machine string) []byte {
		payload := strings.Join([]string{"axto-lifetime-1", "LT-ABCDEF123456", product, machine, "app", "5", "3", "2027-09-29", "2026-09-29T10:00:00.000Z", "package=vault_enterprise;max_nodes=5"}, "|")
		b, _ := json.Marshal(map[string]string{"format": "axto-lifetime-1", "payload": payload, "signature": "c2ln"})
		return b
	}
	if got, err := checkActivationFile(file("vault", mid), "vault"); err != nil || got != mid {
		t.Fatalf("genuine file: %v %q", err, got)
	}
	if _, err := checkActivationFile(file("legal", mid), "vault"); err == nil || !strings.Contains(err.Error(), "for legal") {
		t.Fatalf("other app must be refused: %v", err)
	}
	if _, err := checkActivationFile(file("vault", "nope"), "vault"); err == nil {
		t.Fatal("bad machine id must be refused")
	}
	for _, junk := range []string{"", "{}", `{"format":"axto-lifetime-1","payload":"a|b","signature":"x"}`, "not json"} {
		if _, err := checkActivationFile([]byte(junk), "vault"); err == nil {
			t.Fatalf("junk %q must be refused", junk)
		}
	}
}

func TestEveryProductHasAStateDir(t *testing.T) {
	for _, p := range Products {
		if !strings.HasPrefix(p.StateDir, "/") {
			t.Fatalf("%s has no state dir", p.Slug)
		}
	}
}

func TestLifetimeKeys(t *testing.T) {
	for _, k := range []string{"LIFE-0123ABCD-89EF0123-DEADBEEF-00000000", "life-0123abcd-89ef0123-deadbeef-00000000"} {
		if !IsLifetimeKey(k) {
			t.Errorf("%s should be a lifetime key", k)
		}
		if ValidKeyShape(k) {
			t.Errorf("%s must not pass as a subscription key", k)
		}
	}
	for _, k := range []string{"LIFE-0123ABCD-89EF0123-DEADBEEF", "LIFE-0123ABCG-89EF0123-DEADBEEF-00000000", "VAULT-0123ABCD-89EF0123-DEADBEEF-00000000", "LT-0DF810022604"} {
		if IsLifetimeKey(k) {
			t.Errorf("%s must not be a lifetime key", k)
		}
	}
}

func TestEngineArch(t *testing.T) {
	cases := map[string]string{"x86_64": "amd64", "amd64": "amd64", "aarch64": "arm64", "arm64": "arm64", " AARCH64\n": "arm64"}
	for in, want := range cases {
		if got := engineArch(in); got != want {
			t.Errorf("engineArch(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestLifetimeConfigHasNoKey(t *testing.T) {
	// A lifetime install runs from its activation file: the config must not carry the installer key.
	example := []byte("vault:\n  license_key: \"VAULT-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX\"\n  secret: CHANGE_ME\n")
	out := string(RenderConfig(example, ""))
	if strings.Contains(out, "XXXXXXXX") || strings.Contains(out, "LIFE-") {
		t.Fatalf("placeholder or installer key left in config:\n%s", out)
	}
	if !strings.Contains(out, `license_key: ""`) {
		t.Fatalf("expected an empty licence key:\n%s", out)
	}
}

func TestOptionalImagesHaveTheirProfiledService(t *testing.T) {
	o := ProductBySlug("orchestra")
	if o.Optional["orchestra-worker-gpu"] != "gpu" {
		t.Fatalf("orchestra must offer the GPU worker under the gpu profile, got %v", o.Optional)
	}
	for _, p := range Products {
		raw, err := readBundle(p.Compose)
		if err != nil {
			t.Fatal(err)
		}
		c := strings.ReplaceAll(string(raw), "\r\n", "\n") // Windows checkouts use CRLF
		for img, prof := range p.Optional {
			i := strings.Index(c, "\n  "+img+":\n")
			if i < 0 {
				t.Fatalf("%s: optional image %s has no service of the same name in %s", p.Slug, img, p.Compose)
			}
			block := c[i+1:]
			if j := strings.Index(block[3:], "\n  "); j >= 0 && !strings.HasPrefix(block[3+j+3:], " ") {
				block = block[:3+j]
			}
			if !strings.Contains(block, `profiles: ["`+prof+`"]`) {
				t.Fatalf("%s: service %s must run only with the %q profile", p.Slug, img, prof)
			}
			if !strings.Contains(block, "image: axto/"+img+":latest") {
				t.Fatalf("%s: service %s must run image axto/%s", p.Slug, img, img)
			}
		}
	}
}

func TestComposeArgsCarryProfiles(t *testing.T) {
	p := ProductBySlug("orchestra")
	o := Options{Product: p, Dir: "/opt/axto/orchestra", Profiles: []string{"gpu"}}
	got := strings.Join(composeArgs(o, "up", "-d"), " ")
	want := "compose -p axto-orchestra -f " + filepath.Join("/opt/axto/orchestra", "orchestra-compose.yml") + " --profile gpu up -d"
	if got != want {
		t.Fatalf("composeArgs = %q, want %q", got, want)
	}
	o.Profiles = nil
	if strings.Contains(strings.Join(composeArgs(o, "ps"), " "), "--profile") {
		t.Fatal("no profile without optional images")
	}
}

func TestOptionalWanted(t *testing.T) {
	p := ProductBySlug("orchestra")
	prev := &Installed{Images: []string{"orchestra-core", "orchestra-worker-cpu", "orchestra-worker-gpu"}}
	if w := optionalWanted(p, nil, prev); !w["orchestra-worker-gpu"] || len(w) != 1 {
		t.Fatalf("an update keeps the installed GPU worker, got %v", w)
	}
	if w := optionalWanted(p, []string{}, prev); len(w) != 0 {
		t.Fatalf("an empty choice removes it, got %v", w)
	}
	if w := optionalWanted(p, []string{"orchestra-worker-gpu", "orchestra-core", "nope"}, nil); !w["orchestra-worker-gpu"] || len(w) != 1 {
		t.Fatalf("only known optional images count, got %v", w)
	}
	if w := optionalWanted(ProductBySlug("vault"), []string{"orchestra-worker-gpu"}, nil); len(w) != 0 {
		t.Fatalf("vault has no optional images, got %v", w)
	}
}

func TestLocalImageFromOfflinePackage(t *testing.T) {
	dir := t.TempDir()
	write := func(name string, n int) {
		if err := os.WriteFile(filepath.Join(dir, name), make([]byte, n), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("orchestra-core.tar.gz", 100)
	if got := localImage([]string{dir}, "orchestra-core", 100); got != filepath.Join(dir, "orchestra-core.tar.gz") {
		t.Fatalf("same size as the portal's build → used, got %q", got)
	}
	if got := localImage([]string{dir}, "orchestra-core", 120); got != "" {
		t.Fatalf("a different size without a manifest → download instead, got %q", got)
	}
	man, _ := json.Marshal(map[string]any{"orchestra-core.tar.gz": map[string]int64{"size": 100}})
	write("manifest.json", 0)
	if err := os.WriteFile(filepath.Join(dir, "manifest.json"), man, 0o644); err != nil {
		t.Fatal(err)
	}
	if got := localImage([]string{dir}, "orchestra-core", 120); got == "" {
		t.Fatal("an older but complete package image (manifest size) → used")
	}
	write("orchestra-worker-cpu.tar.gz", 50) // truncated copy: not the manifest's size
	if got := localImage([]string{dir}, "orchestra-worker-cpu", 80); got != "" {
		t.Fatalf("a truncated file is never used, got %q", got)
	}
	if got := localImage([]string{filepath.Join(dir, "missing"), dir}, "orchestra-core", 100); got == "" {
		t.Fatal("later folders are searched too")
	}
}
