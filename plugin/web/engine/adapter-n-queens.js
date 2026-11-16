/**
 * N-Queens — per-slug portable walkthrough adapter (row-by-row DFS, staged).
 *
 * Shape mirrors one entry of `plugin/web/engine/backtracking-adapters.js` so the
 * integrator can register `adapters['n-queens']` with no edits.
 *
 * Walkthrough bound: n <= 4. n = 4 already emits 96 raw placement events (the
 * pipeline compacts them to <= 40 with honest "skipped" prefixes); n >= 5 is
 * rejected with a clear error instead of being truncated.
 *
 * Live record: plugin/data/shard-14.json (id 51, Hard, pattern backtracking),
 * solveNQueens(int)->string[][], judge mode unordered with two official tests;
 * the signature below equals the live judge signature exactly.
 */
import { code, frame, boundedFrames } from './semantic-core.js';

export const SLUG = 'n-queens';

// Live judge signature (object form). The adapters entry below carries the same
// profile in the string-array params form semantic.js compares against.
export const SIGNATURE = {
  name: 'solveNQueens',
  params: [{ name: 'n', type: 'int' }],
  return: 'string[][]',
};

const SIGNATURE_TYPES = ['int'];

export const VISUAL_MAX_N = 4;

const nQueensJava = code(`
[def] import java.util.ArrayList;
[def] import java.util.Arrays;
[def] import java.util.List;
[def] class Solution {
[def]     public List<List<String>> solveNQueens(int n) {
[init]         List<List<String>> result = new ArrayList<>();
[init]         int[] queens = new int[n];
[init]         Arrays.fill(queens, -1);
[init]         boolean[] cols = new boolean[n];
[init]         boolean[] diag1 = new boolean[2 * n];
[init]         boolean[] diag2 = new boolean[2 * n];
[explore]         backtrack(0, n, queens, cols, diag1, diag2, result);
[return]         return result;
[def]     }
[def]     private void backtrack(int row, int n, int[] queens, boolean[] cols, boolean[] diag1, boolean[] diag2, List<List<String>> result) {
[record]         if (row == n) {
[record]             result.add(board(queens, n));
[record]             return;
[def]         }
[def]         for (int col = 0; col < n; col++) {
[attack]             if (cols[col] || diag1[row + col] || diag2[row - col + n]) {
[attack]                 continue;
[def]             }
[place]             queens[row] = col;
[place]             cols[col] = true; diag1[row + col] = true; diag2[row - col + n] = true;
[explore]             backtrack(row + 1, n, queens, cols, diag1, diag2, result);
[backtrack]             queens[row] = -1;
[backtrack]             cols[col] = false; diag1[row + col] = false; diag2[row - col + n] = false;
[def]         }
[def]     }
[def]     private List<String> board(int[] queens, int n) {
[record]         List<String> rows = new ArrayList<>();
[record]         for (int r = 0; r < n; r++) {
[record]             char[] line = new char[n];
[record]             Arrays.fill(line, '.');
[record]             line[queens[r]] = 'Q';
[record]             rows.add(new String(line));
[record]         }
[record]         return rows;
[def]     }
[def] }
`);

const nQueensCpp = code(`
[def] #include <string>
[def] #include <vector>
[def] using namespace std;
[def] class Solution {
[def] public:
[def]     vector<vector<string>> solveNQueens(int n) {
[init]         vector<vector<string>> result;
[init]         vector<int> queens(n, -1);
[init]         vector<int> cols(n, 0);
[init]         vector<int> diag1(2 * n, 0);
[init]         vector<int> diag2(2 * n, 0);
[explore]         backtrack(0, n, queens, cols, diag1, diag2, result);
[return]         return result;
[def]     }
[def] private:
[def]     void backtrack(int row, int n, vector<int>& queens, vector<int>& cols, vector<int>& diag1, vector<int>& diag2, vector<vector<string>>& result) {
[record]         if (row == n) {
[record]             result.push_back(board(queens, n));
[record]             return;
[def]         }
[def]         for (int col = 0; col < n; col++) {
[attack]             if (cols[col] || diag1[row + col] || diag2[row - col + n]) {
[attack]                 continue;
[def]             }
[place]             queens[row] = col;
[place]             cols[col] = 1; diag1[row + col] = 1; diag2[row - col + n] = 1;
[explore]             backtrack(row + 1, n, queens, cols, diag1, diag2, result);
[backtrack]             queens[row] = -1;
[backtrack]             cols[col] = 0; diag1[row + col] = 0; diag2[row - col + n] = 0;
[def]         }
[def]     }
[def]     vector<string> board(vector<int>& queens, int n) {
[record]         vector<string> rows;
[record]         for (int r = 0; r < n; r++) {
[record]             string line(n, '.');
[record]             line[queens[r]] = 'Q';
[record]             rows.push_back(line);
[record]         }
[record]         return rows;
[def]     }
[def] };
`);

