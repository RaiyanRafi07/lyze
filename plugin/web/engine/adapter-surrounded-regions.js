/**
 * surrounded-regions — live semantic adapter (union-find/matrix, grid kind).
 *
 * TEST PROFILE slug (judgeable: false). The live record
 * (plugin/data/shard-5.json id 130) carries judge: null: the real LeetCode
 * profile is `solve(board: char[][]) -> void` in place, which has no return
 * literal to compare. The honest TEST PROFILE used here is
 * `solve(board: char[][]) -> char[][]`: same name, board transported as a
 * char[][] literal, returning the mutated board for exact comparison
 * (precedents: mergeKLists(int[][])->int[], reorderList(head:int[])->int[]).
 * Adapter and forge signatures equal this documented profile.
 *
 * Walkthrough algorithm: mark border-connected 'O' as 'E' via DFS, then flip
 * O->X / E->O. Every frame is produced by running this exact algorithm on the
 * actual input board — no invented cells, no future values.
 * O(m*n) time, O(m*n) space.
 *
 * Staged source: `.workers/jobs/neetcode150-completion/surrounded-regions/adapter.js`
 * (reference Java/C++/pseudocode with [step] markers, lesson, explain, real
 * frame-emitting build) — ported to the live shape: shared `code`/`frame`
 * helpers imported from semantic-core.js, no local helper redefinitions.
 *
 * Visual bound: 1..6 rows x 1..6 cols (larger inputs rejected, never truncated).
 */
import { code, frame, boundedFrames } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.

const MAX_SIDE = 6
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]

function fail(m) { throw new Error(m) }

function decodeBoard(value) {
  if (!Array.isArray(value) || value.length === 0) fail('Provide a non-empty board with 1..6 rows')
  if (value.length > MAX_SIDE) fail('Visual board limited to ' + MAX_SIDE + ' rows (got ' + value.length + '); larger boards are rejected, never truncated')
  if (!Array.isArray(value[0])) fail('Every board row must be an array')
  const cols = value[0].length
  if (cols === 0 || cols > MAX_SIDE) fail('Visual board limited to 1..' + MAX_SIDE + ' columns (got ' + cols + ')')
  return value.map((row, r) => {
    if (!Array.isArray(row) || row.length !== cols) fail('Board must be rectangular: row 0 has ' + cols + ' cols but row ' + r + ' differs')
    return row.map((cell, c) => {
      const s = String(cell)
      if (s !== 'X' && s !== 'O') fail('board[' + r + '][' + c + '] must be "X" or "O" (got ' + JSON.stringify(cell) + ')')
      return s
    })
  })
}

const surroundedJava = code(`
[def] class Solution {
[def]     public void solve(char[][] board) {
[init]         if (board == null || board.length == 0 || board[0].length == 0) return;
[init]         int rows = board.length;
[init]         int cols = board[0].length;
[border]         for (int r = 0; r < rows; r++) { if (board[r][0] == 'O') mark(board, r, 0, rows, cols); if (board[r][cols - 1] == 'O') mark(board, r, cols - 1, rows, cols); }
[border]         for (int c = 0; c < cols; c++) { if (board[0][c] == 'O') mark(board, 0, c, rows, cols); if (board[rows - 1][c] == 'O') mark(board, rows - 1, c, rows, cols); }
[flip]         for (int r = 0; r < rows; r++) {
[flip]             for (int c = 0; c < cols; c++) {
[flip]                 if (board[r][c] == 'O') board[r][c] = 'X';
[flip]                 else if (board[r][c] == 'E') board[r][c] = 'O';
[flip]             }
[flip]         }
[return]         return;
[def]     }
[def]     private void mark(char[][] board, int r, int c, int rows, int cols) {
[dfscheck]         if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] != 'O') return;
[visit]         board[r][c] = 'E';
[recurse]         mark(board, r + 1, c, rows, cols);
[recurse]         mark(board, r - 1, c, rows, cols);
[recurse]         mark(board, r, c + 1, rows, cols);
[recurse]         mark(board, r, c - 1, rows, cols);
[def]     }
[def] }
`)

