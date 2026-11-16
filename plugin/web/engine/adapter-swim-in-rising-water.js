/**
 * swim-in-rising-water — live walkthrough adapter (Advanced Graphs, LeetCode 778).
 *
 * Live signature matches the judge record in plugin/data/shard-15.json exactly:
 * swimInWater(int[][] grid) -> int, mode exact. Minimax Dijkstra over the grid:
 * always expand the reachable cell with the smallest elevation; the answer is
 * the max elevation along that minimax path. Official example 1 [[0,2],[1,3]]
 * -> 3 (15 frames); example 2 (5x5 spiral) -> 16.
 *
 * Ported from .workers/jobs/neetcode150-completion/swim-in-rising-water/swim-adapter.js
 * (frames, verdicts, signature, code listings and explain map unchanged) — the only
 * additions are the named SIGNATURE export, per-line explainLines derived from the
 * shared step notes, and dataset example helpers. Walkthrough bound (honest
 * disclosure): square grids up to 6x6 (judge allows up to 50x50); over-bound or
 * malformed inputs are rejected with a clear error, never silently truncated.
 * Pure, synchronous, dependency-free ES module. No DOM, no network, no randomness.
 * Primary source: https://leetcode.com/problems/swim-in-rising-water/
 */
import { code, frame } from './semantic-core.js';

export const SLUG = 'swim-in-rising-water';

export const SIGNATURE = {
  name: 'swimInWater',
  params: [{ name: 'grid', type: 'int[][]' }],
  return: 'int',
};

const MAX_SIDE = 6;

function decodeGrid(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Provide a non-empty square grid 1..6 x 1..6 for this walkthrough');
  const n = value.length;
  if (n > MAX_SIDE) throw new Error('Visual walkthrough shows at most ' + MAX_SIDE + 'x' + MAX_SIDE + ' (got ' + n + ' rows); larger grids are rejected, never truncated');
  for (let r = 0; r < n; r++) {
    if (!Array.isArray(value[r]) || value[r].length !== n) throw new Error('Grid must be square n x n (row ' + r + ' has ' + (Array.isArray(value[r]) ? value[r].length : 'non-array') + ', expected ' + n + ')');
    for (let c = 0; c < n; c++) {
      const cell = value[r][c];
      if (typeof cell !== 'number' || !Number.isSafeInteger(cell) || cell < 0) throw new Error('grid[' + r + '][' + c + '] must be a non-negative integer');
    }
  }
  return value.map((row) => row.slice());
}

const swimJava = code(`
[def] class Solution {
[def]     public int swimInWater(int[][] grid) {
[init]         int n = grid.length;
[init]         boolean[][] seen = new boolean[n][n];
[init]         int[][] best = new int[n][n];
[init]         for (int[] row : best) java.util.Arrays.fill(row, Integer.MAX_VALUE);
[init]         java.util.PriorityQueue<int[]> pq = new java.util.PriorityQueue<>((a, b) -> a[2] - b[2]);
[offer]         pq.offer(new int[]{0, 0, grid[0][0]});
[offer]         best[0][0] = grid[0][0];
[pop]         while (!pq.isEmpty()) {
[pop]             int[] cur = pq.poll();
[visit]             int r = cur[0], c = cur[1], h = cur[2];
[visit]             if (seen[r][c]) continue;
[visit]             seen[r][c] = true;
[visit]             if (r == n - 1 && c == n - 1) return h;
[relax]             if (r + 1 < n && Math.max(h, grid[r + 1][c]) < best[r + 1][c]) { best[r + 1][c] = Math.max(h, grid[r + 1][c]); pq.offer(new int[]{r + 1, c, best[r + 1][c]}); }
[relax]             if (r - 1 >= 0 && Math.max(h, grid[r - 1][c]) < best[r - 1][c]) { best[r - 1][c] = Math.max(h, grid[r - 1][c]); pq.offer(new int[]{r - 1, c, best[r - 1][c]}); }
[relax]             if (c + 1 < n && Math.max(h, grid[r][c + 1]) < best[r][c + 1]) { best[r][c + 1] = Math.max(h, grid[r][c + 1]); pq.offer(new int[]{r, c + 1, best[r][c + 1]}); }
[relax]             if (c - 1 >= 0 && Math.max(h, grid[r][c - 1]) < best[r][c - 1]) { best[r][c - 1] = Math.max(h, grid[r][c - 1]); pq.offer(new int[]{r, c - 1, best[r][c - 1]}); }
[def]         }
[return]         return -1;
[def]     }
[def] }
`);

