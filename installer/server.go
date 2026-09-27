// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//
// The guided installer: a small web UI served on 127.0.0.1 only, opened in the
// user's browser. Every API call must carry the per-run token (custom header →
// no other website can drive it) and a loopback Host header (no DNS rebinding).
package main

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed web
var webFS embed.FS

type job struct {
	mu      sync.Mutex
	ID      string   `json:"id"`
	Status  string   `json:"status"` // running | done | failed
	Percent int      `json:"percent"`
	Current string   `json:"step"`
	Lines   []string `json:"lines"`
	Error   string   `json:"error"`
	URL     string   `json:"url"`
}

func (j *job) Step(pct int, msg string) {
	j.mu.Lock()
	defer j.mu.Unlock()
	if pct > j.Percent {
		j.Percent = pct
	}
	j.Current = msg
	if !strings.HasPrefix(msg, "Downloading") || len(j.Lines) == 0 || !strings.HasPrefix(j.Lines[len(j.Lines)-1], "Downloading") {
		j.Lines = append(j.Lines, msg)
	} else {
		j.Lines[len(j.Lines)-1] = msg
	}
}

func (j *job) snapshot() map[string]any {
	j.mu.Lock()
	defer j.mu.Unlock()
	return map[string]any{"id": j.ID, "status": j.Status, "percent": j.Percent, "step": j.Current, "lines": append([]string(nil), j.Lines...), "error": j.Error, "url": j.URL}
}

type wizard struct {
	token    string
	portal   string
	addr     string
	mu       sync.Mutex
	jobs     map[string]*job
	lastSeen time.Time
	ctx      context.Context
}

func newID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func RunWizard(ctx context.Context, portal string, manage bool) error {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return err
	}
	w := &wizard{token: newID(), portal: strings.TrimRight(portal, "/"), addr: ln.Addr().String(), jobs: map[string]*job{}, lastSeen: time.Now(), ctx: ctx}
	mux := http.NewServeMux()
	static, _ := fs.Sub(webFS, "web")
	mux.Handle("GET /", http.FileServer(http.FS(static)))
	mux.HandleFunc("GET /api/info", w.api(w.info))
	mux.HandleFunc("POST /api/docker/start", w.api(func(r *http.Request) (any, error) { return map[string]any{"ok": true}, StartDockerDesktop() }))
	mux.HandleFunc("POST /api/licence", w.api(w.licence))
	mux.HandleFunc("POST /api/install", w.api(w.install))
	mux.HandleFunc("GET /api/jobs/{id}", w.api(w.jobStatus))
	mux.HandleFunc("POST /api/apps/{slug}/{action}", w.api(w.control))
	mux.HandleFunc("POST /api/open", w.api(func(r *http.Request) (any, error) {
		var b struct{ URL string }
		_ = json.NewDecoder(r.Body).Decode(&b)
		if !strings.HasPrefix(b.URL, "http://localhost:") && !strings.HasPrefix(b.URL, "https://axto.io") && !strings.HasPrefix(b.URL, "https://www.docker.com") {
			return nil, fmt.Errorf("refusing to open %q", b.URL)
		}
		return map[string]any{"ok": true}, openBrowser(b.URL)
	}))
	mux.HandleFunc("POST /api/quit", w.api(func(r *http.Request) (any, error) {
		go func() { time.Sleep(300 * time.Millisecond); ln.Close() }()
		return map[string]any{"ok": true}, nil
	}))

	srv := &http.Server{Handler: w.guard(mux), ReadHeaderTimeout: 10 * time.Second}
	page := "/"
	if manage {
		page = "/#manage"
	}
	url := fmt.Sprintf("http://%s%s?t=%s", w.addr, page, w.token)
	if page != "/" {
		url = fmt.Sprintf("http://%s/?t=%s#manage", w.addr, w.token)
	}
	fmt.Printf("AXTO Setup %s is open in your browser.\nIf it didn't open, visit: %s\n", Version, url)
	_ = openBrowser(url)

	// Exit after 20 idle minutes (no page open and no job running).
	go func() {
		for {
			time.Sleep(time.Minute)
			w.mu.Lock()
			idle := time.Since(w.lastSeen) > 20*time.Minute
			busy := false
			for _, j := range w.jobs {
				if j.snapshot()["status"] == "running" {
					busy = true
				}
			}
			w.mu.Unlock()
			if idle && !busy {
				ln.Close()
				return
			}
		}
	}()
	go func() { <-ctx.Done(); ln.Close() }()
	err = srv.Serve(ln)
	if err == http.ErrServerClosed || strings.Contains(fmt.Sprint(err), "use of closed network connection") {
		return nil
	}
	return err
}

func (w *wizard) guard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		host := r.Host
		if host != w.addr && host != strings.Replace(w.addr, "127.0.0.1", "localhost", 1) {
			http.Error(rw, "forbidden host", http.StatusForbidden)
			return
		}
		rw.Header().Set("X-Frame-Options", "DENY")
		rw.Header().Set("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'")
		rw.Header().Set("Referrer-Policy", "no-referrer")
		if strings.HasPrefix(r.URL.Path, "/api/") {
			if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Setup-Token")), []byte(w.token)) != 1 {
				http.Error(rw, "forbidden", http.StatusForbidden)
				return
			}
			w.mu.Lock()
			w.lastSeen = time.Now()
			w.mu.Unlock()
		}
		next.ServeHTTP(rw, r)
	})
}

