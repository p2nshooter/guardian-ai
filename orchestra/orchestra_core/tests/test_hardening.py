"""Module integrity: an official update must never stop Orchestra; tampering must."""
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="orch-test-"))

import security_hardening as sh  # noqa: E402

SRC = Path(HERE).parent


def _copy_modules(tmp: Path) -> Path:
    for name in sh.GUARDED_MODULES:
        if (SRC / name).exists():
            shutil.copy(SRC / name, tmp / name)
    return tmp


def test_source_run_without_manifest_is_reported_not_stopped(tmp_path):
    base = _copy_modules(tmp_path)
    r = sh.check_module_integrity(base)
    assert r["passed"] is True
    assert r["mode"] == "development"


def test_release_manifest_matches(tmp_path):
    base = _copy_modules(tmp_path)
    written = sh.write_release_manifest(base)
    assert set(written) == {n for n in sh.GUARDED_MODULES if (SRC / n).exists()}
    r = sh.check_module_integrity(base)
    assert r["passed"] is True and r["mode"] == "release"


def test_module_edited_inside_container_is_caught(tmp_path):
    base = _copy_modules(tmp_path)
    sh.write_release_manifest(base)
    with open(base / "enforcement.py", "a") as f:
        f.write("\n# patched\n")
    r = sh.check_module_integrity(base)
    assert r["passed"] is False
    assert any("enforcement.py" in v for v in r["violations"])


def test_module_deleted_or_added_is_caught(tmp_path):
    base = _copy_modules(tmp_path)
    sh.write_release_manifest(base)
    (base / "job_router.py").unlink()
    r = sh.check_module_integrity(base)
    assert r["passed"] is False
    assert any("job_router.py missing" in v for v in r["violations"])

    base2 = tmp_path / "b"
    base2.mkdir()
    _copy_modules(base2)
    manifest = sh.write_release_manifest(base2)
    manifest.pop("ai_providers.py")
    (base2 / sh.RELEASE_MANIFEST_NAME).write_text(json.dumps(manifest))
    r2 = sh.check_module_integrity(base2)
    assert r2["passed"] is False
    assert any("ai_providers.py not in release manifest" in v for v in r2["violations"])


def test_unreadable_manifest_fails_closed(tmp_path):
    base = _copy_modules(tmp_path)
    (base / sh.RELEASE_MANIFEST_NAME).write_text("not json")
    r = sh.check_module_integrity(base)
    assert r["passed"] is False


def test_update_with_old_hash_file_in_data_volume_still_starts(tmp_path):
    """The bug: a customer's data volume keeps module_hashes.json from the
    previous release. After updating the image, startup must still pass."""
    data = Path(os.environ["DATA_DIR"])
    data.mkdir(parents=True, exist_ok=True)
    stale = {n: "0" * 64 for n in sh.GUARDED_MODULES}
    sh.LEGACY_HASHES_PATH.write_text(json.dumps(stale))

    base = _copy_modules(tmp_path)
    sh.write_release_manifest(base)  # the new image's manifest
    r = sh.check_module_integrity(base)
    assert r["passed"] is True and r["mode"] == "release"
    # The old file is left untouched (not rewritten, not deleted).
    assert json.loads(sh.LEGACY_HASHES_PATH.read_text()) == stale


def test_run_all_has_no_critical_failure_after_update(tmp_path, monkeypatch):
    base = _copy_modules(tmp_path)
    sh.write_release_manifest(base)
    sh.LEGACY_HASHES_PATH.write_text(json.dumps({n: "f" * 64 for n in sh.GUARDED_MODULES}))
    real = sh.check_module_integrity
    monkeypatch.setattr(sh, "check_module_integrity", lambda: real(base))
    out = sh.run_all()
    assert out["critical_failure"] is False
