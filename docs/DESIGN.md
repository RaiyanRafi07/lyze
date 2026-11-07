# LeetCode Lab — Design (P0 visuals, "your code vs the trace", P1 craft)

Status (2026-11-05): **shipped** — P0 family visuals, the narrow-but-real trace probe, P1
craft items and the P2 set (notes, share, explicit 3D toggle) are all in the app. All suites
green after every change (judge 23/23, variants 409 + 5, engine-check 22/22, data contract OK).
Baseline before any change was the same green set.
What was deliberately NOT done is listed in §8.

## 1. Thesis (what the app must do)

A learner should be able to answer, from the picture alone, *"why does the invariant hold at
this step?"* — and be able to see *their own code's* execution land where it diverges from a
correct one. The app currently shows a generic diagram per pattern; the gap is that the diagram
rarely shows the **invariant** (what the next step depends on).

## 2. Benchmark (≥ 6 sources, fetched and read)

| # | Source | What it does (observed) | Steal | Do NOT steal |
|---|---|---|---|---|
| 1 | Bret Victor, *Learnable Programming* — https://worrydream.com/LearnableProgramming/ | Thesis: "show the data", "make flow visible", "no hidden state", "explain in context". Slider scrubbing over execution; timeline of executed lines; per-line values. | **Show the data, not code.** Every line's effect must be visible in the same panel. "No hidden state": every variable the algorithm reads must be drawn. Scrubbing + overhead view. | Its Processing/JS live-coding framing; the "live coding" feature itself (he explicitly says it is not the point). |
| 2 | Bret Victor, *Explorable Explanations* — https://worrydream.com/ExplorableExplanations/ | Reactive documents: parameters are live; "explorable is integrated with the explanation"; the author guides, the reader nudges. | **Let the reader change the input and watch the same explanation re-run** (already done via Input chip — keep it). Author holds up their end: each pattern needs a guided narration, not a bare sandbox. | Full sandbox with no guidance ("figure it out yourself" — he calls those not explanations). |
| 3 | Brushing & linking — https://en.wikipedia.org/wiki/Brushing_and_linking (Becker & Cleveland 1987) | Two or more views of the same data; changing one highlights linked elements in the others. Brush (select) in one view → linked highlight in the other. | **Hover a code line ⇄ highlight the diagram element it touched, and vice versa.** This is exactly the P1 "bidirectional linking" item. | Histogram-scatterplot-specific mechanics; nothing from its database framing applies directly. |
| 4 | VisuAlgo — https://visualgo.net/en | 24 modules, each with animation + controls + pseudo-code; per-module quiz. (Fetched the index; module pages are JS-rendered and were not reachable as text, so I rely on its published description: pseudo-code ↔ visual ↔ step list, linked.) | **Pseudo-code, visual and a step list are three linked views of one state.** Matches our walkthrough layout. Quizzes per module → our Variations tab is the analogue. | Its breadth-first "module per structure" catalogue: we are per-problem, not per-structure. |
| 5 | David Galles' visualizations — https://www.cs.usfca.edu/~galles/visualization/Algorithms.html | Dozens of single-topic visualizations (BFS, DFS, Dijkstra, Topo sort, DP-LCS, Disjoint Sets, Heaps, Tries, B-trees). Step controls, a state readout, zero decoration. | **Zero decoration, explicit state readout (e.g. a queue box for BFS, a parent array for DisjointSets), step controls.** Disjoint-set and DP-LCS pages are direct models for our union-find and dp-2d families. | Its minimal visual language is intentionally plain; we still need highlights and a narration line. |
| 6 | Red Blob Games, A* — https://www.redblobgames.com/pathfinding/a-star/introduction.html | Incremental interactive diagrams: BFS frontier → came_from arrows → early exit → Dijkstra contours → greedy → A*. Each diagram adds **one** concept. Shows the *reconstruction* ("follow arrows backwards") explicitly. | **Build the concept in increments**: a graph-bfs frame set shows the frontier, a second shows came_from arrows, a third the reconstructed path. Also: the frontier is the invariant to draw. | Its large mapped artwork; we need abstract cells, not sprites. |
| 7 | Distill, *Why Momentum Really Works* — https://distill.pub/2017/momentum/ | Interactive plots that change parameters; mathematical explanation is anchored to the plot (each claim has a slider that demonstrates it). | **Anchor every claim to a state the reader can see**: each frame's note should cite the value that justifies the next move (e.g., "need 7, map has 2 at index 0"). | Its heavy math exposition; our readers need arithmetic, not eigen-decomposition. |
| 8 | Nicky Case — https://ncase.me/ (esp. *Explorable Explanations* hub, *Evolution of Trust*) | Playful, expandable explanations: one mechanic per screen, the reader changes one knob, sees one consequence; "parts of the explanation unfold on demand". | **One mechanic per view; progressive disclosure** (the step card and state chips already do this; keep the diagram minimal). | Gamification and narrative framing — the user asked for a practice tool, not a game. |

