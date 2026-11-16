#!/bin/sh
# LeetCode Lab bundled GCC 11.4.0 (Ubuntu jammy) wrapper.
# Makes the driver relocatable: explicit include/lib search paths under this
# tree plus a loader path for the toolchain's own shared libraries.
# The judge invokes this file as toolchains/gcc/bin/g++.
set -u
D=$(dirname "$0")
P=$(cd "$D/.." && pwd)
T="$P/lib/x86_64-linux-gnu"
G="$P/lib/gcc/x86_64-linux-gnu/11"
export LD_LIBRARY_PATH="$T${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec "$D/g++-11" \
  "-B$G" \
  "-I$P/include" \
  "-I$P/include/x86_64-linux-gnu" \
  "-I$P/include/c++/11" \
  "-I$P/include/x86_64-linux-gnu/c++/11" \
  "-L$T" \
  "-L$G" \
  "$@"
