#!/usr/bin/env python3
"""Stage a self-contained LeetCode Lab desktop tree for one OS.

Inputs (dev checkout + vendor downloads + built binary):
  --os win|linux            target platform
  --app-bin PATH            release app binary for that OS
  --vendor DIR              desktop/target/vendor with temurin/minGW archives
  --out DIR                 staging root to assemble

Windows layout (portable dir):
  LeetCodeLab/leetlab-app.exe, plugin/data/..., docs/NEETCODE_150.json,
  toolchains/{jdk,gcc,manifest.json}, notices/*.txt

Linux layout (tarball tree):
  leetlab-lab/bin/leetlab-app, leetlab-lab/share/leetlab/{plugin,data,docs},
  leetlab-lab/share/leetlab/toolchains/{jdk,gcc,manifest.json}, notices.
  (C++ comes from the bundled relocatable GCC 11.4.0 tree; the .deb
  declares no compiler dependency.)

Writes toolchains/manifest.json with versions read from the staged binaries
and a QA file list with byte sizes. Verifies the app binary finds its
resource root marker afterwards.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_capture(cmd):
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        text = (out.stdout + out.stderr).strip().splitlines()
        return text[0].strip() if text else "unknown"
    except Exception as error:
        return "unavailable: %s" % error


def extract(archive, dest, renamed):
    """Extract an archive whose payload sits under one top-level directory,
    then rename that directory. Fails loudly on multi-root archives."""
    if archive.endswith(".zip"):
        with zipfile.ZipFile(archive) as zf:
            tops = {name.split("/")[0] for name in zf.namelist() if "/" in name}
            assert len(tops) == 1, "unexpected zip roots: %s" % sorted(tops)
            top = next(iter(tops))
            zf.extractall(dest)
    else:
        with tarfile.open(archive) as tf:
            tops = {name.split("/")[0] for name in tf.getnames() if "/" in name}
            assert len(tops) == 1, "unexpected tar roots: %s" % sorted(tops)
            top = next(iter(tops))
            tf.extractall(dest, filter="data")
    src = os.path.join(dest, top)
    dst = os.path.join(dest, renamed)
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    os.rename(src, dst)
    return dst


def copy_resources(root):
    data_src = os.path.join(REPO, "plugin", "data")
    data_dst = os.path.join(root, "plugin", "data")
    os.makedirs(data_dst, exist_ok=True)
    shutil.copy2(os.path.join(data_src, "index.json"), data_dst)
    for name in sorted(os.listdir(data_src)):
        if re.fullmatch(r"shard-[0-9]+\.json", name):
            shutil.copy2(os.path.join(data_src, name), data_dst)
    docs_dst = os.path.join(root, "docs")
    os.makedirs(docs_dst, exist_ok=True)
    shutil.copy2(
        os.path.join(REPO, "docs", "NEETCODE_150.json"),
        os.path.join(docs_dst, "NEETCODE_150.json"),
    )
    # Desktop overlay lessons (curated judges + full equivalents). The app
    # merges these over the shipped dataset at open; without them the 7
    # externally-sourced lessons fall back to bare links.
    lessons_src = os.path.join(REPO, "desktop", "lessons", "v1")
    lessons_dst = os.path.join(root, "desktop", "lessons", "v1")
    os.makedirs(os.path.dirname(lessons_dst), exist_ok=True)
    shutil.copytree(lessons_src, lessons_dst)


def jdk_version(java_bin):
    return run_capture([java_bin, "-version"])


def cxx_version(cxx_bin):
    return run_capture([cxx_bin, "--version"])


def write_manifest(toolchains_dir, jdk_home, cxx_bin, notices, cxx_release=None):
    manifest = {
        "version": 1,
        "jdk": {
            "home": "toolchains/jdk",
            "release": jdk_version(os.path.join(jdk_home, "bin", "java" if os.name != "nt" else "java.exe")),
            "vendor": "Eclipse Temurin 21 LTS",
        },
        "cxx": {
            "cxx": "toolchains/gcc/bin/g++",
            "release": cxx_release if cxx_release else (cxx_version(cxx_bin) if cxx_bin else "system g++ (deb dependency)"),
            "compile_args": ["-std=gnu++20", "-O2", "-static", "-o", "judge.exe", "main.cpp"],
            "java_compile_args": ["-encoding", "UTF-8", "Main.java"],
            "java_run_args": ["-cp", ".", "Main"],
        },
        "limits": {"compile_timeout_s": 25, "run_timeout_s": 8, "max_output": 200000},
        "resolution": {
            "order": ["bundled_absolute", "env_override", "path"],
            "env": {"jdk_home": "LCLAB_JDK_HOME", "cxx": "LCLAB_CXX"},
        },
        "notices": notices,
    }
    path = os.path.join(toolchains_dir, "manifest.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=1)
        fh.write("\n")
    return manifest


GPL_CE = """Eclipse Temurin 21 LTS is licensed under GPLv2 with Classpath Exception.
See https://adoptium.net/about/ and the license files shipped inside toolchains/jdk.
"""

MINGW_RUNTIME = """MinGW-w64 UCRT runtime libraries are covered by the MinGW-w64 runtime exception
(ZPL plus runtime exception): https://www.mingw-w64.org/licensing/.
Source: https://github.com/brechtsanders/winlibs_mingw (standalone build).
"""

LIBSTDCXX = """The Windows package bundles libstdc++ and winpthreads DLLs from the same
MinGW-w64 build (same exception as above). On Linux the C++ standard library
ships with the bundled GCC 11.4.0 tree (same Ubuntu jammy sources; details in
notices/gcc-toolchain.txt). No system g++ is required.
"""


def write_notices(notices_dir, with_mingw):
    os.makedirs(notices_dir, exist_ok=True)
    files = {"temurin.txt": GPL_CE}
    if with_mingw:
        files["mingw-runtime.txt"] = MINGW_RUNTIME
    else:
        files["gcc-libstdcxx.txt"] = LIBSTDCXX
    for name, text in files.items():
        with open(os.path.join(notices_dir, name), "w", encoding="utf-8") as fh:
            fh.write(text)
    return sorted("notices/" + name for name in files)


def file_list(root):
    rows = []
    for base, _dirs, files in os.walk(root):
        for name in files:
            full = os.path.join(base, name)
            rows.append((os.path.relpath(full, root).replace(os.sep, "/"), os.path.getsize(full)))
    rows.sort()
    return rows


def stage_windows(app_bin, vendor, out):
    root = os.path.join(out, "LeetCodeLab")
    if os.path.isdir(root):
        shutil.rmtree(root)
    os.makedirs(root, exist_ok=True)
    shutil.copy2(app_bin, os.path.join(root, "leetlab-app.exe"))
    copy_resources(root)
    toolchains = os.path.join(root, "toolchains")
    os.makedirs(toolchains, exist_ok=True)
    jdk = extract(os.path.join(vendor, "temurin21-windows.zip"), toolchains, "jdk")
    gcc = extract(os.path.join(vendor, "mingw64-ucrt.zip"), toolchains, "gcc")
    notices = write_notices(os.path.join(root, "notices"), with_mingw=True)
    cxx = os.path.join(gcc, "bin", "g++.exe")
    manifest = write_manifest(toolchains, jdk, cxx, notices)
    marker = os.path.join(root, "plugin", "data", "index.json")
    assert os.path.isfile(marker), "resource marker missing: %s" % marker
    assert os.path.isfile(os.path.join(jdk, "bin", "javac.exe")), "bundled javac missing"
    assert os.path.isfile(cxx), "bundled g++ missing"
    print("jdk:", manifest["jdk"]["release"][:80])
    print("cxx:", manifest["cxx"]["release"][:80])
    return root


def write_gcc_toolchain_notice(notices_dir, vendor):
    """Detailed Ubuntu package manifest for the bundled Linux GCC."""
    closure_path = os.path.join(vendor, "linux-gcc", "closure.json")
    with open(closure_path, encoding="utf-8") as fh:
        closure = json.load(fh)
    lines = ["Bundled GCC 11.4.0 C++ toolchain for Linux x64 (Ubuntu 22.04 jammy).", ""]
    lines.append("Toolchain packages (Ubuntu archive, versions as staged):")
    for name in sorted(closure["packages"]):
        lines.append("  %s %s" % (name, closure["packages"][name]["version"]))
    lines += [
        "",
        "Licensing pointers:",
        "  GCC, libstdc++, libgcc: GPLv3 with GCC Runtime Library Exception.",
        "    https://gcc.gnu.org/onlinedocs/libstdc++/manual/license.html",
        "  glibc (libc6, libc6-dev): LGPL-2.1-or-later.",
        "    https://www.gnu.org/licenses/lgpl-2.1.html",
        "  binutils (as, ld): GPL-3.0-or-later.",
        "    https://www.gnu.org/licenses/gpl-3.0.html",
        "  Full license texts ship in the corresponding Ubuntu packages;",
        "  see https://packages.ubuntu.com/jammy/ for per-package copyright files.",
        "",
    ]
    path = os.path.join(notices_dir, "gcc-toolchain.txt")
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write("\n".join(lines))
    return "notices/gcc-toolchain.txt"


def stage_linux(app_bin, vendor, out):
    root = os.path.join(out, "leetlab-lab")
    if os.path.isdir(root):
        shutil.rmtree(root)
    share = os.path.join(root, "share", "leetlab")
    os.makedirs(os.path.join(root, "bin"), exist_ok=True)
    shutil.copy2(app_bin, os.path.join(root, "bin", "leetlab-app"))
    os.chmod(os.path.join(root, "bin", "leetlab-app"), 0o755)
    copy_resources(share)
    shutil.copy2(os.path.join(REPO, "desktop", "packaging", "lyze.png"), os.path.join(share, "icon.png"))
    toolchains = os.path.join(share, "toolchains")
    os.makedirs(toolchains, exist_ok=True)
    jdk = extract(os.path.join(vendor, "temurin21-linux.tar.gz"), toolchains, "jdk")
    # Bundled relocatable GCC (assembled by wave6/assemble-gcc.py from the
    # Ubuntu jammy closure in vendor/linux-gcc; see QA-REPORT toolchain
    # provenance). The wrapper at bin/g++ resolves everything relative to
    # the install root; no code changes were needed (bundled-first lookup).
    gcc_bundle = os.path.join(REPO, "desktop", "target", "gcc-bundle")
    gcc = os.path.join(toolchains, "gcc")
    if os.path.isdir(gcc):
        shutil.rmtree(gcc)
    shutil.copytree(gcc_bundle, gcc, symlinks=True)
    shutil.copy2(
        os.path.join(REPO, "desktop", "packaging", "gcc-wrapper.sh"),
        os.path.join(gcc, "bin", "g++"),
    )
    notices = write_notices(os.path.join(share, "notices"), with_mingw=False)
    notices.append(write_gcc_toolchain_notice(os.path.join(share, "notices"), vendor))
    manifest = write_manifest(toolchains, jdk, os.path.join(gcc, "bin", "g++"), notices,
                              cxx_release="g++ (Ubuntu 11.4.0, bundled relocatable)")
    marker = os.path.join(share, "plugin", "data", "index.json")
    assert os.path.isfile(marker), "resource marker missing: %s" % marker
    assert os.path.isfile(os.path.join(gcc, "bin", "g++-11")), "bundled g++ driver missing"
    print("jdk:", manifest["jdk"]["release"][:80])
    print("cxx:", manifest["cxx"]["release"][:80])
    return root


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--resources-only":
        parser = argparse.ArgumentParser()
        parser.add_argument("--resources-only", required=True, metavar="DIR")
        args = parser.parse_args()
        copy_resources(args.resources_only)
        return
    parser = argparse.ArgumentParser()
    parser.add_argument("--os", required=True, choices=["win", "linux"])
    parser.add_argument("--app-bin", required=True)
    parser.add_argument("--vendor", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    if args.os == "win":
        root = stage_windows(args.app_bin, args.vendor, args.out)
    else:
        root = stage_linux(args.app_bin, args.vendor, args.out)
    rows = file_list(root)
    total = sum(size for _, size in rows)
    with open(os.path.join(args.out, "qa-file-list.txt"), "w", encoding="utf-8") as fh:
        for rel, size in rows:
            fh.write("%12d  %s\n" % (size, rel))
    print("staged %d files, %.1f MB under %s" % (len(rows), total / 1048576, root))


if __name__ == "__main__":
    main()
