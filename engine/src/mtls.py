# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Guardian — AI eXecution & Tools Orchestration — mTLS Node-to-Core Communication (Tier 2)
=======================================================
Semua traffic node → core dienkripsi dan di-authenticate secara mutual.
Tidak ada node yang bisa bicara ke core tanpa certificate yang valid.

Cara kerja:
  1. Admin generate CA key/cert  (guardian-cert-tool gen-ca)
  2. Untuk tiap node: generate node cert signed by CA  (gen-node <node_id>)
  3. Core verifikasi client cert saat node connect
  4. Node verifikasi server cert (trust only our CA)

Env vars / config:
  GUARDIAN_MTLS_ENABLED=true
  GUARDIAN_MTLS_CERT_PATH=/guardian/certs/node.crt   (PEM)
  GUARDIAN_MTLS_KEY_PATH=/guardian/certs/node.key    (PEM)
  GUARDIAN_MTLS_CA_PATH=/guardian/certs/ca.crt       (PEM)

Tool generate cert:
  python -m src.mtls gen-ca     → buat CA baru
  python -m src.mtls gen-node <node_id>  → buat node cert signed by CA

Digunakan di:
  node.py    → GuardianNode._client pakai httpx dengan SSL context
  api.py     → FastAPI uvicorn dengan SSL context (server side)
