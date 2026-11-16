/**
 * longest-increasing-path-in-a-matrix — live walkthrough adapter (2-D DP / DFS + memo, Hard, LeetCode 329).
 *
 * Live signature matches the judge record in plugin/data/shard-15.json exactly:
 * longestIncreasingPath(int[][])->int, mode exact. DFS from every cell along
 * strictly-increasing 4-neighbours with memoization; the answer is the max over
 * all cells. Official example 1 [[9,9,4],[6,6,8],[2,1,1]] -> 4 (62 events,
 * compacted to 40); example 2 -> 4; example 3 [[1]] -> 1.
 *
 * Ported from .workers/jobs/neetcode150-completion/longest-increasing-path-in-a-matrix/adapter.longest-increasing-path-in-a-matrix.js
 * (frames, verdicts, signature, code listings and explain map unchanged) — the only
 * additions are the named SIGNATURE export, per-line explainLines derived from the
 * shared step notes, and dataset example helpers. Walkthrough bound (honest
 * disclosure): rectangular grids up to 4x4 / 16 cells (judge allows up to
 * 200x200); over-bound or malformed inputs are rejected with a clear error,
 * never silently truncated. Pure, synchronous, dependency-free ES module.
 * No DOM, no network, no randomness.
 * Primary source: https://leetcode.com/problems/longest-increasing-path-in-a-matrix/
 */
import { code, frame, boundedFrames } from './semantic-core.js';

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.

export const SLUG = 'longest-increasing-path-in-a-matrix';

export const SIGNATURE = {
  name: 'longestIncreasingPath',
  params: ['int[][]'],
  return: 'int',
};

export const MAX_SIDE = 4;
export const MAX_CELLS = 16;

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const lipJava = code(`
[def] class Solution {
[def]     private static final int[][] DIRS = {{1,0},{-1,0},{0,1},{0,-1}};
[def]     public int longestIncreasingPath(int[][] matrix) {
[init]         int rows = matrix.length, cols = matrix[0].length;
[init]         int[][] memo = new int[rows][cols];
[init]         int best = 0;
[scan]         for (int r = 0; r < rows; r++)
[scan]             for (int c = 0; c < cols; c++)
[dfs]                 best = Math.max(best, dfs(matrix, memo, r, c));
[return]         return best;
[def]     }
[def]     private int dfs(int[][] matrix, int[][] memo, int r, int c) {
[memo]         if (memo[r][c] != 0) return memo[r][c];
[dfs]         int top = 1;
[check]         for (int[] d : DIRS) {
[check]             int nr = r + d[0], nc = c + d[1];
[check]             if (nr < 0 || nr >= matrix.length || nc < 0 || nc >= matrix[0].length) continue;
[check]             if (matrix[nr][nc] <= matrix[r][c]) continue;
[dfs]             top = Math.max(top, 1 + dfs(matrix, memo, nr, nc));
[def]         }
[write]         memo[r][c] = top;
[dfs]         return top;
[def]     }
[def] }
`);

const lipCpp = code(`
[def] class Solution {
[def] public:
[def]     int longestIncreasingPath(vector<vector<int>>& matrix) {
[init]         int rows = (int)matrix.size(), cols = (int)matrix[0].size();
[init]         vector<vector<int>> memo(rows, vector<int>(cols, 0));
[init]         const int DIRS[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
[init]         int best = 0;
[scan]         for (int r = 0; r < rows; r++)
[scan]             for (int c = 0; c < cols; c++)
[dfs]                 best = max(best, dfs(matrix, memo, DIRS, r, c));
[return]         return best;
[def]     }
[def] private:
[def]     int dfs(vector<vector<int>>& m, vector<vector<int>>& memo, const int DIRS[4][2], int r, int c) {
[memo]         if (memo[r][c] != 0) return memo[r][c];
[dfs]         int top = 1;
[check]         for (int k = 0; k < 4; k++) {
[check]             int nr = r + DIRS[k][0], nc = c + DIRS[k][1];
[check]             if (nr < 0 || nr >= (int)m.size() || nc < 0 || nc >= (int)m[0].size()) continue;
[check]             if (m[nr][nc] <= m[r][c]) continue;
[dfs]             top = max(top, 1 + dfs(m, memo, DIRS, nr, nc));
[def]         }
[write]         memo[r][c] = top;
[dfs]         return top;
[def]     }
[def] };
`);