func (w *wizard) api(h func(*http.Request) (any, error)) http.HandlerFunc {
	return func(rw http.ResponseWriter, r *http.Request) {
		rw.Header().Set("Content-Type", "application/json")
		rw.Header().Set("Cache-Control", "no-store")
		v, err := h(r)
		if err != nil {
			rw.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(rw).Encode(map[string]string{"error": err.Error()})
			return
		}
		_ = json.NewEncoder(rw).Encode(v)
	}
}

func (w *wizard) info(r *http.Request) (any, error) {
	type prod struct {
		Product
		Installed *Installed `json:"installed"`
	}
	state := LoadState()
	var ps []prod
	for _, p := range Products {
		ps = append(ps, prod{Product: p, Installed: state[p.Slug]})
	}
	return map[string]any{"version": Version, "docker": CheckDocker(r.Context()), "products": ps, "base": BaseDir(), "portal": w.portal}, nil
}

func (w *wizard) licence(r *http.Request) (any, error) {
	var b struct{ Key string }
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		return nil, err
	}
	if !ValidKeyShape(b.Key) {
		return nil, fmt.Errorf("that doesn't look like an AXTO licence key — it has the form PREFIX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX")
	}
	info, err := CheckLicence(r.Context(), w.portal, b.Key)
	if err != nil {
		return nil, err
	}
	p := ProductBySlug(info.Product)
	if p == nil {
		return nil, fmt.Errorf("this installer version doesn't know %s yet — download the latest AXTO Setup", info.Name)
	}
	var total int64
	for _, im := range info.Images {
		if !im.Optional {
			total += im.Size
		}
	}
	return map[string]any{"product": p, "expires_at": info.ExpiresAt, "download_bytes": total, "download": fmtBytes(total), "installed": LoadState()[p.Slug]}, nil
}

func (w *wizard) install(r *http.Request) (any, error) {
	var b struct {
		Key  string
		Port int
		LAN  bool
	}
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		return nil, err
	}
	p := ProductForKey(b.Key)
	if p == nil || !ValidKeyShape(b.Key) {
		return nil, fmt.Errorf("invalid licence key")
	}
	if b.Port == 0 {
		b.Port = p.Port
	}
	if b.Port < 1024 || b.Port > 65535 {
		return nil, fmt.Errorf("choose a port between 1024 and 65535")
	}
	prev := LoadState()[p.Slug]
	if prev == nil || prev.Port != b.Port {
		if l, err := net.Listen("tcp", "127.0.0.1:"+strconv.Itoa(b.Port)); err != nil {
			return nil, fmt.Errorf("port %d is already in use on this computer — choose another one", b.Port)
		} else {
			l.Close()
		}
	}
	dir := filepath.Join(BaseDir(), p.Slug)
	if prev != nil {
		dir = prev.Dir
	}
	j := &job{ID: newID(), Status: "running"}
	w.mu.Lock()
	w.jobs[j.ID] = j
	w.mu.Unlock()
	go func() {
		st, err := Install(w.ctx, Options{Product: p, Key: b.Key, Dir: dir, Port: b.Port, LAN: b.LAN, Portal: w.portal}, j)
		j.mu.Lock()
		defer j.mu.Unlock()
		if err != nil {
			j.Status, j.Error = "failed", err.Error()
			return
		}
		j.Status, j.URL = "done", fmt.Sprintf("http://localhost:%d/", st.Port)
	}()
	return map[string]any{"job": j.ID}, nil
}

func (w *wizard) jobStatus(r *http.Request) (any, error) {
	w.mu.Lock()
	j := w.jobs[r.PathValue("id")]
	w.mu.Unlock()
	if j == nil {
		return nil, fmt.Errorf("unknown job")
	}
	return j.snapshot(), nil
}

func (w *wizard) control(r *http.Request) (any, error) {
	st := LoadState()[r.PathValue("slug")]
	if st == nil {
		return nil, fmt.Errorf("not installed")
	}
	switch a := r.PathValue("action"); a {
	case "uninstall", "uninstall-keep":
		if err := Uninstall(r.Context(), st, a == "uninstall-keep"); err != nil {
			return nil, err
		}
		return map[string]any{"ok": true}, nil
	case "update":
		key := readKeyFromConfig(st)
		if key == "" {
			return nil, fmt.Errorf("licence key not found in %s — reinstall with your key", st.Dir)
		}
		j := &job{ID: newID(), Status: "running"}
		w.mu.Lock()
		w.jobs[j.ID] = j
		w.mu.Unlock()
		go func() {
			_, err := Install(w.ctx, Options{Product: ProductBySlug(st.Slug), Key: key, Dir: st.Dir, Port: st.Port, LAN: st.LAN, Portal: w.portal}, j)
			j.mu.Lock()
			defer j.mu.Unlock()
			if err != nil {
				j.Status, j.Error = "failed", err.Error()
			} else {
				j.Status, j.URL = "done", fmt.Sprintf("http://localhost:%d/", st.Port)
			}
		}()
		return map[string]any{"job": j.ID}, nil
	default:
		out, err := Control(r.Context(), st, a)
		if err != nil {
			return nil, fmt.Errorf("%v: %s", err, lastLines(out, 6))
		}
		return map[string]any{"ok": true, "output": out}, nil
	}
}