const nQueensPseudo = code(`
[def] solveNQueens(n):
[init]   result = []; queens = [-1] * n
[init]   cols = [false] * n; diag1 = [false] * 2n; diag2 = [false] * 2n
[explore]   backtrack(0, n, queens, cols, diag1, diag2, result)
[return]   return result
[def] backtrack(row, n, queens, cols, diag1, diag2, result):
[record]   if row == n: result.add(render(queens, n)); return
[def]   for col = 0 to n - 1:
[attack]     if cols[col] or diag1[row+col] or diag2[row-col+n]: continue
[place]     queens[row] = col; mark col and both diagonals
[explore]     backtrack(row + 1, n, queens, cols, diag1, diag2, result)
[backtrack]     queens[row] = -1; clear col and both diagonals
[def] render(queens, n):
[record]   rows = []
[record]   for r = 0 to n - 1: rows.add('.' * queens[r] + 'Q' + '.' * rest)
[record]   return rows
`);

/** Per-step notes; attached to every rendered line via the shared-step fallback. */
export const explain = {
  def: 'Declares the solver scope and helpers; execution starts in the body of solveNQueens.',
  init: 'Create the empty answer, queens[row] = column (-1 = empty), and three occupancy sets.',
  place: 'Square is unattacked: record queens[row] = col and mark its column and both diagonals.',
  attack: 'Column or a diagonal is already occupied, so this square is attacked: skip it.',
  explore: 'Recurse to the next row with the marks set; deeper rows only see legal squares.',
  record: 'Every row holds a queen: render the n board rows and append one full solution.',
  backtrack: 'Undo the placement and clear its marks so the next column starts from a clean row.',
  return: 'All columns of row 0 are tried; the answer holds every distinct board, any order.',
};

export const EXPLAIN_LINES = {
  java: {
    4: 'Solver header: takes n, returns every distinct board in any order.',
    13: 'End of the solver body; the filled answer is returned above.',
    14: 'Recursion header: tries each column of the current row in turn.',
    18: 'End of the row==n base case: a full board was recorded, unwind one level.',
    19: 'Column loop header: row is fixed, col is the only choice per frame.',
    22: 'End of the attacked-square guard: nothing was placed, try the next column.',
    28: 'End of the column loop: every square of this row was tried, unwind one level.',
    29: 'End of the backtrack scope; control returns to the caller row.',
    39: 'End of the render helper; the board rows are returned above.',
    40: 'End of the class scope; it performs no algorithm operation.',
  },
  cpp: {
    5: 'Solver header: takes n, returns every distinct board in any order.',
    13: 'End of the solver body; the filled answer is returned above.',
    15: 'Recursion header: tries each column of the current row in turn.',
    19: 'End of the row==n base case: a full board was recorded, unwind one level.',
    20: 'Column loop header: row is fixed, col is the only choice per frame.',
    23: 'End of the attacked-square guard: nothing was placed, try the next column.',
    29: 'End of the column loop: every square of this row was tried, unwind one level.',
    30: 'End of the backtrack scope; control returns to the caller row.',
    39: 'End of the render helper; the board rows are returned above.',
    40: 'End of the class scope; it performs no algorithm operation.',
  },
  pseudo: {
    0: 'Solver header: takes n, returns every distinct board in any order.',
    5: 'Recursion header: tries each column of the current row in turn.',
    7: 'Column loop header: row is fixed, col is the only choice per frame.',
    12: 'Render helper header: turns queens[] into n strings of Q and dots.',
    15: 'End of the render helper; the board rows are returned above.',
  },
};

function emptyCells(n) {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => '.'));
}

function renderBoard(queens, n) {
  const rows = [];
  for (let r = 0; r < n; r++) {
    let line = '';
    for (let c = 0; c < n; c++) line += queens[r] === c ? 'Q' : '.';
    rows.push(line);
  }
  return rows;
}

