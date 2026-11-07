# LeetCode Lab

A Harness plugin that is also a standalone web app: the full LeetCode grind, judged locally,
with a **code ↔ visual walkthrough** and an AI tutor that animates whatever you are stuck on.

The look is flat editorial neo-brutalism, in **light and dark** themes (toggle in the
header: Light / Dark / Auto-follows-OS, persisted, no flash): cream + Thunder-navy palette,
Cherry primary actions, serif display type, sharp corners, hard offset shadows — no blur, no
gradients, no glow. Code slabs stay dark in both themes. State is carried by shape and solid
color (see `docs/THEME.md`).

## Open it

- **Standalone (recommended)**: double-click `standalone/start.bat`, then open
  <http://localhost:8080/leetcode-lab/> in any browser — see `docs/DEPLOY.md` for
  Docker, OneDrive progress sync, and the optional AI key. No Harness needed.
- **In the Harness app**: click the **LeetCode Lab** icon in the left sidebar, or open
  <http://127.0.0.1:64289/leetcode-lab/> (same build; progress is host-backed and shared
  via `plugin/data/progress.json`).

## The three tabs

### Walkthrough — code and diagram, in lock-step
Reference solution on the left, a **2D SVG diagram** on the right (cells with indexes, pointer
chips, a live hash-map table, node-link trees, DP grids, stacks, linked lists). As you
play/scrub: the **executing line is highlighted**, the step card explains it, the state chips
update, and the diagram animates the same change.

Interaction is designed on two established ideas:

- **Brushing and linking** ([Becker & Cleveland](https://en.wikipedia.org/wiki/Brushing_and_linking)):
  hover a state chip (`i`) and the matching cell highlights; hover a row of the `seen`
  table and the array cell it came from highlights; hover a cell for its index/value.
- **Explorable examples** ([Bret Victor](https://worrydream.com/ExplorableExplanations/)):
  the **Input** chip lets you replace the array / target / string and re-runs the algorithm on
  your data — new steps, new pointers, new table, immediately.

Keyboard: `←`/`→` step, `space` play/pause. Language switch: Java / C++ / Pseudo.
"Now write it yourself" hands off to Solve.

Linked (line-mapped) walkthroughs cover 19 patterns — `arrays-hashing`, `two-pointers`,
`sliding-window`, `binary-search`, `stack`, `monotonic-stack`, `linked-list`, `tree-dfs`,
`tree-bfs`, `dp-1d`, `dp-2d`, `graph-bfs`, `graph-dfs`, `intervals`, `heap-topk`, `union-find`,
`backtracking`, `trie`, `topological-sort`. Every other pattern still gets its pattern scene
plus the step transcript; the AI can author a scene for any problem ("Animate with AI").

Each family shows its invariant, not a generic diagram: dp-2d dependency arrows + answer cell,
dp-1d previous-pointers, BFS queue sidebar + distance labels, DFS stack sidebar, backtracking
recursion-stack sidebar, sliding-window char-count table, monotonic-stack strip with resolved
pops, intervals merge timeline, heap tree overlay, union-find parent pointers. Hovering a code
line highlights everything that step touches; hovering the diagram flashes the executing line.
Input presets (Sorted / All equal / Single / Duplicates / Random) plus a shareable URL hash
(`#/p/<slug>?in=…`); a comparisons sparkline shows the complexity evidence as you step.
An opt-in **3D** toggle replays the same scene through the cinema viewer (2D stays default).

### Solve — a real judge, no cloud
Java or C++, compiled and run on this machine (`javac 20`, `g++ 14.2`) against the problem's
real tests. Statement lives in a slide-over drawer so it never steals workspace width.
2,597 of 2,913 problems are auto-judged; the rest (design classes, SQL, interactive APIs,
in-place `void`) fall back to example checking + AI review.

**Trace my run** steps through *your* code's execution: the harness injects tiny probes at
the top of your loops (first test only, capped at 60 iterations) and the diagram plays your
array snapshots, pointers and map contents back — a wrong solution lands where it diverges.
Anything the probe cannot handle returns an honest "trace unavailable" instead of a fake
trace. The drawer also holds per-problem notes (synced) and the header has a Share button
that copies a link including your walkthrough input.

### Variations — practise it differently, per problem
Three variations of the current problem, each with its own statement, examples and **real
tests you can run your code against**:

- **Deterministic drills** (instant, offline, verified): same idea / new data, hidden edge
  case, and a same-signature twist — 123 problems across 8 patterns, `engine/variants.js`.
- **AI drills** (opencode-go, ~25 s): generated for any other problem, with machine-checkable
  tests so Run still works. Clearly labelled `AI drill`.

## Also

Easy → Medium → Hard ladder, pattern-mastery grid, spaced-repetition "due" queue, search and
filters, saved code per language, tutor drawer (explain / animate / review / 3 similar), and
keyboard shortcuts: `1/2/3` tabs · `s` statement · `j`/`k` next/previous · `/` search ·
`Ctrl+Enter` run.

## Data

- 2,913 problems with statements, examples, constraints, hints, editorials, starter code,
  topics and a primary pattern (31 patterns).
- Judge specs are generated from the Java snippet signature + example IO; 89% are judgeable.
- Source: public dump of the free problem set. Premium problems were **not** available from any
  public mirror that still serves them; the builder has a dormant overlay hook
  (`tools/premium_problems.json`).
- 19 problems have no written statement upstream and carry an explicit placeholder.

## Verify

```powershell
cd D:\Work\leedcode grind
node tools/judge_smoke.mjs      # 23/23 judge matrix (all types + negative controls)
node tools/variants_check.mjs   # 409 variant checks + 5 judge runs, all green
python tools/validate_data.py   # dataset contract + coverage
node tools/scene_probe.mjs two-sum   # inspect one built scene
```

## Layout

```
leetcode-lab/
  plugin/                 # installed bundle (@local/leetcode-lab)
    index.js              # host entry: claims /leetcode-lab, hot-reloads host/app.js
    client.js             # sidebar icon + full-screen page (mounts the web app)
    host/app.js           # static server, API routes, progress store
    host/data.js          # index/shard access (mtime cache)
    host/judge.js         # javac/g++ harness generation + comparison
    host/ai.js            # llm bridge: explain / scene / variants / review
    web/
      app.js  ui/*.js     # shell, catalogue, problem workspace, walkthrough, variations
      engine/             # 3D renderer + pattern scenes + line-linked walkthroughs + variants
      styles.css          # design system (everything scoped under .lc-app)
    data/                 # index.json, shard-0..19.json, progress.json
  raw/  tools/  CONTRACTS.md  README.md
```

Known limits: walkthrough line-mapping covers 19 of 31 patterns (the rest show a pattern
scene, stated in the UI); the trace probe covers loop-based solutions on the first test and
declines the rest rather than faking them; AI drills are model-written, so treat a failing
test as a hint rather than a verdict; the diagram renderer is plain SVG with a viewBox, so
it stays crisp at any panel size.

