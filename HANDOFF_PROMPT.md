# Handoff prompt — LeetCode Lab (copy everything below into the next agent)

---

You are taking over **LeetCode Lab**, a learning app for LeetCode-style problems, installed and
running on this Windows machine inside a DeepSeek Harness profile. Your job is to make it a
genuinely effective *learning* tool — not a prettier animation.

## 0. How to behave (non-negotiable)

1. **Research before designing.** Do not start coding from this prompt alone. Your first
   deliverable is `D:\Work\leedcode grind\docs\DESIGN.md`, and it must contain:
   - a **benchmark table** of at least 6 sources: what each does, what is worth stealing, what is not;
   - **three candidate designs** for the thing you are about to build (rough sketches in text/ASCII),
   - the one you chose, **why**, and what you are explicitly *not* doing;
   - how you will measure whether it worked (concrete checks, not vibes).
   Required reading (fetch them, skim the interactive parts, cite URLs):
   - Bret Victor, *Learnable Programming* — https://worrydream.com/LearnableProgramming/ (read the "show the data" and "explain in context" sections; this is the core thesis for this app)
   - Bret Victor, *Explorable Explanations* — https://worrydream.com/ExplorableExplanations/
   - Brushing and linking — https://en.wikipedia.org/wiki/Brushing_and_linking (Becker & Cleveland 1987)
   - Visualgo — https://visualgo.net/en (the current gold standard; note its linked "pseudo-code ↔ visual ↔ step list" panes)
   - David Galles' visualizations — https://www.cs.usfca.edu/~galles/visualization/Algorithms.html (step controls, state readouts, no decoration)
   - Amit Patel / Red Blob Games — https://www.redblobgames.com/pathfinding/a-star/introduction.html (interactive diagrams that build intuition incrementally)
   - Distill — https://distill.pub (interactive figures that stay legible; e.g. *Why Momentum Really Works*)
   - Nicky Case — https://ncase.me (playable explanations), and `explorabl.es`
   - If research needs current info, use web search + fetch; cite every claim you act on.
2. **The user's stated preferences** (they complained about exactly these):
   - "3D for the sake of 3D" is a failure. Geometry that doesn't encode state is noise.
   - They want to see **how each line of code affects the visual**, simultaneously.
   - They want **per-problem variations** to practise independently.
   - They dislike dead space, tiny unreadable elements, and any UI that doesn't explain itself.
3. **Do not fabricate.** No invented LeetCode statements, no invented expected test outputs, no
   "premium" problems scraped from nowhere, no fake metrics. If a thing can't be done honestly,
   say so and ship the honest fallback.
4. **Do not break what works.** The judge, dataset and variations suites below must stay green.
   The app is installed and the user is watching; leave it in a working state, on the LeetCode Lab page.

## 1. What exists (as of handoff)