/** All squares attacked by the currently placed queens (real execution state). */
function attackedCells(queens, n) {
  const out = [];
  const placed = [];
  for (let r = 0; r < n; r++) if (queens[r] >= 0) placed.push([r, queens[r]]);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (queens[r] === c) continue;
      const hit = placed.some(([qr, qc]) => qr === r || qc === c || Math.abs(qr - r) === Math.abs(qc - c));
      if (hit) out.push([r, c]);
    }
  }
  return out;
}

function queenCells(queens) {
  const out = [];
  for (let r = 0; r < queens.length; r++) if (queens[r] >= 0) out.push([r, queens[r]]);
  return out;
}

/**
 * Run the reference row-by-row DFS on the real input and record every
 * placement event. Pure + synchronous. Throws a clear error outside n 1..4.
 */
export function build(args) {
  const n = args[0];
  if (!Number.isSafeInteger(n)) throw new Error('Provide an integer n for this walkthrough');
  if (n < 1) throw new Error('Visual walkthrough needs n >= 1 (' + n + ' given)');
  if (n > VISUAL_MAX_N)
    throw new Error('Visual walkthrough limited to n <= ' + VISUAL_MAX_N + ' (' + n + ' given); n-queens branches explode');

  const queens = new Array(n).fill(-1);
  const cols = new Array(n).fill(false);
  const diag1 = new Array(2 * n).fill(false);
  const diag2 = new Array(2 * n).fill(false);
  const result = [];
  const frames = [];
  const anchors = [];
  let firstAttackAnchored = false;
  let firstBacktrackAnchored = false;

  const snap = (row, col) => ({
    queens: queens.slice(),
    board: renderBoard(queens, n),
    row,
    col,
    depth: row === null || row === undefined ? 0 : row,
    answer: result.length,
    vars: { row, col, depth: row === null || row === undefined ? 0 : row },
  });

  const push = (step, label, note, row, col, extra = {}) => {
    const state = { ...snap(row, col), ...extra };
    state.current = row === null || row === undefined || col === null || col === undefined ? null : [row, col];
    state.filled = queenCells(queens);
    state.path = queenCells(queens);
    state.blocked = attackedCells(queens, n);
    frames.push(frame(step, label, note, state));
  };

  push('init', 'Initialize', 'n=' + n + '; empty ' + n + 'x' + n + ' board, no queens placed', null, null);

  function backtrack(row) {
    if (row === n) {
      result.push(renderBoard(queens, n));
      push('record', 'Record solution', 'Row ' + n + ' reached: save board #' + (result.length - 1), row, null);
      anchors.push(frames.length - 1);
      return;
    }
    for (let col = 0; col < n; col++) {
      if (cols[col] || diag1[row + col] || diag2[row - col + n]) {
        const why = cols[col] ? 'column ' + col + ' taken' : 'a diagonal is taken';
        push('attack', 'Attacked square', '(' + row + ',' + col + '): ' + why + '; skip', row, col);
        if (!firstAttackAnchored) {
          anchors.push(frames.length - 1);
          firstAttackAnchored = true;
        }
        continue;
      }
      queens[row] = col;
      cols[col] = true;
      diag1[row + col] = true;
      diag2[row - col + n] = true;
      push('place', 'Place queen', 'Place (' + row + ',' + col + '); mark column + diagonals', row, col);
      push('explore', 'Explore row ' + (row + 1), 'Recurse to row ' + (row + 1) + ' with (' + row + ',' + col + ') set', row + 1, null);
      backtrack(row + 1);
      queens[row] = -1;
      cols[col] = false;
      diag1[row + col] = false;
      diag2[row - col + n] = false;
      push('backtrack', 'Remove queen', 'Clear (' + row + ',' + col + '); try next column', row, col);
      if (!firstBacktrackAnchored) {
        anchors.push(frames.length - 1);
        firstBacktrackAnchored = true;
      }
    }
  }

  backtrack(0);

  push('return', 'Return result', 'Done; ' + result.length + ' board' + (result.length === 1 ? '' : 's') + ' returned', null, null);

  return {
    kind: 'grid',
    layout: { rows: n, cols: n, cells: emptyCells(n) },
    frames,
    result: result.map((b) => b.slice()),
    anchors,
  };
}