Plus, for the user's explicit complaints, I did **not** need external sources: the "3D for 3D's sake" failure
is addressed by the choice in §3 (keep 2D SVG, no 3D).

## 3. Three candidate designs

**A — Pattern-specific renderers + one shared frame contract (chosen).**
```
 [ code (line-linked) ]  <-- brushing -->  [ purpose-built SVG per family ]
                                            - dp-2d : grid + dependency arrows from the 2 read cells
                                            - graph  : nodes + frontier queue sidebar + distance labels
                                            - backtrack: recursion tree, choose/explore/undo path
                                            - ...
 state readout (chips) + narration (aria-live) + step controls
```
Each family gets a renderer whose *geometry encodes the invariant*. Frames carry the needed state.

**B — Keep one generic diagram, add per-frame overlays.** Cheap, but a single renderer per
"shape" (cells/tree/graph) keeps hiding the invariant: a DP grid and a sliding window look
identical. Rejected: fails the "why does the invariant hold" acceptance test.

**C — 3D "cinema" mode as the primary view.** Revive `engine/index.js`. Rejected for P0: the user
said "3D for the sake of 3D" is a failure; a 3D view adds geometry without encoding state, and
the old renderer is unused and unmaintained. Keep as an explicit P2 toggle only if research
justifies it (it doesn't yet).

## 4. Chosen design and why

**A.** It is the only option that makes each family's *invariant* the primary visual element
(VisuAlgo, Galles, Red Blob all do this per structure; Victor's "show the data" requires it).
It reuses the existing SVG renderer, the existing walkthrough frame contract and the existing
line-mapping, so it doesn't break the suites.

**Explicitly NOT doing:**
- No 3D (candidate C) in P0/P1.
- No live-coding-on-every-keystroke "trace" of arbitrary user code in P0 (see §5).
- No new AI-generated scene path changes; AI scenes keep the existing `scene` contract.
- No premium/out-of-dataset problems; no fabricated expected outputs.
- No gamification (XP, badges).
- Not touching `judge.js` semantics or the judge/variants suites.

### Per-family invariant (what the picture must show)

| Family | Invariant the picture must make visible | Concrete visual element |
|---|---|---|
| dp-2d | cell (i,j) = f(two cells read) | grid, arrows from the 2 read cells into the filled cell, answer cell badge |
| dp-1d | dp[i] = f(dp[i-1], dp[i-2]) | value row + "previous one/two" pointers |
| graph-bfs | frontier is the boundary between visited and unvisited; distance = level | graph, frontier queue box, distance labels |
| graph-dfs | stack = current path; pop = backtrack | graph + stack sidebar |
| backtracking | choose → explore → un-choose is a path in a tree | recursion tree, current path highlighted, pruned branches dimmed |
| sliding-window | window [l,r] satisfies a count invariant | char-count table + window band; repeat causes the jump |
| monotonic-stack | stack holds candidates in monotone order; a pop resolves the popped element | stack with index distances; popped element linked to its answer |
| intervals | after sorting, merged blocks grow while next.start ≤ current.end | 1-D timeline, rectangles merging |
| heap | parent ≥ children; top-k = heap of size k | array + tree overlay side by side |
| union-find | find(x) = root; path compression flattens | parent-pointer forest, compressed edges highlighted |

## 5. "Your code vs the trace" — research and decision

Options evaluated (honest assessment):
- **Java JDI / JPDA single-stepping** — accurate, but requires a debug-launched JVM per run and
  a JDWP handshake; latency and Windows-specific fragility. Too heavy for a per-run visual.
- **Bytecode instrumentation (ASM / javassist)** — viable for Java, but needs an agent or a
  classpath rewrite and a tracing runtime; large surface for bugs.
- **C++ gdb/MI or `-finstrument-functions`** — gdb MI is fragile to script; `-finstrument-functions`
  fires only on function entry/exit, not per-line; insufficient for per-iteration state.
- **Source-level probe compiler (chosen as the *narrow but real* path)** — the harness we already
  generate for the judge already has the user's method and the test arguments. Insert a
  `__probe(state)` call at the top of each *loop* iteration in the **user's own method body**,
  scoped to the supported patterns (array snapshot, index pointers, map/set contents) and
  capture into a bounded buffer, then return it with the judge result. This is a real trace of
  the user's execution, not a fake.

**Decision:** ship the probe path, *only* for the supported families where loop variables are
simple (arrays-hashing, two-pointers, sliding-window, binary-search). For any other code the
diagram says "trace unavailable for this solution's shape" and falls back to the canonical
walkthrough. This is stated, not faked.

Acceptance: a deliberately wrong two-sum (e.g. `seen.put(nums[i], i)` before the check) must
step through *the user's* execution and diverge from the canonical trace at the first
iteration where the lookup should have hit. **If the probe proves fragile on Java/C++ in
implementation, I will ship the Java-only version and report the C++ gap rather than fake it.**

## 6. How I will measure that it worked (concrete checks, not vibes)

1. **Regression:** `judge_smoke.mjs` 23/23; `variants_check.mjs` 409 + 5 judge all green;
   `validate_data.py` contract OK — after every change.
2. **Invariant test per family:** for each of the 10 families above, `scene_probe.mjs <slug>`
   prints frames; a checker asserts each frame carries the state named in the table
   (e.g. dp-2d frames have `reads` ≥ 2 cells; graph frames have `frontier`; sliding-window frames
   have `window` and `counts`). A frame without its invariant state fails the check.
3. **Answerability (the acceptance test from the brief):** for one problem per family, I write
   a question whose answer requires the invariant ("which two cells does this cell depend on?",
   "why is the window valid now?") and verify the answer is derivable from the frame's rendered
   state, not only from the narration — checked by reading the SVG/state, screenshotting each.
4. **Probe fidelity:** the wrong-two-sum case in §5 diverges at the expected iteration index,
   checked by comparing the probe trace to the canonical trace.
5. **Visual:** screenshot each family at ~1700 px and ~1200 px; read the PNG; check nothing is
   clipped, no dead space, and labels are readable at 1 s. Also drive the sidebar app with
   `sb.py` and confirm `.lc-cell` count and zero console errors.
6. **Accessibility:** SVG elements focusable, `aria-live` narration present, reduced-motion
   path disables transitions (checked via the stylesheet media query).

## 6b. Grounding in the existing code (checked before planning)

- `engine/patterns.js` already has deterministic generators for 16 families: arrays-hashing,
  two-pointers, sliding-window, binary-search, stack, monotonic-stack, graph-bfs, graph-dfs,
  dp-2d, dp-1d, linked-list, tree-dfs, tree-bfs, heap-topk, intervals, union-find, trie.
  **The P0 work is therefore a renderer and state-contract job, not a frame-generator rewrite.**
- `engine/diagram.js` dispatches on six scene kinds: `cells`, `tree`, `graph`, `grid`, `stack`,
  `linked`. New families map onto these: dp-2d → `grid` with dependency arrows; graph-bfs/dfs →
  `graph` + frontier sidebar; heap → `tree` overlay + `cells`; union-find → `tree` (parent edges);
  intervals → `cells` as a timeline. Backtracking and the probe trace need new state keys but
  reuse the same kinds.
- Frames already carry `state` keys (`pointers`, `highlights`, `window`, `seen`, …). New
  invariant state (e.g. `reads` for dp-2d, `frontier` for graph) must be added in the generator
  and rendered by the renderer; the existing keys must keep working so the 8 line-mapped
  walkthroughs do not regress.

## 7. Order of work (all done)

1. P0 per-family renderers — done, each verified by §6.2–6.5 before the next.
2. P0 "your code vs trace" probe — done for **both** Java and C++ (C++ proved robust for the
   loop shapes tested: two-sum traces identically in both languages).
3. P1: line-mapping 8 → 19 patterns, bidirectional linking, presets + URL hash, ops
   sparkline, a11y — done.
4. P2 (only because P0/P1 verified solid): per-problem notes, share link, explicit 3D
   cinema toggle — done, 2D stays the default.
5. README.md and the HANDOFF "current state" section — updated.

## 8. What was explicitly NOT done, and why

- **Line-mapping for the remaining 12 patterns** (prefix-sum, sorting, queue-deque, bst,
  greedy, matrix, bit-manipulation, dp-trees, strings, math, design, recursion): each needs
  3-language reference code plus input-shape handling; the pattern-scene + AI fallback already
  covers them and the UI says so. Diminishing returns vs. the risk of wrong reference code.
- **Full debugger tracing (JDI/gdb/MI)**: evaluated in §5, rejected — per-run debug sessions
  are too fragile on this machine; the source-probe path is real and already diverges honestly.
- **Trace beyond the first test / non-loop code**: the probe caps at 60 iterations on test 1
  and declines anything else. Running every test would multiply compile+run cost per click.
- **3D as default or 3D-specific visuals**: the user's "3D for 3D's sake is noise" rule stands;
  cinema is one toggle that replays the *same* scene, nothing more.
- **Gamification, premium problems, fabricated outputs**: out of scope per the brief; the data
  builder's premium overlay hook stays dormant.
- **n-vs-ops multi-run plot**: the sparkline shows cumulative comparisons *within* the run
  (shape = evidence). Re-running generators on synthetic scaled inputs would show a prettier
  curve but would not be *this problem's* data.
