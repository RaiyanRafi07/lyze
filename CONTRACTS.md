# LeetCode Lab — build contracts (single source of truth)

Everything below is a hard interface. Do not rename fields. If something is impossible,
implement the documented fallback and say so in your handoff message.

Workspace root: `D:\Work\leedcode grind`

```
leetcode-lab/
  raw/merged_problems.json      # 2,913-problem source dataset (do not edit)
  plugin/                       # installed Harness bundle (Lead owns package.json, index.js, client.js)
    web/                        # static app, served at /leetcode-lab/  (app-forge owns web/)
      index.html  app.js  styles.css  ui/*.js  engine/*.js
    data/                       # runtime JSON, served via API only (data-forge owns data/)
      index.json  shard-0.json … shard-N.json
  CONTRACTS.md
```

Serving: plugin host registers prefix route `/leetcode-lab`. Anything under `web/` is served
at `/leetcode-lab/<path>`. Data is served only through `GET /leetcode-lab/api/index` and
`GET /leetcode-lab/api/shard/<n>`.

---

## 1. data/index.json  (data-forge)

```jsonc
{
  "generatedAt": "2026-11-05T03:00:00.000Z",
  "counts": { "total": 2913, "premium": 0, "judgeable": 2100,
              "byDifficulty": { "Easy": 763, "Medium": 1464, "Hard": 686 },
              "byPattern": { "two-pointers": 120 } },
  "patterns": [
    { "id": "two-pointers", "label": "Two Pointers",
      "blurb": "One-line description of the pattern's tell.",
      "color": "#5ee7ff" }
  ],
  "problems": [
    { "id": 1, "slug": "two-sum", "title": "Two Sum", "difficulty": "Easy",
      "topics": ["Array", "Hash Table"], "pattern": "arrays-hashing",
      "patterns": ["arrays-hashing"], "premium": false, "judgeable": true,
      "hasVisual": true, "shard": 0 }
  ]
}
```

`problems` is ordered by the grind ladder: Easy → Medium → Hard, then frontend id ascending.
`shard = floor(position / 150)`. Index stays under ~700 KB.

## 2. data/shard-<n>.json  (data-forge) — `{ "shard": n, "problems": [ ... ] }`

Full problem record:

```jsonc
{
  "id": 1,
  "slug": "two-sum",
  "title": "Two Sum",
  "difficulty": "Easy",                    // "Easy" | "Medium" | "Hard"
  "topics": ["Array", "Hash Table"],
  "pattern": "arrays-hashing",             // exactly one primary
  "patterns": ["arrays-hashing", "two-pointers"],   // 1-3 secondary ids, primary first
  "premium": false,
  "description": "Given an array ... ",    // clean text, paragraphs with \n\n, no HTML tags
  "examples": [
    { "n": 1, "input": "nums = [2,7,11,15], target = 9", "output": "[0,1]",
      "explain": "Because nums[0] + nums[1] == 9, we return [0, 1].", "raw": "full example text" }
  ],
  "constraints": ["2 <= nums.length <= 10^4"],
  "hints": ["A really brute force way ..."],
  "snippets": { "java": "class Solution {...}", "cpp": "...", "python": "..." },
  "solution": "## Approach ...",           // cleaned editorial prose, may be ""
  "judge": {                                // null when not judgeable
    "mode": "exact",                        // "exact" | "unordered" | "float" | "any"
    "signature": {
      "name": "twoSum",
      "params": [ { "name": "nums", "type": "int[]" }, { "name": "target", "type": "int" } ],
      "return": "int[]"
    },
    "tests": [
      { "args": ["[2,7,11,15]", "9"], "expected": "[0,1]", "example": 1 }
    ]
  }
}
```

Type vocabulary for signature params/return (exact strings):
`int`, `long`, `double`, `boolean`, `string`, `char`, `int[]`, `long[]`, `double[]`,
`boolean[]`, `string[]`, `char[]`, `int[][]`, `char[][]`, `string[][]`, `ListNode`,
`TreeNode`, `void`.
`args` are raw LeetCode-style literal strings; the judge parses them per type.

`mode`: `exact` (string diff), `unordered` (order-insensitive lists), `float`
(1e-5 tolerance), `any` (no deterministic expected output → AI review).
`judge` is null when the signature cannot be recovered or the problem is a design/class /
special-judge problem; those get `judgeable: false` and the UI falls back to example
checks + AI review.

## 3. Pattern taxonomy (data-forge assigns; UI + engine rely on the ids)

`arrays-hashing`, `two-pointers`, `sliding-window`, `prefix-sum`, `binary-search`,
`sorting`, `stack`, `monotonic-stack`, `queue-deque`, `linked-list`, `tree-dfs`,
`tree-bfs`, `bst`, `trie`, `graph-dfs`, `graph-bfs`, `topological-sort`, `union-find`,
`backtracking`, `greedy`, `intervals`, `heap-topk`, `matrix`, `bit-manipulation`,
`dp-1d`, `dp-2d`, `dp-trees`, `strings`, `math`, `design`, `recursion`.

Each pattern needs `label`, `blurb`, `color` in `index.patterns`.

---

