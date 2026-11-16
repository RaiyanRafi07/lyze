#!/usr/bin/env bash
# Stage the Linux self-contained tree inside WSL (symlinks in the Temurin
# tarball do not survive Windows extraction). Run from the repo root on
# Windows:  wsl -d Ubuntu -- bash -lc 'bash desktop/packaging/stage-linux.sh'
set -euo pipefail
cd "$(dirname "$0")/../.."
REPO="$PWD"
OUT="$REPO/desktop/target/pkg-linux/leetlab-lab"
VENDOR="$REPO/desktop/target/vendor"

rm -rf "$OUT"
mkdir -p "$OUT/bin" "$OUT/share/leetlab"

BIN="$HOME/leetlab-target/release/leetlab-app"
if [ ! -x "$BIN" ]; then BIN="$REPO/desktop/target/leetlab-app-linux"; fi
cp "$BIN" "$OUT/bin/leetlab-app"
chmod 755 "$OUT/bin/leetlab-app"

SHARE="$OUT/share/leetlab"
python3 "$REPO/desktop/packaging/stage.py" --resources-only "$SHARE"
cp "$REPO/desktop/packaging/lyze.png" "$SHARE/icon.png"

TC="$SHARE/toolchains"
mkdir -p "$TC"
rm -rf "$TC/jdk"
tar xzf "$VENDOR/temurin21-linux.tar.gz" -C "$TC"
mv "$TC"/jdk-21* "$TC/jdk"

"$TC/jdk/bin/java" -version 2>&1 | head -1
test -x "$TC/jdk/bin/javac"

# Bundled relocatable GCC 11.4.0 (assembled from the Ubuntu jammy closure;
# see desktop/packaging/stage.py stage_linux and QA-REPORT toolchain notes).
# The wrapper resolves everything relative to the install root.
rm -rf "$TC/gcc"
cp -r "$REPO/desktop/target/gcc-bundle" "$TC/gcc"
cp "$REPO/desktop/packaging/gcc-wrapper.sh" "$TC/gcc/bin/g++"
chmod 755 "$TC/gcc/bin/"* "$TC/bin" 2>/dev/null || true

mkdir -p "$SHARE/notices"
cat > "$SHARE/notices/temurin.txt" <<'EOF'
Eclipse Temurin 21 LTS is licensed under GPLv2 with Classpath Exception.
See https://adoptium.net/about/ and the license files shipped inside toolchains/jdk.
EOF
cat > "$SHARE/notices/gcc-libstdcxx.txt" <<'EOF'
On Linux the C++ standard library ships with the bundled GCC 11.4.0
toolchain under toolchains/gcc (same Ubuntu jammy sources as the compiler;
see gcc-toolchain.txt). No system g++ is required or used unless the user
sets LCLAB_CXX explicitly.
EOF
python3 - "$SHARE" "$VENDOR" <<'EOF'
import json, sys
share, vendor = sys.argv[1], sys.argv[2]
closure = json.load(open(vendor + "/linux-gcc/closure.json", encoding="utf-8"))
lines = ["Bundled GCC 11.4.0 C++ toolchain for Linux x64 (Ubuntu 22.04 jammy).", "",
         "Toolchain packages (Ubuntu archive, versions as staged):"]
lines += ["  %s %s" % (n, closure["packages"][n]["version"]) for n in sorted(closure["packages"])]
lines += ["", "Licensing pointers:",
          "  GCC, libstdc++, libgcc: GPLv3 with GCC Runtime Library Exception.",
          "    https://gcc.gnu.org/onlinedocs/libstdc++/manual/license.html",
          "  glibc (libc6, libc6-dev): LGPL-2.1-or-later.",
          "    https://www.gnu.org/licenses/lgpl-2.1.html",
          "  binutils (as, ld): GPL-3.0-or-later.",
          "    https://www.gnu.org/licenses/gpl-3.0.html",
          "  Full license texts ship in the corresponding Ubuntu packages;",
          "  see https://packages.ubuntu.com/jammy/ for per-package copyright files.", ""]
open(share + "/notices/gcc-toolchain.txt", "w", encoding="utf-8").write("\n".join(lines))
EOF

JDK_LINE=$("$TC/jdk/bin/java" -version 2>&1 | head -1)
JDK_JSON=$(printf '%s' "$JDK_LINE" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))")
cat > "$TC/manifest.json" <<EOF
{
 "version": 1,
 "jdk": {
  "home": "toolchains/jdk",
  "release": $JDK_JSON,
  "vendor": "Eclipse Temurin 21 LTS"
 },
 "cxx": {
  "cxx": "toolchains/gcc/bin/g++",
  "release": "g++ (Ubuntu 11.4.0, bundled relocatable)",
  "compile_args": ["-std=gnu++20", "-O2", "-static", "-o", "judge.exe", "main.cpp"],
  "java_compile_args": ["-encoding", "UTF-8", "Main.java"],
  "java_run_args": ["-cp", ".", "Main"]
 },
 "limits": {"compile_timeout_s": 25, "run_timeout_s": 8, "max_output": 200000},
 "resolution": {
  "order": ["bundled_absolute", "env_override", "path"],
  "env": {"jdk_home": "LCLAB_JDK_HOME", "cxx": "LCLAB_CXX"}
 },
 "notices": ["notices/temurin.txt", "notices/gcc-libstdcxx.txt", "notices/gcc-toolchain.txt"]
}
EOF
python3 -c "import json; json.load(open('$TC/manifest.json')); print('manifest valid')"

test -f "$SHARE/plugin/data/index.json"
echo "STAGED_LINUX $(du -sh "$OUT" | cut -f1) $(find "$OUT" | wc -l) files"