"""
from __future__ import annotations

import logging, os, sys
from pathlib import Path
from typing import Optional

log = logging.getLogger("guardian.mtls")

CERTS_DIR = Path(os.environ.get("GUARDIAN_CERTS_DIR", "/guardian/certs"))


# ── SSL Context builders ──────────────────────────────────────────────────────

def build_client_ssl_context(
    cert_path: str = "",
    key_path:  str = "",
    ca_path:   str = "",
):
    """
    Build SSL context for httpx (node → core).
    Returns ssl.SSLContext or None if mTLS not configured.
    """
    import ssl
    cert = cert_path or os.environ.get("GUARDIAN_MTLS_CERT_PATH", "")
    key  = key_path  or os.environ.get("GUARDIAN_MTLS_KEY_PATH",  "")
    ca   = ca_path   or os.environ.get("GUARDIAN_MTLS_CA_PATH",   "")

    if not (cert and key and ca):
        return None
    if not (Path(cert).exists() and Path(key).exists() and Path(ca).exists()):
        log.warning("mTLS cert files not found — falling back to plain HTTP")
        return None

    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.load_cert_chain(cert, key)
    ctx.load_verify_locations(ca)
    ctx.verify_mode = ssl.CERT_REQUIRED
    ctx.check_hostname = False   # hostname check disabled for internal IPs
    log.info("mTLS client SSL context ready")
    return ctx


def build_server_ssl_context(
    cert_path: str = "",
    key_path:  str = "",
    ca_path:   str = "",
):
    """
    Build SSL context for uvicorn (core server side).
    Returns dict with ssl_keyfile / ssl_certfile / ssl_ca_certs for uvicorn.
    """
    import ssl
    cert = cert_path or os.environ.get("GUARDIAN_MTLS_CERT_PATH", "")
    key  = key_path  or os.environ.get("GUARDIAN_MTLS_KEY_PATH",  "")
    ca   = ca_path   or os.environ.get("GUARDIAN_MTLS_CA_PATH",   "")

    if not (cert and key and ca):
        return {}
    if not (Path(cert).exists() and Path(key).exists() and Path(ca).exists()):
        log.warning("mTLS server cert files not found — running without TLS")
        return {}

    log.info("mTLS server SSL context ready")
    return {
        "ssl_keyfile":  key,
        "ssl_certfile": cert,
        "ssl_ca_certs": ca,
        "ssl_cert_reqs": __import__("ssl").CERT_REQUIRED,
    }


def make_mtls_client(
    cert_path: str = "",
    key_path:  str = "",
    ca_path:   str = "",
    timeout: float = 30.0,
):
    """
    Return httpx.AsyncClient configured for mTLS.
    Falls back to plain httpx.AsyncClient if mTLS not configured.
    """
    import httpx
    ctx = build_client_ssl_context(cert_path, key_path, ca_path)
    if ctx:
        return httpx.AsyncClient(verify=ctx, timeout=timeout)
    return httpx.AsyncClient(timeout=timeout)


# ── Certificate generation tool ───────────────────────────────────────────────

def _gen_ca(output_dir: Path) -> None:
    """Generate self-signed CA key + certificate."""
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime
    except ImportError:
        print("ERROR: pip install cryptography")
        return

    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate CA private key
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
    ca_key_path = output_dir / "ca.key"
    ca_key_path.write_bytes(ca_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption()
    ))

    # Generate CA certificate
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Guardian AI"),
        x509.NameAttribute(NameOID.COMMON_NAME, "Guardian CA"),
    ])
    ca_cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.utcnow())
        .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(ca_key, hashes.SHA256())
    )
    ca_cert_path = output_dir / "ca.crt"
    ca_cert_path.write_bytes(ca_cert.public_bytes(serialization.Encoding.PEM))
    print(f"✅ CA generated:\n   key:  {ca_key_path}\n   cert: {ca_cert_path}")


def _gen_node(node_id: str, output_dir: Path) -> None:
    """Generate node key + cert signed by CA."""
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime
    except ImportError:
        print("ERROR: pip install cryptography")
        return

    ca_key_path  = output_dir / "ca.key"
    ca_cert_path = output_dir / "ca.crt"
    if not ca_key_path.exists() or not ca_cert_path.exists():
        print("ERROR: CA not found. Run gen-ca first.")
        return

    from cryptography.hazmat.primitives.serialization import load_pem_private_key
    from cryptography.x509 import load_pem_x509_certificate

    ca_key  = load_pem_private_key(ca_key_path.read_bytes(), password=None)
    ca_cert = load_pem_x509_certificate(ca_cert_path.read_bytes())

    node_dir = output_dir / node_id
    node_dir.mkdir(parents=True, exist_ok=True)

    # Node private key
    node_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    node_key_path = node_dir / "node.key"
    node_key_path.write_bytes(node_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption()
    ))

    # Node certificate signed by CA
    subject = x509.Name([
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Guardian AI"),
        x509.NameAttribute(NameOID.COMMON_NAME, f"guardian-node-{node_id}"),
    ])
    node_cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(ca_cert.subject)
        .public_key(node_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.utcnow())
        .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .sign(ca_key, hashes.SHA256())
    )
    node_cert_path = node_dir / "node.crt"
    node_cert_path.write_bytes(node_cert.public_bytes(serialization.Encoding.PEM))

    # Copy CA cert for node to verify core
    import shutil
    shutil.copy(ca_cert_path, node_dir / "ca.crt")

    print(f"✅ Node cert for '{node_id}':\n"
          f"   key:  {node_key_path}\n"
          f"   cert: {node_cert_path}\n"
          f"   ca:   {node_dir / 'ca.crt'}")


# ── Entry point for cert tool ─────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Guardian mTLS Certificate Tool")
    sub = parser.add_subparsers(dest="cmd")

    ca_p = sub.add_parser("gen-ca", help="Generate CA key + cert")
    ca_p.add_argument("--out", default=str(CERTS_DIR), help="Output directory")

    nd_p = sub.add_parser("gen-node", help="Generate node cert signed by CA")
    nd_p.add_argument("node_id", help="Node ID (e.g. node-1)")
    nd_p.add_argument("--out", default=str(CERTS_DIR), help="Certs directory")

    args = parser.parse_args()
    if args.cmd == "gen-ca":
        _gen_ca(Path(args.out))
    elif args.cmd == "gen-node":
        _gen_node(args.node_id, Path(args.out))
    else:
        parser.print_help()
