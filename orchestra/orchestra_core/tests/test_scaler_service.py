"""The scaler (REQUESTS 136, BLUEPRINT-V4 §31.F G4): the only part that talks to Docker, and only
to start and stop AXTO worker containers it labelled itself. A fake Docker Engine on a unix
socket records every call, so the tests run anywhere."""
import json
import os
import re
import socketserver
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="orch-test-"))
os.environ.setdefault("ORCHESTRA_WORKER_TOKEN", "worker-test-token")

import pytest
from fastapi.testclient import TestClient

import scaler_service as sc

TOKEN = {"X-Orchestra-Worker-Token": os.environ["ORCHESTRA_WORKER_TOKEN"]}


class FakeDocker:
    def __init__(self):
        self.images = {"axto/orchestra-worker-gpu:latest", "axto/orchestra-worker-cpu:latest"}
        self.containers = {}   # name -> {"Id", "Labels", "State", "spec"}
        self.calls = []
        self.me = {"NetworkSettings": {"Networks": {"axto-orchestra_orchestra-net": {}}},
                   "Mounts": [{"Destination": "/app/data", "Name": "axto-orchestra_orchestra-data"}],
                   "Config": {"Labels": {"com.docker.compose.project": "axto-orchestra"}}}


def _serve(fake: FakeDocker, path: str):
    class H(BaseHTTPRequestHandler):
        def _reply(self, status, body=None):
            data = json.dumps(body).encode() if body is not None else b""
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, *a):
            pass

        def address_string(self):
            return "unix"

        def handle_one(self, method):
            n = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(n)) if n else None
            p = self.path.replace("/v1.41", "", 1)
            fake.calls.append((method, p, body))
            if m := re.fullmatch(r"/images/(.+)/json", p):
                ref = m.group(1).replace("%2F", "/").replace("%3A", ":")
                return self._reply(200, {"Id": ref}) if ref in fake.images else self._reply(404, {"message": "No such image"})
            if p.startswith("/containers/json"):
                return self._reply(200, [{"Id": c["Id"], "Names": ["/" + n], "Labels": c["Labels"], "State": c["State"], "Status": "Up"}
                                         for n, c in fake.containers.items() if c["Labels"].get(sc.LABEL) == "1"])
            if m := re.fullmatch(r"/containers/create\?name=(.+)", p):
                cid = f"{len(fake.containers) + 1:064x}"
                fake.containers[m.group(1)] = {"Id": cid, "Labels": body["Labels"], "State": "created", "spec": body}
                return self._reply(201, {"Id": cid})
            if m := re.fullmatch(r"/containers/([0-9a-f]{64})/start", p):
                for c in fake.containers.values():
                    if c["Id"] == m.group(1):
                        c["State"] = "running"
                return self._reply(204)
            if m := re.fullmatch(r"/containers/([^/?]+)/json", p):
                name = m.group(1)
                if name in fake.containers:
                    return self._reply(200, {"Config": {"Labels": fake.containers[name]["Labels"]}})
                if name not in fake.containers and not name.startswith("orchestra-"):
                    return self._reply(200, fake.me)        # the scaler inspecting itself
                return self._reply(404, {"message": "No such container"})
            if m := re.fullmatch(r"/containers/([^/?]+)/stop\?t=\d+", p):
                fake.containers.pop(m.group(1), None)        # AutoRemove
                return self._reply(204)
            return self._reply(404, {"message": "unknown " + p})

        def do_GET(self):
            self.handle_one("GET")

        def do_POST(self):
            self.handle_one("POST")

    class Server(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
        daemon_threads = True

    srv = Server(path, H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


@pytest.fixture()
def setup(tmp_path, monkeypatch):
    fake = FakeDocker()
    sock = str(tmp_path / "docker.sock")
    srv = _serve(fake, sock)
    monkeypatch.setattr(sc, "docker", sc.Docker(sock))
    monkeypatch.setattr(sc.socket, "gethostname", lambda: "scalerself")
    yield fake, TestClient(sc.app)
    srv.shutdown()
    srv.server_close()


def test_only_orchestra_core_may_use_it(setup):
    _, client = setup
    assert client.get("/workers").status_code == 401
    assert client.post("/workers", json={"kind": "gpu"}).status_code == 401
    assert client.get("/health").json()["images"] == {"cpu": True, "gpu": True, "gpu-amd": False}


def test_starts_a_gpu_worker_pinned_to_one_gpu_on_this_orchestras_network(setup):
    fake, client = setup
    r = client.post("/workers", headers=TOKEN, json={"kind": "gpu", "gpu_index": 1})
    assert r.status_code == 201, r.text
    name = r.json()["name"]
    assert re.fullmatch(r"orchestra-scaled-gpu-1-[0-9a-f]{6}", name)
    spec = fake.containers[name]["spec"]
    host = spec["HostConfig"]
    assert spec["Image"] == "axto/orchestra-worker-gpu:latest"
    assert host["DeviceRequests"] == [{"Driver": "nvidia", "Capabilities": [["gpu"]], "DeviceIDs": ["1"]}]
    assert host["NetworkMode"] == "axto-orchestra_orchestra-net"
    assert "axto-orchestra_orchestra-data:/app/data:ro" in host["Binds"]
    assert "axto-orchestra_orchestra-models:/app/models" in host["Binds"]
    assert host["AutoRemove"] is True and host["RestartPolicy"] == {"Name": "no"}
    assert f"WORKER_SELF_URL=http://{name}:7892" in spec["Env"]
    # Nothing secret in the container's configuration: workers read the token from the data volume.
    assert not any("TOKEN" in e or "PASSWORD" in e for e in spec["Env"])
    assert spec["Labels"][sc.LABEL] == "1" and spec["Labels"]["io.axto.orchestra.gpu"] == "1"
    assert client.get("/workers", headers=TOKEN).json()["workers"][0]["name"] == name


def test_amd_worker_gets_kfd_and_its_own_render_node(setup):
    fake, client = setup
    fake.images.add("axto/orchestra-worker-gpu-amd:latest")
    name = client.post("/workers", headers=TOKEN, json={"kind": "gpu-amd", "gpu_index": 2}).json()["name"]
    host = fake.containers[name]["spec"]["HostConfig"]
    assert [d["PathOnHost"] for d in host["Devices"]] == ["/dev/kfd", "/dev/dri/renderD130"]
    assert host["GroupAdd"] == ["video"] and "DeviceRequests" not in host


def test_refuses_images_that_are_not_installed_and_unknown_kinds(setup):
    fake, client = setup
    r = client.post("/workers", headers=TOKEN, json={"kind": "gpu-amd"})
    assert r.status_code == 409 and "AXTO Setup" in r.json()["detail"]
    assert client.post("/workers", headers=TOKEN, json={"kind": "nginx"}).status_code == 400
    assert client.post("/workers", headers=TOKEN, json={"kind": "cpu", "gpu_index": 0}).status_code == 400
    assert not any(c[0] == "POST" and "/containers/create" in c[1] for c in fake.calls)


def test_never_more_than_the_limit(setup, monkeypatch):
    _, client = setup
    monkeypatch.setattr(sc, "SCALER_MAX", 2)
    assert client.post("/workers", headers=TOKEN, json={"kind": "cpu"}).status_code == 201
    assert client.post("/workers", headers=TOKEN, json={"kind": "cpu"}).status_code == 201
    assert client.post("/workers", headers=TOKEN, json={"kind": "cpu"}).status_code == 409


def test_stops_only_its_own_workers(setup):
    fake, client = setup
    name = client.post("/workers", headers=TOKEN, json={"kind": "cpu"}).json()["name"]
    assert client.delete(f"/workers/{name}", headers=TOKEN).json() == {"ok": True}
    assert name not in fake.containers
    # A container someone else started is out of reach, even under a scaled-looking name.
    fake.containers["orchestra-scaled-gpu-all-abcdef"] = {"Id": "f" * 64, "Labels": {}, "State": "running", "spec": {}}
    assert client.delete("/workers/orchestra-scaled-gpu-all-abcdef", headers=TOKEN).status_code == 403
    assert client.delete("/workers/orchestra-core", headers=TOKEN).status_code == 400
    assert client.delete("/workers/orchestra-scaled-cpu-all-123456", headers=TOKEN).json() == {"ok": True, "gone": True}
