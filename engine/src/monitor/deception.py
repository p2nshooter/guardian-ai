# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — Deception Technology
Plant fake credentials & tokens that trigger immediate alerts when used.
Attacker yang mencuri credentials dan mencoba menggunakannya = instantly caught.

Deception artifacts:
  1. Fake AWS credentials in ~/.aws/credentials
  2. Fake API keys in .env files
  3. Fake DB passwords in config files  
  4. Fake SSH private keys
  5. Fake internal URLs that are monitored (canary tokens)
  6. Fake /etc/passwd entries (honeypot users)
  7. TCP honeypot listener — catches port scanners (NEW)
  8. Fake Docker registry credentials (NEW)
  9. Process access identification via /proc/pid/fd (IMPROVED)

v2 Improvements:
  - TCP honeypot server that logs attacker IPs on connect
  - SSH private key honeypot
  - Docker config.json decoy
  - Better process-to-file mapping via /proc
  - Async file access check with inotify-like polling
  - Deduplication of alerts (don't re-alert same artifact/event)
  - Alert rate limiting to prevent log flooding
"""
from __future__ import annotations
import asyncio, json, logging, os, subprocess, time, uuid
from pathlib import Path
from typing import List, Dict, Optional, Set, Tuple
from src.database import get_db

log = logging.getLogger("guardian.deception")

DATA_DIR = Path(os.environ.get("GUARDIAN_DATA_DIR", "/guardian/data"))

# TCP honeypot ports — scan these = instant alert
HONEYPOT_PORTS = [
    4444,   # Metasploit default
    31337,  # "elite" hacker port
    8888,   # Jupyter / misc backdoor
    9001,   # Tor / misc
    2222,   # Fake SSH (real SSH should be elsewhere)
]

# Alert dedup window: don't re-alert same artifact within N seconds
ALERT_DEDUP_SEC = 300


class DeceptionEngine:
    def __init__(self):
        self._node_id      = os.environ.get("GUARDIAN_NODE_ID", "core")
        self._running      = False
        self._artifacts: Dict[str, dict] = {}
        self._canary_ids:  set  = set()
        self._used_artifacts: List[dict] = []
        self._last_alert: Dict[str, float] = {}   # artifact_id → last alert time
        self._honeypot_connections: List[dict] = []
        self._tcp_servers: List[asyncio.Server] = []

    async def start(self) -> None:
        self._running = True
        await self._plant_deceptions()
        asyncio.create_task(self._monitor_loop())
        await self._start_tcp_honeypots()
        log.info(f"Deception engine started: {len(self._artifacts)} artifacts planted")

    async def stop(self) -> None:
        self._running = False
        for server in self._tcp_servers:
            server.close()
            try:
                await server.wait_closed()
            except Exception:
                pass
        self._tcp_servers.clear()

    # ── Plant deception artifacts ─────────────────────────────────────────────

    async def _plant_deceptions(self) -> None:
        """Plant fake credentials in common locations."""
        plants = [
            self._plant_fake_aws_creds,
            self._plant_fake_env_keys,
            self._plant_fake_db_config,
            self._plant_canary_tokens,
            self._plant_honeypot_user,
            self._plant_fake_ssh_key,
            self._plant_fake_docker_config,
        ]
        for plant_fn in plants:
            try:
                await plant_fn()
            except Exception as e:
                log.debug(f"Deception plant error ({plant_fn.__name__}): {e}")

    async def _plant_fake_aws_creds(self) -> None:
        """Plant fake AWS credentials — if used, AWS will reject + we alert."""
        aws_dir    = Path("/root/.aws")
        creds_file = aws_dir / "credentials"
        if creds_file.exists():
            return  # Don't overwrite real credentials
        try:
            aws_dir.mkdir(exist_ok=True, mode=0o700)
            fake_key_id = "AKIA" + uuid.uuid4().hex[:16].upper()
            fake_secret = uuid.uuid4().hex + uuid.uuid4().hex
            creds_file.write_text(
                f"[default]\n"
                f"aws_access_key_id = {fake_key_id}\n"
                f"aws_secret_access_key = {fake_secret}\n"
            )
            os.chmod(str(creds_file), 0o600)
            self._artifacts[fake_key_id] = {
                "type":       "aws_credentials",
                "key_id":     fake_key_id,
                "location":   str(creds_file),
                "planted_at": time.time(),
                "last_atime": time.time(),
            }
            self._canary_ids.add(fake_key_id)
            log.info(f"🍯 Planted fake AWS creds: {creds_file}")
        except PermissionError:
            pass

    async def _plant_fake_env_keys(self) -> None:
        """Plant decoy .env file with fake API keys in common web roots."""
        web_roots = ["/var/www/html", "/srv/www", "/home/www", "/opt/app"]
        for root in web_roots:
            env_path = Path(root) / ".env.backup"
            if Path(root).exists() and not env_path.exists():
                try:
                    fake_db_pass = uuid.uuid4().hex
                    fake_api_key = "sk-" + uuid.uuid4().hex + uuid.uuid4().hex
                    fake_jwt     = uuid.uuid4().hex * 2
                    env_path.write_text(
                        f"# Application Environment Backup\n"
                        f"DATABASE_URL=postgresql://app:{fake_db_pass}@localhost/appdb\n"
                        f"API_KEY={fake_api_key}\n"
                        f"JWT_SECRET={fake_jwt}\n"
                        f"ADMIN_PASSWORD=admin_{uuid.uuid4().hex[:12]}\n"
                    )
                    os.chmod(str(env_path), 0o640)
                    self._artifacts[fake_api_key] = {
                        "type":       "env_file",
                        "location":   str(env_path),
                        "planted_at": time.time(),
                        "last_atime": time.time(),
                    }
                    self._canary_ids.add(fake_api_key)
                    log.info(f"🍯 Planted fake .env: {env_path}")
                except Exception:
                    pass

    async def _plant_fake_db_config(self) -> None:
        """Plant fake database config in /etc/."""
        config_path = Path("/etc/.db_backup.conf")
        if config_path.exists():
            return
        try:
            fake_pass = uuid.uuid4().hex
            config_path.write_text(
                f"[database]\n"
                f"host=internal-db.local\n"
                f"port=5432\n"
                f"user=dbadmin\n"
                f"password={fake_pass}\n"
                f"database=production\n"
            )
            os.chmod(str(config_path), 0o640)
            self._artifacts[fake_pass] = {
                "type":       "db_config",
                "location":   str(config_path),
                "planted_at": time.time(),
                "last_atime": time.time(),
                "password":   fake_pass,
            }
            log.info(f"🍯 Planted fake DB config: {config_path}")
        except Exception:
            pass

    async def _plant_fake_ssh_key(self) -> None:
        """Plant a fake SSH private key. If read, attacker won't know it's fake."""
        ssh_dir  = Path("/root/.ssh")
        key_path = ssh_dir / "id_rsa.bak"
        if key_path.exists():
            return
        try:
            ssh_dir.mkdir(exist_ok=True, mode=0o700)
            # Generate a fake-looking (but invalid) RSA key header
            fake_key_body = "\n".join(
                uuid.uuid4().hex * 2 for _ in range(25)
            )
            key_path.write_text(
                "-----BEGIN RSA PRIVATE KEY-----\n"
                f"{fake_key_body}\n"
                "-----END RSA PRIVATE KEY-----\n"
            )
            os.chmod(str(key_path), 0o600)
            artifact_id = "ssh_key_bak"
            self._artifacts[artifact_id] = {
                "type":       "ssh_private_key",
                "location":   str(key_path),
                "planted_at": time.time(),
                "last_atime": time.time(),
            }
            log.info(f"🍯 Planted fake SSH key: {key_path}")
        except Exception:
            pass

    async def _plant_fake_docker_config(self) -> None:
        """Plant fake Docker registry credentials."""
        docker_dir  = Path("/root/.docker")
        config_path = docker_dir / "config.json.bak"
        if config_path.exists():
            return
        try:
            docker_dir.mkdir(exist_ok=True, mode=0o700)
            fake_auth = uuid.uuid4().hex + uuid.uuid4().hex
            config_path.write_text(json.dumps({
                "auths": {
                    "registry.internal.local": {"auth": fake_auth},
                    "docker.io":               {"auth": uuid.uuid4().hex},
                },
                "credsStore": "desktop"
            }, indent=2))
            os.chmod(str(config_path), 0o600)
            self._artifacts[fake_auth] = {
                "type":       "docker_credentials",
                "location":   str(config_path),
                "planted_at": time.time(),
                "last_atime": time.time(),
            }
            self._canary_ids.add(fake_auth)
            log.info(f"🍯 Planted fake Docker config: {config_path}")
        except Exception:
            pass

    async def _plant_canary_tokens(self) -> None:
        """Plant canary token UUIDs in various locations."""
        canary_file = DATA_DIR / "canary_tokens.json"
        tokens = {}
        for name in ["admin_token", "internal_api_key", "deployment_key", "monitoring_token",
                     "backup_encryption_key", "internal_service_token"]:
            token = str(uuid.uuid4())
            tokens[name] = token
            self._canary_ids.add(token)

        canary_file.parent.mkdir(parents=True, exist_ok=True)
        canary_file.write_text(json.dumps(tokens, indent=2))

        for loc in ["/tmp/.tokens", "/root/.tokens", "/var/www/html/.tokens"]:
            try:
                Path(loc).write_text(json.dumps(tokens))
                os.chmod(loc, 0o600)
            except Exception:
                pass
        log.info(f"🍯 Planted {len(tokens)} canary tokens")

    async def _plant_honeypot_user(self) -> None:
        """Watch for login attempts with known-fake usernames in auth logs."""
        self._artifacts["honeypot_user"] = {
            "type":       "honeypot_user",
            "username":   "svc-monitor",
            "location":   "/etc/passwd",
            "planted_at": time.time(),
        }

    # ── TCP Honeypot ──────────────────────────────────────────────────────────

    async def _start_tcp_honeypots(self) -> None:
        """Start TCP honeypot listeners on suspicious ports."""
        for port in HONEYPOT_PORTS:
            try:
                server = await asyncio.start_server(
                    self._honeypot_handler,
                    "0.0.0.0", port,
                    reuse_port=True,
                )
                self._tcp_servers.append(server)
                log.info(f"🍯 TCP honeypot listening on port {port}")
            except OSError as e:
                log.debug(f"Honeypot port {port} unavailable: {e}")

    async def _honeypot_handler(self, reader: asyncio.StreamReader,
                                 writer: asyncio.StreamWriter) -> None:
        """Handle connection to TCP honeypot port."""
        try:
            peer = writer.get_extra_info("peername")
            attacker_ip   = peer[0] if peer else "unknown"
            attacker_port = peer[1] if peer else 0
            local_port    = writer.get_extra_info("sockname", (None, 0))[1]

            log.critical(f"🎣 TCP HONEYPOT hit: {attacker_ip}:{attacker_port} → port {local_port}")

            # Try to read first banner (what tool are they using?)
            try:
                banner = await asyncio.wait_for(reader.read(512), timeout=3.0)
                banner_str = banner.decode("utf-8", errors="replace").strip()[:100]
            except Exception:
                banner_str = ""

            self._honeypot_connections.append({
                "attacker_ip":   attacker_ip,
                "attacker_port": attacker_port,
                "honeypot_port": local_port,
                "banner":        banner_str,
                "timestamp":     time.time(),
            })

            # Log to DB
            db = await get_db()
            await db.log_scan(
                self._node_id, "deception", f"tcp_honeypot:{local_port}",
                verdict="malicious", confidence=0.95,
                threat_type="honeypot_connection",
                indicators=[
                    f"attacker:{attacker_ip}:{attacker_port}",
                    f"honeypot_port:{local_port}",
                    f"banner:{banner_str[:50]}",
                ],
                method="deception"
            )
            await db.update_risk_score(self._node_id,
                os.environ.get("GUARDIAN_NODE_NAME", ""), "malicious", 0.95)

            # Send fake banner to gather attacker info
            try:
                fake_banners = {
                    22:   "SSH-2.0-OpenSSH_8.4p1 Ubuntu-6ubuntu2.1\r\n",
                    4444: "220 FTP server ready\r\n",
                    8888: "HTTP/1.1 200 OK\r\nServer: nginx/1.18.0\r\n\r\n",
                }
                writer.write(fake_banners.get(local_port, "").encode())
                await writer.drain()
            except Exception:
                pass

        except Exception as e:
            log.debug(f"Honeypot handler error: {e}")
        finally:
            try:
                writer.close()
            except Exception:
                pass

    # ── Monitor for artifact usage ────────────────────────────────────────────

    async def _monitor_loop(self) -> None:
        """Monitor for signs that deception artifacts were accessed or used."""
        while self._running:
            try:
                await self._check_file_access()
                await self._check_auth_logs()
            except Exception as e:
                log.debug(f"Deception monitor error: {e}")
            await asyncio.sleep(10)

    async def _check_file_access(self) -> None:
        """Check if any planted files were accessed (via atime)."""
        for artifact_id, artifact in list(self._artifacts.items()):
            location = artifact.get("location", "")
            if not location:
                continue
            p = Path(location)
            if not p.exists():
                continue
            try:
                stat     = p.stat()
                atime    = stat.st_atime
                mtime    = stat.st_mtime
                planted  = artifact.get("planted_at", 0)
                last_known = artifact.get("last_atime", planted)

                if atime > last_known + 5:
                    self._artifacts[artifact_id]["last_atime"] = atime
                    await self._trigger_deception_alert(artifact_id, artifact, "file_read")

                if mtime > planted + 5:
                    await self._trigger_deception_alert(artifact_id, artifact, "file_modified")
            except Exception:
                pass

    async def _check_auth_logs(self) -> None:
        """Check auth logs for honeypot username login attempts."""
        honeypot_user = "svc-monitor"
        auth_logs = ["/var/log/auth.log", "/var/log/secure"]
        for log_path in auth_logs:
            if not Path(log_path).exists():
                continue
            try:
                result = subprocess.run(
                    ["tail", "-n", "50", log_path],
                    capture_output=True, text=True, timeout=3
                )
                if honeypot_user in result.stdout:
                    artifact = self._artifacts.get("honeypot_user", {
                        "type": "honeypot_user", "location": log_path, "planted_at": time.time()
                    })
                    await self._trigger_deception_alert("honeypot_user", artifact, "login_attempt")
            except Exception:
                pass

    def check_canary_token(self, token: str) -> bool:
        """Call from API/HTTP middleware to check if a canary token was used."""
        return token in self._canary_ids

    async def _trigger_deception_alert(self, artifact_id: str, artifact: dict, event: str) -> None:
        """Fire critical alert when deception artifact is triggered."""
        # Dedup: don't re-alert same artifact within window
        last = self._last_alert.get(artifact_id, 0)
        if time.time() - last < ALERT_DEDUP_SEC:
            return
        self._last_alert[artifact_id] = time.time()

        msg = f"DECEPTION TRIGGERED: {artifact['type']} at {artifact.get('location', '')} — {event}"
        log.critical(f"🎣 {msg}")

        # Find which process accessed the file
        accessor_pid, accessor_name = await self._find_accessor(artifact.get("location", ""))

        db = await get_db()
        await db.log_scan(
            self._node_id, "deception", artifact.get("location", "deception"),
            verdict="malicious", confidence=0.98,
            threat_type="deception_triggered",
            indicators=[msg, f"event:{event}", f"accessor:{accessor_name}(PID:{accessor_pid})"],
            method="deception"
        )
        await db.update_risk_score(self._node_id,
            os.environ.get("GUARDIAN_NODE_NAME", ""), "malicious", 0.98)

        event_record = {
            "artifact_type": artifact["type"],
            "event":         event,
            "accessor_pid":  accessor_pid,
            "accessor_name": accessor_name,
            "timestamp":     time.time(),
        }
        self._used_artifacts.append(event_record)

        # Kill the accessing process if identified
        if accessor_pid > 0:
            try:
                from src.core import GuardianCore
                GuardianCore.get().response.kill_process(accessor_pid, accessor_name, "deception_triggered")
                log.info(f"Killed process {accessor_name}(PID:{accessor_pid}) — deception triggered")
            except Exception:
                pass

        # Report to dashboard
        try:
            from src.config.settings import get_config
            import src.reporter as rep
            cfg = get_config()
            if cfg.license_validate_url and cfg.license_key:
                dashboard_url = cfg.license_validate_url.replace("/api/license-validate", "")
                asyncio.create_task(rep.report_alert(
                    dashboard_url, cfg.license_key,
                    node_id=self._node_id, node_name=os.environ.get("GUARDIAN_NODE_NAME", ""),
                    alert_type="deception_triggered",
                    verdict="malicious", confidence=0.98,
                    threat_type="deception_triggered",
                    indicators=[msg], method="deception",
                    target=artifact.get("location", ""),
                    raw_data=event_record
                ))
        except Exception:
            pass

    async def _find_accessor(self, target_path: str) -> Tuple[int, str]:
        """Find PID and name of process that has target_path open."""
        if not target_path:
            return 0, "unknown"
        accessor_pid, accessor_name = 0, "unknown"
        try:
            # Run in executor to avoid blocking event loop on /proc scan
            def _scan() -> Tuple[int, str]:
                for pid_dir in Path("/proc").iterdir():
                    if not pid_dir.name.isdigit():
                        continue
                    try:
                        fd_dir = pid_dir / "fd"
                        if not fd_dir.exists():
                            continue
                        for fd in fd_dir.iterdir():
                            try:
                                if os.readlink(str(fd)) == target_path:
                                    pid  = int(pid_dir.name)
                                    name = (pid_dir / "comm").read_text().strip()
                                    return pid, name
                            except Exception:
                                pass
                    except Exception:
                        pass
                return 0, "unknown"

            loop = asyncio.get_event_loop()
            accessor_pid, accessor_name = await loop.run_in_executor(None, _scan)
        except Exception:
            pass
        return accessor_pid, accessor_name

    @property
    def triggered_count(self) -> int:
        return len(self._used_artifacts)

    def get_status(self) -> dict:
        return {
            "artifacts_planted":      len(self._artifacts),
            "canary_tokens":          len(self._canary_ids),
            "triggered_count":        self.triggered_count,
            "tcp_honeypot_ports":     HONEYPOT_PORTS,
            "tcp_honeypot_hits":      len(self._honeypot_connections),
            "recent_triggers":        self._used_artifacts[-10:],
            "recent_honeypot_hits":   self._honeypot_connections[-5:],
        }



