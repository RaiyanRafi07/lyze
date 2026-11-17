#!/usr/bin/env python3
"""Fetch the pinned Windows toolchain archives into desktop/target/vendor.

GitHub refuses single files over 100 MB, so the JDK (~205 MB) and
MinGW-w64 (~276 MB) live here as downloads, not in git. Everything else
the app needs already ships in the repo. Re-run any time; valid files
are skipped unless --force is given.

  python desktop/packaging/fetch-vendor.py [--force]

Expected layout afterwards (all under desktop/target/, all git-ignored):
  vendor/temurin21-windows.zip   Eclipse Temurin 21 LTS (Adoptium, latest 21 GA)
  vendor/mingw64-ucrt.zip        winlibs x86_64 posix-seh GCC 16.2.0 UCRT r3
"""
import hashlib
import os
import sys
import urllib.request
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VENDOR = os.path.join(REPO, "desktop", "target", "vendor")

TEMURIN_URL = (
    "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse"
)
WINLIBS_URL = (
    "https://github.com/brechtsanders/winlibs_mingw/releases/download/"
    "16.2.0posix-23.1.3-14.0.0-ucrt-r3/"
    "winlibs-x86_64-posix-seh-gcc-16.2.0-mingw-w64ucrt-14.0.0-r3.zip"
)
# Pinned: must match the staged build's toolchains/manifest.json (GCC 16.2.0, r3).
WINLIBS_SHA256 = "3c69305081e4a647144339a936244fcf7d3d9e558319e1ad7be2cd2886d4b6a1"
WINLIBS_SIZE = 276414382
CHUNK = 4 * 1024 * 1024


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(CHUNK), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + ".part"
    req = urllib.request.Request(url, headers={"User-Agent": "lyze-fetch-vendor/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp, open(tmp, "wb") as f:
        total = int(resp.headers.get("Content-Length") or 0)
        got, last_tick = 0, 0
        while True:
            chunk = resp.read(CHUNK)
            if not chunk:
                break
            f.write(chunk)
            got += len(chunk)
            if total and got - last_tick >= 25 * 1024 * 1024:
                print("  ... %d / %d MB" % (got // 1024 // 1024, total // 1024 // 1024))
                last_tick = got
    os.replace(tmp, dest)
    return dest


def want_temurin(dest, force):
    if not force and os.path.isfile(dest) and os.path.getsize(dest) > 100 * 1024 * 1024:
        if zipfile.is_zipfile(dest):
            print("ok (cached): %s" % os.path.basename(dest))
            return
        print("cached file is not a valid zip, re-downloading")
    print("fetch temurin21-windows.zip (~205 MB) ...")
    download(TEMURIN_URL, dest)
    if not zipfile.is_zipfile(dest):
        raise SystemExit("downloaded temurin archive is not a valid zip")
    print("ok: %s (%d bytes)" % (os.path.basename(dest), os.path.getsize(dest)))


def want_winlibs(dest, force):
    if not force and os.path.isfile(dest) and os.path.getsize(dest) == WINLIBS_SIZE:
        if sha256_of(dest) == WINLIBS_SHA256:
            print("ok (cached): %s" % os.path.basename(dest))
            return
        print("cached file failed checksum, re-downloading")
    print("fetch mingw64-ucrt.zip (~276 MB) ...")
    download(WINLIBS_URL, dest)
    actual_size = os.path.getsize(dest)
    actual_sha = sha256_of(dest)
    if actual_size != WINLIBS_SIZE or actual_sha != WINLIBS_SHA256:
        raise SystemExit(
            "winlibs checksum mismatch: size=%d sha=%s (delete %s and retry)"
            % (actual_size, actual_sha, dest)
        )
    print("ok: %s (checksum matches)" % os.path.basename(dest))


def main():
    force = "--force" in sys.argv[1:]
    os.makedirs(VENDOR, exist_ok=True)
    want_temurin(os.path.join(VENDOR, "temurin21-windows.zip"), force)
    want_winlibs(os.path.join(VENDOR, "mingw64-ucrt.zip"), force)
    print("vendor ready: %s" % VENDOR)


if __name__ == "__main__":
    main()