## 4. Scene schema (scene-forge emits, app + AI produce, renderer consumes)

```jsonc
{
  "v": 1,
  "kind": "array",              // array | tree | graph | grid | linked-list | stack | string
  "title": "Two Sum — hash map sweep",
  "subtitle": "Watch the complement lookup",
  "pattern": "arrays-hashing",
  "camera": { "yaw": 0.55, "pitch": 0.30, "dist": 9 },
  "layout": { },                 // kind-specific, see below
  "frames": [
    { "label": "i = 0", "note": "nums[0] = 2, need 7. Map is empty → store 2.",
      "state": { "pointers": { "i": 0 }, "highlights": { "0": "accent" },
                 "seen": { "2": 0 } } }
  ]
}
```

Kind layouts / per-frame state:
- `array`: `layout { values: number[] }`; state `{ pointers: {name: index}, highlights: {index: color},
  window: [lo, hi], seen: {value: index}, sorted: bool }`. Color names: `accent`, `ok`, `warn`,
  `bad`, `dim`.
- `string`: `layout { chars: string[] }`; same state as array.
- `linked-list`: `layout { values: number[] }`; state `{ pointers: {name: index}, removed: index[] }`.
- `tree`: `layout { nodes: [{id, value, label?, x?, y?}], edges: [[parentId, childId]] }`;
  state `{ current: id, visited: id[], frontier: id[], path: id[], dropped: id[] }`.
- `graph`: `layout { nodes: [{id, label, x, y}], edges: [[a, b] | [a, b, weight?]], directed: bool }`;
  state `{ current, visited[], frontier[], path[], cycle: id[] }`.
- `grid`: `layout { rows, cols, cells: (number|string)[][] }`;
  state `{ current: [r,c], filled: [[r,c]], path: [[r,c]], blocked: [[r,c]] }`.
- `stack`: `layout { capacity?: number }`; state `{ items: (number|string)[], op: "push"|"pop"|"peek" }`.

Narration rules: 6–40 frames per scene, `note` ≤ 140 chars, first frame sets up the data,
last frame states the conclusion. All numbers must come from the actual input.

## 5. Renderer API (scene-forge delivers `web/engine/`)

`web/engine/index.js`:
```js
export function createViewer(container, options) => viewer
// options: { theme: { bg, panel, text, dim, accent, ok, warn, bad }, reducedMotion?: boolean }
// viewer.setScene(scene)          mount/replace a scene
// viewer.goTo(frameIndex)         jump + render
// viewer.play() / viewer.pause()  autoplay (1.4 s per frame default)
// viewer.on('frame', cb)          cb(index, frame) after every change
// viewer.destroy()                remove canvas, listeners, timers
// viewer.setAiOverlay(text)       short caption strip under the canvas
```
Requirements: dependency-free ES module, `<canvas>` 2D with a real 3D camera
(perspective projection, yaw/pitch orbit via pointer drag, wheel zoom, depth sorting,
subtle depth fog), DPR aware (devicePixelRatio), ResizeObserver, no layout thrash,
must render acceptably at 380×260 and 1400×900.

`web/engine/scenes.js` exports per-kind scene builders used by pattern generators.
`web/engine/patterns.js` exports:
```js
export function buildScene(problem, options) => scene | null
```
`problem` is the full shard record. Use `problem.judge.tests[0].args` + `signature` when
present; otherwise parse the first example's `input` text. Implement real deterministic
frame generation for these patterns (canonical algorithm run on the actual input):

`two-pointers`, `sliding-window`, `binary-search`, `arrays-hashing`, `stack`,
`monotonic-stack`, `graph-bfs`, `graph-dfs` (incl. backtracking grid), `dp-2d`, `dp-1d`,
`linked-list`, `tree-dfs`, `tree-bfs`, `heap-topk`, `intervals`, `trie`, `union-find`.

For anything else return `null`; the app then asks the AI for a scene instead.

Every generator must be pure and synchronous, tolerate malformed/absent input by
returning `null` (never throw).

## 6. AI scene contract (Lead implements the bridge; app renders)

The LLM is asked for exactly the scene schema above (`v`, `kind`, `layout`, `frames`).
The bridge returns `{ ok: true, scene }` or `{ ok: false, error, raw }`. The renderer must
never crash on an unknown `kind` — show the narration list as text instead.

## 7. HTTP API (Lead implements in plugin/index.js)

- `GET  /leetcode-lab/api/health` → `{ ok, problems, judge, version }`
- `GET  /leetcode-lab/api/index` → contents of data/index.json
- `GET  /leetcode-lab/api/shard/<n>` → contents of data/shard-<n>.json
- `POST /leetcode-lab/api/judge` `{ lang: "java"|"cpp", slug, code }` →
  `{ ok, compile: {ok, ms, stderr}, cases: [{ n, ok, expected, got, ms, error? }],
     passed, total, mode }`
- `POST /leetcode-lab/api/ai` `{ kind: "explain"|"scene"|"variants"|"review",
    slug, code?, stuck?, difficulty? }` → `{ ok, kind, ... }`
- `GET  /leetcode-lab/api/models` → `{ providers: [], models: [] }`