const surroundedCpp = code(`
[def] class Solution {
[def] public:
[def]     void solve(vector<vector<char>>& board) {
[init]         if (board.empty() || board[0].empty()) return;
[init]         int rows = (int)board.size();
[init]         int cols = (int)board[0].size();
[border]         for (int r = 0; r < rows; r++) { if (board[r][0] == 'O') mark(board, r, 0, rows, cols); if (board[r][cols - 1] == 'O') mark(board, r, cols - 1, rows, cols); }
[border]         for (int c = 0; c < cols; c++) { if (board[0][c] == 'O') mark(board, 0, c, rows, cols); if (board[rows - 1][c] == 'O') mark(board, rows - 1, c, rows, cols); }
[flip]         for (int r = 0; r < rows; r++) {
[flip]             for (int c = 0; c < cols; c++) {
[flip]                 if (board[r][c] == 'O') board[r][c] = 'X';
[flip]                 else if (board[r][c] == 'E') board[r][c] = 'O';
[flip]             }
[flip]         }
[return]         return;
[def]     }
[def]     void mark(vector<vector<char>>& board, int r, int c, int rows, int cols) {
[dfscheck]         if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] != 'O') return;
[visit]         board[r][c] = 'E';
[recurse]         mark(board, r + 1, c, rows, cols);
[recurse]         mark(board, r - 1, c, rows, cols);
[recurse]         mark(board, r, c + 1, rows, cols);
[recurse]         mark(board, r, c - 1, rows, cols);
[def]     }
[def] };
`)

const surroundedPseudo = code(`
[def] solve(board):
[init]   if board is empty: return
[init]   rows = board.length; cols = board[0].length
[border]   for each border cell (r, c): if board[r][c] == O: mark(r, c)
[border]   scan order: left/right columns top-to-bottom, then top/bottom rows left-to-right
[flip]   for r = 0 to rows - 1:
[flip]     for c = 0 to cols - 1:
[flip]       if board[r][c] == O: board[r][c] = X
[flip]       else if board[r][c] == E: board[r][c] = O
[return]   return (board mutated in place)
[def] mark(r, c):
[dfscheck]   if outside grid or board[r][c] != O: return
[visit]   board[r][c] = E (escapes capture)
[recurse]   mark(r+1, c); mark(r-1, c); mark(r, c+1); mark(r, c-1)
`)

export function buildSurrounded(args) {
  if (!Array.isArray(args) || args.length !== 1) fail('Surrounded walkthrough needs [board]')
  const source = decodeBoard(args[0])
  const rows = source.length
  const cols = source[0].length
  const work = source.map((r) => r.slice())
  const frames = []
  const anchors = []
  const escaped = []
  const captured = []
  const path = []
  let marked = 0
  let flipped = 0

  const state = (current) => ({
    current,
    cells: work.map((r) => r.slice()),
    filled: escaped.map((p) => p.slice()),
    blocked: captured.map((p) => p.slice()),
    path: path.map((p) => p.slice()),
  })
  const push = (step, label, note, current) => {
    frames.push(frame(step, label, note, state(current)))
  }

  push('init', 'Initialize', 'rows=' + rows + ', cols=' + cols + ', scan borders first', null)
  anchors.push(0)

  function mark(r, c) {
    const inside = r >= 0 && r < rows && c >= 0 && c < cols
    if (!inside) return
    if (work[r][c] !== 'O') {
      push('dfscheck', 'DFS blocked', 'board[' + r + '][' + c + ']=' + work[r][c] + '; not O; return', [r, c])
      return
    }
    push('dfscheck', 'DFS enter', 'board[' + r + '][' + c + ']=O; passes check', [r, c])
    work[r][c] = 'E'
    escaped.push([r, c])
    path.push([r, c])
    marked++
    push('visit', 'Mark escape', 'Marked (' + r + ',' + c + ') O->E; escapes=' + marked, [r, c])
    if (marked === 1) anchors.push(frames.length - 1)
    const nbs = []
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && work[nr][nc] === 'O') nbs.push([nr, nc])
    }
    push('recurse', 'Expand neighbours', 'From (' + r + ',' + c + ') ' + nbs.length + ' O neighbour(s)', [r, c])
    for (const [dr, dc] of DIRS) mark(r + dr, c + dc)
    path.pop()
  }

  // Border seed order is deterministic: left/right columns, then top/bottom rows.
  const seeds = []
  for (let r = 0; r < rows; r++) { seeds.push([r, 0]); if (cols - 1 !== 0) seeds.push([r, cols - 1]) }
  for (let c = 0; c < cols; c++) { seeds.push([0, c]); if (rows - 1 !== 0) seeds.push([rows - 1, c]) }
  // Dedup corners while preserving order.
  const seenSeed = new Set()
  const ordered = seeds.filter(([r, c]) => {
    const k = r + ',' + c
    if (seenSeed.has(k)) return false
    seenSeed.add(k)
    return true
  })
  for (const [r, c] of ordered) {
    push('border', 'Border check (' + r + ',' + c + ')', 'board[' + r + '][' + c + ']=' + work[r][c] + (work[r][c] === 'O' ? '; seed DFS' : '; skip'), [r, c])
    if (work[r][c] === 'O') mark(r, c)
  }
  anchors.push(frames.length - 1)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (work[r][c] === 'O') {
        work[r][c] = 'X'
        captured.push([r, c])
        flipped++
        push('flip', 'Capture (' + r + ',' + c + ')', 'Surrounded O->X; captured=' + flipped, [r, c])
      } else if (work[r][c] === 'E') {
        work[r][c] = 'O'
        push('flip', 'Restore (' + r + ',' + c + ')', 'Escape E->O; survives', [r, c])
      }
    }
  }
  push('return', 'Done', 'Marked ' + marked + ', captured ' + flipped + '; board final', null)
  anchors.push(frames.length - 1)

  return {
    kind: 'grid',
    layout: { rows, cols, cells: source.map((r) => r.slice()) },
    frames,
    result: work.map((r) => r.slice()),
    anchors,
  }
}