const lipPseudo = code(`
[def] longestIncreasingPath(matrix):
[init]   rows, cols = shape(matrix); memo = zeros(rows, cols); best = 0
[scan]   for each cell (r, c) in row-major order:
[dfs]     best = max(best, dfs(r, c))
[return]   return best
[def] dfs(r, c):
[memo]   if memo[r][c] != 0: return memo[r][c]
[dfs]   top = 1
[check]   for (nr, nc) in 4-neighbours of (r, c):
[check]     skip when out of bounds or matrix[nr][nc] <= matrix[r][c]
[dfs]     top = max(top, 1 + dfs(nr, nc))
[write]   memo[r][c] = top
[dfs]   return top
`);

const EXPLAIN = {
  def: 'Declares solution scope so the scan loop and the memoizing DFS stay separated yet share grid bounds.',
  init: 'Cache dimensions, allocate the zero memo table, reset the global best to 0.',
  scan: 'Start a DFS from every cell in row-major order; any cell can begin the longest path.',
  dfs: 'Enter DFS at (r,c): the answer here is 1 plus the best strictly-higher neighbour.',
  check: 'Keep only in-bounds neighbours with a strictly greater value; equals never extend a path.',
  memo: 'Memo hit: this cell already knows its longest increasing suffix, reuse it directly.',
  write: 'Freeze memo[r][c]: 1 when no higher neighbour exists, else 1 plus the best child.',
  return: 'The maximum over all cells is the longest increasing path in the whole matrix.',
};

// Per-line notes derived from the shared step notes so every rendered line is
// covered and can never drift out of alignment with the code arrays above.
const explainLinesFor = (lines) =>
  lines.map((entry) =>
    entry.step === 'def'
      ? EXPLAIN.def
      : typeof EXPLAIN[entry.step] === 'string'
        ? EXPLAIN[entry.step]
        : null
  );
const EXPLAIN_LINES = {
  java: explainLinesFor(lipJava),
  cpp: explainLinesFor(lipCpp),
  pseudo: explainLinesFor(lipPseudo),
};

function decodeMatrix(value) {
  const grid = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(grid) || grid.length === 0) throw new Error('Provide a non-empty int[][] matrix');
  if (grid.length > MAX_SIDE) throw new Error('Visual grids are limited to ' + MAX_SIDE + ' rows');
  const cols = grid[0].length;
  if (!Number.isInteger(cols) || cols === 0 || cols > MAX_SIDE) throw new Error('Visual grids are limited to ' + MAX_SIDE + ' columns');
  if (grid.length * cols > MAX_CELLS) throw new Error('Visual grids are limited to ' + MAX_CELLS + ' cells');
  grid.forEach((row, r) => {
    if (!Array.isArray(row) || row.length !== cols) throw new Error('Grid must be rectangular');
    row.forEach((v, c) => {
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('grid[' + r + '][' + c + '] must be a number');
    });
  });
  return grid.map((row) => row.slice());
}

/** Plain solver (no frames); shared by the builder so result logic has one source. */
export function solve(grid) {
  const rows = grid.length, cols = grid[0].length;
  const memo = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const dfs = (r, c) => {
    if (memo[r][c] !== 0) return memo[r][c];
    let top = 1;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] <= grid[r][c]) continue;
      const cand = 1 + dfs(nr, nc);
      if (cand > top) top = cand;
    }
    memo[r][c] = top;
    return top;
  };
  let best = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) best = Math.max(best, dfs(r, c));
  return best;
}

