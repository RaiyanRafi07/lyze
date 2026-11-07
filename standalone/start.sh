#!/bin/sh
# LeetCode Lab — launcher (macOS/Linux).
# Requires once per machine: Node.js LTS, a JDK (javac), and g++ on PATH.
# Optional env: PORT=8080 LLMAI_API_KEY=... LCLAB_PROGRESS=~/OneDrive/leetcode-lab-progress.json
PORT="${PORT:-8080}"
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null 2>&1 || { echo "[lab] Node.js not found on PATH."; exit 1; }
(open "http://localhost:${PORT}/leetcode-lab/" 2>/dev/null || xdg-open "http://localhost:${PORT}/leetcode-lab/" 2>/dev/null || true) &
node server.mjs --port "$PORT"
