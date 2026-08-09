from __future__ import annotations

import asyncio
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, UploadFile

from app import main


class FakeDb:
    def __init__(self, *, fail_commit: bool = False) -> None:
        self.fail_commit = fail_commit
        self.added = []
        self.rolled_back = False

    def add(self, value) -> None:
        self.added.append(value)

    def commit(self) -> None:
        if self.fail_commit:
            raise RuntimeError("db failure")

    def rollback(self) -> None:
        self.rolled_back = True

    def get(self, model, key):
        return None


def upload(name: str, content: bytes, content_type: str = "application/octet-stream") -> UploadFile:
    return UploadFile(file=BytesIO(content), filename=name, headers={"content-type": content_type})


def run_upload(monkeypatch, tmp_path: Path, file: UploadFile, *, limit: int = 1024, fail_commit: bool = False):
    monkeypatch.setattr(main, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(main, "settings", SimpleNamespace(upload_max_bytes=limit, is_production=False))
    db = FakeDb(fail_commit=fail_commit)
    result = asyncio.run(main.upload_file(file, {"role": "owner"}, db))
    return result, db


def test_valid_png_is_saved_with_server_mime(monkeypatch, tmp_path) -> None:
    payload = b"\x89PNG\r\n\x1a\n" + b"valid-image-data"
    result, db = run_upload(monkeypatch, tmp_path, upload("photo.png", payload, "text/html"))

    saved = tmp_path / result["url"].rsplit("/", 1)[1]
    assert saved.read_bytes() == payload
    assert db.added[0].mime_type == "image/png"
    assert db.added[0].data == b""
    assert not list(tmp_path.glob("*.tmp"))


def test_oversize_upload_is_rejected_and_cleaned(monkeypatch, tmp_path) -> None:
    with pytest.raises(HTTPException) as exc:
        run_upload(monkeypatch, tmp_path, upload("large.png", b"\x89PNG\r\n\x1a\n12345"), limit=8)
    assert exc.value.status_code == 413
    assert not list(tmp_path.iterdir())


def test_spoofed_extension_is_rejected(monkeypatch, tmp_path) -> None:
    with pytest.raises(HTTPException) as exc:
        run_upload(monkeypatch, tmp_path, upload("fake.png", b"GIF89a-content"))
    assert exc.value.status_code == 400
    assert not list(tmp_path.iterdir())


def test_svg_is_rejected(monkeypatch, tmp_path) -> None:
    with pytest.raises(HTTPException) as exc:
        run_upload(monkeypatch, tmp_path, upload("image.svg", b"<svg></svg>", "image/svg+xml"))
    assert exc.value.status_code == 400
    assert not list(tmp_path.iterdir())


def test_db_failure_removes_final_and_temp_files(monkeypatch, tmp_path) -> None:
    with pytest.raises(RuntimeError, match="db failure"):
        run_upload(monkeypatch, tmp_path, upload("photo.jpg", b"\xff\xd8\xffdata"), fail_commit=True)
    assert not list(tmp_path.iterdir())


def test_upload_headers_are_safe() -> None:
    headers = main._upload_headers("safe.png")
    assert headers["X-Content-Type-Options"] == "nosniff"
    assert headers["Content-Disposition"] == 'inline; filename="safe.png"'
    assert "immutable" in headers["Cache-Control"]
