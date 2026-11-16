/**
 * longest-increasing-path-in-a-matrix — portable standalone practice builder (question-owners-150).
 *
 * Produces exactly 3 deterministic variants for slug
 * `longest-increasing-path-in-a-matrix` (Longest Increasing Path in a Matrix,
 * Hard, longestIncreasingPath(int[][])->int, mode exact). Pure ES module: no
 * DOM, no network, no dependencies, no Math.random, no Date. Fixed seeds
 * (FNV-1a + mulberry32); every expected value is computed at build time by
 * lipRefTopo below (value-sorted DP in topological order: sort cells ascending
 * and relax dp into strictly-higher 4-neighbours), an INDEPENDENT
 * implementation of the same operation (not the walkthrough's recursive DFS +
 * memo frame emitter), and cross-checked against the brute-force no-memo DFS
 * oracle; disagreement throws.
 *
 * Staged source: .workers/jobs/neetcode150-completion/longest-increasing-path-in-a-matrix/practice.longest-increasing-path-in-a-matrix.js
 * plus .workers/jobs/question-owners-150/longest-increasing-path-in-a-matrix/practice.mjs
 * (statements, hints, oracle, seeded rows); reshaped into the forge variant
 * contract (id/seedLabel/intent/difficulty/title/statement/signature/examples/tests/mode/hints).
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

export const SLUG = 'longest-increasing-path-in-a-matrix';

export const SIGNATURE = Object.freeze({
  name: 'longestIncreasingPath',
  params: Object.freeze([{ name: 'matrix', type: 'int[][]' }]),
  return: 'int',
});

export const MODE = 'exact';
export const DIFFICULTY = 'Hard';

export const INTENT_SAME = 'Same pattern, different numbers so you reproduce the reasoning.';
export const INTENT_EDGE = 'Same pattern with the edge case the original hides.';
export const INTENT_ADVERSARIAL = 'Same question on snake, plateau and valley shapes that punish equality and direction mistakes.';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** INDEPENDENT oracle: value-sorted DP (topological order, iterative, no recursion). Different algorithm family from the walkthrough's recursive DFS + memo. */
export function lipRefTopo(mat) {
  const rows = mat.length, cols = mat[0].length;
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([mat[r][c], r, c]);
  cells.sort((a, b) => b[0] - a[0]);
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(1));
  let best = 1;
  for (const [v, r, c] of cells) {
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (mat[nr][nc] <= v) continue;
      const cand = dp[nr][nc] + 1;
      if (cand > dp[r][c]) dp[r][c] = cand;
    }
    if (dp[r][c] > best) best = dp[r][c];
  }
  return best;
}

/** Cross-check oracle: brute-force DFS with NO memo table (exponential). Never reuses the lesson's memoized DP; agreement cross-validates both. */
export function lipRefBrute(mat) {
  const rows = mat.length, cols = mat[0].length;
  const dfs = (r, c) => {
    let top = 1;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (mat[nr][nc] <= mat[r][c]) continue;
      const cand = 1 + dfs(nr, nc);
      if (cand > top) top = cand;
    }
    return top;
  };
  let best = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) best = Math.max(best, dfs(r, c));
  return best;
}

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

function freshGrid(rng, rows, cols) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.floor(rng() * 10)));
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

function argLiteral(mat) {
  return JSON.stringify(mat);
}

function testsFor(grids) {
  return grids.map((g) => {
    const a = lipRefTopo(g);
    const b = lipRefBrute(g);
    if (a !== b) throw new Error('Oracle disagreement on grid ' + JSON.stringify(g) + ': ' + a + ' vs ' + b);
    return { args: [argLiteral(g)], expected: String(a) };
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

const STATEMENT =
  'Given an m x n integers matrix, return the length of the longest strictly increasing path moving 4-directionally (no diagonals, no wrap; equal values do not extend it).';

/* ---------------- entry point ---------------- */

export function buildLongestIncreasingPathPractice() {
  // Same seed as the staged question-owners-150 practice module, so the
  // generated v1 rows below are identical to the curated overlay rows.
  const rng = mulberry32(hashText(SLUG));

  const v1rows = [
    [[4, 1, 7], [2, 8, 3], [5, 0, 6]],
    freshGrid(rng, 2, 3),
    freshGrid(rng, 3, 2),
    freshGrid(rng, 2, 2),
  ];

  const v2rows = [
    [[1]],
    [[5, 5], [5, 5]],
    [[1, 2, 3, 4]],
    [[4, 3], [2, 1]],
  ];

  const v3rows = [
    [[1, 2, 3], [6, 5, 4], [7, 8, 9]],
    [[1, 1, 1], [1, 2, 1], [1, 1, 1]],
    [[9, 8, 7], [4, 1, 6], [3, 2, 5]],
    [[9, 8, 7], [6, 5, 4], [3, 2, 1]],
  ];

  return [
    buildVariant({
      id: 'v1',
      seedLabel: 'fresh values',
      intent: INTENT_SAME,
      title: 'Longest Increasing Path in a Matrix — fresh values (same-task drill)',
      statement: STATEMENT + ' These generated fresh inputs hold at most 3x3 seeded values between 0 and 9.',
      tests: testsFor(v1rows),
      hints: [
        'DFS from every cell along strictly-greater neighbours; memoize each cell longest suffix once.',
        'Equal neighbours never extend a path, so no visited set is needed — the climb is acyclic.',
      ],
    }),
    buildVariant({
      id: 'v2',
      seedLabel: 'edge cases',
      intent: INTENT_EDGE,
      title: 'Longest Increasing Path in a Matrix — edge cases (same-task drill)',
      statement: STATEMENT + ' These generated boundary inputs cover a 1x1 grid, an all-equal 2x2, a single rising row, and a falling 2x2 whose answer climbs back up.',
      tests: testsFor(v2rows),
      hints: [
        'A 1x1 grid always answers 1; an all-equal grid cannot move anywhere, so it also answers 1.',
        'A single rising row of length k answers k; a falling grid still climbs when read bottom-up.',
      ],
    }),
    buildVariant({
      id: 'v3',
      seedLabel: 'same-task adversarial shapes',
      intent: INTENT_ADVERSARIAL,
      title: 'Longest Increasing Path in a Matrix — adversarial shapes (same-task drill)',
      statement: STATEMENT + ' SAME-TASK generated drill, no rule change: a snake using every cell, a plateau where only the centre cell extends a path, a valley with competing climbs, and a falling grid. Identical signature and exact comparison.',
      tests: testsFor(v3rows),
      hints: [
        'Trace the snake cell by cell: each step has exactly one higher neighbour, chaining all 9 cells.',
        'On the plateau every border 1 sees only 1s except toward the centre 2, so the answer is 2.',
      ],
    }),
  ];
}

// Staged-compat aliases: same builder, family-style names.
export const buildPracticeVariants = buildLongestIncreasingPathPractice;
export const buildLongestIncreasingPathVariants = buildLongestIncreasingPathPractice;

export const PRACTICE_INFO = Object.freeze({
  slug: SLUG,
  signature: SIGNATURE,
  mode: MODE,
  difficulty: DIFFICULTY,
  variantCount: 3,
  ruleChange: false,
  oracle: 'lipRefTopo (value-sorted DP in topological order; walkthrough uses recursive DFS + memo)',
});

export default buildLongestIncreasingPathPractice;