export const adapters = {
  'surrounded-regions': {
    signature: { name: 'solve', params: ['char[][]'], return: 'char[][]' },
    lesson: {
      idea: 'Border-connected O regions escape; every other O is surrounded. Mark escapes first, then flip.',
      trap: 'Flipping during the border DFS destroys the O test; flipping before marking captures border regions.',
      time: 'O(m*n)',
      space: 'O(m*n)',
    },
    explain: {
      def: 'Declares solution scope so solving and marking logic stay separated yet share grid bounds.',
      init: 'Guards empty boards and captures dimensions so border scans and flips use stable bounds.',
      border: 'Seeds DFS from every border O so exactly the escape-connected regions get marked E.',
      dfscheck: 'Validates bounds and O status before acting so edges, X cells, and marked E cells stop safely.',
      visit: 'Rewrites a proven escape O to E so revisits are impossible and the flip pass can restore it.',
      recurse: 'Expands marking to orthogonal neighbours so the whole escape shape is claimed whatever its outline.',
      flip: 'Sweeps the grid once: leftover O had no border path and becomes X, while E is restored to O.',
      return: 'Closes the in-place solve once every cell holds its final X or O value; the test profile returns it.',
    },
    explainLines: {
      java: {
        5: 'End of the row-border seed pass: every left/right edge O started its escape DFS.',
        6: 'End of the column-border seed pass: all four edges are seeded before any flip.',
        12: 'End of the flip sweep: surrounded cells are X, escapes restored to O.',
        16: 'Guard rejects out-of-grid, X, and already-marked cells so the DFS cannot loop.',
      },
      cpp: {
        6: 'End of the row-border seed pass: every left/right edge O started its escape DFS.',
        7: 'End of the column-border seed pass: all four edges are seeded before any flip.',
        13: 'End of the flip sweep: surrounded cells are X, escapes restored to O.',
        17: 'Guard rejects out-of-grid, X, and already-marked cells so the DFS cannot loop.',
      },
      pseudo: {
        4: 'Seeding is edge-complete before the flip sweep below runs: order is columns then rows.',
        8: 'One sweep decides every cell: O without a border path becomes X, E returns to O.',
        11: 'Temporary mark only: E never survives into the final board.',
      },
    },
    code: { java: surroundedJava, cpp: surroundedCpp, pseudo: surroundedPseudo },
    build: buildSurrounded,
  },
}