const swimCpp = code(`
[def] class Solution {
[def] public:
[def]     int swimInWater(vector<vector<int>>& grid) {
[init]         int n = (int)grid.size();
[init]         vector<vector<int>> best(n, vector<int>(n, INT_MAX));
[init]         vector<vector<char>> seen(n, vector<char>(n, 0));
[init]         using Cell = array<int, 3>;
[init]         priority_queue<Cell, vector<Cell>, greater<Cell>> pq;
[offer]         pq.push({grid[0][0], 0, 0});
[offer]         best[0][0] = grid[0][0];
[pop]         const int DR[4] = {1, -1, 0, 0};
[pop]         const int DC[4] = {0, 0, 1, -1};
[pop]         while (!pq.empty()) {
[pop]             Cell cur = pq.top(); pq.pop();
[visit]             int h = cur[0], r = cur[1], c = cur[2];
[visit]             if (seen[r][c]) continue;
[visit]             seen[r][c] = 1;
[visit]             if (r == n - 1 && c == n - 1) return h;
[relax]             for (int k = 0; k < 4; k++) {
[relax]                 int nr = r + DR[k], nc = c + DC[k];
[relax]                 if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
[relax]                 int nh = max(h, grid[nr][nc]);
[relax]                 if (nh < best[nr][nc]) { best[nr][nc] = nh; pq.push({nh, nr, nc}); }
[relax]             }
[def]         }
[return]         return -1;
[def]     }
[def] };
`);

const swimPseudo = code(`
[def] swimInWater(grid):
[init]   n = grid.length; seen = n x n false; best = n x n +inf
[init]   pq = empty min-heap ordered by elevation
[offer]   push (0, 0) with cost grid[0][0]; best[0][0] = grid[0][0]
[pop]   while pq not empty:
[pop]     (r, c, h) = pop smallest elevation
[visit]     if seen[r][c]: continue
[visit]     seen[r][c] = true
[visit]     if (r, c) is target: record answer h and stop
[relax]     for each 4-neighbour (nr, nc):
[relax]       nh = max(h, grid[nr][nc])
[relax]       if nh < best[nr][nc]: best[nr][nc] = nh; push (nr, nc, nh)
[return]   return answer
`);

const EXPLAIN = {
  init: 'Size the board, clear settled/visited marks, and create the min-heap ordered by elevation.',
  offer: 'Push a frontier cell into the heap with its minimax cost max(path max so far, cell elevation).',
  pop: 'Remove the heap front: the reachable cell with the smallest elevation is expanded next.',
  visit: 'Settle the popped cell once; the first settlement of the target fixes the answer.',
  relax: 'Consider each 4-neighbour and keep the smaller minimax cost; only improvements are pushed.',
  return: 'Return the settled target cost: the smallest feasible water level.',
  def: 'Declares solution scope so the minimax loop and the answer return stay inside swimInWater.',
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
  java: explainLinesFor(swimJava),
  cpp: explainLinesFor(swimCpp),
  pseudo: explainLinesFor(swimPseudo),
};

// Deterministic binary min-heap over [elev, r, c] (elev, then row, then col).
function heapLess(a, b) {
  if (a[0] !== b[0]) return a[0] < b[0];
  if (a[1] !== b[1]) return a[1] < b[1];
  return a[2] < b[2];
}
function heapPush(heap, item) {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (!heapLess(heap[i], heap[p])) break;
    const t = heap[i]; heap[i] = heap[p]; heap[p] = t;
    i = p;
  }
}
function heapPop(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let s = i;
      if (l < heap.length && heapLess(heap[l], heap[s])) s = l;
      if (r < heap.length && heapLess(heap[r], heap[s])) s = r;
      if (s === i) break;
      const t = heap[s]; heap[s] = heap[i]; heap[i] = t;
      i = s;
    }
  }
  return top;
}