export function buildLongestIncreasingPath(args) {
  const cells = decodeMatrix(args[0]);
  const rows = cells.length, cols = cells[0].length;
  const memo = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const suffix = Array.from({ length: rows }, () => new Array(cols).fill(null));
  const frames = [];
  const anchors = [];
  let best = 0;
  let bestPath = [[0, 0]];

  const memoCells = () => {
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (memo[r][c] !== 0) out.push([r, c]);
    return out;
  };
  const state = (current, vars) => ({
    current,
    cells: cells.map((row) => row.slice()),
    filled: memoCells(),
    path: bestPath.map((p) => p.slice()),
    vars: { rows, cols, best, ...vars },
  });
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)));

  push('init', 'Initialize', 'rows=' + rows + ', cols=' + cols + ', memo=zeros, best=0', null, {});

  const dfs = (r, c) => {
    if (memo[r][c] !== 0) {
      push('memo', 'Memo hit (' + r + ',' + c + ')', 'memo[' + r + '][' + c + ']=' + memo[r][c] + ' already known; reuse', [r, c], { value: cells[r][c], hit: memo[r][c] });
      return { len: memo[r][c], path: suffix[r][c].map((p) => p.slice()) };
    }
    push('dfs', 'DFS (' + r + ',' + c + ')', 'enter (' + r + ',' + c + ')=' + cells[r][c] + '; best suffix starts at 1', [r, c], { value: cells[r][c] });
    let top = 1;
    let topPath = [[r, c]];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (cells[nr][nc] <= cells[r][c]) {
        push('check', 'Block (' + nr + ',' + nc + ')', '(' + nr + ',' + nc + ')=' + cells[nr][nc] + ' <= (' + r + ',' + c + ')=' + cells[r][c] + '; skip', [r, c], { nr, nc, nval: cells[nr][nc], value: cells[r][c] });
        continue;
      }
      push('check', 'Climb to (' + nr + ',' + nc + ')', '(' + nr + ',' + nc + ')=' + cells[nr][nc] + ' > (' + r + ',' + c + ')=' + cells[r][c] + '; recurse', [r, c], { nr, nc, nval: cells[nr][nc], value: cells[r][c] });
      const child = dfs(nr, nc);
      if (1 + child.len > top) { top = 1 + child.len; topPath = [[r, c], ...child.path]; }
    }
    memo[r][c] = top;
    suffix[r][c] = topPath.map((p) => p.slice());
    anchors.push(frames.length);
    push('write', 'Memoize (' + r + ',' + c + ')', 'memo[' + r + '][' + c + ']=' + top + ' (1 + best child ' + (top - 1) + ')', [r, c], { value: cells[r][c], len: top });
    return { len: top, path: topPath };
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      push('scan', 'Start (' + r + ',' + c + ')', 'cell (' + r + ',' + c + ')=' + cells[r][c] + '; dfs for its longest suffix', [r, c], { value: cells[r][c] });
      const got = dfs(r, c);
      if (got.len > best) { best = got.len; bestPath = got.path.map((p) => p.slice()); }
    }
  }

  anchors.push(frames.length);
  push('return', 'Return best', 'longest increasing path length = ' + best, null, { answer: best });
  // Full event list: semantic.js performs the single honest compaction pass.
  return {
    kind: 'grid',
    layout: { rows, cols, cells: cells.map((row) => row.slice()) },
    frames,
    result: best,
    anchors,
  };
}

// Live-shape alias: build(args) -> {kind, layout, frames, result}.
export const build = buildLongestIncreasingPath;

/** Official example 1 as a staged literal. */
export function datasetExampleArgs() {
  return ['[[9,9,4],[6,6,8],[2,1,1]]'];
}

export const DATASET_EXPECTED = 4;

export const adapters = {
  'longest-increasing-path-in-a-matrix': {
    signature: SIGNATURE,
    lesson: {
      idea: 'DFS from each cell along strictly-increasing edges, memoizing each cell longest suffix exactly once.',
      trap: 'Move only to strictly greater neighbours; equal values do not extend the path and need no visited set.',
      time: 'O(m*n)',
      space: 'O(m*n)',
    },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: lipJava, cpp: lipCpp, pseudo: lipPseudo },
    build: buildLongestIncreasingPath,
  },
};

export default adapters['longest-increasing-path-in-a-matrix'];
