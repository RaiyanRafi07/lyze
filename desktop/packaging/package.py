#!/usr/bin/env python3
"""Assemble distributables from a staged tree (see stage.py).

  package.py --os win   --stage desktop/target/pkg-win
      -> desktop/target/LeetCodeLab-win-x64.zip
  package.py --os linux --stage desktop/target/pkg-linux
      -> desktop/target/leetlab-lab-linux-x64.tar.gz (built in WSL so the
         binary keeps its executable bit)
"""
import argparse
import os
import shutil
import subprocess
import sys
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def package_win(stage):
    src = os.path.join(stage, "LeetCodeLab")
    out = os.path.join(REPO, "desktop", "target", "LeetCodeLab-win-x64.zip")
    if os.path.isfile(out):
        os.remove(out)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for base, _dirs, files in sorted(os.walk(src)):
            for name in sorted(files):
                full = os.path.join(base, name)
                zf.write(full, os.path.join("LeetCodeLab", os.path.relpath(full, src)))
    print("wrote %s (%.1f MB)" % (out, os.path.getsize(out) / 1048576))


def package_linux(stage):
    src = os.path.join(stage, "leetlab-lab")
    out = "/tmp/leetlab-lab-linux-x64.tar.gz"
    subprocess.run(
        ["wsl", "-d", "Ubuntu", "--", "bash", "-lc",
         "cd '%s' && chmod 755 leetlab-lab/bin/leetlab-app && tar czf %s leetlab-lab" % (stage.replace("\\", "/").replace("D:", "/mnt/d"), out)],
        check=True,
    )
    dest = os.path.join(REPO, "desktop", "target", "leetlab-lab-linux-x64.tar.gz")
    # copy back out of WSL tmp
    subprocess.run(
        ["wsl", "-d", "Ubuntu", "--", "bash", "-lc",
         "cp %s '/mnt/d/%s'" % (out, os.path.relpath(dest, "D:/").replace("\\", "/"))],
        check=True,
    )
    print("wrote %s" % dest)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--os", required=True, choices=["win", "linux"])
    parser.add_argument("--stage", required=True)
    args = parser.parse_args()
    if args.os == "win":
        package_win(args.stage)
    else:
        package_linux(args.stage)


if __name__ == "__main__":
    main()
