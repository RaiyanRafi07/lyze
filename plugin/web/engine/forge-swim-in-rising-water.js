/**
 * swim-in-rising-water — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug `swim-in-rising-water`
 * (Swim in Rising Water, Hard, swimInWater(int[][])->int, mode exact).
 * Pure ES module: no DOM, no network, no dependencies, no Math.random, no Date.
 * Fixed seeds (FNV-1a + mulberry32); every expected value is computed at build
 * time by swimRefBinarySearch below (binary search on T + BFS feasibility), an
 * INDEPENDENT implementation of the same operation (not the walkthrough's
 * minimax Dijkstra), and cross-checked against the Dijkstra oracle; disagreement
 * throws.
 *
 * Staged source: .workers/jobs/neetcode150-completion/swim-in-rising-water/swim-variants.js
 * (statements, hints, oracles); reshaped into the forge variant contract
 * (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
 * Expected literals re-verified against the oracle at build time.
 *
 * Shape follows plugin/web/engine/variants.js buildVariant():
 * - `signature` is the ACTUAL judge signature, so the same editor code compiles unchanged.
 * - `args` are raw LeetCode-style literal strings; `expected` is the literal
 *   the judge compares against.
 * - `examples` is exactly [{ input, output, explain: '' }] derived from
 *   tests[0] (examples == first test).
 * - `mode` is 'exact' (integer answers).
 * - `hints` holds exactly 2 hints per variant.
 */

export const SLUG = 'swim-in-rising-water';

export const SIGNATURE = Object.freeze({
  name: 'swimInWater',
  params: Object.freeze([{ name: 'grid', type: 'int[][]' }]),
  return: 'int',
});

export const MODE = 'exact';
export const DIFFICULTY = 'Hard';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
export const INTENT_ADVERSARIAL = 'Same task, same output type: larger and adversarially ordered grids.';

function hashText(text) {
  const s = String(text);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

/** n x n permutation of 0..n*n-1 (mirrors the real constraint: unique values). */
function permGrid(rng, n) {
  const vals = [];
  for (let v = 0; v < n * n; v++) vals.push(v);
  const perm = shuffled(rng, vals);
  const grid = [];
  for (let r = 0; r < n; r++) grid.push(perm.slice(r * n, (r + 1) * n));
  return grid;
}

function argLiteral(v) {
  return '[' + v.map((row) => '[' + row.join(',') + ']').join(',') + ']';
}

/** Cross-check oracle: minimax Dijkstra (same algorithm as the walkthrough). */
export function swimRefDijkstra(grid) {
  const n = grid.length;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const best = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const seen = Array.from({ length: n }, () => Array(n).fill(false));
  const heap = [];
  const less = (a, b) => a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])));
  const push = (it) => {
    heap.push(it);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!less(heap[i], heap[p])) break;
      const t = heap[i]; heap[i] = heap[p]; heap[p] = t;
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let s = i;
        if (l < heap.length && less(heap[l], heap[s])) s = l;
        if (r < heap.length && less(heap[r], heap[s])) s = r;
        if (s === i) break;
        const t = heap[s]; heap[s] = heap[i]; heap[i] = t;
        i = s;
      }
    }
    return top;
  };
  best[0][0] = grid[0][0];
  push([grid[0][0], 0, 0]);
  while (heap.length) {
    const [h, r, c] = pop();
    if (seen[r][c]) continue;
    seen[r][c] = true;
    if (r === n - 1 && c === n - 1) return h;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n || seen[nr][nc]) continue;
      const nh = Math.max(h, grid[nr][nc]);
      if (nh < best[nr][nc]) { best[nr][nc] = nh; push([nh, nr, nc]); }
    }
  }
  return -1;
}

/** INDEPENDENT oracle: binary search on T + BFS feasibility (different algorithm). */
export function swimRefBinarySearch(grid) {
  const n = grid.length;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const feasible = (T) => {
    if (grid[0][0] > T || grid[n - 1][n - 1] > T) return false;
    const seen = Array.from({ length: n }, () => Array(n).fill(false));
    const q = [[0, 0]];
    seen[0][0] = true;
    while (q.length) {
      const [r, c] = q.shift();
      if (r === n - 1 && c === n - 1) return true;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= n || nc < 0 || nc >= n || seen[nr][nc] || grid[nr][nc] > T) continue;
        seen[nr][nc] = true;
        q.push([nr, nc]);
      }
    }
    return false;
  };
  let lo = Math.max(grid[0][0], grid[n - 1][n - 1]);
  let hi = 0;
  for (const row of grid) for (const v of row) hi = Math.max(hi, v);
  let ans = hi;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (feasible(mid)) { ans = mid; hi = mid - 1; }
    else lo = mid + 1;
  }
  return ans;
}

