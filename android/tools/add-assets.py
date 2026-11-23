#!/usr/bin/env python3
"""Append web assets to an APK in exactly the shape aapt2 produces.

Why this exists
---------------
`AssetManager.open("www/index.html")` needs two things inside the APK:

  1. the entry to be named literally ``assets/www/index.html`` — a plain
     ``zip -r <apk> www`` from a folder called ``www`` instead creates
     ``www/index.html`` at the archive root, and every asset lookup 404s;
  2. the archive to be sorted and to contain explicit directory entries,
     stored (uncompressed) and 4-byte aligned, the way aapt2/zipalign write
     resources — Android's asset lookup walks the central directory in order.

Usage: add-assets.py <apk> <webroot>      (<webroot> contains one ``www/`` dir)
"""
from __future__ import annotations

import os
import struct
import sys
import time
import zipfile

ALIGN = 4


def dos(date_time) -> tuple[int, int]:
    parts = list(date_time) + [0] * 6
    y, mo, d, h, mi, s = parts[:6]
    y = max(1980, y)
    return ((h << 11) | (mi << 5) | (s // 2)), (((y - 1980) << 9) | (mo << 5) | d)


def pad_for(offset: int, name_len: int) -> bytes:
    """EXTRA field so file data starts on an ALIGN boundary (zipalign style).

    An extra field is at least 4 bytes (2 id + 2 length), so the total length
    is rounded up to the next multiple of ALIGN that still fits the header.
    """
    start = offset + 30 + name_len
    total = (ALIGN - start % ALIGN) % ALIGN
    if total < 4:
        total += ALIGN
    payload = total - 4
    return struct.pack("<HH", 0xD935, payload) + b"\x00" * payload


class Writer:
    def __init__(self, fp):
        self.fp = fp
        self.central: list[bytes] = []

    def add(self, name: str, data: bytes, method: int, date_time) -> None:
        bname = name.encode("utf-8")
        offset = self.fp.tell()
        extra = pad_for(offset, len(bname))
        crc = 0 if not data else zipfile.crc32(data) & 0xFFFFFFFF
        comp = data
        if method == zipfile.ZIP_DEFLATED and data:
            import zlib
            co = zlib.compressobj(9, zlib.DEFLATED, -15)
            comp = co.compress(data) + co.flush()
        dos_t, dos_d = dos(date_time)
        self.fp.write(
            struct.pack("<IHHHHHIIIHH", 0x04034B50, 20, 0, method, dos_t, dos_d,
                        crc, len(comp), len(data), len(bname), len(extra))
            + bname + extra
        )
        self.fp.write(comp)
        is_dir = name.endswith("/")
        ext = (0o40755 << 16) | 0x10 if is_dir else (0o644 << 16)
        self.central.append(
            struct.pack("<IHHHHHHIIIHHHHHII", 0x02014B50, 0x031E, 20, 0, method, dos_t, dos_d,
                        crc, len(comp), len(data), len(bname), len(extra), 0, 0, 0, ext, offset)
            + bname + extra
        )

    def close(self) -> None:
        cd_start = self.fp.tell()
        for rec in self.central:
            self.fp.write(rec)
        cd_size = self.fp.tell() - cd_start
        self.fp.write(struct.pack("<IHHHHIIH", 0x06054B50, 0, 0,
                                  len(self.central), len(self.central), cd_size, cd_start, 0))


def walk_assets(webroot: str):
    """Yields (apk_name, absolute_path_or_None_for_dir) sorted like aapt2 does."""
    items: list[tuple[str, str | None]] = [("assets/", None)]
    for dirpath, dirnames, filenames in os.walk(webroot):
        dirnames.sort()
        rel_dir = os.path.relpath(dirpath, webroot).replace(os.sep, "/")
        if rel_dir != ".":
            items.append(("assets/" + rel_dir + "/", None))
        for name in sorted(filenames):
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, webroot).replace(os.sep, "/")
            items.append(("assets/" + rel, full))
    items.sort(key=lambda e: e[0])
    return items


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    deflate = "--deflate" in sys.argv
    if len(args) != 2:
        print("usage: add-assets.py [--deflate] <apk> <webroot>", file=sys.stderr)
        return 2
    apk, webroot = args
    items = walk_assets(webroot)
    if not any(n == "assets/www/index.html" for n, p in items if p):
        print("add-assets: webroot is missing www/index.html", file=sys.stderr)
        return 1

    keep: list[tuple[str, bytes, int, tuple]] = []
    with zipfile.ZipFile(apk) as src:
        for info in src.infolist():
            if info.filename.startswith("assets/"):
                continue                      # rebuild assets from scratch
            if info.filename.endswith("/"):
                continue                      # aapt2 writes no directory entries
            keep.append((info.filename, src.read(info.filename),
                         info.compress_type, info.date_time))

    tmp = apk + ".tmp"
    with open(tmp, "wb") as fp:
        w = Writer(fp)
        for name, data, method, dt in keep:
            # classes.dex belongs to the dex step; keep its method (stored)
            w.add(name, data, method, dt)
        for name, path in items:
            data = b"" if path is None else open(path, "rb").read()
            # The shell reads assets through AssetManager.open(), which
            # transparently inflates; only mmap/openFd users need STORED.
            # Compressing keeps the download at ~57 MB instead of ~140 MB.
            method = zipfile.ZIP_STORED
            if deflate and len(data) > 512:
                method = zipfile.ZIP_DEFLATED
            w.add(name, data, method, time.localtime()[:6])
        w.close()
    os.replace(tmp, apk)
    print(f"    + {sum(1 for _, p in items if p)} web files under assets/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