// Live-forge-compatible entry: buildScene(problem, options) -> CONTRACTS scene
// (v 1, kind grid, 6..40 frames) or null. Pure, synchronous, never throws.
// Accepts a full shard record (judge test[0] args) or a direct { n } / [n].
export function buildScene(problem, options = {}) {
  try {
    const direct =
      (options && Number.isSafeInteger(options.n)) ? options.n
        : (problem && Number.isSafeInteger(problem.n)) ? problem.n
          : null;
    let nValue = direct;
    if (nValue === null || nValue === undefined) {
      const sig = problem && problem.judge && problem.judge.signature;
      if (!sig || sig.name !== 'solveNQueens') return null;
      const rawArgs = (options && Array.isArray(options.args))
        ? options.args
        : (problem && problem.judge && Array.isArray(problem.judge.tests) && problem.judge.tests[0]
          ? problem.judge.tests[0].args : null);
      if (!Array.isArray(rawArgs) || rawArgs.length !== 1) return null;
      nValue = Number(JSON.parse(rawArgs[0]));
    }
    const built = build([nValue]);
    // Single compaction pass (mirrors semantic.js): full honest events in,
    // at most 40 frames out; anchors (records) survive when budget allows.
    let { frames } = boundedFrames(built.frames, 40, built.anchors || []);
    if (frames.length < 6) {
      // Same short-run rule as semantic.js: honest context cards repeating real
      // snapshots, explicitly not extra operations.
      const raw = (problem && problem.judge && problem.judge.tests && problem.judge.tests[0])
        ? problem.judge.tests[0].args.join('; ') : 'n=' + nValue;
      const first = frames[0];
      const last = frames[frames.length - 1];
      const context = [
        { ...first, label: 'Context: input', note: String(raw).slice(0, 140) },
        { ...first, label: 'Context: task', note: 'Place n queens so no two attack each other; any board order.' },
        { ...first, label: 'Context: invariant', note: 'One queen per row; column/diagonal sets reject attacks.' },
        { ...last, label: 'Context: returned value', note: 'Actual solutions: ' + JSON.stringify(built.result).slice(0, 120) },
      ];
      const needed = 6 - frames.length;
      frames = [...context.slice(0, Math.min(needed, 3)), ...frames, ...context.slice(3, needed > 3 ? 4 : 3)];
    }
    return {
      v: 1,
      kind: 'grid',
      title: 'N-Queens — one queen per row, undo on the way up',
      subtitle: 'Column and diagonal sets reject attacked squares in O(1)',
      pattern: (problem && problem.pattern) || 'backtracking',
      camera: { yaw: 0.46, pitch: 0.64, dist: 12 },
      layout: built.layout,
      frames: frames.map((f) => ({ ...f, note: String(f.note).slice(0, 140) })),
    };
  } catch {
    return null;
  }
}

export const adapters = {
  'n-queens': {
    signature: { name: 'solveNQueens', params: SIGNATURE_TYPES, return: 'string[][]' },
    lesson: {
      idea: 'Place queens row by row; column/diagonal sets reject attacked squares in O(1), and undoing the marks reuses the same arrays.',
      trap: 'Forgetting to clear the column/diagonal marks (or queens[row]) leaks an attack into sibling branches and silently drops solutions.',
      time: 'O(n!) placements explored, each validity test O(1) via occupancy sets',
      space: 'O(n^2) for the output boards plus O(n) recursion depth and mark arrays',
    },
    /** Study card: why it works + the genuine alternative (additive metadata, ignored by the renderer). */
    study: {
      why: 'One queen per row is forced, so the search only chooses a column per row. The three sets answer "is (row,col) attacked?" without rescanning placed queens, and because every mark is cleared on the way back up, each branch observes exactly its own ancestors; every full root-to-leaf path is one valid board and every valid board is reached once.',
      alternative:
        'Bitmask DFS: pack columns and both diagonals into three integers and shift the diagonal masks one step each row (ld << 1, rd >> 1). Same row-by-row search, same boards, but the marks are single machine words instead of arrays. The (row,col) formulation above is kept for the walkthrough because the board state stays visible.',
    },
    code: { java: nQueensJava, cpp: nQueensCpp, pseudo: nQueensPseudo },
    explain,
    explainLines: EXPLAIN_LINES,
    build,
  },
};
