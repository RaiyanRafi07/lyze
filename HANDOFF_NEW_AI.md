# Handoff — LeetCode Lab (standalone web app)

Copy everything below the line into the next AI. It assumes Northern NJ, no prior context.

---

You are taking over **LeetCode Lab**, a standalone LeetCode-practice web app. It lives at
`D:\Work\leedcode grind\` on Windows. Node 24, `javac`, and `g++` are installed on this
machine. Your owner runs it, watches your work, and decides scope — ask when a decision
changes architecture, otherwise proceed autonomously and verify everything you claim.

## 1. What it is

A LeetCode grind environment: 2,913 problems with statements/examples/constraints, a real
local judge (Java + C++ compiled per-run in temp dirs), a "trace my run" probe that steps
through the USER's own loop iterations, line-mapped code↔diagram walkthroughs (19 of 31
patterns), deterministic + AI practice variations, an AI tutor (BYOK or off), light/dark
editorial neo-brutalist themes, and spaced-repetition progress. No build step, no
framework, no dependencies — dependency-free ES modules + one Node server.

## 2. Layout (root = `D:\Work\leedcode grind\`)

```
standalone/        # runnable app: server.mjs, llm-direct.mjs, package.json,
                   # Dockerfile, .env.example, start.bat / start.sh
plugin/
  host/            # backend modules, reused directly by standalone/server.mjs:
                   # app.js (routes/static/progress), data.js, judge.js, trace.js, ai.js
  web/             # frontend: index.html, app.js, styles.css, manifest + icons,
                   # ui/*.js, engine/*.js (diagram, scenes, patterns, walkthrough,
                   # variants, trace, index.js = 3D cinema)
  data/            # dataset: index.json, shard-0..19.json, progress.json (DO NOT EDIT
                   # dataset files; progress.json is user state, safe to read)
raw/               # source dataset (do not edit)
tools/             # engine-check.mjs, judge_smoke.mjs, variants_check.mjs,
                   # validate_data.py, scene_probe.mjs, wt_probe.mjs, make_icons.py
docs/              # DESIGN.md, THEME.md (§8-10 current), REDESIGN.md, VIZ.md, DEPLOY.md
shots/             # verification screenshots (p0, flat, neo, r1, viz, color, final,
                   # standalone)
README.md CONTRACTS.md HANDOFF_PROMPT.md (history) HANDOFF_NEW_AI.md (this file)
```

`CONTRACTS.md` is the hard interface doc (scene schema, API, data contract). Read it before
changing engine/host code. `docs/DEPLOY.md` covers run/Docker/OneDrive/AI-key operation.

## 3. Run it

```powershell
cd 'D:\Work\leedcode grind\standalone'
node server.mjs --port 8080        # or double-click start.bat
# → http://localhost:8080/leetcode-lab/
```

Judge needs `javac`/`g++` on PATH. AI tutor is optional: `LLMAI_API_KEY` (+ optional
`LLMAI_BASE_URL`, `LLMAI_MODEL`) enables it; without a key the tutor degrades gracefully
and everything else works. Progress file: `LCLAB_PROGRESS` env overrides the default
`plugin/data/progress.json` (OneDrive sync documented in DEPLOY.md).

## 4. Verify (run all of these before claiming anything works)

```powershell
cd 'D:\Work\leedcode grind'
node tools/judge_smoke.mjs        # expect 23/23
node tools/variants_check.mjs     # expect ALL GREEN (409 + judge runs)
node tools/engine-check.mjs       # expect PASSED (22/22 fixtures)
python tools/validate_data.py     # expect contract OK
node tools/scene_probe.mjs two-sum
```

Visual checks (Edge headless, fresh JS context every time; `?theme=` and `?panel=` and
`?step=` URL params are session-only overrides for deterministic shots):

```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu `
  --hide-scrollbars --no-first-run --force-device-scale-factor=1 --user-data-dir="$env:TEMP\edge-x" `
  --window-size=1700,1000 --virtual-time-budget=9000 --screenshot="shots\check.png" `
  "http://127.0.0.1:8080/leetcode-lab/?theme=dark&panel=walkthrough#/p/two-sum?step=4"
```

Then READ the PNG as a designer. Screenshot both themes; 1700px and 1200px.

## 5. Non-negotiable working agreements

1. **Do not fabricate.** No invented problem statements, expected outputs, traces, or
   metrics. Anything the probe/AI can't do honestly must decline visibly (existing
   "trace unavailable" / "not configured" patterns — follow them).
2. **Do not break what works.** The four suites above stay green. The old Harness plugin
   install (if still present) points at the PREVIOUS location
   (`C:\Users\raiya\dsh\workspace\leetcode-lab`) — do not touch it without being asked.
3. **Layout traps (real, already hit):** `mount()` must keep `display:block` on its
   container; `.lc-shell{flex:1;min-height:0}` + `.lc-main{grid-template-rows:minmax(0,1fr)}`
   height chain is load-bearing; the button reset is `:where(button)` deliberately (a plain
   `.lc-app button` rule out-specifies `.lc-btn`); tab panels are absolutely positioned;
   ES modules are cache-busted with `?b=` — always stamp absolute engine URLs by hand.
   The transparent editor textarea MUST keep `.lc-app .lced-input` specificity or text
   renders doubled. Virtualized catalog rows: CSS height and `ROW_HEIGHT` in
   `web/ui/catalog.js` must stay in sync.
4. **Aesthetics are FROZEN** (`docs/THEME.md` §10): light/dark editorial neo-brutalism,
   fixed color roles (Lemon=active, Sky=state, Peony=walkthrough, Olive=success,
   Cherry=CTAs/Solve), type floor (nothing informative under 11px). Change paint only for
   demonstrable bugs (contrast < 4.5, unreadable text). Usability and learning first.
5. **Research before designing** anything new: write findings + candidates + measurement
   in `docs/` first (precedent: DESIGN.md, THEME.md, REDESIGN.md, VIZ.md).

## 6. Current state (verified 2026-11-06 from THIS folder)

- Walkthrough line-mapping: 19/31 patterns, Java/C++/Pseudo, step pills, restart, scrub,
  speed, bidirectional code↔diagram linking, input presets + shareable `?in=` hash,
  `?step=` deep links, ops sparkline, aria-live narration, pause-on-tab-switch.
- Solve: real judge + Trace-my-run probe (Java + C++) with honest fallback; result cards.
- Variations: deterministic drills + AI drills with machine-checkable tests.
- Themes: light/dark/system toggle, persisted, no-flash boot, `?theme=` override.
- Known limits: 12 patterns fall back to pattern-scene + AI; trace covers loop solutions
  on the first test (cap 60); premium problems unavailable (dormant overlay hook).
- Suggested next work (owner's words: usability + learning, not looks): extend
  line-mapping toward all 31; `vars`/`lookup` emitters for more families; spaced-repetition
  tuning; OneDrive multi-machine check. Pick with the owner before starting anything big.