Path: `D:\Work\leedcode grind\`

```
plugin/                 # installed bundle @local/leetcode-lab (link install, live)
  index.js              # host entry: claims /leetcode-lab, hot-reloads host/app.js
  client.js             # sidebar icon + full-screen page; mounts the web app
  host/app.js           # static server + API + shared progress store
  host/data.js          # index/shard access (mtime cache)
  host/judge.js         # javac/g++ harness generation, output comparison
  host/ai.js            # llm bridge: explain | scene | variants | review
  web/app.js            # entry: mount(el), injects styles.css
  web/styles.css        # design system, EVERY selector scoped under .lc-app
  web/ui/*.js           # shell, catalog, problem, walkthrough, variations, editor, ai, stores
  web/engine/diagram.js # 2D SVG interactive diagram renderer  ← current visual layer
  web/engine/walkthrough.js # line-mapped canonical solutions (8 patterns) → frames + code lines
  web/engine/patterns.js    # deterministic frame generators (16 patterns) for pattern-only problems
  web/engine/scenes.js      # scene schema/builders, layouts
  web/engine/variants.js    # deterministic per-problem drills (123 problems)
  web/engine/index.js       # OLD 3D renderer — unused by the UI, kept for reference
  data/index.json + shard-0..19.json + progress.json
raw/merged_problems.json  # source dataset (2,913 problems), do not edit
tools/                    # build_data.py, validate_data.py, judge_smoke.mjs, variants_check.mjs,
                          # scene_probe.mjs, variants_check.mjs, wt_probe.mjs
```

Open it: click **LeetCode Lab** in the Harness left sidebar, or open
<http://127.0.0.1:64289/leetcode-lab/> (same build; progress is host-backed and shared).

Current state, honestly (updated 2026-11-05 — P0 + P1 + P2 shipped, all suites green):
- 2,913 problems; 2,597 auto-judged; 31 patterns; Java + C++ judged locally (javac 20, g++ 14.2).
- **Walkthrough tab**: reference code (Java/C++/Pseudo) with the executing line highlighted ⇄ a
  2D SVG diagram with **per-family invariant overlays**: dp-2d dependency arrows + answer badge,
  dp-1d prev-pointers, graph BFS queue sidebar + distance labels, DFS stack sidebar, backtracking
  recursion-stack sidebar, sliding-window char-count table, monotonic-stack strip + resolved pops,
  intervals 1-D merge timeline, heap array+tree overlay, union-find parent-pointer edges.
  Step card (aria-live) + state chips + ops sparkline + legend + `←`/`→`/`space`. Input chip +
  presets (Sorted / All equal / Single / Duplicates / Random) re-run the algorithm on user data;
  the input is encoded in the URL hash (`#/p/<slug>?in=…`) so a walkthrough is shareable.
  Bidirectional linking: hovering a code line highlights everything that step touches; hovering
  the diagram flashes the executing line. Line-mapped for **19 patterns** (was 8): + dp-1d, dp-2d,
  graph-bfs, graph-dfs, intervals, heap-topk, union-find, tree-bfs, backtracking, trie,
  topological-sort, and a real monotonic-stack builder. Optional **3D cinema toggle** (same scene
  through `engine/index.js`, explicit opt-in, 2D stays default).
- **Solve tab**: statement drawer (now with per-problem **notes**, synced via progress) + editor +
  real judge with per-test results + **Trace my run** (`POST /api/trace`): the user's own loops
  report array/pointers/map per iteration (Java + C++ source-probe injection, capped, never faked;
  honest "unavailable" fallback). A wrong solution steps through its own execution with a
  "your run" banner and a back-to-reference button. Header has a **Share** (copy-link) button.
- **Variations tab**: 3 drills per problem — deterministic for 123 problems, AI-generated
  (with machine-checkable tests) for the rest via `/api/ai kind=variants`.
- **Tutor drawer**: explain / animate (AI emits a scene JSON that the diagram plays) / review /
  3 similar problems. Provider `opencode-go`, model auto-picked by score; switchable in the panel.
- New files: `plugin/host/trace.js`, `plugin/web/engine/trace.js`, `docs/DESIGN.md`,
  `shots/p0/*.png` (12 family screenshots). `tools/engine-check.mjs` gained a backtracking fixture.
- **Theme**: editorial neo-brutalism, light + dark (`docs/THEME.md` §8). Thunder-navy dark
  default, cream light theme, Cherry primary buttons, Fraunces/Inter/JetBrains Mono (Google
  Fonts with offline fallbacks), header toggle Light/Dark/Auto persisted in settings with OS
  following and a no-flash boot script, session-only `?theme=` override. Code slabs stay dark
  in light mode; the diagram is re-themed by pure CSS (no renderer changes). Sharp 0–4px radii.
- **Structural redesign** (`docs/REDESIGN.md`): mode rail tabs with per-mode colors
  (Walkthrough/Solve/Variations unmistakable, 3px mode rule on the workspace), larger type
  scale throughout (14.5px body, 13.5px code/editor), denser visualizer (56px cells, tight
  viewBox, r24 nodes), status-headed result cards, 62px catalog rows, difficulty color-block
  home cards. Screenshots in `shots/r1/`, both themes, 1700 + 1200px.
- **Visualization system** (`docs/VIZ.md`): recomposed stage (step band → canvas → state
  strip → controls), reusable primitives (`vars` cards, `lookup` badge+stem, honest empty
  captions, gliding chips), restart control, pause-on-tab-switch, `?step=N` deep links.
  Two Sum is the first polished instance. Screenshots in `shots/viz/`, both themes.
- **Color-as-structure** (`docs/THEME.md` §9): full identity palette in both themes with
  fixed roles (Lemon = active/step explanations, Sky = state/data, Peony = walkthrough
  surfaces, Olive = success, Cherry = CTAs/Solve). Lemon step band, Sky state strip,
  Peony timeline, filled mode tabs + selected nav, Cherry home CTA, Lemon kicker, pastel
  pattern tiles, Lemon statement examples, Cherry trap cards. Diagram recolored to match
  (Lemon current, Olive match, Sky pointers/seen). Screenshots in `shots/color/`.
- **Final polish** (`docs/THEME.md` §10): type floor (nothing informative under 11px),
  tinted dark home cards + hero panel, washed-text token sweep incl. an editor double-text
  bug fix, session-only `?panel=` links. `shots/final/` covers all four views × both
  themes at identical viewports. Aesthetic work is now frozen absent demonstrable problems.
- **Standalone app** (`docs/DEPLOY.md`, `standalone/`): runs without the Harness —
  `server.mjs` reuses `plugin/host/` directly (zero behavior drift), OpenAI-compatible
  AI adapter (`LLMAI_*` env, graceful no-key mode), `Dockerfile` (JDK 17 + g++),
  double-click `start.bat`, OneDrive progress sync via `LCLAB_PROGRESS`, PWA manifest +
  generated icons. Verified: judge 3/3, trace 2 events, clean AI degrade, screenshots
  from `:8080`. The plugin is untouched and still installed.
- Known limits: line-mapping covers 19/31 patterns (rest: pattern scene + AI fallback, stated in UI);
  the trace probe covers loop-based solutions on the first test only and declines anything else
  rather than faking it; AI drills remain model-written.

## 2. The actual problem to solve (go do this, in this order)

### P0 — make the visual *explain*, per pattern family
Right now every kind has one generic diagram. Build purpose-built ones, each of which makes the
pattern's *invariant* visible:
- **dp-2d**: table with dependency arrows from the two cells the recurrence reads; highlight the
  fill order; show the row/col the answer lives in.
- **dp-1d**: array of subproblem values + the "previous one/two" pointers the recurrence uses.
- **graph-bfs / graph-dfs**: node-link graph **plus a live queue/stack sidebar** (enqueue/dequeue
  animation), distance labels, and the frontier boundary.
- **backtracking**: the recursion tree growing/pruning; the "choose → explore → un-choose" triple
  visible as a path entering and leaving a branch.
- **sliding-window**: char-count table + the window band + the jump when a repeat appears.
- **monotonic-stack**: stack contents with index distances, the "popped" element shown being
  resolved and where its answer comes from.
- **intervals**: a 1-D timeline where rectangles merge, not a text list.
- **heap / trie / union-find**: at least heap (array + tree overlay) and union-find (parent pointers
  with path compression).
Acceptance: for each family, a problem exists where a reader can answer "why does the invariant
hold at this step?" from the picture alone; frames carry the state the diagram needs; `node tools/scene_probe.mjs <slug>` prints it; screenshot each.

### P0 — "your code vs the trace"
The user explicitly wants their own code driving the visual. Investigate honestly first (this is a
research spike, write the findings in DESIGN.md): Java JDI/JPDA single-stepping, bytecode
instrumentation, or a source-level probe compiler; for C++ gdb/MI or `-finstrument-functions`.
If full tracing is too fragile, ship a **narrow but real** version: instrument the generated
harness so that for supported patterns the *user's* loops report (array snapshot, pointer values)
per iteration. Do not fake a trace. Acceptance: submit a deliberately wrong solution, see the
diagram step through *your* execution and land on the iteration where the answer diverges.

### P1 — coverage and craft
- Extend line-mapped walkthroughs from 8 patterns toward all 31 (each needs code in 3 languages with
  step ids; see `engine/walkthrough.js`).
- Bidirectional linking: hovering a diagram element highlights the originating **code line**, not
  just the reverse.
- Input presets ("sorted", "all equal", "single element", "duplicates") + random; encode the current
  input in the URL hash so a walkthrough is shareable.
- Operation counter / complexity probe: count comparisons and swaps as you step, plot n vs ops, so
  "why is this O(n log n)" is evidence, not a claim.
- Accessibility: SVG focusability, `aria-live` narration of the current step, reduced-motion paths.

### P2 — only if P0/P1 are solid
- Notes per problem, share/export, an optional "cinema" 3D mode behind an explicit toggle
  (`engine/index.js` exists but is unused — bring it back only if research shows a reason).

## 3. Environment facts and traps (save yourself a day)

**Live reload:** `web/**` and `host/**` are read from disk. The server rewrites every relative
import in served JS with `?b=<max mtime under web/>`, so an edit is picked up on the next page
mount — no restart. **`client.js` and `package.json` changes need**
`plugin_manager remove_bundle @local/leetcode-lab` then `install_bundle D:\Work\leedcode grind\plugin`
(approval prompts are disabled in this session; never request sandbox escalation).
Absolute engine URLs must append the same `?b=` stamp by hand (see `ui/walkthrough.js`).

**Layout traps already hit (don't repeat):**
- `mount()` must set `display:block` on the container — as a flex item the app shrank to content
  width and left a dead strip in the panel.
- The height chain needs `.lc-shell{flex:1;min-height:0}` and
  `.lc-main{grid-template-rows:minmax(0,1fr)}`, else the virtualised list's 163,000 px sizer
  stretches everything.
- The button reset is `:where(button)` on purpose — a plain `.lc-app button` rule out-specifies
  `.lc-btn` and flattens every control.
- Percentage heights inside auto-height flex/grid parents blow up; panels are absolutely
  positioned inside `.lc-tabpanels` for this reason.
- The engine caches ES modules by URL: always bust with `?b=`.

**Judge:** `POST /leetcode-lab/api/judge {lang,slug,code}`; also accepts an inline
`problem:{judge:{signature,tests,mode}}` (that is how variations are judged). Java uses a
reflective serializer (`__H.__out`) because LeetCode signatures declare `int[][]` while solutions
return `List<List<Integer>>`; C++ binds args to named lvalues because signatures take
`vector<int>&`. Comparison normalises whitespace/quotes and supports `exact|unordered|float|any`.

**AI:** host `llm` service, provider `opencode-go`; the adapter requires a session id header, so
`host/ai.js` passes `sessionId: 'leetcode-lab-ai'`. Scenes must validate against the schema in
`CONTRACTS.md` §4; the diagram must never crash on an unknown frame shape.

## 4. Verification (run all of it before you claim anything)

```powershell
cd D:\Work\leedcode grind
node tools/judge_smoke.mjs        # must stay 23/23 (all types + negative controls)
node tools/variants_check.mjs     # must stay all-green (409 checks + judge runs)
python tools/validate_data.py     # dataset contract
node tools/scene_probe.mjs two-sum
```

Visual checks — the user watches the right-sidebar Browser, so drive the real app:
```powershell
$sb='C:\Users\raiya\dsh\sidebar-browser\sb.py'
python $sb --app click --selector '[aria-label="LeetCode Lab"]'
python $sb --app eval "document.querySelectorAll('.lc-cell').length"
python $sb --app shot --name my-check
```
Fast static rendering (fresh JS context every time):
```powershell
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless=new --disable-gpu `
  --hide-scrollbars --no-first-run --force-device-scale-factor=1 --user-data-dir="$env:TEMP\edge-x" `
  --window-size=1700,1000 --virtual-time-budget=8000 --screenshot="D:\Work\leedcode grind\shots\x.png" `
  "http://127.0.0.1:64289/leetcode-lab/#/p/two-sum"
```
Then **read the PNG** and judge it as a designer: is the state readable in 2 seconds, is anything
clipped, is any space dead, does the highlight mean something? Screenshot at ~1700 px and ~1200 px wide.

## 5. Definition of done for each feature
- Design rationale in `docs/DESIGN.md` **before** code, with sources cited.
- Works in-app (sidebar) **and** standalone URL; no console errors; no clipped/scaled-up elements.
- Judge/variants suites still green; existing tabs unaffected.
- A screenshot attached to your report; an explicit list of what you did **not** do and why.
- Update `README.md` and this prompt's "current state" section when you finish.
