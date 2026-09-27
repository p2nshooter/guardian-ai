"""
AXTO — engine licence protocol check (run by engines.e2e.ts inside Docker).

Loads each engine's REAL license.py (only the compiled-in public key is swapped
for the TEST key the local server signs with) and runs it against the local
dashboard:

  1. genuine answer            → licence valid, limits taken from the SIGNED entitlements
  2. MITM rewrites plain JSON  → still valid, but the tampered limits are ignored
  3. replayed old answer       → refused (request nonce not echoed) on a fresh install
  4. installation id           → stable across restarts (persisted in AXTO_STATE_DIR)

Prints one JSON line per engine; exit code 0 only when every check passes.
"""
import asyncio, importlib.util, json, os, shutil, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import urllib.request

PROD_KEY = "p9cJ3Ct6j/tQPGtH/YJA7Fm8P/VgOSc2+e57+dFNMF0="
TEST_KEY = "tljcAsNNvb0cxHPRnNTkm5o15YfzMWJGOyeew1UwvpY="
SERVER   = os.environ["AXTO_TEST_SERVER"]            # http://127.0.0.1:8788/api/license-validate
REPO     = os.environ.get("AXTO_REPO", "/repo")

# ── a man-in-the-middle proxy we can switch between modes ────────────────────
class Proxy:
    mode = "pass"          # pass | tamper | replay
    recorded = None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        if Proxy.mode == "replay" and Proxy.recorded:
            out = Proxy.recorded
        else:
            req = urllib.request.Request(SERVER, data=body, headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=20) as r:
                    out = json.loads(r.read())
            except urllib.error.HTTPError as e:
                out = json.loads(e.read() or b"{}")
            Proxy.recorded = out
            if Proxy.mode == "tamper":
                out = json.loads(json.dumps(out))
                out["features"] = {**(out.get("features") or {}), "max_nodes": 999999, "max_workers": 999999}
                out["max_nodes"] = 999999
                out["package"] = out["package_code"] = "forged_unlimited"
        raw = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def start_proxy() -> str:
    srv = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{srv.server_address[1]}/api/license-validate"


def load(path: str, state_dir: str, tag: str):
    """Fresh copy of the engine's licence module, TEST public key swapped in."""
    src = open(path).read()
    assert PROD_KEY in src, f"{path}: production key not found"
    tmp = tempfile.mkdtemp()
    mod_path = os.path.join(tmp, f"lic_{tag}.py")
    open(mod_path, "w").write(src.replace(PROD_KEY, TEST_KEY))
    os.environ["AXTO_STATE_DIR"] = state_dir
    os.environ["LEGL_CACHE_PATH"] = state_dir
    spec = importlib.util.spec_from_file_location(f"lic_{tag}", mod_path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod        # @dataclass resolves annotations through sys.modules
    spec.loader.exec_module(mod)
    return mod


async def check(mod, key: str) -> dict:
    """Runs whichever validator API this engine family exposes."""
    if hasattr(mod, "LicenseValidator"):
        v = mod.LicenseValidator({"license_key": key})
        st = await v.validate(force=True)
        await v.close()
        return {"valid": bool(st.valid), "reason": st.reason, "package": st.package,
                "max_nodes": st.max_nodes, "features": st.features}
    if hasattr(mod, "validate_license"):            # Studio family
        st = await mod.validate_license(key)
        return {"valid": bool(st.valid), "reason": getattr(st, "error", ""), "package": getattr(st, "plan", ""),
                "max_nodes": getattr(st, "max_nodes", None), "features": {}}
    if hasattr(mod, "validate"):                    # Legal
        st = await mod.validate(key)
        return {"valid": bool(st.valid), "reason": st.status, "package": st.package,
                "max_nodes": None, "features": {"workspaces": st.workspaces}}
    raise RuntimeError("unknown licence API")


async def run(engine: dict, proxy_url: str) -> dict:
    path, key, name = os.path.join(REPO, engine["path"]), engine["key"], engine["name"]
    res = {"engine": name, "ok": False, "checks": {}}
    os.environ["AXTO_LICENSE_SERVER"] = proxy_url
    state1 = tempfile.mkdtemp()
    # Engines sharing one key (Studio core + modules) share one installation id.
    open(os.path.join(state1, "machine-id"), "w").write(engine["machine_id"])

    # 1. genuine
    Proxy.mode = "pass"
    mod = load(path, state1, name + "1")
    g = await check(mod, key)
    mid1 = mod.machine_id()
    res["checks"]["genuine_valid"] = g["valid"]
    res["genuine"] = {k: g[k] for k in ("reason", "package", "max_nodes")}
    signed_max = g["max_nodes"]

    # 4. installation id survives a restart (fresh module, same state dir)
    mod_again = load(path, state1, name + "1b")
    res["checks"]["machine_id_stable"] = (mod_again.machine_id() == mid1 == engine["machine_id"])

    # 2. MITM tampers with the unsigned JSON
    Proxy.mode = "tamper"
    t = await check(mod_again, key)
    res["checks"]["tamper_still_valid"] = t["valid"]
    if hasattr(mod_again, "LicenseValidator"):
        res["checks"]["tamper_limits_ignored"] = (t["max_nodes"] == signed_max and t["package"] != "forged_unlimited")

    # 3. replay the genuine answer recorded in step 2 to a fresh install with the
    #    SAME installation id but no cached proof → must be refused
    state2 = tempfile.mkdtemp()
    shutil.copy(os.path.join(state1, "machine-id"), os.path.join(state2, "machine-id"))
    Proxy.mode = "replay"
    r = await check(load(path, state2, name + "2"), key)
    res["checks"]["replay_refused"] = not r["valid"]
    Proxy.mode = "pass"

    res["ok"] = all(res["checks"].values())
    return res


async def main():
    engines = json.loads(sys.argv[1])
    proxy_url = start_proxy()
    failed = 0
    for e in engines:
        try:
            r = await run(e, proxy_url)
        except Exception as ex:  # report, keep going
            r = {"engine": e["name"], "ok": False, "error": f"{type(ex).__name__}: {ex}"}
        failed += 0 if r["ok"] else 1
        print(json.dumps(r), flush=True)
    sys.exit(1 if failed else 0)


asyncio.run(main())
