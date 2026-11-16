#!/usr/bin/env bash
# Build the LeetCode Lab .deb from the staged Linux tree.
# Run inside WSL:  bash desktop/packaging/build-deb.sh
# Output: desktop/target/leetlab-lab_<version>_amd64.deb (version read
# from desktop/packaging/deb/control so bumps flow through).
set -euo pipefail
cd "$(dirname "$0")/../.."
REPO="$PWD"
# Build on the native Linux fs: DrvFs reports 777 everywhere, which dpkg-deb
# rejects for the control directory.
STAGE="$REPO/desktop/target/pkg-linux/leetlab-lab"
PKG="$HOME/leetlab-deb-pkg"
OUT="$REPO/desktop/target/leetlab-lab_$(grep '^Version:' "$REPO/desktop/packaging/deb/control" | awk '{print $2}')_amd64.deb"

rm -rf "$PKG"
mkdir -p "$PKG/opt/leetlab-lab" "$PKG/usr/share/applications" "$PKG/DEBIAN"

cp -r "$STAGE/bin" "$PKG/opt/leetlab-lab/bin"
cp -r "$STAGE/share" "$PKG/opt/leetlab-lab/share"
chmod 755 "$PKG/opt/leetlab-lab/bin/leetlab-app"

sed 's|^Exec=.*|Exec=/opt/leetlab-lab/bin/leetlab-app /opt/leetlab-lab/share/leetlab|; s|^Icon=.*|Icon=/opt/leetlab-lab/share/leetlab/icon.png|' \
  "$REPO/desktop/packaging/leetlab-lab.desktop" > "$PKG/usr/share/applications/leetlab-lab.desktop"

cp "$REPO/desktop/packaging/deb/control" "$PKG/DEBIAN/control"

fakeroot dpkg-deb --build "$PKG" "$OUT" 2>/dev/null \
  || dpkg-deb --build "$PKG" "$OUT"
echo "built $(du -h "$OUT" | cut -f1)"
dpkg-deb --info "$OUT"
