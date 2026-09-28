#!/usr/bin/env python3
# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
Generate + sign a code-integrity manifest, and stamp the engine's compiled-in
public key. Run in CI while building each image.

  # sign the app tree with the CI private key (base64 Ed25519 seed):
  python tools/gen_manifest.py sign --root legal --product legal \
      --version 3.0.0 --key-b64 "$AXTO_INTEGRITY_PRIVATE_KEY" \
      --out legal/src/axto_integrity.json

  # stamp the matching PUBLIC key into the shipped _integrity.py so the running
  # engine verifies against a key it cannot change:
  python tools/gen_manifest.py stamp --file legal/src/_integrity.py \
      --public-b64 "$AXTO_INTEGRITY_PUBLIC_KEY"

  # dev helper: make a throwaway keypair
  python tools/gen_manifest.py keygen
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import integrity  # noqa: E402


def _keygen() -> None:
    from cryptography.hazmat.primitives.asymmetric import ed25519
    k = ed25519.Ed25519PrivateKey.generate()
    priv = base64.b64encode(k.private_bytes_raw()).decode()
    pub = base64.b64encode(k.public_key().public_bytes_raw()).decode()
    print(json.dumps({"private_b64": priv, "public_b64": pub}, indent=2))


def _sign(a: argparse.Namespace) -> None:
    man = integrity.generate(a.root, a.product, a.version, a.key_b64)
    out = a.out or os.path.join(a.root, "src", integrity.MANIFEST_NAME)
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(man, fh, separators=(",", ":"), sort_keys=True)
    print(f"integrity: signed {man['count']} files for {a.product} v{a.version} -> {out}")


def _stamp(a: argparse.Namespace) -> None:
    with open(a.file, "r", encoding="utf-8") as fh:
        src = fh.read()
    marker = '_PUBLIC_KEY = os.environ.get("_AXTO_INTEGRITY_PUBLIC_KEY_BUILD", "")'
    stamped = f'_PUBLIC_KEY = "{a.public_b64}"  # stamped at build time'
    if marker not in src and '_PUBLIC_KEY = "' not in src:
        sys.exit(f"stamp: marker not found in {a.file}")
    import re
    src = re.sub(r'_PUBLIC_KEY = (?:os\.environ\.get\([^)]*\)|"[^"]*").*', stamped, src, count=1)
    with open(a.file, "w", encoding="utf-8") as fh:
        fh.write(src)
    print(f"integrity: stamped public key into {a.file}")


def main() -> None:
    p = argparse.ArgumentParser(description="AXTO integrity manifest tool")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sign"); s.add_argument("--root", required=True); s.add_argument("--product", required=True)
    s.add_argument("--version", default="3.0.0"); s.add_argument("--key-b64", required=True, dest="key_b64"); s.add_argument("--out", default="")
    s.set_defaults(func=_sign)
    st = sub.add_parser("stamp"); st.add_argument("--file", required=True); st.add_argument("--public-b64", required=True, dest="public_b64")
    st.set_defaults(func=_stamp)
    kg = sub.add_parser("keygen"); kg.set_defaults(func=lambda _a: _keygen())
    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