function buildSwim(args) {
  const source = decodeGrid(args[0]);
  const n = source.length;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const seen = Array.from({ length: n }, () => Array(n).fill(false));
  const best = Array.from({ length: n }, () => Array(n).fill(Number.MAX_SAFE_INTEGER));
  const parent = Array.from({ length: n }, () => Array(n).fill(null));
  const heap = [];
  const frames = [];
  const anchors = [];

  const chainTo = (r, c) => {
    const path = [];
    let cur = [r, c];
    while (cur) {
      path.push(cur.slice());
      const p = parent[cur[0]][cur[1]];
      cur = p;
    }
    return path.reverse();
  };
  const state = (current, vars) => ({
    current,
    cells: source.map((row) => row.slice()),
    filled: seen.flatMap((row, r) => row.map((v, c) => (v ? [r, c] : null)).filter(Boolean)),
    frontier: heap.map((e) => [e[1], e[2]]),
    path: current ? chainTo(current[0], current[1]) : [],
    vars: { n, ...vars },
  });
  const push = (step, label, note, current, vars = {}) =>
    frames.push(frame(step, label, note, state(current, vars)));

  best[0][0] = source[0][0];
  push('init', 'Initialize', 'n=' + n + ', start h=' + source[0][0] + ', heap=[], seen=0/' + (n * n), null, { best: source[0][0] });
  heapPush(heap, [source[0][0], 0, 0]);
  push('offer', 'Offer start', 'push (0,0) h=' + source[0][0] + '; heap=1', [0, 0], { h: source[0][0], heapSize: 1 });

  let answer = -1;
  let pops = 0;
  while (heap.length > 0) {
    const [h, r, c] = heapPop(heap);
    pops++;
    push('pop', 'Pop (' + r + ',' + c + ')', 'pop h=' + h + ' at (' + r + ',' + c + '); heap=' + heap.length, [r, c], { h, heapSize: heap.length, pops });
    if (seen[r][c]) {
      push('visit', 'Skip seen', '(' + r + ',' + c + ') already settled; ignore h=' + h, [r, c], { h });
      continue;
    }
    seen[r][c] = true;
    const path = chainTo(r, c);
    if (r === n - 1 && c === n - 1) {
      answer = h;
      anchors.push(frames.length);
      push('visit', 'Reach target', 'settle (' + r + ',' + c + ') h=' + h + '; answer=' + answer, [r, c], { h, answer });
      break;
    }
    anchors.push(frames.length);
    push('visit', 'Settle (' + r + ',' + c + ')', 'settle h=' + h + ' via path len ' + path.length, [r, c], { h, settled: seen.flat().filter(Boolean).length });
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n || seen[nr][nc]) continue;
      const nh = Math.max(h, source[nr][nc]);
      if (nh < best[nr][nc]) {
        best[nr][nc] = nh;
        parent[nr][nc] = [r, c];
        heapPush(heap, [nh, nr, nc]);
        push('offer', 'Offer (' + nr + ',' + nc + ')', 'edge h=' + source[nr][nc] + ' -> cost nh=' + nh + '; heap=' + heap.length, [nr, nc], { h, nh, heapSize: heap.length });
      } else {
        push('relax', 'Keep (' + nr + ',' + nc + ')', 'edge cost nh=' + nh + ' >= best ' + best[nr][nc] + '; no push', [nr, nc], { h, nh, best: best[nr][nc] });
      }
    }
  }

  anchors.push(frames.length);
  push('return', 'Return answer', 'return ' + answer + ' (max elevation on minimax path)', [n - 1, n - 1], { answer });
  return { kind: 'grid', layout: { rows: n, cols: n, cells: source.map((row) => row.slice()) }, frames, result: answer, anchors };
}

/** Official example 1 as a staged literal. */
export function datasetExampleArgs() {
  return ['[[0,2],[1,3]]'];
}

export const DATASET_EXPECTED = 3;

export const adapters = {
  'swim-in-rising-water': {
    signature: { name: 'swimInWater', params: ['int[][]'], return: 'int' },
    lesson: {
      idea: 'Swim order is by elevation: always expand the reachable cell with the smallest height, so the first time the target settles its cost is the minimum possible water level.',
      trap: 'The answer is the maximum elevation along the chosen path, not the step count or the target cell alone; the start cell elevation is a lower bound.',
      time: 'O(n^2 log n)',
      space: 'O(n^2)',
    },
    explain: EXPLAIN,
    explainLines: EXPLAIN_LINES,
    code: { java: swimJava, cpp: swimCpp, pseudo: swimPseudo },
    build: buildSwim,
  },
};

export { buildSwim };

export default adapters['swim-in-rising-water'];
