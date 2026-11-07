# LeetCode Lab — standalone deploy (no Harness)

The app is a static frontend (`plugin/web/`, `plugin/data/`) plus a small Node API
(`plugin/host/` reused as-is) for judging, tracing, progress, and the optional AI tutor.

## Option A — this computer (double-click, recommended to start)

Prerequisites, once per machine: **Node.js LTS**, a **JDK** (`javac`), **g++** — all on `PATH`.
Check: `node -v && javac -version && g++ --version`.

1. Double-click `standalone/start.bat` (Windows) or run `sh standalone/start.sh`.
   It opens `http://localhost:8080/leetcode-lab/` and keeps the server in that window.
2. Done. Judge, trace, walkthroughs, variations infrastructure all work offline.

## Syncing progress between two computers (OneDrive)

The server stores progress in one file. Point it inside OneDrive **on both machines**:

```powershell
# Windows PowerShell (adjust the OneDrive path to yours)
$env:LCLAB_PROGRESS = "$env:OneDrive\LeetCodeLab\progress.json"
node standalone/server.mjs
```

For `start.bat`, add that `$env:` line (as `set LCLAB_PROGRESS=...`) near the top.
Merging is per-problem by timestamp, so practicing different problems on each machine
merges cleanly; the same problem edited on both keeps the newer one. No account, no cloud.
If you don't care about sync, skip this — each machine just keeps its own file.

## AI tutor: three honest settings

| Setting | How | Effect |
|---|---|---|
| No AI (default) | Leave `LLMAI_API_KEY` empty | Tutor buttons report "not configured"; everything else works |
| Your own key | `LLMAI_API_KEY=sk-...` (any OpenAI-compatible endpoint via `LLMAI_BASE_URL`, model via `LLMAI_MODEL`) | Explain / animate / review / variants-AI work, billed to your key |
| Harness (old) | Keep using the plugin | Uses the profile's providers; nothing to configure |

The standalone server never invents AI output: without a key the tutor says so.

## Option B — Docker (your own server)

```powershell
cd D:\Work\leedcode grind
docker build -t leetcode-lab -f standalone/Dockerfile .
docker run -d --name leetlab -p 8080:8080 `
  -e LLMAI_API_KEY=... `
  -v leetcode-lab-progress:/data `
  leetcode-lab
```

Open `http://<server>:8080/leetcode-lab/`. Progress persists in the named volume.
Toolchains (JDK 17, g++) are baked into the image.

## Option C — install like a desktop app (PWA)

With the server running (A or B), open the app in Edge/Chrome → menu →
*Save page as app* / *Install*. You get a desktop icon and a chromeless window.
Caveat: the judge still runs on the server, so "offline" means the server must be
reachable (localhost counts). No service worker is bundled on purpose — caching the
app shell offline while the judge needs a connection would be a lie.

## Troubleshooting

- `EADDRINUSE ... :8080` — an old server still holds the port. Find it with
  `Get-NetTCPConnection -LocalPort 8080` and `Stop-Process` that PID (an orphaned
  `node.exe` survives killed terminals), or just use `--port 8081`.
- `javac`/`g++` missing — the judge reports it per-run; the rest of the app works.
- Port forward `8080` on your router/VPN (Tailscale works well) for "browser anywhere".

## Keeping the plugin

The Harness plugin is untouched and still works. When the standalone is your daily
driver, remove the `@local/leetcode-lab` bundle from the Harness profile — or keep
both; they share nothing except the dataset files.