function cloneSignature(signature) {
  return {
    name: signature.name,
    params: signature.params.map((p) => ({ name: p.name, type: p.type })),
    return: signature.return,
  };
}

function inputLine(signature, args) {
  return signature.params
    .map((param, index) => `${(param && param.name) || 'arg' + index} = ${args[index]}`)
    .join(', ');
}

function testsFor(grids) {
  return grids.map((g) => {
    const a = swimRefDijkstra(g);
    const b = swimRefBinarySearch(g);
    if (a !== b) throw new Error('Oracle disagreement on grid ' + JSON.stringify(g) + ': ' + a + ' vs ' + b);
    return { args: [argLiteral(g)], expected: String(b) };
  });
}

function buildVariant({ id, seedLabel, intent, title, statement, tests, hints }) {
  const capped = tests.slice(0, 5).map((t) => ({ args: t.args.map(String), expected: String(t.expected) }));
  const first = capped[0];
  return {
    id,
    seedLabel,
    intent,
    difficulty: DIFFICULTY,
    title,
    statement,
    signature: cloneSignature(SIGNATURE),
    examples: [{ input: inputLine(SIGNATURE, first.args), output: first.expected, explain: '' }],
    tests: capped,
    mode: MODE,
    hints: hints.slice(0, 2),
  };
}

// Fixed seeds -> byte-identical drills on every run.
function seededGrids() {
  const rngV1 = mulberry32(hashText(SLUG + ':v1'));
  const v1 = [permGrid(rngV1, 3), permGrid(rngV1, 3), permGrid(rngV1, 4), permGrid(rngV1, 3)];
  const rngV3 = mulberry32(hashText(SLUG + ':v3-same-task'));
  const v3 = [permGrid(rngV3, 4), permGrid(rngV3, 4), permGrid(rngV3, 5), permGrid(rngV3, 2)];
  const v2 = [
    [[0]],
    [[0, 2], [1, 3]],
    [[3, 2], [1, 0]],
    [[0, 1, 2], [5, 4, 3], [6, 7, 8]],
  ];
  return { v1, v2, v3 };
}

/* ---------------- entry point ---------------- */

export function buildSwimPractice() {
  const { v1, v2, v3 } = seededGrids();
  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh grids',
      intent: INTENT_SAME,
      title: 'Swim in Rising Water — fresh grids (same-task drill)',
      statement:
        'Same task: given an n x n grid of unique elevations, return the minimum time t so start (0,0) can reach (n-1,n-1) stepping only on cells with elevation <= t. Fresh 3x3 and 4x4 permutation grids.',
      tests: testsFor(v1),
      hints: [
        'Expand reachable cells in order of elevation (min-heap); the first time you settle the target its cost is the answer.',
        'Track the running maximum elevation along the path, not the number of steps.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Swim in Rising Water — edge cases (same-task drill)',
      statement:
        'Same task on boundary grids: a 1x1 grid answers its own elevation, and 2x2 grids force a choice between two corridors. A 3x3 snake grid tests the running-maximum rule against a tempting shortcut.',
      tests: testsFor(v2),
      hints: [
        'A 1x1 grid needs no swimming: the answer is grid[0][0].',
        'On 2x2, compare max(0, side, target) for both corridors and keep the smaller.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same task, adversarial ordering',
      intent: INTENT_ADVERSARIAL,
      title: 'Swim in Rising Water — adversarial ordering (same-task drill)',
      statement:
        'SAME TASK, no twist: return the minimum feasible water level for larger grids whose high start/end walls and shuffled interiors punish greedy step-count thinking. Output type is unchanged (int).',
      tests: testsFor(v3),
      hints: [
        'High walls near the start or target raise the lower bound: max(grid[0][0], grid[n-1][n-1]) is always a floor.',
        'When two corridors compete, the cheaper maximum wins even if it is longer.',
      ],
    }),
  ];
}

// Staged-compat alias: same builder, family-style name.
export const buildPracticeVariants = buildSwimPractice;
export const buildSwimVariants = buildSwimPractice;

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'swimRefBinarySearch (binary search on T + BFS feasibility; walkthrough uses minimax Dijkstra)',
});

export default buildSwimPractice;
